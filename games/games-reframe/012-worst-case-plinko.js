/* 012 Worst-Case Plinko — Reframe · REFRAME · Uncertainty / Future Worry / Reassurance
 * Mechanism: decatastrophising with chained probabilities (Leahy 2003, Cognitive Therapy Techniques): a worst case needs
 * several links to go wrong in a row. Pricing each link honestly and multiplying shows how far the chain sits from what the
 * gut says, and a coping plan for "what if it did happen" shrinks what is left (Beck's decatastrophising questions).
 * Honest maths: every gate's lanes are coloured in exactly the odds the player sets, 100 balls fall through real peg
 * physics, and the run shown is a real simulation (pre-simulated, then replayed step for step) whose counts equal the
 * multiplied odds. When the facts back the fear, the coping plan is the hero, not the odds.
 * Verb: drop (drag each gate to its honest odds, hold the hopper to stream 100 balls, drag three coping tokens into the
 * worst-case slot). Finale: jackpot lights race round the realistic slots, their balls hop in a wave, fireworks launch
 * from the bins and a ticket strip prints "Most likely: ...".
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const PINK = '#ff3d6e', MINT = '#3dffb0', GOLD = '#ffd25a';
  /* No GPU (VMs, blocklisted devices): the canvas is rasterised on the CPU, so it runs at a lower pixel ratio there. */
  let softMemo = null;
  function softwareGfx() {
    if (softMemo != null) return softMemo;
    try {
      const c = document.createElement('canvas'), gl = c.getContext('webgl');
      if (!gl) return (softMemo = true);
      const ext = gl.getExtension('WEBGL_debug_renderer_info'), r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return (softMemo = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r));
    } catch (e) { return (softMemo = false); }
  }
  function rr(g, x, y, w, hh, r) { r = Math.max(0, Math.min(r, w / 2, hh / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  const ICON = {
    people: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="15" cy="13" r="6" fill="currentColor"/><circle cx="28" cy="15" r="5" fill="currentColor" opacity=".7"/><path d="M3 34c1-8 6-11 12-11s11 3 12 11z" fill="currentColor"/><path d="M23 34c.6-5 3-8 6-8s7 3 8 8z" fill="currentColor" opacity=".7"/></svg>',
    pro: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="12" r="7" fill="currentColor"/><path d="M6 36c1-9 7-13 14-13s13 4 14 13z" fill="currentColor"/><rect x="16" y="26" width="8" height="7" rx="1.5" fill="#1b1233"/><path d="M20 27.5v4M18 29.5h4" stroke="currentColor" stroke-width="1.6"/></svg>',
    step: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 31h9v-7h9v-7h9" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M27 9l7 8-7 8" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    ask: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 8h24a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H18l-7 6v-6H8a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3z" fill="currentColor"/><path d="M16.5 15a3.6 3.6 0 1 1 4.8 3.4c-1 .4-1.5 1.2-1.5 2.3" fill="none" stroke="#1b1233" stroke-width="2.6" stroke-linecap="round"/><circle cx="19.8" cy="24.4" r="1.7" fill="#1b1233"/></svg>',
    stairs: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M4 35v-7h8v-7h8v-7h8V7h8v28z" fill="currentColor"/></svg>',
    breath: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 14c6-6 10 6 16 0s10 6 14 0M5 22c6-6 10 6 16 0s10 6 14 0M5 30c6-6 10 6 16 0s10 6 14 0" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>'
  };
  (env.games = env.games || []).push({
    id: 'worst-case-plinko', mode: 'reframe', name: 'Worst-Case Plinko', verb: 'drop', family: 'REFRAME', minutes: 2,
    parents: ['Uncertainty / Future Worry / Reassurance', 'Decision Pressure', 'Panic / Body Alarm'],
    cast: ['rush', 'glitch'], poster: { char: 'rush', mood: 'surprised' },
    fonts: ['Bungee', 'Share+Tech+Mono'],
    tagline: 'Your worst case needs a chain of bad luck. Drop 100 balls and see.',
    why: 'For a worst case that feels certain: multiply the honest odds, then plan how you’d cope.',
    css: `
.g-worst-case-plinko { --wp-pink: #ff3d6e; --wp-mint: #3dffb0; --wp-gold: #ffd25a;
  --wp-disp: "Bungee", "Arial Black", "Inter Display", "Baloo 2", system-ui, sans-serif;
  --wp-mono: "Share Tech Mono", "DejaVu Sans Mono", Menlo, Consolas, ui-monospace, monospace; }
.g-worst-case-plinko .wp-hud { position: absolute; z-index: 26; left: 10px; right: 10px; top: calc(env(safe-area-inset-top, 0px) + 60px); display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; pointer-events: none; }
.g-worst-case-plinko .wp-sign { --c: var(--wp-pink); display: flex; align-items: baseline; gap: 8px; padding: 6px 12px 6px; border-radius: 12px; background: rgba(9, 5, 22, .9); color: #fff; border: 2px solid var(--c);
  box-shadow: 0 0 16px color-mix(in srgb, var(--c) 50%, transparent), inset 0 0 12px color-mix(in srgb, var(--c) 26%, transparent), 0 6px 16px rgba(0, 0, 0, .3); transition: transform .35s cubic-bezier(.2, 1.6, .4, 1); }
.g-worst-case-plinko .wp-sign small { font: 400 12px/1 var(--wp-disp); letter-spacing: .07em; text-transform: uppercase; color: color-mix(in srgb, var(--c) 70%, #fff); }
.g-worst-case-plinko .wp-sign b { font: 400 22px/1 var(--wp-disp); letter-spacing: .02em; text-shadow: 0 0 10px var(--c); font-variant-numeric: tabular-nums; }
.g-worst-case-plinko .wp-sign.live b { opacity: .62; }
.g-worst-case-plinko .wp-chain { --c: var(--wp-gold); }
.g-worst-case-plinko .wp-sign.bump { transform: scale(1.12); }
.g-worst-case-plinko .wp-plate { position: absolute; z-index: 14; display: flex; align-items: center; gap: 6px; padding: 3px 9px 3px 3px; border-radius: 999px; background: rgba(9, 5, 22, .8); border: 1px solid rgba(255, 255, 255, .22); color: #fff;
  font: 400 12px/1 var(--wp-disp); letter-spacing: .03em; white-space: nowrap; pointer-events: none; transform: translateY(-50%); transition: opacity .35s ease, box-shadow .35s ease; }
.g-worst-case-plinko .wp-plate i { font-style: normal; display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; background: #fff; color: #140a22; font: 400 12px/1 var(--wp-disp); }
.g-worst-case-plinko .wp-plate.on { box-shadow: 0 0 0 2px var(--wp-gold), 0 0 16px rgba(255, 210, 90, .6); }
.g-worst-case-plinko .wp-plate.on i { background: var(--wp-gold); }
.g-worst-case-plinko .wp-plate.set i { background: var(--wp-pink); color: #fff; }
.g-worst-case-plinko .wp-plate.dim { opacity: .4; }
.g-worst-case-plinko .wp-plate.mini { padding-right: 3px; background: rgba(9, 5, 22, .62); }
.g-worst-case-plinko .wp-plate.mini span { display: none; }
.g-worst-case-plinko .wp-val { position: absolute; z-index: 14; transform: translate(-100%, -50%); padding: 4px 9px; border-radius: 999px; background: rgba(9, 5, 22, .8); border: 1px solid rgba(255, 61, 110, .75); color: #fff; font: 400 13px/1 var(--wp-disp); white-space: nowrap; pointer-events: none; font-variant-numeric: tabular-nums; transition: opacity .3s ease; }
.g-worst-case-plinko .wp-val em { font-style: normal; color: var(--wp-mint); margin-left: 6px; font-size: 12px; }
.g-worst-case-plinko .wp-val.dim { opacity: .4; }
.g-worst-case-plinko .wp-val.off { opacity: 0; }
.g-worst-case-plinko .wp-band { position: absolute; z-index: 22; touch-action: none; cursor: ew-resize; border-radius: 16px; }
.g-worst-case-plinko .wp-band:focus-visible { outline: 3px solid var(--wp-gold); outline-offset: 2px; }
.g-worst-case-plinko .wp-knob { position: absolute; top: 50%; left: 0; width: 50px; height: 50px; margin: -25px 0 0 -25px; border-radius: 50%; display: grid; place-items: center; pointer-events: none;
  background: radial-gradient(circle at 40% 34%, #ffffff, #ffe08a 42%, #f0a020 80%, #b86a00); color: #2a1300; font: 400 14px/1 var(--wp-disp);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, .9), 0 0 22px rgba(255, 210, 90, .85), 0 6px 14px rgba(0, 0, 0, .5); transition: transform .12s ease; }
.g-worst-case-plinko .wp-band.drag .wp-knob { transform: scale(1.14); }
.g-worst-case-plinko .wp-ghost { position: absolute; top: 50%; left: 0; width: 42px; height: 42px; margin: -21px 0 0 -21px; border-radius: 50%; border: 2px dashed rgba(255, 120, 150, .95); pointer-events: none; }
.g-worst-case-plinko .wp-ghost span { position: absolute; left: 50%; top: calc(100% + 7px); transform: translateX(-50%); padding: 2px 6px; border-radius: 6px; background: rgba(9, 5, 22, .85); font: 400 12px/1 var(--wp-disp); color: #ff9db5; white-space: nowrap; }
.g-worst-case-plinko .wp-facts { position: absolute; top: 50%; left: 0; width: 0; height: 0; pointer-events: none; }
.g-worst-case-plinko .wp-facts::before { content: ""; position: absolute; left: -7px; top: 12px; border: 7px solid transparent; border-bottom-color: var(--wp-mint); border-top-width: 0; }
.g-worst-case-plinko .wp-facts.low span { top: 44px; }
.g-worst-case-plinko .wp-facts span { position: absolute; left: 0; top: 21px; transform: translateX(-50%); padding: 2px 6px; border-radius: 6px; background: rgba(9, 5, 22, .85); font: 400 12px/1 var(--wp-disp); color: var(--wp-mint); white-space: nowrap; }
.g-worst-case-plinko .wp-card { position: absolute; z-index: 23; display: grid; grid-template-columns: 1fr auto; align-items: baseline; column-gap: 8px; row-gap: 3px; padding: 8px 12px 9px; border-radius: 14px; background: rgba(12, 7, 28, .95); border: 1px solid rgba(255, 210, 90, .6); color: #fff;
  box-shadow: 0 10px 28px rgba(0, 0, 0, .5), 0 0 22px rgba(255, 210, 90, .16); pointer-events: none; animation: worst-case-plinko-in .4s cubic-bezier(.2, 1.3, .4, 1) both; }
.g-worst-case-plinko .wp-card small { grid-column: 2; grid-row: 1; font: 400 12px/1.15 var(--wp-disp); letter-spacing: .04em; color: var(--wp-gold); text-transform: uppercase; white-space: nowrap; }
.g-worst-case-plinko .wp-card b { grid-column: 1; grid-row: 1; font: 400 18px/1.05 var(--wp-disp); letter-spacing: .01em; min-width: 0; }
.g-worst-case-plinko .wp-card span { grid-column: 1 / -1; font: 500 14px/1.28 var(--font-ui); color: #e6fff3; }
.g-worst-case-plinko .wp-card span em { font-style: normal; color: var(--wp-mint); font-weight: 700; }
@keyframes worst-case-plinko-in { from { opacity: 0; transform: translateY(8px) scale(.97); } to { opacity: 1; transform: none; } }
.g-worst-case-plinko .wp-hold { position: absolute; z-index: 24; width: 64px; height: 64px; margin: -32px 0 0 -32px; border-radius: 50%; border: 0; padding: 0; cursor: pointer; touch-action: none; display: grid; place-items: center;
  background: radial-gradient(circle at 42% 34%, #ffffff 0%, #ff9db5 24%, #ff3d6e 58%, #9c0029 100%); box-shadow: 0 0 0 4px #2a1030, 0 0 0 6px rgba(255, 255, 255, .55), 0 0 24px rgba(255, 61, 110, .75), 0 8px 18px rgba(0, 0, 0, .5); transition: transform .1s ease, filter .3s ease; }
.g-worst-case-plinko .wp-hold b { position: relative; font: 400 14px/1 var(--wp-disp); color: #fff; letter-spacing: .03em; text-shadow: 0 1px 2px rgba(110, 0, 30, .9); }
.g-worst-case-plinko .wp-hold svg { position: absolute; left: -9px; top: -9px; width: 82px; height: 82px; transform: rotate(-90deg); pointer-events: none; overflow: visible; }
.g-worst-case-plinko .wp-hold circle { fill: none; stroke: var(--wp-gold); stroke-width: 5; stroke-linecap: round; stroke-dasharray: 100; stroke-dashoffset: calc(100 - var(--fill, 0) * 100); filter: drop-shadow(0 0 4px rgba(255, 210, 90, .9)); }
.g-worst-case-plinko .wp-hold.load { filter: saturate(.35) brightness(.75); cursor: progress; }
.g-worst-case-plinko .wp-hold.down { transform: scale(.9); }
.g-worst-case-plinko .wp-hold.ready::after { content: ""; position: absolute; inset: -4px; border-radius: 50%; border: 3px solid var(--wp-pink); animation: worst-case-plinko-ring 1.3s ease-out infinite; pointer-events: none; }
.g-worst-case-plinko .wp-hold.down::after, .g-worst-case-plinko .wp-hold.done::after { display: none; }
.g-worst-case-plinko .wp-hold:focus-visible { outline: 3px solid var(--wp-gold); outline-offset: 10px; }
@keyframes worst-case-plinko-ring { from { opacity: .9; transform: scale(1); } to { opacity: 0; transform: scale(1.5); } }
.g-worst-case-plinko .wp-bin { position: absolute; z-index: 13; display: flex; flex-direction: column; align-items: center; gap: 2px; padding-top: 5px; pointer-events: none; text-align: center; --c: var(--wp-mint); }
.g-worst-case-plinko .wp-bin b { font: 400 18px/1 var(--wp-disp); color: #fff; text-shadow: 0 0 8px var(--c), 0 1px 2px #000; font-variant-numeric: tabular-nums; transition: transform .2s ease; }
.g-worst-case-plinko .wp-bin span { font: 400 12px/1.05 var(--wp-disp); color: var(--c); letter-spacing: .01em; text-shadow: 0 1px 3px #000; max-width: calc(100% - 4px); padding: 2px 4px; border-radius: 6px; background: rgba(9, 5, 22, .72); overflow-wrap: anywhere; }
.g-worst-case-plinko .wp-bin.worst { --c: #ff8fab; }
.g-worst-case-plinko .wp-bin.handled { --c: var(--wp-gold); }
.g-worst-case-plinko .wp-bin.top b::after { content: " ★"; color: var(--wp-gold); }
.g-worst-case-plinko .wp-bin.tick b { transform: scale(1.25); }
.g-worst-case-plinko .wp-placard { position: absolute; z-index: 20; left: 50%; transform: translateX(-50%); width: max-content; max-width: min(380px, calc(100% - 24px)); display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 7px 14px 8px; border-radius: 12px;
  background: rgba(9, 5, 22, .92); border: 2px solid var(--wp-pink); box-shadow: 0 0 18px rgba(255, 61, 110, .45), 0 6px 16px rgba(0, 0, 0, .3); color: #fff; text-align: center; transition: border-color .6s ease, box-shadow .6s ease; }
.g-worst-case-plinko .wp-placard small { font: 400 12px/1 var(--wp-disp); letter-spacing: .07em; color: #ff8fab; text-transform: uppercase; transition: color .6s ease; }
.g-worst-case-plinko .wp-placard .gk-user, .g-worst-case-plinko .wp-placard .wp-gen { font: 600 15px/1.25 var(--font-ui); display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; text-wrap: balance; }
.g-worst-case-plinko .wp-placard.handled { border-color: var(--wp-gold); box-shadow: 0 0 22px rgba(255, 210, 90, .55), 0 6px 16px rgba(0, 0, 0, .3); }
.g-worst-case-plinko .wp-placard.handled small { color: var(--wp-gold); }
.g-worst-case-plinko .wp-placard.drop { box-shadow: 0 0 0 3px #fff, 0 0 30px rgba(255, 210, 90, .8); }
.g-worst-case-plinko .wp-tray { position: absolute; z-index: 27; display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 16px; background: rgba(12, 7, 28, .96); border: 1px solid rgba(255, 210, 90, .55); box-shadow: 0 16px 40px rgba(0, 0, 0, .55), 0 0 24px rgba(255, 210, 90, .15); color: #fff; animation: worst-case-plinko-in .45s cubic-bezier(.2, 1.3, .4, 1) both; }
.g-worst-case-plinko .wp-tray > b { font: 400 16px/1.15 var(--wp-disp); color: var(--wp-gold); text-align: center; }
.g-worst-case-plinko .wp-tray > small { font: 500 13px/1.25 var(--font-ui); color: #eadfff; text-align: center; margin-top: -4px; }
.g-worst-case-plinko .wp-tray.out { opacity: 0; transform: translateY(-10px); transition: opacity .35s ease, transform .35s ease; }
.g-worst-case-plinko .wp-toks { display: grid; grid-template-columns: repeat(var(--cols, 2), minmax(0, 1fr)); gap: 8px; }
.g-worst-case-plinko .wp-tok { --c: #8fe0ff; position: relative; display: flex; align-items: center; gap: 8px; min-height: 52px; padding: 7px 9px 7px 7px; border-radius: 14px; background: linear-gradient(180deg, #2c1f50, #1b1233); border: 1px solid color-mix(in srgb, var(--c) 45%, transparent); color: #fff;
  touch-action: none; cursor: grab; text-align: left; box-shadow: 0 3px 0 #0b0618, 0 8px 16px rgba(0, 0, 0, .35); transition: opacity .25s ease, transform .25s ease; animation: worst-case-plinko-in .45s cubic-bezier(.2, 1.3, .4, 1) backwards; }
.g-worst-case-plinko .wp-tok[data-cat="Steps"] { --c: #ffd25a; }
.g-worst-case-plinko .wp-tok[data-cat="Skills"] { --c: #3dffb0; }
.g-worst-case-plinko .wp-tok i { flex: none; display: block; width: 34px; height: 34px; color: var(--c); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--c) 60%, transparent)); }
.g-worst-case-plinko .wp-tok i svg { width: 100%; height: 100%; display: block; }
.g-worst-case-plinko .wp-tok span { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.g-worst-case-plinko .wp-tok small { font: 400 12px/1 var(--wp-disp); letter-spacing: .05em; color: var(--c); text-transform: uppercase; }
.g-worst-case-plinko .wp-tok b { font: 600 14px/1.15 var(--font-ui); }
.g-worst-case-plinko .wp-tok:focus-visible { outline: 3px solid var(--wp-gold); outline-offset: 2px; }
.g-worst-case-plinko .wp-tok.lift { opacity: .3; }
.g-worst-case-plinko .wp-tok.used { opacity: 0; transform: scale(.85); pointer-events: none; }
.g-worst-case-plinko .wp-ghostok { position: absolute; z-index: 60; pointer-events: none; transform: rotate(-4deg) scale(1.06); box-shadow: 0 18px 30px rgba(0, 0, 0, .55), 0 0 18px rgba(255, 210, 90, .5); animation: none; }
.g-worst-case-plinko .wp-eq { position: absolute; z-index: 28; left: 0; right: 0; margin: 0 auto; width: min(370px, calc(100% - 28px)); display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 14px 16px 16px; border-radius: 18px;
  background: rgba(10, 6, 24, .95); border: 2px solid var(--wp-gold); box-shadow: 0 0 30px rgba(255, 210, 90, .35), 0 18px 40px rgba(0, 0, 0, .55); color: #fff; text-align: center; animation: worst-case-plinko-in .5s cubic-bezier(.2, 1.3, .4, 1) both; transition: opacity .5s ease, transform .5s ease; }
.g-worst-case-plinko .wp-eq.out { opacity: 0; transform: translateY(-14px) scale(.96); }
.g-worst-case-plinko .wp-eqrow { display: flex; align-items: baseline; justify-content: center; gap: 10px; width: 100%; }
.g-worst-case-plinko .wp-eqrow small { font: 400 12px/1 var(--wp-disp); letter-spacing: .07em; text-transform: uppercase; color: #ffb3c5; }
.g-worst-case-plinko .wp-eqrow b { font: 400 30px/1 var(--wp-disp); font-variant-numeric: tabular-nums; }
.g-worst-case-plinko .wp-eqrow.feel b { color: #ff8fab; text-decoration: line-through; text-decoration-thickness: 3px; text-decoration-color: rgba(255, 255, 255, .7); }
.g-worst-case-plinko .wp-eqrow.chain small { color: var(--wp-gold); }
.g-worst-case-plinko .wp-eqrow.chain b { color: var(--wp-gold); text-shadow: 0 0 14px rgba(255, 210, 90, .8); font-size: 40px; }
.g-worst-case-plinko .wp-terms { font: 400 16px/1.3 var(--wp-mono); color: #f3eaff; letter-spacing: .02em; }
.g-worst-case-plinko .wp-terms span { opacity: .18; transition: opacity .25s ease, color .25s ease; }
.g-worst-case-plinko .wp-terms span.on { opacity: 1; }
.g-worst-case-plinko .wp-eqn { font: 600 15px/1.3 var(--font-ui); color: #e6fff3; }
.g-worst-case-plinko .wp-eqn em { font-style: normal; color: var(--wp-mint); font-weight: 700; }
.g-worst-case-plinko .wp-ticket { position: absolute; z-index: 56; width: 224px; padding: 12px 13px 18px; border-radius: 4px 4px 0 0; background: linear-gradient(180deg, #fffdf4, #fff6dc); color: #2a1a0a; box-shadow: 0 14px 30px rgba(0, 0, 0, .45);
  font: 400 15px/1.32 var(--wp-mono); transform-origin: 50% 0; animation: worst-case-plinko-feed .6s ease-out both; }
.g-worst-case-plinko .wp-ticket::after { content: ""; position: absolute; left: 0; right: 0; bottom: -8px; height: 8px; background: linear-gradient(-45deg, transparent 6px, #fff6dc 0) 0 0 / 12px 8px repeat-x, linear-gradient(45deg, transparent 6px, #fff6dc 0) 0 0 / 12px 8px repeat-x; }
.g-worst-case-plinko .wp-ticket div { opacity: 0; transform: translateY(-3px); transition: opacity .18s ease, transform .18s ease; white-space: pre-wrap; overflow-wrap: anywhere; }
.g-worst-case-plinko .wp-ticket div.on { opacity: 1; transform: none; }
.g-worst-case-plinko .wp-ticket .hd { text-align: center; font-weight: 700; letter-spacing: .04em; border-bottom: 2px dashed rgba(42, 26, 10, .35); padding-bottom: 5px; margin-bottom: 4px; }
.g-worst-case-plinko .wp-ticket .big { font-size: 16px; font-weight: 700; color: #a3133a; }
.g-worst-case-plinko .wp-ticket .ok { color: #0c6b45; }
@keyframes worst-case-plinko-feed { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0 0 -12px 0); } }
.g-worst-case-plinko .gk-char .gk-bubble { max-width: var(--wp-bub, 240px); }
.g-worst-case-plinko .wp-low .gk-bubble { top: auto; bottom: 2px; }
.g-worst-case-plinko .wp-low.gk-side-right .gk-bubble::before, .g-worst-case-plinko .wp-low.gk-side-left .gk-bubble::before { top: auto; bottom: 22px; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const clamp = K.clamp, hexA = K.hexA, now = () => performance.now();
      const L = (o, sub) => { let s = ctx.line(o) || ''; if (sub) Object.keys(sub).forEach(k => { s = s.split('{' + k + '}').join(String(sub[k])); }); return s; };
      const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); return (sp > n * 0.6 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; };
      const inten = ctx.intensity;
      const care = an.safety === 'care';
      const support = an.fear_support === 'strong' ? 'strong' : an.fear_support === 'some' ? 'some' : 'weak';
      const serious = support === 'strong';
      const noWords = !String(ctx.text || '').trim();
      const visits = K.visits();
      const bright = () => S.scene() === 'bright';
      const SOFT = softwareGfx();
      const NB = 100, NG = inten === 0 ? 3 : 4, RATE = [9, 12, 14][inten] || 12;
      const fmtPct = (x) => x >= 9.95 ? Math.round(x) + '%' : x >= 0.095 ? String(Math.round(x * 10) / 10).replace(/\.0$/, '') + '%' : x > 0 ? '<0.1%' : '0%';

      /* ---------------- content: the chain, the worst case, the coping tokens ---------------- */
      const LINK_DEFS = [
        { name: 'IT GOES WRONG', sub: 'the thing you fear actually happens', off: 'Something else entirely', short: 'OTHER STORY' },
        { name: 'IT’S SERIOUS', sub: 'not just awkward or small', off: 'Awkward but fine', short: 'SMALL STUFF' },
        { name: 'IT CAN’T BE FIXED', sub: 'no way to put it right, even partly', off: 'Partly wrong, fixable', short: 'FIXABLE' },
        { name: 'NOBODY HELPS', sub: 'you would face it completely alone', off: 'Hard, but with help', short: 'WITH HELP' }
      ];
      const links = NG === 3 ? [LINK_DEFS[0], LINK_DEFS[2], LINK_DEFS[3]] : LINK_DEFS.slice();
      const SIDES = NG === 3 ? [-1, -1, 1] : [-1, -1, 1, 1];
      const worstText = noWords ? 'The thing you’re dreading' : K.sentence(clip(an.conclusion || an.thought || 'It all goes wrong', 72));
      const altNames = (Array.isArray(an.alternatives) ? an.alternatives : []).filter(a => a && !a.fear && a.name).map(a => String(a.name).toLowerCase().replace(/-/g, '\u2011')).slice(0, 2);
      const facts = noWords || !an.probability ? null : clamp(Math.round((Number(an.probability.fear) || 0) / 5) * 5, 5, 95);
      let feel = ctx.before != null && isFinite(Number(ctx.before)) ? clamp(Math.round(Number(ctx.before)), 0, 100) : null;
      const gutFor = (F) => clamp(Math.round(Math.pow(clamp(F, 5, 100) / 100, 1 / NG) * 20) * 5, 5, 95);
      const leads = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text);
      const lead = (k, fb) => clip((leads.find(l => l.kind === k) || {}).text || fb, 120);
      const TOKENS = [
        { id: 'call', cat: 'People', ic: 'people', t: 'Someone I’d call', d: 'I wouldn’t carry it alone.' },
        care ? { id: 'pro', cat: 'People', ic: 'pro', t: 'Someone qualified', d: 'Proper advice from someone who knows this area.' }
          : { id: 'been', cat: 'People', ic: 'people', t: 'People who’ve been there', d: 'Others have come through this.' },
        { id: 'first', cat: 'Steps', ic: 'step', t: 'My first step', d: lead('prepare', 'Write down the first small thing I’d do.') },
        { id: 'facts', cat: 'Steps', ic: 'ask', t: 'Get the real facts', d: lead('ask', 'Ask one simple question to fill the biggest gap.') },
        { id: 'one', cat: 'Skills', ic: 'stairs', t: 'One step at a time', d: 'I can take it one step at a time.' },
        { id: 'steady', cat: 'Skills', ic: 'breath', t: 'I can steady myself', d: lead('steady', 'A slow breath and a short walk, then decide.') }
      ];
      const THEMES = [
        { key: 'Midnight Neon', a: '#ff4fa8', b: '#38e1ff', c: '#ffd34f', g0: '#170c38', g1: '#070414', r0: '#0c0722', r1: '#020108', br0: '#f6efff', br1: '#e3d6f7' },
        { key: 'Sunset Strip', a: '#ff7a3d', b: '#ffcf4a', c: '#ff4fa3', g0: '#2d0c27', g1: '#0e030d', r0: '#1d0718', r1: '#060105', br0: '#fff2e8', br1: '#f6dccb' },
        { key: 'Ultraviolet', a: '#b45cff', b: '#a6ff5c', c: '#ffe45c', g0: '#1b0b30', g1: '#07030f', r0: '#110720', r1: '#030107', br0: '#f5efff', br1: '#e1d4f5' },
        { key: 'Ice Rink', a: '#5ce1ff', b: '#d9f7ff', c: '#ff7ad1', g0: '#0a1d36', g1: '#020a14', r0: '#061424', r1: '#01050a', br0: '#eef9ff', br1: '#d3eaf6' },
        { key: 'Jackpot Gold', a: '#ffc23d', b: '#ff6d82', c: '#3dffd8', g0: '#24150a', g1: '#0a0603', r0: '#170d05', r1: '#050301', br0: '#fff6e6', br1: '#f1e0c0' }
      ];
      const theme = K.dailyPick(THEMES, 5);
      const SKINS = [
        { key: 'Chrome', name: 'chrome balls', c0: '#ffffff', c1: '#cdd6ea', c2: '#56627e', glow: '#cfe0ff' },
        { key: 'Copper', name: 'copper balls', c0: '#fff1e0', c1: '#f2a56a', c2: '#86391a', glow: '#ffb27a' },
        { key: 'Glass', name: 'glass marbles', c0: '#ffffff', c1: '#90e6ff', c2: '#1d6aa8', glow: '#8fe6ff', glass: true },
        { key: 'Comet', name: 'neon comets', c0: '#ffffff', c1: '#ffe27a', c2: '#ff7a1c', glow: '#ffd25a', trail: true }
      ];
      const skinIdx = clamp(Math.round(Number(S.store.get('worst-case-plinko:skin', 0)) || 0), 0, SKINS.length - 1);
      const skin = SKINS[skinIdx];

      /* ---------------- lines (every one in three vibes) ---------------- */
      const LINES = {
        open: serious || care
          ? { Jolly: 'This one has real weight. Let’s look at it properly, link by link.', Cheeky: 'Real stakes. So no drama: we check it link by link.', Unfiltered: 'This one’s real. Check it properly.' }
          : visits
            ? { Jolly: 'New day, new worst case. And it still feels totally certain!', Cheeky: 'Back for more doom? My worst case got a new outfit.', Unfiltered: 'Worst case again. Feels certain again.' }
            : { Jolly: 'WORST CASE! It’s basically guaranteed. Right? RIGHT?', Cheeky: 'Worst case incoming. I’ve already panicked for both of us.', Unfiltered: 'Worst case. It’s happening. Obviously.' },
        chain: { Jolly: 'Hang on. Feeling {feel} means every link must be about {gut} sure. Are they?', Cheeky: 'Plot hole: {feel} means each link is {gut} certain. Let’s audit that.', Unfiltered: '{feel} overall means every link at {gut}. Check each one.' },
        chainNoFeel: { Jolly: 'Hang on. A worst case needs a chain of things to go wrong. Gut check first.', Cheeky: 'Plot hole: a LOT has to go wrong in a row. But first, your gut.', Unfiltered: 'It’s a chain. Gut check first.' },
        gutDone: { Jolly: 'Feels {feel}. Then every link must be about {gut} sure. Let’s check them.', Cheeky: '{feel}? Then each link must be {gut} certain. Bold. Let’s audit.', Unfiltered: '{feel} means every link at {gut}. Check them.' },
        lockBig: { Jolly: 'Wait. That link’s way less likely than it felt!', Cheeky: 'Huh. My panic did NOT do the maths.', Unfiltered: 'Much lower than it felt.' },
        lockMid: { Jolly: 'Okay, a bit less than my gut said.', Cheeky: 'Shaved some doom off. Nice.', Unfiltered: 'Less than it felt.' },
        lockSame: { Jolly: 'Still feels likely. That’s allowed.', Cheeky: 'Holding it high. Fair, it’s your call.', Unfiltered: 'Kept it high. Fine.' },
        multiply: { Jolly: 'See the chain sign? Every link multiplies, so it shrinks fast.', Cheeky: 'Watch the chain sign. Multiplying is brutal to drama.', Unfiltered: 'Links multiply. Watch it shrink.' },
        load: { Jolly: '100 balls, 100 tomorrows. Hold the red button and watch them split.', Cheeky: 'A hundred tomorrows, one big red button. Hold it.', Unfiltered: 'Hold the button. 100 balls.' },
        firstOff: { Jolly: 'Hey! That one escaped to a better ending!', Cheeky: 'Rude. My disaster is leaking balls.', Unfiltered: 'One escaped.' },
        firstWorst: serious || care ? { Jolly: 'One reached the worst case. Let’s keep watching.', Cheeky: 'One got all the way down. Noted.', Unfiltered: 'One reached it.' }
          : { Jolly: 'AAAH! One made it all the way down!', Cheeky: 'One made it. I KNEW it. Well. One.', Unfiltered: 'One reached the worst case.' },
        thin: { Jolly: 'Look how the rain thins out at every gate.', Cheeky: 'Every gate eats a chunk of the drama.', Unfiltered: 'Each gate thins it out.' },
        sumNone: { Jolly: 'Not one of the 100 reached the worst case.', Cheeky: 'Zero. Out of a hundred. Zero.', Unfiltered: '0 of 100.' },
        sum: { Jolly: '{w} out of 100 reached the worst case. It felt like {feel}.', Cheeky: '{w} of 100. Your gut said {feel}. Awkward for your gut.', Unfiltered: '{w} of 100. Not {feel}.' },
        sumNoFeel: { Jolly: '{w} out of 100 reached the worst case.', Cheeky: '{w} of 100. Fewer than the drama suggested.', Unfiltered: '{w} of 100.' },
        sumSerious: { Jolly: '{w} out of 100. That’s a real chance, so let’s plan for it.', Cheeky: '{w} of 100. Real. Time for a plan, not a pep talk.', Unfiltered: '{w} of 100. Real. Plan it.' },
        whatIf: serious || care ? { Jolly: 'But what if it DID happen?', Cheeky: 'And if it does happen?', Unfiltered: 'And if it happens?' }
          : { Jolly: 'Okay, clever chain. But what if it DID happen?', Cheeky: 'Fine, maths. But what if it DID happen, hm?', Unfiltered: 'And if it did happen?' },
        cope: serious ? { Jolly: 'Then the plan is the hero. Drag three things you’d have into that slot.', Cheeky: 'Then we bring backup. Three supports into the slot.', Unfiltered: 'Plan for it. Three supports in.' }
          : { Jolly: 'Then you’d handle it. Drag three things you’d have into the slot.', Cheeky: 'Then we pad the landing. Three supports into the slot.', Unfiltered: 'Then you cope. Drag three in.' },
        in1: { Jolly: 'Oh. That actually helps.', Cheeky: 'Okay, that’s a decent cushion.', Unfiltered: 'That helps.' },
        in2: { Jolly: 'Two! The slot’s getting softer.', Cheeky: 'Two. The doom is getting comfy.', Unfiltered: 'Two.' },
        handled: serious || care ? { Jolly: 'Hard. But I’d have a plan and people. I could handle it.', Cheeky: 'Still hard. Not helpless though.', Unfiltered: 'Hard. Handled.' }
          : { Jolly: 'Hard… but I’d handle it. Huh.', Cheeky: 'Still not fun. But handled. Weirdly calm now.', Unfiltered: 'Hard. Handled.' },
        reveal: { Jolly: 'Feels like {feel}. The chain says {chain}.', Cheeky: 'Gut: {feel}. Maths: {chain}. The maths has receipts.', Unfiltered: 'Feels {feel}. Chain: {chain}.' },
        revealNoFeel: { Jolly: 'The chain says {chain}. Every link had to happen.', Cheeky: '{chain}. Chains are fragile things.', Unfiltered: 'Chain: {chain}.' },
        revealUp: { Jolly: 'Gut said {feel}, the chain says {chain}. Either way, you’ve got a plan.', Cheeky: 'Gut {feel}, chain {chain}. Plan ready regardless.', Unfiltered: 'Gut {feel}. Chain {chain}. Plan ready.' },
        revealSerious: { Jolly: 'The chain says {chain}. A real risk, and now a real plan.', Cheeky: '{chain}: real. Good thing you’re not empty-handed.', Unfiltered: '{chain}. Real. Plan ready.' },
        fin: care ? { Jolly: 'Most balls landed somewhere workable. Next: ask someone qualified.', Cheeky: 'Most landed fine. Next: proper advice on the facts.', Unfiltered: 'Mostly fine. Get proper advice next.' }
          : serious ? { Jolly: 'Real risk, real plan. That’s the jackpot.', Cheeky: 'Jackpot: a plan. Less shiny, more useful.', Unfiltered: 'Risk counted. Plan ready.' }
            : { Jolly: 'JACKPOT! Most tomorrows land somewhere fine.', Cheeky: 'Jackpot on the boring endings. I love boring.', Unfiltered: 'Most balls landed fine.' }
      };

      /* ---------------- state ---------------- */
      const st = { phase: 'intro', gate: -1, gateReady: false, holding: false, released: 0, acc: 0, relAcc: 0, finished: false, worst: 0, landed: 0, cope: 0, installed: [], handled: false,
        tray: null, drag: null, dropHot: false, chainP: 1, firstOff: false, firstWorst: false, thinSaid: false, boot: 0, spot: 0, finT: 0, slow: 0, fn: 0, q: 1, chime: 0 };
      const M = { w: 0, h: 0, phone: true, side: false, bx: 0, by: 0, bw: 0, bh: 0 };
      const G = { n: NG, levels: [] };
      const P = K.particles({ max: 420 });

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFT ? 1.25 : 2 });
      const hud = h('div', { class: 'wp-hud' });
      const feelSign = h('div', { class: 'wp-sign wp-feel', role: 'status' }, h('small', { text: 'Feels like' }), h('b', { text: feel == null ? '?' : feel + '%' }));
      const chainSign = h('div', { class: 'wp-sign wp-chain', role: 'status', 'aria-live': 'polite' }, h('small', { text: 'Chain says' }), h('b', { text: '?' }));
      hud.append(feelSign, chainSign);
      const card = h('div', { class: 'wp-card', hidden: true }, h('small'), h('b'), h('span'));
      const pattern = (k) => { const a = new Uint8Array(20); for (let i = 0; i < 20; i++) a[i] = Math.floor((i + 1) * k / 20) - Math.floor(i * k / 20); return a; };
      function makeBand(label, factsV) {
        const band = h('div', { class: 'wp-band', role: 'slider', tabindex: '0', 'aria-label': label, 'aria-valuemin': '5', 'aria-valuemax': '95', 'aria-valuenow': '50', hidden: true });
        const ghost = h('div', { class: 'wp-ghost', hidden: true }, h('span'));
        const factsEl = factsV != null ? h('div', { class: 'wp-facts' }, h('span', { text: 'Facts ~' + factsV + '%' })) : null;
        const knob = h('div', { class: 'wp-knob' }, h('b', { text: '50%' }));
        band.append(ghost); if (factsEl) band.append(factsEl); band.append(knob);
        return { band, ghost, factsEl, knob };
      }
      const gates = links.map((lk, i) => {
        const b = makeBand('Link ' + (i + 1) + ': ' + lk.name + '. How likely, honestly?', i === 0 ? facts : null);
        const plate = h('div', { class: 'wp-plate' }, h('i', { text: String(i + 1) }), h('span', { text: lk.name }));
        const val = h('div', { class: 'wp-val', text: '?' });
        return Object.assign(b, { i, lk, plate, val, v: 50, gut: 95, p: 0, set: false, moved: false, red: new Uint8Array(20), flash: new Float32Array(20), passed: 0, sweep: 0 });
      });
      const gutB = makeBand('How likely does the worst case feel?', null);
      gutB.v = 50; gutB.i = -1;
      const hold = h('button', { type: 'button', class: 'wp-hold load', hidden: true, 'aria-label': 'Hold to drop 100 balls', html: '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" pathLength="100"/></svg><b>HOLD</b>' });
      const placard = h('div', { class: 'wp-placard' }, h('small', { text: 'Worst case' }), h('span', { class: noWords ? 'wp-gen' : 'gk-user', text: worstText }));
      gates.forEach(g => el.append(g.plate, g.val));
      el.append(placard, hud);
      gates.forEach(g => el.append(g.band));
      el.append(gutB.band, card, hold);
      const bins = [];
      const rush = K.character('rush', { side: 'right', mood: serious || care ? 'worried' : 'panic', x: 10, y: 600, size: 64 });
      const glitch = K.character('glitch', { side: 'left', mood: 'scan', x: 300, y: 600, size: 64 });
      const music = K.music('arcade'); music.level(0.32);
      // phones share one speech zone between the two characters: one bubble at a time
      function say(c, line, o) { const other = c === rush ? glitch : rush; if (!M.side) other.hush(); return c.say(line, o); }

      /* ---------------- layout + physics geometry ---------------- */
      let statOK = false, layoutKey = '';
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        M.w = W; M.h = H; M.phone = W < 700; M.side = W >= 980 && H >= 640;
        if (M.side) { M.bw = Math.round(clamp(Math.min(W - 620, (H - 176) * 0.86), 440, 600)); M.by = 104; M.bh = H - M.by - 76; }
        else { M.bw = Math.min(W - 16, 620); M.by = 102; M.bh = Math.round(H - M.by - clamp(H * 0.2, 150, 196)); }
        M.bx = Math.round((W - M.bw) / 2);
        const key = W + 'x' + H;
        const geoChanged = key !== layoutKey; layoutKey = key;
        if (geoChanged) { buildGeo(); if (GEN.need && !GEN.used) regen(); else if (balls.length) rescaleLive(); }
        placeDom();
        statOK = false;
      }
      S.on('theme', () => { statOK = false; spr.balls = {}; });

      function prepSeg(s) { s.dx = s.x1 - s.x0; s.dy = s.y1 - s.y0; s.l2 = s.dx * s.dx + s.dy * s.dy; }
      const prevGeo = { PL: 0, pw: 1, top: 0, span: 1 };
      function buildGeo() {
        if (G.PL) Object.assign(prevGeo, { PL: G.PL, pw: G.pw, top: G.top, span: G.bottom - G.top });
        const F = M.phone ? 7 : 10, GW = M.phone ? 13 : 16;
        const PL = M.bx + F + GW, PR = M.bx + M.bw - F - GW, pw = PR - PL;
        const top = M.by + F, bottom = M.by + M.bh - F, sc = pw / 334;
        const r = clamp(pw * 0.0125, 4.2, 6.2), pr = r * 0.6;
        const HH = M.phone ? 40 : 50;
        const binsH = clamp(M.bh * 0.15, 80, 116), funH = clamp(M.bh * 0.06, 28, 46);
        const lt0 = top + HH + 8, lb = bottom - binsH - funH, lh = (lb - lt0) / NG;
        const combH = clamp(r * 2.4, 10, 14), cols = Math.max(9, Math.round(pw / (r * 5.6))), sx = pw / cols;
        Object.assign(G, { F, GW, PL, PR, pw, top, bottom, sc, r, pr, R: r + pr, tr: r * 0.32, HH, binsH, funH, lh, combH, sx, cols, laneW: pw / 20,
          g: 1400 * sc, vmax2: Math.pow(560 * sc, 2), slow2: Math.pow(14 * sc, 2), kick: 90 * sc, xl: PL + r, xr: PR - r, y0: top + HH + r + 3,
          inL: M.bx + F, inR: M.bx + M.bw - F, gutL: M.bx + F + GW / 2, gutR: PR + GW / 2 });
        G.levels = [];
        for (let i = 0; i < NG; i++) {
          const t = lt0 + i * lh, combTop = t + lh - combH - 8, pegTop = t + 12 + (i === 0 ? 6 : 0), pegBot = combTop - r * 3;
          const rows = Math.max(2, Math.round((pegBot - pegTop) / (r * 4.4)) + 1), sy = (pegBot - pegTop) / (rows - 1), list = [];
          for (let k = 0; k < rows; k++) { const odd = k % 2 === 1; list.push({ y: pegTop + k * sy, x0: PL + (odd ? sx : sx / 2), n: odd ? cols - 1 : cols }); }
          G.levels.push({ top: t, combTop, combH, railY: combTop + combH + 4, rows: list, red: gates[i].red });
        }
        const ww = clamp(pw * 0.24, 70, 130), wl = (PL + PR) / 2 - ww / 2, wr = wl + ww;
        const binTop = bottom - binsH, fy0 = lb + 2, fy1 = binTop - 2;
        G.f0 = { x0: PL, y0: fy0, x1: wl + 3, y1: fy1 }; G.f1 = { x0: PR, y0: fy0, x1: wr - 3, y1: fy1 }; prepSeg(G.f0); prepSeg(G.f1);
        Object.assign(G, { worstY: fy1 + r * 0.5, binTop, binBot: bottom - 3, fy0, fy1, wl, wr });
        // bins: left side holds the gates that roll left (outer first), right side the rest (inner first)
        const left = [], right = [];
        SIDES.forEach((s, i) => (s < 0 ? left : right).push(i));
        const lw = (wl - G.inL) / left.length, rw = (G.inR - wr) / right.length;
        const mk = (i, x, w, outer) => { const old = (i < 0 ? bins.worst : bins[i]) || {}; const b = Object.assign(old, { i, x, w, cx: x + w / 2, top: binTop, bot: G.binBot, outer, side: i < 0 ? 0 : SIDES[i] }); b.count = b.count || 0; b.shown = b.shown || 0; b.slots = slots(b); return b; };
        left.forEach((gi, k) => { bins[gi] = mk(gi, G.inL + k * lw, lw, k === 0); });
        right.forEach((gi, k) => { bins[gi] = mk(gi, wr + k * rw, rw, k === right.length - 1); });
        bins.worst = mk(-1, wl, ww, false);
      }
      function slots(b) {
        const d = G.r * 2 + 0.6, cols = Math.max(2, Math.floor((b.w - 6) / d)), x0 = b.x + (b.w - cols * d) / 2 + d / 2, out = [];
        const vstep = d * 0.88;
        for (let k = 0; k < NB; k++) { const row = Math.floor(k / cols), col = k % cols, off = row % 2 ? d * 0.25 : -d * 0.25; out.push({ x: clamp(x0 + col * d + off, b.x + G.r + 2, b.x + b.w - G.r - 2), y: G.binBot - G.r - 1 - row * vstep }); }
        return out;
      }
      function rescaleLive() {
        const kx = G.pw / prevGeo.pw, ky = (G.bottom - G.top) / prevGeo.span;
        balls.forEach(b => {
          if (b.state === 'fall') { b.x = G.PL + (b.x - prevGeo.PL) * kx; b.y = G.top + (b.y - prevGeo.top) * ky; }
          else if (b.state === 'rest' || b.state === 'cup' || b.state === 'kin') { const bin = b.bin; if (bin && bin.slots[b.slot]) { b.x = bin.slots[b.slot].x; b.y = bin.slots[b.slot].y; if (b.state === 'kin') arrive(b); } }
        });
      }

      function placeDom() {
        const W = M.w, H = M.h;
        gates.forEach((g, i) => {
          const Lv = G.levels[i], cy = Lv.combTop + Lv.combH / 2;
          Object.assign(g.plate.style, { left: (G.PL + 3) + 'px', top: (Lv.combTop - 14) + 'px' });
          Object.assign(g.val.style, { left: (G.PR - 3) + 'px', top: (Lv.combTop - 14) + 'px' });
          Object.assign(g.band.style, { left: (G.PL - 14) + 'px', top: (cy - 32) + 'px', width: (G.pw + 28) + 'px', height: '64px' });
          knobTo(g);
        });
        const midY = G.levels[Math.min(1, NG - 1)].combTop + G.combH / 2;
        Object.assign(gutB.band.style, { left: (G.PL - 14) + 'px', top: (midY - 32) + 'px', width: (G.pw + 28) + 'px', height: '64px' });
        knobTo(gutB);
        Object.assign(hold.style, { left: ((G.PL + G.PR) / 2) + 'px', top: (G.top + G.HH / 2 + 2) + 'px' });
        const allBins = bins.slice(0, NG).concat([bins.worst]);
        allBins.forEach(b => { if (!b.el) { b.el = h('div', { class: 'wp-bin' + (b.i < 0 ? ' worst' : '') }, h('b', { text: '0' }), h('span', { text: b.i < 0 ? 'WORST CASE' : links[b.i].short })); el.insertBefore(b.el, hud); } Object.assign(b.el.style, { left: b.x + 'px', top: (G.binTop + 1) + 'px', width: b.w + 'px' }); });
        if (M.side) { hud.style.left = M.bx + 'px'; hud.style.right = (W - M.bx - M.bw) + 'px'; } else { hud.style.left = '10px'; hud.style.right = '10px'; }
        placard.style.top = (M.by + M.bh + (M.side ? 8 : 7)) + 'px';
        placard.style.maxWidth = Math.min(M.side ? 420 : 380, W - 24) + 'px';
        if (st.tray) placeTray();
        if (card && !card.hidden) placeCard();
        // characters: beside the cabinet on wide screens, in the bottom corners on phones
        if (M.side) {
          const sz = 112, cy = Math.round(H * 0.56), rx = Math.max(14, M.bx - 360), gx = Math.min(W - sz - 14, M.bx + M.bw + 248);
          [[rush, rx, 'right', M.bx - 16 - (rx + sz + 10)], [glitch, gx, 'left', (gx - 10) - (M.bx + M.bw + 16)]].forEach(([c, x, side, bw]) => {
            c.el.style.setProperty('--sz', sz + 'px'); c.place(x, cy); c.side(side); c.el.classList.remove('wp-low'); c.el.style.setProperty('--wp-bub', Math.max(150, Math.min(260, bw)) + 'px');
          });
        } else {
          const sz = M.phone ? 64 : 80, y = H - 14 - sz, bw = W - 2 * (10 + sz) - 2 * 10 - 8;
          [[rush, 10, 'right'], [glitch, W - 10 - sz, 'left']].forEach(([c, x, side]) => {
            c.el.style.setProperty('--sz', sz + 'px'); c.place(x, y); c.side(side); c.el.classList.add('wp-low'); c.el.style.setProperty('--wp-bub', Math.max(150, Math.min(300, bw)) + 'px');
          });
        }
      }
      function knobTo(g) {
        if (!G.pw) return;
        g.knob.style.left = (14 + g.v / 100 * G.pw) + 'px';
        if (g.gut != null && g.i >= 0) g.ghost.style.left = (14 + g.gut / 100 * G.pw) + 'px';
        if (g.factsEl) g.factsEl.style.left = (14 + facts / 100 * G.pw) + 'px';
      }

      /* ---------------- physics: one fixed 240 Hz step, shared by the pre-simulation and the live board ---------------- */
      const H240 = 1 / 240;
      function rnd(b) { let s = b.s; s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; b.s = s; return s / 4294967296; }
      function circ(b, cx, cy, R, e, fx, lv, k) {
        const dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy;
        if (d2 >= R * R || d2 < 1e-9) return;
        const d = Math.sqrt(d2); let nx = dx / d, ny = dy / d;
        b.x = cx + nx * R; b.y = cy + ny * R;
        let vn = b.vx * nx + b.vy * ny;
        if (vn >= 0) return;
        const j = (rnd(b) - 0.5) * 0.32, c = Math.cos(j), s = Math.sin(j), jx = nx * c - ny * s, jy = nx * s + ny * c, vj = b.vx * jx + b.vy * jy;
        if (vj < 0) { nx = jx; ny = jy; vn = vj; }
        b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
        const tx = -ny, ty = nx, vt = b.vx * tx + b.vy * ty;
        b.vx -= vt * 0.06 * tx; b.vy -= vt * 0.06 * ty;
        if (fx && k != null && vn < -40 * G.sc) fx.hit(lv, k, cx, cy, -vn);
      }
      function segHit(b, s, R) {
        let t = ((b.x - s.x0) * s.dx + (b.y - s.y0) * s.dy) / s.l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const cx = s.x0 + s.dx * t, cy = s.y0 + s.dy * t, dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy;
        if (d2 >= R * R || d2 < 1e-9) return;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
        b.x = cx + nx * R; b.y = cy + ny * R;
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= 1.25 * vn * nx; b.vy -= 1.25 * vn * ny; }
      }
      /* returns 0 (still falling), -1 (reached the worst case) or 1 + gate * 32 + lane (caught by a gate) */
      function step(b, fx) {
        b.vy += G.g * H240;
        b.x += b.vx * H240; b.y += b.vy * H240;
        if (b.x < G.xl) { b.x = G.xl; if (b.vx < 0) b.vx = -b.vx * 0.5; } else if (b.x > G.xr) { b.x = G.xr; if (b.vx > 0) b.vx = -b.vx * 0.5; }
        const lv = b.lv;
        if (lv < NG) {
          const Lv = G.levels[lv], R = G.R, rows = Lv.rows;
          for (let ri = 0; ri < rows.length; ri++) {
            const row = rows[ri], dy = b.y - row.y;
            if (dy > R || dy < -R) continue;
            const j = Math.round((b.x - row.x0) / G.sx);
            for (let k = j - 1; k <= j + 1; k++) if (k >= 0 && k < row.n) circ(b, row.x0 + k * G.sx, row.y, R, 0.42, fx, lv, k);
          }
          const ct = Lv.combTop, cb = ct + Lv.combH;
          if (b.y + G.r > ct && b.y - G.r < cb) { const k = Math.round((b.x - G.PL) / G.laneW); if (k >= 1 && k < 20) circ(b, G.PL + k * G.laneW, b.y < ct ? ct : b.y > cb ? cb : b.y, G.r + G.tr, 0.3, null); }
          if (b.force && b.y > ct - 46 && b.y < ct) steer(b, Lv, lv);
          if (b.y > ct + Lv.combH * 0.55) {
            let lane = Math.floor((b.x - G.PL) / G.laneW); lane = lane < 0 ? 0 : lane > 19 ? 19 : lane;
            const pass = b.force ? b.want !== lv : Lv.red[lane] === 1;
            if (pass) { b.lv = lv + 1; if (fx) fx.pass(lv, lane); } else return 1 + lv * 32 + lane;
          }
        } else {
          segHit(b, G.f0, G.r + 1.5); segHit(b, G.f1, G.r + 1.5);
          if (b.y > G.worstY) return -1;
        }
        const v2 = b.vx * b.vx + b.vy * b.vy;
        if (v2 > G.vmax2) { const k = Math.sqrt(G.vmax2 / v2); b.vx *= k; b.vy *= k; }
        if (v2 < G.slow2) { if (++b.slow > 90) { b.slow = 0; b.vx += (rnd(b) - 0.5) * G.kick; b.vy -= G.kick * 0.3; } } else b.slow = 0;
        return 0;
      }
      /* rare fallback only: a ball that the sampler could not find gets nudged toward a lane of the colour it needs */
      function steer(b, Lv, lv) {
        const wantRed = b.want !== lv; let best = -1, bd = 99;
        const cur = Math.floor((b.x - G.PL) / G.laneW);
        for (let k = 0; k < 20; k++) if ((Lv.red[k] === 1) === wantRed && Math.abs(k - cur) < bd) { bd = Math.abs(k - cur); best = k; }
        if (best >= 0) { const tx = G.PL + (best + 0.5) * G.laneW; b.vx += clamp((tx - b.x) * 40, -900, 900) * H240; }
      }
      function simPath(seed, x0, vx0) {
        const b = { x: x0, y: G.y0, vx: vx0, vy: 30 * G.sc, s: seed, lv: 0, slow: 0 };
        for (let i = 0; i < 4200; i++) { const ev = step(b, null); if (ev) return ev < 0 ? 'w' : 'c' + ((ev - 1) >> 5); }
        return null;
      }

      /* ---------------- the honest run: sample real paths until each outcome has exactly its share ---------------- */
      const GEN = { need: null, pool: null, tries: 0, done: false, t0: 0, ready: [], counts: null, used: false, loaded: 0 };
      function chainCounts(ps) { const off = []; let arrive = NB; ps.forEach(p => { const pass = Math.round(arrive * p); off.push(arrive - pass); arrive = pass; }); return { off, worst: arrive }; }
      function genStart() {
        const c = chainCounts(gates.map(g => g.p));
        GEN.counts = c; GEN.need = { w: c.worst }; c.off.forEach((n, i) => { GEN.need['c' + i] = n; });
        GEN.pool = {}; Object.keys(GEN.need).forEach(k => { GEN.pool[k] = []; });
        GEN.tries = 0; GEN.done = false; GEN.t0 = now(); GEN.ready = []; GEN.loaded = 0;
      }
      function genTick(budget) {
        if (GEN.done || !GEN.need) return;
        const t0 = now();
        while (now() - t0 < budget) {
          const seed = ((Math.random() * 4294967295) >>> 0) || 7, x0 = G.PL + G.r + 1 + Math.random() * (G.pw - 2 * G.r - 2), vx0 = (Math.random() - 0.5) * 60 * G.sc;
          const f = simPath(seed, x0, vx0); GEN.tries++;
          if (f && GEN.pool[f].length < GEN.need[f]) { GEN.pool[f].push({ seed, x0, vx0, fate: f }); GEN.loaded++; }
          if (GEN.loaded >= NB) { genFinish(); return; }
          if (GEN.tries > 5000 || now() - GEN.t0 > 7000) { genForce(); return; }
        }
      }
      function genForce() {
        Object.keys(GEN.need).forEach(k => { while (GEN.pool[k].length < GEN.need[k]) { GEN.pool[k].push({ seed: ((Math.random() * 4294967295) >>> 0) || 9, x0: G.PL + G.pw * (0.1 + 0.8 * Math.random()), vx0: 0, fate: k, force: true, want: k === 'w' ? NG : Number(k.slice(1)) }); GEN.loaded++; } });
        genFinish();
      }
      function genFinish() { const all = []; Object.keys(GEN.pool).forEach(k => all.push(...GEN.pool[k])); GEN.ready = K.shuffle(all); GEN.done = true; ctx.track('plinko_gen', { tries: GEN.tries, ms: Math.round(now() - GEN.t0) }); }

      /* ---------------- live board ---------------- */
      const balls = [];
      const hits = [];
      let tickT = 0, passT = 0, catchT = 0, landT = 0, bestHit = null;
      const PENT = ['A5', 'C6', 'D6', 'E6', 'G6', 'A6', 'C7', 'D7', 'E7'].map(n => A.note(n));
      const FX = {
        hit(lv, k, x, y, sp) { if (hits.length < 90) hits.push({ x, y, a: 1 }); if (!bestHit || sp > bestHit.sp) bestHit = { lv, k, sp }; },
        pass(lv, lane) { const g = gates[lv]; g.flash[lane] = 1; g.passed++; updateVal(g); if (A.ctx && now() - passT > 45) { passT = now(); A.tone({ type: 'sine', freq: A.note(['E7', 'D7', 'C7', 'A6'][lv] || 'A6'), dur: 0.07, vol: 0.022, attack: 0.002 }); } }
      };
      function releaseOne() {
        const sp = GEN.ready.pop(); if (!sp) return false;
        GEN.used = true;
        const b = { x: sp.x0, y: G.y0, vx: sp.vx0, vy: 30 * G.sc, s: sp.seed, lv: 0, slow: 0, state: 'fall', fate: sp.fate, force: !!sp.force, want: sp.want, age: 0, tr: [] };
        balls.push(b); st.released++;
        hold.style.setProperty('--fill', (st.released / NB).toFixed(3));
        if (A.ctx && Math.random() < 0.6) A.tone({ type: 'sine', freq: 1300 + Math.random() * 500, dur: 0.03, vol: 0.016 });
        if (!K.reduced() && Math.random() < 0.35) P.emit('spark', b.x, G.y0 - 2, 2, { colors: [theme.b, '#ffffff'], speed: [20, 60] });
        return true;
      }
      function onFate(b, ev) {
        if (ev < 0) { // reached the worst case
          const bin = bins.worst, slot = bin.count++;
          b.bin = bin; b.slot = slot; b.state = 'kin'; b.cup = true;
          const s = bin.slots[slot];
          b.kin = { i: 0, t: 0, segs: [{ x0: b.x, y0: b.y, x1: s.x, y1: s.y, d: 0.32, e: 'land' }] };
          return;
        }
        const gi = (ev - 1) >> 5, lane = (ev - 1) & 31, gt = gates[gi], Lv = G.levels[gi], bin = bins[gi], side = SIDES[gi];
        gt.flash[lane] = 1; gt.caught = (gt.caught || 0) + 1; updateVal(gt);
        const slot = bin.count++, s = bin.slots[slot];
        b.bin = bin; b.slot = slot; b.state = 'kin';
        const lx = G.PL + (lane + 0.5) * G.laneW, gx = side < 0 ? G.gutL : G.gutR, y1 = Lv.railY, y2 = Lv.railY + 5, yb = G.binTop - 5;
        const roll = Math.abs(gx - lx) / (330 * G.sc) + 0.06, fall = Math.sqrt(2 * Math.max(10, yb - y2) / (G.g * 0.85));
        const segs = [
          { x0: b.x, y0: b.y, x1: lx, y1, d: 0.07, e: 'in' },
          { x0: lx, y0: y1, x1: gx, y1: y2, d: roll, e: 'in2' },
          { x0: gx, y0: y2, x1: gx, y1: yb, d: fall, e: 'in' }
        ];
        if (!bin.outer) segs.push({ x0: gx, y0: yb, x1: bin.cx, y1: yb, d: Math.abs(bin.cx - gx) / (300 * G.sc) + 0.04, e: 'lin' });
        segs.push({ x0: bin.outer ? gx : bin.cx, y0: yb, x1: s.x, y1: s.y, d: 0.22, e: 'land' });
        b.kin = { i: 0, t: 0, segs };
        if (A.ctx && now() - catchT > 40) { catchT = now(); const t = A.now(); A.wood(t, 0.08, 1.1 + gi * 0.12); A.noise({ when: t + 0.02, filter: 'bandpass', freq: 900, to: 3000, q: 2, dur: 0.16, vol: 0.03, pan: side * 0.5 }); }
        if (!K.reduced() && Math.random() < 0.5) P.emit('spark', lx, Lv.combTop + 4, 3, { colors: [MINT, '#eafff6'], speed: [30, 90] });
        if (!st.firstOff) { st.firstOff = true; say(rush, L(LINES.firstOff), { mood: 'surprised', ms: 2400 }); }
      }
      const EASE = { lin: k => k, in: k => k * k, in2: k => k * (0.5 + 0.5 * k), out: k => 1 - (1 - k) * (1 - k), land: k => { const t = 1 - k; return 1 - t * t * (1 + 2.2 * Math.sin(k * Math.PI) * 0.35 * t); } };
      function kinStep(b, dt) {
        const kk = b.kin; kk.t += dt;
        while (kk.i < kk.segs.length && kk.t >= kk.segs[kk.i].d) { kk.t -= kk.segs[kk.i].d; kk.i++; }
        if (kk.i >= kk.segs.length) { const s = kk.segs[kk.segs.length - 1]; b.x = s.x1; b.y = s.y1; arrive(b); return; }
        const s = kk.segs[kk.i], k = s.d ? Math.min(1, kk.t / s.d) : 1, e = EASE[s.e](k);
        b.x = s.x0 + (s.x1 - s.x0) * e; b.y = s.y0 + (s.y1 - s.y0) * e;
      }
      function arrive(b) {
        b.kin = null; const bin = b.bin;
        b.state = b.cup ? 'cup' : 'rest'; bin.shown++; st.landed++;
        if (bin.el) { const be = bin.el; be.firstChild.textContent = String(bin.shown); be.classList.add('tick'); K.later(() => be.classList.remove('tick'), 110); }
        if (b.cup) {
          st.worst++;
          if (A.ctx) { A.tone({ type: 'triangle', freq: 98, to: 70, glide: 0.4, dur: 0.6, vol: 0.13 }); A.noise({ filter: 'lowpass', freq: 320, dur: 0.22, vol: 0.06 }); }
          if (!K.reduced()) P.emit('spark', b.x, b.y - 4, 10, { colors: [PINK, '#ffd1dc'], speed: [40, 140] });
          if (!st.firstWorst) { st.firstWorst = true; say(rush, L(LINES.firstWorst), { mood: serious || care ? 'worried' : 'panic', ms: 2600 }); if (!serious && !care) rush.react('shake'); }
        } else if (A.ctx && now() - landT > 30) { landT = now(); A.wood(undefined, 0.045, 0.55 + Math.max(0, bin.i) * 0.11); }
      }

      /* ---------------- sprites + static layer ---------------- */
      const spr = { balls: {}, peg: null, pegKey: '', bulbOn: {}, bulbOff: null };
      const stat = document.createElement('canvas');
      function ballSprite(tint) {
        const d = cv.dpr || 1, key = (tint || skin.key) + ':' + G.r.toFixed(2) + ':' + d;
        if (spr.balls[key]) return spr.balls[key];
        const R = G.r * d, s = Math.ceil(R * 2 + 4), c = document.createElement('canvas'); c.width = c.height = s;
        const x = c.getContext('2d'), m = s / 2, col = tint === 'gold' ? { c0: '#fffbe8', c1: '#ffd25a', c2: '#9c6200' } : skin;
        const gr = x.createRadialGradient(m - R * 0.35, m - R * 0.4, R * 0.08, m, m, R);
        gr.addColorStop(0, col.c0); gr.addColorStop(0.45, col.c1); gr.addColorStop(1, col.c2);
        x.fillStyle = gr; x.beginPath(); x.arc(m, m, R, 0, TAU); x.fill();
        if (skin.glass && !tint) { x.globalAlpha = 0.7; x.strokeStyle = '#ffffff'; x.lineWidth = Math.max(1, R * 0.16); x.beginPath(); x.arc(m, m, R * 0.6, 0.5, 2.3); x.stroke(); x.globalAlpha = 1; }
        x.fillStyle = 'rgba(255,255,255,0.92)'; x.beginPath(); x.arc(m - R * 0.36, m - R * 0.42, R * 0.25, 0, TAU); x.fill();
        c.css = s / d; spr.balls[key] = c; return c;
      }
      function pegSprite() {
        const d = cv.dpr || 1, key = theme.key + G.pr.toFixed(2) + ':' + d;
        if (spr.peg && spr.pegKey === key) return spr.peg;
        const s = Math.ceil(G.pr * 9 * d), c = document.createElement('canvas'); c.width = c.height = s;
        const x = c.getContext('2d'), m = s / 2, pr = G.pr * d;
        let gr = x.createRadialGradient(m, m, 0, m, m, m); gr.addColorStop(0, hexA(theme.b, 0.5)); gr.addColorStop(0.32, hexA(theme.b, 0.16)); gr.addColorStop(1, hexA(theme.b, 0));
        x.fillStyle = gr; x.fillRect(0, 0, s, s);
        gr = x.createRadialGradient(m - pr * 0.35, m - pr * 0.35, 0, m, m, pr); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, theme.b);
        x.fillStyle = gr; x.beginPath(); x.arc(m, m, pr, 0, TAU); x.fill();
        spr.peg = c; spr.pegKey = key; return c;
      }
      function bulbSprite(col) {
        if (spr.bulbOn[col]) return spr.bulbOn[col];
        const s = 32, c = document.createElement('canvas'); c.width = c.height = s; const x = c.getContext('2d');
        let gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, hexA(col, 0.9)); gr.addColorStop(0.3, hexA(col, 0.45)); gr.addColorStop(1, hexA(col, 0)); x.fillStyle = gr; x.fillRect(0, 0, s, s);
        gr = x.createRadialGradient(14, 14, 0, 16, 16, 5); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, col); x.fillStyle = gr; x.beginPath(); x.arc(16, 16, 4.6, 0, TAU); x.fill();
        spr.bulbOn[col] = c; return c;
      }
      function beamSprite(col) {
        const key = 'beam' + col; if (spr[key]) return spr[key];
        const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d');
        const gv = x.createLinearGradient(0, 256, 0, 0); gv.addColorStop(0, hexA(col, 0.55)); gv.addColorStop(0.45, hexA(col, 0.16)); gv.addColorStop(1, hexA(col, 0));
        x.fillStyle = gv; x.beginPath(); x.moveTo(22, 256); x.lineTo(42, 256); x.lineTo(64, 0); x.lineTo(0, 0); x.closePath(); x.fill();
        const gh = x.createLinearGradient(0, 0, 64, 0); gh.addColorStop(0, 'rgba(0,0,0,1)'); gh.addColorStop(0.5, 'rgba(0,0,0,0)'); gh.addColorStop(1, 'rgba(0,0,0,1)');
        x.globalCompositeOperation = 'destination-out'; x.globalAlpha = 0.7; x.fillStyle = gh; x.fillRect(0, 0, 64, 256);
        spr[key] = c; return c;
      }
      let bulbs = [];
      function bulbPath() {
        const pts = [], x0 = M.bx - 4.5, y0 = M.by - 4.5, w = M.bw + 9, hh = M.bh + 9, stp = M.phone ? 17 : 20;
        for (let x = x0 + 16; x <= x0 + w - 16; x += stp) pts.push([x, y0]);
        for (let y = y0 + 16; y <= y0 + hh - 16; y += stp) pts.push([x0 + w, y]);
        for (let x = x0 + w - 16; x >= x0 + 16; x -= stp) pts.push([x, y0 + hh]);
        for (let y = y0 + hh - 16; y >= y0 + 16; y -= stp) pts.push([x0, y]);
        return pts;
      }
      function renderStatic() {
        const W = M.w, H = M.h, d = cv.dpr || 1, br = bright(), T = theme;
        stat.width = Math.max(2, Math.round(W * d)); stat.height = Math.max(2, Math.round(H * d));
        const g = stat.getContext('2d', { alpha: false }); g.setTransform(d, 0, 0, d, 0, 0);
        let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, br ? T.br0 : T.r0); gr.addColorStop(1, br ? T.br1 : T.r1); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        [[0.1, 0.16, T.a, 0.62], [0.92, 0.34, T.b, 0.55], [0.5, 1.04, T.c, 0.7]].forEach(([fx, fy, c, s]) => { const x = W * fx, y = H * fy, R = Math.max(W, H) * s, rg = g.createRadialGradient(x, y, 0, x, y, R); rg.addColorStop(0, hexA(c, br ? 0.22 : 0.17)); rg.addColorStop(1, hexA(c, 0)); g.fillStyle = rg; g.fillRect(0, 0, W, H); });
        // arcade floor: perspective lines
        g.save(); g.globalAlpha = br ? 0.14 : 0.1; g.strokeStyle = br ? '#8a6aa8' : T.b; g.lineWidth = 1;
        const hz = H * 0.84; g.beginPath();
        for (let i = -14; i <= 14; i++) { g.moveTo(W / 2 + i * 26, hz); g.lineTo(W / 2 + i * 170, H); }
        for (let j = 0; j < 7; j++) { const y = hz + (H - hz) * Math.pow(j / 7, 1.7); g.moveTo(0, y); g.lineTo(W, y); }
        g.stroke(); g.restore();
        // the rest of the arcade: neighbouring cabinets glow softly on wide screens
        if (M.side) {
          [[M.bx - 128, 0.92, 0], [M.bx - 306, 0.74, 1], [M.bx + M.bw + 128, 0.92, 2], [M.bx + M.bw + 306, 0.74, 0]].forEach(([cx, k, ci]) => {
            const w = 128 * k, hh = 330 * k, x = cx - w / 2, y = hz - hh + 6, col = [T.a, T.b, T.c][ci];
            if (x + w < 0 || x > W) return;
            g.save(); g.globalAlpha = br ? 0.55 : 0.7;
            const fl = g.createRadialGradient(cx, hz + 4, 0, cx, hz + 4, w); fl.addColorStop(0, hexA(col, br ? 0.25 : 0.3)); fl.addColorStop(1, hexA(col, 0)); g.fillStyle = fl; g.fillRect(cx - w, hz - w * 0.4, w * 2, w * 0.8);
            rr(g, x, y, w, hh, 10); g.fillStyle = br ? '#ddd2ec' : '#140f23'; g.fill();
            rr(g, x + 7, y + 7, w - 14, hh * 0.11, 5); g.fillStyle = hexA(col, br ? 0.55 : 0.65); g.fill();
            rr(g, x + 11, y + hh * 0.19, w - 22, hh * 0.32, 7); const sg = g.createLinearGradient(0, y + hh * 0.19, 0, y + hh * 0.51); sg.addColorStop(0, hexA(T.b, br ? 0.4 : 0.42)); sg.addColorStop(1, hexA(T.a, br ? 0.25 : 0.28)); g.fillStyle = sg; g.fill();
            g.fillStyle = br ? '#c9bbdf' : '#21193a'; rr(g, x - 5, y + hh * 0.56, w + 10, hh * 0.09, 4); g.fill();
            g.fillStyle = hexA(col, 0.8); g.beginPath(); g.arc(cx - w * 0.18, y + hh * 0.6, 3.5 * k, 0, TAU); g.arc(cx + w * 0.12, y + hh * 0.6, 3.5 * k, 0, TAU); g.fill();
            g.restore();
          });
        }
        // cabinet body + neon edge
        const { bx, by, bw, bh } = M;
        g.save(); g.shadowColor = br ? 'rgba(70,40,110,.32)' : 'rgba(0,0,0,.6)'; g.shadowBlur = 36; g.shadowOffsetY = 16;
        rr(g, bx - 10, by - 10, bw + 20, bh + 20, 24); gr = g.createLinearGradient(bx, by, bx + bw, by + bh);
        gr.addColorStop(0, br ? '#ffffff' : '#3d3160'); gr.addColorStop(0.5, br ? '#ece3f8' : '#1c1636'); gr.addColorStop(1, br ? '#d6cae9' : '#2c2349');
        g.fillStyle = gr; g.fill(); g.restore();
        g.save(); g.shadowColor = T.a; g.shadowBlur = 14; g.strokeStyle = hexA(T.a, br ? 0.75 : 0.9); g.lineWidth = 2; rr(g, bx - 4.5, by - 4.5, bw + 9, bh + 9, 20); g.stroke(); g.restore();
        // playfield glass
        rr(g, bx, by, bw, bh, 16); gr = g.createLinearGradient(0, by, 0, by + bh); gr.addColorStop(0, br ? '#2b2054' : T.g0); gr.addColorStop(1, br ? '#150f2e' : T.g1); g.fillStyle = gr; g.fill();
        g.save(); rr(g, bx, by, bw, bh, 16); g.clip();
        g.strokeStyle = hexA(T.b, 0.05); g.lineWidth = 1; g.beginPath();
        for (let x = bx + 12; x < bx + bw; x += 24) { g.moveTo(x, by); g.lineTo(x, by + bh); }
        for (let y = by + 12; y < by + bh; y += 24) { g.moveTo(bx, y); g.lineTo(bx + bw, y); }
        g.stroke();
        gr = g.createLinearGradient(bx, by, bx + bw * 0.8, by + bh * 0.55); gr.addColorStop(0, 'rgba(255,255,255,0.075)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(bx, by, bw, bh);
        g.restore();
        // hopper tank
        rr(g, G.PL + 2, G.top + 3, G.pw - 4, G.HH - 6, 10); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(G.PL + 12, G.top + 6, G.pw - 24, 2);
        // gutters (glass tubes down both sides) and transfer tubes to the inner bins
        const tubeTop = (side) => { const i = SIDES.indexOf(side); return i < 0 ? null : G.levels[i].railY - 4; };
        [[-1, G.gutL], [1, G.gutR]].forEach(([side, gx]) => {
          const t0 = tubeTop(side); if (t0 == null) return;
          rr(g, gx - G.GW / 2 + 2, t0, G.GW - 4, G.binTop - 2 - t0, 5); g.fillStyle = 'rgba(255,255,255,0.05)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 1; g.stroke();
          g.strokeStyle = hexA(T.b, 0.25); g.beginPath(); g.moveTo(gx - 1.5, t0 + 4); g.lineTo(gx - 1.5, G.binTop - 6); g.stroke();
        });
        bins.slice(0, NG).forEach(b => { if (b.outer) return; const gx = SIDES[b.i] < 0 ? G.gutL : G.gutR, y = G.binTop - 5; g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = G.r * 2 + 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(gx, y); g.lineTo(b.cx, y); g.stroke(); g.strokeStyle = hexA(T.b, 0.35); g.lineWidth = 1; g.beginPath(); g.moveTo(gx, y - G.r); g.lineTo(b.cx, y - G.r); g.stroke(); g.lineCap = 'butt'; });
        // pegs
        const pg = pegSprite(), ps = G.pr * 9;
        G.levels.forEach(Lv => Lv.rows.forEach(row => { for (let k = 0; k < row.n; k++) g.drawImage(pg, row.x0 + k * G.sx - ps / 2, row.y - ps / 2, ps, ps); }));
        // comb teeth and the rails under them (rolling toward their gutter)
        G.levels.forEach((Lv, i) => {
          g.fillStyle = 'rgba(255,255,255,0.6)';
          for (let k = 1; k < 20; k++) { const x = G.PL + k * G.laneW; g.fillRect(x - 1, Lv.combTop - 1, 2, Lv.combH + 1); g.beginPath(); g.arc(x, Lv.combTop - 1, 1.6, 0, TAU); g.fill(); }
          g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(G.PL, Lv.combTop + Lv.combH, G.pw, 1.5);
          const side = SIDES[i], xa = side < 0 ? G.PR : G.PL, xb = side < 0 ? G.gutL : G.gutR, y = Lv.railY;
          g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = G.r * 2 + 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(xa, y - 1); g.lineTo(xb, y + 4); g.stroke(); g.lineCap = 'butt';
          g.strokeStyle = hexA(MINT, 0.32); g.lineWidth = 1; g.beginPath(); g.moveTo(xa, y + G.r); g.lineTo(xb, y + 4 + G.r); g.stroke();
          g.fillStyle = hexA(MINT, 0.4);
          for (let x = xa + side * 30, n = 0; (side < 0 ? x > xb + 20 : x < xb - 20) && n < 40; x += side * 46, n++) { const yy = y + (x - xa) / (xb - xa) * 5; g.beginPath(); g.moveTo(x - side * 3, yy - 3); g.lineTo(x + side * 3, yy); g.lineTo(x - side * 3, yy + 3); g.closePath(); g.fill(); }
        });
        // funnel to the worst-case slot
        g.save(); g.shadowColor = PINK; g.shadowBlur = 10; g.strokeStyle = hexA(PINK, 0.85); g.lineWidth = 2.5; g.lineCap = 'round';
        [G.f0, G.f1].forEach(s => { g.beginPath(); g.moveTo(s.x0, s.y0); g.lineTo(s.x1, s.y1); g.stroke(); }); g.restore();
        // bins
        bins.slice(0, NG).concat([bins.worst]).forEach(b => {
          rr(g, b.x + 2, G.binTop, b.w - 4, G.binsH - 3, 7); g.fillStyle = b.i < 0 ? hexA(PINK, 0.07) : 'rgba(255,255,255,0.045)'; g.fill();
          g.strokeStyle = b.i < 0 ? hexA(PINK, 0.9) : 'rgba(255,255,255,0.24)'; g.lineWidth = b.i < 0 ? 2 : 1; g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(b.x + 6, G.binTop + 3, 2, G.binsH - 10);
        });
        bulbs = bulbPath();
        statOK = true; st.fullN = 2;
      }

      /* ---------------- frame ---------------- */
      let tPrev = 0;
      K.loop((dt0, t) => {
        const g = cv.g; if (!g || !M.w || !G.pw) { tPrev = t; return; }
        // software rendering: ~30 fps is plenty and leaves the CPU for the physics
        if (SOFT && tPrev && t - tPrev < 0.03) return;
        // real elapsed time (the engine caps dt at 50 ms; a starved device should get a choppier picture, not a slower game)
        const dt = tPrev ? Math.min(0.5, Math.max(0, t - tPrev)) : dt0;
        // adaptive pixel ratio: a starved device steps down once or twice
        st.fn++; if (dt > 0.034) st.slow++;
        if (st.fn >= 90) { if (st.slow > 20 && st.q > 0.6) { st.q = st.q > 0.85 ? 0.75 : 0.6; cv.setQuality(st.q); statOK = false; spr.balls = {}; spr.peg = null; } st.fn = 0; st.slow = 0; }
        if (!statOK) renderStatic();
        update(dt, t);
        draw(g, t, dt);
        tPrev = t;
      });
      function update(dt, t) {
        if (st.phase === 'load') hopperFill();
        if (st.phase === 'stream') {
          if (st.holding && st.released < NB) { st.relAcc += dt * RATE; while (st.relAcc >= 1) { st.relAcc -= 1; if (!releaseOne()) { st.relAcc = 0; break; } } }
          if (st.released >= NB && !hold.classList.contains('done')) { hold.classList.add('done'); hold.classList.remove('ready'); stopRattle(); K.guide(null); }
        }
        // physics
        st.acc += dt * 240; let n = Math.floor(st.acc); st.acc -= n; n = Math.min(n, 120);
        let falling = 0, moving = 0;
        for (let i = 0; i < balls.length; i++) {
          const b = balls[i];
          if (b.state === 'fall') {
            for (let s = 0; s < n; s++) { const ev = step(b, FX); if (ev) { onFate(b, ev); break; } }
            b.age += n / 240;
            if (b.state === 'fall') { falling++; if (skin.trail) { b.tr.unshift(b.x, b.y); if (b.tr.length > 8) b.tr.length = 8; } if (b.age > 22) { onFate(b, b.fate === 'w' || !b.fate ? -1 : 1 + Number(b.fate.slice(1)) * 32 + clamp(Math.floor((b.x - G.PL) / G.laneW), 0, 19)); } }
          }
          if (b.state === 'kin') { kinStep(b, dt); moving++; }
        }
        if (bestHit && A.ctx && now() - tickT > 30) { tickT = now(); pegTone(bestHit.lv, bestHit.k, bestHit.sp); }
        bestHit = null;
        for (let i = hits.length - 1; i >= 0; i--) { hits[i].a -= dt * 5; if (hits[i].a <= 0) hits.splice(i, 1); }
        gates.forEach(gt => { for (let k = 0; k < 20; k++) if (gt.flash[k] > 0) gt.flash[k] = Math.max(0, gt.flash[k] - dt * 3.2); });
        P.update(dt);
        if (st.phase === 'stream') {
          if (!st.thinSaid && st.released > 55) { st.thinSaid = true; say(glitch, L(LINES.thin), { mood: 'nerd', ms: 2600 }); }
          if (st.released >= NB && !falling && !moving && st.landed >= NB) streamDone();
        }
        if (rattle) rattle.level(st.holding && st.phase === 'stream' && st.released < NB ? 0.035 : 0.0001, 0.05);
      }
      function pegTone(lv, k, sp) {
        const idx = clamp(Math.round(k / Math.max(1, G.cols - 1) * 5) + (NG - 1 - lv), 0, PENT.length - 1), v = clamp(sp / (500 * G.sc), 0.15, 1) * 0.045;
        const when = A.now(), f = PENT[idx];
        A.tone({ when, type: 'sine', freq: f, dur: 0.11, vol: v, attack: 0.002, pan: clamp(k / G.cols * 1.4 - 0.7, -0.7, 0.7) });
        A.tone({ when, type: 'sine', freq: f * 2.76, dur: 0.05, vol: v * 0.35, attack: 0.001 });
      }
      function draw(g, t, dt) {
        const W = M.w, H = M.h, br = bright();
        const full = st.fullN > 0, cx0 = Math.max(0, M.bx - 18), cy0 = Math.max(0, M.by - 18), cw = Math.min(W, M.bx + M.bw + 18) - cx0, ch = Math.min(H, M.by + M.bh + 18) - cy0;
        if (full) { st.fullN--; g.drawImage(stat, 0, 0, W, H); }
        else { const d = stat.width / W; g.drawImage(stat, cx0 * d, cy0 * d, cw * d, ch * d, cx0, cy0, cw, ch); g.save(); g.beginPath(); g.rect(cx0, cy0, cw, ch); g.clip(); }
        drawDyn(g, t, dt, W, H, br);
        if (!full) g.restore();
      }
      function drawDyn(g, t, dt, W, H, br) {
        // marquee bulbs
        const chase = st.phase === 'stream' ? 16 : 5, cols3 = [theme.a, theme.b, theme.c], party = st.phase === 'finale' || st.phase === 'done';
        for (let i = 0; i < bulbs.length; i++) {
          const on = party ? ((i + Math.floor(t * 7)) % 2 === 0) : ((i + Math.floor(t * chase)) % 3 === 0);
          const p = bulbs[i];
          if (on) g.drawImage(bulbSprite(cols3[i % 3]), p[0] - 9, p[1] - 9, 18, 18);
          else { g.fillStyle = br ? 'rgba(80,60,110,0.45)' : 'rgba(255,255,255,0.18)'; g.fillRect(p[0] - 1.5, p[1] - 1.5, 3, 3); }
        }
        // gate lanes
        const live = st.phase === 'gate' ? st.gate : -9;
        for (let i = 0; i < NG; i++) {
          const gt = gates[i], Lv = G.levels[i], y = Lv.combTop, hh = Lv.combH, known = gt.set || live === i;
          const sw = gt.sweep ? clamp((now() - gt.sweep) / 520, 0, 1.3) : 9;
          for (let k = 0; k < 20; k++) {
            const x = G.PL + k * G.laneW, red = gt.red[k] === 1;
            let f = gt.flash[k]; if (sw < 1.3) { const dk = Math.abs(sw * 22 - k); if (dk < 3) f = Math.max(f, 1 - dk / 3); }
            g.globalAlpha = known ? (red ? 0.55 : 0.4) + f * 0.4 : 0.09 + f * 0.3;
            g.fillStyle = known ? (red ? PINK : MINT) : '#ffffff';
            g.fillRect(x + 1.6, y, G.laneW - 3.2, hh);
            if (known) { g.globalAlpha = 0.95; g.fillRect(x + 1.6, y, G.laneW - 3.2, 2); }
            if (f > 0.08) { g.globalAlpha = f * 0.75; g.drawImage(K.glowSprite(red ? PINK : MINT), x + G.laneW / 2 - 15, y + hh / 2 - 15, 30, 30); }
          }
        }
        g.globalAlpha = 1;
        // peg flashes
        if (hits.length) { g.save(); g.globalCompositeOperation = 'lighter'; const hs = K.glowSprite(theme.b); for (const q of hits) { g.globalAlpha = q.a * 0.9; g.drawImage(hs, q.x - 10, q.y - 10, 20, 20); } g.restore(); }
        // worst-case slot glow
        const wb = bins.worst; if (wb) {
          const pulse = st.phase === 'cope' && !st.handled ? 0.55 + 0.35 * Math.sin(t * 7) : 0.28 + 0.1 * Math.sin(t * 2.2);
          g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = pulse; g.drawImage(K.glowSprite(st.handled ? GOLD : PINK), wb.x - 20, G.binTop - 30, wb.w + 40, G.binsH + 50); g.restore();
          for (let i = 0; i < st.cope; i++) { const yy = G.binBot - 8 - i * 9, sag = 5; g.strokeStyle = hexA(GOLD, 0.9); g.lineWidth = 2; g.beginPath(); g.moveTo(wb.x + 6, yy - sag); g.quadraticCurveTo(wb.cx, yy + sag, wb.x + wb.w - 6, yy - sag); g.stroke(); g.globalAlpha = 0.5; g.drawImage(K.glowSprite(GOLD), wb.cx - 18, yy - 12, 36, 24); g.globalAlpha = 1; }
          if (st.phase === 'finale' || st.phase === 'done') {
            // jackpot light shafts rising from the realistic slots
            const fk = Math.min(1, (now() - st.finT) / 900);
            g.save(); g.globalCompositeOperation = 'lighter';
            bins.slice(0, NG).forEach((b, i) => { const col = [theme.a, theme.b, theme.c, MINT][i % 4], sw = Math.sin(t * 1.6 + i * 1.3) * 0.12; g.globalAlpha = fk * (0.55 + 0.25 * Math.sin(t * 5 + i)); g.save(); g.translate(b.cx, G.binTop + 4); g.rotate(sw); g.drawImage(beamSprite(col), -b.w * 0.55, -(G.binTop - M.by) * 0.92, b.w * 1.1, (G.binTop - M.by) * 0.92); g.restore(); });
            g.restore();
          }
          if (st.phase === 'finale' || st.phase === 'done') { g.save(); g.setLineDash([7, 7]); g.lineDashOffset = -t * 60; bins.slice(0, NG).forEach((b, i) => { g.strokeStyle = [theme.a, theme.b, theme.c, MINT][i % 4]; g.lineWidth = 2.5; rr(g, b.x + 3, G.binTop + 1, b.w - 6, G.binsH - 5, 7); g.stroke(); }); g.restore(); }
        }
        // hopper pile
        drawHopper(g, t);
        // balls
        const sp = ballSprite(null), gold = ballSprite('gold'), cs = sp.css, glowS = !SOFT && st.q > 0.8 ? K.glowSprite(skin.glow) : null;
        const fin = st.phase === 'finale' || st.phase === 'done' ? (now() - st.finT) / 1000 : -1;
        for (let i = 0; i < balls.length; i++) {
          const b = balls[i]; let y = b.y;
          if (fin > 0 && b.state === 'rest') y -= Math.max(0, Math.sin(fin * 5.5 - (b.x - M.bx) * 0.025)) * 9 * Math.min(1, fin);
          if (b.state === 'cup' && st.handled) y -= Math.min(4, st.cope * 1.4);
          if (b.state === 'fall') {
            if (skin.trail && b.tr.length > 2) { for (let k = 2; k < b.tr.length; k += 2) { g.globalAlpha = 0.35 * (1 - k / 8); g.fillStyle = skin.c1; g.beginPath(); g.arc(b.tr[k], b.tr[k + 1], G.r * (1 - k / 12), 0, TAU); g.fill(); } g.globalAlpha = 1; }
            if (glowS) { g.globalAlpha = 0.32; g.drawImage(glowS, b.x - G.r * 3, y - G.r * 3, G.r * 6, G.r * 6); g.globalAlpha = 1; }
          }
          g.drawImage(b.state === 'cup' && st.handled ? gold : sp, b.x - cs / 2, y - cs / 2, cs, cs);
        }
        P.draw(g);
        // spotlight on the step being set
        const spotOn = st.phase === 'gate' || st.phase === 'gut';
        st.spot += ((spotOn ? 1 : 0) - st.spot) * Math.min(1, dt * 6);
        if (st.spot > 0.01) {
          let y0, y1;
          if (st.phase === 'gut' || st.gate < 0) { const y = parseFloat(gutB.band.style.top) || G.top; y0 = y - 6; y1 = y + 70; }
          else { const Lv = G.levels[clamp(st.gate, 0, NG - 1)]; y0 = Lv.top - 2; y1 = Lv.combTop + Lv.combH + 12; }
          g.fillStyle = 'rgba(4,2,12,' + (0.5 * st.spot).toFixed(3) + ')';
          g.fillRect(M.bx, M.by, M.bw, Math.max(0, y0 - M.by)); g.fillRect(M.bx, y1, M.bw, Math.max(0, M.by + M.bh - y1));
        }
      }
      function drawHopper(g, t) {
        const rem = NB - st.released, jig = st.phase === 'load' && !K.reduced() ? 1.4 : 0;
        if (rem <= 0) return;
        const d = G.r * 2 + 0.4, cols = Math.floor((G.pw - 12) / d), x0 = G.PL + 6 + d / 2, yb = G.top + G.HH - 6 - G.r, cs = ballSprite(null).css, sp = ballSprite(null);
        for (let k = 0; k < rem; k++) { const row = Math.floor(k / cols), col = k % cols, x = x0 + col * d + (row % 2 ? d / 2 : 0) + (jig ? Math.sin(t * 23 + k * 1.7) * jig : 0), y = yb - row * d * 0.86 - (jig ? Math.abs(Math.sin(t * 17 + k)) * jig : 0); if (y < G.top + 4) break; g.drawImage(sp, x - cs / 2, y - cs / 2, cs, cs); }
        if (st.phase === 'stream' && st.holding && st.released < NB) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6 + 0.3 * Math.sin(t * 30); g.fillStyle = theme.b; g.fillRect(G.PL + 6, G.top + G.HH - 4, G.pw - 12, 2); g.restore(); }
      }
      let lastFill = 0;
      function hopperFill() { if (A.ctx && GEN.loaded > lastFill && now() - tickT > 35) { tickT = now(); lastFill = GEN.loaded; A.tone({ type: 'sine', freq: 900 + GEN.loaded * 9, dur: 0.03, vol: 0.012 }); } }

      /* ---------------- sound beds ---------------- */
      let rattle = null;
      function startRattle() { if (!A.ctx || rattle) return; rattle = A.loop({ filter: 'bandpass', freq: 2600, q: 1.4 }); S.onDestroy(() => rattle && rattle.stop()); }
      function stopRattle() { if (rattle) rattle.level(0.0001, 0.05); }

      /* ---------------- gut check (only when the console has no before-rating) ---------------- */
      function startGut() {
        st.phase = 'gut'; st.gate = -1;
        gutB.v = 50; gutB.knob.firstChild.textContent = '50%'; knobTo(gutB);
        gutB.band.hidden = false;
        setCard('Gut check', 'HOW LIKELY DOES IT FEEL?', 'Not the maths, just the feeling. <em>Drag along the line.</em>');
        placeCard(gutB.band);
        K.guide({ id: 'gut', g: 'drag', target: gutB.band, ox: 0.5, dir: 'r', d: Math.min(110, G.pw * 0.3), label: 'DRAG: HOW IT FEELS', place: 'below', delay: 900 });
        st.gateReady = true;
      }
      function lockGut() {
        if (st.phase !== 'gut') return;
        feel = gutB.v; gutB.band.hidden = true; card.hidden = true; K.guide(null);
        feelSign.lastChild.textContent = feel + '%'; bump(feelSign); K.sfx.lock();
        say(glitch, L(LINES.gutDone, { feel: feel + '%', gut: gutFor(feel) + '%' }), { mood: 'smug', ms: 4200 });
        ctx.track('plinko_gut', { feel });
        st.phase = 'pause';
        K.later(() => startGate(0), 1100);
      }

      /* ---------------- gates: drag each link to its honest odds ---------------- */
      function setCard(top, title, sub) { card.children[0].textContent = top; card.children[1].textContent = title; card.children[2].innerHTML = sub; card.hidden = false; card.style.animation = 'none'; void card.offsetWidth; card.style.animation = ''; }
      function placeCard(band) {
        band = band || st.cardBand; if (!band) return; st.cardBand = band;
        const r = { y: parseFloat(band.style.top) || 0 };
        card.style.left = (G.PL - 6) + 'px'; card.style.width = (G.pw + 12) + 'px';
        const ch = card.offsetHeight || 74;
        card.style.top = Math.max(M.by - 2, r.y - ch - 2) + 'px';
      }
      const word = (v) => v <= 15 ? 'rare' : v <= 35 ? 'unlikely' : v <= 60 ? 'coin flip' : v <= 80 ? 'likely' : 'near certain';
      function gateTop(g) { return (g.i + 1) + '/' + NG + ' · ' + word(g.v); }
      function startGate(i) {
        st.phase = 'gate'; st.gate = i; st.gateReady = false;
        const g = gates[i];
        g.gut = gutFor(feel == null ? 80 : feel); g.v = g.gut; g.red = pattern(g.v / 5); G.levels[i].red = g.red;
        g.knob.firstChild.textContent = g.v + '%'; g.band.setAttribute('aria-valuenow', String(g.v));
        g.ghost.hidden = false; g.ghost.firstChild.textContent = 'Gut ' + g.gut + '%';
        knobTo(g); g.band.hidden = false;
        if (g.factsEl) g.factsEl.classList.toggle('low', Math.abs(facts - g.gut) < 30);
        gates.forEach((x, k) => { x.plate.classList.toggle('on', k === i); x.plate.classList.toggle('dim', k !== i && !x.set); x.val.classList.toggle('dim', k !== i && !x.set); x.val.classList.toggle('off', k === i); });
        g.val.textContent = g.v + '%';
        let sub = 'If not: <em>' + g.lk.off.toLowerCase() + '</em>';
        if (i === 0 && altNames.length) sub += ', like ' + esc(altNames[0]);
        if (i === 0 && facts != null) sub += '. Facts alone: about ' + facts + '%.';
        setCard(gateTop(g), g.lk.name, sub);
        placeCard(g.band);
        g.sweep = now();
        if (A.ctx) { const t0 = A.now(); [0, 1, 2].forEach(k => A.tone({ when: t0 + k * 0.06, type: 'square', freq: A.note(['A4', 'C5', 'E5'][k]), dur: 0.07, vol: 0.025, lp: 2400 })); }
        K.guide({ id: 'gate' + i, g: 'drag', target: g.band, ox: (14 + g.v / 100 * G.pw) / (G.pw + 28), dir: 'l', d: Math.min(130, G.pw * 0.36), label: 'DRAG: HONEST ODDS', place: 'below', delay: i ? 700 : 1100 });
        K.later(() => { st.gateReady = true; }, 350);
      }
      const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      function setV(g, v) {
        v = clamp(v, 5, 95); if (v === g.v) return;
        const up = v > g.v; g.v = v;
        g.knob.firstChild.textContent = v + '%'; g.band.setAttribute('aria-valuenow', String(v)); knobTo(g);
        if (g.i >= 0) {
          g.red = pattern(v / 5); G.levels[g.i].red = g.red; g.val.textContent = v + '%';
          card.children[0].textContent = gateTop(g);
          const prod = gates.reduce((p, x) => p * (x.set ? x.p : x === g ? v / 100 : 1), 1);
          chainSign.lastChild.textContent = fmtPct(prod * 100); chainSign.classList.add('live');
        } else card.children[0].textContent = v + '% · ' + word(v);
        if (A.ctx) { A.click({ vol: 0.05 }); A.tone({ type: 'triangle', freq: 300 + v * 9, dur: 0.05, vol: 0.03 }); }
        if (!K.reduced() && g.i >= 0) P.emit('spark', G.PL + v / 100 * G.pw, G.levels[g.i].combTop + 4, 2, { colors: [up ? PINK : MINT, '#ffffff'], speed: [30, 80] });
      }
      const xToV = (x) => clamp(Math.round((x - 14) / G.pw * 20), 1, 19) * 5;
      function bindBand(g, lock) {
        K.drag(g.band, {
          start: (p) => { const ok = g.i < 0 ? st.phase === 'gut' : st.phase === 'gate' && st.gate === g.i; if (!ok) return false; g.band.classList.add('drag'); K.sfx.tap(); setV(g, xToV(p.x)); },
          move: (p) => setV(g, xToV(p.x)),
          end: () => { g.band.classList.remove('drag'); lock(g); }
        });
        S.listen(g.band, 'keydown', (e) => {
          const ok = g.i < 0 ? st.phase === 'gut' : st.phase === 'gate' && st.gate === g.i; if (!ok) return;
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setV(g, g.v - 5); }
          else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setV(g, g.v + 5); }
          else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lock(g); }
        });
      }
      gates.forEach(g => bindBand(g, lockGate));
      bindBand(gutB, () => lockGut());
      function bump(elm) { elm.classList.remove('bump'); void elm.offsetWidth; elm.classList.add('bump'); K.later(() => elm.classList.remove('bump'), 380); }
      function lockGate(g) {
        if (st.phase !== 'gate' || st.gate !== g.i) return;
        g.p = g.v / 100; g.set = true; g.moved = Math.abs(g.v - g.gut) >= 5;
        g.band.hidden = true; card.hidden = true; K.guide(null);
        g.plate.classList.remove('on'); g.plate.classList.add('set'); g.val.classList.remove('off'); g.val.textContent = g.v + '%'; g.sweep = now();
        K.sfx.lock(); if (A.ctx) A.wood(A.now() + 0.08, 0.12, 0.7);
        st.chainP = gates.reduce((p, x) => p * (x.set ? x.p : 1), 1);
        chainSign.classList.remove('live'); chainSign.lastChild.textContent = fmtPct(st.chainP * 100); bump(chainSign);
        if (A.ctx) { const t0 = A.now(); ['E6', 'C6', 'A5'].slice(0, 1 + g.i % 3).forEach((n, k) => A.chime(A.note(n), { when: t0 + 0.12 + k * 0.09, vol: 0.05, dur: 0.9 })); }
        ctx.track('plinko_gate', { i: g.i, v: g.v, gut: g.gut });
        const drop = g.gut - g.v;
        if (g.i === 0) { say(rush, L(drop >= 30 ? LINES.lockBig : drop >= 10 ? LINES.lockMid : LINES.lockSame), { mood: drop >= 30 ? 'surprised' : drop >= 10 ? 'think' : 'determined', ms: 2600 }); }
        else if (g.i === 1) say(glitch, L(LINES.multiply), { mood: 'nerd', ms: 3000 });
        else if (drop >= 30 && g.i === NG - 2) say(rush, L(LINES.lockBig), { mood: 'wow', ms: 2400 });
        rush.base(st.chainP < 0.25 ? 'think' : serious || care ? 'worried' : 'panic');
        st.phase = 'pause';
        K.later(() => { if (g.i + 1 < NG) startGate(g.i + 1); else startLoad(); }, 850);
      }

      /* ---------------- load the hopper (sampling the honest run) and stream ---------------- */
      function startLoad() {
        st.phase = 'load'; st.gate = -1;
        gates.forEach(x => { x.plate.classList.remove('dim', 'on'); x.plate.classList.add('mini'); x.val.classList.remove('dim'); updateVal(x); });
        hold.hidden = false; hold.classList.add('load');
        genStart();
        say(glitch, L(LINES.load), { mood: 'smug', ms: 4200 });
        waitGen();
      }
      let genWait = 0;
      // the sampler runs in short background chunks, so a slow device finishes it in about the same wall time
      function waitGen() { S.cancel(genWait); const tick = () => { if (st.phase !== 'load') return; genTick(14); if (GEN.done) streamReady(); else genWait = K.later(tick, 4); }; tick(); }
      function regen() { genStart(); if (st.phase === 'stream') { st.phase = 'load'; st.holding = false; hold.classList.add('load'); hold.classList.remove('ready', 'down'); waitGen(); } }
      function streamReady() {
        st.phase = 'stream';
        hold.classList.remove('load'); hold.classList.add('ready');
        if (A.ctx) K.sfx.rise();
        K.guide({ id: 'hold', g: 'hold', target: hold, label: 'HOLD TO DROP 100', place: 'below', delay: 500, ms: 2200 });
      }
      function updateVal(g) { if (st.phase === 'gate' || !g.set) return; const arrived = g.passed + (g.caught || 0); g.val.textContent = g.v + '%'; if (arrived) g.val.append(h('em', { text: '↓' + g.passed + '/' + arrived })); }
      K.press(hold, {
        down: () => { if (st.phase !== 'stream' || st.released >= NB) return; st.holding = true; hold.classList.add('down'); K.sfx.pop(undefined, 420); startRattle(); },
        up: () => { st.holding = false; hold.classList.remove('down'); stopRattle(); }
      });
      S.listen(hold, 'keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); if (st.phase === 'stream' && st.released < NB) { st.holding = true; hold.classList.add('down'); startRattle(); } } });
      S.listen(hold, 'keyup', (e) => { if (e.code === 'Space' || e.code === 'Enter') { st.holding = false; hold.classList.remove('down'); stopRattle(); } });
      function streamDone() {
        if (st.phase !== 'stream') return;
        st.phase = 'pause'; st.holding = false; K.guide(null);
        hold.hidden = true;
        const w = bins.worst.shown;
        ctx.track('plinko_stream', { worst: w, chain: Math.round(st.chainP * 1000) });
        const sub = { w, feel: (feel == null ? 0 : feel) + '%' };
        say(glitch, L(serious ? LINES.sumSerious : w === 0 ? LINES.sumNone : feel == null ? LINES.sumNoFeel : LINES.sum, sub), { mood: serious ? 'think' : 'smug', ms: 3600 });
        rush.base(serious || care ? 'worried' : st.chainP < 0.2 ? 'surprised' : 'worried');
        K.later(twist, 3000);
      }

      /* ---------------- twist: "but what if it DID happen?" -> three supports into the slot ---------------- */
      function twist() {
        st.phase = 'cope';
        say(rush, L(LINES.whatIf), { mood: serious || care ? 'worried' : 'panic', ms: 2600 }); if (!serious && !care) rush.react('shake');
        if (A.ctx) { const t0 = A.now(); A.tone({ when: t0, type: 'sine', freq: 520, to: 500, dur: 0.22, vol: 0.06 }); A.tone({ when: t0 + 0.24, type: 'sine', freq: 390, to: 360, dur: 0.34, vol: 0.06 }); }
        placard.classList.add('drop');
        K.later(openTray, 1500);
      }
      function placeTray() {
        const tr = st.tray; if (!tr) return;
        tr.style.setProperty('--cols', M.side || M.w >= 560 ? 3 : 2);
        Object.assign(tr.style, { left: (G.PL - 8) + 'px', width: (G.pw + 16) + 'px', top: (G.levels[0].top - 4) + 'px' });
      }
      function openTray() {
        const tray = h('div', { class: 'wp-tray', role: 'group', 'aria-label': 'Coping resources' }, h('b', { text: 'If it did happen, I’d have…' }), h('small', { text: 'Drag 3 into the worst-case slot' }));
        const grid = h('div', { class: 'wp-toks' });
        TOKENS.forEach((tk, i) => {
          tk.el = h('div', { class: 'wp-tok', role: 'button', tabindex: '0', 'data-cat': tk.cat, 'aria-label': tk.cat + ': ' + tk.t + '. Press Enter to add it to the worst-case slot.' }, h('i', { html: ICON[tk.ic] }), h('span', null, h('small', { text: tk.cat }), h('b', { text: tk.t })));
          tk.el.style.animationDelay = (0.05 * i + 0.1) + 's';
          grid.append(tk.el); bindTok(tk);
        });
        tray.append(grid); el.append(tray); st.tray = tray; placeTray();
        say(glitch, L(LINES.cope), { mood: serious ? 'determined' : 'idea', ms: 4600 });
        tokGuide(1300);
      }
      function dropZone() { const r = K.rectIn(placard); return { x0: bins.worst.x - 34, x1: bins.worst.x + bins.worst.w + 34, y0: G.fy0 - 10, y1: r.y + r.h + 12, cx: bins.worst.cx, cy: G.binTop + G.binsH * 0.45 }; }
      const inDrop = (p) => { const z = dropZone(); return p.x >= z.x0 && p.x <= z.x1 && p.y >= z.y0 && p.y <= z.y1; };
      function tokGuide(delay) {
        const tk = TOKENS.find(x => !x.used && x.el); if (!tk || st.cope >= 3) return;
        const r = K.rectIn(tk.el), z = dropZone();
        K.guide({ id: 'tok' + st.cope, g: 'drag', target: tk.el, dx: z.cx - r.cx, dy: z.cy - r.cy, label: 'DRAG INTO THE SLOT', place: 'above', delay: delay || 900, ms: 2200 });
      }
      function bindTok(tk) {
        K.drag(tk.el, {
          space: el,
          start: (p) => {
            if (st.phase !== 'cope' || tk.used || st.cope >= 3) return false;
            const r = K.rectIn(tk.el), gh = tk.el.cloneNode(true);
            gh.classList.add('wp-ghostok'); gh.removeAttribute('tabindex'); gh.removeAttribute('role');
            Object.assign(gh.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
            el.append(gh); tk.el.classList.add('lift');
            st.drag = { tk, gh, ox: p.x - r.x, oy: p.y - r.y, r };
            K.sfx.pop(undefined, 640);
          },
          move: (p) => {
            const d = st.drag; if (!d) return;
            d.gh.style.left = (p.x - d.ox) + 'px'; d.gh.style.top = (p.y - d.oy) + 'px';
            const hot = inDrop(p); if (hot !== st.dropHot) { st.dropHot = hot; placard.classList.toggle('drop', hot || st.cope < 3); if (hot && A.ctx) A.chime(A.note('E6'), { vol: 0.04, dur: 0.4 }); }
          },
          end: (p) => {
            const d = st.drag; if (!d) return; st.drag = null; st.dropHot = false;
            if (inDrop(p)) install(tk, d.gh);
            else {
              K.sfx.soft();
              Object.assign(d.gh.style, { transition: 'left .3s cubic-bezier(.2,1.3,.4,1), top .3s cubic-bezier(.2,1.3,.4,1)', left: d.r.x + 'px', top: d.r.y + 'px' });
              K.later(() => { d.gh.remove(); tk.el.classList.remove('lift'); }, 320);
              tokGuide(1400);
            }
          }
        });
        S.listen(tk.el, 'keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && st.phase === 'cope' && !tk.used && st.cope < 3) { e.preventDefault(); const r = K.rectIn(tk.el), gh = tk.el.cloneNode(true); gh.classList.add('wp-ghostok'); Object.assign(gh.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' }); el.append(gh); install(tk, gh); } });
      }
      function install(tk, gh) {
        tk.used = true; st.cope++; st.installed.push(tk);
        tk.el.classList.remove('lift'); tk.el.classList.add('used');
        const z = dropZone();
        Object.assign(gh.style, { transition: 'all .32s cubic-bezier(.4,0,.6,1)', left: (z.cx - 30) + 'px', top: (z.cy - 20) + 'px', width: '60px', height: '40px', opacity: '0', transform: 'scale(.5)' });
        K.later(() => gh.remove(), 340);
        K.sfx.good(undefined, 4 + st.cope);
        if (A.ctx) { const t0 = A.now(); A.tone({ when: t0, type: 'sine', freq: 400, to: 900 + st.cope * 200, glide: 0.25, dur: 0.3, vol: 0.05 }); A.chime(A.note(['C6', 'E6', 'G6'][st.cope - 1]), { when: t0 + 0.12, vol: 0.07, dur: 1.4 }); }
        P.emit('star', z.cx, G.binTop + 20, 14, { colors: [GOLD, '#fff6cc'] });
        ctx.track('plinko_cope', { n: st.cope, cat: tk.cat });
        const wl = bins.worst.el && bins.worst.el.querySelector('span'); if (wl) wl.textContent = 'SUPPORT ' + st.cope + '/3';
        if (st.cope === 1) say(rush, L(LINES.in1), { mood: 'think', ms: 2200 });
        else if (st.cope === 2) say(glitch, L(LINES.in2), { mood: 'happy', ms: 2200 });
        if (st.cope >= 3) { K.guide(null); K.later(handledNow, 500); } else tokGuide(900);
      }
      function handledNow() {
        st.handled = true; placard.classList.remove('drop'); placard.classList.add('handled');
        placard.firstChild.textContent = 'If so: hard, but I’d handle it';
        bins.worst.el.classList.add('handled'); bins.worst.el.querySelector('span').textContent = 'HANDLED';
        if (st.tray) { st.tray.classList.add('out'); const tr = st.tray; K.later(() => tr.remove(), 380); st.tray = null; }
        K.sfx.great();
        if (A.ctx) A.pad(['A3', 'C4', 'E4', 'A4'].map(n => A.note(n)), { dur: 2.6, vol: 0.12, attack: 0.3 });
        P.emit('confetti', bins.worst.cx, G.binTop, 26, { colors: [GOLD, MINT, '#ffffff', theme.a] });
        say(rush, L(LINES.handled), { mood: serious || care ? 'calm' : 'happy', ms: 3000 }); rush.base('calm');
        K.later(reveal, 1700);
      }

      /* ---------------- reveal: feels vs chain, with the honest multiplication ---------------- */
      let eqEl = null;
      async function reveal() {
        st.phase = 'reveal';
        const chainTxt = fmtPct(st.chainP * 100), w = bins.worst.shown;
        eqEl = h('div', { class: 'wp-eq', role: 'status' });
        const feelRow = feel != null ? h('div', { class: 'wp-eqrow feel' }, h('small', { text: 'Feels like' }), h('b', { text: feel + '%' })) : null;
        const terms = h('div', { class: 'wp-terms' });
        gates.forEach((g, i) => { if (i) terms.append(h('span', { text: ' × ' })); terms.append(h('span', { text: g.v + '%' })); });
        const chainRow = h('div', { class: 'wp-eqrow chain' }, h('small', { text: 'Chain says' }), h('b', { text: chainTxt }));
        const nRow = h('div', { class: 'wp-eqn', html: serious ? 'A real chance. <em>The plan matters most.</em>' : 'About <em>' + Math.max(0, GEN.counts ? GEN.counts.worst : w) + ' in 100</em> · ' + NG + ' things had to go wrong' });
        if (feelRow) eqEl.append(feelRow);
        eqEl.append(terms, chainRow, nRow);
        chainRow.style.visibility = 'hidden'; nRow.style.visibility = 'hidden';
        eqEl.style.top = (G.levels[0].top + 6) + 'px';
        el.append(eqEl);
        const spans = Array.from(terms.children);
        for (let i = 0; i < spans.length; i++) { await K.wait(K.reduced() ? 80 : 240); spans[i].classList.add('on'); if (A.ctx && i % 2 === 0) A.chime(A.note(PENTA_NOTE(i / 2)), { vol: 0.06, dur: 1 }); }
        await K.wait(K.reduced() ? 150 : 380);
        chainRow.style.visibility = ''; nRow.style.visibility = ''; K.sfx.win();
        const up = feel != null && st.chainP * 100 >= feel;
        say(glitch, L(serious ? LINES.revealSerious : feel == null ? LINES.revealNoFeel : up ? LINES.revealUp : LINES.reveal, { feel: (feel || 0) + '%', chain: chainTxt }), { mood: serious ? 'determined' : 'smug', ms: 0 });
        await K.wait(K.reduced() ? 1400 : 3000);
        finale();
      }
      const PENTA_NOTE = (i) => ['C6', 'D6', 'E6', 'G6', 'A6'][Math.round(i) % 5];

      /* ---------------- finale: jackpot on the realistic slots + a printed ticket ---------------- */
      async function finale() {
        if (st.phase === 'finale' || st.finished) return;
        st.phase = 'finale'; st.finT = now();
        if (eqEl) { eqEl.classList.add('out'); const e = eqEl; K.later(() => e.remove(), 520); }
        music.level(0.6);
        const all = bins.slice(0, NG).map((b, i) => ({ b, n: b.shown, name: links[i].off })).concat([{ b: bins.worst, n: bins.worst.shown, name: 'the worst case', worst: true }]);
        const top = all.slice().sort((a, b) => b.n - a.n)[0];
        if (top && top.b.el) top.b.el.classList.add('top');
        say(rush, L(LINES.fin), { mood: 'celebrate', ms: 0 }); rush.base('celebrate'); rush.react('bounce');
        glitch.face('happy');
        // jackpot fanfare
        if (A.ctx) { const t0 = A.now(); ['A4', 'C5', 'E5', 'A5', 'C6', 'E6', 'A6'].forEach((n, i) => A.tone({ when: t0 + i * 0.07, type: 'square', freq: A.note(n), dur: 0.12, vol: 0.03, lp: 3200 })); ['E6', 'A6'].forEach((n, i) => A.chime(A.note(n), { when: t0 + 0.55 + i * 0.12, vol: 0.07, dur: 1.6 })); }
        printTicket(top);
        const from = bins.slice(0, NG).map(b => ({ x: b.cx, y: G.binTop })).concat([{ x: bins.worst.cx, y: G.binTop }]);
        await K.finale('fireworks', { from, colors: [theme.a, theme.b, theme.c, GOLD, MINT], count: M.phone ? 6 : 8, ms: 4600, chord: ['A3', 'C4', 'E4', 'A4'] });
        await K.wait(K.reduced() ? 300 : 900);
        finishGame(top);
      }
      function printTicket(top) {
        const tk = h('div', { class: 'wp-ticket', role: 'status', 'aria-label': 'Printed result' });
        const lines = [['hd', 'WORST-CASE PLINKO'], ['', feel != null ? 'FEELS LIKE ... ' + feel + '%' : 'GUT ........ ?'], ['big', 'CHAIN SAYS .. ' + fmtPct(st.chainP * 100)], ['', 'WORST CASE: ' + bins.worst.shown + ' OF 100'],
          ['', 'MOST LIKELY:'], ['ok', (top && top.worst ? 'THE WORST CASE · ' + top.n + ' (PLAN READY)' : (top ? top.name.toUpperCase() + ' · ' + top.n : ''))], ['', 'IF IT DID HAPPEN:']].concat(st.installed.map(t => ['ok', '✓ ' + t.t]));
        const rowsEls = lines.map(([c, s]) => h('div', { class: c, text: s }));
        tk.append(rowsEls[0]);
        if (M.side) Object.assign(tk.style, { left: (M.bx + M.bw + 26) + 'px', top: '112px', width: Math.min(250, M.w - (M.bx + M.bw + 26) - 16) + 'px' });
        else Object.assign(tk.style, { left: Math.max(8, M.w - 236) + 'px', top: (M.by + 4) + 'px' });
        el.append(tk);
        rowsEls.forEach((r, i) => K.later(() => { if (i) tk.append(r); K.later(() => r.classList.add('on'), 30); if (A.ctx) { const t0 = A.now(); for (let k = 0; k < 6; k++) A.noise({ when: t0 + k * 0.022, filter: 'highpass', freq: 3200, dur: 0.012, vol: 0.03 }); } }, 200 + i * 190));
      }
      function finishGame(top) {
        if (st.finished) return; st.finished = true; st.phase = 'done';
        const chainPct = st.chainP * 100, gap = feel != null ? Math.round(feel - chainPct) : 0;
        const examined = gates.filter(g => g.moved).length / NG;
        const tier = K.tier(0.45 + 0.55 * examined, [0.35, 0.65, 0.85]);
        const badges = [];
        if (tier) badges.push(tier + ' chain-breaker');
        if (!serious && gap > 0) { const b = K.best('gap', gap, 'higher'); const rc = feel + '% → ' + fmtPct(chainPct); if (b.isNew) badges.push('New best reality check: ' + rc); else if (b.first) badges.push('Reality check: ' + rc); }
        const ti = tier === 'Gold' ? 3 : tier === 'Silver' ? 2 : tier === 'Bronze' ? 1 : 0;
        if (ti > skinIdx) { S.store.set('worst-case-plinko:skin', ti); K.collect('Skin: ' + SKINS[ti].key); badges.push('Unlocked: ' + SKINS[ti].name); }
        const cb = K.collect('Board: ' + theme.key); if (cb.isNew) badges.push('Collected: ' + theme.key + ' board');
        const oneIn = st.chainP > 0 ? Math.max(1, Math.round(1 / st.chainP)) : 1000;
        const most = top ? (top.worst ? 'the worst case, with a plan (' + top.n + ' of 100)' : top.name.toLowerCase() + ' (' + top.n + ' of 100)') : '';
        const share = serious ? 'My worst case needed ' + NG + ' things to go wrong. I counted the odds and made a plan.'
          : st.chainP >= 0.5 ? 'My worst case needed ' + NG + ' things to go wrong. I made a plan for it anyway.'
            : 'My worst case needed ' + NG + ' things to go wrong. Odds: about 1 in ' + oneIn + '.';
        ctx.finish({
          title: serious ? 'Counted, and planned for' : 'The worst case, counted', mood: 'celebrate',
          lines: [feel != null ? 'Feels like ' + feel + '% → the chain says ' + fmtPct(chainPct) : 'The chain says ' + fmtPct(chainPct), 'Most likely: ' + most, clip('If it did happen: ' + st.installed.map(t => t.t.toLowerCase()).join(', '), 96)],
          share, badges: badges.slice(0, 4)
        });
      }

      /* ---------------- flow ---------------- */
      cv.onResize(() => layout());
      (async () => {
        await K.intro({ title: 'Worst-Case Plinko', sub: 'A worst case needs a whole chain of things to go wrong. Let’s count them.', how: 'Drag each gate to its honest odds. Hold to drop 100 balls.', char: 'rush', mood: 'surprised' });
        layout(); st.phase = 'boot'; st.boot = now();
        if (A.ctx) { const t0 = A.now(); for (let i = 0; i < 6; i++) A.tone({ when: t0 + i * 0.05, type: 'square', freq: 220 * Math.pow(1.26, i), dur: 0.06, vol: 0.02, lp: 2000 }); }
        say(rush, L(LINES.open), { mood: serious || care ? 'worried' : 'panic', ms: 3400 }); if (!serious && !care) rush.react('shake');
        await K.wait(K.reduced() ? 900 : 2300);
        if (feel == null) { say(glitch, L(LINES.chainNoFeel), { mood: 'scan', ms: 4000 }); await K.wait(900); startGut(); }
        else { bump(feelSign); say(glitch, L(LINES.chain, { feel: feel + '%', gut: gutFor(feel) + '%' }), { mood: 'scan', ms: 5200 }); await K.wait(900); startGate(0); }
      })();

      return {
        async autoplay() {
          const wait = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 30000)) await K.wait(80); };
          const dragTo = async (g, v) => { const from = 14 + g.v / 100 * G.pw, to = 14 + v / 100 * G.pw; await K.sim.drag(g.band, { x: from, y: 32 }, { x: to, y: 32 }, 650, 13); };
          await wait(() => (st.phase === 'gut' || st.phase === 'gate') && st.gateReady, 25000);
          if (st.phase === 'gut') { await K.wait(600); await dragTo(gutB, 75); await wait(() => st.phase === 'gate' && st.gateReady, 8000); }
          const plan = NG === 3 ? [40, 30, 50] : [40, 45, 30, 50];
          for (let i = 0; i < NG; i++) {
            await wait(() => st.phase === 'gate' && st.gate === i && st.gateReady, 15000);
            await K.wait(450);
            await dragTo(gates[i], plan[i]);
            await wait(() => gates[i].set, 3000);
          }
          await wait(() => st.phase === 'stream', 30000);
          await K.wait(400);
          const t1 = now();
          while (st.released < NB && (st.phase === 'stream' || st.phase === 'load') && now() - t1 < 80000) { if (st.phase === 'stream') await K.sim.hold(hold, 2400); await K.wait(200); }
          await wait(() => st.phase === 'cope' && st.tray, 45000);
          await K.wait(1100);
          const order = ['People', 'Steps', 'Skills'];
          for (let n = 0; n < 3; n++) {
            const tk = TOKENS.find(x => !x.used && x.cat === order[n]) || TOKENS.find(x => !x.used); if (!tk || !tk.el) break;
            const r = K.rectIn(tk.el), z = dropZone();
            await K.sim.drag(tk.el, { x: r.w / 2, y: r.h / 2 }, { x: z.cx - r.x, y: z.cy - r.y }, 750, 16);
            await wait(() => tk.used, 2500); await K.wait(650);
          }
          await wait(() => st.finished, 40000);
        }
      };
    }
  });
})(window.TSG_ENV);
