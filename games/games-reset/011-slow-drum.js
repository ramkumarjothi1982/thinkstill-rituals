/* 011 Slow Drum — Reset · GROUND · Panic / Body Alarm
 * Mechanism: rhythmic entrainment with alternating left-right taps (bilateral tapping, the rhythm of the "butterfly
 * hug" self-soothing technique; Artigas & Jarero). Keeping time with a beat that falls slowly from about 96 to 60 BPM
 * draws breathing and arousal down with it, and the last stretch becomes paced breathing with a longer out-breath
 * (two taps in, a long rest out). Off-beat taps always sound; nothing ever fails.
 * Verb: drum (alternate taps on two hand drums, on the beat). Finale: the fire settles to embers that rise and draw the
 * beat you played as a constellation across the sky, a tempo line from 96 down to 60, while the circle dozes off.
 */
(function (env) {
  'use strict';

  /* Tonight's clearing: one per day. Each has a night palette (dark) and a blue-hour palette (bright). */
  const PLACES = {
    beach: {
      name: 'by the sea',
      dark: { sky: ['#050a20', '#111e47', '#2f3b6b'], moon: '#f6ecd4', far: '#0b1733', sea: ['#0b1834', '#13294f'], ground: ['#2e2427', '#1a1315'], dust: 'rgba(255,196,140,0.16)', stars: 1 },
      bright: { sky: ['#30508f', '#7690c8', '#f2b79a'], moon: '#fff8e8', far: '#4d639b', sea: ['#4a6aa8', '#6c8bc2'], ground: ['#a8826a', '#7f5f4e'], dust: 'rgba(255,220,180,0.24)', stars: 0.62 }
    },
    forest: {
      name: 'in the pines',
      dark: { sky: ['#040c18', '#0d1f31', '#1d3647'], moon: '#eaf1f2', trees: ['#14303a', '#0d2326', '#071514'], ground: ['#1a2a1d', '#0e1710'], dust: 'rgba(255,190,130,0.14)', stars: 1 },
      bright: { sky: ['#2c4f80', '#7593ba', '#dcbca4'], moon: '#ffffff', trees: ['#4c6e7e', '#385a52', '#274232'], ground: ['#5d7556', '#435940'], dust: 'rgba(255,214,170,0.22)', stars: 0.62 }
    },
    snow: {
      name: 'in the snow',
      dark: { sky: ['#050c25', '#13244f', '#31497d'], moon: '#eef3ff', aurora: ['rgba(110,255,200,0.17)', 'rgba(130,170,255,0.13)'], hills: '#25365c', trees: '#0c172a', cap: '#c9d6ef', ground: ['#4a5a82', '#28324f'], dust: 'rgba(255,200,150,0.18)', stars: 1 },
      bright: { sky: ['#4062a8', '#97aedc', '#f1c9c0'], moon: '#ffffff', aurora: ['rgba(140,255,215,0.2)', 'rgba(170,200,255,0.16)'], hills: '#9fb2da', trees: '#3a4e78', cap: '#ffffff', ground: ['#d9e3f4', '#b9c7e2'], dust: 'rgba(255,214,170,0.26)', stars: 0.62 }
    },
    desert: {
      name: 'in the desert',
      dark: { sky: ['#0b0820', '#241844', '#5d304f'], moon: '#f7e7c4', far: '#26162e', near: '#160c1b', ground: ['#3f2520', '#22130f'], dust: 'rgba(255,190,130,0.16)', stars: 1.15 },
      bright: { sky: ['#474c97', '#a68cc2', '#f5a679'], moon: '#fff4dc', far: '#7a5a8c', near: '#55385a', ground: ['#c3835b', '#9c6343'], dust: 'rgba(255,220,170,0.24)', stars: 0.7 }
    }
  };
  /* A new instrument joins the circle on each repeat visit (deterministic, never random). */
  const INSTR = [
    { id: 'kalimba', name: 'Kalimba' }, { id: 'rainstick', name: 'Rain stick' }, { id: 'framedrum', name: 'Frame drum' },
    { id: 'bowl', name: 'Singing bowl' }, { id: 'ocean', name: 'Ocean drum' }
  ];
  /* Harmony: a slow D-minor world. Two bars per chord. */
  const PROG = [
    { bass: 'D2', pad: ['D3', 'A3', 'E4', 'F4'] }, { bass: 'A#1', pad: ['D3', 'F3', 'A3', 'C4'] },
    { bass: 'F2', pad: ['C3', 'F3', 'A3', 'E4'] }, { bass: 'C2', pad: ['C3', 'G3', 'A3', 'D4'] }
  ];
  const KAL = ['A4', 'G4', 'F4', 'D4', 'C4', 'D4', 'F4', 'A4'];
  const STARCHIME = ['A5', 'G5', 'F5', 'D5', 'C5', 'A4', 'G4', 'F4', 'D4', 'C4'];
  const GENERIC = ['TOO MUCH', 'WHAT IF', 'RUSH', 'ALL AT ONCE'];

  (env.games = env.games || []).push({
    id: 'slow-drum', mode: 'reset', name: 'Slow Drum', verb: 'drum', family: 'GROUND', minutes: 2,
    parents: ['Panic / Body Alarm', 'Emotion', 'Sleep / Winding Down'],
    cast: ['still', 'sync', 'patch'], poster: { char: 'still', mood: 'music' },
    tagline: 'Drum left, right, on the beat, and follow the circle down to 60.',
    why: 'For a racing body: alternate taps on a beat that slows from 96 to 60, and you slow with it.',
    fonts: ['Fraunces:ital,wght@0,600;0,700;1,600'],
    css: `
.g-slow-drum { --sd-serif: "Fraunces", "Lora", "Iowan Old Style", "Palatino Linotype", Georgia, serif; --sd-ink: #fff1dc; }
.g-slow-drum .sd-sparks { position: absolute; inset: 0; z-index: 15; pointer-events: none; }
.g-slow-drum .sd-spark { position: absolute; left: 0; top: 0; will-change: transform; pointer-events: none; }
.g-slow-drum .sd-spark-in { display: block; translate: -50% -50%; padding: 8px 14px 7px; border-radius: 999px; white-space: nowrap; color: #fff0d8;
  font: 600 15px/1.1 var(--sd-serif); letter-spacing: 0.05em; text-shadow: 0 0 10px rgba(255, 150, 60, 0.9);
  background: radial-gradient(130% 150% at 50% 40%, rgba(132, 40, 14, 0.94), rgba(66, 18, 9, 0.92)); border: 1px solid rgba(255, 186, 112, 0.55);
  box-shadow: 0 0 16px rgba(255, 110, 40, 0.45), inset 0 0 10px rgba(255, 140, 60, 0.28); }
.g-slow-drum .sd-big .sd-spark-in { font-size: 17px; padding: 10px 17px 9px; border-color: rgba(255, 214, 140, 0.75); }
.g-slow-drum .sd-next .sd-spark-in { border-color: #ffe2a8; box-shadow: 0 0 24px rgba(255, 170, 70, 0.75), inset 0 0 12px rgba(255, 170, 80, 0.45); }
.g-slow-drum .sd-hud { position: absolute; z-index: 18; left: 0; top: 0; translate: -50% 0; display: flex; flex-direction: column; align-items: center; gap: 6px; pointer-events: none; }
.g-slow-drum .sd-tempo { display: flex; align-items: baseline; gap: 7px; padding: 7px 15px 8px; border-radius: 999px; color: var(--sd-ink); white-space: nowrap;
  background: rgba(26, 11, 6, 0.55); border: 1px solid rgba(255, 210, 150, 0.24); box-shadow: 0 6px 18px rgba(0, 0, 0, 0.32); }
.g-slow-drum .sd-bpm { font: 700 28px/1 var(--sd-serif); font-variant-numeric: tabular-nums; min-width: 2ch; text-align: right; }
.g-slow-drum .sd-unit { font: 700 12px/1 var(--font-ui); letter-spacing: 0.16em; opacity: 0.85; }
.g-slow-drum .sd-goal { font: italic 600 15px/1 var(--sd-serif); opacity: 0.78; }
.g-slow-drum .sd-dots { display: flex; gap: 8px; padding: 7px 11px; border-radius: 999px; background: rgba(26, 11, 6, 0.48); }
.g-slow-drum .sd-dots[hidden] { display: none; }
.g-slow-drum .sd-dots i { width: 10px; height: 10px; border-radius: 50%; background: rgba(255, 236, 200, 0.3); transition: transform 0.16s ease, background 0.16s ease; }
.g-slow-drum .sd-dots i.sd-in { background: rgba(255, 205, 110, 0.55); }
.g-slow-drum .sd-dots i.sd-out { background: rgba(150, 196, 255, 0.45); }
.g-slow-drum .sd-dots i.sd-on { transform: scale(1.5); background: #ffe3a6; }
.g-slow-drum .sd-dots i.sd-out.sd-on { background: #c4e2ff; }
.g-slow-drum .sd-cue { position: absolute; z-index: 17; left: 0; top: 0; translate: -50% -50%; font: italic 600 27px/1.1 var(--sd-serif); color: #fff4e0; letter-spacing: 0.04em;
  text-shadow: 0 0 18px rgba(255, 170, 90, 0.85), 0 2px 8px rgba(0, 0, 0, 0.85); white-space: nowrap; pointer-events: none; opacity: 0; }
.g-slow-drum .sd-drum { position: absolute; z-index: 20; padding: 0; margin: 0; border: 0; background: transparent; border-radius: 48% 48% 36% 36% / 42% 42% 30% 30%; cursor: pointer;
  touch-action: none; -webkit-tap-highlight-color: transparent; }
.g-slow-drum .sd-drum:focus-visible { outline: 3px solid #ffd36b; outline-offset: 3px; }
.g-slow-drum .sd-key { position: absolute; left: 50%; bottom: 16%; translate: -50% 0; padding: 5px 9px; border-radius: 7px; font: 700 13px/1 var(--font-ui); letter-spacing: 0.08em;
  color: #fff3df; background: rgba(22, 9, 4, 0.6); border: 1px solid rgba(255, 220, 170, 0.35); pointer-events: none; white-space: nowrap; }
.g-slow-drum.sd-phone .sd-key { display: none; }
.g-slow-drum .sd-seat .gk-bubble { max-width: 150px; }
@container (min-width: 700px) { .g-slow-drum .sd-seat .gk-bubble { max-width: 230px; } }
.g-slow-drum .sd-clabel { position: absolute; z-index: 19; left: 0; top: 0; translate: -50% -50%; font: 700 15px/1 var(--sd-serif); color: #fff3dc; white-space: nowrap; pointer-events: none;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.75), 0 0 16px rgba(255, 200, 120, 0.4); opacity: 0; transition: opacity 1.2s ease; letter-spacing: 0.02em; }
.g-slow-drum .sd-clabel small { font: 700 12px/1 var(--font-ui); letter-spacing: 0.14em; margin-left: 5px; opacity: 0.8; }
.g-slow-drum .sd-clabel.sd-on { opacity: 1; }
.g-slow-drum .sd-cap { font: italic 600 17px/1.2 var(--sd-serif); }
.g-slow-drum.sd-bright .sd-tempo, .g-slow-drum.sd-bright .sd-dots { background: rgba(255, 249, 240, 0.86); color: #3a1f12; border-color: rgba(90, 50, 20, 0.2); }
.g-slow-drum.sd-bright .sd-dots i { background: rgba(80, 50, 30, 0.22); }
.g-slow-drum.sd-bright .sd-dots i.sd-in { background: rgba(210, 130, 30, 0.55); }
.g-slow-drum.sd-bright .sd-dots i.sd-out { background: rgba(60, 110, 200, 0.45); }
.g-slow-drum.sd-bright .sd-dots i.sd-on { background: #d77a12; }
.g-slow-drum.sd-bright .sd-dots i.sd-out.sd-on { background: #2f6fd0; }
.g-slow-drum.sd-bright .sd-cue { color: #2b1636; text-shadow: 0 1px 12px rgba(255, 245, 230, 0.9); }
.g-slow-drum.sd-bright .sd-clabel { color: #1d1a40; text-shadow: 0 1px 10px rgba(255, 255, 255, 0.85); }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const text = String(ctx.text || '').trim();
      const inten = ctx.intensity;
      const START = [84, 96, 108][inten], END = 60, BREATH = 66;
      const STEP = [3, 3, 4][inten], LEARN = [4, 6, 6][inten], CYCLES = [4, 4, 5][inten], NSPARK = [3, 4, 4][inten];
      const visits = K.visits();
      const placeId = K.dailyPick(['beach', 'forest', 'snow', 'desert'], 1), PL = PLACES[placeId];
      const instr = visits >= 1 ? INSTR[(visits - 1) % INSTR.length] : null;
      const nextInstr = INSTR[visits % INSTR.length];
      const care = () => an.safety === 'care';
      const line = (o) => ctx.line(o);
      const gentleLine = (o) => (care() ? o.Jolly : ctx.line(o)); // lines about their thoughts stay gentle when it's a real concern
      const red = () => K.reduced();
      const vnow = () => A.now() - A.latency();
      const TAU = Math.PI * 2;
      ctx.analysisReady.then(a => { if (a && typeof a === 'object' && !sparks.length) an = a; }).catch(() => {});

      /* ---------------- the beat plan: count-in, groove, the slow fall, then breathing ---------------- */
      const plan = [];
      const nSlow = Math.ceil((START - BREATH) / STEP);
      (() => {
        for (let b = 0; b < 4; b++) plan.push({ ph: 'count', kind: 'count', bar: -1, bib: b });
        let s = 0, bar = 0;
        for (let k = 0; k < LEARN; k++, bar++) for (let b = 0; b < 4; b++) plan.push({ ph: 'groove', kind: 'tap', side: (s++ % 2) ? 'R' : 'L', bar, bib: b, gbar: k });
        for (let k = 0; k < nSlow; k++, bar++) { const tg = Math.max(BREATH, START - STEP * (k + 1)); for (let b = 0; b < 4; b++) plan.push({ ph: 'slow', kind: 'tap', side: (s++ % 2) ? 'R' : 'L', bar, bib: b, sbar: k, target: b === 0 ? tg : null }); }
        for (let c = 0; c < CYCLES; c++, bar++) { const tg = BREATH - (BREATH - END) * (c + 1) / CYCLES; for (let b = 0; b < 6; b++) plan.push({ ph: 'breath', kind: b < 2 ? 'tap' : 'rest', side: b === 0 ? 'L' : b === 1 ? 'R' : null, bar, bib: b, cycle: c, target: b === 0 ? tg : null }); }
      })();
      const syncForce = 2, syncEarly = 1, patchForce = LEARN - 1, patchEarly = LEARN - 2;

      /* ---------------- scene ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: 1.5 });
      const P = K.particles({ max: 320 });
      const sparkLayer = h('div', { class: 'sd-sparks' });
      const hud = h('div', { class: 'sd-hud' },
        h('div', { class: 'sd-tempo', 'aria-hidden': 'true' }, h('b', { class: 'sd-bpm', text: String(START) }), h('span', { class: 'sd-unit', text: 'BPM' }), h('span', { class: 'sd-goal', text: '→ 60' })),
        h('div', { class: 'sd-dots', hidden: true, 'aria-hidden': 'true' }));
      const bpmEl = hud.querySelector('.sd-bpm'), dotsEl = hud.querySelector('.sd-dots');
      const cue = h('div', { class: 'sd-cue', 'aria-hidden': 'true' });
      const lab96 = h('div', { class: 'sd-clabel', 'aria-hidden': 'true' }, String(START), h('small', { text: 'BPM' }));
      const lab60 = h('div', { class: 'sd-clabel', 'aria-hidden': 'true' }, '60', h('small', { text: 'BPM' }));
      const capEl = h('div', { class: 'sd-clabel sd-cap', 'aria-hidden': 'true', text: 'tonight’s beat, in stars' });
      el.append(sparkLayer, hud, cue, lab96, lab60, capEl);
      const drums = { L: mkDrum('L'), R: mkDrum('R') };
      const still = K.character('still', { side: 'right', mood: 'music', x: 12, y: 64, size: 60 });
      const sync = K.character('sync', { side: 'right', mood: 'happy', x: 0, y: 0, size: 58 });
      const patch = K.character('patch', { side: 'left', mood: 'happy', x: 0, y: 0, size: 58 });
      sync.el.classList.add('sd-seat'); patch.el.classList.add('sd-seat');
      sync.show(false); patch.show(false);
      const cast = { still, sync, patch };

      const G = { w: 0, h: 0, u: 1, phone: true, fire: { x: 0, y: 0 }, horizon: 0, slots: [], seats: {}, cons: null, hudY: 0, cueY: 0 };
      const W = { fireI: 1, fireT: 1, kick: 0, flick: 0, calm: 0, starVis: 0.32, tense: 1, nudge: 0, consK: 0, rest: 0, bpmShown: START };
      let BG = null, STARS = [], SPR = null;

      function mkDrum(side) {
        const btn = h('button', { type: 'button', class: 'sd-drum', 'aria-label': side === 'L' ? 'Left drum. Keys: F or left arrow' : 'Right drum. Keys: J or right arrow' });
        btn.append(h('span', { class: 'sd-key', 'aria-hidden': 'true', text: side === 'L' ? 'F  ←' : '→  J' }));
        el.append(btn);
        const d = { side, btn, cx: 0, cy: 0, rx: 60, ry: 25, bodyH: 80, sq: 0, sqv: 0, glow: 0, glowCol: 'gold', flash: 0, spr: null, rip: [] };
        S.listen(btn, 'pointerdown', (e) => { if (e.button > 0) return; e.preventDefault(); hit(side, K.local(e, el), e.isTrusted); });
        S.listen(btn, 'keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); hit(side, null, false); } });
        return d;
      }
      K.onKey(['ArrowLeft', 'KeyF'], (e) => { if (e.repeat) return; e.preventDefault(); hit('L', null, false); });
      K.onKey(['ArrowRight', 'KeyJ'], (e) => { if (e.repeat) return; e.preventDefault(); hit('R', null, false); });

      /* ---------------- layout ---------------- */
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        const phone = w < 700;
        const u = phone ? K.clamp(Math.min(w / 390, H / 800), 0.82, 1.1) : K.clamp(Math.min(w / 900, H / 700), 1.05, 1.45);
        Object.assign(G, { w, h: H, u, phone });
        el.classList.toggle('sd-phone', phone);
        const rx = phone ? Math.min(86, w * 0.215) : Math.min(118, 92 * u), ry = rx * 0.42, bodyH = rx * (phone ? 1.3 : 1.18);
        const cy = Math.round(H - 20 - bodyH), gap = phone ? 12 : 64;
        [['L', -1], ['R', 1]].forEach(([s, dir]) => {
          const d = drums[s]; Object.assign(d, { cx: Math.round(w / 2 + dir * (rx + gap)), cy, rx, ry, bodyH });
          Object.assign(d.btn.style, { left: (d.cx - rx - 8) + 'px', top: (cy - ry - 12) + 'px', width: (rx * 2 + 16) + 'px', height: (ry * 2 + bodyH * 0.8 + 12) + 'px' });
        });
        const k = K.clamp(H / 844, 0.72, 1);
        G.fire = { x: Math.round(w / 2), y: Math.round(phone ? Math.min(H * 0.6, cy - ry - 190 * k) : Math.min(H * 0.6, cy - ry - 118 * u)) };
        G.horizon = Math.round(G.fire.y - (phone ? 160 * k : 150 * u));
        G.hudY = Math.round(G.fire.y + 40 * u);
        G.cueY = Math.round(phone ? G.fire.y - 166 * k : Math.max(100, G.horizon * 0.32));
        hud.style.left = G.fire.x + 'px'; hud.style.top = G.hudY + 'px';
        cue.style.left = G.fire.x + 'px'; cue.style.top = G.cueY + 'px';
        // the circle: Still hosts from the top left; Sync and Patch sit on logs at the back of the clearing
        const hs = phone ? 60 : 96, ss = phone ? 58 : 92;
        [still.el, sync.el, patch.el].forEach((c, i) => c.style.setProperty('--sz', (i ? ss : hs) + 'px'));
        still.place(phone ? 12 : 24, phone ? 62 : 70);
        const sy = phone ? G.horizon + 4 : G.horizon - 30 * u;
        G.seats = { sync: { x: phone ? 16 : G.fire.x - 330 * u - ss / 2, y: sy, s: ss }, patch: { x: phone ? w - 16 - ss : G.fire.x + 330 * u - ss / 2, y: sy, s: ss } };
        sync.place(G.seats.sync.x, G.seats.sync.y); patch.place(G.seats.patch.x, G.seats.patch.y);
        // spark rows above the fire, clear of Still's bubble and the seats
        const top = phone ? 154 : 128, bottom = phone ? G.horizon - 34 : sy - 16, rowH = (bottom - top) / NSPARK;
        G.slots = [];
        for (let i = 0; i < NSPARK; i++) G.slots.push({ x: G.fire.x + (i === NSPARK - 1 ? 0 : (i % 2 ? 1 : -1) * (phone ? 28 : 74)), y: top + rowH * (i + 0.5) });
        G.moon = { x: Math.round(phone ? w * 0.8 : w * 0.82), y: Math.round(Math.min(G.horizon * 0.36, phone ? 120 : 130)) };
        G.cons = phone ? { x0: 48, x1: w - 48, y0: 176, y1: G.horizon - 38 } : { x0: w * 0.27, x1: w * 0.73, y0: 150, y1: G.horizon - 24 };
        makeStars();
        paintAll();
      }
      cv.onResize(() => layout());
      S.on('theme', () => { el.classList.toggle('sd-bright', !K.dark()); paintAll(); });
      el.classList.toggle('sd-bright', !K.dark());

      /* ---------------- painting (cached once per layout and theme) ---------------- */
      function off(w, hh) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * cv.dpr)); c.height = Math.max(1, Math.round(hh * cv.dpr)); const g = c.getContext('2d'); g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0); return { c, g, w, h: hh }; }
      function rng(seed) { return K.rng(seed); }
      function rrect(g, x, y, w, hh, r) { if (g.roundRect) { g.roundRect(x, y, w, hh, r); return; } r = Math.min(r, w / 2, hh / 2); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      function makeStars() {
        const R = rng(K.daily() * 3 + 11), n = Math.round((G.phone ? 120 : 210) * (placeId === 'desert' ? 1.3 : 1)), out = [];
        for (let i = 0; i < n; i++) out.push({ x: R() * G.w, y: Math.pow(R(), 1.35) * (G.horizon - 14), s: R() < 0.1 ? 2.2 : R() < 0.45 ? 1.5 : 1, th: R(), ph: R() * 6.3, sp: 0.5 + R() * 2 });
        STARS = out;
      }
      function paintAll() {
        if (!G.w) return;
        const D = K.dark(), pal = PL[D ? 'dark' : 'bright'];
        SPR = paintSprites(D);
        BG = off(G.w, G.h);
        paintBack(BG.g, pal, D);
        drums.L.spr = paintDrum(drums.L); drums.R.spr = paintDrum(drums.R);
        if (!el.style.backgroundColor) el.style.backgroundColor = pal.sky[0];
      }
      function radial(size, stops) {
        const s = off(size, size), g = s.g, gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, size, size); return s.c;
      }
      function paintSprites(D) {
        return {
          glow: radial(256, [[0, 'rgba(255,214,140,0.95)'], [0.18, 'rgba(255,160,70,0.55)'], [0.45, 'rgba(255,96,36,0.18)'], [1, 'rgba(255,80,30,0)']]),
          light: radial(256, [[0, D ? 'rgba(255,160,80,0.55)' : 'rgba(255,170,100,0.4)'], [0.5, D ? 'rgba(255,130,60,0.18)' : 'rgba(255,150,90,0.12)'], [1, 'rgba(255,120,60,0)']]),
          coal: radial(64, [[0, 'rgba(255,200,110,0.95)'], [0.4, 'rgba(255,90,30,0.55)'], [1, 'rgba(200,40,10,0)']]),
          gold: radial(128, [[0, 'rgba(255,236,160,0.95)'], [0.55, 'rgba(255,200,90,0.45)'], [1, 'rgba(255,180,60,0)']]),
          warm: radial(128, [[0, 'rgba(255,220,190,0.7)'], [0.6, 'rgba(255,170,120,0.25)'], [1, 'rgba(255,160,100,0)']]),
          blue: radial(128, [[0, 'rgba(190,225,255,0.75)'], [0.6, 'rgba(140,190,255,0.25)'], [1, 'rgba(120,170,255,0)']]),
          halo: radial(128, [[0, 'rgba(255,200,110,0.5)'], [0.6, 'rgba(255,160,70,0.16)'], [1, 'rgba(255,140,60,0)']]),
          star: radial(48, [[0, 'rgba(255,250,232,1)'], [0.2, 'rgba(255,236,190,0.6)'], [0.55, 'rgba(255,214,150,0.12)'], [1, 'rgba(255,214,150,0)']])
        };
      }
      function pine(g, x, base, ht, wd, col, cap) {
        g.fillStyle = col;
        for (let t = 0; t < 3; t++) { const y0 = base - ht * (0.18 + t * 0.27), hw = wd * (1 - t * 0.24); g.beginPath(); g.moveTo(x - hw, y0 + ht * 0.3); g.lineTo(x, y0 - ht * 0.32); g.lineTo(x + hw, y0 + ht * 0.3); g.closePath(); g.fill(); }
        g.fillRect(x - wd * 0.08, base - ht * 0.12, wd * 0.16, ht * 0.14);
        if (cap) { g.fillStyle = cap; for (let t = 0; t < 3; t++) { const y0 = base - ht * (0.18 + t * 0.27), hw = wd * (1 - t * 0.24) * 0.55; g.beginPath(); g.moveTo(x - hw, y0 - ht * 0.04); g.lineTo(x, y0 - ht * 0.32); g.lineTo(x + hw, y0 - ht * 0.04); g.quadraticCurveTo(x, y0 + ht * 0.04, x - hw, y0 - ht * 0.04); g.fill(); } }
      }
      function moon(g, x, y, r, col, crescent) {
        const gl = g.createRadialGradient(x, y, r * 0.6, x, y, r * 4.2); gl.addColorStop(0, K.hexA(col, 0.32)); gl.addColorStop(1, K.hexA(col, 0));
        g.fillStyle = gl; g.fillRect(x - r * 4.2, y - r * 4.2, r * 8.4, r * 8.4);
        if (!crescent) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.fillStyle = 'rgba(120,120,150,0.12)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.2, r * 0.26, 0, TAU); g.arc(x + r * 0.28, y + r * 0.3, r * 0.18, 0, TAU); g.fill(); return; }
        const s = off(r * 2 + 4, r * 2 + 4), m = s.g; m.fillStyle = col; m.beginPath(); m.arc(r + 2, r + 2, r, 0, TAU); m.fill();
        m.globalCompositeOperation = 'destination-out'; m.beginPath(); m.arc(r + 2 + r * 0.55, r + 2 - r * 0.25, r * 0.92, 0, TAU); m.fill();
        g.drawImage(s.c, x - r - 2, y - r - 2, r * 2 + 4, r * 2 + 4);
      }
      function paintBack(g, pal, D) {
        const w = G.w, H = G.h, u = G.u, hz = G.horizon, f = G.fire, R = rng(K.daily() + 5);
        const sk = g.createLinearGradient(0, 0, 0, hz + 30 * u);
        sk.addColorStop(0, pal.sky[0]); sk.addColorStop(0.6, pal.sky[1]); sk.addColorStop(1, pal.sky[2]);
        g.fillStyle = sk; g.fillRect(0, 0, w, hz + 40 * u);
        const gr = g.createLinearGradient(0, hz, 0, H); gr.addColorStop(0, pal.ground[0]); gr.addColorStop(1, pal.ground[1]);
        const mx = G.moon.x, my = G.moon.y;
        if (placeId === 'beach') {
          moon(g, mx, my, 17 * u, pal.moon, false);
          const shore = Math.round(hz + (f.y - hz) * 0.36);
          const sea = g.createLinearGradient(0, hz, 0, shore); sea.addColorStop(0, pal.sea[0]); sea.addColorStop(1, pal.sea[1]);
          g.fillStyle = sea; g.fillRect(0, hz, w, shore - hz + 2);
          g.fillStyle = pal.far; g.beginPath(); g.moveTo(0, hz); for (let x = 0; x <= w; x += 20) g.lineTo(x, hz - 6 * u - Math.sin(x * 0.012) * 5 * u - (x < w * 0.25 ? (w * 0.25 - x) * 0.12 : 0)); g.lineTo(w, hz); g.closePath(); g.fill();
          for (let i = 0; i < 46; i++) { const yy = hz + 3 + Math.pow(i / 46, 1.4) * (shore - hz - 6), ww = (6 + R() * 22) * u * (0.4 + i / 46), xx = mx + (R() - 0.5) * (14 + i * 1.6) * u; g.fillStyle = K.hexA(pal.moon, 0.5 - i / 120); g.fillRect(xx - ww / 2, yy, ww, 1.4); }
          g.fillStyle = gr; g.fillRect(0, shore, w, H - shore);
          g.strokeStyle = D ? 'rgba(200,220,255,0.35)' : 'rgba(255,255,255,0.6)'; g.lineWidth = 1.6; g.beginPath();
          for (let x = 0; x <= w; x += 8) { const y = shore + Math.sin(x * 0.03) * 2.2 + Math.sin(x * 0.011) * 3; if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
          // a leaning palm at the far edge
          const px = w - 22 * u, pb = shore + 26 * u; g.strokeStyle = D ? '#0c0c18' : '#3c3550'; g.lineWidth = 7 * u; g.lineCap = 'round';
          g.beginPath(); g.moveTo(px, pb); g.quadraticCurveTo(px - 4 * u, pb - 80 * u, px - 30 * u, pb - 140 * u); g.stroke();
          g.fillStyle = g.strokeStyle; for (let k = 0; k < 6; k++) { const a = -Math.PI * 0.95 + k * 0.42; g.save(); g.translate(px - 30 * u, pb - 140 * u); g.rotate(a); g.beginPath(); g.ellipse(32 * u, 0, 34 * u, 6 * u, 0.12, 0, TAU); g.fill(); g.restore(); }
        } else if (placeId === 'forest') {
          moon(g, mx, my, 13 * u, pal.moon, false);
          g.fillStyle = gr; g.fillRect(0, hz, w, H - hz);
          for (let layer = 0; layer < 3; layer++) {
            const base = hz + layer * 9 * u, sc = (1 - layer * 0.18) * u, n = Math.round(w / (34 * sc));
            for (let i = 0; i <= n; i++) { const x = (i + R() * 0.7) * (w / n), ht = (70 + R() * 70) * sc * (layer === 2 ? 1.1 : 1); if (Math.abs(x - f.x) < 60 * u && layer === 2) continue; pine(g, x, base + 4, ht, ht * 0.28, pal.trees[layer], null); }
          }
        } else if (placeId === 'snow') {
          [[0.22, 0], [0.34, 1]].forEach(([yk, i]) => { const by = hz * yk; g.fillStyle = pal.aurora[i]; g.beginPath(); g.moveTo(0, by + 30 * u); for (let x = 0; x <= w; x += 16) g.lineTo(x, by + Math.sin(x * 0.009 + i * 2) * 18 * u); for (let x = w; x >= 0; x -= 16) g.lineTo(x, by + 46 * u + Math.sin(x * 0.007 + i) * 14 * u); g.closePath(); g.fill(); });
          moon(g, mx, my, 12 * u, pal.moon, false);
          g.fillStyle = pal.hills; g.beginPath(); g.moveTo(0, hz + 6); for (let x = 0; x <= w; x += 12) g.lineTo(x, hz - 30 * u - Math.sin(x * 0.006 + 1) * 22 * u - Math.sin(x * 0.017) * 8 * u); g.lineTo(w, hz + 6); g.closePath(); g.fill();
          g.fillStyle = gr; g.fillRect(0, hz, w, H - hz);
          const n = Math.round(w / (40 * u));
          for (let i = 0; i <= n; i++) { const x = (i + R() * 0.6) * (w / n), ht = (54 + R() * 60) * u; if (Math.abs(x - f.x) < 70 * u) continue; pine(g, x, hz + 6 + R() * 6, ht, ht * 0.3, pal.trees, pal.cap); }
        } else {
          moon(g, mx, my, 15 * u, pal.moon, true);
          g.fillStyle = pal.far; g.beginPath(); g.moveTo(0, hz + 4);
          const mesas = [[0.04, 0.2, 52], [0.3, 0.42, 34], [0.62, 0.86, 64]];
          let x0 = 0; mesas.forEach(([a, b, ht]) => { const xa = a * w, xb = b * w; g.lineTo(xa, hz - 6 * u); g.lineTo(xa + 18 * u, hz - ht * u); g.lineTo(xb - 14 * u, hz - ht * u); g.lineTo(xb, hz - 4 * u); x0 = xb; });
          g.lineTo(w, hz - 8 * u); g.lineTo(w, hz + 4); g.closePath(); g.fill(); void x0;
          g.fillStyle = gr; g.fillRect(0, hz, w, H - hz);
          g.fillStyle = D ? 'rgba(255,170,120,0.05)' : 'rgba(255,220,180,0.18)';
          for (let i = 0; i < 3; i++) { g.beginPath(); const y = hz + (18 + i * 26) * u; g.moveTo(0, y + 20 * u); g.quadraticCurveTo(w * (0.3 + i * 0.2), y - 14 * u, w, y + 10 * u); g.lineTo(w, y + 30 * u); g.lineTo(0, y + 30 * u); g.closePath(); g.fill(); }
          const cactus = (x, b, s) => { g.fillStyle = pal.near; g.beginPath(); rrect(g, x - 5 * s, b - 64 * s, 10 * s, 64 * s, 5 * s); rrect(g, x - 19 * s, b - 46 * s, 8 * s, 22 * s, 4 * s); rrect(g, x - 19 * s, b - 28 * s, 16 * s, 7 * s, 3.5 * s); rrect(g, x + 11 * s, b - 54 * s, 8 * s, 26 * s, 4 * s); rrect(g, x + 3 * s, b - 32 * s, 16 * s, 7 * s, 3.5 * s); g.fill(); };
          cactus(w * (G.phone ? 0.1 : 0.12), hz + 22 * u, 1.05 * u); cactus(w * (G.phone ? 0.93 : 0.86), hz + 30 * u, 1.3 * u);
        }
        // the clearing: warm dust around the fire pit
        const cl = g.createRadialGradient(f.x, f.y + 14 * u, 10, f.x, f.y + 14 * u, (G.phone ? 260 : 460) * u);
        cl.addColorStop(0, pal.dust); cl.addColorStop(1, 'rgba(0,0,0,0)');
        g.save(); g.translate(f.x, f.y + 14 * u); g.scale(1, 0.42); g.translate(-f.x, -(f.y + 14 * u)); g.fillStyle = cl; g.fillRect(f.x - 500 * u, f.y + 14 * u - 600 * u, 1000 * u, 1200 * u); g.restore();
        scatter(g, D);
        // seat logs for Sync and Patch
        ['sync', 'patch'].forEach(k => { const st = G.seats[k]; if (!st) return; g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(st.x + st.s / 2, st.y + st.s * 1.04, st.s * 0.8, 6 * u, 0, 0, TAU); g.fill(); log(g, st.x + st.s / 2, st.y + st.s * 0.96, st.s * 1.45, 8.5 * u, D, k === 'sync' ? 0.05 : -0.05); });
        // fire pit: stones and logs
        const sr = 50 * u, sy = 15 * u;
        for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU, x = f.x + Math.cos(a) * sr, y = f.y + 6 * u + Math.sin(a) * sy; stone(g, x, y, (7 + (i % 3) * 1.6) * u, D, Math.sin(a) > 0); }
        log(g, f.x - 10 * u, f.y + 2 * u, 56 * u, 8 * u, D, -0.32); log(g, f.x + 10 * u, f.y + 2 * u, 56 * u, 8 * u, D, 0.32); log(g, f.x, f.y + 6 * u, 48 * u, 7.5 * u, D, 0.04);
        // a woven mat under the two drums
        const dL = drums.L, dR = drums.R, my2 = dL.cy + dL.bodyH * 0.92, mrx = (dR.cx - dL.cx) / 2 + dL.rx + 34 * u, mry = 26 * u;
        g.save(); g.beginPath(); g.ellipse(G.w / 2, my2, mrx, mry, 0, 0, TAU); g.clip();
        g.fillStyle = D ? '#5a2a22' : '#9d4a36'; g.fillRect(G.w / 2 - mrx, my2 - mry, mrx * 2, mry * 2);
        const stripes = D ? ['#7d3a2a', '#c48a46', '#2f4b5a', '#d8c39a'] : ['#b9583e', '#e3ad5c', '#477388', '#f2e2bd'];
        for (let i = -8; i <= 8; i++) { g.fillStyle = stripes[(i + 8) % 4]; g.globalAlpha = 0.55; g.fillRect(G.w / 2 - mrx, my2 + i * mry * 0.24 - 1.5, mrx * 2, 3); }
        g.globalAlpha = 1; g.restore();
        // vignette
        const vg = g.createRadialGradient(G.w / 2, G.h * 0.55, Math.min(G.w, G.h) * 0.35, G.w / 2, G.h * 0.55, Math.max(G.w, G.h) * 0.8);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, D ? 'rgba(0,0,8,0.5)' : 'rgba(30,20,60,0.22)');
        g.fillStyle = vg; g.fillRect(0, 0, G.w, G.h);
      }
      /* Small things on the ground between the fire and the drums, so the clearing has depth (seeded by the day). */
      function scatter(g, D) {
        const R = rng(K.daily() + 77), f = G.fire, u = G.u, w = G.w, y0 = f.y + 30 * u, y1 = drums.L.cy - drums.L.ry - 6;
        const n = G.phone ? 30 : 56, warm = D ? 0.5 : 0.85;
        for (let i = 0; i < n; i++) {
          const x = 8 + R() * (w - 16), y = y0 + Math.pow(R(), 0.85) * (y1 - y0), kind = R(), rot = (R() - 0.5) * 0.8;
          if (Math.abs(x - f.x) < 110 * u && y < G.hudY + 64 * u) continue;
          const sc = (0.55 + 0.75 * (y - y0) / Math.max(1, y1 - y0)) * u;
          const lit = Math.max(0, 1 - Math.hypot((x - f.x) / (w * 0.7), (y - f.y) / 260)) * warm;
          g.save(); g.translate(x, y); g.rotate(rot); g.scale(sc, sc);
          if (placeId === 'snow') {
            if (kind < 0.55) { g.fillStyle = D ? '#6a7aa2' : '#f4f7fd'; g.beginPath(); g.ellipse(0, 0, 18, 6, 0, Math.PI, 0); g.fill(); g.fillStyle = D ? 'rgba(20,30,70,0.35)' : 'rgba(110,140,200,0.3)'; g.beginPath(); g.ellipse(4, 1, 16, 3, 0, 0, Math.PI); g.fill(); }
            else { g.strokeStyle = D ? '#2a2030' : '#6a5560'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-9, 2); g.lineTo(9, -2); g.moveTo(1, 0); g.lineTo(5, -6); g.stroke(); }
          } else if (kind < 0.42) {
            const c = placeId === 'forest' ? (D ? [70, 74, 66] : [128, 130, 112]) : placeId === 'beach' ? (D ? [92, 80, 78] : [214, 196, 176]) : (D ? [96, 66, 56] : [150, 104, 80]);
            g.fillStyle = 'rgb(' + c.map(v => Math.round(v * (1 + lit * 0.4))).join(',') + ')'; g.beginPath(); g.ellipse(0, 0, 6, 3.6, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = 'rgba(255,220,180,' + (0.2 + lit * 0.3).toFixed(2) + ')'; g.beginPath(); g.ellipse(-1.5, -1.2, 3, 1.2, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(1.5, 3, 6, 1.4, 0, 0, Math.PI * 2); g.fill();
          } else if (kind < 0.78 || placeId === 'forest') {
            const col = placeId === 'forest' ? (D ? '#2c4a2e' : '#5f8f4c') : placeId === 'beach' ? (D ? '#4a4a32' : '#9c9a62') : (D ? '#5a4632' : '#b0905a');
            g.strokeStyle = col; g.lineWidth = 1.6; g.lineCap = 'round'; g.beginPath();
            for (let b = -2; b <= 2; b++) { g.moveTo(b * 1.5, 0); g.quadraticCurveTo(b * 3, -7, b * 5.5, -12 + Math.abs(b) * 2.5); }
            g.stroke();
          } else if (placeId === 'beach') {
            g.fillStyle = D ? '#8a7470' : '#f3dcc8'; g.beginPath(); g.moveTo(0, 2); for (let k2 = 0; k2 <= 6; k2++) { const a = Math.PI + k2 * Math.PI / 6; g.lineTo(Math.cos(a) * 7, 2 + Math.sin(a) * 7); } g.closePath(); g.fill();
            g.strokeStyle = D ? 'rgba(40,20,20,0.4)' : 'rgba(150,100,80,0.5)'; g.lineWidth = 0.8; g.beginPath(); for (let k2 = 1; k2 < 6; k2++) { const a = Math.PI + k2 * Math.PI / 6; g.moveTo(0, 2); g.lineTo(Math.cos(a) * 6.5, 2 + Math.sin(a) * 6.5); } g.stroke();
          } else {
            g.strokeStyle = D ? 'rgba(255,200,150,0.07)' : 'rgba(255,240,220,0.32)'; g.lineWidth = 1.4; g.beginPath(); g.arc(0, 26, 28, Math.PI * 1.32, Math.PI * 1.68); g.stroke();
          }
          g.restore();
        }
      }
      function stone(g, x, y, r, D, front) {
        g.fillStyle = D ? (front ? '#4a4450' : '#35303a') : (front ? '#8a8290' : '#6f6878');
        g.beginPath(); g.ellipse(x, y, r * 1.25, r * 0.78, 0, 0, TAU); g.fill();
        g.fillStyle = D ? 'rgba(255,170,110,0.22)' : 'rgba(255,230,200,0.35)'; g.beginPath(); g.ellipse(x - r * 0.2, y - r * 0.3, r * 0.7, r * 0.3, 0, 0, TAU); g.fill();
      }
      function log(g, x, y, len, r, D, rot) {
        g.save(); g.translate(x, y); g.rotate(rot || 0);
        g.fillStyle = D ? '#3b2416' : '#6d4429'; g.beginPath(); rrect(g, -len / 2, -r, len, r * 2, r); g.fill();
        g.fillStyle = D ? 'rgba(255,170,110,0.16)' : 'rgba(255,220,180,0.3)'; g.fillRect(-len / 2 + r, -r + 1.5, len - 2 * r, r * 0.5);
        g.fillStyle = D ? '#7a5236' : '#b98a5c'; g.beginPath(); g.ellipse(len / 2 - r * 0.2, 0, r * 0.45, r * 0.95, 0, 0, TAU); g.fill();
        g.restore();
      }
      function paintDrum(d) {
        const { rx, ry, bodyH } = d, pad = 14, s = off(rx * 2 + pad * 2, ry * 2 + bodyH + pad * 2), g = s.g, ox = rx + pad, oy = ry + pad, D = K.dark();
        const wood = d.side === 'L' ? ['#2e1308', '#6e3418', '#b26a38', '#6e3418', '#250f06'] : ['#24130a', '#5a351d', '#9a6538', '#5a351d', '#1c0e06'];
        const wx = rx * 0.5, fx = rx * 0.64, wy = oy + bodyH * 0.6, fy = oy + bodyH - ry * 0.3;
        g.beginPath();
        g.moveTo(ox - rx, oy);
        g.bezierCurveTo(ox - rx, oy + bodyH * 0.3, ox - wx * 1.06, wy - bodyH * 0.14, ox - wx, wy);
        g.bezierCurveTo(ox - wx * 0.98, wy + bodyH * 0.16, ox - fx, fy - bodyH * 0.1, ox - fx, fy);
        g.ellipse(ox, fy, fx, ry * 0.5, 0, Math.PI, 0, true);
        g.bezierCurveTo(ox + fx, fy - bodyH * 0.1, ox + wx * 0.98, wy + bodyH * 0.16, ox + wx, wy);
        g.bezierCurveTo(ox + wx * 1.06, wy - bodyH * 0.14, ox + rx, oy + bodyH * 0.3, ox + rx, oy);
        g.ellipse(ox, oy, rx, ry, 0, 0, Math.PI, false);
        g.closePath();
        const wg = g.createLinearGradient(ox - rx, 0, ox + rx, 0); wood.forEach((c, i) => wg.addColorStop(i / 4, c));
        g.fillStyle = wg; g.fill();
        g.save(); g.clip();
        const vs = g.createLinearGradient(0, oy, 0, fy + ry * 0.5); vs.addColorStop(0, 'rgba(0,0,0,0)'); vs.addColorStop(0.55, 'rgba(0,0,0,0.12)'); vs.addColorStop(1, 'rgba(0,0,0,0.45)');
        g.fillStyle = vs; g.fillRect(ox - rx, oy, rx * 2, bodyH + ry);
        // painted band of triangles across the bowl
        const by = oy + ry * 1.25 + bodyH * 0.06;
        g.fillStyle = d.side === 'L' ? 'rgba(240,200,120,0.55)' : 'rgba(220,120,80,0.55)';
        for (let i = -6; i <= 6; i++) { const x = ox + i * rx * 0.16, yy = by + Math.pow(Math.abs(i) / 6.5, 2) * -ry * 0.45; g.beginPath(); g.moveTo(x - rx * 0.07, yy); g.lineTo(x, yy + 9); g.lineTo(x + rx * 0.07, yy); g.closePath(); g.fill(); }
        // lower rope ring and the zigzag tuning ropes
        const lr = oy + bodyH * 0.44, lrx = rx * 0.68, lry = ry * 0.55;
        g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 4.5; g.beginPath(); g.ellipse(ox, lr + 1, lrx, lry, 0, 0, Math.PI); g.stroke();
        g.strokeStyle = '#d9c08a'; g.lineWidth = 3; g.beginPath(); g.ellipse(ox, lr, lrx, lry, 0, 0, Math.PI); g.stroke();
        g.strokeStyle = 'rgba(235,214,165,0.85)'; g.lineWidth = 1.5; g.beginPath();
        const n = 11;
        for (let i = 0; i <= n; i++) {
          const a = Math.PI * (0.06 + 0.88 * i / n), tx = ox - Math.cos(a) * rx * 0.97, ty = oy + Math.sin(a) * ry * 0.97 + 4;
          const a2 = Math.PI * (0.06 + 0.88 * (i + 0.5) / n), bx = ox - Math.cos(a2) * lrx, byy = lr + Math.sin(a2) * lry;
          if (i === 0) g.moveTo(tx, ty); else g.lineTo(tx, ty);
          if (i < n) g.lineTo(bx, byy);
        }
        g.stroke();
        g.restore();
        // rim and skin
        g.strokeStyle = '#2a1608'; g.lineWidth = 9; g.beginPath(); g.ellipse(ox, oy, rx, ry, 0, 0, TAU); g.stroke();
        g.strokeStyle = '#d6bb82'; g.lineWidth = 5; g.beginPath(); g.ellipse(ox, oy, rx - 0.5, ry - 0.5, 0, 0, TAU); g.stroke();
        g.strokeStyle = 'rgba(255,245,215,0.55)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(ox, oy - 1.5, rx - 2, ry - 2, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
        g.save(); g.beginPath(); g.ellipse(ox, oy, rx - 3, ry - 3, 0, 0, TAU); g.clip();
        g.translate(ox, oy); g.scale(1, ry / rx);
        const sg = g.createRadialGradient(-rx * 0.18, -rx * 0.3, 2, 0, 0, rx); sg.addColorStop(0, D ? '#f6e7c8' : '#fbf0d8'); sg.addColorStop(0.62, '#e2c494'); sg.addColorStop(1, '#a87c4c');
        g.fillStyle = sg; g.fillRect(-rx, -rx, rx * 2, rx * 2);
        g.strokeStyle = 'rgba(110,60,25,0.32)'; g.lineWidth = 2.4; g.beginPath();
        if (d.side === 'L') { for (let a = 0; a < 5.4 * Math.PI; a += 0.12) { const r = 3 + a * rx * 0.032; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (a === 0) g.moveTo(x, y); else g.lineTo(x, y); } }
        else { g.arc(0, 0, rx * 0.2, 0, TAU); for (let k = 0; k < 8; k++) { const a = k * TAU / 8; g.moveTo(Math.cos(a) * rx * 0.3, Math.sin(a) * rx * 0.3); g.lineTo(Math.cos(a) * rx * 0.46, Math.sin(a) * rx * 0.46); } }
        g.stroke();
        g.restore();
        return s;
      }

      /* ---------------- words: the player's own looping thoughts, else warm generic ones ---------------- */
      const sparks = [];
      function makeSparks() {
        if (sparks.length) return;
        const low = text.toLowerCase().replace(/[’‘]/g, "'");
        const own = (label) => {
          if (!low) return false;
          if (an.source === 'ai') return true;
          const ws = label.toLowerCase().replace(/[’‘]/g, "'").split(/\s+/).map(x => x.replace(/[^a-z0-9']/g, '')).filter(x => x.length > 2);
          return !!ws.length && ws.filter(x => low.includes(x)).length / ws.length >= 0.6;
        };
        const seen = new Set(), mine = [];
        const add = (s) => { const l = String((s && s.label) || '').trim(); const key = l.replace(/[^A-Za-z0-9]/g, '').toUpperCase(); if (!l || seen.has(key) || !own(l)) return null; seen.add(key); const it = { label: l.length > 28 ? l.slice(0, 27) + '…' : l, own: true }; mine.push(it); return it; };
        (an.strands || []).forEach(add);
        const core = an.core ? add(an.core) : null;
        let list = mine.filter(x => x !== core).slice(0, NSPARK - (core ? 1 : 0));
        if (core) list.push(core);
        const fill = GENERIC.filter(gw => !seen.has(gw.replace(/[^A-Za-z0-9]/g, '')));
        while (list.length < NSPARK) list.splice(core ? list.length - 1 : list.length, 0, { label: fill.shift() || 'THE NOISE', own: false });
        list = list.slice(0, NSPARK);
        list.forEach((it, i) => {
          const big = i === NSPARK - 1;
          const inner = h('span', { class: 'sd-spark-in' + (it.own ? ' gk-user' : ''), text: it.label });
          const node = h('div', { class: 'sd-spark' + (big ? ' sd-big' : ''), hidden: true }, inner);
          sparkLayer.append(node);
          sparks.push({ label: it.label, own: it.own, big, hp: big ? 2 : 1, el: node, inner, state: 'wait', slot: i, x: 0, y: 0, t0: 0, ph: i * 1.7 + 0.4 });
        });
        ctx.track('sparks', { n: sparks.length, own: sparks.filter(s => s.own).length });
      }

      /* ---------------- audio ---------------- */
      const L = { sync: false, patch: false, still: false, instr: false };
      let fireLoop = null, placeLoop = null, ambT = 0, owlT = 9;
      function startAmb() {
        if (!A.ctx || fireLoop || S.destroyed) return;
        fireLoop = A.loop({ pink: true, filter: 'lowpass', freq: 300, q: 0.5, bus: 'amb' });
        if (fireLoop) fireLoop.level(0.16, 1.5);
        if (placeId !== 'forest') { placeLoop = A.loop({ pink: true, filter: placeId === 'snow' ? 'bandpass' : 'lowpass', freq: placeId === 'beach' ? 520 : placeId === 'snow' ? 950 : 280, q: 0.45, bus: 'amb' }); }
      }
      startAmb(); S.on('audio-ready', startAmb);
      S.onDestroy(() => { if (fireLoop) fireLoop.stop(); if (placeLoop) placeLoop.stop(); });
      const beatLen = () => 60 / Math.max(30, R.bpm);
      function pulse(t, v) { A.tone({ when: t, type: 'sine', freq: 96, to: 52, glide: 0.11, dur: 0.28, vol: v, attack: 0.003, bus: 'music' }); A.noise({ when: t, filter: 'lowpass', freq: 520, dur: 0.05, vol: v * 0.4, bus: 'music' }); }
      function chordOf(p) { return PROG[Math.floor(Math.max(0, p.bar) / 2) % PROG.length]; }
      function audioBeat(t, p) {
        if (!A.ctx) return;
        const soft = inten === 0 ? 0.8 : 1, half = beatLen() / 2, calm = K.clamp((START - R.bpm) / (START - END), 0, 1);
        if (p.kind === 'count') { A.wood(t, p.bib === 0 ? 0.3 : 0.2, p.bib === 0 ? 1.32 : 1.04); if (p.bib === 0) A.pad(PROG[0].pad.map(n => A.note(n)), { when: t, dur: 4 * beatLen() + 0.8, vol: 0.06, attack: 1.2, lp: 900 }); return; }
        if (p.kind === 'tap') pulse(t, (p.bib === 0 ? 0.17 : 0.12) * (1 - calm * 0.3));
        if (p.bib === 0 && (p.ph === 'breath' || p.bar % 2 === 0)) A.pad(chordOf(p).pad.map(n => A.note(n)), { when: t, dur: (p.ph === 'breath' ? 6 : 8) * beatLen() + 0.8, vol: 0.085 * (1 - calm * 0.25), attack: 1.0, lp: 950 });
        if (p.ph !== 'breath') {
          if (L.sync) { A.shaker(t, 0.028 * soft); A.shaker(t + half, 0.05 * soft * (1 - calm * 0.4)); if (inten === 2 && calm < 0.5) A.shaker(t + half * 0.5, 0.02); }
          if (L.patch && (p.bib === 1 || p.bib === 3)) A.wood(t, 0.13 * soft * (1 - calm * 0.3), 0.92);
        } else {
          if (L.sync && p.bib === 2) A.brush(t, 0.05, beatLen() * 3.2);
          if (L.patch && p.bib === 1) A.wood(t, 0.08, 0.82);
        }
        if (L.still && p.bib === 0) { const n = A.note(chordOf(p).bass); A.pluck(n, { when: t, vol: 0.42, damp: 0.995, lp: 520, bus: 'music' }); A.tone({ when: t, type: 'sine', freq: n, dur: 1.1, vol: 0.12, attack: 0.012, bus: 'music' }); }
        if (L.still && p.ph !== 'breath' && p.bib === 2) A.pluck(A.note(chordOf(p).bass) * 1.5, { when: t, vol: 0.2, damp: 0.994, lp: 600, bus: 'music' });
        if (p.ph === 'breath' && L.instr && instr) instrBeat(t, p);
      }
      function instrBeat(t, p) {
        const bl = beatLen();
        if (instr.id === 'kalimba' && p.kind === 'rest') { const f = A.note(KAL[(p.cycle * 4 + p.bib - 2) % KAL.length]); A.tone({ when: t, type: 'sine', freq: f, dur: 1.5, vol: 0.09, attack: 0.002, verb: 0.3, bus: 'music' }); A.tone({ when: t, type: 'sine', freq: f * 5.4, dur: 0.12, vol: 0.018, attack: 0.001, bus: 'music' }); }
        if (instr.id === 'rainstick' && p.bib === 2) { for (let k = 0; k < 22; k++) { const q = k / 22; A.noise({ when: t + bl * 3.4 * Math.pow(q, 0.8) + Math.random() * 0.03, filter: 'bandpass', freq: 3000 + Math.random() * 4000, q: 4, dur: 0.014, vol: 0.04 * (1 - q * 0.6), bus: 'music' }); } }
        if (instr.id === 'framedrum') { if (p.bib === 0) A.drum(t, 0.24, 0.5, 0.12); if (p.bib === 1) A.drum(t, 0.15, 0.6, 0.08); if (p.bib === 3) A.shaker(t, 0.03); }
        if (instr.id === 'bowl' && p.bib === 0) { A.tone({ when: t, type: 'sine', freq: 196, dur: 5.5, vol: 0.06, attack: 0.04, verb: 0.5, bus: 'music' }); A.tone({ when: t, type: 'sine', freq: 197.6, dur: 5.5, vol: 0.05, attack: 0.04, bus: 'music' }); A.tone({ when: t, type: 'sine', freq: 196 * 2.71, dur: 3, vol: 0.018, attack: 0.04, bus: 'music' }); }
        if (instr.id === 'ocean' && p.bib === 2) A.noise({ when: t, pink: true, filter: 'lowpass', freq: 380, to: 1100, dur: bl * 3.6, attack: bl * 1.6, vol: 0.11, bus: 'music' });
      }
      function drumSound(side, kind) {
        if (!A.ctx) return;
        const t = A.now(), p = side === 'L' ? 0.78 : 0.98;
        const v = { perfect: 0.62, good: 0.56, off: 0.44, free: 0.46, big: 0.7, rest: 0.2 }[kind] || 0.45;
        A.drum(t, v, kind === 'rest' ? p * 1.3 : p, kind === 'rest' ? 0 : 0.2);
        if (kind === 'perfect' || kind === 'good' || kind === 'big') A.tone({ when: t, type: 'sine', freq: 70 * p, to: 42, glide: 0.25, dur: 0.5, vol: kind === 'perfect' ? 0.26 : 0.18, attack: 0.003 });
        if (kind === 'perfect') A.tone({ when: t + 0.004, type: 'sine', freq: A.note(side === 'L' ? 'A5' : 'D6'), dur: 0.6, vol: 0.022, attack: 0.002, verb: 0.4 });
        A.sync('drum', performance.now());
      }
      function crackle(n, v) { if (!A.ctx) return; const t = A.now(); for (let i = 0; i < n; i++) A.noise({ when: t + i * 0.035 + Math.random() * 0.02, filter: 'highpass', freq: 2400 + Math.random() * 3600, dur: 0.012 + Math.random() * 0.02, vol: v * (0.6 + Math.random() * 0.6) }); }

      /* ---------------- the rhythm ---------------- */
      const beats = new Map(), visQ = [], pend = [], preHits = new Map(), barStats = new Map();
      const R = K.rhythm({ bpm: START, ease: 0.22, onBeat });
      let ending = false;
      function onBeat(t, i) {
        const p = plan[i];
        if (!p) {
          if (!ending) { ending = true; R.stop(); S.later(() => finale(), Math.max(0, (t - A.now()) * 1000) + 200); }
          return;
        }
        if (p.target != null) R.set(p.target);
        const rec = { t, i, p, grade: '', side: '', score: 0, delta: 0 };
        const pre = preHits.get(i); if (pre) { Object.assign(rec, pre); preHits.delete(i); }
        beats.set(i, rec);
        audioBeat(t, p);
        visQ.push(rec);
      }
      function barStat(p) { let b = barStats.get(p.bar); if (!b) { b = { bar: p.bar, bpm: R.bpm, n: 0, sum: 0 }; barStats.set(p.bar, b); } return b; }
      function processBeats(vn) {
        while (visQ.length && visQ[0].t <= vn) { const rec = visQ.shift(); heard(rec); pend.push(rec); }
        while (pend.length && pend[0].t + 0.34 < vn) finalize(pend.shift());
      }
      function upcoming(vn) {
        for (const rec of visQ) if (rec.p.kind !== 'rest' && rec.t > vn - 0.02) return rec;
        const p = plan[R.index];
        return R.running && p && p.kind !== 'rest' ? { t: R.next, p } : null;
      }

      /* ---------------- game state ---------------- */
      let phase = 'intro', finished = false;
      const ST = { judged: 0, sum: 0, pocket: 0, pocketLive: 0, streak: 0, best: 0, offs: [], wrongRun: 0, popped: 0, coachT: 0, coached: { early: 0, late: 0, side: 0 }, restSaid: false, firstPocket: false };
      function heard(rec) {
        const p = rec.p;
        W.kick = Math.min(1.5, W.kick + (p.kind === 'rest' ? 0.04 : p.bib === 0 ? 0.3 : 0.18));
        W.beatAt = performance.now();
        if (p.bar >= 0 && p.bib === 0) barStat(p).bpm = R.bpm;
        if (p.kind !== 'rest') { const d = p.side ? drums[p.side] : null; if (d) d.flash = 1; else { drums.L.flash = 0.6; drums.R.flash = 0.6; } }
        if (p.ph === 'count') {
          if (p.bib === 0) dotsSet(['', '', '', '']);
          dotsOn(p.bib);
          return;
        }
        bob();
        if (p.ph === 'groove') {
          if (p.gbar === 0 && p.bib === 0) startGroove();
          if (p.bib === 0 && p.gbar >= 1 && p.gbar <= NSPARK) launchSpark();
          if (p.bib === 0 && !L.sync && (p.gbar >= syncForce || (p.gbar >= syncEarly && ST.pocketLive >= 3))) join('sync');
          else if (p.bib === 0 && L.sync && !L.patch && (p.gbar >= patchForce || (p.gbar >= patchEarly && ST.pocketLive >= 8))) join('patch');
          if (p.gbar === 1 && p.bib === 2) still.say(gentleLine({ Jolly: 'Those sparks are the thoughts that keep crackling. Hit the beat and they turn to stars.', Cheeky: 'Your thoughts are sparking off the fire. On-beat hits pop them. Very scientific.', Unfiltered: 'Those are your loud thoughts. Hit on the beat and they pop.' }), { ms: 4200 });
        }
        if (p.ph === 'slow') {
          if (p.sbar === 0 && p.bib === 0) twist();
          if (p.sbar === Math.max(1, Math.floor(nSlow * 0.45)) && p.bib === 0 && L.sync) say(sync, line({ Jolly: 'Slower… okay… my shaker’s getting dreamy.', Cheeky: 'Wait, are we slowing down? I love it here.', Unfiltered: 'Slower. Fine by me.' }), 2800, 'calm');
          if (p.sbar === Math.max(2, nSlow - 3) && p.bib === 0 && L.patch) say(patch, line({ Jolly: 'Tok… … tok. My block’s getting sleepy.', Cheeky: 'Tok. (yawn) Tok.', Unfiltered: 'Slow tok.' }), 2600, 'sleepy');
        }
        if (p.ph === 'breath') {
          if (p.cycle === 0 && p.bib === 0) breathStart();
          if (p.bib === 0) dotsSet(['in', 'in', 'out', 'out', 'out', 'out']);
          dotsOn(p.bib);
          if (p.bib === 0) cueShow('in…', beatLen() * 2000 * 0.95);
          if (p.bib === 2) { cueShow('and out…', beatLen() * 4000 * 0.95); W.rest = 1; P.emit('smoke', G.fire.x, G.fire.y - 40 * G.u, 3, { angle: -Math.PI / 2, spread: 0.4, speed: [8, 18], colors: ['rgba(200,200,220,0.16)'] }); }
        }
      }
      function finalize(rec) {
        const p = rec.p;
        beats.delete(rec.i);
        if (p.kind !== 'tap') return;
        ST.judged++; ST.sum += rec.score || 0;
        const ok = rec.grade === 'perfect' || rec.grade === 'good';
        if (ok) ST.pocket++; else if (!rec.grade) ST.streak = 0;
        const b = barStat(p); b.n++; b.sum += rec.score || 0;
      }

      /* ---------------- input ---------------- */
      function hit(side, pt, trusted) {
        if (phase === 'intro') return;
        const d = drums[side];
        if (trusted && S.buzz) S.buzz(8);
        if (phase === 'wake') { wake(side, pt); return; }
        if (phase === 'end' || !R.running) { strike(d, pt, 'free'); return; }
        const j = R.judge(), bi = j.beat ? j.beat.i : -1, p = plan[bi];
        if (!p || p.kind === 'count') { strike(d, pt, 'free'); return; }
        if (p.kind === 'rest') { strike(d, pt, 'rest'); restTap(); return; }
        const rec = beats.get(bi), prev = rec ? rec.grade : ((preHits.get(bi) || {}).grade || '');
        const g = j.grade;
        if (g === 'perfect' || g === 'good') {
          if (prev === 'perfect' || prev === 'good') { strike(d, pt, 'free'); return; }
          const wrong = !!p.side && p.side !== side;
          const res = { grade: g, side, score: (g === 'perfect' ? 1 : 0.75) * (wrong ? 0.85 : 1), delta: j.delta };
          if (rec) Object.assign(rec, res); else preHits.set(bi, res);
          pocketHit(d, pt, g, wrong, j.delta);
        } else if (g === 'repeat') strike(d, pt, 'free');
        else {
          const res = { grade: g, side, score: 0.2, delta: j.delta };
          if (rec && !rec.grade) Object.assign(rec, res); else if (!rec && !preHits.has(bi)) preHits.set(bi, res);
          ST.streak = 0; ST.offs.push(j.delta); if (ST.offs.length > 6) ST.offs.shift();
          strike(d, pt, 'off'); coach();
        }
      }
      function strike(d, pt, kind) {
        drumSound(d.side, kind);
        d.sq = 1; d.sqv = 0;
        d.glow = { perfect: 1, good: 0.85, big: 1, rest: 0.55 }[kind] || 0.45;
        d.glowCol = kind === 'perfect' || kind === 'good' || kind === 'big' ? 'gold' : kind === 'rest' ? 'blue' : 'warm';
        let x = d.cx, y = d.cy;
        if (pt) { const dx = (pt.x - d.cx) / d.rx, dy = (pt.y - d.cy) / d.ry; if (dx * dx + dy * dy < 0.85) { x = pt.x; y = pt.y; } }
        d.rip.push({ x, y, t0: performance.now(), col: d.glowCol }); if (d.rip.length > 5) d.rip.shift();
        const n = { perfect: 16, good: 12, big: 22, off: 6, free: 6 }[kind] || 0;
        if (n) P.emit('spark', G.fire.x + (d.side === 'L' ? -10 : 10) * G.u, G.fire.y - 28 * G.u, n, { angle: -Math.PI / 2 + (d.side === 'L' ? -0.3 : 0.3), spread: 1.0, speed: [90, 250], colors: kind === 'perfect' || kind === 'big' ? ['#fff3c4', '#ffd36b', '#ffae4a'] : ['#ffb066', '#ff8a3d', '#ffd9a0'] });
        if (kind !== 'rest') P.emit('ember', d.cx + (Math.random() - 0.5) * d.rx, d.cy - 4, kind === 'perfect' ? 5 : 2, { speed: [20, 60], angle: -Math.PI / 2, spread: 1.2 });
        W.kick = Math.min(1.5, W.kick + ({ perfect: 0.5, good: 0.4, big: 0.7 }[kind] || 0.2));
        if (kind === 'perfect' && !red()) W.nudge = 1;
      }
      function pocketHit(d, pt, g, wrong, delta) {
        ST.streak++; ST.pocketLive++; ST.best = Math.max(ST.best, ST.streak);
        ST.offs.push(delta); if (ST.offs.length > 6) ST.offs.shift();
        strike(d, pt, g === 'perfect' ? 'perfect' : 'good');
        popSpark();
        if (!ST.firstPocket) { ST.firstPocket = true; K.pop('IN THE POCKET', { x: d.cx, y: d.cy - d.ry - 40, kind: 'great' }); still.face('happy', 1200); }
        else if (ST.streak > 0 && ST.streak % 8 === 0) {
          K.pop(ST.streak + ' IN THE POCKET', { x: G.fire.x, y: G.hudY + (G.phone ? 84 : 92), kind: 'great' });
          if (L.sync && ST.streak === 8) say(sync, line({ Jolly: 'You’re right in the pocket!', Cheeky: 'Okay, show-off. That’s a groove.', Unfiltered: 'Locked in.' }), 2200, 'laugh');
          else if (L.sync) { sync.face('celebrate', 1100); sync.react('bounce'); }
          if (L.patch) patch.face('wow', 1100);
        }
        if (wrong) { ST.wrongRun++; if (ST.wrongRun >= 3 && ST.coached.side < 1) { ST.coached.side++; ST.wrongRun = 0; still.say(line({ Jolly: 'Left, then right. Like walking slowly.', Cheeky: 'Other hand! The drums like to share.', Unfiltered: 'Alternate. Left, right.' }), { ms: 2600 }); } }
        else ST.wrongRun = 0;
        coach();
      }
      function coach() {
        if (ST.offs.length < 5 || phase !== 'play') return;
        const now = performance.now(); if (now - ST.coachT < 14000) return;
        const m = ST.offs.reduce((a, b) => a + b, 0) / ST.offs.length;
        if (m < -0.075 && ST.coached.early < 2) { ST.coached.early++; ST.coachT = now; ST.offs = []; still.say(line({ Jolly: 'Let the beat come to you. Hit as the ring lands.', Cheeky: 'You’re early. The beat will wait for you. Probably.', Unfiltered: 'Early. Wait for the ring.' }), { ms: 2800 }); }
        else if (m > 0.075 && ST.coached.late < 2) { ST.coached.late++; ST.coachT = now; ST.offs = []; still.say(line({ Jolly: 'Lean in a touch. Hit as the ring lands.', Cheeky: 'Bit late. The ring’s not shy, go and meet it.', Unfiltered: 'Late. Hit with the ring.' }), { ms: 2800 }); }
      }
      function restTap() {
        if (ST.restSaid) return;
        ST.restSaid = true;
        still.say(line({ Jolly: 'Rest here. Let the breath out be long.', Cheeky: 'Hands off, it’s exhale time.', Unfiltered: 'Rest. Breathe out.' }), { ms: 2400, mood: 'calm' });
      }

      /* ---------------- sparks: thoughts that crackle until a beat turns them into stars ---------------- */
      const skyStars = [];
      function launchSpark() {
        makeSparks();
        const s = sparks.find(x => x.state === 'wait'); if (!s) return;
        s.state = 'rise'; s.t0 = performance.now(); s.el.hidden = false;
        s.x = G.fire.x; s.y = G.fire.y - 60 * G.u;
        crackle(3, 0.05);
        P.emit('spark', G.fire.x, G.fire.y - 50 * G.u, 10, { angle: -Math.PI / 2, spread: 0.7, speed: [120, 260] });
      }
      function popSpark() {
        const s = sparks.find(x => x.state === 'ripe'); if (!s) return;
        s.hp--;
        if (s.hp > 0) {
          s.inner.animate([{ scale: 1 }, { scale: 1.16 }, { scale: 0.94 }, { scale: 1 }], { duration: 380, easing: 'ease-out' });
          crackle(4, 0.06); P.emit('spark', s.x, s.y, 10, { colors: ['#fff3c4', '#ffd36b'], speed: [60, 160] });
          return;
        }
        s.state = 'gone'; ST.popped++;
        s.inner.animate([{ scale: 1, opacity: 1 }, { scale: 1.32, opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
        S.later(() => s.el.remove(), 560);
        P.emit('star', s.x, s.y, 14, { colors: ['#fffbe6', '#ffe58a', '#ffd0a0'], speed: [70, 200] });
        P.emit('spark', s.x, s.y, 12, { colors: ['#fff3c4', '#ffd36b', '#ffae4a'], speed: [60, 180] });
        crackle(5, 0.07);
        if (A.ctx) { A.chime(A.note(STARCHIME[(ST.popped * 2) % STARCHIME.length]), { vol: 0.09, dur: 1.8, verb: 0.45 }); A.sync('spark-pop', performance.now()); }
        const ang = [3.6, 2.75, 4.15, 2.25, 4.6][(ST.popped - 1) % 5], rad = (s.big ? 40 : 58 + (ST.popped % 2) * 14) * G.u;
        skyStars.push({ x0: s.x, y0: s.y, x1: K.clamp(G.moon.x + Math.cos(ang) * rad, 100, G.w - 24), y1: K.clamp(G.moon.y + Math.sin(ang) * rad * 0.8, 70, G.horizon - 30), t0: performance.now(), big: s.big, ph: ST.popped * 1.9 });
        if (s.big) {
          W.kick = 1.5;
          still.say(gentleLine({ Jolly: 'The big one’s a star now. It can rest up there for a while.', Cheeky: 'That was the loudest spark. Now it’s a tiny dot. Very dramatic of it.', Unfiltered: 'The big one’s up there now. Small from here.' }), { ms: 3200, mood: 'glow' });
          if (L.sync) { sync.face('celebrate', 1400); sync.react('bounce'); } if (L.patch) patch.face('love', 1400);
        } else if (ST.popped === 1) still.say(gentleLine({ Jolly: 'There it goes. A star now, up out of the way.', Cheeky: 'Pop. Promoted to star. Much less crackly up there.', Unfiltered: 'One up. Keep the beat.' }), { ms: 2800, mood: 'wow' });
        ctx.track('spark', { n: ST.popped });
      }
      function driftSparks() {
        sparks.forEach(s => {
          if (s.state === 'gone') return;
          s.el.hidden = false;
          s.state = 'drift'; s.t0 = performance.now();
          s.inner.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 2600, easing: 'ease-in', fill: 'forwards' });
          S.later(() => s.el.remove(), 2700);
        });
      }

      /* ---------------- story beats ---------------- */
      function say(c, txt, ms, mood) { ['sync', 'patch'].forEach(k => { if (cast[k] !== c) cast[k].hush(); }); c.say(txt, { ms: ms || 2600, mood }); if (mood) S.later(() => { if (phase !== 'end') c.face(c === sync ? (W.calm > 0.6 ? 'sleepy' : 'happy') : (W.calm > 0.6 ? 'calm' : 'happy')); }, (ms || 2600) + 200); }
      function join(who) {
        L[who] = true;
        const c = cast[who];
        c.show(true);
        c.el.animate([{ scale: 0.2, opacity: 0 }, { scale: 1.12, opacity: 1, offset: 0.62 }, { scale: 1, opacity: 1 }], { duration: 640, easing: 'cubic-bezier(.2,1.2,.4,1)' });
        const st = G.seats[who];
        P.emit('star', st.x + st.s / 2, st.y + st.s / 2, 14, { colors: who === 'sync' ? ['#bfe9ff', '#7fd6ff', '#fffbe6'] : ['#ffd0a8', '#ff9a6b', '#fffbe6'], speed: [50, 150] });
        if (A.ctx) { A.chime(A.note(who === 'sync' ? 'A5' : 'D6'), { vol: 0.07, dur: 1.4 }); A.sync('join', performance.now()); }
        if (who === 'sync') say(sync, line({ Jolly: 'Ooh, a beat! Mind if I shake along?', Cheeky: 'I heard drums. I brought a shaker. I am very shaky.', Unfiltered: 'Shaker. Joining in.' }), 2800, 'wow');
        else say(patch, line({ Jolly: 'I brought a wood block! Tok. That’s all it does.', Cheeky: 'Wood block, reporting for tok.', Unfiltered: 'Block on two and four.' }), 2800, 'laugh');
        ctx.track('join', { who: who === 'sync' ? 1 : 2 });
      }
      function startGroove() {
        phase = 'play';
        dotsEl.hidden = true;
        K.guide({ id: 'groove', g: 'tap', target: expTarget, label: 'ALTERNATE ON THE BEAT', delay: 0, ms: 1200 });
      }
      function twist() {
        L.still = true;
        cueShow('slower…', 2400);
        still.say(line({ Jolly: 'Now follow me down. Every bar, a little slower.', Cheeky: 'Plot twist: we’re slowing down. Keep up. Well, keep down.', Unfiltered: 'Slower now. Follow the beat down.' }), { ms: 3600, mood: 'music' });
        K.guide({ id: 'slow', g: 'tap', target: expTarget, label: 'FOLLOW THE SLOWER BEAT', delay: 200, ms: 1600 });
        ctx.track('twist', { pocket: ST.pocketLive });
      }
      function breathStart() {
        driftSparks();
        still.base('meditate');
        still.say(line({ Jolly: 'Now two taps to breathe in… then rest, and let the out-breath run long.', Cheeky: 'New rule: tap, tap, then do nothing. You’re great at nothing, I believe in you.', Unfiltered: 'Tap, tap: breathe in. Then rest: breathe out, long.' }), { ms: 4600 });
        K.guide({ id: 'breath', g: 'tap', target: expTarget, label: 'TAP, TAP… THEN REST', delay: 200, ms: 1600 });
        if (L.sync) sync.base('sleepy');
        if (L.patch) patch.base('calm');
        if (instr) {
          L.instr = true;
          S.later(() => { if (phase === 'play') say(patch.el.hidden ? sync : patch, line({ Jolly: 'New tonight: a ' + instr.name.toLowerCase() + '! It plays the out-breath.', Cheeky: 'Someone brought a ' + instr.name.toLowerCase() + '. Drum circles, honestly.', Unfiltered: instr.name + ' on the out-breath.' }), 3000, 'wow'); }, 5200);
        }
      }
      function expTarget() { const nb = upcoming(vnow()); const d = drums[(nb && nb.p.side) || 'L']; return { x: d.cx, y: d.cy + 2 }; }

      /* ---------------- HUD helpers ---------------- */
      function dotsSet(kinds) { dotsEl.innerHTML = ''; kinds.forEach(k => dotsEl.append(h('i', { class: k ? 'sd-' + k : '' }))); dotsEl.hidden = false; }
      function dotsOn(k) { Array.from(dotsEl.children).forEach((c, i) => c.classList.toggle('sd-on', i === k)); }
      let cueAnim = null;
      function cueShow(txt, ms) {
        if (cueAnim) { try { cueAnim.cancel(); } catch (e) { /* done */ } cueAnim = null; }
        if (!txt) return;
        cue.textContent = txt;
        cueAnim = cue.animate([{ opacity: 0, translate: '-50% -20%' }, { opacity: 1, translate: '-50% -50%', offset: 0.2 }, { opacity: 1, translate: '-50% -50%', offset: 0.72 }, { opacity: 0, translate: '-50% -75%' }], { duration: Math.max(600, ms || 1800), easing: 'ease-out' });
      }
      let bobT = 0;
      function bob() { bobT = performance.now(); }

      /* ---------------- frame loop ---------------- */
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !BG) return;
        const now = performance.now(), vn = vnow();
        if (R.running) processBeats(vn);
        const bpm = R.running || phase === 'end' ? R.bpm : START;
        W.calm = K.clamp((START - bpm) / (START - END), 0, 1);
        const shown = Math.round(bpm);
        if (shown !== W.bpmShown) { W.bpmShown = shown; bpmEl.textContent = String(shown); }
        // the fire follows the tempo, breathes with the out-breath, and settles to embers at the end
        if (phase !== 'end') W.fireT = phase === 'intro' || phase === 'wake' ? 1 : 0.42 + 0.58 * (1 - W.calm) - W.rest * 0.12;
        W.fireI += (W.fireT - W.fireI) * Math.min(1, dt * (phase === 'end' ? 0.9 : 1.6));
        W.kick *= Math.exp(-dt * (4 + 3 * (1 - W.calm)));
        W.rest *= Math.exp(-dt * 0.5);
        W.flick += dt * (1.2 + (bpm / 60) * 2.6) * (red() ? 0.5 : 1);
        W.nudge *= Math.exp(-dt * 18);
        W.starVis = phase === 'end' ? Math.min(1, W.starVis + dt * 0.4) : 0.32 + 0.6 * W.calm;
        W.tense = phase === 'end' ? Math.max(0, W.tense - dt * 0.6) : 1 - W.calm;
        for (const s of ['L', 'R']) {
          const d = drums[s];
          d.sqv += (-170 * d.sq - 16 * d.sqv) * dt; d.sq += d.sqv * dt;
          d.glow *= Math.exp(-dt * 5); d.flash *= Math.exp(-dt * 7);
        }
        // character bob on the beat
        if (!red()) {
          const k = Math.max(0, 1 - (now - bobT) / 260), y = -Math.sin(k * Math.PI) * 4;
          if (L.sync) sync.img.style.translate = '0 ' + y.toFixed(1) + 'px';
          if (L.patch) patch.img.style.translate = '0 ' + (-Math.sin(Math.max(0, 1 - (now - bobT - 90) / 260) * Math.PI) * 3).toFixed(1) + 'px';
        }
        updateSparks(now, t);
        ambience(dt, t);
        if (Math.random() < dt * (2 + 5 * W.fireI)) P.emit('ember', G.fire.x + (Math.random() - 0.5) * 36 * G.u, G.fire.y - 20 * G.u - Math.random() * 30 * G.u * W.fireI, 1, { speed: [16, 50], angle: -Math.PI / 2, spread: 0.6 });
        if (placeId === 'snow' && Math.random() < dt * (G.phone ? 6 : 12)) P.emit('snow', Math.random() * G.w, -6, 1, { angle: Math.PI / 2, spread: 0.4, speed: [14, 30] });
        if (placeId === 'forest' && Math.random() < dt * 0.9) P.emit('mote', Math.random() * G.w, G.horizon + Math.random() * 120 * G.u, 1, { colors: ['#e9ff9a', '#fff3a0'] });
        // under the title card and the results card (both blurred overlays) the scene holds still or idles, so the
        // browser is not re-blurring a moving picture every frame
        frameN++;
        if (phase === 'intro' && frameN > 3) return;
        if (finished && frameN % 3) return;
        draw(g, dt, t, now, vn);
      });
      let frameN = 0;
      function updateSparks(now, t) {
        let nextSet = false;
        for (const s of sparks) {
          if (s.state === 'wait' || s.state === 'gone') continue;
          const slot = G.slots[s.slot] || { x: G.fire.x, y: G.horizon - 40 };
          if (s.state === 'rise') {
            const k = Math.min(1, (now - s.t0) / 1100), e = 1 - Math.pow(1 - k, 3);
            const sx = G.fire.x, sy = G.fire.y - 60 * G.u;
            s.x = sx + (slot.x - sx) * e + Math.sin(k * Math.PI) * (s.slot % 2 ? 40 : -40) * G.u;
            s.y = sy + (slot.y - sy) * e;
            s.inner.style.scale = (0.35 + 0.65 * e).toFixed(3); s.inner.style.opacity = Math.min(1, 0.2 + k * 1.6).toFixed(2);
            if (k >= 1) { s.state = 'ripe'; s.inner.style.scale = ''; s.inner.style.opacity = ''; }
          } else if (s.state === 'ripe') {
            const ag = 0.35 + 0.65 * (1 - W.calm), m = red() ? 0.3 : 1;
            s.x = slot.x + Math.sin(t * 7.3 + s.ph) * 2.6 * ag * m + Math.sin(t * 1.1 + s.ph) * 6 * G.u * m;
            s.y = slot.y + Math.cos(t * 6.1 + s.ph * 1.3) * 2 * ag * m;
            if (!nextSet) { nextSet = true; if (!s.isNext) { sparks.forEach(o => { o.isNext = false; o.el.classList.remove('sd-next'); }); s.isNext = true; s.el.classList.add('sd-next'); } }
            if (Math.random() < 0.016 * ag) P.emit('spark', s.x + (Math.random() - 0.5) * 60, s.y + 12, 1, { speed: [20, 60], angle: -Math.PI / 2, spread: 1.4 });
          } else if (s.state === 'drift') {
            s.y -= 0.35; s.x += Math.sin(t + s.ph) * 0.3;
          }
          s.el.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px)';
        }
      }
      function ambience(dt, t) {
        if (!A.ctx) return;
        if (Math.random() < dt * (2.5 + 6 * W.fireI)) A.noise({ filter: 'highpass', freq: 2200 + Math.random() * 3800, dur: 0.008 + Math.random() * 0.02, vol: 0.012 + Math.random() * 0.03 * W.fireI, bus: 'amb', pan: Math.random() * 0.6 - 0.3 });
        ambT -= dt;
        if (ambT <= 0) {
          ambT = 0.3;
          if (fireLoop) fireLoop.level(0.06 + 0.12 * W.fireI, 0.4);
          if (placeLoop) { const lv = placeId === 'beach' ? 0.06 + 0.05 * Math.sin(t * 0.42) : placeId === 'snow' ? 0.05 + 0.03 * Math.sin(t * 0.23) : 0.05 + 0.02 * Math.sin(t * 0.3); placeLoop.level(Math.max(0.01, lv), 0.5); }
        }
        if (placeId === 'forest') { owlT -= dt; if (owlT <= 0) { owlT = 12 + Math.random() * 10; const tt = A.now(); [0, 0.42].forEach((o, i) => A.tone({ when: tt + o, type: 'sine', freq: i ? 360 : 400, to: i ? 330 : 370, glide: 0.25, dur: 0.38, vol: 0.022, attack: 0.05, bus: 'amb', pan: -0.5 })); } }
      }

      /* ---------------- drawing ---------------- */
      function draw(g, dt, t, now, vn) {
        const w = G.w, H = G.h, D = K.dark(), pal = PL[D ? 'dark' : 'bright'];
        g.save();
        if (W.nudge > 0.02) g.translate(0, W.nudge * 2.2);
        g.drawImage(BG.c, 0, 0, w, H);
        // stars, more of them as the tempo comes down
        const vis = W.starVis, sm = pal.stars;
        g.fillStyle = '#fff';
        for (const s of STARS) {
          if (s.th > vis) continue;
          const a = Math.min(1, (vis - s.th) * 5) * (0.45 + 0.45 * Math.sin(t * s.sp + s.ph)) * sm;
          if (a < 0.03) continue;
          g.globalAlpha = Math.min(1, a); g.fillRect(s.x, s.y, s.s, s.s);
        }
        g.globalAlpha = 1;
        drawSkyStars(g, t, now);
        if (W.consK > 0) drawCons(g, t);
        drawFire(g, t);
        P.update(dt); P.draw(g);
        drawDrums(g, vn, now);
        g.restore();
      }
      function drawSkyStars(g, t, now) {
        for (const s of skyStars) {
          const k = Math.min(1, (now - s.t0) / 1300), e = k < 1 ? 1 - Math.pow(1 - k, 3) : 1;
          const x = s.x0 + (s.x1 - s.x0) * e, y = s.y0 + (s.y1 - s.y0) * e - Math.sin(k * Math.PI) * 30;
          if (k < 1 && Math.random() < 0.5) P.emit('mote', x, y, 1, { colors: ['#fff6d8', '#ffe0a0'], speed: [2, 8] });
          const tw = 0.75 + 0.25 * Math.sin(t * 1.7 + s.ph), r = (s.big ? 26 : 18) * tw;
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.9; g.drawImage(SPR.star, x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
          g.fillStyle = '#fffbea'; K.starPath(g, x, y, (s.big ? 7 : 5) * tw, 1.4, 4, 0); g.fill();
        }
      }
      function drawFire(g, t) {
        const f = G.fire, u = G.u, I = W.fireI, k = W.kick, D = K.dark();
        g.globalCompositeOperation = 'lighter';
        // light on the ground
        const LR = (G.phone ? 230 : 380) * u * (0.6 + 0.4 * I + 0.08 * k);
        g.globalAlpha = Math.min(1, (D ? 0.22 : 0.14) + (D ? 0.4 : 0.28) * I + 0.1 * k);
        g.drawImage(SPR.light, f.x - LR, f.y + 10 * u - LR * 0.42, LR * 2, LR * 0.84);
        g.globalAlpha = Math.min(1, (D ? 0.1 : 0.06) + (D ? 0.2 : 0.12) * I + 0.05 * k + 0.12 * W.tense);
        g.drawImage(SPR.light, f.x - LR * 1.6, f.y - LR * 0.1, LR * 3.2, LR * 1.7);
        // glow
        const gr = (100 + 90 * I + 40 * k) * u;
        g.globalAlpha = Math.min(1, D ? 0.3 + 0.5 * I + 0.15 * k : 0.1 + 0.3 * I + 0.1 * k);
        g.drawImage(SPR.glow, f.x - gr, f.y - 34 * u - gr, gr * 2, gr * 2);
        // coals
        const cr = 34 * u * (0.7 + 0.3 * Math.sin(t * 2.2));
        g.globalAlpha = 0.7 + 0.3 * I; g.drawImage(SPR.coal, f.x - cr * 1.6, f.y - cr * 0.5, cr * 3.2, cr);
        // flames: three passes of tongues that rise and lean with the beat
        const Hh = (34 + 112 * I) * u * (1 + 0.26 * k), base = 33 * u * (0.65 + 0.35 * I), ph = W.flick;
        // additive on the night palette; on the blue-hour palette normal blending keeps the flames saturated
        if (!D) g.globalCompositeOperation = 'source-over';
        const cols = D ? ['rgba(255,72,24,1)', 'rgba(255,150,46,1)', 'rgba(255,236,170,1)'] : ['rgba(232,64,20,1)', 'rgba(255,140,30,1)', 'rgba(255,226,140,1)'];
        for (let pass = 0; pass < 3; pass++) {
          const sc = [1, 0.72, 0.42][pass], hs = [1, 0.8, 0.52][pass];
          g.fillStyle = cols[pass]; g.globalAlpha = (D ? [0.8, 0.85, 0.9] : [0.92, 0.94, 0.96])[pass] * Math.min(1, 0.25 + I * 1.2);
          g.beginPath();
          for (let i = 0; i < 5; i++) {
            const o = (i - 2) / 2, n = 0.58 + 0.24 * Math.sin(ph * 2.1 + i * 1.9) + 0.18 * Math.sin(ph * 3.3 + i * 2.7);
            const x = f.x + o * base * 0.95 * sc, hh = Hh * hs * (1 - Math.abs(o) * 0.38) * n, ww = base * 0.52 * sc * (1 - Math.abs(o) * 0.3);
            const sway = Math.sin(ph * 1.3 + i) * 7 * u * (0.35 + I), y = f.y - 4 * u;
            g.moveTo(x - ww, y);
            g.bezierCurveTo(x - ww, y - hh * 0.45, x + sway * 0.4 - ww * 0.3, y - hh * 0.8, x + sway, y - hh);
            g.bezierCurveTo(x + sway * 0.4 + ww * 0.3, y - hh * 0.8, x + ww, y - hh * 0.45, x + ww, y);
            g.closePath();
          }
          g.fill();
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      function drawDrums(g, vn, now) {
        const nb = R.running ? upcoming(vn) : null;
        const lead = Math.min(0.95, beatLen());
        for (const s of ['L', 'R']) {
          const d = drums[s];
          const exp = nb && (nb.p.kind === 'count' || nb.p.side === s);
          const k = exp ? K.clamp((nb.t - vn) / lead, 0, 1) : 1;
          // halo under the drum whose beat is coming
          if (exp || d.flash > 0.02) {
            const a = (exp ? (1 - k) * (nb.p.kind === 'count' ? 0.35 : 0.6) : 0) + d.flash * 0.5;
            g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, a);
            g.drawImage(SPR.halo, d.cx - d.rx * 1.5, d.cy - d.ry * 2.2, d.rx * 3, d.ry * 4.4);
            g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
          }
          g.save();
          const footY = d.cy + d.bodyH;
          g.translate(d.cx, footY); g.scale(1 + 0.035 * d.sq, 1 - 0.06 * d.sq); g.translate(-d.cx, -footY);
          g.drawImage(d.spr.c, d.cx - d.rx - 14, d.cy - d.ry - 14, d.spr.w, d.spr.h);
          g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,170,90,' + (0.18 + 0.32 * W.fireI).toFixed(3) + ')'; g.lineWidth = 2.6; g.beginPath(); g.ellipse(d.cx, d.cy - 1, d.rx - 4, d.ry - 3.5, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.globalCompositeOperation = 'source-over';
          if (d.glow > 0.02) {
            g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, d.glow);
            g.drawImage(SPR[d.glowCol], d.cx - d.rx, d.cy - d.ry, d.rx * 2, d.ry * 2);
            g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
          }
          if (W.rest > 0.05 && phase === 'play') { g.globalCompositeOperation = 'lighter'; g.globalAlpha = W.rest * 0.35; g.drawImage(SPR.blue, d.cx - d.rx, d.cy - d.ry, d.rx * 2, d.ry * 2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
          if (d.rip.length) {
            g.save(); g.beginPath(); g.ellipse(d.cx, d.cy, d.rx * 0.94, d.ry * 0.92, 0, 0, TAU); g.clip();
            for (const r of d.rip) {
              const a = (now - r.t0) / 620; if (a >= 1) continue;
              for (let q = 0; q < 2; q++) {
                const aa = a - q * 0.16; if (aa <= 0) continue;
                const rr = 6 + aa * d.rx * 1.3;
                g.strokeStyle = r.col === 'gold' ? 'rgba(255,214,120,' + (0.75 * (1 - aa)).toFixed(3) + ')' : r.col === 'blue' ? 'rgba(170,210,255,' + (0.6 * (1 - aa)).toFixed(3) + ')' : 'rgba(120,70,30,' + (0.5 * (1 - aa)).toFixed(3) + ')';
                g.lineWidth = 2.2; g.beginPath(); g.ellipse(r.x, r.y, rr, rr * 0.42, 0, 0, TAU); g.stroke();
              }
            }
            g.restore();
            d.rip = d.rip.filter(r => now - r.t0 < 620);
          }
          g.restore();
          // the beat ring: it closes onto the rim exactly on the beat
          if (exp && k < 1) {
            const f2 = 1 + 0.9 * k, a = Math.pow(1 - k, 0.7) * (nb.p.kind === 'count' ? 0.6 : 0.95);
            g.strokeStyle = nb.p.kind === 'count' ? 'rgba(255,245,225,' + a.toFixed(3) + ')' : 'rgba(255,212,110,' + a.toFixed(3) + ')';
            g.lineWidth = 3 * G.u; g.beginPath(); g.ellipse(d.cx, d.cy, d.rx * f2, d.ry * f2, 0, 0, TAU); g.stroke();
          }
          if (d.flash > 0.03) { g.strokeStyle = 'rgba(255,236,170,' + (d.flash * 0.9).toFixed(3) + ')'; g.lineWidth = 4 * G.u * d.flash; g.beginPath(); g.ellipse(d.cx, d.cy, d.rx + 2, d.ry + 2, 0, 0, TAU); g.stroke(); }
        }
      }
      // the finale constellation: one star per bar you played, placed by its tempo
      let CONS = null;
      function buildCons() {
        const bars = Array.from(barStats.values()).filter(b => b.bar >= 0).sort((a, b) => a.bar - b.bar);
        const c = G.cons, n = bars.length;
        CONS = bars.map((b, i) => {
          const acc = b.n ? b.sum / b.n : 0;
          const x = c.x0 + (n > 1 ? i / (n - 1) : 0.5) * (c.x1 - c.x0);
          const y = c.y0 + K.clamp((START - b.bpm) / (START - END), 0, 1) * (c.y1 - c.y0) + Math.sin(i * 2.3) * 5 * G.u;
          return { x, y, a: 0.35 + 0.65 * acc, i };
        });
        if (CONS.length) {
          const f = CONS[0], l = CONS[CONS.length - 1];
          Object.assign(lab96.style, { left: K.clamp(f.x, 48, G.w - 48) + 'px', top: (f.y - 24) + 'px' });
          Object.assign(lab60.style, { left: K.clamp(l.x, 48, G.w - 48) + 'px', top: (l.y - 24) + 'px' });
          Object.assign(capEl.style, { left: (G.w / 2) + 'px', top: (Math.max(f.y, l.y) + (G.phone ? 64 : 60)) + 'px' });
        }
      }
      function consPos(i, n, K2) {
        const st = i / (n + 4), local = K.clamp((K2 - st) / (4 / (n + 4)), 0, 1);
        return local;
      }
      function drawCons(g, t) {
        if (!CONS || !CONS.length) return;
        const n = CONS.length, f = G.fire;
        g.lineWidth = 1.4; g.strokeStyle = K.dark() ? 'rgba(255,236,200,0.55)' : 'rgba(255,250,236,0.75)';
        g.beginPath();
        let started = false;
        for (let i = 0; i < n; i++) {
          const lk = consPos(i, n, W.consK); if (lk < 1) break;
          if (!started) { g.moveTo(CONS[i].x, CONS[i].y); started = true; } else g.lineTo(CONS[i].x, CONS[i].y);
        }
        g.stroke();
        for (let i = 0; i < n; i++) {
          const s = CONS[i], lk = consPos(i, n, W.consK); if (lk <= 0) continue;
          if (lk < 1) {
            const e = 1 - Math.pow(1 - lk, 2), cx = (f.x + s.x) / 2, cy = Math.min(f.y, s.y) - 120 * G.u;
            const x = (1 - e) * (1 - e) * f.x + 2 * (1 - e) * e * cx + e * e * s.x, y = (1 - e) * (1 - e) * (f.y - 30) + 2 * (1 - e) * e * cy + e * e * s.y;
            g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.9; g.drawImage(SPR.coal, x - 8, y - 8, 16, 16); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
            if (Math.random() < 0.4) P.emit('ember', x, y, 1, { speed: [4, 14] });
            continue;
          }
          const tw = 0.8 + 0.2 * Math.sin(t * 2.1 + i), r = (10 + 10 * s.a) * tw;
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = s.a; g.drawImage(SPR.star, s.x - r, s.y - r, r * 2, r * 2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
          g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(s.x, s.y, 1.6 + 1.6 * s.a, 0, TAU); g.fill();
        }
      }

      /* ---------------- flow ---------------- */
      function wake(side, pt) {
        phase = 'count';
        K.guide({ id: 'listen', g: 'still', target: () => ({ x: G.fire.x, y: G.hudY + 22 }), label: 'LISTEN: FOUR CLICKS', delay: 0, ms: 1600 });
        strike(drums[side], pt, 'big');
        R.start(0.5);
        still.say(line({ Jolly: 'Listen first: four clicks. Then left, right, left, right, on the beat.', Cheeky: 'Four clicks, then you’re on. Left, right. It’s a campfire, not an exam.', Unfiltered: 'Four clicks. Then left, right, on the beat.' }), { ms: 3800, mood: 'music' });
        ctx.track('start', { bpm: START, place: placeId.length, visit: visits });
      }
      async function finale() {
        if (phase === 'end') return;
        phase = 'end'; R.stop();
        K.guide(null);
        dotsEl.hidden = true;
        W.fireT = 0.1; L.sync = L.patch = false;
        still.base('calm');
        if (!sync.el.hidden) sync.base('sleepy');
        if (!patch.el.hidden) patch.base('cosy');
        still.say(line({ Jolly: 'Sixty. Hear how slow that is? The fire heard it too.', Cheeky: 'Sixty beats a minute. The fire’s basically napping.', Unfiltered: 'Sixty. Slow. That’s the beat now.' }), { ms: 3400 });
        if (A.ctx) { A.pad(['D3', 'A3', 'D4', 'F4'].map(n => A.note(n)), { dur: 6, vol: 0.09, attack: 1.4, lp: 800 }); }
        await K.sleep(1500);
        buildCons();
        let rung = 0;
        const n = CONS.length;
        await K.anim(red() ? 600 : 3800, (k) => {
          W.consK = k;
          let landed = 0; for (let i = 0; i < n; i++) if (consPos(i, n, k) >= 1) landed = i + 1;
          while (rung < landed) { if (A.ctx) A.chime(A.note(STARCHIME[Math.min(STARCHIME.length - 1, Math.floor(rung * STARCHIME.length / Math.max(1, n)))]), { vol: 0.05, dur: 1.6, verb: 0.5 }); rung++; }
        });
        W.consK = 1.2;
        [lab96, lab60, capEl].forEach((x, i) => S.later(() => x.classList.add('sd-on'), i * 300));
        still.face('glow');
        await K.finale('stars', { colors: ['#fff3d6', '#ffd98a', '#bfe0ff'], chord: ['D3', 'A3', 'D4', 'F4', 'A4'], ms: 2400 });
        still.say(line({
          Jolly: 'That’s your beat, written in stars. Next time, someone’s bringing a ' + nextInstr.name.toLowerCase() + '.',
          Cheeky: 'Your tempo, in stars. Next time a ' + nextInstr.name.toLowerCase() + ' turns up. Drum circles, honestly.',
          Unfiltered: START + ' down to 60, in stars. Next time: ' + nextInstr.name.toLowerCase() + '.'
        }), { ms: 0, mood: 'glow' });
        await K.sleep(1300);
        const pct = Math.round(100 * ST.pocket / Math.max(1, ST.judged)), acc = ST.sum / Math.max(1, ST.judged);
        const badges = [];
        const pb = K.best('pocket', pct, 'higher');
        if (pb.isNew) badges.push('New best: ' + pct + '% in the pocket'); else if (pb.first) badges.push(pct >= 50 ? 'First circle: ' + pct + '% in the pocket' : 'First circle, all the way down');
        const tier = K.tier(acc); if (tier) badges.push(tier + ' groove');
        if (instr) { const c = K.collect(instr.name); badges.push((c.isNew ? 'New in the circle: ' : 'In the circle: ') + instr.name + ' (' + c.count + ' of ' + INSTR.length + ')'); }
        if (ST.best >= 12) badges.push(ST.best + ' beats in a row');
        const nSp = sparks.length;
        ctx.track('done', { pocket: pct, acc: Math.round(acc * 100), popped: ST.popped, best: ST.best });
        finished = true;
        ctx.finish({
          title: 'Down to embers', mood: 'meditate',
          lines: ['Beat: ' + START + ' → 60 BPM, ' + PL.name, pct >= 30 ? pct + '% of beats in the pocket' : 'Kept the circle going all the way down',
            nSp && ST.popped >= nSp ? 'All ' + nSp + ' sparks turned to stars' : ST.popped ? ST.popped + ' sparks turned to stars, the rest drifted off' : 'The sparks drifted off as the fire calmed'],
          share: 'Drummed a campfire beat down from ' + START + ' to 60 BPM.',
          badges
        });
      }

      (async () => {
        await K.intro({ title: 'Slow Drum', sub: 'The fire is racing tonight. Drum with the circle, and follow the beat as it slows all the way down.', how: 'Tap left, right, left, right on the beat.', char: 'still', mood: 'music' });
        phase = 'wake';
        still.say(line({ Jolly: 'Fire’s crackling fast tonight. Tap a drum and we’ll find a beat together.', Cheeky: 'This fire is doing about a hundred miles an hour. Tap a drum, let’s calm it down.', Unfiltered: 'Fast fire. Tap a drum. We’ll slow it down.' }), { ms: 0 });
        K.guide({ id: 'wake', g: 'tap', target: drums.L.btn, oy: 0.3, label: 'TAP A DRUM', delay: 500 });
      })();

      return {
        async autoplay() {
          while (phase !== 'wake') await K.wait(100);
          await K.wait(500);
          await K.sim.tap(drums.L.btn);
          const done = new Set();
          let guard = 0;
          while (!finished && guard++ < 20000) {
            if (phase === 'end' || !R.running) { await K.wait(150); continue; }
            const vn = vnow();
            let tg = null;
            for (const rec of [...visQ, ...pend]) { if (rec.p.kind === 'tap' && !done.has(rec.i) && !rec.grade && rec.t > vn - 0.12) { if (!tg || rec.t < tg.t) tg = rec; } }
            if (!tg) { await K.wait(12); continue; }
            const ms = (tg.t - vn) * 1000;
            if (ms > 14) { await K.wait(Math.min(ms - 8, 40)); continue; }
            done.add(tg.i);
            const pr = await K.sim.press(drums[tg.p.side].btn);
            S.later(() => pr.up(), 70);
          }
          while (!finished) await K.wait(200);
        }
      };
    }
  });
})(window.TSG_ENV);
