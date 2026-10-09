/* 007 Time Telescope — Reframe · REFRAME · Decision Pressure
 * Mechanism: temporal distancing (10-10-10; Bruehlman-Senecal & Ayduk 2015). Viewing a stressful event from a future
 * vantage point lowers distress because it makes its impermanence visible. The player turns the telescope's focus ring
 * to travel NOW → 10 MINUTES → 10 MONTHS → 10 YEARS, honestly rates how big the worry-planet looks from each stop, then
 * sweeps the whole sky: the worry is one star among constellations of what matters (generic: friends, health, small joys).
 * Verb: focus (turn the brass ring along its curve, tap a size, sweep the sky). Finale: the dome slides open onto a deep
 * starfield; the worry-star twinkles inside today's constellation while shooting stars cross.
 */
(function (env) {
  'use strict';
  (env.games = env.games || []).push({
    id: 'time-telescope', mode: 'reframe', name: 'Time Telescope', verb: 'focus', family: 'REFRAME', minutes: 2,
    parents: ['Decision Pressure', 'Uncertainty / Future Worry / Reassurance', 'Values / Meaning / Grief'],
    cast: ['drop'], poster: { char: 'drop', mood: 'wow' },
    tagline: 'Turn the ring: see your worry from 10 minutes, months and years away.',
    why: 'For a worry that fills the sky: the 10-10-10 view from the future shrinks it to size, honestly.',
    css: `
.g-time-telescope .tt-tl { position: absolute; z-index: 30; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; padding: 4px; border-radius: 999px; background: rgba(10,12,30,.82);
  border: 1px solid rgba(255,255,255,.14); box-shadow: 0 6px 16px rgba(0,0,0,.4); box-sizing: border-box; }
.g-time-telescope .tt-tl span { display: grid; place-items: center; height: 30px; border-radius: 999px; font: 800 12px/1 var(--font-ui); letter-spacing: .1em; color: #8f97c7; white-space: nowrap; transition: background .3s, color .3s; }
.g-time-telescope .tt-tl span.is-done { color: #d9c9ff; }
.g-time-telescope .tt-tl span.is-on { background: linear-gradient(180deg, #ffe29a, #e2a83c); color: #2b1a04; box-shadow: 0 0 14px rgba(255,214,120,.6); }
.g-time-telescope .tt-ring { position: absolute; z-index: 15; pointer-events: none; transform-origin: 50% 50%; will-change: transform; transition: opacity .6s ease; }
.g-time-telescope .tt-idx { position: absolute; z-index: 16; width: 0; height: 0; margin-left: -10px; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 15px solid #ffe29a; filter: drop-shadow(0 2px 2px rgba(0,0,0,.6)); pointer-events: none; transition: opacity .6s ease; }
.g-time-telescope .tt-hit { position: absolute; z-index: 20; border-radius: 50%; touch-action: none; cursor: grab; outline: none; }
.g-time-telescope .tt-hit:focus-visible { box-shadow: 0 0 0 3px var(--ui-accent); }
.g-time-telescope .tt-label { position: absolute; z-index: 21; left: 0; top: 0; transform: translate(-50%, 0); box-sizing: border-box; width: max-content; max-width: var(--mw, 240px); padding: 7px 12px 8px;
  border-radius: 12px; text-align: center; font: 700 16px/1.25 var(--font-ui); color: #fff7ec; background: rgba(10,8,24,.72); border: 1px solid rgba(255,220,180,.35); box-shadow: 0 6px 18px rgba(0,0,0,.45);
  pointer-events: none; transition: opacity .4s ease; text-wrap: balance; }
.g-time-telescope .tt-label::before { content: ""; position: absolute; left: 50%; top: -7px; width: 1.5px; height: 7px; background: rgba(255,220,180,.6); }
.g-time-telescope .tt-label.is-center::before { display: none; }
.g-time-telescope .tt-label[hidden] { display: none; }
.g-time-telescope .tt-panel { position: absolute; z-index: 30; display: flex; flex-direction: column; align-items: stretch; gap: 10px; box-sizing: border-box; }
.g-time-telescope .tt-cap { border-radius: 14px; padding: 10px 14px 12px; background: rgba(12,12,34,.88); border: 1px solid rgba(190,170,255,.22); box-shadow: 0 10px 24px rgba(0,0,0,.45); color: #f3eeff; }
.g-time-telescope .tt-cap b { display: block; font: 800 12px/1.2 var(--font-ui); letter-spacing: .16em; text-transform: uppercase; color: #ffd27a; margin-bottom: 5px; }
.g-time-telescope .tt-cap p { margin: 0; font: 600 16px/1.35 var(--font-ui); text-wrap: pretty; }
.g-time-telescope .tt-cap.is-in { animation: time-telescope-in .45s cubic-bezier(.2,1.3,.4,1) both; }
@keyframes time-telescope-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.g-time-telescope .tt-ask { display: flex; flex-direction: column; gap: 7px; transition: opacity .3s ease; }
.g-time-telescope .tt-ask[hidden] { display: none; }
.g-time-telescope .tt-q { margin: 0; text-align: center; font: 700 14px/1.2 var(--font-ui); color: #e9e4ff; letter-spacing: .02em; }
.g-time-telescope .tt-ask .gk-chips { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.g-time-telescope .tt-ask .gk-chip { min-height: 46px; padding: 8px 4px; font-weight: 700; font-size: 15px; background: rgba(28,26,64,.92); color: #f3eeff; border-color: rgba(190,170,255,.35); }
.g-time-telescope .tt-ask .gk-chip[aria-pressed="true"] { background: linear-gradient(180deg, #ffe29a, #e2a83c); color: #2b1a04; border-color: #ffd27a; }
.g-time-telescope .tt-log { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; padding: 8px 6px 9px; border-radius: 14px; background: linear-gradient(180deg, #f6ecd4, #e6d4ad); color: #3a2a12;
  box-shadow: 0 10px 22px rgba(0,0,0,.45), inset 0 1px 0 #fff; }
.g-time-telescope .tt-log div { display: grid; grid-template-rows: auto 38px auto; justify-items: center; align-items: center; gap: 2px; }
.g-time-telescope .tt-log small { font: 800 12px/1 var(--font-ui); letter-spacing: .08em; color: #7a5a2a; white-space: nowrap; }
.g-time-telescope .tt-log i { display: block; border-radius: 50%; width: var(--d, 0px); height: var(--d, 0px); background: radial-gradient(circle at 35% 30%, var(--p1, #fff), var(--p2, #888)); box-shadow: 0 2px 4px rgba(0,0,0,.3); transition: width .5s cubic-bezier(.2,1.4,.4,1), height .5s cubic-bezier(.2,1.4,.4,1); }
.g-time-telescope .tt-log em { font: 700 13px/1 var(--font-ui); font-style: normal; color: #3a2a12; min-height: 13px; }
.g-time-telescope .tt-log div.is-empty i { width: 20px; height: 20px; background: none; box-shadow: none; border: 1.5px dashed rgba(122,90,42,.55); box-sizing: border-box; }
.g-time-telescope .tt-log div.is-new i { animation: time-telescope-pop .5s cubic-bezier(.2,1.6,.4,1); }
@keyframes time-telescope-pop { 0% { transform: scale(.4); } 60% { transform: scale(1.25); } 100% { transform: none; } }
.g-time-telescope .tt-sky { position: absolute; z-index: 21; transform: translate(-50%, -50%); font: 800 12px/1 var(--font-ui); letter-spacing: .16em; text-transform: uppercase; color: #ffe9b8; white-space: nowrap;
  text-shadow: 0 0 10px rgba(255,214,140,.8), 0 1px 2px rgba(0,0,0,.8); pointer-events: none; opacity: 0; transition: opacity .6s ease; }
.g-time-telescope .tt-sky.is-on { opacity: 1; }
.g-time-telescope.is-calm .tt-log div.is-new i, .g-time-telescope.is-calm .tt-cap.is-in { animation: none; }
.g-time-telescope .gk-char.gk-side-right .gk-bubble { top: auto; bottom: 6px; }
.g-time-telescope .gk-char.gk-side-right .gk-bubble::before { top: auto; bottom: 22px; }
@container (min-width: 700px) {
  .g-time-telescope .tt-cap p { font-size: 18px; }
  .g-time-telescope .tt-label { font-size: 17px; }
  .g-time-telescope .tt-sky { font-size: 13px; }
  .g-time-telescope .tt-tl span { font-size: 13px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const inten = ctx.intensity, TAU = Math.PI * 2, Q = Math.PI / 2, visits = K.visits();
      const serious = () => an.fear_support === 'strong' || an.fear_support === 'some';
      const care = () => an.safety === 'care';

      /* ---------------- tonight's sky (the same all day, different tomorrow) ---------------- */
      const PLANETS = [
        { p1: '#ffb08a', p2: '#a8341f', band: 'rgba(120,30,20,0.35)', ring: false }, { p1: '#8ff0e2', p2: '#1d6d78', band: 'rgba(10,60,70,0.35)', ring: true },
        { p1: '#cdb8ff', p2: '#4a2f8f', band: 'rgba(40,20,90,0.35)', ring: true }, { p1: '#ffe1a0', p2: '#9a6a2a', band: 'rgba(110,70,20,0.3)', ring: false },
        { p1: '#e6f4ff', p2: '#5a86b8', band: 'rgba(40,70,120,0.3)', ring: true }
      ];
      const PL = K.dailyPick(PLANETS, 1);
      const NEBULA = K.dailyPick([['#7a4dff', '#ff5fa2'], ['#2fb6ff', '#7a4dff'], ['#ff7a59', '#b04dff'], ['#46e0c8', '#3a6bff']], 2);
      const CONS = ['The Lantern', 'The Paper Boat', 'The Kettle', 'The Open Door', 'The Bicycle', 'The Teacup', 'The Kite', 'The Snail'];
      const TODAY = K.dailyPick(CONS, 3);
      const owned = K.collection().filter(n => CONS.includes(n) && n !== TODAY).slice(-4);
      const MATTERS = ['Friends', 'Health', 'Small joys', 'Home'];

      /* ---------------- words ---------------- */
      function tidy(s) {
        s = String(s || '').replace(/\s+/g, ' ').trim().replace(/^[\s"“”'’.,;:–—-]+/, '').trim();
        if (!s) return '';
        s = s[0].toUpperCase() + s.slice(1);
        if (!/[.!?…"”’)]$/.test(s)) s += '.';
        return s;
      }
      const lowerFirst = (s) => !s || /^I(\b|['’])/.test(s) ? s : s[0].toLowerCase() + s.slice(1);
      let WORRY = '', CAP = [], FUT = '';
      function buildTexts() {
        WORRY = tidy(an.conclusion || an.thought) || 'This means something bad.';
        if (WORRY.split(/\s+/).length > 12) WORRY = K.words(WORRY, 11);
        const fu = tidy(an.future) || 'A year from now this will likely look smaller than it does tonight.';
        let ten = fu.replace(/^(in a year(?:['’]s time)?|a year from now|a year on|one year from now|by next year|next year|in twelve months)[,]?\s*/i, '');
        FUT = ten !== fu ? 'Ten years from now, ' + lowerFirst(ten) : /\b(month|week|tomorrow|tonight|soon)\b/i.test(fu) ? 'From ten years out: ' + lowerFirst(fu) : fu;
        const leads = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text);
        const lead = leads.find(l => l.kind === 'steady') || leads.find(l => l.kind === 'prepare') || leads[0];
        const plan = leads.find(l => l.kind === 'prepare') || leads.find(l => l.kind === 'ask') || leads[0];
        CAP = [
          'Up close, it fills the whole view. Of course it feels huge right now.',
          serious() ? 'Ten minutes from now it still matters, and that’s okay.' + (lead ? ' One small thing: ' + lowerFirst(tidy(lead.text)) : '')
            : 'Ten minutes from now it still feels close. Nothing has to be decided yet.' + (lead ? ' Maybe: ' + lowerFirst(tidy(lead.text)) : ''),
          serious() ? 'Ten months from now you’ll likely have dealt with this, one step at a time.' + (plan ? ' Step one: ' + lowerFirst(tidy(plan.text)) : '') + (care() ? ' Proper advice helps with the rest.' : '')
            : 'Ten months from now, this is probably one moment among hundreds, with plenty of new days around it.',
          FUT
        ];
      }
      buildTexts();

      /* ---------------- lines (every vibe) ---------------- */
      const LN = {
        start: { Jolly: 'Welcome to the observatory! That planet is your worry, up close. Let’s look at it from further away.', Cheeky: 'Behold: your worry, in glorious close-up. Let’s get some distance.', Unfiltered: 'That’s the worry, up close. Let’s get distance.' },
        back: { Jolly: 'Back at the telescope! New planet tonight. Same trick: distance.', Cheeky: 'Welcome back, astronomer. Fresh worry-planet, same old telescope.', Unfiltered: 'Back again. New planet. Get distance.' },
        sizeAsk: { Jolly: 'How big does it look from here? Be honest.', Cheeky: 'Size check. No fibbing to the telescope.', Unfiltered: 'How big from here? Honestly.' },
        turn: { Jolly: 'Now turn the brass ring to travel forward in time.', Cheeky: 'Turn the ring. Time travel, but make it brass.', Unfiltered: 'Turn the ring. Go forward.' },
        stillHuge: { Jolly: 'That’s honest. Some things stay big for a while.', Cheeky: 'Still huge? Fair. Honest beats pretend.', Unfiltered: 'Fair. It’s still big. Keep going.' },
        smaller: { Jolly: 'Smaller already. Distance does that.', Cheeky: 'Look at it, shrinking like a jumper in a hot wash.', Unfiltered: 'Smaller. Distance works.' },
        hugeEnd: { Jolly: 'Still big from ten years out. That’s honest, and big things can still be carried.', Cheeky: 'Still huge in ten years? Fair. Big and survivable can share a sky.', Unfiltered: 'Still big. Honest. Still survivable.' },
        arriveMin: { Jolly: 'Ten minutes on.', Cheeky: 'Ten whole minutes. Riveting.', Unfiltered: 'Ten minutes.' },
        arriveMon: { Jolly: 'Ten months on. Notice how much else is in the sky?', Cheeky: 'Ten months. Look at all that other sky.', Unfiltered: 'Ten months. More sky now.' },
        arriveYrs: { Jolly: 'Ten years on. There it is, way out there.', Cheeky: 'Ten years. Can you even spot it?', Unfiltered: 'Ten years. Tiny.' },
        sweep: { Jolly: 'Now sweep the telescope across the whole sky.', Cheeky: 'Sweep the sky. There’s more up there than one worry.', Unfiltered: 'Sweep the sky.' },
        found: { Jolly: 'Look, a constellation of what matters.', Cheeky: 'Ooh, that one’s pretty. Keep sweeping.', Unfiltered: 'Found one. Keep going.' },
        final: { Jolly: 'There it is: one star in a very big sky. Still yours, just not the whole sky.', Cheeky: 'One star. Big sky. Your worry finally has some company.', Unfiltered: 'One star. Big sky. That’s the view.' },
        finalReal: { Jolly: 'It’s real, and it’s one star in a big sky. You’ve got a first step and a lot of sky.', Cheeky: 'Real worry, real plan, very big sky.', Unfiltered: 'Real. Planned. One star in a big sky.' }
      };

      /* ---------------- state ---------------- */
      const STOPS = [{ tl: 'NOW', long: 'Now' }, { tl: '10 MIN', long: '10 minutes from now' }, { tl: '10 MO', long: '10 months from now' }, { tl: '10 YRS', long: '10 years from now' }];
      const SIZES = ['Huge', 'Medium', 'Small', 'Tiny'];
      const PR = [0.8, 0.52, 0.2, 0.04], PDX = [0, 0.08, 0.2, 0.26], PDY = [0, -0.05, -0.12, -0.16];
      const G = { stage: 'intro', stop: 0, theta: 0, sizes: [], vel: 0, warp: 0, turning: false, speeds: [], smooth: [], pan: 0, found: [false, false, false, false], light: [0, 0, 0, 0, 0], finT: 0, open: 0, eyeA: 1, shoot: [], nextShoot: 1.2 };
      const pk = () => { const k = G.theta / Q, i = Math.min(2, Math.floor(k)), f = K.ease.inOutCubic(Math.min(1, k - i)); return { r: K.lerp(PR[i], PR[i + 1], f), dx: K.lerp(PDX[i], PDX[i + 1], f), dy: K.lerp(PDY[i], PDY[i + 1], f) }; };

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { maxDpr: 1.5 });
      el.classList.toggle('is-calm', K.reduced()); S.on('motion', (v) => el.classList.toggle('is-calm', !!v));
      const P = K.particles();
      const tl = h('div', { class: 'tt-tl', 'aria-hidden': 'true' }, STOPS.map(s => h('span', { text: s.tl })));
      const ringC = h('canvas', { class: 'tt-ring', 'aria-hidden': 'true' }), idx = h('i', { class: 'tt-idx', 'aria-hidden': 'true' });
      const hit = h('div', { class: 'tt-hit', role: 'slider', tabindex: '0', 'aria-label': 'Telescope focus ring. Drag around the ring, or press the right arrow, to travel forward in time.', 'aria-valuemin': '0', 'aria-valuemax': '3', 'aria-valuenow': '0' });
      const label = h('div', { class: 'tt-label gk-user is-center', text: WORRY });
      const capB = h('b', { text: 'Now' }), capP = h('p', { class: 'gk-user', text: CAP[0] });
      const capEl = h('div', { class: 'tt-cap', role: 'status', 'aria-live': 'polite' }, capB, capP);
      const ask = h('div', { class: 'tt-ask', hidden: true }, h('p', { class: 'tt-q', text: 'How big does it look from here?' }));
      const chips = K.chips(ask, SIZES.map((s, i) => ({ id: String(i), label: s })), onSize, { label: 'How big it looks' });
      const logCells = STOPS.map(s => { const em = h('em'), i = h('i', { style: { '--p1': PL.p1, '--p2': PL.p2 } }); const d = h('div', { class: 'is-empty' }, h('small', { text: s.tl }), i, em); d.em = em; d.dot = i; return d; });
      const log = h('div', { class: 'tt-log', 'aria-label': 'Your size log' }, logCells);
      const panel = h('div', { class: 'tt-panel' }, capEl, ask, log);
      const skyLabels = MATTERS.concat([TODAY]).map(n => h('div', { class: 'tt-sky', text: n }));
      el.append(ringC, idx, tl, hit, label, panel, ...skyLabels);
      const drop = K.character('drop', { side: 'right', mood: 'worried' });
      const say = (lines, o) => drop.say(ctx.line(care() ? Object.assign({}, lines, { Cheeky: lines.Jolly }) : lines), o); /* no jokes near a care-level concern */
      function paintTl() { Array.from(tl.children).forEach((s, i) => { s.classList.toggle('is-on', i === G.stop && G.stage !== 'sweep' && G.stage !== 'end'); s.classList.toggle('is-done', G.sizes[i] != null); }); hit.setAttribute('aria-valuenow', String(G.stop)); }

      /* ---------------- layout + caches ---------------- */
      const L = { W: 0, H: 0 };
      const BG = document.createElement('canvas'), SKYC = document.createElement('canvas'), NEB = document.createElement('canvas'), VIG = document.createElement('canvas');
      let STARS = [], WIDE = [], CON = [];
      function layout() {
        const W = cv.w || el.clientWidth || 390, H = cv.h || el.clientHeight || 844, phone = W < 700;
        Object.assign(L, { W, H, phone });
        if (phone) {
          L.R = Math.round(K.clamp(Math.min(W * 0.35, H * 0.165), 110, 150)); L.band = 28;
          L.cx = W / 2; L.cy = 112 + L.R + L.band;
          L.panel = { x: 14, y: L.cy + L.R + L.band + 12, w: W - 28 };
          Object.assign(tl.style, { left: '14px', top: '64px', width: (W - 28) + 'px' });
        } else {
          L.R = Math.round(K.clamp(H * 0.24, 150, 210)); L.band = 34;
          L.cx = Math.round(W * 0.38); L.cy = Math.round(H * 0.5 + 10);
          L.panel = { x: Math.round(L.cx + L.R + L.band + 56), y: 0, w: Math.min(440, W - (L.cx + L.R + L.band + 56) - 40) };
          L.panel.y = Math.round(L.cy - 170);
          Object.assign(tl.style, { left: L.panel.x + 'px', top: (L.panel.y - 56) + 'px', width: L.panel.w + 'px' });
        }
        const o = L.R + L.band;
        Object.assign(hit.style, { left: (L.cx - o) + 'px', top: (L.cy - o) + 'px', width: o * 2 + 'px', height: o * 2 + 'px' });
        Object.assign(panel.style, { left: L.panel.x + 'px', top: L.panel.y + 'px', width: L.panel.w + 'px' });
        label.style.setProperty('--mw', Math.round(L.R * 1.6) + 'px');
        buildBg(); buildRing(); buildNeb(); buildVig(); buildSky(); G.skyBaked = false; G.ringA = null; G.drawnOnce = false;
      }
      function rr(g, x, y, w, hh, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      function buildBg() {
        const dpr = cv.dpr || 1, W = L.W, H = L.H, dark = K.dark();
        BG.width = Math.max(2, Math.round(W * dpr)); BG.height = Math.max(2, Math.round(H * dpr));
        const g = BG.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, dark ? '#0b0d22' : '#1a1d3e'); bg.addColorStop(0.6, dark ? '#120f2a' : '#24204a'); bg.addColorStop(1, dark ? '#1c1020' : '#2e1a34');
        g.fillStyle = bg; g.fillRect(0, 0, W, H);
        /* dome ribs converge on the shutter slit */
        const sx = W / 2, slitW = L.phone ? 70 : 120;
        g.strokeStyle = 'rgba(160,170,230,0.10)'; g.lineWidth = L.phone ? 3 : 4;
        for (let i = -6; i <= 6; i++) { if (!i) continue; const bx = sx + i * W * 0.12; g.beginPath(); g.moveTo(bx, H + 20); g.quadraticCurveTo(sx + i * W * 0.1, H * 0.35, sx + Math.sign(i) * slitW / 2, -10); g.stroke(); }
        for (let k = 1; k < 7; k++) { const y = H * (0.12 + k * 0.13); g.strokeStyle = 'rgba(160,170,230,0.07)'; g.lineWidth = 2; g.beginPath(); g.ellipse(sx, y + H * 0.9, W * (0.6 + k * 0.1), H * 0.9, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke(); }
        const sl = g.createLinearGradient(sx - slitW / 2, 0, sx + slitW / 2, 0); sl.addColorStop(0, '#1d2040'); sl.addColorStop(0.5, '#2a2e58'); sl.addColorStop(1, '#1d2040');
        g.fillStyle = sl; g.fillRect(sx - slitW / 2, 0, slitW, H * 0.42);
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(sx - 1, 0, 2, H * 0.42);
        for (let y = 20; y < H * 0.42; y += 26) { g.fillStyle = 'rgba(200,210,255,0.25)'; g.beginPath(); g.arc(sx - slitW / 2 + 6, y, 1.6, 0, TAU); g.arc(sx + slitW / 2 - 6, y, 1.6, 0, TAU); g.fill(); }
        /* red observatory lamps */
        [[0.08, 0.7], [0.92, 0.7]].forEach(([fx, fy]) => { const x = W * fx, y = H * fy; const gl = g.createRadialGradient(x, y, 2, x, y, Math.max(W, H) * 0.35); gl.addColorStop(0, 'rgba(255,70,60,0.22)'); gl.addColorStop(1, 'rgba(255,70,60,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, H); g.fillStyle = '#ff6a5a'; g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); });
        /* the pier the telescope stands on */
        const o = L.R + L.band;
        const pier = g.createLinearGradient(L.cx - 50, 0, L.cx + 50, 0); pier.addColorStop(0, '#1a1b2a'); pier.addColorStop(0.5, '#3a3d58'); pier.addColorStop(1, '#151624');
        g.fillStyle = pier; g.beginPath(); g.moveTo(L.cx - 40, L.cy + o * 0.6); g.lineTo(L.cx + 40, L.cy + o * 0.6); g.lineTo(L.cx + 70, H); g.lineTo(L.cx - 70, H); g.closePath(); g.fill();
        g.save(); g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 40; g.shadowOffsetY = 18; g.fillStyle = '#08081a'; g.beginPath(); g.arc(L.cx, L.cy, o + 4, 0, TAU); g.fill(); g.restore();
        if (!L.phone) chart(g);
      }
      function chart(g) {
        const x = 40, y = 120, w = Math.min(220, L.cx - L.R - L.band - 90), hh = w * 1.25;
        if (w < 120) return;
        g.save(); g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 16; g.shadowOffsetY = 6;
        g.fillStyle = '#1d2448'; rr(g, x, y, w, hh, 8); g.fill(); g.restore();
        g.strokeStyle = 'rgba(255,220,160,0.5)'; g.lineWidth = 1.5; rr(g, x + 8, y + 8, w - 16, hh - 16, 6); g.stroke();
        g.beginPath(); g.arc(x + w / 2, y + hh / 2, w * 0.36, 0, TAU); g.strokeStyle = 'rgba(255,220,160,0.35)'; g.stroke();
        const r = K.rng('chart');
        for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,240,210,' + (0.4 + r() * 0.5) + ')'; g.fillRect(x + 14 + r() * (w - 28), y + 14 + r() * (hh - 28), 1.6, 1.6); }
        g.strokeStyle = 'rgba(255,220,160,0.6)'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 5; i++) { const px = x + w * (0.25 + r() * 0.5), py = y + hh * (0.25 + r() * 0.5); if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.stroke();
        g.fillStyle = 'rgba(255,220,160,0.8)'; g.font = '700 13px "Fredoka", system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('STAR CHART', x + w / 2, y + hh - 18);
      }
      function buildRing() {
        const dpr = Math.min(2, window.devicePixelRatio || 1), o = L.R + L.band, s = (o + 6) * 2;
        ringC.width = Math.max(2, Math.round(s * dpr)); ringC.height = ringC.width;
        Object.assign(ringC.style, { left: (L.cx - s / 2) + 'px', top: (L.cy - s / 2) + 'px', width: s + 'px', height: s + 'px' });
        Object.assign(idx.style, { left: L.cx + 'px', top: (L.cy - o - 17) + 'px' });
        const g = ringC.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, s, s); g.translate(s / 2, s / 2);
        const br = g.createLinearGradient(-o, -o, o, o); br.addColorStop(0, '#fff2c4'); br.addColorStop(0.25, '#d6a345'); br.addColorStop(0.5, '#8a5a18'); br.addColorStop(0.75, '#e8bb5c'); br.addColorStop(1, '#5a3a0c');
        g.fillStyle = br; g.beginPath(); g.arc(0, 0, o, 0, TAU); g.arc(0, 0, L.R, 0, TAU, true); g.fill();
        g.strokeStyle = 'rgba(60,35,5,0.55)'; g.lineWidth = 1.2;
        for (let i = 0; i < 120; i++) { const a = i / 120 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * (o - 6), Math.sin(a) * (o - 6)); g.lineTo(Math.cos(a) * (o - 1), Math.sin(a) * (o - 1)); g.stroke(); }
        g.strokeStyle = 'rgba(255,250,220,0.6)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, o - 0.5, Math.PI * 1.1, Math.PI * 1.6); g.stroke();
        g.strokeStyle = 'rgba(40,22,2,0.8)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, L.R + 1, 0, TAU); g.stroke();
        g.font = '800 ' + (L.phone ? 12 : 14) + 'px "Fredoka", "Nunito", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        const mid = L.R + L.band * 0.46;
        STOPS.forEach((st, i) => {
          const a = -Math.PI / 2 - i * Q;
          g.save(); g.rotate(a + Math.PI / 2);
          const txt = st.tl, tw = g.measureText(txt).width + 14;
          g.fillStyle = 'rgba(40,24,4,0.82)'; rr(g, -tw / 2, -mid - 9, tw, 18, 9); g.fill();
          g.fillStyle = '#ffe7a8'; g.fillText(txt, 0, -mid);
          g.restore();
          for (let k = 1; k < 6; k++) { const aa = a - k * Q / 6; g.strokeStyle = 'rgba(40,22,2,0.7)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(Math.cos(aa) * (L.R + 4), Math.sin(aa) * (L.R + 4)); g.lineTo(Math.cos(aa) * (L.R + 10), Math.sin(aa) * (L.R + 10)); g.stroke(); }
        });
      }
      function buildNeb() {
        const R = L.R, s = R * 4, dpr = Math.min(1, cv.dpr || 1);
        NEB.width = Math.max(2, Math.round(s * dpr)); NEB.height = Math.max(2, Math.round(s * 0.7 * dpr));
        const g = NEB.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const r = K.rng('neb');
        for (let i = 0; i < 14; i++) { const x = r() * s, y = s * 0.35 + (r() - 0.5) * s * 0.4, rad = R * (0.3 + r() * 0.6); const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, K.hexA(NEBULA[i % 2], 0.16 + r() * 0.12)); gr.addColorStop(1, K.hexA(NEBULA[i % 2], 0)); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
      }
      function buildVig() {
        const dpr = cv.dpr || 1, R = L.R, s = R * 2;
        VIG.width = Math.max(2, Math.round(s * dpr)); VIG.height = VIG.width;
        const g = VIG.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const v = g.createRadialGradient(R, R, R * 0.62, R, R, R); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.85, 'rgba(0,0,10,0.35)'); v.addColorStop(1, 'rgba(0,0,10,0.92)');
        g.fillStyle = v; g.fillRect(0, 0, s, s);
        const rim = g.createLinearGradient(0, 0, s, s); rim.addColorStop(0, 'rgba(120,200,255,0.10)'); rim.addColorStop(0.5, 'rgba(0,0,0,0)'); rim.addColorStop(1, 'rgba(255,120,200,0.08)');
        g.fillStyle = rim; g.beginPath(); g.arc(R, R, R, 0, TAU); g.arc(R, R, R * 0.9, 0, TAU, true); g.fill();
      }
      function buildSky() {
        const r = K.rng('tt-stars'), R = L.R;
        STARS = Array.from({ length: L.phone ? 130 : 200 }, () => ({ x: (r() - 0.5) * R * 5, y: (r() - 0.5) * R * 2.2, z: 0.3 + r() * 0.7, s: 0.6 + r() * 1.4, ph: r() * 6 }));
        WIDE = Array.from({ length: L.phone ? 220 : 380 }, () => ({ x: r() * L.W, y: r() * L.H, s: 0.5 + r() * 1.6, ph: r() * 6, c: r() < 0.15 ? '#ffd9a8' : r() < 0.3 ? '#bcd4ff' : '#ffffff' }));
        /* constellations of what matters, around the worry (sky units: multiples of R from the view centre) */
        const spots = [[-1.5, -0.32], [-0.82, 0.42], [0.86, 0.36], [1.55, -0.3]];
        CON = MATTERS.map((n, i) => { const rc = K.rng('con' + n); const pts = []; const cx = spots[i][0], cy = spots[i][1]; for (let k = 0; k < 5; k++) pts.push([cx + (rc() - 0.5) * 0.62, cy + (rc() - 0.5) * 0.46]); pts.sort((a, b) => a[0] - b[0]); return { n, pts, x: cx, y: cy }; });
        const rt = K.rng(TODAY); const tp = []; for (let k = 0; k < 5; k++) tp.push([0.26 + Math.cos(k / 5 * TAU) * 0.26 + (rt() - 0.5) * 0.08, -0.16 + Math.sin(k / 5 * TAU) * 0.2]);
        CON.push({ n: TODAY, pts: tp, x: 0.26, y: -0.16, today: true });
      }

      /* ---------------- drawing ---------------- */
      function drawPlanet(g, x, y, r, t) {
        if (r < 3) { const gl = g.createRadialGradient(x, y, 0, x, y, 12); gl.addColorStop(0, '#ffffff'); gl.addColorStop(0.3, K.hexA(PL.p1, 0.9)); gl.addColorStop(1, K.hexA(PL.p1, 0)); g.fillStyle = gl; g.fillRect(x - 12, y - 12, 24, 24); return; }
        const at = g.createRadialGradient(x, y, r * 0.9, x, y, r * (1.3 + 0.12 * pulseOf())); at.addColorStop(0, K.hexA(PL.p1, 0.28 + 0.2 * pulseOf())); at.addColorStop(1, K.hexA(PL.p1, 0)); g.fillStyle = at; g.fillRect(x - r * 1.4, y - r * 1.4, r * 2.8, r * 2.8);
        if (PL.ring) { g.save(); g.translate(x, y); g.rotate(-0.35); g.strokeStyle = K.hexA(PL.p1, 0.55); g.lineWidth = Math.max(1, r * 0.09); g.beginPath(); g.ellipse(0, 0, r * 1.75, r * 0.42, 0, Math.PI, TAU); g.stroke(); g.restore(); }
        const sp = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); sp.addColorStop(0, '#ffffff'); sp.addColorStop(0.18, PL.p1); sp.addColorStop(1, PL.p2);
        g.fillStyle = sp; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
        g.fillStyle = PL.band; for (let i = -3; i <= 3; i++) { const yy = y + i * r * 0.26 + Math.sin(t * 0.3 + i) * r * 0.02; g.beginPath(); g.ellipse(x + Math.sin(t * 0.1 + i) * r * 0.1, yy, r * 1.2, r * 0.05 + (i % 2 ? r * 0.03 : 0), 0, 0, TAU); g.fill(); }
        const sh = g.createRadialGradient(x - r * 0.5, y - r * 0.5, r * 0.6, x - r * 0.2, y - r * 0.2, r * 1.5); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,20,0.7)'); g.fillStyle = sh; g.fillRect(x - r, y - r, r * 2, r * 2);
        g.restore();
        if (PL.ring) { g.save(); g.translate(x, y); g.rotate(-0.35); g.strokeStyle = K.hexA(PL.p1, 0.75); g.lineWidth = Math.max(1, r * 0.09); g.beginPath(); g.ellipse(0, 0, r * 1.75, r * 0.42, 0, 0, Math.PI); g.stroke(); g.restore(); }
      }
      function drawCon(g, c, ox, oy, sc, a, t, lw) {
        if (a <= 0.01) return;
        const pts = c.pts.map(p => [ox + p[0] * sc, oy + p[1] * sc]);
        g.save(); g.globalAlpha = a;
        g.strokeStyle = c.today ? 'rgba(255,214,140,0.8)' : 'rgba(190,210,255,0.65)'; g.lineWidth = lw || 1.4; g.setLineDash([]);
        g.beginPath(); pts.forEach((p, i) => { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); if (c.today) g.closePath(); g.stroke();
        pts.forEach((p, i) => { const tw = 0.7 + 0.3 * Math.sin(t * 2 + i * 1.7), rr2 = (2.2 + (i % 2)) * (lw ? 1.3 : 1); const gl = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], rr2 * 4); gl.addColorStop(0, 'rgba(255,250,235,' + tw + ')'); gl.addColorStop(1, 'rgba(255,250,235,0)'); g.fillStyle = gl; g.fillRect(p[0] - rr2 * 4, p[1] - rr2 * 4, rr2 * 8, rr2 * 8); g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(p[0], p[1], rr2 * 0.6, 0, TAU); g.fill(); });
        g.restore();
        return pts;
      }
      function drawEyepiece(g, t) {
        const R = L.R, cx = L.cx, cy = L.cy, a = G.eyeA;
        if (a <= 0.01) return;
        g.save(); g.globalAlpha = a;
        g.save(); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.clip();
        g.fillStyle = '#03040e'; g.fillRect(cx - R, cy - R, R * 2, R * 2);
        const panX = G.pan;
        g.drawImage(NEB, cx - R * 2 - panX * 0.4, cy - R * 1.4, R * 4, R * 2.8);
        const warp = G.warp;
        g.fillStyle = '#ffffff';
        if (warp > 0.05) { g.strokeStyle = 'rgba(220,230,255,0.62)'; g.lineWidth = 1.1; g.beginPath(); }
        for (const s of STARS) {
          const x = cx + s.x - panX * s.z, y = cy + s.y; if (x < cx - R - 4 || x > cx + R + 4) continue;
          if (warp > 0.05) { const dx = x - cx, dy = y - cy, len = warp * 26 * s.z, d = Math.hypot(dx, dy) || 1; g.moveTo(x, y); g.lineTo(x + dx / d * len, y + dy / d * len); }
          else { g.globalAlpha = a * (0.45 + 0.55 * Math.abs(Math.sin(t * 1.1 + s.ph))) * s.z; g.fillRect(x, y, s.s, s.s); }
        }
        if (warp > 0.05) g.stroke();
        g.globalAlpha = a;
        if (G.stage === 'sweep' || G.stage === 'end') CON.forEach((c, i) => { const ox = cx - panX, sc = R; drawCon(g, c, ox + 0, cy, sc, c.today ? 0.9 : G.light[i], t); });
        const p = pk(), pr = R * p.r, px = cx + R * p.dx - panX, py = cy + R * p.dy;
        drawPlanet(g, px, py, pr, t);
        L.pl = { x: px, y: py, r: pr };
        g.drawImage(VIG, cx - R, cy - R, R * 2, R * 2);
        g.restore();
        g.restore();
        /* the brass focus ring is its own layer, turned by the compositor */
        if (G.ringA !== G.theta) { G.ringA = G.theta; ringC.style.transform = 'rotate(' + G.theta.toFixed(4) + 'rad)'; }
      }
      function bakeOpenSky() {
        const W = L.W, H = L.H, dpr = cv.dpr || 1;
        SKYC.width = Math.max(2, Math.round(W * dpr)); SKYC.height = Math.max(2, Math.round(H * dpr));
        const g = SKYC.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#02030c'); sky.addColorStop(0.55, '#0a0b26'); sky.addColorStop(1, '#1a1030');
        g.fillStyle = sky; g.fillRect(0, 0, W, H);
        g.save(); g.globalAlpha = 0.9; g.translate(W / 2, H * 0.35); g.rotate(-0.5); g.drawImage(NEB, -W * 0.9, -H * 0.18, W * 1.8, H * 0.36); g.restore();
        WIDE.forEach((s, i) => { if (i % 3) { g.globalAlpha = 0.45; g.fillStyle = s.c; g.fillRect(s.x, s.y, s.s, s.s); } });
        g.globalAlpha = 1; G.skyBaked = true;
      }
      function drawOpenSky(g, t) {
        if (G.open <= 0) return;
        if (!G.skyBaked) bakeOpenSky();
        g.drawImage(SKYC, 0, 0, L.W, L.H);
        for (let i = 0; i < WIDE.length; i += 3) { const s = WIDE[i]; g.globalAlpha = 0.35 + 0.6 * Math.abs(Math.sin(t * 0.9 + s.ph)); g.fillStyle = s.c; g.fillRect(s.x, s.y, s.s + 0.4, s.s + 0.4); }
        g.globalAlpha = 1;
      }
      function drawFinaleSky(g, t) {
        const W = L.W, H = L.H, k = K.clamp((G.finT - 1.5) / 1.2, 0, 1);
        if (k <= 0) return;
        const FIN = L.phone ? [[0.18, 0.2], [0.82, 0.19], [0.18, 0.525], [0.82, 0.515], [0.5, 0.31]] : [[0.2, 0.24], [0.8, 0.22], [0.25, 0.56], [0.75, 0.54], [0.5, 0.38]];
        const sc = L.phone ? 125 : 220;
        G.skyPos = [];
        owned.forEach((n, j) => { const rc = K.rng('own' + n), ox = W * (0.14 + 0.72 * (j + 0.5) / owned.length), oy = (L.phone ? 124 : 96) + (j % 2) * 22, pts = []; for (let q = 0; q < 4; q++) pts.push([(rc() - 0.5) * 0.5, (rc() - 0.5) * 0.24]); drawCon(g, { n, pts }, ox, oy, sc * 0.55, k * 0.45, t); });
        CON.forEach((c, i) => {
          const [fx, fy] = FIN[i], ox = W * fx, oy = H * fy, ss = c.today ? sc * 1.5 : sc * 1.15;
          const rel = { n: c.n, today: c.today, pts: c.pts.map(q => [q[0] - c.x, q[1] - c.y]) };
          if (c.today) { const halo = g.createRadialGradient(ox, oy, 4, ox, oy, ss * 0.62); halo.addColorStop(0, 'rgba(255,214,140,' + (0.2 * k) + ')'); halo.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = halo; g.fillRect(ox - ss, oy - ss, ss * 2, ss * 2); }
          const pts = drawCon(g, rel, ox, oy, ss, k * (c.today ? 1 : 0.95), t, 2);
          if (pts) G.skyPos[i] = { x: ox, y: oy, pts };
        });
        const [tx, ty] = FIN[4], wx = W * tx, wy = H * ty, pulse = pulseOf();
        const gl = g.createRadialGradient(wx, wy, 0, wx, wy, 30); gl.addColorStop(0, K.hexA(PL.p1, 0.95 * k)); gl.addColorStop(0.3, K.hexA(PL.p1, (0.25 + 0.3 * pulse) * k)); gl.addColorStop(1, K.hexA(PL.p1, 0));
        g.fillStyle = gl; g.fillRect(wx - 30, wy - 30, 60, 60);
        g.strokeStyle = K.hexA(PL.p1, 0.5 * k * (1 - pulse)); g.lineWidth = 1.5; g.beginPath(); g.arc(wx, wy, 8 + pulse * 14, 0, TAU); g.stroke();
        g.fillStyle = 'rgba(255,255,255,' + k + ')'; g.beginPath(); g.arc(wx, wy, 3, 0, TAU); g.fill();
        G.worryAt = { x: wx, y: wy + sc * 1.5 * 0.26 + 4 };
      }
      function drawShooting(g, dt) {
        G.nextShoot -= dt;
        if (G.nextShoot <= 0 && !K.reduced()) { G.nextShoot = 0.9 + Math.random() * 1.4; const x = L.W * (0.2 + Math.random() * 0.8), y = L.H * (0.04 + Math.random() * 0.3); G.shoot.push({ x, y, vx: -(380 + Math.random() * 260), vy: 160 + Math.random() * 120, life: 0.9 }); if (A.ctx) A.tone({ type: 'sine', freq: 2400, to: 900, glide: 0.5, dur: 0.6, vol: 0.012, verb: 0.6 }); }
        G.shoot = G.shoot.filter(s => (s.life -= dt) > 0);
        G.shoot.forEach(s => { s.x += s.vx * dt; s.y += s.vy * dt; const gr = g.createLinearGradient(s.x, s.y, s.x - s.vx * 0.18, s.y - s.vy * 0.18); gr.addColorStop(0, 'rgba(255,255,255,' + Math.min(1, s.life * 1.6) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.strokeStyle = gr; g.lineWidth = 2; g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x - s.vx * 0.18, s.y - s.vy * 0.18); g.stroke(); });
      }

      /* ---------------- sound ---------------- */
      const music = K.music('space');
      music.level(0.7);
      let hum = null;
      S.onDestroy(() => { if (hum) hum.stop(); });
      let lastClick = 0;
      function beat() { if (!A.ctx || !music.bpm) return (performance.now() / 1000 * 56 / 60) % 1; const iv = 60 / music.bpm, x = (A.now() - (music.next - iv)) / iv; return ((x % 1) + 1) % 1; }
      const pulseOf = () => Math.pow(1 - beat(), 3);
      function ratchet(speed) { const step = Math.floor(G.theta / (Q / 9)); if (step === lastClick) return; lastClick = step; if (!A.ctx) return; A.click({ vol: 0.05 + Math.min(0.05, speed * 0.01) }); A.wood(undefined, 0.05, 1.2 + (G.theta / (Q * 3)) * 0.8); }
      function thunk() { K.sfx.lock(); if (A.ctx) { A.tone({ type: 'sine', freq: 90, to: 50, glide: 0.2, dur: 0.35, vol: 0.18 }); A.chime(A.note(['A4', 'C5', 'E5', 'A5'][G.stop]), { vol: 0.09, dur: 2 }); } }

      /* ---------------- flow ---------------- */
      function guideTurn(delay) { K.guide({ id: 'tt-turn', g: 'circle', target: hit, r: Math.round(L.R + L.band * 0.5), label: 'TURN THE RING', delay: delay ?? 800 }); }
      function setCap(i, head, text) { capB.textContent = head; capP.textContent = text; capEl.classList.remove('is-in'); void capEl.offsetWidth; capEl.classList.add('is-in'); void i; }
      function showAsk() { ask.hidden = false; chips.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', 'false')); chips.chosen.clear(); K.guide({ id: 'tt-size', g: 'choose', target: () => Array.from(chips.querySelectorAll('button')), label: 'HOW BIG FROM HERE?', delay: 1400 }); }
      function onSize(item, b) {
        if (G.stage !== 'size') return;
        const i = Number(item.id), st = G.stop;
        G.stage = 'picked'; G.sizes[st] = i;
        K.sfx.pop(undefined, 760 - i * 110);
        const r = K.rectIn(b); P.emit('star', r.cx, r.cy, 8, { colors: ['#ffe29a', '#ffffff', PL.p1] });
        const cell = logCells[st]; cell.classList.remove('is-empty'); cell.em.textContent = SIZES[i]; cell.dot.style.setProperty('--d', [34, 22, 12, 5][i] + 'px'); cell.classList.remove('is-new'); void cell.offsetWidth; cell.classList.add('is-new');
        paintTl();
        ctx.track('size', { stop: st, size: i });
        if (st === 0) say(LN.turn, { ms: 3200 });
        else if (st === 3) say(i === 0 ? LN.hugeEnd : LN.smaller, { ms: 3600 });
        else say(i <= G.sizes[st - 1] && i <= 1 ? LN.stillHuge : LN.smaller, { ms: 3000 });
        drop.base(['worried', 'think', 'calm', 'happy'][Math.min(3, st + (i >= 2 ? 1 : 0))]);
        S.later(() => {
          ask.hidden = true;
          if (st < 3) { G.stage = 'turn'; G.speeds = []; guideTurn(600); }
          else startSweep();
        }, 650);
      }
      function arrive(i) {
        if (G.stage !== 'turn') return;
        G.stop = i; G.theta = i * Q; G.stage = 'size'; G.turning = false; G.vel = 0;
        const sp = G.speeds.filter(x => x > 0.05);
        if (sp.length > 3) { const m = sp.reduce((a, b) => a + b, 0) / sp.length, sd = Math.sqrt(sp.reduce((a, b) => a + (b - m) * (b - m), 0) / sp.length); G.smooth.push(K.clamp(1 - (sd / m) * 0.8, 0, 1)); }
        else G.smooth.push(0.6);
        thunk();
        const p = pk(); P.emit('star', L.cx + L.R * p.dx, L.cy + L.R * p.dy, 12, { colors: ['#ffffff', PL.p1] });
        K.guide(null); paintTl();
        setCap(i, STOPS[i].long, CAP[i]);
        say([null, LN.arriveMin, LN.arriveMon, LN.arriveYrs][i], { mood: ['', 'think', 'wow', 'calm'][i], ms: 2600 });
        ctx.track('stop', { stop: i });
        S.later(showAsk, 600);
      }
      function startSweep() {
        G.stage = 'sweep'; G.pan = 0; paintTl();
        label.hidden = true;
        setCap(4, 'The whole sky', 'Your worry is still out there. Now look at what else is in the sky.');
        drop.base('wow'); say(LN.sweep, { ms: 3400 });
        K.sfx.rise();
        K.guide({ id: 'tt-sweep', g: 'sweep', target: hit, d: Math.round(L.R * 0.55), label: 'SWEEP THE SKY', delay: 900 });
      }
      function checkFound() {
        CON.forEach((c, i) => {
          if (c.today || G.found[i]) return;
          if (Math.abs(c.x * L.R - G.pan) < L.R * 0.5) {
            G.found[i] = true; K.sfx.chime(4 + i);
            P.emit('star', L.cx + c.x * L.R - G.pan, L.cy + c.y * L.R, 10, { colors: ['#fff4d6', '#cfe0ff'] });
            if (G.found.filter(Boolean).length === 1) say(LN.found, { mood: 'love', ms: 2600 });
            ctx.track('found', { i });
          }
        });
        if (G.found.every(Boolean) && G.stage === 'sweep') { G.stage = 'pre'; K.guide(null); S.later(finale, 900); }
      }

      /* ---------------- input ---------------- */
      let lastA = 0, lastT = 0, panStart = 0;
      const angOf = (p) => { const o = L.R + L.band; return Math.atan2(p.y - o, p.x - o); };
      K.drag(hit, {
        start: (p) => {
          if (G.stage === 'turn') { lastA = angOf(p); lastT = performance.now(); G.turning = true; K.sfx.tap(); if (A.ctx && !hum) hum = A.loop({ pink: true, filter: 'bandpass', freq: 300, q: 1.2, bus: 'sfx' }); return; }
          if (G.stage === 'sweep') { panStart = G.pan; G.sweeping = true; K.sfx.whoosh(); return; }
          if (G.stage === 'size') say(LN.sizeAsk, { ms: 2200 });
          K.sfx.soft();
          return false;
        },
        move: (p, d) => {
          if (G.stage === 'turn') {
            const a = angOf(p); let da = a - lastA; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; lastA = a;
            const lo = G.stop * Q, hi = (G.stop + 1) * Q, nth = K.clamp(G.theta + da, lo, hi);
            const now = performance.now(), dtm = Math.max(8, now - lastT); lastT = now;
            const sp = Math.abs(nth - G.theta) / dtm * 1000; if (sp > 0) G.speeds.push(sp);
            G.vel = sp; G.theta = nth; ratchet(sp);
            if (hum) { hum.level(Math.min(0.06, sp * 0.02), 0.05); hum.freq(200 + G.theta * 120, 0.1); }
            if (G.theta >= hi - 0.015) arrive(G.stop + 1);
            return;
          }
          if (G.stage === 'sweep') { const max = L.R * 1.75; G.pan = K.clamp(panStart - d.dx * 1.2, -max, max); checkFound(); }
        },
        end: () => {
          G.turning = false; G.sweeping = false; G.vel = 0; if (hum) hum.level(0.0001, 0.1);
          if (G.stage === 'turn') guideTurn(1200);
          if (G.stage === 'sweep') K.guide({ id: 'tt-sweep2', g: 'sweep', target: hit, d: Math.round(L.R * 0.55), label: 'SWEEP THE OTHER WAY', delay: 1400 });
        }
      });
      S.listen(hit, 'keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          if (G.stage === 'turn') { G.theta = Math.min((G.stop + 1) * Q, G.theta + 0.12); G.speeds.push(1); ratchet(1); if (G.theta >= (G.stop + 1) * Q - 0.015) arrive(G.stop + 1); }
          if (G.stage === 'sweep') { G.pan = Math.min(L.R * 1.75, G.pan + L.R * 0.2); checkFound(); }
        }
        if (e.key === 'ArrowLeft' && G.stage === 'sweep') { e.preventDefault(); G.pan = Math.max(-L.R * 1.75, G.pan - L.R * 0.2); checkFound(); }
      });

      /* style writes only when a value actually changes (keeps style recalc and paint out of most frames) */
      const put = (e, k, v) => { const c = e.__c || (e.__c = {}); if (c[k] !== v) { c[k] = v; e.style[k] = v; } };
      const putCls = (e, k, on) => { const c = e.__c || (e.__c = {}); if (c['.' + k] !== on) { c['.' + k] = on; e.classList.toggle(k, on); } };

      /* ---------------- render loop ---------------- */
      let acc = 0, odd = false;
      K.loop((dt0, t) => {
        const g = cv.g; if (!g || !L.W) return;
        /* adaptive frame rate: 60 fps while turning, sweeping or opening the dome, 30 fps for idle ambience (saves battery) */
        if (G.stage === 'intro' && G.drawnOnce) return;
        G.drawnOnce = true;
        const busy = G.turning || G.sweeping || G.warp > 0.02 || G.stage === 'end' || G.stage === 'pre' || P.count() > 0 || G.shoot.length > 0;
        odd = !odd;
        if (!busy && odd) { acc += dt0; return; }
        const dt = Math.min(0.1, dt0 + acc); acc = 0;
        G.warp += ((G.turning ? Math.min(1, G.vel * 0.5) : 0) - G.warp) * Math.min(1, dt * 6);
        if (G.stage === 'sweep' || G.stage === 'pre') CON.forEach((c, i) => { if (G.found[i]) G.light[i] = Math.min(1, G.light[i] + dt * 1.6); });
        if (G.stage === 'end') { G.finT += dt; G.open = K.clamp((G.finT - 0.5) / 2.2, 0, 1); G.eyeA = K.clamp(1 - G.finT / 1.2, 0, 1); if (!G.ringOff) { G.ringOff = true; ringC.style.opacity = '0'; idx.style.opacity = '0'; } }
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        if (G.open > 0) {
          drawOpenSky(g, t);
          const e = K.ease.inOutCubic(G.open), half = L.W / 2, dpr = cv.dpr || 1;
          g.drawImage(BG, 0, 0, half * dpr, BG.height, -e * half, 0, half, L.H);
          g.drawImage(BG, half * dpr, 0, half * dpr, BG.height, half + e * half, 0, half, L.H);
          drawFinaleSky(g, t);
          drawShooting(g, dt);
        } else g.drawImage(BG, 0, 0, L.W, L.H);
        drawEyepiece(g, t);
        P.update(dt); P.draw(g);
        /* the worry label follows its planet, then its star */
        const px = (v) => Math.round(v) + 'px';
        if (G.stage === 'end' && G.worryAt && G.open > 0.6) { label.hidden = false; putCls(label, 'is-center', false); put(label, 'left', px(G.worryAt.x)); put(label, 'top', px(G.worryAt.y + 14)); put(label, 'opacity', (Math.round(Math.min(1, (G.open - 0.6) * 2.5) * 0.92 * 20) / 20).toString()); }
        else if (L.pl && !label.hidden && G.stage !== 'end') {
          const big = L.pl.r > L.R * 0.42;
          putCls(label, 'is-center', big);
          put(label, 'left', px(L.pl.x)); put(label, 'top', px(big ? L.pl.y - 18 : L.pl.y + Math.max(L.pl.r * 1.5, 10) + 6));
        }
        skyLabels.forEach((s, i) => {
          if (G.stage === 'end' && G.skyPos && G.skyPos[i]) { const c = G.skyPos[i]; const top = c.pts.reduce((m, q) => Math.min(m, q[1]), 1e9); put(s, 'left', px(c.x)); put(s, 'top', px(top - 18)); putCls(s, 'is-on', G.finT > 2.1); }
          else if ((G.stage === 'sweep' || G.stage === 'pre') && i < 4) { const c = CON[i]; const x = L.cx + c.x * L.R - G.pan, y = L.cy + c.y * L.R - L.R * 0.36; put(s, 'left', px(x)); put(s, 'top', px(y)); putCls(s, 'is-on', G.found[i] && Math.abs(x - L.cx) < L.R * 0.55); }
          else if ((G.stage === 'sweep' || G.stage === 'pre') && i === 4) { const x = L.cx + 0.26 * L.R - G.pan, y = L.cy - 0.6 * L.R; put(s, 'left', px(x)); put(s, 'top', px(y)); putCls(s, 'is-on', Math.abs(x - L.cx) < L.R * 0.4); }
          else putCls(s, 'is-on', false);
        });
      });

      /* ---------------- finale ---------------- */
      let finished = false;
      async function finale() {
        if (G.stage !== 'pre') return;
        G.stage = 'end'; G.finT = 0; K.guide(null);
        ask.hidden = true;
        label.style.setProperty('--mw', (L.phone ? 150 : Math.round(L.R * 1.6)) + 'px');
        setCap(5, 'The whole sky', FUT);
        if (L.phone) { panel.style.transition = 'top .9s cubic-bezier(.2,.9,.3,1)'; panel.style.top = (L.panel.y + 62) + 'px'; }
        if (!L.phone) { panel.style.transition = 'left .9s cubic-bezier(.2,.9,.3,1), top .9s cubic-bezier(.2,.9,.3,1)'; panel.style.left = Math.round(L.W / 2 - L.panel.w / 2) + 'px'; panel.style.top = Math.round(L.H - panel.offsetHeight - 26) + 'px'; tl.style.opacity = '0'; }
        if (A.ctx) { A.noise({ pink: true, filter: 'lowpass', freq: 160, dur: 2.6, attack: 0.4, vol: 0.12 }); A.tone({ type: 'sawtooth', freq: 55, to: 70, glide: 2.4, dur: 2.6, vol: 0.03, lp: 300, attack: 0.5 }); }
        K.sfx.whoosh();
        drop.base('celebrate'); drop.react('bounce');
        say(serious() ? LN.finalReal : LN.final, { ms: 0 });
        S.later(() => { K.sfx.great(); P.emit('star', L.W / 2, L.H * 0.3, 24, { colors: ['#fff4d6', PL.p1, '#cfe0ff'] }); }, 2300);
        const sm = G.smooth.length ? G.smooth.reduce((a, b) => a + b, 0) / G.smooth.length : 0.6, pct = Math.round(sm * 100);
        const best = K.best('steady', pct, 'higher'), tier = K.tier(sm, [0.35, 0.6, 0.82]);
        const col = K.collect(TODAY);
        await S.sleep(1800);
        await K.finale('stars', { colors: ['#fff4d6', '#ffd27a', '#cfe0ff', PL.p1], chord: ['A3', 'E4', 'B4', 'C#5'], ms: 4600 });
        const nowS = SIZES[G.sizes[0] ?? 0], endS = SIZES[G.sizes[3] ?? 3];
        const badges = [];
        if (best.isNew) badges.push('New best: ' + pct + '% steady'); else badges.push('Steady hands: ' + pct + '%' + (best.prev != null && !best.first ? ' (best ' + best.prev + '%)' : ''));
        if (tier) badges.push(tier + ' steady hands');
        if (col.isNew) badges.push('Collected: ' + TODAY);
        badges.push('Your sky: ' + (owned.length + 1) + ' constellation' + (owned.length ? 's' : ''));
        finished = true;
        ctx.finish({
          title: 'One star in a big sky', mood: 'celebrate',
          lines: ['Now: ' + nowS + ' → 10 years: ' + endS, K.words(FUT, 16), 'Found ' + MATTERS.length + ' constellations of what matters'],
          share: 'Looked at a worry from 10 years away. Now: ' + nowS + ' → 10 years: ' + endS + '.',
          badges
        });
      }

      /* ---------------- start ---------------- */
      cv.onResize(() => layout());
      S.on('theme', () => { if (L.W) buildBg(); });
      if (ctx.analysisReady && ctx.analysisReady.then) ctx.analysisReady.then(a => { if (a && a !== an && G.stage === 'intro') { an = a; buildTexts(); label.textContent = WORRY; capP.textContent = CAP[0]; } }).catch(() => {});
      paintTl();
      (async () => {
        await K.intro({ title: 'Time Telescope', sub: 'Your worry is a planet, up close. Travel forward in time and watch it from further away.', how: 'Rate its size. Turn the brass ring. Sweep the sky.', char: 'drop', mood: 'wow' });
        G.stage = 'size'; paintTl();
        drop.base('worried');
        say(visits > 0 ? LN.back : LN.start, { mood: 'wow', moodMs: 1200, ms: 4400 });
        K.sfx.rise();
        S.later(showAsk, 900);
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = performance.now(); while (!fn()) { if (performance.now() - t0 > (ms || 30000)) return false; await K.wait(100); } return true; };
          const pickSize = async (i) => { await until(() => G.stage === 'size' && !ask.hidden, 20000); await K.wait(900); await K.sim.tap(chips.querySelectorAll('button')[i]); };
          const turn = async () => {
            await until(() => G.stage === 'turn', 20000); await K.wait(700);
            const o = L.R + L.band, rad = L.R + L.band * 0.5, from = G.theta - Math.PI / 2, steps = 26;
            const pr = await K.sim.press(hit, o + Math.cos(from) * rad, o + Math.sin(from) * rad);
            for (let k = 1; k <= steps + 3 && G.stage === 'turn'; k++) { await K.wait(50); const a = from + (Q + 0.06) * k / steps; pr.move(o + Math.cos(a) * rad, o + Math.sin(a) * rad); }
            pr.up();
          };
          await pickSize(0);
          for (let s = 1; s <= 3; s++) { await turn(); await pickSize([0, 2, 3][s - 1]); }
          await until(() => G.stage === 'sweep', 20000); await K.wait(1200);
          const o = L.R + L.band;
          await K.sim.drag(hit, { x: o, y: o }, { x: o + L.R * 1.5, y: o + 6 }, 1300, 26);
          await K.wait(500);
          await K.sim.drag(hit, { x: o * 1.8, y: o }, { x: o * 0.2, y: o - 4 }, 1300, 26);
          await K.wait(600);
          for (let n = 0; n < 4 && G.stage === 'sweep'; n++) { await K.sim.drag(hit, { x: o * 1.8, y: o }, { x: o * 0.2, y: o + 4 }, 1400, 28); await K.wait(400); }
          await until(() => finished, 40000);
        }
      };
    }
  });
})(window.TSG_ENV);
