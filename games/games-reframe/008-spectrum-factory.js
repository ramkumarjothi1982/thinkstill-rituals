/* 008 Spectrum Factory — Reframe · REFRAME · Performance / Confidence
 * Mechanism: the continuum technique for all-or-nothing thinking (Padesky 1994; Burns 1980). Instead of a black-or-white
 * verdict, the player anchors a 0-100 line with concrete examples and then places what really happened on it, so the
 * extreme label shrinks to what it is: one end of a long spectrum. Specific beats extreme.
 * Verb: blend (drop the two labels into the vats, drag anchor drops onto the spectrum tube, slide the mixer to blend
 * today's tin, hold PRINT for a specific new label).
 * Finale: a giant gradient banner unrolls from the press across the factory floor, confetti in every shade, and the
 * press chimneys puff colour.
 */
(function (env) {
  'use strict';
  (env.games = env.games || []).push({
    id: 'spectrum-factory', mode: 'reframe', name: 'Spectrum Factory', verb: 'blend', family: 'REFRAME', minutes: 2,
    parents: ['Performance / Confidence', 'Identity / Self', 'Beliefs / Evidence'],
    cast: ['patch'], poster: { char: 'patch', mood: 'idea' },
    tagline: 'Black-and-white label? Blend its real colour on a 0-100 spectrum.',
    why: 'For all-or-nothing verdicts: anchor a 0-100 line with real examples, then place what happened.',
    css: `
.g-spectrum-factory { --sf-tagfg: #fff4ff; --sf-tagbg: rgba(20, 12, 30, .72); --sf-shadow: rgba(0, 0, 0, .35); }
.g-spectrum-factory.sf-bright { --sf-tagfg: #2a1838; --sf-tagbg: rgba(255, 255, 255, .86); --sf-shadow: rgba(255, 255, 255, .6); }
.g-spectrum-factory .sf-card { position: absolute; z-index: 26; left: 0; top: 0; width: var(--w, 128px); margin: 0; padding: 0 10px 11px; border: 0; border-radius: 13px; appearance: none; cursor: pointer;
  touch-action: manipulation; text-align: center; transform: translateX(-50%) rotate(-2deg); transform-origin: 50% -18px; font: 700 15px/1.14 var(--font-ui);
  box-shadow: 0 14px 26px rgba(0, 0, 0, .36), inset 0 1px 0 rgba(255, 255, 255, .28); animation: sf-swing 2.8s ease-in-out infinite; }
.g-spectrum-factory .sf-card.is-white { animation-delay: -1.4s; }
.g-spectrum-factory .sf-card::before { content: ""; position: absolute; left: 50%; top: -18px; width: 16px; height: 18px; margin-left: -8px; border: 3px solid #b9b0c8; border-bottom: 0; border-radius: 9px 9px 0 0; }
.g-spectrum-factory .sf-card::after { content: ""; position: absolute; left: 50%; top: 6px; width: 8px; height: 8px; margin-left: -4px; border-radius: 50%; background: rgba(0, 0, 0, .35); box-shadow: inset 0 1px 2px rgba(0, 0, 0, .6); }
.g-spectrum-factory .sf-card small { display: block; margin: 19px 0 6px; font: 700 12px/1 var(--font-ui); letter-spacing: .14em; text-transform: uppercase; opacity: .75; }
.g-spectrum-factory .sf-card .sf-w { display: block; margin: 0 -4px; font: 800 15px/1.14 var(--font-display); letter-spacing: .02em; text-transform: uppercase; text-wrap: balance; overflow-wrap: normal; }
.g-spectrum-factory .sf-card.is-black { background: linear-gradient(180deg, #3d2f4b, #140f1b); color: #fff7ff; }
.g-spectrum-factory .sf-card.is-white { background: linear-gradient(180deg, #ffffff, #e9e2f4); color: #24162f; }
.g-spectrum-factory .sf-card:focus-visible { outline: 3px solid #ffd447; outline-offset: 3px; }
.g-spectrum-factory .sf-card.is-drop { animation: none; pointer-events: none; }
@keyframes sf-swing { 0%, 100% { transform: translateX(-50%) rotate(-2.4deg); } 50% { transform: translateX(-50%) rotate(2.4deg); } }
.g-spectrum-factory .sf-plate { position: absolute; z-index: 22; left: 0; top: 0; width: var(--w, 84px); transform: translate(-50%, -50%); padding: 7px 4px 8px; border-radius: 10px; text-align: center;
  pointer-events: none; opacity: 0; font: 700 15px/1.12 var(--font-ui); text-wrap: balance; overflow-wrap: normal; word-break: normal; }
.g-spectrum-factory .sf-plate.on { opacity: 1; animation: sf-plate .55s cubic-bezier(.2, 1.6, .4, 1) both; }
.g-spectrum-factory .sf-plate.on.pulse { animation: sf-pulse .8s ease-in-out 2; }
.g-spectrum-factory .sf-plate.is-black { background: rgba(8, 5, 12, .7); color: #fff; border: 1.5px solid rgba(255, 255, 255, .3); }
.g-spectrum-factory .sf-plate.is-white { background: rgba(255, 255, 255, .92); color: #24162f; border: 1.5px solid rgba(36, 22, 47, .18); }
@keyframes sf-plate { from { opacity: 0; transform: translate(-50%, -50%) scale(.6); } to { opacity: 1; transform: translate(-50%, -50%); } }
@keyframes sf-pulse { 0%, 100% { transform: translate(-50%, -50%); } 50% { transform: translate(-50%, -50%) scale(1.07); } }
.g-spectrum-factory .sf-scale { position: absolute; z-index: 20; left: 0; top: 0; transform: translate(-50%, -100%); pointer-events: none; padding: 6px 11px; border-radius: 999px; white-space: nowrap;
  font: 700 12px/1 var(--font-ui); letter-spacing: .14em; text-transform: uppercase; color: var(--sf-tagfg); background: var(--sf-tagbg); box-shadow: 0 4px 10px rgba(0, 0, 0, .18); }
.g-spectrum-factory .sf-scale.is-out { opacity: 0; transition: opacity .3s ease; }
.g-spectrum-factory .sf-end { position: absolute; z-index: 21; left: 0; top: 0; transform: translate(-50%, -50%); pointer-events: none; font: 800 12px/1 var(--font-ui); color: #2a1838; letter-spacing: .02em; }
.g-spectrum-factory .sf-alab { position: absolute; z-index: 21; left: 0; top: 0; width: max-content; max-width: var(--mw, 112px); padding: 5px 8px 6px; border-radius: 10px; text-align: center; pointer-events: none;
  font: 600 13px/1.15 var(--font-ui); color: #24162f; background: #fffaf4; border-top: 4px solid var(--c); box-shadow: 0 6px 14px rgba(0, 0, 0, .26);
  opacity: 0; transform: translateY(8px) scale(.85); transition: opacity .25s ease, transform .4s cubic-bezier(.2, 1.5, .4, 1), box-shadow .25s ease; }
.g-spectrum-factory .sf-alab.on { opacity: 1; transform: none; }
.g-spectrum-factory .sf-alab.near { box-shadow: 0 0 0 3px var(--c), 0 8px 18px rgba(0, 0, 0, .32); }
.g-spectrum-factory .sf-tray { position: absolute; z-index: 30; left: 50%; top: 0; transform: translateX(-50%); width: min(calc(100% - 20px), 720px); display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 6px;
  padding: 8px 6px; border-radius: 22px; background: color-mix(in srgb, var(--ui-surface) 94%, transparent); border: 1px solid var(--ui-line); box-shadow: 0 16px 34px rgba(0, 0, 0, .28);
  transition: opacity .35s ease, transform .35s ease; }
.g-spectrum-factory .sf-tray.is-out { opacity: 0; transform: translate(-50%, 24px); pointer-events: none; }
.g-spectrum-factory .sf-tray.is-wait { opacity: .42; pointer-events: none; filter: saturate(.55); }
.g-spectrum-factory .sf-tray.is-wait .sf-blob { animation: none; }
.g-spectrum-factory .sf-tray.is-live { animation: sf-inx .5s cubic-bezier(.2, 1.6, .4, 1) both; }
@keyframes sf-inx { from { transform: translateX(-50%) scale(.85); opacity: .4; } to { transform: translateX(-50%); opacity: 1; } }
.g-spectrum-factory .sf-drop { appearance: none; border: 0; background: none; margin: 0; width: 110px; min-height: 84px; padding: 6px 3px 5px; display: flex; flex-direction: column; align-items: center; gap: 8px;
  cursor: grab; touch-action: none; color: var(--ui-fg); font: 600 13px/1.15 var(--font-ui); text-align: center; border-radius: 14px; transition: opacity .25s ease, background .2s ease; }
.g-spectrum-factory .sf-drop:hover { background: color-mix(in srgb, var(--ui-fg) 7%, transparent); }
.g-spectrum-factory .sf-drop:focus-visible { outline: 2px solid var(--ui-accent); outline-offset: 1px; }
.g-spectrum-factory .sf-blob { position: relative; display: block; width: 34px; height: 34px; margin-top: 6px; border-radius: 0 50% 50% 50%; transform: rotate(45deg); background: var(--c);
  box-shadow: inset -5px -6px 10px rgba(0, 0, 0, .28), 0 6px 12px rgba(0, 0, 0, .3); transition: transform .2s cubic-bezier(.2, 1.6, .4, 1), opacity .2s ease; animation: sf-bob 2.6s ease-in-out infinite; }
.g-spectrum-factory .sf-drop:nth-child(2) .sf-blob { animation-delay: -.5s; } .g-spectrum-factory .sf-drop:nth-child(3) .sf-blob { animation-delay: -1s; }
.g-spectrum-factory .sf-drop:nth-child(4) .sf-blob { animation-delay: -1.5s; } .g-spectrum-factory .sf-drop:nth-child(5) .sf-blob { animation-delay: -2s; }
.g-spectrum-factory .sf-blob::after { content: ""; position: absolute; left: 8px; top: 11px; width: 9px; height: 6px; border-radius: 50%; background: rgba(255, 255, 255, .78); transform: rotate(-45deg); }
@keyframes sf-bob { 0%, 100% { transform: rotate(45deg) translate(0, 0); } 50% { transform: rotate(45deg) translate(-2px, -2px) scale(1.05); } }
.g-spectrum-factory .sf-drop.is-lift .sf-blob { animation: none; transform: rotate(45deg) scale(.45); opacity: .3; }
.g-spectrum-factory .sf-drop.is-used { opacity: .22; pointer-events: none; }
.g-spectrum-factory .sf-drop.is-used .sf-blob { animation: none; transform: rotate(45deg) scale(.6); }
.g-spectrum-factory .sf-ghost { position: absolute; z-index: 40; left: 0; top: 0; transform: translate(-50%, -100%); pointer-events: none; padding: 6px 10px; border-radius: 10px; background: #fffaf4; color: #24162f;
  font: 700 13px/1.15 var(--font-ui); border-top: 4px solid var(--c); box-shadow: 0 10px 22px rgba(0, 0, 0, .35); max-width: 160px; width: max-content; text-align: center; }
.g-spectrum-factory .sf-mixer { position: absolute; z-index: 30; left: 50%; top: 0; transform: translateX(-50%); width: min(calc(100% - 24px), 620px); display: flex; flex-direction: column; gap: 8px; transition: opacity .35s ease; }
.g-spectrum-factory .sf-mixer.is-out { opacity: 0; pointer-events: none; }
.g-spectrum-factory .sf-mixer.is-wide { width: min(calc(100% - 48px), 820px); display: grid; grid-template-columns: 1fr 230px; grid-template-areas: "read read" "track print" "ends ."; column-gap: 16px; row-gap: 8px; }
.g-spectrum-factory .sf-mixer.is-wide .sf-read { grid-area: read; } .g-spectrum-factory .sf-mixer.is-wide .sf-track { grid-area: track; } .g-spectrum-factory .sf-mixer.is-wide .sf-ends { grid-area: ends; }
.g-spectrum-factory .sf-mixer.is-wide .sf-print { grid-area: print; margin-top: 0; height: 60px; }
.g-spectrum-factory .sf-read { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 38px; color: var(--ui-fg); }
.g-spectrum-factory .sf-num { font: 800 34px/1 var(--font-display); font-variant-numeric: tabular-nums; min-width: 2ch; text-align: right; text-shadow: 0 2px 0 var(--sf-shadow); }
.g-spectrum-factory .sf-of { font: 700 15px/1 var(--font-ui); opacity: .78; }
.g-spectrum-factory .sf-near { font: 600 14px/1.2 var(--font-ui); padding: 6px 11px; border-radius: 999px; background: color-mix(in srgb, var(--ui-surface) 84%, transparent); border: 1px solid var(--ui-line); border-left: 5px solid var(--c, transparent); }
.g-spectrum-factory .sf-track { position: relative; height: 60px; border-radius: 30px; touch-action: none; cursor: grab; border: 3px solid #fff; box-shadow: inset 0 4px 10px rgba(0, 0, 0, .45), 0 10px 22px rgba(0, 0, 0, .3); }
.g-spectrum-factory .sf-track:focus-visible { outline: 3px solid var(--ui-accent); outline-offset: 3px; }
.g-spectrum-factory .sf-knob { position: absolute; left: 0; top: 50%; width: 58px; height: 58px; margin: -29px 0 0 -29px; border-radius: 50%; border: 4px solid #fff; background: var(--c, #141019); pointer-events: none;
  box-shadow: 0 8px 16px rgba(0, 0, 0, .45), inset 0 -6px 10px rgba(0, 0, 0, .25); transform: translateX(var(--x, 29px)) scale(var(--s, 1)); transition: transform .12s cubic-bezier(.2, 1.6, .4, 1); }
.g-spectrum-factory .sf-knob::before { content: ""; position: absolute; left: 50%; top: 50%; width: 8px; height: 30px; margin: -15px 0 0 -4px; border-radius: 4px; background: rgba(255, 255, 255, .92); transform: rotate(var(--r, 0deg)); box-shadow: 0 0 0 2px rgba(0, 0, 0, .15); }
.g-spectrum-factory .sf-knob::after { content: ""; position: absolute; left: 9px; top: 7px; width: 14px; height: 9px; border-radius: 50%; background: rgba(255, 255, 255, .55); }
.g-spectrum-factory .sf-ends { display: flex; justify-content: space-between; padding: 0 8px; font: 700 12px/1 var(--font-ui); letter-spacing: .08em; text-transform: uppercase; color: var(--ui-fg); opacity: .8; }
.g-spectrum-factory .sf-print { position: relative; overflow: hidden; height: 58px; margin-top: 4px; border: 0; border-radius: 29px; appearance: none; cursor: pointer; touch-action: none; color: #fff;
  font: 800 19px/1 var(--font-display); letter-spacing: .1em; background: linear-gradient(180deg, #ff7cb8, #e0407b); box-shadow: 0 6px 0 #9d2356, 0 16px 28px rgba(0, 0, 0, .32); transition: transform .1s ease, box-shadow .1s ease; }
.g-spectrum-factory .sf-print i { position: absolute; inset: 0; transform-origin: 0 50%; transform: scaleX(var(--k, 0)); background: linear-gradient(90deg, #ffd447, #58d68d, #36b9f0); opacity: .6; }
.g-spectrum-factory .sf-print span { position: relative; text-shadow: 0 2px 0 rgba(120, 20, 60, .45); }
.g-spectrum-factory .sf-print.is-down { transform: translateY(4px); box-shadow: 0 2px 0 #9d2356, 0 8px 16px rgba(0, 0, 0, .3); }
.g-spectrum-factory .sf-print.is-new { animation: sf-in .5s cubic-bezier(.2, 1.6, .4, 1) backwards; }
.g-spectrum-factory .sf-print:focus-visible { outline: 3px solid #ffd447; outline-offset: 3px; }
@keyframes sf-in { from { transform: scale(.6); opacity: 0; } to { transform: none; opacity: 1; } }
.g-spectrum-factory .sf-you { position: absolute; z-index: 23; left: 0; top: 0; transform: translate(-50%, -100%); pointer-events: none; padding: 5px 9px 6px; border-radius: 10px; font: 800 14px/1 var(--font-ui);
  color: #24162f; background: #fff; box-shadow: 0 6px 14px rgba(0, 0, 0, .3); white-space: nowrap; border-bottom: 4px solid var(--c, #fff); }
.g-spectrum-factory .sf-label { position: absolute; z-index: 36; left: 50%; top: 0; width: min(calc(100% - 40px), 330px); transform-origin: 50% 0; transform: translateX(-50%) scaleY(.05); opacity: 0; pointer-events: none;
  padding: 14px 16px 15px; border-radius: 4px 4px 16px 16px; text-align: center; color: #24162f; background: linear-gradient(180deg, #fffdf8, #fff3e6); box-shadow: 0 18px 36px rgba(0, 0, 0, .42);
  transition: transform .7s cubic-bezier(.2, 1.25, .3, 1), opacity .2s ease; }
.g-spectrum-factory .sf-label::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 7px; border-radius: 4px 4px 0 0; background: var(--sf-grad); }
.g-spectrum-factory .sf-label.on { transform: translateX(-50%); opacity: 1; }
.g-spectrum-factory .sf-label.off { opacity: 0; transform: translateX(-50%) translateY(26px) scale(.92); transition: opacity .45s ease, transform .45s ease; }
.g-spectrum-factory .sf-label small { display: block; margin-top: 2px; font: 700 12px/1 var(--font-ui); letter-spacing: .18em; text-transform: uppercase; color: #8c6aa3; }
.g-spectrum-factory .sf-label b { display: block; margin: 7px 0 3px; font: 800 32px/1 var(--font-display); }
.g-spectrum-factory .sf-label em { display: block; font: 700 16px/1.2 var(--font-ui); font-style: normal; }
.g-spectrum-factory .sf-label p { margin-top: 8px; font: 500 15px/1.32 var(--font-ui); color: #3b2a48; min-height: 1.3em; }
.g-spectrum-factory .sf-label .sf-next { margin-top: 9px; padding-top: 9px; border-top: 1px dashed rgba(36, 22, 47, .3); font-weight: 600; color: #24162f; }
.g-spectrum-factory .sf-banner { position: absolute; z-index: 34; left: 50%; top: 0; transform: translate(-50%, -50%); pointer-events: none; padding: 9px 20px 11px; border-radius: 14px; background: #fffdf8; color: #24162f;
  text-align: center; box-shadow: 0 8px 22px rgba(0, 0, 0, .32), inset 0 0 0 2px rgba(36, 22, 47, .08); width: max-content; max-width: calc(100% - 48px); }
.g-spectrum-factory .sf-banner:not(.on) { visibility: hidden; }
.g-spectrum-factory .sf-banner.on { animation: sf-sticker .55s cubic-bezier(.2, 1.6, .4, 1) both; }
@keyframes sf-sticker { from { transform: translate(-50%, -50%) scale(.4) rotate(-6deg); } to { transform: translate(-50%, -50%); } }
.g-spectrum-factory .sf-banner b { display: block; font: 800 32px/1 var(--font-display); letter-spacing: .02em; }
.g-spectrum-factory .sf-banner span { display: block; margin-top: 4px; font: 700 15px/1.2 var(--font-ui); letter-spacing: .07em; text-transform: uppercase; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const inten = ctx.intensity;
      const clamp = K.clamp, lerp = K.lerp, TAU = K.TAU;
      const RM = () => K.reduced();
      const visits = K.visits();

      /* ---------------- colour: black -> candy spectrum -> white ---------------- */
      const STOPS = [[0, '#141019'], [7, '#4b2468'], [20, '#d9367a'], [35, '#ff6b4a'], [50, '#ffb238'], [62, '#f2df4a'], [73, '#58d68d'], [84, '#36b9f0'], [93, '#b7a4ff'], [100, '#fbf8ff']];
      const hexRGB = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
      const SPEC = STOPS.map(([v, c]) => [v, hexRGB(c)]);
      function spec(v) {
        v = clamp(v, 0, 100);
        for (let i = 1; i < SPEC.length; i++) if (v <= SPEC[i][0]) { const a = SPEC[i - 1], b = SPEC[i], k = (v - a[0]) / (b[0] - a[0]); return [a[1][0] + (b[1][0] - a[1][0]) * k, a[1][1] + (b[1][1] - a[1][1]) * k, a[1][2] + (b[1][2] - a[1][2]) * k]; }
        return SPEC[SPEC.length - 1][1];
      }
      const rgb = (c, a) => a == null ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
      const specCSS = (v, a) => rgb(spec(v), a);
      const GRAD = 'linear-gradient(90deg,' + STOPS.map(([v, c]) => c + ' ' + v + '%').join(',') + ')';
      const SWATCH = [[8, 'Midnight'], [17, 'Plum Jam'], [26, 'Raspberry'], [35, 'Flamingo'], [44, 'Tangerine'], [52, 'Marmalade'], [60, 'Lemon Drop'], [68, 'Mint Julep'], [77, 'Lagoon'], [85, 'Sky Pop'], [93, 'Lavender'], [101, 'Cloud']];
      const swatchOf = (v) => (SWATCH.find(s => v < s[0]) || SWATCH[SWATCH.length - 1])[1];
      const swatchV = (name) => { const i = SWATCH.findIndex(s => s[1] === name); return i < 0 ? null : (i === 0 ? 4 : (SWATCH[i - 1][0] + Math.min(100, SWATCH[i][0])) / 2); };

      /* ---------------- today's shift (daily variant) ---------------- */
      const SHIFTS = [
        { id: 'dawn', name: 'Dawn shift', skyD: ['#2a2352', '#ff8fa3'], skyB: ['#ffe1cf', '#ffb9cc'], glow: '#ffb3c6' },
        { id: 'noon', name: 'Noon shift', skyD: ['#173a6b', '#46b8e8'], skyB: ['#bfe7ff', '#eef9ff'], glow: '#bfe9ff' },
        { id: 'dusk', name: 'Dusk shift', skyD: ['#2b1846', '#ff7a45'], skyB: ['#ffcfae', '#ffa3bd'], glow: '#ffb27a' },
        { id: 'night', name: 'Night shift', skyD: ['#0a1030', '#2d3277'], skyB: ['#cdd7ff', '#eef0ff'], glow: '#9fb4ff' }
      ];
      const SHIFT = K.dailyPick(SHIFTS);
      const PATTERN = K.dailyPick(['stripe', 'dots', 'star', 'zig'], 3);

      /* ---------------- the player's words -> labels and anchors ---------------- */
      const GENERIC = { scale: 'How it really went', anchors: [['Didn’t try at all', 4], ['Tried and stumbled', 27], ['Did okay with a slip', 50], ['Did well', 73], ['Flawless', 96]] };
      const DOMAINS = [
        { re: /\b(presentation|present\w*|speech|talk|pitch|interview|lecture|recital|gig|stage|froze|blanked|stumbled|lost my place)\b/i, scale: 'How it really went',
          anchors: [['Didn’t show up at all', 4], ['Froze and walked off', 27], ['Lost my place, kept going', 50], ['Good talk, one wobble', 73], ['Flawless, start to end', 96]] },
        { re: /\b(exam|test|grade|marks?|assignment|essay|uni|school|course|module|quiz|teacher)\b/i, scale: 'How it really went',
          anchors: [['Didn’t sit it at all', 4], ['Failed, resit needed', 27], ['Passed with some gaps', 50], ['Good mark, few slips', 73], ['Full marks, every time', 96]] },
        { re: /\b(boss|manager|job|work|meeting|deadline|colleague|client|promotion|fired|sacked|project|review|team)\b/i, scale: 'How work is really going',
          anchors: [['Stopped turning up', 4], ['Struggling most weeks', 27], ['Mostly fine, some slips', 50], ['Solid, a few wobbles', 73], ['Never a single mistake', 96]] },
        { re: /\b(partner|boyfriend|girlfriend|husband|wife|bf|gf|fianc\w*|date|dating|relationship)\b/i, scale: 'How things really are',
          anchors: [['Packing their bags', 4], ['Distant for weeks', 27], ['One quiet evening', 50], ['Close, tired lately', 73], ['Never a quiet moment', 96]] },
        { re: /\b(mum|mom|dad|mother|father|sister|brother|family|parents?|aunt|uncle|grandma|grandpa)\b/i, scale: 'How things really are',
          anchors: [['Not speaking at all', 4], ['Rows every visit', 27], ['One clumsy comment', 50], ['Warm, some friction', 73], ['Never a cross word', 96]] },
        { re: /\b(rent|landlord|lease|bill|bills|debt|money|bank|loan|mortgage|evict\w*|flat)\b/i, scale: 'Where this really sits',
          anchors: [['No options at all', 4], ['Big hit, few options', 27], ['Real cost, some options', 50], ['Admin, then sorted', 73], ['Zero hassle, ever', 96]] },
        { re: /\b(text|texted|message|messaged|reply|replied|read|seen|ignor\w*|ghost\w*|friend|mate)\b/i, scale: 'How things really are',
          anchors: [['Cut me off for good', 4], ['A real falling-out', 27], ['Slow reply, busy day', 50], ['Close, just busy lives', 73], ['Instant replies, always', 96]] }
      ];
      const trimEnd = (s) => String(s || '').replace(/[\s.!?…,;:]+$/, '').trim();
      let DOMN = GENERIC, VERDICT = 'Total failure', ANCH = [];
      const care = () => an.safety === 'care';
      const serious = () => an.fear_support === 'strong' || an.fear_support === 'some' || care();
      function verdictOf() {
        const ds = Array.isArray(an.distortions) ? an.distortions : [];
        const lab = ds.find(d => d && d.type === 'labelling' && trimEnd(d.quote));
        if (lab) return K.words(trimEnd(lab.quote), 6);
        const aon = ds.find(d => d && d.type === 'all_or_nothing' && trimEnd(d.quote).split(/\s+/).length >= 2 && /fail|perfect|ruin|useless|disaster|worst|hopeless|complete|total/i.test(d.quote));
        if (aon) return K.words(trimEnd(aon.quote), 6);
        const th = trimEnd(an.thought || an.conclusion);
        return th ? K.words(th, 7) : 'Total failure';
      }
      function lead() { const ls = Array.isArray(an.leads) ? an.leads : []; return ls.find(l => l && l.kind === 'prepare') || ls.find(l => l && l.kind === 'ask') || ls[0] || null; }
      function buildTexts() {
        const txt = [ctx.text, an.situation, an.thought, an.conclusion].join(' ');
        DOMN = DOMAINS.find(d => d.re.test(txt)) || GENERIC;
        VERDICT = verdictOf();
        ANCH = DOMN.anchors.map(([t, v], i) => ({ i, t, v, placed: false, at: v, drop: v, acc: 0, shown: 0, fly: null, slide: null, row: i % 2 }));
      }
      buildTexts();

      /* ---------------- scene ---------------- */
      el.classList.add(K.dark() ? 'sf-dark' : 'sf-bright');
      el.style.setProperty('--sf-grad', GRAD);
      const DPR = (el.clientWidth || 390) < 700 ? 1.5 : 2;
      const cv = K.canvas(el, { maxDpr: DPR });
      const bgCv = K.canvas(el, { maxDpr: DPR, before: true }); // the static factory: painted on resize only
      const P = K.particles({ max: inten === 2 ? 700 : 480 });
      const STRIP_W = 512;
      const COL = document.createElement('canvas'), GREY = document.createElement('canvas');
      COL.width = GREY.width = STRIP_W; COL.height = GREY.height = 4;
      (() => {
        const g1 = COL.getContext('2d'), g2 = GREY.getContext('2d');
        const a = g1.createLinearGradient(0, 0, STRIP_W, 0); STOPS.forEach(([v, c]) => a.addColorStop(v / 100, c)); g1.fillStyle = a; g1.fillRect(0, 0, STRIP_W, 4);
        const b = g2.createLinearGradient(0, 0, STRIP_W, 0); b.addColorStop(0, '#141019'); b.addColorStop(0.12, '#2b2731'); b.addColorStop(0.5, '#77727f'); b.addColorStop(0.88, '#cfcbd6'); b.addColorStop(1, '#fbf8ff');
        g2.fillStyle = b; g2.fillRect(0, 0, STRIP_W, 4);
      })();

      const G = {
        stage: 'intro', power: 0, powerT: 0, flood: 0, floodT: -1, dropped: { black: false, white: false }, drag: null, busy: false,
        v: 0, vs: 0, vel: 0, blending: false, moved: false, ready: false, printK: 0, stamp: 0, shake: 0, flash: 0, tinOn: 0, tinsK: 1, beltOff: 0, beltSpeed: 0,
        rings: [], vatRip: { L: 0, R: 0 }, banner: null, puffs: false, lastIB: -1, lastTick: 0, pour: 0, light: [1, 0.9, 0.82], placed: 0, lastRange: -1
      };

      const cardB = h('button', { type: 'button', class: 'sf-card is-black', 'aria-label': 'Drop your black-and-white label into the black vat' }, h('small', { text: 'Black vat' }), h('span', { class: 'sf-w gk-user', text: VERDICT }));
      const cardW = h('button', { type: 'button', class: 'sf-card is-white', 'aria-label': 'Drop the opposite label into the white vat' }, h('small', { text: 'White vat' }), h('span', { class: 'sf-w', text: 'Perfect' }));
      const plateB = h('div', { class: 'sf-plate is-black' }, h('span', { class: 'gk-user', text: VERDICT }));
      const plateW = h('div', { class: 'sf-plate is-white' }, h('span', { text: 'Perfect' }));
      const scaleTag = h('div', { class: 'sf-scale', text: DOMN.scale });
      const end0 = h('div', { class: 'sf-end', text: '0' }), end100 = h('div', { class: 'sf-end', text: '100' });
      const tray = h('div', { class: 'sf-tray is-wait', role: 'group', 'aria-label': 'Paint drops to place on the spectrum' });
      const ghost = h('div', { class: 'sf-ghost', hidden: true });
      const you = h('div', { class: 'sf-you', hidden: true, text: 'Today · 0' });
      const num = h('b', { class: 'sf-num', text: '0' }), nearEl = h('span', { class: 'sf-near', text: 'Slide to blend' });
      const knob = h('i', { class: 'sf-knob' });
      const track = h('div', { class: 'sf-track', role: 'slider', tabindex: '0', 'aria-label': 'Blend today from 0 to 100', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0', style: { background: GRAD } }, knob);
      const printBtn = h('button', { type: 'button', class: 'sf-print', hidden: true, 'aria-label': 'Hold to print the new label' }, h('i'), h('span', { text: 'HOLD TO PRINT' }));
      const mixer = h('div', { class: 'sf-mixer is-out', hidden: true }, h('div', { class: 'sf-read' }, num, h('span', { class: 'sf-of', text: '/ 100' }), nearEl), track,
        h('div', { class: 'sf-ends' }, h('span', { text: '0 · black' }), h('span', { text: 'white · 100' })), printBtn);
      const label = h('div', { class: 'sf-label', role: 'status', 'aria-live': 'polite' });
      const banner = h('div', { class: 'sf-banner', hidden: true });
      el.append(cardB, cardW, plateB, plateW, scaleTag, end0, end100, tray, ghost, you, mixer, label, banner);

      function buildTray() {
        tray.innerHTML = '';
        el.querySelectorAll('.sf-alab').forEach(x => x.remove());
        let order = K.shuffle(ANCH, K.rng(K.daily() + 11));
        if (order.every((a, i) => a.i === i)) order = order.slice(2).concat(order.slice(0, 2));
        order.forEach(a => {
          a.chip = h('button', { type: 'button', class: 'sf-drop', 'aria-label': 'Paint drop: ' + a.t + '. Drag it onto the spectrum tube.' }, h('i', { class: 'sf-blob', style: { '--c': specCSS(a.v) } }), h('span', { text: a.t }));
          a.lab = h('div', { class: 'sf-alab', style: { '--c': specCSS(a.v) }, text: a.t });
          tray.append(a.chip); el.append(a.lab);
          K.drag(a.chip, { space: el, start: (p, e) => grab(a, p, e), move: (p, d) => dragMove(a, p, d), end: (p, d) => dropIt(a, p, d) });
          a.chip.addEventListener('click', (e) => { if (e.detail === 0 && G.stage === 'anchor' && !a.placed && !G.drag) land(a, tubeX(a.v), L.tubeY - 60, true); });
        });
      }
      buildTray();

      const patch = K.character('patch', { side: 'right', mood: 'worried', x: 12, y: 500 });
      const LN = lines();
      // care topics (health, money, housing, legal): no jokes, so the Cheeky vibe borrows the gentler wording
      function say(o, so) { if (care() && o && o.Jolly) o = Object.assign({}, o, { Cheeky: o.Jolly }); return patch.say(ctx.line(o), Object.assign({ ms: 4200 }, so || {})); }

      /* ---------------- layout ---------------- */
      const L = { W: 390, H: 844, ph: true };
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return false;
        const ph = W < 700;
        L.W = W; L.H = H; L.ph = ph;
        L.C = Math.min(W - (ph ? 24 : 120), 1000);
        L.x0 = (W - L.C) / 2; L.x1 = L.x0 + L.C;
        L.rail = ph ? 66 : 72;
        L.cardW = ph ? 130 : 196;
        L.vatW = ph ? 100 : 178; L.vatH = ph ? 108 : 134;
        L.vatTop = ph ? 206 : 206; L.vatBot = L.vatTop + L.vatH;
        L.vatLX = L.x0 + L.vatW / 2 + (ph ? 0 : 18); L.vatRX = L.x1 - L.vatW / 2 - (ph ? 0 : 18);
        L.prW = ph ? 112 : 206; L.prX = W / 2; L.prTop = ph ? 128 : 118; L.prBot = L.vatBot - 2;
        L.chimTop = ph ? 70 : 74;
        L.tubeH = ph ? 30 : 40; L.tubeY = L.vatBot + (ph ? 40 : 48);
        L.tx0 = L.x0 + 4; L.tx1 = L.x1 - 4; L.cap = ph ? 30 : 36;
        L.vx0 = L.tx0 + L.cap; L.vx1 = L.tx1 - L.cap; L.vw = L.vx1 - L.vx0;
        L.rowB = L.tubeY + L.tubeH / 2 + 12; L.rowC = L.rowB + 44;
        L.labW = ph ? 112 : 200;
        L.beltY = L.rowC + (ph ? 90 : 84);
        L.tinS = ph ? 1 : 1.2;
        L.patchSz = ph ? 84 : 104;
        L.patchY = L.beltY + (ph ? 14 : 16);
        L.ctrlTop = L.patchY + L.patchSz + (ph ? 6 : 2);
        L.bannerH = ph ? 108 : 120; L.bannerY = Math.round((L.beltY + 24 + (H - L.patchSz - 18)) / 2);
        return true;
      }
      const tubeX = (v) => L.vx0 + clamp(v, 0, 100) / 100 * L.vw;
      const tubeV = (x) => clamp((x - L.vx0) / L.vw * 100, 0, 100);
      function pos(node, x, y) {
        const xs = x.toFixed(1), ys = y.toFixed(1);
        if (node._px === xs && node._py === ys) return; // skip unchanged writes: no style or layout work
        node._px = xs; node._py = ys; node.style.left = xs + 'px'; node.style.top = ys + 'px';
      }
      function placeLab(a) {
        const w = a.lab.offsetWidth || L.labW, x = clamp(tubeX(a.at), 8 + w / 2, L.W - 8 - w / 2);
        pos(a.lab, x - w / 2, a.row ? L.rowC : L.rowB);
        a.labX = x;
      }
      function place() {
        if (!layout()) return;
        paintBG(); buildTins();
        cardB.style.setProperty('--w', L.cardW + 'px'); cardW.style.setProperty('--w', L.cardW + 'px');
        pos(cardB, L.vatLX, L.rail + 16); pos(cardW, L.vatRX, L.rail + 16);
        plateB.style.setProperty('--w', (L.vatW - (L.ph ? 2 : 14)) + 'px'); plateW.style.setProperty('--w', (L.vatW - (L.ph ? 2 : 14)) + 'px');
        pos(plateB, L.vatLX, L.vatTop + L.vatH * 0.57); pos(plateW, L.vatRX, L.vatTop + L.vatH * 0.57);
        pos(scaleTag, L.W / 2, L.tubeY - L.tubeH / 2 - 8);
        pos(end0, L.tx0 + L.cap / 2 + 1, L.tubeY); pos(end100, L.tx1 - L.cap / 2 - 1, L.tubeY);
        ANCH.forEach(a => { a.lab.style.setProperty('--mw', L.labW + 'px'); placeLab(a); });
        tray.style.top = L.ctrlTop + 'px'; mixer.style.top = (L.ctrlTop - 4) + 'px'; mixer.classList.toggle('is-wide', !L.ph);
        label.style.top = (L.prBot - 6) + 'px';
        banner.style.top = L.bannerY + 'px';
        L.trayTop = L.ctrlTop;
        patch.place(L.ph ? 10 : L.x0, G.stage === 'end' ? L.H - L.patchSz - 18 : L.patchY);
        setKnob();
      }

      /* ---------------- static backdrop (repainted on resize / theme) ---------------- */
      function rr(g, x, y, w, hh, r) { r = Math.min(r, w / 2, hh / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      function chrome(g, x0, y0, x1, y1, dark) {
        const gr = g.createLinearGradient(x0, y0, x1, y1);
        gr.addColorStop(0, dark ? '#7d7590' : '#e9e4f2'); gr.addColorStop(0.45, dark ? '#d8d2e6' : '#ffffff'); gr.addColorStop(0.55, dark ? '#a59cb8' : '#d6cfe3'); gr.addColorStop(1, dark ? '#5d556e' : '#b6adc6');
        return gr;
      }
      function paintBG() {
        const W = L.W, H = L.H, dpr = cv.dpr || 1, dark = K.dark();
        bgCv.fit(); if (!bgCv.g) return;
        const g = bgCv.g; g.setTransform(bgCv.dpr, 0, 0, bgCv.dpr, 0, 0); g.clearRect(0, 0, W, H); void dpr;
        let gr = g.createLinearGradient(0, 0, 0, H);
        if (dark) { gr.addColorStop(0, '#1b1333'); gr.addColorStop(0.45, '#261a47'); gr.addColorStop(1, '#130d24'); }
        else { gr.addColorStop(0, '#fbf6ff'); gr.addColorStop(0.45, '#f3eafc'); gr.addColorStop(1, '#e9ddf6'); }
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        // tall factory windows with today's sky
        const sky = dark ? SHIFT.skyD : SHIFT.skyB;
        const wins = L.ph ? [[W * 0.27, W * 0.36], [W * 0.73, W * 0.36]] : [[L.x0 + L.C * 0.27, Math.min(230, L.C * 0.21)], [L.x0 + L.C * 0.73, Math.min(230, L.C * 0.21)]];
        if (!L.ph && L.x0 > 110) { const ow = Math.min(170, L.x0 - 36); wins.push([L.x0 / 2, ow], [W - L.x0 / 2, ow]); }
        const wy0 = 46, wy1 = L.vatBot - 20;
        wins.forEach(([cx, ww], wi) => {
          const x = cx - ww / 2;
          g.save();
          g.beginPath(); g.moveTo(x, wy1); g.lineTo(x, wy0 + ww / 2); g.arc(cx, wy0 + ww / 2, ww / 2, Math.PI, 0); g.lineTo(x + ww, wy1); g.closePath();
          const sg = g.createLinearGradient(0, wy0, 0, wy1); sg.addColorStop(0, sky[0]); sg.addColorStop(1, sky[1]);
          g.fillStyle = sg; g.fill(); g.clip();
          // distant rooftops and stacks
          g.fillStyle = dark ? 'rgba(10,6,24,0.55)' : 'rgba(120,80,150,0.3)';
          for (let i = 0; i < 6; i++) { const bx = x + i * ww / 5 - 10 + (wi * 17) % 23, bh = 30 + ((i * 37 + wi * 13) % 50); g.fillRect(bx, wy1 - bh, ww / 5 - 4, bh); }
          g.fillRect(x + ww * 0.62, wy1 - 120, 10, 120);
          if (SHIFT.id === 'night' || dark) { g.fillStyle = dark ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)'; for (let i = 0; i < 18; i++) g.fillRect(x + ((i * 53 + wi * 31) % ww), wy0 + ((i * 29) % (wy1 - wy0 - 90)), 1.6, 1.6); }
          else { g.fillStyle = 'rgba(255,255,255,0.75)'; [[0.3, 0.32], [0.7, 0.48]].forEach(([fx, fy]) => { const cx2 = x + ww * fx, cy2 = wy0 + (wy1 - wy0) * fy; g.beginPath(); g.ellipse(cx2, cy2, 22, 8, 0, 0, TAU); g.ellipse(cx2 + 14, cy2 - 5, 14, 8, 0, 0, TAU); g.fill(); }); }
          g.restore();
          // frame and mullions
          g.strokeStyle = dark ? '#3c2f5c' : '#b99cc9'; g.lineWidth = 6;
          g.beginPath(); g.moveTo(x, wy1); g.lineTo(x, wy0 + ww / 2); g.arc(cx, wy0 + ww / 2, ww / 2, Math.PI, 0); g.lineTo(x + ww, wy1); g.stroke();
          g.lineWidth = 3; g.beginPath(); g.moveTo(cx, wy0); g.lineTo(cx, wy1);
          for (let yy = wy0 + ww / 2; yy < wy1; yy += 44) { g.moveTo(x, yy); g.lineTo(x + ww, yy); }
          g.stroke();
        });
        // soft lamp light cones from the ceiling
        g.save(); g.globalCompositeOperation = dark ? 'lighter' : 'source-over';
        (L.ph ? [W * 0.5] : [L.x0 + L.C * 0.2, W * 0.5, L.x0 + L.C * 0.8]).forEach(cx => {
          const lg = g.createRadialGradient(cx, 30, 10, cx, 30, H * 0.62);
          lg.addColorStop(0, dark ? 'rgba(255,214,170,0.16)' : 'rgba(255,255,255,0.3)'); lg.addColorStop(1, 'rgba(255,214,170,0)');
          g.fillStyle = lg; g.fillRect(0, 0, W, H);
        });
        g.restore();
        // lower wall tiles
        const wy = L.tubeY - L.tubeH / 2 - 18;
        g.fillStyle = dark ? 'rgba(255,255,255,0.035)' : 'rgba(110,70,150,0.06)';
        for (let y = wy, r = 0; y < L.beltY; y += 24, r++) for (let x = (r % 2) * -24; x < W; x += 48) { rr(g, x + 2, y + 2, 44, 20, 5); g.fill(); }
        g.fillStyle = dark ? 'rgba(0,0,0,0.25)' : 'rgba(120,60,80,0.08)'; g.fillRect(0, wy - 3, W, 3);
        // floor
        const fy = L.beltY + 22;
        gr = g.createLinearGradient(0, fy, 0, H);
        gr.addColorStop(0, dark ? '#2a2040' : '#ddcdea'); gr.addColorStop(1, dark ? '#120c1f' : '#c8b2db');
        g.fillStyle = gr; g.fillRect(0, fy, W, H - fy);
        g.strokeStyle = dark ? 'rgba(255,255,255,0.05)' : 'rgba(80,50,110,0.1)'; g.lineWidth = 1;
        g.beginPath(); for (let i = -12; i <= 12; i++) { g.moveTo(W / 2 + i * 40, fy); g.lineTo(W / 2 + i * 160, H); } for (let y = fy + 18, s = 18; y < H; s *= 1.25, y += s) { g.moveTo(0, y); g.lineTo(W, y); } g.stroke();
        // stacks of finished tins on the factory floor
        const stack = (sx, n, dir) => { const s2 = L.tinS * 0.72; let i = 0; for (let row = 0; row < n; row++) for (let c = 0; c < n - row; c++, i++) { const tn = { c: TIN_COLS[(i * 3 + row) % TIN_COLS.length], pat: ['stripe', 'dots', 'star', 'zig'][i % 4] }; drawTin(g, sx + dir * (c * 27 * s2 + row * 13.5 * s2), H - 14 - row * 33 * s2, s2, tn.c, tn.pat, 0); } };
        stack(W - 22, L.ph ? 3 : 4, -1);
        if (!L.ph) stack(22, 4, 1);
        // safety stripe along the floor edge
        g.save(); g.beginPath(); g.rect(0, fy, W, 7); g.clip(); g.fillStyle = '#ffd447'; g.fillRect(0, fy, W, 7); g.fillStyle = '#2a1838';
        for (let x = -20; x < W + 20; x += 22) { g.beginPath(); g.moveTo(x, fy + 7); g.lineTo(x + 8, fy); g.lineTo(x + 16, fy); g.lineTo(x + 8, fy + 7); g.closePath(); g.fill(); }
        g.restore();
        // crane rail
        g.fillStyle = chrome(g, 0, L.rail - 6, 0, L.rail + 4, dark); g.fillRect(0, L.rail - 6, W, 10);
        g.fillStyle = dark ? 'rgba(0,0,0,0.35)' : 'rgba(80,40,60,0.18)'; g.fillRect(0, L.rail + 4, W, 3);
        for (let x = 14; x < W; x += 46) { g.fillStyle = dark ? '#4a4060' : '#cfc6dc'; g.beginPath(); g.arc(x, L.rail - 1, 2.2, 0, TAU); g.fill(); }
        // pipes on the back wall linking vats to the press
        const py = L.vatTop + L.vatH * 0.32;
        pipe(g, L.vatLX + L.vatW / 2 - 4, py, L.prX - L.prW / 2 + 4, py, '#4fd1a8', dark);
        pipe(g, L.prX + L.prW / 2 - 4, py + 14, L.vatRX - L.vatW / 2 + 4, py + 14, '#ffd447', dark);
        // feeder pipes from vats down into the tube end caps
        feeder(g, L.vatLX, L.tx0 + L.cap * 0.5, '#3a3046', dark);
        feeder(g, L.vatRX, L.tx1 - L.cap * 0.5, '#e6e0f0', dark);
        // press chimneys, body, vats, belt
        pressBody(g, dark);
        vatBody(g, L.vatLX, true, dark); vatBody(g, L.vatRX, false, dark);
        tubeFrame(g, dark);
        beltFrame(g, dark);
        // vignette
        const vg = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.45, Math.max(W, H) * 0.75);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, dark ? 'rgba(4,2,10,0.5)' : 'rgba(90,40,50,0.14)');
        g.fillStyle = vg; g.fillRect(0, 0, W, H);
      }
      function pipe(g, x0, y, x1, y1, col, dark) {
        const r = L.ph ? 6 : 8;
        const gr = g.createLinearGradient(0, y - r, 0, y + r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, col); gr.addColorStop(1, shade(col, -0.35));
        g.fillStyle = gr; g.fillRect(Math.min(x0, x1), y - r, Math.abs(x1 - x0), r * 2);
        g.fillStyle = shade(col, -0.25);
        [0.2, 0.8].forEach(f => { const x = x0 + (x1 - x0) * f; g.fillRect(x - 4, y - r - 2, 8, r * 2 + 4); });
        void y1; void dark;
      }
      function feeder(g, fromX, toX, col, dark) {
        const r = L.ph ? 7 : 9, y0 = L.vatBot - 6, yb = L.tubeY - L.tubeH / 2 - 16;
        const gr = g.createLinearGradient(fromX - r, 0, fromX + r, 0); gr.addColorStop(0, shade(col, -0.3)); gr.addColorStop(0.35, shade(col, 0.35)); gr.addColorStop(1, shade(col, -0.4));
        g.fillStyle = gr; g.fillRect(fromX - r, y0, r * 2, yb - y0 + r);
        const gr2 = g.createLinearGradient(0, yb - r, 0, yb + r); gr2.addColorStop(0, shade(col, 0.35)); gr2.addColorStop(1, shade(col, -0.4));
        g.fillStyle = gr2; g.fillRect(Math.min(fromX, toX) - r, yb - r, Math.abs(fromX - toX) + r * 2, r * 2);
        const gr3 = g.createLinearGradient(toX - r, 0, toX + r, 0); gr3.addColorStop(0, shade(col, -0.3)); gr3.addColorStop(0.35, shade(col, 0.35)); gr3.addColorStop(1, shade(col, -0.4));
        g.fillStyle = gr3; g.fillRect(toX - r, yb, r * 2, L.tubeY - yb);
        g.fillStyle = chrome(g, 0, yb - r - 3, 0, yb + r + 3, dark);
        [fromX, toX].forEach(x => g.fillRect(x - r - 3, yb - r - 3, r * 2 + 6, 5));
      }
      function shade(hex, k) {
        const c = hexRGB(hex); const f = (x) => clamp(Math.round(k >= 0 ? x + (255 - x) * k : x * (1 + k)), 0, 255);
        return `rgb(${f(c[0])},${f(c[1])},${f(c[2])})`;
      }
      function vatBody(g, cx, black, dark) {
        const w = L.vatW, top = L.vatTop, hh = L.vatH, x = cx - w / 2, ry = L.ph ? 10 : 13;
        // legs + shadow
        g.fillStyle = dark ? 'rgba(0,0,0,0.4)' : 'rgba(90,40,60,0.18)'; g.beginPath(); g.ellipse(cx, top + hh + 6, w * 0.55, 8, 0, 0, TAU); g.fill();
        g.fillStyle = chrome(g, x, 0, x + w, 0, dark); g.fillRect(x + 10, top + hh - 4, 8, 12); g.fillRect(x + w - 18, top + hh - 4, 8, 12);
        // body
        const gr = g.createLinearGradient(x, 0, x + w, 0);
        if (black) { gr.addColorStop(0, '#4a3d5a'); gr.addColorStop(0.3, '#2b2236'); gr.addColorStop(0.75, '#16101d'); gr.addColorStop(1, '#0b080f'); }
        else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, '#f6f2fc'); gr.addColorStop(0.8, '#dcd3ea'); gr.addColorStop(1, '#b9aecd'); }
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(x, top); g.lineTo(x, top + hh - 18); g.quadraticCurveTo(x, top + hh, x + 18, top + hh); g.lineTo(x + w - 18, top + hh); g.quadraticCurveTo(x + w, top + hh, x + w, top + hh - 18); g.lineTo(x + w, top); g.closePath(); g.fill();
        // gloss highlight
        g.fillStyle = black ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.7)'; rr(g, x + 8, top + 12, 6, hh - 34, 3); g.fill();
        // chrome bands
        [0.16, 0.9].forEach(f => { const yy = top + hh * f; g.fillStyle = chrome(g, 0, yy - 4, 0, yy + 4, dark); g.fillRect(x - 2, yy - 4, w + 4, 8); });
        // inner (paint well) and rim back
        g.fillStyle = black ? '#0c0910' : '#d9d1e6'; g.beginPath(); g.ellipse(cx, top, w / 2, ry, 0, 0, TAU); g.fill();
        g.strokeStyle = chrome(g, x, 0, x + w, 0, dark); g.lineWidth = 4; g.beginPath(); g.ellipse(cx, top, w / 2, ry, 0, Math.PI, TAU); g.stroke();
      }
      function pressBody(g, dark) {
        const cx = L.prX, w = L.prW, top = L.prTop, bot = L.prBot, x = cx - w / 2, cw = L.ph ? 16 : 22;
        // chimneys
        [-1, 1].forEach(s => {
          const chx = cx + s * w * 0.27, ct = L.chimTop;
          g.save(); rr(g, chx - cw / 2, ct, cw, top - ct + 14, 4); g.clip();
          for (let y = ct, i = 0; y < top + 14; y += 12, i++) { g.fillStyle = i % 2 ? '#fff4fa' : '#ff6fae'; g.fillRect(chx - cw / 2, y, cw, 12); }
          const sh = g.createLinearGradient(chx - cw / 2, 0, chx + cw / 2, 0); sh.addColorStop(0, 'rgba(255,255,255,0.35)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(60,0,30,0.35)');
          g.fillStyle = sh; g.fillRect(chx - cw / 2, ct, cw, top - ct + 14);
          g.restore();
          g.fillStyle = dark ? '#2a2036' : '#5b4668'; rr(g, chx - cw / 2 - 4, ct - 6, cw + 8, 9, 3); g.fill();
        });
        // body with a dome top
        const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, '#ff9cc8'); gr.addColorStop(0.4, '#ff6fae'); gr.addColorStop(1, '#c62f6d');
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(x, bot); g.lineTo(x, top + w * 0.3); g.quadraticCurveTo(x, top, cx, top); g.quadraticCurveTo(x + w, top, x + w, top + w * 0.3); g.lineTo(x + w, bot); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.28)'; rr(g, x + 7, top + 22, 6, bot - top - 40, 3); g.fill();
        // cream panel
        const py = top + w * 0.22, ph = bot - py - 34;
        g.fillStyle = '#fff3e3'; rr(g, x + 10, py, w - 20, ph, 12); g.fill();
        g.strokeStyle = 'rgba(120,30,70,0.25)'; g.lineWidth = 2; rr(g, x + 10, py, w - 20, ph, 12); g.stroke();
        // gauge face
        const gx = cx, gy = py + ph * 0.42, gr2 = Math.min(w * 0.26, ph * 0.36);
        L.gauge = { x: gx, y: gy, r: gr2 };
        g.fillStyle = chrome(g, gx - gr2, gy - gr2, gx + gr2, gy + gr2, dark); g.beginPath(); g.arc(gx, gy, gr2 + 4, 0, TAU); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(gx, gy, gr2, 0, TAU); g.fill();
        for (let i = 0; i <= 10; i++) { const a = Math.PI * 0.8 + i / 10 * Math.PI * 1.4; g.strokeStyle = i >= 8 ? '#e0407b' : '#2a1838'; g.lineWidth = i % 5 ? 1.2 : 2.2; g.beginPath(); g.moveTo(gx + Math.cos(a) * gr2 * 0.72, gy + Math.sin(a) * gr2 * 0.72); g.lineTo(gx + Math.cos(a) * gr2 * 0.9, gy + Math.sin(a) * gr2 * 0.9); g.stroke(); }
        // output slot
        L.slot = { x: cx, y: bot - 18, w: w * 0.74 };
        g.fillStyle = chrome(g, 0, bot - 26, 0, bot - 8, dark); rr(g, cx - w * 0.42, bot - 27, w * 0.84, 20, 6); g.fill();
        g.fillStyle = '#1a1020'; rr(g, cx - w * 0.37, bot - 21, w * 0.74, 7, 3); g.fill();
        // rivets
        g.fillStyle = 'rgba(120,20,60,0.45)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x + 6, py + 10 + i * (ph - 20) / 3, 2, 0, TAU); g.arc(x + w - 6, py + 10 + i * (ph - 20) / 3, 2, 0, TAU); g.fill(); }
      }
      function tubeFrame(g, dark) {
        const y = L.tubeY - L.tubeH / 2, hh = L.tubeH;
        g.fillStyle = dark ? 'rgba(0,0,0,0.35)' : 'rgba(90,40,60,0.15)'; rr(g, L.tx0 + 4, y + 8, L.tx1 - L.tx0 - 8, hh, hh / 2); g.fill();
        // brackets
        const n = L.ph ? 4 : 7;
        for (let i = 1; i < n; i++) { const x = L.vx0 + L.vw * i / n; g.fillStyle = chrome(g, x - 5, 0, x + 5, 0, dark); g.fillRect(x - 5, y - 5, 10, hh + 10); }
      }
      function beltFrame(g, dark) {
        const y = L.beltY, W = L.W;
        g.fillStyle = dark ? '#1a1424' : '#6d5a74'; g.fillRect(0, y + 12, W, 10);
        g.fillStyle = chrome(g, 0, y + 12, 0, y + 22, dark); g.fillRect(0, y + 13, W, 3);
        g.fillStyle = dark ? '#0f0b16' : '#4a3a52'; for (let x = 30; x < W; x += 120) g.fillRect(x, y + 22, 8, 12);
      }

      /* ---------------- dynamic drawing ---------------- */
      function beatPos() {
        if (A.ctx && M && M.next > 0) { const spb = 60 / M.bpm; return (M.beat - 1) + (A.now() - (M.next - spb)) / spb; }
        return performance.now() / 1000 * 104 / 60;
      }
      function drawVatPaint(g, cx, black, t, rip) {
        const w = L.vatW, top = L.vatTop, ry = L.ph ? 10 : 13;
        const col = black ? [20, 16, 25] : [251, 248, 255];
        g.save(); g.beginPath(); g.ellipse(cx, top + 2, w / 2 - 5, ry - 3, 0, 0, TAU); g.clip();
        g.fillStyle = rgb(col); g.fillRect(cx - w / 2, top - ry, w, ry * 2 + 4);
        // glossy swirl
        const sw = Math.sin(t * 1.3 + (black ? 0 : 2)) * w * 0.12;
        g.fillStyle = black ? 'rgba(160,120,220,0.28)' : 'rgba(170,150,210,0.25)'; g.beginPath(); g.ellipse(cx + sw, top + 1, w * 0.22, ry * 0.32, 0, 0, TAU); g.fill();
        g.fillStyle = black ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(cx - w * 0.18 - sw * 0.5, top - 2, w * 0.1, ry * 0.18, -0.2, 0, TAU); g.fill();
        if (rip > 0.01) { g.strokeStyle = black ? `rgba(200,170,255,${rip})` : `rgba(140,120,180,${rip})`; g.lineWidth = 2; const k = 1 - rip; g.beginPath(); g.ellipse(cx, top + 2, w * 0.1 + k * w * 0.36, (ry - 3) * (0.2 + k * 0.8), 0, 0, TAU); g.stroke(); }
        // bubbles when powered
        if (G.power > 0.2) for (let i = 0; i < 3; i++) { const ph = (t * 0.7 + i * 0.37 + (black ? 0 : 0.5)) % 1; const bx = cx + Math.sin(i * 2.1 + (black ? 0 : 1)) * w * 0.25; g.strokeStyle = black ? `rgba(200,180,255,${0.5 * (1 - ph)})` : `rgba(120,100,160,${0.4 * (1 - ph)})`; g.lineWidth = 1.2; g.beginPath(); g.arc(bx, top + 2, 1.5 + ph * 4, 0, TAU); g.stroke(); }
        g.restore();
        g.strokeStyle = black ? '#cfc6dc' : '#ffffff'; g.lineWidth = 4; g.beginPath(); g.ellipse(cx, L.vatTop, w / 2, ry, 0, 0, Math.PI); g.stroke();
      }
      function drawPressDyn(g, t, bp) {
        const cx = L.prX, w = L.prW, top = L.prTop;
        // status bulbs on the dome, blinking on the beat
        const cols = ['#ffd447', '#58d68d', '#36b9f0'];
        const ib = Math.floor(bp), fr = bp - ib;
        cols.forEach((c, i) => {
          const bx = cx + (i - 1) * w * 0.17, by = top + w * 0.1 + Math.abs(i - 1) * 4;
          const on = G.power > 0.5 && (ib % 3 === i || G.stage === 'end') ? 1 - fr * 0.6 : 0.18;
          if (on > 0.3) { g.fillStyle = K.hexA(c, 0.35 * on); g.beginPath(); g.arc(bx, by, 10, 0, TAU); g.fill(); }
          g.fillStyle = on > 0.3 ? c : 'rgba(80,40,70,0.6)'; g.beginPath(); g.arc(bx, by, 4.5, 0, TAU); g.fill();
        });
        // gauge needle: idle wobble, print pressure, overdrive
        const gg = L.gauge; if (gg) {
          const p = clamp(0.12 + G.power * 0.28 + G.flood * 0.12 + G.printK * 0.55 + (G.stage === 'end' ? 0.3 : 0) + Math.sin(t * 7) * 0.012 * G.power, 0, 1);
          const a = Math.PI * 0.8 + p * Math.PI * 1.4;
          g.strokeStyle = '#e0407b'; g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(gg.x, gg.y); g.lineTo(gg.x + Math.cos(a) * gg.r * 0.82, gg.y + Math.sin(a) * gg.r * 0.82); g.stroke();
          g.fillStyle = '#2a1838'; g.beginPath(); g.arc(gg.x, gg.y, 3.5, 0, TAU); g.fill(); g.lineCap = 'butt';
        }
        // stamping head peeking from the slot
        const s = L.slot; if (s) {
          const press = Math.max(G.printK, G.stamp);
          if (press > 0.01) { g.fillStyle = `rgba(255,212,71,${0.25 + press * 0.5})`; rr(g, s.x - s.w / 2, s.y - 3, s.w, 7, 3); g.fill(); }
          if (G.stage === 'end' || G.stamp > 0) { g.fillStyle = 'rgba(255,255,255,0.65)'; g.fillRect(s.x - s.w / 2 + 4, s.y - 1, s.w - 8, 2); }
        }
      }
      function drawPipesDyn(g, t) {
        if (G.power < 0.05) return;
        // flowing paint dashes inside the feeder pipes' vertical runs
        const y0 = L.vatBot, y1 = L.tubeY - L.tubeH / 2 - 16;
        const wk = 1 - G.v / 100, bk = G.v / 100;
        [[L.vatLX, '#9a83c9', G.stage === 'blend' ? 0.25 + wk * 0.75 : 0.6], [L.vatRX, '#ffffff', G.stage === 'blend' ? 0.25 + bk * 0.75 : 0.6]].forEach(([x, c, k]) => {
          g.fillStyle = K.hexA(c, 0.55 * G.power * k);
          for (let y = y0 + ((t * 60) % 14); y < y1; y += 14) g.fillRect(x - 1.5, y, 3, 6);
        });
        // valve wheels on the wall pipes (spin with the machine)
        const py = L.vatTop + L.vatH * 0.32;
        [[L.vatLX + L.vatW / 2 + (L.prX - L.prW / 2 - L.vatLX - L.vatW / 2) * 0.5, py, '#2fae86'], [L.prX + L.prW / 2 + (L.vatRX - L.vatW / 2 - L.prX - L.prW / 2) * 0.5, py + 14, '#e8b520']].forEach(([x, y, c]) => {
          const r = L.ph ? 8 : 11, a = t * 2.2 * G.power;
          g.strokeStyle = c; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y - 13, r, 0, TAU); g.stroke();
          g.beginPath(); for (let i = 0; i < 3; i++) { const aa = a + i * TAU / 3; g.moveTo(x, y - 13); g.lineTo(x + Math.cos(aa) * r, y - 13 + Math.sin(aa) * r); } g.stroke();
          g.fillStyle = c; g.fillRect(x - 2, y - 13, 4, 10);
        });
      }
      function drawFloorGlow(g) {
        // the tube's colours reflected on the glossy floor, fading with distance
        const fy = L.beltY + 30, hh = L.ph ? 72 : 92, n = 6, src = G.flood > 0.5 ? COL : GREY, base = 0.12 + 0.1 * G.flood;
        for (let i = 0; i < n; i++) { g.globalAlpha = base * (1 - i / n); g.drawImage(src, 0, 0, STRIP_W, 4, L.vx0 + i * 6, fy + i * hh / n, L.vw - i * 12, hh / n + 0.5); }
        g.globalAlpha = 1;
      }
      function drawLights(g, bp) {
        // string lights along the crane rail: they appear after a couple of shifts and twinkle on the beat
        if (visits < 2) return;
        const y = L.rail + 6, n = Math.round(L.W / 34), ib = Math.floor(bp), fr = bp - ib;
        g.strokeStyle = 'rgba(40,30,50,0.55)'; g.lineWidth = 1.2; g.beginPath();
        for (let i = 0; i <= n; i++) { const x = i * L.W / n; const yy = y + 6 + Math.sin(i * 1.7) * 2; if (i) g.lineTo(x, yy); else g.moveTo(x, yy); }
        g.stroke();
        for (let i = 0; i < n; i++) {
          const x = (i + 0.5) * L.W / n, yy = y + 9 + Math.sin(i * 1.7 + 0.8) * 2, c = spec((i * 37) % 100 * 0.8 + 12);
          const on = (i + ib) % 3 === 0 ? 1 - fr * 0.5 : 0.55;
          g.fillStyle = rgb(c, 0.25 * on); g.beginPath(); g.arc(x, yy + 3, 8, 0, TAU); g.fill();
          g.fillStyle = rgb(c, 0.6 + 0.4 * on); g.beginPath(); g.ellipse(x, yy + 3, 3, 4, 0, 0, TAU); g.fill();
        }
      }
      function reveal(v) {
        let a = G.flood;
        for (const q of ANCH) if (q.shown > 0) { const d = (v - q.at) / 13; a = Math.max(a, q.shown * Math.exp(-d * d)); }
        return Math.min(1, a);
      }
      function drawTube(g, t, bp) {
        const x0 = L.tx0, w = L.tx1 - L.tx0, hh = L.tubeH, y = L.tubeY - hh / 2;
        const pulse = G.power * Math.exp(-(bp - Math.floor(bp)) * 5);
        // under-glow
        if (G.flood > 0 || G.placed) { const gl = 0.12 + 0.18 * pulse; g.fillStyle = specCSS(G.stage === 'blend' || G.stage === 'print' || G.stage === 'end' ? G.vs : 50, gl * Math.max(G.flood, 0.5)); rr(g, x0 - 6, y - 6, w + 12, hh + 12, hh); g.fill(); }
        g.save(); rr(g, x0, y, w, hh, hh / 2); g.clip();
        g.drawImage(GREY, 0, 0, STRIP_W, 4, L.vx0, y, L.vw, hh);
        g.fillStyle = '#141019'; g.fillRect(x0, y, L.vx0 - x0 + 0.5, hh);
        g.fillStyle = '#fbf8ff'; g.fillRect(L.vx1 - 0.5, y, L.tx1 - L.vx1 + 1, hh);
        const N = L.ph ? 44 : 64, sw = L.vw / N, cw = STRIP_W / N;
        if (G.flood >= 1) g.drawImage(COL, 0, 0, STRIP_W, 4, L.vx0, y, L.vw, hh);
        else for (let i = 0; i < N; i++) {
          const a = reveal((i + 0.5) / N * 100); if (a < 0.02) continue;
          g.globalAlpha = a; g.drawImage(COL, i * cw, 0, cw, 4, L.vx0 + i * sw - 0.4, y, sw + 0.8, hh);
        }
        g.globalAlpha = 1;
        if (G.power > 0.05) { g.fillStyle = `rgba(255,255,255,${0.16 * G.power})`; for (let k = 0; k < 6; k++) { const sx = x0 + ((t * (26 + k * 11) + k * 131) % (w + 80)) - 40; g.fillRect(sx, y + 4 + (k % 3) * (hh * 0.22), 18 + k * 5, 2.5); } }
        if (pulse > 0.02) { g.fillStyle = `rgba(255,255,255,${0.1 * pulse})`; g.fillRect(x0, y, w, hh); }
        // inner shading
        const sh = g.createLinearGradient(0, y, 0, y + hh); sh.addColorStop(0, 'rgba(255,255,255,0.28)'); sh.addColorStop(0.35, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.25)');
        g.fillStyle = sh; g.fillRect(x0, y, w, hh);
        g.restore();
        // glass edge + highlight
        g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2.5; rr(g, x0, y, w, hh, hh / 2); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 + hh * 0.6, y + 5); g.lineTo(x0 + w - hh * 0.6, y + 5); g.stroke();
        // chrome end caps (0 and 100)
        const dark = K.dark();
        [[x0 - 3, L.vx0 + 2], [L.vx1 - 2, L.tx1 + 3]].forEach(([a, b]) => { g.fillStyle = chrome(g, 0, y - 4, 0, y + hh + 4, dark); rr(g, a, y - 4, b - a, hh + 8, 9); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1; rr(g, a, y - 4, b - a, hh + 8, 9); g.stroke(); });
        // ripples from splats
        G.rings = G.rings.filter(r => r.k < 1);
        G.rings.forEach(r => { r.k += 0.03; g.strokeStyle = rgb(r.c, 0.8 * (1 - r.k)); g.lineWidth = 3 * (1 - r.k) + 1; g.beginPath(); g.ellipse(r.x, L.tubeY, 8 + r.k * 46, 6 + r.k * 22, 0, 0, TAU); g.stroke(); });
        // anchor markers and leader lines
        ANCH.forEach(a => {
          if (!a.placed || a.fly) return;
          const x = tubeX(a.at), ly = (a.row ? L.rowC : L.rowB);
          g.strokeStyle = rgb(spec(a.v), 0.85); g.lineWidth = 2; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(x, y + hh + 4); g.lineTo(x, ly); g.stroke(); g.setLineDash([]);
          g.fillStyle = '#ffffff'; g.fillRect(x - 1.5, y + 2, 3, hh - 4);
          g.fillStyle = specCSS(a.v); g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y + hh + 2, 6, 0, TAU); g.fill(); g.stroke();
        });
      }
      function drawTin(g, x, yb, s, col, pat, glow) {
        const w = 32 * s, hh = 38 * s, top = yb - hh, ry = 5 * s;
        if (glow > 0.01) { g.fillStyle = rgb(col, 0.35 * glow); g.beginPath(); g.ellipse(x, yb - hh / 2, w * 1.3, hh, 0, 0, TAU); g.fill(); }
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x, yb, w * 0.6, ry * 0.8, 0, 0, TAU); g.fill();
        const gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0); gr.addColorStop(0, '#c9c3d6'); gr.addColorStop(0.35, '#ffffff'); gr.addColorStop(1, '#8e869f');
        g.fillStyle = gr; g.fillRect(x - w / 2, top, w, hh); g.beginPath(); g.ellipse(x, yb, w / 2, ry, 0, 0, Math.PI); g.fill();
        // colour label band
        g.fillStyle = rgb(col); g.fillRect(x - w / 2, top + hh * 0.3, w, hh * 0.46);
        g.fillStyle = 'rgba(255,255,255,0.75)';
        if (pat === 'stripe') { for (let i = 0; i < 3; i++) g.fillRect(x - w / 2, top + hh * (0.36 + i * 0.13), w, 1.6 * s); }
        else if (pat === 'dots') { for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x - w * 0.3 + i * w * 0.2, top + hh * 0.53, 1.8 * s, 0, TAU); g.fill(); } }
        else if (pat === 'star') { K.starPath(g, x, top + hh * 0.53, 6 * s, 2.6 * s, 5, 0); g.fill(); }
        else { g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.4 * s; g.beginPath(); for (let i = 0; i <= 6; i++) { const xx = x - w / 2 + i * w / 6; const yy = top + hh * (i % 2 ? 0.45 : 0.62); if (i) g.lineTo(xx, yy); else g.moveTo(xx, yy); } g.stroke(); }
        const sh = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0); sh.addColorStop(0, 'rgba(255,255,255,0.18)'); sh.addColorStop(0.4, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.22)');
        g.fillStyle = sh; g.fillRect(x - w / 2, top + hh * 0.3, w, hh * 0.46);
        // lid with paint drip
        g.fillStyle = '#e8e3f0'; g.beginPath(); g.ellipse(x, top, w / 2, ry, 0, 0, TAU); g.fill();
        g.fillStyle = rgb(col); g.beginPath(); g.ellipse(x, top, w / 2 - 3 * s, ry - 1.5 * s, 0, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(x + w * 0.1, top); g.quadraticCurveTo(x + w * 0.2, top + hh * 0.25, x + w * 0.16, top + hh * 0.3); g.lineTo(x + w * 0.28, top); g.fill();
        // wire bail
        g.strokeStyle = 'rgba(80,70,100,0.75)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - w / 2 + 1, top + hh * 0.12); g.quadraticCurveTo(x, top - hh * 0.55, x + w / 2 - 1, top + hh * 0.12); g.stroke();
      }
      const TIN_COLS = (() => {
        const got = K.collection().map(swatchV).filter(v => v != null).map(v => spec(v));
        const base = [[255, 111, 174], [255, 212, 71], [88, 214, 141], [54, 185, 240], [183, 164, 255], [255, 138, 77]];
        return (visits >= 1 && got.length ? got.concat(base) : base).slice(0, 8);
      })();
      const tins = [];
      function buildTins() {
        const n = Math.max(5, Math.round(L.W / 78));
        if (tins.length === n) return;
        tins.length = 0;
        for (let i = 0; i < n; i++) tins.push({ x: i * (L.W + 90) / n, c: TIN_COLS[i % TIN_COLS.length], pat: i % 3 === 0 ? PATTERN : ['stripe', 'dots', 'star', 'zig'][(i + 1) % 4] });
      }
      const SPR = new Map();
      function tinSprite(tn) {
        const s = L.tinS * 0.78, key = tn.c.join(',') + tn.pat + s + ':' + (cv.dpr || 1);
        if (SPR.has(key)) return SPR.get(key);
        const dpr = cv.dpr || 1, w = Math.ceil(44 * s), hh = Math.ceil(64 * s), c = document.createElement('canvas');
        c.width = Math.ceil(w * dpr); c.height = Math.ceil(hh * dpr);
        const g2 = c.getContext('2d'); g2.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawTin(g2, w / 2, hh - 6 * s, s, tn.c, tn.pat, 0);
        const sp = { c, w, hh, ox: w / 2, oy: hh - 6 * s };
        SPR.set(key, sp); return sp;
      }
      function drawBelt(g, t, dt) {
        const y = L.beltY, W = L.W;
        g.fillStyle = K.dark() ? '#2a2236' : '#5d4b66'; rr(g, -10, y, W + 20, 14, 7); g.fill();
        G.beltOff = (G.beltOff + G.beltSpeed * dt + 1000) % 24;
        g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 2; g.beginPath();
        for (let x = -24 + G.beltOff; x < W + 24; x += 24) { g.moveTo(x, y + 3); g.lineTo(x + 6, y + 11); }
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, y + 1, W, 2);
        // rollers
        for (let x = 20; x < W; x += 60) { g.fillStyle = K.dark() ? '#3d3350' : '#8e7d98'; g.beginPath(); g.arc(x, y + 7, 5, 0, TAU); g.fill(); const a = G.beltOff / 24 * TAU; g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y + 7); g.lineTo(x + Math.cos(a) * 4, y + 7 + Math.sin(a) * 4); g.stroke(); }
        // ambient tins travel the belt
        if (G.tinsK > 0.01) {
          g.globalAlpha = G.tinsK;
          const span = W + 90;
          tins.forEach(tn => { tn.x += G.beltSpeed * dt; if (tn.x > span - 45) tn.x -= span; if (tn.x < -45) tn.x += span; const sp = tinSprite(tn); g.drawImage(sp.c, tn.x - sp.ox, y + 1 - sp.oy, sp.w, sp.hh); });
          g.globalAlpha = 1;
        }
        // today's tin
        if (G.tinOn > 0.01) {
          const x = tubeX(G.vs), s = L.tinS * (0.6 + 0.6 * K.ease.outBack(Math.min(1, G.tinOn)));
          const c = spec(G.vs);
          // paint stream from the tube to the tin
          const sy = L.tubeY + L.tubeH / 2 + 2, ey = y + 1 - 38 * s;
          if (G.stage === 'blend' || G.stage === 'print') {
            const a = 0.35 + 0.55 * G.pour;
            g.strokeStyle = rgb(c, a); g.lineWidth = 3 + 3 * G.pour; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, sy);
            for (let yy = sy; yy <= ey; yy += 8) g.lineTo(x + Math.sin(yy * 0.08 + t * 9) * (1 + G.pour * 2), yy);
            g.stroke(); g.lineCap = 'butt';
          }
          drawTin(g, x, y + 1, s, c, PATTERN, G.stage === 'end' ? 0.7 + 0.3 * Math.sin(t * 4) : 0.45);
        }
      }
      function drawDrag(g, t) {
        const D = G.drag;
        // first-drop teaching arc (to the tube centre)
        if (G.stage === 'anchor' && !D && G.placed === 0 && G.arc) {
          const a = ANCH.find(q => !q.placed); if (a && a.chip) {
            const r = K.rectIn(a.chip), sx = r.cx, sy = r.y + 14, ex = tubeX(50), ey = L.tubeY + L.tubeH / 2 + 4;
            g.strokeStyle = K.dark() ? 'rgba(255,212,71,0.75)' : 'rgba(200,120,0,0.6)'; g.lineWidth = 3; g.setLineDash([2, 9]); g.lineDashOffset = -t * 30; g.lineCap = 'round';
            g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo((sx + ex) / 2, Math.min(sy, ey) - 30, ex, ey); g.stroke(); g.setLineDash([]); g.lineCap = 'butt';
          }
        }
        if (!D) return;
        const bx = D.x, by = D.y - BLOB_OFF, c = spec(D.a.v);
        const over = by < L.trayTop - 4;
        if (over) {
          const x = clamp(bx, L.vx0, L.vx1), v = tubeV(x);
          g.strokeStyle = rgb(c, 0.75); g.lineWidth = 2; g.setLineDash([4, 5]); g.beginPath(); g.moveTo(bx, by); g.lineTo(x, L.tubeY); g.stroke(); g.setLineDash([]);
          g.fillStyle = rgb(c, 0.3); g.beginPath(); g.ellipse(x, L.tubeY, 16 + Math.sin(t * 10) * 2, L.tubeH * 0.62, 0, 0, TAU); g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(x, L.tubeY, 14, L.tubeH * 0.55, 0, 0, TAU); g.stroke();
          g.font = '800 14px ' + FONT; g.textAlign = 'center';
          const lbl = String(Math.round(v));
          g.fillStyle = 'rgba(20,12,30,0.8)'; rr(g, x - 17, L.tubeY - L.tubeH / 2 - 30, 34, 22, 8); g.fill();
          g.fillStyle = '#fff'; g.fillText(lbl, x, L.tubeY - L.tubeH / 2 - 14);
        }
        // the drop itself: stretched along its velocity
        const sp = Math.hypot(D.vx, D.vy), st = clamp(sp / 1600, 0, 0.55), ang = Math.atan2(D.vy, D.vx);
        g.save(); g.translate(bx, by); g.rotate(ang); g.scale(1 + st, 1 - st * 0.45); g.rotate(-ang);
        const r = L.ph ? 17 : 20;
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(3, r + 6, r * 0.8, 4, 0, 0, TAU); g.fill();
        g.fillStyle = rgb(c); g.beginPath(); g.moveTo(0, -r * 1.45); g.bezierCurveTo(r * 0.9, -r * 0.4, r, r * 0.3, 0, r); g.bezierCurveTo(-r, r * 0.3, -r * 0.9, -r * 0.4, 0, -r * 1.45); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2; g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(-r * 0.3, -r * 0.1, r * 0.18, r * 0.3, 0.4, 0, TAU); g.fill();
        g.restore();
        if (sp > 500 && Math.random() < 0.5) P.emit('drop', bx, by + 10, 1, { colors: [rgb(c)], speed: [10, 40], angle: Math.PI / 2, spread: 0.6 });
      }
      function drawFly(g) {
        ANCH.forEach(a => {
          if (!a.fly) return;
          const f = a.fly, k = K.ease.inOutCubic(Math.min(1, f.k)), x = lerp(f.x, tubeX(a.drop), k), y = lerp(f.y, L.tubeY, k) - Math.sin(k * Math.PI) * 40;
          const r = (L.ph ? 15 : 18) * (1 - k * 0.35);
          g.fillStyle = specCSS(a.v); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
        });
      }
      function drawBanner(g, t) {
        const B = G.banner; if (!B) return;
        const k = K.ease.inOutCubic(Math.min(1, B.k)), W = L.W, cx = W / 2, half = k * (W / 2 + 40);
        const y = L.bannerY, bh = L.bannerH, xa = cx - half, xb = cx + half;
        const wave = (x) => Math.sin(x * 0.018 + t * 2.2) * 5 * (L.ph ? 0.8 : 1);
        // a paper feed curling down from the press slot
        if (L.slot && B.k > 0.02) {
          const fx = L.slot.x, fy = L.slot.y, ty = y - bh / 2 + wave(cx) + 4, fw = L.ph ? 18 : 24;
          g.fillStyle = 'rgba(255,250,240,0.95)'; g.beginPath(); g.moveTo(fx - fw / 2, fy);
          g.bezierCurveTo(fx - fw / 2 + 26, fy + (ty - fy) * 0.4, fx - fw / 2 - 26, fy + (ty - fy) * 0.7, cx - fw / 2, ty);
          g.lineTo(cx + fw / 2, ty); g.bezierCurveTo(fx + fw / 2 - 26, fy + (ty - fy) * 0.7, fx + fw / 2 + 26, fy + (ty - fy) * 0.4, fx + fw / 2, fy); g.closePath(); g.fill();
          g.fillStyle = 'rgba(120,80,140,0.18)'; g.fillRect(fx - fw / 2, fy, fw, 3);
        }
        const edge = (dy) => { for (let x = xa; x <= xb + 0.1; x += 12) g.lineTo(Math.min(x, xb), y + dy + wave(Math.min(x, xb))); };
        const edgeBack = (dy) => { for (let x = xb; x >= xa - 0.1; x -= 12) g.lineTo(Math.max(x, xa), y + dy + wave(Math.max(x, xa))); };
        // shadow
        g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.moveTo(xa, y + bh / 2 + 6 + wave(xa)); edge(bh / 2 + 6); edgeBack(bh / 2 + 20); g.closePath(); g.fill();
        // banner body: the full spectrum, left (0) to right (100)
        if (!B.grad || B.gw !== W) { B.gw = W; B.grad = g.createLinearGradient(0, 0, W, 0); STOPS.forEach(([v, c]) => B.grad.addColorStop(v / 100, c)); }
        g.fillStyle = B.grad; g.beginPath(); g.moveTo(xa, y - bh / 2 + wave(xa)); edge(-bh / 2); edgeBack(bh / 2); g.closePath(); g.fill();
        // gloss on top, shade at the bottom, ribbon folds
        g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.moveTo(xa, y - bh / 2 + wave(xa)); edge(-bh / 2); edgeBack(-bh / 2 + 5); g.closePath(); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.moveTo(xa, y + bh / 2 - 6 + wave(xa)); edge(bh / 2 - 6); edgeBack(bh / 2); g.closePath(); g.fill();
        if (visits >= 4) { g.strokeStyle = '#ffd447'; g.lineWidth = 2; [-bh / 2 + 8, bh / 2 - 10].forEach(dy => { g.beginPath(); g.moveTo(xa, y + dy + wave(xa)); edge(dy); g.stroke(); }); }
        // today's pin on the banner
        const px = G.vs / 100 * W;
        if (px > xa && px < xb) {
          const py = y - bh / 2 + wave(px) - 6;
          g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(px, py + 10); g.lineTo(px - 10, py - 8); g.lineTo(px + 10, py - 8); g.closePath(); g.fill();
          g.fillStyle = specCSS(G.vs); g.beginPath(); g.arc(px, py - 14, 10, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
        }
        // the two rolls
        if (k < 1) [xa, xb].forEach((x, i) => {
          const rr2 = bh * 0.16 + (1 - k) * bh * 0.1, v = clamp(x / W * 100, 0, 100);
          const c = spec(v);
          g.fillStyle = rgb([c[0] * 0.8, c[1] * 0.8, c[2] * 0.8]); rr(g, x - rr2, y - bh / 2 - 4 + wave(x), rr2 * 2, bh + 8, rr2); g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.5; for (let j = 0; j < 3; j++) { g.beginPath(); g.ellipse(x, y + wave(x), rr2 * (0.3 + j * 0.22), bh / 2, 0, i ? -1.2 : 1.9, i ? 1.2 : 4.4); g.stroke(); }
        });
        // the sticker pops on once both rolls have cleared it
        const sw = B.w || (B.w = banner.offsetWidth || 200);
        if (!B.shown && half > sw / 2 + 16) { B.shown = true; banner.classList.add('on'); if (A.ctx) A.pop({ freq: 700, vol: 0.12 }); }
        banner.style.marginTop = wave(cx).toFixed(1) + 'px';
      }

      /* ---------------- loop ---------------- */
      let M = null, hum = null, pourL = null, hiss = null, frame = 0, lastBeatSched = -1;
      const FONT = (getComputedStyle(el).getPropertyValue('--font-ui') || '').trim() || 'system-ui, sans-serif';
      const BLOB_OFF = 34;
      function machineBeats() {
        if (!A.ctx || !M || !(M.next > 0) || G.power < 0.5) return;
        const spb = 60 / M.bpm, lastT = M.next - spb, lastI = M.beat - 1;
        for (let i = Math.max(lastBeatSched + 1, lastI - 1); i <= lastI; i++) {
          const when = lastT - (lastI - i) * spb; lastBeatSched = i;
          if (when < A.now() - 0.01) continue;
          const b = i % 4;
          if (b === 0 || b === 2) A.wood(when, 0.045, 0.45);
          if (b === 3) A.noise({ when, filter: 'highpass', freq: 5200, dur: 0.24, attack: 0.03, vol: 0.022 });
          if (i % 8 === 7) A.noise({ when: when + spb * 0.5, filter: 'bandpass', freq: 950, q: 7, dur: 0.07, vol: 0.05 });
        }
      }
      function onBeat(i) {
        if (G.power < 0.5) return;
        if (i % 4 === 3 && !RM()) {
          const s = Math.random() < 0.5 ? -1 : 1;
          P.emit('smoke', L.prX + s * L.prW * 0.27, L.chimTop - 4, 2, { colors: ['rgba(255,255,255,0.45)'], angle: -Math.PI / 2, spread: 0.5, speed: [20, 40] });
        }
        if (G.puffs) {
          const v = (i * 23) % 100;
          [-1, 1].forEach(s => P.emit('smoke', L.prX + s * L.prW * 0.27, L.chimTop - 4, inten === 2 ? 6 : 4, { colors: [specCSS((v + (s > 0 ? 40 : 0)) % 100, 0.42), specCSS((v + (s > 0 ? 55 : 15)) % 100, 0.32)], angle: -Math.PI / 2 + s * 0.55, spread: 0.9, speed: [30, 70], size: [9, 17] }));
          if (A.ctx) A.noise({ filter: 'lowpass', freq: 500, dur: 0.18, attack: 0.02, vol: 0.06 });
        }
      }
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !L.W) return;
        frame++;
        // state easing
        G.power += ((G.dropped.white ? 1 : G.dropped.black ? 0.35 : 0) - G.power) * Math.min(1, dt * 2.2);
        const beltTarget = G.stage === 'blend' || G.stage === 'print' ? G.vel * 0.6 : (G.stage === 'end' ? 70 : 34 * G.power * (G.flood > 0.5 ? 1.5 : 1));
        G.beltSpeed += (beltTarget - G.beltSpeed) * Math.min(1, dt * 3);
        G.tinsK += (((G.stage === 'blend' || G.stage === 'print') ? 0 : 1) - G.tinsK) * Math.min(1, dt * 3);
        if (G.floodT >= 0) { G.floodT += dt; G.flood = clamp(G.floodT / (RM() ? 0.3 : 1.6), 0, 1); }
        if (G.tinOn > 0 && G.tinOn < 1) G.tinOn = Math.min(1, G.tinOn + dt * 2.5);
        const prev = G.vs; G.vs += (G.v - G.vs) * Math.min(1, dt * (RM() ? 30 : 9)); G.vel = (G.vs - prev) / Math.max(0.001, dt) / 100 * L.vw;
        G.pour += ((G.blending ? 1 : 0) - G.pour) * Math.min(1, dt * 6);
        G.stamp = Math.max(0, G.stamp - dt * 1.5); G.shake = Math.max(0, G.shake - dt * 3); G.flash = Math.max(0, G.flash - dt * 2.5);
        G.vatRip.L = Math.max(0, G.vatRip.L - dt * 0.9); G.vatRip.R = Math.max(0, G.vatRip.R - dt * 0.9);
        ANCH.forEach(a => {
          if (a.fly) { a.fly.k += dt / (RM() ? 0.12 : 0.26); if (a.fly.k >= 1) { a.fly = null; splat(a); } }
          if (a.placed && !a.fly && a.shown < 1) a.shown = Math.min(1, a.shown + dt * 1.8);
          if (a.slide) { a.slide.k += dt / (RM() ? 0.15 : 0.5); const k = K.ease.inOutCubic(Math.min(1, a.slide.k)); a.at = lerp(a.slide.from, a.slide.to, k); placeLab(a); if (a.slide.k >= 1) { a.slide = null; a.at = a.v; placeLab(a); } }
        });
        if (G.banner) G.banner.k = Math.min(1, G.banner.k + dt / (RM() ? 0.4 : 1.9));
        if (G.stage === 'blend' || G.stage === 'print' || G.stage === 'end') { const yw = (G.youW || 90) / 2 + 8; pos(you, clamp(tubeX(G.vs), yw, L.W - yw), L.tubeY - L.tubeH / 2 - 8); }
        // audio beds
        if (A.ctx) {
          if (!hum) { hum = A.loop({ pink: true, filter: 'bandpass', freq: 130, q: 1.1, bus: 'amb' }); }
          if (hum && frame % 12 === 0) hum.level(0.015 + 0.07 * G.power * clamp(Math.abs(G.beltSpeed) / 40, 0.3, 1.4), 0.3);
          if (pourL && frame % 3 === 0) { pourL.level(0.012 + G.pour * 0.05, 0.08); pourL.freq(380 + G.vs * 11, 0.06); }
          if (hiss && frame % 3 === 0) hiss.level(0.004 + G.printK * 0.07, 0.05);
          machineBeats();
        }
        const bp = beatPos(), ib = Math.floor(bp);
        if (ib !== G.lastIB) { if (G.lastIB >= 0) onBeat(ib); G.lastIB = ib; }

        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0); g.globalAlpha = 1;
        if (G.shake > 0 && !RM()) { el.style.transform = `translate(${((Math.random() - 0.5) * G.shake * 7).toFixed(1)}px,${((Math.random() - 0.5) * G.shake * 5).toFixed(1)}px)`; G.shook = true; }
        else if (G.shook) { G.shook = false; el.style.transform = ''; }
        g.clearRect(0, 0, L.W, L.H);
        drawLights(g, bp);
        drawPipesDyn(g, t);
        drawVatPaint(g, L.vatLX, true, t, G.vatRip.L); drawVatPaint(g, L.vatRX, false, t, G.vatRip.R);
        drawPressDyn(g, t, bp);
        drawTube(g, t, bp);
        drawFloorGlow(g);
        drawBelt(g, t, dt);
        drawFly(g);
        drawBanner(g, t);
        drawDrag(g, t);
        P.update(dt); P.draw(g);
        if (G.flash > 0 && !RM()) { g.fillStyle = `rgba(255,255,255,${G.flash * 0.35})`; g.fillRect(0, 0, L.W, L.H); }
      });

      /* ---------------- step 1: load the two labels ---------------- */
      function dropCard(which) {
        const black = which === 'black';
        if (G.stage !== 'load' || G.dropped[which] || G.busy) return;
        if (black === false && !G.dropped.black) { K.sfx.no(); cardW.animate && !RM() && cardW.animate([{ transform: 'translateX(-50%) rotate(-6deg)' }, { transform: 'translateX(-50%) rotate(6deg)' }, { transform: 'translateX(-50%) rotate(0deg)' }], { duration: 320 }); return; }
        G.busy = true;
        const card = black ? cardB : cardW, plate = black ? plateB : plateW, vx = black ? L.vatLX : L.vatRX;
        K.guide(null);
        K.sfx.whoosh();
        card.classList.add('is-drop');
        const y0 = L.rail + 16, y1 = L.vatTop - 30, rot = black ? -14 : 12;
        K.anim(RM() ? 120 : 520, (k) => {
          const e = k * k;
          card.style.transform = `translateX(-50%) translateY(${(y1 - y0) * e}px) rotate(${rot * e}deg) scale(${1 - 0.45 * e})`;
          card.style.opacity = String(k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
        }).then(() => {
          card.hidden = true;
          G.dropped[which] = true; G.vatRip[black ? 'L' : 'R'] = 1;
          P.emit('drop', vx, L.vatTop, 22, { colors: black ? ['#141019', '#3a2f4a', '#6b5a85'] : ['#ffffff', '#e8e2f5', '#cfc6dc'], angle: -Math.PI / 2, spread: 1.6, speed: [80, 220] });
          if (A.ctx) { A.thud({ vol: 0.22 }); A.tone({ type: 'sine', freq: black ? 180 : 320, to: black ? 90 : 160, glide: 0.18, dur: 0.26, vol: 0.12 }); for (let i = 0; i < 4; i++) A.tone({ when: A.now() + 0.08 + i * 0.06, type: 'sine', freq: 500 + Math.random() * 500, to: 900 + Math.random() * 600, glide: 0.05, dur: 0.06, vol: 0.03 }); }
          plate.classList.add('on');
          patch.react('bounce');
          G.busy = false;
          if (black) { say(LN.black, { mood: 'surprised', ms: 3000 }); K.guide({ id: 'card-w', g: 'tap', target: cardW, label: 'TAP: DROP IT IN', delay: 900 }); }
          else powerUp();
        });
      }
      K.tap(cardB, () => dropCard('black'));
      K.tap(cardW, () => dropCard('white'));

      async function powerUp() {
        G.stage = 'power';
        K.sfx.rise(); if (A.ctx) { A.noise({ filter: 'lowpass', freq: 200, to: 900, dur: 0.9, attack: 0.3, vol: 0.12 }); A.wood(undefined, 0.2, 0.5); }
        if (M) M.level(0.8);
        G.flash = 0.7;
        patch.base('happy');
        say(LN.white, { mood: 'laugh', moodMs: 1400, ms: 3600 });
        await K.sleep(1500);
        startAnchors();
      }

      /* ---------------- step 2: anchor drops on the spectrum tube ---------------- */
      function startAnchors() {
        G.stage = 'anchor'; G.arc = true;
        tray.classList.remove('is-out', 'is-wait'); tray.classList.add('is-live');
        K.sfx.pop();
        say(LN.anchor, { mood: 'idea', ms: 5200 });
        guideNext(1100);
      }
      function guideNext(delay) {
        const a = ANCH.find(q => !q.placed && q.chip && !q.chip.classList.contains('is-used'));
        if (!a) return;
        const r = K.rectIn(a.chip), tx = tubeX(50);
        K.guide({ id: 'drop', g: 'drag', target: a.chip, dir: tx >= r.cx ? 'r' : 'l', d: clamp(Math.abs(tx - r.cx), 50, 120), label: 'DRAG ONTO THE TUBE', place: 'above', oy: 0.3, delay: delay == null ? 700 : delay });
      }
      function grab(a, p) {
        if (G.stage !== 'anchor' || a.placed || G.drag) return false;
        G.drag = { a, x: p.x, y: p.y, vx: 0, vy: 0 };
        G.arc = false;
        a.chip.classList.add('is-lift');
        ghost.textContent = a.t; ghost.style.setProperty('--c', specCSS(a.v)); ghost.hidden = false; posGhost(p);
        K.sfx.pop(undefined, 380 + a.v * 5);
        if (A.ctx) A.tone({ type: 'sine', freq: 260, to: 520, glide: 0.08, dur: 0.12, vol: 0.05 });
      }
      function posGhost(p) { pos(ghost, clamp(p.x, 70, L.W - 70), p.y - BLOB_OFF - (L.ph ? 26 : 30)); }
      function dragMove(a, p, d) {
        const D = G.drag; if (!D || D.a !== a) return;
        D.x = p.x; D.y = p.y; D.vx = d.vx; D.vy = d.vy; posGhost(p);
        const now = performance.now();
        if (A.ctx && now - G.lastTick > 90 && Math.hypot(d.vx, d.vy) > 300) { G.lastTick = now; A.tone({ type: 'sine', freq: 700 + Math.random() * 300, to: 400, glide: 0.04, dur: 0.05, vol: 0.02 }); }
      }
      function dropIt(a, p) {
        const D = G.drag; if (!D || D.a !== a) return;
        G.drag = null; ghost.hidden = true; a.chip.classList.remove('is-lift');
        const by = p.y - BLOB_OFF;
        if (by < L.trayTop - 4 && G.stage === 'anchor') land(a, p.x, by);
        else { K.sfx.soft(); if (A.ctx) A.boing({ freq: 260, vol: 0.06 }); guideNext(1600); }
      }
      function land(a, x, y, keyboard) {
        a.placed = true; a.chip.classList.add('is-used');
        const v = clamp(tubeV(x), 1, 99);
        a.drop = v; a.at = v; a.acc = keyboard ? 0.75 : clamp(1 - Math.abs(v - a.v) / 28, 0, 1);
        a.fly = { k: 0, x, y };
        K.guide(null);
        K.sfx.whoosh();
        ctx.track('anchor', { i: a.i, acc: Math.round(a.acc * 100) });
      }
      function splat(a) {
        const x = tubeX(a.drop), c = spec(a.v);
        G.placed++;
        P.emit('drop', x, L.tubeY - 6, inten === 0 ? 10 : 16, { colors: [rgb(c), '#ffffff'], angle: -Math.PI / 2, spread: 2.2, speed: [60, 190] });
        G.rings.push({ x, c, k: 0 });
        const PENTA = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5'];
        if (A.ctx) { A.tone({ type: 'sine', freq: 560, to: 170, glide: 0.08, dur: 0.14, vol: 0.12 }); A.pluck(A.note(PENTA[clamp(Math.round(a.v / 11), 0, 9)]), { vol: 0.2, damp: 0.995, verb: 0.3 }); }
        const grade = a.acc >= 0.85 ? ['PERFECT', 'great'] : a.acc >= 0.6 ? ['NICE', 'good'] : ['SLIDING IT', 'soft'];
        if (grade[1] === 'great') K.sfx.great(); else if (grade[1] === 'good') K.sfx.good(undefined, 6);
        K.pop(grade[0], { x: clamp(x, 70, L.W - 70), y: L.tubeY + 2, kind: grade[1] });
        a.lab.classList.add('on'); placeLab(a);
        patch.face(grade[1] === 'soft' ? 'think' : 'happy', 900);
        const off = Math.abs(a.drop - a.v) > 2.5;
        if (off) S.later(() => { a.slide = { from: a.at, to: a.v, k: 0 }; if (A.ctx) A.tone({ type: 'triangle', freq: a.drop < a.v ? 500 : 800, to: a.drop < a.v ? 800 : 500, glide: 0.4, dur: 0.45, vol: 0.05 }); }, RM() ? 60 : 380);
        if (G.placed === 1) say(grade[1] === 'soft' ? LN.miss : LN.first, { mood: grade[1] === 'soft' ? 'think' : 'wow', ms: 3600 });
        else if (G.placed === 3) say(LN.third, { mood: 'happy', ms: 3200 });
        else if (grade[1] === 'soft' && G.placed < ANCH.length) say(LN.miss, { mood: 'think', ms: 3000 });
        if (G.placed >= ANCH.length) S.later(twist, off ? 1100 : 700);
        else guideNext(900);
      }

      /* ---------------- twist: the black and white were only the ends ---------------- */
      async function twist() {
        if (G.stage !== 'anchor') return;
        G.stage = 'twist'; K.guide(null);
        tray.classList.remove('is-live'); tray.classList.add('is-out');
        say(care() ? LN.twistCare : LN.twist, { mood: 'wow', ms: 5200 });
        plateB.classList.add('pulse'); plateW.classList.add('pulse');
        G.floodT = 0;
        K.sfx.rise();
        if (A.ctx) { const t0 = A.now(); ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'C6'].forEach((n, i) => A.chime(A.note(n), { when: t0 + 0.1 + i * 0.13, vol: 0.06, dur: 1.2 })); }
        for (let i = 0; i <= 10; i++) S.later(() => { if (G.stage !== 'twist') return; P.emit('star', tubeX(i * 10), L.tubeY, 4, { colors: [specCSS(i * 10), '#ffffff'], speed: [30, 90] }); }, 100 + i * 130);
        if (M && !RM()) M.tempo(inten === 2 ? 116 : 110);
        await K.sleep(2700);
        tray.hidden = true;
        startBlend();
      }

      /* ---------------- step 3: blend today's tin ---------------- */
      function startBlend() {
        G.stage = 'blend'; G.v = 0; G.vs = 0; G.tinOn = 0.01;
        scaleTag.classList.add('is-out');
        mixer.hidden = false; void mixer.offsetWidth; mixer.classList.remove('is-out');
        you.hidden = false; you.style.setProperty('--c', specCSS(0));
        setV(0, true);
        K.sfx.pop(); if (A.ctx) A.tone({ type: 'sine', freq: 300, to: 600, glide: 0.1, dur: 0.16, vol: 0.06 });
        patch.base('think');
        say(serious() ? LN.blendReal : LN.blend, { ms: 5200 });
        guideBlend(1000);
      }
      function guideBlend(delay) { K.guide({ id: 'blend', g: 'drag', dir: 'r', d: clamp(track.clientWidth * 0.4, 80, 200), target: knob, label: 'SLIDE TO BLEND TODAY', delay }); }
      const PAD = 31;
      function kx(v) { return PAD + clamp(v, 0, 100) / 100 * Math.max(10, track.clientWidth - PAD * 2); }
      function setKnob() { knob.style.setProperty('--x', kx(G.v).toFixed(1) + 'px'); knob.style.setProperty('--r', (G.v * 7.2).toFixed(0) + 'deg'); knob.style.setProperty('--c', specCSS(G.v)); }
      function nearest(v) { let b = ANCH[0]; ANCH.forEach(a => { if (Math.abs(a.v - v) < Math.abs(b.v - v)) b = a; }); return b; }
      function setV(v, silent) {
        v = clamp(Math.round(v), 0, 100);
        const was = G.v; G.v = v;
        setKnob();
        num.textContent = String(v); track.setAttribute('aria-valuenow', String(v)); track.setAttribute('aria-valuetext', v + ' out of 100');
        const n = nearest(v);
        nearEl.textContent = (Math.abs(n.v - v) <= 6 ? '≈ ' : 'near ') + n.t; nearEl.style.setProperty('--c', specCSS(n.v));
        ANCH.forEach(a => a.lab.classList.toggle('near', a === n && G.stage !== 'end'));
        you.textContent = 'Today · ' + v; you.style.setProperty('--c', specCSS(v)); G.youW = you.offsetWidth;
        if (!silent && A.ctx && Math.floor(was / 5) !== Math.floor(v / 5)) A.wood(undefined, 0.07, 0.55 + v / 100 * 0.9);
        if (!silent && v !== was) G.moved = true;
      }
      K.drag(track, {
        start: (p) => {
          if (G.stage !== 'blend') return false;
          G.blending = true; track.classList.add('is-on'); knob.style.setProperty('--s', '1.12');
          if (A.ctx && !pourL) pourL = A.loop({ filter: 'bandpass', freq: 500, q: 2.4 });
          setV((p.x - PAD) / Math.max(10, track.clientWidth - PAD * 2) * 100);
          K.sfx.tap();
        },
        move: (p) => { if (G.blending) setV((p.x - PAD) / Math.max(10, track.clientWidth - PAD * 2) * 100); },
        end: () => { if (!G.blending) return; G.blending = false; track.classList.remove('is-on'); knob.style.setProperty('--s', '1'); if (pourL) { const pl = pourL; pourL = null; pl.level(0.0001, 0.08); S.later(() => pl.stop(), 300); } afterBlend(); }
      });
      S.listen(track, 'keydown', (e) => {
        if (G.stage !== 'blend') return;
        const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[e.key];
        if (d) { e.preventDefault(); setV(G.v + d * (e.shiftKey ? 10 : 2)); afterBlend(); }
      });
      function afterBlend() {
        if (!G.moved) { guideBlend(1600); return; }
        const range = G.v < 12 ? 0 : G.v < 40 ? 1 : G.v < 70 ? 2 : G.v < 93 ? 3 : 4;
        if (range !== G.lastRange) { G.lastRange = range; say(serious() ? LN.rangeReal[Math.min(range, 3)] : LN.range[range], { mood: ['calm', 'think', 'happy', 'wow', 'wink'][range], moodMs: 1600, ms: 3800 }); }
        if (!G.ready) {
          G.ready = true; printBtn.hidden = false; printBtn.classList.add('is-new'); K.sfx.ok();
        }
        K.guide({ id: 'print', g: 'hold', target: printBtn, label: 'HOLD TO PRINT', delay: 1900, ms: holdMs + 400 });
      }

      /* ---------------- step 4: hold PRINT ---------------- */
      const holdMs = [1000, 1250, 1450][inten];
      K.hold(printBtn, {
        ms: holdMs, decay: 2.5,
        start: () => {
          if (G.stage !== 'blend' || !G.ready) return;
          printBtn.classList.add('is-down'); K.sfx.tap();
          if (A.ctx && !hiss) hiss = A.loop({ filter: 'highpass', freq: 2600, q: 0.7 });
          if (A.ctx) A.tone({ type: 'sawtooth', freq: 70, to: 140, glide: holdMs / 1000, dur: holdMs / 1000, vol: 0.03, lp: 500 });
        },
        progress: (k) => { G.printK = G.stage === 'blend' ? k : G.printK * 0.9; printBtn.style.setProperty('--k', G.printK.toFixed(3)); },
        cancel: () => { printBtn.classList.remove('is-down'); if (hiss) { const hs = hiss; hiss = null; hs.level(0.0001, 0.08); S.later(() => hs.stop(), 300); } },
        done: () => slam()
      });
      function slam() {
        if (G.stage !== 'blend') return;
        G.stage = 'print'; K.guide(null);
        printBtn.classList.remove('is-down');
        if (hiss) { const hs = hiss; hiss = null; hs.level(0.0001, 0.1); S.later(() => hs.stop(), 400); }
        G.stamp = 1; G.printK = 0; G.shake = RM() ? 0 : 1; G.flash = 0.6;
        K.sfx.thud(); K.sfx.lock();
        if (A.ctx) A.noise({ filter: 'highpass', freq: 3000, dur: 0.6, attack: 0.01, vol: 0.12 });
        [-1, 1].forEach(s => P.emit('smoke', L.prX + s * L.prW * 0.5, L.prBot - 20, 8, { colors: ['rgba(255,255,255,0.6)'], angle: s > 0 ? 0 : Math.PI, spread: 0.8, speed: [40, 120] }));
        P.emit('star', L.prX, L.prBot - 18, 16, { colors: [specCSS(G.v), '#ffffff', '#ffd447'] });
        mixer.classList.add('is-out'); S.later(() => { mixer.hidden = true; }, 400);
        patch.base('happy'); patch.react('bounce');
        showLabel();
        say(serious() ? LN.printedReal : LN.printed, { mood: 'wow', moodMs: 1200, ms: 4000 });
        S.later(finale, RM() ? 2200 : 3800);
      }
      let NEW = null;
      function newLabel() {
        const v = Math.round(G.v), n = nearest(v), lv = lead();
        let stmt = '';
        const bal = String(an.balanced || '').trim();
        if (an.source === 'ai' && bal && bal.split(/\s+/).length <= 24 && !/…$/.test(bal)) stmt = K.sentence(bal);
        else if (v < 12) stmt = 'A real low today: about ' + v + ' out of 100. Low, and still not the whole story.';
        else stmt = 'Not “' + VERDICT + '”. About ' + v + ' out of 100 on the full spectrum.';
        NEW = { v, near: n, stmt, next: serious() && lv ? K.sentence(K.words(lv.text, 18)) : '' };
        return NEW;
      }
      function showLabel() {
        const N = newLabel();
        label.innerHTML = '';
        const p = h('p');
        label.append(h('small', { text: 'New label' }), h('b', { text: N.v + ' / 100' }), h('em', { text: N.near.t }), p);
        if (N.next) label.append(h('p', { class: 'sf-next', text: 'Next step: ' + N.next }));
        void label.offsetWidth; label.classList.add('on');
        if (A.ctx) A.paper({ vol: 0.12 });
        const chars = Array.from(N.stmt); let i = 0;
        const typeIt = () => { if (S.destroyed) return; i = Math.min(chars.length, i + 2); p.textContent = chars.slice(0, i).join(''); if (A.ctx && i % 4 === 0) A.typeKey({ vol: 0.05 }); if (i < chars.length) S.later(typeIt, RM() ? 0 : 24); };
        S.later(typeIt, 360);
      }

      /* ---------------- finale: the banner rolls off the press ---------------- */
      let finished = false;
      async function finale() {
        if (G.stage === 'end') return;
        G.stage = 'end'; K.guide(null);
        ANCH.forEach(a => a.lab.classList.remove('near'));
        label.classList.add('off');
        patch.place(L.ph ? 10 : L.x0, L.H - L.patchSz - 18, 700);
        patch.base('celebrate');
        const N = NEW || newLabel();
        banner.innerHTML = '';
        banner.append(h('b', { text: N.v + ' / 100' }), h('span', { text: N.near.t }));
        banner.hidden = false;
        G.banner = { k: 0 }; G.puffs = true;
        K.sfx.whoosh(); if (A.ctx) { A.noise({ filter: 'bandpass', freq: 600, to: 2400, dur: 1.6, attack: 0.4, vol: 0.06 }); }
        if (M) { M.level(0.95); M.tempo(104); }
        for (let i = 0; i < 6; i++) S.later(() => { if (A.ctx) A.pluck(A.note(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'][i]), { vol: 0.12, damp: 0.996, verb: 0.35 }); }, 200 + i * 260);
        await K.sleep(RM() ? 500 : 1950);
        const colsC = [0, 15, 25, 38, 50, 62, 73, 84, 93, 100].map(v => specCSS(v));
        [6, L.W - 6].forEach(x => P.emit('confetti', x, L.bannerY, inten === 2 ? 60 : 40, { colors: colsC, angle: x < L.W / 2 ? -Math.PI / 3 : -Math.PI * 2 / 3, spread: 0.9, speed: [200, 420] }));
        K.sfx.sparkle();
        say(serious() ? LN.finalReal : LN.final, { ms: 0 });
        await K.finale('confetti', { colors: colsC.slice(1, 9), from: [{ x: L.prX, y: L.chimTop }, { x: tubeX(G.v), y: L.tubeY }], chord: ['C4', 'E4', 'G4', 'C5'], ms: RM() ? 1800 : 4200 });
        const R = rewards();
        finished = true;
        ctx.finish({
          title: serious() ? 'An honest colour, and a plan' : 'Repainted in full colour', mood: 'celebrate',
          lines: ['From ' + VERDICT.toUpperCase() + ' to ' + N.v + ' / 100', 'New label: ' + N.near.t + ' (' + N.v + ')', N.next ? 'Next step: ' + N.next : 'Spectrum calibration: ' + R.pct + '%'],
          share: 'Ran a black-and-white label through the Spectrum Factory: ' + N.v + ' / 100.',
          badges: R.badges
        });
      }
      function rewards() {
        const calib = ANCH.reduce((s, a) => s + a.acc, 0) / Math.max(1, ANCH.length), pct = Math.round(calib * 100);
        const tier = K.tier(calib), best = K.best('calibration', pct, 'higher'), sw = swatchOf(G.v), col = K.collect(sw);
        const badges = [];
        if (tier) badges.push(tier + ' calibration');
        if (best.isNew) badges.push('New best: ' + pct + '% calibration');
        badges.push(col.isNew ? 'Collected: ' + sw + ' swatch' : sw + ' swatch · ' + col.count + ' of 12');
        ctx.track('result', { v: Math.round(G.v), calib: pct, swatches: col.count });
        return { pct, tier, badges };
      }

      /* ---------------- lines (every vibe) ---------------- */
      function lines() {
        return {
          start: { Jolly: 'Welcome to the paint floor! Your thought came in black and white. Let’s find its real colour.', Cheeky: 'Ooh, a black-and-white label. Very dramatic. Let’s mix it properly.', Unfiltered: 'Your brain printed this in black and white. Drop it in. We’ll check it.' },
          startCare: { Jolly: 'This sounds genuinely stressful. Let’s get an honest picture of it, not a pretend-it’s-fine one.', Cheeky: 'This one’s real, so no jokes from me. Let’s get the honest picture.', Unfiltered: 'Serious stuff. We’ll keep it honest. Drop the label in.' },
          black: { Jolly: 'Splash! That’s the black end loaded. Now the white one.', Cheeky: 'Very goth. Now the white card, please.', Unfiltered: 'Black end: loaded. White next.' },
          white: { Jolly: 'And PERFECT at the other end. Power up! Now, everything in between…', Cheeky: 'Perfect. As if. Right, power up!', Unfiltered: 'Both ends loaded. The middle is where the truth lives.' },
          anchor: { Jolly: 'Drag each drop onto the tube. Worst on the left, best on the right.', Cheeky: 'Paint the in-between. Grim stuff left, shiny stuff right.', Unfiltered: 'Place each example on the line. 0 left. 100 right.' },
          first: { Jolly: 'Right on the money! Look, real colour.', Cheeky: 'Show-off. That’s exactly where it lives.', Unfiltered: 'Good. That’s its spot.' },
          miss: { Jolly: 'Close! That one sits a bit further along. I’ll slide it over.', Cheeky: 'Bold choice. The machine disagrees. Sliding it.', Unfiltered: 'Off a bit. Moved it to its spot.' },
          third: { Jolly: 'Look at that, the grey is turning into colour!', Cheeky: 'Grey? Never heard of her. Colour’s coming.', Unfiltered: 'The middle’s filling in. Keep going.' },
          twist: { Jolly: 'See that? Black and white are only the two ends. Look at everything in between!', Cheeky: 'Plot twist: “black and white” is two tiny ends. The rest is a rainbow.', Unfiltered: 'The label only covers one end. The line is much longer.' },
          twistCare: { Jolly: 'Black and white are only the ends. Let’s find where this really sits.', Cheeky: 'The extremes are just the ends. Let’s place this honestly.', Unfiltered: 'Two ends. A long middle. Let’s place it.' },
          blend: { Jolly: 'Now the real question: where does this actually sit? Slide to blend today’s tin.', Cheeky: 'Your turn. Mix the honest colour of it.', Unfiltered: 'Where does it really sit? Slide. Be honest.' },
          blendReal: { Jolly: 'This one has real weight, so be honest. Where does it actually sit? Slide to blend.', Cheeky: 'No sugar-coating. Where does it really sit? Slide.', Unfiltered: 'It’s a real problem. Place it honestly. Slide.' },
          range: [
            { Jolly: 'That’s an honest low. Low isn’t zero, and it isn’t forever.', Cheeky: 'Rough one. Still not the void.', Unfiltered: 'Low. Not zero. Noted.' },
            { Jolly: 'A rough patch, not a total one.', Cheeky: 'Bumpy. Not a write-off.', Unfiltered: 'Rough. Not total.' },
            { Jolly: 'The middle of the spectrum. That’s where most real days live.', Cheeky: 'Smack in the middle, with all the normal humans.', Unfiltered: 'Middle. Where most days land.' },
            { Jolly: 'Way off the black end. Nice and honest.', Cheeky: 'Look at you, practically glowing.', Unfiltered: 'Well up the line. Fair.' },
            { Jolly: 'Near the top! Honest check: not a single slip?', Cheeky: 'Flawless? Bold. I’ll allow it.', Unfiltered: 'Top end. Sure it’s not a slip-free fantasy?' }
          ],
          rangeReal: [
            { Jolly: 'That’s honest. It’s a real knock, and real knocks get a plan, not a pep talk.', Cheeky: 'Fair. It’s a genuine dent. Let’s give it a next step.', Unfiltered: 'Real problem. Real number. Plan next.' },
            { Jolly: 'Hard, and still not total. That gap is where a plan fits.', Cheeky: 'Tough, not finished. Room for a next step.', Unfiltered: 'Hard. Not total. Plan goes here.' },
            { Jolly: 'Honest middle. The worry is real and it isn’t the whole picture.', Cheeky: 'Middle. Real worry, not the apocalypse.', Unfiltered: 'Middle. Real. Manageable.' },
            { Jolly: 'Higher than the label said. Keep the plan anyway.', Cheeky: 'Better than the drama. Still worth a plan.', Unfiltered: 'Higher than feared. Still plan.' }
          ],
          printed: { Jolly: 'Hot off the press! Specific beats extreme, every time.', Cheeky: 'Fresh label. Much more accurate than the old one.', Unfiltered: 'New label. More accurate. Done.' },
          printedReal: { Jolly: 'An honest label, with a next step printed on it.', Cheeky: 'Accurate, and it comes with instructions.', Unfiltered: 'Honest label. Next step included.' },
          final: { Jolly: 'From black and white to full colour. That’s the real shade of it.', Cheeky: 'Look at that banner. Your brain owes you an apology.', Unfiltered: 'Full spectrum. That’s the honest version.' },
          finalReal: { Jolly: 'Honest colour, and a plan to go with it. That’s how real problems get smaller.', Cheeky: 'Real dent, real plan. Very grown-up paint.', Unfiltered: 'Accurate label. Next step printed. Go do it.' }
        };
      }

      /* ---------------- start ---------------- */
      cv.onResize(() => place());
      S.on('theme', () => { el.classList.toggle('sf-dark', K.dark()); el.classList.toggle('sf-bright', !K.dark()); paintBG(); });
      if (ctx.analysisReady && ctx.analysisReady.then) ctx.analysisReady.then(a => {
        if (!a || a === an || G.dropped.black || (G.stage !== 'intro' && G.stage !== 'load')) return;
        an = a; buildTexts();
        cardB.querySelector('.sf-w').textContent = VERDICT; plateB.firstChild.textContent = VERDICT; scaleTag.textContent = DOMN.scale;
        buildTray(); place();
      }).catch(() => {});
      (async () => {
        M = K.music('playful'); M.level(0.45);
        await K.intro({ title: 'Spectrum Factory', sub: SHIFT.name + ': your thought arrived in black and white. This factory only makes colour.', how: 'Drop the labels in, place the paint drops, then blend today’s real shade.', char: 'patch', mood: 'idea' });
        G.stage = 'load';
        if (A.ctx) { A.wood(undefined, 0.12, 0.6); }
        say(care() ? LN.startCare : LN.start, { mood: care() ? 'calm' : 'wink', moodMs: 1400, ms: 5200 });
        K.guide({ id: 'card-b', g: 'tap', target: cardB, label: 'TAP: DROP IT IN', delay: 1300 });
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = performance.now(); while (!fn()) { if (performance.now() - t0 > (ms || 20000)) return false; await K.wait(80); } return true; };
          await until(() => G.stage === 'load', 15000);
          await K.wait(900);
          await K.sim.tap(cardB);
          await until(() => G.dropped.black, 4000);
          await K.wait(700);
          await K.sim.tap(cardW);
          await until(() => G.stage === 'anchor', 8000);
          for (let n = 0; n < ANCH.length; n++) {
            await until(() => G.stage === 'anchor' && !G.drag && ANCH.every(q => !q.fly), 8000);
            await K.wait(500);
            const a = ANCH.find(q => !q.placed); if (!a) break;
            const r = K.rectIn(a.chip), off = n === 2 ? 14 : (n % 2 ? 3 : -2);
            const tx = tubeX(a.v + off), ty = L.tubeY + BLOB_OFF - 6;
            await K.sim.drag(a.chip, { x: r.w / 2, y: r.h / 2 }, { x: tx - r.x, y: ty - r.y }, 650, 16);
            await until(() => a.placed, 3000);
          }
          await until(() => G.stage === 'blend', 15000);
          await K.wait(900);
          const tw = track.clientWidth, th = track.clientHeight;
          await K.sim.drag(track, { x: kx(0), y: th / 2 }, { x: kx(64), y: th / 2 }, 1300, 26);
          await until(() => G.ready, 4000);
          await K.wait(1200);
          const hp = await K.sim.press(printBtn);
          await until(() => G.stage !== 'blend', 9000);
          hp.up();
          void tw;
          await until(() => finished, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
