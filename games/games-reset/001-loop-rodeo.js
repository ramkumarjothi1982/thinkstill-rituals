/* 001 Loop Rodeo — Reset · INTERRUPT · Memory / Replay / Rumination (flagship)
 * Mechanism: circling your thumb in time with a glowing knot is a continuous visuo-motor task that loads the same working
 * memory rumination runs on (dual-task interference, the principle behind eye-movement and tapping tasks). The knot orbits
 * once per bar at the player's own herd speed (their before-rating), and every catch slows the beat, so the hand slows with
 * it (rhythmic entrainment). The biggest thought is never forced into the pen: the player holds still with it while it
 * settles by the fire (acceptance), then books it a paddock time to come back to (worry postponement) instead of arguing.
 * Verb: circle (orbit lasso, with tap-the-posts and ride-along fallbacks; then hold still). Finale: every resting thought
 * lets go of a mote of light that rises and draws its own star-sheep over the prairie, the big one inside a lasso of stars,
 * and the camp sign stamps the tempo drop with a Bronze/Silver/Gold rosette.
 * Come back: a different night every day (sky + a visiting critter, K.daily), a Golden Fleece for regulars (K.visits),
 * the Herd Almanac (K.collect per species), a personal best and a tier for staying in sync (K.best, K.tier).
 */
(function (env) {
  'use strict';
  (env.games = env.games || []).push({
    id: 'loop-rodeo', mode: 'reset', name: 'Loop Rodeo', verb: 'circle', family: 'INTERRUPT', flagship: true, minutes: 3,
    parents: ['Memory / Replay / Rumination', 'Overthinking / Thought Fusion', 'Uncertainty / Future Worry / Reassurance'],
    cast: ['loopie'], poster: { char: 'loopie', mood: 'dizzy' }, fonts: ['Rye'],
    tagline: 'Rope your racing thoughts while the music slows down.',
    why: 'For thoughts on repeat: your thumb takes the wheel while the beat slows.',
    css: `
/* One full-screen prairie: the world is a canvas, every control is a DOM layer above it.
   Dark = night prairie under the stars. Bright = golden hour on the same prairie. */
.g-loop-rodeo {
  --sky-top: #070b24; --sky-mid: #151c49; --sky-low: #3b2f62;
  --orb: #fff4d6; --orb-glow: rgba(190, 200, 255, 0.35);
  --mesa-far: #2c2550; --mesa: #1f1838; --ground-top: #2b2237; --ground-bottom: #120e19; --grass: #3a304d;
  --fire: #ffb347; --wood: #6b4a33; --wood-dark: #3a271c; --rope: #d8b679; --rope-dark: #8a6a3a;
  --ui-bg: #070b24; --ui-surface: #1e1931; --ui-fg: #f6eee0; --ui-muted: #c2b8d4; --ui-accent: #f2a541; --ui-accent-ink: #1d1206;
  --ui-line: rgba(246, 238, 224, 0.18); --ui-scrim: rgba(6, 4, 14, 0.6);
  --card: rgba(27, 22, 44, 0.96); --card-stitch: rgba(242, 165, 65, 0.34); --hud: rgba(20, 16, 36, 0.82);
  --sign: #e2bd85; --sign-ink: #2a180b; --judge-good: #8fe3b0; --judge-perfect: #ffd27a; --judge-miss: #c2b8d4;
  --sync: #8fe3b0; --slack: #ff9f7a;
  --font-display: "Rye", "Rockwell", "Georgia", serif;
  background: var(--sky-low); color-scheme: dark;
}
.tsg[data-scene="bright"] .g-loop-rodeo {
  --sky-top: #6c8ad3; --sky-mid: #e9b38d; --sky-low: #ffd8a4;
  --orb: #fff1c2; --orb-glow: rgba(255, 214, 140, 0.55);
  --mesa-far: #c08c79; --mesa: #8f5d4c; --ground-top: #c39758; --ground-bottom: #7e5a33; --grass: #9d7a3c;
  --fire: #ffb347; --wood: #7a5236; --wood-dark: #4b3122; --rope: #8a5a2b; --rope-dark: #5b3a1a;
  --ui-bg: #e8b48c; --ui-surface: #fff5e8; --ui-fg: #2b1d12; --ui-muted: #6e5846; --ui-accent: #b5481a; --ui-accent-ink: #fff8f0;
  --ui-line: rgba(43, 29, 18, 0.18); --ui-scrim: rgba(43, 29, 18, 0.38);
  --card: rgba(255, 247, 236, 0.97); --card-stitch: rgba(120, 72, 36, 0.35); --hud: rgba(255, 247, 236, 0.9);
  --sign: #f0d3a6; --sign-ink: #3a2414; --judge-good: #1f6b3f; --judge-perfect: #9e4310; --judge-miss: #6e5846;
  --sync: #1f8a4c; --slack: #c4521d;
  color-scheme: light;
}

/* Loopie, positioned every frame from the world camera. Full circle, never cropped. */
.g-loop-rodeo .r-loopie { position: absolute; left: 0; top: 0; width: 112px; height: 112px; pointer-events: none; will-change: transform; z-index: 5; }
.g-loop-rodeo .r-loopie img { display: block; width: 100%; height: 100%; object-fit: contain; transform-origin: 50% 85%; }
.g-loop-rodeo .r-loopie img.pop { animation: loop-rodeo-pop 0.42s cubic-bezier(.2, 1.6, .4, 1); }
.g-loop-rodeo .r-loopie img.hop { animation: loop-rodeo-hop 0.5s cubic-bezier(.2, 1.4, .4, 1); }
@keyframes loop-rodeo-pop { 0% { transform: scale(1); } 35% { transform: scale(1.08, 0.93); } 70% { transform: scale(0.97, 1.04); } 100% { transform: scale(1); } }
@keyframes loop-rodeo-hop { 0% { transform: none; } 30% { transform: translateY(-16px) scale(0.96, 1.05); } 62% { transform: translateY(2px) scale(1.06, 0.94); } 100% { transform: none; } }

/* Loopie's speech: beside him on phones (keeps the field clear), above him on wide screens. Never on top of his art. */
.g-loop-rodeo .r-say { position: absolute; z-index: 30; max-width: min(300px, calc(100% - 32px)); padding: 11px 14px; border-radius: 16px; background: var(--ui-surface); color: var(--ui-fg);
  font: 500 15px/1.35 var(--font-ui); box-shadow: 0 10px 28px rgba(0, 0, 0, 0.3); pointer-events: none; left: 16px; transform-origin: 18px 100%; text-wrap: pretty; }
.g-loop-rodeo .r-say::after { content: ""; position: absolute; left: 22px; bottom: -8px; width: 16px; height: 16px; background: inherit; transform: rotate(45deg); border-radius: 3px; }
.g-loop-rodeo .r-say.side { transform-origin: 0 22px; }
.g-loop-rodeo .r-say.side::after { left: -6px; top: 16px; bottom: auto; }
.g-loop-rodeo .r-say.ts-say-in { animation: loop-rodeo-say-in 0.28s cubic-bezier(.2, 1.4, .4, 1) both; }
@keyframes loop-rodeo-say-in { from { opacity: 0; transform: translateY(8px) scale(0.92); } to { opacity: 1; transform: none; } }

/* The active critter's brand sign: the player's own words, so 15px and never clipped (wraps to two lines). */
.g-loop-rodeo .r-banner { position: absolute; left: 0; top: 0; z-index: 12; pointer-events: none; background: var(--sign); color: var(--sign-ink);
  font: 600 15px/1.15 var(--font-ui); letter-spacing: 0.04em; text-align: center; padding: 8px 12px 7px; border-radius: 7px; width: max-content; max-width: min(240px, 66%);
  white-space: normal; overflow-wrap: anywhere; text-wrap: balance; box-shadow: 0 4px 0 rgba(0, 0, 0, 0.22), 0 8px 18px rgba(0, 0, 0, 0.25); will-change: transform; border: 1px solid rgba(60, 30, 10, 0.25); }
.g-loop-rodeo .r-banner::after { content: ""; position: absolute; left: 50%; bottom: -10px; width: 2px; height: 10px; background: var(--sign-ink); opacity: 0.5; }
.g-loop-rodeo .r-banner.big { font-size: 16px; padding: 9px 13px 8px; }
.g-loop-rodeo .r-banner.gold { background: linear-gradient(135deg, #fff3c2, #ffd36b 55%, #f0a63a); color: #3a2405; border-color: rgba(120, 70, 10, 0.4);
  box-shadow: 0 4px 0 rgba(120, 70, 10, 0.4), 0 0 24px rgba(255, 211, 107, 0.6); }

/* HUD: below the console's game bar (leave + name on the left, sound + settings on the right). */
.g-loop-rodeo .r-hud { position: absolute; z-index: 20; left: 0; right: 0; top: calc(env(safe-area-inset-top, 0px) + 62px); display: flex; justify-content: space-between; align-items: flex-start; padding-inline: 12px 14px; pointer-events: none; }
.g-loop-rodeo .r-gauge, .g-loop-rodeo .r-tally { background: var(--hud); color: var(--ui-fg); border: 1px solid var(--ui-line); border-radius: 16px; padding: 8px 12px 9px; box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18); }
.g-loop-rodeo .r-gauge { display: flex; align-items: center; gap: 10px; }
.g-loop-rodeo .r-gauge svg { width: 64px; height: 40px; overflow: visible; }
.g-loop-rodeo .r-num { font: 600 22px/1 var(--font-ui); font-variant-numeric: tabular-nums; display: block; }
.g-loop-rodeo .r-unit { font: 600 12px/1 var(--font-ui); letter-spacing: 0.1em; color: var(--ui-muted); display: block; margin-top: 4px; text-transform: uppercase; }
.g-loop-rodeo .r-tally { text-align: right; min-height: 59px; display: flex; flex-direction: column; justify-content: center; }
.g-loop-rodeo .r-tally.bump .r-num { animation: loop-rodeo-bump 0.45s cubic-bezier(.2, 1.6, .4, 1); }
@keyframes loop-rodeo-bump { 0% { transform: none; } 35% { transform: scale(1.22); } 100% { transform: none; } }

/* The lasso ring: circle your thumb with the glowing knot. The canvas draws; the button takes input. */
.g-loop-rodeo .r-ringzone { position: absolute; z-index: 15; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 16px); width: 228px; height: 228px; transform: translateX(-50%);
  transition: transform 0.38s cubic-bezier(.2, 1.7, .4, 1); }
.g-loop-rodeo .r-ringzone.press { transform: translateX(-50%) scale(0.965); transition-duration: 0.09s; }
.g-loop-rodeo .r-ringzone.in { animation: loop-rodeo-ringin 0.6s cubic-bezier(.2, 1.5, .4, 1) backwards; }
@keyframes loop-rodeo-ringin { from { opacity: 0; transform: translateX(-50%) translateY(26px) scale(0.82); } to { opacity: 1; transform: translateX(-50%); } }
.g-loop-rodeo .r-ring { position: absolute; left: -24px; top: -24px; width: calc(100% + 48px); height: calc(100% + 48px); pointer-events: none; }
.g-loop-rodeo .r-ringbtn { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 50%; border: 0; background: transparent; padding: 0; cursor: grab; touch-action: none; -webkit-user-select: none; user-select: none; }
.g-loop-rodeo .r-ringbtn:active { cursor: grabbing; }
.g-loop-rodeo .r-ringbtn:focus-visible { outline: 3px solid var(--ui-accent); outline-offset: 4px; }
.g-loop-rodeo .r-ringtext { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 62%; text-align: center; pointer-events: none; display: flex; flex-direction: column; gap: 4px; align-items: center; text-wrap: balance; }
.g-loop-rodeo .r-ringtext b { font: 600 15px/1.1 var(--font-ui); letter-spacing: 0.04em; text-transform: uppercase; color: var(--ui-fg); text-shadow: 0 1px 8px rgba(0, 0, 0, 0.45); }
.g-loop-rodeo .r-ringtext span { font: 500 12px/1.25 var(--font-ui); color: var(--ui-fg); opacity: 0.88; text-shadow: 0 1px 6px rgba(0, 0, 0, 0.5); }
.tsg[data-scene="bright"] .g-loop-rodeo .r-ringtext b, .tsg[data-scene="bright"] .g-loop-rodeo .r-ringtext span { text-shadow: 0 1px 8px rgba(255, 240, 220, 0.95); }
.g-loop-rodeo .r-judge { position: absolute; left: 50%; top: -14px; transform: translateX(-50%); font: 700 19px/1 var(--font-ui); letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; pointer-events: none; opacity: 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.35); }
.g-loop-rodeo .r-judge.show { animation: loop-rodeo-judge 0.7s ease-out both; }
@keyframes loop-rodeo-judge { 0% { opacity: 0; transform: translate(-50%, 8px) scale(0.8); } 18% { opacity: 1; transform: translate(-50%, 0) scale(1.08); } 70% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -10px); } }
.g-loop-rodeo .r-assist { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 3; white-space: nowrap; font-size: 14px; background: var(--ui-surface) !important; box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3); }

/* Paddock time: a card over the world (worry postponement). */
.g-loop-rodeo .r-scene { position: absolute; inset: 0; z-index: 25; display: flex; flex-direction: column; pointer-events: none; }
.g-loop-rodeo .r-scene > * { pointer-events: auto; }
.g-loop-rodeo .r-card { margin: auto 12px calc(env(safe-area-inset-bottom, 0px) + 16px); align-self: center; width: min(460px, calc(100% - 24px)); background: var(--card); color: var(--ui-fg); border-radius: 22px; padding: 16px 18px 16px;
  position: relative; box-shadow: 0 18px 50px rgba(0, 0, 0, 0.4); display: flex; flex-direction: column; gap: 12px; max-height: calc(100% - 90px); overflow: auto; }
.g-loop-rodeo .r-card::before { content: ""; position: absolute; inset: 6px; border-radius: 17px; border: 1.5px dashed var(--card-stitch); pointer-events: none; }
.g-loop-rodeo .r-cardhead { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.g-loop-rodeo .r-card h2 { margin: 0; font: 400 23px/1.15 var(--font-display); letter-spacing: 0.02em; text-wrap: balance; }
.g-loop-rodeo .r-card p { margin: 0; font: 400 15px/1.45 var(--font-ui); color: var(--ui-muted); text-wrap: pretty; }
.g-loop-rodeo .r-link { appearance: none; background: none; border: 0; color: var(--ui-fg); font: 500 15px/1 var(--font-ui); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; padding: 10px 4px; min-height: 44px; opacity: 0.85; flex: none; }
.g-loop-rodeo .r-slots { display: flex; flex-wrap: wrap; gap: 8px; }
.g-loop-rodeo .r-slot { display: flex; flex-direction: column; align-items: center; gap: 3px; flex: 1 1 0; min-width: 92px; padding: 9px 10px 8px; border-radius: 16px; }
.g-loop-rodeo .r-slot b { font: 600 17px/1.1 var(--font-ui); font-variant-numeric: tabular-nums; white-space: nowrap; }
.g-loop-rodeo .r-slot span { font: 600 12px/1.1 var(--font-ui); letter-spacing: 0.08em; text-transform: uppercase; color: var(--ui-muted); }
.g-loop-rodeo .r-alm { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; padding-top: 6px; border-top: 1px solid var(--ui-line); }
.g-loop-rodeo .r-alm canvas { width: 36px; height: 30px; flex: none; }
.g-loop-rodeo .r-almnew { font: 600 13px/1.3 var(--font-ui); color: var(--ui-accent); margin-left: 4px; }

/* The camp sign: the tempo drop stamped in Rye, with a prize rosette for sync (Bronze / Silver / Gold). */
.g-loop-rodeo .r-sign { position: absolute; z-index: 22; left: 50%; top: 0; display: flex; align-items: center; gap: 14px; transform: translateX(-50%); pointer-events: none; }
.g-loop-rodeo .r-sign.show { animation: loop-rodeo-sign 0.75s cubic-bezier(.2, 1.5, .4, 1) both; }
@keyframes loop-rodeo-sign { from { opacity: 0; transform: translateX(-50%) translateY(30px) scale(0.6) rotate(-5deg); } to { opacity: 1; transform: translateX(-50%); } }
.g-loop-rodeo .r-sign.gone { animation: loop-rodeo-sign-out 0.6s ease both; }
@keyframes loop-rodeo-sign-out { from { opacity: 1; transform: translateX(-50%); } to { opacity: 0; transform: translateX(-50%) translateY(12px) scale(0.96); } }
.g-loop-rodeo .r-board { position: relative; padding: 9px 18px 10px; border-radius: 9px; color: #2a180b; text-align: center;
  background: repeating-linear-gradient(0deg, rgba(90, 50, 20, 0.1) 0 2px, transparent 2px 9px), linear-gradient(180deg, #f0cf9c, #d8a764);
  box-shadow: 0 5px 0 rgba(60, 30, 10, 0.5), 0 16px 34px rgba(0, 0, 0, 0.4); border: 2px solid rgba(70, 38, 14, 0.6); }
.g-loop-rodeo .r-board::before, .g-loop-rodeo .r-board::after { content: ""; position: absolute; top: calc(100% - 4px); width: 9px; height: 30px; background: linear-gradient(90deg, #4b3122, #6b4a33); border-radius: 0 0 3px 3px; z-index: -1; }
.g-loop-rodeo .r-board::before { left: 20%; } .g-loop-rodeo .r-board::after { right: 20%; }
.g-loop-rodeo .r-board small { display: block; font: 600 12px/1.1 var(--font-ui); letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.82; }
.g-loop-rodeo .r-board b { display: block; font: 400 clamp(24px, 7.6cqw, 31px)/1.05 var(--font-display); letter-spacing: 0.01em; white-space: nowrap; margin-top: 4px; }
.g-loop-rodeo .r-board b i { font: 700 14px/1 var(--font-ui); font-style: normal; letter-spacing: 0.08em; margin-left: 5px; }
.g-loop-rodeo .r-rosette { position: relative; width: 78px; height: 78px; flex: none; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border-radius: 50%;
  background: radial-gradient(circle, var(--ro-in) 0 50%, var(--ro-a) 51% 55%, transparent 56%), repeating-conic-gradient(var(--ro-a) 0 9deg, var(--ro-b) 9deg 18deg); box-shadow: 0 6px 16px rgba(0, 0, 0, 0.38); }
.g-loop-rodeo .r-rosette::before, .g-loop-rodeo .r-rosette::after { content: ""; position: absolute; top: 58px; width: 19px; height: 38px; background: linear-gradient(180deg, var(--ro-a), var(--ro-b)); z-index: -1;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%); }
.g-loop-rodeo .r-rosette::before { left: 17px; transform: rotate(14deg); } .g-loop-rodeo .r-rosette::after { right: 17px; transform: rotate(-14deg); }
.g-loop-rodeo .r-rosette b { font: 400 15px/1 var(--font-display); color: var(--ro-ink); }
.g-loop-rodeo .r-rosette span { font: 700 13px/1 var(--font-ui); color: var(--ro-ink); margin-top: 3px; font-variant-numeric: tabular-nums; }
.g-loop-rodeo .r-rosette.gold { --ro-a: #e9952c; --ro-b: #ffd36b; --ro-in: #fff3c8; --ro-ink: #4a2c05; }
.g-loop-rodeo .r-rosette.silver { --ro-a: #8492ad; --ro-b: #d3dbe9; --ro-in: #f4f6fb; --ro-ink: #24304a; }
.g-loop-rodeo .r-rosette.bronze { --ro-a: #a55f34; --ro-b: #e3a676; --ro-in: #fae0c9; --ro-ink: #4a2610; }

@container (min-width: 760px) {
  .g-loop-rodeo .r-ringzone { width: 252px; height: 252px; bottom: 24px; }
  .g-loop-rodeo .r-card { margin-bottom: 26px; }
  .g-loop-rodeo .r-say { font-size: 16px; }
  .g-loop-rodeo .r-board b { font-size: 38px; }
  .g-loop-rodeo .r-rosette { width: 88px; height: 88px; }
  .g-loop-rodeo .r-rosette::before, .g-loop-rodeo .r-rosette::after { top: 66px; }
}
@container (max-height: 660px) {
  .g-loop-rodeo .r-ringzone { width: 196px; height: 196px; bottom: 10px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, UI = ctx.ui;
      const TAU = Math.PI * 2, KEY = 'loop-rodeo:';
      const dev = S.isDev();
      let an = ctx.analysis || {};
      let herdLocked = false;
      if (ctx.analysisReady && ctx.analysisReady.then) ctx.analysisReady.then(a => { if (a && !herdLocked && a.safety !== 'support') an = a; }, () => {});

      /* ================= species, lines, paddock time (folded in from rodeo-engine.js) ================= */
      const R = {};
      /* Loop species: each maps to a pattern people recognise, never a diagnosis. */
      R.SPECIES = {
        replay: { name: 'Replay Ram', wool: '#f4ead8', woolB: '#e6d5ba', face: '#6d4c5c', feature: 'horns', what: 'Re-runs something that already happened, hoping for a different ending.' },
        whatif: { name: 'What-If Woolly', wool: '#e5dcff', woolB: '#cbbcf5', face: '#5b4a7a', feature: 'fringe', what: 'Gallops into the future and comes back with worst guesses.' },
        shouldhave: { name: 'Should-Have Shearling', wool: '#dfe8f2', woolB: '#c3d2e2', face: '#4f5d70', feature: 'droop', what: 'Keeps a list of what you ought to have done differently.' },
        mindread: { name: 'Mind-Read Merino', wool: '#ffe3d6', woolB: '#f6c6b2', face: '#7a4d45', feature: 'antenna', what: 'Is sure it knows what everyone else is thinking.' },
        todo: { name: 'To-Do Tumbler', wool: '#dcf4e6', woolB: '#b9e3cb', face: '#3f6652', feature: 'tag', what: 'Carries every unfinished task at once, all at full volume.' },
        worstcase: { name: 'Worst-Case Woolly', wool: '#d9dbe3', woolB: '#b7bac8', face: '#454a5e', feature: 'frizz', what: 'Skips straight from a small thing to the ending of the world.' },
        body: { name: 'Heartbeat Hogget', wool: '#ffd9de', woolB: '#f2b6bf', face: '#7a3b48', feature: 'heart', what: 'Lives in your chest and stomach, turning a thought into a thumping heart.' },
        urge: { name: 'Urge Ewe', wool: '#fbeab4', woolB: '#ecd282', face: '#6b5332', feature: 'bell', what: 'Rings its little bell until you do the thing, right now.' },
        other: { name: 'Loop Lamb', wool: '#fbf6ee', woolB: '#eadfcd', face: '#66545a', feature: 'none', what: 'A thought that just keeps coming round.' },
        golden: { name: 'Golden Fleece', wool: '#ffe39a', woolB: '#f0b84e', face: '#7a5222', feature: 'sparkle', what: 'A rare golden one that only turns up for regulars.' }
      };
      R.LOOPS = Object.keys(R.SPECIES);
      R.LINES = {
        intro: {
          Jolly: ['Whoa, that’s a lively herd! Swing the rope with me and we’ll bring them home.', 'Big herd tonight. Circle the rope with the knot and we’ll round them up.'],
          Cheeky: ['Your brain left the gate open again. Classic. Grab the rope.', 'Look at this rabble. Right, cowpoke, ride that knot.'],
          Unfiltered: ['That’s a damn stampede. Circle with the knot and rope the lot.', 'Your head’s a rodeo. Swing the rope with the knot. Go.']
        },
        due: {
          Jolly: 'Paddock time! The big one’s back for its visit. Let’s ride with it gently.',
          Cheeky: 'Paddock time! The big one’s back. Right on schedule, for once.',
          Unfiltered: 'Paddock time. The big one’s back, as booked. Let’s ride.'
        },
        catch: {
          Jolly: ['Yee-haw! One home safe.', 'Lovely rope work!', 'That one’s snoozing already.', 'Gentle hands, steady loop.'],
          Cheeky: ['Gotcha, you woolly menace.', 'In the pen. Stay there.', 'Look at you, cowpoke.', 'Too slow, fluffball.'],
          Unfiltered: ['Roped. Next.', 'Sit down, you noisy thing.', 'That’s how it’s done.', 'One less galloping idiot.']
        },
        slack: {
          Jolly: ['Catch up with the glowing knot!', 'Follow the knot round, nice and smooth.'],
          Cheeky: ['The knot’s over there, partner.', 'You’re swinging solo. Follow the knot.'],
          Unfiltered: ['Wrong spot. Ride the knot.', 'Stay on the knot. That’s the whole trick.']
        },
        golden: { Jolly: 'Whoa, a golden one! They only turn up for regulars.', Cheeky: 'Is that… gold? Fancy. Regulars get perks.', Unfiltered: 'A golden one. Rare. Rope it.' },
        goldenCaught: { Jolly: 'Golden Fleece, safe and sound!', Cheeky: 'Shiny. Into the pen, your majesty.', Unfiltered: 'Got the gold one. Nice.' },
        bounce: { Jolly: 'Boing! Too big for my little rope.', Cheeky: 'Yeah, no. That one laughed at the rope.', Unfiltered: 'Rope bounced. Of course it did.' },
        core: {
          Jolly: 'This big one isn’t going in a pen, and that’s okay. Let it rest by the fire with you.',
          Cheeky: 'This one’s too big for the pen. Fine. It can sit by the fire and behave.',
          Unfiltered: 'You can’t rope this one. You don’t need to. Let it lie down by the fire.'
        },
        still: { Jolly: 'Rest your thumb on the knot. Stay still while it settles.', Cheeky: 'Thumb on the knot. Now do the hardest thing: nothing.', Unfiltered: 'Thumb on the knot. Hold still. Let it slow down.' },
        wobble: { Jolly: 'Easy. Stillness is the trick.', Cheeky: 'Shh. Statue mode.', Unfiltered: 'Stop fidgeting. Stay put.' },
        close: { Jolly: 'Herd’s resting. The thoughts are still here, just not stampeding.', Cheeky: 'Look at that. Same thoughts, way less galloping.', Unfiltered: 'Still your thoughts. Just quieter now.' },
        paddock: { Jolly: 'Paddock time is {time}. Till then, it grazes.', Cheeky: 'Booked in for {time}. It can wait. So can you.', Unfiltered: '{time}. That’s its slot. Not before.' },
        nopaddock: { Jolly: 'No slot needed. It can graze by the fire.', Cheeky: 'Fine, it can freeload by the fire.', Unfiltered: 'No booking. It just grazes.' },
        ride: { Jolly: 'No rush. Tap Ride along and any touch on the rope counts.', Cheeky: 'Want the easy saddle? Tap Ride along.', Unfiltered: 'Timing’s optional. Tap Ride along.' },
        rideOn: { Jolly: 'Ride along it is. Just keep a thumb on the rope.', Cheeky: 'Easy saddle, engaged. No shame in it.', Unfiltered: 'Fine. Any touch counts now.' },
        sky: { Jolly: 'Look up. That’s your herd, resting in the stars.', Cheeky: 'Your thoughts, now a constellation. Very fancy.', Unfiltered: 'There they are. Up in the sky. Quiet.' }
      };
      /* When the reading is about health, money, housing or legal stuff: gentle lines only, no jokes near the concern. */
      const vline = (set) => {
        if (!set) return '';
        if (an.safety === 'care' && set.Jolly) return Array.isArray(set.Jolly) ? S.pick(set.Jolly) : set.Jolly;
        return ctx.line(set);
      };
      const lines = (key) => vline(R.LINES[key]);

      const GENERIC = [{ label: 'THAT THING I SAID', loop: 'replay' }, { label: 'TOMORROW’S LIST', loop: 'todo' }, { label: 'WHAT IF IT GOES WRONG', loop: 'whatif' },
        { label: 'SHOULD’VE DONE BETTER', loop: 'shouldhave' }, { label: 'WHAT THEY THINK', loop: 'mindread' }];
      const loopOf = (l) => (R.SPECIES[l] && l !== 'golden' ? l : 'other');
      const labelOf = (s) => S.clean(s, 40).toUpperCase();
      /* The herd is the player's own reading: strands run laps, the core is the big one. */
      function herdFrom(a) {
        const core = a && a.core && a.core.label ? { label: labelOf(a.core.label), loop: loopOf(a.core.loop) } : { label: 'EVERYTHING AT ONCE', loop: 'other' };
        const seen = new Set([core.label]), critters = [];
        (a && Array.isArray(a.strands) ? a.strands : []).forEach(s => {
          if (!s || !s.label) return;
          const label = labelOf(s.label);
          if (label.length < 2 || seen.has(label)) return;
          seen.add(label); critters.push({ label, loop: loopOf(s.loop) });
        });
        for (const g of GENERIC) { if (critters.length >= 4) break; if (!seen.has(g.label)) { seen.add(g.label); critters.push(Object.assign({}, g)); } }
        return { critters, core };
      }

      /* Paddock time: a booked slot for the big worry. Stores a time and a species, never words. */
      const SLOTS = [[12, 30], [17, 30], [19, 0]];
      R.timeOnly = (d) => d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }).replace(/\s?([ap])\.?m\.?/i, (m, ap) => ' ' + ap.toLowerCase() + 'm');
      R.dayWord = (d, now) => {
        if (d.toDateString() === now.toDateString()) return 'today';
        if (new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toDateString() === d.toDateString()) return 'tomorrow';
        return d.toLocaleDateString('en-AU', { weekday: 'short' });
      };
      R.timeLabel = (at, now) => { now = now || new Date(); const d = new Date(at); return R.timeOnly(d) + ' ' + R.dayWord(d, now); };
      R.slots = (now) => {
        now = now || new Date();
        const out = [];
        for (let day = 0; day < 2 && out.length < 3; day++) {
          SLOTS.forEach(([hh, mm]) => {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, hh, mm, 0, 0);
            if (d.getTime() - now.getTime() >= 30 * 60000 && out.length < 3) out.push({ at: d.getTime(), time: R.timeOnly(d), day: R.dayWord(d, now), label: R.timeLabel(d.getTime(), now) });
          });
        }
        return out;
      };
      R.paddock = {
        get() { const p = S.store.get(KEY + 'paddock', null); return p && typeof p.at === 'number' ? p : null; },
        set(at, loop) { S.store.set(KEY + 'paddock', { at, loop: loopOf(loop), set: Date.now() }); },
        clear() { S.store.set(KEY + 'paddock', null); }
      };
      /* A booked visit that has come round: Loopie mentions it and the record clears. */
      let paddockDue = null;
      (() => {
        const p = R.paddock.get(); if (!p) return;
        const now = Date.now();
        if (now > p.at + 36 * 3600000) { R.paddock.clear(); return; }
        if (now >= p.at) { paddockDue = p; R.paddock.clear(); ctx.track('paddock_visit', {}); }
      })();
      /* Herd Almanac = the kit collection (one entry per species, never words). Fold in any older per-game tally once. */
      (() => {
        const old = S.store.get(KEY + 'almanac', null);
        if (old && typeof old === 'object') { Object.keys(old).forEach(k => { if (R.SPECIES[k]) K.collect(k); }); S.store.set(KEY + 'almanac', null); }
      })();

      /* Herd speed comes from the console's before-rating (0-10 -> 1-10, default 6). */
      const beforeIn = ctx.before == null || ctx.before === '' || !isFinite(Number(ctx.before)) ? null : S.clamp(Number(ctx.before), 0, 10);
      const herdSpeed = beforeIn == null ? 6 : Math.round(1 + beforeIn * 0.9);

      /* Tonight's prairie (same all day, different tomorrow): a sky and a visiting critter that reacts to your riding. */
      const NIGHTS = [
        { id: 'fireflies', visitor: 'owl', sky: { dark: 'Fireflies are out', bright: 'Dandelion fluff is drifting' } },
        { id: 'tumbleweed', visitor: 'jackrabbit', sky: { dark: 'Tumbleweeds are rolling', bright: 'Tumbleweeds are rolling' } },
        { id: 'meteors', visitor: 'coyote', sky: { dark: 'Shooting stars tonight', bright: 'A balloon’s drifting over' } },
        { id: 'bigmoon', visitor: 'armadillo', sky: { dark: 'Harvest moon tonight', bright: 'Big sunset tonight' } },
        { id: 'aurora', visitor: 'tortoise', sky: { dark: 'Northern lights tonight', bright: 'Candy-floss clouds tonight' } }
      ];
      const WHO = { owl: 'a barn owl', jackrabbit: 'a jackrabbit', coyote: 'a coyote', armadillo: 'an armadillo', tortoise: 'a tortoise' };
      const nightIdx = dev && typeof window.__lrDay === 'number' ? ((window.__lrDay % NIGHTS.length) + NIGHTS.length) % NIGHTS.length : NIGHTS.indexOf(K.dailyPick(NIGHTS));
      const night = NIGHTS[nightIdx];
      function nightLine() {
        const sky = night.sky[S.scene() === 'dark' ? 'dark' : 'bright'], who = WHO[night.visitor], Who = who[0].toUpperCase() + who.slice(1);
        return vline({ Jolly: sky + ', and ' + who + ' has come to watch the rodeo!', Cheeky: sky + '. Also ' + who + ' in the front row. No pressure.', Unfiltered: sky + '. ' + Who + ' is watching. Let’s ride.' });
      }
      /* Regulars: a Golden Fleece joins the herd on the 3rd finished ride, then every 3rd (deterministic, never a lottery). */
      const visits = K.visits();
      const golden = (dev && window.__lrGolden === true) || (visits >= 2 && (visits - 2) % 3 === 0);

      /* ================= markup ================= */
      /* Adaptive quality: full device sharpness at 60 fps, stepping down a rung only while this device can't hold the frame
         rate. Smoothness goes first (the world at 30 fps, the rope still at 60), sharpness only after that. */
      const D0 = Math.min(window.devicePixelRatio || 1, 2);
      const RUNGS = [
        { dpr: D0 }, { dpr: D0, half: 1 }, { dpr: D0, half: 1, all30: 1 }, { dpr: Math.min(D0, 1.5), half: 1, all30: 1 },
        { dpr: Math.min(D0, 1.5), half: 1, all30: 1, low: 1 }, { dpr: Math.min(D0, 1.25), half: 1, all30: 1, low: 1 }
      ];
      const view = { rung: 0, dpr: D0, half: false, low: false, all30: false, samples: [], lastCheck: 0, lastNow: 0, cost: 0, checked: false, warn: false, calm: 0, recovered: false, born: performance.now() };
      const cvOpts = { maxDpr: view.dpr };
      /* The world canvas is opaque (alpha: false): the compositor then knows nothing underneath can show through and skips
         drawing the console's backdrop below it every frame. Otherwise it behaves like K.canvas (fills the game, refits on resize). */
      const cv = (() => {
        const c = h('canvas', { class: 'gk-canvas', 'aria-hidden': 'true' });
        el.append(c);
        try { c.getContext('2d', { alpha: false }); } catch (e) { /* default context */ }
        const st = { el: c, g: null, w: 0, h: 0, dpr: 1 }, cbs = [];
        st.fit = () => {
          const w = c.clientWidth || el.clientWidth, hh = c.clientHeight || el.clientHeight;
          if (!w || !hh) return;
          const r = S.fitCanvas(c, w, hh, cvOpts.maxDpr || 2);
          st.g = r.ctx; st.dpr = r.dpr; st.w = w; st.h = hh;
          cbs.forEach(f => { try { f(st); } catch (e) { console.error(e); } });
        };
        st.onResize = (f) => { cbs.push(f); if (st.w) f(st); };
        try { const ro = new ResizeObserver(() => st.fit()); ro.observe(c); S.onDestroy(() => ro.disconnect()); } catch (e) { S.listen(window, 'resize', st.fit); }
        st.fit();
        return st;
      })();
      el.insertAdjacentHTML('beforeend', `
        <div class="r-loopie" aria-hidden="true"><img alt="" draggable="false"></div>
        <div class="r-say" hidden aria-live="polite"><span class="r-say-text"></span></div>
        <div class="r-banner gk-user" hidden></div>
        <div class="r-hud" hidden>
          <div class="r-gauge" role="img" aria-label="Herd speed">
            <svg viewBox="0 0 64 40" aria-hidden="true">
              <path d="M6 36 A26 26 0 0 1 58 36" fill="none" stroke="var(--ui-line)" stroke-width="6" stroke-linecap="round"/>
              <path class="r-gaugearc" d="M6 36 A26 26 0 0 1 58 36" fill="none" stroke="var(--fire)" stroke-width="6" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="40"/>
              <line class="r-needle" x1="32" y1="36" x2="32" y2="14" stroke="var(--ui-fg)" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="32" cy="36" r="3.5" fill="var(--ui-fg)"/>
            </svg>
            <div><span class="r-num r-bpm">120</span><span class="r-unit">Herd BPM</span></div>
          </div>
          <div class="r-tally"><span class="r-num r-pen">0 / 5</span><span class="r-unit">In the pen</span></div>
        </div>
        <div class="r-ringzone" hidden>
          <canvas class="r-ring" aria-hidden="true"></canvas>
          <div class="r-ringtext" aria-hidden="true"><b class="r-ringhead">Ride the knot</b><span class="r-ringsub">Circle with it</span></div>
          <button class="r-ringbtn" type="button" aria-label="Lasso. Circle your thumb round the rope with the glowing knot, or tap when the knot reaches a post. The space bar works too."></button>
          <div class="r-judge" aria-live="polite"></div>
        </div>
        <div class="r-sign" hidden role="status">
          <div class="r-board"><small>Herd tempo</small><b class="r-signbpm">0 → 0<i>BPM</i></b></div>
          <div class="r-rosette" hidden><b class="r-rotier">Gold</b><span class="r-ropct">0%</span></div>
        </div>
        <section class="r-scene r-paddocksc scene-rise" hidden aria-label="Paddock time">
          <div class="r-card">
            <div class="r-cardhead"><h2>Paddock time</h2><button class="r-link r-noslot" type="button">Skip for now</button></div>
            <p>The big one doesn’t have to go anywhere. Give it a set time to visit instead. Until then, it grazes.</p>
            <div class="r-slots" role="group" aria-label="Pick a time"></div>
            <div class="r-alm" aria-label="Herd Almanac"></div>
          </div>
        </section>`);
      const $ = (s) => el.querySelector(s);
      const loopieWrap = $('.r-loopie'), loopieImg = $('.r-loopie img');
      const sayEl = $('.r-say'), sayText = $('.r-say-text'), banner = $('.r-banner');
      const hud = $('.r-hud'), bpmEl = $('.r-bpm'), tallyEl = $('.r-pen'), tallyBox = $('.r-tally'), gaugeArc = $('.r-gaugearc'), gaugeNeedle = $('.r-needle');
      const ringZone = $('.r-ringzone'), ringCanvas = $('.r-ring'), ringBtn = $('.r-ringbtn'), ringHead = $('.r-ringhead'), ringSub = $('.r-ringsub'), judgeEl = $('.r-judge');
      const paddockSc = $('.r-paddocksc'), paddockCard = $('.r-paddocksc .r-card'), slotsEl = $('.r-slots'), almEl = $('.r-alm');
      const signEl = $('.r-sign'), signBpm = $('.r-signbpm'), rosette = $('.r-rosette');

      /* Console guide fix: the circle demo positions its label with var(--r), which the console only sets on the demo
         element (a sibling of the label), so circle labels collapse onto the ring centre. Give the anchor --r too. */
      const tsgRoot = el.closest('.tsg');
      const guideAnchor = () => (tsgRoot ? tsgRoot.querySelector('.tsg-guide-anchor') : null);
      function circleGuide(spec) {
        const a = guideAnchor(); if (a) a.style.setProperty('--r', Wd.ring.r + 'px');
        K.guide(Object.assign({ g: 'circle', target: ringCenterPoint, r: Wd.ring.r }, spec));
      }
      S.onDestroy(() => { const a = guideAnchor(); if (a) a.style.removeProperty('--r'); });

      /* ================= Loopie ================= */
      const EXPR = {
        dizzy: S.face('loopie', 'E01'), excited: S.face('loopie', 'E03'), laugh: S.face('loopie', 'E18'), shocked: S.face('loopie', 'E58'),
        worried: S.face('loopie', 'E52'), confused: S.face('loopie', 'E87'), half: S.face('loopie', 'E14'), calm: S.face('loopie', 'E12'),
        happy: S.face('loopie', 'E24'), surprised: S.face('loopie', 'E77'), peace: S.face('loopie', 'E02'), wow: S.face('loopie', 'E04'),
        star: S.face('loopie', 'E43'), celebrate: S.face('loopie', 'E80')
      };
      if (!S.opts.staticRender) Object.values(EXPR).forEach(src => { const i = new Image(); i.src = src; });
      loopieImg.src = EXPR.dizzy;
      let faceTimer = 0, baseFace = 'dizzy';
      function face(name, ms) {
        S.cancel(faceTimer);
        if (loopieImg.getAttribute('src') !== EXPR[name]) loopieImg.src = EXPR[name];
        loopieImg.classList.remove('pop', 'hop'); void loopieImg.offsetWidth; loopieImg.classList.add('pop');
        if (ms) faceTimer = S.later(() => { if (loopieImg.getAttribute('src') !== EXPR[baseFace]) loopieImg.src = EXPR[baseFace]; }, ms);
      }
      function setBaseFace(name) { baseFace = name; face(name); }
      function hopLoopie() { if (S.reduced()) return; loopieImg.classList.remove('pop', 'hop'); void loopieImg.offsetWidth; loopieImg.classList.add('hop'); }

      /* ================= world + layout ================= */
      const Wd = { w: 0, h: 0, portrait: true, horizon: 0, fire: { x: 0, y: 0 }, track: { cx: 0, cy: 0, rx: 0, ry: 0 }, pen: { x: 0, y: 0, w: 0, h: 0 }, penSlots: [], penGate: null,
        loopie: { x: 0, y: 0, size: 112, hx: 0, hy: 0 }, unit: 0.8, cam: { y: 0, shake: 0 }, ringTop: 0, ring: { size: 228, cx: 0, cy: 0, r: 91 }, dusk: 0, spot: { x: 0, y: 0 }, groundSpan: 200 };
      let skyCache = null, orbCache = null, mesaTint = null, groundCache = null, mesaFar = null, mesaNear = null, penCache = null, stars = [], clouds = [], palette = {};
      let shooting = null, nextShoot = 5, ringCtx = null, vignette = null, laidOut = false, bgc = null, skyComp = null, groundComp = null, hazeSprite = null, lightSprite = null, twSprite = null, balloonSprite = null;
      const lift = { v: 0, from: 0, to: 0, t: 1, d: 0.5 }; // Loopie hops up to make room for the paddock card
      let loopieMove = null; // Loopie strolls over to the fire for the finale

      function readPalette() {
        const tk = (n) => K.token(n);
        palette = {
          skyTop: tk('--sky-top'), skyMid: tk('--sky-mid'), skyLow: tk('--sky-low'), orb: tk('--orb'), orbGlow: tk('--orb-glow'),
          mesaFar: tk('--mesa-far'), mesa: tk('--mesa'), groundTop: tk('--ground-top'), groundBottom: tk('--ground-bottom'), grass: tk('--grass'),
          wood: tk('--wood'), woodDark: tk('--wood-dark'), rope: tk('--rope'), ropeDark: tk('--rope-dark'), sync: tk('--sync'), slack: tk('--slack'),
          dark: S.scene() === 'dark'
        };
      }

      function layout() {
        Wd.w = Math.max(320, cv.w || el.clientWidth || 390); Wd.h = Math.max(480, cv.h || el.clientHeight || 844);
        Wd.portrait = Wd.h > Wd.w * 1.05;
        const wide = Wd.w >= 760, short = Wd.h <= 660;
        const size = wide ? 252 : (short ? 196 : 228), bottom = wide ? 24 : (short ? 10 : 16);
        ringZone.style.width = ringZone.style.height = size + 'px';
        ringZone.style.bottom = 'calc(env(safe-area-inset-bottom, 0px) + ' + bottom + 'px)';
        const sb = parseFloat(getComputedStyle(ringZone).bottom); // includes the home-indicator inset when there is one
        const ringBottom = isFinite(sb) ? sb : bottom;
        Wd.ring = { size, cx: Wd.w / 2, cy: Wd.h - ringBottom - size / 2, r: Math.round(size * 0.4) };
        Wd.ringTop = Wd.h - ringBottom - size;
        Wd.loopie.size = wide ? 140 : (short ? 92 : 112);
        loopieWrap.style.width = loopieWrap.style.height = Wd.loopie.size + 'px';
        if (Wd.portrait) {
          Wd.horizon = Wd.h * 0.40;
          const groundSpan = Wd.groundSpan = Wd.ringTop - 24 - Wd.horizon;
          Wd.fire = { x: Wd.w * 0.5, y: Wd.horizon + groundSpan * 0.56 };
          const rx = Math.min(Wd.w * 0.39, 210); // the whole herd stays inside the frame at the ends of the loop
          Wd.track = { cx: Wd.fire.x, cy: Wd.fire.y, rx, ry: rx * 0.32 };
          Wd.pen = { x: Wd.w * 0.58, y: Wd.horizon + groundSpan * 0.06, w: Wd.w * 0.36, h: Math.max(40, groundSpan * 0.16) };
          Wd.loopie.hx = 14 + Wd.loopie.size / 2;
          Wd.loopie.hy = Wd.ringTop - Wd.loopie.size * 0.5 + 6;
          Wd.unit = S.clamp(Wd.w / 370, 0.8, 1.15);
          Wd.spot = { x: Wd.w * 0.15, y: Wd.horizon + groundSpan * 0.16 };
        } else {
          Wd.horizon = Math.max(Wd.h * 0.3, Math.min(Wd.h * 0.42, Wd.ringTop - 210));
          Wd.groundSpan = Wd.ringTop - 24 - Wd.horizon;
          Wd.fire = { x: Wd.w * 0.48, y: Math.min(Wd.h * 0.6, Wd.ringTop - 100) };
          const rx = Math.min(Wd.w * 0.24, 300);
          Wd.track = { cx: Wd.fire.x, cy: Wd.fire.y, rx, ry: Math.max(26, Math.min(rx * 0.24, Wd.fire.y - Wd.horizon - 40)) };
          Wd.pen = { x: Wd.w * 0.68, y: Wd.horizon + 26, w: Math.min(Wd.w * 0.22, 300), h: 62 };
          Wd.loopie.hx = Math.max(Wd.loopie.size * 0.7, Wd.fire.x - rx - 140);
          Wd.loopie.hy = Wd.fire.y + 26;
          Wd.unit = S.clamp(Wd.h / 690, 0.9, 1.3);
          Wd.spot = { x: Math.min(Wd.w - 70, Wd.fire.x + rx + 120), y: Wd.fire.y + Wd.track.ry * 0.9 };
        }
        if (!loopieMove) { Wd.loopie.x = Wd.loopie.hx; Wd.loopie.y = Wd.loopie.hy; }
        else { const f = finaleLoopieSpot(); loopieMove.x1 = f.x; loopieMove.y1 = f.y; if (loopieMove.t >= loopieMove.d) { Wd.loopie.x = f.x; Wd.loopie.y = f.y; } }
        readPalette();
        buildCaches();
        layoutPenSlots();
        ringCtx = S.fitCanvas(ringCanvas, size + RP * 2, size + RP * 2, view.dpr).ctx;
        hudBottom = 0; bannerKey = '';
        // keep anything already resting where it belongs
        critters.forEach(c => {
          if (c.state === 'pen' && c.penSlot != null) { const s = Wd.penSlots[c.penSlot % Wd.penSlots.length]; c.x = s.x; c.y = s.y; }
          if (c.core && (c.state === 'rest' || c.state === 'stand')) { const r = restPoint(); c.x = r.x; c.y = r.y; }
        });
        placeVisitor();
        initNightFx();
        if (!laidOut) { laidOut = true; Wd.cam.y = campCam(); }
      }

      function mk(cw, ch, opaque) {
        const dpr = view.dpr;
        const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(cw * dpr)); c.height = Math.max(1, Math.ceil(ch * dpr));
        const g = (opaque && c.getContext('2d', { alpha: false })) || c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { c, g, w: cw, h: ch, dpr };
      }
      /* Big layers are blitted 1:1 on whole device pixels: a straight copy instead of a resample (several times cheaper
         without a GPU), so the slow camera cranes cost little more than a still frame. */
      const snap = (v) => Math.round(v * view.dpr) / view.dpr;
      function blit(g, s, x, y) { g.drawImage(s.c, snap(x), snap(y), s.c.width / s.dpr, s.c.height / s.dpr); }
      /* Small solid dots and 4-point glints, stamped like the glows. */
      function dotSprite(rgb) {
        const key = 'dot:' + rgb;
        if (glowCache.has(key)) return glowCache.get(key);
        const s = mk(16, 16); s.g.fillStyle = 'rgb(' + rgb + ')'; s.g.beginPath(); s.g.arc(8, 8, 6.4, 0, TAU); s.g.fill();
        glowCache.set(key, s); return s;
      }
      function starSprite() {
        if (glowCache.has('star4')) return glowCache.get('star4');
        const s = mk(16, 16); s.g.fillStyle = '#fffbe6'; sparkle4(s.g, 8, 8, 7.5);
        glowCache.set('star4', s); return s;
      }
      function shadowSprite() {
        if (glowCache.has('shadow')) return glowCache.get('shadow');
        const s = mk(64, 16); s.g.fillStyle = 'rgba(0,0,0,0.22)'; s.g.beginPath(); s.g.ellipse(32, 8, 30, 6.4, 0, 0, TAU); s.g.fill();
        glowCache.set('shadow', s); return s;
      }
      /* Soft round glows, rendered once and stamped (far cheaper than a gradient per star per frame). */
      const glowCache = new Map();
      function glow(rgb, r) {
        const key = rgb + ':' + r;
        if (glowCache.has(key)) return glowCache.get(key);
        const s = mk(r * 2, r * 2), gr = s.g.createRadialGradient(r, r, 0, r, r, r);
        gr.addColorStop(0, 'rgba(' + rgb + ',1)'); gr.addColorStop(0.35, 'rgba(' + rgb + ',0.45)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
        s.g.fillStyle = gr; s.g.fillRect(0, 0, r * 2, r * 2);
        glowCache.set(key, s);
        return s;
      }
      const orbSpec = () => {
        const big = night.id === 'bigmoon';
        if (palette.dark) return { x: big ? 0.78 : 0.8, r: big ? 46 : 28, col: big ? '#ffe2ae' : palette.orb, glow: big ? 'rgba(255,186,110,0.42)' : palette.orbGlow, low: big };
        return { x: big ? 0.3 : 0.24, r: big ? 56 : 36, col: big ? '#ffd892' : palette.orb, glow: big ? 'rgba(255,170,90,0.6)' : palette.orbGlow, low: big };
      };
      function buildCaches() {
        const w = Wd.w, H = Wd.h;
        const skyH = H * 0.6 + Wd.horizon + 40;
        skyCache = mk(w, skyH);
        {
          const g = skyCache.g, hz = skyH - 40;
          const grad = g.createLinearGradient(0, 0, 0, hz);
          grad.addColorStop(0, palette.skyTop); grad.addColorStop(0.62, palette.skyMid); grad.addColorStop(1, palette.skyLow);
          g.fillStyle = grad; g.fillRect(0, 0, w, skyH);
          const band = g.createLinearGradient(0, hz - H * 0.22, 0, hz + 30);
          band.addColorStop(0, 'rgba(0,0,0,0)'); band.addColorStop(1, palette.dark ? 'rgba(150,110,190,0.28)' : 'rgba(255,200,140,0.35)');
          g.fillStyle = band; g.fillRect(0, hz - H * 0.22, w, H * 0.22 + 40);
          const o = orbSpec();
          const oy = palette.dark ? (o.low ? hz - Math.min(84, H * 0.1) : H * 0.6 + Math.min(H * 0.31, Wd.horizon - 70)) : hz - Math.min(o.low ? 40 : 70, H * 0.08), orr = o.r, R7 = orr * 7;
          orbCache = mk(R7 * 2, R7 * 2); orbCache.x = w * o.x; orbCache.y = oy; orbCache.r = orr;
          const og = orbCache.g;
          // a bloom that falls off like light does (fast near the disc, a long faint tail), never a flat translucent disc
          const gl = og.createRadialGradient(R7, R7, orr * 0.6, R7, R7, orr * (palette.dark ? 5 : 6)), ga = (k) => alphaScale(o.glow, k);
          gl.addColorStop(0, ga(1)); gl.addColorStop(0.16, ga(0.6)); gl.addColorStop(0.38, ga(0.24)); gl.addColorStop(0.66, ga(0.07)); gl.addColorStop(1, ga(0));
          og.fillStyle = gl; og.fillRect(0, 0, R7 * 2, R7 * 2);
          og.fillStyle = o.col; og.beginPath(); og.arc(R7, R7, orr, 0, TAU); og.fill();
          if (palette.dark) {
            og.fillStyle = o.low ? 'rgba(214,170,120,0.35)' : 'rgba(200,190,170,0.35)';
            const k = orr / 28;
            [[-7, -5, 5], [6, 4, 4], [-2, 9, 3], [9, -8, 2.5]].forEach(([dx, dy, rr]) => { og.beginPath(); og.arc(R7 + dx * k, R7 + dy * k, rr * k, 0, TAU); og.fill(); });
          }
        }
        clouds = [];
        const rc = S.rng(31), candy = night.id === 'aurora' && !palette.dark;
        const cloudCol = palette.dark ? '160,150,210' : '255,230,212', candyCols = ['255,190,220', '220,200,255', '255,214,190'];
        const nClouds = candy ? 6 : 4, cloudMaxY = Math.max(10, Wd.horizon - 200);
        for (let i = 0; i < nClouds; i++) {
          const cw = 220 + rc() * 200, chh = 90, c = mk(cw, chh), col = candy ? candyCols[i % 3] : cloudCol, a = palette.dark ? 0.16 : candy ? 0.6 : 0.42;
          c.g.save(); c.g.translate(0, chh / 2); c.g.scale(1, 0.42);
          for (let k = 0; k < 8; k++) {
            const er = 36 + rc() * 50, ex = er + rc() * (cw - 2 * er), ey = (rc() - 0.5) * 30;
            const gg = c.g.createRadialGradient(ex, ey, 0, ex, ey, er);
            gg.addColorStop(0, 'rgba(' + col + ',' + a + ')'); gg.addColorStop(1, 'rgba(' + col + ',0)');
            c.g.fillStyle = gg; c.g.beginPath(); c.g.arc(ex, ey, er, 0, TAU); c.g.fill();
          }
          c.g.restore();
          clouds.push({ c, x: rc() * w, y: -H * 0.25 + rc() * (H * 0.25 + cloudMaxY), v: 4 + rc() * 7 });
        }
        const rnd = S.rng(7);
        stars = [];
        const count = Math.round((w * (Wd.horizon + H * 0.6)) / 2600), high = Wd.horizon - 125;
        for (let i = 0; i < count; i++) { const y = -H * 0.6 + rnd() * (H * 0.6 + Wd.horizon - 30); stars.push({ x: rnd() * w, y, r: rnd() < 0.12 ? 1.6 : 0.9 + rnd() * 0.5, p: rnd() * TAU, s: 0.6 + rnd() * 1.8, tw: y < high && rnd() < 0.45 }); }
        const mesa = (color, heightMax, seed, flat) => {
          const c = mk(w, heightMax + 30); const g = c.g, rr = S.rng(seed), pts = [];
          const mg = g.createLinearGradient(0, 0, 0, heightMax + 30);
          mg.addColorStop(0, shade(color, palette.dark ? 0.06 : 0.08)); mg.addColorStop(1, color);
          g.fillStyle = mg; g.beginPath(); g.moveTo(0, heightMax + 30);
          let x = 0, y = heightMax * (0.55 + rr() * 0.3);
          const L = (px, py) => { g.lineTo(px, py); pts.push([px, py]); };
          L(0, y);
          while (x < w) {
            const step = 30 + rr() * 90;
            if (flat && rr() < 0.35) {
              const top = heightMax * (0.1 + rr() * 0.3);
              L(x + 10, top); L(x + step, top + rr() * 6); x += step + 10; L(x, heightMax * (0.6 + rr() * 0.3));
            } else { x += step; y = heightMax * (0.45 + rr() * 0.5); L(x, y); }
          }
          g.lineTo(w, heightMax + 30); g.closePath(); g.fill();
          c.pts = pts;
          return c;
        };
        mesaFar = mesa(palette.mesaFar, Math.min(110, H * 0.12), 11, true);
        mesaNear = mesa(palette.mesa, Math.min(70, H * 0.08), 23, false);
        const gH = H - Wd.horizon + H * 0.9;
        groundCache = mk(w, gH);
        {
          const g = groundCache.g;
          const grad = g.createLinearGradient(0, 0, 0, H - Wd.horizon);
          grad.addColorStop(0, palette.groundTop); grad.addColorStop(1, palette.groundBottom);
          g.fillStyle = grad; g.fillRect(0, 0, w, gH);
          const rg = S.rng(5); g.strokeStyle = palette.grass; g.lineCap = 'round';
          const tufts = Math.round(w * (H - Wd.horizon) / 900);
          for (let i = 0; i < tufts; i++) {
            const y = Math.pow(rg(), 0.8) * (H - Wd.horizon + 40), x = rg() * w, s = 0.5 + (y / (H - Wd.horizon)) * 1.4;
            g.lineWidth = 1 * s; g.globalAlpha = 0.5 + rg() * 0.5;
            for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x + k * 2 * s, y); g.quadraticCurveTo(x + k * 3 * s, y - 4 * s, x + k * 4.5 * s, y - 7 * s * (0.7 + rg() * 0.6)); g.stroke(); }
          }
          g.globalAlpha = 1;
        }
        const p = Wd.pen;
        penCache = mk(p.w + 20, p.h + 40);
        {
          const g = penCache.g, ox = 10, oy = 26, pw = p.w, ph = p.h;
          g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(ox + pw / 2, oy + ph * 0.62, pw * 0.52, ph * 0.5, 0, 0, TAU); g.fill();
          const post = (x, y, s) => { g.fillStyle = palette.woodDark; g.fillRect(x - 2.2 * s, y - 16 * s, 4.4 * s, 18 * s); g.fillStyle = palette.wood; g.fillRect(x - 1.6 * s, y - 16 * s, 2.4 * s, 17 * s); };
          const rail = (x1, y1, x2, y2, s) => { g.strokeStyle = palette.wood; g.lineWidth = 2.6 * s; g.beginPath(); g.moveTo(x1, y1 - 12 * s); g.lineTo(x2, y2 - 12 * s); g.stroke(); g.beginPath(); g.moveTo(x1, y1 - 6 * s); g.lineTo(x2, y2 - 6 * s); g.stroke(); };
          const back = oy + 4, front = oy + ph;
          for (let i = 0; i <= 6; i++) { const x = ox + 8 + (pw - 16) * i / 6; post(x, back, 0.7); if (i) rail(ox + 8 + (pw - 16) * (i - 1) / 6, back, x, back, 0.7); }
          rail(ox + 8, back, ox, front, 0.85); rail(ox + pw - 8, back, ox + pw, front, 0.85);
          post(ox, front, 1); post(ox + pw, front, 1);
          for (let i = 2; i <= 6; i++) { const x = ox + pw * i / 6; post(x, front, 1); if (i > 2) rail(ox + pw * (i - 1) / 6, front, x, front, 1); }
          post(ox + pw / 6, front, 1);
          rail(ox, front, ox + pw / 6, front, 1);
          Wd.penGate = { x1: ox + pw / 6, x2: ox + pw * 2 / 6, y: front };
        }
        // a warm dust haze over the horizon while the herd is stampeding (fades as the tempo falls)
        hazeSprite = mk(w, 200);
        {
          const g = hazeSprite.g, gr = g.createLinearGradient(0, 0, 0, 200);
          gr.addColorStop(0, 'rgba(255,120,70,0)'); gr.addColorStop(0.7, palette.dark ? 'rgba(255,110,70,0.32)' : 'rgba(255,120,60,0.3)'); gr.addColorStop(1, 'rgba(255,120,70,0)');
          g.fillStyle = gr; g.fillRect(0, 0, w, 200);
        }
        // the campfire's pool of light on the ground
        lightSprite = mk(256, 256);
        {
          const g = lightSprite.g, gr = g.createRadialGradient(128, 128, 3, 128, 128, 128);
          gr.addColorStop(0, palette.dark ? 'rgba(255,170,80,0.34)' : 'rgba(255,190,110,0.22)'); gr.addColorStop(1, 'rgba(255,150,60,0)');
          g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
        }
        twSprite = mk(34, 34);
        {
          const g = twSprite.g, rr = S.rng(17); g.translate(17, 17); g.lineCap = 'round';
          g.strokeStyle = palette.dark ? '#9a7d58' : '#8a6538'; g.lineWidth = 1.1;
          for (let i = 0; i < 26; i++) { const a0 = rr() * TAU, r0 = 15 * (0.35 + rr() * 0.65); g.globalAlpha = 0.55 + rr() * 0.45; g.beginPath(); g.arc((rr() - 0.5) * 7, (rr() - 0.5) * 7, r0, a0, a0 + 1.4 + rr() * 2.2); g.stroke(); }
          g.globalAlpha = 1;
        }
        balloonSprite = mk(40, 56);
        {
          const g = balloonSprite.g;
          g.save(); g.beginPath(); g.ellipse(20, 18, 15, 17, 0, 0, TAU); g.clip();
          ['#e8604c', '#fff1d6', '#e8604c', '#ffcf6b', '#e8604c'].forEach((c, i) => { g.fillStyle = c; g.fillRect(5 + i * 6, 0, 6, 40); });
          g.restore();
          g.strokeStyle = 'rgba(80,40,20,0.6)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(10, 30); g.lineTo(16, 44); g.moveTo(30, 30); g.lineTo(24, 44); g.stroke();
          g.fillStyle = '#7a4a2a'; g.fillRect(15, 43, 10, 7);
        }
        vignette = null; bgc = null; bgcNext = null; mesaTint = null; skyComp = null; groundComp = null;
      }
      /* Dusk comes in 40 steps, so each cached layer below is rebuilt at most 40 times during the finale's golden hour. */
      const duskStep = () => Math.round(Wd.dusk * 40) / 40;
      /* Dusk tints the buttes themselves (a flat overlay would also darken the sky behind them). */
      function duskMesas() {
        const d = duskStep();
        if (!mesaTint || mesaTint.far.dpr !== view.dpr) mesaTint = { d: -1, far: mk(mesaFar.w, mesaFar.h), near: mk(mesaNear.w, mesaNear.h) };
        if (mesaTint.d !== d) {
          mesaTint.d = d;
          [[mesaTint.far, mesaFar], [mesaTint.near, mesaNear]].forEach(([t, m]) => {
            const g = t.g; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, m.w, m.h); g.drawImage(m.c, 0, 0, m.w, m.h);
            if (d > 0) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(22,16,48,${0.62 * d})`; g.fillRect(0, 0, m.w, m.h); g.globalCompositeOperation = 'source-over'; }
          });
        }
        return mesaTint;
      }
      /* The sky in one opaque layer: gradient, moon or setting sun, the dusk, and the still stars. */
      function skyComposite() {
        const d = duskStep(), key = view.dpr + '|' + d;
        if (skyComp && skyComp.key === key) return skyComp;
        const top = Wd.h * 0.6; // where screen y 0 sits in this layer when the camera is at rest
        if (!skyComp || skyComp.dpr !== view.dpr || skyComp.w !== skyCache.w || skyComp.h !== skyCache.h) skyComp = mk(skyCache.w, skyCache.h, true);
        const g = skyComp.g;
        g.drawImage(skyCache.c, 0, 0, skyCache.w, skyCache.h);
        if (orbCache) { // the moon, or the sun, which sets behind the buttes as golden hour turns to dusk
          const R7 = orbCache.r * 7, set = palette.dark ? 0 : d * (orbCache.r * 2.6 + 60);
          if (!palette.dark) g.globalAlpha = 1 - d * 0.45;
          g.drawImage(orbCache.c, orbCache.x - R7, orbCache.y + set - R7, R7 * 2, R7 * 2); g.globalAlpha = 1;
        }
        if (d > 0.01) { // golden hour deepens to dusk for the finale, so the new stars can be seen
          const bot = top + Wd.horizon + 40, dg = g.createLinearGradient(0, 0, 0, bot);
          dg.addColorStop(0, `rgba(10,14,46,${0.95 * d})`); dg.addColorStop(0.55, `rgba(26,24,80,${0.9 * d})`); dg.addColorStop(0.86, `rgba(70,46,104,${0.72 * d})`); dg.addColorStop(1, `rgba(150,82,110,${0.5 * d})`);
          g.fillStyle = dg; g.fillRect(0, 0, skyComp.w, bot);
        }
        const starA = palette.dark ? 1 : d;
        if (starA > 0.02) {
          g.fillStyle = '#fffaf0'; g.globalAlpha = 0.55 * starA;
          for (const s of stars) g.fillRect(s.x, s.y + top, s.r, s.r);
          g.globalAlpha = 1;
        }
        skyComp.key = key;
        return skyComp;
      }
      /* The ground in one opaque layer: grass, the dusk, the pen, and the campfire's pool of light. */
      function groundComposite() {
        const d = duskStep(), key = view.dpr + '|' + d;
        if (groundComp && groundComp.key === key) return groundComp;
        if (!groundComp || groundComp.dpr !== view.dpr || groundComp.w !== groundCache.w || groundComp.h !== groundCache.h) groundComp = mk(groundCache.w, groundCache.h, true);
        const g = groundComp.g, oy = -Wd.horizon; // this layer's y 0 is the horizon
        g.drawImage(groundCache.c, 0, 0, groundCache.w, groundCache.h);
        if (d > 0.01) { g.fillStyle = `rgba(16,12,40,${0.45 * d})`; g.fillRect(0, 0, groundComp.w, groundComp.h); }
        g.drawImage(penCache.c, Wd.pen.x - 10, Wd.pen.y - 26 + oy, penCache.w, penCache.h);
        const lr = (Wd.portrait ? 170 : 230) * Wd.unit * 0.86; // the flicker on top of this is drawn live, close to the fire
        g.globalCompositeOperation = palette.dark || d > 0.3 ? 'lighter' : 'source-over'; g.globalAlpha = 0.72;
        g.drawImage(lightSprite.c, Wd.fire.x - lr * 1.25, Wd.fire.y + oy - lr * 0.55, lr * 2.5, lr * 1.1);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        groundComp.key = key;
        return groundComp;
      }
      function layoutPenSlots() {
        const p = Wd.pen, slots = [];
        for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) slots.push({ x: p.x + p.w * (0.2 + 0.6 * (c + (r % 2) * 0.5) / 3.5), y: p.y + p.h * (0.42 + r * 0.36) });
        Wd.penSlots = slots;
      }
      function shade(hex, amt) {
        const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex); if (!m) return hex;
        const f = (v) => Math.round(S.clamp(parseInt(v, 16) + 255 * amt, 0, 255)).toString(16).padStart(2, '0');
        return '#' + f(m[1]) + f(m[2]) + f(m[3]);
      }
      const alphaScale = (rgba, k) => { const m = /rgba?\(([^,]+),([^,]+),([^,)]+)(?:,([^)]+))?\)/.exec(rgba || ''); return m ? `rgba(${m[1]},${m[2]},${m[3]},${((m[4] == null ? 1 : parseFloat(m[4])) * k).toFixed(3)})` : (k > 0 ? rgba : 'rgba(0,0,0,0)'); };
      const rgbOf = (hex) => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex); return m ? parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) : '255,240,210'; };
      const restPoint = () => ({ x: Wd.fire.x + Wd.track.rx * (Wd.portrait ? 0.5 : 0.42), y: Wd.fire.y - Wd.track.ry * (Wd.portrait ? 0.3 : 0.05) });
      const finaleLoopieSpot = () => (Wd.portrait ? { x: Wd.fire.x - Wd.track.rx * 0.58, y: Wd.fire.y + 4 } : { x: Wd.fire.x - Wd.track.rx * 0.62, y: Wd.fire.y + 30 });

      /* ================= critter sprites ================= */
      const spriteCache = new Map();
      function critterSprite(loop, variant, scaleIn) {
        const scale = Math.max(0.25, Math.round(scaleIn * 8) / 8);
        const key = loop + ':' + variant + ':' + scale;
        if (spriteCache.has(key)) return spriteCache.get(key);
        const sp = R.SPECIES[loop] || R.SPECIES.other;
        const dpr = view.dpr, U = scale * dpr;
        const cw = 104, ch = 86, c = document.createElement('canvas');
        c.width = Math.ceil(cw * U); c.height = Math.ceil(ch * U);
        const g = c.getContext('2d'); g.setTransform(U, 0, 0, U, cw * U / 2 - 4 * U, ch * U * 0.56);
        drawCritterBody(g, sp, variant);
        const outS = { c, ox: cw / 2 - 4, oy: ch * 0.56, w: cw, h: ch };
        spriteCache.set(key, outS);
        return outS;
      }
      function sparkle4(g, x, y, r) { g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill(); }
      function drawCritterBody(g, sp, variant) {
        const puffs = [[-15, 3, 11], [-7, -6, 12.5], [4, -8, 12.5], [14, -2, 11], [-10, 7, 10.5], [3, 7, 11], [13, 6, 9.5], [-20, 6, 7], [20, 5, 7]];
        const isCore = variant.includes('core');
        const wool = isCore ? shade(sp.wool, -0.18) : sp.wool, woolB = isCore ? shade(sp.woolB, -0.2) : sp.woolB;
        if (sp.feature === 'frizz') {
          g.fillStyle = woolB; g.beginPath();
          for (let i = 0; i < 26; i++) { const a = i / 26 * TAU, r = i % 2 ? 22 : 27; g.lineTo(Math.cos(a) * r * 1.1, Math.sin(a) * r * 0.75); }
          g.closePath(); g.fill();
        }
        g.fillStyle = woolB; puffs.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y + 1.6, r + 1.6, 0, TAU); g.fill(); });
        g.fillStyle = wool; puffs.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
        g.fillStyle = 'rgba(255,255,255,0.6)'; [[-9, -10, 4], [2, -12, 3.5], [-17, 0, 2.5]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
        if (sp.feature === 'heart') { // Heartbeat Hogget: a thumping heart on its flank
          const x = -5, y = -3, s = 10;
          g.fillStyle = '#e8475f'; g.beginPath(); g.moveTo(x, y + s * 0.3);
          g.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
          g.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
          g.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
          g.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
          g.fill();
          g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(x - s * 0.24, y + s * 0.26, s * 0.1, 0, TAU); g.fill();
        }
        if (sp.feature === 'sparkle') { // Golden Fleece: glints in the wool
          g.fillStyle = '#fffbe6'; [[-12, -4, 4.2], [6, -12, 3.4], [10, 5, 3], [-4, 8, 2.6]].forEach(([x, y, r]) => sparkle4(g, x, y, r));
        }
        const hx = 25, hy = -7;
        if (sp.feature === 'droop') { g.fillStyle = shade(sp.face, 0.15); g.beginPath(); g.ellipse(hx - 6, hy + 2, 3.6, 9, 0.35, 0, TAU); g.fill(); }
        else { g.fillStyle = shade(sp.face, 0.1); g.beginPath(); g.ellipse(hx - 7, hy - 7, 6.5, 3.2, -0.6, 0, TAU); g.fill(); g.fillStyle = '#f2a7b5'; g.beginPath(); g.ellipse(hx - 7, hy - 7, 3.8, 1.5, -0.6, 0, TAU); g.fill(); }
        g.fillStyle = sp.face; g.beginPath(); g.ellipse(hx, hy, 9.5, 10.5, 0.12, 0, TAU); g.fill();
        g.fillStyle = wool; [[hx - 4, hy - 9, 5], [hx + 1, hy - 11, 5.5], [hx + 5, hy - 8, 4]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
        const sleeping = variant.includes('sleep');
        const eyes = [[hx - 1.5, hy - 1.5], [hx + 4.8, hy - 1]];
        if (sleeping) {
          g.strokeStyle = '#1b1220'; g.lineWidth = 1.4; g.lineCap = 'round';
          eyes.forEach(([x, y]) => { g.beginPath(); g.arc(x, y - 0.4, 2, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); });
        } else {
          eyes.forEach(([x, y]) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); g.fillStyle = '#1b1220'; g.beginPath(); g.arc(x + 0.8, y + 0.3, 1.7, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 1.4, y - 0.5, 0.6, 0, TAU); g.fill(); });
        }
        if (sp.feature === 'fringe') { g.fillStyle = wool; [[hx - 3, hy - 4, 4.4], [hx + 2, hy - 5, 4.6], [hx + 6.5, hy - 3.5, 3.5]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }); }
        g.fillStyle = 'rgba(255,140,160,0.55)'; g.beginPath(); g.ellipse(hx + 6, hy + 4, 2.6, 1.6, 0, 0, TAU); g.fill();
        g.strokeStyle = '#1b1220'; g.lineWidth = 1.1; g.beginPath(); g.arc(hx + 3.5, hy + 4.5, 1.8, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
        if (sp.feature === 'horns') {
          g.strokeStyle = '#d4ad72'; g.lineWidth = 2.6; g.lineCap = 'round';
          g.beginPath(); for (let a = 0; a < 4.6; a += 0.2) { const r = 5.5 - a * 0.9; g.lineTo(hx - 6 + Math.cos(a + 3.6) * r, hy - 4 + Math.sin(a + 3.6) * r); } g.stroke();
        }
        if (sp.feature === 'antenna') {
          g.strokeStyle = sp.face; g.lineWidth = 1.3;
          [[hx - 2, -1], [hx + 4, 1]].forEach(([x, d]) => { g.beginPath(); g.moveTo(x, hy - 12); g.quadraticCurveTo(x + d * 4, hy - 19, x + d * 2, hy - 22); g.stroke(); g.fillStyle = '#ffd27a'; g.beginPath(); g.arc(x + d * 2, hy - 22, 1.9, 0, TAU); g.fill(); });
        }
        if (sp.feature === 'tag') { g.fillStyle = '#ffd27a'; g.fillRect(hx - 11, hy - 4, 5, 6); g.strokeStyle = '#2f5a45'; g.lineWidth = 1; g.beginPath(); g.moveTo(hx - 10, hy - 1); g.lineTo(hx - 8.8, hy + 0.4); g.lineTo(hx - 6.8, hy - 2.6); g.stroke(); }
        if (sp.feature === 'bell') { // Urge Ewe: a collar with a little bell that will not stop ringing
          g.strokeStyle = '#c4473f'; g.lineWidth = 2.4; g.lineCap = 'round';
          g.beginPath(); g.moveTo(hx - 8.5, hy + 4); g.quadraticCurveTo(hx - 1.5, hy + 11, hx + 6.5, hy + 6.5); g.stroke();
          const bx = hx - 1.5, by = hy + 10;
          g.fillStyle = '#f2c14e'; g.beginPath(); g.moveTo(bx - 4.4, by + 7); g.quadraticCurveTo(bx - 4.6, by - 0.5, bx, by - 0.5); g.quadraticCurveTo(bx + 4.6, by - 0.5, bx + 4.4, by + 7); g.closePath(); g.fill();
          g.fillStyle = '#b07a1c'; g.fillRect(bx - 4.8, by + 6.2, 9.6, 1.6);
          g.beginPath(); g.arc(bx, by + 8.9, 1.4, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(bx - 1.7, by + 2.4, 0.9, 2, 0.3, 0, TAU); g.fill();
        }
        if (isCore) { g.fillStyle = shade(wool, -0.08); [[-4, -16, 6], [6, -17, 6.5]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }); }
      }
      function drawLegs(g, sp, x, y, s, phase, facing, pose) {
        g.save(); g.translate(x, y); g.scale(s * facing, s);
        g.strokeStyle = shade(sp.face, -0.12); g.lineCap = 'round'; g.lineWidth = 3.4;
        if (pose === 'sit' || pose === 'rest') {
          g.fillStyle = shade(sp.face, -0.12);
          g.beginPath(); g.ellipse(-12, 12, 5, 2.2, 0, 0, TAU); g.moveTo(19, 12); g.ellipse(14, 12, 5, 2.2, 0, 0, TAU); g.fill();
        } else {
          const amp = pose === 'stand' ? 0.08 : 0.55;
          g.beginPath(); // all four legs in one stroke
          [-13, -5, 8, 16].forEach((lx, i) => {
            const sw = Math.sin(phase + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.6 : 0)) * amp;
            g.moveTo(lx, 10); g.lineTo(lx + Math.sin(sw) * 9, 10 + Math.cos(sw) * 9);
          });
          g.stroke();
        }
        g.restore();
      }
      function miniCritter(loop, w, hgt) {
        const c = document.createElement('canvas'); const dpr = Math.min(window.devicePixelRatio || 1, 2);
        c.width = w * dpr; c.height = hgt * dpr; c.style.width = w + 'px'; c.style.height = hgt + 'px';
        const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const s = w / 76, spr = critterSprite(loop, 'awake', s);
        drawLegs(g, R.SPECIES[loop] || R.SPECIES.other, w / 2 - 2, hgt * 0.5, s, 0.8, 1, 'run');
        g.drawImage(spr.c, w / 2 - 2 - spr.ox * s, hgt * 0.5 - spr.oy * s, spr.w * s, spr.h * s);
        c.setAttribute('role', 'img'); c.setAttribute('aria-label', (R.SPECIES[loop] || R.SPECIES.other).name);
        return c;
      }

      /* ================= state ================= */
      let herd = null, critters = [], particles = [], constellations = [], motes = [];
      const game = {
        phase: 'intro', before: herdSpeed, start: performance.now(), perfect: 0, taps: 0, tapScore: 0, miss: 0, catches: 0,
        target: null, queue: [], penned: 0, total: 0, thoughts: 0, charge: 0, assist: false, assistOffered: false, lastCatchAt: 0,
        pressTime: 0, syncTime: 0, slackT: 0, slackSaid: false, coreStage: null, hold: 0, holding: false, startBpm: 100, endBpm: 60, finalBpm: 0,
        paddock: null, coreCritter: null, futureTap: null, goldenCritter: null, goldenSpawned: false, goldenCaught: false, tension: 1, fireKick: 0
      };
      const input = { down: false, key: false, x: 0, y: 0, angle: 0, dist: 0, downAt: 0, downX: 0, downY: 0, moved: 0, speed: 0, lastT: 0, lastX: 0, lastY: 0, pendingMiss: null };
      const ringState = { sync: false, assist: false, text: '' };
      const knot = { visible: false, fixed: null, glide: null, idle: -Math.PI / 2, wobble: 0 };
      const posts = [0, 0, 0, 0];
      const lasso = { spin: 0, throwT: -1, dur: 0.22, target: null, miss: false, onDone: null };
      let gateClosed = 0, gateAnim = -1, rollcallCritter = null, almanacFresh = [], ringSparks = [], introUp = true, frameNo = 0, assistBtn = null;
      const RP = 24; // ring canvas margin
      const tolDeg = () => [55, 42, 32][S.intensity()];
      const tolRad = () => tolDeg() * Math.PI / 180;
      const lapsNeeded = () => [0.75, 1, 1][S.intensity()];
      const tapCharge = () => [0.34, 0.25, 0.2][S.intensity()];

      function makeCritter(c, i, n, isCore) {
        return {
          id: i, label: c.label, loop: c.loop, sp: R.SPECIES[c.loop] || R.SPECIES.other, core: !!isCore, golden: c.loop === 'golden',
          theta: (i / Math.max(1, n)) * TAU + Math.PI * 0.5, slot: i, phase: Math.random() * TAU, facing: 1,
          state: 'enter', enter: 0, enterDelay: i * 0.7, x: -60, y: Wd.track.cy, fly: null, bounce: 0, sleep: false, rest: 0, restT: 0,
          jitter: c.loop === 'whatif' ? 1 : 0, announced: false, spin: 0, penSlot: null, from: null, walk: null
        };
      }
      function trackPoint(theta, core) {
        const t = Wd.track;
        if (core) return { x: t.cx + t.rx * 0.1 + Math.cos(theta) * t.rx * 0.66, y: t.cy - t.ry * 0.15 + Math.sin(theta) * t.ry * 0.56 }; // wide enough to clear the fire
        return { x: t.cx + Math.cos(theta) * t.rx, y: t.cy + Math.sin(theta) * t.ry };
      }
      function depthScale(y) { const t = Wd.track; return Wd.unit * (0.78 + 0.32 * S.clamp((y - (t.cy - t.ry)) / (2 * t.ry), 0, 1.4)); }
      const coreScale = () => (Wd.portrait ? 1.42 : 1.7);

      /* ================= clock (audio-driven, with a silent fallback so the knot never freezes) ================= */
      const clock = { running: false, bpm: 100, target: 100, next: 0, index: 0, beats: [], paused: false, base: 'p' };
      const audioLive = () => !!(A.ctx && A.ctx.state === 'running');
      const cnow = () => (audioLive() ? A.ctx.currentTime : performance.now() / 1000);
      const vnow = () => cnow() - (audioLive() ? A.latency() : 0); // the moment the listener is hearing
      let lastBeatSeen = null;
      function startClock(bpm, at) { clock.bpm = clock.target = bpm; clock.next = at; clock.index = 0; clock.beats = []; clock.running = true; clock.base = audioLive() ? 'a' : 'p'; lastBeatSeen = null; }
      function scheduleBeats() {
        if (!clock.running || clock.paused) return;
        const base = audioLive() ? 'a' : 'p';
        if (base !== clock.base) { clock.base = base; clock.next = cnow() + 0.3; clock.beats = []; lastBeatSeen = null; }
        const horizon = cnow() + 0.16;
        while (clock.next < horizon) {
          const t = clock.next, i = clock.index;
          clock.beats.push({ t, i, tapped: i === game.futureTap });
          onBeat(t, i);
          const ease = ['herd', 'core'].includes(game.phase) ? 0.16 : 0.3;
          clock.bpm += (clock.target - clock.bpm) * ease;
          clock.next += 60 / clock.bpm;
          clock.index++;
        }
        if (clock.beats.length > 16) clock.beats.splice(0, clock.beats.length - 16);
      }
      function beatWindow() {
        const vt = vnow();
        let prev = null, next = null;
        for (const b of clock.beats) { if (b.t <= vt) prev = b; else { next = b; break; } }
        if (!next) next = { t: clock.next, i: clock.index };
        if (!prev) prev = { t: next.t - 60 / clock.bpm, i: next.i - 1 };
        return { prev, next, p: S.clamp((vt - prev.t) / Math.max(0.05, next.t - prev.t), 0, 1) };
      }
      function clockAngle() { const { prev, p } = beatWindow(); const bp = prev.i + p; return -Math.PI / 2 + TAU * ((((bp % 4) + 4) % 4) / 4); }
      function knotAngle() {
        if (knot.fixed != null) return knot.fixed + (knot.wobble ? Math.sin(performance.now() / 40) * 0.03 * knot.wobble : 0);
        if (clock.running) return clockAngle();
        return knot.idle;
      }
      const isRopePhase = () => game.phase === 'herd' || (game.phase === 'core' && game.coreStage === 'rope');

      /* ================= music (scheduled on the beat) ================= */
      const PROG = [
        { bass: ['G2', 'D3'], chord: ['G3', 'B3', 'D4', 'G4'] },
        { bass: ['E2', 'B2'], chord: ['E3', 'G3', 'B3', 'E4'] },
        { bass: ['C3', 'G2'], chord: ['G3', 'C4', 'E4', 'G4'] },
        { bass: ['D3', 'A2'], chord: ['A3', 'D4', 'F#4', 'A4'] }
      ];
      const PENTA = ['G4', 'A4', 'B4', 'D5', 'E5', 'G5', 'A5', 'B5', 'D6'];
      /* The beat runs for minutes, so the drum, the herd's bleats and the beat plucks play dry, close and woody like a real
         campfire jam. The console's drum and bleat send to its long convolution reverb, which would then run non-stop (the
         single biggest audio cost on a phone); chimes, pads and the finale keep the reverb, so the big moments open up. */
      function drum(when, vol, pitch) {
        const p = pitch || 1, v = vol == null ? 0.6 : vol;
        A.tone({ when, type: 'sine', freq: 190 * p, to: 92 * p, glide: 0.18, dur: 0.42, vol: v, attack: 0.002 });
        A.tone({ when, type: 'triangle', freq: 320 * p, to: 210 * p, glide: 0.05, dur: 0.09, vol: v * 0.3, attack: 0.001 });
        A.noise({ when, freq: 900 * p, q: 1.4, dur: 0.06, vol: v * 0.35 });
      }
      function bleat(o) {
        const ac = A.ctx, bus = A.bus && A.bus('sfx');
        if (!ac || !bus) return;
        o = o || {};
        const when = o.when == null ? ac.currentTime : o.when, dur = o.dur || 0.45, pitch = o.pitch || 1, vol = o.vol || 0.22;
        const osc = ac.createOscillator(); osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(420 * pitch, when);
        osc.frequency.linearRampToValueAtTime(520 * pitch, when + dur * 0.25);
        osc.frequency.linearRampToValueAtTime(380 * pitch, when + dur);
        const lfo = ac.createOscillator(); lfo.frequency.value = 22;
        const lg = ac.createGain(); lg.gain.value = 26 * pitch; lfo.connect(lg); lg.connect(osc.frequency);
        const f1 = ac.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 780; f1.Q.value = 5;
        const f2 = ac.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1250; f2.Q.value = 6;
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(vol, when + 0.04);
        g.gain.setValueAtTime(vol, when + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
        osc.connect(f1); osc.connect(f2); f1.connect(g); f2.connect(g);
        let last = g;
        if (o.pan && ac.createStereoPanner) { const pn = ac.createStereoPanner(); pn.pan.value = S.clamp(o.pan, -1, 1); g.connect(pn); last = pn; }
        last.connect(bus);
        osc.start(when); lfo.start(when); osc.stop(when + dur + 0.05); lfo.stop(when + dur + 0.05);
        osc.onended = () => { try { g.disconnect(); last.disconnect(); } catch (e) { /* gone */ } };
      }
      function onBeat(t, i) {
        if (clock.base !== 'a' || !A.ctx) return;
        const ph = game.phase;
        const bar = Math.floor(i / 4), beat = ((i % 4) + 4) % 4, ch = PROG[((bar % 4) + 4) % 4];
        const soft = S.intensity() === 0 ? 0.75 : 1;
        if (ph === 'countin') {
          A.wood(t, beat === 0 ? 0.32 : 0.22, beat === 0 ? 1.25 : 1);
          if (beat === 0) A.pluck(A.note(ch.bass[0]), { when: t, vol: 0.3, damp: 0.994, lp: 900, bus: 'music' });
          return;
        }
        if (ph === 'herd') {
          drum(t, (beat === 0 ? 0.26 : 0.16) * soft, beat === 0 ? 0.92 : 1.05);
          if (beat === 0 || beat === 2) A.pluck(A.note(ch.bass[beat === 0 ? 0 : 1]), { when: t, vol: 0.34 * soft, damp: 0.993, lp: 1000, bus: 'music' });
          if (beat === 1 || beat === 3) ch.chord.forEach((n, k) => A.pluck(A.note(n), { when: t + k * 0.022, vol: 0.12 * soft, damp: 0.996, bus: 'music', pan: (k - 1.5) * 0.15 }));
          const half = 30 / clock.bpm;
          if (S.intensity() > 0) A.shaker(t + half, 0.045 * soft);
          if (Math.random() < 0.08 && critters.some(c => c.state === 'run')) bleat({ when: t + half * 0.5, pitch: 0.85 + Math.random() * 0.4, vol: 0.08, pan: Math.random() * 1.2 - 0.6 });
          return;
        }
        if (ph === 'core') {
          drum(t, 0.12 * soft, 0.8);
          A.pluck(A.note(ch.chord[beat]), { when: t, vol: 0.14, damp: 0.998, bus: 'music' });
          if (beat === 0) A.pluck(A.note(ch.bass[0]), { when: t, vol: 0.3, damp: 0.995, lp: 800, bus: 'music' });
          if (game.holding) A.tone({ when: t, type: 'sine', freq: 98, dur: 0.6, vol: 0.12, attack: 0.04, bus: 'music' });
        }
      }
      /* Prairie night (wind, fire, crickets) and the rope whirr, released when the console unmounts the game. */
      let whirr = null, amb = null;
      function startAudio() {
        if (!A.ctx || S.destroyed) return;
        if (!amb) amb = K.ambience('prairie');
        if (!whirr) whirr = A.loop({ pink: false, filter: 'bandpass', freq: 700, q: 1.6 });
      }
      startAudio();
      S.on('audio-ready', startAudio);
      S.onDestroy(() => { if (whirr) { whirr.stop(); whirr = null; } });
      function grabSound() { if (A.ctx) { A.tone({ type: 'triangle', freq: 190, to: 130, glide: 0.07, dur: 0.1, vol: 0.06, lp: 900 }); A.sync('grab', performance.now()); } }

      /* ================= tonight's visitor and sky ================= */
      const V = { kind: night.visitor, x: 0, y: 0, home: 0, blink: 0, nextBlink: 2, look: 0, puff: 0, hop: 1, hops: 0, twitch: 0, curl: 0, curlT: 0, hide: 0, hideT: 0, howl: 0, howlT: 0, dir: 1, walkT: 0 };
      function placeVisitor() {
        if (V.kind === 'owl') { V.x = Wd.pen.x + 1; V.y = Wd.pen.y + Wd.pen.h - 16; }
        else if (V.kind === 'coyote') { V.x = Wd.w * (palette.dark ? 0.16 : 0.66); V.y = 0; }
        else { V.x = V.home = Wd.spot.x; V.y = Wd.spot.y; V.dir = Wd.portrait ? 1 : -1; }
      }
      function mesaRidge(m, x) {
        const p = m.pts; if (!p || !p.length) return 0;
        for (let i = 1; i < p.length; i++) if (p[i][0] >= x) { const a = p[i - 1], b = p[i], k = (x - a[0]) / Math.max(1, b[0] - a[0]); return a[1] + (b[1] - a[1]) * S.clamp(k, 0, 1); }
        return p[p.length - 1][1];
      }
      function hoot(vol) { if (!A.ctx) return; const t0 = A.now(); [0, 0.34].forEach((d, i) => A.tone({ when: t0 + d, type: 'sine', freq: i ? 352 : 396, to: i ? 318 : 372, glide: 0.22, dur: 0.3, vol: vol || 0.05, attack: 0.05, verb: 0.45, lp: 900, pan: 0.4 })); }
      function howl() { if (!A.ctx) return; const t0 = A.now(), pan = palette.dark ? -0.6 : 0.4; A.tone({ when: t0, type: 'sine', freq: 470, to: 760, glide: 0.6, dur: 1.4, vol: 0.03, attack: 0.3, verb: 0.75, pan }); A.tone({ when: t0 + 0.62, type: 'sine', freq: 760, to: 540, glide: 0.9, dur: 1.1, vol: 0.026, attack: 0.04, verb: 0.75, pan }); }
      function thump() { if (A.ctx) A.tone({ type: 'sine', freq: 150, to: 70, glide: 0.08, dur: 0.12, vol: 0.08 }); }
      /* The visitor reacts to what the player just did (comic timing, never a judge). */
      function visitorReact(kind) {
        const k = V.kind;
        if (k === 'owl') { V.puff = 1; if (kind !== 'catch') hoot(kind === 'finale' ? 0.06 : 0.045); if (kind === 'rest') V.blink = 1.6; }
        else if (k === 'jackrabbit') { if (kind === 'bounce') { thump(); V.twitch = 0.6; } else if (kind !== 'rest') { V.hops = kind === 'golden' || kind === 'finale' ? 2 : 1; V.hop = 0; } }
        else if (k === 'armadillo') { if (kind === 'bounce') { V.curlT = 2.6; if (A.ctx) A.wood(undefined, 0.08, 0.5); } else if (kind === 'golden') { V.hops = 1; V.hop = 0; } }
        else if (k === 'tortoise') { if (kind === 'bounce') V.hideT = 2.6; else if (kind === 'golden' || kind === 'finale') { V.hops = 1; V.hop = 0; } }
        else if (k === 'coyote') { if (kind === 'arrive' || kind === 'finale' || kind === 'golden') { V.howlT = 1.8; howl(); } }
      }
      function updateVisitor(dt, t) {
        V.blink = Math.max(0, V.blink - dt);
        if (t > V.nextBlink) { V.blink = Math.max(V.blink, 0.14); V.nextBlink = t + 2.4 + Math.random() * 3; }
        V.puff = Math.max(0, V.puff - dt * 1.6);
        V.twitch = Math.max(0, V.twitch - dt);
        if (Math.random() < dt * 0.25) V.twitch = Math.max(V.twitch, 0.3);
        if (V.hop < 1) { V.hop = Math.min(1, V.hop + dt * 2.6); if (V.hop >= 1 && V.hops > 1) { V.hops--; V.hop = 0; } }
        V.curlT = Math.max(0, V.curlT - dt); V.curl += ((V.curlT > 0 ? 1 : 0) - V.curl) * Math.min(1, dt * 8);
        V.hideT = Math.max(0, V.hideT - dt); V.hide += ((V.hideT > 0 ? 1 : 0) - V.hide) * Math.min(1, dt * 7);
        V.howlT = Math.max(0, V.howlT - dt); V.howl += ((V.howlT > 0 ? 1 : 0) - V.howl) * Math.min(1, dt * 5);
        const tg = game.target && (game.target.state === 'run' || game.target.state === 'target') ? game.target : null;
        V.look += (((tg ? S.clamp((tg.x - V.x) / 120, -1, 1) : 0)) - V.look) * Math.min(1, dt * 3);
        if ((V.kind === 'armadillo' || V.kind === 'tortoise') && V.curl < 0.3 && V.hide < 0.3) {
          V.walkT += dt; const span = 26 * Wd.unit, sp = V.kind === 'armadillo' ? 0.32 : 0.14;
          const nx = V.home + Math.sin(V.walkT * sp) * span; V.dir = nx >= V.x ? 1 : -1; V.x = nx;
        }
      }
      function drawVisitor(g, t) {
        const s = Wd.unit * (Wd.portrait ? 1.15 : 1.35), k = V.kind;
        if (k === 'coyote') return;
        const hopY = V.hop < 1 ? Math.sin(V.hop * Math.PI) * 9 * s : 0;
        if (k !== 'owl') { g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(V.x, V.y + 1, 11 * s * (1 - hopY / 40), 2.4 * s, 0, 0, TAU); g.fill(); }
        g.save(); g.translate(V.x, V.y - hopY); g.scale(s * (k === 'owl' ? 1 : V.dir), s);
        if (k === 'owl') drawOwl(g);
        else if (k === 'jackrabbit') drawRabbit(g);
        else if (k === 'armadillo') drawArmadillo(g, t);
        else if (k === 'tortoise') drawTortoise(g, t);
        g.restore();
      }
      function dot(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
      function oval(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); g.fill(); }
      function drawOwl(g) {
        const p = 1 + V.puff * 0.16, body = palette.dark ? '#6f5741' : '#7a5a3c', hx = V.look * 1.4;
        g.fillStyle = shade(body, -0.07); oval(g, -6 * p, -9, 2.8, 7, 0.18); oval(g, 6 * p, -9, 2.8, 7, -0.18);
        g.fillStyle = body; oval(g, 0, -9, 7.4 * p, 9.6 * p);
        g.fillStyle = '#ecdbb8'; oval(g, 0, -7.6, 4.6 * p, 6.6 * p);
        g.fillStyle = shade(body, -0.12); for (let i = 0; i < 3; i++) dot(g, -1.8 + i * 1.8, -8 + (i % 2) * 2.4, 0.6);
        g.fillStyle = body; oval(g, hx, -20, 7.6, 6.6);
        g.beginPath(); g.moveTo(hx - 6.6, -22.5); g.lineTo(hx - 5.4, -29); g.lineTo(hx - 2.6, -24.6); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(hx + 6.6, -22.5); g.lineTo(hx + 5.4, -29); g.lineTo(hx + 2.6, -24.6); g.closePath(); g.fill();
        g.fillStyle = '#f7eedb'; oval(g, hx - 3.1, -20, 3.3, 3.7); oval(g, hx + 3.1, -20, 3.3, 3.7);
        if (V.blink > 0) { g.strokeStyle = '#2a1a10'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(hx - 4.8, -19.6); g.quadraticCurveTo(hx - 3.1, -18.4, hx - 1.4, -19.6); g.moveTo(hx + 1.4, -19.6); g.quadraticCurveTo(hx + 3.1, -18.4, hx + 4.8, -19.6); g.stroke(); }
        else { const er = 1.7 + V.puff * 0.7, lx = V.look * 0.8; g.fillStyle = '#1b120c'; dot(g, hx - 3.1 + lx, -20, er); dot(g, hx + 3.1 + lx, -20, er); g.fillStyle = '#fff'; dot(g, hx - 3.6 + lx, -20.8, 0.55); dot(g, hx + 2.6 + lx, -20.8, 0.55); }
        g.fillStyle = '#e3a54a'; g.beginPath(); g.moveTo(hx - 1.3, -18.2); g.lineTo(hx + 1.3, -18.2); g.lineTo(hx, -15.6); g.closePath(); g.fill();
        g.strokeStyle = '#e3a54a'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-2.6, -1.2); g.lineTo(-2.6, 0.6); g.moveTo(2.6, -1.2); g.lineTo(2.6, 0.6); g.stroke();
      }
      function drawRabbit(g) {
        const fur = palette.dark ? '#a3825f' : '#b58d63', dk = shade(fur, -0.13), tw = V.twitch > 0 ? Math.sin(V.twitch * 40) * 0.14 : 0;
        g.save(); g.translate(7.6, -16.5); g.rotate(0.16 - tw); g.fillStyle = dk; oval(g, 0, -6.4, 1.9, 6.6); g.restore();
        g.fillStyle = fur; oval(g, -1, -6.6, 8.6, 6.6, -0.12); oval(g, -5, -2.8, 4.2, 3.2);
        g.fillStyle = '#f6efe4'; dot(g, -9.6, -5.6, 2.5);
        g.fillStyle = fur; oval(g, 6.6, -13, 4.7, 4.1, 0.2);
        g.save(); g.translate(5.2, -16.4); g.rotate(-0.26 + tw); g.fillStyle = fur; oval(g, 0, -6.4, 1.9, 6.6); g.fillStyle = '#e8a6ae'; oval(g, 0, -6.2, 0.85, 4.8); g.restore();
        g.fillStyle = '#1b120c'; dot(g, 8.3, -13.7, 1.15); g.fillStyle = '#fff'; dot(g, 8.7, -14.1, 0.4);
        g.fillStyle = '#e8a6ae'; dot(g, 10.9, -12.4, 0.85);
        g.fillStyle = dk; oval(g, 4.2, -0.9, 3, 1.2);
      }
      function drawArmadillo(g, t) {
        const shell = palette.dark ? '#8e7d6d' : '#a28b74', band = shade(shell, -0.15), skin = palette.dark ? '#bfa58c' : '#cdb196';
        if (V.curl > 0.5) {
          const r = 7.6; g.fillStyle = shell; dot(g, 0, -r, r);
          g.strokeStyle = band; g.lineWidth = 1.1; for (let i = -1; i <= 1; i++) { g.beginPath(); g.ellipse(i * 3.3, -r, 1.4, r * 0.92, 0, -Math.PI / 2, Math.PI / 2); g.stroke(); }
          g.fillStyle = 'rgba(255,255,255,0.18)'; dot(g, -2.6, -r - 3.2, 2);
          return;
        }
        const step = Math.sin(V.walkT * 7) * 1.2;
        g.fillStyle = skin; g.fillRect(-7 + step * 0.3, -2.6, 2.2, 2.8); g.fillRect(5 - step * 0.3, -2.6, 2.2, 2.8);
        g.beginPath(); g.moveTo(-9.5, -4); g.lineTo(-17, -1.4); g.lineTo(-9.5, -2.2); g.closePath(); g.fill();
        g.beginPath(); g.ellipse(11.6, -4.2, 4.6, 2.5, 0.28, 0, TAU); g.fill(); oval(g, 9.8, -7.2, 1.2, 2.1, -0.3);
        g.fillStyle = '#1b120c'; dot(g, 12.4, -5.2, 0.8);
        g.fillStyle = shell; g.beginPath(); g.ellipse(0, -3.2, 11, 7.6, 0, Math.PI, TAU); g.closePath(); g.fill();
        g.strokeStyle = band; g.lineWidth = 1; g.beginPath();
        [-5.4, -1.8, 1.8, 5.4].forEach(xb => { const top = 7.6 * Math.sqrt(Math.max(0, 1 - (xb / 11) * (xb / 11))); g.moveTo(xb, -3.2); g.lineTo(xb, -3.2 - top); });
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.16)'; oval(g, -3, -8, 4, 1.6, -0.2);
      }
      function drawTortoise(g, t) {
        const shell = palette.dark ? '#5f7a45' : '#6f8a4e', rim = shade(shell, -0.14), skin = palette.dark ? '#a39d74' : '#b0a97c', out = 1 - V.hide;
        const step = Math.sin(V.walkT * 5) * 0.8 * out;
        g.fillStyle = skin; g.fillRect(-7 + step, -2.4, 2.6, 2.6); g.fillRect(4.6 - step, -2.4, 2.6, 2.6);
        if (out > 0.05) { g.beginPath(); g.ellipse(10 + 3 * out, -4.2, 3.4 * out + 0.4, 2.6, 0.1, 0, TAU); g.fill(); g.fillStyle = '#1b120c'; dot(g, 11.6 + 3.6 * out, -4.9, 0.75 * out); }
        g.fillStyle = shell; g.beginPath(); g.ellipse(0, -3, 10, 7.4, 0, Math.PI, TAU); g.closePath(); g.fill();
        g.fillStyle = rim; g.fillRect(-10.4, -3.4, 20.8, 1.9);
        g.strokeStyle = rim; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-5, -3.4); g.lineTo(-3, -8.4); g.lineTo(3, -8.4); g.lineTo(5, -3.4); g.moveTo(-3, -8.4); g.lineTo(-6.6, -6.8); g.moveTo(3, -8.4); g.lineTo(6.6, -6.8); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.14)'; oval(g, -3, -7.2, 3.4, 1.4, -0.2);
      }
      function drawCoyote(g, skyOff, mfY) {
        const s = Wd.unit * (Wd.portrait ? 1 : 1.2), x = V.x, y = mfY + mesaRidge(mesaFar, x) + 1;
        g.save(); g.translate(x, y); g.scale(s * (palette.dark ? 1 : -1), s); g.fillStyle = shade(palette.mesaFar, palette.dark ? -0.08 : -0.12);
        g.beginPath(); g.moveTo(-7, 0); g.quadraticCurveTo(-9.5, -8, -4, -14); g.lineTo(2, -16.5); g.quadraticCurveTo(5.5, -10, 5, 0); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(-6, -1); g.quadraticCurveTo(-14, -0.5, -16.5, -6); g.quadraticCurveTo(-12, -3.4, -6, -4.4); g.closePath(); g.fill();
        g.fillRect(-0.8, -7, 2, 7); g.fillRect(2.2, -7, 2, 7);
        g.save(); g.translate(1.5, -15.5); g.rotate(-0.12 - V.howl * 0.75);
        g.beginPath(); g.moveTo(-3, 2.2); g.lineTo(-1.6, -5.6); g.lineTo(0.8, -2); g.lineTo(2.8, -6.2); g.lineTo(4, -1.2); g.lineTo(11, 0.8); g.lineTo(4.2, 3.2); g.closePath(); g.fill();
        g.restore(); g.restore();
        void skyOff;
      }

      /* Tonight's sky effects (all cheap: stamped sprites, a few short paths). */
      let flies = [], tw = null, twNext = 2.5, balloonX = null, balloonA = 1;
      function initNightFx() {
        flies = [];
        if (night.id === 'fireflies') {
          const n = S.reduced() ? 7 : (Wd.portrait ? 14 : 22);
          for (let i = 0; i < n; i++) flies.push({ x: Math.random() * Wd.w, y: Wd.horizon + 10 + Math.random() * Math.max(40, Wd.ringTop - Wd.horizon - 40), ph: Math.random() * TAU, sp: 0.5 + Math.random() * 0.7, drift: palette.dark ? 0 : 8 + Math.random() * 10 });
        }
        if (balloonX == null) balloonX = Wd.w * 0.2;
      }
      function updateNightFx(dt, t) {
        if (night.id === 'fireflies') flies.forEach(f => {
          f.x += (Math.sin(t * 0.6 * f.sp + f.ph) * 14 + f.drift) * dt; f.y += Math.cos(t * 0.8 * f.sp + f.ph * 2) * 9 * dt - (palette.dark ? 0 : 3 * dt);
          if (f.x > Wd.w + 10) f.x = -10; if (f.x < -10) f.x = Wd.w + 10;
          const lo = Wd.horizon - (palette.dark ? 0 : 60), hi = Wd.ringTop - 20;
          if (f.y < lo) f.y = hi; if (f.y > hi) f.y = lo + 10;
        });
        if (night.id === 'tumbleweed') {
          if (!tw && t > twNext && ['rollcall', 'countin', 'herd', 'core', 'settle', 'paddock', 'finale', 'end'].includes(game.phase)) {
            const back = Wd.horizon + Wd.groundSpan * (0.1 + Math.random() * 0.12);
            tw = { x: -24, base: back, vx: (62 + Math.random() * 30) * Wd.unit, rot: 0, last: 0 };
            if (A.ctx) A.whoosh({ vol: 0.035, dur: 1.4, from: 180, to: 700, pan: -0.7 });
          }
          if (tw) {
            tw.x += tw.vx * dt; tw.rot += tw.vx * dt / 14;
            const b = Math.abs(Math.sin(tw.x * 0.03)); if (b < 0.08 && tw.last >= 0.08 && !S.reduced()) dust(tw.x, tw.base + 2, 2);
            tw.last = b; tw.y = tw.base - b * 12 * Wd.unit;
            if (tw.x > Wd.w + 30) { tw = null; twNext = t + 6 + Math.random() * 6; }
          }
        }
        if (night.id === 'meteors' && !palette.dark) {
          const leaving = game.phase === 'finale' || game.phase === 'end'; // it drifts off so the new constellations have the sky
          balloonX += dt * (leaving ? 40 : 5.5) * Wd.unit; if (leaving) balloonA = Math.max(0, balloonA - dt * 0.5);
        }
      }
      function drawNightSky(g, t, skyOff) {
        if (night.id === 'aurora' && palette.dark) {
          const cols = ['80,230,180', '120,200,255', '190,140,255'];
          for (let i = 0; i < 3; i++) {
            const base = Math.max(96, Wd.horizon * 0.34) + i * 24 + skyOff, amp = 16 + i * 5, hgt = 48 + i * 8, a = (0.22 - i * 0.045) * (S.reduced() ? 0.8 : 1);
            const gr = g.createLinearGradient(0, base - amp, 0, base + hgt + amp);
            gr.addColorStop(0, 'rgba(' + cols[i] + ',0)'); gr.addColorStop(0.45, 'rgba(' + cols[i] + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + cols[i] + ',0)');
            g.fillStyle = gr; g.beginPath();
            const step = Math.max(14, Wd.w / 28);
            for (let x = -step; x <= Wd.w + step; x += step) { const y = base + Math.sin(x * 0.009 + t * 0.25 + i * 1.7) * amp + Math.sin(x * 0.023 - t * 0.17) * amp * 0.35; if (x <= -step) g.moveTo(x, y); else g.lineTo(x, y); }
            for (let x = Wd.w + step; x >= -step; x -= step) { const y = base + hgt + Math.sin(x * 0.011 + t * 0.21 + i) * amp * 0.6; g.lineTo(x, y); }
            g.closePath(); g.fill();
          }
        }
        if (night.id === 'meteors' && !palette.dark && balloonA > 0.01) {
          const x = ((balloonX % (Wd.w + 80)) + Wd.w + 80) % (Wd.w + 80) - 40, y = Math.max(150, Wd.horizon * 0.42) + Math.sin(t * 0.4) * 5 + skyOff;
          g.globalAlpha = balloonA; g.drawImage(balloonSprite.c, x - 20 * Wd.unit, y - 28 * Wd.unit, 40 * Wd.unit, 56 * Wd.unit); g.globalAlpha = 1;
        }
      }
      function drawNightGround(g, t) {
        if (night.id === 'fireflies' && flies.length) {
          const col = palette.dark ? '214,255,140' : '255,250,235', gl = glow(col, 12);
          flies.forEach(f => {
            const a = palette.dark ? Math.pow(0.5 + 0.5 * Math.sin(t * 2.1 * f.sp + f.ph * 3), 2) : 0.55 + 0.3 * Math.sin(t + f.ph);
            if (a < 0.04) return;
            g.globalAlpha = a; g.drawImage(gl.c, f.x - 9, f.y - 9, 18, 18);
            g.fillStyle = palette.dark ? '#f6ffd0' : '#ffffff'; g.fillRect(f.x - 1, f.y - 1, 2, 2);
          });
          g.globalAlpha = 1;
        }
        if (tw) {
          const s = Wd.unit;
          g.fillStyle = 'rgba(0,0,0,0.16)'; g.beginPath(); g.ellipse(tw.x, tw.base + 12 * s, 12 * s * (1 - (tw.base - tw.y) / 40), 3 * s, 0, 0, TAU); g.fill();
          g.save(); g.translate(tw.x, tw.y); g.rotate(tw.rot); g.drawImage(twSprite.c, -16 * s, -16 * s, 32 * s, 32 * s); g.restore();
        }
      }

      /* ================= camera ================= */
      let camTween = null, duskTween = null;
      function camTo(y, d, cb) {
        if (S.reduced()) { Wd.cam.y = y; camTween = null; if (cb) cb(); return; }
        camTween = { t: 0, d, fy: Wd.cam.y, ty: y, cb };
      }
      function duskTo(v, d) { duskTween = { t: 0, d: S.reduced() ? 0.01 : d, f: Wd.dusk, to: v }; }
      function campCam() { return Wd.portrait ? -Math.min(Wd.h * 0.2, Wd.fire.y - Wd.h * 0.4) : -Math.min(Wd.h * 0.15, Wd.fire.y - Wd.h * 0.44); }

      /* ================= update ================= */
      let embersTimer = 0;
      function update(dt, t) {
        if (camTween) {
          camTween.t += dt;
          const k = S.ease.inOutCubic(S.clamp(camTween.t / camTween.d, 0, 1));
          Wd.cam.y = S.lerp(camTween.fy, camTween.ty, k);
          if (camTween.t >= camTween.d) { const cb = camTween.cb; camTween = null; if (cb) cb(); }
        }
        if (duskTween) { duskTween.t += dt; const k = S.clamp(duskTween.t / duskTween.d, 0, 1); Wd.dusk = S.lerp(duskTween.f, duskTween.to, S.ease.inOutSine(k)); if (k >= 1) duskTween = null; }
        if (lift.t < 1) { lift.t = Math.min(1, lift.t + dt / lift.d); lift.v = S.lerp(lift.from, lift.to, S.ease.outBack(lift.t)); }
        if (loopieMove && loopieMove.t < loopieMove.d) {
          loopieMove.t = Math.min(loopieMove.d, loopieMove.t + dt);
          const k = S.ease.inOutCubic(loopieMove.t / loopieMove.d);
          Wd.loopie.x = S.lerp(loopieMove.x0, loopieMove.x1, k); Wd.loopie.y = S.lerp(loopieMove.y0, loopieMove.y1, k) - Math.sin(k * Math.PI) * 26;
        }
        Wd.cam.shake = Math.max(0, Wd.cam.shake - dt * 3);
        game.fireKick = Math.max(0, game.fireKick - dt * 4);
        posts.forEach((v, k) => { posts[k] = Math.max(0, v - dt * 3.2); });
        if (knot.glide) {
          knot.glide.t += dt;
          const k = S.ease.outCubic(S.clamp(knot.glide.t / knot.glide.d, 0, 1));
          knot.fixed = S.lerp(knot.glide.from, knot.glide.to, k);
          if (k >= 1) knot.glide = null;
        }
        knot.wobble = Math.max(0, knot.wobble - dt * 2);
        // a resting finger stops sending moves: let its speed settle so stillness is recognised
        if (input.down && performance.now() - input.lastT > 90) input.speed = Math.max(0, input.speed - dt * 4000);
        beatCrossings();
        updateRope(dt);
        updateStill(dt);
        if (lasso.throwT >= 0) {
          lasso.throwT += dt;
          if (lasso.throwT >= lasso.dur) { const cb = lasso.onDone; lasso.throwT = -1; lasso.target = null; lasso.onDone = null; if (cb) cb(); }
        }
        if (gateAnim >= 0) { gateAnim += dt; gateClosed = S.clamp(gateAnim / 0.5, 0, 1); if (gateClosed >= 1) gateAnim = -1; }
        // colour drifts from tense to calm as the tempo falls
        const tensionNow = clock.running && game.startBpm > game.endBpm ? S.clamp((clock.bpm - game.endBpm) / (game.startBpm - game.endBpm), 0, 1) : (['rollcall', 'countin'].includes(game.phase) ? 1 : (game.phase === 'intro' ? 0.7 : 0));
        game.tension += (tensionNow - game.tension) * Math.min(1, dt * 1.2);
        const bpm = clock.running ? clock.bpm : (game.phase === 'rollcall' ? game.startBpm : 70);
        const omega = TAU / 8 * (bpm / 60);
        const active = critters.filter(c => !c.core && (c.state === 'run' || c.state === 'enter' || c.state === 'target'));
        active.forEach((c, k) => { c.slot = k; });
        const n = Math.max(1, active.length);
        critters.forEach(c => {
          c.phase += dt * (bpm / 60) * TAU * (c.core ? 0.7 : 1);
          if (c.state === 'enter') {
            c.enterDelay -= dt;
            if (c.enterDelay <= 0) {
              c.enter = Math.min(1, c.enter + dt * 1.2);
              const p = trackPoint(c.theta, c.core), from = c.from || { x: -80, y: Wd.track.cy + Wd.track.ry * 0.4 }, k = S.ease.outCubic(c.enter);
              const nx = S.lerp(from.x, p.x, k); c.facing = nx >= c.x ? 1 : -1;
              c.x = nx; c.y = S.lerp(from.y, p.y, k);
              if (c.enter >= 1) c.state = 'run';
              if (!c.announced && c.enter > 0.05) { c.announced = true; if (game.phase === 'rollcall') announce(c); }
              if (c.golden && Math.random() < dt * 14) particles.push(sparkP(c.x + (Math.random() - 0.5) * 30, c.y - 10 - Math.random() * 16));
            }
          } else if (c.state === 'run' || c.state === 'target') {
            let p;
            if (c.core) { c.theta += omega * dt * 0.5; p = trackPoint(c.theta, true); }
            else {
              const lead = active[0] ? active[0].theta - (active[0].slot / n) * TAU : 0;
              const desired = lead + (c.slot / n) * TAU, diff = ((desired - c.theta) % TAU + TAU * 1.5) % TAU - TAU / 2;
              c.theta += omega * dt + diff * dt * 0.8;
              p = trackPoint(c.theta, false);
            }
            const nx = p.x + (c.jitter && !S.reduced() ? Math.sin(t * 23 + c.id) * 1.2 : 0), ny = p.y;
            if (Math.abs(nx - c.x) > 0.2) c.facing = nx > c.x ? 1 : -1;
            c.x = nx; c.y = ny;
            if (!S.reduced() && Math.random() < dt * (bpm / 60) * 1.5 * (c.core ? 0.5 : 1)) dust(c.x - c.facing * 10 * depthScale(c.y), c.y + 10 * depthScale(c.y), 1);
            if (c.golden && Math.random() < dt * 9) particles.push(sparkP(c.x + (Math.random() - 0.5) * 34 * depthScale(c.y), c.y - 6 - Math.random() * 22 * depthScale(c.y)));
          } else if (c.state === 'walk') {
            const wk = c.walk; wk.t += dt;
            const k = S.ease.inOutSine(S.clamp(wk.t / wk.d, 0, 1));
            const nx = S.lerp(wk.x0, wk.x1, k); if (Math.abs(nx - c.x) > 0.05) c.facing = nx > c.x ? 1 : -1;
            c.x = nx; c.y = S.lerp(wk.y0, wk.y1, k) - Math.sin(k * Math.PI) * Wd.track.ry * 0.6;
            if (k >= 1) { c.state = 'stand'; c.facing = -1; }
          } else if (c.state === 'stand') {
            c.rest = S.clamp(game.hold, 0, 1);
            c.sleep = game.hold > 0.82;
          } else if (c.state === 'fly') {
            const f = c.fly; f.t += dt;
            const k = S.clamp(f.t / f.d, 0, 1);
            c.x = S.lerp(f.x0, f.x1, k); c.y = S.lerp(f.y0, f.y1, k) - Math.sin(k * Math.PI) * f.arc;
            c.spin = S.reduced() ? 0 : k * TAU * c.facing;
            if (k >= 1) {
              c.state = 'pen'; c.bounce = 1; c.spin = 0; dust(c.x, c.y + 6, 6);
              if (A.ctx) A.thud({ vol: 0.25 });
              if (c.golden) for (let i = 0; i < (S.reduced() ? 6 : 16); i++) particles.push(sparkP(c.x, c.y - 8, true));
            }
          } else if (c.state === 'pen') {
            c.bounce = Math.max(0, c.bounce - dt * 2.5);
            c.restT += dt;
            if (!c.sleep && c.restT > 2.2) c.sleep = true;
            if (c.golden && Math.random() < dt * 2.5) particles.push(sparkP(c.x + (Math.random() - 0.5) * 20, c.y - 8 - Math.random() * 10));
          } else if (c.state === 'rest') {
            c.rest = Math.min(1, c.rest + dt * 0.8);
          }
        });
        embersTimer += dt;
        const emberRate = [0.09, 0.06, 0.035][S.intensity()] * (S.reduced() ? 2 : 1) * (view.low ? 2 : 1);
        while (embersTimer > emberRate) { embersTimer -= emberRate; particles.push(emberP()); }
        particles.forEach(p => {
          p.age += dt;
          if (p.kind === 'ember') { p.x += (p.vx + Math.sin(p.age * 3 + p.r * 9) * 8) * dt; p.y += p.vy * dt; }
          else if (p.kind === 'spark') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= 0.97; }
          else { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }
        });
        particles = particles.filter(p => p.age < p.life);
        if (particles.length > 300) particles.splice(0, particles.length - 300);
        ringSparks.forEach(p => { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; });
        ringSparks = ringSparks.filter(p => p.age < p.life);
        constellations.forEach(cs => { if (cs.started) cs.t += dt; });
        updateMotes(dt);
        updateVisitor(dt, t);
        updateNightFx(dt, t);
        if (game.phase === 'herd' && !game.assist && !game.assistOffered && performance.now() - game.lastCatchAt > (S.intensity() === 0 ? 10000 : 15000)) offerAssist();
      }
      const emberP = () => ({ kind: 'ember', x: Wd.fire.x + (Math.random() - 0.5) * 14, y: Wd.fire.y - 10, vx: (Math.random() - 0.5) * 10, vy: -26 - Math.random() * 30, life: 1.6 + Math.random() * 1.6, age: 0, r: 0.8 + Math.random() * 1.5 });
      const sparkP = (x, y, burst) => { const a = Math.random() * TAU, sp = burst ? 60 + Math.random() * 110 : 6 + Math.random() * 14; return { kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (burst ? 40 : 10), g: burst ? 120 : -8, life: burst ? 0.8 + Math.random() * 0.5 : 0.7 + Math.random() * 0.6, age: 0, r: 1.6 + Math.random() * 1.8 }; };
      function dust(x, y, n) { for (let i = 0; i < n; i++) particles.push({ kind: 'dust', x, y, vx: (Math.random() - 0.5) * 40, vy: -Math.random() * 16, life: 0.5 + Math.random() * 0.5, age: 0, r: 2 + Math.random() * 3 }); }

      /* ================= the orbit lasso ================= */
      function angDiff(a, b) { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
      function inSync() {
        if (!(input.down || input.key) || !isRopePhase()) return false;
        if (game.assist) return true;
        if (input.key) return false;
        const r = Wd.ring.r;
        if (input.dist < r * 0.35 || input.dist > r * 1.8) return false;
        return Math.abs(angDiff(input.angle, knotAngle())) < tolRad();
      }
      function updateRope(dt) {
        const live = isRopePhase();
        const sync = live && inSync();
        ringState.sync = sync; ringState.assist = game.assist;
        if (live && (input.down || (input.key && game.assist))) {
          game.pressTime += dt;
          const lap = 4 * 60 / Math.max(30, clock.bpm);
          if (sync) {
            game.charge += dt / (lap * lapsNeeded());
            game.syncTime += dt; game.slackT = 0;
          } else {
            game.charge = Math.max(0, game.charge - dt * 0.06);
            game.slackT += dt;
            if (game.slackT > 2.4 && !game.slackSaid) {
              game.slackSaid = true;
              face('worried', 1200); say(vline(R.LINES.slack), 2000);
              circleGuide({ id: 'slack-' + game.penned, label: 'FOLLOW THE KNOT', delay: 2100 });
            }
          }
          if (game.charge >= 1) { if (game.phase === 'herd') throwLasso(); else { game.charge = 0; coreBounce(); } }
        }
        if (whirr) {
          const speed = S.clamp(input.speed / 900, 0, 1.4);
          whirr.level(live && input.down ? (sync ? 0.05 + speed * 0.05 : 0.018) : 0.0001, 0.05);
          whirr.freq(500 + speed * 900 + (sync ? 300 : 0), 0.08);
        }
        if (live && isRopePhase()) { // (a throw or the big one's bounce this frame hands the ring its own words)
          if (game.assist) setRingText('Hold the rope', 'Any touch counts now');
          else if (!input.down) setRingText(game.phase === 'core' ? 'Rope the big one' : 'Ride the knot', 'Circle with it, or tap the posts');
          else setRingText(sync ? 'In sync' : 'Catch the knot', sync ? 'Keep circling' : 'Follow the glow', sync ? 'sync' : 'slack');
        }
      }
      function setRingText(head, sub, mood) {
        const key = head + '|' + sub + '|' + (mood || '');
        if (ringState.text === key) return;
        ringState.text = key;
        ringHead.textContent = head; ringSub.textContent = sub;
        ringHead.style.color = mood === 'sync' ? 'var(--sync)' : mood === 'slack' ? 'var(--slack)' : '';
      }
      const ringCenterPoint = () => ({ x: Wd.ring.cx, y: Wd.ring.cy });

      function beatCrossings() {
        if (!clock.running || clock.paused) return;
        const { prev } = beatWindow();
        if (!prev || prev.i === lastBeatSeen) return;
        const crossed = lastBeatSeen !== null && prev.i > lastBeatSeen && clock.beats.includes(prev);
        lastBeatSeen = prev.i;
        if (!crossed) return;
        const k = ((prev.i % 4) + 4) % 4;
        posts[k] = 1;
        game.fireKick = k === 0 ? 1 : 0.55;
        if (k === 0 && !S.reduced()) for (let i = 0; i < 3; i++) particles.push(emberP());
        if (clock.base === 'a') A.sync('beat-visual', performance.now(), prev.t);
        if (isRopePhase() && (input.down || input.key) && inSync()) {
          game.perfect++;
          if (A.ctx) { A.pluck(A.note(PENTA[Math.min(PENTA.length - 1, Math.floor(game.charge * 5) + Math.floor(game.penned / 2))]), { vol: 0.16, damp: 0.996, bus: 'sfx' }); A.sync('perfect-beat', performance.now()); }
          burstAtKnot(k === 0 ? 10 : 5);
          if (k === 0) showJudge('In sync', 'perfect');
        }
      }
      function burstAtKnot(n) {
        if (S.reduced()) n = Math.ceil(n / 3);
        const a = knotAngle(), c = Wd.ring.size / 2 + RP, x = c + Math.cos(a) * Wd.ring.r, y = c + Math.sin(a) * Wd.ring.r;
        for (let i = 0; i < n; i++) { const d = Math.random() * TAU, sp = 40 + Math.random() * 90; ringSparks.push({ x, y, vx: Math.cos(d) * sp, vy: Math.sin(d) * sp, age: 0, life: 0.35 + Math.random() * 0.3 }); }
      }

      /* Taps on the posts (keyboard, and anyone who'd rather tap than trace). */
      function judgeTap(fromKey) {
        if (!isRopePhase()) return false;
        const tap = vnow();
        let best = null, bd = Infinity;
        for (const b of clock.beats) { const d = Math.abs(tap - b.t); if (d < bd) { bd = d; best = b; } }
        const nextD = Math.abs(clock.next - tap);
        if (nextD < bd) { best = { t: clock.next, i: clock.index, tapped: false, future: true }; bd = nextD; }
        if (!best) return false;
        const interval = 60 / clock.bpm;
        const inten = S.intensity();
        const perfectW = [0.1, 0.075, 0.06][inten] + interval * 0.04;
        const goodW = [0.2, 0.16, 0.13][inten] + interval * 0.05;
        const actionAt = performance.now();
        if (best.tapped) return false;
        if (bd <= goodW || game.assist) {
          best.tapped = true;
          if (best.future) game.futureTap = best.i;
          const grade = bd <= perfectW ? 'perfect' : 'good';
          game.taps++; game.tapScore += grade === 'perfect' ? 1 : 0.75;
          game.charge += tapCharge();
          const k = ((best.i % 4) + 4) % 4; posts[k] = 1;
          if (A.ctx) { A.pluck(A.note(PENTA[Math.min(PENTA.length - 1, game.taps % 6 + 1)]), { vol: 0.2, damp: 0.996 }); A.sync('tap', actionAt); }
          showJudge(grade === 'perfect' ? 'Perfect' : 'Nice', grade);
          burstAtKnot(6);
          S.buzz(10);
          if (game.charge >= 1) { if (game.phase === 'herd') throwLasso(); else { game.charge = 0; coreBounce(); } }
          return true;
        }
        const signed = tap - best.t;
        if (fromKey) { game.miss++; showJudge(signed < 0 ? 'Early' : 'Late', 'miss'); if (A.ctx) { A.boing({ vol: 0.07, freq: 260 }); A.sync('tap-miss', actionAt); } }
        else input.pendingMiss = signed < 0 ? 'Early' : 'Late';
        return false;
      }
      function showJudge(text, kind) {
        judgeEl.textContent = text;
        judgeEl.style.color = kind === 'perfect' ? 'var(--judge-perfect)' : kind === 'good' ? 'var(--judge-good)' : kind === 'count' ? 'var(--ui-fg)' : 'var(--judge-miss)';
        judgeEl.classList.remove('show'); void judgeEl.offsetWidth; judgeEl.classList.add('show');
      }
      /* Ride-along: offered in the middle of the rope after a long dry spell, never forced. */
      function offerAssist() {
        game.assistOffered = true;
        const b = h('button', { type: 'button', class: 'ts-btn ts-btn-quiet r-assist', text: 'Ride along' });
        b.addEventListener('click', () => {
          game.assist = true; b.remove(); assistBtn = null;
          if (A.ctx) { A.chime(A.note('D5'), { vol: 0.08 }); A.sync('assist', performance.now()); }
          face('happy', 1400); say(vline(R.LINES.rideOn), 2200); ctx.track('assist', {});
        });
        ringZone.append(b); assistBtn = b;
        face('half', 1600); say(vline(R.LINES.ride), 2600);
        S.later(() => { if (assistBtn === b) { b.remove(); assistBtn = null; } }, 12000);
      }

      /* Ring input: pointer (with capture, Framer-zoom aware) and the space bar. */
      const ringLocal = (p) => ({ x: p.x - Wd.ring.size / 2, y: p.y - Wd.ring.size / 2 });
      function trackInput(q) {
        const now = performance.now();
        const dtm = Math.max(1, now - input.lastT);
        const v = Math.hypot(q.x - input.lastX, q.y - input.lastY) / dtm * 1000;
        input.speed = input.lastT ? input.speed * 0.7 + v * 0.3 : 0;
        input.lastT = now; input.lastX = q.x; input.lastY = q.y;
        input.x = q.x; input.y = q.y; input.dist = Math.hypot(q.x, q.y); input.angle = Math.atan2(q.y, q.x);
        input.moved = Math.max(input.moved, Math.hypot(q.x - input.downX, q.y - input.downY));
      }
      function pointerEnd() {
        if (!input.down) return;
        input.down = false; input.speed = 0;
        ringZone.classList.remove('press');
        if (input.pendingMiss && performance.now() - input.downAt < 260 && input.moved < 14 && isRopePhase()) {
          game.miss++; showJudge(input.pendingMiss, 'miss'); if (A.ctx) A.boing({ vol: 0.06, freq: 260 });
        }
        input.pendingMiss = null;
        pressEnd();
      }
      K.press(ringBtn, {
        down: (p) => {
          if (input.down || S.destroyed) return;
          const q = ringLocal(p);
          input.down = true; input.lastT = 0; input.speed = 0; input.moved = 0; input.pendingMiss = null;
          input.downX = q.x; input.downY = q.y;
          trackInput(q);
          input.downAt = performance.now();
          ringZone.classList.add('press');
          pressStart(false);
        },
        move: (p) => { if (input.down) trackInput(ringLocal(p)); },
        up: () => pointerEnd()
      });
      S.listen(window, 'keydown', (e) => {
        if (!(e.code === 'Space' || e.code === 'Enter') || e.repeat) return;
        const ae = document.activeElement;
        if (ae && (ae.tagName === 'TEXTAREA' || ae.tagName === 'INPUT' || (ae.tagName === 'BUTTON' && ae !== ringBtn))) return;
        if (!(el.contains(ae) || ae === document.body || !ae)) return;
        if (!['countin', 'herd', 'core'].includes(game.phase)) return;
        e.preventDefault();
        A.unlock();
        input.key = true;
        pressStart(true);
      });
      S.listen(window, 'keyup', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && input.key) { input.key = false; pressEnd(); } });

      function pressStart(fromKey) {
        K.guideDone();
        if (game.phase === 'countin') { if (A.ctx) { drum(undefined, 0.25); A.sync('press', performance.now()); } return; }
        if (isRopePhase()) { if (!judgeTap(fromKey)) grabSound(); return; }
        if (game.phase === 'core' && game.coreStage === 'still') { stillPress(fromKey); return; }
        grabSound();
      }
      function pressEnd() {
        if (game.phase === 'core' && game.coreStage === 'still' && game.holding) {
          game.holding = false;
          if (game.hold < 1) K.guide({ id: 'core-still-again', g: 'still', target: knotPoint, label: 'HOLD STILL ON THE KNOT', ms: 2600, delay: 1200, place: 'below' });
        }
      }

      /* Catching. */
      function throwLasso() {
        const c = game.target;
        if (!c || c.state !== 'run' || lasso.throwT >= 0) { game.charge = Math.min(game.charge, 0.98); return; }
        game.charge = 0;
        lasso.target = c; lasso.throwT = 0; lasso.dur = 0.22; lasso.miss = false;
        c.state = 'target';
        lasso.onDone = () => catchCritter(c);
        const at = performance.now();
        if (A.ctx) { A.whoosh({ vol: 0.2, dur: 0.25, from: 300, to: 3600 }); A.sync('catch', at); }
        K.guide(null);
      }
      function catchCritter(c) {
        c.penSlot = game.penned % Wd.penSlots.length;
        const slot = Wd.penSlots[c.penSlot];
        c.state = 'fly';
        c.fly = { t: 0, d: S.reduced() ? 0.45 : 0.8, x0: c.x, y0: c.y, x1: slot.x, y1: slot.y, arc: Math.max(80, Math.abs(c.y - slot.y) + 60) };
        game.penned++; game.catches++; game.lastCatchAt = performance.now(); game.slackSaid = false;
        if (c.golden) game.goldenCaught = true;
        renderTally(true);
        if (A.ctx) { A.pop({ freq: 620, vol: 0.2 }); bleat({ pitch: c.golden ? 1.35 : 1.15, vol: 0.18 }); }
        if (c.golden && A.ctx) { ['D5', 'G5', 'B5', 'D6'].forEach((nn, i) => A.chime(A.note(nn), { when: A.now() + i * 0.07, vol: 0.08, dur: 1.4 })); A.sync('golden', performance.now()); }
        S.buzz([18, 40, 18]);
        if (S.intensity() === 2 && !S.reduced()) Wd.cam.shake = 0.6;
        const k = game.penned / game.total;
        clock.target = S.lerp(game.startBpm, game.endBpm + 4, k);
        setBaseFace(k < 0.34 ? 'excited' : k < 0.67 ? 'half' : 'calm');
        face(c.golden ? 'star' : 'laugh', 1000);
        hopLoopie();
        showJudge(c.golden ? 'Golden!' : 'Caught!', 'perfect');
        visitorReact(c.golden ? 'golden' : 'catch');
        if (c.golden) say(vline(R.LINES.goldenCaught), 1800);
        else if (game.penned === 1 || game.penned === 3 || game.penned === game.total) say(lines('catch'), 1700);
        banner.hidden = true;
        if (golden && !game.goldenSpawned && game.penned === Math.min(2, Math.max(1, game.total - 1))) S.later(spawnGolden, 200);
        S.later(() => { if (game.phase === 'herd') nextTarget(); }, 380);
      }
      function renderTally(bump) {
        tallyEl.textContent = game.penned + ' / ' + game.total;
        if (bump) { tallyBox.classList.remove('bump'); void tallyBox.offsetWidth; tallyBox.classList.add('bump'); }
      }
      /* The Golden Fleece trots in from the far side for regulars. */
      function spawnGolden() {
        if (game.goldenSpawned || game.phase !== 'herd') return;
        game.goldenSpawned = true;
        const c = makeCritter({ label: 'GOLDEN FLEECE', loop: 'golden' }, 90, 1, false);
        c.enterDelay = 0; c.from = { x: Wd.w + 70, y: Wd.track.cy - Wd.track.ry * 0.2 };
        c.theta = 0; c.x = c.from.x; c.y = c.from.y; c.facing = -1;
        critters.push(c); game.goldenCritter = c;
        game.queue.unshift(c); game.total++;
        renderTally(true);
        face('wow', 1800); say(vline(R.LINES.golden), 2400);
        visitorReact('golden');
        if (A.ctx) { for (let i = 0; i < 6; i++) A.tone({ when: A.now() + i * 0.06, type: 'sine', freq: 1500 + i * 260, dur: 0.16, vol: 0.035 }); A.sync('golden-arrive', performance.now()); }
        ctx.track('golden', { visits });
      }

      /* ================= the big one ================= */
      async function startCore() {
        game.phase = 'core'; game.coreStage = 'arrive'; game.charge = 0;
        clock.target = game.endBpm;
        const c = game.coreCritter;
        c.state = 'enter'; c.enter = 0; c.enterDelay = 0.2; c.theta = Math.PI * 0.85;
        critters.push(c);
        game.target = c;
        setBaseFace('calm'); face('surprised', 1800);
        setRingText('Here it comes', 'The big one');
        if (A.ctx) { A.tone({ type: 'sine', freq: 55, to: 45, dur: 1.4, vol: 0.4, attack: 0.05 }); bleat({ pitch: 0.55, vol: 0.2, dur: 0.8 }); }
        await S.sleep(900);
        if (game.phase !== 'core') return;
        banner.textContent = c.label; banner.classList.remove('gold'); banner.classList.add('big'); banner.hidden = false; bannerKey = '';
        game.coreStage = 'rope';
        circleGuide({ id: 'core-rope', label: 'TRY TO ROPE IT', delay: 650 });
      }
      async function coreBounce() {
        const c = game.coreCritter;
        if (game.coreStage !== 'rope') return;
        game.coreStage = 'bounce';
        setRingText('Too big!', 'And that’s okay');
        lasso.target = c; lasso.throwT = 0; lasso.dur = 0.3; lasso.miss = true;
        lasso.onDone = () => {
          if (A.ctx) A.boing({ freq: 200, vol: 0.2 });
          dust(c.x, c.y + 10, 10); Wd.cam.shake = S.intensity() && !S.reduced() ? 0.5 : 0;
          visitorReact('bounce');
          // it ambles over to its own spot by the fire instead of the pen
          const r = restPoint();
          c.state = 'walk'; c.walk = { t: 0, d: S.reduced() ? 0.3 : 1.6, x0: c.x, y0: c.y, x1: r.x, y1: r.y };
        };
        if (A.ctx) A.whoosh({ vol: 0.2, dur: 0.3, from: 300, to: 2600 });
        face('confused', 2600);
        say(vline(R.LINES.bounce), 1600);
        K.guide(null);
        await S.sleep(1700);
        if (game.phase !== 'core') return;
        banner.hidden = true;
        await say(lines('core'), 0);
        await S.sleep(1100);
        if (game.phase !== 'core') return;
        // The knot glides to the top post and stops. Now the only move is to stay with it.
        const cur = knotAngle();
        let to = -Math.PI / 2; while (to < cur) to += TAU;
        knot.glide = { t: 0, d: S.reduced() ? 0.01 : 1.4, from: cur, to };
        knot.fixed = cur;
        game.coreStage = 'still'; game.hold = 0;
        setRingText('Hold still', 'Thumb on the knot');
        say(vline(R.LINES.still), 0);
        K.guide({ id: 'core-still', g: 'still', target: knotPoint, label: 'HOLD STILL ON THE KNOT', ms: 2600, delay: 900, place: 'below' });
      }
      const knotPoint = () => { const a = knotAngle(); return { x: Wd.ring.cx + Math.cos(a) * Wd.ring.r, y: Wd.ring.cy + Math.sin(a) * Wd.ring.r }; };
      function stillPress(fromKey) {
        if (fromKey) { game.holding = true; K.guide(null); return; }
        const a = knotAngle(), kx = Math.cos(a) * Wd.ring.r, ky = Math.sin(a) * Wd.ring.r;
        if (Math.hypot(input.x - kx, input.y - ky) < 54) {
          game.holding = true; K.guide(null);
          if (A.ctx) { A.tone({ type: 'sine', freq: 196, dur: 0.6, vol: 0.06, attack: 0.03 }); A.sync('still-press', performance.now()); }
        } else { knot.wobble = 1; showJudge('On the knot', 'count'); grabSound(); }
      }
      let wobbleSaid = 0, guideUp = null;
      S.on('guide', (e) => { guideUp = e && e.visible ? e.id || '' : null; });
      function updateStill(dt) {
        if (game.phase !== 'core' || game.coreStage !== 'still') return;
        const beats = 4, dur = beats * 60 / Math.max(40, clock.bpm);
        if (game.holding && input.down) {
          const a = knotAngle(), kx = Math.cos(a) * Wd.ring.r, ky = Math.sin(a) * Wd.ring.r;
          if (Math.hypot(input.x - kx, input.y - ky) > 70) game.holding = false;
        }
        const still = game.holding && (input.key || input.speed < 70);
        if (still) { game.hold = Math.min(1, game.hold + dt / dur); }
        else if (game.holding) {
          knot.wobble = 1;
          if (performance.now() - wobbleSaid > 4000) { wobbleSaid = performance.now(); say(vline(R.LINES.wobble), 1600); if (A.ctx) A.noise({ filter: 'lowpass', freq: 500, dur: 0.3, vol: 0.06 }); }
        } else game.hold = Math.max(0, game.hold - dt * 0.1);
        // while the console's hand is showing the hold, the ring stays quiet (its label sits inside the ring)
        if (!still && guideUp && guideUp.indexOf('core-still') === 0) setRingText('', '');
        else setRingText(still ? 'Stay with it' : 'Hold still', still ? Math.round(game.hold * 100) + '%' : 'Thumb on the knot', still ? 'sync' : '');
        if (whirr) whirr.level(0.0001);
        if (game.hold > 0.05 && !sayEl.hidden && still) sayEl.hidden = true;
        if (game.hold > 0.5 && baseFace !== 'peace' && still) setBaseFace('peace');
        if (game.hold >= 1) finishCore();
      }
      async function finishCore() {
        game.coreStage = 'done'; game.holding = false;
        K.guide(null);
        const c = game.coreCritter;
        c.state = 'rest'; c.sleep = true; c.rest = 1;
        banner.hidden = true;
        game.finalBpm = Math.round(clock.bpm);
        clock.running = false;
        setBaseFace('peace');
        const at = performance.now();
        if (A.ctx) {
          A.pad([A.note('G3'), A.note('B3'), A.note('D4'), A.note('G4')], { dur: 5, vol: 0.2, attack: 1.2 });
          A.chime(A.note('G5'), { vol: 0.12, dur: 2.2 });
          A.sync('still-done', at);
        }
        S.buzz(30);
        game.phase = 'settle';
        ringZone.hidden = true; ringZone.classList.remove('press');
        if (whirr) whirr.level(0.0001, 0.1);
        visitorReact('rest');
        for (let i = 0; i < (S.reduced() ? 6 : 18); i++) particles.push(emberP());
        // the Herd Almanac collects each kind rounded up tonight (species only, never words)
        const kinds = Array.from(new Set(critters.filter(x => x.state === 'pen' || x.state === 'rest').map(x => x.loop)));
        almanacFresh = kinds.filter(l => K.collect(l).isNew);
        await S.sleep(700);
        gateAnim = 0;
        if (A.ctx) { A.wood(undefined, 0.3, 0.7); S.later(() => { if (A.ctx) A.wood(undefined, 0.2, 0.6); }, 120); }
        await say(lines('close'), 6000);
        await S.sleep(S.reduced() ? 1200 : 1900);
        if (game.phase !== 'settle') return;
        hush();
        stage.go('paddock');
      }

      /* ================= render ================= */
      /* The backdrop is three cached layers (sky, buttes, ground) at their own parallax, blitted whole-pixel. While the camera
         rests they are composed once more (with the vignette) into a single image that each frame starts from. */
      function paintBackdrop(g) {
        const w = Wd.w, H = Wd.h, skyOff = Wd.cam.y * 0.35;
        const gTop = snap(Wd.horizon + Wd.cam.y); // the opaque ground covers everything below this line
        const under = (y0) => Math.max(0, Math.min(H, gTop + 2) - y0);
        const sky = skyComposite(), skyY = snap(-H * 0.6 + skyOff);
        blit(g, sky, 0, skyY);
        const skyBottom = skyY + sky.h - 1;
        if (skyBottom < gTop + 2) { g.fillStyle = palette.skyLow; g.fillRect(0, skyBottom, w, gTop + 2 - skyBottom); }
        const mt = duskMesas(), d = duskStep(), tint = d > 0 ? `rgba(22,16,48,${0.62 * d})` : null;
        const mfY = snap(Wd.horizon - mesaFar.h + 22 + Wd.cam.y * 0.6), mnY = snap(Wd.horizon - mesaNear.h + 26 + Wd.cam.y * 0.8);
        blit(g, mt.far, 0, mfY);
        g.fillStyle = palette.mesaFar; g.fillRect(0, mfY + mesaFar.h - 1, w, under(mfY + mesaFar.h - 1));
        if (tint) { g.fillStyle = tint; g.fillRect(0, mfY + mesaFar.h - 1, w, under(mfY + mesaFar.h - 1)); }
        blit(g, mt.near, 0, mnY);
        g.fillStyle = palette.mesa; g.fillRect(0, mnY + mesaNear.h - 1, w, under(mnY + mesaNear.h - 1));
        if (tint) { g.fillStyle = tint; g.fillRect(0, mnY + mesaNear.h - 1, w, under(mnY + mesaNear.h - 1)); }
        blit(g, groundComposite(), 0, gTop);
        // the stampede's dust haze over the horizon, thinning as the tempo falls (stepped, so this layer stays cached)
        const hz = hazeLevel();
        if (hz > 0.02) { g.globalAlpha = hz * 0.9; blit(g, hazeSprite, 0, Wd.horizon - 170 + Wd.cam.y * 0.6); g.globalAlpha = 1; }
      }
      const hazeLevel = () => Math.round(S.clamp(game.tension, 0, 1) * 12) / 12;
      /* The still backdrop (with the vignette) as one image; a second one is prepared on spare frames when only the haze moves on. */
      let bgcNext = null;
      const backdropBase = () => Wd.w + 'x' + Wd.h + '|' + palette.dark + '|' + view.dpr + '|' + Wd.cam.y.toFixed(2) + '|' + Wd.dusk.toFixed(3);
      const backdropKey = () => backdropBase() + '|' + hazeLevel();
      function buildBackdrop(into, key) {
        if (!into || into.w !== Wd.w || into.h !== Wd.h || into.dpr !== view.dpr) into = mk(Wd.w, Wd.h, true);
        into.g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
        paintBackdrop(into.g); paintVignette(into.g);
        into.key = key; into.base = backdropBase();
        return into;
      }
      function spareFrame() { // in 30 fps modes every other frame is free: get the next backdrop ready there
        if (camTween || duskTween || !bgc) return;
        const key = backdropKey();
        if (bgc.key !== key && (!bgcNext || bgcNext.key !== key)) bgcNext = buildBackdrop(bgcNext, key);
      }
      function paintVignette(g) {
        const w = Wd.w, H = Wd.h;
        if (!vignette || vignette.w !== w || vignette.h !== H || vignette.dark !== palette.dark || vignette.dpr !== view.dpr) {
          vignette = mk(w, H); vignette.dark = palette.dark;
          const vg = vignette.g.createRadialGradient(w / 2, H * 0.55, Math.min(w, H) * 0.35, w / 2, H * 0.55, Math.max(w, H) * 0.75);
          vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, palette.dark ? 'rgba(4,2,12,0.55)' : 'rgba(60,30,10,0.22)');
          vignette.g.fillStyle = vg; vignette.g.fillRect(0, 0, w, H);
        }
        blit(g, vignette, 0, 0);
      }
      function draw(t) {
        const g = cv.g; if (!g || !skyCache) return;
        const w = Wd.w, H = Wd.h, cam = Wd.cam;
        const shakeX = cam.shake && !S.reduced() ? Math.sin(t * 60) * cam.shake * 3 : 0;
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
        const moving = !!(camTween || duskTween);
        if (!moving) {
          const key = backdropKey();
          if (!bgc || bgc.key !== key) {
            if (bgcNext && bgcNext.key === key) { const k = bgc; bgc = bgcNext; bgcNext = k; } // prepared on a spare frame
            else if (!(bgc && bgc.base === backdropBase() && (view.half || view.all30))) bgc = buildBackdrop(bgc, key);
            // (only the haze stepped: keep this frame's backdrop and let the next spare frame prepare the new one)
          }
          if (shakeX) g.drawImage(bgc.c, shakeX - 4, 0, w + 8, H); else blit(g, bgc, 0, 0);
        } else paintBackdrop(g); // the opaque layers cover every pixel, so no clear is needed
        if (shakeX) g.translate(shakeX, 0);
        const skyOff = cam.y * 0.35;
        // twinkle on top of the baked stars, only above the mesas
        const starA = palette.dark ? 1 : Wd.dusk;
        if (starA > 0.02 && !view.low) {
          g.fillStyle = '#fffaf0';
          for (const s of stars) {
            if (!s.tw) continue;
            const y = s.y + skyOff; if (y < -4 || y > H) continue;
            const a = Math.sin(t * s.s + s.p); if (a < 0.2) continue;
            g.globalAlpha = a * 0.5 * starA; g.fillRect(s.x - 0.2, y - 0.2, s.r + 0.4, s.r + 0.4);
          }
          g.globalAlpha = 1;
        }
        const cloudA = palette.dark ? 1 : 1 - Wd.dusk * 0.8; // sunlit clouds fade into the dusk instead of glowing on a night sky
        if (cloudA > 0.03) {
          g.globalAlpha = cloudA;
          for (let ci = 0; ci < clouds.length; ci++) {
            if (view.low && ci % 2) continue;
            const cl = clouds[ci], x = ((cl.x - t * cl.v) % (w + cl.c.w) + (w + cl.c.w)) % (w + cl.c.w) - cl.c.w;
            blit(g, cl.c, x, cl.y + skyOff); // whole-pixel steps: invisible on a soft cloud, and a plain copy instead of a resample
          }
          g.globalAlpha = 1;
        }
        drawNightSky(g, t, skyOff);
        const meteorNight = night.id === 'meteors';
        if ((palette.dark || Wd.dusk > 0.5) && !S.reduced() && (meteorNight || ['intro', 'settle', 'paddock', 'finale', 'end'].includes(game.phase))) {
          if (!shooting && t > nextShoot) { const r = Math.random(); shooting = { t0: t, x: w * (0.15 + 0.6 * r), y: H * (0.06 + 0.14 * Math.random()), len: 90 + 60 * r }; nextShoot = t + (meteorNight ? 2.2 + Math.random() * 3 : 9 + Math.random() * 10); }
          if (shooting) {
            const k = (t - shooting.t0) / 0.8;
            if (k >= 1) shooting = null; else {
              const hx = shooting.x + k * 160, hy = shooting.y + k * 70 + skyOff * 0.2;
              const tg = g.createLinearGradient(hx, hy, hx - shooting.len * 0.9, hy - shooting.len * 0.4);
              tg.addColorStop(0, `rgba(255,250,235,${0.9 * (1 - k)})`); tg.addColorStop(1, 'rgba(255,250,235,0)');
              g.strokeStyle = tg; g.lineWidth = 1.6; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx - shooting.len * 0.9, hy - shooting.len * 0.4); g.stroke();
            }
          }
        }
        drawConstellations(g, t, skyOff);
        const mfY = Wd.horizon - mesaFar.h + 22 + cam.y * 0.6;
        if (V.kind === 'coyote') drawCoyote(g, skyOff, mfY);
        const gy = cam.y;
        g.save(); g.translate(0, gy);
        const calmK = game.phase === 'core' && game.coreStage === 'still' ? game.hold : 0;
        const flick = 0.85 + (Math.sin(t * 7.3) * 0.06 + Math.sin(t * 13.1) * 0.05) * (1 - calmK * 0.6) + game.fireKick * 0.06;
        { // the firelight breathes (and jumps on the beat) over the cached pool of light
          const pr = (Wd.portrait ? 170 : 230) * Wd.unit * flick * 0.6;
          g.globalCompositeOperation = palette.dark || Wd.dusk > 0.3 ? 'lighter' : 'source-over';
          g.globalAlpha = S.clamp(0.1 + (flick - 0.8) * 1.6, 0.05, 0.6);
          g.drawImage(lightSprite.c, Wd.fire.x - pr * 1.25, Wd.fire.y - pr * 0.55, pr * 2.5, pr * 1.1);
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        }
        if (V.kind !== 'owl' && V.kind !== 'coyote') drawVisitor(g, t);
        critters.filter(c => c.state === 'pen').sort((a, b) => a.y - b.y).forEach(c => drawCritter(g, c, t, Wd.unit * 0.62 * (1 + c.bounce * 0.15), 'sit'));
        if (gateClosed > 0) {
          const gt = Wd.penGate, ox = Wd.pen.x - 10, oy = Wd.pen.y - 26, k = S.ease.outBack(gateClosed);
          g.strokeStyle = palette.wood; g.lineWidth = 2.6; g.beginPath();
          const x1 = ox + gt.x1, x2 = ox + S.lerp(gt.x1, gt.x2, k), y = oy + gt.y;
          g.moveTo(x1, y - 12); g.lineTo(x2, y - 12); g.moveTo(x1, y - 6); g.lineTo(x2, y - 6); g.stroke();
        }
        if (V.kind === 'owl') drawVisitor(g, t);
        const runners = critters.filter(c => c.state === 'run' || c.state === 'target' || c.state === 'enter' || c.state === 'rest' || c.state === 'walk' || c.state === 'stand');
        runners.filter(c => c.y < Wd.fire.y).sort((a, b) => a.y - b.y).forEach(c => drawRunner(g, c, t));
        drawFire(g, t, flick);
        runners.filter(c => c.y >= Wd.fire.y).sort((a, b) => a.y - b.y).forEach(c => drawRunner(g, c, t));
        critters.filter(c => c.state === 'fly').forEach(c => drawCritter(g, c, t, depthScale(c.y) * 0.9, 'fly'));
        drawNightGround(g, t);
        const sparkGlow = glow('255,214,120', 8), emberDot = dotSprite('255,214,140'), dustDot = dotSprite(palette.dark ? '160,140,170' : '140,100,60'), star4 = starSprite();
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i], k = 1 - p.age / p.life;
          if (p.kind === 'ember') { const r = p.r * 1.25; g.globalAlpha = 0.85 * k; g.drawImage(emberDot.c, p.x - r, p.y - r, r * 2, r * 2); }
          else if (p.kind === 'spark') { g.globalAlpha = Math.min(1, k * 1.4); g.drawImage(sparkGlow.c, p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6); const r = p.r * 1.5; g.drawImage(star4.c, p.x - r, p.y - r, r * 2, r * 2); }
          else { const r = p.r * (1.5 - k * 0.5) * 1.15; g.globalAlpha = (palette.dark ? 0.28 : 0.25) * k; g.drawImage(dustDot.c, p.x - r, p.y - r, r * 2, r * 2); }
        }
        g.globalAlpha = 1;
        drawLasso(g, t);
        { // Loopie's soft shadow on the ground (DOM art above; a CSS filter on a moving layer would cost every frame)
          const L = Wd.loopie, sh = glow('0,0,0', 32), lv = lift.v, sw = L.size * 0.78 * Math.max(0.55, 1 - lv / 160);
          g.globalAlpha = (palette.dark ? 0.55 : 0.36) * Math.max(0.4, 1 - lv / 200);
          g.drawImage(sh.c, L.x - sw / 2, L.y + L.size * 0.5 + 4 - sw * 0.14, sw, sw * 0.28); g.globalAlpha = 1;
        }
        g.restore();
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
        drawMotes(g, t);
        if (moving) paintVignette(g);
      }

      function drawRunner(g, c, t) {
        const s = depthScale(c.y) * (c.core ? coreScale() : 1);
        if (c === game.target && (game.phase === 'herd' || (game.phase === 'core' && game.coreStage === 'rope'))) {
          const pulse = 0.5 + 0.5 * Math.sin(t * 6);
          g.strokeStyle = c.golden ? `rgba(255,226,140,${0.6 + pulse * 0.35})` : `rgba(255,210,122,${0.45 + pulse * 0.35})`; g.lineWidth = 2;
          g.beginPath(); g.ellipse(c.x, c.y + 12 * s, 26 * s, 7 * s, 0, 0, TAU); g.stroke();
        }
        if (c.golden) { const gl = glow('255,214,110', 40); g.globalAlpha = 0.5 + 0.2 * Math.sin(t * 4); g.drawImage(gl.c, c.x - 46 * s, c.y - 50 * s, 92 * s, 92 * s); g.globalAlpha = 1; }
        const pose = c.state === 'rest' ? 'rest' : c.state === 'stand' ? (c.rest > 0.55 ? 'rest' : 'stand') : 'run';
        drawCritter(g, c, t, s, pose);
      }
      function drawCritter(g, c, t, s, pose) {
        const variant = (c.core ? 'core-' : '') + ((c.sleep || pose === 'rest') ? 'sleep' : 'awake');
        const spr = critterSprite(c.loop, variant, s);
        const breath = pose === 'stand' ? Math.sin(t * 2.2) * 0.8 * s : 0;
        const bob = pose === 'run' ? -Math.abs(Math.sin(c.phase)) * 3 * s : (pose === 'sit' ? Math.sin(t * 1.5 + c.id) * 0.6 : breath);
        g.drawImage(shadowSprite().c, c.x - 22.4 * s, c.y + 18 * s - 4.8 * s, 44.8 * s, 9.6 * s);
        if (pose !== 'fly') drawLegs(g, c.sp, c.x, c.y + bob, s, c.phase, c.facing, pose);
        g.save(); g.translate(c.x, c.y + bob);
        if (c.spin) g.rotate(c.spin);
        if (pose === 'rest') g.scale(1.04, 0.86);
        g.scale(c.facing, 1);
        g.drawImage(spr.c, -spr.ox * s, -spr.oy * s, spr.w * s, spr.h * s);
        g.restore();
        if ((c.sleep || pose === 'rest') && pose !== 'fly' && !c.moted) {
          const k = (t * 0.6 + c.id * 0.37) % 1;
          g.fillStyle = palette.dark ? `rgba(255,250,235,${0.8 * (1 - k)})` : `rgba(60,40,30,${0.6 * (1 - k)})`;
          g.font = `600 ${Math.round(10 * s + 4)}px Fredoka, sans-serif`;
          g.fillText('z', c.x + 18 * s + k * 8, c.y - 18 * s - k * 16);
        }
      }
      function drawFire(g, t, flick) {
        const x = Wd.fire.x, y = Wd.fire.y, s = Wd.unit * (Wd.portrait ? 1 : 1.2), kick = 1 + game.fireKick * 0.12;
        g.save(); g.translate(x, y + 8 * s);
        g.fillStyle = palette.woodDark;
        g.rotate(0.28); g.fillRect(-22 * s, -3.5 * s, 44 * s, 7 * s); g.rotate(-0.56); g.fillRect(-22 * s, -3.5 * s, 44 * s, 7 * s);
        g.restore();
        g.fillStyle = 'rgba(255,120,40,0.6)'; g.beginPath(); g.ellipse(x, y + 6 * s, 16 * s, 4 * s, 0, 0, TAU); g.fill();
        g.globalCompositeOperation = 'lighter';
        const layers = [[26, 50, [255, 96, 40], 0.7], [19, 38, [255, 160, 60], 0.85], [10, 24, [255, 236, 170], 0.95]];
        layers.forEach(([fw, fh, rgb, a], k) => {
          for (let j = -1; j <= 1; j++) {
            if (view.low && j && k) continue;
            const hh = fh * s * kick * (j ? 0.62 : 1) * (1 + 0.14 * Math.sin(t * 9 + k * 1.7 + j * 2) + 0.08 * Math.sin(t * 14.3 + k + j));
            const ww = fw * s * (j ? 0.6 : 1), bx = x + j * fw * 0.45 * s, sway = Math.sin(t * 5.2 + k + j * 1.3) * 4 * s;
            const gr = g.createLinearGradient(0, y, 0, y - hh);
            gr.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`); gr.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
            g.fillStyle = gr; g.beginPath(); g.moveTo(bx - ww / 2, y);
            g.bezierCurveTo(bx - ww / 2, y - hh * 0.45, bx - ww * 0.15 + sway * 0.5, y - hh * 0.72, bx + sway, y - hh);
            g.bezierCurveTo(bx + ww * 0.15 + sway * 0.5, y - hh * 0.72, bx + ww / 2, y - hh * 0.45, bx + ww / 2, y);
            g.closePath(); g.fill();
          }
        });
        const gl = glow('255,170,80', 64), gr2 = 60 * s * flick;
        g.globalAlpha = 0.45; g.drawImage(gl.c, x - gr2, y - 14 * s - gr2, gr2 * 2, gr2 * 2); g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      }

      /* Loopie's lasso spins above his head in step with the knot, and grows as the rope charges. */
      function handPoint() { return { x: Wd.loopie.x + Wd.loopie.size * 0.34, y: Wd.loopie.y - Wd.loopie.size * 0.08 - lift.v }; }
      function drawLasso(g) {
        const show = ['herd', 'countin'].includes(game.phase) || (game.phase === 'core' && ['rope', 'bounce', 'arrive'].includes(game.coreStage));
        if (!show && lasso.throwT < 0) return;
        const hp = handPoint();
        g.strokeStyle = palette.rope; g.lineCap = 'round';
        if (lasso.throwT >= 0 && lasso.target) {
          const k = S.clamp(lasso.throwT / lasso.dur, 0, 1);
          const tgt = { x: lasso.target.x, y: lasso.target.y - 4 };
          const mx = (hp.x + tgt.x) / 2, my = Math.min(hp.y, tgt.y) - 60;
          const qx = (1 - k) * (1 - k) * hp.x + 2 * (1 - k) * k * mx + k * k * tgt.x;
          const qy = (1 - k) * (1 - k) * hp.y + 2 * (1 - k) * k * my + k * k * tgt.y;
          g.lineWidth = 2; g.beginPath(); g.moveTo(hp.x, hp.y); g.quadraticCurveTo(S.lerp(hp.x, mx, k), S.lerp(hp.y, my, k), qx, qy); g.stroke();
          const lr = (lasso.miss ? 26 : 18) * Wd.unit * (lasso.target.core ? 1.6 : 1);
          g.lineWidth = 2.4; g.beginPath(); g.ellipse(qx, qy, lr, lr * 0.4, 0, 0, TAU); g.stroke();
          return;
        }
        const ch = S.clamp(game.charge, 0, 1);
        const r = (14 + ch * 22) * Wd.unit;
        lasso.spin = clock.running ? knotAngle() : lasso.spin + 0.05;
        const cx = hp.x + 6, cy = hp.y - 34 * Wd.unit - ch * 10;
        g.lineWidth = 2.4; g.beginPath(); g.moveTo(hp.x, hp.y); g.lineTo(cx + Math.cos(lasso.spin) * r, cy + Math.sin(lasso.spin) * r * 0.35); g.stroke();
        g.lineWidth = 3; g.beginPath(); g.ellipse(cx, cy, r, r * 0.35, Math.sin(lasso.spin * 0.5) * 0.15, 0, TAU); g.stroke();
        if (ch > 0.05) { g.strokeStyle = `rgba(255,214,120,${0.25 + ch * 0.5})`; g.lineWidth = 1.5; g.beginPath(); g.ellipse(cx, cy - 1, r, r * 0.35, Math.sin(lasso.spin * 0.5) * 0.15, Math.PI, TAU); g.stroke(); }
      }

      let ringTex = null;
      function buildRingTex(SZ, c, r, dark) {
        const t = mk(SZ, SZ), g = t.g;
        const bg = g.createRadialGradient(c, c, r * 0.4, c, c, r * 1.3);
        bg.addColorStop(0, dark ? 'rgba(10,8,24,0.5)' : 'rgba(255,244,228,0.5)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = bg; g.beginPath(); g.arc(c, c, r * 1.3, 0, TAU); g.fill();
        g.lineCap = 'round';
        g.strokeStyle = palette.ropeDark; g.lineWidth = 10; g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke();
        g.strokeStyle = palette.rope; g.lineWidth = 7; g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke();
        t.key = SZ + '|' + r + '|' + dark + '|' + view.dpr; ringTex = t;
        // the rope's twist: a dash pattern that divides the loop exactly, so it can travel round with the knot seamlessly
        const len = TAU * (r - 0.5), n = Math.max(8, Math.round(len / 12)), per = len / n;
        ringDash = { a: [per * 5 / 12, per * 7 / 12], len, col: dark ? 'rgba(255,240,210,0.42)' : 'rgba(255,236,200,0.6)' };
      }
      let ringDash = null;
      function drawRing() {
        if (!ringCtx || ringZone.hidden) return;
        const g = ringCtx, SZ = Wd.ring.size + RP * 2, c = SZ / 2, r = Wd.ring.r;
        g.clearRect(0, 0, SZ, SZ);
        const dark = palette.dark;
        const ang = knotAngle();
        const live = isRopePhase();
        if (!ringTex || ringTex.key !== SZ + '|' + r + '|' + dark + '|' + view.dpr) buildRingTex(SZ, c, r, dark);
        g.drawImage(ringTex.c, 0, 0, SZ, SZ); // unrotated: a straight copy, far cheaper than resampling the whole ring each frame
        g.setLineDash(ringDash.a); g.lineDashOffset = -(((ang + Math.PI / 2) % TAU + TAU) % TAU) * (r - 0.5);
        g.strokeStyle = ringDash.col; g.lineWidth = 2.2; g.lineCap = 'round';
        g.beginPath(); g.arc(c, c, r - 0.5, 0, TAU); g.stroke(); g.setLineDash([]); g.lineDashOffset = 0;
        g.lineCap = 'round';
        if (live && !game.assist) {
          const tol = tolRad();
          g.fillStyle = dark ? 'rgba(143,227,176,0.14)' : 'rgba(31,138,76,0.14)';
          g.beginPath(); g.moveTo(c, c); g.arc(c, c, r + 20, ang - tol, ang + tol); g.closePath(); g.fill();
        }
        const pg = glow('255,214,120', 24);
        for (let k = 0; k < 4; k++) {
          const a = -Math.PI / 2 + k * Math.PI / 2, px = c + Math.cos(a) * r, py = c + Math.sin(a) * r, f = posts[k];
          const pr = (k === 0 ? 7.5 : 5.5) + f * 4;
          if (f > 0.02) { g.globalAlpha = 0.75 * f; g.drawImage(pg.c, px - pr * 3.2, py - pr * 3.2, pr * 6.4, pr * 6.4); g.globalAlpha = 1; }
          g.fillStyle = palette.woodDark; g.beginPath(); g.arc(px, py, pr + 1.6, 0, TAU); g.fill();
          g.fillStyle = k === 0 ? '#ffd27a' : palette.wood; g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
        }
        if (game.charge > 0.004 && (live || game.phase === 'core')) {
          const end = -Math.PI / 2 + TAU * Math.min(1, game.charge);
          g.strokeStyle = 'rgba(255,200,90,0.28)'; g.lineWidth = 13; g.beginPath(); g.arc(c, c, r + 15, -Math.PI / 2, end); g.stroke();
          g.strokeStyle = '#ffd27a'; g.lineWidth = 6; g.beginPath(); g.arc(c, c, r + 15, -Math.PI / 2, end); g.stroke();
        }
        const kx = c + Math.cos(ang) * r, ky = c + Math.sin(ang) * r;
        if (game.phase === 'core' && game.coreStage === 'still') {
          g.strokeStyle = dark ? 'rgba(255,255,255,0.18)' : 'rgba(60,40,20,0.18)'; g.lineWidth = 6; g.beginPath(); g.arc(kx, ky, 26, 0, TAU); g.stroke();
          if (game.hold > 0.002) {
            const e = -Math.PI / 2 + TAU * game.hold;
            g.globalAlpha = 0.3; g.strokeStyle = palette.sync; g.lineWidth = 12; g.beginPath(); g.arc(kx, ky, 26, -Math.PI / 2, e); g.stroke(); g.globalAlpha = 1;
            g.lineWidth = 6; g.beginPath(); g.arc(kx, ky, 26, -Math.PI / 2, e); g.stroke();
          }
        }
        if (knot.visible) {
          if (!clock.running && !S.reduced()) { const br = 0.5 + 0.5 * Math.sin(performance.now() / 420); g.globalAlpha = 0.35 + 0.4 * br; const ig = glow('255,214,120', 30); g.drawImage(ig.c, kx - 34, ky - 34, 68, 68); g.globalAlpha = 1; }
          if (live && clock.running && !S.reduced()) {
            const td = dotSprite('255,214,120');
            for (let i = 1; i <= 9; i++) { const a = ang - i * 0.075, rr = (7 - i * 0.5) * 1.25; g.globalAlpha = 0.42 * (1 - i / 10); g.drawImage(td.c, c + Math.cos(a) * r - rr, c + Math.sin(a) * r - rr, rr * 2, rr * 2); }
            g.globalAlpha = 1;
          }
          const kg = glow('255,220,150', 26);
          g.drawImage(kg.c, kx - 26, ky - 26, 52, 52);
          g.fillStyle = '#fff3cf'; g.beginPath(); g.arc(kx, ky, 9, 0, TAU); g.fill();
          g.strokeStyle = palette.ropeDark; g.lineWidth = 2; g.beginPath(); g.arc(kx, ky, 9, 0, TAU); g.stroke();
          g.strokeStyle = palette.rope; g.lineWidth = 2.2; g.beginPath(); g.moveTo(kx - 5, ky - 3); g.quadraticCurveTo(kx, ky + 4, kx + 5, ky - 3); g.stroke();
        }
        if (ringSparks.length) {
          g.fillStyle = '#fff1c4';
          ringSparks.forEach(p => { const k = 1 - p.age / p.life; g.globalAlpha = k; g.fillRect(p.x - 1.4, p.y - 1.4, 2.8, 2.8); });
          g.globalAlpha = 1;
        }
        if (input.down && input.dist > 0 && (live || game.coreStage === 'still')) {
          const ta = input.angle, ok = game.coreStage === 'still' ? game.holding : (ringState.sync || game.assist);
          const tr = game.coreStage === 'still' ? Math.min(input.dist, r * 1.6) : r;
          const tx = c + Math.cos(ta) * tr, ty = c + Math.sin(ta) * tr;
          g.strokeStyle = ok ? palette.sync : palette.slack; g.lineWidth = 3;
          g.beginPath(); g.arc(tx, ty, 16, 0, TAU); g.stroke();
          if (!ok && live) { g.setLineDash([4, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(tx, ty); g.lineTo(kx, ky); g.stroke(); g.setLineDash([]); }
        }
      }

      /* ================= finale: motes rise and draw a star-sheep for every resting thought ================= */
      const SHAPE = {
        pts: [[-20, 6], [-15, -6], [-2, -12], [12, -9], [22, -14], [31, -6], [25, 4], [14, 8], [-12, 10], [-13, 20], [13, 9], [14, 20]].map(([x, y]) => [x - 5.5, y - 3]),
        lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0], [8, 9], [7, 10], [10, 11]]
      };
      const HALO_N = 22;
      function drawConstellations(g, t, skyOff) {
        if (!constellations.length) return;
        const lineCol = palette.dark ? 'rgba(255,236,190,0.62)' : `rgba(255,248,230,${0.5 + 0.35 * Wd.dusk})`;
        constellations.forEach(cs => {
          if (!cs.started) return;
          const k = S.clamp(cs.t / cs.draw, 0, 1);
          const pts = cs.pts.map(([x, y]) => [cs.x + x * cs.s, cs.y + y * cs.s + skyOff]);
          const shown = cs.lines.length * k;
          g.strokeStyle = cs.golden ? 'rgba(255,214,120,0.8)' : lineCol; g.lineWidth = cs.core ? 1.7 : 1.15;
          g.beginPath();
          cs.lines.forEach(([a, b], i) => {
            if (i > shown) return;
            const f = S.clamp(shown - i, 0, 1);
            g.moveTo(pts[a][0], pts[a][1]); g.lineTo(S.lerp(pts[a][0], pts[b][0], f), S.lerp(pts[a][1], pts[b][1], f));
          });
          g.stroke();
          const gl = glow(cs.rgb, 12), rr = cs.core ? 11 : 8.5;
          pts.forEach(([x, y], i) => {
            if (i / pts.length > k + 0.05) return;
            const tw = 0.7 + 0.3 * Math.sin(t * 3 + i + cs.x);
            g.globalAlpha = tw; g.drawImage(gl.c, x - rr, y - rr, rr * 2, rr * 2); g.globalAlpha = 1;
            g.fillStyle = '#fffaf0'; g.fillRect(x - 1.1, y - 1.1, 2.2, 2.2);
          });
          if (cs.core) { // the rope becomes a lasso of stars around the big one
            const hk = S.clamp((cs.t - cs.draw) / cs.haloT, 0, 1);
            if (hk > 0) {
              const cx = cs.x, cy = cs.y + skyOff, rad = cs.halo;
              g.strokeStyle = `rgba(255,214,120,${0.32 * hk})`; g.lineWidth = 1.4;
              g.beginPath(); g.arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + TAU * hk); g.stroke();
              const hg = glow('255,214,120', 10), n = Math.floor(HALO_N * hk + 0.001);
              for (let i = 0; i < n; i++) {
                const a = -Math.PI / 2 + TAU * i / HALO_N, x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad, tw = 0.65 + 0.35 * Math.sin(t * 2.4 + i);
                g.globalAlpha = tw; g.drawImage(hg.c, x - 8, y - 8, 16, 16); g.globalAlpha = 1;
                g.fillStyle = '#fff6dc'; g.fillRect(x - 1, y - 1, 2, 2);
              }
              if (hk >= 1 && !cs.haloDone) { cs.haloDone = true; haloComplete(); }
            }
          }
        });
      }
      function toScreen(x, y, layer) { return { x, y: y + (layer === 'sky' ? Wd.cam.y * 0.35 : Wd.cam.y) }; }
      function updateMotes(dt) {
        motes.forEach(m => {
          m.t += dt;
          if (m.t < m.delay || m.done) return;
          if (!m.launched) { m.launched = true; if (m.critter) m.critter.moted = true; if (A.ctx) A.whoosh({ vol: 0.05, dur: 0.9, from: 900, to: 4200, pan: (m.cs.x / Wd.w - 0.5) }); }
          const k = S.clamp((m.t - m.delay) / m.dur, 0, 1);
          if (k >= 1) {
            m.done = true; m.cs.started = true;
            const at = performance.now();
            if (A.ctx) { A.chime(A.note(PENTA[m.i % PENTA.length]), { vol: m.core ? 0.13 : 0.09, dur: m.core ? 2.6 : 1.6 }); A.sync('constellation', at); }
            if (m.core && A.ctx) A.pad([A.note('G3'), A.note('D4'), A.note('B4'), A.note('G5')], { dur: 6, vol: 0.16, attack: 1.4 });
          }
        });
      }
      function drawMotes(g) {
        if (!motes.length) return;
        g.globalCompositeOperation = 'lighter';
        motes.forEach(m => {
          if (m.t < m.delay || m.done) return;
          const k = S.clamp((m.t - m.delay) / m.dur, 0, 1);
          const a = toScreen(m.from.x, m.from.y, 'ground');
          const b = toScreen(m.cs.x, m.cs.y, 'sky');
          const e = S.ease.inOutCubic(k);
          const sway = Math.sin(k * Math.PI * 2 + m.i) * 26 * (1 - k) * (S.reduced() ? 0 : 1);
          const x = S.lerp(a.x, b.x, e) + sway, y = S.lerp(a.y, b.y, e) - Math.sin(k * Math.PI) * 30;
          m.trail.push([x, y]); if (m.trail.length > 14) m.trail.shift();
          const tg = glow(m.cs.rgb, 8);
          m.trail.forEach(([tx, ty], i) => { const f = i / m.trail.length, rr = (m.core ? 7 : 5) * f; g.globalAlpha = 0.5 * f; g.drawImage(tg.c, tx - rr, ty - rr, rr * 2, rr * 2); });
          g.globalAlpha = 1;
          const r = m.core ? 9 : 6, mg = glow(m.cs.rgb, 24);
          g.drawImage(mg.c, x - r * 3, y - r * 3, r * 6, r * 6);
          g.fillStyle = '#fffbea'; g.beginPath(); g.arc(x, y, r * 0.42, 0, TAU); g.fill();
        });
        g.globalCompositeOperation = 'source-over';
      }

      /* ================= DOM that lives in the world ================= */
      let bannerKey = '', bannerHalf = 60, bannerH = 34, hudBottom = 0;
      function loopieScreen() { const L = Wd.loopie, s = toScreen(L.x, L.y, 'ground'); s.y -= lift.v; return s; }
      /* Phones: speech sits beside Loopie (right), clear of the field; wide screens: above his head. Never on his art. */
      function sayBox(s) {
        const L = Wd.loopie, side = Wd.portrait && !loopieMove;
        if (side) {
          const left = s.x + L.size / 2 + 10, bw = Math.min(300, Wd.w - left - 12);
          if (bw >= 170) return { side: true, top: s.y - L.size / 2 + 4, left, w: bw };
        }
        const bw = Math.min(300, Wd.w - 32);
        return { side: false, bottom: s.y - L.size / 2 - 14, left: Math.max(12, Math.min(s.x - 30, Wd.w - bw - 12)), w: bw };
      }
      let sayKey = '';
      function placeSay(s) {
        const b = sayBox(s);
        const key = b.side + '|' + Math.round(b.left) + '|' + Math.round(b.side ? b.top : b.bottom) + '|' + Math.round(b.w);
        if (key === sayKey) return b;
        sayKey = key;
        sayEl.classList.toggle('side', b.side);
        sayEl.style.maxWidth = b.w + 'px';
        sayEl.style.left = b.left + 'px';
        if (b.side) { sayEl.style.top = b.top + 'px'; sayEl.style.bottom = 'auto'; }
        else { sayEl.style.bottom = (Wd.h - b.bottom) + 'px'; sayEl.style.top = 'auto'; }
        return b;
      }
      function setGauge(b) {
        bpmEl.textContent = String(b);
        const k = S.clamp((b - 50) / 100, 0, 1);
        gaugeArc.setAttribute('stroke-dashoffset', (100 - k * 100).toFixed(1));
        gaugeNeedle.setAttribute('transform', `rotate(${(-90 + k * 180).toFixed(1)} 32 36)`);
      }
      function positionDom(t) {
        const L = Wd.loopie, s = loopieScreen();
        const bob = S.reduced() ? 0 : Math.sin(t * (clock.running ? clock.bpm / 60 * Math.PI : 2)) * 3;
        const tilt = isRopePhase() && !S.reduced() ? Math.sin(t * 2) * 3 : 0;
        loopieWrap.style.transform = `translate(${(s.x - L.size / 2).toFixed(1)}px, ${(s.y - L.size / 2 + bob).toFixed(1)}px) rotate(${tilt.toFixed(2)}deg)`;
        let sb = null;
        if (!sayEl.hidden) sb = placeSay(s);
        const tgt = game.target && (game.target.state === 'run' || game.target.state === 'target' || game.target.state === 'enter') && game.phase !== 'rollcall' ? game.target : (game.phase === 'rollcall' ? rollcallCritter : null);
        if (tgt && !banner.hidden) {
          const ds = depthScale(tgt.y) * (tgt.core ? coreScale() : 1);
          const p = toScreen(tgt.x, tgt.y - 30 * ds, 'ground');
          const key = banner.textContent + '|' + banner.className;
          if (bannerKey !== key) { bannerKey = key; bannerHalf = (banner.offsetWidth || 120) / 2; bannerH = banner.offsetHeight || 34; }
          if (!hudBottom && !hud.hidden) hudBottom = hud.offsetTop + hud.offsetHeight;
          const minBottom = (hud.hidden ? 64 : hudBottom + 10) + bannerH; // the player's words never slide under the HUD or the console bar
          const bx = S.clamp(p.x, bannerHalf + 10, Wd.w - bannerHalf - 10);
          let by = Math.max(p.y, minBottom);
          if (sb) { // never let the player's words sit under Loopie's speech
            const sh = sayEl.offsetHeight || 60, top = sb.side ? sb.top : sb.bottom - sh, bottom = top + sh;
            if (by > top && by - bannerH < bottom && bx + bannerHalf > sb.left && bx - bannerHalf < sb.left + sb.w) by = Math.max(minBottom, top - 6);
          }
          banner.style.transform = `translate(${bx.toFixed(1)}px, ${by.toFixed(1)}px) translate(-50%, -100%)`;
        }
        if (clock.running) { const b = Math.round(clock.bpm); if (bpmEl.textContent !== String(b)) setGauge(b); }
      }

      /* ================= speech ================= */
      let sayTimer = 0;
      function say(text, ms) {
        S.cancel(sayTimer);
        if (!text) { sayEl.hidden = true; return Promise.resolve(); }
        placeSay(loopieScreen());
        const p = UI.say(sayEl, text, { target: sayText, tick: () => { if (A.ctx && S.settings.sound) A.tone({ type: 'sine', freq: 520 + Math.random() * 140, dur: 0.04, vol: 0.025 }); } });
        if (ms !== 0) sayTimer = S.later(() => { sayEl.hidden = true; }, ms || Math.max(2400, text.length * 55));
        return p;
      }
      const hush = () => { S.cancel(sayTimer); sayEl.hidden = true; };

      /* ================= scenes: play, the paddock card, the sky ================= */
      const stage = new S.Stage();
      const sc = { play: { el: null }, paddock: { el: paddockSc }, sky: { el: null } };
      Object.keys(sc).forEach(k => stage.add(k, sc[k]));

      async function startRodeo() {
        herdLocked = true;
        herd = herdFrom(an);
        const inten = S.intensity();
        game.endBpm = [56, 60, 62][inten];
        game.startBpm = 72 + herdSpeed * 6;
        Object.assign(game, { perfect: 0, taps: 0, tapScore: 0, miss: 0, catches: 0, penned: 0, hold: 0, holding: false, charge: 0, assist: false, assistOffered: false, coreStage: null,
          pressTime: 0, syncTime: 0, slackT: 0, slackSaid: false, start: performance.now(), lastCatchAt: performance.now(), paddock: null });
        const maxCritters = [4, 5, 6][inten];
        const list = herd.critters.slice(0, maxCritters);
        game.total = game.thoughts = list.length;
        critters = list.map((c, i) => makeCritter(c, i, list.length, false));
        game.coreCritter = makeCritter(herd.core, list.length, list.length, true);
        game.queue = critters.slice();
        game.target = null;
        renderTally();
        setGauge(game.startBpm);
        hud.hidden = false; hudBottom = 0;
        camTo(0, 1.1);
        game.phase = 'rollcall';
        setBaseFace('dizzy'); face('shocked', 1600);
        if (A.ctx) A.noise({ pink: true, filter: 'lowpass', freq: 260, dur: 2.4, attack: 0.6, vol: 0.28 });
        ctx.track('rodeo_start', { speed: herdSpeed, bpm: game.startBpm, critters: game.total, paddockVisit: paddockDue ? 1 : 0, night: nightIdx, golden: golden ? 1 : 0 });
        S.later(() => { if (game.phase === 'rollcall') { visitorReact('arrive'); say(nightLine(), 2900); } }, 650);
        S.later(() => { // the rope arrives early (idle), so the player meets their control while the herd thunders in
          if (game.phase !== 'rollcall') return;
          ringZone.hidden = false; ringZone.classList.remove('in'); void ringZone.offsetWidth; ringZone.classList.add('in');
          knot.visible = true; ringState.text = ''; setRingText('Your rope', 'Ready in a moment');
          if (A.ctx) A.wood(undefined, 0.12, 0.7);
        }, 1400);
        await S.sleep(critters.length * 700 + 1000);
        if (game.phase !== 'rollcall') return;
        rollcallCritter = null; banner.hidden = true;
        if (paddockDue) face('surprised', 1400);
        await say(paddockDue ? vline(R.LINES.due) : lines('intro'), 4000);
        await S.sleep(S.reduced() ? 1600 : 2000);
        if (game.phase !== 'rollcall') return;
        hush();
        A.unlock();
        if (ringZone.hidden) { ringZone.hidden = false; ringZone.classList.add('in'); }
        knot.visible = true; knot.fixed = null; knot.glide = null;
        ringState.text = '';
        setRingText('Get ready', 'Watch the glowing knot');
        game.phase = 'countin';
        const t0 = cnow() + 0.25;
        startClock(game.startBpm, t0);
        const beatLen = 60 / game.startBpm;
        circleGuide({ id: 'rope', label: 'CIRCLE WITH THE KNOT', delay: 200 });
        ['3', '2', '1', 'Rope!'].forEach((txt, k) => S.later(() => showJudge(txt, 'count'), Math.max(0, (t0 + k * beatLen - cnow()) * 1000)));
        S.later(() => { if (game.phase === 'countin') { game.phase = 'herd'; game.lastCatchAt = performance.now(); nextTarget(); } }, Math.max(0, (t0 + 4 * beatLen - cnow() - beatLen * 0.5) * 1000));
      }
      function announce(c) {
        rollcallCritter = c;
        banner.textContent = c.label; banner.classList.remove('big', 'gold'); banner.hidden = false;
        if (A.ctx) bleat({ pitch: 0.8 + Math.random() * 0.5, vol: 0.14, pan: -0.4 });
      }
      function nextTarget() {
        game.charge = 0;
        const nxt = game.queue.find(c => c.state === 'run' || c.state === 'enter');
        game.target = nxt || null;
        if (game.target) {
          banner.textContent = game.target.label; banner.classList.remove('big'); banner.classList.toggle('gold', !!game.target.golden); banner.hidden = false;
        } else {
          banner.hidden = true;
          startCore();
        }
      }

      /* Paddock time: book the big one a visit (worry postponement). */
      function renderAlmanac() {
        almEl.innerHTML = '';
        const loops = Array.from(new Set(critters.filter(c => c.state === 'pen' || c.state === 'rest').map(c => c.loop)));
        loops.slice(0, 8).forEach(l => almEl.append(miniCritter(l, 36, 30)));
        const met = K.collection().filter(l => R.SPECIES[l]).length;
        const fresh = (almanacFresh || []).filter(l => R.SPECIES[l]);
        const names = fresh.map(l => R.SPECIES[l].name);
        const text = !fresh.length ? 'Herd Almanac: ' + met + ' of ' + R.LOOPS.length + ' kinds met'
          : fresh.length <= 2 ? 'New in your Herd Almanac: ' + names.join(' and ')
            : 'New in your Herd Almanac: ' + fresh.length + ' kinds. ' + met + ' of ' + R.LOOPS.length + ' met.';
        almEl.append(h('span', { class: 'r-almnew', text }));
      }
      function liftTo(v) { lift.from = lift.v; lift.to = v; lift.t = 0; lift.d = S.reduced() ? 0.01 : 0.55; }
      sc.paddock.enter = () => {
        if (S.destroyed) return;
        game.phase = 'paddock';
        slotsEl.innerHTML = '';
        R.slots().forEach(s => {
          const b = h('button', { type: 'button', class: 'ts-chip r-slot', 'aria-label': 'Paddock time ' + s.label }, h('b', { text: s.time }), h('span', { text: s.day }));
          b.addEventListener('click', () => pickPaddock(s));
          slotsEl.append(b);
        });
        renderAlmanac();
        K.guide({ id: 'paddock', g: 'choose', target: () => Array.from(slotsEl.children), label: 'PICK A TIME', delay: 900 });
        // make room: Loopie hops up so the card never covers his art
        const cardTop = paddockSc.offsetTop + paddockCard.offsetTop, cardL = paddockCard.offsetLeft, cardR = cardL + paddockCard.offsetWidth;
        const L = Wd.loopie, s = toScreen(L.x, L.y, 'ground');
        const bottom = s.y + L.size / 2, left = s.x - L.size / 2, right = s.x + L.size / 2;
        if (right > cardL && left < cardR && bottom > cardTop - 10) {
          liftTo(bottom - (cardTop - 10));
          face('happy', 1200);
          if (A.ctx) A.pop({ freq: 440, vol: 0.1 });
        }
      };
      function pickPaddock(s) {
        if (game.phase !== 'paddock') return;
        K.guide(null);
        game.paddock = s;
        R.paddock.set(s.at, game.coreCritter ? game.coreCritter.loop : 'other');
        ctx.track('paddock_set', { slot: new Date(s.at).getHours() });
        if (A.ctx) { A.wood(undefined, 0.2, 1.2); A.chime(A.note('D5'), { vol: 0.08 }); A.sync('paddock', performance.now()); }
        stage.go('sky', {}, { duration: 300 });
        S.later(() => { finale(); say(vline(R.LINES.paddock).replace('{time}', s.label), 2600); }, 320);
      }
      $('.r-noslot').addEventListener('click', () => {
        if (game.phase !== 'paddock') return;
        K.guide(null); game.paddock = null; ctx.track('paddock_skip', {});
        if (A.ctx) { A.wood(undefined, 0.12, 0.9); A.sync('paddock-skip', performance.now()); }
        stage.go('sky', {}, { duration: 300 });
        S.later(() => { finale(); say(vline(R.LINES.nopaddock), 2200); }, 320);
      });

      /* ================= finale ================= */
      let finaleUp = 0, skyLineSaid = false;
      function skyLayout(nSmall, hasCore, up) {
        const w = Wd.w, top = 74, bottom = Math.max(top + 175, Wd.horizon - 118 + up * 0.6);
        const span = Wd.portrait ? w - 36 : Math.min(w * 0.72, 940), left = (w - span) / 2;
        const flank = hasCore && nSmall >= 4 ? 2 : 0, rowA = nSmall - flank, out = [];
        const sS = (Wd.portrait ? 1.12 : 1.6) * (Wd.portrait && rowA >= 5 ? 0.88 : 1), cS = Wd.portrait ? 1.95 : 2.35, halo = 34 * cS;
        const coreY = bottom - halo - 6;
        for (let i = 0; i < rowA; i++) {
          const f = rowA === 1 ? 0.5 : rowA === 2 ? 0.25 + 0.5 * i : i / (rowA - 1);
          out.push({ x: left + span * (rowA === 1 ? 0.5 : 0.08 + 0.84 * f), y: top + 24 + Math.pow(Math.abs(f - 0.5) * 2, 2) * 24, s: sS });
        }
        if (flank) { out.push({ x: left + span * 0.1, y: coreY + 10, s: sS }); out.push({ x: left + span * 0.9, y: coreY + 10, s: sS }); }
        const core = hasCore ? { x: w / 2, y: hasCore && !nSmall ? (top + bottom) / 2 : coreY, s: cS, halo } : null;
        return { smalls: out, core };
      }
      function finale() {
        if (game.phase === 'finale' || game.phase === 'end') return;
        game.phase = 'finale';
        hud.hidden = true; ringZone.hidden = true; banner.hidden = true;
        if (assistBtn) { assistBtn.remove(); assistBtn = null; }
        K.guide(null);
        const all = critters.filter(c => c.state === 'pen' || c.state === 'rest');
        const smalls = all.filter(c => !c.core), core = all.find(c => c.core);
        finaleUp = Wd.h * 0.12;
        const finalSkyOff = finaleUp * 0.35;
        const L = skyLayout(smalls.length, !!core, finaleUp);
        const drawT = S.reduced() ? 0.5 : 1.4, haloT = S.reduced() ? 0.4 : 1.3;
        constellations = smalls.map((c, i) => ({ x: L.smalls[i].x, y: L.smalls[i].y - finalSkyOff, s: L.smalls[i].s, pts: SHAPE.pts, lines: SHAPE.lines, t: 0, draw: drawT, started: false, core: false, golden: c.golden, rgb: c.golden ? '255,214,110' : rgbOf(shade(c.sp.wool, 0.04)) }));
        if (core) constellations.push({ x: L.core.x, y: L.core.y - finalSkyOff, s: L.core.s, halo: L.core.halo, pts: SHAPE.pts, lines: SHAPE.lines, t: 0, draw: drawT, haloT, started: false, core: true, rgb: '255,244,220' });
        const order = smalls.concat(core ? [core] : []);
        const gap = S.reduced() ? 0.2 : 0.45, fly = S.reduced() ? 0.6 : 2.0;
        motes = order.map((c, i) => ({ i, critter: c, core: !!c.core, from: { x: c.x, y: c.y - 14 * (c.core ? 1.6 : 1) }, cs: constellations[i], delay: 0.7 + i * gap + (c.core ? 0.5 : 0), dur: fly, t: 0, done: false, launched: false, trail: [] }));
        camTo(finaleUp, 3.0);
        if (!palette.dark) duskTo(0.92, 2.8);
        if (amb) amb.level(0.6, 1.5);
        // Loopie strolls over to sit by the fire with the herd
        const f = finaleLoopieSpot();
        loopieMove = { t: 0, d: S.reduced() ? 0.01 : 1.6, x0: Wd.loopie.x, y0: Wd.loopie.y - lift.v, x1: f.x, y1: f.y };
        lift.v = 0; lift.to = 0; lift.t = 1;
        S.later(() => { if (!finished) setBaseFace('calm'); }, 1700);
        S.later(() => { if (game.phase === 'finale') say(lines('sky'), 2700); }, 2900);
        if (!core) S.later(haloComplete, (0.7 + order.length * gap + fly + drawT + 0.4) * 1000);
      }
      function haloComplete() {
        if (game.phase !== 'finale' || skyLineSaid) return;
        skyLineSaid = true;
        if (A.ctx) { ['G5', 'B5', 'D6'].forEach((nn, i) => A.chime(A.note(nn), { when: A.now() + i * 0.11, vol: 0.07, dur: 1.8 })); A.sync('halo', performance.now()); }
        visitorReact('finale');
        face('star', 1800);
        if (!S.reduced()) { shooting = null; nextShoot = 0; }
        hush();
        S.later(showSign, 650);
      }
      let finished = false, finishedAt = 0, result = null;
      function skillScore() {
        if (game.assist) return null;
        const tapW = 0.6, num = game.syncTime + game.tapScore * tapW, den = game.pressTime + (game.taps + game.miss) * tapW;
        return den > 0.5 ? S.clamp(num / den, 0, 1) : null;
      }
      function computeResult() {
        if (result) return result;
        const score = skillScore(), pct = score == null ? null : Math.round(score * 100);
        const tier = score == null ? '' : K.tier(score);
        const best = pct == null ? null : K.best('sync', pct, 'higher');
        const b0 = game.startBpm, b1 = game.finalBpm || Math.round(game.endBpm);
        const badges = [];
        if (best && best.isNew) badges.push('New best: ' + pct + '% in sync');
        else if (best && best.first) badges.push('Best to beat: ' + pct + '% in sync');
        if (tier) badges.push(tier + ' wrangler');
        if (game.goldenCaught) badges.push('Roped the Golden Fleece');
        const fresh = (almanacFresh || []).filter(l => R.SPECIES[l] && l !== 'golden');
        if (fresh.length) badges.push(fresh.length === 1 ? 'Collected: ' + R.SPECIES[fresh[0]].name : 'Collected: ' + fresh.length + ' new kinds');
        result = { pct, tier, best, b0, b1, badges };
        return result;
      }
      function showSign() {
        if (game.phase !== 'finale' || S.destroyed) return;
        const r = computeResult();
        signBpm.innerHTML = '';
        signBpm.append(r.b0 + ' → ' + r.b1, h('i', { text: 'BPM' }));
        rosette.hidden = !r.tier;
        if (r.tier) { rosette.className = 'r-rosette ' + r.tier.toLowerCase(); rosette.querySelector('.r-rotier').textContent = r.tier; rosette.querySelector('.r-ropct').textContent = r.pct + '%'; }
        signEl.hidden = false;
        const sh = signEl.offsetHeight || 110, ls = loopieScreen(), lb = ls.y + Wd.loopie.size / 2;
        const lo = Math.max(lb + 14, Wd.portrait ? 0 : Wd.ringTop + 10), hi = Wd.h - 18 - sh;
        signEl.style.top = Math.round(S.clamp(lo + Math.max(0, (hi - lo) * 0.42), Math.min(lo, hi), hi)) + 'px';
        signEl.classList.remove('show'); void signEl.offsetWidth; signEl.classList.add('show');
        if (A.ctx) { A.wood(undefined, 0.28, 0.8); S.later(() => { if (A.ctx) { A.wood(undefined, 0.22, 0.95); if (r.tier) ['C5', 'E5', 'G5', 'C6'].forEach((nn, i) => A.chime(A.note(nn), { when: A.now() + i * 0.07, vol: 0.06, dur: 1.4 })); } }, 140); A.sync('sign', performance.now()); }
        if (r.tier) setBaseFace('celebrate');
        S.later(finishGame, S.reduced() ? 1400 : 2600);
      }
      function finishGame() {
        if (finished) return;
        finished = true; finishedAt = performance.now();
        game.phase = 'end';
        if (!signEl.hidden) { signEl.classList.remove('show'); signEl.classList.add('gone'); }
        const r = computeResult();
        const smalls = critters.filter(c => c.state === 'pen' && !c.core && !c.golden).length;
        const secs = Math.round((performance.now() - game.start) / 1000);
        ctx.track('rodeo', { speed: herdSpeed, bpmStart: r.b0, bpmEnd: r.b1, perfect: game.perfect, taps: game.taps, miss: game.miss, sync: r.pct == null ? -1 : r.pct, tier: r.tier ? r.tier[0] : '', critters: smalls + 1, golden: game.goldenCaught ? 1 : 0, assist: game.assist ? 1 : 0, paddock: game.paddock ? 1 : 0, night: nightIdx, seconds: secs });
        K.guide(null);
        ctx.finish({
          title: 'The herd is resting', mood: 'peace',
          lines: [
            'Herd BPM ' + r.b0 + ' → ' + r.b1,
            smalls + (smalls === 1 ? ' thought' : ' thoughts') + ' rounded up, 1 resting by the fire',
            game.paddock ? 'Paddock time: ' + game.paddock.label : (game.assist ? 'Rode along, no timing needed' : 'In sync ' + (r.pct == null ? 0 : r.pct) + '%')
          ],
          share: 'My herd went from ' + r.b0 + ' to ' + r.b1 + ' BPM',
          badges: r.badges
        });
      }

      /* ================= pause, theme, resize, loop, start ================= */
      S.on('visibility', (vis) => {
        if (!vis) { if (clock.running) clock.paused = true; }
        else if (clock.running && clock.paused) { clock.paused = false; clock.next = cnow() + 0.4; clock.beats = []; lastBeatSeen = null; }
      });
      S.on('theme', () => { readPalette(); buildCaches(); spriteCache.clear(); vignette = null; placeVisitor(); initNightFx(); if (game.phase === 'paddock') renderAlmanac(); });
      cv.onResize(() => layout());
      if (!laidOut) layout();
      stage.go('play', {}, { duration: 0 });
      if (laidOut) { try { draw(0); } catch (e) { console.error(e); } } // the opaque canvas shows the prairie from its very first frame
      function setRung(i) {
        i = S.clamp(i, 0, RUNGS.length - 1);
        if (i === view.rung) return;
        const r = RUNGS[i];
        view.rung = i; view.half = !!r.half; view.low = !!r.low; view.all30 = !!r.all30;
        if (r.dpr !== view.dpr) {
          // only the two live canvases change resolution; the baked art keeps its sharper copies (no rebuild hitch)
          view.dpr = r.dpr; cvOpts.maxDpr = r.dpr;
          if (cv.w) { const f = S.fitCanvas(cv.el, cv.w, cv.h, r.dpr); cv.g = f.ctx; cv.dpr = f.dpr; }
          ringCtx = S.fitCanvas(ringCanvas, Wd.ring.size + RP * 2, Wd.ring.size + RP * 2, r.dpr).ctx;
          bgc = null; bgcNext = null; ringTex = null;
        }
        ctx.track('quality', { rung: i, dpr: view.dpr });
      }
      /* Judged on the share of frames that miss two refreshes in a row, a second at a time: one bad second steps down a rung
         (two or three when it's far behind); a hiccup only counts if the next second is bad too. */
      function adaptQuality() {
        const now = performance.now(), d = view.lastNow ? now - view.lastNow : 16.7;
        view.lastNow = now;
        const watch = !S.opts.staticRender && !document.hidden && now - view.born > 700 && (introUp || ['rollcall', 'countin', 'herd', 'core', 'settle', 'paddock', 'finale'].includes(game.phase));
        if (!watch) { view.samples.length = 0; view.lastCheck = now; return; }
        view.samples.push(d);
        const first = !view.checked;
        if (now - view.lastCheck < (first ? 600 : 1000) || view.samples.length < (first ? 24 : 30)) return;
        view.lastCheck = now; view.checked = true;
        let long = 0, sum = 0;
        for (const x of view.samples) { if (x > 34) long++; sum += x; }
        const n = view.samples.length, frac = long / n;
        view.samples.length = 0;
        const bad = frac > 0.12 || (frac > 0.045 && view.warn) || (view.cost > 10 && !view.half);
        view.warn = frac > 0.045;
        if (bad) {
          view.calm = 0; view.warn = false;
          setRung(view.rung + (introUp ? 1 : frac > 0.3 ? 3 : frac > 0.16 ? 2 : 1));
        } else if (!long && sum / n < 17.6 && !introUp && view.rung > 0) {
          // a passing hiccup shouldn't cost the whole ride: one step back up after a few smooth seconds (never a resolution change)
          if (++view.calm >= 4 && !view.recovered && RUNGS[view.rung - 1].dpr === view.dpr) { view.recovered = true; view.calm = 0; setRung(view.rung - 1); }
        } else view.calm = 0;
      }
      S.loop((dt, t) => {
        if (!laidOut) return;
        frameNo++;
        adaptQuality();
        scheduleBeats(); update(dt, t);
        if (introUp && frameNo % 3 !== 1) return; // the title card blurs the world: a gentler frame rate underneath is invisible and saves the device
        if (finished && (frameNo % 3 !== 0 || (performance.now() - finishedAt > 1200 && !shooting))) return; // the console's card is up: the prairie rests behind it
        else if (view.all30 && (frameNo & 1)) { spareFrame(); return; } // a device far behind: the whole scene at a steady 30 fps
        const c0 = performance.now();
        if (view.half && !view.all30 && (frameNo & 1)) { drawRing(); positionDom(t); spareFrame(); return; } // a struggling device: the world at 30 fps, the rope at 60
        draw(t); drawRing(); positionDom(t);
        view.cost = view.cost * 0.9 + (performance.now() - c0) * 0.1;
      });

      (async () => {
        await K.intro({ title: 'Loop Rodeo', sub: 'Your thoughts are stampeding. Grab the rope and round them up.', how: 'Circle your thumb with the glowing knot.', char: 'loopie', mood: 'dizzy' });
        introUp = false;
        startRodeo();
      })();

      return {
        /* Plays the whole game through the real ring button: rides the knot round for every catch, holds still on it for the
           big one, books the first paddock slot, and resolves once the console has the result. */
        async autoplay() {
          const until = async (fn, ms) => { const t0 = performance.now(); while (!fn()) { if (S.destroyed || performance.now() - t0 > (ms || 60000)) return false; await K.wait(40); } return true; };
          const onRing = (a, rr) => ({ x: Wd.ring.size / 2 + Math.cos(a) * (rr == null ? Wd.ring.r : rr), y: Wd.ring.size / 2 + Math.sin(a) * (rr == null ? Wd.ring.r : rr) });
          const intro = el.querySelector('.gk-intro');
          if (intro) await K.sim.tap(intro);
          await until(() => game.phase === 'herd', 40000);
          const roping = () => game.phase === 'herd' || (game.phase === 'core' && (game.coreStage === 'arrive' || game.coreStage === 'rope'));
          while (roping() && !S.destroyed) {
            const tgt = game.target;
            if (!isRopePhase() || !tgt || tgt.state !== 'run' || lasso.throwT >= 0) { await K.wait(40); continue; }
            const caught = game.catches, phase = game.phase;
            let p = onRing(knotAngle());
            const ptr = await K.sim.press(ringBtn, p.x, p.y);
            while (isRopePhase() && game.catches === caught && game.phase === phase && !S.destroyed) {
              await K.wait(30);
              p = onRing(knotAngle()); ptr.move(p.x, p.y);
            }
            ptr.up(p.x, p.y);
            await K.wait(160);
          }
          await until(() => game.phase === 'core' && game.coreStage === 'still' && !knot.glide, 30000);
          await K.wait(500);
          const kp = onRing(knotAngle());
          const hold = await K.sim.press(ringBtn, kp.x, kp.y);
          await until(() => game.coreStage === 'done' || game.phase !== 'core', 30000);
          hold.up(kp.x, kp.y);
          await until(() => game.phase === 'paddock' && slotsEl.children.length > 0, 30000);
          await K.wait(1400);
          if (slotsEl.firstElementChild) await K.sim.tap(slotsEl.firstElementChild);
          await until(() => finished, 60000);
        },
        state: () => ({ phase: game.phase, core: game.coreStage, penned: game.penned, total: game.total, bpm: Math.round(clock.bpm), base: clock.base, charge: +game.charge.toFixed(2), hold: +game.hold.toFixed(2), night: night.id, golden, visits, dpr: view.dpr, rung: view.rung })
      };
    }
  });
})(window.TSG_ENV);
