/* 016 Gut Coin — Reset · CHOOSE · Decision Pressure
 * Mechanism: the coin-flip gut check. A toss doesn't decide for you; it makes you notice your feeling about the outcome
 * (Jaffé, Reutner & Greifeneder 2019, "Catalyzing decisions"): the side you hope for at the top of the throw, and the
 * flash of relief or disappointment when it lands, show what you already prefer. Wanting a re-flip is itself an answer.
 * It cuts through overthinking without arguing with it.
 * Verb: flip (drag each option onto a coin face to stamp it, flick the heavy coin up, pick a side in bullet time, tap to
 * catch it). Finale: the coin glows, melts and is recast as a gold medal stamped with your gut choice, under a turning
 * sunburst, with one gentle next step.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;

  /* Today's mint: coin designs of the world (daily, collectable). */
  const MINTS = [
    { id: 'owl', name: 'Owl Drachma', metal: 'silver', front: 'owl', back: 'olive', felt: 'plum' },
    { id: 'roo', name: 'Kangaroo Dollar', metal: 'gold', front: 'roo', back: 'stars', felt: 'teal' },
    { id: 'crane', name: 'Crane Mon', metal: 'bronze', front: 'crane', back: 'waves', felt: 'navy' },
    { id: 'lion', name: 'Lion Sovereign', metal: 'gold', front: 'lion', back: 'crown', felt: 'wine' },
    { id: 'sun', name: 'Sun Sol', metal: 'gold', front: 'sun', back: 'laurel', felt: 'teal' },
    { id: 'moon', name: 'Moon Florin', metal: 'silver', front: 'moon', back: 'laurel', felt: 'navy' },
    { id: 'maple', name: 'Maple Cent', metal: 'copper', front: 'maple', back: 'olive', felt: 'wine' },
    { id: 'ship', name: 'Ship Shilling', metal: 'bronze', front: 'ship', back: 'anchor', felt: 'plum' }
  ];
  const METALS = {
    gold: { hi: '#fff4c4', mid: '#e9c25e', lo: '#a97824', deep: '#6e4a10', ink: '#5a3a06', edge: [176, 128, 44] },
    silver: { hi: '#ffffff', mid: '#d3dbe3', lo: '#94a1ad', deep: '#5c6874', ink: '#36404a', edge: [150, 160, 172] },
    copper: { hi: '#ffe0c8', mid: '#dc8d5e', lo: '#a3532c', deep: '#682c12', ink: '#4a1c08', edge: [170, 96, 58] },
    bronze: { hi: '#f6e2b4', mid: '#c99c5c', lo: '#8f6230', deep: '#5a3a14', ink: '#3e2608', edge: [150, 110, 62] }
  };
  const FELTS = { plum: ['#5a1f4a', '#2a0b24'], teal: ['#1d5a5a', '#0b2a2c'], navy: ['#23306a', '#0d1430'], wine: ['#6a1a2a', '#2e0a12'] };
  const PAIRS = [['Stay', 'Go'], ['Say it', 'Leave it'], ['Now', 'Later'], ['Yes', 'No']];

  (env.games = env.games || []).push({
    id: 'gut-coin', mode: 'reset', name: 'Gut Coin', verb: 'flip', family: 'CHOOSE', minutes: 2,
    parents: ['Decision Pressure', 'Uncertainty / Future Worry / Reassurance', 'Overthinking / Thought Fusion'],
    cast: ['glitch', 'patch'], poster: { char: 'glitch', mood: 'idea' },
    fonts: ['Cinzel:wght@600;700;800'],
    tagline: 'Flip a heavy coin and catch what your gut was hoping for.',
    why: 'For a choice you keep going round on: the coin doesn’t decide, your reaction does.',
    css: `
.g-gut-coin { --gc-gold: #f3c969; --gc-gold2: #ffe7a8; --gc-ink: #1b1030; --gc-cin: "Cinzel", "Trajan Pro", "Palatino Linotype", Georgia, serif; }
.g-gut-coin .gc-zone { position: absolute; z-index: 25; left: 0; top: 0; width: 220px; height: 240px; margin: -120px 0 0 -110px; border-radius: 50%; touch-action: none; cursor: grab; outline: none; }
.g-gut-coin .gc-zone:focus-visible { box-shadow: 0 0 0 3px var(--gc-gold); }
.g-gut-coin .gc-tap { position: absolute; z-index: 24; left: 0; right: 0; top: 0; bottom: 0; touch-action: none; }
.g-gut-coin .gc-panel { position: absolute; z-index: 34; left: 12px; right: 12px; bottom: calc(env(safe-area-inset-bottom, 0px) + 16px); min-height: 150px; box-sizing: border-box; padding: 14px 14px 14px; border-radius: 22px;
  background: linear-gradient(180deg, rgba(34, 20, 56, 0.96), rgba(18, 10, 32, 0.97)); border: 1.5px solid rgba(243, 201, 105, 0.55); color: #fbf1dc;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 231, 168, 0.25); display: flex; flex-direction: column; align-items: center; gap: 10px; transition: transform 0.45s cubic-bezier(.2, .9, .3, 1), opacity 0.35s ease; }
.g-gut-coin .gc-panel::before, .g-gut-coin .gc-panel::after { content: ""; position: absolute; top: 8px; width: 22px; height: 22px; border-top: 2px solid rgba(243, 201, 105, 0.6); }
.g-gut-coin .gc-panel::before { left: 8px; border-left: 2px solid rgba(243, 201, 105, 0.6); border-top-left-radius: 6px; }
.g-gut-coin .gc-panel::after { right: 8px; border-right: 2px solid rgba(243, 201, 105, 0.6); border-top-right-radius: 6px; }
.g-gut-coin .gc-panel.off { transform: translateY(calc(100% + 30px)); opacity: 0; pointer-events: none; }
.g-gut-coin .gc-h { font: 700 13px/1.2 var(--gc-cin); letter-spacing: 0.16em; text-transform: uppercase; color: var(--gc-gold); text-align: center; }
.g-gut-coin .gc-sub { font: 500 15px/1.35 var(--font-ui); color: rgba(251, 241, 220, 0.86); text-align: center; text-wrap: balance; }
.g-gut-coin .gc-row { display: flex; gap: 10px; justify-content: center; width: 100%; flex-wrap: wrap; }
.g-gut-coin .gc-chips .ts-chip { background: rgba(243, 201, 105, 0.1); border-color: rgba(243, 201, 105, 0.5); color: #fff4dc; font: 700 15px/1 var(--gc-cin); letter-spacing: 0.04em; padding: 11px 14px; min-height: 44px; }
.g-gut-coin .gc-chips .ts-chip[aria-pressed="true"] { background: var(--gc-gold); color: #2a1a04; }
.g-gut-coin .gc-link { appearance: none; background: none; border: 0; color: rgba(251, 241, 220, 0.85); font: 500 14px/1.2 var(--font-ui); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; padding: 8px 6px; min-height: 40px; }
.g-gut-coin .gc-in { width: 46%; min-width: 0; box-sizing: border-box; border-radius: 12px; border: 1.5px solid rgba(243, 201, 105, 0.5); background: rgba(255, 244, 220, 0.08); color: #fff4dc; font: 600 16px/1.2 var(--font-ui); padding: 11px 12px; }
.g-gut-coin .gc-in:focus { outline: 2px solid var(--gc-gold); outline-offset: 1px; }
.g-gut-coin .gc-die { position: relative; display: flex; align-items: center; gap: 9px; max-width: 46%; min-height: 54px; box-sizing: border-box; padding: 8px 14px 8px 8px; border-radius: 999px; touch-action: none; cursor: grab; user-select: none;
  background: linear-gradient(180deg, #ffe7a8, #d9a442 55%, #b07a22); color: #2a1804; box-shadow: 0 6px 0 #6e4a10, 0 12px 22px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.7); transition: transform 0.25s cubic-bezier(.2, 1.4, .4, 1), opacity 0.3s ease; will-change: transform; }
.g-gut-coin .gc-die.drag { transition: none; z-index: 60; box-shadow: 0 6px 0 #6e4a10, 0 22px 30px rgba(0, 0, 0, 0.5); }
.g-gut-coin .gc-die.used { opacity: 0; pointer-events: none; transform: scale(0.6); }
.g-gut-coin .gc-die.wait { opacity: 0.55; cursor: default; }
.g-gut-coin .gc-die b { flex: none; width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; font: 800 13px/1 var(--gc-cin); color: #fff4d0; background: radial-gradient(circle at 40% 35%, #8a5a18, #4a2e08); box-shadow: inset 0 2px 3px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(255, 240, 200, 0.6); }
.g-gut-coin .gc-die span { font: 800 16px/1.12 var(--gc-cin); letter-spacing: 0.02em; text-wrap: balance; overflow-wrap: anywhere; }
.g-gut-coin .gc-big { appearance: none; flex: 1 1 0; min-width: 0; max-width: 240px; min-height: 76px; border-radius: 18px; border: 2px solid rgba(243, 201, 105, 0.75); cursor: pointer; padding: 10px 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  background: radial-gradient(120% 120% at 50% 0%, rgba(243, 201, 105, 0.22), rgba(243, 201, 105, 0.05)); color: #fff4dc; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35); transition: transform 0.15s ease, background 0.2s ease; }
.g-gut-coin .gc-big:active { transform: scale(0.96); }
.g-gut-coin .gc-big:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
.g-gut-coin .gc-big small { font: 700 12px/1 var(--gc-cin); letter-spacing: 0.16em; color: var(--gc-gold); }
.g-gut-coin .gc-big span { font: 800 18px/1.12 var(--gc-cin); text-wrap: balance; overflow-wrap: anywhere; }
.g-gut-coin .gc-big.soft span { font: 600 16px/1.2 var(--font-ui); }
.g-gut-coin .gc-cap { position: absolute; z-index: 33; left: 50%; top: 0; transform: translate(-50%, -50%); width: max-content; max-width: calc(100% - 32px); text-align: center; pointer-events: none; opacity: 0; transition: opacity 0.35s ease;
  font: 700 19px/1.2 var(--gc-cin); letter-spacing: 0.1em; text-transform: uppercase; color: var(--gc-gold2); text-shadow: 0 2px 0 rgba(30, 10, 0, 0.55), 0 0 18px rgba(255, 200, 100, 0.45); text-wrap: balance; }
.g-gut-coin .gc-cap.on { opacity: 1; }
.g-gut-coin .gc-cap .gk-user { display: block; margin-top: 4px; font: 800 26px/1.1 var(--gc-cin); letter-spacing: 0.04em; color: #fff8e4; }
.g-gut-coin .gc-pop { position: absolute; z-index: 36; left: 0; top: 0; transform: translate(-50%, -50%); font: 800 22px/1 var(--gc-cin); letter-spacing: 0.08em; color: var(--gc-gold2); white-space: nowrap; pointer-events: none;
  text-shadow: 0 2px 0 #3a1a00, 0 0 16px rgba(255, 200, 100, 0.7); animation: gut-coin-pop 1.1s ease-out both; }
.g-gut-coin .gc-pop.soft { font-size: 18px; color: #fff1d6; }
.g-gut-coin .gc-card { position: absolute; z-index: 40; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 18px); width: min(360px, calc(100% - 28px)); box-sizing: border-box; padding: 15px 18px 16px; border-radius: 18px; text-align: center; transform: translateX(-50%);
  background: linear-gradient(180deg, #2a1a44, #170d2a); border: 1.5px solid rgba(243, 201, 105, 0.7); color: #fbf1dc; box-shadow: 0 18px 44px rgba(0, 0, 0, 0.55); animation: gut-coin-card 0.7s cubic-bezier(.2, 1.3, .4, 1) both; }
.g-gut-coin .gc-card-k { font: 700 12px/1 var(--gc-cin); letter-spacing: 0.18em; color: var(--gc-gold); text-transform: uppercase; }
.g-gut-coin .gc-card .gc-card-t { display: block; margin-top: 7px; font: 800 24px/1.12 var(--gc-cin); color: #fff6dc; text-wrap: balance; }
.g-gut-coin .gc-card-s { margin-top: 8px; font: 500 15px/1.38 var(--font-ui); color: rgba(251, 241, 220, 0.9); text-wrap: balance; }
.g-gut-coin .gc-tray-k { margin-top: 12px; font: 700 12px/1.2 var(--gc-cin); letter-spacing: 0.12em; text-transform: uppercase; color: rgba(243, 201, 105, 0.85); }
.g-gut-coin .gc-tray { display: flex; justify-content: center; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
.g-gut-coin .gc-tray canvas { width: 26px; height: 26px; border-radius: 50%; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.45); }
.g-gut-coin .gc-tray canvas.today { box-shadow: 0 0 0 2px #ffe7a8, 0 0 12px rgba(255, 220, 140, 0.8); animation: gut-coin-today 1.6s ease-in-out infinite alternate; }
@keyframes gut-coin-today { from { transform: scale(1); } to { transform: scale(1.12); } }
.g-gut-coin.gc-bright .gc-cap { color: #6a2a10; text-shadow: 0 1px 0 rgba(255, 255, 255, 0.85), 0 0 14px rgba(255, 248, 230, 0.95), 0 0 30px rgba(255, 248, 230, 0.8); }
.g-gut-coin.gc-bright .gc-cap .gk-user { color: #3a1606; }
.g-gut-coin.gc-bright .gc-pop { color: #7a3e00; text-shadow: 0 1px 0 #fff, 0 0 12px rgba(255, 250, 235, 0.95); }
.g-gut-coin.gc-bright .gc-pop.soft { color: #5a2a06; }
.g-gut-coin.gc-duo .gk-char .gk-bubble { max-width: min(280px, calc(100cqw - var(--sz) * 2 - 58px)); }
@keyframes gut-coin-pop { 0% { opacity: 0; transform: translate(-50%, -30%) scale(0.7); } 18% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); } 72% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -120%); } }
@keyframes gut-coin-card { from { opacity: 0; transform: translate(-50%, 20px) scale(0.94); } to { opacity: 1; transform: translateX(-50%); } }
@container (min-width: 700px) {
  .g-gut-coin .gc-panel { left: 50%; right: auto; width: 600px; transform: translateX(-50%); }
  .g-gut-coin .gc-panel.off { transform: translate(-50%, calc(100% + 30px)); }
  .g-gut-coin .gc-cap { font-size: 22px; }
  .g-gut-coin .gc-cap .gk-user { font-size: 30px; }
  .g-gut-coin .gc-card { width: 420px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      const an = ctx.analysis || {};
      const inten = ctx.intensity, line = (o) => ctx.line(o), visits = K.visits();
      const care = an.safety === 'care';
      const clamp = K.clamp, now = () => performance.now();
      const MINT = K.dailyPick(MINTS, 5), MET = METALS[MINT.metal];
      const ROUNDS_MAX = [2, 2, 3][inten];
      const CATCH = [{ clean: 0.09, ok: 0.22 }, { clean: 0.07, ok: 0.17 }, { clean: 0.055, ok: 0.13 }][inten];
      const DESCENT = [0.55, 0.68, 0.82][inten];
      const BETA = 0.36, CB = Math.cos(BETA), SB = Math.sin(BETA);
      const TO_CAM = [0, SB, -CB], LIGHT = norm3([-0.35, 0.8, -0.5]);

      /* ---------------- the two options (their words when we can find them; never invented) ---------------- */
      const capW = (s) => { s = String(s || '').trim(); return s ? s[0].toUpperCase() + s.slice(1) : s; };
      const TAIL = /^(my|the|a|an|to|of|and|or|for|with|in|on|at|your|our|their|his|her|its|this|that|some|more|about|from|so|but)$/i;
      function tidy(s) {
        s = K.clean(s || '', 80).replace(/^(to|i|i'd|i’d|i will|i'll|i’ll|just|maybe|either)\s+/i, '').replace(/[.?!,;:"“”]+$/, '').trim();
        const w = [];
        for (const word of s.split(/\s+/).filter(Boolean)) { if (w.length >= 5 || (w.concat(word).join(' ')).length > 26) break; w.push(word); }
        while (w.length > 1 && TAIL.test(w[w.length - 1])) w.pop();
        return w.join(' ');
      }
      function derive(text) {
        const t = K.clean(text || '', 400);
        if (!t) return null;
        const pats = [
          /\bbetween\s+(.{2,40}?)\s+(?:and|or)\s+(.{2,40}?)(?=[.?!,;]|$)/i,
          /\bwhether\s+(?:to\s+|i\s+should\s+|i\s+)?(.{2,40}?)\s+or\s+(.{0,40}?)(?=[.?!,;]|$)/i,
          /\b(?:should|do|shall|can|could)\s+i\s+(.{2,40}?)\s+or\s+(.{0,40}?)(?=[.?!,;]|$)/i,
          /\b(?:take|choose|pick|go\s+with)\s+(.{2,30}?)\s+or\s+(.{2,30}?)(?=[.?!,;]|$)/i,
          /([^.?!,]{2,40}?)\s+or\s+([^.?!,]{2,40}?)\?/i
        ];
        for (const re of pats) {
          const m = re.exec(t); if (!m) continue;
          let a = tidy(m[1]), b = tidy(m[2]);
          if (!b || /^not$/i.test(b)) { const short = a.split(/\s+/).length <= 3; b = /^(be|go|stay|do|say|tell|quit|leave|move|take|text|call|buy|ask|apply|keep)\b/i.test(a) ? (short ? 'Don’t ' + a.toLowerCase() : 'Don’t') : (short ? 'Not ' + a.toLowerCase() : 'Not'); }
          if (a && b && a.toLowerCase() !== b.toLowerCase() && a.split(/\s+/).length <= 5) return [capW(a), capW(b)];
        }
        return null;
      }
      const own = derive(ctx.text);
      const PAIRLIST = (own ? [own] : []).concat(PAIRS).slice(0, 4);

      /* ---------------- state ---------------- */
      const G = { phase: 'intro', A: '', B: '', stamped: [false, false], rounds: [], round: 0, hope: -1, ts: 1, tsT: 1, wantReflip: null, finished: false, gut: -1, flash: 0, dim: 0, dimT: 0, rays: 0, raysT: null, medal: null, lastNow: 0, drawn: 0 };
      const lab = (i) => (i === 0 ? G.A : i === 1 ? G.B : '');
      const setPhase = (p) => { G.phase = p; ctx.track('phase', { p }); };
      const CAM = { w: 390, h: 844, baseY: 540, camY: 0, camYT: 0, zoom: 1, zoomT: 1, shake: 0, ox: 0, oy: 0, top: 200, panelTop: 640 };
      let phone = true, R = 74, GRAV = 2600;

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: 1.5 });
      const zone = h('div', { class: 'gc-zone', role: 'button', tabindex: '0', 'aria-label': 'The coin. Flick it upward to toss it.', hidden: true });
      const tapz = h('div', { class: 'gc-tap', 'aria-hidden': 'true', hidden: true });
      const cap = h('div', { class: 'gc-cap', 'aria-live': 'polite' });
      const panel = h('div', { class: 'gc-panel off', role: 'group', 'aria-label': 'Gut Coin controls' });
      el.append(tapz, zone, cap, panel);
      const glitch = K.character('glitch', { side: 'right', mood: care ? 'calm' : 'smug', x: 10, y: 64 });
      const patch = K.character('patch', { side: 'left', mood: 'happy', x: 300, y: 64 });
      patch.show(false);
      const say = (c, text, o) => { (c === glitch ? patch : glitch).hush(); return c.say(text, o); };

      /* ---------------- audio: a slow velvet-noir swing, and a metal coin you can hear ---------------- */
      const amb = K.ambience('room'); amb.level(0.2, 2);
      const MZ = { next: 0, i: 0, bpm: 72, vol: 0.85, duck: 1, duckT: 1, live: false };
      const PROG = [['D2', ['F3', 'A3', 'C4', 'E4']], ['G1', ['F3', 'B3', 'D4']], ['C2', ['E3', 'G3', 'B3', 'D4']], ['A1', ['C#3', 'G3', 'B3', 'E4']]];
      K.loop((dt) => {
        if (!A.ctx) return;
        if (!MZ.live) { MZ.live = true; MZ.next = A.now() + 0.15; }
        MZ.duck += (MZ.duckT - MZ.duck) * Math.min(1, dt * 2.5);
        const spb = 60 / MZ.bpm, ahead = A.now() + 0.25;
        while (MZ.next < ahead) {
          const t = MZ.next, i = MZ.i, b = i % 4, pr = PROG[Math.floor(i / 4) % PROG.length], v = MZ.vol * MZ.duck;
          if (v > 0.03) {
            const root = A.note(pr[0]), walk = [1, 1.26, 1.5, 1.68][b];
            A.pluck(root * walk, { when: t, vol: 0.24 * v, damp: 0.991, lp: 520, bus: 'music' });
            if (b === 0 || b === 2) pr[1].forEach((n, k) => A.tone({ when: t + k * 0.02, type: 'sine', freq: A.note(n) * 2, dur: spb * 1.7, vol: 0.016 * v, attack: 0.01, lp: 2400, verb: 0.45, bus: 'music' }));
            if (b === 1 || b === 3) A.brush(t, 0.05 * v, 0.2);
            A.noise({ when: t + spb * 0.66, filter: 'highpass', freq: 8200, dur: 0.06, attack: 0.008, vol: 0.012 * v, bus: 'music' });
            if (i % 8 === 6) A.chime(A.note(pr[1][(i >> 3) % pr[1].length]) * 4, { when: t + spb * 0.5, vol: 0.016 * v, dur: 1.4, verb: 0.5, bus: 'music' });
          }
          MZ.i++; MZ.next += spb;
        }
      });
      const sync = (n) => { if (A.ctx) A.sync(n, now()); };
      function sTing(p) { if (!A.ctx) return; const f = 2400 * (p || 1); [[1, 0.07, 1.2], [2.71, 0.03, 0.6], [5.12, 0.015, 0.3]].forEach(([m, v, d]) => A.tone({ type: 'sine', freq: f * m, dur: d, vol: v, attack: 0.002, verb: 0.4 })); sync('ting'); }
      function sChunk() { if (!A.ctx) return; A.thud({ vol: 0.42 }); A.noise({ filter: 'bandpass', freq: 1800, q: 1.4, dur: 0.12, vol: 0.2 }); A.tone({ type: 'square', freq: 120, to: 60, glide: 0.08, dur: 0.14, vol: 0.06, lp: 900 }); sTing(0.8); sync('chunk'); }
      function sWhoosh(up) { if (A.ctx) A.whoosh({ from: up ? 300 : 1800, to: up ? 2600 : 300, dur: 0.45, vol: 0.11 }); }
      function sSlap() { if (!A.ctx) return; A.noise({ filter: 'lowpass', freq: 700, dur: 0.1, vol: 0.25 }); A.tone({ type: 'sine', freq: 180, to: 80, glide: 0.06, dur: 0.12, vol: 0.18 }); sTing(1.1); sync('slap'); }
      function sClink(p) { if (!A.ctx) return; A.tone({ type: 'triangle', freq: 3100 * p, dur: 0.07, vol: 0.06, attack: 0.001 }); A.tone({ type: 'sine', freq: 5200 * p, dur: 0.05, vol: 0.03, attack: 0.001 }); sync('clink'); }
      function sReveal() { if (!A.ctx) return; ['A4', 'D5', 'F#5', 'A5'].forEach((n, i) => A.chime(A.note(n), { when: A.now() + i * 0.07, vol: 0.06, dur: 1.6 })); sync('reveal'); }
      let spinVoice = null;
      S.onDestroy(() => { if (spinVoice) spinVoice.stop(); });

      /* ---------------- tiny 3D helpers ---------------- */
      function norm3(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
      const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      const rotX = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; };
      const rotY = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; };
      function rotAxis(v, k, a) { const c = Math.cos(a), s = Math.sin(a), d = dot3(k, v), cr = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]]; return [v[0] * c + cr[0] * s + k[0] * d * (1 - c), v[1] * c + cr[1] * s + k[1] * d * (1 - c), v[2] * c + cr[2] * s + k[2] * d * (1 - c)]; }
      const sxW = (X) => CAM.w / 2 + X * CAM.zoom + CAM.ox;
      const syW = (Y, Z) => CAM.baseY - ((Y - CAM.camY) * CB + (Z || 0) * SB) * CAM.zoom + CAM.oy;
      const pdir = (v) => [v[0] * CAM.zoom, -(v[1] * CB + v[2] * SB) * CAM.zoom];

      /* ---------------- the coin ---------------- */
      // pose: position (X, Y, Z) and an orientation (u: right in the face, v: up in the face, n: out of the heads face)
      const C = { X: 0, Y: 0, Z: 0, vx: 0, vy: 0, phi: 0, om: 0, yaw: 0, yawV: 0, mode: 'rest', u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, -1], heat: 0, glow: 0, sq: 0, tilt: 0, prec: 0, precV: 0, spin: 0, up: 1, hops: 0, shine: -1 };
      const wrapPI = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
      function poseFlip() {
        let u = [1, 0, 0], v = [0, 1, 0], n = [0, 0, -1];
        u = rotX(u, C.phi); v = rotX(v, C.phi); n = rotX(n, C.phi);
        if (C.yaw) { u = rotY(u, C.yaw); v = rotY(v, C.yaw); n = rotY(n, C.yaw); }
        C.u = u; C.v = v; C.n = n;
      }
      function poseLying() { // flat on the cushion, heads (up = 1) or tails (up = -1) facing up, tilted about a turning axis
        let u = [1, 0, 0], v = [0, 0, 1], n = [0, 1, 0];
        if (C.up < 0) { v = [0, 0, -1]; n = [0, -1, 0]; }
        u = rotY(u, C.spin); v = rotY(v, C.spin); n = rotY(n, C.spin);
        if (C.tilt > 0.0005) { const k = [Math.cos(C.prec), 0, Math.sin(C.prec)]; u = rotAxis(u, k, C.tilt); v = rotAxis(v, k, C.tilt); n = rotAxis(n, k, C.tilt); }
        C.u = u; C.v = v; C.n = n;
      }
      // height of the coin's centre when its lowest point touches the cushion, for a flip angle phi (0 = standing on its edge)
      const contactY = (phi) => R * Math.abs(Math.cos(phi)) + R * 0.055 * Math.abs(Math.sin(phi));
      const FLAT = () => R * 0.07;

      /* ---------------- painted sprites: coin faces, medal, cushion, press ---------------- */
      const SPR = { heads: null, tails: null, medal: null, cushion: null, press: null, bg: null, vig: null };
      let fontsOk = false;
      function emblem(g, kind) { // unit-ish paths centred on (0,0); filled with the current fillStyle
        g.beginPath();
        if (kind === 'owl') {
          g.ellipse(0, 0.12, 0.5, 0.62, 0, 0, TAU); g.moveTo(-0.46, -0.3); g.lineTo(-0.3, -0.7); g.lineTo(-0.12, -0.42); g.moveTo(0.46, -0.3); g.lineTo(0.3, -0.7); g.lineTo(0.12, -0.42); g.fill();
          g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(-0.2, -0.12, 0.16, 0, TAU); g.arc(0.2, -0.12, 0.16, 0, TAU); g.fill(); g.restore();
          g.beginPath(); g.arc(-0.2, -0.12, 0.07, 0, TAU); g.arc(0.2, -0.12, 0.07, 0, TAU); g.moveTo(0, 0.02); g.lineTo(-0.06, 0.12); g.lineTo(0.06, 0.12); g.closePath(); g.fill();
          g.fillRect(-0.6, 0.72, 1.2, 0.07);
        } else if (kind === 'roo') {
          const pts = [[-0.62, 0.62], [-0.2, 0.5], [0.05, 0.18], [0.1, -0.2], [0.22, -0.45], [0.32, -0.62], [0.38, -0.78], [0.44, -0.62], [0.52, -0.55], [0.5, -0.45], [0.38, -0.38], [0.34, -0.2], [0.42, -0.05], [0.3, 0.0], [0.28, 0.2], [0.38, 0.5], [0.62, 0.62], [0.2, 0.62], [0.05, 0.5], [-0.1, 0.55]];
          g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fill();
        } else if (kind === 'crane') {
          g.moveTo(-0.7, -0.1); g.quadraticCurveTo(-0.3, -0.55, 0.05, -0.05); g.quadraticCurveTo(0.3, -0.6, 0.72, -0.2); g.quadraticCurveTo(0.3, -0.25, 0.1, 0.12); g.lineTo(0.28, 0.5); g.lineTo(0.22, 0.52); g.lineTo(0.02, 0.18); g.lineTo(-0.1, 0.2); g.quadraticCurveTo(-0.3, -0.2, -0.7, -0.1); g.fill();
          g.beginPath(); g.moveTo(0.02, 0.0); g.quadraticCurveTo(0.08, -0.4, -0.06, -0.62); g.lineTo(0.0, -0.66); g.quadraticCurveTo(0.16, -0.4, 0.1, 0.0); g.fill(); g.beginPath(); g.arc(-0.03, -0.66, 0.06, 0, TAU); g.fill();
        } else if (kind === 'lion') {   // a lion's head: scalloped mane, round ears, muzzle
          for (let i = 0; i < 13; i++) { const a = i / 13 * TAU; g.moveTo(Math.cos(a) * 0.6 + 0.17, Math.sin(a) * 0.62 + 0.04); g.arc(Math.cos(a) * 0.6, Math.sin(a) * 0.62 + 0.04, 0.17, 0, TAU); }
          g.fill(); g.beginPath(); g.arc(0, 0.04, 0.6, 0, TAU); g.fill();
          g.save(); g.globalCompositeOperation = 'destination-out'; g.lineWidth = 0.05; g.beginPath(); g.arc(0, 0.06, 0.43, 0, TAU); g.stroke(); g.restore();
          g.beginPath(); g.arc(-0.27, -0.27, 0.09, 0, TAU); g.arc(0.27, -0.27, 0.09, 0, TAU); g.fill();
          g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.ellipse(-0.15, -0.04, 0.055, 0.075, 0, 0, TAU); g.ellipse(0.15, -0.04, 0.055, 0.075, 0, 0, TAU); g.moveTo(-0.09, 0.1); g.lineTo(0.09, 0.1); g.lineTo(0, 0.19); g.closePath(); g.fill();
          g.lineWidth = 0.035; g.beginPath(); g.moveTo(0, 0.19); g.lineTo(0, 0.25); g.moveTo(-0.13, 0.27); g.quadraticCurveTo(-0.05, 0.33, 0, 0.25); g.quadraticCurveTo(0.05, 0.33, 0.13, 0.27); g.stroke(); g.restore();
        } else if (kind === 'sun') {
          for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.moveTo(Math.cos(a - 0.13) * 0.42, Math.sin(a - 0.13) * 0.42); g.lineTo(Math.cos(a) * 0.78, Math.sin(a) * 0.78); g.lineTo(Math.cos(a + 0.13) * 0.42, Math.sin(a + 0.13) * 0.42); }
          g.fill(); g.beginPath(); g.arc(0, 0, 0.38, 0, TAU); g.fill();
          g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(-0.13, -0.06, 0.05, 0, TAU); g.arc(0.13, -0.06, 0.05, 0, TAU); g.fill(); g.lineWidth = 0.045; g.beginPath(); g.arc(0, 0.04, 0.17, 0.3, Math.PI - 0.3); g.stroke(); g.restore();
        } else if (kind === 'moon') {
          g.arc(0, 0, 0.6, 0, TAU); g.fill();
          g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(0.24, -0.14, 0.52, 0, TAU); g.fill(); g.restore();
          [[0.42, 0.34, 0.12], [0.6, -0.42, 0.09], [0.2, 0.62, 0.07]].forEach(([x, y, r]) => { K.starPath(g, x, y, r, r * 0.42, 5, 0); g.fill(); });
        } else if (kind === 'maple') {
          const pts = [[0, -0.78], [0.12, -0.5], [0.28, -0.58], [0.24, -0.26], [0.56, -0.38], [0.48, -0.16], [0.72, -0.02], [0.4, 0.1], [0.46, 0.3], [0.12, 0.22], [0.08, 0.5], [0.04, 0.5], [0.04, 0.78], [-0.04, 0.78], [-0.04, 0.5], [-0.08, 0.5], [-0.12, 0.22], [-0.46, 0.3], [-0.4, 0.1], [-0.72, -0.02], [-0.48, -0.16], [-0.56, -0.38], [-0.24, -0.26], [-0.28, -0.58], [-0.12, -0.5]];
          g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fill();
        } else if (kind === 'ship') {
          g.moveTo(-0.66, 0.3); g.lineTo(0.66, 0.3); g.lineTo(0.48, 0.56); g.lineTo(-0.5, 0.56); g.closePath(); g.fill();
          g.beginPath(); g.moveTo(-0.04, 0.28); g.lineTo(-0.04, -0.72); g.lineTo(0.04, -0.72); g.lineTo(0.04, 0.28); g.fill();
          g.beginPath(); g.moveTo(-0.08, -0.62); g.quadraticCurveTo(-0.5, -0.2, -0.56, 0.2); g.lineTo(-0.08, 0.2); g.closePath(); g.moveTo(0.08, -0.5); g.quadraticCurveTo(0.44, -0.12, 0.48, 0.2); g.lineTo(0.08, 0.2); g.closePath(); g.fill();
          g.beginPath(); for (let x = -0.7; x <= 0.7; x += 0.02) g.lineTo(x, 0.66 + Math.sin(x * 14) * 0.03); g.lineTo(0.7, 0.72); g.lineTo(-0.7, 0.72); g.closePath(); g.fill();
        } else if (kind === 'olive' || kind === 'laurel' || kind === 'wreath') {
          for (const side of [-1, 1]) for (let i = 0; i < (kind === 'wreath' ? 6 : 7); i++) { const a = Math.PI / 2 + side * (0.35 + i * 0.32), x = Math.cos(a) * 0.62, y = Math.sin(a) * 0.62; g.save(); g.translate(x, y); g.rotate(a + side * 0.9); g.beginPath(); g.ellipse(0, 0, 0.16, 0.06, 0, 0, TAU); g.fill(); g.restore(); }
          if (kind === 'olive') { g.beginPath(); g.arc(-0.1, 0.62, 0.06, 0, TAU); g.arc(0.1, 0.62, 0.06, 0, TAU); g.fill(); } else if (kind === 'laurel') { K.starPath(g, 0, -0.6, 0.14, 0.06, 5, 0); g.fill(); }
        } else if (kind === 'stars') {
          [[0, -0.5, 0.2], [-0.42, -0.06, 0.16], [0.42, 0.0, 0.16], [0.02, 0.42, 0.18], [0.16, 0.06, 0.08]].forEach(([x, y, r]) => { K.starPath(g, x, y, r, r * 0.45, 7, 0); g.fill(); });
        } else if (kind === 'waves') {
          for (let r = 0; r < 3; r++) { g.beginPath(); for (let x = -0.68; x <= 0.68; x += 0.02) g.lineTo(x, -0.3 + r * 0.32 + Math.sin(x * 9 + r) * 0.08); g.lineTo(0.68, -0.2 + r * 0.32); g.lineTo(-0.68, -0.2 + r * 0.32); g.closePath(); g.fill(); }
        } else if (kind === 'crown') {
          g.moveTo(-0.6, 0.3); g.lineTo(-0.66, -0.38); g.lineTo(-0.32, -0.08); g.lineTo(0, -0.56); g.lineTo(0.32, -0.08); g.lineTo(0.66, -0.38); g.lineTo(0.6, 0.3); g.closePath(); g.fill(); g.fillRect(-0.62, 0.36, 1.24, 0.14);
        } else if (kind === 'anchor') {
          g.arc(0, -0.56, 0.12, 0, TAU); g.fill(); g.fillRect(-0.05, -0.46, 0.1, 1.0); g.fillRect(-0.32, -0.28, 0.64, 0.08);
          g.beginPath(); g.lineWidth = 0.1; g.arc(0, 0.12, 0.42, 0.25, Math.PI - 0.25); g.stroke();
        }
      }
      function emblemSprite(kind, size, colour) { // its own canvas, so the cut-outs (eyes, crescent) never punch through the coin
        const c = document.createElement('canvas'); c.width = c.height = size;
        const g = c.getContext('2d'); g.translate(size / 2, size / 2); g.scale(size / 2, size / 2);
        g.fillStyle = colour; g.strokeStyle = colour; emblem(g, kind);
        return c;
      }
      function emboss(g, kind, x, y, s, col) {
        const size = Math.max(16, Math.ceil(s * 2));
        g.drawImage(emblemSprite(kind, size, col.deep), x - s + 0.025 * s, y - s + 0.03 * s, s * 2, s * 2);
        g.drawImage(emblemSprite(kind, size, col.hi), x - s - 0.018 * s, y - s - 0.02 * s, s * 2, s * 2);
        g.drawImage(emblemSprite(kind, size, col.lo), x - s, y - s, s * 2, s * 2);
      }
      function fitLines(g, text, maxW, size, minSize) {
        const words = String(text || '').toUpperCase().split(/\s+/).filter(Boolean);
        for (let fs = size; fs >= minSize; fs -= 1) {
          g.font = '800 ' + fs + 'px Cinzel, "Trajan Pro", Georgia, serif';
          if (g.measureText(words.join(' ')).width <= maxW) return { fs, lines: [words.join(' ')] };
          for (let k = 1; k < words.length; k++) { const a = words.slice(0, k).join(' '), b = words.slice(k).join(' '); if (g.measureText(a).width <= maxW && g.measureText(b).width <= maxW) return { fs, lines: [a, b] }; }
        }
        g.font = '800 ' + minSize + 'px Cinzel, Georgia, serif';
        return { fs: minSize, lines: [words.join(' ')] };
      }
      function paintFace(which, label) {
        const S2 = 360, c = document.createElement('canvas'); c.width = S2; c.height = S2;
        const g = c.getContext('2d'), r = S2 / 2; g.translate(r, r);
        const rg = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
        rg.addColorStop(0, MET.hi); rg.addColorStop(0.45, MET.mid); rg.addColorStop(1, MET.lo);
        g.fillStyle = rg; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
        g.lineWidth = r * 0.05; g.strokeStyle = MET.deep; g.beginPath(); g.arc(0, 0, r * 0.86, 0, TAU); g.stroke();
        g.lineWidth = r * 0.02; g.strokeStyle = MET.hi; g.beginPath(); g.arc(0, 0, r * 0.83, 0, TAU); g.stroke();
        for (let i = 0; i < 60; i++) { const a = i / 60 * TAU; g.fillStyle = i % 2 ? MET.hi : MET.lo; g.beginPath(); g.arc(Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93, r * 0.025, 0, TAU); g.fill(); }
        const fg = g.createRadialGradient(r * 0.2, r * 0.25, r * 0.05, 0, 0, r * 0.82); fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,0.16)');
        g.fillStyle = fg; g.beginPath(); g.arc(0, 0, r * 0.82, 0, TAU); g.fill();
        const kind = which === 'heads' ? MINT.front : MINT.back;
        if (!label) emboss(g, kind, 0, 0, r * 0.62, MET);
        else {
          emboss(g, kind, 0, -r * 0.38, r * 0.3, MET);
          const fl = fitLines(g, label, r * 1.34, Math.round(r * 0.22), Math.round(r * 0.12));
          g.textAlign = 'center'; g.textBaseline = 'middle';
          const lh = fl.fs * 1.08, y0 = r * 0.16 - (fl.lines.length - 1) * lh / 2;
          fl.lines.forEach((ln, i) => {
            g.fillStyle = MET.hi; g.fillText(ln, -1.2, y0 + i * lh - 1.4);
            g.fillStyle = MET.deep; g.fillText(ln, 1.6, y0 + i * lh + 1.8);
            g.fillStyle = MET.ink; g.fillText(ln, 0, y0 + i * lh);
          });
          g.strokeStyle = MET.deep; g.lineWidth = r * 0.012; g.globalAlpha = 0.7;
          g.beginPath(); g.moveTo(-r * 0.42, y0 - lh * 0.75); g.lineTo(r * 0.42, y0 - lh * 0.75); g.moveTo(-r * 0.42, y0 + (fl.lines.length - 1) * lh + lh * 0.75); g.lineTo(r * 0.42, y0 + (fl.lines.length - 1) * lh + lh * 0.75); g.stroke(); g.globalAlpha = 1;
          [-1, 1].forEach(sd => { g.fillStyle = MET.lo; K.starPath(g, sd * r * 0.56, r * 0.16, r * 0.05, r * 0.02, 5, 0); g.fill(); });
          for (let k = -2; k <= 2; k++) { g.fillStyle = k ? MET.lo : MET.deep; K.starPath(g, k * r * 0.11, r * 0.6, r * (k ? 0.035 : 0.05), r * (k ? 0.015 : 0.02), 5, 0); g.fill(); }
        }
        return c;
      }
      function paintMedal(label) {
        const S2 = 420, c = document.createElement('canvas'); c.width = S2; c.height = S2;
        const g = c.getContext('2d'), r = S2 / 2; g.translate(r, r);
        const M = METALS.gold;
        for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; g.fillStyle = i % 2 ? '#c99a3a' : '#ffe39a'; g.beginPath(); g.moveTo(Math.cos(a - 0.11) * r * 0.86, Math.sin(a - 0.11) * r * 0.86); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.lineTo(Math.cos(a + 0.11) * r * 0.86, Math.sin(a + 0.11) * r * 0.86); g.fill(); }
        const rg = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 0.86); rg.addColorStop(0, M.hi); rg.addColorStop(0.5, M.mid); rg.addColorStop(1, M.lo);
        g.fillStyle = rg; g.beginPath(); g.arc(0, 0, r * 0.86, 0, TAU); g.fill();
        g.lineWidth = r * 0.03; g.strokeStyle = M.deep; g.beginPath(); g.arc(0, 0, r * 0.74, 0, TAU); g.stroke();
        emboss(g, 'wreath', 0, r * 0.04, r * 0.84, M);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '800 ' + Math.round(r * 0.12) + 'px Cinzel, Georgia, serif';
        const head = care ? 'MY GUT LEANS' : 'MY GUT SAYS';
        g.fillStyle = M.hi; g.fillText(head, -1, -r * 0.39 - 1); g.fillStyle = M.deep; g.fillText(head, 0, -r * 0.39);
        const fl = fitLines(g, label, r * 0.84, Math.round(r * 0.27), Math.round(r * 0.1));
        const lh = fl.fs * 1.06, y0 = r * 0.04 - (fl.lines.length - 1) * lh / 2;
        fl.lines.forEach((ln, i) => { g.fillStyle = M.hi; g.fillText(ln, -1.5, y0 + i * lh - 1.6); g.fillStyle = M.deep; g.fillText(ln, 2, y0 + i * lh + 2); g.fillStyle = M.ink; g.fillText(ln, 0, y0 + i * lh); });
        g.fillStyle = M.lo; K.starPath(g, 0, r * 0.5, r * 0.07, r * 0.03, 5, 0); g.fill();
        return c;
      }
      function paintStatic() {
        const D = K.dark(), w = CAM.w, H = CAM.h, dpr = cv.dpr || 1, tall = H * 1.9;
        const c = document.createElement('canvas'); c.width = Math.round(w * dpr); c.height = Math.round(tall * dpr);
        const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const top = D ? ['#05030d', '#0f0a24', '#1d1438', '#2a1a40'] : ['#e9dcc4', '#f3e8d4', '#efe0c4', '#dcc39c'];
        const gr = g.createLinearGradient(0, 0, 0, tall); top.forEach((col, i) => gr.addColorStop(i / (top.length - 1), col));
        g.fillStyle = gr; g.fillRect(0, 0, w, tall);
        const fold = 26 + (w > 700 ? 14 : 0);
        for (let x = -fold; x < w + fold; x += fold) { const fg = g.createLinearGradient(x, 0, x + fold, 0); fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(0.5, D ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.32)'); fg.addColorStop(1, D ? 'rgba(0,0,0,0.12)' : 'rgba(120,80,40,0.08)'); g.fillStyle = fg; g.fillRect(x, 0, fold, tall); }
        const cx = w / 2, cy = tall - (H - CAM.baseY) - 40;
        g.save(); g.strokeStyle = D ? 'rgba(243,201,105,0.09)' : 'rgba(150,100,30,0.12)'; g.lineWidth = 1.2;
        for (let i = 0; i <= 36; i++) { const a = Math.PI + i / 36 * Math.PI; g.beginPath(); g.moveTo(cx + Math.cos(a) * 90, cy + Math.sin(a) * 90); g.lineTo(cx + Math.cos(a) * tall, cy + Math.sin(a) * tall); g.stroke(); }
        for (let k = 1; k <= 9; k++) { g.beginPath(); g.arc(cx, cy, 90 + k * 70, Math.PI, TAU); g.stroke(); }
        g.restore();
        const R2 = K.rng(K.daily() + 9);
        g.fillStyle = D ? '#ffe7a8' : '#b9873a';
        for (let i = 0; i < 70; i++) { g.globalAlpha = 0.15 + R2() * 0.4; const s = R2() < 0.2 ? 2 : 1.2; g.fillRect(R2() * w, R2() * (tall - H * 0.5), s, s); }
        g.globalAlpha = 1;
        const spot = g.createRadialGradient(cx, cy - 160, 20, cx, cy - 60, Math.max(w, H) * 0.7);
        spot.addColorStop(0, D ? 'rgba(255,214,140,0.22)' : 'rgba(255,250,236,0.55)'); spot.addColorStop(1, 'rgba(255,214,140,0)');
        g.fillStyle = spot; g.fillRect(0, 0, w, tall);
        const floorY = cy + 40;
        const fl = g.createLinearGradient(0, floorY - 30, 0, tall);
        fl.addColorStop(0, 'rgba(0,0,0,0)'); fl.addColorStop(0.15, D ? 'rgba(6,3,14,0.55)' : 'rgba(90,60,30,0.18)'); fl.addColorStop(1, D ? 'rgba(4,2,10,0.85)' : 'rgba(80,50,20,0.35)');
        g.fillStyle = fl; g.fillRect(0, floorY - 30, w, tall - floorY + 30);
        SPR.bg = { c, tall };
        const v = document.createElement('canvas'); v.width = Math.round(w * dpr); v.height = Math.round(H * dpr);
        const vg = v.getContext('2d'); vg.setTransform(dpr, 0, 0, dpr, 0, 0);
        paintDrapes(vg, w, H);
        const rad = vg.createRadialGradient(w / 2, H * 0.48, Math.min(w, H) * 0.32, w / 2, H * 0.5, Math.max(w, H) * 0.8);
        rad.addColorStop(0, 'rgba(0,0,0,0)'); rad.addColorStop(1, D ? 'rgba(2,0,8,0.62)' : 'rgba(70,40,10,0.28)');
        vg.fillStyle = rad; vg.fillRect(0, 0, w, H); SPR.vig = v;
        // the velvet cushion with its brass ring (drawn per frame from this sprite)
        const cw = R * 3.4, chh = R * 1.3, cs = document.createElement('canvas'); cs.width = Math.round(cw * 2 * dpr); cs.height = Math.round(chh * 2 * dpr);
        const cg = cs.getContext('2d'); cg.setTransform(dpr, 0, 0, dpr, 0, 0); cg.translate(cw, chh);
        const fc = FELTS[MINT.felt];
        cg.fillStyle = 'rgba(0,0,0,0.35)'; cg.beginPath(); cg.ellipse(0, chh * 0.42, cw * 0.98, chh * 0.42, 0, 0, TAU); cg.fill();
        const br = cg.createLinearGradient(-cw, 0, cw, 0); br.addColorStop(0, '#6e4a10'); br.addColorStop(0.35, '#ffe39a'); br.addColorStop(0.6, '#c99a3a'); br.addColorStop(1, '#5a3a08');
        cg.fillStyle = br; cg.beginPath(); cg.ellipse(0, chh * 0.18, cw * 0.92, chh * 0.38, 0, 0, TAU); cg.fill();
        const vel = cg.createRadialGradient(-cw * 0.2, -chh * 0.2, 4, 0, 0, cw * 0.86); vel.addColorStop(0, fc[0]); vel.addColorStop(1, fc[1]);
        cg.fillStyle = vel; cg.beginPath(); cg.ellipse(0, 0, cw * 0.84, chh * 0.34, 0, 0, TAU); cg.fill();
        cg.strokeStyle = 'rgba(255,231,168,0.55)'; cg.lineWidth = 2; cg.beginPath(); cg.ellipse(0, 0, cw * 0.84, chh * 0.34, 0, 0, TAU); cg.stroke();
        cg.strokeStyle = 'rgba(255,255,255,0.12)'; cg.lineWidth = 1; for (let k = 1; k < 4; k++) { cg.beginPath(); cg.ellipse(0, 0, cw * 0.84 * k / 4, chh * 0.34 * k / 4, 0, 0, TAU); cg.stroke(); }
        SPR.cushion = { c: cs, w: cw, h: chh };
      }
      function paintDrapes(vg, w, H) { // velvet stage drapes in today's colour, tied back with gold rope
        const fc = FELTS[MINT.felt], dw = Math.round(clamp(w * 0.125, 44, 118)), tieY = H * (w < 700 ? 0.42 : 0.47), tieW = dw * 0.4, botW = dw * 0.9;
        const edgePath = (t) => { vg.moveTo(dw * t, -2); vg.bezierCurveTo(dw * t * 0.98, tieY * 0.55, tieW * 1.5 * t, tieY * 0.85, tieW * t, tieY); vg.bezierCurveTo(tieW * 1.25 * t, tieY + H * 0.08, botW * 0.95 * t, H * 0.78, botW * t, H + 2); };
        for (const side of [-1, 1]) {
          vg.save();
          if (side > 0) { vg.translate(w, 0); vg.scale(-1, 1); }
          vg.beginPath(); vg.moveTo(-2, -2); edgePath(1); vg.lineTo(-2, H + 2); vg.closePath();
          const base = vg.createLinearGradient(0, 0, dw, 0); base.addColorStop(0, fc[1]); base.addColorStop(0.55, fc[0]); base.addColorStop(1, fc[1]);
          vg.fillStyle = base; vg.fill();
          vg.save(); vg.clip();
          for (let i = 1; i <= 5; i++) { vg.beginPath(); edgePath(i / 6); vg.strokeStyle = i % 2 ? 'rgba(255,232,214,0.14)' : 'rgba(0,0,0,0.3)'; vg.lineWidth = Math.max(3, dw * 0.12); vg.stroke(); }
          const sh = vg.createLinearGradient(0, 0, 0, H); sh.addColorStop(0, 'rgba(0,0,0,0.38)'); sh.addColorStop(0.42, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.32)');
          vg.fillStyle = sh; vg.fillRect(-2, -2, dw + 6, H + 4);
          vg.restore();
          vg.beginPath(); edgePath(1); vg.strokeStyle = 'rgba(243,201,105,0.6)'; vg.lineWidth = 1.5; vg.stroke();
          // tie-back rope and tassel
          vg.lineCap = 'round';
          vg.strokeStyle = '#6e4a10'; vg.lineWidth = 5; vg.beginPath(); vg.moveTo(-2, tieY - 10); vg.quadraticCurveTo(tieW * 0.7, tieY + 9, tieW + 3, tieY - 1); vg.stroke();
          vg.strokeStyle = '#f3c969'; vg.lineWidth = 3; vg.beginPath(); vg.moveTo(-2, tieY - 11); vg.quadraticCurveTo(tieW * 0.7, tieY + 8, tieW + 3, tieY - 2); vg.stroke();
          const tx = tieW * 0.78, ty = tieY + 5;
          vg.fillStyle = '#f3c969'; vg.beginPath(); vg.arc(tx, ty + 4, 4, 0, TAU); vg.fill();
          vg.strokeStyle = '#d9a442'; vg.lineWidth = 1.2; for (let k = -3; k <= 3; k++) { vg.beginPath(); vg.moveTo(tx + k * 1.2, ty + 7); vg.lineTo(tx + k * 1.9, ty + 22); vg.stroke(); }
          vg.restore();
        }
      }
      function miniCoin(m, owned) { // a small struck coin for the collection tray
        const c = document.createElement('canvas'); c.width = c.height = 56;
        const g = c.getContext('2d'), M = METALS[m.metal], r = 28;
        const rg = g.createRadialGradient(r - 8, r - 9, 2, r, r, r);
        rg.addColorStop(0, owned ? M.hi : '#6b6478'); rg.addColorStop(0.5, owned ? M.mid : '#4a4458'); rg.addColorStop(1, owned ? M.lo : '#2f2a3a');
        g.fillStyle = rg; g.beginPath(); g.arc(r, r, r - 1, 0, TAU); g.fill();
        g.strokeStyle = owned ? M.deep : '#25202e'; g.lineWidth = 2.5; g.beginPath(); g.arc(r, r, r - 5, 0, TAU); g.stroke();
        if (owned) emboss(g, m.front, r, r, r * 0.6, M);
        else { g.fillStyle = 'rgba(255,255,255,0.25)'; g.font = '700 22px Cinzel, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', r, r + 1); }
        c.setAttribute('aria-hidden', 'true');
        return c;
      }
      function paintFaces() { SPR.heads = paintFace('heads', G.stamped[0] ? G.A : ''); SPR.tails = paintFace('tails', G.stamped[1] ? G.B : ''); }

      /* ---------------- layout ---------------- */
      function placeChars() {
        const sz = phone ? 72 : 100;
        glitch.el.style.setProperty('--sz', sz + 'px'); patch.el.style.setProperty('--sz', sz + 'px');
        glitch.place(phone ? 10 : 26, phone ? 64 : 74); patch.place(CAM.w - sz - (phone ? 10 : 26), phone ? 64 : 74);
      }
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        phone = w < 700; CAM.w = w; CAM.h = H;
        R = phone ? Math.round(Math.min(78, w * 0.2)) : Math.round(clamp(H * 0.13, 92, 124));
        GRAV = phone ? 2500 : 2700;
        CAM.baseY = Math.round(H * (phone ? 0.655 : 0.66));
        CAM.top = phone ? 196 : 190;
        Object.assign(zone.style, { width: Math.round(R * 2.7) + 'px', height: Math.round(R * 3.1) + 'px', margin: Math.round(-R * 1.6) + 'px 0 0 ' + Math.round(-R * 1.35) + 'px' });
        placeChars();
        paintStatic(); paintFaces();
        if (G.medalLabel) SPR.medal = paintMedal(G.medalLabel);
        if (C.mode === 'rest') { C.Y = restY(); }
        G.bgKey = '';
      }
      const restY = () => R * 1.02;

      /* ---------------- rendering ---------------- */
      const P = K.particles({ max: 500 });
      function drawBackground(g) {
        const w = CAM.w, H = CAM.h, bg = SPR.bg; if (!bg) return;
        const par = clamp(CAM.camY * 0.35, 0, bg.tall - H), y = -(bg.tall - H) + par;
        g.drawImage(bg.c, 0, y, w, bg.tall);
      }
      function drawCushion(g) {
        const cs = SPR.cushion; if (!cs) return;
        const x = sxW(0), y = syW(0, 0), k = CAM.zoom;
        g.drawImage(cs.c, x - cs.w * k, y - cs.h * k, cs.w * 2 * k, cs.h * 2 * k);
      }
      function drawShadow(g) {
        const hgt = Math.max(0, C.Y - restY()), k = 1 / (1 + hgt / 380), x = sxW(C.X), y = syW(0, 0);
        g.fillStyle = 'rgba(0,0,0,' + (0.35 * k).toFixed(3) + ')'; g.beginPath(); g.ellipse(x, y + 2, R * 1.05 * k * CAM.zoom, R * 0.3 * k * CAM.zoom, 0, 0, TAU); g.fill();
      }
      function drawPress(g) {
        const pr = G.press; if (!pr || pr.y <= -0.99) return;
        const x = sxW(0), dpr = cv.dpr || 1; void dpr;
        const bottom = syW(pr.y, 0), w2 = R * 0.95 * CAM.zoom;
        const colTop = -20;
        const colG = g.createLinearGradient(x - w2 * 0.35, 0, x + w2 * 0.35, 0); colG.addColorStop(0, '#5a3a08'); colG.addColorStop(0.4, '#e9c25e'); colG.addColorStop(1, '#5a3a08');
        g.fillStyle = colG; g.fillRect(x - w2 * 0.3, colTop, w2 * 0.6, bottom - colTop - w2 * 0.9);
        for (let yy = colTop + 6; yy < bottom - w2 * 0.9; yy += 10) { g.fillStyle = 'rgba(40,20,0,0.35)'; g.fillRect(x - w2 * 0.3, yy, w2 * 0.6, 3); }
        const ramG = g.createLinearGradient(x - w2, 0, x + w2, 0); ramG.addColorStop(0, '#4a2e08'); ramG.addColorStop(0.3, '#d9a43a'); ramG.addColorStop(0.45, '#fff0b3'); ramG.addColorStop(0.65, '#c48a24'); ramG.addColorStop(1, '#4a2e08');
        g.fillStyle = ramG; g.beginPath(); g.moveTo(x - w2 * 0.55, bottom - w2 * 0.95); g.lineTo(x + w2 * 0.55, bottom - w2 * 0.95); g.lineTo(x + w2, bottom - w2 * 0.25); g.lineTo(x + w2, bottom); g.lineTo(x - w2, bottom); g.lineTo(x - w2, bottom - w2 * 0.25); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(30,14,0,0.6)'; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = 'rgba(255,240,200,0.5)'; g.fillRect(x - w2, bottom - w2 * 0.27, w2 * 2, 2);
        g.fillStyle = '#3a2406'; g.beginPath(); g.ellipse(x, bottom, w2, w2 * 0.22, 0, 0, Math.PI); g.fill();
      }
      function drawCoin(g, alpha) {
        const dpr = cv.dpr || 1, facing = dot3(C.n, TO_CAM) >= 0;
        const fn = facing ? C.n : [-C.n[0], -C.n[1], -C.n[2]], fv = facing ? C.v : [-C.v[0], -C.v[1], -C.v[2]];
        const pu = pdir(C.u), pv = pdir(fv), th = R * 0.11, sy = 1 - 0.1 * C.sq, sx = 1 + 0.06 * C.sq;
        const cen = (o) => [sxW(C.X + fn[0] * o), syW(C.Y + fn[1] * o, C.Z + fn[2] * o)];
        const e = MET.edge, steps = 5;
        g.globalAlpha = alpha ?? 1;
        for (let k = 0; k <= steps; k++) {
          const c = cen(-th / 2 + th * k / steps), f = 0.5 + 0.35 * k / steps;
          g.setTransform(dpr * pu[0] * R * sx, dpr * pu[1] * R * sy, dpr * pv[0] * R * sx, dpr * pv[1] * R * sy, dpr * c[0], dpr * c[1]);
          g.fillStyle = 'rgb(' + Math.round(e[0] * f) + ',' + Math.round(e[1] * f) + ',' + Math.round(e[2] * f) + ')';
          g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill();
        }
        const c = cen(th / 2);
        g.setTransform(dpr * pu[0] * R * sx, dpr * pu[1] * R * sy, -dpr * pv[0] * R * sx, -dpr * pv[1] * R * sy, dpr * c[0], dpr * c[1]);
        const spr = facing ? SPR.heads : SPR.tails;
        if (spr) g.drawImage(spr, -1, -1, 2, 2);
        const lit = dot3(fn, LIGHT);
        if (lit < 0.55) { g.fillStyle = 'rgba(10,4,0,' + ((0.55 - lit) * 0.55).toFixed(3) + ')'; g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); }
        g.save(); g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.clip();
        g.globalCompositeOperation = 'lighter';
        const band = (fn[1] * 1.6 + fn[0] * 0.8 + C.phi * 0.08) % 2.6 - 1.3;
        const sg = g.createLinearGradient(band - 0.45, -0.22, band + 0.45, 0.22);
        sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,250,230,' + (0.28 * (alpha ?? 1)).toFixed(3) + ')'); sg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = sg; g.fillRect(-1, -1, 2, 2);
        if (C.shine >= 0) { const s2 = C.shine * 3.4 - 1.7, sh = g.createLinearGradient(s2 - 0.24, -0.12, s2 + 0.24, 0.12); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,240,0.5)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(-1, -1, 2, 2); }
        if (C.heat > 0.01) { g.fillStyle = 'rgba(255,' + Math.round(150 + 90 * C.heat) + ',' + Math.round(60 + 120 * C.heat) + ',' + (0.75 * C.heat).toFixed(3) + ')'; g.fillRect(-1, -1, 2, 2); }
        g.restore();
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.globalAlpha = 1;
        if (C.glow > 0.02) { const gx = sxW(C.X), gy = syW(C.Y, C.Z), rr = R * 2.4 * CAM.zoom; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = C.glow * 0.55; g.drawImage(K.glowSprite('rgba(255,214,130,0.9)'), gx - rr, gy - rr, rr * 2, rr * 2); g.restore(); }
      }
      function drawRing(g) {
        const r = G.ring; if (!r) return;
        const x = sxW(0), y = syW(restY(), 0), k = clamp(r.k, 0, 1), rad = R * (1.15 + 2.6 * k) * CAM.zoom;
        const hot = k < 0.12;
        g.save(); g.lineWidth = hot ? 4 : 2.5; g.strokeStyle = hot ? 'rgba(255,236,160,0.95)' : 'rgba(243,201,105,' + (0.35 + 0.4 * (1 - k)).toFixed(3) + ')';
        g.beginPath(); g.ellipse(x, y, rad, rad * 0.98, 0, 0, TAU); g.stroke();
        g.setLineDash([4, 8]); g.strokeStyle = 'rgba(255,236,170,0.45)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, R * 1.12 * CAM.zoom, R * 1.1 * CAM.zoom, 0, 0, TAU); g.stroke();
        g.restore();
      }
      function drawRays(g, t) {
        if (G.rays < 0.01) return;
        const x = sxW(0), y = syW(G.medalY || restY() + 120, 0), n = 18, L = Math.max(CAM.w, CAM.h);
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = G.rays * 0.5; g.translate(x, y); g.rotate(t * 0.12);
        if (!G.rayGrad || G.rayGrad.L !== L) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, L * 0.7); gr.addColorStop(0, 'rgba(255,220,140,0.5)'); gr.addColorStop(1, 'rgba(255,220,140,0)'); G.rayGrad = { L, gr }; }
        g.fillStyle = G.rayGrad.gr; g.beginPath();
        for (let i = 0; i < n; i++) { const a = i / n * TAU, c = Math.cos(a), s2 = Math.sin(a), px = -s2 * L * 0.05, py = c * L * 0.05; g.moveTo(0, 0); g.lineTo(c * L * 0.7 + px, s2 * L * 0.7 + py); g.lineTo(c * L * 0.7 - px, s2 * L * 0.7 - py); g.closePath(); }
        g.fill(); g.restore();
      }
      function drawMelt(g, t) {   // the coin slumps into a glowing pool, then the pool draws itself up into the medal
        const m = G.melt; if (!m) return;
        const k = clamp(m.k, 0, 1), z = CAM.zoom, x = sxW(0), y = syW(0, 0);
        const pool = R * (0.75 + 0.75 * K.ease.outCubic(k)) * z * (m.rise ? 1 - 0.7 * m.rise : 1), ph = pool * SB * 0.95;
        g.save(); g.translate(x, y);
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.65 * (1 - (m.rise || 0) * 0.6);
        g.drawImage(K.glowSprite('rgba(255,150,60,0.9)'), -pool * 1.9, -pool * 1.3, pool * 3.8, pool * 2.2);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        const pg = g.createRadialGradient(-pool * 0.2, -ph * 0.3, 2, 0, 0, pool);
        pg.addColorStop(0, '#fffbe0'); pg.addColorStop(0.35, '#ffd25a'); pg.addColorStop(0.75, '#f08a2a'); pg.addColorStop(1, '#a23a12');
        g.fillStyle = pg; g.beginPath();
        for (let i = 0; i <= 48; i++) { const a = i / 48 * TAU, wob = 1 + Math.sin(a * 6 + t * 5) * 0.035 + Math.sin(a * 3 - t * 3) * 0.03; g.lineTo(Math.cos(a) * pool * wob, Math.sin(a) * ph * wob); }
        g.closePath(); g.fill();
        // the slumping coin: a dome that sinks into the pool
        const dome = (1 - k) * (1 - k) * R * 1.9 * CB * z, dw = R * (1 + 0.1 * k) * z;
        if (dome > 1) {
          const dg = g.createLinearGradient(0, -dome, 0, 0); dg.addColorStop(0, '#fff6c8'); dg.addColorStop(0.5, '#ffbf45'); dg.addColorStop(1, '#e0702a');
          g.fillStyle = dg; g.beginPath(); g.ellipse(0, 0, dw, dome, 0, Math.PI, TAU); g.ellipse(0, 0, dw, dw * SB * 0.9, 0, 0, Math.PI); g.fill();
        }
        g.fillStyle = 'rgba(255,255,240,0.75)'; g.beginPath(); g.ellipse(-pool * 0.28, -ph * 0.32, pool * 0.22, ph * 0.16, -0.15, 0, TAU); g.fill();
        g.restore();
      }
      function drawMedal(g, t) {
        const md = G.medal; if (!md || !SPR.medal) return;
        const k = clamp(md.k, 0, 1), rise = K.ease.outCubic(clamp(k * 1.5, 0, 1));
        const s = R * 1.38 * CAM.zoom * (0.25 + 0.75 * K.ease.outBack(clamp(k * 1.2, 0, 1))), x = sxW(0);
        const y = syW(0, 0) + (syW(G.medalY, 0) - syW(0, 0)) * rise + Math.sin(t * 1.4) * 3 * k;
        const rib = Math.min(1, md.rib || 0);
        if (rib > 0) {
          const fc = FELTS[MINT.felt], len = R * 2.1 * CAM.zoom * K.ease.outCubic(rib);
          [[-1, fc[0], fc[1]], [1, '#f3c969', '#b98a2e']].forEach(([sd, col, dk]) => {
            g.fillStyle = col; g.beginPath(); g.moveTo(x + sd * s * 0.12, y - s * 0.62); g.lineTo(x + sd * s * 0.56, y - s * 0.66); g.lineTo(x + sd * s * 0.8, y - s * 0.62 - len); g.lineTo(x + sd * s * 0.5, y - s * 0.62 - len * 0.86); g.lineTo(x + sd * s * 0.2, y - s * 0.62 - len); g.closePath(); g.fill();
            g.fillStyle = dk; g.globalAlpha = 0.45; g.beginPath(); g.moveTo(x + sd * s * 0.12, y - s * 0.62); g.lineTo(x + sd * s * 0.3, y - s * 0.64); g.lineTo(x + sd * s * 0.42, y - s * 0.62 - len * 0.93); g.lineTo(x + sd * s * 0.2, y - s * 0.62 - len); g.closePath(); g.fill(); g.globalAlpha = 1;
          });
        }
        g.save(); g.translate(x, y); g.rotate(Math.sin(t * 0.9) * 0.04 * k);
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5; g.drawImage(K.glowSprite('rgba(255,220,140,0.9)'), -s * 2, -s * 2, s * 4, s * 4);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.drawImage(SPR.medal, -s, -s, s * 2, s * 2);
        const sh = ((t * 0.35) % 1.6) - 0.3;  // a slow glint across the medal
        if (sh > -0.2 && sh < 1.2) {
          g.save(); g.beginPath(); g.arc(0, 0, s * 0.86, 0, TAU); g.clip(); g.globalCompositeOperation = 'lighter';
          const bx = -s + sh * s * 2, gl = g.createLinearGradient(bx - s * 0.25, -s * 0.12, bx + s * 0.25, s * 0.12);
          gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(0.5, 'rgba(255,250,225,0.5)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gl; g.fillRect(-s, -s, s * 2, s * 2); g.restore();
        }
        g.restore();
      }
      function drawHang(g) { // bullet time: the room dims, the coin keeps its light, and a heartbeat ring pulses out from it
        if (G.dim <= 0.01) return;
        g.fillStyle = K.dark() ? 'rgba(8,4,20,' + (G.dim * 0.55).toFixed(3) + ')' : 'rgba(60,30,12,' + (G.dim * 0.36).toFixed(3) + ')'; g.fillRect(0, 0, CAM.w, CAM.h);
        const gx = sxW(C.X), gy = syW(C.Y, C.Z), rr = R * 3 * CAM.zoom;
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = G.dim * 0.5;
        g.drawImage(K.glowSprite('rgba(255,206,130,0.8)'), gx - rr, gy - rr, rr * 2, rr * 2);
        const bt = G.beatAt ? (now() - G.beatAt) / 900 : 2;
        if (bt < 1 && !K.reduced()) for (const off of [0, 0.22]) {
          const q = bt - off; if (q <= 0) continue;
          g.globalAlpha = G.dim * (1 - q) * 0.7; g.strokeStyle = '#ffd98a'; g.lineWidth = 2;
          g.beginPath(); g.arc(gx, gy, R * CAM.zoom * (1.15 + q * 1.5), 0, TAU); g.stroke();
        }
        g.restore();
      }
      function draw(g, t, dt) {
        const w = CAM.w, H = CAM.h, dpr = cv.dpr || 1;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawBackground(g);
        drawRays(g, t);
        drawCushion(g);
        drawHang(g);
        if (C.mode !== 'gone') drawShadow(g);
        drawRing(g);
        drawMelt(g, t);
        if (C.mode !== 'gone') {
          if (C.mode === 'flight' && Math.abs(C.om * G.ts) > 6 && !K.reduced()) {
            const keep = [C.phi, C.u, C.v, C.n];
            for (const k of [0.03, 0.016]) { C.phi = keep[0] - C.om * k * G.ts; poseFlip(); drawCoin(g, 0.18); }
            C.phi = keep[0]; C.u = keep[1]; C.v = keep[2]; C.n = keep[3];
          }
          drawCoin(g, 1);
        }
        drawPress(g);
        drawMedal(g, t);
        P.update(dt); P.draw(g);
        if (G.flash > 0) { g.fillStyle = 'rgba(255,244,214,' + (G.flash * 0.35).toFixed(3) + ')'; g.fillRect(0, 0, w, H); }
        if (SPR.vig) g.drawImage(SPR.vig, 0, 0, w, H);
      }

      /* ---------------- physics ---------------- */
      function step(dt) {
        if (C.mode === 'flight') {
          C.phi += C.om * dt; C.yaw += C.yawV * dt; C.yawV += (-C.yaw * 8) * dt;
          if (G.phase !== 'hope') {   // in bullet time the coin hangs at the top of its arc and only turns
            const g2 = C.vy > 0 ? GRAV : GRAV * DESCENT * DESCENT;
            C.vy -= g2 * dt; C.Y += C.vy * dt; C.X += C.vx * dt; C.vx *= Math.pow(0.6, dt);
          }
          poseFlip();
          if (!G.apexDone && C.vy <= 0) { G.apexDone = true; C.vy = 0; apex(); }
          if (C.vy < 0 && C.Y <= contactY(C.phi)) landMiss();
        } else if (C.mode === 'bounce') {
          C.vy -= GRAV * dt; C.Y += C.vy * dt; C.phi += C.om * dt; C.X += C.vx * dt; C.vx *= Math.pow(0.3, dt);
          C.yaw += C.yawV * dt; C.yawV *= Math.pow(0.4, dt);
          poseFlip();
          if (C.vy < 0 && C.Y <= contactY(C.phi)) {
            C.hops++;
            const up = Math.sin(C.phi) >= 0 ? 1 : -1, delta = wrapPI(C.phi - (up > 0 ? Math.PI / 2 : Math.PI * 1.5));
            if ((C.hops >= 2 && Math.abs(delta) < 0.95) || C.hops >= 4) toEuler(up, delta);
            else { C.Y = contactY(C.phi); C.vy = Math.max(150, -C.vy * 0.42); C.om *= 0.62; sClink(1.05 + C.hops * 0.06); P.emit('dust', sxW(C.X), syW(0, 0), 4, { colors: ['rgba(255,230,180,0.45)'], speed: [15, 50] }); }
          }
        } else if (C.mode === 'euler') {   // Euler's disk: the tilt dies away while the wobble speeds up, then it slaps flat
          C.tilt = Math.max(0, C.tilt - dt * (0.18 + 0.5 * C.tilt));
          C.precV = Math.min(70, 4.2 / Math.sqrt(Math.max(0.0036, C.tilt)));
          const before = Math.floor(C.prec / Math.PI);
          C.prec += C.precV * dt; C.spin += dt * 0.4; C.X += (0 - C.X) * Math.min(1, dt * 2);
          if (Math.floor(C.prec / Math.PI) !== before) { sClink(1 + (1 - Math.min(1, C.tilt * 3)) * 0.4); if (spinVoice) spinVoice.level(0.012 + 0.045 * (1 - Math.min(1, C.tilt * 2.5)), 0.04); }
          if (spinVoice) spinVoice.freq(300 + C.precV * 22, 0.05);
          C.Y = R * Math.sin(C.tilt) + FLAT() * Math.cos(C.tilt);
          poseLying();
          if (C.tilt <= 0.0006) { C.tilt = 0; C.mode = 'lying'; poseLying(); settled(false); }
        } else if (C.mode === 'catch') {
          C.k = Math.min(1, (C.k || 0) + dt * 7);
          C.phi += (C.phiT - C.phi) * Math.min(1, dt * 14); C.Y += (FLAT() - C.Y) * Math.min(1, dt * 14); C.X += (0 - C.X) * Math.min(1, dt * 10);
          poseFlip();
          if (C.k >= 1 && !C.done) { C.done = true; settled(true); }
        } else if (C.mode === 'show') {
          C.k = Math.min(1, (C.k || 0) + dt * 2.2);
          const e = K.ease.outBack(C.k), e2 = K.ease.outCubic(C.k);
          C.phi = C.phi0 + (C.phiT - C.phi0) * e; C.Y = C.y0 + (C.yT - C.y0) * e2 + (C.k >= 1 ? Math.sin(now() / 600) * 3 : 0);
          C.yaw = C.yaw0 * (1 - e2) + Math.sin(now() / 900) * 0.12 * C.k;
          poseFlip();
        } else if (C.mode === 'stamp') {
          C.k = Math.min(1, (C.k || 0) + dt / C.dur);
          C.phi = C.phi0 + (C.phiT - C.phi0) * K.ease.inOutCubic(C.k); C.Y = C.y0 + (C.yT - C.y0) * K.ease.inOutCubic(C.k);
          poseFlip();
        } else if (C.mode === 'rest') {   // stands on its edge, heads to you, breathing a little
          const k = Math.min(1, dt * 6);
          C.Y += (restY() - C.Y) * Math.min(1, dt * 10); C.X += (0 - C.X) * k;
          C.phi += (TAU * Math.round(C.phi / TAU) - C.phi) * k;
          C.yaw += (Math.sin(now() / 1300) * 0.06 - C.yaw) * Math.min(1, dt * 4); poseFlip();
        }
        if (C.sq > 0) C.sq = Math.max(0, C.sq - dt * 4);
        if (C.shine >= 0) { C.shine += dt * 1.6; if (C.shine > 1) C.shine = -1; }
        if (C.glow > 0) C.glow = Math.max(0, C.glow - dt * 0.6);
        const pr = G.press;
        if (pr) { pr.v += (pr.target - pr.y) * 260 * dt - pr.v * 22 * dt; pr.y += pr.v * dt; if (pr.target >= R * 9 && pr.y > R * 8.6) G.press = null; }
        if (G.ring && G.ring.on) {
          const tl = timeToLand();
          G.ring.k = tl == null ? 0 : clamp(tl / 0.9, 0, 1);
        }
        if (G.melt) { G.melt.k = Math.min(1, G.melt.k + dt / G.melt.dur); if (G.melt.rising) { G.melt.rise = Math.min(1, (G.melt.rise || 0) + dt * 1.5); if (G.melt.rise >= 1) G.melt = null; } }
        if (G.medal) { G.medal.k = Math.min(1, G.medal.k + dt * 0.9); G.medal.rib = Math.min(1, (G.medal.rib || 0) + dt * (G.medal.k > 0.6 ? 1.4 : 0)); }
      }
      // seconds (game time) until the falling coin reaches the cushion, extrapolated to this instant
      function timeToLand() {
        if (C.mode !== 'flight' || C.vy > 0) return null;
        const ex = G.lastNow ? (now() - G.lastNow) / 1000 * G.ts : 0;
        const g2 = GRAV * DESCENT * DESCENT, y = C.Y + C.vy * ex - g2 * ex * ex / 2, vy = C.vy - g2 * ex, d = y - restY();
        if (d <= 0) return 0;
        const disc = vy * vy + 2 * g2 * d;
        return (vy + Math.sqrt(disc)) / g2 / Math.max(0.05, G.ts);
      }

      /* ---------------- frame loop ---------------- */
      K.loop((capDt, t) => {
        const g = cv.g; if (!g || !SPR.bg) return;
        const tn = now(), rawDt = clamp(G.lastNow ? (tn - G.lastNow) / 1000 : capDt, 0.001, 0.5);
        G.ts += (G.tsT - G.ts) * Math.min(1, rawDt * (G.tsT < G.ts ? 9 : 5));
        const sim = rawDt * G.ts, n = Math.min(30, Math.ceil(sim / 0.012));
        for (let i = 0; i < n; i++) step(sim / n);
        G.lastNow = tn;
        // camera: follow the coin up; a little zoom for the slow-motion moment
        if (C.mode === 'flight' || C.mode === 'bounce') CAM.camYT = Math.max(0, C.Y - (CAM.baseY - CAM.h * 0.42) / CB); else CAM.camYT = G.camHold || 0;
        CAM.camY += (CAM.camYT - CAM.camY) * (1 - Math.exp(-rawDt * (C.mode === 'flight' ? 9 : 3.5)));
        CAM.zoom += (CAM.zoomT - CAM.zoom) * (1 - Math.exp(-rawDt * 3));
        CAM.shake = Math.max(0, CAM.shake - rawDt * 3);
        const sh = K.reduced() ? 0 : CAM.shake * CAM.shake * 8;
        CAM.ox = sh ? (Math.random() - 0.5) * sh : 0; CAM.oy = sh ? (Math.random() - 0.5) * sh : 0;
        G.flash = Math.max(0, G.flash - rawDt * 2.4); G.dim += ((G.dimT || 0) - (G.dim || 0)) * Math.min(1, rawDt * 4);
        if (G.raysT != null) G.rays += (G.raysT - G.rays) * Math.min(1, rawDt * 1.5);
        if (Math.random() < rawDt * 2 && G.phase !== 'intro') { P.emit('mote', Math.random() * CAM.w, CAM.h * (0.2 + Math.random() * 0.5), 1, { colors: K.dark() ? ['rgba(255,226,160,0.7)'] : ['rgba(200,150,60,0.55)'], speed: [4, 12] }); if (!G.moteP && P.list.length) G.moteP = P.list[P.list.length - 1].p; }
        G.acc = (G.acc || 0) + rawDt;
        if (G.phase === 'intro' && G.drawn > 1) return;
        if (G.finished && now() - G.finishedAt > 1600) return;
        const calm = C.mode === 'rest' && !G.press && CAM.camY < 0.5 && G.flash <= 0 && C.sq <= 0 && C.shine < 0 && P.list.every(q => q.p === G.moteP);   // only drifting dust: half rate is plenty
        if (calm && (G.half ^= 1)) return;
        draw(g, t, G.acc); G.acc = 0; G.drawn++;
        placeUI();
      });
      function placeUI() {
        const x = sxW(C.X), y = syW(C.Y, C.Z);
        if (!zone.hidden) { zone.style.left = x.toFixed(1) + 'px'; zone.style.top = y.toFixed(1) + 'px'; }
      }

      /* ---------------- flow helpers ---------------- */
      const until = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 20000)) await K.wait(50); };
      const beat = (ms) => K.wait(K.reduced() ? Math.round(ms * 0.8) : ms);
      function pop(text, x, y, soft) { const p = h('div', { class: 'gc-pop' + (soft ? ' soft' : ''), 'aria-hidden': 'true', text }); p.style.left = clamp(x, 80, CAM.w - 80) + 'px'; p.style.top = clamp(y, CAM.top, CAM.h - 220) + 'px'; el.append(p); S.later(() => p.remove(), 1150); }
      function capShow(kicker, user) {
        cap.innerHTML = ''; cap.append(document.createTextNode(kicker)); if (user) cap.append(h('span', { class: 'gk-user', text: user }));
        cap.style.top = Math.round(Math.max(CAM.top + 30, Math.min(G.capY || CAM.h * 0.25, CAM.h - 260))) + 'px';
        cap.classList.add('on');
      }
      const capHide = () => cap.classList.remove('on');
      function setPanel(nodes) { panel.innerHTML = ''; nodes.filter(Boolean).forEach(n => panel.append(n)); panel.classList.remove('off'); }
      const hidePanel = () => panel.classList.add('off');

      /* ---------------- step 1: name the two options ---------------- */
      function stepPick() {
        setPhase('pick');
        say(glitch, line(care ? { Jolly: 'This is a clarity check, not a decider. First: what are the two options?', Cheeky: 'Clarity check, not a decider. What are the two options?', Unfiltered: 'Clarity check only. Two options?' }
          : { Jolly: 'Two options, one coin. It won’t decide. It’ll just show you how you feel. What are they?', Cheeky: 'Overthinking detected. Countermeasure: one heavy coin. Name your two options.', Unfiltered: 'Two options. One coin. Your reaction does the deciding. Name them.' }), { mood: care ? 'calm' : 'idea', ms: 4200 });
        const chips = K.chips(null, PAIRLIST.map((p, i) => ({ id: String(i), label: p[0] + ' / ' + p[1], user: own && i === 0 })), (item) => { const p = PAIRLIST[Number(item.id)]; choosePair(p[0], p[1]); }, { label: 'Option pairs', cls: 'gc-chips' });
        chips.classList.add('gc-row');
        const custom = h('button', { type: 'button', class: 'gc-link', text: 'Write my own two' });
        custom.addEventListener('click', () => { A.unlock(); stepCustom(); });
        setPanel([h('div', { class: 'gc-h', text: 'What’s the choice?' }), chips, custom]);
        S.later(() => { if (G.phase === 'pick') K.guide({ id: 'pick', g: 'choose', target: () => Array.from(chips.querySelectorAll('button')), label: 'PICK YOUR TWO', delay: 300 }); }, 600);
      }
      function stepCustom() {
        const a = h('input', { class: 'gc-in', type: 'text', maxlength: '40', placeholder: 'Option one', 'aria-label': 'Option one' });
        const b = h('input', { class: 'gc-in', type: 'text', maxlength: '40', placeholder: 'Option two', 'aria-label': 'Option two' });
        const go = K.button('Stamp these', () => { const x = tidy(a.value) || 'Option one', y = tidy(b.value) || 'Option two'; choosePair(capW(x), capW(y)); });
        const back = h('button', { type: 'button', class: 'gc-link', text: 'Back to the suggestions' }); back.addEventListener('click', () => stepPick());
        setPanel([h('div', { class: 'gc-h', text: 'Your two options' }), h('div', { class: 'gc-row' }, a, b), h('div', { class: 'gc-row' }, go, back)]);
        K.guide({ id: 'type', g: 'type', target: a, label: 'TYPE YOUR TWO', delay: 400 });
        S.later(() => { try { a.focus(); } catch (e) { /* no focus */ } }, 60);
      }
      function choosePair(a, b) {
        if (G.phase !== 'pick') return;
        if (a.toLowerCase() === b.toLowerCase()) b = 'Not ' + a.toLowerCase();
        G.A = a; G.B = b; K.guide(null);
        if (A.ctx) A.click({ vol: 0.1 });
        stepStamp();
      }

      /* ---------------- step 2: stamp each option onto a face ---------------- */
      let dies = [];
      function stepStamp() {
        setPhase('stamp');
        G.press = { y: R * 5.2, v: 0, target: R * 3.4 };
        dies = [mkDie(0, G.A), mkDie(1, G.B)];
        setPanel([h('div', { class: 'gc-h', text: 'Stamp each side' }), h('div', { class: 'gc-row' }, dies[0], dies[1])]);
        dies[1].classList.add('wait');
        say(glitch, line({ Jolly: 'Drag each one onto the coin. The press does the rest.', Cheeky: 'Onto the coin. The press loves a dramatic CHUNK.', Unfiltered: 'Drag them onto the coin.' }), { mood: 'happy', ms: 3000 });
        S.later(() => guideDie(0), 500);
      }
      function mkDie(i, label) {
        const d = h('div', { class: 'gc-die', role: 'button', tabindex: '0', 'aria-label': (i ? 'Tails' : 'Heads') + ': ' + label + '. Drag it onto the coin.' }, h('b', { text: i ? 'T' : 'H' }), h('span', { class: 'gk-user', text: label }));
        let st = null;
        K.drag(d, {
          space: el,
          start: (p) => { if (G.phase !== 'stamp' || G.stamped[i] || (i === 1 && !G.stamped[0]) || G.busy) return false; st = p; d.classList.add('drag'); K.guide(null); if (A.ctx) A.click({ vol: 0.08 }); },
          move: (p) => { if (st) d.style.transform = 'translate(' + (p.x - st.x).toFixed(1) + 'px,' + (p.y - st.y).toFixed(1) + 'px) scale(1.06)'; },
          end: (p) => {
            if (!st) return; st = null; d.classList.remove('drag');
            const cx = sxW(0), cy = syW(restY(), 0);
            if (Math.hypot(p.x - cx, p.y - cy) < R * 1.7) { K.guide(null); d.classList.add('used'); d.style.transform = ''; stamp(i); }
            else { d.style.transform = ''; if (A.ctx) A.boing({ freq: 300, vol: 0.06 }); guideDie(i, 900); }
          }
        });
        S.listen(d, 'keydown', (e) => { if ((e.code === 'Enter' || e.code === 'Space') && G.phase === 'stamp' && !G.stamped[i] && !(i === 1 && !G.stamped[0]) && !G.busy) { e.preventDefault(); d.classList.add('used'); stamp(i); } });
        return d;
      }
      function guideDie(i, delay) {
        const d = dies[i]; if (!d || G.phase !== 'stamp' || G.stamped[i] || G.busy || d.classList.contains('drag')) return;
        const r = K.rectIn(d, el), cx = sxW(0), cy = syW(restY(), 0);
        K.guide({ id: 'die-' + i, g: 'drag', target: d, dx: cx - r.cx, dy: cy - r.cy, label: i ? 'NOW THE OTHER SIDE' : 'STAMP IT ON THE COIN', delay: delay ?? 400, ms: 1900 });
      }
      async function stamp(i) {
        G.busy = true;
        const faceUp = i === 0 ? Math.PI / 2 : Math.PI * 1.5;    // heads up, or tails up
        C.mode = 'stamp'; C.k = 0; C.dur = 0.3; C.phi0 = C.phi; C.phiT = C.phi0 + ((faceUp - C.phi0) % TAU + TAU) % TAU; C.y0 = C.Y; C.yT = FLAT();
        if (A.ctx) A.whoosh({ from: 600, to: 200, dur: 0.3, vol: 0.06 });
        await beat(320);
        G.press.target = R * 0.12;   // the ram drops
        await until(() => G.press.y < R * 0.4, 600);
        sChunk(); C.sq = 1; CAM.shake = 0.8;
        G.stamped[i] = true; paintFaces();
        const bx = sxW(0), by = syW(R * 0.2, 0);
        P.emit('spark', bx, by, 26, { colors: ['#fff3c4', '#ffd36b', '#ffae4a'], speed: [120, 300] });
        S.buzz(18);
        await beat(140);
        G.press.target = R * 3.4;
        await beat(260);
        C.mode = 'stamp'; C.k = 0; C.dur = 0.42; C.phi0 = C.phi; C.phiT = i === 0 ? TAU * Math.round(C.phi / TAU) : Math.PI + TAU * Math.floor(C.phi / TAU); C.y0 = C.Y; C.yT = restY();
        if (i === 1 && C.phiT < C.phi0) C.phiT += TAU;
        await beat(440);
        C.mode = i === 0 ? 'rest' : 'hold'; C.shine = 0; sReveal();
        pop(i ? 'Tails!' : 'Heads!', sxW(0), syW(restY() + R * 1.25, 0));
        G.busy = false;
        if (i === 0) {
          dies[1].classList.remove('wait');
          say(glitch, line({ Jolly: 'Heads: ' + G.A + '. Lovely. Now the other side.', Cheeky: 'CHUNK. Very official. Other side now.', Unfiltered: 'Heads done. Other side.' }), { mood: 'smug', ms: 2600 });
          guideDie(1, 300);
        } else {
          say(glitch, line({ Jolly: 'Both sides minted. Now give it a good flick, up!', Cheeky: 'Minted. Now flick it like you mean it.', Unfiltered: 'Done. Flick it up.' }), { mood: 'determined', ms: 3000 });
          G.press.target = R * 9;
          await beat(900);
          C.mode = 'rest';     // it turns back to heads by itself
          stepFlick();
        }
      }

      /* ---------------- step 3: flick, hope, catch ---------------- */
      function legend() {
        return h('div', { class: 'gc-row gc-legend' }, h('div', { class: 'gc-sub' }, h('b', { text: 'Heads ' }), h('span', { class: 'gk-user', text: G.A })), h('div', { class: 'gc-sub' }, h('b', { text: 'Tails ' }), h('span', { class: 'gk-user', text: G.B })));
      }
      function stepFlick() {
        setPhase('flick');
        G.round++; G.apexDone = false; G.hope = -1; G.camHold = 0;
        C.mode = 'rest'; C.hops = 0;
        setPanel([h('div', { class: 'gc-h', text: G.round > 1 ? 'Round ' + G.round + ': flick it up' : 'Flick it up' }), legend()]);
        zone.hidden = false;
        S.later(() => { if (G.phase === 'flick') K.guide({ id: 'flick-' + G.round, g: 'drag', dir: 'u', d: 110, target: zone, label: 'FLICK IT UP', ms: 1300, delay: 200 }); }, 700);
      }
      let fl = null;
      K.drag(zone, {
        space: el,
        start: (p) => { if (G.phase !== 'flick') return false; fl = { y: p.y, t: now() }; C.sq = 0.6; K.guide(null); if (A.ctx) A.click({ vol: 0.06 }); },
        move: (p, d) => { if (G.phase !== 'flick' || !fl) return; if (d.dy < -46) launch(Math.max(-d.vy, 1500)); else if (d.dy > 0) { C.Y = restY() - Math.min(R * 0.4, d.dy * 0.5); C.sq = Math.min(1, d.dy / 60); } },
        end: (p, d) => { if (G.phase !== 'flick' || !fl) return; fl = null; launch(d.dy > 12 ? 1200 + d.dy * 9 : Math.max(-d.vy, 1300)); }
      });
      K.onKey(['ArrowUp', 'Space'], (e) => { if (G.phase === 'flick') { e.preventDefault(); A.unlock(); launch(1700); } });
      function launch(v) {
        if (G.phase !== 'flick') return;
        setPhase('flight'); zone.hidden = true; K.guide(null); hidePanel();
        const vy = clamp(v * 0.8 + 400, 1350, 2150) * (phone ? 1 : 1.06);
        C.mode = 'flight'; C.vy = vy; C.vx = (Math.random() - 0.5) * 40; C.om = vy / 82 + Math.random() * 3; C.yawV = (Math.random() - 0.5) * 2;
        sTing(1); sWhoosh(true);
        if (A.ctx && !spinVoice) spinVoice = A.loop({ filter: 'bandpass', freq: 1400, q: 3 });
        if (spinVoice) { spinVoice.freq(1400, 0.05); spinVoice.level(0.035, 0.05); }
        P.emit('star', sxW(0), syW(restY(), 0), 10, { colors: ['#fff3c4', '#ffd36b'], speed: [60, 160] });
        say(glitch, line({ Jolly: 'Up it goes…', Cheeky: 'Wheee…', Unfiltered: 'Up.' }), { mood: 'wow', ms: 1400 });
        ctx.track('flip', { v: Math.round(vy), r: G.round });
      }
      function apex() {
        setPhase('hope');
        G.tsT = K.reduced() ? 0.12 : 0.04; G.dimT = 0.8; CAM.zoomT = 1.12; MZ.duckT = 0.25;
        if (spinVoice) spinVoice.level(0.012, 0.3);
        if (A.ctx) A.tone({ type: 'sine', freq: 420, to: 70, glide: 0.7, dur: 0.9, vol: 0.09 });
        heartbeatLoop();
        G.capY = CAM.h * (phone ? 0.6 : 0.62);
        capShow(care ? 'Which side are you hoping for?' : 'Quick: which side are you hoping for?');
        say(glitch, line({ Jolly: 'Quick! Which side are you hoping for? Don’t think. Hope.', Cheeky: 'Quick! Which one? First feeling wins.', Unfiltered: 'Which side do you want? Fast.' }), { mood: 'gasp', ms: 0 });
        const bA = bigBtn('Heads', G.A, () => chooseHope(0)), bB = bigBtn('Tails', G.B, () => chooseHope(1));
        setPanel([h('div', { class: 'gc-row' }, bA, bB)]);
        K.guide({ id: 'hope-' + G.round, g: 'choose', target: [bA, bB], label: 'QUICK: PICK ONE', delay: 350 });
        G.unsure = S.later(() => { if (G.phase === 'hope') { const bN = bigBtn('', 'Not sure', () => chooseHope(-1), true); panel.append(h('div', { class: 'gc-row' }, bN)); } }, 7000);
      }
      function heartbeatLoop() { if (G.phase !== 'hope') return; G.beatAt = now(); K.sfx.heartbeat(); S.later(heartbeatLoop, 1000); }
      function bigBtn(kick, label, fn, soft) {
        const b = h('button', { type: 'button', class: 'gc-big' + (soft ? ' soft' : '') }, kick ? h('small', { text: kick.toUpperCase() }) : null, h('span', { class: soft ? '' : 'gk-user', text: label }));
        b.addEventListener('click', () => { A.unlock(); fn(); });
        return b;
      }
      function chooseHope(x) {
        if (G.phase !== 'hope') return;
        S.cancel(G.unsure);
        G.hope = x; K.guide(null); capHide();
        if (A.ctx) { A.wood(undefined, 0.12, 1.4); sWhoosh(false); }
        G.tsT = 1; G.dimT = 0; CAM.zoomT = 1; MZ.duckT = 0.7;
        setPhase('catch'); hidePanel();
        say(glitch, line({ Jolly: 'Noted. Now catch it!', Cheeky: 'Interesting. Now CATCH.', Unfiltered: 'Catch it.' }), { mood: 'determined', ms: 1600 });
        G.ring = { on: true, k: 1 }; tapz.hidden = false;
        K.guide({ id: 'catch-' + G.round, g: 'tap', target: () => ({ x: sxW(0), y: Math.min(CAM.h - 160, syW(0, 0) + 8) }), place: 'below', label: 'TAP TO CATCH', delay: 80 });
        ctx.track('hope', { r: G.round, h: x === 0 ? 'A' : x === 1 ? 'B' : '-' });
      }
      K.tap(tapz, () => tryCatch());
      K.onKey(['Enter', 'Space', 'ArrowDown'], (e) => { if (G.phase === 'catch') { e.preventDefault(); tryCatch(); } });
      function tryCatch() {
        if (G.phase !== 'catch' || C.mode !== 'flight') return;
        const tl = timeToLand();
        if (tl == null) return;
        if (tl > CATCH.ok) { if (A.ctx) A.tone({ type: 'sine', freq: 500, dur: 0.06, vol: 0.04 }); pop('Wait for it…', sxW(0), syW(restY() + R * 1.4, 0), true); return; }
        G.lastCatch = clamp(Math.round(100 * (1 - tl / (CATCH.ok * 1.15))), 1, 100);
        catchIt(tl <= CATCH.clean ? 'clean' : 'ok');
      }
      function endHang() { S.cancel(G.unsure); capHide(); hidePanel(); G.tsT = 1; G.dimT = 0; CAM.zoomT = 1; MZ.duckT = 0.7; }
      function catchIt(grade) {
        setPhase('land'); tapz.hidden = true; K.guide(null); G.ring = null;
        const up = Math.sin(C.phi) >= 0 ? 1 : -1;      // the side facing up when you slap it down
        C.mode = 'catch'; C.k = 0; C.done = false; C.up = up;
        C.phiT = C.phi + wrapPI((up > 0 ? Math.PI / 2 : Math.PI * 1.5) - C.phi);
        sSlap(); CAM.shake = 0.5; S.buzz(20);
        if (spinVoice) spinVoice.level(0.0001, 0.05);
        const x = sxW(0), y = syW(FLAT(), 0);
        P.emit('star', x, y, grade === 'clean' ? 22 : 10, { colors: ['#fff3c4', '#ffd36b'], speed: [60, 220] });
        pop(grade === 'clean' ? 'Clean catch!' : 'Caught!', x, syW(restY() + R * 0.55, 0) - R * 1.85, grade !== 'clean');
        G.catches = (G.catches || []).concat([{ grade, prec: G.lastCatch }]);
      }
      function landMiss() {
        if (G.phase !== 'catch' && G.phase !== 'flight' && G.phase !== 'hope') return;
        if (G.phase === 'hope') endHang();
        setPhase('land'); tapz.hidden = true; K.guide(null); G.ring = null;
        C.mode = 'bounce'; C.hops = 0; C.Y = contactY(C.phi); C.vy = Math.max(380, -C.vy * 0.38); C.om *= 0.6; C.vx = (Math.random() - 0.5) * 120;
        sClink(1); sClink(1.2); CAM.shake = 0.4;
        P.emit('dust', sxW(C.X), syW(0, 0), 8, { colors: ['rgba(255,230,180,0.5)'], speed: [20, 70] });
        say(glitch, line({ Jolly: 'Ooh, it’s spinning on the cushion. Wait for it…', Cheeky: 'Missed! Dramatic though. Wait for it…', Unfiltered: 'It’s spinning. Wait.' }), { mood: 'wow', ms: 2400 });
      }
      function toEuler(up, delta) { // carry on from exactly where the bounce left it: same face up, same lean
        C.mode = 'euler'; C.up = up; C.spin = C.yaw;
        C.prec = -C.yaw; C.tilt = Math.abs(delta);
        if (delta < 0) C.prec += Math.PI;
        C.tilt = Math.min(C.tilt, 1.3); C.precV = 4;
        sClink(0.9);
        if (spinVoice) spinVoice.level(0.02, 0.1);
      }
      async function settled(caught) {
        if (spinVoice) spinVoice.level(0.0001, 0.08);
        if (!caught) { sClink(1.4); if (A.ctx) A.noise({ filter: 'highpass', freq: 5000, dur: 0.25, attack: 0.01, vol: 0.05 }); }
        const side = C.up > 0 ? 0 : 1;
        G.rounds.push({ side, hope: G.hope, caught });
        await beat(450);
        // the coin rights itself so you can read it
        if (C.mode === 'lying') { C.phi = C.up > 0 ? Math.PI / 2 : Math.PI * 1.5; C.yaw = wrapPI(C.spin); }
        C.mode = 'show'; C.k = 0; C.phi0 = C.phi; C.yaw0 = C.yaw;
        C.phiT = C.up > 0 ? TAU * Math.round(C.phi / TAU) : Math.PI + TAU * Math.round((C.phi - Math.PI) / TAU); C.y0 = C.Y; C.yT = restY() + R * 0.55;
        C.glow = 1; sReveal();
        await beat(650);
        reveal(side);
      }

      /* ---------------- step 4: what it says, and how that felt ---------------- */
      function reveal(side) {
        setPhase('react');
        const res = lab(side), hoped = G.hope, hopeTxt = lab(hoped);
        G.capY = syW(restY() + R * 0.55, 0) - R * 1.95;
        capShow('It says', res);
        say(glitch, line(hoped < 0 ? { Jolly: 'It says ' + res + '. Notice your first flicker. Relief, or a little sink?', Cheeky: 'It says ' + res + '. Quick gut read: yay or meh?', Unfiltered: res + '. Relief or sink?' }
          : hoped === side ? { Jolly: 'It says ' + res + ', the one you hoped for. How does that land?', Cheeky: res + '! The one you wanted. Smug relief, or…?', Unfiltered: res + '. What you hoped. Feel it?' }
            : { Jolly: 'It says ' + res + '. You were hoping for ' + hopeTxt + '. Relief, or a little sink?', Cheeky: 'It says ' + res + '. You hoped ' + hopeTxt + '. Oof? Or phew?', Unfiltered: res + '. You wanted ' + hopeTxt + '. How’s that feel?' }), { mood: 'think', ms: 0 });
        const b1 = bigBtn('', 'Relief', () => react('relief'), true), b2 = bigBtn('', 'A little sink', () => react('sink'), true);
        setPanel([h('div', { class: 'gc-h', text: 'Your first feeling' }), h('div', { class: 'gc-row' }, b1, b2)]);
        K.guide({ id: 'react-' + G.round, g: 'choose', target: [b1, b2], label: 'HOW DID THAT FEEL?', delay: 900 });
      }
      async function react(kind) {
        if (G.phase !== 'react') return;
        setPhase('felt');
        K.guide(null); hidePanel();
        const r = G.rounds[G.rounds.length - 1]; r.react = kind;
        if (kind === 'relief') K.sfx.good(undefined, 6); else K.sfx.soft();
        glitch.face(kind === 'relief' ? 'happy' : 'think', 1600);
        ctx.track('react', { r: G.round, k: kind === 'relief' ? 1 : 0 });
        await beat(500);
        if (G.round < ROUNDS_MAX && G.wantReflip !== false) offerReflip();
        else verdict();
      }

      /* ---------------- the twist: best of three? ---------------- */
      function offerReflip() {
        setPhase('again'); capHide();
        if (patch.el.hidden) { el.classList.add('gc-duo'); patch.show(true); patch.react('bounce'); }
        say(glitch, line(care ? { Jolly: 'Want to flip again, just to double-check how it feels?', Cheeky: 'Flip again to double-check the feeling?', Unfiltered: 'Flip again?' }
          : G.round === 1 ? { Jolly: 'So… best of three?', Cheeky: 'Best of three? Five? I have SO many coins.', Unfiltered: 'Best of three?' } : { Jolly: 'Make it best of three?', Cheeky: 'One more for the decider? I live for this.', Unfiltered: 'Again?' }), { mood: 'smug', ms: 0 });
        const yes = bigBtn('', 'Yes, flip again', () => reflip(true), true), no = bigBtn('', 'No, I’ve got it', () => reflip(false), true);
        setPanel([h('div', { class: 'gc-row' }, yes, no)]);
        K.guide({ id: 'again-' + G.round, g: 'choose', target: [yes, no], label: 'FLIP AGAIN?', delay: 700 });
      }
      async function reflip(yes) {
        if (G.phase !== 'again') return;
        setPhase('decided');
        K.guide(null); hidePanel();
        G.wantReflip = yes;
        G.rounds[G.rounds.length - 1].reflip = yes;
        if (yes) {
          K.sfx.pop();
          say(glitch, line(care ? { Jolly: 'Okay. Notice that you wanted another go: that’s useful to know.', Cheeky: 'Noted: you wanted another go. Useful clue.', Unfiltered: 'You wanted another go. That’s a clue.' }
            : { Jolly: 'Ha! You wanted a re-flip. That’s your answer right there. But sure, again!', Cheeky: 'Oh, you WANTED a re-flip? Busted. That IS the answer. Flipping anyway.', Unfiltered: 'You wanted a re-flip. That’s the answer. Flip again.' }), { mood: 'laugh', ms: 3200 });
          glitch.react('bounce');
          S.later(() => { if (!patch.el.hidden && !care) say(patch, line({ Jolly: 'He does this every time.', Cheeky: 'Every. Single. Time.', Unfiltered: 'Classic Glitch.' }), { mood: 'laugh', ms: 2000 }); }, 2600);
          C.mode = 'rest';
          await beat(3400);
          stepFlick();
        } else {
          K.sfx.ok();
          say(glitch, line({ Jolly: 'Didn’t need another go? Your gut’s already talking.', Cheeky: 'No re-flip? Look at you, trusting yourself.', Unfiltered: 'No re-flip needed. Good.' }), { mood: 'cool', ms: 2600 });
          await beat(1500);
          verdict();
        }
      }

      /* ---------------- verdict and the medal ---------------- */
      function tally() {  // hoping counts most, then the flicker of relief or sink, then wanting a re-flip after a result
        const v = [0, 0];
        for (const r of G.rounds) {
          if (r.hope >= 0) v[r.hope] += 2;
          if (r.react === 'relief') v[r.side] += 1.5; else if (r.react === 'sink') v[1 - r.side] += 1.5;
          if (r.reflip === true) v[1 - r.side] += 1;
        }
        return Math.abs(v[0] - v[1]) < 0.5 ? -1 : v[0] > v[1] ? 0 : 1;
      }
      async function verdict() {
        setPhase('verdict'); capHide();
        G.gut = tally();
        const gut = lab(G.gut);
        CAM.zoomT = 1;
        // the coin turns to show the side your gut picked
        C.mode = 'show'; C.k = 0; C.phi0 = C.phi; C.yaw0 = C.yaw; C.y0 = C.Y; C.yT = restY() + R * 0.3;
        C.phiT = G.gut === 1 ? Math.PI + TAU * Math.round((C.phi - Math.PI) / TAU) : TAU * Math.round(C.phi / TAU);
        C.shine = 0;
        say(glitch, line(G.gut < 0 ? { Jolly: 'Both landed softly. That’s information too: either could work.', Cheeky: 'Your gut shrugged. Honestly? Both are fine.', Unfiltered: 'No strong lean. Either works.' }
          : care ? { Jolly: 'Your gut leans toward ' + gut + '. Just a lean, not a decision.', Cheeky: 'Your gut leans ' + gut + '. A clue, not a verdict.', Unfiltered: 'Leans ' + gut + '. Clue, not verdict.' }
            : { Jolly: 'Your gut votes: ' + gut + '. Let’s make that official.', Cheeky: 'The gut has spoken: ' + gut + '. Medal time.', Unfiltered: 'Gut says ' + gut + '. Done.' }), { mood: 'idea', ms: 0 });
        await beat(1700);
        finale();
      }
      async function finale() {
        setPhase('finale');
        const gut = lab(G.gut);
        G.medalLabel = gut || 'Either'; SPR.medal = paintMedal(G.medalLabel);
        MZ.duckT = 0.5;
        // heat: it settles onto the cushion and glows
        C.mode = 'show'; C.k = 0; C.phi0 = C.phi; C.phiT = C.phi; C.yaw0 = C.yaw; C.y0 = C.Y; C.yT = restY();
        if (A.ctx) A.noise({ filter: 'highpass', freq: 3000, to: 6000, dur: 1.6, attack: 0.3, vol: 0.06 });
        await K.anim(1100, (k) => { C.heat = k; C.glow = Math.max(C.glow, k * 0.8); });
        // melt
        C.mode = 'gone'; G.melt = { k: 0, dur: K.reduced() ? 0.3 : 0.9 };
        if (A.ctx) A.noise({ pink: true, filter: 'lowpass', freq: 300, to: 120, dur: 1.0, attack: 0.1, vol: 0.12 });
        P.emit('ember', sxW(0), syW(R * 0.3, 0), 30, { speed: [20, 90] });
        await beat(900);
        // recast as a medal
        G.melt.rising = true; G.medalY = restY() + R * 1.3; G.medal = { k: 0, rib: 0 };
        G.raysT = 1; G.flash = K.reduced() ? 0 : 0.8; C.glow = 0;
        if (A.ctx) ['D4', 'F#4', 'A4', 'D5'].forEach((n, i) => A.chime(A.note(n), { when: A.now() + i * 0.09, vol: 0.08, dur: 2.2 }));
        P.emit('star', sxW(0), syW(G.medalY, 0), 30, { colors: ['#fffbe6', '#ffe58a', '#ffd36b'], speed: [80, 260] });
        K.finale('stars', { colors: ['#ffe58a', '#fff3c4', '#ffd36b'], chord: ['D3', 'F#3', 'A3', 'D4'], ms: 3600 });
        if (!patch.el.hidden) patch.face('celebrate');
        glitch.base('celebrate');
        say(glitch, line({ Jolly: 'Fresh from the mint. Yours to keep.', Cheeky: 'One medal, freshly minted. Very shiny. Very you.', Unfiltered: 'Minted. Yours.' }), { ms: 3200 });
        await beat(1300);
        const next = care ? 'This was a clarity check, not a decision. Before you commit, talk it through with someone you trust or someone qualified.'
          : G.gut < 0 ? 'Both feel okay. Sleep on it and notice which one you miss.'
            : 'Sleep on it, then give ' + gut + ' five minutes tomorrow.';
        const have = K.collection(), owned = MINTS.filter(m => m.id === MINT.id || have.includes(m.id)).length;
        const tray = h('div', { class: 'gc-tray', role: 'img', 'aria-label': 'Your coins: ' + owned + ' of ' + MINTS.length },
          MINTS.map(m => { const cc = miniCoin(m, m.id === MINT.id || have.includes(m.id)); if (m.id === MINT.id) cc.classList.add('today'); return cc; }));
        const card = h('div', { class: 'gc-card', role: 'status' }, h('div', { class: 'gc-card-k', text: G.gut >= 0 ? (care ? 'Your gut leans (a clue, not a verdict)' : 'Your gut leans') : 'No strong lean' }),
          h('span', { class: 'gc-card-t gk-user', text: G.gut >= 0 ? gut : G.A + ' or ' + G.B }), h('div', { class: 'gc-card-s', text: next }),
          h('div', { class: 'gc-tray-k', text: 'Today’s mint: ' + MINT.name + ' · ' + owned + ' of ' + MINTS.length }), tray);
        el.append(card);
        K.sfx.paper();
        await beat(3000);
        finish();
      }
      function finish() {
        if (G.finished) return;
        const badges = [];
        const cs = (G.catches || []).map(c => c.prec);
        if (cs.length) {   // precision: 100% is a catch at the very moment it reaches the cushion
          const best = Math.max.apply(null, cs), pb = K.best('catch', best, 'higher');
          if (pb.isNew) badges.push('New best catch: ' + best + '% precise'); else if (pb.first) badges.push('First catch: ' + best + '% precise');
          const tier = K.tier(best / 100, [0.4, 0.7, 0.9]);
          if (tier) badges.push(tier + ' catch');
        }
        const col = K.collect(MINT.id);
        badges.push((col.isNew ? 'New coin: ' : 'Minted again: ') + MINT.name + ' (' + Math.min(col.count, MINTS.length) + ' of ' + MINTS.length + ')');
        const checks = (S.store.get('gut-coin:checks', 0) || 0) + 1; S.store.set('gut-coin:checks', checks);
        badges.push(checks === 1 ? 'First gut check' : 'You’ve trusted your gut ' + checks + ' times');
        ctx.track('done', { rounds: G.rounds.length, lean: G.gut === 0 ? 'A' : G.gut === 1 ? 'B' : '-', mint: MINT.id });
        G.finished = true; G.finishedAt = now();
        const flips = G.rounds.length, gut = lab(G.gut);
        ctx.finish({
          title: G.gut >= 0 ? 'Your gut leans ' + gut : 'Both could work', mood: 'celebrate',
          lines: ['Heads: ' + G.A + ' · Tails: ' + G.B, flips + (flips === 1 ? ' flip, ' : ' flips, ') + G.rounds.filter(r => r.caught).length + ' caught', G.rounds.some(r => r.reflip === true) ? 'You wanted a re-flip. That was a clue.' : 'You trusted the first feeling.'],
          share: 'Flipped a coin and found out what I actually wanted.', badges
        });
      }

      /* ---------------- start ---------------- */
      cv.onResize(() => { if (cv.w !== CAM.w || cv.h !== CAM.h || !SPR.bg) layout(); });
      const setScene = () => el.classList.toggle('gc-bright', !K.dark());
      setScene();
      S.on('theme', () => { setScene(); paintStatic(); });
      try { if (document.fonts && document.fonts.load) document.fonts.load('800 30px Cinzel').then(() => { if (!fontsOk && !S.destroyed) { fontsOk = true; paintFaces(); if (G.medalLabel) SPR.medal = paintMedal(G.medalLabel); } }).catch(() => {}); } catch (e) { /* no font API */ }
      C.Y = R; poseFlip();
      (async () => {
        await K.intro({ title: 'Gut Coin', sub: 'Stuck between two options? The coin won’t decide. Your reaction will.', how: 'Stamp both options on the coin, flick it up, then catch it.', char: 'glitch', mood: 'idea' });
        setPhase('ready');
        if (visits >= 1) say(glitch, line({ Jolly: 'Back at the mint! Today’s coin: the ' + MINT.name + '.', Cheeky: 'Oh, a regular. Today we’re minting the ' + MINT.name + '.', Unfiltered: 'Today’s coin: ' + MINT.name + '.' }), { mood: 'happy', ms: 2600 });
        await beat(visits >= 1 ? 1600 : 200);
        stepPick();
      })();

      return {
        async autoplay() {
          await until(() => !!el.querySelector('.gk-intro') || G.phase !== 'intro', 4000);
          const intro = el.querySelector('.gk-intro'); if (intro) await K.sim.tap(intro);
          await until(() => G.phase === 'pick' && panel.querySelector('.gc-chips button'), 20000);
          await K.wait(500);
          await K.sim.tap(panel.querySelector('.gc-chips button'));
          for (let i = 0; i < 2; i++) {
            await until(() => G.phase === 'stamp' && !G.busy && dies[i] && !dies[i].classList.contains('wait') && !panel.classList.contains('off'), 15000);
            await K.wait(450);
            const r = K.rectIn(dies[i], el), cx = sxW(0), cy = syW(restY(), 0);
            await K.sim.drag(dies[i], { x: r.w / 2, y: r.h / 2 }, { x: cx - r.x, y: cy - r.y }, 520, 9);
            await until(() => G.stamped[i] && !G.busy, 6000);
          }
          let guard = 0;
          while (!G.finished && guard++ < 8) {
            await until(() => G.phase === 'flick' || G.phase === 'verdict' || G.phase === 'finale', 30000);
            if (G.phase !== 'flick') break;
            await K.wait(700);
            const zr = K.rectIn(zone, el);
            await K.sim.drag(zone, { x: zr.w / 2, y: zr.h / 2 }, { x: zr.w / 2, y: zr.h / 2 - 150 }, 140, 5);
            await until(() => G.phase === 'hope', 8000);
            await K.wait(900);
            const hb = panel.querySelectorAll('.gc-big'), btn = hb[G.round === 1 ? 0 : 1] || hb[0];
            if (btn) await K.sim.tap(btn);
            if (G.round === 1) {   // catch the first toss; let the second one land and spin down on the cushion
              await until(() => G.phase !== 'catch' || (timeToLand() != null && timeToLand() < 0.06), 6000);
              if (G.phase === 'catch') await K.sim.tap(tapz);
            }
            await until(() => G.phase === 'react', 12000);
            await K.wait(900);
            const rr = G.rounds[G.rounds.length - 1], pick = rr && rr.hope === rr.side ? 0 : 1;
            const rb = panel.querySelectorAll('.gc-big'); if (rb[pick]) await K.sim.tap(rb[pick]);
            await until(() => G.phase === 'again' || G.phase === 'verdict' || G.phase === 'finale', 8000);
            if (G.phase === 'again') { await K.wait(1100); const ab = panel.querySelectorAll('.gc-big'); if (ab.length) await K.sim.tap(ab[G.round === 1 ? 0 : 1]); }
          }
          await until(() => G.finished, 60000);
        }
      };
    }
  });
})(window.TSG_ENV);
