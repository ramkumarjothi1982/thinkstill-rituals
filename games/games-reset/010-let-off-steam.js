/* 010 Let Off Steam — Reset · FEEL · Emotion
 * Mechanism: anger and frustration settle with slow, controlled release and a long out-breath; uncontrolled venting tends
 * to keep anger high (Bushman 2002). So the game rewards slow, steady release and never smashing: circle the kettle's
 * valve slowly and the pressure falls through red, amber, green; spin it fast and the whistle shrieks and the needle climbs.
 * Verb: turn (circle the valve slowly), then tilt (pour gently into a mug without spilling).
 * Finale: the mug steams little hearts, the kitchen light warms from blue to amber, Rush sits with the mug and the rain
 * outside eases into stars.
 */
(function (env) {
  'use strict';
  const TEAS = [
    { name: 'Chamomile', liq: '#e0a43a', tin: '#f1c75b' }, { name: 'Peppermint', liq: '#a3c25a', tin: '#6fcf9f' },
    { name: 'Rooibos', liq: '#b5502a', tin: '#e3845a' }, { name: 'Hot cocoa', liq: '#70432f', tin: '#c08a62' },
    { name: 'Lemon and ginger', liq: '#e6bd3d', tin: '#ffd95e' }, { name: 'Earl Grey', liq: '#8b5a2b', tin: '#8e9be0' },
    { name: 'Milk and honey', liq: '#efdcb6', tin: '#f4b3c2' }
  ];
  const TILES = [{ d: '#1f3d3b', g: '#16302e', b: '#d6ece2', bg: '#bfd9cd' }, { d: '#3a3423', g: '#2c2719', b: '#f3e8c8', bg: '#e1d3a8' },
    { d: '#1d3150', g: '#15243d', b: '#dbe7f5', bg: '#c0d2e8' }, { d: '#3b2834', g: '#2c1d27', b: '#f4dfe2', bg: '#e3c3c9' }];
  const MUGS = [{ body: '#f6efe6', band: '#ff8a7a', motif: 'heart' }, { body: '#cfe8ff', band: '#4d8fd6', motif: 'dots' },
    { body: '#ffe7a3', band: '#e0902a', motif: 'stripe' }, { body: '#e2d6ff', band: '#8b6fe0', motif: 'star' }];
  const SKIES = ['rain', 'drizzle', 'snow', 'rain', 'drizzle'];
  const GENERIC = ['THE HEAT', 'THE TIGHT JAW', 'THE BUZZ', 'THE RUSH', 'THE FIZZ'];
  const TIP = { x: -150, y: -126 }, VALVE = { x: 0, y: -160 }, VENT = { x: 0, y: -182 }, HANDLE = { x: 128, y: -68 }, PIV = { x: -100, y: 0 };

  (env.games = env.games || []).push({
    id: 'let-off-steam', mode: 'reset', name: 'Let Off Steam', verb: 'turn', family: 'FEEL', minutes: 2,
    parents: ['Emotion', 'Panic / Body Alarm'],
    cast: ['rush'], poster: { char: 'rush', mood: 'fume' },
    tagline: 'Turn the kettle’s valve slowly, let the pressure out, pour a calm cup.',
    why: 'For anger or frustration: slow, steady release settles it; blowing up keeps it hot.',
    css: `
.g-let-off-steam { --ls-ink: #2a2433; }
.g-let-off-steam .ls-probe { position: absolute; left: 0; top: 0; width: 0; height: 0; visibility: hidden; pointer-events: none; padding: env(safe-area-inset-top, 0px) 0 env(safe-area-inset-bottom, 0px); }
.g-let-off-steam .ls-valve, .g-let-off-steam .ls-handle { position: absolute; z-index: 12; border-radius: 50%; touch-action: none; cursor: grab; background: transparent; }
.g-let-off-steam .ls-valve:focus-visible, .g-let-off-steam .ls-handle:focus-visible { outline: 3px dashed rgba(255, 214, 120, 0.9); outline-offset: -14px; }
.g-let-off-steam .ls-valve.on, .g-let-off-steam .ls-handle.on { cursor: grabbing; }
.g-let-off-steam .ls-thought { position: absolute; left: 0; top: 0; z-index: 14; pointer-events: none; padding: 8px 14px 7px; border-radius: 999px; background: rgba(16, 24, 42, 0.62); color: #fff;
  font: 700 15px/1.15 var(--font-ui); letter-spacing: 0.04em; white-space: nowrap; box-shadow: 0 0 22px rgba(235, 242, 255, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.2); will-change: transform, opacity; }
.g-let-off-steam .ls-hud { position: absolute; z-index: 22; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 10px; box-sizing: border-box; padding-top: 4px; }
.g-let-off-steam .ls-hud.swap { animation: ls-in 0.45s cubic-bezier(.2, 1.2, .4, 1) both; }
@keyframes ls-in { from { opacity: 0; transform: translateY(10px) scale(0.97); } to { opacity: 1; transform: none; } }
.g-let-off-steam .ls-panel { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 440px; padding: 12px 14px; box-sizing: border-box; border-radius: 18px;
  background: color-mix(in srgb, var(--ui-surface) 78%, transparent); border: 1px solid var(--ui-line); box-shadow: 0 10px 26px rgba(0, 0, 0, 0.25); }
.g-let-off-steam .ls-row { display: flex; align-items: center; gap: 10px; width: 100%; }
.g-let-off-steam .ls-lab { font: 700 12px/1 var(--font-ui); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ui-muted); white-space: nowrap; width: 64px; flex: none; }
.g-let-off-steam .ls-meter { position: relative; flex: 1 1 auto; height: 14px; border-radius: 7px; background: linear-gradient(90deg, #36c486 0%, #36c486 50%, #ffc24a 60%, #ff7a4a 74%, #ff3b3b 100%); box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.35); }
.g-let-off-steam .ls-mk { position: absolute; top: -6px; left: 0; width: 8px; height: 26px; margin-left: -4px; border-radius: 4px; background: #fff; box-shadow: 0 0 8px rgba(255, 255, 255, 0.85), 0 2px 4px rgba(0, 0, 0, 0.45); }
.g-let-off-steam .ls-state { font: 800 13px/1 var(--font-ui); letter-spacing: 0.06em; text-transform: uppercase; width: 78px; flex: none; text-align: right; color: var(--ui-muted); }
.g-let-off-steam .ls-state.ok { color: #3fd08f; } .g-let-off-steam .ls-state.warn { color: #ffbe45; } .g-let-off-steam .ls-state.bad { color: #ff6b5a; }
.g-let-off-steam.ls-bright .ls-state.ok { color: #10804f; } .g-let-off-steam.ls-bright .ls-state.warn { color: #a85f00; } .g-let-off-steam.ls-bright .ls-state.bad { color: #c62f22; }
.g-let-off-steam .ls-dots { display: flex; gap: 7px; flex: 1 1 auto; }
.g-let-off-steam .ls-dots i { width: 15px; height: 15px; border-radius: 50%; border: 2px solid var(--ui-line); box-sizing: border-box; transition: background 0.3s, border-color 0.3s, transform 0.3s, box-shadow 0.3s; }
.g-let-off-steam .ls-dots i.on { background: #ffd36b; border-color: #ffd36b; transform: scale(1.12); box-shadow: 0 0 10px rgba(255, 211, 107, 0.65); }
.g-let-off-steam .ls-count { font: 700 14px/1 var(--font-ui); color: var(--ui-fg); width: 78px; flex: none; text-align: right; font-variant-numeric: tabular-nums; }
.g-let-off-steam .ls-fill { position: relative; flex: 1 1 auto; height: 14px; border-radius: 7px; background: color-mix(in srgb, var(--ui-fg) 14%, transparent); overflow: hidden; box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.25); }
.g-let-off-steam .ls-fill i { position: absolute; left: 0; top: 0; bottom: 0; width: 0; border-radius: 7px; background: linear-gradient(90deg, var(--ls-tea, #e0a43a), #ffe3a3); }
.g-let-off-steam .ls-fill b { position: absolute; top: -2px; bottom: -2px; left: 92%; width: 2px; background: var(--ui-fg); opacity: 0.6; }
.g-let-off-steam .ls-hint { margin: 0; font: 600 15px/1.3 var(--font-ui); color: var(--ui-fg); text-align: center; max-width: 34ch; text-wrap: balance; }
.g-let-off-steam .ls-card { position: relative; width: 100%; max-width: 420px; box-sizing: border-box; padding: 16px 18px 14px; border-radius: 16px; background: #fbf6ec; color: #2a2433; transform: rotate(-1.2deg);
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(0, 0, 0, 0.05); animation: ls-card 0.7s cubic-bezier(.2, 1.3, .4, 1) both; }
@keyframes ls-card { from { opacity: 0; transform: translateY(24px) rotate(3deg) scale(0.94); } to { opacity: 1; transform: rotate(-1.2deg); } }
.g-let-off-steam .ls-card::before { content: ""; position: absolute; left: 50%; top: -9px; width: 86px; height: 20px; margin-left: -43px; background: rgba(255, 196, 140, 0.8); transform: rotate(2deg); border-radius: 3px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15); }
.g-let-off-steam .ls-ck { font: 700 12px/1 var(--font-ui); letter-spacing: 0.16em; text-transform: uppercase; color: #9a5a36; }
.g-let-off-steam .ls-ct { display: flex; align-items: center; gap: 9px; margin: 6px 0 8px; font: 800 22px/1.1 var(--font-ui); color: #2a2433; }
.g-let-off-steam .ls-tin { width: 18px; height: 22px; border-radius: 4px; flex: none; box-shadow: inset 0 -5px 0 rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.2); }
.g-let-off-steam .ls-cl { margin: 0 0 10px; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 5px; }
.g-let-off-steam .ls-cl li { font: 600 15px/1.3 var(--font-ui); color: #3a3344; padding-left: 20px; position: relative; }
.g-let-off-steam .ls-cl li::before { content: ""; position: absolute; left: 3px; top: 7px; width: 8px; height: 8px; border-radius: 50%; background: var(--ls-tea, #e0a43a); }
.g-let-off-steam .ls-tiers { display: flex; gap: 6px; flex-wrap: wrap; }
.g-let-off-steam .ls-tier { display: inline-flex; align-items: center; gap: 8px; font: 800 13px/1 var(--font-ui); letter-spacing: 0.06em; text-transform: uppercase; padding: 7px 12px 7px 7px; border-radius: 999px; background: #2a2433; color: #fff; white-space: nowrap; }
.g-let-off-steam .ls-tier.nb { padding: 7px 12px; background: linear-gradient(90deg, #ffcf6b, #ff9a5a); color: #3a1c00; }
.g-let-off-steam .ls-medal { width: 22px; height: 22px; border-radius: 50%; flex: none; background: radial-gradient(circle at 35% 30%, #fff8d8, var(--m, #ffc84a) 58%, rgba(0, 0, 0, 0.35)); box-shadow: 0 0 9px var(--m, #ffc84a); }
.g-let-off-steam .gk-char .gk-char-img { transition: filter 0.6s ease; }
.g-let-off-steam .gk-char.ls-hot .gk-char-img { filter: drop-shadow(0 0 14px rgba(255, 90, 60, 0.75)) drop-shadow(0 8px 14px rgba(0, 0, 0, 0.35)); }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const TAU = K.TAU, clamp = K.clamp;
      const inten = ctx.intensity == null ? 1 : ctx.intensity;
      const visits = K.visits();
      const TEA = K.dailyPick(TEAS), TILE = K.dailyPick(TILES, 1), MUG = K.dailyPick(MUGS, 2), SKY = K.dailyPick(SKIES, 3);
      const tins = K.collection().filter(x => TEAS.some(tt => tt.name === x));
      const cat = visits >= 2;
      el.style.setProperty('--ls-tea', TEA.liq);

      /* the player's own heated thoughts ride the steam out; the heaviest one leaves last */
      const nT = [3, 4, 5][inten];
      const core = an.core && an.core.label ? an.core.label : '';
      let thoughts = (an.strands || []).map(s => s && s.label).filter(x => x && x !== core);
      thoughts = thoughts.slice(0, core ? nT - 1 : nT).concat(core ? [core] : []);
      for (let i = 0; thoughts.length < nT; i++) thoughts.push(GENERIC[i % GENERIC.length]);
      const TURNS = [2.4, 3, 3.5][inten], K_REL = 1 / (TURNS * TAU), OMEGA = [3.4, 2.8, 2.4][inten];
      const TMAX = [0.84, 0.73, 0.66][inten]; // the steepest tilt that still lands in the mug (Gentle is roomier)

      let stage = 0, finished = false, L = null;
      const W = { t: 0, P: 1, needle: 1, nv: 0, flow: 0, warm: 0, rain: 1, stars: 0, nudge: 0, flame: 1, valveGlow: 0, finT: 0, purr: 0, shriekT: -9, hearts: 0 };
      const V = { ang: 0, omega: 0, lastA: 0, lastT: 0, down: false, tick: 0, calmT: 0, fastT: 0, turnT: 0, shrieks: 0, stretch: 0, best: 0, lastShriek: 0, lines: 0, zone: 2, accA: 0, accT: 0, dir: 1, bar: -1, sync: 0, flash: 0, barPos: 0 };
      const PO = { tilt: 0, target: 0, fill: 0, spill: 0, spilling: false, spills: 0, down: false, full: false, a0: 0, t0: 0, vel: 0, land: null, spillSaid: false };
      const KT = { x: 0, base: 0, s: 1, tilt: 0 }, MG = { x: 0, w: 52, h: 48 };
      let released = 0;
      const ss = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
      const hs = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
      const mix = (a, b, k) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const c = (s) => Math.round(((pa >> s) & 255) + ((((pb >> s) & 255) - ((pa >> s) & 255)) * k)); return 'rgb(' + c(16) + ',' + c(8) + ',' + c(0) + ')'; };
      const flowAt = (tl) => clamp((tl - 0.3) / 0.52, 0, 1.3);

      /* ---------------- lines (every one in all three vibes) ---------------- */
      const LN = {
        intro: { Jolly: 'Kettle’s about to blow. Let’s let the steam out slowly, together.', Cheeky: 'This kettle is basically me right now. Help.', Unfiltered: 'Pressure’s in the red. We let it out slow, not all at once.' },
        back: { Jolly: 'Back in the kitchen! Kettle’s rumbling again. Slow hands?', Cheeky: 'Oh good, you’re back. The kettle missed you. Angrily.', Unfiltered: 'Kettle’s hot again. Same deal: slow release.' },
        step1: { Jolly: 'Circle the valve slowly. Smooth turns, smooth steam.', Cheeky: 'Turn it like you’re stirring honey, not winning a race.', Unfiltered: 'Turn it slowly. Fast just makes it shriek.' },
        fast: { Jolly: 'Eek! Too fast, it shrieks. Slow circles let it out.', Cheeky: 'SHRIEK. Yep, it hates being rushed. Like me.', Unfiltered: 'Too fast. It fights back. Slow down.' },
        out: { Jolly: 'There goes one. Let it float off.', Cheeky: 'Bye bye, hot thought.', Unfiltered: 'One out. Keep going.' },
        amber: { Jolly: 'Into the amber. You’re doing it.', Cheeky: 'Look at that needle drop. Smooth operator.', Unfiltered: 'Amber. Keep that pace.' },
        green: { Jolly: 'Green! Pressure’s down. Breathe out with it.', Cheeky: 'Green zone. Who knew patience worked?', Unfiltered: 'Green. Pressure’s gone.' },
        pour: { Jolly: 'Now pour. Gently, a little at a time.', Cheeky: 'Now the tricky bit: pour without a tidal wave.', Unfiltered: 'Pour it. Slow tilt. No splash.' },
        spill: { Jolly: 'Oops, easy does it. Tilt back a touch.', Cheeky: 'Splash! The counter didn’t want tea.', Unfiltered: 'Too far. Ease back.' },
        full: { Jolly: 'Perfect cup. Ease it back down.', Cheeky: 'Full! Barista energy.', Unfiltered: 'Full. Set it down.' },
        fin: { Jolly: 'Steam’s out, tea’s in. I feel… actually calm?', Cheeky: 'Look at me. Calm. Holding tea. Who even am I?', Unfiltered: 'Pressure: gone. Tea: hot. That’s the reset.' }
      };
      const say = (lines, o) => rush.say(ctx.line(lines), o);
      /* Kit bug workaround: the circle guide's label is positioned with var(--r), but --r is only set on a sibling element,
         so its transform is dropped and the label lands on top of the valve (and off-screen on phones). Give the anchor --r. */
      const guideAnchor = () => { const r0 = el.closest('.tsg'); return r0 ? r0.querySelector('.tsg-guide-anchor') : null; };
      function circleGuide(spec) { K.guide(spec); const a = guideAnchor(); if (a) a.style.setProperty('--r', (spec.r || 60) + 'px'); }
      S.onDestroy(() => { const a = guideAnchor(); if (a) a.style.removeProperty('--r'); });

      /* ---------------- world ---------------- */
      el.classList.toggle('ls-bright', !K.dark());
      const probe = h('div', { class: 'ls-probe', 'aria-hidden': 'true' });
      el.append(probe);
      const cv = K.canvas(el, { maxDpr: 1.75 }); // painterly scene: 1.75x reads identically on phones and is ~23% cheaper per frame
      let bg = null, bgWarm = null;
      const P = K.particles();
      const valveHit = h('div', { class: 'ls-valve', role: 'slider', tabindex: '0', 'aria-label': 'Steam valve. Circle it slowly to let the pressure out. Arrow keys turn it.', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '100', 'aria-valuetext': 'Pressure high' });
      const handleHit = h('div', { class: 'ls-handle', role: 'slider', tabindex: '0', hidden: true, 'aria-label': 'Kettle handle. Drag up to tilt and pour. Arrow keys tilt it.', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' });
      const hud = h('div', { class: 'ls-hud' });
      el.append(valveHit, handleHit, hud);
      const rush = K.character('rush', { side: 'right', mood: 'fume', x: 12, y: 600, size: el.clientWidth >= 700 ? 104 : 84 });
      rush.el.classList.add('ls-hot');
      const music = K.music('calm');
      music.level(0.3);

      /* ---------------- layout ---------------- */
      function kpt(lx, ly, k) { // kettle-local point → screen, following the kettle's tilt
        k = k || KT;
        const s = k.s, vx = (lx - PIV.x) * s, vy = (ly - PIV.y) * s, c = Math.cos(k.tilt), sn = Math.sin(k.tilt);
        return { x: k.x + PIV.x * s + vx * c + vy * sn, y: k.base + PIV.y * s - vx * sn + vy * c };
      }
      function layout() {
        const w = el.clientWidth || cv.w || 390, H = el.clientHeight || cv.h || 844;
        const cs = getComputedStyle(probe), insT = parseFloat(cs.paddingTop) || 0, insB = parseFloat(cs.paddingBottom) || 0;
        const wide = w >= 700, top = insT + 62, bottom = H - insB - 16;
        const l = { w, H, wide, top, bottom };
        if (!wide) {
          l.counter = Math.round(clamp(H * 0.655, 470, H - 250));
          l.s = clamp(w / 488, 0.7, 0.9);
          l.kx = Math.round(w * 0.6); l.kb = l.counter - 8;
          l.win = { x: 18, y: top + 24, w: Math.round(w * 0.36), h: Math.round(clamp(H * 0.19, 120, 176)) };
          l.gauge = { x: w - 62, y: top + 104, r: 44 };
          l.lamp = { x: l.kx, y: top + 34 };
          l.shelf = { x: 16, y: l.win.y + l.win.h + 70, w: l.win.w + 10 };
          l.sz = 84; l.rush = { x: 12, y: l.counter + 22 };
          l.hud = { x: 12, y: l.rush.y + l.sz + 10, w: w - 24 }; l.hud.h = bottom - l.hud.y;
          l.valveR = 112; l.handleR = 70; l.fs = 0.72;
          l.fRush = { x: 30, y: l.counter - l.sz - 4 };
          l.fHud = { x: 12, y: l.counter + 26, w: w - 24 }; l.fHud.h = bottom - l.fHud.y;
          l.tile = { w: 34, h: 17 };
        } else {
          l.counter = Math.round(H * 0.68);
          l.s = clamp(H / 690, 1, 1.3);
          l.kx = Math.round(w * 0.52); l.kb = l.counter - 10;
          l.win = { x: Math.round(w * 0.06), y: top + 34, w: Math.round(w * 0.23), h: Math.round(H * 0.31) };
          l.gauge = { x: Math.round(l.kx + 170 * l.s + 120), y: top + 140, r: 64 };
          l.lamp = { x: l.kx, y: top + 26 };
          l.shelf = { x: Math.round(w * 0.79), y: top + 330, w: Math.round(w * 0.17) };
          l.sz = 104; l.rush = { x: 56, y: l.counter + 34 };
          l.hud = { x: Math.round(w * 0.42), y: l.counter + 24, w: Math.round(Math.min(600, w * 0.5)) }; l.hud.h = bottom - l.hud.y;
          l.valveR = 150; l.handleR = 88; l.fs = 0.92;
          l.fRush = { x: Math.round(l.kx - 330 * l.s), y: l.counter - l.sz - 6 };
          l.fHud = l.hud;
          l.tile = { w: 46, h: 23 };
        }
        // the mug sits under the whole gentle pour: from the first trickle to the steepest safe tilt
        const land = (th) => { const tp = kpt(TIP.x, TIP.y, { x: l.kx, base: l.kb, s: l.s, tilt: th }); return { x: tp.x - (4 + flowAt(th) * 22) * l.s, y: tp.y }; };
        const a1 = land(0.35), a2 = land(TMAX);
        l.mug = { x: (a1.x + a2.x) / 2, w: Math.max(52 * l.s, Math.abs(a1.x - a2.x) + 14 * l.s), h: clamp(l.counter - (a2.y + 12 * l.s), 34 * l.s, 72 * l.s) };
        const fw = l.mug.w * 1.32;
        l.fmug = { x: l.fRush.x + l.sz + 14 + fw / 2, w: fw, h: l.mug.h * 1.32 };
        l.fkx = Math.max(l.kx, l.fmug.x + fw / 2 + 14 * l.s + 152 * l.fs * l.s); // the resting kettle's spout clears the mug
        l.valve = kpt(VALVE.x, VALVE.y, { x: l.kx, base: l.kb, s: l.s, tilt: 0 });
        l.handle = kpt(HANDLE.x, HANDLE.y, { x: l.kx, base: l.kb, s: l.s, tilt: 0 });
        l.pivot = { x: l.kx + PIV.x * l.s, y: l.kb };
        l.rail = wide ? { x: l.win.x + 10, y: l.win.y + l.win.h + 64, w: Math.min(l.win.w - 20, l.mug.x - l.mug.w / 2 - 40 - l.win.x) } : { x: l.win.x + 4, y: l.shelf.y + 56, w: Math.min(l.win.w - 12, 100) };
        L = l;
        if (!KT.x || stage < 3) { KT.x = l.kx; KT.s = l.s; MG.x = l.mug.x; MG.w = l.mug.w; MG.h = l.mug.h; }
        KT.base = l.kb;
        const box = (node, x, y, ww, hh) => { node.style.left = x + 'px'; node.style.top = y + 'px'; node.style.width = ww + 'px'; node.style.height = hh + 'px'; };
        box(valveHit, l.valve.x - l.valveR, l.valve.y - l.valveR, l.valveR * 2, l.valveR * 2);
        box(handleHit, l.handle.x - l.handleR, l.handle.y - l.handleR, l.handleR * 2, l.handleR * 2);
        const hr = stage >= 3 ? l.fHud : l.hud;
        box(hud, hr.x, hr.y, hr.w, hr.h);
        rush.el.style.setProperty('--sz', l.sz + 'px');
        const rp = stage >= 3 ? l.fRush : l.rush;
        rush.place(rp.x, rp.y);
        renderBg();
      }

      /* ---------------- the kitchen, cached (resize, theme, the finale's warm light) ---------------- */
      function rr(g, x, y, w, hh, r) { r = Math.max(0, Math.min(r, w / 2, hh / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      function tin(g, x, y, w, hh, col, lidCol) {
        g.fillStyle = col; rr(g, x, y, w, hh, 3); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x + 2, y + 3, w * 0.22, hh - 6);
        g.fillStyle = lidCol || 'rgba(0,0,0,0.25)'; rr(g, x - 1, y - 3, w + 2, 5, 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.75)'; rr(g, x + w * 0.18, y + hh * 0.38, w * 0.64, hh * 0.28, 2); g.fill();
      }
      function paintKitchen(warm) {
        const w = cv.w, H = cv.h, d = cv.dpr, dark = K.dark(), l = L;
        const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * d)); c.height = Math.max(1, Math.round(H * d));
        const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
        // tiled wall (subway tiles with grout and a soft gloss)
        const base = warm ? mix(dark ? TILE.d : TILE.b, dark ? '#5e4330' : '#f7dfbf', 0.5) : (dark ? TILE.d : TILE.b);
        const grout = warm ? mix(dark ? TILE.g : TILE.bg, dark ? '#3e2a1e' : '#e2c29a', 0.5) : (dark ? TILE.g : TILE.bg);
        g.fillStyle = grout; g.fillRect(0, 0, w, l.counter);
        const tw = l.tile.w, th = l.tile.h;
        for (let row = 0, y = 0; y < l.counter; row++, y += th) {
          for (let x = (row % 2) ? -tw / 2 : 0, i = 0; x < w; x += tw, i++) {
            const v = hs(row * 31 + i * 7) * 0.08;
            g.fillStyle = base; g.globalAlpha = 1; rr(g, x + 1, y + 1, tw - 2, th - 2, 2.5); g.fill();
            g.globalAlpha = dark ? 0.05 + v : 0.12 + v; g.fillStyle = '#ffffff'; g.fillRect(x + 2, y + 2, tw - 4, (th - 4) * 0.4);
          }
        }
        g.globalAlpha = 1;
        const wallShade = g.createLinearGradient(0, 0, 0, l.counter);
        wallShade.addColorStop(0, dark ? 'rgba(4,8,20,0.55)' : 'rgba(60,50,40,0.12)'); wallShade.addColorStop(0.55, 'rgba(0,0,0,0)'); wallShade.addColorStop(1, dark ? 'rgba(4,8,20,0.35)' : 'rgba(60,50,40,0.1)');
        g.fillStyle = wallShade; g.fillRect(0, 0, w, l.counter);
        // pressure pipe from the hob up to the wall gauge
        const gx = l.gauge.x, gy = l.gauge.y, gr = l.gauge.r;
        g.strokeStyle = dark ? '#a8653a' : '#c27a46'; g.lineWidth = 6 * (l.wide ? 1.2 : 1); g.lineCap = 'round';
        g.beginPath(); g.moveTo(gx, gy + gr); g.lineTo(gx, l.counter - 30); g.quadraticCurveTo(gx, l.counter - 12, gx - 18, l.counter - 12); g.lineTo(l.kx + 90 * l.s, l.counter - 12); g.stroke();
        g.strokeStyle = 'rgba(255,220,180,0.35)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(gx - 1.5, gy + gr); g.lineTo(gx - 1.5, l.counter - 30); g.stroke();
        // gauge face
        g.save(); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 14; g.shadowOffsetY = 5;
        const bz = g.createLinearGradient(gx - gr, gy - gr, gx + gr, gy + gr); bz.addColorStop(0, '#f6d68a'); bz.addColorStop(0.5, '#c8902f'); bz.addColorStop(1, '#7d5216');
        g.fillStyle = bz; g.beginPath(); g.arc(gx, gy, gr + 6, 0, TAU); g.fill(); g.restore();
        const face = g.createRadialGradient(gx - gr * 0.3, gy - gr * 0.3, gr * 0.1, gx, gy, gr);
        face.addColorStop(0, '#fffdf6'); face.addColorStop(1, '#eadfc8');
        g.fillStyle = face; g.beginPath(); g.arc(gx, gy, gr, 0, TAU); g.fill();
        const arc = (a0, a1, col) => { g.strokeStyle = col; g.lineWidth = gr * 0.16; g.lineCap = 'butt'; g.beginPath(); g.arc(gx, gy, gr * 0.78, a0, a1); g.stroke(); };
        const A0 = Math.PI * 0.75, SW = Math.PI * 1.5;
        arc(A0, A0 + SW * 0.34, '#36c486'); arc(A0 + SW * 0.34, A0 + SW * 0.67, '#ffbf3f'); arc(A0 + SW * 0.67, A0 + SW, '#ff4a3d');
        g.strokeStyle = '#3a3344'; g.lineCap = 'round';
        for (let i = 0; i <= 10; i++) { const a = A0 + SW * i / 10, r0 = gr * (i % 5 ? 0.6 : 0.55), r1 = gr * 0.68; g.lineWidth = i % 5 ? 1.4 : 2.4; g.beginPath(); g.moveTo(gx + Math.cos(a) * r0, gy + Math.sin(a) * r0); g.lineTo(gx + Math.cos(a) * r1, gy + Math.sin(a) * r1); g.stroke(); }
        g.fillStyle = '#5a4a3a'; g.font = '800 ' + Math.max(12, Math.round(gr * 0.24)) + 'px ' + (getComputedStyle(el).fontFamily || 'sans-serif'); g.textAlign = 'center';
        g.fillText('PRESSURE', gx, gy + gr * 0.62);
        const gl = g.createLinearGradient(gx, gy - gr, gx, gy); gl.addColorStop(0, 'rgba(255,255,255,0.55)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gl; g.beginPath(); g.ellipse(gx, gy - gr * 0.42, gr * 0.72, gr * 0.42, 0, Math.PI, TAU); g.fill();
        // pendant lamp (the light itself is drawn live)
        const lx = l.lamp.x, ly = l.lamp.y, lw = (l.wide ? 46 : 34);
        g.strokeStyle = dark ? '#0b0f1a' : '#3a3344'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx, ly); g.stroke();
        const sh = g.createLinearGradient(lx - lw, 0, lx + lw, 0); sh.addColorStop(0, '#2f5f5a'); sh.addColorStop(0.45, '#4f9a90'); sh.addColorStop(1, '#1d3d3a');
        g.fillStyle = sh; g.beginPath(); g.moveTo(lx - lw * 0.32, ly); g.lineTo(lx + lw * 0.32, ly); g.lineTo(lx + lw, ly + lw * 0.62); g.lineTo(lx - lw, ly + lw * 0.62); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(lx - lw * 0.22, ly + 3); g.lineTo(lx - lw * 0.05, ly + 3); g.lineTo(lx - lw * 0.45, ly + lw * 0.58); g.lineTo(lx - lw * 0.78, ly + lw * 0.58); g.closePath(); g.fill();
        // shelf with the tea tins collected on earlier visits
        const sx = l.shelf.x, sy = l.shelf.y, sw = l.shelf.w, ts = l.wide ? 1.3 : 1;
        g.fillStyle = dark ? '#5a3c28' : '#b98a5e'; rr(g, sx, sy, sw, 8 * ts, 3); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(sx + 6, sy + 8 * ts, sw - 12, 3);
        const shown = tins.slice(-6);
        const slots = Math.max(4, shown.length);
        for (let i = 0; i < slots; i++) {
          const x = sx + 8 + i * (sw - 16) / slots, wT = 18 * ts, hT = (22 + (i % 3) * 4) * ts;
          const tName = shown[i];
          if (tName) { const tt = TEAS.find(q => q.name === tName); tin(g, x, sy - hT, wT, hT, tt ? tt.tin : '#ccc'); }
          else if (i === shown.length) { g.fillStyle = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'; g.setLineDash([3, 3]); g.strokeStyle = g.fillStyle; g.lineWidth = 1.5; rr(g, x, sy - hT, wT, hT, 3); g.stroke(); g.setLineDash([]); }
          else if (i < slots && i % 2) { g.fillStyle = dark ? '#3d6b4f' : '#5aa070'; g.beginPath(); g.ellipse(x + wT / 2, sy - 8 * ts, 8 * ts, 9 * ts, 0, 0, TAU); g.fill(); g.fillStyle = '#c56a3e'; g.fillRect(x + wT / 2 - 6 * ts, sy - 6 * ts, 12 * ts, 6 * ts); }
        }
        // a rail of hanging utensils on the left wall
        const ra = l.rail, us = l.wide ? 1.3 : 1, steel = dark ? '#a3acba' : '#8a93a3', wood = '#b9824e';
        g.save(); g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 5; g.shadowOffsetY = 3;
        g.fillStyle = dark ? '#b8914c' : '#a07a3a'; rr(g, ra.x, ra.y - 3, ra.w, 6, 3); g.fill();
        const kinds = l.wide ? ['ladle', 'whisk', 'spatula', 'spoon'] : ['ladle', 'whisk', 'spoon'];
        kinds.forEach((k, i) => {
          const x = ra.x + ra.w * ((i + 0.5) / kinds.length), y = ra.y + 4, Lu = (k === 'whisk' ? 46 : k === 'spoon' ? 54 : 58) * us;
          g.strokeStyle = '#8a8f99'; g.lineWidth = 1.6; g.lineCap = 'round'; g.beginPath(); g.arc(x, y + 2, 4 * us, -Math.PI * 0.95, Math.PI * 0.5); g.stroke();
          g.lineCap = 'round';
          if (k === 'ladle') { g.strokeStyle = steel; g.lineWidth = 3 * us; g.beginPath(); g.moveTo(x, y + 6 * us); g.lineTo(x, y + Lu * 0.74); g.stroke(); g.fillStyle = steel; g.beginPath(); g.arc(x, y + Lu * 0.74, 10 * us, 0, Math.PI); g.closePath(); g.fill(); }
          else if (k === 'whisk') { g.strokeStyle = wood; g.lineWidth = 4 * us; g.beginPath(); g.moveTo(x, y + 6 * us); g.lineTo(x, y + Lu * 0.4); g.stroke(); g.strokeStyle = steel; g.lineWidth = 1.3; [0.35, 0.7, 1].forEach(q => { g.beginPath(); g.ellipse(x, y + Lu * 0.7, 8 * us * q, Lu * 0.3, 0, 0, TAU); g.stroke(); }); }
          else if (k === 'spatula') { g.strokeStyle = wood; g.lineWidth = 4 * us; g.beginPath(); g.moveTo(x, y + 6 * us); g.lineTo(x, y + Lu * 0.6); g.stroke(); g.fillStyle = steel; rr(g, x - 8 * us, y + Lu * 0.6, 16 * us, Lu * 0.4, 3 * us); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - 3 * us, y + Lu * 0.66); g.lineTo(x - 3 * us, y + Lu * 0.92); g.moveTo(x + 3 * us, y + Lu * 0.66); g.lineTo(x + 3 * us, y + Lu * 0.92); g.stroke(); }
          else { g.strokeStyle = wood; g.lineWidth = 3.6 * us; g.beginPath(); g.moveTo(x, y + 6 * us); g.lineTo(x, y + Lu * 0.78); g.stroke(); g.fillStyle = wood; g.beginPath(); g.ellipse(x, y + Lu * 0.86, 7 * us, 11 * us, 0, 0, TAU); g.fill(); }
        });
        g.restore();
        // counter, hob and cabinets
        const cy = l.counter, ct = l.wide ? 22 : 16;
        const top2 = g.createLinearGradient(0, cy, 0, cy + ct); top2.addColorStop(0, dark ? '#c9b08a' : '#e9d6b4'); top2.addColorStop(1, dark ? '#8a7154' : '#c7ab84');
        g.save(); g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
        g.fillStyle = top2; g.fillRect(0, cy, w, ct); g.restore();
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, cy, w, 1.5);
        const cab = g.createLinearGradient(0, cy + ct, 0, H); cab.addColorStop(0, dark ? '#24304a' : '#cfd9e6'); cab.addColorStop(1, dark ? '#0d1220' : '#aab7c9');
        g.fillStyle = cab; g.fillRect(0, cy + ct, w, H - cy - ct);
        const doors = l.wide ? 5 : 3, dw = w / doors;
        for (let i = 0; i < doors; i++) {
          const x = i * dw + 8, y = cy + ct + 10;
          g.strokeStyle = dark ? 'rgba(255,255,255,0.08)' : 'rgba(40,50,70,0.15)'; g.lineWidth = 2; rr(g, x, y, dw - 16, H - y - 10, 8); g.stroke();
          g.strokeStyle = dark ? 'rgba(255,255,255,0.05)' : 'rgba(40,50,70,0.1)'; rr(g, x + 10, y + 10, dw - 36, H - y - 30, 6); g.stroke();
          g.fillStyle = dark ? '#c8a25a' : '#9a7a3a'; rr(g, x + dw / 2 - 22, y + 14, 28, 5, 2.5); g.fill();
        }
        const hx = l.kx, hy = l.counter - 4;
        g.fillStyle = dark ? '#151a24' : '#3a404c'; g.beginPath(); g.ellipse(hx, hy, 112 * l.s, 12 * l.s, 0, 0, TAU); g.fill();
        g.strokeStyle = dark ? '#3a4252' : '#6a7282'; g.lineWidth = 3 * l.s; g.beginPath(); g.ellipse(hx, hy - 2, 76 * l.s, 8 * l.s, 0, 0, TAU); g.stroke();
        // window frame shadow on the wall (the glass and weather are drawn live)
        const wr = l.win;
        g.save(); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 16; g.shadowOffsetY = 6;
        g.fillStyle = dark ? '#d8cfc0' : '#fffaf0'; rr(g, wr.x - 8, wr.y - 8, wr.w + 16, wr.h + 16, 10); g.fill(); g.restore();
        g.fillStyle = dark ? '#cfc4b2' : '#f1e9da'; rr(g, wr.x - 14, wr.y + wr.h + 6, wr.w + 28, 10, 4); g.fill();
        // vignette, then the lamp's colour of light
        const vg = g.createRadialGradient(w / 2, H * 0.45, Math.min(w, H) * 0.3, w / 2, H * 0.5, Math.max(w, H) * 0.8);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, dark ? 'rgba(0,0,10,0.45)' : 'rgba(40,30,20,0.12)');
        g.fillStyle = vg; g.fillRect(0, 0, w, H);
        // the lamp's cone and bulb (cool blue, or warm amber for the finale; the two cached kitchens crossfade)
        const col = warm ? [255, 190, 120] : [170, 205, 255];
        g.save(); g.globalCompositeOperation = dark ? 'lighter' : 'source-over';
        const y0 = ly + lw * 0.62, cg = g.createLinearGradient(0, y0, 0, l.counter);
        cg.addColorStop(0, 'rgba(' + col + ',' + (dark ? 0.2 : 0.16) + ')'); cg.addColorStop(1, 'rgba(' + col + ',0)');
        g.fillStyle = cg; g.beginPath(); g.moveTo(lx - lw * 0.92, y0); g.lineTo(lx + lw * 0.92, y0); g.lineTo(lx + lw * 4.2, l.counter); g.lineTo(lx - lw * 4.2, l.counter); g.closePath(); g.fill();
        const bulb = g.createRadialGradient(lx, y0, 0, lx, y0, lw * 1.4);
        bulb.addColorStop(0, 'rgba(' + col + ',0.9)'); bulb.addColorStop(1, 'rgba(' + col + ',0)');
        g.fillStyle = bulb; g.fillRect(lx - lw * 1.4, y0 - lw * 1.4, lw * 2.8, lw * 2.8);
        g.restore();
        const tint = g.createRadialGradient(lx, ly + 40, 10, lx, ly + 40, Math.max(w, H) * 0.9);
        if (warm) { tint.addColorStop(0, 'rgba(255,214,150,0.30)'); tint.addColorStop(0.55, 'rgba(255,178,120,0.13)'); tint.addColorStop(1, 'rgba(90,40,60,0.12)'); }
        else { tint.addColorStop(0, dark ? 'rgba(120,170,255,0.14)' : 'rgba(150,190,255,0.10)'); tint.addColorStop(1, dark ? 'rgba(10,20,60,0.22)' : 'rgba(80,110,170,0.08)'); }
        g.fillStyle = tint; g.fillRect(0, 0, w, H);
        return c;
      }
      function renderBg() { if (!L || !cv.w) return; bg = paintKitchen(0); if (bgWarm) bgWarm = paintKitchen(1); }
      S.on('theme', () => { el.classList.toggle('ls-bright', !K.dark()); renderBg(); });

      /* ---------------- live drawing ---------------- */
      const DROPS = Array.from({ length: 44 }, (_, i) => ({ x: hs(i * 2.1 + 1), y: hs(i * 5.7 + 2), s: 0.6 + hs(i * 3.3) * 0.8 }));
      const STARS = Array.from({ length: 30 }, (_, i) => ({ x: hs(i * 7.3 + 4), y: hs(i * 1.7 + 9) * 0.75, s: 0.8 + hs(i * 4.1) * 1.3, p: hs(i * 9.9) * 6 }));
      function drawWindow(g, t) {
        const r = L.win, dark = K.dark();
        g.save(); rr(g, r.x, r.y, r.w, r.h, 5); g.clip();
        const sky = g.createLinearGradient(0, r.y, 0, r.y + r.h);
        sky.addColorStop(0, mix(dark ? '#0a1330' : '#2a3d78', '#101a44', W.stars * 0.5)); sky.addColorStop(1, mix(dark ? '#22325e' : '#6176b6', '#2a2a5a', W.stars * 0.4));
        g.fillStyle = sky; g.fillRect(r.x, r.y, r.w, r.h);
        if (W.stars > 0.01) {
          g.fillStyle = '#fff';
          STARS.forEach(s => { g.globalAlpha = W.stars * (0.55 + 0.45 * Math.sin(t * 2 + s.p)); g.fillRect(r.x + s.x * r.w, r.y + s.y * r.h, s.s, s.s); });
          g.globalAlpha = W.stars; const mx = r.x + r.w * 0.74, my = r.y + r.h * 0.26, mr = Math.min(r.w, r.h) * 0.1;
          const mg = g.createRadialGradient(mx, my, mr * 0.4, mx, my, mr * 3.2); mg.addColorStop(0, 'rgba(255,244,214,0.5)'); mg.addColorStop(1, 'rgba(255,244,214,0)');
          g.fillStyle = mg; g.fillRect(mx - mr * 3.2, my - mr * 3.2, mr * 6.4, mr * 6.4);
          g.fillStyle = '#fff4d6'; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill(); g.globalAlpha = 1;
        }
        // rooftops with lit windows
        g.fillStyle = dark ? '#060b1a' : '#1d2a52';
        const bw = r.w / 5;
        for (let i = 0; i < 5; i++) { const bh = r.h * (0.18 + hs(i * 3.7) * 0.22); g.fillRect(r.x + i * bw, r.y + r.h - bh, bw - 2, bh); }
        g.fillStyle = 'rgba(255,214,130,0.85)';
        for (let i = 0; i < 9; i++) { if (hs(i * 8.1 + 3) < 0.45) continue; g.fillRect(r.x + hs(i * 2.9) * r.w * 0.94, r.y + r.h * (0.86 + hs(i * 1.3) * 0.1), 3, 3); }
        // the weather outside
        const amt = W.rain;
        if (amt > 0.01) {
          if (SKY === 'snow') {
            g.fillStyle = 'rgba(255,255,255,0.9)';
            DROPS.forEach((d, i) => { if (i > DROPS.length * amt) return; const x = r.x + ((d.x * r.w + Math.sin(t * 0.8 + i) * 8) % r.w + r.w) % r.w, y = r.y + ((d.y * r.h + t * 22 * d.s) % r.h); g.beginPath(); g.arc(x, y, 1.2 + d.s, 0, TAU); g.fill(); });
          } else {
            const n = Math.round(DROPS.length * amt * (SKY === 'drizzle' ? 0.55 : 1));
            g.strokeStyle = 'rgba(190,215,255,0.55)'; g.lineWidth = 1.2; g.beginPath();
            for (let i = 0; i < n; i++) { const d = DROPS[i], x = r.x + ((d.x * r.w + t * 30) % r.w), y = r.y + ((d.y * r.h + t * 300 * d.s) % (r.h + 20)) - 10; g.moveTo(x, y); g.lineTo(x - 3, y + 9 + d.s * 6); }
            g.stroke();
            g.fillStyle = 'rgba(210,230,255,0.45)';
            for (let i = 0; i < 9; i++) { const x = r.x + hs(i * 4.4) * r.w, y = r.y + ((hs(i * 6.1) * r.h + t * (6 + i)) % r.h); g.beginPath(); g.arc(x, y, 1.6 + hs(i) * 1.6, 0, TAU); g.fill(); }
          }
        }
        const glass = g.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h); glass.addColorStop(0, 'rgba(255,255,255,0.1)'); glass.addColorStop(0.5, 'rgba(255,255,255,0)'); glass.addColorStop(1, 'rgba(255,255,255,0.06)');
        g.fillStyle = glass; g.fillRect(r.x, r.y, r.w, r.h);
        g.restore();
        g.fillStyle = dark ? '#d8cfc0' : '#fffaf0'; g.fillRect(r.x + r.w / 2 - 3, r.y, 6, r.h); g.fillRect(r.x, r.y + r.h * 0.48 - 3, r.w, 6);
        if (cat) drawCat(g, r.x + r.w * 0.24, r.y + r.h + 6, L.wide ? 1.35 : 1, t);
      }
      function drawCat(g, x, y, s, t) { // a sleepy cat on the windowsill (from the third visit)
        g.save(); g.translate(x, y); g.scale(s, s);
        g.fillStyle = '#2a2433';
        g.beginPath(); g.ellipse(0, -10, 19, 11, 0, 0, TAU); g.fill();
        g.beginPath(); g.arc(15, -15, 8, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(10, -21); g.lineTo(12, -29); g.lineTo(16, -22); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(17, -22); g.lineTo(21, -29); g.lineTo(22, -19); g.closePath(); g.fill();
        g.strokeStyle = '#2a2433'; g.lineWidth = 4; g.lineCap = 'round';
        const sw = Math.sin(t * 1.6) * 0.5;
        g.beginPath(); g.moveTo(-17, -6); g.quadraticCurveTo(-30, -6 + sw * 8, -27, -18 + sw * 6); g.stroke();
        const awake = W.purr;
        g.strokeStyle = awake > 0.5 ? '#ffd36b' : 'rgba(255,255,255,0.55)'; g.lineWidth = 1.4;
        if (awake > 0.5) { g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(13, -16, 1.6, 0, TAU); g.arc(19, -16, 1.6, 0, TAU); g.fill(); }
        else { g.beginPath(); g.moveTo(11, -15); g.quadraticCurveTo(13, -13.5, 15, -15); g.moveTo(17, -15); g.quadraticCurveTo(19, -13.5, 21, -15); g.stroke(); }
        g.restore();
      }
      function drawFlames(g, t) {
        if (W.flame <= 0.02) return;
        const s = KT.s, n = 11, cx = L.kx, cy = L.counter - 6;
        g.save(); g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < n; i++) {
          const a = Math.PI * (0.08 + 0.84 * i / (n - 1)), x = cx + Math.cos(a) * 76 * s, y = cy + Math.sin(a) * 6 * s;
          const fh = (9 + 6 * W.flame + Math.sin(t * 17 + i * 1.7) * 2.2) * s * W.flame, fw = 4.2 * s;
          const fg = g.createLinearGradient(0, y - fh, 0, y);
          fg.addColorStop(0, 'rgba(120,190,255,0)'); fg.addColorStop(0.5, 'rgba(90,150,255,0.75)'); fg.addColorStop(1, 'rgba(200,240,255,0.95)');
          g.fillStyle = fg; g.beginPath(); g.moveTo(x - fw, y); g.quadraticCurveTo(x - fw * 0.8, y - fh * 0.55, x, y - fh); g.quadraticCurveTo(x + fw * 0.8, y - fh * 0.55, x + fw, y); g.closePath(); g.fill();
        }
        g.restore();
      }
      function kettleBody(g) {
        g.beginPath();
        g.moveTo(-98, -6);
        g.bezierCurveTo(-116, -46, -104, -112, -56, -134);
        g.quadraticCurveTo(0, -152, 56, -134);
        g.bezierCurveTo(104, -112, 116, -46, 98, -6);
        g.quadraticCurveTo(96, 2, 86, 2); g.lineTo(-86, 2); g.quadraticCurveTo(-96, 2, -98, -6);
        g.closePath();
      }
      function drawKettle(g, t) {
        const P0 = W.P, tremble = stage <= 1 ? P0 : 0;
        g.save();
        g.translate(KT.x + PIV.x * KT.s, KT.base); g.rotate(-KT.tilt); g.scale(KT.s, KT.s); g.translate(-PIV.x, 0);
        if (tremble > 0.05 && !K.reduced()) g.translate(Math.sin(t * 47) * tremble * 0.9, Math.sin(t * 39) * tremble * 0.5);
        // shadow on the hob
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(0, 4, 104, 9, 0, 0, TAU); g.fill();
        // spout (behind the body)
        const sp = g.createLinearGradient(-150, -130, -90, -40); sp.addColorStop(0, '#ff7d6c'); sp.addColorStop(0.5, '#d8392f'); sp.addColorStop(1, '#8e1f1a');
        g.fillStyle = sp; g.beginPath(); g.moveTo(-94, -34); g.bezierCurveTo(-124, -44, -136, -84, -156, -120); g.lineTo(-142, -130); g.bezierCurveTo(-126, -98, -112, -78, -86, -76); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-104, -70); g.bezierCurveTo(-120, -82, -130, -100, -142, -120); g.stroke();
        // body: glossy red enamel
        const bd = g.createRadialGradient(-40, -100, 10, 0, -60, 150);
        bd.addColorStop(0, '#ff9a88'); bd.addColorStop(0.35, '#ec4a3e'); bd.addColorStop(0.8, '#a8261f'); bd.addColorStop(1, '#6e1512');
        g.fillStyle = bd; kettleBody(g); g.fill();
        g.save(); kettleBody(g); g.clip();
        g.fillStyle = 'rgba(20,10,10,0.35)'; g.fillRect(-120, -18, 240, 22);
        g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(-120, -21, 240, 3);
        const hl = g.createLinearGradient(-80, -130, -30, -40); hl.addColorStop(0, 'rgba(255,255,255,0.75)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = hl; g.beginPath(); g.ellipse(-52, -92, 15, 38, 0.5, 0, TAU); g.fill();
        g.fillStyle = 'rgba(' + (W.warm > 0.3 ? '255,200,130' : '170,205,255') + ',0.25)'; g.beginPath(); g.ellipse(36, -112, 26, 9, -0.25, 0, TAU); g.fill();
        g.restore();
        // lid, stem and the brass release valve
        const lidJ = stage <= 1 && !K.reduced() ? Math.sin(t * 31) * P0 * 1.4 : 0;
        g.save(); g.translate(0, lidJ);
        const ld = g.createLinearGradient(-50, -150, 50, -130); ld.addColorStop(0, '#e9edf3'); ld.addColorStop(0.5, '#9aa3b1'); ld.addColorStop(1, '#5d6574');
        g.fillStyle = ld; g.beginPath(); g.ellipse(0, -137, 50, 10, 0, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(0, -142, 38, 9, 0, Math.PI, TAU); g.fill();
        g.fillStyle = '#6a7282'; g.fillRect(-5, -156, 10, 14);
        const glow = W.valveGlow;
        if (glow > 0.02) { const vg = g.createRadialGradient(0, -160, 4, 0, -160, 44); vg.addColorStop(0, 'rgba(255,214,120,' + (0.55 * glow) + ')'); vg.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = vg; g.fillRect(-44, -204, 88, 88); }
        g.save(); g.translate(0, -160); g.rotate(V.ang);
        g.strokeStyle = '#7d5216'; g.lineWidth = 9; g.beginPath(); g.arc(0, 0, 21, 0, TAU); g.stroke();
        g.strokeStyle = '#f2c766'; g.lineWidth = 5.5; g.beginPath(); g.arc(0, 0, 21, 0, TAU); g.stroke();
        g.strokeStyle = '#d9a441'; g.lineWidth = 5; g.lineCap = 'round';
        for (let i = 0; i < 4; i++) { const a = i * TAU / 4; g.beginPath(); g.moveTo(Math.cos(a) * 5, Math.sin(a) * 5); g.lineTo(Math.cos(a) * 19, Math.sin(a) * 19); g.stroke(); }
        g.fillStyle = '#ffe3a0'; g.beginPath(); g.arc(18, 0, 3.4, 0, TAU); g.fill();
        g.fillStyle = '#b07a1e'; g.beginPath(); g.arc(0, 0, 6.5, 0, TAU); g.fill();
        g.restore();
        g.restore();
        // handle
        g.lineCap = 'round';
        g.strokeStyle = '#1f1a22'; g.lineWidth = 15; g.beginPath(); g.moveTo(84, -110); g.bezierCurveTo(150, -118, 158, -24, 90, -30); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(98, -110); g.bezierCurveTo(140, -110, 146, -50, 120, -38); g.stroke();
        // the whistle on the spout: it trembles with the pressure and shrieks when rushed
        const shriek = clamp(1 - (W.t - W.shriekT) / 0.6, 0, 1);
        g.save(); g.translate(-150, -126); g.rotate(-1.02 + (K.reduced() ? 0 : Math.sin(t * 61) * (tremble * 0.07 + shriek * 0.22)));
        g.fillStyle = '#d9a441'; rr(g, -9, -7, 18, 14, 3); g.fill();
        g.fillStyle = '#f5d27a'; rr(g, -9, -7, 18, 4, 2); g.fill();
        g.fillStyle = '#7d5216'; g.fillRect(-2, -10, 4, 4);
        g.restore();
        g.restore();
      }
      /* the pace light: one slow lap per bar of the music (about one long out-breath); follow it and the kettle sighs in time */
      const SPB0 = 60 / 64;
      function beat() {
        const m = music;
        if (A.ctx && m && m.on && m.next > 0) { const spb = 60 / m.bpm, now = A.now() - A.latency(), k = (now - m.next) / spb, fl = Math.floor(k); return { pos: m.beat + fl + (k - fl), spb }; }
        return { pos: W.t / SPB0, spb: SPB0 };
      }
      function paceTick() {
        const b = beat(), bar = Math.floor(b.pos / 4);
        V.barPos = ((b.pos / 4) % 1 + 1) % 1;
        if (bar === V.bar) return;
        V.bar = bar;
        if (stage !== 1 || !V.down) return;
        const pace = TAU / (4 * b.spb);
        if (V.omega > pace * 0.5 && V.omega < pace * 1.7 && V.omega <= OMEGA) {
          V.sync++; V.flash = 1;
          if (A.ctx) A.chime(A.note(['C6', 'E6', 'G6', 'A6'][V.sync % 4]), { vol: 0.04, dur: 1.2 });
          if (V.sync === 3) K.pop('In sync', { x: L.valve.x, y: L.valve.y - (L.wide ? 120 : 92), kind: 'good' });
        }
      }
      function drawPace(g) {
        if (stage !== 1) return;
        const c = L.valve, r = (L.wide ? 54 : 42) + 13, dir = V.dir >= 0 ? 1 : -1, a = -Math.PI / 2 + dir * V.barPos * TAU;
        g.strokeStyle = 'rgba(255,236,190,' + (0.16 + 0.3 * V.flash) + ')'; g.lineWidth = 1.5 + 2 * V.flash; g.setLineDash([2, 7]);
        g.beginPath(); g.arc(c.x, c.y, r, 0, TAU); g.stroke(); g.setLineDash([]);
        for (let i = 0; i < 4; i++) { const ta = -Math.PI / 2 + i * Math.PI / 2; g.fillStyle = 'rgba(255,236,190,0.45)'; g.beginPath(); g.arc(c.x + Math.cos(ta) * r, c.y + Math.sin(ta) * r, 2.2, 0, TAU); g.fill(); }
        const px = c.x + Math.cos(a) * r, py = c.y + Math.sin(a) * r;
        const gl = g.createRadialGradient(px, py, 0, px, py, 15); gl.addColorStop(0, 'rgba(255,240,200,0.95)'); gl.addColorStop(1, 'rgba(255,214,140,0)');
        g.fillStyle = gl; g.fillRect(px - 15, py - 15, 30, 30);
        g.fillStyle = '#fffbea'; g.beginPath(); g.arc(px, py, 4.2, 0, TAU); g.fill();
      }
      function drawSpeedRing(g) {
        if (stage !== 1) return;
        const c = L.valve, r = (L.wide ? 54 : 42), k = clamp(V.omega / (OMEGA * 1.6), 0, 1);
        g.lineCap = 'round';
        g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 5; g.beginPath(); g.arc(c.x, c.y, r, -Math.PI / 2, Math.PI * 1.5); g.stroke();
        g.strokeStyle = 'rgba(54,196,134,0.28)'; g.beginPath(); g.arc(c.x, c.y, r, -Math.PI / 2, -Math.PI / 2 + TAU / 1.6); g.stroke();
        if (k > 0.01) {
          const col = V.omega <= OMEGA ? '#36c486' : V.omega <= OMEGA * 1.35 ? '#ffbf3f' : '#ff4a3d';
          g.strokeStyle = col; g.lineWidth = 6; g.beginPath(); g.arc(c.x, c.y, r, -Math.PI / 2, -Math.PI / 2 + TAU * k); g.stroke();
        }
      }
      function drawNeedle(g, t) {
        const gx = L.gauge.x, gy = L.gauge.y, gr = L.gauge.r;
        const jit = stage <= 1 && !K.reduced() ? Math.sin(t * 23) * 0.012 * W.P + Math.sin(t * 37) * 0.008 * W.P : 0;
        const a = Math.PI * 0.75 + Math.PI * 1.5 * clamp(W.needle + jit, -0.02, 1.02);
        g.save(); g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 4; g.shadowOffsetY = 2;
        g.strokeStyle = '#d4322a'; g.lineWidth = Math.max(2.5, gr * 0.05); g.lineCap = 'round';
        g.beginPath(); g.moveTo(gx - Math.cos(a) * gr * 0.16, gy - Math.sin(a) * gr * 0.16); g.lineTo(gx + Math.cos(a) * gr * 0.72, gy + Math.sin(a) * gr * 0.72); g.stroke();
        g.fillStyle = '#2a2433'; g.beginPath(); g.arc(gx, gy, gr * 0.1, 0, TAU); g.fill(); g.restore();
        const zone = W.needle > 0.66 ? 2 : W.needle > 0.33 ? 1 : 0;
        if (zone === 2 && stage <= 1 && !K.reduced()) { const pulse = 0.5 + 0.5 * Math.sin(t * 6); g.strokeStyle = 'rgba(255,74,61,' + (0.25 + 0.3 * pulse) + ')'; g.lineWidth = 3; g.beginPath(); g.arc(gx, gy, gr + 10 + pulse * 3, 0, TAU); g.stroke(); }
        if (zone === 0 && stage >= 2) { g.strokeStyle = 'rgba(54,196,134,0.45)'; g.lineWidth = 3; g.beginPath(); g.arc(gx, gy, gr + 10, 0, TAU); g.stroke(); }
      }
      function drawMug(g, t) {
        const x = MG.x, w = MG.w, hh = MG.h, base = L.counter, top = base - hh, s = w / 52;
        g.save(); g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 8 * s; g.shadowOffsetY = 3 * s;
        g.fillStyle = MUG.body; g.beginPath(); g.moveTo(x - w / 2, top); g.lineTo(x + w / 2, top); g.lineTo(x + w / 2 - 2 * s, base - 8 * s); g.quadraticCurveTo(x + w / 2 - 3 * s, base, x + w / 2 - 11 * s, base); g.lineTo(x - w / 2 + 11 * s, base); g.quadraticCurveTo(x - w / 2 + 3 * s, base, x - w / 2 + 2 * s, base - 8 * s); g.closePath(); g.fill(); g.restore();
        g.strokeStyle = MUG.body; g.lineWidth = 6 * s; g.beginPath(); g.arc(x + w / 2 + 2 * s, top + hh * 0.48, hh * 0.22, -Math.PI / 2, Math.PI / 2); g.stroke();
        const sh = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0); sh.addColorStop(0, 'rgba(255,255,255,0.35)'); sh.addColorStop(0.35, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.18)');
        g.fillStyle = sh; g.fillRect(x - w / 2, top, w, hh - 4);
        g.fillStyle = MUG.band; g.fillRect(x - w / 2 + 1, top + hh * 0.16, w - 2, hh * 0.1);
        g.fillStyle = MUG.band; const my = top + hh * 0.58, ms = hh * 0.13;
        if (MUG.motif === 'heart') heart(g, x - w * 0.08, my + ms * 0.4, ms * 1.3);
        else if (MUG.motif === 'dots') { for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(x - w * 0.3 + i * w * 0.15, my + (i % 2) * ms, ms * 0.32, 0, TAU); g.fill(); } }
        else if (MUG.motif === 'stripe') { for (let i = 0; i < 3; i++) g.fillRect(x - w / 2 + 1, my - ms + i * ms * 0.9, w - 2, ms * 0.32); }
        else { K.starPath(g, x - w * 0.06, my + ms * 0.2, ms * 1.1, ms * 0.48, 5, 0); g.fill(); }
        // inside: rim, the tea, the tea bag tag
        g.fillStyle = '#3a2a22'; g.beginPath(); g.ellipse(x, top, w / 2 - 1, 5 * s, 0, 0, TAU); g.fill();
        if (PO.fill > 0.01) {
          const ly = top + 3 * s + (1 - Math.min(1, PO.fill)) * (hh - 14 * s), lw = (w / 2 - 3 * s) * (0.92 + 0.08 * PO.fill);
          g.fillStyle = mix('#bcd8ef', TEA.liq, Math.min(1, PO.fill * 1.3)); g.beginPath(); g.ellipse(x, Math.max(top + 1, ly), lw, 4 * s, 0, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(x - lw * 0.3, Math.max(top + 1, ly) - 1, lw * 0.3, 1.3 * s, 0, 0, TAU); g.fill();
        }
        g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - w * 0.18, top); g.quadraticCurveTo(x - w * 0.45, top + hh * 0.2, x - w / 2 - 3 * s, top + hh * 0.36); g.stroke();
        g.fillStyle = TEA.tin; rr(g, x - w / 2 - 9 * s, top + hh * 0.34, 10 * s, 12 * s, 2); g.fill();
      }
      function heart(g, x, y, s) { g.beginPath(); g.moveTo(x, y + s * 0.35); g.bezierCurveTo(x - s * 1.1, y - s * 0.35, x - s * 0.45, y - s * 1.15, x, y - s * 0.45); g.bezierCurveTo(x + s * 0.45, y - s * 1.15, x + s * 1.1, y - s * 0.35, x, y + s * 0.35); g.closePath(); g.fill(); }
      let puddle = 0, puddleX = 0;
      function drawPour(g, t) {
        if (puddle > 0.01) { const px = puddleX, py = L.counter + 2; g.fillStyle = 'rgba(200,226,255,0.32)'; g.beginPath(); g.ellipse(px, py, (14 + puddle * 60) * KT.s, (2.5 + puddle * 5) * KT.s, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(px - 6 * KT.s, py - 1, (5 + puddle * 18) * KT.s, 1.2 * KT.s, 0, 0, TAU); g.fill(); }
        const f = flowAt(KT.tilt);
        if (stage !== 2 || f <= 0.01 || !PO.land) return;
        const tip = kpt(TIP.x, TIP.y), ld = PO.land;
        const wd = (1.6 + f * 4.2) * KT.s;
        g.strokeStyle = 'rgba(214,236,255,0.85)'; g.lineWidth = wd; g.lineCap = 'round';
        g.beginPath(); g.moveTo(tip.x, tip.y); g.quadraticCurveTo(tip.x - (6 + f * 18) * KT.s, tip.y + 2, ld.x, ld.y); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = Math.max(1, wd * 0.3);
        g.beginPath(); g.moveTo(tip.x, tip.y); g.quadraticCurveTo(tip.x - (6 + f * 18) * KT.s, tip.y + 2, ld.x, ld.y); g.stroke();
        // ripples where it lands (in the tea, or on the counter when it splashes)
        g.strokeStyle = 'rgba(235,245,255,0.6)'; g.lineWidth = 1.2;
        for (let i = 0; i < 2; i++) { const k = ((t * 2.4 + i * 0.5) % 1), rx = (3 + k * (8 + f * 6)) * KT.s; g.globalAlpha = 1 - k; g.beginPath(); g.ellipse(ld.x, ld.y, rx, rx * 0.3, 0, 0, TAU); g.stroke(); }
        g.globalAlpha = 1;
      }
      const hearts = [];
      function drawHearts(g, dt) {
        const ms = MG.w / 52;
        if (W.hearts && Math.random() < dt * 3.6) hearts.push({ x: MG.x + (Math.random() - 0.5) * MG.w * 0.45, y: L.counter - MG.h - 8 * ms, vx: (Math.random() - 0.5) * 16, vy: -28 - Math.random() * 20, age: 0, life: 2.8 + Math.random() * 1.2, s: (6 + Math.random() * 5) * ms, c: ['#ff8fb1', '#ffb3c8', '#ffd1dc', '#ff6f91'][hearts.length % 4], ph: Math.random() * 6 });
        for (let i = hearts.length - 1; i >= 0; i--) {
          const q = hearts[i]; q.age += dt; if (q.age > q.life) { hearts.splice(i, 1); continue; }
          q.x += (q.vx + Math.sin(q.age * 2.6 + q.ph) * 12) * dt; q.y += q.vy * dt;
          const a = Math.min(1, q.age * 3) * (1 - q.age / q.life), sz = q.s * (0.7 + q.age * 0.28);
          g.globalAlpha = a * 0.35; g.fillStyle = '#ffffff'; heart(g, q.x, q.y + 0.5, sz * 1.25);
          g.globalAlpha = a; g.fillStyle = q.c; heart(g, q.x, q.y, sz);
        }
        g.globalAlpha = 1;
      }
      function mugSteam(g, t) {
        if (PO.fill < 0.4) return;
        const x = MG.x, y = L.counter - MG.h - 4, a = Math.min(1, (PO.fill - 0.4) * 2) * 0.35, ms = MG.w / 52;
        g.strokeStyle = 'rgba(255,255,255,' + a + ')'; g.lineWidth = 2.4 * ms; g.lineCap = 'round';
        for (let i = 0; i < 3; i++) { const ox = (i - 1) * MG.w * 0.2; g.beginPath(); for (let k = 0; k <= 10; k++) { const yy = y - k * 4.4 * ms, xx = x + ox + Math.sin(k * 0.7 - t * 2.2 + i) * 4 * ms; if (!k) g.moveTo(xx, yy); else g.lineTo(xx, yy); } g.stroke(); }
      }

      /* ---------------- sound ---------------- */
      let snd = null, room = null, rain = null;
      function ensureAudio() {
        if (snd || !A.ctx) return;
        room = K.ambience('room'); room.level(0.25, 1);
        if (SKY !== 'snow') { rain = K.ambience('rain'); rain.level(stage >= 3 ? 0.0001 : SKY === 'drizzle' ? 0.12 : 0.2, 1); }
        snd = {
          boil: A.loop({ pink: true, filter: 'lowpass', freq: 170, q: 0.6, bus: 'amb' }),
          hiss: A.loop({ filter: 'bandpass', freq: 4200, q: 0.7, bus: 'sfx' }),
          whine: A.loop({ filter: 'bandpass', freq: 1850, q: 28, bus: 'sfx' }),
          pour: A.loop({ filter: 'bandpass', freq: 600, q: 4, bus: 'sfx' })
        };
        S.onDestroy(() => Object.keys(snd).forEach(k => snd[k] && snd[k].stop()));
      }
      S.on('audio-ready', ensureAudio);
      let bubT = 0, sndT = 0;
      function sounds(t, dt) {
        if (!A.ctx) return;
        ensureAudio();
        bubT -= dt;
        if (stage <= 2 && bubT <= 0 && W.P > 0.03 && !finished) { // the kettle bubbling: busier when the pressure is high
          bubT = 0.05 + (1 - W.P) * 0.5 + Math.random() * 0.2;
          const f = 110 + Math.random() * 180; A.tone({ type: 'sine', freq: f, to: f * 1.7, glide: 0.07, dur: 0.09, vol: 0.028 + W.P * 0.03 });
        }
        if (!snd || t - sndT < 0.06) return; sndT = t;
        snd.boil.level(0.02 + W.P * 0.11 * (stage <= 2 ? 1 : 0), 0.3);
        snd.hiss.level(Math.min(0.16, W.flow * 0.16), 0.08);
        const shriek = clamp(1 - (W.t - W.shriekT) / 0.6, 0, 1);
        snd.whine.level(stage <= 1 ? Math.max(0.0001, Math.pow(Math.max(0, W.P - 0.45), 1.5) * 0.08 + shriek * 0.12) : 0.0001, 0.06);
        snd.whine.freq(1700 + W.P * 300 + shriek * 700 + Math.sin(t * 9) * 30, 0.05);
        const f = stage === 2 ? flowAt(KT.tilt) : 0;
        snd.pour.level(f > 0.01 ? Math.min(0.14, 0.04 + f * 0.1) : 0.0001, 0.06);
        snd.pour.freq(480 + Math.min(1, PO.fill) * 1500 + (PO.spilling ? -200 : 0), 0.08);
      }

      /* ---------------- the HUD on the cupboards ---------------- */
      let meterMk = null, stateEl = null, dots = [], countEl = null, fillBar = null, spillEl = null;
      function setHud(...nodes) { hud.textContent = ''; nodes.forEach(n => n && hud.append(n)); hud.classList.remove('swap'); void hud.offsetWidth; if (!K.reduced()) hud.classList.add('swap'); }
      function hudStep1() {
        meterMk = h('i', { class: 'ls-mk' }); stateEl = h('span', { class: 'ls-state', text: 'Ready' });
        dots = thoughts.map(() => h('i')); countEl = h('span', { class: 'ls-count', text: '0/' + thoughts.length });
        setHud(h('div', { class: 'ls-panel' },
          h('div', { class: 'ls-row' }, h('span', { class: 'ls-lab', text: 'Speed' }), h('div', { class: 'ls-meter', 'aria-hidden': 'true' }, meterMk), stateEl),
          h('div', { class: 'ls-row' }, h('span', { class: 'ls-lab', text: 'Let out' }), h('div', { class: 'ls-dots', 'aria-hidden': 'true' }, dots), countEl)),
          h('p', { class: 'ls-hint', text: 'Circle the valve slowly with the glowing light, like a long breath out.' }));
      }
      function hudStep2() {
        fillBar = h('i'); spillEl = h('span', { class: 'ls-count', text: 'No spills' });
        setHud(h('div', { class: 'ls-panel' },
          h('div', { class: 'ls-row' }, h('span', { class: 'ls-lab', text: 'Mug' }), h('div', { class: 'ls-fill', 'aria-hidden': 'true' }, fillBar, h('b')), spillEl)),
          h('p', { class: 'ls-hint', text: 'Drag the handle up to tilt. Gently, or it splashes.' }));
      }

      /* ---------------- step 1: turn the valve slowly ---------------- */
      function turnBy(da, dt) {
        V.ang += da; // the wheel follows the finger at once
        if (da) V.dir = V.dir * 0.92 + Math.sign(da) * 0.08;
        V.tick += Math.abs(da);
        if (V.tick > 0.42) { V.tick = 0; if (A.ctx) A.wood(undefined, 0.035, 1.5 + Math.random() * 0.1); }
        // speed is judged over at least 60 ms, so jittery or bunched pointer events never fake a "too fast"
        V.accA += Math.abs(da); V.accT += Math.min(0.25, Math.max(0, dt));
        if (V.accT < 0.06) return;
        const amt = V.accA, span = V.accT, w = amt / span;
        V.accA = 0; V.accT = 0;
        V.omega = V.omega * 0.5 + w * 0.5;
        V.turnT += span;
        if (V.omega <= OMEGA) { release(amt * K_REL); V.calmT += span; V.stretch += span; V.best = Math.max(V.best, V.stretch); W.flow = Math.max(W.flow, 0.35 + 0.65 * V.omega / OMEGA); }
        else if (V.omega <= OMEGA * 1.35) { release(amt * K_REL * 0.35); V.fastT += span; V.stretch = 0; W.flow = Math.max(W.flow, 0.5); }
        else { V.fastT += span; V.stretch = 0; shriek(); }
      }
      function release(amt) {
        if (stage !== 1 || amt <= 0) return;
        const before = W.P;
        W.P = Math.max(0, W.P - amt);
        valveHit.setAttribute('aria-valuenow', String(Math.round(W.P * 100)));
        // thoughts leave on the steam, the heaviest one last
        while (released < thoughts.length && (1 - W.P) >= (released + 0.75) / (thoughts.length + 0.1)) letOut(released++);
        const z = W.P > 0.66 ? 2 : W.P > 0.33 ? 1 : 0;
        if (z < V.zone) {
          V.zone = z; K.sfx.chime(z === 1 ? 4 : 7);
          valveHit.setAttribute('aria-valuetext', z === 1 ? 'Pressure falling: amber' : 'Pressure low: green');
          if (z === 1) { say(LN.amber, { ms: 2600 }); rush.base('determined'); rush.el.classList.remove('ls-hot'); }
        }
        if (before > 0 && W.P <= 0) stepDone();
      }
      function letOut(i) {
        const label = thoughts[i];
        const node = h('div', { class: 'ls-thought gk-user', text: label });
        el.append(node);
        const v = kpt(VENT.x, VENT.y);
        puffs.push({ el: node, x: v.x, y: v.y - 10, age: 0, life: 4.4, sway: hs(i * 3.3) * 6, w: 0 });
        P.emit('smoke', v.x, v.y - 6, 14, { angle: -Math.PI / 2, spread: 1.2, speed: [30, 90], colors: ['rgba(240,244,252,0.5)'], size: [10, 20] });
        if (A.ctx) { A.noise({ filter: 'bandpass', freq: 2600, to: 900, q: 0.6, dur: 0.6, attack: 0.05, vol: 0.09 }); A.chime(A.note(['E5', 'G5', 'A5', 'C6', 'D6', 'E6'][i % 6]), { when: A.now() + 0.08, vol: 0.06, dur: 1.6 }); }
        dots[i] && dots[i].classList.add('on');
        if (countEl) countEl.textContent = (i + 1) + '/' + thoughts.length;
        rush.face(i === thoughts.length - 1 ? 'wow' : 'cool', 900);
        if (i === 0 || (i === thoughts.length - 1 && V.lines < 3)) { say(LN.out, { ms: 2000 }); V.lines++; }
        ctx.track('let_out', { i: i + 1 });
      }
      function shriek() {
        const now = W.t;
        if (now - V.lastShriek < 0.75) return;
        V.lastShriek = now; V.shrieks++;
        W.shriekT = now;
        W.P = Math.min(1, W.P + 0.06); W.nv += 0.9;
        V.zone = W.P > 0.66 ? 2 : W.P > 0.33 ? 1 : 0;
        const tip = kpt(TIP.x, TIP.y);
        P.emit('smoke', tip.x, tip.y, 22, { angle: -Math.PI * 0.7, spread: 0.9, speed: [120, 260], colors: ['rgba(255,255,255,0.6)'], size: [6, 14], life: [0.5, 1.1] });
        P.emit('spark', tip.x, tip.y, 8, { colors: ['#ffffff', '#ffd9c8'] });
        if (!K.reduced()) W.nudge = 1;
        if (A.ctx) { const n = A.now(); A.tone({ type: 'square', freq: 2050, to: 2650, glide: 0.25, dur: 0.55, vol: 0.05, lp: 4200 }); A.tone({ when: n + 0.02, type: 'sine', freq: 2400, to: 2900, glide: 0.3, dur: 0.5, vol: 0.05 }); A.noise({ filter: 'highpass', freq: 3000, dur: 0.5, attack: 0.02, vol: 0.12 }); }
        TS_buzz([40, 30, 40]);
        rush.face('panic', 900); rush.react('shake'); rush.el.classList.add('ls-hot');
        if (V.shrieks === 1 || V.shrieks % 3 === 0) say(LN.fast, { ms: 2600 });
        ctx.track('shriek', { n: V.shrieks });
      }
      function TS_buzz(p) { try { if (S.buzz) S.buzz(p); } catch (e) { /* no vibration */ } }
      K.press(valveHit, {
        space: el,
        down: (p) => {
          if (stage !== 1) return;
          V.down = true; V.lastA = Math.atan2(p.y - L.valve.y, p.x - L.valve.x); V.lastT = performance.now(); V.omega = 0; V.accA = 0; V.accT = 0;
          valveHit.classList.add('on'); W.valveGlow = 1; K.sfx.tap();
          if (A.ctx) A.tone({ type: 'sine', freq: 300, to: 420, glide: 0.1, dur: 0.14, vol: 0.05 });
        },
        move: (p) => {
          if (!V.down || stage !== 1) return;
          const dx = p.x - L.valve.x, dy = p.y - L.valve.y;
          if (Math.hypot(dx, dy) < 14) return;
          const a = Math.atan2(dy, dx), now = performance.now();
          let da = a - V.lastA; if (da > Math.PI) da -= TAU; if (da < -Math.PI) da += TAU;
          const dt = (now - V.lastT) / 1000;
          V.lastA = a; V.lastT = now;
          turnBy(da, dt);
        },
        up: () => { if (!V.down) return; V.down = false; valveHit.classList.remove('on'); if (stage === 1 && W.P > 0) circleGuide({ id: 'turn-more', g: 'circle', target: valveHit, r: Math.round(L.valveR * 0.5), label: 'KEEP CIRCLING SLOWLY', delay: 1800 }); }
      });
      K.onKey(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'], (e) => {
        if (stage === 1) { e.preventDefault(); V.down = false; W.valveGlow = 1; turnBy((e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 1) * 0.5, 0.3); }
        else if (stage === 2 && !PO.full) { e.preventDefault(); const up = e.key === 'ArrowUp' || e.key === 'ArrowLeft'; PO.target = clamp(PO.target + (up ? 0.05 : -0.05), 0, 1.05); handleHit.setAttribute('aria-valuenow', String(Math.round(PO.target / 1.05 * 100))); }
      });
      function startStep1() {
        stage = 1;
        hudStep1();
        say(LN.step1, { ms: 4200 });
        circleGuide({ id: 'turn', g: 'circle', target: valveHit, r: Math.round(L.valveR * 0.5), label: 'CIRCLE IT SLOWLY', delay: 900 });
      }
      function stepDone() {
        if (stage !== 1) return;
        stage = 1.5; K.guide(null); V.down = false; V.omega = 0;
        valveHit.classList.remove('on'); valveHit.hidden = true;
        rush.base('calm'); rush.el.classList.remove('ls-hot'); rush.react('bounce');
        say(LN.green, { ms: 2800 });
        K.sfx.great();
        if (A.ctx) A.tone({ type: 'sine', freq: 520, to: 260, glide: 1.4, dur: 1.6, vol: 0.06, verb: 0.5 }); // the long out-breath of the kettle
        P.emit('star', L.gauge.x, L.gauge.y, 16, { colors: ['#b6ffd9', '#ffffff', '#ffe58a'] });
        K.pop('Green', { x: L.gauge.x - (L.wide ? 0 : 40), y: L.gauge.y + L.gauge.r + 26, kind: 'good' });
        ctx.track('released', { shrieks: V.shrieks, calm: Math.round(V.calmT * 10) / 10 });
        K.later(startStep2, 1900);
      }

      /* ---------------- step 2: pour gently ---------------- */
      function startStep2() {
        stage = 2;
        handleHit.hidden = false;
        hudStep2();
        rush.face('wow', 1200);
        say(LN.pour, { ms: 3600 });
        K.guide({ id: 'pour', g: 'drag', dir: 'l', d: Math.round(L.handleR * 1.1), target: handleHit, oy: 0.35, label: 'TILT GENTLY TO POUR', delay: 900 });
      }
      K.press(handleHit, {
        space: el,
        down: (p) => {
          if (stage !== 2 || PO.full) return;
          PO.down = true; PO.a0 = Math.atan2(p.y - L.pivot.y, p.x - L.pivot.x); PO.t0 = PO.target;
          handleHit.classList.add('on'); K.sfx.tap();
          if (A.ctx) A.tone({ type: 'triangle', freq: 180, to: 240, glide: 0.1, dur: 0.16, vol: 0.06 });
        },
        move: (p) => {
          if (!PO.down || stage !== 2 || PO.full) return;
          let da = PO.a0 - Math.atan2(p.y - L.pivot.y, p.x - L.pivot.x);
          if (da > Math.PI) da -= TAU; if (da < -Math.PI) da += TAU;
          PO.target = clamp(PO.t0 + da, 0, 1.05);
          handleHit.setAttribute('aria-valuenow', String(Math.round(PO.target / 1.05 * 100)));
        },
        up: () => { if (!PO.down) return; PO.down = false; handleHit.classList.remove('on'); if (!PO.full) { PO.target = 0; if (stage === 2) K.guide({ id: 'pour-more', g: 'drag', dir: 'l', d: Math.round(L.handleR * 1.1), target: handleHit, oy: 0.35, label: 'TILT AND HOLD, GENTLY', delay: 1600 }); } }
      });
      function pourStep(dt) {
        const maxV = 1.5; // the kettle has weight: it never snaps
        const d = PO.target - KT.tilt, step = clamp(d, -maxV * dt, maxV * dt);
        KT.tilt = clamp(KT.tilt + step, 0, 1.05);
        PO.vel = PO.vel * 0.8 + (step / Math.max(1e-3, dt)) * 0.2;
        const f = flowAt(KT.tilt);
        PO.land = null;
        let outside = false;
        if (f > 0.01) {
          const tip = kpt(TIP.x, TIP.y), rim = L.counter - MG.h;
          const lx = tip.x - (4 + f * 22) * KT.s;
          const inside = Math.abs(lx - MG.x) < MG.w / 2 - 4 * KT.s && tip.y < rim + 4;
          const liq = rim + 3 * KT.s + (1 - Math.min(1, PO.fill)) * (MG.h - 14 * KT.s);
          PO.land = { x: lx, y: inside ? liq : L.counter };
          if (inside && PO.vel < 1.3) PO.fill = Math.min(1, PO.fill + f * 0.26 * dt); // tipping it forward too fast sloshes over
          else if (f > 0.12 && !PO.full) { outside = true; if (!PO.spilling) puddleX = inside ? MG.x - MG.w * 0.7 : lx; }
        }
        if (outside) {
          PO.spill += f * dt; puddle = Math.min(1, puddle + f * dt * 0.6);
          if (!PO.spilling) {
            PO.spilling = true; PO.spills++;
            if (A.ctx) { A.noise({ filter: 'highpass', freq: 2500, dur: 0.6, attack: 0.02, vol: 0.08 }); A.tone({ type: 'triangle', freq: 330, to: 220, glide: 0.2, dur: 0.25, vol: 0.05 }); }
            rush.face('surprised', 900);
            if (!PO.spillSaid) { PO.spillSaid = true; say(LN.spill, { ms: 2400 }); }
            if (spillEl) spillEl.textContent = PO.spills === 1 ? '1 splash' : PO.spills + ' splashes';
          }
        } else PO.spilling = false;
        if (fillBar) fillBar.style.width = Math.round(PO.fill * 100) + '%';
        if (!PO.full && PO.fill >= 0.92) {
          PO.full = true; PO.target = 0; PO.down = false; handleHit.classList.remove('on'); K.guide(null);
          K.sfx.good(undefined, 7); K.sfx.sparkle();
          P.emit('star', MG.x, L.counter - MG.h - 8, 14, { colors: ['#fffbe6', '#ffe58a', '#ffd1dc'] });
          rush.face('happy', 1400); say(LN.full, { ms: 2200 });
        }
        if (PO.full && KT.tilt < 0.02) finale();
      }

      /* ---------------- the rising thoughts ---------------- */
      const puffs = [];
      function updatePuffs(dt) {
        for (let i = puffs.length - 1; i >= 0; i--) {
          const q = puffs[i];
          q.age += dt;
          if (q.age >= q.life) { q.el.remove(); puffs.splice(i, 1); continue; }
          if (!q.w) q.w = q.el.offsetWidth || 120;
          const k = q.age / q.life;
          q.y -= (34 + 18 * k) * dt * (L.wide ? 1.3 : 1);
          const x = clamp(q.x + Math.sin(q.age * 1.3 + q.sway) * 10 - q.w / 2, 8, L.w - q.w - 8);
          q.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + q.y.toFixed(1) + 'px) scale(' + (0.86 + k * 0.22).toFixed(3) + ')';
          q.el.style.opacity = (k < 0.12 ? k / 0.12 : 1 - ss(0.55, 1, k)).toFixed(3);
        }
      }

      /* ---------------- finale ---------------- */
      let mugFrom = null, kFrom = null;
      async function finale() {
        if (stage >= 3) return;
        stage = 3; K.guide(null); finished = false;
        handleHit.hidden = true;
        if (!bgWarm && L) bgWarm = paintKitchen(1);
        W.finT = W.t; W.hearts = 1;
        mugFrom = { x: MG.x, w: MG.w, h: MG.h }; kFrom = { x: KT.x, s: KT.s };
        if (A.ctx) { A.click({ vol: 0.14 }); A.noise({ filter: 'lowpass', freq: 500, dur: 0.3, vol: 0.06 }); }
        const calm = V.turnT > 0 ? V.calmT / V.turnT : 1;
        const score = clamp(0.62 * calm + 0.38 * (1 - Math.min(1, PO.spill * 4)) - V.shrieks * 0.05, 0, 1);
        const pct = Math.round(score * 100), tier = K.tier(score);
        const best = K.best('steady', pct, 'higher');
        const col = K.collect(TEA.name);
        const clean = PO.spills === 0;
        // Rush sits with the mug; the kettle rests on the back burner
        rush.side('above');
        rush.place(L.fRush.x, L.fRush.y, 900);
        rush.base('love'); rush.react('bounce');
        S.later(() => say(LN.fin, { ms: 0 }), 700);
        S.later(() => rush.base('calm'), 4200);
        hud.style.left = L.fHud.x + 'px'; hud.style.top = L.fHud.y + 'px'; hud.style.width = L.fHud.w + 'px'; hud.style.height = L.fHud.h + 'px';
        const medal = { Gold: '#ffc84a', Silver: '#d7e0ea', Bronze: '#e3a06a' }[tier] || '#c9b6a0';
        setHud(h('div', { class: 'ls-card', role: 'group', 'aria-label': 'Tonight’s brew' },
          h('div', { class: 'ls-ck', text: 'Tonight’s brew' }),
          h('div', { class: 'ls-ct' }, h('i', { class: 'ls-tin', style: { background: TEA.tin } }), TEA.name),
          h('ul', { class: 'ls-cl' }, h('li', { text: 'Pressure: red → green' }), h('li', { text: thoughts.length + ' heated thoughts let out slowly' }),
            V.sync >= 2 ? h('li', { text: 'In time with the music for ' + V.sync + ' turns' }) : null,
            h('li', { text: clean ? 'A full mug, not a drop spilled' : 'A full mug (' + PO.spills + (PO.spills === 1 ? ' splash' : ' splashes') + ')' })),
          h('div', { class: 'ls-tiers' }, h('span', { class: 'ls-tier' }, h('i', { class: 'ls-medal', style: { '--m': medal } }), (tier ? tier + ' · ' : '') + 'Steady hands ' + pct + '%'), best.isNew ? h('span', { class: 'ls-tier nb', text: 'New best' }) : null)));
        music.level(0.55);
        if (A.ctx) { A.pad([A.note('F3'), A.note('A3'), A.note('C4'), A.note('E4')], { dur: 5, vol: 0.12, attack: 1 }); }
        if (rain) rain.level(0.0001, 3);
        if (cat) { S.later(() => { W.purr = 1; if (A.ctx) A.chime(A.note('G5'), { vol: 0.05, dur: 1.2 }); }, 1800); }
        await K.finale('stars', { colors: ['#ffd9a0', '#ffc4d6', '#fff1c4'], chord: ['F4', 'A4', 'C5', 'E5'], ms: 5200 });
        finished = true;
        const badges = [];
        if (tier) badges.push(tier + ': steady hands');
        if (best.isNew) badges.push('New best: ' + pct + '% steady');
        badges.push(col.isNew ? 'Collected: ' + TEA.name + ' tin' : 'Tea tins: ' + col.count);
        if (V.sync >= 3) badges.push('In sync: ' + V.sync + ' turns');
        if (clean) badges.push('Not a drop spilled');
        ctx.track('steam_done', { steady: pct, shrieks: V.shrieks, spills: PO.spills, tier: tier || 'none' });
        ctx.finish({
          title: 'Pressure down, tea up', mood: 'calm',
          lines: ['Pressure: red → green', thoughts.length + ' heated thoughts let out slowly', clean ? 'Poured a full mug, not a drop spilled' : 'Poured a full mug (' + PO.spills + (PO.spills === 1 ? ' splash)' : ' splashes)')],
          share: 'Let the steam out slowly and poured a calm cup of ' + TEA.name.toLowerCase() + '.',
          badges
        });
      }

      /* ---------------- render ---------------- */
      let meterA = -1;
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !L || !bg) return;
        W.t = t;
        // springy needle with a little overshoot
        W.nv += (W.P - W.needle) * dt * 40; W.nv *= Math.pow(0.0025, dt); W.needle += W.nv * dt;
        W.valveGlow = Math.max(V.down ? 0.8 : 0, W.valveGlow - dt * 2);
        V.flash = Math.max(0, V.flash - dt * 1.6);
        paceTick();
        if (!V.down) V.omega *= Math.pow(0.02, dt);
        W.flow = Math.max(0, W.flow - dt * 1.6);
        W.flame += (((stage >= 3 ? 0 : 0.3 + 0.7 * W.P)) - W.flame) * Math.min(1, dt * 2);
        if (stage === 2) pourStep(dt);
        if (stage >= 3) {
          const k = K.ease.inOutCubic(Math.min(1, (t - W.finT) / 1.2));
          MG.x = mugFrom.x + (L.fmug.x - mugFrom.x) * k; MG.w = mugFrom.w + (L.fmug.w - mugFrom.w) * k; MG.h = mugFrom.h + (L.fmug.h - mugFrom.h) * k;
          KT.x = kFrom.x + (L.fkx - kFrom.x) * k; KT.s = kFrom.s + (L.fs * L.s - kFrom.s) * k;
          W.warm = Math.min(1, (t - W.finT) / 2.4); W.rain = Math.max(0, 1 - (t - W.finT) / 2.6); W.stars = Math.min(1, Math.max(0, (t - W.finT - 0.8) / 2.2));
        }
        // steam: a smooth column while turning calmly, a wisp from the spout while hot
        if (stage === 1 && W.flow > 0.05) { const v = kpt(VENT.x, VENT.y); if (Math.random() < dt * (10 + W.flow * 46)) P.emit('smoke', v.x + (Math.random() - 0.5) * 6, v.y, 1, { angle: -Math.PI / 2, spread: 0.32, speed: [70, 120 + W.flow * 60], colors: ['rgba(238,243,252,0.42)'], size: [7, 13], life: [1.8, 2.8] }); }
        if (stage <= 2 && Math.random() < dt * (1 + W.P * 5)) { const tip = kpt(TIP.x, TIP.y); P.emit('smoke', tip.x - 4, tip.y - 4, 1, { angle: -Math.PI * 0.62, spread: 0.4, speed: [24, 50], colors: ['rgba(240,244,252,0.3)'], size: [4, 8], life: [1.2, 2] }); }
        const w = cv.w, H = cv.h;
        g.drawImage(bg, 0, 0, w, H);
        if (W.warm > 0 && bgWarm) { g.globalAlpha = W.warm; g.drawImage(bgWarm, 0, 0, w, H); g.globalAlpha = 1; }
        g.save();
        if (W.nudge > 0.01) { W.nudge = Math.max(0, W.nudge - dt * 4); g.translate((Math.random() - 0.5) * 7 * W.nudge, (Math.random() - 0.5) * 5 * W.nudge); }
        drawWindow(g, t);
        drawNeedle(g, t);
        drawFlames(g, t);
        drawPour(g, t);
        drawKettle(g, t);
        drawMug(g, t);
        mugSteam(g, t);
        drawSpeedRing(g);
        drawPace(g);
        P.update(dt); P.draw(g);
        drawHearts(g, dt);
        g.restore();
        updatePuffs(dt);
        if (stage === 1 && meterMk) {
          const m = clamp(V.omega / (OMEGA * 2), 0, 1), q = Math.round(m * 200) / 200;
          if (q !== meterA) { meterA = q; meterMk.style.left = (q * 100).toFixed(1) + '%'; }
          const st = V.omega < 0.15 ? ['', V.turnT ? 'Paused' : 'Ready'] : V.omega <= OMEGA ? ['ok', 'Steady'] : V.omega <= OMEGA * 1.35 ? ['warn', 'Easy…'] : ['bad', 'Too fast'];
          if (stateEl.textContent !== st[1]) { stateEl.textContent = st[1]; stateEl.className = 'ls-state ' + st[0]; }
        }
        sounds(t, dt);
      });

      /* ---------------- start ---------------- */
      cv.onResize(() => layout());
      setHud(h('p', { class: 'ls-hint', text: 'Tonight’s brew: ' + TEA.name + (tins.length ? ' · ' + tins.length + (tins.length === 1 ? ' tin' : ' tins') + ' on your shelf' : '') }));
      (async () => {
        await K.intro({ title: 'Let Off Steam', sub: 'The kettle’s in the red. Let the pressure out slowly, then pour yourself something warm.', how: 'Circle the valve slowly to let the steam out. Then tilt the kettle gently to fill the mug.', char: 'rush', mood: 'fume' });
        ensureAudio();
        rush.react('shake');
        if (A.ctx) A.tone({ type: 'sine', freq: 1800, to: 2100, glide: 0.4, dur: 0.6, vol: 0.03 });
        await say(visits > 0 ? LN.back : LN.intro, { ms: 3400 });
        await K.wait(700);
        startStep1();
      })();

      return {
        async autoplay() {
          const wait = K.wait;
          while (stage !== 1) await wait(120);
          await wait(800);
          const R = L.valveR, rad = R * 0.55;
          let ang = -Math.PI / 2;
          const at = (a) => ({ x: R + Math.cos(a) * rad, y: R + Math.sin(a) * rad });
          // one impatient flick first (it shrieks), then calm circles
          let p0 = at(ang); let pr = await K.sim.press(valveHit, p0.x, p0.y);
          for (let i = 0; i < 6; i++) { await wait(30); ang += 0.55; const q = at(ang); pr.move(q.x, q.y); }
          pr.up(at(ang).x, at(ang).y);
          await wait(1400);
          while (stage === 1) {
            p0 = at(ang); pr = await K.sim.press(valveHit, p0.x, p0.y);
            for (let i = 0; i < 90 && stage === 1; i++) { await wait(50); ang += 0.075; const q = at(ang); pr.move(q.x, q.y); }
            const q = at(ang); pr.up(q.x, q.y);
            await wait(350);
          }
          while (stage !== 2) await wait(120);
          await wait(1200);
          const RH = L.handleR, piv = L.pivot, hr = { x: L.handle.x - RH, y: L.handle.y - RH };
          const rest = Math.atan2(L.handle.y - piv.y, L.handle.x - piv.x), dist = Math.hypot(L.handle.x - piv.x, L.handle.y - piv.y);
          const ptAt = (th) => ({ x: piv.x + Math.cos(rest - th) * dist - hr.x, y: piv.y + Math.sin(rest - th) * dist - hr.y });
          let th = 0; const goal = (0.35 + TMAX) / 2;
          pr = await K.sim.press(handleHit, RH, RH);
          while (th < goal) { await wait(50); th = Math.min(goal, th + 0.03); const q = ptAt(th); pr.move(q.x, q.y); }
          let guard = 0;
          while (!PO.full && guard++ < 400) { await wait(60); const q = ptAt(th); pr.move(q.x, q.y); }
          const q2 = ptAt(th); pr.up(q2.x, q2.y);
          while (!finished) await wait(200);
        }
      };
    }
  });
})(window.TSG_ENV);
