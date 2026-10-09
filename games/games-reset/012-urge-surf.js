/* 012 Urge Surf — Reset · CHOOSE · Urges / Habit Loops
 * Mechanism: urge surfing (Marlatt & Gordon 1985; Bowen & Marlatt 2009). An urge rises, peaks and passes like a wave when
 * you ride it without acting on it; staying with the crest and watching the fall teaches that the urge is temporary.
 * The player keeps Rush balanced in the glowing pocket of three golden-hour waves while the buoy that carries their urge
 * pulls at the board. At the peak the wave becomes a slow-motion barrel to hold a steady line through; then it breaks
 * into foam and the urge meter falls on its own. The last, smaller wave sways with a slow breath (4 in, 6 out).
 * Verb: balance (drag left and right to stay in the glow). Finale: paddle in at sunset; footprints count the waves
 * ridden, Rush's board stands in the wet sand and Drop draws a heart beside it while rings run out across the shore.
 */
(function (env) {
  'use strict';
  /* Today's break: each has its own light for dark and bright. */
  const BREAKS = [
    { id: 'honey', name: 'Honey Point', land: 'palms',
      dark: { skyTop: '#1b2257', skyMid: '#8a3f74', skyLow: '#ff9e5e', dusk: '#c2456b', sun: '#ffd88a', stars: 0, seaFar: '#5a4777', seaNear: '#123a5c', lip: '#8af5df', face: '#1d97a3', trough: '#0b3d5e', foam: '#fff4e3', spot: '#ffe9a8', trail: '#ffd27a', land: '#1c1530', sand: '#c9925f', wet: '#7a4c4c', cloud: '#5b3a6e', rim: '#ffb27a' },
      bright: { skyTop: '#5d8fe0', skyMid: '#f2a07e', skyLow: '#ffd39a', dusk: '#f07a6a', sun: '#fff1c4', stars: 0, seaFar: '#7ea3c4', seaNear: '#1f6f93', lip: '#a6fff0', face: '#25b0b8', trough: '#13608a', foam: '#ffffff', spot: '#fff3c8', trail: '#ffbf5a', land: '#5b4a72', sand: '#efc792', wet: '#b9836f', cloud: '#f3c3b4', rim: '#fff0d0' } },
    { id: 'kelp', name: 'Kelp Reef', land: 'pines',
      dark: { skyTop: '#1a2238', skyMid: '#5d5873', skyLow: '#f2a07c', dusk: '#b0566a', sun: '#ffc8a0', stars: 0, seaFar: '#3f5363', seaNear: '#0f2a36', lip: '#a8e6d6', face: '#2f7d80', trough: '#10333f', foam: '#eef6f4', spot: '#ffe3c4', trail: '#ffc49a', land: '#121c22', sand: '#8f8174', wet: '#4a4550', cloud: '#3e4258', rim: '#ffb592' },
      bright: { skyTop: '#7f9cc0', skyMid: '#c9b6c4', skyLow: '#ffc9a8', dusk: '#e98a7a', sun: '#ffe6cf', stars: 0, seaFar: '#8aa3b0', seaNear: '#2d5d6c', lip: '#c3f2e6', face: '#3f9a98', trough: '#1d4d5d', foam: '#ffffff', spot: '#fff0dc', trail: '#ff9f73', land: '#3c4c55', sand: '#cbbca8', wet: '#8a7f80', cloud: '#e2d6dc', rim: '#fff3e6' } },
    { id: 'glow', name: 'Glow Bay', land: 'island', night: true,
      dark: { skyTop: '#050a1e', skyMid: '#0e1a42', skyLow: '#2c3d7c', dusk: '#1c2a62', sun: '#f2f4ff', stars: 1, seaFar: '#0b1430', seaNear: '#040a1c', lip: '#5ff2ff', face: '#0d3a5a', trough: '#05172e', foam: '#a9fbff', spot: '#7ffcff', trail: '#5ff2ff', land: '#03060f', sand: '#2a2c45', wet: '#141a33', cloud: '#141d44', rim: '#7d8fd8' },
      bright: { skyTop: '#283d86', skyMid: '#4f5fa8', skyLow: '#9a8fd0', dusk: '#6f62b4', sun: '#ffffff', stars: 0.55, seaFar: '#33447e', seaNear: '#162a5a', lip: '#7ff7ff', face: '#1f5f8a', trough: '#11305e', foam: '#d6feff', spot: '#a8fdff', trail: '#6ff4ff', land: '#1a2148', sand: '#6f6a96', wet: '#3b3f72', cloud: '#5a62a8', rim: '#c8d0ff' } },
    { id: 'dawn', name: 'Dawn Patrol', land: 'dunes',
      dark: { skyTop: '#2a2350', skyMid: '#b06a8f', skyLow: '#ffc0a0', dusk: '#d77a8c', sun: '#fff0d0', stars: 0.2, seaFar: '#7a6a94', seaNear: '#203e63', lip: '#b7f3e8', face: '#3d8fa6', trough: '#1a456a', foam: '#fff8f4', spot: '#fff1d9', trail: '#ffc6b0', land: '#2b2242', sand: '#d2a892', wet: '#8a6272', cloud: '#7a5585', rim: '#ffd2b8' },
      bright: { skyTop: '#8fb2ee', skyMid: '#ffc0d0', skyLow: '#ffe4c8', dusk: '#ffa8a8', sun: '#fffaf0', stars: 0, seaFar: '#9fb5d6', seaNear: '#3e7fa6', lip: '#ccfff4', face: '#55b1c6', trough: '#2a6b92', foam: '#ffffff', spot: '#fff8e6', trail: '#ff9f8f', land: '#8a7aa6', sand: '#f2d2bc', wet: '#c4979e', cloud: '#ffe2ea', rim: '#ffffff' } }
  ];
  /* Boards are earned by a smooth ride (tiers), never by luck. */
  const BOARDS = [
    { name: 'Driftwood', base: '#c8955c', a: '#9a6a3a', b: '#e2b37a' },
    { name: 'Bronze Stripe', base: '#fdf3e2', a: '#c9773a', b: '#8f4a1c' },
    { name: 'Silver Fin', base: '#f4f7fb', a: '#8fb0cc', b: '#4f6f8d' },
    { name: 'Gold Sunburst', base: '#fff1c4', a: '#ffc93e', b: '#f0821f' }
  ];
  const PENTA_D = ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6', 'A6', 'B6'];
  const CHORDS = [['D2', ['D4', 'F#4', 'A4', 'C#5', 'E5']], ['B1', ['B3', 'D4', 'F#4', 'A4', 'C#5']], ['G1', ['G3', 'B3', 'D4', 'F#4', 'A4']], ['A1', ['A3', 'C#4', 'E4', 'F#4', 'B4']]];

  const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, k) => { const p = hex(a), q = hex(b); k = Math.max(0, Math.min(1, k)); return `rgb(${Math.round(p[0] + (q[0] - p[0]) * k)},${Math.round(p[1] + (q[1] - p[1]) * k)},${Math.round(p[2] + (q[2] - p[2]) * k)})`; };
  const rgba = (c, a) => { const p = hex(c); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; };
  const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const ios = (x) => -(Math.cos(Math.PI * Math.max(0, Math.min(1, x))) - 1) / 2;

  /* The player's urge, shortened to a buoy label in their own words ("text my ex" -> TEXT MY EX). */
  function urgeLabel(s) {
    let t = String(s || '').replace(/[“”"]/g, '').replace(/…/g, ' ').replace(/\s+/g, ' ').trim();
    t = t.split(/\s+(?:and|but|because|so|then)\s+|[,.;:!?]/i)[0].trim();
    if (!t) return '';
    let out = '';
    for (const x of t.split(' ')) { if ((out + ' ' + x).trim().length > 24) break; out = (out + ' ' + x).trim(); }
    return (out || t.slice(0, 24)).toUpperCase();
  }
  /* A body word they used ("my chest feels tight" -> chest), for "Notice it in your chest". */
  function bodyWord(list) {
    const map = { chest: 'chest', heart: 'chest', stomach: 'stomach', belly: 'stomach', gut: 'stomach', throat: 'throat', jaw: 'jaw', shoulders: 'shoulders', neck: 'neck', hands: 'hands', head: 'head' };
    for (const b of (Array.isArray(list) ? list : [])) { const m = /\b(chest|heart|stomach|belly|gut|throat|jaw|shoulders|neck|hands|head)\b/i.exec(String(b || '')); if (m) return map[m[1].toLowerCase()]; }
    return '';
  }

  (env.games = env.games || []).push({
    id: 'urge-surf', mode: 'reset', name: 'Urge Surf', verb: 'balance', family: 'CHOOSE', minutes: 2,
    parents: ['Urges / Habit Loops', 'Emotion', 'Panic / Body Alarm'],
    cast: ['rush', 'drop'], poster: { char: 'rush', mood: 'determined' }, fonts: ['Shrikhand', 'Caveat:wght@600;700'],
    tagline: 'Ride the urge like a wave: it builds, it peaks, it passes.',
    why: 'For an urge that pulls hard: ride it out on the wave until it passes. No acting required.',
    css: `
.g-urge-surf { --font-display: "Shrikhand", "Cooper Black", "Arial Rounded MT Bold", "Inter", "Poppins", system-ui, sans-serif; --us-hand: "Caveat", "Segoe Print", "Bradley Hand", "Chalkboard SE", "Poppins", system-ui, sans-serif;
  --ui-bg: #1b2257; --ui-surface: #2b1f46; --ui-fg: #fff4e6; --ui-muted: #e6d2e2; --ui-accent: #ffb35c; --ui-accent-ink: #2a1405; --ui-line: rgba(255, 236, 214, 0.22); --ui-scrim: rgba(20, 10, 30, 0.55);
  --us-tag: #fff3e2; --us-tag-ink: #3a1a12; background: #1b2257; color-scheme: dark; }
.tsg[data-scene="bright"] .g-urge-surf { --ui-surface: #fff7ee; --ui-fg: #2c1a2e; --ui-muted: #6d5466; --ui-accent: #c9542a; --ui-accent-ink: #ffffff; --ui-line: rgba(60, 30, 40, 0.18); --ui-scrim: rgba(60, 30, 40, 0.35); background: #5d8fe0; color-scheme: light; }
.g-urge-surf .us-pad { position: absolute; inset: 0; z-index: 20; touch-action: none; cursor: grab; outline: none; -webkit-tap-highlight-color: transparent; }
.g-urge-surf .us-pad.us-grab { cursor: grabbing; }
.g-urge-surf .us-pad:focus-visible { box-shadow: inset 0 0 0 3px rgba(255, 228, 160, 0.85); }
.g-urge-surf .us-buoy { position: absolute; left: 0; top: 0; z-index: 24; pointer-events: none; will-change: transform; display: flex; flex-direction: column; align-items: flex-start; gap: 3px; transition: opacity 1.2s ease; }
.g-urge-surf .us-buoy.us-gone { opacity: 0; }
.g-urge-surf .us-kick { font: 700 12px/1 var(--font-ui); letter-spacing: 0.14em; text-transform: uppercase; color: #fff3e2; text-shadow: 0 1px 6px rgba(20, 8, 30, 0.85); padding-left: 2px; }
.g-urge-surf .us-tag { display: block; max-width: min(200px, 48cqw); padding: 6px 10px 5px; border-radius: 8px; background: var(--us-tag); color: var(--us-tag-ink); font: 700 15px/1.15 var(--font-ui); letter-spacing: 0.04em;
  text-transform: uppercase; text-wrap: balance; box-shadow: 0 4px 0 rgba(120, 40, 30, 0.35), 0 8px 18px rgba(10, 4, 20, 0.35); border: 1px solid rgba(120, 50, 30, 0.25); position: relative; }
.g-urge-surf .us-tag::after { content: ""; position: absolute; left: 16px; bottom: -9px; width: 2px; height: 9px; background: rgba(255, 243, 226, 0.75); }
.g-urge-surf .us-buoy.us-pulling .us-tag { animation: urge-surf-tug 0.9s ease-in-out infinite; }
@keyframes urge-surf-tug { 0%, 100% { transform: translateX(0) rotate(0deg); } 50% { transform: translateX(-3px) rotate(-2deg); } }
.g-urge-surf .us-prompt { position: absolute; left: 0; top: 0; z-index: 25; font: 700 clamp(26px, 7.4cqw, 36px)/1.04 var(--us-hand); color: #fffaf0; width: max-content; max-width: min(300px, calc(100cqw - 96px)); text-align: center; text-wrap: balance; pointer-events: none; opacity: 0;
  text-shadow: 0 2px 10px rgba(30, 10, 40, 0.65), 0 0 24px rgba(255, 220, 160, 0.4); transition: opacity 1s ease; will-change: transform, opacity; }
.g-urge-surf .us-prompt.us-on { opacity: 1; }
.g-urge-surf .us-cap { position: absolute; left: 50%; top: 21%; z-index: 26; transform: translate(-50%, -40%); text-align: center; pointer-events: none; opacity: 0; transition: opacity 1.2s ease, transform 1.4s cubic-bezier(.2, .9, .3, 1); width: max-content; max-width: calc(100% - 32px); }
.g-urge-surf .us-cap.us-on { opacity: 1; transform: translate(-50%, -50%); }
.g-urge-surf .us-cap b { display: block; font: 800 clamp(40px, 12.5cqw, 68px)/1.02 var(--font-display); font-synthesis: none; color: #fff8ea; letter-spacing: 0.01em; text-shadow: 0 4px 0 rgba(140, 50, 50, 0.38), 0 10px 30px rgba(30, 10, 40, 0.5); }
.g-urge-surf .us-cap span { display: block; margin-top: 10px; font: 600 15px/1.35 var(--font-ui); letter-spacing: 0.05em; color: #fff4e6; text-shadow: 0 2px 8px rgba(20, 10, 30, 0.8); }
.g-urge-surf .us-cap i { display: block; margin-top: 4px; font: 500 13px/1.3 var(--font-ui); font-style: normal; letter-spacing: 0.04em; color: #ffe9cf; opacity: 0.92; text-shadow: 0 2px 8px rgba(20, 10, 30, 0.8); }
.g-urge-surf .us-meter { position: absolute; right: 21px; top: 140px; z-index: 32; width: 46px; height: 230px; display: flex; flex-direction: column; align-items: center; gap: 6px; pointer-events: none; opacity: 0;
  padding: 9px 0 8px; border-radius: 23px; background: rgba(16, 10, 36, 0.34); box-shadow: inset 0 0 0 1px rgba(255, 244, 230, 0.14);
  transform: translateX(14px); transition: opacity 0.8s ease, transform 0.8s cubic-bezier(.2, .9, .3, 1); }
.g-urge-surf .us-meter.us-on { opacity: 1; transform: none; }
.g-urge-surf .us-meter > b { font: 700 12px/1 var(--font-ui); letter-spacing: 0.14em; color: #fff3e2; text-shadow: 0 1px 6px rgba(20, 8, 30, 0.9); }
.g-urge-surf .us-track { position: relative; flex: 1; width: 14px; border-radius: 10px; background: rgba(12, 10, 32, 0.42); border: 1px solid rgba(255, 244, 230, 0.35); box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.35); }
.g-urge-surf .us-fill { position: absolute; left: 1px; right: 1px; bottom: 1px; height: calc((var(--lv, 1) - 1) / 9 * (100% - 2px)); min-height: 6px; border-radius: 8px; background: linear-gradient(to top, #47d6c4, #ffd36b 58%, #ff7a59); box-shadow: 0 0 12px rgba(255, 196, 120, 0.55); }
.g-urge-surf .us-num { position: absolute; left: 50%; bottom: calc((var(--lv, 1) - 1) / 9 * 100%); width: 36px; height: 36px; margin: 0 0 -18px -18px; border-radius: 50%; background: #fff3e2; color: #3a1a12;
  font: 400 19px/36px var(--font-display); text-align: center; box-shadow: 0 4px 0 rgba(120, 40, 30, 0.3), 0 6px 16px rgba(10, 4, 20, 0.4); }
.g-urge-surf .us-num.us-tick { animation: urge-surf-tick 0.32s cubic-bezier(.2, 1.6, .4, 1); }
@keyframes urge-surf-tick { 0% { transform: scale(1); } 40% { transform: scale(1.18); } 100% { transform: scale(1); } }
.g-urge-surf .us-end { font: 600 12px/1 var(--font-ui); color: #fff3e2; text-shadow: 0 1px 6px rgba(20, 8, 30, 0.9); }
.g-urge-surf .us-waves { display: flex; gap: 4px; margin-top: 4px; }
.g-urge-surf .us-waves i { width: 12px; height: 7px; border-radius: 7px 7px 2px 2px; border: 2px solid rgba(255, 243, 226, 0.75); border-bottom-width: 0; }
.g-urge-surf .us-waves i.on { background: #ffd36b; border-color: #ffd36b; box-shadow: 0 0 8px rgba(255, 211, 107, 0.8); }
.g-urge-surf .gk-char.us-rush { will-change: transform; transition: opacity 0.5s ease; }
.g-urge-surf .us-rush .gk-char-img { rotate: var(--lean, 0deg); filter: none; }
.g-urge-surf .us-rush.us-under { opacity: 0.22; }
.g-urge-surf .us-rush.us-pop .gk-char-img { animation: urge-surf-up 0.55s cubic-bezier(.2, 1.5, .4, 1); }
@keyframes urge-surf-up { 0% { transform: translateY(18px) scale(0.7); } 60% { transform: translateY(-6px) scale(1.06); } 100% { transform: none; } }
.g-urge-surf .gk-char.us-drop { transition: left 1.3s cubic-bezier(.3, .9, .3, 1), top 1.3s cubic-bezier(.3, .9, .3, 1); }
.tsg.reduced-motion .g-urge-surf .us-buoy.us-pulling .us-tag { animation: none; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const inten = ctx.intensity, line = (o) => ctx.line(o), care = an.safety === 'care';
      const visits = K.visits();
      let BRK = K.dailyPick(BREAKS, 2);
      try { if (S.isDev && S.isDev()) { const q = new URLSearchParams(location.search).get('usbreak'), f = BREAKS.find(x => x.id === q); if (f) BRK = f; } } catch (e) { /* dev preview only */ }
      const TOMORROW = BREAKS[((K.daily() + 1) * 7 + 2 * 13 + 'urge-surf'.length) % BREAKS.length];
      const ownTier = Math.max(0, Math.min(3, Number(S.store.get('urge-surf:board', 0)) || 0));
      const URGE = urgeLabel(an.urge), BODY = bodyWord(an.body);
      const T = { // tuning by intensity: Gentle is roomier and never wipes out, Full is tighter
        spot: [[0.2, 0.17, 0.21], [0.15, 0.12, 0.16], [0.13, 0.1, 0.14]][inten],
        pull: [0.6, 1, 1.25][inten], tumble: [Infinity, 1.7, 1.3][inten], barrel: [5, 6.5, 8][inten],
        decay: [0, 0.05, 0.08][inten], dur: [0.86, 1, 1.08][inten], line: [0.15, 0.11, 0.09][inten]
      };
      const peak2 = Math.max(7, Math.min(10, Math.round(6 + (Number(an.intensity) || 5) * 0.35)));
      const WAVES = [
        { peak: 0.5, rise: 6.5 * T.dur, hold: 4 * T.dur, fall: 4.5 * T.dur, path: 0 },
        { peak: 1, rise: 13 * T.dur, hold: 0, fall: 6, path: 1, barrel: true },
        { peak: 0.56, rise: 5 * T.dur, hold: 6 * T.dur, fall: 4.5 * T.dur, path: 2 }
      ];

      /* ---------------- state ---------------- */
      const G = { w: 0, h: 0, phone: true };
      const W = { T: 0, A: 0.04, brk: 0, foam: 0, slow: 1, wave: -1, ph: 'intro', pt: 0, spot: 0.5, spotW: 0.15, pull: 0, level: 1, lvShown: 1, tube: 0, tubeP: 0, lineU: 0.5, flash: 0, beach: 0, sunK: 0, shake: 0, uEnter: 0.5, pulling: false };
      const R = { bx: 0, by: 0, u: 0.5, v: 0, tgt: 0.5, inSpot: false, off: 0, tumble: 0, streak: 0, streakN: 0, lastEnter: 0, lean: 0, face: '', faceT: 0, x: 0, y: 0, scale: 1, sit: true, hidden: false, px: 0, py: 0 };
      const SC = { ride: 0, inT: 0, barrel: 0, onLine: 0, tumbles: 0, strokes: 0, saidGood: false, saidTumble: false };
      const trail = [], foot = [], specks = [];
      let finished = false, touching = false, heartK = 0, heartOn = false, wavesNote = 0, boardShown = ownTier;

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: 1.5 });
      const P = K.particles({ max: 320 });
      const pad = h('div', { class: 'us-pad', role: 'slider', tabindex: '0', 'aria-label': 'Steer the board: drag left and right to stay in the glow', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '50' });
      const buoy = h('div', { class: 'us-buoy', 'aria-hidden': 'true' }, URGE ? h('span', { class: 'us-kick', text: 'The urge' }) : null, h('span', { class: 'us-tag gk-user', text: URGE || 'THE URGE' }));
      const prompt = h('div', { class: 'us-prompt', 'aria-live': 'polite' });
      const cap = h('div', { class: 'us-cap', 'aria-live': 'polite' }, h('b'), h('span'), h('i'));
      const meter = h('div', { class: 'us-meter', role: 'meter', 'aria-label': 'Urge level', 'aria-valuemin': '1', 'aria-valuemax': '10', 'aria-valuenow': '1' },
        h('b', { text: 'URGE' }), h('span', { class: 'us-end', text: '10' }), h('div', { class: 'us-track' }, h('i', { class: 'us-fill' }), h('span', { class: 'us-num', text: '1' })), h('span', { class: 'us-end', text: '1' }),
        h('div', { class: 'us-waves', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')));
      el.append(pad, buoy, prompt, cap, meter);
      const numEl = meter.querySelector('.us-num'), waveDots = Array.from(meter.querySelectorAll('.us-waves i'));
      const rush = K.character('rush', { side: 'right', mood: 'happy', x: 0, y: 0, size: 66 });
      rush.el.classList.add('us-rush');
      const drop = K.character('drop', { side: 'left', mood: 'happy', x: 0, y: 0, size: 64 });
      drop.el.classList.add('us-drop');

      /* ---------------- sound: ocean roar, board carve, tube hush, and a slow surf-guitar bed ---------------- */
      const AU = { roar: null, carve: null, tube: null, sand: null };
      const audioOn = () => {
        if (!A.ctx || AU.roar) return;
        AU.roar = A.loop({ pink: true, filter: 'lowpass', freq: 360, q: 0.4, bus: 'amb' });
        AU.carve = A.loop({ filter: 'bandpass', freq: 2000, q: 0.8 });
        AU.tube = A.loop({ pink: true, filter: 'lowpass', freq: 240, q: 0.7, bus: 'amb' });
      };
      S.on('audio-ready', audioOn); audioOn();
      S.onDestroy(() => Object.values(AU).forEach(x => { if (x) x.stop(); }));
      const NF = {}; const nf = (n) => NF[n] || (NF[n] = A.note(n));
      const MU = { on: true, next: 0, step: 0, bpm: 82, vol: 0.9, perc: true, sparse: false, beats: [] };
      S.loop(() => {
        if (!A.ctx || !MU.on) return;
        if (!MU.next || MU.next < A.now() - 0.5) MU.next = A.now() + 0.12;
        const ahead = A.now() + 0.24;
        while (MU.next < ahead) {
          const tm = MU.next, i = MU.step, bar = Math.floor(i / 8) % 4, e = i % 8, v = MU.vol, [bass, ch] = CHORDS[bar];
          if (e === 0) {
            A.pluck(nf(bass), { when: tm, vol: 0.26 * v, damp: 0.993, lp: 520, bus: 'music' });
            A.pad(ch.slice(0, 4).map(nf), { when: tm, dur: 60 / MU.bpm * 4.3, vol: 0.05 * v, attack: 0.7, lp: 1100, bus: 'music' });
          }
          if (e === 5 && !MU.sparse) A.pluck(nf(bass) * 1.5, { when: tm, vol: 0.13 * v, damp: 0.992, lp: 520, bus: 'music' });
          const pat = MU.sparse ? [0, -1, 2, -1, 4, -1, -1, -1] : [0, 2, 4, 3, 1, 3, 4, 2], ni = pat[e];
          if (ni >= 0) { // a reverb-soaked pluck with a slapback echo: the surf-guitar signature
            const f = nf(ch[ni]);
            A.pluck(f, { when: tm, vol: 0.085 * v, damp: 0.996, lp: 2400, verb: 0.38, bus: 'music' });
            A.pluck(f, { when: tm + 0.13, vol: 0.03 * v, damp: 0.995, lp: 1400, verb: 0.45, bus: 'music' });
          }
          if (MU.perc && inten > 0) {
            A.noise({ when: tm, filter: 'highpass', freq: 6500, dur: 0.06, attack: 0.015, vol: 0.014 * v, bus: 'music' });
            if (e === 2 || e === 6) A.noise({ when: tm, filter: 'bandpass', freq: 3600, q: 0.6, dur: 0.12, attack: 0.03, vol: 0.026 * v, bus: 'music' });
          }
          if (e % 2 === 0) { MU.beats.push(tm); if (MU.beats.length > 8) MU.beats.shift(); }
          MU.step++; MU.next += 60 / MU.bpm / 2;
        }
      });
      const beatPulse = () => { if (!A.ctx || !MU.beats.length) return 0; const now = A.now() - A.latency(); let last = -9; for (const b of MU.beats) if (b <= now) last = b; return Math.exp(-(now - last) * 5); };
      const chime = (i, vol) => { if (A.ctx) A.chime(nf(PENTA_D[Math.max(0, Math.min(PENTA_D.length - 1, i))]), { vol: vol || 0.06, dur: 1.6, verb: 0.45 }); };
      const splash = (vol) => { if (!A.ctx) return; A.noise({ pink: true, filter: 'lowpass', freq: 1800, to: 400, dur: 0.7, attack: 0.01, vol: vol || 0.14 }); A.tone({ type: 'sine', freq: 420, to: 120, glide: 0.25, dur: 0.3, vol: 0.06 }); };
      const crash = () => { if (!A.ctx) return; A.noise({ pink: true, filter: 'lowpass', freq: 1600, to: 260, dur: 2.6, attack: 0.06, vol: 0.2, bus: 'amb' }); A.thud({ vol: 0.18 }); A.noise({ filter: 'highpass', freq: 3200, dur: 3, attack: 0.4, vol: 0.04, bus: 'amb' }); };

      /* ---------------- characters ---------------- */
      function rushFace(m, force) { if (m === R.face && !force) return; const now = performance.now(); if (!force && (now - R.faceT < 650 || now < (R.hold || 0))) return; R.face = m; R.faceT = now; if (force) R.hold = now + 2200; rush.base(m); }
      function say(o, ms, mood) { drop.say(line(o), { ms: ms || 3600, mood }); }

      /* ---------------- layout and cached layers ---------------- */
      const pal = () => BRK[K.dark() ? 'dark' : 'bright'];
      let BACK = null, backKey = '', TUBE = null, SPR = null, dropAway = false;
      const CR = { x: new Float32Array(64), y: new Float32Array(64) };
      for (let i = 0; i < 60; i++) specks.push({ a: Math.random() * K.TAU, z: Math.random() });
      function off(w, hh) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * cv.dpr)); c.height = Math.max(1, Math.round(hh * cv.dpr)); const g = c.getContext('2d'); g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0); return { c, g, w, h: hh }; }
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        const phone = w < 700;
        Object.assign(G, { w, h: H, phone });
        G.hz = Math.round(H * (phone ? 0.4 : 0.42));
        G.base = Math.round(H * (phone ? 0.84 : 0.86));
        G.Hmax = (G.base - G.hz) * (phone ? 1.12 : 1.22);
        G.sz = phone ? 66 : 90; G.dsz = phone ? 64 : 92;
        if (phone) { G.zx0 = 34; G.zx1 = w - 72; } else { const zw = Math.min(880, w - 380); G.zx0 = Math.round(w / 2 - zw / 2 - 20); G.zx1 = G.zx0 + zw; }
        G.zw = G.zx1 - G.zx0;
        G.sunX = Math.round(w * (phone ? 0.6 : 0.58));
        G.buoy = { x: phone ? 40 : Math.max(110, G.zx0 - 40), y: G.hz + (phone ? 24 : 30) };
        G.perch = phone ? { x: w - 12 - G.dsz, y: 62 } : { x: w - 40 - G.dsz, y: 80 };
        rush.el.style.setProperty('--sz', G.sz + 'px');
        drop.el.style.setProperty('--sz', G.dsz + 'px');
        if (!dropAway) drop.place(G.perch.x, G.perch.y);
        meter.style.top = (G.perch.y + G.dsz + 14) + 'px';
        meter.style.height = (phone ? 236 : 300) + 'px';
        meter.style.right = Math.round((phone ? 12 : 40) + G.dsz / 2 - 23) + 'px';
        G.tubeC = { x: w / 2, y: H * 0.4 }; G.tubeR = Math.hypot(w, H) * 0.62;
        G.beachShift = G.hz - Math.round(H * (phone ? 0.27 : 0.3));
        G.shore = Math.round(H * (phone ? 0.55 : 0.6));
        G.seaY = Math.round(G.hz - G.beachShift + (G.shore - G.hz + G.beachShift) * 0.42);
        G.heart = phone ? { x: w * 0.55, y: H * 0.805, s: 140 } : { x: w * 0.52, y: H * 0.8, s: 190 };
        G.stand = phone ? { x: w * 0.2, y: H * 0.72 } : { x: w * 0.52 - 230, y: H * 0.71 };
        G.dropSand = phone ? { x: w - 12 - G.dsz, y: Math.round(H * 0.66) } : { x: Math.round(w * 0.52 + 150), y: Math.round(H * 0.66) };
        G.plant = phone ? { x: 30, y: G.shore + 70 } : { x: G.stand.x - 110, y: G.shore + 80 };
        backKey = ''; paintSprites(); paintBack();
      }
      function paintSprites() {
        const C = pal();
        SPR = { spot: K.glowSprite(rgba(C.spot, 0.9)), lip: K.glowSprite(rgba(C.lip, 0.85)), sun: K.glowSprite(rgba(C.sun, 0.9)), foam: K.glowSprite(rgba(C.foam, 0.95)), trail: K.glowSprite(rgba(C.trail, 0.9)), lamp: K.glowSprite('rgba(255,120,90,0.95)') };
        const c = document.createElement('canvas'); c.width = c.height = 384; const tg = c.getContext('2d');
        const gr = tg.createRadialGradient(192, 192, 0, 192, 192, 192);
        gr.addColorStop(0, mix(C.sun, '#ffffff', 0.4)); gr.addColorStop(0.07, C.lip); gr.addColorStop(0.3, C.face); gr.addColorStop(0.7, C.trough); gr.addColorStop(1, mix(C.trough, '#000000', 0.6));
        tg.fillStyle = gr; tg.fillRect(0, 0, 384, 384); TUBE = c;
      }
      /* Sky, sun or moon, clouds, the headland and the far sea: one cached picture, repainted only as the sun sets. */
      function paintBack() {
        if (!G.w) return;
        const D = K.dark(), C = pal(), sk = Math.round(W.sunK * 30) / 30, key = G.w + 'x' + G.h + ':' + D + ':' + sk + ':' + cv.dpr;
        if (key === backKey && BACK) return;
        backKey = key;
        if (!BACK || BACK.c.width !== Math.round(G.w * cv.dpr) || BACK.c.height !== Math.round(G.h * cv.dpr)) BACK = off(G.w, G.h);
        const g = BACK.g, w = G.w, H = G.h, hz = G.hz, moon = !!BRK.night;
        g.clearRect(0, 0, w, H);
        const sky = g.createLinearGradient(0, 0, 0, hz);
        sky.addColorStop(0, mix(C.skyTop, '#08061a', sk * 0.4)); sky.addColorStop(0.55, mix(C.skyMid, C.dusk, sk * 0.55)); sky.addColorStop(1, mix(C.skyLow, C.dusk, sk * 0.7));
        g.fillStyle = sky; g.fillRect(0, 0, w, hz + 2);
        const sa = Math.max(C.stars, moon ? 0 : sk * 0.55);
        if (sa > 0.01) { const r = K.rng(BRK.id.length * 97 + 5); g.fillStyle = '#ffffff'; for (let i = 0; i < 120; i++) { const x = r() * w, y = Math.pow(r(), 1.4) * hz * 0.9, s = r() < 0.15 ? 1.9 : 1.1; g.globalAlpha = sa * (0.3 + r() * 0.65); g.fillRect(x, y, s, s); } g.globalAlpha = 1; }
        const sr = moon ? (G.phone ? 17 : 24) : (G.phone ? 32 : 44);
        const sy = hz - H * 0.115 * (1 - sk) + sr * 0.8 * sk;
        G.sunY = sy; G.sunR = sr;
        const glow = g.createRadialGradient(G.sunX, sy, sr * 0.6, G.sunX, sy, H * 0.46);
        glow.addColorStop(0, rgba(C.sun, moon ? 0.32 : 0.62)); glow.addColorStop(0.24, rgba(C.sun, moon ? 0.1 : 0.24)); glow.addColorStop(1, rgba(C.sun, 0));
        g.fillStyle = glow; g.fillRect(0, 0, w, hz + 2);
        if (moon) {
          const m = off(sr * 2 + 4, sr * 2 + 4); m.g.fillStyle = C.sun; m.g.beginPath(); m.g.arc(sr + 2, sr + 2, sr, 0, K.TAU); m.g.fill();
          m.g.globalCompositeOperation = 'destination-out'; m.g.beginPath(); m.g.arc(sr + 2 + sr * 0.52, sr + 2 - sr * 0.28, sr * 0.86, 0, K.TAU); m.g.fill();
          g.drawImage(m.c, G.sunX - sr - 2, sy - sr - 2, sr * 2 + 4, sr * 2 + 4);
        } else {
          const sd = g.createRadialGradient(G.sunX - sr * 0.25, sy - sr * 0.25, sr * 0.1, G.sunX, sy, sr);
          sd.addColorStop(0, '#fffdf4'); sd.addColorStop(0.6, C.sun); sd.addColorStop(1, mix(C.sun, C.skyLow, 0.3));
          g.fillStyle = sd; g.beginPath(); g.arc(G.sunX, sy, sr, 0, K.TAU); g.fill();
        }
        const rc = K.rng(BRK.id.length * 31 + 7);
        for (let i = 0; i < (G.phone ? 4 : 6); i++) {
          const cx = rc() * w, cy = hz * (0.16 + rc() * 0.5), cw = w * (G.phone ? 0.3 : 0.18) * (0.7 + rc() * 0.6), ch = 6 + rc() * 9;
          g.fillStyle = rgba(C.cloud, 0.5 + rc() * 0.3);
          for (let j = 0; j < 5; j++) { g.beginPath(); g.ellipse(cx + (j - 2) * cw * 0.2, cy + Math.sin(j * 1.7) * ch * 0.4, cw * (0.22 + 0.08 * Math.sin(j + i)), ch * (0.8 + 0.3 * Math.cos(j * 2)), 0, 0, K.TAU); g.fill(); }
          g.fillStyle = rgba(C.rim, 0.32 * (1 - sk * 0.6)); g.beginPath(); g.ellipse(cx, cy + ch * 0.6, cw * 0.46, ch * 0.3, 0, 0, K.TAU); g.fill();
        }
        paintLand(g, C, w, hz);
        const sea = g.createLinearGradient(0, hz, 0, H);
        sea.addColorStop(0, mix(C.seaFar, sk > 0.5 ? C.dusk : C.skyLow, 0.3));
        sea.addColorStop(0.3, C.seaFar); sea.addColorStop(1, C.seaNear);
        g.fillStyle = sea; g.fillRect(0, hz, w, H - hz);
        const rs = K.rng(BRK.id.length * 13 + 3);
        for (let i = 0; i < 26; i++) { const k = i / 26, y = hz + 3 + k * k * (H - hz) * 0.95; g.fillStyle = i % 2 ? rgba(C.seaNear, 0.5) : 'rgba(255,255,255,0.4)'; g.globalAlpha = (1 - k) * 0.22; g.fillRect(0, y, w, 1 + k * 2.5); }
        g.globalAlpha = 1;
        g.fillStyle = rgba(C.sun, 0.42); g.fillRect(0, hz, w, 1.5);
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = moon ? 0.3 : 0.42;
        g.drawImage(K.glowSprite(rgba(C.sun, 0.75)), G.sunX - sr * 2.4, hz - sr * 0.4, sr * 4.8, (H - hz) * 0.7);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 40; i++) { const k = rs(), y = hz + 2 + k * k * (H - hz) * 0.6, ww = 4 + k * 18; g.fillStyle = rgba(C.sun, (1 - k) * 0.5); g.fillRect(G.sunX + (rs() - 0.5) * (sr * 1.4 + k * sr * 3), y, ww, 1 + k); }
      }
      function paintLand(g, C, w, hz) {
        g.fillStyle = C.land;
        if (BRK.land === 'palms') {
          const x0 = w * (G.phone ? 0.7 : 0.78);
          g.beginPath(); g.moveTo(x0, hz + 1); g.quadraticCurveTo(x0 + w * 0.08, hz - 22, w + 4, hz - 26); g.lineTo(w + 4, hz + 1); g.closePath(); g.fill();
          [[0.8, 46], [0.88, 58], [0.95, 40]].forEach(([k, ht], i) => {
            const bx = w * k + (G.phone ? -w * 0.04 : 0), by = hz - 14 - i * 3, tx = bx + 10 - i * 8, ty = by - ht;
            g.strokeStyle = C.land; g.lineWidth = 3; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + 2, by - ht * 0.6, tx, ty); g.stroke();
            for (let f = 0; f < 6; f++) { const a = -Math.PI / 2 + (f - 2.5) * 0.55; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + Math.cos(a) * 14, ty + Math.sin(a) * 10 - 4, tx + Math.cos(a) * 24, ty + Math.sin(a) * 12 + 8); g.lineWidth = 2.2; g.stroke(); }
          });
        } else if (BRK.land === 'pines') {
          const x1 = w * (G.phone ? 0.36 : 0.3);
          g.beginPath(); g.moveTo(-4, hz + 1); g.lineTo(-4, hz - 30); g.quadraticCurveTo(x1 * 0.6, hz - 34, x1, hz + 1); g.closePath(); g.fill();
          for (let i = 0; i < 9; i++) { const px = x1 * (0.06 + i * 0.1), base = hz - 30 + i * 2.6, ht = 16 + ((i * 7) % 5) * 4; g.beginPath(); g.moveTo(px - 6, base + 2); g.lineTo(px, base - ht); g.lineTo(px + 6, base + 2); g.closePath(); g.fill(); }
        } else if (BRK.land === 'island') {
          const cx = w * 0.3, rw = w * (G.phone ? 0.16 : 0.1);
          g.beginPath(); g.moveTo(cx - rw, hz + 1); g.quadraticCurveTo(cx - rw * 0.3, hz - 26, cx + rw * 0.2, hz - 16); g.quadraticCurveTo(cx + rw * 0.6, hz - 10, cx + rw, hz + 1); g.closePath(); g.fill();
        } else {
          g.beginPath(); g.moveTo(w * 0.55, hz + 1);
          for (let x = w * 0.55; x <= w + 10; x += 10) g.lineTo(x, hz - 8 - Math.sin((x - w * 0.55) * 0.02) * 6 - (x - w * 0.55) * 0.02);
          g.lineTo(w + 10, hz + 1); g.closePath(); g.fill();
        }
      }

      /* ---------------- geometry ---------------- */
      const ux = (u) => G.zx0 + u * G.zw;
      function crestAt(x, tt) {
        const k = x / G.w, a = W.A, pk = 0.5 + 0.2 * Math.sin(tt * 0.11);
        const prof = 0.8 + 0.2 * Math.cos((k - pk) * Math.PI * 1.3);
        const rip = Math.sin(k * 9 + tt * 1.1) * 3 + Math.sin(k * 23 - tt * 1.7) * 1.4;
        return G.base - a * G.Hmax * prof + rip * (0.35 + a * 0.8);
      }
      function rideY(x, tt) { const c = crestAt(x, tt); return c + (G.base - c) * 0.52; }
      function traceCrest(g, n) { g.moveTo(CR.x[0], CR.y[0]); for (let i = 1; i < n; i++) { const mx = (CR.x[i] + CR.x[i + 1]) / 2, my = (CR.y[i] + CR.y[i + 1]) / 2; g.quadraticCurveTo(CR.x[i], CR.y[i], mx, my); } g.lineTo(CR.x[n], CR.y[n]); }
      function heartPt(t, s) { const a = t * K.TAU, x = 16 * Math.pow(Math.sin(a), 3), y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); return { x: x / 32 * s, y: (y - 2.5) / 32 * s }; }

      /* ---------------- words ---------------- */
      const L = {
        start: { Jolly: 'Golden hour, small wave first. Slide to keep Rush in the glow.', Cheeky: 'Rush has never surfed. Rush says he’s a natural. Keep him in the glow.', Unfiltered: 'Keep Rush in the glowing spot. Small wave first.' },
        good: { Jolly: 'That’s it. Small moves, soft knees.', Cheeky: 'Look at that. Barely even screaming.', Unfiltered: 'Good. Small moves.' },
        tumble: { Jolly: 'Wipeout! Totally normal. Back on the board.', Cheeky: 'Rush has met the ocean. Back on.', Unfiltered: 'Fell off. Doesn’t matter. Back on.' },
        w2: { Jolly: 'Here comes a bigger one. Urges build like this, then they peak.', Cheeky: 'Bigger set. Urges love a dramatic entrance.', Unfiltered: 'Bigger wave. Same shape as an urge: it builds.' },
        pull: { Jolly: 'Feel the buoy pulling? Lean away and ride. You don’t have to go to it.', Cheeky: 'The buoy’s calling. Let it ring. Lean away.', Unfiltered: 'That’s the pull. Lean away. Don’t go to it.' },
        peak: { Jolly: 'Here’s the peak. Hold your line through it.', Cheeky: 'Peak urge. Very dramatic. Hold your line.', Unfiltered: 'The peak. Hold the line.' },
        passed: { Jolly: 'You didn’t have to do anything. It rose, it peaked, it passed.', Cheeky: 'You didn’t have to do a single thing. Rush is stunned.', Unfiltered: 'You didn’t act on it. It passed anyway.' },
        w3: { Jolly: 'One more, smaller now. Sway with your breath: in… and out.', Cheeky: 'Smaller one. Even Rush is chill. Breathe with the sway.', Unfiltered: 'Smaller wave. In as it goes, out as it comes back.' },
        paddle: { Jolly: 'Sun’s going down. Swipe to paddle in.', Cheeky: 'Golden hour’s clocking off. Paddle in.', Unfiltered: 'Done. Paddle in.' },
        final: care ? { Jolly: 'Three waves, each one passed. For the bigger stuff, a real person can help too.', Cheeky: 'Three waves, each one passed. For the bigger stuff, a real person can help too.', Unfiltered: 'Each wave passed. For the bigger stuff, talk to someone qualified.' }
          : { Jolly: 'Three waves. Each one rose, peaked and passed, and you rode them all.', Cheeky: 'Three waves, zero acting on impulse. Rush is insufferable now.', Unfiltered: 'Three waves. Each one passed. You rode them.' }
      };
      const PROMPT_BODY = BODY ? 'Notice it in your ' + BODY : 'Notice where you feel it';

      /* ---------------- prompts that ride the wave, and captions ---------------- */
      let promptT = 0, promptHalf = 80, promptMode = 'crest';
      function showPrompt(text, ms, mode) {
        prompt.textContent = text; promptMode = mode || 'crest';
        promptHalf = (prompt.offsetWidth || 160) / 2;
        prompt.classList.add('us-on'); S.cancel(promptT);
        promptT = S.later(() => prompt.classList.remove('us-on'), ms || 3800);
        if (A.ctx) A.chime(nf('A6'), { vol: 0.025, dur: 1.4, verb: 0.6 });
      }
      function showCap(big, sub, small, ms) {
        cap.children[0].textContent = big; cap.children[1].textContent = sub || ''; cap.children[2].textContent = small || '';
        cap.children[1].hidden = !sub; cap.children[2].hidden = !small;
        cap.classList.add('us-on');
        if (ms) S.later(() => cap.classList.remove('us-on'), ms);
      }

      /* ---------------- guide (every step) ---------------- */
      let gSpec = null, kbT = 0;
      function setGuide(spec) { gSpec = spec; if (spec && !touching) K.guide(spec); if (!spec) K.guide(null); }
      function rearmGuide() { if (gSpec && !touching && !finished) K.guide(Object.assign({}, gSpec, { delay: 4000 })); }
      const rushPt = () => ({ x: R.px, y: Math.min(R.by + 14, G.h - 156) }); // just under the board (label below), so the guide never covers Rush's face
      const gRide = (label, id) => ({ id, g: 'sweep', target: rushPt, d: G.phone ? 56 : 80, label, place: 'below', ms: 1900 });

      /* ---------------- input: drag anywhere (relative), arrows, swipe down to paddle ---------------- */
      const DR = { on: false, x0: 0, tgt0: 0.5, lastX: 0, strokeY: 0 }, GAIN = 1.25;
      K.drag(pad, {
        start: (p) => {
          if (finished || W.ph === 'intro' || W.ph === 'shore' || W.ph === 'end') return false;
          DR.on = true; DR.x0 = DR.lastX = p.x; DR.tgt0 = R.tgt; DR.strokeY = p.y;
          touching = true; K.guide(null); pad.classList.add('us-grab');
          K.sfx.tap(); if (A.ctx) A.wood(undefined, 0.06, 0.55);
          if (W.ph !== 'paddle') P.emit('drop', R.px, R.by, 5, { angle: -Math.PI / 2, spread: 1.6, speed: [40, 120], colors: [pal().foam] });
        },
        move: (p) => {
          if (!DR.on) return;
          DR.lastX = p.x;
          if (W.ph === 'paddle') { if (p.y - DR.strokeY > 56) { DR.strokeY = p.y; stroke(); } else if (p.y < DR.strokeY) DR.strokeY = p.y; return; }
          R.tgt = K.clamp(DR.tgt0 + (p.x - DR.x0) / G.zw * GAIN, 0, 1);
          if (R.tgt === 0 || R.tgt === 1) DR.tgt0 = R.tgt - (p.x - DR.x0) / G.zw * GAIN; // no dead zone when coming back from an edge
          pad.setAttribute('aria-valuenow', String(Math.round(R.tgt * 100)));
        },
        end: () => { DR.on = false; touching = false; pad.classList.remove('us-grab'); rearmGuide(); }
      });
      K.onKey(['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'ArrowDown', 'KeyS'], (e) => {
        if (finished || W.ph === 'intro' || W.ph === 'shore' || W.ph === 'end') return;
        e.preventDefault(); A.unlock(); K.guide(null);
        S.cancel(kbT); kbT = S.later(rearmGuide, 4000);
        if (W.ph === 'paddle') { if (e.code === 'ArrowDown' || e.code === 'KeyS') stroke(); return; }
        const dir = (e.code === 'ArrowLeft' || e.code === 'KeyA') ? -1 : (e.code === 'ArrowRight' || e.code === 'KeyD') ? 1 : 0;
        if (!dir) return;
        R.tgt = K.clamp(R.tgt + dir * 0.07, 0, 1); DR.tgt0 += dir * 0.07;
        if (!e.repeat) K.sfx.tap();
      });

      /* ---------------- the ride ---------------- */
      function spotPath(i, tau) {
        if (i === 0) return 0.5 + 0.2 * Math.sin(tau * 0.5 - 0.6);
        if (i === 1) return 0.52 + 0.21 * Math.sin(tau * 0.62 + 0.4) + 0.07 * Math.sin(tau * 1.7 + 1.3);
        const c = tau % 10; // one slow breath: 4 s in (the glow drifts right), 6 s out (it drifts back)
        return c < 4 ? 0.3 + 0.4 * ios(c / 4) : 0.7 - 0.4 * ios((c - 4) / 6);
      }
      function startWave(i) {
        W.wave = i; W.wt = 0; W.ph = 'rise'; W.pt = 0; W.brk = 0; W.cued = {};
        MU.bpm = [82, 78, 70][i]; MU.perc = i < 2; MU.sparse = i === 2;
        waveDots.forEach((d, k) => d.classList.toggle('on', k < i));
        meter.querySelector('.us-waves').setAttribute('aria-label', 'Wave ' + (i + 1) + ' of 3');
        if (i === 0) setGuide(gRide('SLIDE INTO THE GLOW', 'w1'));
        if (i === 1) { say(L.w2, 3800, 'think'); meter.classList.add('us-on'); setGuide(gRide('RIDE THE GLOW', 'w2')); }
        if (i === 2) { say(L.w3, 4400, 'calm'); setGuide({ id: 'breath', g: 'sweep', target: rushPt, d: G.phone ? 60 : 90, label: 'SWAY WITH YOUR BREATH', place: 'below', ms: 2000 }); }
        if (A.ctx) A.noise({ pink: true, filter: 'lowpass', freq: 300, to: 900, dur: 3, attack: 1.6, vol: 0.06, bus: 'amb' });
        ctx.track('wave', { n: i + 1 });
      }
      function stepWave(dt, wdt) {
        const wv = WAVES[W.wave];
        W.pt += wdt; W.wt += wdt;
        if (W.ph === 'rise') {
          const k = W.pt / wv.rise; W.A = 0.05 + (wv.peak - 0.05) * ios(k);
          if (k >= 1) { if (wv.barrel) enterBarrel(); else { W.ph = 'hold'; W.pt = 0; } }
        } else if (W.ph === 'hold') {
          W.A = wv.peak + Math.sin(W.pt * 1.3) * 0.015;
          if (W.pt >= wv.hold) { W.ph = 'fall'; W.pt = 0; breakWave(false); }
        } else if (W.ph === 'fall') {
          const k = W.pt / wv.fall; W.A = 0.05 + (wv.peak - 0.05) * (1 - ios(k));
          W.brk = Math.min(1, W.brk + wdt * 1.3);
          if (k >= 1) { W.ph = 'lull'; W.pt = 0; W.lull = W.wave === 2 ? 0.6 : 2.4; }
        } else if (W.ph === 'lull') {
          W.A += (0.05 - W.A) * Math.min(1, dt * 0.8);
          if (W.pt >= W.lull) { if (W.wave < 2) startWave(W.wave + 1); else finale(); return; }
        }
        // the glow, the pull and the meter
        if (W.ph !== 'barrel') {
          W.spot += (spotPath(wv.path, W.wt) - W.spot) * Math.min(1, dt * 3);
          W.spotW += (T.spot[wv.path] - W.spotW) * Math.min(1, dt * 2);
        }
        let pull = 0;
        if (W.wave === 1 && (W.ph === 'rise' || W.ph === 'barrel')) {
          const surge = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(W.wt * 1.05 - 1.2), 1.6);
          pull = W.level >= 3 ? 4.4 * T.pull * W.A * surge : 0;
          if (W.ph === 'barrel') pull = 3.4 * T.pull * (0.45 + 0.55 * Math.pow(0.5 + 0.5 * Math.sin(W.bt * 1.3), 2));
        }
        W.pull += (pull - W.pull) * Math.min(1, dt * 3);
        if (W.wave === 1) W.level = W.ph === 'barrel' ? peak2 : W.ph === 'lull' ? 1 : 1 + (peak2 - 1) * Math.max(0, (W.A - 0.05) / 0.95);
        else if (W.wave === 2) { const p3 = Math.max(3, peak2 - 4); W.level = W.ph === 'lull' ? 1 : 1 + (p3 - 1) * Math.max(0, (W.A - 0.05) / 0.51); }
        // cues along the way
        const cue = (k, fn) => { if (!W.cued[k]) { W.cued[k] = true; fn(); } };
        if (W.wave === 1 && W.ph === 'rise') {
          if (W.level >= 3) cue('pull', () => { say(L.pull, 4200, 'worried'); buoy.classList.add('us-pulling'); setGuide({ id: 'pull', g: 'drag', target: rushPt, dx: G.phone ? 80 : 110, dy: 0, label: 'LEAN AGAINST THE PULL', place: 'below', ms: 1900 }); W.pulling = true; showPrompt(PROMPT_BODY, 3800); });
          if (W.level >= 5.4) cue('breathe', () => showPrompt('Breathe out, slowly', 3600));
          if (W.level >= 7.2) cue('peak', () => showPrompt('Let it peak', 3000));
        }
        if (W.wave === 2 && (W.ph === 'rise' || W.ph === 'hold')) {
          const c = W.wt % 10, n = Math.floor(W.wt / 10);
          cue('in' + n, () => showPrompt('Breathe in…', 3600));
          if (c >= 4) cue('out' + n, () => showPrompt('…and out', 5200));
        }
        if (W.wave === 2 && visits >= 2 && W.ph === 'hold') cue('dolphin', () => { W.dolphin = 0.001; if (A.ctx) K.sfx.sparkle(); });
      }
      function breakWave(big) {
        W.brk = big ? 0.5 : 0; W.foam = 1; W.foamS = 0;
        if (big) crash(); else if (A.ctx) A.noise({ pink: true, filter: 'lowpass', freq: 1100, to: 300, dur: 1.8, attack: 0.1, vol: 0.1, bus: 'amb' });
        waveDots.forEach((d, k) => d.classList.toggle('on', k <= W.wave));
        if (!K.reduced()) W.shake = big ? 1 : 0.35;
        for (let i = 0; i < (big ? 3 : 1); i++) P.emit('drop', G.w * (0.2 + Math.random() * 0.6), crestAt(G.w / 2, W.T), big ? 18 : 8, { angle: -Math.PI / 2, spread: 1.4, speed: [80, 240], colors: [pal().foam, '#ffffff'] });
      }
      function enterBarrel() {
        W.ph = 'barrel'; W.pt = 0; W.bt = 0; W.tube = 0; W.tubeP = 0; W.uEnter = R.u; W.lineU = R.u; W.force = false;
        W.slow = 0.45; MU.sparse = true; MU.perc = false; MU.bpm = 56;
        prompt.classList.remove('us-on'); buoy.classList.add('us-gone');
        rushFace('wow', true); drop.face('wow', 1600);
        say(L.peak, 3400);
        setGuide({ id: 'line', g: 'still', target: () => linePt(), label: 'HOLD YOUR LINE', place: 'above', ms: 2400 });
        if (A.ctx) { A.whoosh({ from: 2400, to: 300, dur: 1.2, vol: 0.12 }); A.tone({ type: 'sine', freq: 70, to: 52, glide: 1.4, dur: 1.6, vol: 0.12 }); }
        K.sfx.whoosh();
        ctx.track('barrel', { level: peak2 });
      }
      function linePt() { const xb = G.w * (0.14 + 0.72 * W.lineU), y = R.py - G.sz * 1.7, k = (G.h + 10 - y) / (G.h + 10 - G.tubeC.y); return { x: xb + (G.tubeC.x - xb) * k, y }; }
      function stepBarrel(dt) {
        W.bt += dt; W.tube = Math.min(1, W.tube + dt / (K.reduced() ? 0.4 : 0.9));
        const ramp = Math.min(1, W.bt / 2);
        W.lineU = W.uEnter + (0.5 - W.uEnter) * ramp + Math.sin(W.bt * 0.75) * (inten === 0 ? 0.09 : 0.13) * ramp;
        W.spot = W.lineU; W.spotW = T.line;
        const on = Math.abs(R.u - W.lineU) < T.line;
        SC.barrel += dt; if (on) SC.onLine += dt;
        if (W.bt > T.barrel * 2.2 + 2) W.force = true;   // the peak always passes, held or not
        if (W.tube >= 1) {
          if (W.force) W.tubeP = Math.min(1, W.tubeP + dt * 0.9);
          else if (on) { W.tubeP = Math.min(1, W.tubeP + dt / T.barrel); if (Math.random() < dt * 6) P.emit('mote', R.px, R.py - 10, 1, { colors: [pal().spot, '#ffffff'] }); }
          else W.tubeP = Math.max(0, W.tubeP - dt * T.decay);
        }
        if (A.ctx && Math.floor(W.tubeP * 8) > (W.tubeTick || 0)) { W.tubeTick = Math.floor(W.tubeP * 8); chime(W.tubeTick + 1, 0.04); }
        if (W.tubeP >= 1) exitBarrel();
      }
      function exitBarrel() {
        W.tube = 0; W.slow = 1; W.flash = K.reduced() ? 0.45 : 1; W.tubeTick = 0;
        W.ph = 'fall'; W.pt = 0; breakWave(true);
        MU.sparse = false; MU.perc = true; MU.bpm = 74;
        K.sfx.great(); if (A.ctx) A.noise({ filter: 'highpass', freq: 2500, dur: 0.9, attack: 0.02, vol: 0.12 });
        rushFace('celebrate', true); drop.face('love', 2400);
        P.emit('star', R.px, R.py, 26, { colors: [pal().spot, '#ffffff', pal().lip], speed: [80, 260] });
        setGuide(gRide('RIDE IT DOWN', 'w2fall'));
        buoy.classList.remove('us-pulling', 'us-gone'); W.pulling = false;
        S.later(() => { say(L.passed, 4200, 'love'); showCap('It passed.', '', '', 3400); }, 900);
      }

      /* ---------------- Rush on the board ---------------- */
      function stepRush(dt) {
        if (R.tumble > 0) { R.tumble -= dt; if (R.tumble <= 0) backOn(); return; }
        if (W.ph === 'intro' || W.ph === 'paddle' || W.ph === 'shore' || W.ph === 'end') return;
        const rdt = dt * (W.ph === 'barrel' ? 0.78 : 1);
        const chop = (Math.sin(W.T * 3.1) * 0.6 + Math.sin(W.T * 4.7 + 1) * 0.4) * W.A * 0.9;
        R.v += ((R.tgt - R.u) * 30 - R.v * 7.5 - W.pull + chop) * rdt;
        R.u += R.v * rdt;
        if (R.u < 0) { R.u = 0; R.v = Math.abs(R.v) * 0.3; } else if (R.u > 1) { R.u = 1; R.v = -Math.abs(R.v) * 0.3; }
        R.lean += (K.clamp(R.v * 38, -16, 16) - R.lean) * Math.min(1, dt * 10);
        const riding = (W.ph === 'rise' || W.ph === 'hold' || W.ph === 'fall' || W.ph === 'barrel') && W.A > 0.12;
        const d = Math.abs(R.u - W.spot), was = R.inSpot;
        R.inSpot = riding && (was ? d < W.spotW * 1.08 : d < W.spotW);
        if (riding) {
          if (W.ph !== 'barrel') { SC.ride += dt; if (R.inSpot) SC.inT += dt; }
          if (R.inSpot && !was && performance.now() - R.lastEnter > 380) { R.lastEnter = performance.now(); K.sfx.good(undefined, 3 + Math.min(5, R.streakN)); P.emit('star', R.px, R.py, 6, { colors: [pal().spot, '#ffffff'], speed: [40, 140] }); W.nudge = 1; }
          if (R.inSpot) {
            R.streak += dt;
            if (R.streak > 1.4 * (R.streakN + 1)) { R.streakN++; chime(R.streakN + 1, 0.05); P.emit('mote', R.px, R.by, 4, { colors: [pal().trail, '#ffffff'] }); }
            if (!SC.saidGood && R.streak > 2.6 && W.wave === 0) { SC.saidGood = true; say(L.good, 2800, 'happy'); }
          } else { if (R.streakN >= 3) K.sfx.soft(); R.streak = 0; R.streakN = 0; }
          const canTumble = W.ph === 'rise' || W.ph === 'hold';
          if (canTumble && d > W.spotW * 1.35) R.off += dt; else R.off = Math.max(0, R.off - dt * 2);
          if (R.off > T.tumble) tumble();
        } else { R.streak = 0; R.streakN = 0; R.off = 0; }
        if (W.ph === 'barrel') rushFace(W.tubeP > 0.6 ? 'happy' : 'wow');
        else if (riding) {
          if (W.pull > 1.6 && !R.inSpot && R.u < W.spot) rushFace('speed');
          else if (!R.inSpot && R.off > 0.9) rushFace('worried');
          else if (!R.inSpot && d > W.spotW * 1.25) rushFace('surprised');
          else if (R.inSpot && (R.streak > 5 || W.pull > 1)) rushFace('cool');
          else if (R.inSpot) rushFace('happy');
        } else if (W.ph === 'lull') rushFace(W.wave >= 1 ? 'calm' : 'happy');
      }
      function tumble() {
        R.tumble = 1.25; R.off = 0; SC.tumbles++; R.streak = 0; R.streakN = 0;
        splash(0.16); K.sfx.whoosh();
        P.emit('drop', R.px, R.by, 24, { angle: -Math.PI / 2, spread: 2.2, speed: [80, 260], colors: [pal().foam, '#ffffff'] });
        P.emit('bubble', R.px, R.by + 10, 8);
        rush.face('surprised'); R.face = 'surprised'; R.faceT = performance.now();
        rush.el.classList.add('us-under');
        if (!SC.saidTumble) { SC.saidTumble = true; say(L.tumble, 3000, 'surprised'); }
        ctx.track('wipeout', { n: SC.tumbles, wave: W.wave + 1 });
      }
      function backOn() {
        R.u = R.tgt = W.spot; R.v = 0; R.off = 0; R.lean = 0;
        if (DR.on) DR.tgt0 = R.tgt - (DR.lastX - DR.x0) / G.zw * GAIN;
        rush.el.classList.remove('us-under', 'us-pop'); void rush.el.offsetWidth; rush.el.classList.add('us-pop');
        K.sfx.pop(); K.pop('Back on!', { x: R.px, y: R.py - G.sz * 0.85, kind: 'good' });
        rushFace('silly', true);
      }

      /* ---------------- drawing ---------------- */
      function drawGlitter(g, tt, dy, yMax) {
        const C = pal(), n = G.phone ? 22 : 30, top = G.hz + dy + 3, span = Math.max(10, yMax - top);
        g.fillStyle = rgba(C.sun, BRK.night ? 0.5 : 0.75);
        for (let i = 0; i < n; i++) {
          const k = i / n, y = top + k * k * span * 0.9, wob = Math.sin(i * 12.9 + tt * 1.3) * (8 + k * 46), fl = 0.5 + 0.5 * Math.sin(tt * (2 + (i % 5)) + i * 3.1);
          g.globalAlpha = (1 - k) * 0.7 * fl; g.fillRect(G.sunX + wob - (6 + k * 20) / 2, y, 6 + k * 20, 1.4 + k * 1.6);
        }
        g.globalAlpha = 1;
      }
      function drawBuoy(g, x, y, tt, s) {
        const bob = Math.sin(tt * 1.7) * 2.5 * (0.5 + W.A), tilt = Math.sin(tt * 1.3) * 0.1 + (W.pulling ? Math.sin(tt * 4.5) * 0.08 : 0);
        g.save(); g.translate(x, y + bob); g.rotate(tilt); g.scale(s, s);
        g.fillStyle = '#e4553c'; g.beginPath(); g.moveTo(-9, 0); g.lineTo(9, 0); g.lineTo(4, -20); g.lineTo(-4, -20); g.closePath(); g.fill();
        g.fillStyle = '#fff3e2'; g.beginPath(); g.moveTo(-6.6, -7); g.lineTo(6.6, -7); g.lineTo(5.4, -12); g.lineTo(-5.4, -12); g.closePath(); g.fill();
        g.fillStyle = '#3a2a2a'; g.fillRect(-1, -28, 2, 8);
        const bl = 0.5 + 0.5 * Math.sin(tt * (2 + W.pull * 1.4));
        g.globalAlpha = 0.35 + 0.65 * bl; g.drawImage(SPR.lamp, -12, -40, 24, 24); g.globalAlpha = 1;
        g.strokeStyle = rgba(pal().foam, 0.45); g.lineWidth = 1.2; g.beginPath(); g.ellipse(0, 1, 13, 3, 0, 0, K.TAU); g.stroke();
        g.restore();
        return y + bob;
      }
      function drawBoard(g, x, y, len, ang, tier, a) {
        const B = BOARDS[tier], th = Math.max(4, len * 0.075);
        g.save(); g.translate(x, y); g.rotate(ang); g.globalAlpha = a == null ? 1 : a;
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(0, th * 1.4, len * 0.5, th * 0.8, 0, 0, K.TAU); g.fill();
        g.beginPath(); g.moveTo(-len / 2, 0); g.quadraticCurveTo(-len * 0.32, -th, 0, -th); g.quadraticCurveTo(len * 0.36, -th, len / 2, -th * 0.15); g.quadraticCurveTo(len * 0.38, th, 0, th); g.quadraticCurveTo(-len * 0.32, th, -len / 2, 0); g.closePath();
        g.fillStyle = B.base; g.fill();
        g.save(); g.clip();
        if (tier === 0) { g.strokeStyle = B.a; g.lineWidth = 1; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(-len / 2, i * th * 0.38); g.quadraticCurveTo(0, i * th * 0.38 + 1.5, len / 2, i * th * 0.3); g.stroke(); } }
        else if (tier === 3) { const gr = g.createLinearGradient(-len / 2, 0, len / 2, 0); gr.addColorStop(0, B.b); gr.addColorStop(0.5, B.a); gr.addColorStop(1, B.b); g.fillStyle = gr; g.fillRect(-len / 2, -th * 0.45, len, th * 0.9); g.fillStyle = 'rgba(255,255,255,0.6)'; for (let i = -3; i <= 3; i++) g.fillRect(i * len * 0.12 - 1, -th, 2, th * 2); }
        else { g.fillStyle = B.a; g.fillRect(-len / 2, -th * 0.22, len, th * 0.44); if (tier === 2) { g.fillStyle = B.b; g.fillRect(-len / 2, th * 0.34, len, th * 0.22); g.fillRect(-len / 2, -th * 0.56, len, th * 0.22); } }
        g.restore();
        g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-len * 0.42, -th * 0.55); g.quadraticCurveTo(0, -th * 1.02, len * 0.42, -th * 0.5); g.stroke();
        g.restore();
      }
      /* Illustrated foam: a band with a scalloped top edge and lace holes, following yAt(x). */
      function foamBand(g, yAt, th, a, seed, tt, holeCol) {
        if (a <= 0.01) return;
        const w = G.w, st = G.phone ? 18 : 24, C = pal();
        g.globalAlpha = Math.min(1, a); g.fillStyle = C.foam; g.beginPath();
        let x = -st; g.moveTo(x, yAt(x));
        for (; x <= w + st; x += st) g.quadraticCurveTo(x + st * 0.5, yAt(x + st * 0.5) - 3 - Math.abs(Math.sin(x * 0.07 + seed + tt * 0.8)) * 5, x + st, yAt(x + st));
        for (x = w + st * 2; x >= -st; x -= st) g.lineTo(x, yAt(x) + th * (0.55 + 0.45 * Math.sin(x * 0.045 + seed * 2.3 + tt * 0.5)));
        g.closePath(); g.fill();
        g.fillStyle = rgba(holeCol, 0.75);
        for (let i = 0; i < 10; i++) { const hx = ((i * 97 + seed * 31) % 100) / 100 * w + Math.sin(tt * 0.4 + i) * 6, hy = yAt(hx) + th * (0.3 + 0.25 * Math.sin(i * 1.7 + seed)); g.beginPath(); g.ellipse(hx, hy, 3 + (i % 4) * 2.5, 1.2 + (i % 3) * 0.7, 0, 0, K.TAU); g.fill(); }
        g.globalAlpha = 1;
      }
      function drawWave(g, tt, dy) {
        const w = G.w, H = G.h, base = G.base + dy, C = pal(), N = G.phone ? 26 : 44, A0 = W.A, night = !!BRK.night;
        let top = base;
        for (let i = 0; i <= N; i++) { const x = w * i / N; CR.x[i] = x; CR.y[i] = crestAt(x, tt) + dy; if (CR.y[i] < top) top = CR.y[i]; }
        const fh = Math.max(10, base - top), s1 = Math.min(0.14, 9 / fh + 0.02), s2 = Math.max(s1 + 0.04, 0.26);
        const fg = g.createLinearGradient(0, top, 0, base + 30);
        fg.addColorStop(0, mix(C.lip, '#ffffff', 0.2)); fg.addColorStop(s1, C.lip); fg.addColorStop(s2, mix(C.lip, C.face, 0.75)); fg.addColorStop(0.6, C.face); fg.addColorStop(1, C.trough);
        g.fillStyle = fg; g.beginPath(); traceCrest(g, N); g.lineTo(w, H); g.lineTo(0, H); g.closePath(); g.fill();
        // the sun through the lip (golden hour's best trick)
        const cs = crestAt(G.sunX, tt) + dy;
        if (!night && A0 > 0.2 && cs < G.sunY + G.sunR) { const s = 90 + A0 * 140; g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(0.5, (A0 - 0.2) * 0.8); g.drawImage(SPR.sun, G.sunX - s, cs - s * 0.2, s * 2, s * 1.3); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        // the shadow under a curling lip
        if (A0 > 0.35) {
          const k = Math.min(1, (A0 - 0.35) / 0.5);
          g.strokeStyle = rgba(C.trough, 0.07 * k); g.lineWidth = 10 + 10 * A0;
          for (let j = 1; j <= 4; j++) { g.save(); g.translate(0, j * (4 + 5 * A0)); g.beginPath(); traceCrest(g, N); g.stroke(); g.restore(); }
        }
        // lace drawn up the face
        g.strokeStyle = night ? rgba(C.lip, 0.3) : 'rgba(255,255,255,0.5)'; g.lineWidth = 1.3; g.setLineDash([14, 7, 4, 9]);
        for (let j = 0; j < 7; j++) {
          const f = (((j / 7) - tt * 0.045) % 1 + 1) % 1, a = Math.sin(f * Math.PI) * Math.min(1, A0 * 2.5) * 0.45;
          if (a < 0.02) continue;
          g.globalAlpha = a; g.lineDashOffset = -tt * 14 - j * 9; g.beginPath();
          for (let i = 0; i <= N; i += 2) { const y = CR.y[i] + (base - CR.y[i]) * (0.06 + f * 0.9) + Math.sin(i * 0.9 + j * 1.7 + tt * 0.8) * 2.5; if (i) g.lineTo(CR.x[i], y); else g.moveTo(CR.x[i], y); }
          g.stroke();
        }
        g.setLineDash([]); g.globalAlpha = 1;
        // the backlit lip and its foam line
        g.globalCompositeOperation = 'lighter';
        g.save(); g.translate(0, 4); g.strokeStyle = rgba(C.lip, 0.1 + 0.32 * A0); g.lineWidth = 5 + A0 * 8; g.beginPath(); traceCrest(g, N); g.stroke(); g.restore();
        g.globalCompositeOperation = 'source-over';
        g.strokeStyle = rgba(C.foam, 0.22 + 0.2 * A0); g.lineWidth = 4 + A0 * 6; g.beginPath(); traceCrest(g, N); g.stroke();
        g.strokeStyle = rgba(C.foam, 0.65 + 0.3 * A0); g.lineWidth = 1.5 + A0 * 1.5; g.beginPath(); traceCrest(g, N); g.stroke();
        if (A0 > 0.25) {
          g.fillStyle = rgba(C.foam, 0.75); const n = N * 2;
          for (let i = 0; i < n; i++) { const k = i / n, x = k * w + Math.sin(i * 3.7) * 6, y = crestAt(x, tt) + dy + 2 + Math.sin(i * 2.1 + tt * 2) * 2.5; g.globalAlpha = 0.35 + 0.4 * Math.sin(i * 1.3 + tt) ** 2; g.beginPath(); g.ellipse(x, y, 3 + (i % 4) * 1.6 * A0, 1.2 + (i % 3) * 0.5, 0, 0, K.TAU); g.fill(); }
          g.globalAlpha = 1;
        }
        // the pull: currents running along the face toward the buoy
        if (W.pull > 0.4 && W.ph !== 'barrel') {
          g.strokeStyle = rgba(C.foam, Math.min(0.45, W.pull * 0.1)); g.lineWidth = 2; g.lineCap = 'round';
          for (let j = 0; j < 6; j++) { const x = w + 40 - ((tt * 150 + j * (w + 80) / 6) % (w + 80)), y = rideY(x, tt) + dy + (j % 3 - 1) * 26; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x - 20, y - 4, x - 46, y); g.moveTo(x - 46, y); g.lineTo(x - 38, y - 5); g.moveTo(x - 46, y); g.lineTo(x - 38, y + 4); g.stroke(); }
        }
        // breaking: lace whitewater tumbles over the crest and down the face
        if (W.brk > 0.01) {
          const a = Math.min(1, W.brk * 1.5) * Math.min(1, A0 * 2.4);
          g.globalCompositeOperation = night ? 'lighter' : 'source-over';
          foamBand(g, (x) => crestAt(x, tt) + dy - 3, 6 + 20 * W.brk, a * 0.92, 1, tt, C.face);
          foamBand(g, (x) => { const c = crestAt(x, tt) + dy; return c + (base - c) * (0.12 + W.brk * 0.26); }, 5 + 7 * W.brk, a * 0.6, 4, tt, C.face);
          g.globalCompositeOperation = 'source-over';
        }
        // the near water: no seam at the trough
        const ng = g.createLinearGradient(0, base - 28, 0, H);
        ng.addColorStop(0, rgba(C.trough, 0)); ng.addColorStop(0.14, C.trough); ng.addColorStop(1, mix(C.trough, '#000000', 0.32));
        g.fillStyle = ng; g.fillRect(0, base - 28, w, H - base + 28);
        g.strokeStyle = night ? rgba(C.lip, 0.22) : 'rgba(255,255,255,0.14)'; g.lineWidth = 1.2; g.setLineDash([22, 10, 6, 12]);
        for (let j = 0; j < 4; j++) { const y = base + 14 + j * (H - base) / 4.2 + Math.sin(tt * 0.7 + j) * 3; g.lineDashOffset = tt * (8 + j * 3); g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 30) g.lineTo(x, y + Math.sin(x * 0.03 + tt + j) * 2); g.stroke(); }
        g.setLineDash([]);
        // the glowing pocket: a warm column of light and a ring on the water that marks how wide it is
        if (A0 > 0.07 && W.ph !== 'barrel') {
          const sx = ux(W.spot), ry = rideY(sx, tt) + dy, bp = beatPulse(), vis = Math.min(1, (A0 - 0.07) * 4), rw = W.spotW * G.zw;
          g.globalCompositeOperation = 'lighter';
          g.globalAlpha = vis * (0.34 + (R.inSpot ? 0.22 : 0) + 0.14 * bp);
          g.drawImage(SPR.spot, sx - rw * 1.4, ry - G.sz * 1.45, rw * 2.8, G.sz * 2.4);
          g.globalAlpha = vis * (0.6 + 0.3 * bp); g.strokeStyle = C.spot; g.lineWidth = 2.2; g.setLineDash([7, 7]); g.lineDashOffset = -tt * 18;
          g.beginPath(); g.ellipse(sx, ry + 5, rw, 8 + 3 * bp, 0, 0, K.TAU); g.stroke(); g.setLineDash([]);
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
          if (Math.random() < 0.15) P.emit('mote', sx + (Math.random() - 0.5) * rw * 1.6, ry - Math.random() * G.sz, 1, { colors: [C.spot, '#ffffff'] });
        }
        // spray off the lip on the big one
        if (A0 > 0.72 && Math.random() < 0.35) { const x = Math.random() * w; P.emit('drop', x, crestAt(x, tt) + dy, 2, { angle: -Math.PI / 2 - 0.5, spread: 0.6, speed: [30, 90], colors: [rgba(C.foam, 0.8)] }); }
        // whitewash rolling in toward the beach
        if (W.foam > 0.01) {
          W.foamS = Math.min(1, (W.foamS || 0) + FDT * 0.24);
          g.globalCompositeOperation = night ? 'lighter' : 'source-over';
          for (let b = 0; b < 4; b++) {
            const yb = base - 6 + b * (H - base) * 0.24 * (0.3 + W.foamS) + Math.sin(tt * 0.9 + b) * 4;
            foamBand(g, (x) => yb + Math.sin(x * 0.021 + b * 1.7 + tt * 0.6) * 5, 9 + (3 - b) * 3, W.foam * (1 - b / 4.5) * 0.85, b + 7, tt, C.trough);
          }
          g.globalCompositeOperation = 'source-over';
        }
      }
      function drawTrail(g, wdt) {
        const C = pal();
        for (let i = trail.length - 1; i >= 0; i--) { const p = trail[i]; p.life -= wdt * 0.75; p.y += wdt * 16; if (p.life <= 0) trail.splice(i, 1); }
        if (trail.length < 2) return;
        g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
        for (let i = 1; i < trail.length; i++) {
          const a = trail[i - 1], b = trail[i];
          g.strokeStyle = b.gold ? C.trail : C.foam; g.globalAlpha = b.life * (b.gold ? 0.55 : 0.3); g.lineWidth = 1 + b.life * (b.gold ? 5 : 3);
          g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      function drawDolphin(g, tt) {
        W.dolphin += FDT / 1.8; if (W.dolphin >= 1) { W.dolphin = 0; return; }
        const k = W.dolphin, x = G.w * (0.12 + 0.5 * k), y = G.hz + 30 - Math.sin(k * Math.PI) * 46, ang = Math.cos(k * Math.PI) * -0.9;
        g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = BRK.night ? '#1b4d6e' : '#2f5d7c';
        g.beginPath(); g.moveTo(-18, 0); g.quadraticCurveTo(-4, -9, 16, -2); g.quadraticCurveTo(22, 0, 16, 2); g.quadraticCurveTo(-2, 7, -18, 0); g.fill();
        g.beginPath(); g.moveTo(-2, -5); g.lineTo(3, -12); g.lineTo(5, -4); g.fill(); g.beginPath(); g.moveTo(-17, 0); g.lineTo(-24, -6); g.lineTo(-22, 2); g.lineTo(-25, 6); g.fill();
        g.restore();
        if (k < 0.04 || (k > 0.95 && k < 0.98)) P.emit('drop', x, G.hz + 30, 3, { angle: -Math.PI / 2, spread: 1.2, speed: [30, 80], colors: [pal().foam] });
        void tt;
      }
      function drawTube(g, tt, wdt) {
        const w = G.w, H = G.h, C = pal(), cx = G.tubeC.x, cy = G.tubeC.y, Rr = G.tubeR;
        g.drawImage(TUBE, cx - Rr, cy - Rr, Rr * 2, Rr * 2);
        g.globalCompositeOperation = 'lighter';
        const spin = W.T * 0.9;
        for (let pass = 0; pass < 2; pass++) {
          g.strokeStyle = rgba(C.lip, pass ? 0.17 : 0.05); g.lineWidth = pass ? 2.2 : 12;
          for (let j = 0; j < 16; j++) {
            const a0 = j / 16 * K.TAU + spin + pass * 0.08; g.beginPath();
            for (let s = 0; s <= 8; s++) { const r = 34 * Math.pow(Rr / 34, s / 8), a = a0 + Math.log(r / 34) * 0.55, px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r * 0.92; if (s) g.lineTo(px, py); else g.moveTo(px, py); }
            g.stroke();
          }
        }
        g.fillStyle = C.foam;
        for (const sp of specks) {
          sp.z += wdt * 0.55; if (sp.z > 1) { sp.z = 0; sp.a = Math.random() * K.TAU; }
          const r = 30 * Math.pow(Rr / 30, sp.z), a = sp.a + Math.log(r / 30) * 0.55 + spin;
          g.globalAlpha = sp.z * 0.6; g.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.92, 1 + sp.z * 3.5, 1 + sp.z * 2);
        }
        // the way out: light at the end of the barrel grows while Rush holds the line
        const p = W.tubeP, ro = 24 + (Rr * 1.15 - 24) * Math.pow(p, 2.2), bp = beatPulse();
        g.globalAlpha = 0.8; g.drawImage(SPR.sun, cx - ro * 2.2, cy - ro * 2.1, ro * 4.4, ro * 4.2);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        const og = g.createRadialGradient(cx, cy + ro * 0.15, ro * 0.04, cx, cy, ro);
        og.addColorStop(0, '#ffffff'); og.addColorStop(0.32, mix(C.sun, '#ffffff', 0.55)); og.addColorStop(0.7, mix(C.skyLow, C.sun, 0.35)); og.addColorStop(1, mix(C.skyMid, C.skyLow, 0.5));
        g.fillStyle = og; g.beginPath(); g.ellipse(cx, cy, ro, ro * 0.92, 0, 0, K.TAU); g.fill();
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 + 0.4 * p; g.drawImage(SPR.sun, cx - ro * 0.9, cy - ro * 0.75, ro * 1.8, ro * 1.6); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        g.strokeStyle = rgba(C.foam, 0.85); g.lineWidth = 2 + ro * 0.03; g.setLineDash([ro * 0.18 + 4, ro * 0.08 + 3]); g.lineDashOffset = -W.T * 40;
        g.beginPath(); g.ellipse(cx, cy, ro * 1.02, ro * 0.94, 0, 0, K.TAU); g.stroke(); g.setLineDash([]);
        // the line to hold: a warm path down the barrel floor
        const xb = w * (0.14 + 0.72 * W.lineU), lw = (G.phone ? 50 : 76) * (1 + bp * 0.08);
        const lg = g.createLinearGradient(0, H, 0, cy); lg.addColorStop(0, rgba(C.spot, 0.5)); lg.addColorStop(0.7, rgba(C.spot, 0.16)); lg.addColorStop(1, rgba(C.spot, 0));
        g.globalCompositeOperation = 'lighter'; g.fillStyle = lg;
        g.beginPath(); g.moveTo(xb - lw / 2, H + 10); g.lineTo(xb + lw / 2, H + 10); g.lineTo(cx + 3, cy); g.lineTo(cx - 3, cy); g.closePath(); g.fill();
        g.strokeStyle = rgba(C.spot, 0.95); g.lineWidth = 4.5; g.lineCap = 'round'; g.setLineDash([0.5, 15]); g.lineDashOffset = W.T * 50;
        g.beginPath(); g.moveTo(xb, H + 10); g.lineTo(cx, cy + ro * 0.9); g.stroke(); g.setLineDash([]); g.lineCap = 'butt';
        g.globalCompositeOperation = 'source-over';
      }
      let SAND = null;
      const sandKey = () => G.w + 'x' + G.h + ':' + K.dark() + ':' + cv.dpr;
      function paintSand() {
        const C = pal(), w = G.w, hh = G.h - G.shore + 4, night = !!BRK.night, o = off(w, hh), g = o.g;
        const sg = g.createLinearGradient(0, 0, 0, hh);
        sg.addColorStop(0, C.wet); sg.addColorStop(0.16, mix(C.wet, C.sand, 0.55)); sg.addColorStop(0.42, C.sand); sg.addColorStop(1, mix(C.sand, '#ffffff', night ? 0.04 : 0.1));
        g.fillStyle = sg; g.fillRect(0, 0, w, hh);
        const rg = g.createLinearGradient(0, 0, 0, hh * 0.2); rg.addColorStop(0, rgba(C.skyLow, 0.32)); rg.addColorStop(1, rgba(C.skyLow, 0));
        g.fillStyle = rg; g.fillRect(0, 0, w, hh * 0.2);
        const r = K.rng(BRK.id.length * 7 + 11); g.lineCap = 'round';
        for (let i = 0; i < 16; i++) {
          const y = hh * (0.24 + r() * 0.72), x0 = r() * w - 30, len = 40 + r() * 100, bend = 3 + r() * 5;
          g.lineWidth = 1.6; g.globalAlpha = 0.2; g.strokeStyle = mix(C.sand, '#000000', 0.35); g.beginPath(); g.moveTo(x0, y); g.quadraticCurveTo(x0 + len / 2, y - bend, x0 + len, y); g.stroke();
          g.globalAlpha = 0.25; g.strokeStyle = mix(C.sand, '#ffffff', 0.4); g.beginPath(); g.moveTo(x0, y + 1.6); g.quadraticCurveTo(x0 + len / 2, y - bend + 1.6, x0 + len, y + 1.6); g.stroke();
        }
        g.globalAlpha = 0.85;
        for (let i = 0; i < 7; i++) { const x = r() * w, y = hh * (0.3 + r() * 0.65), sz = 2.5 + r() * 3; g.fillStyle = mix(C.sand, '#ffffff', 0.6); g.beginPath(); g.ellipse(x, y, sz * 1.3, sz, r() * 3, 0, K.TAU); g.fill(); g.fillStyle = mix(C.sand, '#000000', 0.3); g.fillRect(x - 0.5, y - sz * 0.7, 1, sz * 1.2); }
        g.globalAlpha = 1;
        SAND = { c: o.c, key: sandKey() };
      }
      function drawBeach(g, tt) {
        const w = G.w, H = G.h, C = pal(), sh = G.beachShift, shore = G.shore, night = !!BRK.night;
        g.drawImage(BACK.c, 0, -sh, w, H);
        drawGlitter(g, tt, -sh, shore);
        if (W.ph !== 'end' || W.sunK < 0.98) drawBuoy(g, G.w * 0.2, G.hz - sh + 12, tt, 0.6);
        g.strokeStyle = rgba(C.foam, 0.5); g.lineWidth = 1.4;
        for (let j = 0; j < 3; j++) { const k = (tt * 0.1 + j / 3) % 1, y = (G.hz - sh) + (shore - G.hz + sh) * (0.5 + 0.5 * k); g.globalAlpha = Math.sin(k * Math.PI) * 0.55; g.beginPath(); for (let x = 0; x <= w; x += 24) { const yy = y + Math.sin(x * 0.02 + j * 2 + tt * 0.5) * 2; if (x) g.lineTo(x, yy); else g.moveTo(x, yy); } g.stroke(); }
        g.globalAlpha = 1;
        if (!SAND || SAND.key !== sandKey()) paintSand();
        g.drawImage(SAND.c, 0, shore - 4, w, H - shore + 4);
        const sw = 4 + Math.sin(tt * 0.7) * 6; // the swash: a thin sheet of water running up the sand and back
        g.fillStyle = rgba(C.seaNear, 0.38); g.beginPath(); g.moveTo(0, shore - 5);
        for (let x = 0; x <= w + 20; x += 20) g.lineTo(x, shore + sw + Math.sin(x * 0.018 + tt * 0.6) * 3);
        g.lineTo(w + 20, shore - 5); g.closePath(); g.fill();
        g.strokeStyle = rgba(C.foam, 0.8); g.lineWidth = 2; g.beginPath();
        for (let x = 0; x <= w + 20; x += 20) { const yy = shore + sw + Math.sin(x * 0.018 + tt * 0.6) * 3; if (x) g.lineTo(x, yy); else g.moveTo(x, yy); } g.stroke();
        // footprints that count the waves, the planted board, and Drop's heart
        for (const f of foot) {
          g.save(); g.translate(f.x, f.y); g.rotate(f.ang);
          if (night) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, f.a) * 0.8; g.fillStyle = C.lip; }
          else { g.globalAlpha = Math.min(1, f.a); g.fillStyle = 'rgba(70,35,30,0.32)'; }
          g.beginPath(); g.ellipse(0, 2, 3.6, 6.2, 0, 0, K.TAU); g.fill(); g.beginPath(); g.arc(0, -6.5, 2.6, 0, K.TAU); g.fill();
          g.restore(); f.a = Math.min(1, f.a + FDT * 3.6);
          if (f.n) { g.globalAlpha = Math.min(1, f.a); g.fillStyle = night ? C.lip : '#fff4e2'; g.font = '400 17px ' + 'Shrikhand, "Cooper Black", "Poppins", sans-serif'; g.textAlign = 'center'; g.fillText(String(f.n), f.x + f.nx, f.y + 6); g.globalAlpha = 1; }
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        if (W.planted) {
          const k = Math.min(1, W.planted), ang = -Math.PI / 2 * ios(k) + 0.12 * ios(k);
          drawBoard(g, G.plant.x, G.plant.y - G.sz * 0.6 * ios(k), G.sz * 1.45, ang, boardShown);
          g.fillStyle = mix(C.sand, '#000000', 0.08); g.beginPath(); g.ellipse(G.plant.x + 4, G.plant.y + 4, 22, 6, 0, 0, K.TAU); g.fill();
          if (W.planted < 1) W.planted = Math.min(1, W.planted + FDT * 1.8);
        }
        if (heartOn) {
          const hs = G.heart.s, n = 90, upto = Math.floor(n * heartK);
          const path = () => { g.beginPath(); for (let i = 0; i <= upto; i++) { const p = heartPt(i / n, hs); if (i) g.lineTo(G.heart.x + p.x, G.heart.y + p.y); else g.moveTo(G.heart.x + p.x, G.heart.y + p.y); } };
          g.lineCap = 'round'; g.lineJoin = 'round';
          if (night) { g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(C.lip, 0.35); g.lineWidth = 12; path(); g.stroke(); g.strokeStyle = C.lip; g.lineWidth = 3.5; path(); g.stroke(); g.globalCompositeOperation = 'source-over'; }
          else { g.strokeStyle = 'rgba(80,40,30,0.34)'; g.lineWidth = 7; path(); g.stroke(); g.strokeStyle = 'rgba(255,244,226,0.45)'; g.lineWidth = 2; g.save(); g.translate(1.5, 2.5); path(); g.stroke(); g.restore(); }
          if (heartK >= 1) {
            g.globalAlpha = Math.min(1, W.heartText || 0); W.heartText = Math.min(1, (W.heartText || 0) + FDT * 1.8);
            g.fillStyle = night ? C.lip : '#5a2a22'; g.textAlign = 'center';
            g.font = '700 ' + (G.phone ? 22 : 30) + 'px Caveat, "Segoe Print", "Bradley Hand", "Chalkboard SE", Poppins, sans-serif';
            g.fillText('3 waves', G.heart.x, G.heart.y - hs * 0.05);
            g.globalAlpha = 1;
          } else if (heartK > 0) { const p = heartPt(heartK, hs); g.globalCompositeOperation = 'lighter'; g.drawImage(SPR.spot, G.heart.x + p.x - 16, G.heart.y + p.y - 16, 32, 32); g.globalCompositeOperation = 'source-over'; }
        }
        if (visits >= 1 && W.birds != null) {
          W.birds += FDT; const bx = G.w + 40 - W.birds * (G.w + 120) / 14, by = (G.hz - sh) * 0.45;
          g.strokeStyle = night ? 'rgba(220,230,255,0.7)' : 'rgba(40,20,40,0.65)'; g.lineWidth = 1.6;
          for (let i = 0; i < 4; i++) { const x = bx + i * 16, y = by + i * 7 + Math.sin(tt * 3 + i) * 1.5, f = Math.sin(tt * 4 + i) * 2; g.beginPath(); g.moveTo(x - 6, y - 2 + f); g.quadraticCurveTo(x - 3, y - 4, x, y); g.quadraticCurveTo(x + 3, y - 4, x + 6, y - 2 + f); g.stroke(); }
        }
      }

      /* ---------------- frame loop ---------------- */
      let lastT = 0, FDT = 1 / 60, qAcc = 0, qN = 0, qLvl = 1;
      K.loop((dtIn, tNow) => {
        const g = cv.g; if (!g || !G.w || !BACK) return;
        // real elapsed time drives the waves (a slow frame never stretches the session); physics is sub-stepped
        const raw = lastT ? tNow - lastT : dtIn; lastT = tNow;
        const dt = Math.max(0, Math.min(1, raw)), wdt = dt * W.slow; FDT = dt;
        // quality guard: on a struggling device paint the sea with fewer pixels (1.5x -> 1.2x -> 1x)
        if (raw < 0.5) { qAcc += raw; qN++; if (qN >= 120) { if (qAcc / qN > 0.03 && qLvl > 0.67) { qLvl = qLvl > 0.9 ? 0.8 : 0.67; cv.setQuality(qLvl); } qAcc = 0; qN = 0; } }
        W.T += wdt; const tt = W.T;
        if (['rise', 'hold', 'fall', 'lull', 'barrel'].includes(W.ph)) stepWave(dt, wdt);
        if (W.ph === 'barrel') stepBarrel(dt);
        for (let rem = dt; rem > 1e-4; rem -= 1 / 40) stepRush(Math.min(rem, 1 / 40));
        if (W.foam > 0 && W.ph !== 'fall') W.foam = Math.max(0, W.foam - dt * 0.35);
        if (W.ph === 'fall' && W.pt > 2) W.foam = Math.max(0, W.foam - dt * 0.2);
        W.shake = Math.max(0, W.shake - dt * 1.6); W.flash = Math.max(0, W.flash - dt * (K.reduced() ? 0.6 : 1.1));
        if (W.ph === 'pre') { W.pt += dt; W.A += (0.05 - W.A) * Math.min(1, dt); if (W.pt >= 1.4) startWave(0); }
        if (W.sunGo) { W.sunK = Math.min(1, W.sunK + dt / 9); paintBack(); }
        // meter
        if (Math.abs(W.level - (W.lvCss || 0)) > 0.015) { W.lvCss = W.level; meter.style.setProperty('--lv', W.level.toFixed(2)); }
        const lv = Math.max(1, Math.min(10, Math.round(W.level)));
        if (lv !== W.lvShown) { W.lvShown = lv; numEl.textContent = String(lv); meter.setAttribute('aria-valuenow', String(lv)); numEl.classList.remove('us-tick'); void numEl.offsetWidth; numEl.classList.add('us-tick'); if (A.ctx) A.wood(undefined, 0.05, 0.6 + lv * 0.07); }
        // sound follows the water
        if (AU.roar) { const tube = W.ph === 'barrel' ? W.tube : 0; AU.roar.level((0.035 + W.A * 0.09 + W.foam * 0.05) * (1 - tube * 0.7) * (W.beachOn ? 0.55 : 1), 0.3); AU.roar.freq(240 + W.A * 640 + W.foam * 500, 0.3); AU.tube.level(0.0001 + tube * 0.13, 0.3); AU.carve.level(!W.beachOn && (touching || Math.abs(R.v) > 0.05) ? Math.min(0.06, Math.abs(R.v) * 0.12) : 0.0001, 0.05); AU.carve.freq(1300 + Math.min(1, Math.abs(R.v)) * 2600, 0.05); }
        // where Rush and his board are this frame
        const sx = W.shake > 0 ? Math.sin(tNow * 53) * 3 * W.shake : 0, sy = W.shake > 0 ? Math.cos(tNow * 41) * 2 * W.shake : 0;
        g.setTransform(cv.dpr, 0, 0, cv.dpr, sx * cv.dpr, sy * cv.dpr);
        if (!W.beachOn) {
          g.drawImage(BACK.c, 0, 0, G.w, G.h);
          drawGlitter(g, tt, 0, G.base);
          const by = drawBuoy(g, G.buoy.x, G.buoy.y, tt, G.phone ? 0.95 : 1.2);
          buoy.style.transform = `translate(${(G.buoy.x - 18).toFixed(1)}px, ${(by - 36).toFixed(1)}px) translateY(-100%)`;
          if (W.dolphin) drawDolphin(g, tt);
          drawWave(g, tt, 0);
          placeRush(tt, wdt);
          drawTrail(g, wdt);
          if (W.ph !== 'barrel' || W.tube < 1) { if (!R.tumble) drawBoard(g, R.bx, R.by + 3, G.sz * 1.55, R.lean * Math.PI / 180 * 0.8, boardShown); }
          if (W.ph === 'barrel' && W.tube > 0) {
            if (W.tube < 1) { g.save(); g.beginPath(); g.arc(R.px, R.py, W.tube * Math.hypot(G.w, G.h), 0, K.TAU); g.clip(); drawTube(g, tt, wdt); g.restore(); }
            else drawTube(g, tt, wdt);
            drawBoard(g, R.bx, R.by + 3, G.sz * 1.55, R.lean * Math.PI / 180 * 0.8, boardShown);
          }
        }
        else { drawBeach(g, tt); placeShore(g, tt); }
        P.update(wdt); P.draw(g);
        if (W.flash > 0) { g.fillStyle = rgba(pal().spot, W.flash * 0.8); g.fillRect(-10, -10, G.w + 20, G.h + 20); }
        if (W.dip > 0) { g.fillStyle = rgba(pal().skyLow, W.dip); g.fillRect(-10, -10, G.w + 20, G.h + 20); }
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
        if (prompt.classList.contains('us-on')) {
          let px, py;
          if (W.ph === 'barrel') { px = G.tubeC.x; py = G.tubeC.y - G.h * 0.16; }
          else {
            const x0 = ux(W.spot); px = K.clamp(x0, promptHalf + 12, G.w - promptHalf - (G.phone ? 64 : 120)); py = Math.max(G.perch.y + G.dsz + 40, crestAt(px, tt) - 42);
            if (px - promptHalf < G.buoy.x + (G.phone ? 190 : 230) && py < G.buoy.y + 46) py = G.buoy.y + 46; // never over the buoy or its label
          }
          prompt.style.transform = `translate(${(px - promptHalf).toFixed(1)}px, ${py.toFixed(1)}px) translateY(-50%)`;
        }
      });
      function placeRush(tt, wdt) {
        let x, by;
        if (W.ph === 'barrel' && W.tube > 0) {
          const fx = ux(R.u), fy = rideY(fx, tt), ty = G.h * 0.72 + Math.sin(tt * 2.2) * 3, xb = G.w * (0.14 + 0.72 * R.u), kk = (G.h + 10 - ty - 4) / (G.h + 10 - G.tubeC.y);
          const tx = xb + (G.tubeC.x - xb) * kk, k = ios(W.tube); // on the barrel floor, in perspective, so 'on the line' looks on the line
          x = fx + (tx - fx) * k; by = fy + (ty - fy) * k;
        } else {
          x = ux(R.u); by = W.A > 0.1 ? rideY(x, tt) : G.base + Math.sin(tt * 1.6) * 3 - 2;
        }
        R.bx = x; R.by = by; R.px = x; R.py = by - G.sz * 0.44;
        if (!R.tumble && W.A > 0.1 && W.ph !== 'barrel') { trail.push({ x, y: by + 2, life: 1, gold: R.inSpot }); if (trail.length > 70) trail.shift(); }
        if (Math.abs(R.v) > 0.3 && Math.random() < 0.5 && !R.tumble) P.emit('drop', x - Math.sign(R.v) * G.sz * 0.6, by, 1, { angle: -Math.PI / 2 - Math.sign(R.v) * 0.7, spread: 0.7, speed: [50, 150], colors: [pal().foam] });
        if (BRK.night && W.A > 0.1 && Math.random() < 0.3) P.emit('mote', x + (Math.random() - 0.5) * G.sz, by + 4, 1, { colors: [pal().lip] });
        rush.el.style.transform = `translate3d(${(x - G.sz / 2).toFixed(1)}px, ${(R.py - G.sz / 2).toFixed(1)}px, 0)`;
        rush.el.style.setProperty('--lean', R.lean.toFixed(1) + 'deg');
        void wdt;
      }
      function placeShore(g, tt) {
        let x, y, sc = 1;
        if (W.ph === 'paddle') {
          W.pk += (SC.strokes / 3 - W.pk) * Math.min(1, FDT * 3.6);
          const k = ios(Math.min(1, W.pk));
          x = G.w * (G.phone ? 0.44 : 0.46); y = G.seaY + (G.shore - 6 - G.seaY) * k + Math.sin(tt * 1.8) * 2.5; sc = 0.78 + 0.22 * k;
          drawBoard(g, x, y + 3, G.sz * 1.5 * sc, Math.sin(tt * 1.4) * 0.05, boardShown);
          R.bx = x; R.by = y; R.px = x; R.py = y - G.sz * 0.44 * sc;
        } else { R.px = R.wx; R.py = R.wy; }
        rush.el.style.transform = `translate3d(${(R.px - G.sz / 2).toFixed(1)}px, ${(R.py - G.sz / 2).toFixed(1)}px, 0) scale(${sc.toFixed(3)})`;
        rush.el.style.setProperty('--lean', '0deg');
        if (W.rings) {
          const age = (performance.now() - W.rings) / 1000; g.strokeStyle = pal().foam; g.lineWidth = 2;
          for (let r = 0; r < 4; r++) { const rr = (age - r * 0.45) * (G.phone ? 70 : 100); if (rr <= 0) continue; const a = Math.max(0, 0.5 - rr / (G.w * 1.1)); if (a <= 0) continue; g.globalAlpha = a; g.beginPath(); g.ellipse(G.heart.x, G.heart.y, rr + G.heart.s * 0.45, (rr + G.heart.s * 0.45) * 0.38, 0, 0, K.TAU); g.stroke(); }
          g.globalAlpha = 1;
        }
      }
      function stroke() {
        if (W.ph !== 'paddle' || SC.strokes >= 3) return;
        SC.strokes++; W.lastStroke = performance.now();
        K.sfx.whoosh(); splash(0.07);
        if (A.ctx) A.noise({ filter: 'bandpass', freq: 700, to: 260, dur: 0.5, attack: 0.04, vol: 0.1 });
        [-1, 1].forEach(s => P.emit('drop', R.bx + s * G.sz * 0.45, R.by, 7, { angle: -Math.PI / 2 + s * 0.5, spread: 0.9, speed: [50, 140], colors: [pal().foam, '#ffffff'] }));
        rushFace(SC.strokes >= 3 ? 'celebrate' : 'happy', true);
        if (SC.strokes >= 3) { gSpec = null; K.guide(null); }
      }

      /* ---------------- result ---------------- */
      let RES = null;
      function computeResult() {
        const smooth = SC.ride > 0.5 ? SC.inT / SC.ride : 0.75, lineQ = SC.barrel > 0.5 ? SC.onLine / SC.barrel : 0.75;
        const score = Math.max(0, Math.min(1, smooth * 0.72 + lineQ * 0.28)), tier = K.tier(score), tierIdx = ({ Bronze: 1, Silver: 2, Gold: 3 })[tier] || 0;
        const newTier = tierIdx > ownTier;
        if (newTier) S.store.set('urge-surf:board', tierIdx);
        RES = { smooth, lineQ, score, pct: Math.round(smooth * 100), tier, tierIdx, newTier };
      }

      /* ---------------- finale: paddle in at sunset ---------------- */
      async function finale() {
        if (W.ph === 'paddle' || finished) return;
        W.ph = 'paddle'; W.pk = 0; SC.strokes = 0; W.pull = 0;
        prompt.classList.remove('us-on'); meter.classList.remove('us-on'); buoy.classList.add('us-gone'); buoy.classList.remove('us-pulling');
        waveDots.forEach(d => d.classList.add('on'));
        MU.bpm = 64; MU.sparse = true; MU.perc = false; MU.vol = 0.8;
        rushFace('happy', true); trail.length = 0; setGuide(null);
        await K.anim(700, (k) => { W.dip = k; });
        W.beachOn = true; W.A = 0.04; W.foam = 0; W.brk = 0; W.birds = visits >= 1 ? 0 : null;
        await K.anim(900, (k) => { W.dip = 1 - k; });
        W.dip = 0;
        say(L.paddle, 3200, 'happy');
        setGuide({ id: 'paddle', g: 'drag', target: () => ({ x: R.px, y: R.by + 16 }), dx: 0, dy: G.phone ? 90 : 120, label: 'SWIPE DOWN TO PADDLE', place: 'below', ms: 1700 });
        let idle = 0;
        while (SC.strokes < 3) { // nobody has to paddle: after a while the tide carries Rush in
          await S.sleep(200); idle += 200;
          if (idle > 5200 && performance.now() - (W.lastStroke || 0) > 5200) { W.tide = true; idle = 0; stroke(); }
        }
        setGuide(null);
        await S.sleep(1000);
        await shore();
      }
      async function shore() {
        W.ph = 'shore'; R.wx = R.px; R.wy = R.py;
        computeResult();
        W.planted = 0.01; W.sunGo = true;
        if (A.ctx) A.thud({ vol: 0.12 }); K.sfx.lock();
        if (RES.newTier) S.later(() => { boardShown = RES.tierIdx; K.sfx.sparkle(); P.emit('star', G.plant.x, G.plant.y - G.sz, 16, { colors: ['#ffe9a8', '#ffffff'], speed: [40, 160] }); K.pop('New board!', { x: Math.max(70, G.plant.x + 30), y: G.plant.y - G.sz * 1.7, kind: 'great' }); }, 700);
        say(L.final, 4300, 'love');
        rushFace('happy', true);
        const from = { x: R.wx, y: R.wy }, to = G.stand, ang = Math.atan2(to.y - from.y, to.x - from.x) + Math.PI / 2, px = Math.cos(ang - Math.PI / 2), py = Math.sin(ang - Math.PI / 2);
        for (let s = 0; s < 8; s++) { // footprints count the waves: every second print gets a number
          const side = s % 2 ? 1 : -1, n = s % 2 ? (s + 1) / 2 : 0, fx = R.wx + py * side * -6, fy = R.wy + G.sz * 0.47 + px * side * 6;
          foot.push({ x: fx, y: fy, ang, a: 0, n: n <= 3 ? n : 0, nx: 20 });
          if (A.ctx) A.noise({ filter: 'lowpass', freq: 700, dur: 0.07, vol: 0.08 });
          if (n && n <= 3) { chime(n + 1, 0.08); P.emit('mote', fx + 20, fy, 5, { colors: [pal().spot, '#ffffff'] }); }
          const k0 = s / 8, k1 = (s + 1) / 8;
          await K.anim(360, (k) => { const kk = k0 + (k1 - k0) * k; R.wx = from.x + (to.x - from.x) * kk; R.wy = from.y + (to.y - from.y) * kk - Math.sin(k * Math.PI) * 8; });
        }
        rushFace('celebrate', true);
        await S.sleep(700);
        // Drop floats down and draws the heart in the sand himself
        const hp = (k) => { const q = heartPt(k, G.heart.s); return { x: G.heart.x + q.x - G.dsz / 2, y: G.heart.y + q.y - G.dsz * 0.95 }; };
        const p0 = hp(0);
        dropAway = true; drop.hush(); drop.side('left'); drop.place(p0.x, p0.y, 1300); drop.base('happy');
        if (A.ctx) A.whoosh({ from: 900, to: 300, dur: 1, vol: 0.06 });
        await S.sleep(1350);
        heartOn = true; drop.base('love');
        if (A.ctx && !AU.sand) { AU.sand = A.loop({ filter: 'bandpass', freq: 1300, q: 0.9 }); if (AU.sand) AU.sand.level(0.035, 0.1); }
        await K.anim(2600, (k) => { heartK = k; const q = hp(k); drop.place(q.x, q.y); if (AU.sand) AU.sand.freq(1100 + Math.sin(k * 40) * 300, 0.03); });
        heartK = 1; if (AU.sand) AU.sand.level(0.0001, 0.1);
        drop.place(G.dropSand.x, G.dropSand.y, 900);
        W.rings = performance.now();
        rush.react('bounce'); drop.react('bounce');
        const C = pal(), wo = SC.tumbles === 0 ? 'zero wipeouts' : SC.tumbles === 1 ? '1 wipeout' : SC.tumbles + ' wipeouts';
        showCap('It passed.', '3 waves · ' + wo + ' · ' + BRK.name, 'Tomorrow’s break: ' + TOMORROW.name);
        K.finale('stars', { colors: [C.spot, C.lip, '#ffffff'], chord: ['D4', 'F#4', 'A4', 'C#5'], ms: 3600 });
        await S.sleep(4200);
        finish(wo);
      }
      function finish(wo) {
        if (finished) return;
        const badges = [];
        const pb = K.best('smooth', RES.pct, 'higher');
        if (pb.isNew) badges.push('New best: ' + RES.pct + '% in the glow'); else if (pb.first) badges.push('First ride: ' + RES.pct + '% in the glow');
        if (RES.tier) badges.push(RES.newTier ? 'Unlocked: ' + BOARDS[RES.tierIdx].name + ' board' : RES.tier + ' ride');
        const col = K.collect(BRK.name);
        badges.push((col.isNew ? 'Collected: ' : 'Surfed again: ') + BRK.name + ' (' + col.count + ' of ' + BREAKS.length + ')');
        if (!SC.tumbles) badges.push('Zero wipeouts');
        ctx.track('done', { smooth: RES.pct, line: Math.round(RES.lineQ * 100), wipeouts: SC.tumbles, tier: RES.tierIdx, tide: W.tide ? 1 : 0 });
        finished = true; W.ph = 'end';
        ctx.finish({ title: 'It passed', mood: 'celebrate', lines: ['3 waves rose, peaked and passed', RES.pct + '% of the ride in the glow', 'Urge meter: ' + peak2 + ' → 1'], share: 'Rode an urge until it passed. 3 waves, ' + wo + '.', badges });
      }

      /* ---------------- start ---------------- */
      if (S.isDev && S.isDev()) window.__urgeSurf = { W, R, SC, G, T };
      S.on('theme', () => { backKey = ''; SAND = null; paintSprites(); paintBack(); });
      cv.onResize(() => layout());
      (async () => {
        await K.intro({ title: 'Urge Surf', sub: 'An urge is a wave. It builds, it peaks, and it passes. You only have to ride it.', how: 'Slide left and right to keep Rush in the glow.', char: 'rush', mood: 'determined' });
        W.ph = 'pre'; W.pt = 0;
        say(L.start, 4400, 'happy');
      })();

      return {
        async autoplay() {
          const intro = el.querySelector('.gk-intro'); if (intro) await K.sim.tap(intro);
          while (W.ph === 'intro') await K.wait(100);
          const x0 = G.w / 2, y0 = G.h * 0.72;
          const pr = await K.sim.press(pad, x0, y0);
          let fx = x0;
          while (!['paddle', 'shore', 'end'].includes(W.ph) && !finished) {
            const want = K.clamp((W.ph === 'barrel' ? W.lineU : W.spot) + W.pull / 30, 0, 1);
            fx = x0 + (want - DR.tgt0) * G.zw / GAIN;
            pr.move(fx, y0);
            await K.wait(45);
          }
          pr.up(fx, y0);
          while (W.ph === 'paddle' && SC.strokes < 3) {
            if (W.beachOn && !W.dip) await K.sim.drag(pad, { x: G.w / 2, y: G.h * 0.42 }, { x: G.w / 2, y: G.h * 0.42 + 70 }, 360, 8);
            await K.wait(450);
          }
          while (!finished) await K.wait(200);
        }
      };
    }
  });
})(window.TSG_ENV);
