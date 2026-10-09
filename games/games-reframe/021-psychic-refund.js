/* 021 Psychic Refund — Reframe · REFRAME · Social / Team / Perspective
 * Mechanism: testing mind reading (Beck 1976; Burns 1980). "I know what they think" is treated as a hypothesis, not a
 * fact: what did they actually say or do, what else could it mean, and how could I find out? Answering those three
 * questions lowers certainty in the feared reading and the social anxiety riding on it. Honest: the feared reading stays
 * in the line-up, and when the facts back it, the refund comes with a plan.
 * Verb: rub (crank the replay wheel to see what was filmed, rub the crystal ball to cycle other readings, turn the dial to
 * pick a way to find out; stamp the refund ticket at each stall). Twist: the ball cracks into a mirror: Madame never read
 * minds, and neither do you. Finale: the machine prints a golden refund ticket with the fair thought and the Ferris wheel
 * lights up over the midway.
 */
(function (env) {
  'use strict';
  const FAIRS = [
    { key: 'neon', name: 'Neon Midway', dark: ['#0b0a2a', '#3a1450', '#7a2a6a'], bright: ['#4c5aa8', '#b36aa8', '#f2a3a0'], glow: '#ff4fd8', bulbs: ['#ffd36b', '#ff6fb1', '#6fe3ff'], tentA: '#c2244a', tentB: '#f4e3c3', extra: 'coaster' },
    { key: 'lantern', name: 'Lantern Night', dark: ['#071a2c', '#18355a', '#3c4f6a'], bright: ['#3d6aa0', '#8aa6c8', '#f3c08a'], glow: '#ffb35c', bulbs: ['#ffcf7a', '#ff9d5c', '#ffe7b0'], tentA: '#1f7a82', tentB: '#f2d7a6', extra: 'carousel' },
    { key: 'candy', name: 'Candyfloss Fair', dark: ['#1a0f2e', '#4a2462', '#8a3a7a'], bright: ['#7a6ac8', '#d79ad0', '#ffd0c8'], glow: '#ff9ed1', bulbs: ['#ffd1e8', '#a8e6ff', '#fff3a0'], tentA: '#e0609a', tentB: '#fff0f6', extra: 'bigtop' },
    { key: 'harvest', name: 'Harvest Fair', dark: ['#140c1c', '#3a2030', '#7a3a24'], bright: ['#5a5a9a', '#c08a7a', '#f6c27a'], glow: '#ffb347', bulbs: ['#ffc56b', '#ff8a4d', '#ffe9a8'], tentA: '#b5482a', tentB: '#f3dcb0', extra: 'swing' }
  ];
  const TOOLS = [{ key: 'ball', name: 'Crystal Ball' }, { key: 'tarot', name: 'Tarot Deck' }, { key: 'tea', name: 'Tea Leaves' }, { key: 'palm', name: 'Palm Chart' }, { key: 'stars', name: 'Horoscope Wheel' }];
  const SMOKE = ['#7fd8ff', '#b79bff', '#9ff0c0', '#ffd36b'];
  const FEAR = '#ff5f7a';
  const DECO = "'Fascinate Inline', 'Bungee Inline', Bungee, Impact, 'TeX Gyre Heros Cn', 'DejaVu Sans Condensed', sans-serif";
  const MYST = "'Cinzel Decorative', Cinzel, 'Trajan Pro', Georgia, 'TeX Gyre Bonum', 'DejaVu Serif', serif";
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

  (env.games = env.games || []).push({
    id: 'psychic-refund', mode: 'reframe', name: 'Psychic Refund', verb: 'rub', family: 'REFRAME', minutes: 2,
    parents: ['Social / Team / Perspective', 'Uncertainty / Future Worry / Reassurance', 'Beliefs / Evidence'],
    cast: ['glitch', 'sync', 'patch'], poster: { char: 'glitch', mood: 'scan' },
    fonts: ['Fascinate+Inline', 'Cinzel+Decorative:wght@700;900'],
    tagline: 'A fake psychic says she knows what they think. Demand a refund.',
    why: 'For “I know what they think”: check what was said, what else it means, how to find out.',
    css: `
.g-psychic-refund { --pr-gold: #f6c453; --pr-ink: #1b1030; --pr-cream: #fff6e4; --pr-red: #d6283e;
  --pr-deco: 'Fascinate Inline', 'Bungee Inline', Bungee, Impact, 'TeX Gyre Heros Cn', 'DejaVu Sans Condensed', sans-serif;
  --pr-myst: 'Cinzel Decorative', Cinzel, 'Trajan Pro', Georgia, 'TeX Gyre Bonum', 'DejaVu Serif', serif; }
.g-psychic-refund .pr-fx { z-index: 36; }
.g-psychic-refund .pr-pad { position: absolute; z-index: 14; border-radius: 50%; touch-action: none; cursor: grab; }
.g-psychic-refund .pr-pad:focus-visible { outline: 3px dashed #ffd36b; outline-offset: 6px; }
.g-psychic-refund .pr-card { position: absolute; z-index: 20; border-radius: 16px; padding: 11px 16px 12px; color: var(--pr-cream); text-align: center; display: flex; flex-direction: column; justify-content: center;
  background: linear-gradient(180deg, rgba(44, 18, 66, .95), rgba(22, 9, 38, .95)); box-shadow: 0 0 0 1.5px rgba(246, 196, 83, .6), 0 0 0 5px rgba(20, 8, 30, .45), 0 16px 34px rgba(0, 0, 0, .5); transition: opacity .35s ease, transform .35s ease; }
.g-psychic-refund .pr-card.off { opacity: 0; transform: translateY(12px); pointer-events: none; }
.g-psychic-refund .pr-card.swap { animation: psychic-refund-swap .45s cubic-bezier(.2, 1.3, .4, 1) backwards; }
.g-psychic-refund .pr-card small { display: block; font: 700 12px/1.2 var(--font-ui); letter-spacing: .16em; text-transform: uppercase; color: var(--pr-gold); margin-bottom: 5px; }
.g-psychic-refund .pr-card b { display: block; font: 900 18px/1.15 var(--pr-myst); color: #fff; letter-spacing: .02em; margin-bottom: 4px; }
.g-psychic-refund .pr-card p { margin: 0; font: 500 16px/1.32 var(--font-ui); color: #f1e6ff; text-wrap: balance; }
.g-psychic-refund .pr-card .gk-user { font: 600 17px/1.32 var(--font-ui); color: #fff; }
.g-psychic-refund .pr-card i { display: block; margin-top: 5px; font: italic 500 15px/1.3 var(--font-ui); color: var(--rc, #ffd36b); }
.g-psychic-refund .pr-card .pr-dots { display: flex; justify-content: center; gap: 6px; margin-top: 7px; }
.g-psychic-refund .pr-card .pr-dots span { width: 8px; height: 8px; border-radius: 50%; background: rgba(255, 255, 255, .22); }
.g-psychic-refund .pr-card .pr-dots span.on { background: var(--pr-gold); box-shadow: 0 0 8px rgba(246, 196, 83, .8); }
.g-psychic-refund .pr-leads { display: grid; gap: 5px; text-align: left; }
.g-psychic-refund .pr-leads div { display: grid; grid-template-columns: 48px 1fr; gap: 8px; align-items: baseline; font: 500 14px/1.3 var(--font-ui); color: #eadcff; padding: 3px 0; border-radius: 8px; transition: background .3s ease, color .3s ease, opacity .3s ease; }
.g-psychic-refund .pr-leads em { font: 800 12px/1.2 var(--font-ui); font-style: normal; letter-spacing: .1em; color: var(--pr-gold); }
.g-psychic-refund .pr-leads div.pick { background: rgba(246, 196, 83, .16); color: #fff; padding: 4px 6px; }
.g-psychic-refund .pr-leads div.dim { opacity: .4; }
.g-psychic-refund .pr-viewer { position: absolute; z-index: 18; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 6px; padding: 10px 14px; text-align: center; border-radius: 10px; overflow: hidden;
  background: radial-gradient(120% 120% at 50% 40%, #f6e2b8, #d9b67a 70%, #a8824a); color: #2a1a0a; box-shadow: inset 0 0 0 3px #1a0e06, inset 0 0 30px rgba(60, 30, 5, .6); transition: opacity .3s ease; }
.g-psychic-refund .pr-viewer.off { opacity: 0; }
.g-psychic-refund .pr-viewer::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(0, 0, 0, .06) 0 1px, transparent 1px 3px), radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(40, 20, 5, .45)); }
.g-psychic-refund .pr-viewer small { font: 700 12px/1 var(--font-ui); letter-spacing: .16em; text-transform: uppercase; color: #6a3a14; }
.g-psychic-refund .pr-viewer span { font: 600 16px/1.3 var(--font-ui); color: #22140a; }
.g-psychic-refund .pr-viewer span.gk-user { font-size: 16px; }
.g-psychic-refund .pr-viewer.flick span { animation: psychic-refund-flick .5s steps(4) backwards; }
.g-psychic-refund .pr-viewer.nofilm span { color: #7a2a2a; font-style: italic; }
@keyframes psychic-refund-flick { 0% { opacity: 0; filter: blur(2px); } 50% { opacity: .6; } 100% { opacity: 1; filter: none; } }
@keyframes psychic-refund-swap { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: none; } }
.g-psychic-refund .pr-hole { position: absolute; z-index: 16; transform: translate(-50%, -50%); width: 54px; height: 54px; border-radius: 50%; display: grid; place-items: center; pointer-events: none;
  font: 800 13px/1 var(--font-ui); letter-spacing: .06em; color: #fff7e0; text-shadow: 0 1px 2px rgba(0, 0, 0, .7); }
.g-psychic-refund .pr-hole.pick { color: #ffd36b; }
.g-psychic-refund .pr-ticket { position: absolute; z-index: 22; display: flex; flex-direction: column; gap: 6px; padding: 9px 12px 10px; border-radius: 12px; color: #3a1408;
  background: radial-gradient(circle at 0 50%, transparent 9px, #f7e6c4 9.5px) left / 51% 100% no-repeat, radial-gradient(circle at 100% 50%, transparent 9px, #f7e6c4 9.5px) right / 51% 100% no-repeat;
  box-shadow: 0 16px 26px -8px rgba(0, 0, 0, .55); transition: opacity .5s ease, transform .5s ease; }
.g-psychic-refund .pr-ticket.off { opacity: 0; transform: translateY(24px); pointer-events: none; }
.g-psychic-refund .pr-thead { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 0 10px; font: 700 12px/1 var(--font-ui); letter-spacing: .14em; text-transform: uppercase; color: #9a2a1a; }
.g-psychic-refund .pr-thead b { font: 400 16px/1 var(--pr-deco); letter-spacing: .06em; color: #c2213a; }
.g-psychic-refund .pr-boxes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; flex: 1; padding: 0 6px; }
.g-psychic-refund .pr-box { position: relative; appearance: none; cursor: pointer; border: 2px dashed rgba(154, 42, 26, .45); border-radius: 10px; background: rgba(255, 255, 255, .35); color: #4a1a0c; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 6px 4px; min-height: 44px; transition: background .3s ease, border-color .3s ease, box-shadow .3s ease; }
.g-psychic-refund .pr-box svg { width: 26px; height: 26px; opacity: .8; }
.g-psychic-refund .pr-box b { font: 800 12px/1.1 var(--font-ui); letter-spacing: .08em; text-transform: uppercase; text-align: center; }
.g-psychic-refund .pr-box span { font: 600 12px/1.1 var(--font-ui); color: #8a5a3a; }
.g-psychic-refund .pr-box.ready { border: 2px solid #e8a82a; background: rgba(255, 214, 110, .55); box-shadow: 0 0 0 3px rgba(246, 196, 83, .35), 0 0 18px rgba(246, 196, 83, .7); animation: psychic-refund-ready 1.1s ease-in-out infinite; }
.g-psychic-refund .pr-box.ready span { color: #6a3a0a; }
.g-psychic-refund .pr-box.done { border: 2px solid rgba(194, 33, 58, .55); background: rgba(255, 255, 255, .5); }
.g-psychic-refund .pr-box .pr-ink { position: absolute; left: 50%; top: 50%; width: min(128px, calc(100% - 14px)); height: min(44px, calc(100% - 12px)); transform: translate(-50%, -50%) rotate(-10deg); display: grid; place-items: center; border: 3px solid #c2213a; border-radius: 8px; color: #c2213a; font: 400 15px/1 var(--pr-deco); letter-spacing: .04em; background: rgba(255, 246, 230, .72); animation: psychic-refund-ink .35s cubic-bezier(.2, 1.6, .4, 1) backwards; }
@keyframes psychic-refund-ink { from { opacity: 0; transform: translate(-50%, -50%) rotate(-10deg) scale(1.3); } to { opacity: 1; transform: translate(-50%, -50%) rotate(-10deg) scale(1); } }
@keyframes psychic-refund-ready { 0%, 100% { transform: none; } 50% { transform: translateY(-2px); } }
.g-psychic-refund .pr-box:focus-visible { outline: 3px solid #6a2aa8; outline-offset: 2px; }
.g-psychic-refund .pr-stamp { position: absolute; z-index: 30; width: 62px; height: 78px; pointer-events: none; transform: translate(-50%, -100%); }
.g-psychic-refund .pr-stamp i { position: absolute; left: 50%; top: 0; width: 26px; height: 40px; margin-left: -13px; border-radius: 13px 13px 6px 6px; background: linear-gradient(90deg, #7a4a2a, #b8835a 45%, #7a4a2a); box-shadow: inset 0 -4px 0 rgba(0, 0, 0, .25); }
.g-psychic-refund .pr-stamp b { position: absolute; left: 0; right: 0; bottom: 0; height: 40px; border-radius: 8px; background: linear-gradient(180deg, #4a2a1a, #2a160c 70%, #c2213a 71%); box-shadow: 0 8px 14px rgba(0, 0, 0, .4); }
.g-psychic-refund .pr-stamp.go { animation: psychic-refund-stamp .62s cubic-bezier(.5, 0, .2, 1) forwards; }
@keyframes psychic-refund-stamp { 0% { transform: translate(-50%, -150%) rotate(-8deg); opacity: 0; } 30% { transform: translate(-50%, -150%) rotate(-4deg); opacity: 1; } 52% { transform: translate(-50%, -100%) scale(1.06, .9); } 64% { transform: translate(-50%, -104%) scale(.98, 1.04); } 100% { transform: translate(-50%, -190%) rotate(6deg); opacity: 0; } }
.g-psychic-refund .pr-mirror { position: absolute; z-index: 17; transform: translate(-50%, -50%); display: grid; place-items: center; text-align: center; pointer-events: none; border-radius: 50%;
  font: 900 21px/1.15 var(--pr-myst); color: #1e2a44; text-shadow: 0 1px 0 rgba(255, 255, 255, .8); animation: psychic-refund-mirror 1.2s ease backwards; }
.g-psychic-refund .pr-mirror small { display: block; margin-top: 6px; font: 700 12px/1.2 var(--font-ui); letter-spacing: .12em; text-transform: uppercase; color: #3a4a6a; text-shadow: none; }
@keyframes psychic-refund-mirror { from { opacity: 0; filter: blur(6px); } to { opacity: 1; filter: none; } }
.g-psychic-refund .pr-picks { position: absolute; z-index: 24; display: grid; gap: 6px; }
.g-psychic-refund .pr-pick { appearance: none; border: 0; cursor: pointer; text-align: left; border-radius: 12px; padding: 7px 12px 8px; min-height: 44px; color: #fff6e4; display: grid; grid-template-columns: 12px 1fr; column-gap: 9px; align-items: center;
  background: linear-gradient(180deg, rgba(48, 20, 70, .96), rgba(26, 10, 42, .96)); box-shadow: 0 0 0 1.5px rgba(246, 196, 83, .5), 0 8px 18px rgba(0, 0, 0, .45); animation: psychic-refund-swap .45s cubic-bezier(.2, 1.3, .4, 1) backwards; transition: transform .15s ease, opacity .3s ease, box-shadow .3s ease; }
.g-psychic-refund .pr-pick i { width: 12px; height: 12px; border-radius: 50%; background: var(--rc, #ffd36b); box-shadow: 0 0 10px var(--rc, #ffd36b); }
.g-psychic-refund .pr-pick b { font: 800 13px/1.15 var(--font-ui); letter-spacing: .06em; text-transform: uppercase; color: var(--pr-gold); }
.g-psychic-refund .pr-pick span { grid-column: 2; font: 500 14px/1.25 var(--font-ui); color: #efe4ff; }
.g-psychic-refund .pr-pick:nth-child(2) { animation-delay: .06s; }
.g-psychic-refund .pr-pick:nth-child(3) { animation-delay: .12s; }
.g-psychic-refund .pr-pick:nth-child(4) { animation-delay: .18s; }
.g-psychic-refund .pr-pick:active { transform: scale(.98); }
.g-psychic-refund .pr-pick.chosen { box-shadow: 0 0 0 3px #ffd36b, 0 0 24px rgba(246, 196, 83, .6); }
.g-psychic-refund .pr-pick.gone { opacity: 0; transform: scale(.94); pointer-events: none; }
.g-psychic-refund .pr-pick:focus-visible { outline: 3px solid #ffd36b; outline-offset: 2px; }
.g-psychic-refund .pr-golden { position: absolute; z-index: 52; transform: translateX(-50%); width: min(400px, calc(100% - 32px)); padding: 14px 22px 13px; text-align: center; color: #3a2400; border-radius: 10px;
  background: linear-gradient(115deg, #b8862a 0%, #ffe9a0 26%, #f6c453 46%, #fff4c8 58%, #e0a83a 80%, #fff0b0 100%);
  box-shadow: 0 0 0 2px #7a5410, 0 0 30px rgba(255, 210, 100, .55), 0 20px 40px rgba(0, 0, 0, .5); animation: psychic-refund-print 1.6s cubic-bezier(.3, .8, .3, 1) backwards; }
.g-psychic-refund .pr-shine { position: absolute; inset: 0; border-radius: 10px; overflow: hidden; pointer-events: none; }
.g-psychic-refund .pr-shine::after { content: ""; position: absolute; top: 0; bottom: 0; left: -45%; width: 40%; background: linear-gradient(100deg, transparent, rgba(255, 255, 255, .45), transparent); animation: psychic-refund-sweep 3.4s ease-in-out 1.7s infinite backwards; will-change: transform; }
@keyframes psychic-refund-sweep { 0% { transform: translateX(0); } 55%, 100% { transform: translateX(400%); } }
.g-psychic-refund .pr-golden::before, .g-psychic-refund .pr-golden::after { content: ""; position: absolute; top: 50%; width: 18px; height: 18px; margin-top: -9px; border-radius: 50%; background: #1b1030; }
.g-psychic-refund .pr-golden::before { left: -9px; } .g-psychic-refund .pr-golden::after { right: -9px; }
.g-psychic-refund .pr-golden small { display: block; font: 700 12px/1.2 var(--font-ui); letter-spacing: .18em; text-transform: uppercase; color: #6a4204; }
.g-psychic-refund .pr-golden b { display: block; margin: 4px 0 6px; font: 400 clamp(26px, 8cqw, 40px)/1 var(--pr-deco); letter-spacing: .04em; color: #8a1a10; text-shadow: 0 2px 0 rgba(255, 255, 255, .5); }
.g-psychic-refund .pr-golden p { margin: 0 auto; max-width: 32ch; font: 600 16px/1.35 var(--font-ui); color: #2a1a00; text-wrap: balance; }
.g-psychic-refund .pr-golden em { display: block; margin-top: 8px; padding-top: 7px; border-top: 2px dotted rgba(106, 66, 4, .5); font: 600 14px/1.3 var(--font-ui); font-style: normal; color: #4a2c02; text-wrap: balance; }
.g-psychic-refund .pr-golden em u { display: block; text-decoration: none; font: 700 12px/1.2 var(--font-ui); letter-spacing: .16em; text-transform: uppercase; color: #6a4204; margin-bottom: 2px; }
@keyframes psychic-refund-print { 0% { clip-path: inset(0 0 100% 0); transform: translateX(-50%) translateY(-40px); } 100% { clip-path: inset(0 0 0 0); transform: translateX(-50%); } }
.g-psychic-refund .pr-c-madame .gk-bubble { max-width: min(280px, calc(50cqw - var(--sz, 80px) / 2 - 22px)); }
.g-psychic-refund .pr-c-syn.gk-side-above .gk-bubble { left: auto; right: 0; }
.g-psychic-refund .pr-c-band.gk-side-right .gk-bubble, .g-psychic-refund .pr-c-band.gk-side-left .gk-bubble { max-width: min(280px, calc(100cqw - 2 * var(--sz, 56px) - 54px)); }
.g-psychic-refund.pr-wide .pr-card p { font-size: 17px; }
.g-psychic-refund.pr-wide .pr-viewer span { font-size: 18px; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const TAU = Math.PI * 2, clamp = K.clamp, lerp = K.lerp, hexA = K.hexA, now = () => performance.now();
      const inten = ctx.intensity, RM = () => K.reduced(), visits = K.visits(), bright = () => S.scene() === 'bright';
      const L = (o) => ctx.line(o) || '';
      const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); return (sp > n * 0.55 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; };
      const text = String(ctx.text || ''), hasText = !!text.trim();
      const care = an.safety === 'care';
      const support = an.fear_support === 'strong' ? 'strong' : an.fear_support === 'some' ? 'some' : 'weak';
      let devFair = null; try { if (S.isDev && S.isDev()) devFair = new URLSearchParams(window.location.search).get('fair'); } catch (e) { /* no query */ }
      const FAIR = FAIRS.find(f => f.key === devFair) || K.dailyPick(FAIRS, 5);
      const TOOL = TOOLS[visits % TOOLS.length];
      const UIFONT = (getComputedStyle(el).getPropertyValue('--font-ui') || '').trim() || 'system-ui, sans-serif';

      /* ---------------- what Madame "sees", what was filmed, what else it could mean, how to find out ---------------- */
      const lower = text.toLowerCase();
      const spans = hasText ? (Array.isArray(an.spans) ? an.spans : []).map(s => {
        const q = s && typeof s.quote === 'string' ? s.quote.trim() : ''; if (q.split(/\s+/).length < 2) return null;
        let at = text.indexOf(q); if (at < 0) at = lower.indexOf(q.toLowerCase()); if (at < 0) return null;
        let end = at + q.length; while (end < text.length && /[.!?…]/.test(text[end])) end++;
        return { at, q: text.slice(at, end), kind: s.kind === 'camera' ? 'camera' : 'brain' };
      }).filter(Boolean).sort((a, b) => a.at - b.at) : [];
      const SPEC = /\b(think|thinks|thought|hates?|annoyed|mad at|angry|upset|judg\w*|laughing at|sick of|bored|doesn['’]?t (like|care|want)|don['’]?t (like|care|want)|losing interest|ignoring|on purpose|disappointed|must)\b/i;
      const MIND = (() => {
        const brains = spans.filter(s => s.kind === 'brain');
        const mr = brains.find(s => SPEC.test(s.q)) || brains[brains.length - 1];
        if (mr) return { text: clip(mr.q, 120), user: true };
        if (hasText && (an.thought || an.conclusion)) return { text: K.sentence(clip(an.thought || an.conclusion, 100)), user: false };
        return { text: 'They’re secretly annoyed with you.', user: false, classic: true };
      })();
      let FRAMES = spans.filter(s => s.kind === 'camera').slice(0, [2, 3, 3][inten]).map(s => ({ text: clip(s.q, 140), user: true }));
      if (!FRAMES.length && hasText) FRAMES = (Array.isArray(an.exhibits) ? an.exhibits : []).filter(e => e && e.kind === 'camera' && e.text).slice(0, 2).map(e => ({ text: clip(e.text, 120), user: false }));
      if (!FRAMES.length && hasText) FRAMES = [{ text: clip(an.situation || 'Something happened that you keep thinking about.', 120), user: false }];
      if (!FRAMES.length) FRAMES = [{ text: 'You sent a message. It was read.', user: false }, { text: 'No reply has come yet.', user: false }];
      FRAMES.push({ nofilm: true, text: MIND.text, user: MIND.user });
      const GENERIC = [['THE BUSY DAY', 'Their day filled up and the reply slid down the list.', 'common', 'I meant to answer. Then lunch happened.'], ['THE THING YOU CAN’T SEE', 'Something on their side you don’t know about yet.', 'possible', 'I’m invisible from where you’re standing.'], ['THE ORDINARY REASON', 'Something everyday explains it, with nothing aimed at you.', 'common', 'I’m boring. Boring things happen a lot.']];
      const altsRaw = (Array.isArray(an.alternatives) ? an.alternatives : []).filter(a => a && a.theory);
      let others = altsRaw.filter(a => !a.fear).map(a => ({ name: a.name, theory: a.theory, plaus: a.plausibility, line: a.line }));
      if (others.length < 2) others = others.concat(GENERIC.map(g => ({ name: g[0], theory: g[1], plaus: g[2], line: g[3] }))).slice(0, 3);
      others = others.slice(0, inten === 0 ? 2 : 3);
      const fearAlt = altsRaw.find(a => a.fear);
      const fearR = { name: (fearAlt && fearAlt.name) || 'THE FEAR', theory: MIND.classic ? MIND.text : clip((fearAlt && fearAlt.theory) || an.conclusion || MIND.text, 110), plaus: (fearAlt && fearAlt.plausibility) || 'possible', line: (fearAlt && fearAlt.line) || 'I’m the story you came in with.', fear: true };
      const READ = others.map((a, i) => ({ name: clip(String(a.name || 'ANOTHER READING').toUpperCase(), 28), theory: clip(a.theory, 110), plaus: a.plaus || 'possible', line: clip(a.line || '', 80), col: SMOKE[i % SMOKE.length], fear: false, i })).concat([Object.assign({ col: FEAR, i: others.length }, fearR, { name: clip(String(fearR.name).toUpperCase(), 28), line: clip(fearR.line, 80) })]);
      const leadsIn = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text);
      const DEFAULT_LEAD = { ask: 'Ask one simple, friendly question that would settle it.', steady: 'Give it a little time before deciding what it means.', prepare: 'Decide one small thing you’ll do either way.' };
      const LEADS = [['ask', 'ASK'], ['steady', 'WAIT'], ['prepare', 'PLAN']].map(([k, label]) => { const l = leadsIn.find(x => x.kind === k); return { kind: k, label, text: clip(l ? l.text : DEFAULT_LEAD[k], 110) }; });
      const FAIRLINE = clip(an.balanced || 'One moment fits several stories. I can’t read minds, but I can ask.', 150);

      /* ---------------- state ---------------- */
      const st = { phase: 'intro', scene: 0, cam: 0, camFrom: 0, camTo: 0, camT: 0, frame: -1, reading: -1, seen: new Set(), lead: null, stamps: 0, crack: 0, cracks: [], shattered: 0, mirror: 0,
        rubV: 0, rubA: 0, smokeA: 0, glow: 0, crankA: 0, dialRot: 0, dialHole: -1, dialBack: 0, heat: 0, wheelOn: 0, wheelT: 0, pull: 0, pullTo: 0, beatT: 0, beatN: 0, finished: false, smooth: [], pick: null, flash: 0, shake: 0, zoneBusy: false };
      const M = { W: 0, H: 0, wide: false };
      const P = K.particles({ max: 420 });
      const HOLE_A = [-0.62 * Math.PI, -0.34 * Math.PI, -0.06 * Math.PI], STOP_A = 0.36 * Math.PI;

      /* ---------------- DOM ---------------- */
      const SOFT = softwareGfx();
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFT ? 1 : 1.5 });
      const fx = K.canvas(el, { maxDpr: SOFT ? 1 : 1.5, cls: 'pr-fx' });
      const skyCv = document.createElement('canvas'), farCv = document.createElement('canvas'), midCv = document.createElement('canvas');
      const machCv = [document.createElement('canvas'), document.createElement('canvas'), document.createElement('canvas')], stageCv = document.createElement('canvas');
      let layersDirty = true, stageKey = '', fxLive = false;
      /* finale caches: sky + far behind the wheel lights, and (once the pull-back settles) mid + booth in front */
      const finBackCv = document.createElement('canvas'), finFrontCv = document.createElement('canvas');
      let finKey = '', finFront = false;
      const finSettled = () => st.pullK > 0.97 && st.wheelOn >= 1;
      const pad = h('div', { class: 'pr-pad', role: 'slider', tabindex: '0', 'aria-label': 'Circle here to crank, rub or dial. Arrow keys turn it; at the dial, keys 1 to 3 pick ask, wait or plan.' });
      const card = h('div', { class: 'pr-card off', role: 'status', 'aria-live': 'polite' });
      const viewer = h('div', { class: 'pr-viewer off', 'aria-live': 'polite' });
      const ICON = {
        did: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="9" width="18" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M22 14l6-4v13l-6-4z" fill="currentColor"/></svg>',
        mean: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M10 18c2-5 7-6 10-3s-1 7-4 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
        find: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="17" r="10" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="16" cy="11" r="2" fill="currentColor"/><circle cx="11" cy="15" r="2" fill="currentColor"/><circle cx="12" cy="21" r="2" fill="currentColor"/><path d="M20 22l4 3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>'
      };
      const BOXES = [['did', 'Said or did', 'Replay'], ['mean', 'Could mean', 'Readings'], ['find', 'Find out', 'Dial']].map(([k, lab, sub], i) => {
        const b = h('button', { type: 'button', class: 'pr-box', 'aria-label': lab + ': not checked yet', html: ICON[k] }, h('b', { text: lab }), h('span', { text: sub }));
        b.dataset.i = String(i); K.tap(b, () => stampBox(i)); return b;
      });
      const ticket = h('div', { class: 'pr-ticket off', role: 'group', 'aria-label': 'Refund ticket' }, h('div', { class: 'pr-thead' }, h('span', { text: 'Refund claim' }), h('b', { text: 'Madame Certain' }), h('span', { text: 'No. ' + String(1 + (S.store.get('psychic-refund:refunds', 0) || 0)).padStart(3, '0') })), h('div', { class: 'pr-boxes' }, BOXES));
      const holes = LEADS.map(ld => h('div', { class: 'pr-hole', 'aria-hidden': 'true', text: ld.label }));
      el.append(pad, viewer, card, ticket, ...holes);
      const madame = K.character('glitch', { side: 'right', mood: 'scan', x: 0, y: 0, voice: 300 });
      const pat = K.character('patch', { side: 'right', mood: 'happy', x: 0, y: 0, voice: 620 });
      const syn = K.character('sync', { side: 'left', mood: 'happy', x: 0, y: 0, voice: 520 });
      madame.el.classList.add('pr-c-madame'); syn.el.classList.add('pr-c-syn', 'pr-c-band'); pat.el.classList.add('pr-c-band'); syn.show(false);

      /* ---------------- layout ---------------- */
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        M.W = W; M.H = H; M.wide = W >= 960 && H >= 560;
        el.classList.toggle('pr-wide', M.wide);
        if (!M.wide) {
          const sh = H < 740;
          M.sign = { cx: W / 2, y: 62, w: Math.min(300, W - 70), h: 36 };
          M.top = { x: W / 2 - Math.min(140, W * 0.36), y: 104, w: Math.min(280, W * 0.72), h: sh ? 108 : 124 };
          M.gs = sh ? 70 : 82;
          M.tk = { x: 12, y: H - 14 - (sh ? 118 : 128), w: W - 24, h: sh ? 118 : 128 };
          M.card = { x: 12, w: W - 24, h: sh ? 110 : 124 }; M.card.y = M.tk.y - 10 - M.card.h;
          const bandTop = M.top.y + M.top.h + 6, spare = M.card.y - bandTop;
          M.band = { y: bandTop, h: sh ? 58 : 64 };
          const r = Math.max(60, Math.min(94, (spare - M.band.h - 46) / 2));
          M.ball = { x: W / 2, y: bandTop + M.band.h + 4 + r, r };
          M.cs = sh ? 50 : 56;
          M.pat = { x: 10, y: M.band.y + (M.band.h - M.cs) / 2 }; M.syn = { x: W - 10 - M.cs, y: M.pat.y };
          M.cabW = Math.min(300, W * 0.78);
          M.wheel = { x: W * 0.5, y: H * 0.36, r: Math.min(W * 0.58, H * 0.27) };
        } else {
          M.sign = { cx: W / 2, y: 64, w: 420, h: 46 };
          M.top = { x: W / 2 - 170, y: 120, w: 340, h: 156 };
          M.gs = 116;
          M.tk = { x: W / 2 - 330, y: H - 18 - 136, w: 660, h: 136 };
          M.card = { x: W / 2 - 260, w: 520, h: 116 }; M.card.y = M.tk.y - 12 - M.card.h;
          const bandTop = M.top.y + M.top.h + 8;
          M.band = { y: bandTop, h: 0 };
          const r = Math.min(124, (M.card.y - bandTop - 50) / 2);
          M.ball = { x: W / 2, y: bandTop + 8 + r, r };
          M.cs = 100;
          M.pat = { x: W / 2 - 330 - 150, y: M.ball.y - 70 }; M.syn = { x: W / 2 + 330 + 50, y: M.ball.y - 70 };
          M.cabW = 400;
          M.wheel = { x: W * 0.5, y: H * 0.34, r: Math.min(300, H * 0.32) };
        }
        madame.el.style.setProperty('--sz', M.gs + 'px'); madame.place(W / 2 - M.gs / 2, M.top.y + (M.top.h - M.gs) / 2 + 2);
        [[pat, M.pat], [syn, M.syn]].forEach(([c, p]) => { c.el.style.setProperty('--sz', M.cs + 'px'); c.place(p.x, p.y); });
        pat.side(M.wide ? 'above' : 'right'); syn.side(M.wide ? 'above' : 'left');
        const pr = M.ball.r * 1.32;
        Object.assign(pad.style, { left: (M.ball.x - pr) + 'px', top: (M.ball.y - pr) + 'px', width: pr * 2 + 'px', height: pr * 2 + 'px' });
        Object.assign(card.style, { left: M.card.x + 'px', top: 'auto', bottom: (H - M.card.y - M.card.h) + 'px', width: M.card.w + 'px', height: 'auto', minHeight: M.card.h + 'px', maxHeight: (M.card.y + M.card.h - (M.ball.y + M.ball.r + 20)) + 'px' });
        Object.assign(ticket.style, { left: M.tk.x + 'px', top: M.tk.y + 'px', width: M.tk.w + 'px', height: M.tk.h + 'px' });
        Object.assign(viewer.style, { left: M.top.x + 'px', top: M.top.y + 'px', width: M.top.w + 'px', height: M.top.h + 'px' });
        placeHoles();
        if (st.picksEl) placePicks();
        if (st.mirrorEl) placeMirror();
        if (st.goldEl) placeGold();
        layersDirty = true;
      }
      cv.onResize(() => layout());
      S.on('theme', () => { layersDirty = true; st.fullN = 2; });

      function say(c, line, o) {
        o = o || {};
        if (c === pat || c === syn) {
          if (st.zoneBusy) { if (o.mood) c.face(o.mood, o.moodMs || 1800); return; }
          (c === pat ? syn : pat).hush();
        }
        return c.say(line, o);
      }

      /* ---------------- sound: a calliope waltz in 3/4 ---------------- */
      const SEQ = { bpm: [120, 132, 144][inten], target: [120, 132, 144][inten], next: 0, perfNext: 0, step: 0, q: [], on: false, mode: 'perf', vol: 0.85 };
      const WALTZ = [['F2', ['A4', 'C5', 'F5']], ['D2', ['A4', 'D5', 'F5']], ['A#1', ['A#4', 'D5', 'F5']], ['C2', ['G4', 'C5', 'E5']]];
      const TUNE = ['C5', 'F5', 'A5', 'G5', 'F5', 'D5', 'F5', 'A5', 'A#5', 'A5', 'G5', 'E5', 'F5', null, 'C5', null];
      const audioOn = () => !!(A.ctx && A.ctx.state === 'running');
      function seqLoop() {
        const t = now();
        if (audioOn()) {
          const an0 = A.now();
          if (SEQ.mode !== 'audio') { SEQ.mode = 'audio'; SEQ.next = an0 + Math.max(0.05, ((SEQ.perfNext || t) - t) / 1000); }
          if (SEQ.next < an0 - 1.6) SEQ.next = an0 + 0.03;
          let guard = 0;
          while (SEQ.next < an0 + 0.14 && guard++ < 12) {
            if (SEQ.next >= an0 - 0.03) playStep(SEQ.step, SEQ.next);
            SEQ.q.push({ at: t + (SEQ.next - an0 + A.latency()) * 1000, step: SEQ.step });
            SEQ.next += 60 / SEQ.bpm; SEQ.step++; SEQ.bpm += (SEQ.target - SEQ.bpm) * 0.08;
          }
        } else {
          if (SEQ.mode !== 'perf') { SEQ.mode = 'perf'; SEQ.perfNext = t + 40; }
          if (!SEQ.perfNext || SEQ.perfNext < t - 1600) SEQ.perfNext = t + 30;
          let guard = 0;
          while (SEQ.perfNext <= t + 8 && guard++ < 12) { SEQ.q.push({ at: SEQ.perfNext, step: SEQ.step }); SEQ.perfNext += 60000 / SEQ.bpm; SEQ.step++; SEQ.bpm += (SEQ.target - SEQ.bpm) * 0.08; }
        }
        let n = 0;
        while (SEQ.q.length && SEQ.q[0].at <= t && n++ < 8) { const e = SEQ.q.shift(); onBeat(e.step); }
      }
      function organ(f, when, dur, vol) {
        A.tone({ when, type: 'triangle', freq: f, dur, vol, attack: 0.01, lp: 2600, bus: 'music', detune: -7 });
        A.tone({ when, type: 'square', freq: f, dur: dur * 0.9, vol: vol * 0.35, attack: 0.01, lp: 1800, bus: 'music', detune: 7 });
      }
      function playStep(step, t) {
        if (!SEQ.on || !A.ctx) return;
        const b = step % 3, bar = Math.floor(step / 3) % 4, [bass, ch] = WALTZ[bar], spb = 60 / SEQ.bpm;
        const hush = st.phase === 'readings' || st.phase === 'crack' ? 0.6 : 1, v = SEQ.vol * hush * (st.phase === 'finale' ? 1.15 : 1);
        if (b === 0) { A.pluck(A.note(bass), { when: t, vol: 0.34 * v, damp: 0.993, lp: 520, bus: 'music' }); A.tone({ when: t, type: 'triangle', freq: A.note(bass), dur: spb * 0.8, vol: 0.05 * v, lp: 300, bus: 'music' }); }
        else ch.forEach((n, i) => A.tone({ when: t + i * 0.004, type: 'square', freq: A.note(n) / 2, dur: spb * 0.42, vol: 0.016 * v, attack: 0.005, lp: 1500, bus: 'music' }));
        const mi = Math.floor(step / 3) * 2 + (b === 0 ? 0 : b === 2 ? 1 : -1);
        if (mi >= 0 && b !== 1 && (st.phase === 'finale' || st.phase === 'pronounce' || st.phase === 'refund' || Math.floor(step / 24) % 2 === 0)) { const n = TUNE[mi % TUNE.length]; if (n) organ(A.note(n), t, spb * (b === 0 ? 1.6 : 0.9), 0.035 * v); }
        if (inten > 0 && b === 0 && st.phase !== 'readings') A.noise({ when: t, filter: 'highpass', freq: 7000, dur: 0.05, vol: 0.012 * v, bus: 'music' });
      }
      let rubHiss = null;
      function rubAudio() {
        if (!A.ctx) return;
        if (!rubHiss) { rubHiss = A.loop({ filter: 'bandpass', freq: 2600, q: 3, bus: 'sfx' }); S.onDestroy(() => rubHiss && rubHiss.stop()); }
      }
      const GLASS = ['F5', 'A5', 'C6', 'D6', 'F6', 'A6'];
      function glassNote(i, vol) { if (!A.ctx) return; const f = A.note(GLASS[i % GLASS.length]); A.tone({ when: A.now(), type: 'sine', freq: f, to: f * 1.004, glide: 0.4, dur: 0.9, vol: vol, attack: 0.08, verb: 0.6 }); A.tone({ when: A.now(), type: 'sine', freq: f * 2.01, dur: 0.6, vol: vol * 0.25, attack: 0.1, verb: 0.5 }); }
      const SND = {
        ratchet() { if (A.ctx) A.click({ vol: 0.07 }); },
        flicker() { if (!A.ctx) return; const t = A.now(); for (let i = 0; i < 8; i++) A.noise({ when: t + i * 0.06, filter: 'highpass', freq: 2400 + Math.random() * 900, dur: 0.012, vol: 0.05 }); A.tone({ when: t, type: 'square', freq: 80, dur: 0.06, vol: 0.03, lp: 400 }); },
        voice(i, fear) {
          if (!A.ctx) return; const t = A.now() + 0.05;
          const sets = [['F4', 'A4', 'C5'], ['C5', 'E5', 'G5'], ['D4', 'F4', 'A4'], ['A4', 'C5', 'E5']];
          if (fear) { ['D3', 'D#3', 'A3'].forEach((n, k) => A.tone({ when: t + k * 0.12, type: 'sawtooth', freq: A.note(n), dur: 0.9, vol: 0.03, attack: 0.05, lp: 700, verb: 0.4 })); return; }
          sets[i % sets.length].forEach((n, k) => A.chime(A.note(n) * (i % 2 ? 2 : 1), { when: t + k * 0.1, vol: 0.06, dur: 1.4 }));
          A.pad(sets[i % sets.length].map(n => A.note(n)), { when: t, dur: 1.8, vol: 0.07, attack: 0.3 });
        },
        stamp() { K.sfx.thud(); if (!A.ctx) return; const t = A.now(); A.wood(t, 0.3, 0.6); A.paper({ when: t + 0.02, vol: 0.12 }); A.noise({ when: t, filter: 'lowpass', freq: 500, dur: 0.12, vol: 0.2 }); },
        dialClick() { if (A.ctx) A.click({ vol: 0.06 }); },
        ring() { if (!A.ctx) return; const t = A.now(); for (let i = 0; i < 10; i++) A.tone({ when: t + i * 0.045, type: 'sine', freq: i % 2 ? 1320 : 1180, dur: 0.05, vol: 0.035 }); },
        crack() { K.sfx.glitch(); if (!A.ctx) return; const t = A.now(); A.noise({ when: t, filter: 'highpass', freq: 3600, dur: 0.08, vol: 0.2 }); A.tone({ when: t, type: 'sine', freq: 2400, to: 900, glide: 0.25, dur: 0.3, vol: 0.05 }); },
        shatter() { if (!A.ctx) return; const t = A.now(); for (let i = 0; i < 26; i++) A.noise({ when: t + Math.random() * 0.7, filter: 'highpass', freq: 3000 + Math.random() * 5000, dur: 0.02 + Math.random() * 0.05, vol: 0.05 + Math.random() * 0.08, pan: Math.random() * 1.6 - 0.8 }); ['C6', 'E6', 'G6', 'B6', 'D7'].forEach((n, i) => A.chime(A.note(n), { when: t + 0.05 + i * 0.07, vol: 0.05, dur: 1.6 })); A.thud({ vol: 0.4 }); },
        shimmer() { if (!A.ctx) return; A.pad(['C5', 'E5', 'G5', 'B5'].map(n => A.note(n)), { dur: 3, vol: 0.12, attack: 0.6 }); K.sfx.sparkle(); },
        printer(sec) { if (!A.ctx) return; const t = A.now(); for (let x = 0; x < sec; x += 0.045) A.click({ when: t + x, vol: 0.05 }); A.chime(A.note('A6'), { when: t + sec, vol: 0.1, dur: 1.4 }); }
      };

      /* ---------------- beats: bulbs chase, Madame sways ---------------- */
      function onBeat(step) {
        st.beatT = now(); st.beatN = step;
      }

      /* ---------------- scenes: replay stall (-1), Madame (0), dial stall (1) ---------------- */
      const SIGN = { '-1': 'REPLAY-O-SCOPE', '0': 'MADAME CERTAIN', '1': 'DIAL-A-FACT' };
      const SUBSIGN = { '-1': 'See what really happened', '0': 'I know what they think', '1': 'Find out for real' };
      async function panTo(scene) {
        if (st.scene === scene) return;
        st.camFrom = st.cam; st.camTo = scene; st.camT = now(); st.scene = scene; st.panning = true;
        K.sfx.whoosh(); if (A.ctx) A.whoosh({ vol: 0.12, dur: 0.6, from: 300, to: 1800 });
        hidePanels();
        madame.show(false); syn.show(false);
        await K.wait(RM() ? 120 : 820);
        st.cam = scene; st.panning = false; st.fullN = 2;
        madame.show(scene === 0); syn.show(scene !== 0);
        if (scene !== 0) syn.react('bounce');
        placeHoles();
      }
      function hidePanels() { card.classList.add('off'); viewer.classList.add('off'); holes.forEach(x => { x.hidden = true; }); madame.hush(); syn.hush(); }
      function setCard(parts, o) {
        o = o || {};
        card.replaceChildren(...parts.filter(Boolean));
        card.style.setProperty('--rc', o.col || '#ffd36b');
        card.classList.remove('off', 'swap'); void card.offsetWidth; card.classList.add('swap');
      }

      /* ---------------- the circle gesture: crank, rub, dial ---------------- */
      const R = { down: false, a: 0, acc: 0, last: 0, lastT: 0, clickAcc: 0, speeds: [] };
      function angleAt(p) { const cx = M.ball.x - (parseFloat(pad.style.left) || 0), cy = M.ball.y - (parseFloat(pad.style.top) || 0); return { a: Math.atan2(p.y - cy, p.x - cx), d: Math.hypot(p.x - cx, p.y - cy) }; }
      function wrap(d) { while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
      K.press(pad, {
        down: (p) => {
          const g = angleAt(p); R.down = true; R.a = g.a; R.lastT = now(); R.speeds = [];
          if (st.phase === 'dial') dialDown(g);
          else if (st.phase === 'replay' || st.phase === 'readings' || st.phase === 'crack') { rubAudio(); K.sfx.tap(); }
        },
        move: (p) => {
          if (!R.down) return;
          const g = angleAt(p), d = wrap(g.a - R.a), t = now(), dt = Math.max(1, t - R.lastT);
          R.a = g.a; R.lastT = t;
          if (g.d < M.ball.r * 0.18) return;
          const sp = Math.abs(d) / dt * 1000;
          if (sp > 0.4 && sp < 40) R.speeds.push(sp);
          if (st.phase === 'dial') { dialMove(d); return; }
          if (st.phase === 'replay') crankMove(d);
          else if (st.phase === 'readings' || st.phase === 'crack') rubMove(d, sp);
        },
        up: () => {
          if (!R.down) return; R.down = false;
          if (rubHiss) rubHiss.level(0.0001, 0.1);
          if (R.speeds.length > 8) { const m = R.speeds.reduce((a, b) => a + b, 0) / R.speeds.length, sd = Math.sqrt(R.speeds.reduce((a, b) => a + (b - m) * (b - m), 0) / R.speeds.length); st.smooth.push(clamp(1 - sd / Math.max(0.5, m), 0, 1)); }
          if (st.phase === 'dial') dialUp();
        }
      });
      K.onKey(['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'], (e) => {
        if (document.activeElement !== pad) return;
        e.preventDefault(); const d = (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) * 0.5;
        if (st.phase === 'replay') crankMove(d); else if (st.phase === 'readings' || st.phase === 'crack') rubMove(d, 6);
        else if (st.phase === 'dial') { if (st.dialHole < 0) dialDown({ hole: 0 }); dialMove(Math.abs(d)); }
      });
      K.onKey(['Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3'], (e) => {
        if (st.phase !== 'dial') return;
        const i = Number(String(e.code).slice(-1)) - 1; if (!(i >= 0 && i < 3)) return;
        dialDown({ hole: i }); dialMove(STOP_A - HOLE_A[i]);
      });

      /* stall 1: crank the replay to see what a camera caught */
      function crankMove(d) {
        st.crankA += d; R.acc += Math.abs(d); R.clickAcc += Math.abs(d);
        if (R.clickAcc > Math.PI / 6) { R.clickAcc = 0; SND.ratchet(); }
        st.glow = Math.min(1, st.glow + Math.abs(d) * 0.3);
        if (R.acc >= TAU * (inten === 0 ? 0.75 : 1)) { R.acc = 0; nextFrame(); }
      }
      function nextFrame() {
        if (st.phase !== 'replay') return;
        st.frame++;
        const f = FRAMES[st.frame]; if (!f) return;
        SND.flicker(); K.sfx.chime(st.frame + 2);
        viewer.classList.remove('off', 'flick', 'nofilm'); void viewer.offsetWidth; viewer.classList.add('flick');
        const reel = FRAMES.length - 1;
        if (f.nofilm) {
          viewer.classList.add('nofilm');
          viewer.replaceChildren(h('small', { text: 'Not on the reel' }), h('span', { class: f.user ? 'gk-user' : '', text: '“' + f.text + '”' }), h('small', { text: 'A camera can’t film a thought' }));
          say(syn, L(LINES.nofilm), { mood: 'idea', ms: 3600 });
          ctx.track('replay', { frames: reel });
          K.guide(null);
          S.later(() => readyStamp(0), 900);
        } else {
          viewer.replaceChildren(h('small', { text: (MIND.classic ? 'A classic case · ' : '') + 'Frame ' + (st.frame + 1) + ' of ' + reel }), h('span', { class: f.user ? 'gk-user' : '', text: f.text }));
          if (st.frame === 0) say(syn, L(LINES.frame1), { mood: 'happy', ms: 3000 });
          K.guide({ id: 'crank' + st.frame, g: 'circle', target: pad, r: M.ball.r * 0.62, label: 'KEEP CRANKING', delay: 1700 });
        }
        P.emit('dust', M.ball.x, M.top.y + M.top.h, 6, { colors: ['rgba(255,230,180,0.5)'] }); fxLive = true;
      }

      /* stall 2: rub the crystal ball to cycle readings */
      function rubMove(d, sp) {
        st.smokeA += d * 1.4; R.acc += Math.abs(d);
        st.glow = Math.min(1, st.glow + Math.abs(d) * 0.22);
        st.rubV = Math.min(1, st.rubV + sp * 0.012);
        if (rubHiss) { rubHiss.level(0.006 + st.rubV * 0.03, 0.06); rubHiss.freq(2000 + st.rubV * 1800, 0.08); }
        R.clickAcc += Math.abs(d);
        if (R.clickAcc > Math.PI / 2) { R.clickAcc = 0; glassNote(Math.floor(st.smokeA / 1.6) & 7, 0.03 + st.rubV * 0.03); }
        if (st.phase === 'readings' && R.acc >= TAU * (inten === 0 ? 0.8 : 1)) { R.acc = 0; nextReading(); }
        if (st.phase === 'crack') {
          st.heat = Math.min(1, st.heat + Math.abs(d) / (TAU * [1.6, 2.2, 2.8][inten]));
          if (st.heat > (st.cracks.length + 1) / 5 && st.cracks.length < 5) addCrack();
          if (st.heat >= 1) shatter();
        }
      }
      function nextReading() {
        if (st.phase !== 'readings') return;
        st.reading = (st.reading + 1) % READ.length;
        const r = READ[st.reading]; st.seen.add(st.reading);
        SND.voice(r.i, r.fear);
        P.emit('smoke', M.ball.x, M.ball.y, 10, { colors: [hexA(r.col, 0.35)], speed: [10, 40] }); fxLive = true;
        setCard([h('small', { text: 'Reading ' + (st.reading + 1) + ' of ' + READ.length + ' · ' + r.plaus }), h('b', { text: r.name }), h('p', { text: r.theory }), r.line ? h('i', { text: '“' + r.line + '”' }) : null, dots(READ.length, st.seen)], { col: r.col });
        madame.face(r.fear ? 'smug' : ['think', 'confused', 'wow'][st.reading % 3], 1600);
        if (r.fear && support === 'strong') S.later(() => say(pat, L(LINES.fearStrong), { mood: 'think', ms: 3400 }), 700);
        if (st.seen.size >= READ.length && !st.readingsDone) { st.readingsDone = true; K.guide(null); S.later(() => { say(pat, L(LINES.allReadings), { mood: 'idea', ms: 3400 }); readyStamp(1); }, 1100); }
        else if (!st.readingsDone) K.guide({ id: 'rub' + st.reading, g: 'circle', target: pad, r: M.ball.r * 0.62, label: 'KEEP RUBBING', delay: 2000 });
      }
      function dots(n, seen) { const d = h('div', { class: 'pr-dots', 'aria-hidden': 'true' }); for (let i = 0; i < n; i++) d.append(h('span', { class: seen.has(i) ? 'on' : '' })); return d; }

      /* stall 3: turn the dial to pick a way to find out */
      function holePos(i, rot) { const a = HOLE_A[i] + (rot || 0), rr2 = M.ball.r * 0.64; return { x: M.ball.x + Math.cos(a) * rr2, y: M.ball.y + Math.sin(a) * rr2 }; }
      function placeHoles() { const rot = st.dialHole >= 0 ? st.dialRot : st.dialBack; holes.forEach((e, i) => { const p = holePos(i, rot); e.style.left = p.x.toFixed(1) + 'px'; e.style.top = p.y.toFixed(1) + 'px'; e.hidden = !(st.cam === 1 && !st.panning && (st.phase === 'dial' || st.phase === 'stamp3' || st.phase === 'dialed')); }); }
      function dialDown(g) {
        const rot0 = st.dialBack;   // a returning wheel can be caught mid-spin, like a real rotary dial
        let best = -1;
        if (g.hole != null) best = g.hole;
        else { let bd = 1e9; const px = M.ball.x + Math.cos(g.a) * g.d, py = M.ball.y + Math.sin(g.a) * g.d; for (let i = 0; i < 3; i++) { const hp = holePos(i, rot0), dd = Math.hypot(px - hp.x, py - hp.y); if (dd < bd) { bd = dd; best = i; } } if (bd > M.ball.r * 0.42) best = -1; }
        if (best < 0) { K.sfx.tap(); return; }
        st.dialHole = best; st.dialRot = Math.min(rot0, STOP_A - HOLE_A[best]); st.dialBack = 0; R.clickAcc = 0; K.sfx.tap(); K.guide(null);
        holes.forEach((e, i) => e.classList.toggle('pick', i === best));
        placeHoles();
      }
      function dialMove(d) {
        if (st.dialHole < 0) return;
        const travel = STOP_A - HOLE_A[st.dialHole];
        st.dialRot = clamp(st.dialRot + d, 0, travel);
        R.clickAcc += Math.abs(d); if (R.clickAcc > 0.35) { R.clickAcc = 0; SND.dialClick(); }
        placeHoles();
        if (st.dialRot >= travel - 0.02) dialed(st.dialHole);
      }
      function dialUp() { if (st.phase === 'dial' && st.dialHole >= 0) { st.dialBack = st.dialRot; st.dialHole = -1; holes.forEach(e => e.classList.remove('pick')); K.guide({ id: 'dialr', g: 'circle', target: pad, r: M.ball.r * 0.64, label: 'DIAL ALL THE WAY', delay: 900 }); } }
      function dialed(i) {
        if (st.phase !== 'dial') return;
        st.phase = 'dialed'; st.lead = LEADS[i]; R.down = false;
        const back = st.dialRot; st.dialBack = back; st.dialHole = -1;
        const clicks = Math.round(back / 0.3); for (let k = 0; k < clicks; k++) S.later(() => SND.dialClick(), 60 + k * 55);
        S.later(() => SND.ring(), 120 + clicks * 55);
        holes.forEach((e, k) => e.classList.toggle('pick', k === i));
        const rows = card.querySelectorAll('.pr-leads div'); rows.forEach((r, k) => { r.classList.toggle('pick', k === i); r.classList.toggle('dim', k !== i); });
        say(syn, L(LINES.dialed[LEADS[i].kind]), { mood: 'celebrate', ms: 3200 }); syn.react('bounce');
        ctx.track('lead', { k: i });
        S.later(() => readyStamp(2), 1300);
      }

      /* ---------------- the refund ticket ---------------- */
      function readyStamp(i) {
        st.phase = 'stamp' + (i + 1); st.ready = i;
        BOXES[i].classList.add('ready'); BOXES[i].setAttribute('aria-label', BOXES[i].querySelector('b').textContent + ': ready to stamp');
        K.guide({ id: 'stamp' + i, g: 'tap', target: BOXES[i], label: 'STAMP THE TICKET', delay: 700 });
        if (A.ctx) A.chime(A.note('E6'), { vol: 0.05, dur: 0.8 });
      }
      function stampBox(i) {
        if (st.ready !== i || st.phase !== 'stamp' + (i + 1)) { K.sfx.tap(); return; }
        st.ready = -1; st.phase = 'stamping'; K.guide(null);
        const r = K.rectIn(BOXES[i]);
        const sp = h('div', { class: 'pr-stamp', 'aria-hidden': 'true' }, h('i'), h('b'));
        sp.style.left = r.cx + 'px'; sp.style.top = (r.y + r.h * 0.75) + 'px'; el.append(sp);
        void sp.offsetWidth; sp.classList.add('go');
        S.later(() => {
          SND.stamp(); st.shake = RM() ? 0 : 0.35;
          BOXES[i].classList.remove('ready'); BOXES[i].classList.add('done');
          BOXES[i].append(h('div', { class: 'pr-ink', 'aria-hidden': 'true', text: 'Checked' }));
          BOXES[i].setAttribute('aria-label', BOXES[i].querySelector('b').textContent + ': checked');
          P.emit('spark', r.cx, r.cy, 14, { colors: ['#ffd36b', '#ff6b7a', '#fff3c4'] }); fxLive = true;
          fxText(r.cx, r.y - 26, ['Checked!', 'Considered!', 'Dialled!'][i], '#ffe14d');
          st.stamps++;
          pat.face('celebrate', 1400); pat.react('bounce');
          ctx.track('stamp', { n: st.stamps });
        }, RM() ? 60 : 330);
        S.later(() => sp.remove(), 700);
        S.later(() => { const d = st.stampWait; st.stampWait = null; if (d) d(); }, RM() ? 400 : 1100);
      }
      const waitStamp = () => new Promise(res => { st.stampWait = res; });

      /* ---------------- the twist: the ball cracks into a mirror ---------------- */
      function addCrack() {
        const n = st.cracks.length, a0 = (n * 2.39 + 0.7) % TAU, pts = [];
        let x = Math.cos(a0) * 0.2, y = Math.sin(a0) * 0.2;
        pts.push([x, y]);
        for (let k = 0; k < 5; k++) { const a = a0 + (Math.random() - 0.5) * 1.1; x += Math.cos(a) * 0.17; y += Math.sin(a) * 0.17; pts.push([x, y]); }
        st.cracks.push({ pts, t: now(), branch: pts.slice(2).map(([bx, by], k) => [bx, by, a0 + (k % 2 ? 1 : -1) * (0.7 + Math.random() * 0.5)]) });
        SND.crack(); st.shake = RM() ? 0 : 0.4 + n * 0.08;
        madame.face(['worried', 'surprised', 'gasp', 'meltdown', 'meltdown'][n], 1500); madame.react('shake');
        if (n === 1) say(pat, L(LINES.cracking), { mood: 'wow', ms: 2400 });
      }
      async function shatter() {
        if (st.shattered) return;
        st.phase = 'mirror'; st.shattered = now(); R.down = false; K.guide(null);
        if (rubHiss) rubHiss.level(0.0001, 0.1);
        SND.shatter(); st.flash = RM() ? 0 : 0.9; st.shake = RM() ? 0 : 1;
        pat.hush(); syn.hush();
        fxText(M.ball.x, M.ball.y - M.ball.r * 0.3, 'CRACK!', '#e8f4ff');
        if (TOOL.key !== 'ball') S.later(() => { const tp = toolPos(); fxText(tp.x, tp.y - 24, 'BUSTED!', '#ffd36b'); P.emit('spark', tp.x, tp.y, 12, { colors: ['#ffd36b', '#fff3c4'] }); fxLive = true; K.sfx.pop(undefined, 700); }, 900);
        for (let i = 0; i < (RM() ? 10 : 34); i++) { const a = Math.random() * TAU; P.emit('star', M.ball.x + Math.cos(a) * M.ball.r * 0.8, M.ball.y + Math.sin(a) * M.ball.r * 0.8, 1, { colors: ['#e8f4ff', '#ffffff', '#cfe3ff'], speed: [80, 260], angle: a, spread: 0.5 }); }
        fxLive = true;
        madame.face('meltdown', 1800); madame.react('glitch');
        card.classList.add('off');
        ctx.track('twist', {});
        await K.wait(RM() ? 600 : 1300);
        SND.shimmer();
        say(madame, L(LINES.admit), { mood: 'facepalm', ms: 3400 });
        await K.wait(RM() ? 900 : 1900);
        const m = h('div', { class: 'pr-mirror', role: 'status' }, h('div', null, L(LINES.neither), h('small', { text: 'Mind reading: refunded' })));
        st.mirrorEl = m; el.append(m); placeMirror();
        await K.wait(RM() ? 1200 : 2400);
        say(pat, L(support === 'strong' ? LINES.pickStrong : LINES.pickAsk), { mood: 'think', ms: 3600 });
        showPicks();
      }
      function placeMirror() { const m = st.mirrorEl; if (!m) return; const d = M.ball.r * 1.6; Object.assign(m.style, { left: M.ball.x + 'px', top: M.ball.y + 'px', width: d + 'px', height: d + 'px' }); }
      function placePicks() {
        const e = st.picksEl; if (!e) return;
        const top = M.card.y - (M.wide ? 0 : 6), hh = M.tk.y + M.tk.h - top;
        Object.assign(e.style, { left: M.card.x + 'px', top: top + 'px', width: M.card.w + 'px', maxHeight: hh + 'px' });
      }
      function showPicks() {
        st.phase = 'pick'; card.classList.add('off'); ticket.classList.add('off'); st.zoneBusy = true;
        const box = h('div', { class: 'pr-picks', role: 'group', 'aria-label': 'Which reading is most likely?' });
        READ.forEach((r, i) => {
          const b = h('button', { type: 'button', class: 'pr-pick', style: { '--rc': r.col } }, h('i'), h('b', { text: r.name }), h('span', { text: clip(r.theory, M.wide ? 110 : 70) }));
          K.tap(b, () => choose(i, b)); box.append(b);
        });
        st.picksEl = box; el.append(box); placePicks();
        K.guide({ id: 'pick', g: 'choose', target: () => Array.from(box.querySelectorAll('.pr-pick')), label: 'PICK THE LIKELIEST', delay: 1400 });
      }
      function choose(i, b) {
        if (st.phase !== 'pick') return;
        st.phase = 'chosen'; st.pick = READ[i]; K.guide(null);
        b.classList.add('chosen'); st.picksEl.querySelectorAll('.pr-pick').forEach(x => { if (x !== b) x.classList.add('gone'); });
        K.sfx.great();
        const r = READ[i];
        const line = r.fear ? (support === 'strong' ? LINES.choseFearStrong : LINES.choseFear) : LINES.choseOther;
        st.zoneBusy = false;
        say(pat, L(line), { mood: r.fear ? 'think' : 'happy', ms: 3400 });
        ctx.track('pick', { fear: r.fear ? 1 : 0, i });
        S.later(() => finale(), RM() ? 900 : 2200);
      }

      /* ---------------- finale: golden refund ticket, the Ferris wheel lights up ---------------- */
      function placeGold() {
        const e = st.goldEl; if (!e) return;
        e.style.left = (M.W / 2) + 'px';
        const hh = e.offsetHeight || 200, ay = M.H - 10, sF = M.wide ? 0.55 : 0.58, boothTop = ay + (M.sign.y - 6 - ay) * sF;
        e.style.top = Math.max(64, Math.min(M.wheel.y - hh / 2, boothTop - 12 - hh)) + 'px';
      }
      async function finale() {
        st.phase = 'finale';
        if (st.picksEl) { st.picksEl.remove(); st.picksEl = null; }
        if (st.mirrorEl) { st.mirrorEl.style.transition = 'opacity .5s ease'; st.mirrorEl.style.opacity = '0'; }
        say(madame, L(care ? LINES.refundCare : LINES.refund), { mood: 'shy', ms: 3200 });
        SEQ.target = [126, 138, 150][inten];
        st.pullTo = 1;
        SND.printer(1.4);
        if (!M.wide) { const y = M.H - 16 - M.cs; pat.side('above'); syn.side('above'); pat.place(14, y, 900); syn.place(M.W - 14 - M.cs, y, 900); }
        else { const y = M.H * 0.6; pat.side('right'); syn.side('left'); pat.place(70, y, 900); syn.place(M.W - 70 - M.cs, y, 900); }
        await K.wait(RM() ? 400 : 900);
        const lead = st.lead || LEADS[0];
        const sub = care ? 'For the real question, ask someone qualified.' : clip(lead.text, 90);
        const g = h('div', { class: 'pr-golden', role: 'status' }, h('span', { class: 'pr-shine', 'aria-hidden': 'true' }), h('small', { text: 'Madame Certain · Refund' }), h('b', { text: 'Paid in full' }), h('p', { text: FAIRLINE }), h('em', null, h('u', { text: care ? 'Next' : 'Next step' }), sub.replace(/^Next: /, '')));
        st.goldEl = g; el.append(g); placeGold(); S.later(placeGold, 60);
        await K.wait(RM() ? 200 : 600);
        st.wheelT = now(); st.wheelOn = 0.01;
        K.sfx.win();
        pat.face('celebrate'); pat.react('bounce'); syn.show(true); syn.face('celebrate'); syn.react('bounce');
        const hub = wheelHub();
        K.finale('fireworks', { from: [{ x: hub.x - M.wheel.r * 0.5, y: M.H * 0.9 }, { x: hub.x + M.wheel.r * 0.5, y: M.H * 0.9 }], colors: FAIR.bulbs.concat(['#ffffff']), count: RM() ? 3 : 7, chord: ['F4', 'A4', 'C5', 'F5'], ms: 3800 });
        S.later(() => say(pat, L(care ? LINES.endCare : support === 'strong' ? LINES.endStrong : LINES.end), { mood: 'celebrate', ms: 0 }), 500);
        await K.wait(RM() ? 2400 : 4600);
        finishGame();
      }
      function finishGame() {
        if (st.finished) return; st.finished = true;
        const sm = st.smooth.length ? st.smooth.reduce((a, b) => a + b, 0) / st.smooth.length : 0.6, pct = Math.round(sm * 100);
        const tier = K.tier(sm, [0.3, 0.5, 0.68]), best = K.best('steady', pct, 'higher'), col = K.collect(TOOL.name);
        S.store.set('psychic-refund:refunds', (S.store.get('psychic-refund:refunds', 0) || 0) + 1);
        const badges = [];
        if (tier) badges.push(tier + ' steady hands');
        if (best.isNew) badges.push('New best: ' + pct + '% smooth circles');
        if (col.isNew) badges.push('Busted: ' + TOOL.name + ' (' + Math.min(col.count, TOOLS.length) + '/' + TOOLS.length + ')');
        const lead = st.lead || LEADS[0];
        ctx.finish({
          title: support === 'strong' ? 'Refunded, with a plan' : 'Full refund',
          mood: 'celebrate',
          lines: ['Checked what was actually said or done', (READ.length - 1) + ' other readings next to the feared one', 'Way to find out: ' + lead.label.toLowerCase()],
          share: 'Got a full refund from a fake psychic. Turns out I can’t read minds either.',
          badges: badges.slice(0, 4)
        });
      }

      /* ---------------- canvas: the midway at night ---------------- */
      function rr(g, x, y, w, hh, r) { r = Math.max(0, Math.min(r, w / 2, hh / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      const skyCols = () => FAIR[bright() ? 'bright' : 'dark'];
      function wheelHub() { const k = K.ease.inOutCubic(st.pullK || 0); return { x: M.wheel.x, y: lerp(M.wheel.y, M.wheel.y - 4, k) }; }
      function sizeCv(c, w, hh, dpr) { c.width = Math.max(2, Math.round(w * dpr)); c.height = Math.max(2, Math.round(hh * dpr)); const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, hh); return g; }
      function renderLayers() {
        layersDirty = false; stageKey = ''; st.fullN = 2; finKey = ''; finFront = false;
        const W = M.W, H = M.H, dpr = cv.dpr || 1, sc = skyCols();
        // sky
        let g = sizeCv(skyCv, W, H, dpr);
        let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, sc[0]); gr.addColorStop(0.55, sc[1]); gr.addColorStop(1, sc[2]);
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        const rnd = K.rng(31);
        g.fillStyle = '#ffffff';
        for (let i = 0; i < (M.wide ? 160 : 80); i++) { g.globalAlpha = (bright() ? 0.25 : 0.5) + rnd() * 0.5; const s = rnd() < 0.1 ? 2 : 1.2; g.fillRect(rnd() * W, rnd() * H * 0.55, s, s); }
        g.globalAlpha = 1;
        const mx = W * (M.wide ? 0.16 : 0.12), my = H * 0.1, mr = M.wide ? 30 : 20;
        const mg = g.createRadialGradient(mx, my, 2, mx, my, mr * 4); mg.addColorStop(0, 'rgba(255,248,220,.5)'); mg.addColorStop(1, 'rgba(255,248,220,0)'); g.fillStyle = mg; g.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
        g.fillStyle = '#fff6dc'; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill(); g.fillStyle = sc[0]; g.beginPath(); g.arc(mx + mr * 0.45, my - mr * 0.2, mr * 0.88, 0, TAU); g.fill();
        const hg = g.createRadialGradient(W / 2, H * 0.62, 10, W / 2, H * 0.62, Math.max(W, H) * 0.7); hg.addColorStop(0, hexA(FAIR.glow, bright() ? 0.18 : 0.28)); hg.addColorStop(1, hexA(FAIR.glow, 0)); g.fillStyle = hg; g.fillRect(0, 0, W, H);
        // far: Ferris wheel and the day's attraction (parallax 0.15)
        const fw = W * 1.3; g = sizeCv(farCv, fw, H, dpr); g.translate(W * 0.15, 0);
        drawWheelFrame(g); drawAttraction(g);
        // mid: tents (parallax 0.45)
        const mw = W * 1.9; g = sizeCv(midCv, mw, H, dpr); g.translate(W * 0.45, 0);
        drawTents(g);
        // machines (each its own layer, full parallax)
        for (let i = 0; i < 3; i++) { g = sizeCv(machCv[i], W, H, dpr); drawMachine(g, i - 1); }
      }
      function drawWheelFrame(g) {
        const c = M.wheel, R2 = c.r, n = 16, sc = skyCols();
        const col = bright() ? 'rgba(60,40,90,.55)' : 'rgba(210,190,255,.32)';
        g.strokeStyle = col; g.lineWidth = M.wide ? 4 : 3;
        g.beginPath(); g.arc(c.x, c.y, R2, 0, TAU); g.stroke();
        g.lineWidth = 1.5; g.beginPath(); g.arc(c.x, c.y, R2 * 0.92, 0, TAU); g.stroke();
        for (let i = 0; i < n; i++) { const a = i / n * TAU; g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(c.x + Math.cos(a) * R2, c.y + Math.sin(a) * R2); g.stroke(); }
        g.lineWidth = M.wide ? 6 : 4; g.beginPath(); g.moveTo(c.x - R2 * 0.42, c.y + R2 * 1.25); g.lineTo(c.x, c.y); g.lineTo(c.x + R2 * 0.42, c.y + R2 * 1.25); g.stroke();
        g.fillStyle = col; g.beginPath(); g.arc(c.x, c.y, M.wide ? 12 : 8, 0, TAU); g.fill();
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2, gx = c.x + Math.cos(a) * R2, gy = c.y + Math.sin(a) * R2; g.fillStyle = bright() ? 'rgba(70,40,100,.5)' : 'rgba(180,150,230,.35)'; rr(g, gx - (M.wide ? 13 : 9), gy + 2, M.wide ? 26 : 18, M.wide ? 18 : 12, 4); g.fill(); }
        void sc;
      }
      function drawAttraction(g) {
        const W = M.W, H = M.H, x = W * (M.wide ? 0.2 : 0.14), base = H * (M.wide ? 0.62 : 0.5), s = M.wide ? 1.4 : 0.9;
        g.fillStyle = bright() ? 'rgba(60,40,90,.45)' : 'rgba(200,180,255,.22)'; g.strokeStyle = g.fillStyle; g.lineWidth = 3 * s;
        if (FAIR.extra === 'carousel') { g.beginPath(); g.moveTo(x - 70 * s, base - 70 * s); g.quadraticCurveTo(x, base - 130 * s, x + 70 * s, base - 70 * s); g.closePath(); g.fill(); g.fillRect(x - 74 * s, base - 72 * s, 148 * s, 10 * s); for (let k = -3; k <= 3; k++) g.fillRect(x + k * 20 * s - 1.5 * s, base - 62 * s, 3 * s, 62 * s); g.fillRect(x - 74 * s, base - 6 * s, 148 * s, 8 * s); }
        else if (FAIR.extra === 'bigtop') { g.beginPath(); g.moveTo(x - 90 * s, base); g.lineTo(x - 70 * s, base - 60 * s); g.lineTo(x, base - 120 * s); g.lineTo(x + 70 * s, base - 60 * s); g.lineTo(x + 90 * s, base); g.closePath(); g.fill(); g.fillRect(x - 2 * s, base - 140 * s, 4 * s, 22 * s); }
        else if (FAIR.extra === 'swing') { g.fillRect(x - 5 * s, base - 150 * s, 10 * s, 150 * s); g.beginPath(); g.ellipse(x, base - 150 * s, 60 * s, 12 * s, 0, 0, TAU); g.fill(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; g.beginPath(); g.moveTo(x + Math.cos(a) * 55 * s, base - 148 * s); g.lineTo(x + Math.cos(a) * 85 * s, base - 80 * s); g.stroke(); } }
        else { g.beginPath(); g.moveTo(x - 100 * s, base); g.bezierCurveTo(x - 60 * s, base - 160 * s, x - 10 * s, base - 160 * s, x + 20 * s, base - 60 * s); g.bezierCurveTo(x + 40 * s, base - 10 * s, x + 70 * s, base - 120 * s, x + 110 * s, base - 90 * s); g.stroke(); for (let k = 0; k < 8; k++) g.fillRect(x - 90 * s + k * 26 * s, base - 30 * s - (k % 3) * 25 * s, 3 * s, 60 * s); }
      }
      function drawTents(g) {
        const W = M.W, H = M.H, groundY = M.wide ? H * 0.66 : H * 0.6;
        const spots = M.wide ? [-0.38, -0.12, 0.12, 0.88, 1.1, 1.36] : [-0.4, -0.05, 1.05, 1.4];
        spots.forEach((fxp, i) => {
          const cx = W * fxp, tw = M.wide ? 220 : 150, th = M.wide ? 150 : 110, top = groundY - th;
          const ca = i % 2 ? FAIR.tentB : FAIR.tentA, cb = i % 2 ? FAIR.tentA : FAIR.tentB;
          const stripes = 7;
          for (let k = 0; k < stripes; k++) { g.fillStyle = k % 2 ? cb : ca; g.beginPath(); g.moveTo(cx, top); g.lineTo(cx - tw / 2 + tw * k / stripes, groundY); g.lineTo(cx - tw / 2 + tw * (k + 1) / stripes, groundY); g.closePath(); g.fill(); }
          g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(cx - tw / 2, groundY - 2, tw, 4);
          g.fillStyle = ca; g.beginPath(); g.moveTo(cx, top - 26); g.lineTo(cx + 18, top - 19); g.lineTo(cx, top - 12); g.closePath(); g.fill();
          g.strokeStyle = 'rgba(40,20,20,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, top); g.lineTo(cx, top - 26); g.stroke();
          g.fillStyle = 'rgba(20,8,24,.55)'; g.beginPath(); g.moveTo(cx - 16, groundY); g.lineTo(cx, groundY - th * 0.45); g.lineTo(cx + 16, groundY); g.closePath(); g.fill();
        });
        const gg = g.createLinearGradient(0, groundY, 0, H); gg.addColorStop(0, bright() ? '#6a4a5a' : '#2a1428'); gg.addColorStop(1, bright() ? '#4a3242' : '#120812');
        g.fillStyle = gg; g.fillRect(-W * 0.45, groundY, W * 1.9, H - groundY);
        g.fillStyle = 'rgba(255,255,255,.05)'; for (let x = -W * 0.45; x < W * 1.45; x += 26) g.fillRect(x, groundY + 6 + (Math.round(x) % 3) * 8, 14, 3);
      }
      function sign(g, cx, y, w, hh, title, sub, deco) {
        g.fillStyle = '#2a0f30'; rr(g, cx - w / 2 - 6, y - 4, w + 12, hh + 8, 10); g.fill();
        const gr = g.createLinearGradient(0, y, 0, y + hh); gr.addColorStop(0, deco[0]); gr.addColorStop(1, deco[1]);
        g.fillStyle = gr; rr(g, cx - w / 2, y, w, hh, 8); g.fill();
        g.strokeStyle = '#f6c453'; g.lineWidth = 2; rr(g, cx - w / 2 + 4, y + 4, w - 8, hh - 8, 6); g.stroke();
        let size = M.wide ? 30 : 21; g.font = '400 ' + size + 'px ' + DECO;
        const tw = g.measureText(title).width; if (tw > w - 36) { size = Math.floor(size * (w - 36) / tw); g.font = '400 ' + size + 'px ' + DECO; }
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#2a0a10'; g.fillText(title, cx, y + hh / 2 + 2); g.fillStyle = '#fff2c4'; g.fillText(title, cx, y + hh / 2);
        if (sub) { g.font = '700 12px ' + UIFONT; const sw = g.measureText(sub.toUpperCase()).width + 18; g.fillStyle = '#2a0f30'; rr(g, cx - sw / 2, y + hh + 2, sw, 18, 9); g.fill(); g.fillStyle = '#f6c453'; g.fillText(sub.toUpperCase(), cx, y + hh + 11); }
      }
      function drawMachine(g, idx) {
        const W = M.W, cx = W / 2, top = M.top, b = M.ball, cw = M.cabW, y0 = top.y - 6, y1 = b.y + b.r + (M.wide ? 40 : 30);
        const deco = idx === 0 ? ['#7a1f6a', '#4a0f40'] : idx < 0 ? ['#1f5a5a', '#0f3438'] : ['#a3202a', '#6a1018'];
        // body
        g.fillStyle = 'rgba(0,0,0,.4)'; rr(g, cx - cw / 2 + 8, y0 + 14, cw, y1 - y0, 22); g.fill();
        let gr = g.createLinearGradient(cx - cw / 2, 0, cx + cw / 2, 0); gr.addColorStop(0, deco[1]); gr.addColorStop(0.5, deco[0]); gr.addColorStop(1, deco[1]);
        g.fillStyle = gr; rr(g, cx - cw / 2, y0, cw, y1 - y0, 22); g.fill();
        g.strokeStyle = '#f6c453'; g.lineWidth = 3; rr(g, cx - cw / 2 + 6, y0 + 6, cw - 12, y1 - y0 - 12, 18); g.stroke();
        g.lineWidth = 1.2; g.strokeStyle = 'rgba(246,196,83,.5)'; rr(g, cx - cw / 2 + 12, y0 + 12, cw - 24, y1 - y0 - 24, 14); g.stroke();
        // painted stars and moons
        g.fillStyle = 'rgba(255,230,160,.5)';
        [[0.08, 0.22], [0.92, 0.3], [0.06, 0.62], [0.94, 0.7], [0.1, 0.86], [0.9, 0.9]].forEach(([fx2, fy], k) => { const sx = cx - cw / 2 + cw * fx2, sy = y0 + (y1 - y0) * fy; K.starPath(g, sx, sy, k % 2 ? 6 : 4, k % 2 ? 2.4 : 1.6, 4, 0); g.fill(); });
        // top panel frame
        g.fillStyle = '#1a0a1c'; rr(g, top.x - 8, top.y - 8, top.w + 16, top.h + 16, 14); g.fill();
        g.strokeStyle = '#f6c453'; g.lineWidth = 3; rr(g, top.x - 5, top.y - 5, top.w + 10, top.h + 10, 12); g.stroke();
        if (idx === 0) {
          // velvet curtains behind Madame
          gr = g.createLinearGradient(top.x, 0, top.x + top.w, 0); gr.addColorStop(0, '#5a0a24'); gr.addColorStop(0.5, '#a0183e'); gr.addColorStop(1, '#5a0a24');
          g.fillStyle = gr; rr(g, top.x, top.y, top.w, top.h, 10); g.fill();
          g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; for (let x = top.x + 14; x < top.x + top.w; x += 18) { g.beginPath(); g.moveTo(x, top.y + 4); g.quadraticCurveTo(x + 5, top.y + top.h / 2, x, top.y + top.h - 4); g.stroke(); }
          g.fillStyle = '#f6c453'; g.beginPath(); g.moveTo(top.x, top.y); g.quadraticCurveTo(top.x + top.w * 0.22, top.y + top.h * 0.32, top.x, top.y + top.h * 0.62); g.closePath(); g.globalAlpha = 0.22; g.fill(); g.beginPath(); g.moveTo(top.x + top.w, top.y); g.quadraticCurveTo(top.x + top.w * 0.78, top.y + top.h * 0.32, top.x + top.w, top.y + top.h * 0.62); g.closePath(); g.fill(); g.globalAlpha = 1;
          drawTool(g, idx);
        } else if (idx < 0) {
          g.fillStyle = '#120a06'; rr(g, top.x, top.y, top.w, top.h, 10); g.fill();
          g.fillStyle = '#2a2018'; g.beginPath(); g.ellipse(cx, top.y - 2, top.w * 0.22, 8, 0, Math.PI, 0); g.fill();
        } else {
          gr = g.createLinearGradient(0, top.y, 0, top.y + top.h); gr.addColorStop(0, '#2a1630'); gr.addColorStop(1, '#14081a');
          g.fillStyle = gr; rr(g, top.x, top.y, top.w, top.h, 10); g.fill();
          // the handset on its hook
          const hx = cx, hy = top.y + top.h * 0.56, hw = Math.min(top.w * 0.62, 190), ss = M.wide ? 1.25 : 1;
          g.fillStyle = '#5a1a24'; rr(g, hx - hw / 2 - 8, hy + 12 * ss, hw + 16, 12 * ss, 6); g.fill();
          g.fillStyle = '#f6c453'; [hx - hw / 2 + 10, hx + hw / 2 - 18].forEach(px => g.fillRect(px, hy + 4 * ss, 8, 10 * ss));
          g.lineCap = 'round'; g.strokeStyle = '#141418'; g.lineWidth = 15 * ss; g.beginPath(); g.moveTo(hx - hw / 2 + 18, hy - 6 * ss); g.quadraticCurveTo(hx, hy - 26 * ss, hx + hw / 2 - 18, hy - 6 * ss); g.stroke();
          [-1, 1].forEach(sg => { const ex = hx + sg * (hw / 2 - 16); g.fillStyle = '#18181e'; g.beginPath(); g.ellipse(ex, hy + 1, 22 * ss, 13 * ss, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.ellipse(ex - 7, hy - 4 * ss, 8 * ss, 3.5 * ss, -0.3, 0, TAU); g.fill(); });
          g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 3; g.beginPath(); g.moveTo(hx - hw / 2 + 30, hy - 12 * ss); g.quadraticCurveTo(hx, hy - 30 * ss, hx + hw / 2 - 30, hy - 12 * ss); g.stroke();
          g.lineCap = 'butt';
          g.strokeStyle = '#f6c453'; g.lineWidth = 2; g.beginPath(); g.moveTo(hx - hw / 2 + 4, hy + 14 * ss); for (let k = 0; k < 10; k++) g.quadraticCurveTo(hx - hw / 2 - 6 + k * 3, hy + 26 * ss + k * 3, hx - hw / 2 + k * 3, hy + 22 * ss + k * 3); g.stroke();
          if (!M.wide) { g.font = '700 12px ' + UIFONT; g.fillStyle = '#ffd36b'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ONE CALL · ONE FACT', cx, top.y + 16); }
        }
        // ball / crank / dial pedestal
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(b.x, b.y + b.r + 10, b.r * 0.9, b.r * 0.18, 0, 0, TAU); g.fill();
        if (idx === 0) {
          gr = g.createLinearGradient(b.x - b.r, 0, b.x + b.r, 0); gr.addColorStop(0, '#8a5a14'); gr.addColorStop(0.5, '#f6d27a'); gr.addColorStop(1, '#8a5a14');
          g.fillStyle = gr; g.beginPath(); g.moveTo(b.x - b.r * 0.55, b.y + b.r * 0.82); g.lineTo(b.x + b.r * 0.55, b.y + b.r * 0.82); g.lineTo(b.x + b.r * 0.75, b.y + b.r + 12); g.lineTo(b.x - b.r * 0.75, b.y + b.r + 12); g.closePath(); g.fill();
          g.fillStyle = '#3a0a2a'; rr(g, b.x - 34, y1 - (M.wide ? 30 : 22), 68, 8, 4); g.fill();
          g.font = '700 12px ' + UIFONT; g.fillStyle = '#f6c453'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('REFUNDS', b.x, y1 - (M.wide ? 40 : 32));
        } else {
          g.fillStyle = idx < 0 ? '#0f2a2a' : '#4a0a12'; g.beginPath(); g.arc(b.x, b.y, b.r * 1.12, 0, TAU); g.fill();
          g.strokeStyle = '#f6c453'; g.lineWidth = 3; g.beginPath(); g.arc(b.x, b.y, b.r * 1.12, 0, TAU); g.stroke();
        }
        sign(g, M.sign.cx, M.sign.y, M.sign.w, M.sign.h, SIGN[String(idx)], M.wide ? SUBSIGN[String(idx)] : '', deco);
      }
      function toolPos() { const b = M.ball; return { x: b.x - b.r - (M.wide ? 70 : 34), y: b.y + b.r * 0.55 }; }
      function drawTool(g) {
        if (TOOL.key === 'ball') return;
        const tp = toolPos(), x = tp.x, y = tp.y, s = M.wide ? 1.2 : 0.8;
        g.save(); g.translate(x, y); g.scale(s, s);
        if (TOOL.key === 'tarot') { ['#3a2a6a', '#5a2a7a', '#7a2a5a'].forEach((c, k) => { g.save(); g.rotate(-0.4 + k * 0.35); g.fillStyle = c; rr(g, -11, -34, 22, 34, 3); g.fill(); g.strokeStyle = '#f6c453'; g.lineWidth = 1.5; rr(g, -9, -32, 18, 30, 2); g.stroke(); g.restore(); }); }
        else if (TOOL.key === 'tea') { g.fillStyle = '#f2ece0'; g.beginPath(); g.ellipse(0, -8, 18, 6, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-18, -8); g.quadraticCurveTo(-16, 10, 0, 10); g.quadraticCurveTo(16, 10, 18, -8); g.fill(); g.strokeStyle = '#f2ece0'; g.lineWidth = 3; g.beginPath(); g.arc(20, 0, 6, -1.4, 1.4); g.stroke(); g.fillStyle = '#5a3a1a'; g.beginPath(); g.ellipse(0, -8, 14, 4, 0, 0, TAU); g.fill(); }
        else if (TOOL.key === 'palm') { g.fillStyle = '#f2d6b8'; rr(g, -20, -44, 40, 50, 4); g.fill(); g.strokeStyle = '#a0583a'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, -10, 10, Math.PI * 1.1, Math.PI * 1.9); g.moveTo(-10, -26); g.quadraticCurveTo(0, -18, 12, -26); g.stroke(); }
        else { g.fillStyle = '#1a2a5a'; g.beginPath(); g.arc(0, -18, 22, 0, TAU); g.fill(); g.strokeStyle = '#f6c453'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, -18, 22, 0, TAU); g.arc(0, -18, 14, 0, TAU); g.stroke(); for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 14, -18 + Math.sin(a) * 14); g.lineTo(Math.cos(a) * 22, -18 + Math.sin(a) * 22); g.stroke(); } }
        g.restore();
      }
      function renderStage() {
        const W = M.W, H = M.H, dpr = cv.dpr || 1;
        const g = sizeCv(stageCv, W, H, dpr);
        g.drawImage(skyCv, 0, 0, W, H);
        g.drawImage(farCv, -W * 0.15 - st.cam * W * 0.15, 0, W * 1.3, H);
        g.drawImage(midCv, -W * 0.45 - st.cam * W * 0.45, 0, W * 1.9, H);
        g.drawImage(machCv[st.cam + 1], 0, 0, W, H);
        stageKey = st.cam + ':' + W + 'x' + H + ':' + (bright() ? 'b' : 'd');
      }

      /* dynamic: bulbs, the ball, the crank, the dial, the wheel lights */
      const glowSpr = {};
      function glow(col) { return glowSpr[col] || (glowSpr[col] = K.glowSprite(col)); }
      function bulbs(g, t, camX) {
        const W = M.W, beat = st.beatT ? Math.exp(-(now() - st.beatT) / 260) : 0, fin = st.phase === 'finale' ? 1 : 0;
        for (let s = 0; s < 2; s++) {
          const y0 = (M.wide ? 18 : 12) + s * (M.wide ? 34 : 20), sag = M.wide ? 40 : 22, n = M.wide ? 22 : 12, off = camX * (0.6 + s * 0.15);
          g.strokeStyle = 'rgba(20,10,20,.7)'; g.lineWidth = 1.2; g.beginPath();
          for (let k = 0; k <= 24; k++) { const x = k / 24 * W, y = y0 + Math.sin(k / 24 * Math.PI) * sag; if (k) g.lineTo(x, y); else g.moveTo(x, y); }
          g.stroke();
          for (let k = 0; k < n; k++) {
            const u = (k + 0.5 + s * 0.5) / n, x = ((u * W + off) % W + W) % W, y = y0 + Math.sin((x / W) * Math.PI) * sag + 4;
            const col = FAIR.bulbs[(k + s) % FAIR.bulbs.length], tw = 0.55 + 0.45 * Math.sin(t * 2.2 + k * 1.7 + s), on = clamp(tw * 0.7 + beat * 0.3 * ((k + st.beatN) % 3 === 0 ? 1 : 0) + fin * 0.5, 0, 1);
            g.globalAlpha = on * 0.8; g.drawImage(glow(col), x - 9, y - 9, 18, 18);
            g.globalAlpha = 0.6 + on * 0.4; g.fillStyle = col; g.beginPath(); g.arc(x, y, M.wide ? 2.6 : 2, 0, TAU); g.fill();
          }
        }
        g.globalAlpha = 1;
      }
      function signBulbs(g, t, dx) {
        const s = M.sign, n = M.wide ? 16 : 11, chase = st.beatN;
        for (let k = 0; k < n; k++) {
          [s.y - 4, s.y + s.h + 4].forEach((y, row) => {
            const x = dx + s.cx - s.w / 2 + (k + 0.5) * s.w / n, lit = ((k + row + chase) % 3 === 0) || st.phase === 'finale';
            g.globalAlpha = lit ? 0.95 : 0.35; g.drawImage(glow('#ffe7a0'), x - 7, y - 7, 14, 14);
            g.fillStyle = lit ? '#fff3c4' : '#a08050'; g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill();
          });
        }
        g.globalAlpha = 1; void t;
      }
      function drawBall(g, t, dx) {
        const b = M.ball, x = b.x + dx, y = b.y, r = b.r;
        const rd = st.reading >= 0 ? READ[st.reading] : null, col = st.phase === 'crack' || st.shattered ? '#ff7a5a' : rd ? rd.col : '#b79bff';
        const hot = st.heat;
        const halo = r * (1.38 + st.glow * 0.26 + hot * 0.12);
        g.globalAlpha = 0.35 + st.glow * 0.45 + hot * 0.3; g.drawImage(glow(col), x - halo, y - halo, halo * 2, halo * 2); g.globalAlpha = 1;
        if (st.shattered) { drawMirror(g, x, y, r, t); return; }
        let gr = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
        gr.addColorStop(0, bright() ? 'rgba(235,225,255,.95)' : 'rgba(200,190,255,.9)'); gr.addColorStop(0.55, bright() ? 'rgba(120,100,200,.85)' : 'rgba(70,40,130,.9)'); gr.addColorStop(1, 'rgba(25,10,50,.95)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        g.save(); g.beginPath(); g.arc(x, y, r * 0.97, 0, TAU); g.clip();
        for (let k = 0; k < 6; k++) {
          const a = st.smokeA * (k % 2 ? 1 : -0.7) + k * 1.05 + t * (0.3 + k * 0.05), rr2 = r * (0.18 + (k % 3) * 0.16), sx = x + Math.cos(a) * rr2, sy = y + Math.sin(a) * rr2 * 0.8, sz = r * (0.6 + (k % 2) * 0.3);
          g.globalAlpha = 0.28 + st.glow * 0.3; g.drawImage(glow(k % 3 === 0 ? '#ffffff' : col), sx - sz, sy - sz, sz * 2, sz * 2);
        }
        g.globalAlpha = 1;
        if (hot > 0) { g.fillStyle = hexA('#ff5a3a', hot * 0.3); g.fillRect(x - r, y - r, r * 2, r * 2); }
        g.restore();
        st.cracks.forEach(c => {
          const k = clamp((now() - c.t) / 260, 0, 1), n = Math.max(2, Math.ceil(c.pts.length * k));
          g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineWidth = 2; g.beginPath();
          for (let i = 0; i < n; i++) { const [px, py] = c.pts[i]; if (i) g.lineTo(x + px * r, y + py * r); else g.moveTo(x + px * r, y + py * r); }
          if (k >= 1) c.branch.forEach(([bx, by, ba]) => { g.moveTo(x + bx * r, y + by * r); g.lineTo(x + (bx + Math.cos(ba) * 0.12) * r, y + (by + Math.sin(ba) * 0.12) * r); });
          g.stroke();
        });
        g.globalAlpha = 0.9; g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(x - r * 0.35, y - r * 0.45, r * 0.28, r * 0.14, -0.6, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(x + r * 0.42, y + r * 0.4, r * 0.12, r * 0.06, -0.6, 0, TAU); g.fill(); g.globalAlpha = 1;
        g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r - 1, 0, TAU); g.stroke();
      }
      function drawMirror(g, x, y, r, t) {
        const gr = g.createLinearGradient(x - r, y - r, x + r, y + r);
        gr.addColorStop(0, '#f4f8ff'); gr.addColorStop(0.45, '#c6d4ea'); gr.addColorStop(0.55, '#e8f0ff'); gr.addColorStop(1, '#9fb0cc');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
        const sw = ((t * 0.35) % 1.6) - 0.3;
        g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(x - r + sw * r * 2, y - r); g.lineTo(x - r + sw * r * 2 + r * 0.35, y - r); g.lineTo(x - r + sw * r * 2 - r * 0.25, y + r); g.lineTo(x - r + sw * r * 2 - r * 0.6, y + r); g.closePath(); g.fill();
        g.restore();
        g.strokeStyle = '#f6c453'; g.lineWidth = 6; g.beginPath(); g.arc(x, y, r + 2, 0, TAU); g.stroke();
        g.strokeStyle = 'rgba(80,60,20,.6)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r + 6, 0, TAU); g.stroke();
      }
      function drawCrank(g, t, dx) {
        const b = M.ball, x = b.x + dx, y = b.y, r = b.r, a = st.crankA;
        g.fillStyle = '#0c1c1c'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        g.strokeStyle = '#b9925a'; g.lineWidth = r * 0.12; g.beginPath(); g.arc(x, y, r * 0.86, 0, TAU); g.stroke();
        g.strokeStyle = '#d8b27a'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r * 0.93, 0, TAU); g.stroke();
        g.lineWidth = r * 0.07; g.strokeStyle = '#b9925a';
        for (let k = 0; k < 6; k++) { const aa = a + k / 6 * TAU; g.beginPath(); g.moveTo(x + Math.cos(aa) * r * 0.14, y + Math.sin(aa) * r * 0.14); g.lineTo(x + Math.cos(aa) * r * 0.8, y + Math.sin(aa) * r * 0.8); g.stroke(); }
        g.fillStyle = '#e6c28a'; g.beginPath(); g.arc(x, y, r * 0.16, 0, TAU); g.fill();
        const hx = x + Math.cos(a) * r * 0.86, hy = y + Math.sin(a) * r * 0.86;
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(hx + 3, hy + 4, r * 0.17, 0, TAU); g.fill();
        const hg = g.createRadialGradient(hx - 4, hy - 4, 2, hx, hy, r * 0.17); hg.addColorStop(0, '#ffe2a8'); hg.addColorStop(1, '#a0582a');
        g.fillStyle = hg; g.beginPath(); g.arc(hx, hy, r * 0.17, 0, TAU); g.fill();
        if (st.glow > 0.02) { g.globalAlpha = st.glow * 0.6; g.drawImage(glow('#ffe2a8'), x - r * 1.3, y - r * 1.3, r * 2.6, r * 2.6); g.globalAlpha = 1; }
        void t;
      }
      function drawDial(g, t, dx) {
        const b = M.ball, x = b.x + dx, y = b.y, r = b.r, rot = st.dialHole >= 0 ? st.dialRot : st.dialBack;
        let gr = g.createRadialGradient(x - r * 0.2, y - r * 0.3, r * 0.1, x, y, r);
        gr.addColorStop(0, '#fff8e6'); gr.addColorStop(1, '#e8d2a6');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 0.98, 0, TAU); g.fill();
        g.save(); g.translate(x, y); g.rotate(rot);
        g.fillStyle = '#1b1b22'; g.beginPath(); g.arc(0, 0, r, 0, TAU);
        HOLE_A.forEach(a => { g.moveTo(Math.cos(a) * r * 0.64 + r * 0.2, Math.sin(a) * r * 0.64); g.arc(Math.cos(a) * r * 0.64, Math.sin(a) * r * 0.64, r * 0.2, 0, TAU, true); });
        g.moveTo(r * 0.3, 0); g.arc(0, 0, r * 0.3, 0, TAU, true);
        g.fill('evenodd');
        g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r - 2, -2.4, -0.8); g.stroke();
        HOLE_A.forEach(a => { g.strokeStyle = '#f6c453'; g.lineWidth = 2; g.beginPath(); g.arc(Math.cos(a) * r * 0.64, Math.sin(a) * r * 0.64, r * 0.2, 0, TAU); g.stroke(); });
        g.restore();
        const sa = STOP_A + 0.32; g.fillStyle = '#c0c4cc'; g.save(); g.translate(x + Math.cos(sa) * r * 0.86, y + Math.sin(sa) * r * 0.86); g.rotate(sa); rr(g, -14, -5, 28, 10, 4); g.fill(); g.restore();
        g.fillStyle = '#f6c453'; g.beginPath(); g.arc(x, y, r * 0.26, 0, TAU); g.fill();
        g.fillStyle = '#5a0a14'; g.font = '700 12px ' + UIFONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('FIND', x, y - 6); g.fillText('OUT', x, y + 8);
        void t;
      }
      function drawWheelLights(g, t, camX) {
        if (st.wheelOn <= 0) return;
        const c = M.wheel, cx = c.x + camX * 0.15, n = 32, k = st.wheelOn;
        const spin = t * 0.15;
        for (let i = 0; i < n; i++) {
          const a = i / n * TAU + spin, on = (i / n) <= k * 1.02;
          if (!on) continue;
          const x = cx + Math.cos(a) * c.r, y = c.y + Math.sin(a) * c.r, col = FAIR.bulbs[i % FAIR.bulbs.length], pul = 0.7 + 0.3 * Math.sin(t * 6 + i);
          g.globalAlpha = pul; g.drawImage(glow(col), x - 12, y - 12, 24, 24);
          g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fill();
        }
        if (k > 0.5) {
          g.globalAlpha = (k - 0.5) * 0.9; g.strokeStyle = FAIR.bulbs[0]; g.lineWidth = 1.5;
          for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + spin; g.beginPath(); g.moveTo(cx, c.y); g.lineTo(cx + Math.cos(a) * c.r, c.y + Math.sin(a) * c.r); g.stroke(); }
          g.globalAlpha = (k - 0.5) * 1.2; g.drawImage(glow('#fff3c4'), cx - 40, c.y - 40, 80, 80);
        }
        g.globalAlpha = 1;
      }
      function drawMain(t, dt) {
        const g = cv.g, W = M.W, H = M.H, dpr = cv.dpr || 1;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const sk = st.shake > 0.01 ? st.shake : 0;
        if (sk) { const z = 1 + sk * 0.05; g.translate(W / 2 + st.shX, H * 0.45 + st.shY); g.scale(z, z); g.translate(-W / 2, -H * 0.45); }
        let camX = 0;
        if (st.panning) {
          const k = K.ease.inOutCubic(clamp((now() - st.camT) / (RM() ? 120 : 800), 0, 1)), cam = lerp(st.camFrom, st.camTo, k);
          camX = cam; g.drawImage(skyCv, 0, 0, W, H);
          g.drawImage(farCv, -W * 0.15 - cam * W * 0.15, 0, W * 1.3, H);
          g.drawImage(midCv, -W * 0.45 - cam * W * 0.45, 0, W * 1.9, H);
          for (let i = -1; i <= 1; i++) { const ox = (i - cam) * W; if (Math.abs(ox) < W) { g.drawImage(machCv[i + 1], ox, 0, W, H); centerObj(g, t, i, ox); } }
          if (!RM()) { g.fillStyle = 'rgba(255,255,255,.05)'; for (let k2 = 0; k2 < 14; k2++) g.fillRect(0, (k2 * 67) % H, W, 2); }
        } else {
          const pk = K.ease.inOutCubic(st.pullK || 0);
          if (pk > 0.001) {
            const s = lerp(1, M.wide ? 0.55 : 0.58, pk), ay = H - 10, fk = W + 'x' + H + ':' + dpr + (bright() ? 'b' : 'd');
            if (fk !== finKey) { finKey = fk; finFront = false; const gb = sizeCv(finBackCv, W, H, dpr); gb.drawImage(skyCv, 0, 0, W, H); gb.drawImage(farCv, -W * 0.15, 0, W * 1.3, H); }
            g.drawImage(finBackCv, 0, 0, W, H);
            drawWheelLights(g, t, 0);
            const front = (gf) => {
              gf.drawImage(midCv, -W * 0.45, 0, W * 1.9, H);
              if (st.wheelOn > 0) { gf.globalAlpha = 0.5 * st.wheelOn; gf.drawImage(glow(FAIR.glow), W * 0.5 - W * 0.9, H * 0.82 - H * 0.25, W * 1.8, H * 0.5); gf.globalAlpha = 1; }
              gf.save(); gf.translate(W / 2, ay); gf.scale(s, s); gf.translate(-W / 2, -ay); gf.drawImage(machCv[1], 0, 0, W, H); gf.restore();
            };
            if (finSettled()) { if (!finFront) { finFront = true; front(sizeCv(finFrontCv, W, H, dpr)); } g.drawImage(finFrontCv, 0, 0, W, H); }
            else front(g);
            g.save(); g.translate(W / 2, ay); g.scale(s, s); g.translate(-W / 2, -ay);
            centerObj(g, t, 0, 0); signBulbs(g, t, 0);
            g.restore();
          } else {
            const key = st.cam + ':' + W + 'x' + H + ':' + (bright() ? 'b' : 'd');
            let full = false;
            if (key !== stageKey) { renderStage(); full = true; }
            if (full || sk || st.fullN > 0) { if (st.fullN > 0 && !sk) st.fullN--; g.drawImage(stageCv, 0, 0, W, H); }
            else dirtyRects().forEach(r => { const x = Math.max(0, Math.floor(r.x)), y = Math.max(0, Math.floor(r.y)), w = Math.min(W - x, Math.ceil(r.w) + 1), hh = Math.min(H - y, Math.ceil(r.h) + 1); if (w > 0 && hh > 0) g.drawImage(stageCv, x * dpr, y * dpr, w * dpr, hh * dpr, x, y, w, hh); });
            centerObj(g, t, st.cam, 0);
            signBulbs(g, t, 0);
          }
        }
        bulbs(g, t, camX * W * 0.6);
        void dt;
      }
      /* while the stage is still, only the strings of lights, the marquee and the centre object repaint */
      function dirtyRects() {
        const W = M.W, b = M.ball, sg = M.sign, hr = b.r * 1.78;
        return [{ x: 0, y: 0, w: W, h: M.wide ? 100 : 68 }, { x: sg.cx - sg.w / 2 - 14, y: sg.y - 14, w: sg.w + 28, h: sg.h + 28 }, { x: b.x - hr, y: b.y - hr, w: hr * 2, h: hr * 2 }];
      }
      function centerObj(g, t, idx, ox) { if (idx === 0) drawBall(g, t, ox); else if (idx < 0) drawCrank(g, t, ox); else drawDial(g, t, ox); }
      function madamePos() {
        const pk = K.ease.inOutCubic(st.pullK || 0), W = M.W, H = M.H, s = lerp(1, M.wide ? 0.55 : 0.58, pk), ay = H - 10;
        const by = M.top.y + M.top.h / 2 + 2;
        return { x: W / 2, y: ay + (by - ay) * s, s };
      }
      function fitFont(g, txt, size, maxW, fam) { g.font = '400 ' + size + 'px ' + fam; const w = g.measureText(txt).width; if (w > maxW) { size = Math.floor(size * maxW / w); g.font = '400 ' + size + 'px ' + fam; } return size; }
      const FXT = [];
      function fxText(x, y, txt, col) { FXT.push({ x, y, txt, col, t0: now() }); fxLive = true; }
      function drawFx(dt) {
        const g = fx.g, W = M.W, H = M.H; if (!g) return;
        const active = st.flash > 0.01 || P.count() > 0 || FXT.length > 0;
        if (!active && !fxLive) return;
        g.setTransform(fx.dpr, 0, 0, fx.dpr, 0, 0); g.clearRect(0, 0, W, H);
        fxLive = active; if (!active) return;
        if (st.flash > 0.01) { g.fillStyle = 'rgba(240,248,255,' + (st.flash * 0.6).toFixed(3) + ')'; g.fillRect(0, 0, W, H); st.flash = Math.max(0, st.flash - dt * 2.4); }
        P.update(dt); P.draw(g);
        for (let i = FXT.length - 1; i >= 0; i--) {
          const f = FXT[i], age = (now() - f.t0) / 1000; if (age > 1.4) { FXT.splice(i, 1); continue; }
          const k = age / 1.4, sc = RM() ? 1 : age < 0.12 ? lerp(1.6, 1, age / 0.12) : 1;
          const size = fitFont(g, f.txt, M.wide ? 44 : 32, W - 40, DECO), hw = g.measureText(f.txt).width / 2 + 14, fx0 = clamp(f.x, hw, W - hw);
          g.save(); g.globalAlpha = clamp(k < 0.7 ? age / 0.06 : 1 - (k - 0.7) / 0.3, 0, 1); g.translate(fx0, f.y - k * 26); g.rotate(-0.06); g.scale(sc, sc);
          g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = Math.max(3, size * 0.14); g.strokeStyle = '#2a0a20'; g.strokeText(f.txt, 0, 0); g.fillStyle = f.col || '#ffe14d'; g.fillText(f.txt, 0, 0);
          g.restore();
        }
      }
      K.loop((dt, t) => {
        seqLoop();
        if (!M.W || !cv.g) return;
        if (layersDirty) renderLayers();
        st.glow = Math.max(0, st.glow - dt * 0.55); st.rubV = Math.max(0, st.rubV - dt * 1.6);
        if (st.phase === 'crack' && !R.down) st.heat = Math.max(st.cracks.length / 5 * 0.9, st.heat - dt * 0.04);
        if (st.dialBack > 0 && st.dialHole < 0) { st.dialBack = Math.max(0, st.dialBack - dt * 5); placeHoles(); }
        if (st.wheelT) st.wheelOn = clamp((now() - st.wheelT) / (RM() ? 400 : 1700), 0.01, 1);
        const pk0 = st.pullK || 0; st.pullK = pk0 + ((st.pullTo || 0) - pk0) * Math.min(1, dt * 1.6);
        if (st.pullK > 0.002 && Math.abs(st.pullK - pk0) > 0.0005) { const p = madamePos(), sz = M.gs * p.s; madame.el.style.setProperty('--sz', sz.toFixed(1) + 'px'); madame.place(p.x - sz / 2, p.y - sz / 2); }
        /* camera shake lives inside the canvas (cheap); moving the whole DOM root repaints everything */
        if (st.shake > 0) {
          st.shake = Math.max(0, st.shake - dt * 2.6); st.shX = (Math.random() - 0.5) * st.shake * 12; st.shY = (Math.random() - 0.5) * st.shake * 8;
          if (st.shake <= 0.01) { st.shake = 0; st.fullN = Math.max(st.fullN || 0, 1); }
        }
        st.fr = (st.fr || 0) + 1;
        const busy = st.panning || R.down || st.shake > 0 || st.glow > 0.02 || (st.phase === 'finale' && !finSettled()) || st.phase === 'mirror' || st.dialBack > 0 || (st.pullK > 0.002 && st.pullK < 0.97);
        if (busy || st.fr % 2 === 0) drawMain(t, dt);
        drawFx(dt);
      });

      /* ---------------- lines (every one in three vibes) ---------------- */
      const LINES = {
        hello: visits ? { Jolly: 'Back for more? Madame’s got a new trick. Let’s bust it.', Cheeky: 'Madame’s at it again. New gadget, same nonsense.', Unfiltered: 'New trick. Same refund.' }
          : { Jolly: 'Ooh, a fortune machine! Let’s see what she claims.', Cheeky: 'A psychic in a box. What could go wrong?', Unfiltered: 'Fortune machine. Let’s test her.' },
        seeIt: { Jolly: 'I SEE IT CLEARLY.', Cheeky: 'Behold. I KNOW.', Unfiltered: 'I KNOW what they think.' },
        classic: { Jolly: 'No story today? My classic, then!', Cheeky: 'Nothing typed? I’ll do my classic.', Unfiltered: 'My classic reading.' },
        demand: { Jolly: 'That’s a big claim. Let’s get proof at three stalls.', Cheeky: 'Proof, please. We’re collecting a refund.', Unfiltered: 'Prove it. Three stalls. Go.' },
        replayHi: { Jolly: 'Replay-o-scope! Crank it to see what a camera caught.', Cheeky: 'Crank it. Real footage only. No psychics.', Unfiltered: 'Crank. Camera footage only.' },
        frame1: { Jolly: 'That’s the footage. Words and actions, nothing added.', Cheeky: 'Footage. No mind reading in it. Shocking.', Unfiltered: 'Just footage.' },
        nofilm: { Jolly: 'Notice? Nobody filmed what anyone thought.', Cheeky: 'Funny. The camera missed the mind reading.', Unfiltered: 'Thoughts aren’t on film.' },
        rubHi: { Jolly: 'Rub the ball, dear!', Cheeky: 'Rub. Gently. Antique.', Unfiltered: 'Rub it.' },
        allReadings: { Jolly: 'Same facts, several readings. Hers was just one of them.', Cheeky: 'Four readings fit the facts. Hers isn’t special.', Unfiltered: 'Several fit. Hers is one.' },
        fearStrong: { Jolly: 'Some facts here are real. Take them seriously, and check the rest.', Cheeky: 'Real talk: some of this is real. Plan for that part.', Unfiltered: 'Some of it’s real. Plan for it.' },
        dialHi: { Jolly: 'Dial-a-Fact! Pick a real way to find out.', Cheeky: 'Real answers, one call. Dial something.', Unfiltered: 'Dial a way to check.' },
        dialed: {
          ask: { Jolly: 'Asking! The fastest refund there is.', Cheeky: 'Just ask. Wild idea. Works.', Unfiltered: 'Ask. Simple.' },
          steady: { Jolly: 'Waiting a bit lets the facts arrive.', Cheeky: 'Patience. The facts are on their way.', Unfiltered: 'Wait. Facts take time.' },
          prepare: { Jolly: 'A plan works whatever they think.', Cheeky: 'A plan. Mind reading not required.', Unfiltered: 'Plan. Works either way.' }
        },
        refundAsk: { Jolly: 'Three stamps! Time to demand that refund.', Cheeky: 'Ticket’s stamped. Refund time.', Unfiltered: 'Stamped. Refund.' },
        noRefund: { Jolly: 'Refund? Never! Rub it and see!', Cheeky: 'Rub it. I’m never wrong.', Unfiltered: 'Rub. I’m right.' },
        cracking: { Jolly: 'Er… is it supposed to crack?', Cheeky: 'That’s not a good noise.', Unfiltered: 'It’s cracking.' },
        admit: { Jolly: 'Fine! I never read minds.', Cheeky: 'Okay. I just guess.', Unfiltered: 'I can’t read minds.' },
        neither: { Jolly: 'Neither do you.', Cheeky: 'Neither do you.', Unfiltered: 'Neither do you.' },
        pickAsk: { Jolly: 'Nobody can. So which reading is most likely?', Cheeky: 'So. Which one would you actually bet on?', Unfiltered: 'Pick the likeliest.' },
        pickStrong: { Jolly: 'Nobody can. But the facts lean one way. Which is likeliest?', Cheeky: 'Facts lean somewhere here. Be honest: which one?', Unfiltered: 'Facts lean. Pick honestly.' },
        choseOther: { Jolly: 'A fair bet, and one you can check.', Cheeky: 'Good bet. Now you can check it.', Unfiltered: 'Fair. Check it.' },
        choseFear: { Jolly: 'Possible. Also one of several. Your check will tell.', Cheeky: 'Could be. Could be the others too. Check.', Unfiltered: 'Possible. Not proven. Check.' },
        choseFearStrong: { Jolly: 'Honest pick. Then it gets a plan, not a panic.', Cheeky: 'Honest. So we plan, not spiral.', Unfiltered: 'Honest. Plan it.' },
        refund: { Jolly: 'Your refund. In full.', Cheeky: 'Full refund. Shh.', Unfiltered: 'Refund. Full.' },
        refundCare: { Jolly: 'Your refund. Ask an expert.', Cheeky: 'Refund. Ask a pro.', Unfiltered: 'Refund. See an expert.' },
        end: { Jolly: 'Best refund ever. Look, the whole fair lit up!', Cheeky: 'Refund secured. Ferris wheel agrees.', Unfiltered: 'Refunded. Look at that wheel.' },
        endStrong: { Jolly: 'Mind reading refunded. Real worry kept, with a plan.', Cheeky: 'Psychic busted. Plan made. Good trade.', Unfiltered: 'Mind reading gone. Plan kept.' },
        endCare: { Jolly: 'Refunded. The real question deserves proper answers.', Cheeky: 'Psychic’s gone. Ask a qualified human next.', Unfiltered: 'Refunded. Get proper advice.' }
      };

      /* ---------------- flow ---------------- */
      (async () => {
        await K.intro({ title: 'Psychic Refund', sub: 'Madame Certain says she knows what they think. Prove it, or pay up.', how: 'Circle to crank, rub and dial. Stamp the refund ticket at each stall.', char: 'glitch', mood: 'scan' });
        layout();
        SEQ.on = true;
        st.phase = 'pronounce';
        ticket.classList.remove('off');
        say(pat, L(LINES.hello), { mood: 'happy', ms: 3000 });
        await K.wait(RM() ? 600 : 1500);
        if (MIND.classic) madame.say(L(LINES.classic), { mood: 'scan', ms: 2400 });
        else madame.say(L(LINES.seeIt), { mood: 'scan', ms: 2400 });
        st.glow = 1; SND.voice(0, false); P.emit('smoke', M.ball.x, M.ball.y, 14, { colors: ['rgba(183,155,255,0.35)'], speed: [10, 40] }); fxLive = true;
        setCard([h('small', { text: MIND.classic ? 'Madame’s classic reading' : 'Madame Certain sees' }), h('p', null, h('span', { class: MIND.user ? 'gk-user' : '', text: '“' + MIND.text + '”' })), h('i', { text: 'Price of the reading: your peace of mind' })], { col: '#ffd36b' });
        await K.wait(RM() ? 1600 : 3600);
        say(pat, L(LINES.demand), { mood: 'determined', ms: 3000 });
        await K.wait(RM() ? 900 : 2000);
        // stall 1: the replay
        await panTo(-1);
        st.phase = 'replay'; R.acc = 0;
        say(syn, L(LINES.replayHi), { mood: 'happy', ms: 3400 });
        viewer.classList.remove('off'); viewer.replaceChildren(h('small', { text: 'Replay-o-scope' }), h('span', { text: 'Crank to roll the footage' }));
        K.guide({ id: 'crank', g: 'circle', target: pad, r: M.ball.r * 0.62, label: 'CRANK TO REPLAY', delay: 800 });
        await waitStamp();
        // stall 2: the readings
        await panTo(0);
        st.phase = 'readings'; R.acc = 0;
        madame.say(L(LINES.rubHi), { mood: 'scan', ms: 2800 });
        setCard([h('small', { text: 'Other readings' }), h('p', { text: 'Rub the ball to see what else it could mean.' })], { col: '#b79bff' });
        K.guide({ id: 'rub', g: 'circle', target: pad, r: M.ball.r * 0.62, label: 'RUB THE BALL', delay: 900 });
        await waitStamp();
        // stall 3: the dial
        await panTo(1);
        st.phase = 'dial'; st.dialHole = -1; st.dialRot = 0; placeHoles();
        say(syn, L(LINES.dialHi), { mood: 'happy', ms: 3000 });
        setCard([h('small', { text: 'How could you find out?' }), h('div', { class: 'pr-leads' }, LEADS.map(ld => h('div', null, h('em', { text: ld.label }), h('span', { text: ld.text }))))], { col: '#ffd36b' });
        K.guide({ id: 'dial', g: 'circle', target: pad, r: M.ball.r * 0.64, label: 'DIAL A WAY TO CHECK', delay: 900 });
        await waitStamp();
        // the twist
        await panTo(0);
        st.phase = 'refund';
        say(pat, L(LINES.refundAsk), { mood: 'determined', ms: 2600 });
        await K.wait(RM() ? 700 : 1600);
        madame.say(L(LINES.noRefund), { mood: 'smug', ms: 3000 });
        setCard([h('small', { text: 'Refund demanded' }), h('p', { text: 'Madame insists. Rub the ball and let it prove her right.' })], { col: '#ff7a5a' });
        st.phase = 'crack'; R.acc = 0; st.heat = 0;
        K.guide({ id: 'crack', g: 'circle', target: pad, r: M.ball.r * 0.62, label: 'RUB IT. PROVE IT.', delay: 1200 });
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = now(); while (!fn()) { if (now() - t0 > (ms || 30000)) return false; await K.wait(80); } return true; };
          const stampIt = async (i) => { await until(() => st.phase === 'stamp' + (i + 1), 20000); await K.wait(500); for (let k = 0; k < 3 && st.phase === 'stamp' + (i + 1); k++) { await K.sim.tap(BOXES[i]); await K.wait(500); } };
          const circle = async (turns, ms) => {
            const pr = M.ball.r * 1.32, rad = M.ball.r * 0.7, steps = Math.round(turns * 18), c = await K.sim.press(pad, pr + rad, pr);
            for (let i = 1; i <= steps; i++) { const a = i / 18 * TAU; await K.wait(ms / steps); c.move(pr + Math.cos(a) * rad, pr + Math.sin(a) * rad); }
            c.up(pr + Math.cos(steps / 18 * TAU) * rad, pr + Math.sin(steps / 18 * TAU) * rad);
          };
          await until(() => st.phase === 'replay', 40000);
          await K.wait(900);
          while (st.phase === 'replay') { await circle(1.15, 1100); await K.wait(250); }
          await stampIt(0);
          await until(() => st.phase === 'readings', 20000); await K.wait(900);
          while (st.phase === 'readings') { await circle(1.15, 1100); await K.wait(450); }
          await stampIt(1);
          await until(() => st.phase === 'dial', 20000); await K.wait(1000);
          const dialOnce = async (frac) => {
            await until(() => st.dialBack <= 0.001, 4000);
            const pr = M.ball.r * 1.32, rad = M.ball.r * 0.64, a0 = HOLE_A[0], travel = STOP_A - a0;
            const c = await K.sim.press(pad, pr + Math.cos(a0) * rad, pr + Math.sin(a0) * rad);
            for (let i = 1; i <= 16; i++) { const a = a0 + travel * frac * Math.min(1.06, i / 15); await K.wait(55); c.move(pr + Math.cos(a) * rad, pr + Math.sin(a) * rad); }
            c.up(); await K.wait(700);
          };
          await dialOnce(0.45);
          for (let k = 0; k < 4 && st.phase === 'dial'; k++) await dialOnce(1);
          await stampIt(2);
          await until(() => st.phase === 'crack', 20000); await K.wait(900);
          while (st.phase === 'crack') { await circle(1.2, 1000); await K.wait(150); }
          await until(() => st.phase === 'pick', 20000); await K.wait(1300);
          for (let k = 0; k < 3 && st.phase === 'pick'; k++) { const b = st.picksEl && st.picksEl.querySelector('.pr-pick'); if (b) await K.sim.tap(b); await K.wait(600); }
          await until(() => st.finished, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
