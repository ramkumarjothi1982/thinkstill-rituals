/* 007 Block Party — Reset · DISTANCE · Mental Imagery
 * Mechanism: a visuospatial puzzle loads the same working memory that intrusive images need, so they become less vivid
 * and intrude less (Holmes et al. 2009; Iyadurai et al. 2018). About 100 seconds of shapes, with no words in play.
 * Verb: stack (move, turn and drop pastel house parts; full rows become lit streets). Never a game over: if the plot
 * fills, the top rows float away as balloons. Finale: the town lights up window by window, street lamps come on and
 * fireworks launch from the rooftops.
 */
(function (env) {
  'use strict';
  /* Machines that draw without a graphics card get a lighter canvas, so the town never stutters. */
  function softwareGfx() {
    try {
      const c = document.createElement('canvas'), gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info'), r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r);
    } catch (e) { return false; }
  }
  /* An opaque canvas (no alpha channel): the compositor can copy it instead of blending it over the page, which
     roughly halves the cost of every frame on machines without a graphics card. Same shape as K.canvas. */
  function opaqueCanvas(parent, o, S) {
    const c = document.createElement('canvas');
    c.className = 'gk-canvas'; c.setAttribute('aria-hidden', 'true');
    parent.append(c);
    const st = { el: c, g: null, w: 0, h: 0, dpr: 1 }, cbs = [];
    st.fit = () => {
      const w = c.clientWidth || parent.clientWidth, hh = c.clientHeight || parent.clientHeight;
      if (!w || !hh) return;
      const dpr = Math.min(window.devicePixelRatio || 1, o.maxDpr || 2), pw = Math.round(w * dpr), ph = Math.round(hh * dpr);
      if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
      st.g = st.g || c.getContext('2d', { alpha: false });
      st.g.setTransform(dpr, 0, 0, dpr, 0, 0);
      st.dpr = dpr; st.w = w; st.h = hh;
      cbs.forEach(f => { try { f(st); } catch (e) { console.error(e); } });
    };
    st.onResize = (f) => { cbs.push(f); if (st.w) f(st); };
    try { const ro = new ResizeObserver(() => st.fit()); ro.observe(c); S.onDestroy(() => ro.disconnect()); } catch (e) { S.listen(window, 'resize', st.fit); }
    st.fit();
    return st;
  }
  const COLS = 8, ROWS = 14;
  const SHAPES = { I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]], S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]] };
  const BOX = { I: 4, O: 4, T: 3, S: 3, Z: 3, J: 3, L: 3 };
  const KINDS = {
    I: { name: 'terrace', wall: '#f6b9c9', roof: '#b4586c', motifs: ['window', 'door', 'window', 'window'] },
    O: { name: 'cottage', wall: '#ffe3a3', roof: '#c8714a', motifs: ['window', 'window', 'door', 'window'] },
    T: { name: 'townhouse', wall: '#d2c4f5', roof: '#6c5aa9', motifs: ['arch', 'window', 'door', 'window'] },
    S: { name: 'garden', wall: '#a9e2b9', roof: null, motifs: ['garden', 'tree', 'garden', 'garden'] },
    Z: { name: 'orchard', wall: '#c3e6a8', roof: null, motifs: ['tree', 'garden', 'garden', 'tree'] },
    J: { name: 'shops', wall: '#ffcaa8', roof: '#d2623f', motifs: ['window', 'awning', 'door', 'awning'] },
    L: { name: 'bakery', wall: '#badcf6', roof: '#4f7db2', motifs: ['round', 'awning', 'door', 'window'] }
  };
  const SKIES = [
    { dusk: [[61, 58, 122], [183, 127, 176], [255, 196, 156]], night: [[13, 16, 51], [38, 42, 99], [74, 60, 116]] },
    { dusk: [[70, 64, 126], [226, 144, 160], [255, 211, 154]], night: [[15, 18, 54], [43, 45, 104], [85, 65, 111]] },
    { dusk: [[47, 74, 124], [127, 182, 184], [246, 227, 168]], night: [[11, 21, 52], [31, 52, 98], [54, 80, 122]] },
    { dusk: [[58, 53, 118], [201, 122, 160], [255, 185, 160]], night: [[16, 15, 51], [44, 36, 97], [90, 58, 110]] }
  ];
  const LANDMARKS = ['Clock Tower', 'Windmill', 'Lighthouse', 'Observatory', 'Bandstand', 'Ferris Wheel', 'Old Oak', 'Water Tower', 'Bell Tower', 'Hot Air Balloon'];
  const PENTA = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6'];
  const ICON = {
    left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    turn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M19.5 3.5v5h-5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    drop: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 20h12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>'
  };

  (env.games = env.games || []).push({
    id: 'block-party', mode: 'reset', name: 'Block Party', verb: 'stack', family: 'DISTANCE', minutes: 2,
    parents: ['Mental Imagery', 'Memory / Replay / Rumination'],
    cast: ['patch'], poster: { char: 'patch', mood: 'E04' },
    tagline: 'Stack pastel house parts into lit streets and build a town at dusk.',
    why: 'For pictures that won’t leave: shapes fill the same mental space, so replays fade.',
    css: `
.g-block-party .bp-hit { position: absolute; z-index: 15; touch-action: none; cursor: pointer; border-radius: 14px; }
.g-block-party .bp-next { position: absolute; z-index: 22; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 7px 8px 8px; border-radius: 16px;
  background: color-mix(in srgb, var(--ui-surface) 78%, transparent); border: 1px solid var(--ui-line); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
.g-block-party .bp-next span { font: 700 12px/1 var(--font-ui); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ui-muted); }
.g-block-party .bp-next canvas { display: block; }
.g-block-party .bp-streets { position: absolute; z-index: 22; display: flex; align-items: center; justify-content: center; gap: 6px; pointer-events: none; }
.g-block-party .bp-streets i { width: 18px; height: 18px; flex: none; background: rgba(255, 255, 255, 0.22); clip-path: polygon(50% 0, 100% 42%, 100% 100%, 0 100%, 0 42%); transition: background 0.4s ease, transform 0.4s cubic-bezier(.2, 1.6, .4, 1); }
.g-block-party .bp-streets i.on { background: #ffd36b; transform: scale(1.18); filter: drop-shadow(0 0 6px rgba(255, 211, 107, 0.9)); }
.g-block-party .bp-streets b { font: 700 14px/1 var(--font-ui); color: #fff8e8; letter-spacing: 0.02em; margin-left: 4px; white-space: nowrap; text-shadow: 0 1px 6px rgba(0, 0, 0, 0.5); }
.g-block-party.bp-bright .bp-streets i:not(.on) { background: rgba(40, 30, 70, 0.22); }
.g-block-party .bp-controls { position: absolute; z-index: 24; display: flex; gap: 10px; justify-content: center; }
.g-block-party .bp-btn { appearance: none; border: 0; padding: 0; width: var(--bw, 72px); height: 62px; border-radius: 18px; cursor: pointer; touch-action: none; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  background: linear-gradient(180deg, #fff8ea, #f2dcbf); color: #4b2d1a; box-shadow: 0 5px 0 #c99e74, 0 10px 18px rgba(0, 0, 0, 0.3); transition: transform 0.06s ease, box-shadow 0.06s ease; -webkit-user-select: none; user-select: none; }
.g-block-party .bp-btn svg { width: 26px; height: 26px; }
.g-block-party .bp-btn span { font: 700 12px/1 var(--font-ui); letter-spacing: 0.06em; text-transform: uppercase; }
.g-block-party .bp-btn.bp-on { transform: translateY(4px); box-shadow: 0 1px 0 #c99e74, 0 4px 10px rgba(0, 0, 0, 0.3); }
.g-block-party .bp-btn:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.g-block-party .bp-btn.bp-drop { background: linear-gradient(180deg, #ffe7a3, #ffc861); box-shadow: 0 5px 0 #c98f2e, 0 10px 18px rgba(0, 0, 0, 0.3); }
.g-block-party .bp-btn.bp-drop.bp-on { box-shadow: 0 1px 0 #c98f2e, 0 4px 10px rgba(0, 0, 0, 0.3); }
.g-block-party .bp-hat { position: absolute; left: 22%; width: 56%; top: calc(var(--sz) * -0.25); height: calc(var(--sz) * 0.3); pointer-events: none; }
.g-block-party .bp-hat::before { content: ""; position: absolute; left: 12%; right: 12%; top: 0; bottom: 22%; border-radius: 50% 50% 8% 8% / 80% 80% 10% 10%; background: radial-gradient(circle at 35% 30%, #fff3a6, #ffcf3a 45%, #e8a312 100%); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.15); }
.g-block-party .bp-hat::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 30%; border-radius: 40%; background: linear-gradient(180deg, #ffd34d, #d9940e); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.35); }
.g-block-party .bp-hat i { position: absolute; left: 46%; width: 8%; top: 4%; bottom: 30%; background: rgba(255, 255, 255, 0.55); border-radius: 3px; z-index: 1; }
.g-block-party .gk-bubble { max-width: min(232px, calc(100cqw - var(--sz, 64px) - 124px)); }
.g-block-party .bp-balloon { position: absolute; z-index: 18; width: 52px; pointer-events: none; animation: bp-drift 26s linear forwards; }
.g-block-party .bp-balloon b { display: block; width: 46px; height: 54px; margin: 0 auto; border-radius: 50% 50% 46% 46% / 56% 56% 44% 44%; background: repeating-linear-gradient(90deg, #ff9db8 0 9px, #ffe08a 9px 18px, #9fd7ff 18px 27px); box-shadow: inset -6px -8px 12px rgba(0, 0, 0, 0.18); }
.g-block-party .bp-balloon img { display: block; width: 34px; height: 34px; margin: 6px auto 0; object-fit: contain; }
@keyframes bp-drift { from { transform: translateX(-80px) translateY(0); } 50% { transform: translateX(calc(50cqw)) translateY(-14px); } to { transform: translateX(calc(100cqw + 80px)) translateY(4px); } }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      const inten = ctx.intensity;
      const TARGET = [8, 10, 12][inten], LIMIT = [95, 100, 105][inten];
      const BPM0 = [68, 80, 92][inten];
      const visits = K.visits();
      const owned = K.collection().filter(x => LANDMARKS.includes(x));
      const DAY = { sky: K.dailyPick(SKIES, 1), weather: K.dailyPick(['clear', 'petals', 'fireflies', 'snow'], 2), landmark: K.dailyPick(LANDMARKS, 3) };
      const line = (o) => ctx.line(o);
      const dark = () => K.dark();
      el.classList.toggle('bp-bright', !dark());

      /* ---------------- state ---------------- */
      const board = []; for (let r = 0; r < ROWS; r++) board.push(new Array(COLS).fill(null));
      const rand = K.rng((Date.now() % 1000003) ^ (K.daily() * 31));
      let bag = [], cur = null, nextT = null;
      let phase = 'intro', streets = 0, placements = 0, tidy = 0, tidyRun = 0, elapsed = 0, night = 0, nightT = 0, twistDone = false, rooms = 0;
      let lastStep = -1, lockT = -1, lockResets = 0, clearing = null, flashes = [], dropOff = new Array(ROWS).fill(0), lanternEvery = 0;
      const G = { w: 0, H: 0, cs: 36, bx: 0, by: 0, bw: 0, bh: 0, phone: true, nudge: 0 };
      const take = () => { if (!bag.length) bag = K.shuffle(Object.keys(SHAPES), rand); return bag.pop(); };
      const cellsOf = (t, rot) => { let c = SHAPES[t].map(p => p.slice()); if (t === 'O') return c; const n = BOX[t]; for (let i = 0; i < (rot & 3); i++) c = c.map(([x, y]) => [n - 1 - y, x]); return c; };
      const fits = (t, rot, x, y) => cellsOf(t, rot).every(([cx, cy]) => { const X = x + cx, Y = y + cy; return X >= 0 && X < COLS && Y < ROWS && (Y < 0 || !board[Y][X]); });

      /* ---------------- scene ---------------- */
      const SOFT = softwareGfx(), cvOpts = { maxDpr: SOFT ? 1.25 : 2 }, cv = opaqueCanvas(el, cvOpts, S), qual = { acc: 0, n: 0, slow: 0 };
      let inputAt = 0;
      const P = K.particles({ max: 420 });
      let busyUntil = 0;
      const kick = (ms) => { busyUntil = Math.max(busyUntil, performance.now() + (ms || 1500)); };
      const hit = h('div', { class: 'bp-hit', role: 'application', 'aria-label': 'Building plot. Swipe left or right to move, tap to turn, swipe down to drop.' });
      const nextBox = h('div', { class: 'bp-next', 'aria-hidden': 'true' }, h('span', { text: 'Next' }));
      const nextCv = h('canvas'); nextBox.append(nextCv);
      const streetsBar = h('div', { class: 'bp-streets', role: 'status', 'aria-live': 'polite' });
      for (let i = 0; i < TARGET; i++) streetsBar.append(h('i'));
      const streetsTxt = h('b', { text: '0 / ' + TARGET }); streetsBar.append(streetsTxt);
      const controls = h('div', { class: 'bp-controls' });
      const mkBtn = (cls, icon, label, aria) => h('button', { type: 'button', class: 'bp-btn ' + cls, 'aria-label': aria, html: ICON[icon] + '<span>' + label + '</span>' });
      const bLeft = mkBtn('bp-left', 'left', 'Left', 'Move left'), bRight = mkBtn('bp-right', 'right', 'Right', 'Move right'), bTurn = mkBtn('bp-turn', 'turn', 'Turn', 'Turn'), bDrop = mkBtn('bp-drop', 'drop', 'Drop', 'Drop');
      controls.append(bLeft, bTurn, bDrop, bRight);
      el.append(hit, nextBox, streetsBar, controls);
      const patch = K.character('patch', { side: 'right', mood: 'happy', x: 12, y: 76, size: 64 });
      patch.el.append(h('div', { class: 'bp-hat', 'aria-hidden': 'true' }, h('i')));

      /* ---------------- audio ---------------- */
      const music = K.music('lofi');
      music.tempo(BPM0);
      let crickets = null;
      const beatPos = () => {
        if (A.ctx && music.next > 0) { const spb = 60 / music.bpm; return music.beat - (music.next - A.now()) / spb; }
        return performance.now() / 1000 * music.bpm / 60;
      };
      const tick = (col) => { if (A.ctx) A.wood(undefined, 0.09, 0.8 + col * 0.05); };

      /* ---------------- layout ---------------- */
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        const phone = w < 700;
        Object.assign(G, { w, H, phone });
        if (phone) {
          const top = 148, ctrlH = 62, ground = 26;
          const cs = Math.floor(Math.min((w - 40) / COLS, (H - top - ground - 12 - ctrlH - 18) / ROWS));
          G.cs = cs; G.bw = cs * COLS; G.bh = cs * ROWS; G.bx = Math.round((w - G.bw) / 2); G.by = top;
          patch.side('right'); patch.place(12, 74); patch.el.style.setProperty('--sz', '64px');
          Object.assign(nextBox.style, { left: (w - 12 - 76) + 'px', top: '70px' });
          setNext(52);
          Object.assign(streetsBar.style, { left: G.bx + 'px', width: G.bw + 'px', top: (G.by + G.bh + 4) + 'px', height: '22px' });
          const bw = Math.floor((G.bw - 30) / 4);
          controls.style.setProperty('--bw', bw + 'px');
          Object.assign(controls.style, { left: G.bx + 'px', width: G.bw + 'px', top: (G.by + G.bh + ground + 10) + 'px' });
        } else {
          const top = 76, ctrlH = 62, ground = 28;
          const cs = Math.floor(Math.min(48, (H - top - ground - 14 - ctrlH - 22) / ROWS));
          G.cs = cs; G.bw = cs * COLS; G.bh = cs * ROWS; G.bx = Math.round((w - G.bw) / 2); G.by = top;
          patch.side('right'); patch.place(G.bx + G.bw + 44, G.by + G.bh * 0.34); patch.el.style.setProperty('--sz', '104px');
          Object.assign(nextBox.style, { left: (G.bx - 150) + 'px', top: (G.by + 20) + 'px' });
          setNext(84);
          Object.assign(streetsBar.style, { left: G.bx + 'px', width: G.bw + 'px', top: (G.by + G.bh + 4) + 'px', height: '24px' });
          controls.style.setProperty('--bw', '84px');
          Object.assign(controls.style, { left: G.bx + 'px', width: G.bw + 'px', top: (G.by + G.bh + ground + 12) + 'px' });
        }
        Object.assign(hit.style, { left: (G.bx - 6) + 'px', top: (G.by - 6) + 'px', width: (G.bw + 12) + 'px', height: (G.bh + 12) + 'px' });
        SPR.clear();
        buildTown();
        paintBg();
        drawNext();
      }
      function setNext(px) { const d = cv.dpr || 2; nextCv.width = Math.round(px * d); nextCv.height = Math.round(px * 0.62 * d); nextCv.style.width = px + 'px'; nextCv.style.height = Math.round(px * 0.62) + 'px'; }

      /* ---------------- sprites ---------------- */
      const SPR = new Map();
      function mk(w, hh) { const c = document.createElement('canvas'), d = cv.dpr || 2; c.width = Math.max(1, Math.round(w * d)); c.height = Math.max(1, Math.round(hh * d)); const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); return { c, g }; }
      function rr(g, x, y, w, hh, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
      function cellSprite(t, m, lit, lantern) {
        const key = t + m + (lit ? 1 : 0) + (lantern ? 'L' : '');
        let sp = SPR.get(key); if (sp) return sp;
        const s = G.cs, o = mk(s, s), g = o.g, kd = KINDS[t];
        const wall = g.createLinearGradient(0, 0, 0, s); wall.addColorStop(0, shade(kd.wall, 1.06)); wall.addColorStop(1, shade(kd.wall, 0.9));
        rr(g, 0.6, 0.6, s - 1.2, s - 1.2, s * 0.13); g.fillStyle = wall; g.fill();
        g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(s * 0.14, 1.6, s * 0.72, 1.6);
        g.fillStyle = 'rgba(60,30,40,0.14)'; g.fillRect(s * 0.1, s - 4.2, s * 0.8, 2.6);
        const glow = (x, y, r, a) => { const gg = g.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, `rgba(255,214,120,${a})`); gg.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = gg; g.fillRect(x - r, y - r, r * 2, r * 2); };
        const glass = (x, y, w, hh) => { const gl = g.createLinearGradient(x, y, x, y + hh); if (lit) { gl.addColorStop(0, '#fff3bf'); gl.addColorStop(1, '#ffb95a'); } else { gl.addColorStop(0, '#7484b0'); gl.addColorStop(1, '#4a5380'); } return gl; };
        if (m === 'window') {
          const x = s * 0.27, y = s * 0.2, w = s * 0.46, hh = s * 0.44;
          if (lit) glow(s / 2, y + hh / 2, s * 0.55, 0.45);
          rr(g, x - 2, y - 2, w + 4, hh + 4, 3); g.fillStyle = '#fffaf0'; g.fill();
          rr(g, x, y, w, hh, 2); g.fillStyle = glass(x, y, w, hh); g.fill();
          g.fillStyle = '#fffaf0'; g.fillRect(x + w / 2 - 1, y, 2, hh); g.fillRect(x, y + hh / 2 - 1, w, 2);
          if (!lit) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x + 2, y + 2, w * 0.22, 2); }
          g.fillStyle = shade(kd.wall, 0.72); g.fillRect(x - 3, y + hh + 2, w + 6, 3);
        } else if (m === 'door') {
          const dw = s * 0.36, x = (s - dw) / 2, y = s * 0.34, hh = s - y - 3.5;
          if (lit) glow(s / 2, y - 3, s * 0.32, 0.6);
          g.beginPath(); g.moveTo(x, y + hh); g.lineTo(x, y + dw / 2); g.arc(x + dw / 2, y + dw / 2, dw / 2, Math.PI, 0); g.lineTo(x + dw, y + hh); g.closePath();
          g.fillStyle = shade(kd.roof || '#8a6a5a', 0.9); g.fill();
          g.fillStyle = lit ? '#ffd98a' : 'rgba(255,255,255,0.25)'; g.beginPath(); g.arc(x + dw / 2, y + dw / 2, dw * 0.24, 0, K.TAU); g.fill();
          g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(x + dw * 0.78, y + hh * 0.62, 1.4, 0, K.TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(x - 3, s - 4, dw + 6, 2);
          if (lit) { g.fillStyle = '#fff2c4'; g.beginPath(); g.arc(s / 2, y - 4, 2, 0, K.TAU); g.fill(); }
        } else if (m === 'arch') {
          const w = s * 0.34, x = (s - w) / 2, y = s * 0.16, hh = s * 0.56;
          if (lit) glow(s / 2, y + hh / 2, s * 0.55, 0.45);
          g.beginPath(); g.moveTo(x - 2, y + hh + 2); g.lineTo(x - 2, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2 + 2, Math.PI, 0); g.lineTo(x + w + 2, y + hh + 2); g.closePath(); g.fillStyle = '#fffaf0'; g.fill();
          g.beginPath(); g.moveTo(x, y + hh); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + hh); g.closePath(); g.fillStyle = glass(x, y, w, hh); g.fill();
          g.fillStyle = '#fffaf0'; g.fillRect(x + w / 2 - 1, y, 2, hh); g.fillRect(x, y + hh * 0.55, w, 2);
          g.fillStyle = shade(kd.wall, 0.72); g.fillRect(x - 4, y + hh + 2, w + 8, 3);
        } else if (m === 'round') {
          const r = s * 0.23, cx = s / 2, cy = s * 0.46;
          if (lit) glow(cx, cy, s * 0.55, 0.45);
          g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(cx, cy, r + 2.2, 0, K.TAU); g.fill();
          g.fillStyle = glass(cx - r, cy - r, r * 2, r * 2); g.beginPath(); g.arc(cx, cy, r, 0, K.TAU); g.fill();
          g.fillStyle = '#fffaf0'; g.fillRect(cx - 1, cy - r, 2, r * 2); g.fillRect(cx - r, cy - 1, r * 2, 2);
        } else if (m === 'awning') {
          const y0 = s * 0.1, y1 = s * 0.34, n = 5, sw = (s - 6) / n;
          for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? '#fffaf0' : shade(kd.roof, 1.05); g.fillRect(3 + i * sw, y0, sw + 0.5, y1 - y0); g.beginPath(); g.arc(3 + i * sw + sw / 2, y1, sw / 2, 0, Math.PI); g.fill(); }
          const x = s * 0.16, y = s * 0.5, w = s * 0.68, hh = s * 0.32;
          if (lit) glow(s / 2, y + hh / 2, s * 0.5, 0.42);
          rr(g, x - 2, y - 2, w + 4, hh + 4, 2); g.fillStyle = '#fffaf0'; g.fill();
          g.fillStyle = glass(x, y, w, hh); g.fillRect(x, y, w, hh);
          g.fillStyle = '#fffaf0'; g.fillRect(x + w / 3, y, 1.6, hh); g.fillRect(x + w * 2 / 3, y, 1.6, hh);
        } else if (m === 'garden') {
          g.strokeStyle = shade(kd.wall, 0.72); g.lineWidth = 1.2;
          for (let i = 0; i < 6; i++) { const x = s * (0.14 + i * 0.14); g.beginPath(); g.moveTo(x, s * 0.84); g.lineTo(x + 2, s * 0.72); g.stroke(); }
          g.fillStyle = shade(kd.wall, 0.68);
          [[0.32, 0.5, 0.17], [0.46, 0.42, 0.15], [0.58, 0.52, 0.16]].forEach(([x, y, r]) => { g.beginPath(); g.arc(s * x, s * y, s * r, 0, K.TAU); g.fill(); });
          [['#ff9db8', 0.24, 0.72], ['#fff1a6', 0.74, 0.66], ['#ffffff', 0.62, 0.8], ['#ffb98a', 0.82, 0.32]].forEach(([c, x, y]) => { g.fillStyle = c; g.beginPath(); g.arc(s * x, s * y, s * 0.06, 0, K.TAU); g.fill(); });
          if (lit) { [[0.2, 0.3], [0.78, 0.48], [0.5, 0.2]].forEach(([x, y]) => glow(s * x, s * y, s * 0.12, 0.9)); }
        } else if (m === 'tree') {
          g.fillStyle = '#8a5a3c'; g.fillRect(s * 0.46, s * 0.5, s * 0.08, s * 0.34);
          g.fillStyle = shade(kd.wall, 0.62);
          [[0.5, 0.36, 0.22], [0.36, 0.46, 0.15], [0.64, 0.46, 0.15]].forEach(([x, y, r]) => { g.beginPath(); g.arc(s * x, s * y, s * r, 0, K.TAU); g.fill(); });
          g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.arc(s * 0.44, s * 0.28, s * 0.07, 0, K.TAU); g.fill();
          g.fillStyle = '#ff8a8a'; [[0.42, 0.4], [0.58, 0.32], [0.56, 0.5]].forEach(([x, y]) => { g.beginPath(); g.arc(s * x, s * y, s * 0.035, 0, K.TAU); g.fill(); });
          if (lit) { [[0.24, 0.24], [0.8, 0.3]].forEach(([x, y]) => glow(s * x, s * y, s * 0.12, 0.9)); }
        }
        if (lantern) {
          g.strokeStyle = 'rgba(60,40,30,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(s * 0.82, 2); g.lineTo(s * 0.82, s * 0.2); g.stroke();
          glow(s * 0.82, s * 0.3, s * 0.3, 0.85);
          g.fillStyle = '#ff7a45'; rr(g, s * 0.74, s * 0.2, s * 0.16, s * 0.2, 2); g.fill();
          g.fillStyle = '#ffe9a8'; g.fillRect(s * 0.78, s * 0.24, s * 0.08, s * 0.11);
        }
        SPR.set(key, o.c);
        return o.c;
      }
      function roofSprite(t) {
        const key = 'roof' + t; let sp = SPR.get(key); if (sp) return sp;
        const s = G.cs, hh = Math.round(s * 0.46), o = mk(s, hh), g = o.g, kd = KINDS[t];
        if (kd.roof) {
          g.beginPath(); g.moveTo(-0.5, hh); g.lineTo(s / 2, 1.5); g.lineTo(s + 0.5, hh); g.closePath();
          const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, shade(kd.roof, 1.12)); gr.addColorStop(1, shade(kd.roof, 0.88)); g.fillStyle = gr; g.fill();
          g.save(); g.clip(); g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 1; for (let y = 6; y < hh; y += 4.5) { g.beginPath(); g.moveTo(0, y); g.lineTo(s, y); g.stroke(); } g.restore();
          g.strokeStyle = shade(kd.roof, 1.3); g.lineWidth = 1.6; g.beginPath(); g.moveTo(1, hh - 0.5); g.lineTo(s / 2, 2); g.lineTo(s - 1, hh - 0.5); g.stroke();
          g.fillStyle = shade(kd.roof, 0.75); g.fillRect(s * 0.68, hh * 0.18, s * 0.1, hh * 0.5);
        } else {
          g.fillStyle = shade(kd.wall, 0.7);
          [[0.25, 0.8, 0.2], [0.5, 0.62, 0.26], [0.75, 0.8, 0.2]].forEach(([x, y, r]) => { g.beginPath(); g.arc(s * x, hh * y + 2, s * r, 0, K.TAU); g.fill(); });
          g.fillStyle = shade(kd.wall, 0.95); g.beginPath(); g.arc(s * 0.45, hh * 0.55, s * 0.07, 0, K.TAU); g.fill();
        }
        SPR.set(key, o.c);
        return o.c;
      }

      /* ---------------- background: sky, hills and the town that grows ---------------- */
      let BG = null, bgKey = '';
      const TOWN = { slots: [], lamps: [], marks: [] };
      function buildTown() {
        const R = K.rng(K.daily() + 77), w = G.w, H = G.H;
        const litN = (TOWN.slots || []).filter(sl => sl.target >= 1).length;
        TOWN.slots = []; TOWN.lamps = []; TOWN.marks = [];
        const horizon = G.phone ? G.by + G.bh * 0.42 : G.by + G.bh * 0.5;
        G.horizon = horizon;
        const n = TARGET + 4;
        for (let i = 0; i < n; i++) {
          const side = G.phone ? (i % 2 ? 1 : -1) : (i % 2 ? 1 : -1);
          let x0, x1;
          if (G.phone) { const span = w; x0 = 6 + R() * span * 0.5; x1 = Math.min(w - 6, x0 + span * (0.3 + R() * 0.25)); }
          else { if (side < 0) { x0 = 20 + R() * (G.bx - 260); x1 = Math.min(G.bx - 30, x0 + 140 + R() * 120); } else { x0 = G.bx + G.bw + 30 + R() * 140; x1 = Math.min(w - 20, x0 + 140 + R() * 120); } }
          const y = horizon + 18 + (i / n) * (H - horizon - 140) * (G.phone ? 0.75 : 0.85) + R() * 16;
          const houses = [], wins = [];
          let x = x0;
          while (x < x1 - 10) {
            const hw = 12 + R() * 14, hh = 10 + R() * 14;
            houses.push({ x, w: hw, h: hh, c: R() });
            for (let k = 0; k < Math.max(1, Math.floor(hw / 9)); k++) wins.push({ x: x + 3 + k * 8, y: y - hh + 4 + R() * Math.max(1, hh - 10), on: R() });
            x += hw + 2 + R() * 4;
          }
          TOWN.slots.push({ y, houses, wins, lit: 0, target: 0 });
          if (i % 2 === 0) TOWN.lamps.push({ x: x0 + R() * (x1 - x0), y: y + 3 });
        }
        TOWN.slots.sort((a, b) => a.y - b.y);
        TOWN.slots.slice(0, litN).forEach(sl => { sl.target = 1; sl.lit = 1; });
        // landmarks on the hilltops: today's (built in the finale) plus the ones collected on earlier visits
        const spots = G.phone ? [w * 0.12, w * 0.88, w * 0.5, w * 0.3, w * 0.7] : [G.bx - 200, G.bx + G.bw + 210, G.bx - 360, G.bx + G.bw + 370, 90, w - 90];
        owned.filter(x => x !== DAY.landmark).slice(0, spots.length - 1).forEach((name, i) => TOWN.marks.push({ name, x: spots[i + 1], y: horizon - 2, on: 1 }));
        TOWN.today = { name: DAY.landmark, x: spots[0], y: horizon - 2, on: 0 };
      }
      function skyCol(i, nk) { const d = DAY.sky.dusk[i], n = DAY.sky.night[i], b = dark() ? 1 : 1.18; return `rgb(${Math.min(255, Math.round((d[0] + (n[0] - d[0]) * nk) * b))},${Math.min(255, Math.round((d[1] + (n[1] - d[1]) * nk) * b))},${Math.min(255, Math.round((d[2] + (n[2] - d[2]) * nk) * b))})`; }
      function paintBg() {
        if (!G.w) return;
        const nk = Math.round(night * 16) / 16;
        bgKey = nk + (dark() ? 'd' : 'b') + G.w + 'x' + G.H;
        BG = BG && BG.c.width === Math.round(G.w * (cv.dpr || 2)) && BG.c.height === Math.round(G.H * (cv.dpr || 2)) ? BG : mk(G.w, G.H);
        const g = BG.g, w = G.w, H = G.H, hz = G.horizon;
        g.clearRect(0, 0, w, H);
        const sky = g.createLinearGradient(0, 0, 0, hz + 40);
        sky.addColorStop(0, skyCol(0, nk)); sky.addColorStop(0.6, skyCol(1, nk)); sky.addColorStop(1, skyCol(2, nk));
        g.fillStyle = sky; g.fillRect(0, 0, w, hz + 40);
        const D = dark();
        // far hills
        const hill = (y0, amp, f, ph, col) => { g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= w + 10; x += 10) g.lineTo(x, y0 + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.3 + ph * 1.7) * amp * 0.35); g.lineTo(w, H); g.closePath(); g.fillStyle = col; g.fill(); };
        hill(hz - 26, 16, 0.006, 1.2, D ? `rgba(${60 - nk * 26},${48 - nk * 20},${96 - nk * 30},1)` : `rgba(${130 - nk * 50},${110 - nk * 40},${170 - nk * 40},1)`);
        hill(hz + 4, 12, 0.009, 4.1, D ? `rgba(${44 - nk * 20},${38 - nk * 16},${76 - nk * 26},1)` : `rgba(${104 - nk * 44},${92 - nk * 36},${146 - nk * 36},1)`);
        // the town: little houses along the slope, each street a row
        TOWN.slots.forEach((sl, i) => {
          const base = D ? [34 - nk * 10, 30 - nk * 8, 58 - nk * 14] : [86 - nk * 30, 74 - nk * 24, 120 - nk * 30];
          sl.houses.forEach(hs => {
            const k = 0.86 + hs.c * 0.3;
            g.fillStyle = `rgb(${Math.round(base[0] * k)},${Math.round(base[1] * k)},${Math.round(base[2] * k)})`;
            g.fillRect(hs.x, sl.y - hs.h, hs.w, hs.h + 3);
            g.beginPath(); g.moveTo(hs.x - 2, sl.y - hs.h + 1); g.lineTo(hs.x + hs.w / 2, sl.y - hs.h - hs.w * 0.42); g.lineTo(hs.x + hs.w + 2, sl.y - hs.h + 1); g.closePath(); g.fill();
          });
          void i;
        });
        // lower slope in front of the town
        hill(H - 70, 10, 0.012, 2.6, D ? `rgba(${28 - nk * 10},${30 - nk * 10},${54 - nk * 16},1)` : `rgba(${78 - nk * 30},${86 - nk * 30},${120 - nk * 30},1)`);
        // landmarks
        TOWN.marks.forEach(m => drawMark(g, m.name, m.x, m.y, 1, D));
        // the building plot: a translucent panel with chalk dots, scaffold poles and grass
        const x = G.bx, y = G.by, bw = G.bw, bh = G.bh, cs = G.cs;
        rr(g, x - 6, y - 6, bw + 12, bh + 12, 14);
        g.fillStyle = D ? 'rgba(16,12,40,0.42)' : 'rgba(40,30,90,0.2)'; g.fill();
        g.strokeStyle = D ? 'rgba(255,240,220,0.14)' : 'rgba(255,255,255,0.4)'; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = D ? 'rgba(255,245,230,0.2)' : 'rgba(255,255,255,0.45)';
        for (let r = 1; r < ROWS; r++) for (let c = 1; c < COLS; c++) g.fillRect(x + c * cs - 1, y + r * cs - 1, 2, 2);
        const pole = (px) => { const gr = g.createLinearGradient(px - 4, 0, px + 4, 0); gr.addColorStop(0, '#8a5a36'); gr.addColorStop(0.5, '#c58b55'); gr.addColorStop(1, '#7a4c2c'); g.fillStyle = gr; g.fillRect(px - 4, y - 18, 8, bh + 30); };
        pole(x - 12); pole(x + bw + 12);
        g.strokeStyle = 'rgba(170,120,80,0.75)'; g.lineWidth = 3;
        for (let r = 0; r < 4; r++) { const yy = y + bh * (r / 4); g.beginPath(); g.moveTo(x - 12, yy + 8); g.lineTo(x - 2, yy + bh / 4 - 4); g.stroke(); g.beginPath(); g.moveTo(x + bw + 12, yy + 8); g.lineTo(x + bw + 2, yy + bh / 4 - 4); g.stroke(); }
        g.fillStyle = '#c58b55'; g.fillRect(x - 18, y - 20, bw + 36, 7);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x - 18, y - 13, bw + 36, 2);
        const gy = y + bh + 2;
        const grass = g.createLinearGradient(0, gy, 0, gy + 24); grass.addColorStop(0, D ? '#4d8a5a' : '#79c086'); grass.addColorStop(1, D ? '#2c5238' : '#4f8d5c');
        rr(g, x - 20, gy, bw + 40, 24, 8); g.fillStyle = grass; g.fill();
        g.fillStyle = D ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.25)'; g.fillRect(x - 14, gy + 2, bw + 28, 2);
      }
      function drawMark(g, name, x, y, k, D, big) {
        g.save(); g.translate(x, y); g.globalAlpha = k;
        if (big) g.scale(big, big);
        g.fillStyle = big ? '#f6e7ff' : (D ? '#2a2552' : '#5a4f8f');
        const lit = big ? '#ffc861' : '#ffd98a';
        if (name === 'Clock Tower' || name === 'Bell Tower') { g.fillRect(-9, -64, 18, 64); g.beginPath(); g.moveTo(-12, -64); g.lineTo(0, -84); g.lineTo(12, -64); g.fill(); g.fillStyle = lit; g.beginPath(); g.arc(0, -50, 5, 0, K.TAU); g.fill(); }
        else if (name === 'Windmill') { g.beginPath(); g.moveTo(-10, 0); g.lineTo(-6, -46); g.lineTo(6, -46); g.lineTo(10, 0); g.fill(); g.strokeStyle = g.fillStyle; g.lineWidth = 4; g.beginPath(); g.moveTo(-22, -68); g.lineTo(22, -26); g.moveTo(22, -68); g.lineTo(-22, -26); g.stroke(); g.fillStyle = lit; g.fillRect(-2, -24, 4, 6); }
        else if (name === 'Lighthouse') { g.beginPath(); g.moveTo(-9, 0); g.lineTo(-6, -58); g.lineTo(6, -58); g.lineTo(9, 0); g.fill(); g.fillStyle = lit; g.fillRect(-6, -68, 12, 10); }
        else if (name === 'Observatory') { g.fillRect(-16, -22, 32, 22); g.beginPath(); g.arc(0, -22, 16, Math.PI, 0); g.fill(); g.fillStyle = lit; g.fillRect(-2, -38, 4, 12); }
        else if (name === 'Bandstand') { g.fillRect(-18, -6, 36, 6); g.fillRect(-16, -26, 3, 20); g.fillRect(13, -26, 3, 20); g.beginPath(); g.moveTo(-22, -26); g.lineTo(0, -40); g.lineTo(22, -26); g.fill(); g.fillStyle = lit; g.fillRect(-10, -20, 20, 3); }
        else if (name === 'Ferris Wheel') { g.strokeStyle = g.fillStyle; g.lineWidth = 3; g.beginPath(); g.arc(0, -36, 26, 0, K.TAU); g.stroke(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(0, -36); g.lineTo(Math.cos(a) * 26, -36 + Math.sin(a) * 26); g.stroke(); g.fillStyle = lit; g.beginPath(); g.arc(Math.cos(a) * 26, -36 + Math.sin(a) * 26, 2.5, 0, K.TAU); g.fill(); } g.fillStyle = D ? '#2a2552' : '#5a4f8f'; g.beginPath(); g.moveTo(-14, 0); g.lineTo(0, -36); g.lineTo(14, 0); g.fill(); }
        else if (name === 'Old Oak') { g.fillRect(-4, -24, 8, 24); [[0, -40, 20], [-16, -30, 14], [16, -30, 14]].forEach(([a, b, r]) => { g.beginPath(); g.arc(a, b, r, 0, K.TAU); g.fill(); }); }
        else if (name === 'Water Tower') { g.fillRect(-14, -40, 28, 22); g.beginPath(); g.moveTo(-16, -40); g.lineTo(0, -52); g.lineTo(16, -40); g.fill(); g.fillRect(-12, -18, 3, 18); g.fillRect(9, -18, 3, 18); }
        else { g.beginPath(); g.ellipse(0, -52, 18, 21, 0, 0, K.TAU); g.fill(); g.fillRect(-7, -22, 14, 10); g.strokeStyle = g.fillStyle; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-12, -38); g.lineTo(-6, -22); g.moveTo(12, -38); g.lineTo(6, -22); g.stroke(); }
        g.restore();
      }

      /* ---------------- pieces ---------------- */
      function spawn() {
        const t = nextT || take(); nextT = take();
        const x = t === 'I' ? 2 : 3, y = t === 'I' ? -1 : 0;
        const lant = night > 0.5 && (++lanternEvery % 4 === 0) ? Math.floor(rand() * 4) : -1;
        cur = { t, rot: 0, x, y, rx: x, ry: y - 1.2, ang: 0, lantern: lant, born: performance.now() };
        lockT = -1; lockResets = 0;
        drawNext();
        if (!fits(t, 0, x, y)) { makeRoom(); }
        if (A.ctx) A.tone({ type: 'triangle', freq: 520, to: 660, glide: 0.08, dur: 0.12, vol: 0.03 });
      }
      function drawNext() {
        const g = nextCv.getContext('2d'); if (!g) return;
        const d = nextCv.width / (parseFloat(nextCv.style.width) || nextCv.width), W2 = nextCv.width / d, H2 = nextCv.height / d;
        g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W2, H2);
        if (!nextT || !G.cs) return;
        const cells = cellsOf(nextT, 0), xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
        const cw = Math.max(...xs) - Math.min(...xs) + 1, ch = Math.max(...ys) - Math.min(...ys) + 1;
        const s = Math.min(W2 / (cw + 0.4), H2 / (ch + 0.4), G.cs);
        const ox = (W2 - cw * s) / 2 - Math.min(...xs) * s, oy = (H2 - ch * s) / 2 - Math.min(...ys) * s;
        cells.forEach(([cx, cy], i) => g.drawImage(cellSprite(nextT, KINDS[nextT].motifs[i], night > 0.5, false), ox + cx * s, oy + cy * s, s, s));
      }
      function move(dx, quiet) {
        inputAt = performance.now();
        if (!cur || phase !== 'play' || clearing) return false;
        if (fits(cur.t, cur.rot, cur.x + dx, cur.y)) {
          cur.x += dx; tick(cur.x); if (lockT >= 0 && lockResets < 10) { lockT = 0; lockResets++; }
          if (!quiet) G.nudge = dx * 2;
          return true;
        }
        if (A.ctx) A.wood(undefined, 0.05, 0.55);
        G.nudge = dx * 1.2;
        return false;
      }
      function rotate() {
        inputAt = performance.now();
        if (!cur || phase !== 'play' || clearing) return false;
        if (cur.t === 'O') { cur.ang = -0.25; if (A.ctx) A.pop({ vol: 0.07, freq: 640 }); return true; }
        const nr = (cur.rot + 1) & 3;
        for (const [kx, ky] of [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]]) {
          if (fits(cur.t, nr, cur.x + kx, cur.y + ky)) {
            cur.rot = nr; cur.x += kx; cur.y += ky; cur.ang = -Math.PI / 2;
            if (A.ctx) { A.paper({ vol: 0.07, dur: 0.1, freq: 3200 }); A.pop({ vol: 0.06, freq: 700 }); }
            if (lockT >= 0 && lockResets < 10) { lockT = 0; lockResets++; }
            return true;
          }
        }
        if (A.ctx) A.wood(undefined, 0.05, 0.5);
        cur.ang = 0.12;
        return false;
      }
      function landingY() { let y = cur.y; while (fits(cur.t, cur.rot, cur.x, y + 1)) y++; return y; }
      function softDrop() { inputAt = performance.now(); if (!cur || phase !== 'play' || clearing) return; if (fits(cur.t, cur.rot, cur.x, cur.y + 1)) { cur.y++; tick(cur.x + 2); } }
      function hardDrop() {
        inputAt = performance.now();
        if (!cur || phase !== 'play' || clearing) return;
        const ly = landingY(), dist = ly - cur.y;
        cur.y = ly;
        if (A.ctx) A.whoosh({ from: 1400, to: 300, dur: 0.12, vol: 0.08 });
        K.sfx.thud();
        const cells = cellsOf(cur.t, cur.rot);
        kick(); cells.forEach(([cx, cy]) => { if (cur.y + cy < 0) return; P.emit('dust', G.bx + (cur.x + cx + 0.5) * G.cs, G.by + (cur.y + cy + 1) * G.cs, 3, { colors: ['rgba(255,240,220,0.6)'] }); });
        G.shake = Math.min(4, 1.5 + dist * 0.25);
        if (dist >= 8 && rand() < 0.5) patch.face('wow', 700);
        lock();
      }
      function holes() { let n = 0; for (let c = 0; c < COLS; c++) { let seen = false; for (let r = 0; r < ROWS; r++) { if (board[r][c]) seen = true; else if (seen) n++; } } return n; }
      function lock() {
        const cells = cellsOf(cur.t, cur.rot), before = holes(), now = performance.now();
        let over = false;
        cells.forEach(([cx, cy], i) => { const X = cur.x + cx, Y = cur.y + cy; if (Y < 0) { over = true; return; } board[Y][X] = { t: cur.t, m: KINDS[cur.t].motifs[i], lit: night > 0.5, lantern: cur.lantern === i, born: now }; });
        flashes.push({ cells: cells.map(([cx, cy]) => [cur.x + cx, cur.y + cy]), t0: now });
        placements++;
        const neat = holes() <= before;
        if (neat) { tidy++; tidyRun++; } else tidyRun = 0;
        if (A.ctx) A.drum(undefined, 0.16, 1.3 + rand() * 0.2);
        if (tidyRun === 6) { patch.say(line({ Jolly: 'Neat as a pin. The neighbours approve.', Cheeky: 'Six tidy in a row? Show-off. I love it.', Unfiltered: 'Clean stacking. Keep that up.' }), { mood: 'cool', ms: 2400 }); }
        ctx.track('place', { n: placements, neat: neat ? 1 : 0 });
        cur = null;
        const full = []; for (let r = 0; r < ROWS; r++) if (board[r].every(Boolean)) full.push(r);
        if (full.length) startClear(full);
        else if (over) { makeRoom(); spawn(); }
        else spawn();
      }
      function startClear(rows) {
        clearing = { rows, t0: performance.now(), dur: K.reduced() ? 260 : 680 };
        const n = rows.length;
        const base = Math.min(PENTA.length - 4, streets);
        if (A.ctx) for (let i = 0; i < 3 + n; i++) A.chime(A.note(PENTA[Math.min(PENTA.length - 1, base + i)]), { when: A.now() + i * 0.07, vol: 0.08, dur: 1.6 });
        K.sfx.chime(base);
        rows.forEach(r => { for (let c = 0; c < COLS; c++) { const cell = board[r][c]; if (cell) cell.lit = true; } });
        patch.face(n >= 2 ? 'E87' : 'E04', 1600);
        patch.react('bounce');
      }
      function finishClear() {
        const rows = clearing.rows.slice().sort((a, b) => a - b), n = rows.length;
        // sparkles fly from the finished street up to the town on the hill
        kick(2200); rows.forEach(r => { for (let c = 0; c < COLS; c++) P.emit('mote', G.bx + (c + 0.5) * G.cs, G.by + (r + 0.5) * G.cs, 2, { colors: ['#ffe9a8', '#fff6d8', '#ffd36b'], angle: -Math.PI / 2, spread: 1.2, speed: [60, 160] }); });
        const off = new Array(ROWS).fill(0);
        for (let r = 0; r < ROWS; r++) off[r] = rows.filter(x => x > r).length;
        rows.forEach(r => board.splice(r, 1));
        for (let i = 0; i < n; i++) board.unshift(new Array(COLS).fill(null));
        // rows that fell are drawn from their old height and settle
        dropOff = new Array(ROWS).fill(0);
        for (let r = 0; r < ROWS; r++) { const from = r - n; if (from >= 0 && off[from]) dropOff[r] = -off[from] * G.cs; }
        for (let i = 0; i < n; i++) lightStreet();
        const was = streets; streets += n;
        updateStreets();
        ctx.track('street', { n: streets, at: n });
        clearing = null;
        music.tempo(Math.min(BPM0 + 14, music.bpm + 1.3 * n));
        if (was === 0) patch.say(line({ Jolly: 'First street done! Hear that? A happy neighbourhood.', Cheeky: 'A whole street! The town council is thrilled. That’s me.', Unfiltered: 'One street built. Nice. Keep stacking.' }), { ms: 2800 });
        else if (n >= 3) patch.say(line({ Jolly: 'Three streets at once! Town planners are weeping.', Cheeky: 'Triple! Are you secretly an architect?', Unfiltered: 'Three in one go. Unreal.' }), { ms: 2600 });
        else if (n === 2) patch.say(line({ Jolly: 'Two at once! You’re a natural.', Cheeky: 'Double street. Show-off. Do it again.', Unfiltered: 'Two streets. Clean.' }), { ms: 2400 });
        if (!twistDone && (streets >= Math.ceil(TARGET / 2))) nightfall();
        if (streets >= TARGET) { K.later(finale, 450); return; }
        spawn();
      }
      function lightStreet() { const sl = TOWN.slots.find(s => s.target < 1); if (sl) sl.target = 1; }
      function updateStreets() {
        Array.from(streetsBar.querySelectorAll('i')).forEach((it, i) => it.classList.toggle('on', i < streets));
        streetsTxt.textContent = Math.min(streets, TARGET) + ' / ' + TARGET;
        streetsBar.setAttribute('aria-label', streets + ' of ' + TARGET + ' streets built');
      }
      function makeRoom() {
        rooms++;
        let removed = 0;
        for (let r = 0; r < 6; r++) for (let c = 0; c < COLS; c++) if (board[r][c]) {
          const cell = board[r][c]; board[r][c] = null; removed++;
          balloons.push({ x: G.bx + (c + 0.5) * G.cs, y: G.by + (r + 0.5) * G.cs, t: cell.t, m: cell.m, vy: -40 - rand() * 40, vx: (rand() - 0.5) * 30, a: 1, ph: rand() * 6, d: rand() * 0.4 });
        }
        if (A.ctx) for (let i = 0; i < 5; i++) A.tone({ when: A.now() + i * 0.06, type: 'sine', freq: 400 + i * 120, to: 900 + i * 160, glide: 0.25, dur: 0.3, vol: 0.04 });
        patch.say(line({ Jolly: 'Bit crowded up top. Let’s float a few away!', Cheeky: 'Penthouse overflow. Balloons, deploy!', Unfiltered: 'Too full. Clearing the top. Carry on.' }), { mood: 'idea', ms: 2600 });
        K.guide({ id: 'room', g: 'tap', target: bDrop, label: 'ROOM MADE: KEEP GOING', delay: 600 });
        ctx.track('room', { n: rooms, cells: removed });
      }
      const balloons = [];

      /* ---------------- nightfall twist ---------------- */
      function nightfall() {
        twistDone = true; nightT = 1;
        if (A.ctx) { A.pad([A.note('D3'), A.note('A3'), A.note('C4'), A.note('F4')], { dur: 4, vol: 0.12, attack: 1 }); }
        if (!crickets) { crickets = K.ambience('prairie'); if (crickets && crickets.level) crickets.level(0.12, 3); }
        patch.say(line({ Jolly: 'Sun’s going down. Lights on, everyone!', Cheeky: 'Night shift! Every window glows now. Fancy.', Unfiltered: 'It’s dark. Lights on. Keep building.' }), { mood: 'wow', ms: 3000 });
        let row = ROWS - 1;
        const lightUp = () => { if (row < 0) return; for (let c = 0; c < COLS; c++) if (board[row][c]) board[row][c].lit = true; row--; K.later(lightUp, 90); };
        K.later(lightUp, 600);
        K.guide({ id: 'night', g: 'tap', target: bDrop, label: 'LIGHTS ON: KEEP BUILDING', delay: 1200 });
        ctx.track('twist', { streets });
      }

      /* ---------------- input ---------------- */
      let guideStep = 0;
      function guideNext() {
        if (phase !== 'play') return;
        if (guideStep === 0) K.guide({ id: 'g-move', g: 'choose', target: () => [bLeft, bRight], label: 'SLIDE IT LEFT OR RIGHT', delay: 900 });
        else if (guideStep === 1) K.guide({ id: 'g-turn', g: 'tap', target: bTurn, label: 'TAP TO TURN', delay: 500 });
        else if (guideStep === 2) K.guide({ id: 'g-drop', g: 'tap', target: bDrop, label: 'DROP IT IN', delay: 500 });
        else if (guideStep === 3) K.guide({ id: 'g-swipe', g: 'sweep', d: Math.round(G.cs * 1.6), target: () => ({ x: G.bx + G.bw / 2, y: G.by + G.bh * 0.3 }), label: 'OR SWIPE THE PLOT', delay: 1400 });
        else if (guideStep === 4) K.guide({ id: 'g-fill', g: 'tap', target: () => ({ x: G.bx + G.bw / 2, y: G.by + G.bh - G.cs * 0.5 }), label: 'FILL A ROW: A STREET', delay: 1400 });
      }
      function stepDone(i) { if (guideStep === i) { guideStep++; guideNext(); } }
      function press(btn, fn, repeat) {
        let rep = 0, held = false, downAt = 0;
        const go = () => { btn.classList.add('bp-on'); fn(); };
        K.press(btn, {
          down: () => { held = true; downAt = performance.now(); go(); if (repeat) { S.cancel(rep); rep = K.later(function again() { if (!held) return; fn(true); rep = K.later(again, 62); }, 170); } },
          up: () => { held = false; btn.classList.remove('bp-on'); S.cancel(rep); }
        });
        S.listen(btn, 'click', () => { if (performance.now() - downAt < 500) return; go(); K.later(() => btn.classList.remove('bp-on'), 120); });
      }
      press(bLeft, (q) => { if (move(-1, q)) stepDone(0); }, true);
      press(bRight, (q) => { if (move(1, q)) stepDone(0); }, true);
      press(bTurn, () => { rotate(); stepDone(1); });
      press(bDrop, () => { hardDrop(); stepDone(2); });
      let sw = null;
      K.press(hit, {
        down: (p) => {
          sw = { x0: p.x, y0: p.y, t0: performance.now(), col: 0, moved: false, dropped: false };
          kick(); P.emit('spark', G.bx - 6 + p.x, G.by - 6 + p.y, 4, { colors: ['#fff6d8', '#ffe08a'], speed: [30, 80] });
          if (A.ctx) A.click({ vol: 0.05 });
          A.sync && A.sync('touch', performance.now());
        },
        move: (p) => {
          if (!sw) return;
          const dx = p.x - sw.x0, dy = p.y - sw.y0, cols = Math.trunc(dx / (G.cs * 0.85));
          while (sw.col < cols) { move(1); sw.col++; sw.moved = true; }
          while (sw.col > cols) { move(-1); sw.col--; sw.moved = true; }
          if (!sw.dropped && dy > G.cs * 1.8 && dy > Math.abs(dx) * 1.3) { sw.dropped = true; hardDrop(); stepDone(3); }
        },
        up: (p) => {
          if (!sw) return;
          const d = Math.hypot(p.x - sw.x0, p.y - sw.y0), dt = performance.now() - sw.t0;
          if (!sw.moved && !sw.dropped && d < 14 && dt < 320) { rotate(); stepDone(3); }
          else if (sw.moved) stepDone(3);
          sw = null;
        }
      });
      K.onKey(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyX', 'KeyZ'], (e) => {
        if (phase !== 'play') return;
        if (e.target && e.target.closest && e.target.closest('.bp-btn') && (e.code === 'Space')) return;
        e.preventDefault(); A.unlock();
        if (e.code === 'ArrowLeft') move(-1); else if (e.code === 'ArrowRight') move(1);
        else if (e.code === 'ArrowUp' || e.code === 'KeyX' || e.code === 'KeyZ') rotate();
        else if (e.code === 'ArrowDown') softDrop(); else if (e.code === 'Space') hardDrop();
        if (guideStep < 4) { guideStep = 4; guideNext(); }
      });

      /* ---------------- loop ---------------- */
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !BG) return;
        if (phase === 'play' && !clearing) {
          elapsed += dt;
          if (!twistDone && elapsed >= LIMIT / 2) nightfall();
          if (elapsed >= LIMIT && !clearing) { finale(); }
          // gravity: one row per beat of the music
          const b = Math.floor(beatPos());
          if (lastStep < 0 || b - lastStep > 3 || b < lastStep) lastStep = b;
          if (cur && b > lastStep) {
            lastStep = b;
            if (fits(cur.t, cur.rot, cur.x, cur.y + 1)) { cur.y++; lockT = -1; }
            else if (lockT < 0) lockT = 0;
          }
          if (cur && lockT >= 0) { lockT += dt; if (lockT > [0.9, 0.6, 0.5][inten]) lock(); }
        }
        if (clearing && performance.now() - clearing.t0 >= clearing.dur) finishClear();
        night += (nightT - night) * Math.min(1, dt * 0.35);
        const key = Math.round(night * 16) / 16 + (dark() ? 'd' : 'b') + G.w + 'x' + G.H;
        if (key !== bgKey) paintBg();
        // quality guard: if frames run slow, draw the town with fewer pixels (2 -> 1.5 -> 1.25 -> 1)
        if (dt < 0.25) { qual.acc += dt; qual.n++; if (dt > 0.03) qual.slow++; }
        if (qual.n >= 90) { if ((qual.acc / qual.n > 0.022 || qual.slow > 12) && (cv.dpr || 1) > 1.01) { cvOpts.maxDpr = cv.dpr > 1.6 ? 1.5 : cv.dpr > 1.3 ? 1.25 : 1; cv.fit(); } qual.acc = qual.n = qual.slow = 0; }
        // while the piece rests between beats only the slow sky moves: paint every other frame (input wakes it at once)
        // on a slow machine: every frame only right after the player moves a piece, every other frame the rest of the time
        const lite = SOFT || cvOpts.maxDpr < 2;
        const still = lite ? performance.now() - inputAt > 260 : phase === 'play' && !clearing && performance.now() > busyUntil && !flashes.length && !balloons.length && !sparks.length && !fw.length && G.nudge < 0.05 && (G.shake || 0) < 0.2
          && (!cur || (Math.abs(cur.rx - cur.x) < 0.004 && Math.abs(cur.ry - cur.y) < 0.004 && Math.abs(cur.ang) < 0.004 && performance.now() - cur.born > 300))
          && !dropOff.some(v => v !== 0) && !TOWN.slots.some(sl => Math.abs(sl.target - sl.lit) > 0.004);
        accDt += dt;
        if (still && (half ^= 1)) return;
        // under the title card (a blurred overlay) and behind the results panel the town holds still, so the browser can
        // reuse its blur instead of recomputing it every frame
        if ((phase === 'intro' && drawn > 1) || (finished && (++finTick & 1))) return;
        draw(g, Math.min(0.1, accDt), t); accDt = 0; drawn++;
      });
      let half = 0, accDt = 0, drawn = 0, finTick = 0;

      /* ---------------- drawing ---------------- */
      const stars = (() => { const R = K.rng(K.daily() + 9), out = []; for (let i = 0; i < 150; i++) out.push({ x: R(), y: R() * R(), ph: R() * 6, s: R() < 0.2 ? 1.8 : 1.1 }); return out; })();
      let fw = []; const sparks = [];
      function draw(g, dt, t) {
        const w = G.w, H = G.H, cs = G.cs;
        G.nudge *= Math.pow(0.0005, dt); G.shake = (G.shake || 0) * Math.pow(0.002, dt);
        const sx = K.reduced() ? 0 : (Math.random() - 0.5) * (G.shake || 0), sy = K.reduced() ? 0 : (Math.random() - 0.5) * (G.shake || 0);
        g.drawImage(BG.c, 0, 0, w, H); // the backdrop is opaque, so no clear is needed
        // stars and the moon after dusk; the sun sinks as the session goes on
        const nk = night;
        if (nk > 0.05) { g.fillStyle = '#fff'; for (const s of stars) { g.globalAlpha = nk * (0.4 + 0.4 * Math.sin(t * 1.4 + s.ph)); g.fillRect(s.x * w, s.y * G.horizon * 0.9, s.s, s.s); } g.globalAlpha = 1; }
        const sunK = Math.min(1, elapsed / LIMIT), sunX = w * (G.phone ? 0.8 : 0.78), sunY = G.horizon - 30 + sunK * 60;
        if (nk < 0.95) { const sg = g.createRadialGradient(sunX, sunY, 4, sunX, sunY, 70); sg.addColorStop(0, `rgba(255,214,150,${0.9 * (1 - nk)})`); sg.addColorStop(0.3, `rgba(255,170,120,${0.35 * (1 - nk)})`); sg.addColorStop(1, 'rgba(255,170,120,0)'); g.fillStyle = sg; g.fillRect(sunX - 70, sunY - 70, 140, 140); }
        if (nk > 0.2) { const mx = w * (G.phone ? 0.6 : 0.2), my = G.phone ? 104 - nk * 6 : G.horizon * 0.42 - nk * 20; g.globalAlpha = nk; g.fillStyle = '#fff6dc'; g.beginPath(); g.arc(mx, my, 11, 0, K.TAU); g.fill(); g.fillStyle = skyCol(0, 1); g.beginPath(); g.arc(mx + 5, my - 3, 10, 0, K.TAU); g.fill(); g.globalAlpha = 1; }
        // town windows (built streets glow, the rest wake up at night)
        g.beginPath();
        TOWN.slots.forEach(sl => { sl.lit += (sl.target - sl.lit) * Math.min(1, dt * 1.6); const lim = Math.max(sl.lit, nk * 0.25); sl.wins.forEach(wi => { if (wi.on < lim) g.rect(wi.x, wi.y, 3, 4); }); });
        g.fillStyle = '#ffd98a'; g.globalAlpha = 0.95; g.fill(); g.globalAlpha = 1;
        const lampK = Math.max(nk, fin.lamps);
        if (lampK > 0.05) TOWN.lamps.forEach(l => { const gg = g.createRadialGradient(l.x, l.y - 9, 0, l.x, l.y - 9, 12); gg.addColorStop(0, `rgba(255,220,140,${0.7 * lampK})`); gg.addColorStop(1, 'rgba(255,220,140,0)'); g.fillStyle = gg; g.fillRect(l.x - 12, l.y - 21, 24, 24); g.fillStyle = 'rgba(30,24,50,0.9)'; g.fillRect(l.x - 0.75, l.y - 8, 1.5, 9); });
        // the plot
        g.save(); g.translate(sx + G.nudge * 0.3, sy);
        for (let r = 0; r < ROWS; r++) {
          dropOff[r] *= Math.pow(0.0001, dt); if (Math.abs(dropOff[r]) < 0.3) dropOff[r] = 0;
          for (let c = 0; c < COLS; c++) {
            const cell = board[r][c]; if (!cell) continue;
            let x = G.bx + c * cs, y = G.by + r * cs + dropOff[r], a = 1, sc = 1;
            if (clearing && clearing.rows.includes(r)) {
              const k = (performance.now() - clearing.t0) / clearing.dur;
              const lift = Math.max(0, (k - 0.45) / 0.55);
              y -= lift * cs * 0.8; a = 1 - lift; sc = 1 + Math.sin(Math.min(1, k * 2) * Math.PI) * 0.06;
            }
            g.globalAlpha = a;
            if (sc !== 1) g.drawImage(cellSprite(cell.t, cell.m, cell.lit, cell.lantern), x - cs * (sc - 1) / 2, y - cs * (sc - 1) / 2, cs * sc, cs * sc);
            else g.drawImage(cellSprite(cell.t, cell.m, cell.lit, cell.lantern), x, y, cs, cs);
            if ((r === 0 || !board[r - 1][c]) && a > 0.05) { const rs = roofSprite(cell.t), rh = Math.round(cs * 0.46); g.drawImage(rs, x, y - rh + 1, cs, rh); }
          }
        }
        g.globalAlpha = 1;
        if (clearing) {
          const k = (performance.now() - clearing.t0) / clearing.dur;
          clearing.rows.forEach(r => { const y = G.by + r * cs, gx = G.bx + G.bw * Math.min(1, k * 1.6); const gg = g.createLinearGradient(gx - 80, 0, gx, 0); gg.addColorStop(0, 'rgba(255,230,160,0)'); gg.addColorStop(1, `rgba(255,236,170,${0.55 * (1 - k)})`); g.fillStyle = gg; g.fillRect(G.bx, y, Math.min(G.bw, gx - G.bx), cs); });
        }
        // lock flash
        flashes = flashes.filter(f => performance.now() - f.t0 < 220);
        flashes.forEach(f => { const k = 1 - (performance.now() - f.t0) / 220; g.globalAlpha = 0.45 * k; g.fillStyle = '#fff'; f.cells.forEach(([c, r]) => { if (r >= 0) g.fillRect(G.bx + c * cs + 1, G.by + r * cs + 1, cs - 2, cs - 2); }); });
        g.globalAlpha = 1;
        // ghost (chalk outline) and the falling piece
        if (cur && phase === 'play') {
          const ly = landingY(), cells = cellsOf(cur.t, cur.rot);
          if (ly > cur.y) { g.setLineDash([4, 4]); g.strokeStyle = dark() ? 'rgba(255,248,230,0.55)' : 'rgba(255,255,255,0.85)'; g.lineWidth = 1.6; cells.forEach(([cx, cy]) => { if (ly + cy >= 0) g.strokeRect(G.bx + (cur.x + cx) * cs + 3, G.by + (ly + cy) * cs + 3, cs - 6, cs - 6); }); g.setLineDash([]); }
          const ez = Math.min(1, dt * 24);
          cur.rx += (cur.x - cur.rx) * ez; cur.ry += (cur.y - cur.ry) * Math.min(1, dt * 14); cur.ang += (0 - cur.ang) * Math.min(1, dt * 20);
          const n = BOX[cur.t], pcx = G.bx + (cur.rx + n / 2) * cs, pcy = G.by + (cur.ry + n / 2) * cs;
          g.save(); g.translate(pcx, pcy); g.rotate(cur.ang);
          const lp = Math.min(1, (performance.now() - cur.born) / 260);
          cells.forEach(([cx, cy], i) => {
            const x = (cx - n / 2) * cs, y = (cy - n / 2) * cs;
            if (cur.ry + cy < -0.6) return;
            g.globalAlpha = lp; g.drawImage(cellSprite(cur.t, KINDS[cur.t].motifs[i], night > 0.5, cur.lantern === i), x, y, cs, cs);
          });
          g.globalAlpha = 1;
          g.restore();
        }
        g.restore();
        if (fin.bunt > 0.01) drawBunting(g, t);
        if (fin.mark) {
          const m = fin.mark, y = m.y - (1 - m.k) * (m.y - G.by + 20);
          if (m.rope > 0.01) { const ry = G.by - 14 + (y - m.top - G.by + 14) * m.rope; g.strokeStyle = 'rgba(60,40,30,0.85)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(m.x, G.by - 14); g.lineTo(m.x, ry); g.stroke(); }
          const gg = g.createRadialGradient(m.x, y - m.top * 0.5, 4, m.x, y - m.top * 0.5, m.top * 1.1); gg.addColorStop(0, `rgba(255,214,140,${0.45 * m.k})`); gg.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = gg; g.fillRect(m.x - m.top * 1.1, y - m.top * 1.6, m.top * 2.2, m.top * 2.2);
          drawMark(g, DAY.landmark, m.x, y, 1, dark(), m.s);
        }
        // balloons carrying spare rooms away
        for (let i = balloons.length - 1; i >= 0; i--) {
          const b = balloons[i]; if (b.d > 0) { b.d -= dt; continue; }
          b.y += b.vy * dt; b.x += b.vx * dt + Math.sin(t * 2 + b.ph) * 0.4; b.a -= dt * 0.28;
          if (b.a <= 0 || b.y < -40) { balloons.splice(i, 1); continue; }
          g.globalAlpha = Math.max(0, b.a);
          g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(b.x, b.y - cs * 0.4); g.lineTo(b.x, b.y - cs * 0.9); g.stroke();
          g.fillStyle = ['#ff9db8', '#ffe08a', '#9fd7ff', '#c8b6ff'][Math.floor(b.ph) % 4]; g.beginPath(); g.ellipse(b.x, b.y - cs * 1.1, cs * 0.22, cs * 0.28, 0, 0, K.TAU); g.fill();
          g.drawImage(cellSprite(b.t, b.m, night > 0.5, false), b.x - cs * 0.3, b.y - cs * 0.3, cs * 0.6, cs * 0.6);
          g.globalAlpha = 1;
        }
        // weather
        if (DAY.weather === 'petals' && Math.random() < dt * 3) P.emit('petal', Math.random() * w, -8, 1, { angle: Math.PI / 2, spread: 0.6, speed: [20, 50] });
        if (DAY.weather === 'snow' && Math.random() < dt * 8) P.emit('snow', Math.random() * w, -6, 1, { angle: Math.PI / 2, spread: 0.4, speed: [12, 30], size: [0.8, 1.8] });
        if ((DAY.weather === 'fireflies' || nk > 0.6) && Math.random() < dt * (DAY.weather === 'fireflies' ? 2.5 : 0.8)) P.emit('mote', Math.random() * w, G.horizon + Math.random() * (H - G.horizon) * 0.6, 1, { colors: ['#e9ff9a', '#fff3a0'] });
        // fireworks (finale)
        for (let i = fw.length - 1; i >= 0; i--) {
          const f = fw[i], k = (t - f.t0) / f.rise;
          if (k < 0) continue;
          if (k < 1) { const x = f.sx + (f.x - f.sx) * k, y = f.sy + (f.y - f.sy) * (1 - Math.pow(1 - k, 2)); g.fillStyle = '#fff6d0'; g.beginPath(); g.arc(x, y, 2.2, 0, K.TAU); g.fill(); if (Math.random() < 0.7) P.emit('ember', x, y + 3, 1); }
          else {
            const n = K.reduced() ? 24 : 64;
            for (let j = 0; j < n; j++) { const a = (j / n) * K.TAU + rand() * 0.2, sp = 70 + rand() * 150; sparks.push({ x: f.x, y: f.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.1 + rand() * 0.7, age: 0, c: rand() < 0.25 ? '#fff6d0' : f.c }); }
            if (A.ctx) { A.noise({ filter: 'lowpass', freq: 900, dur: 0.35, vol: 0.1 }); A.chime(A.note(PENTA[(i * 3 + 5) % PENTA.length]), { vol: 0.06, dur: 1.4 }); }
            fw.splice(i, 1);
          }
        }
        if (sparks.length) {
          g.save(); g.globalCompositeOperation = 'lighter';
          for (let i = sparks.length - 1; i >= 0; i--) {
            const q = sparks[i]; q.age += dt; if (q.age >= q.life) { sparks.splice(i, 1); continue; }
            const dr = Math.pow(0.35, dt); q.vx *= dr; q.vy = q.vy * dr + 60 * dt; q.x += q.vx * dt; q.y += q.vy * dt;
            const k = 1 - q.age / q.life; g.globalAlpha = k; g.fillStyle = q.c; g.fillRect(q.x - 1.4, q.y - 1.4, 2.8, 2.8);
            g.globalAlpha = k * 0.25; g.fillRect(q.x - 3.5, q.y - 3.5, 7, 7);
          }
          g.restore(); g.globalAlpha = 1;
        }
        P.update(dt); P.draw(g);
      }

      /* ---------------- finale ---------------- */
      const fin = { lamps: 0, bunt: 0, mark: null, posts: [] };
      function drawBunting(g, t) {
        const cs = G.cs, cols = ['#ff9db8', '#ffe08a', '#9fd7ff', '#c8b6ff', '#a8f0c0', '#ffb98a'];
        for (let i = 0; i + 1 < fin.posts.length; i++) {
          const a = fin.posts[i], b = fin.posts[i + 1], sag = cs * 0.55, n = Math.max(3, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / (cs * 0.42)));
          const pt = (k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k + Math.sin(k * Math.PI) * sag });
          const vis = Math.min(1, fin.bunt * (fin.posts.length - 1) - i); if (vis <= 0) continue;
          g.strokeStyle = 'rgba(255,248,230,0.85)'; g.lineWidth = 1.2; g.beginPath();
          for (let k = 0; k <= 20; k++) { const p = pt(k / 20 * vis); if (k) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y); }
          g.stroke();
          for (let k = 1; k < n; k++) {
            const u = k / n; if (u > vis) break;
            const p = pt(u), fl = Math.sin(t * 5 + k + i) * 2;
            g.fillStyle = cols[(k + i) % cols.length];
            g.beginPath(); g.moveTo(p.x - cs * 0.15, p.y); g.lineTo(p.x + cs * 0.15, p.y); g.lineTo(p.x + fl * 0.5, p.y + cs * 0.32); g.closePath(); g.fill();
          }
        }
      }
      let finished = false;
      async function finale() {
        if (phase !== 'play') return;
        phase = 'end';
        cur = null;
        K.guide(null);
        controls.style.transition = 'opacity 0.6s ease'; controls.style.opacity = '0.35';
        nextBox.style.transition = 'opacity 0.6s ease'; nextBox.style.opacity = '0';
        nightT = 1;
        patch.base('E87');
        patch.say(line({ Jolly: 'Look at it. You built a whole town. Lights on!', Cheeky: 'Mayor Patch declares this town officially gorgeous.', Unfiltered: 'That’s your town. Light it up.' }), { ms: 3600 });
        // every house on the plot lights up, window by window
        const cells = []; for (let r = ROWS - 1; r >= 0; r--) for (let c = 0; c < COLS; c++) if (board[r][c] && !board[r][c].lit) cells.push(board[r][c]);
        cells.forEach((cell, i) => K.later(() => { cell.lit = true; if (A.ctx && i % 2 === 0) A.chime(A.note(PENTA[(i / 2 + 3) % PENTA.length]) * 2, { vol: 0.025, dur: 0.8 }); }, 60 * i));
        await K.sleep(Math.min(1600, 60 * cells.length + 300));
        // the town on the hill: every street, then the street lamps
        TOWN.slots.forEach((sl, i) => K.later(() => { sl.target = 1; }, i * 120));
        const tops = []; for (let c = 0; c < COLS; c++) { let r = 0; while (r < ROWS && !board[r][c]) r++; tops.push(r); }
        const postCols = [0, 2, 5, 7].filter((c, i, a) => a.indexOf(c) === i);
        fin.posts = postCols.map(c => ({ x: G.bx + (c + 0.5) * G.cs, y: G.by + Math.max(1, tops[c]) * G.cs - G.cs * 0.75 }));
        if (A.ctx) for (let i = 0; i < 6; i++) A.pluck(A.note(PENTA[(i * 2 + 4) % PENTA.length]), { when: A.now() + i * 0.09, vol: 0.12, damp: 0.995 });
        const lampA = K.anim(K.reduced() ? 300 : 1400, (k) => { fin.lamps = k; fin.bunt = k; });
        await lampA;
        // today's landmark is lowered onto the top of the town by the crane
        const mc = (tops[3] + tops[4]) / 2 < ROWS ? 3.5 : 3.5, topRow = Math.min(tops[3], tops[4]);
        const ms = G.phone ? 1.3 : 1.6;
        fin.mark = { x: G.bx + (mc + 0.5) * G.cs, y: G.by + topRow * G.cs - 2, s: ms, top: 80 * ms, k: 0, rope: 1 };
        if (A.ctx) A.tone({ type: 'triangle', freq: 330, to: 220, glide: 0.9, dur: 1, vol: 0.05 });
        await K.anim(K.reduced() ? 200 : 1100, (k) => { fin.mark.k = K.ease.outCubic(k); });
        K.sfx.thud(); K.sfx.great(); G.shake = 3;
        K.anim(700, (k) => { fin.mark.rope = 1 - k; });
        P.emit('star', fin.mark.x, fin.mark.y - fin.mark.top * 0.5, 18, { colors: ['#fff6d8', '#ffe08a'], speed: [60, 160] });

        // fireworks from the rooftops
        const roofs = [];
        for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (board[r][c]) { roofs.push({ x: G.bx + (c + 0.5) * G.cs, y: G.by + r * G.cs }); break; }
        if (!roofs.length) roofs.push({ x: G.bx + G.bw / 2, y: G.by + G.bh });
        TOWN.slots.slice(0, 4).forEach(sl => { const hs = sl.houses[Math.floor(sl.houses.length / 2)]; if (hs) roofs.push({ x: hs.x + hs.w / 2, y: sl.y - hs.h }); });
        const cols = ['#ff9db8', '#ffe08a', '#9fd7ff', '#c8b6ff', '#a8f0c0', '#ffb98a'];
        const nfw = [7, 9, 12][inten];
        const now = performance.now() / 1000;
        const skyTop = 80, skyBot = Math.max(skyTop + 60, G.by + Math.min(...tops) * G.cs - G.cs * 2.2);
        for (let i = 0; i < nfw; i++) { const s0 = roofs[i % roofs.length]; fw.push({ sx: s0.x, sy: s0.y, x: K.clamp(G.bx + G.bw * (0.15 + 0.7 * ((i * 0.61803) % 1)), 40, G.w - 40), y: skyTop + rand() * (skyBot - skyTop), c: cols[i % cols.length], t0: now + i * 0.42, rise: 0.8 }); }
        if (A.ctx) A.pad([A.note('C4'), A.note('E4'), A.note('G4'), A.note('B4')], { dur: 5, vol: 0.14, attack: 0.6 });
        await K.sleep(K.reduced() ? 900 : 1100 + nfw * 450);
        const tidyK = placements ? tidy / placements : 1;
        const score = 0.55 * Math.min(1, streets / TARGET) + 0.45 * tidyK;
        const badges = [];
        const pb = K.best('streets', streets, 'higher');
        if (pb.isNew) badges.push('New best: ' + streets + ' streets');
        else if (pb.first && streets) badges.push('First town: ' + streets + ' streets');
        const tier = K.tier(score);
        if (tier) badges.push(tier + ' builder');
        const col = K.collect(DAY.landmark);
        badges.push((col.isNew ? 'Collected: ' : 'Built again: ') + DAY.landmark + ' (' + col.items.filter(x => LANDMARKS.includes(x)).length + ' of ' + LANDMARKS.length + ')');
        if (tidyK >= 0.9 && placements >= 8) badges.push('Tidy town: ' + Math.round(tidyK * 100) + '%');
        const secs = Math.max(10, Math.round(elapsed / 10) * 10);
        ctx.track('done', { streets, tidy: Math.round(tidyK * 100), secs: Math.round(elapsed), rooms });
        finished = true;
        ctx.finish({
          title: 'The town lights up', mood: 'E87',
          lines: [streets + (streets === 1 ? ' street' : ' streets') + ' built', 'About ' + secs + ' seconds of pure focus', Math.round(tidyK * 100) + '% of pieces left no gaps'],
          share: streets + ' streets built. A whole town lit up.',
          badges
        });
      }

      /* ---------------- start ---------------- */
      // a pixel-ratio change (quality guard) keeps every cached sprite and just redraws; a real resize lays out again
      cv.onResize(() => { if (!(BG && cv.w === G.w && cv.h === G.H)) layout(); half = 1; if (cv.g && BG) cv.g.drawImage(BG.c, 0, 0, G.w, G.H); });
      S.on('theme', () => { el.classList.toggle('bp-bright', !dark()); SPR.clear(); bgKey = ''; drawNext(); });
      if (visits >= 3) {
        const bal = h('div', { class: 'bp-balloon', 'aria-hidden': 'true' }, h('b'), h('img', { alt: '', src: ctx.TS.faceUrl('loopie', 'E05') }));
        bal.style.top = (G.phone ? 120 : 90) + 'px'; el.append(bal);
      }
      (async () => {
        await K.intro({ title: 'Block Party', sub: 'A hill town at dusk, still under construction. Every full row you build becomes a lit street.', how: 'Move, turn and drop the house parts. Fill whole rows.', char: 'patch', mood: 'E04' });
        phase = 'play';
        patch.say(line({ Jolly: 'Right, builder! Stack the parts, finish whole streets, light up the town.', Cheeky: 'Hard hat on. Let’s build something the neighbours will gossip about.', Unfiltered: 'Stack. Fill rows. Rows become streets. Go.' }), { ms: 3600 });
        spawn();
        guideNext();
      })();

      /* ---------------- autoplay: a tidy little planner presses the real buttons ---------------- */
      function plan() {
        let best = null;
        for (let rot = 0; rot < (cur.t === 'O' ? 1 : 4); rot++) {
          for (let x = -3; x < COLS; x++) {
            if (!fits(cur.t, rot, x, cur.y)) continue;
            let y = cur.y; while (fits(cur.t, rot, x, y + 1)) y++;
            const cells = cellsOf(cur.t, rot), tmp = board.map(r => r.slice());
            let ok = true; cells.forEach(([cx, cy]) => { if (y + cy < 0) ok = false; else tmp[y + cy][x + cx] = 1; });
            if (!ok) continue;
            let lines = 0; tmp.forEach(r => { if (r.every(Boolean)) lines++; });
            const hts = []; let hol = 0;
            for (let c = 0; c < COLS; c++) { let hgt = 0, seen = false; for (let r = 0; r < ROWS; r++) { if (tmp[r][c]) { if (!seen) hgt = ROWS - r; seen = true; } else if (seen) hol++; } hts.push(hgt); }
            const agg = hts.reduce((a, b) => a + b, 0); let bump = 0; for (let c = 1; c < COLS; c++) bump += Math.abs(hts[c] - hts[c - 1]);
            const sc = -0.51 * agg + 0.76 * lines - 0.36 * hol * 2 - 0.18 * bump;
            if (!best || sc > best.sc) best = { rot, x, sc };
          }
        }
        return best;
      }
      return {
        debug: () => ({ phase, streets, placements, cur: cur && { t: cur.t, x: cur.x, y: cur.y, rot: cur.rot } }),
        async autoplay() {
          while (phase !== 'play') await K.wait(100);
          let guard = 0;
          while (!finished && phase === 'play' && guard++ < 220) {
            if (!cur || clearing) { await K.wait(60); continue; }
            const p = plan(), me = cur;
            if (!p) { await K.sim.tap(bDrop); continue; }
            for (let i = 0; i < p.rot && cur === me; i++) { await K.sim.tap(bTurn); await K.wait(50); }
            let tries = 0;
            while (cur === me && cur.x !== p.x && tries++ < 10) { await K.sim.tap(cur.x < p.x ? bRight : bLeft); await K.wait(45); }
            if (cur === me) { await K.wait(90); await K.sim.tap(bDrop); }
            await K.wait(140);
          }
          while (!finished) await K.wait(200);
        }
      };
    }
  });
})(window.TSG_ENV);
