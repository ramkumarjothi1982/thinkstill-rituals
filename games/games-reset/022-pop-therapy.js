/* 022 Pop Therapy — Reset · FEEL · Emotion
 * Mechanism: a short burst of controllable, satisfying sensory release (popping bubble wrap) discharges tension and
 * resets attention; then the sheets get slower and more rhythmic. The last sheet is paced breathing (pop with the glow:
 * four counts in, six counts out, slowing down), so the session ends calm rather than wired.
 * Verb: pop (tap to pop; swipe a row to chain-pop; hold to squeeze the giant one). Finale: the flat sheet shimmers into a
 * rainbow, folds itself into a paper crane and flies off; "You popped N".
 */
(function (env) {
  'use strict';
  const PENTA = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6'];
  const SHAPES = ['heart', 'star', 'hex', 'circle', 'classic'];
  const SHAPE_NAME = { heart: 'heart sheet', star: 'star sheet', hex: 'hex sheet', circle: 'round sheet', classic: 'classic sheet' };
  /* The wrap's tint changes with each visit; the pop sound pack grows with visits (never random). */
  const TINTS = [
    { id: 'mint', rgb: [120, 240, 210], ink: '#0d6b5a' }, { id: 'lilac', rgb: [190, 160, 255], ink: '#5a3fb0' },
    { id: 'peach', rgb: [255, 180, 150], ink: '#a8482a' }, { id: 'sky', rgb: [140, 200, 255], ink: '#2563a8' }
  ];
  const PACKS = ['Classic', 'Marimba', 'Glass', 'Kalimba'];
  const SPECIAL_NAME = { golden: 'Golden bubble', glitter: 'Glitter bubble', heart: 'Heart bubble' };
  const RAINBOW = ['#ff8fb1', '#ffb36b', '#ffe37a', '#8fe3a8', '#7fc8ff', '#b49cff'];
  const IN_NOTES = ['C4', 'E4', 'G4', 'A4'], OUT_NOTES = ['C5', 'A4', 'G4', 'E4', 'D4', 'C4'];
  const BASS = ['C2', 'A1', 'F1', 'G1'], CHORDS = [['E4', 'G4', 'C5'], ['E4', 'A4', 'C5'], ['F4', 'A4', 'C5'], ['D4', 'G4', 'B4']];

  (env.games = env.games || []).push({
    id: 'pop-therapy', mode: 'reset', name: 'Pop Therapy', verb: 'pop', family: 'FEEL', minutes: 2,
    parents: ['Emotion', 'Mental Overload / Working Memory', 'Overthinking / Thought Fusion'],
    cast: ['sync', 'loopie'], poster: { char: 'sync', mood: 'laugh' },
    tagline: 'Pop a sheet, ratatat a row, squeeze the giant one, then pop slowly.',
    why: 'For a wound-up head: a burst of satisfying pops that slows down into calm breathing.',
    fonts: ['Bricolage+Grotesque:wght@600;700;800'],
    css: `
.g-pop-therapy { --pt-font: "Bricolage Grotesque", "Poppins", "Avenir Next", "Segoe UI", system-ui, sans-serif; --pt-ink: #2a2140; --pt-label: #fffdf8; --pt-band: #ff8fb1; }
.g-pop-therapy .pt-hit { position: absolute; z-index: 14; touch-action: none; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.g-pop-therapy .pt-words { position: absolute; inset: 0; z-index: 15; pointer-events: none; }
.g-pop-therapy .pt-word { position: absolute; left: 0; top: 0; translate: -50% -50%; text-align: center; pointer-events: none; will-change: transform;
  font: 700 15px/1.08 var(--pt-font); letter-spacing: 0.02em; color: #fff; text-shadow: 0 1px 2px rgba(20, 0, 40, 0.55), 0 0 10px rgba(80, 20, 120, 0.35); text-wrap: balance; }
.g-pop-therapy.pt-bright .pt-word { color: #33184f; text-shadow: 0 1px 0 rgba(255, 255, 255, 0.8), 0 0 8px rgba(255, 255, 255, 0.7); }
.g-pop-therapy .pt-rx { position: absolute; z-index: 18; left: 0; top: 0; translate: -50% 0; display: flex; align-items: stretch; height: 38px; border-radius: 10px; overflow: hidden; pointer-events: none;
  background: var(--pt-label); color: var(--pt-ink); box-shadow: 0 6px 16px rgba(20, 10, 40, 0.28), 0 1px 0 rgba(255, 255, 255, 0.6) inset; white-space: nowrap; }
.g-pop-therapy .pt-rx b { display: grid; place-items: center; padding: 0 10px; background: var(--pt-band); color: #fff; font: 800 16px/1 var(--pt-font); letter-spacing: 0.02em; }
.g-pop-therapy .pt-rx span { display: flex; align-items: center; padding: 0 10px 0 11px; font: 700 13px/1 var(--pt-font); letter-spacing: 0.05em; text-transform: uppercase; position: relative; }
.g-pop-therapy .pt-rx i { display: flex; align-items: center; gap: 6px; padding: 0 12px 0 10px; border-left: 1.5px dashed rgba(42, 33, 64, 0.25); font: 800 19px/1 var(--pt-font); font-style: normal; font-variant-numeric: tabular-nums; }
.g-pop-therapy .pt-rx em { font-style: normal; min-width: 1.6ch; }
.g-pop-therapy .pt-rx u { display: block; width: 15px; height: 15px; border-radius: 50%; background: radial-gradient(circle at 34% 32%, #fff 0 18%, #c9f6ea 40%, #7fd9c2 100%); box-shadow: inset 0 0 0 1px rgba(20, 80, 70, 0.25), 0 1px 2px rgba(0, 0, 0, 0.2); }
.g-pop-therapy .pt-rx span::after { content: ""; position: absolute; left: 0; bottom: 0; height: 4px; width: calc(var(--fill, 0) * 100%); background: var(--pt-fillc, #7fe0c4); transition: width 0.25s linear; }
.g-pop-therapy .pt-mega { position: absolute; z-index: 16; border: 0; padding: 0; margin: 0; border-radius: 50%; background: transparent; cursor: pointer; touch-action: none; -webkit-tap-highlight-color: transparent; }
.g-pop-therapy .pt-mega:focus-visible { outline: 3px solid #ffd36b; outline-offset: 6px; }
.g-pop-therapy .pt-mega[hidden] { display: none; }
.g-pop-therapy .pt-megaword { position: absolute; z-index: 17; left: 0; top: 0; translate: -50% -50%; width: max-content; max-width: 220px; text-align: center; pointer-events: none; will-change: transform;
  font: 800 21px/1.1 var(--pt-font); letter-spacing: 0.02em; color: #fff; text-shadow: 0 2px 4px rgba(60, 0, 60, 0.5), 0 0 16px rgba(120, 30, 120, 0.45); text-wrap: balance; }
.g-pop-therapy.pt-bright .pt-megaword { color: #3b1250; text-shadow: 0 1px 0 rgba(255, 255, 255, 0.9), 0 0 12px rgba(255, 255, 255, 0.8); }
.g-pop-therapy .pt-megaword[hidden] { display: none; }
.g-pop-therapy .pt-final { position: absolute; z-index: 40; left: 50%; top: 0; translate: -50% 0; text-align: center; pointer-events: none; opacity: 0; color: #fff; white-space: nowrap; }
.g-pop-therapy:not(.pt-phone) .pt-final { display: flex; align-items: baseline; gap: 14px; }
.g-pop-therapy:not(.pt-phone) .pt-final b { font-size: 54px; margin-top: 0; }
.g-pop-therapy .pt-final small { display: block; font: 700 18px/1 var(--pt-font); letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.9; text-shadow: 0 2px 10px rgba(30, 0, 50, 0.6); }
.g-pop-therapy .pt-final b { display: block; font: 800 68px/1 var(--pt-font); font-variant-numeric: tabular-nums; margin-top: 4px;
  background: linear-gradient(90deg, #ff8fb1, #ffb36b 20%, #ffe37a 40%, #8fe3a8 60%, #7fc8ff 80%, #b49cff); -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 3px 8px rgba(40, 0, 60, 0.45)); }
.g-pop-therapy.pt-bright .pt-final { color: #2a1640; }
.g-pop-therapy.pt-bright .pt-final b { background-image: linear-gradient(90deg, #e0457b, #f07a1a 20%, #d9a400 40%, #22a565 60%, #2a83d6 80%, #7a4fe0); filter: drop-shadow(0 0 1px #fff) drop-shadow(0 2px 6px rgba(255, 255, 255, 0.9)); }
.g-pop-therapy.pt-bright .pt-chain { color: #7a1f6a; text-shadow: 0 0 2px #fff, 0 0 10px rgba(255, 255, 255, 0.95); }
.g-pop-therapy.pt-bright .gk-pop-text.gk-great { color: #b0306a; text-shadow: 0 0 2px #fff, 0 0 12px rgba(255, 255, 255, 0.95); }
.g-pop-therapy .gk-pop-text { font-family: var(--pt-font); font-weight: 800; }
.g-pop-therapy.pt-bright .pt-final small { text-shadow: 0 1px 8px rgba(255, 255, 255, 0.9); }
.g-pop-therapy .pt-chain { position: absolute; z-index: 30; left: 0; top: 0; translate: -50% -50%; font: 800 26px/1 var(--pt-font); color: #fff; pointer-events: none; opacity: 0; white-space: nowrap;
  text-shadow: 0 2px 0 rgba(120, 20, 90, 0.6), 0 0 14px rgba(255, 120, 200, 0.6); }
.g-pop-therapy .pt-r.gk-side-below .gk-bubble { left: auto; right: 0; }
.g-pop-therapy .gk-side-below .gk-bubble { max-width: 210px; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const text = String(ctx.text || '').trim();
      const inten = ctx.intensity, visits = K.visits();
      const care = () => an.safety === 'care';
      const line = (o) => ctx.line(o), gentle = (o) => (care() ? o.Jolly : ctx.line(o));
      const red = () => K.reduced();
      const TAU = Math.PI * 2;
      const shape = K.dailyPick(SHAPES, 2), special = K.dailyPick(['golden', 'glitter', 'heart'], 5);
      const tint = TINTS[visits % TINTS.length];
      const pack = visits < PACKS.length ? PACKS[visits] : PACKS[(K.daily() + visits) % PACKS.length];
      const vnow = () => A.now() - A.latency();
      let phase = 'intro', finished = false, N = 0;
      // if the AI reading lands while sheet 1 is up, the later sheets and the giant bubble use it (sheet 1 keeps its words)
      ctx.analysisReady.then(a => {
        if (!a || typeof a !== 'object' || a === an || !(phase === 'intro' || phase === 's1')) return;
        an = a;
        if (!W) return;
        const nw = pickWords(), k = (x) => x.label.replace(/[^a-z0-9]/gi, '').toLowerCase(), keep = W.words.slice(0, 2);
        W = { words: keep.concat(nw.words.filter(x => !keep.some(y => k(y) === k(x)))).slice(0, 4), core: nw.core };
      }).catch(() => {});

      /* ---------------- words: the player's own looping thoughts, else warm generic ones ---------------- */
      function pickWords() {
        const low = text.toLowerCase().replace(/[’‘]/g, "'");
        const own = (l) => {
          if (!low) return false;
          if (an.source === 'ai') return true;
          const ws = l.toLowerCase().replace(/[’‘]/g, "'").split(/\s+/).map(x => x.replace(/[^a-z0-9']/g, '')).filter(x => x.length > 2);
          return !!ws.length && ws.filter(x => low.includes(x)).length / ws.length >= 0.6;
        };
        const key = (s) => s.replace(/[^a-z0-9]/gi, '').toLowerCase();
        const seen = [], list = [];
        const clip = (l) => (l.length > 28 ? l.slice(0, 27) + '…' : l);
        const add = (l) => { l = String(l || '').trim(); const k = key(l); if (k.length < 2 || seen.some(s => s.includes(k) || k.includes(s))) return; seen.push(k); list.push(clip(l)); };
        let core = '';
        if (an.core && an.core.label && own(an.core.label)) { core = clip(an.core.label.trim()); seen.push(key(core)); }
        (an.strands || []).forEach(s => { if (s && s.label && own(s.label)) add(s.label); });
        if (low) K.phrases(text, 8, 4).forEach(p => { if (list.length < 4 && !/…$/.test(p)) add(p); });
        const caps = list.some(l => l === l.toUpperCase());
        const gen = ['ugh', 'so much', 'what if', 'too many tabs'].map(x => (caps ? x.toUpperCase() : x));
        const out = list.slice(0, 4).map(l => ({ label: l, own: true }));
        for (const gw of gen) { if (out.length >= 4) break; if (!out.some(o => key(o.label) === key(gw))) out.push({ label: gw, own: false }); }
        return { words: out, core: core ? { label: core, own: true } : { label: caps ? 'ALL OF IT' : 'all of it', own: false } };
      }
      let W = null;

      /* ---------------- scene ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: 2 });
      const P = K.particles({ max: 260 });
      const hitEl = h('div', { class: 'pt-hit', role: 'application', 'aria-label': 'Bubble wrap. Tap bubbles to pop them.' });
      const wordLayer = h('div', { class: 'pt-words' });
      const rx = h('div', { class: 'pt-rx' }, h('b', { text: 'Rx' }), h('span', { text: 'Sheet 1 · tap to pop' }), h('i', { 'aria-label': 'Bubbles popped' }, h('u', { 'aria-hidden': 'true' }), h('em', { text: '0' })));
      const rxText = rx.querySelector('span'), rxNum = rx.querySelector('em');
      const megaBtn = h('button', { type: 'button', class: 'pt-mega', hidden: true, 'aria-label': 'The giant bubble. Press and hold to squeeze it.' });
      const megaWord = h('div', { class: 'pt-megaword', hidden: true });
      const chainEl = h('div', { class: 'pt-chain', 'aria-hidden': 'true' });
      const finalEl = h('div', { class: 'pt-final', 'aria-live': 'polite' }, h('small', { text: 'You popped' }), h('b', { text: '0' }));
      el.append(hitEl, wordLayer, megaBtn, megaWord, rx, chainEl, finalEl);
      const sync = K.character('sync', { side: 'right', mood: 'laugh', x: 12, y: 60, size: 58 });
      const loopie = K.character('loopie', { side: 'right', mood: 'silly', x: 12, y: 700, size: 58 });
      loopie.show(false);
      const G = { w: 0, h: 0, phone: true, box: { x: 0, y: 0, w: 0, h: 0 }, box3: null, mega: { x: 0, y: 0, r: 100 } };
      let BG = null, SP = null, cur = null, prev = null, frameN = 0;
      el.classList.toggle('pt-bright', !K.dark());

      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        const phone = w < 700;
        Object.assign(G, { w, h: H, phone });
        el.classList.toggle('pt-phone', phone);
        if (phone) {
          sync.side('right'); sync.place(12, 60); loopie.side('right'); loopie.place(12, Math.round(H - 144));
          [sync.el, loopie.el].forEach(c => c.style.setProperty('--sz', '58px'));
          G.box = { x: 10, y: 206, w: w - 20, h: Math.max(300, H - 206 - 28) };
          G.box3 = { x: 10, y: 206, w: w - 20, h: Math.max(280, H - 206 - 168) };
          G.rxY = 156;
        } else {
          const bw = Math.min(780, w - 480);
          sync.side('below'); sync.place(Math.max(24, (w - bw) / 2 - 190), 150); loopie.side('below'); loopie.place(Math.min(w - 128, (w + bw) / 2 + 86), 150);
          loopie.el.classList.add('pt-r');
          [sync.el, loopie.el].forEach(c => c.style.setProperty('--sz', '104px'));
          G.box = { x: (w - bw) / 2, y: 122, w: bw, h: H - 122 - 26 };
          G.box3 = { x: (w - bw) / 2, y: 140, w: bw, h: H - 140 - 60 };
          G.rxY = 70;
        }
        rx.style.left = (w / 2) + 'px'; rx.style.top = G.rxY + 'px';
        const B = G.box;
        G.mega = { x: w / 2, y: B.y + B.h * (phone ? 0.42 : 0.46), r: Math.min(B.w * 0.42, phone ? 158 : 210) };
        Object.assign(megaBtn.style, { left: (G.mega.x - G.mega.r) + 'px', top: (G.mega.y - G.mega.r) + 'px', width: G.mega.r * 2 + 'px', height: G.mega.r * 2 + 'px' });
        G.hitY = phone ? 196 : 112;
        hitEl.style.left = '0px'; hitEl.style.top = G.hitY + 'px'; hitEl.style.width = w + 'px'; hitEl.style.height = (H - G.hitY) + 'px';
        SP = paintSprites();
        paintBG();
        [prev, cur].forEach(sh => { if (sh && !sh.dead) { placeSheet(sh); renderSheet(sh); } });
        positionWords();
      }
      cv.onResize(() => layout());
      S.on('theme', () => { el.classList.toggle('pt-bright', !K.dark()); SP = paintSprites(); paintBG(); [prev, cur].forEach(sh => { if (sh && !sh.dead) { sh.pillSpr = {}; sh.film = null; renderSheet(sh); } }); });

      /* ---------------- painting helpers ---------------- */
      function off(w, hh) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w * cv.dpr)); c.height = Math.max(1, Math.ceil(hh * cv.dpr)); const g = c.getContext('2d'); g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0); return { c, g, w, h: hh }; }
      const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
      function heartPath(g, x, y, r) {
        g.moveTo(x, y + r * 0.86);
        g.bezierCurveTo(x - r * 1.25, y + r * 0.05, x - r * 0.95, y - r * 1.02, x, y - r * 0.4);
        g.bezierCurveTo(x + r * 0.95, y - r * 1.02, x + r * 1.25, y + r * 0.05, x, y + r * 0.86);
        g.closePath();
      }
      function paintBG() {
        const w = G.w, H = G.h, D = K.dark();
        BG = off(w, H); const g = BG.g;
        const gr = g.createRadialGradient(w * 0.5, H * 0.42, 20, w * 0.5, H * 0.45, Math.max(w, H) * 0.75);
        if (D) { gr.addColorStop(0, '#30235a'); gr.addColorStop(0.55, '#1d1640'); gr.addColorStop(1, '#0e0a22'); }
        else { gr.addColorStop(0, '#fdfcf6'); gr.addColorStop(0.6, '#e8f6f0'); gr.addColorStop(1, '#d7ece6'); }
        g.fillStyle = gr; g.fillRect(0, 0, w, H);
        const blobs = [[0.12, 0.2, 0.42, D ? 'rgba(255,120,190,0.12)' : 'rgba(255,170,200,0.32)'], [0.92, 0.36, 0.5, D ? 'rgba(110,230,210,0.10)' : 'rgba(150,235,215,0.38)'], [0.3, 0.9, 0.55, D ? 'rgba(160,130,255,0.12)' : 'rgba(200,180,255,0.3)'], [0.85, 0.95, 0.4, D ? 'rgba(255,190,120,0.08)' : 'rgba(255,214,170,0.35)']];
        blobs.forEach(([x, y, r, c]) => { const R = Math.max(w, H) * r, b = g.createRadialGradient(x * w, y * H, 0, x * w, y * H, R); b.addColorStop(0, c); b.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = b; g.fillRect(0, 0, w, H); });
        // a cutting mat: fine grid, stronger every fifth line, and ruler ticks along the edges
        const step = G.phone ? 26 : 32;
        g.lineWidth = 1;
        for (let x = 0, i = 0; x <= w; x += step, i++) { g.strokeStyle = D ? (i % 5 ? 'rgba(150,230,220,0.05)' : 'rgba(150,230,220,0.11)') : (i % 5 ? 'rgba(20,110,100,0.06)' : 'rgba(20,110,100,0.13)'); g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke(); }
        for (let y = 0, i = 0; y <= H; y += step, i++) { g.strokeStyle = D ? (i % 5 ? 'rgba(150,230,220,0.05)' : 'rgba(150,230,220,0.11)') : (i % 5 ? 'rgba(20,110,100,0.06)' : 'rgba(20,110,100,0.13)'); g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(w, y + 0.5); g.stroke(); }
        g.strokeStyle = D ? 'rgba(200,240,235,0.22)' : 'rgba(20,90,80,0.28)';
        for (let x = 0, i = 0; x <= w; x += step / 2, i++) { g.beginPath(); g.moveTo(x, H); g.lineTo(x, H - (i % 2 ? 5 : 9)); g.stroke(); }
        const vg = g.createRadialGradient(w / 2, H / 2, Math.min(w, H) * 0.4, w / 2, H / 2, Math.max(w, H) * 0.78);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, D ? 'rgba(4,0,16,0.45)' : 'rgba(40,80,90,0.12)');
        g.fillStyle = vg; g.fillRect(0, 0, w, H);
        if (!el.style.backgroundColor) el.style.backgroundColor = D ? '#1d1640' : '#e8f6f0';
      }
      /* One glossy dome, drawn once per size and theme. kind: '' | golden | glitter | heart */
      function paintDome(r, kind) {
        const D = K.dark(), pad = Math.ceil(r * 0.4), s = off(r * 2 + pad * 2, r * 2 + pad * 2), g = s.g, cx = r + pad, cy = r + pad;
        const sh = g.createRadialGradient(cx + r * 0.14, cy + r * 0.24, r * 0.4, cx + r * 0.14, cy + r * 0.24, r * 1.16);
        sh.addColorStop(0, D ? 'rgba(0,0,12,0.42)' : 'rgba(20,60,70,0.26)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = sh; g.beginPath(); g.arc(cx + r * 0.14, cy + r * 0.24, r * 1.16, 0, TAU); g.fill();
        const tc = tint.rgb;
        const path = () => { g.beginPath(); if (kind === 'heart') heartPath(g, cx, cy + r * 0.04, r * 1.02); else g.arc(cx, cy, r, 0, TAU); };
        const body = g.createRadialGradient(cx - r * 0.3, cy - r * 0.36, r * 0.05, cx, cy, r * 1.02);
        const CANDY = { golden: ['#fff6c8', '#ffd04d', '#e89a16', '#fff0b0'], heart: ['#ffe0ec', '#ff7fb0', '#e04884', '#ffd2e4'], glitter: ['#f4ecff', '#b89cff', '#7a58e0', '#ece2ff'] }[kind];
        if (CANDY) { body.addColorStop(0, CANDY[0]); body.addColorStop(0.5, CANDY[1]); body.addColorStop(0.9, CANDY[2]); body.addColorStop(1, CANDY[3]); }
        else { body.addColorStop(0, rgba(tc, D ? 0.12 : 0.1)); body.addColorStop(0.62, rgba(tc, 0.2)); body.addColorStop(0.9, D ? 'rgba(235,250,255,0.32)' : 'rgba(255,255,255,0.55)'); body.addColorStop(1, D ? 'rgba(245,252,255,0.62)' : 'rgba(255,255,255,0.9)'); }
        path(); g.fillStyle = body; g.fill();
        g.save(); path(); g.clip();
        g.strokeStyle = D ? 'rgba(0,10,30,0.3)' : 'rgba(20,70,80,0.16)'; g.lineWidth = r * 0.16; g.beginPath(); g.arc(cx + r * 0.06, cy + r * 0.08, r * 0.86, -0.1, Math.PI * 0.62); g.stroke();
        if (kind === 'glitter') { const R = K.rng(7); for (let i = 0; i < 16; i++) { const a = R() * TAU, d = R() * r * 0.8; g.fillStyle = ['#fff', '#ffe58a', '#ffc4e8', '#bfe9ff'][i % 4]; K.starPath(g, cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * 0.09, r * 0.03, 4, R()); g.fill(); } }
        g.restore();
        path(); g.strokeStyle = kind === 'golden' ? 'rgba(255,214,110,0.95)' : D ? 'rgba(220,250,255,0.6)' : 'rgba(255,255,255,0.95)'; g.lineWidth = kind ? 1.8 : 1.2; g.stroke();
        if (!D) { g.beginPath(); if (kind === 'heart') heartPath(g, cx, cy + r * 0.04, r * 1.06); else g.arc(cx, cy, r + 0.8, 0, TAU); g.strokeStyle = 'rgba(30,90,100,0.2)'; g.lineWidth = 1; g.stroke(); }
        g.save(); g.translate(cx - r * 0.36, cy - r * 0.42); g.rotate(-0.62);
        const hl = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.36); hl.addColorStop(0, 'rgba(255,255,255,0.95)'); hl.addColorStop(0.6, 'rgba(255,255,255,0.5)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = hl; g.beginPath(); g.ellipse(0, 0, r * 0.36, r * 0.19, 0, 0, TAU); g.fill(); g.restore();
        g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(cx - r * 0.06, cy - r * 0.62, r * 0.065, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = r * 0.07; g.lineCap = 'round'; g.beginPath(); g.arc(cx, cy, r * 0.7, Math.PI * 0.12, Math.PI * 0.36); g.stroke();
        return { c: s.c, pad, r };
      }
      function paintFlat(r, seed) {
        const D = K.dark(), pad = 4, s = off(r * 2 + pad * 2, r * 2 + pad * 2), g = s.g, cx = r + pad, cy = r + pad, R = K.rng(seed);
        const pts = []; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, d = r * (0.86 + R() * 0.1); pts.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]); }
        g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
        g.fillStyle = D ? 'rgba(220,240,255,0.06)' : 'rgba(255,255,255,0.32)'; g.fill();
        g.strokeStyle = D ? 'rgba(220,245,255,0.3)' : 'rgba(40,100,110,0.24)'; g.lineWidth = 1; g.stroke();
        g.strokeStyle = D ? 'rgba(220,245,255,0.22)' : 'rgba(40,100,110,0.2)'; g.lineWidth = 0.9; g.beginPath();
        for (let k = 0; k < 4; k++) { const a = R() * TAU, a2 = a + (R() - 0.5) * 0.8; g.moveTo(cx + Math.cos(a) * r * 0.15, cy + Math.sin(a) * r * 0.15); g.lineTo(cx + Math.cos(a2) * r * 0.78, cy + Math.sin(a2) * r * 0.78); }
        g.stroke();
        const sa = R() * TAU; g.strokeStyle = D ? 'rgba(0,0,0,0.5)' : 'rgba(30,60,70,0.4)'; g.lineWidth = 1.6; g.beginPath(); g.arc(cx, cy, r * 0.42, sa, sa + 0.9); g.stroke();
        return { c: s.c, pad, r };
      }
      function paintSprites() {
        const glow = (c) => { const s = off(96, 96), g = s.g, gr = g.createRadialGradient(48, 48, 0, 48, 48, 48); gr.addColorStop(0, c[0]); gr.addColorStop(0.45, c[1]); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 96, 96); return s.c; };
        return {
          domes: {}, flats: {},
          glowIn: glow(['rgba(190,255,235,0.95)', 'rgba(110,235,200,0.4)']), glowOut: glow(['rgba(255,226,200,0.95)', 'rgba(255,160,120,0.42)']),
          hue: RAINBOW.map(c => glow([K.hexA(c, 0.85), K.hexA(c, 0.3)])),
          spark: glow(['rgba(255,255,255,0.95)', 'rgba(255,240,250,0.35)'])
        };
      }
      function dome(r, kind) { const k = Math.round(r * 2) + ':' + (kind || ''); if (!SP.domes[k]) SP.domes[k] = paintDome(r, kind); return SP.domes[k]; }
      function flat(r, v) { const k = Math.round(r * 2) + ':' + (v % 4); if (!SP.flats[k]) SP.flats[k] = paintFlat(r, 31 + (v % 4) * 17); return SP.flats[k]; }

      /* ---------------- sheets ---------------- */
      function inShape(u, v, sh) {
        if (sh === 'heart') { const X = u * 1.15, Y = -v * 1.25 + 0.12, a = X * X + Y * Y - 1; return a * a * a - X * X * Y * Y * Y <= 0; }
        if (sh === 'circle') return u * u + v * v <= 0.95 * 0.95;
        if (sh === 'hex') return Math.max(Math.abs(u) * 0.866 + Math.abs(v) * 0.5, Math.abs(v)) <= 0.95;
        if (sh === 'star') { const a = Math.atan2(v, u) + Math.PI / 2, rr = Math.hypot(u, v), k = Math.abs(((a / TAU * 5) % 1 + 1) % 1 - 0.5) * 2; return rr <= 0.55 + 0.45 * Math.pow(k, 1.6); }
        return true;
      }
      function makeSheet(kind) {
        const phone = G.phone;
        const dims = kind === 's1' ? (phone ? [7, 9] : [9, 10]) : kind === 's2' ? (phone ? [6, [8, 10, 11][inten]] : [8, [6, 7, 8][inten]]) : (phone ? [5, [4, 6, 8][inten]] : [[5, 6, 8][inten], [4, 5, 5][inten]]);
        const [cols, rows] = dims, hex = kind !== 's3';
        const sh = { kind, cols, rows, hex, cells: [], pills: [], ox: 0, oy: 0, dirty: true, cache: null, pillSpr: {}, labels: [], dead: false };
        const cx = (cols - 1 + (hex ? 0.5 : 0)) / 2, cy = (rows - 1) * (hex ? 0.88 : 1) / 2, sc = Math.min(cols / 2, (rows * 0.88 / 2) / 1.12);
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          if (hex && r % 2 && c === cols - 1 && kind === 's2') continue;
          const px = c + (hex && r % 2 ? 0.5 : 0), py = r * (hex ? 0.88 : 1);
          if (kind === 's1' && !inShape((px - cx) / sc, (py - cy) / (sc * 1.12), shape)) continue;
          sh.cells.push({ r, c, x: 0, y: 0, state: 'full', kind: '', pill: null, v: (r * 7 + c * 3) % 4 });
        }
        if (kind !== 's3') {
          // two word pillows per sheet, each a capsule spanning a run of bubbles in one row
          const ws = kind === 's1' ? W.words.slice(0, 2) : W.words.slice(2, 4);
          const wantRows = kind === 's1' ? [Math.round(rows * 0.3), Math.round(rows * 0.68)] : [2, rows - 3];
          ws.forEach((wd, i) => {
            const row = wantRows[i];
            const inRow = sh.cells.filter(c => c.r === row && !c.pill).sort((a, b) => a.c - b.c);
            let best = [], run = [];
            inRow.forEach(c => { if (run.length && c.c !== run[run.length - 1].c + 1) run = []; run.push(c); if (run.length > best.length) best = run.slice(); });
            const need = Math.max(2, Math.min(best.length, Math.ceil(textW(wd.label) / 56) + 1));
            if (best.length < 2) return;
            const st = Math.floor((best.length - need) / 2), cells = best.slice(st, st + need);
            const p = { cells, label: wd.label, own: wd.own, state: 'full', el: null, x: 0, y: 0, len: 0 };
            cells.forEach(c => { c.pill = p; });
            sh.pills.push(p);
          });
          // today's special bubbles (same all day, never random rewards)
          const R = K.rng(K.daily() * 13 + (kind === 's1' ? 1 : 2));
          const singles = sh.cells.filter(c => !c.pill);
          const nSp = kind === 's1' ? 3 : 2;
          for (let k = 0; k < nSp && singles.length; k++) { const i = Math.floor(R() * singles.length); singles[i].kind = special; singles.splice(Math.max(0, i - 2), 5); }
        } else {
          // the breathing path snakes through the grid: row by row, alternating direction
          const path = [];
          for (let r = 0; r < rows; r++) { const row = sh.cells.filter(c => c.r === r).sort((a, b) => (r % 2 ? b.c - a.c : a.c - b.c)); path.push(...row); }
          sh.path = path;
          path.forEach((c, i) => { c.pi = i; c.breath = (i % 10) < 4 ? 'in' : 'out'; c.count = (i % 10) < 4 ? i % 10 : (i % 10) - 4; });
        }
        sh.pills.forEach(p => {
          const lab = h('div', { class: 'pt-word' + (p.own ? ' gk-user' : ''), text: p.label });
          wordLayer.append(lab); p.el = lab; sh.labels.push(lab);
        });
        return sh;
      }
      let measureC = null;
      function textW(s) { try { measureC = measureC || document.createElement('canvas').getContext('2d'); measureC.font = '700 15px "Bricolage Grotesque", Poppins, sans-serif'; return measureC.measureText(s).width * 1.1 + 26; } catch (e) { return s.length * 10 + 26; } }
      function placeSheet(sh) {
        const B = sh.kind === 's3' ? G.box3 : G.box, hex = sh.hex;
        const capS = G.phone ? (sh.kind === 's3' ? 66 : 60) : (sh.kind === 's3' ? 96 : 84);
        const minS = G.phone ? 50 : 56;
        let sx = Math.max(Math.min(hex ? B.w / (sh.cols + 0.5) : B.w / sh.cols, B.h / ((sh.rows - 1) * (hex ? 0.88 : 1) + 1.15), capS), Math.min(minS, B.w / (sh.cols + 0.5)));
        const d = sx * (sh.kind === 's3' ? 0.82 : 0.88), sy = hex ? sx * 0.88 : sx;
        const gw = (sh.cols - 1) * sx + (hex ? sx / 2 : 0) + d, gh = (sh.rows - 1) * sy + d;
        const x0 = B.x + (B.w - gw) / 2 + d / 2, y0 = B.y + Math.max(0, (B.h - gh) / 2) + d / 2;
        Object.assign(sh, { d, r: d / 2, sx, sy });
        const pad = d * 0.5;
        sh.rect = { x: x0 - d / 2 - pad, y: y0 - d / 2 - pad, w: gw + pad * 2, h: gh + pad * 2 };
        for (const c of sh.cells) { c.x = x0 + c.c * sx + (hex && c.r % 2 ? sx / 2 : 0); c.y = y0 + c.r * sy; }
        for (const p of sh.pills) { const a = p.cells[0], b = p.cells[p.cells.length - 1]; p.x1 = a.x; p.x2 = b.x; p.x = (a.x + b.x) / 2; p.y = a.y; p.len = b.x - a.x + d; if (p.el) p.el.style.maxWidth = Math.max(60, p.len - 18) + 'px'; }
        sh.pillSpr = {};
        sh.dirty = true;
      }
      function pillSprite(sh, p, full) {
        const k = (full ? 'f' : 'x') + p.cells.length;
        if (sh.pillSpr[k]) return sh.pillSpr[k];
        const D = K.dark(), r = sh.r, L = p.len, pad = Math.ceil(r * 0.45), s = off(L + pad * 2, r * 2 + pad * 2), g = s.g, x0 = pad, y0 = pad;
        const cap = (ins) => { g.beginPath(); g.moveTo(x0 + r, y0 + ins); g.lineTo(x0 + L - r, y0 + ins); g.arc(x0 + L - r, y0 + r, r - ins, -Math.PI / 2, Math.PI / 2); g.lineTo(x0 + r, y0 + 2 * r - ins); g.arc(x0 + r, y0 + r, r - ins, Math.PI / 2, Math.PI * 1.5); g.closePath(); };
        if (full) {
          g.save(); g.translate(r * 0.14, r * 0.24); cap(-2); g.fillStyle = D ? 'rgba(0,0,12,0.38)' : 'rgba(20,60,70,0.22)'; g.fill(); g.restore();
          const tc = D ? [255, 140, 210] : [190, 140, 255];
          const lg = g.createLinearGradient(0, y0, 0, y0 + 2 * r); lg.addColorStop(0, D ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.9)'); lg.addColorStop(0.25, rgba(tc, D ? 0.26 : 0.28)); lg.addColorStop(0.8, rgba(tc, D ? 0.34 : 0.36)); lg.addColorStop(1, D ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.85)');
          cap(0); g.fillStyle = lg; g.fill();
          g.strokeStyle = D ? 'rgba(255,230,250,0.7)' : 'rgba(255,255,255,0.95)'; g.lineWidth = 1.6; g.stroke();
          if (!D) { cap(-1); g.strokeStyle = 'rgba(80,40,120,0.22)'; g.lineWidth = 1; g.stroke(); }
          const hl = g.createLinearGradient(0, y0 + r * 0.2, 0, y0 + r * 0.7); hl.addColorStop(0, 'rgba(255,255,255,0.9)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = hl; g.beginPath(); g.ellipse(x0 + L * 0.4, y0 + r * 0.42, L * 0.3, r * 0.2, 0, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(x0 + r * 0.7, y0 + r * 0.45, r * 0.08, 0, TAU); g.fill();
        } else {
          cap(r * 0.12); g.fillStyle = D ? 'rgba(220,240,255,0.06)' : 'rgba(255,255,255,0.3)'; g.fill();
          g.strokeStyle = D ? 'rgba(220,245,255,0.28)' : 'rgba(40,100,110,0.24)'; g.lineWidth = 1; g.stroke();
          g.strokeStyle = D ? 'rgba(220,245,255,0.18)' : 'rgba(40,100,110,0.18)'; g.beginPath();
          for (let i = 1; i < 6; i++) { const x = x0 + L * i / 6; g.moveTo(x - 5, y0 + r * 0.4); g.lineTo(x + 6, y0 + r * 1.55); } g.stroke();
        }
        return (sh.pillSpr[k] = { c: s.c, pad });
      }
      function renderSheet(sh) {
        if (!sh.rect) return;
        const R2 = sh.rect, D = K.dark();
        if (!sh.cache || sh.cache.w !== Math.ceil(R2.w) || sh.cache.h !== Math.ceil(R2.h) || sh.cacheDpr !== cv.dpr) { sh.cache = off(Math.ceil(R2.w), Math.ceil(R2.h)); sh.cacheDpr = cv.dpr; sh.film = null; }
        const g = sh.cache.g;
        g.clearRect(0, 0, sh.cache.w, sh.cache.h);
        if (!sh.film) sh.film = paintFilm(sh, D);
        g.drawImage(sh.film.c, 0, 0, sh.cache.w, sh.cache.h);
        g.save(); g.translate(-R2.x, -R2.y);
        for (const c of sh.cells) {
          if (c.pill || c.hide) continue;
          const s = c.state === 'full' ? dome(sh.r, c.kind) : flat(sh.r, c.v);
          g.drawImage(s.c, c.x - s.r - s.pad, c.y - s.r - s.pad, (s.r + s.pad) * 2, (s.r + s.pad) * 2);
        }
        for (const p of sh.pills) { const s = pillSprite(sh, p, p.state === 'full'); g.drawImage(s.c, p.x1 - sh.r - s.pad, p.y - sh.r - s.pad, p.len + s.pad * 2, sh.r * 2 + s.pad * 2); }
        g.restore();
        sh.dirty = false;
      }
      function paintFilm(sh, D) {
        const R2 = sh.rect, s = off(Math.ceil(R2.w), Math.ceil(R2.h)), g = s.g;
        const t = off(Math.ceil(R2.w), Math.ceil(R2.h)), tg = t.g;
        tg.translate(-R2.x, -R2.y);
        tg.fillStyle = '#fff';
        if (sh.hex) { tg.beginPath(); for (const c of sh.cells) { tg.moveTo(c.x + sh.sx * 0.66, c.y); tg.arc(c.x, c.y, sh.sx * 0.66, 0, TAU); } tg.fill(); }
        else { const xs = sh.cells.map(c => c.x), ys = sh.cells.map(c => c.y), m = sh.sx * 0.62; tg.beginPath(); rr(tg, Math.min(...xs) - m, Math.min(...ys) - m, Math.max(...xs) - Math.min(...xs) + 2 * m, Math.max(...ys) - Math.min(...ys) + 2 * m, 18); tg.fill(); }
        g.save(); g.globalAlpha = D ? 0.45 : 0.2; g.drawImage(t.c, 3, 7, s.w, s.h); g.restore();
        g.globalCompositeOperation = 'source-in'; g.fillStyle = D ? 'rgba(0,0,10,1)' : 'rgba(30,70,80,1)'; g.fillRect(0, 0, s.w, s.h);
        g.globalCompositeOperation = 'destination-out'; g.drawImage(t.c, 0, 0, s.w, s.h); g.globalCompositeOperation = 'source-over';
        g.save(); g.globalAlpha = D ? 0.2 : 0.26; g.drawImage(t.c, 0, 0, s.w, s.h); g.restore();
        // a bright rim where the plastic ends: the film shape minus itself nudged inward
        const e = off(Math.ceil(R2.w), Math.ceil(R2.h)), eg = e.g;
        eg.drawImage(t.c, 0, 0, s.w, s.h); eg.globalCompositeOperation = 'destination-out';
        [[2, 2], [-2, 2], [2, -2], [-2, -2]].forEach(([dx, dy]) => eg.drawImage(t.c, dx, dy, s.w, s.h));
        g.save(); g.globalAlpha = D ? 0.55 : 0.9; g.drawImage(e.c, 0, 0, s.w, s.h); g.restore();
        const sheen = g.createLinearGradient(0, 0, s.w, s.h); sheen.addColorStop(0, D ? 'rgba(170,240,255,0.12)' : 'rgba(255,255,255,0.4)'); sheen.addColorStop(0.35, 'rgba(255,255,255,0)'); sheen.addColorStop(0.62, D ? 'rgba(255,170,230,0.08)' : 'rgba(255,220,240,0.24)'); sheen.addColorStop(0.8, D ? 'rgba(170,200,255,0.06)' : 'rgba(210,230,255,0.2)'); sheen.addColorStop(1, 'rgba(255,255,255,0)');
        g.globalCompositeOperation = 'source-atop'; g.fillStyle = sheen; g.fillRect(0, 0, s.w, s.h);
        g.fillStyle = rgba(tint.rgb, D ? 0.08 : 0.12); g.fillRect(0, 0, s.w, s.h); g.globalCompositeOperation = 'source-over';
        return s;
      }
      function rr(g, x, y, w, hh, r) { if (g.roundRect) { g.roundRect(x, y, w, hh, r); return; } g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      function positionWords() {
        [prev, cur].forEach(sh => { if (!sh || sh.dead) return; sh.pills.forEach(p => { if (p.el) p.el.style.transform = 'translate(' + (p.x + sh.ox).toFixed(1) + 'px,' + (p.y + sh.oy).toFixed(1) + 'px)'; }); });
      }

      /* ---------------- sound ---------------- */
      function popSound(freq, vol, pan, o) {
        if (!A.ctx) return;
        o = o || {};
        const t = A.now(), v = vol == null ? 1 : vol;
        if (!o.round) A.noise({ when: t, filter: 'highpass', freq: 1900, dur: 0.016, vol: 0.34 * v, pan });
        else A.noise({ when: t, filter: 'lowpass', freq: 900, dur: 0.04, vol: 0.12 * v, pan });
        const pk = o.round ? 'Round' : pack;
        if (pk === 'Classic') { A.tone({ when: t, type: 'sine', freq: freq * 2.1, to: freq, glide: 0.035, dur: 0.12, vol: 0.2 * v, attack: 0.001, pan }); A.noise({ when: t, filter: 'bandpass', freq: freq * 3, q: 8, dur: 0.05, vol: 0.16 * v, pan }); }
        else if (pk === 'Marimba') { A.tone({ when: t, type: 'sine', freq, dur: 0.42, vol: 0.26 * v, attack: 0.002, pan }); A.tone({ when: t, type: 'sine', freq: freq * 4, dur: 0.07, vol: 0.06 * v, attack: 0.001, pan }); }
        else if (pk === 'Glass') { A.tone({ when: t, type: 'sine', freq: freq * 2, dur: 0.6, vol: 0.13 * v, attack: 0.001, pan, verb: 0.25 }); A.tone({ when: t, type: 'sine', freq: freq * 5.04, dur: 0.22, vol: 0.04 * v, attack: 0.001, pan }); }
        else if (pk === 'Kalimba') { A.tone({ when: t, type: 'sine', freq, dur: 0.7, vol: 0.2 * v, attack: 0.001, pan }); A.tone({ when: t, type: 'sine', freq: freq * 5.4, dur: 0.1, vol: 0.04 * v, attack: 0.001, pan }); }
        else { A.tone({ when: t, type: 'sine', freq: freq * 1.5, to: freq, glide: 0.06, dur: 0.5, vol: 0.2 * v, attack: 0.004, pan, verb: 0.3, lp: 1600 }); A.tone({ when: t, type: 'triangle', freq: freq * 0.5, dur: 0.3, vol: 0.06 * v, attack: 0.004, pan }); }
        if (o.special === 'golden') A.chime(freq * 2, { vol: 0.08, dur: 1.4, pan });
        if (o.special === 'glitter') for (let i = 0; i < 4; i++) A.tone({ when: t + 0.03 + i * 0.04, type: 'sine', freq: 2200 + Math.random() * 1800, dur: 0.1, vol: 0.03, pan });
        if (o.special === 'heart') { A.tone({ when: t + 0.02, type: 'sine', freq: freq * 1.5, dur: 0.3, vol: 0.08, pan }); A.tone({ when: t + 0.12, type: 'sine', freq: freq * 2, dur: 0.4, vol: 0.07, pan }); }
        A.sync('pop', performance.now());
      }
      const noteAt = (x, sh) => { const b = sh.rect, k = K.clamp((x - b.x) / Math.max(1, b.w), 0, 0.999); return A.note(PENTA[Math.floor(k * 9)]); };
      /* A small bed under the action: a bouncy bass and soft chord stabs; it hushes for the squeeze and stops for the slow sheet. */
      const BED = { on: false, bpm: 100, next: 0, i: 0, lv: 1 };
      function bedTick() {
        if (!A.ctx || !BED.on) return;
        const now = A.now();
        if (BED.next < now - 0.25) BED.next = now + 0.06;
        while (BED.next < now + 0.16) {
          const t = BED.next, i = BED.i, b = i % 4, bar = Math.floor(i / 4) % 4, v = BED.lv * (inten === 0 ? 0.8 : 1);
          if (b === 0 || b === 2) A.pluck(A.note(BASS[bar]) * (b === 2 ? 1.5 : 1), { when: t, vol: 0.3 * v, damp: 0.993, lp: 620, bus: 'music' });
          if (b === 0) A.tone({ when: t, type: 'sine', freq: 70, to: 46, glide: 0.1, dur: 0.24, vol: 0.1 * v, bus: 'music' });
          if (b === 1 || b === 3) { A.shaker(t, 0.028 * v); CHORDS[bar].forEach((n, k) => A.pluck(A.note(n), { when: t + k * 0.014, vol: 0.045 * v, damp: 0.99, lp: 2400, bus: 'music' })); }
          if (inten > 0) A.shaker(t + 30 / BED.bpm, 0.016 * v);
          BED.i++; BED.next += 60 / BED.bpm;
        }
      }
      let squeak = null;
      S.onDestroy(() => { if (squeak) squeak.stop(); });

      /* ---------------- popping ---------------- */
      const anims = [], flecks = [], letters = [], rings = [];
      let TSC = 1, TSCT = 1;
      const ST = { chainBest: 0, specials: 0, firstWord: false, firstSpecial: false, ratatatSaid: false, idleT: 0, s3hits: 0, s3total: 0 };
      function setCount() { rxNum.textContent = String(N); }
      function popCell(sh, c, o) {
        o = o || {};
        if (!c || c.state !== 'full' || phase === 'end') return false;
        c.state = 'flat'; sh.dirty = true; N++; setCount();
        const x = c.x + sh.ox, y = c.y + sh.oy, pan = (x / G.w - 0.5) * 0.8;
        popSound(o.freq || noteAt(c.x, sh), o.vol, pan, { special: c.kind, round: o.round });
        anims.push({ x, y, r: sh.r, kind: c.kind, t0: performance.now(), round: !!o.round });
        const n = red() ? 3 : (o.round ? 4 : 7);
        for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = (o.round ? 40 : 90) + Math.random() * 120; flecks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, life: 0.55 + Math.random() * 0.4, age: 0, s: 2 + Math.random() * 3.5, col: o.round ? (c.breath === 'in' ? '#bfffe9' : '#ffe0c8') : '#ffffff' }); }
        rings.push({ x, y, r0: sh.r * 0.6, r1: sh.r * 1.7, life: 0.32, age: 0, col: c.kind === 'golden' ? '#ffd36b' : c.kind === 'heart' ? '#ff8fb8' : o.round ? (c.breath === 'in' ? '#9ff5d8' : '#ffc2a0') : '#ffffff' });
        if (c.kind) specialFx(c, x, y);
        return true;
      }
      function specialFx(c, x, y) {
        ST.specials++;
        if (c.kind === 'golden') P.emit('star', x, y, 12, { colors: ['#fff3c4', '#ffd36b', '#ffb84a'], speed: [60, 180] });
        if (c.kind === 'glitter') P.emit('star', x, y, 16, { colors: ['#ffffff', '#ffc4e8', '#bfe9ff', '#ffe58a'], speed: [40, 200] });
        if (c.kind === 'heart') for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6, sp = 60 + Math.random() * 90; letters.push({ heart: true, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: (Math.random() - 0.5) * 0.6, vr: (Math.random() - 0.5) * 2, life: 1.1, age: 0, s: 7 + Math.random() * 5, col: ['#ff8fb8', '#ff6fa5', '#ffc4d8'][i % 3] }); }
        if (!ST.firstSpecial) {
          ST.firstSpecial = true;
          const nm = SPECIAL_NAME[c.kind];
          say(sync, line({ Jolly: 'Ooh, a ' + nm.toLowerCase() + '! Today’s special.', Cheeky: nm + '. Fancy. Today only, then they swap.', Unfiltered: nm + '. Today’s special.' }), 2600, 'wow');
        }
      }
      function popPill(sh, p, o) {
        if (!p || p.state !== 'full' || phase === 'end') return false;
        p.state = 'flat'; sh.dirty = true;
        p.cells.forEach(c => { c.state = 'flat'; });
        N += p.cells.length; setCount();
        const x = p.x + sh.ox, y = p.y + sh.oy, pan = (x / G.w - 0.5) * 0.8;
        popSound(noteAt(p.x1, sh), 1, pan); if (A.ctx) S.later(() => popSound(noteAt(p.x2, sh) * 1.5, 0.8, pan), 70);
        rings.push({ x, y, r0: sh.r, r1: p.len * 0.7, life: 0.4, age: 0, col: '#ffd0f0' });
        for (let i = 0; i < (red() ? 4 : 12); i++) { const a = Math.random() * TAU, sp = 80 + Math.random() * 160; flecks.push({ x: x + (Math.random() - 0.5) * p.len * 0.8, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, life: 0.6 + Math.random() * 0.4, age: 0, s: 2 + Math.random() * 4, col: '#ffffff' }); }
        burstLetters(p.label, x, y, p.el ? Math.min(p.len - 18, textW(p.label) - 26) : 120, 15, o && o.slow);
        if (p.el) { p.el.remove(); p.el = null; }
        if (!ST.firstWord) {
          ST.firstWord = true;
          S.later(() => { if (phase === 's1' || phase === 's2') say(sync, gentle({ Jolly: 'Pop! Just letters now.', Cheeky: 'Look at that thought. Confetti.', Unfiltered: 'Gone to letters.' }), 2200, 'laugh'); }, 250);
        }
        return true;
      }
      function burstLetters(label, x, y, width, size, slow) {
        const chars = Array.from(label), n = chars.length, D = K.dark();
        chars.forEach((ch, i) => {
          if (ch === ' ') return;
          const lx = x + (n > 1 ? (i / (n - 1) - 0.5) * width : 0), a = Math.atan2(-1.2, (lx - x) / Math.max(1, width) * 2) + (Math.random() - 0.5) * 0.9, sp = (slow ? 40 : 110) + Math.random() * (slow ? 60 : 160);
          letters.push({ ch, x: lx, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: 0, vr: (Math.random() - 0.5) * (slow ? 2 : 9), life: slow ? 2.6 : 1.2, age: 0, s: size, col: D ? '#ffffff' : '#3a1f5c', grav: slow ? 60 : 380 });
        });
      }
      function hitTest(sh, x, y) {
        if (!sh || sh.dead) return null;
        const lx = x - sh.ox, ly = y - sh.oy, r = sh.r * 1.12;
        for (const p of sh.pills) { if (p.state !== 'full') continue; const cx = K.clamp(lx, p.x1, p.x2); if (Math.hypot(lx - cx, ly - p.y) <= r) return { pill: p }; }
        let best = null, bd = r;
        for (const c of sh.cells) { if (c.pill) continue; const d = Math.hypot(lx - c.x, ly - c.y); if (d < bd) { bd = d; best = c; } }
        return best ? { cell: best } : null;
      }
      function popAt(x, y, o) {
        const hh = hitTest(cur, x, y);
        if (!hh) return false;
        if (hh.pill) return popPill(cur, hh.pill, o);
        return popCell(cur, hh.cell, o);
      }

      /* ---------------- input (multi-touch: every finger pops) ---------------- */
      const ptrs = new Map();
      S.listen(hitEl, 'pointerdown', (e) => {
        if (e.button > 0) return;
        e.preventDefault();
        try { hitEl.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
        const p = K.local(e, el);
        ptrs.set(e.pointerId, { x: p.x, y: p.y, chain: 0 });
        ST.idleT = 0;
        if (phase === 's1') { if (!popAt(p.x, p.y)) tapMiss(p); }
        else if (phase === 's2') { const st = ptrs.get(e.pointerId); if (popAt(p.x, p.y, chainNote(st))) bumpChain(st, p); else tapMiss(p); }
        else if (phase === 's3') s3Tap(p);
        else if (phase === 'mega' && !MG.burst) { if (A.ctx) A.boing({ freq: 300, vol: 0.06 }); MG.wob = 0.6; K.guideDone(); }
      });
      S.listen(hitEl, 'pointermove', (e) => {
        const st = ptrs.get(e.pointerId); if (!st || phase !== 's2') return;
        const p = K.local(e, el);
        // pop every bubble along the finger's path since the last move (fast swipes skip nothing)
        const dx = p.x - st.x, dy = p.y - st.y, dist = Math.hypot(dx, dy), steps = Math.max(1, Math.ceil(dist / (cur.r * 0.6)));
        for (let i = 1; i <= steps; i++) { const x = st.x + dx * i / steps, y = st.y + dy * i / steps; if (popAt(x, y, chainNote(st))) bumpChain(st, { x, y }); }
        st.x = p.x; st.y = p.y;
      });
      const endPtr = (e) => { const st = ptrs.get(e.pointerId); if (!st) return; ptrs.delete(e.pointerId); if (phase === 's2') endChain(st); };
      S.listen(hitEl, 'pointerup', endPtr); S.listen(hitEl, 'pointercancel', endPtr); S.listen(hitEl, 'lostpointercapture', endPtr);
      function chainNote(st) { return { freq: A.ctx ? A.note(PENTA[Math.min(PENTA.length - 1, (st ? st.chain : 0) % 12)]) : 0 }; }
      function bumpChain(st, p) {
        st.chain++;
        if (st.chain >= 3) {
          chainEl.textContent = '×' + st.chain;
          chainEl.style.left = K.clamp(p.x, 40, G.w - 40) + 'px'; chainEl.style.top = Math.max(G.hitY + 24, p.y - 46) + 'px';
          if (chainEl.getAnimations) chainEl.getAnimations().forEach(a => a.cancel());
          chainEl.animate([{ opacity: 1, scale: 1.25 }, { opacity: 1, scale: 1, offset: 0.25 }, { opacity: 0, scale: 0.9 }], { duration: 650, easing: 'ease-out' });
        }
      }
      function endChain(st) {
        if (st.chain > ST.chainBest) ST.chainBest = st.chain;
        if (st.chain >= 6) {
          K.pop('RATATAT!', { x: G.w / 2, y: G.box.y + 40, kind: 'great' });
          if (!ST.ratatatSaid) { ST.ratatatSaid = true; say(sync, line({ Jolly: 'That was a drum roll!', Cheeky: 'Machine-gun pop. Very therapeutic. Very loud.', Unfiltered: 'Ratatat. Nice.' }), 2200, 'celebrate'); }
          else { sync.face('laugh', 900); sync.react('bounce'); }
        }
        st.chain = 0;
      }
      function tapMiss(p) { if (A.ctx) A.click({ vol: 0.05 }); P.emit('dust', p.x, p.y, 4, { colors: [K.dark() ? 'rgba(200,220,255,0.5)' : 'rgba(80,120,130,0.4)'] }); }
      K.onKey(['Space', 'Enter'], (e) => {
        if (e.repeat || (e.target && e.target === megaBtn)) return;
        if (phase === 's1' || phase === 's2') {
          const c = cur.cells.find(x => x.state === 'full' && !x.pill), p = cur.pills.find(x => x.state === 'full');
          e.preventDefault();
          if (p && (!c || Math.random() < 0.2)) popPill(cur, p); else if (c) popCell(cur, c);
        } else if (phase === 's3') { e.preventDefault(); const nb = s3Next(); if (nb) s3Tap({ x: nb.c.x + cur.ox, y: nb.c.y + cur.oy }); }
      });

      /* ---------------- flow ---------------- */
      function say(c, txt, ms, mood) { (c === sync ? loopie : sync).hush(); c.say(txt, { ms: ms || 2600, mood: mood || undefined }); if (mood) S.later(() => { if (phase !== 'end') c.face(c === sync ? syncBase() : loopieBase()); }, (ms || 2600) + 150); }
      const syncBase = () => (phase === 's3' ? 'calm' : phase === 's2' ? 'happy' : 'laugh');
      const loopieBase = () => (phase === 's3' ? 'calm' : 'silly');
      async function slideTo(kind) {
        const old = cur;
        const nw = makeSheet(kind); placeSheet(nw); renderSheet(nw);
        nw.oy = G.h * 0.9; cur = nw; prev = old; positionWords();
        if (A.ctx) { for (let i = 0; i < 5; i++) A.paper({ when: A.now() + i * 0.06, vol: 0.06, freq: 2000 + i * 500 }); A.whoosh({ vol: 0.07, dur: 0.6 }); A.sync('slide', performance.now()); }
        await K.anim(red() ? 200 : 850, (k) => { const e = K.ease.inOutCubic(k); if (old) old.oy = -e * G.h * 0.95; nw.oy = (1 - e) * G.h * 0.9; positionWords(); });
        if (old) { old.dead = true; old.labels.forEach(l => l.remove()); }
        prev = null; nw.oy = 0; positionWords();
      }
      async function sheetDone() {
        if (phase === 's1') {
          phase = 'move'; K.guide(null);
          say(sync, line({ Jolly: 'Lovely and flat. Next sheet!', Cheeky: 'Sheet one: destroyed. Sheet two: nervous.', Unfiltered: 'Next sheet.' }), 1800, 'celebrate');
          BED.bpm = 112;
          await slideTo('s2'); startS2();
        } else if (phase === 's2') {
          phase = 'move'; K.guide(null);
          await K.sleep(350);
          await slideAway();
          startMega();
        }
      }
      async function slideAway() {
        const old = cur;
        if (A.ctx) { A.whoosh({ vol: 0.07, dur: 0.6 }); for (let i = 0; i < 4; i++) A.paper({ when: A.now() + i * 0.07, vol: 0.05 }); }
        await K.anim(red() ? 200 : 700, (k) => { old.oy = -K.ease.inOutCubic(k) * G.h * 0.95; positionWords(); });
        old.dead = true; old.labels.forEach(l => l.remove());
        cur = null;
      }
      // the hand demonstrates on a low, central bubble and its label sits below the sheet, so it never covers the words
      function guideS1() { K.guide({ id: 's1', g: 'tap', target: () => { const c = guideCell(); return c ? { x: c.x + cur.ox, y: c.y + cur.oy } : null; }, label: 'TAP TO POP', place: 'below', delay: 500 }); }
      function guideCell() {
        if (!cur || cur.dead) return null;
        const cx = cur.rect.x + cur.rect.w / 2;
        let best = null, bs = -Infinity;
        for (const c of cur.cells) { if (c.state !== 'full' || c.pill) continue; const sc = c.y - Math.abs(c.x - cx) * 1.6; if (sc > bs) { bs = sc; best = c; } }
        return best;
      }
      function startS1() {
        phase = 's1';
        rxText.textContent = 'Sheet 1 · tap to pop';
        BED.on = true;
        say(sync, line({ Jolly: 'Doctor’s orders: pop everything. Each one plays a note.', Cheeky: 'Prescription: one sheet of bubble wrap. Side effects: smugness.', Unfiltered: 'Pop them. All of them. Go.' }), 3600);
        guideS1();
      }
      function lastRow() {
        if (!cur) return null;
        let r = -1; cur.cells.forEach(c => { if (c.state === 'full' && c.r > r) r = c.r; });
        if (r < 0) return null;
        const row = cur.cells.filter(c => c.r === r && c.state === 'full').sort((a, b) => a.x - b.x);
        return { y: row[0].y, x1: row[0].x, x2: row[row.length - 1].x, r };
      }
      function firstRow() {
        if (!cur) return null;
        const rows = {};
        cur.cells.forEach(c => { if (c.state === 'full') (rows[c.r] = rows[c.r] || []).push(c); });
        const keys = Object.keys(rows).map(Number).sort((a, b) => a - b);
        if (!keys.length) return null;
        const row = rows[keys[0]].sort((a, b) => a.x - b.x);
        return { y: row[0].y, x1: row[0].x, x2: row[row.length - 1].x, r: keys[0] };
      }
      function guideS2() {
        const fr = lastRow(); if (!fr) return;
        const span = Math.max(80, cur.rect.w - cur.d * 1.4);
        K.guide({ id: 's2-' + fr.r, g: 'drag', dir: 'r', d: Math.round(span), target: () => { const f2 = lastRow(); return f2 ? { x: cur.rect.x + cur.d * 0.7 + cur.ox, y: f2.y + cur.oy } : null; }, label: 'SWIPE ALONG A ROW', delay: 400, ms: 1600 });
      }
      function startS2() {
        phase = 's2';
        rxText.textContent = 'Sheet 2 · swipe rows';
        say(sync, line({ Jolly: 'Sheet two: drag along a row and pop the whole line.', Cheeky: 'Now the pro move: swipe a row. Ratatat.', Unfiltered: 'Swipe rows. Ratatat.' }), 3200, 'happy');
        guideS2();
      }
      /* ---------------- the twist: the Mega Bubble ---------------- */
      const MG = { on: false, k: 0, active: false, scale: 0, burst: false, bt: 0, wob: 0, early: 0, said50: false, x: 0, y: 0 };
      function startMega() {
        phase = 'mega';
        rxText.textContent = 'Squeeze the big one';
        loopie.show(true);
        loopie.el.animate([{ scale: 0.2, opacity: 0 }, { scale: 1.12, opacity: 1, offset: 0.6 }, { scale: 1, opacity: 1 }], { duration: 620, easing: 'cubic-bezier(.2,1.2,.4,1)' });
        say(loopie, gentle({ Jolly: 'Psst. This big one keeps going round and round. Squeeze it?', Cheeky: 'Found the giant one. It’s been looping all day. Your turn.', Unfiltered: 'The big loop. Squeeze it till it goes.' }), 3800, 'silly');
        BED.lv = 0.4;
        MG.on = true; MG.scale = 0;
        megaWord.textContent = W.core.label;
        megaWord.className = 'pt-megaword' + (W.core.own ? ' gk-user' : '');
        megaWord.hidden = false; megaBtn.hidden = false;
        if (A.ctx) { A.tone({ type: 'sine', freq: 180, to: 420, glide: 0.6, dur: 0.7, vol: 0.12 }); A.noise({ filter: 'bandpass', freq: 500, to: 1400, dur: 0.6, vol: 0.05 }); A.sync('inflate', performance.now()); }
        K.anim(red() ? 150 : 900, (k) => { MG.scale = K.ease.outElastic(k); });
        const ms = [2000, 2600, 3200][inten];
        // the squeeze runs on real elapsed time (not frame count), so it feels the same on every device
        const H2 = { down: false, k: 0, last: performance.now(), ms, done: false };
        const hStart = () => {
          if (H2.done || MG.burst) return;
          H2.down = true; MG.active = true;
          if (A.ctx && !squeak) squeak = A.loop({ filter: 'bandpass', freq: 320, q: 3, bus: 'sfx' });
          if (squeak) squeak.level(0.04, 0.05);
          if (A.ctx) { A.tone({ type: 'triangle', freq: 260, to: 200, glide: 0.08, dur: 0.12, vol: 0.08 }); A.sync('squeeze', performance.now()); }
        };
        const hEnd = () => {
          if (!H2.down || H2.done) return;
          H2.down = false; MG.active = false;
          if (squeak) squeak.level(0.0001, 0.05);
          if (A.ctx) A.boing({ freq: 240 + H2.k * 200, vol: 0.1 });
          MG.wob = 1;
          if (H2.k > 0.08 && MG.early++ === 0) say(loopie, line({ Jolly: 'Hold on longer. It’s nearly there.', Cheeky: 'It bounced back. Classic loop. Again, longer.', Unfiltered: 'Longer.' }), 2200, 'confused');
        };
        K.press(megaBtn, { down: hStart, up: hEnd });
        S.listen(megaBtn, 'keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); hStart(); } });
        S.listen(megaBtn, 'keyup', (e) => { if (e.code === 'Space' || e.code === 'Enter') hEnd(); });
        K.loop(() => {
          if (H2.done) return;
          const now = performance.now(), dt = Math.min(0.25, (now - H2.last) / 1000); H2.last = now;
          H2.k = H2.down ? Math.min(1, H2.k + dt * 1000 / H2.ms) : Math.max(0, H2.k - dt * 1000 * 0.55 / H2.ms);
          MG.k = H2.k;
          if (squeak && H2.down) { squeak.level(0.03 + 0.1 * H2.k, 0.06); squeak.freq(320 + 1100 * H2.k, 0.05); }
          if (H2.down && H2.k > 0.5 && !MG.said50) { MG.said50 = true; say(sync, line({ Jolly: 'Keep squeezing… it’s wobbling!', Cheeky: 'It’s straining. You’re winning. Keep going.', Unfiltered: 'Nearly. Hold.' }), 2000, 'wow'); }
          if (H2.k >= 1) { H2.done = true; H2.down = false; burstMega(); }
        });
        K.guide({ id: 'mega', g: 'hold', target: megaBtn, oy: 0.1, place: 'above', label: 'HOLD TO SQUEEZE', delay: 900, ms: ms + 200 });
      }
      async function burstMega() {
        if (MG.burst) return;
        MG.burst = true; MG.bt = performance.now(); MG.active = false;
        K.guide(null);
        if (squeak) { squeak.stop(); squeak = null; }
        megaBtn.hidden = true;
        N++; setCount();
        // slow motion: the world runs at a fifth of its speed while the giant one lets go
        TSCT = red() ? 1 : 0.2; TSC = TSCT;
        if (A.ctx) {
          const t = A.now();
          A.tone({ when: t, type: 'sine', freq: 140, to: 34, glide: 1.3, dur: 1.8, vol: 0.5, attack: 0.004, verb: 0.5 });
          A.noise({ when: t, filter: 'lowpass', freq: 3000, to: 160, dur: 1.6, vol: 0.32, verb: 0.6 });
          A.noise({ when: t, filter: 'highpass', freq: 1600, dur: 0.05, vol: 0.4 });
          A.pad(['C3', 'G3', 'E4', 'B4'].map(n => A.note(n)), { when: t + 0.4, dur: 3.2, vol: 0.11, attack: 0.8 });
          A.sync('burst', performance.now());
        }
        const m = G.mega, mr = m.r;
        rings.push({ x: m.x, y: m.y, r0: mr * 0.8, r1: mr * 2.2, life: 0.9, age: 0, col: '#ffd0f4', w: 6 });
        rings.push({ x: m.x, y: m.y, r0: mr * 0.5, r1: mr * 1.6, life: 1.1, age: 0, col: '#bff6ff', w: 3 });
        for (let i = 0; i < (red() ? 10 : 34); i++) { const a = Math.random() * TAU, sp = 160 + Math.random() * 260; flecks.push({ x: m.x + Math.cos(a) * mr * 0.7, y: m.y + Math.sin(a) * mr * 0.7, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10, life: 1.3 + Math.random() * 0.6, age: 0, s: 3 + Math.random() * 6, col: ['#ffffff', '#ffd6f2', '#d6f7ff'][i % 3] }); }
        burstLetters(W.core.label, m.x, m.y, Math.min(mr * 1.3, textW(W.core.label) * 1.3), 21, true);
        megaWord.hidden = true;
        P.emit('star', m.x, m.y, 18, { colors: ['#fff', '#ffe58a', '#ffc4e8'], speed: [80, 260] });
        sync.face('surprised'); loopie.face('dizzy');
        await K.wait(red() ? 300 : 1500);
        TSCT = 1;
        if (care()) say(sync, 'That one’s heavy. You can set it down for a little while.', 3000, 'calm');
        else say(sync, line({ Jolly: 'PHEW. That one had a lot of air in it.', Cheeky: 'Biggest pop of the day. The neighbours heard that.', Unfiltered: 'Gone. Phew.' }), 2800, 'laugh');
        loopie.face('happy', 1600);
        MG.on = false;
        ctx.track('mega', { early: MG.early });
        await K.sleep(1700);
        startS3();
      }
      /* ---------------- the slow sheet: pop with the glow, four in, six out ---------------- */
      const B3 = [[56, 50], [60, 54, 50], [64, 58, 54, 50]][inten];
      let R3 = null;
      const s3Beats = [];
      async function startS3() {
        phase = 'move';
        BED.on = false;
        const nw = makeSheet('s3'); placeSheet(nw); renderSheet(nw); nw.fadeIn = 0; cur = nw; positionWords();
        if (A.ctx) { A.whoosh({ vol: 0.06, dur: 0.7 }); for (let i = 0; i < 4; i++) A.paper({ when: A.now() + i * 0.07, vol: 0.05 }); }
        sync.base('calm'); loopie.base('calm');
        rxText.textContent = 'Sheet 3 · pop the glow';
        el.style.setProperty('--pt-fillc', '#8ff0cf');
        say(sync, line({ Jolly: 'Last sheet is the slow one. Pop each bubble as it glows: in for four, out for six.', Cheeky: 'Slow sheet. Pop with the glow. Yes, slower than you want to. That’s the point.', Unfiltered: 'Pop with the glow. Four in, six out.' }), 4800);
        await K.anim(red() ? 200 : 900, (k) => { nw.fadeIn = K.ease.outCubic(k); });
        nw.fadeIn = null;
        phase = 's3';
        ST.s3total = nw.path.length;
        R3 = K.rhythm({ bpm: B3[0], ease: 0.3, onBeat: s3Beat });
        R3.start(1.1);
        K.guide({ id: 's3', g: 'tap', target: () => { const nb = s3Next(); return nb ? { x: nb.c.x + cur.ox, y: nb.c.y + cur.oy } : null; }, label: 'POP WITH THE GLOW', delay: 600, ms: 1000 });
      }
      function s3Beat(t, i) {
        const sh = cur; if (!sh || sh.kind !== 's3') return;
        const c = sh.path[i];
        if (!c) { if (R3.running) { R3.stop(); S.later(() => endS3(), Math.max(0, (t - A.now()) * 1000) + 300); } return; }
        if (i % 10 === 0) R3.set(B3[Math.min(B3.length - 1, Math.floor(i / 10))]);
        s3Beats.push({ t, i, c, hit: false });
        if (A.ctx) {
          const inP = c.breath === 'in';
          A.tone({ when: t, type: 'sine', freq: inP ? 1320 : 990, dur: 0.06, vol: 0.022, attack: 0.002, bus: 'music' });
          if (c.count === 0) A.pad((inP ? ['F3', 'A3', 'C4', 'E4'] : ['C3', 'G3', 'C4', 'E4']).map(n => A.note(n)), { when: t, dur: (inP ? 4 : 6) * 60 / R3.bpm + 0.8, vol: 0.075, attack: inP ? 1.6 : 0.6, lp: 1100 });
          if (c.count === 0 && !inP) A.pluck(A.note('C2'), { when: t, vol: 0.22, damp: 0.995, lp: 400, bus: 'music' });
        }
      }
      function s3List(vn) {
        const out = [];
        for (const b of s3Beats) if (b.t > vn - 0.9) out.push(b);
        if (R3 && R3.running && cur && cur.path) { const iv = 60 / R3.bpm; for (let k = 0; k < 4; k++) { const i = R3.index + k, c = cur.path[i]; if (!c) break; out.push({ t: R3.next + k * iv, i, c, hit: false, pred: true }); } }
        return out;
      }
      function s3Next() {
        const vn = vnow();
        for (const b of s3List(vn)) if (!b.hit && b.t > vn - 0.25 && b.c.state === 'full') return b;
        return null;
      }
      function s3Tap(p) {
        const hh = hitTest(cur, p.x, p.y);
        if (!hh || !hh.cell) { tapMiss(p); return; }
        const c = hh.cell;
        if (c.state !== 'full') { tapMiss(p); return; }
        const j = R3 && R3.running ? R3.judge() : null, bc = j && j.beat ? cur.path[j.beat.i] : null, b = j && j.beat ? s3Beats.find(x => x.i === j.beat.i) : null;
        const onTime = !!(bc && bc === c && (j.grade === 'perfect' || j.grade === 'good'));
        const inP = c.breath === 'in', note = A.note((inP ? IN_NOTES : OUT_NOTES)[Math.min(c.count, inP ? 3 : 5)]);
        popCell(cur, c, { round: true, freq: note, vol: onTime ? 1 : 0.7 });
        if (b) b.hit = true;
        if (onTime) { ST.s3hits++; P.emit('mote', c.x + cur.ox, c.y + cur.oy, 8, { colors: inP ? ['#d8fff2', '#9ff5d8'] : ['#fff0e2', '#ffc8a8'], speed: [20, 60] }); }
        if (ST.s3hits === 8) say(sync, line({ Jolly: 'Mmm. Slow pops are the best pops.', Cheeky: 'Look at you, popping responsibly.', Unfiltered: 'Good rhythm.' }), 2400, 'sleepy');
      }
      async function endS3() {
        if (phase !== 's3') return;
        phase = 'fold';
        K.guide(null);
        // anything the glow passed by deflates quietly, in a soft wave
        const left = cur.cells.filter(c => c.state === 'full');
        left.forEach((c, i) => S.later(() => { if (c.state === 'full') { c.state = 'flat'; cur.dirty = true; anims.push({ x: c.x + cur.ox, y: c.y + cur.oy, r: cur.r, t0: performance.now(), round: true, soft: true }); if (A.ctx && i % 2 === 0) A.tone({ type: 'sine', freq: 260 - i * 3, dur: 0.18, vol: 0.03 }); } }, i * 70));
        await K.wait(left.length * 70 + 400);
        finale();
      }

      /* ---------------- the finale: rainbow, paper crane, "You popped N" ---------------- */
      const CR = { on: false, poly: null, k: 0, wing: 0, x: 0, y: 0, s: 1, shimmer: 0, alpha: 1, fly: 0 };
      function polyOf(kind, w2, h2) {
        const s = Math.min(w2, h2);
        if (kind === 'rect') return [[-w2, -h2], [0, -h2], [w2, -h2], [w2, 0], [w2, h2], [0, h2], [-w2, h2], [-w2, 0]];
        if (kind === 'square') return [[-s, -s], [0, -s], [s, -s], [s, 0], [s, s], [0, s], [-s, s], [-s, 0]];
        if (kind === 'tri') return [[-s, -s], [-s * 0.5, -s * 0.5], [0, 0], [s * 0.5, s * 0.5], [s, s], [0, s], [-s, s], [-s, 0]];
        if (kind === 'kite') return [[0, -s * 1.2], [s * 0.28, -s * 0.6], [s * 0.55, 0], [s * 0.28, s * 0.5], [0, s], [-s * 0.28, s * 0.5], [-s * 0.55, 0], [-s * 0.28, -s * 0.6]];
        return [[-s * 1.22, -s * 0.98], [-s * 0.3, -s * 0.06], [0, -s * 0.16], [s * 0.34, -s * 0.04], [s * 1.12, -s * 0.62], [s * 0.5, s * 0.16], [s * 0.02, s * 0.52], [-s * 0.5, s * 0.16]];
      }
      const lerpPoly = (a, b, k) => a.map((p, i) => [p[0] + (b[i][0] - p[0]) * k, p[1] + (b[i][1] - p[1]) * k]);
      async function finale() {
        phase = 'end';
        const sh = cur;
        const pct = Math.round(100 * ST.s3hits / Math.max(1, ST.s3total));
        sync.base('rainbow'); loopie.base('happy');
        say(sync, line({ Jolly: 'Flat as a pancake. Now watch this…', Cheeky: 'All flat. Time for my favourite trick…', Unfiltered: 'All flat. Watch.' }), 2600, 'rainbow');
        // 1. the flat sheet shimmers into a rainbow
        if (A.ctx) for (let i = 0; i < 8; i++) A.tone({ when: A.now() + i * 0.09, type: 'sine', freq: A.note(PENTA[i + 2]) * 2, dur: 0.5, vol: 0.035, verb: 0.4 });
        await K.anim(red() ? 300 : 1400, (k) => { CR.shimmer = k; });
        // 2. it folds itself into a paper crane
        const R0 = sh.rect, w2 = R0.w / 2 * 0.86, h2 = R0.h / 2 * 0.86, s = Math.min(G.phone ? 92 : 120, Math.min(w2, h2) * 0.7);
        CR.on = true; CR.unit = s; CR.x = R0.x + R0.w / 2 + sh.ox; CR.y = R0.y + R0.h / 2 + sh.oy;
        const keys = [polyOf('rect', w2, h2), polyOf('square', s * 1.15, s * 1.15), polyOf('tri', s * 1.05, s * 1.05), polyOf('kite', s, s), polyOf('crane', s, s)];
        CR.poly = keys[0]; CR.alpha = 0; sh.fade = 1;
        rx.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' });
        const tx = G.w / 2, ty = G.phone ? G.h * 0.44 : G.h * 0.46;
        for (let st = 0; st < keys.length - 1; st++) {
          if (A.ctx) { A.paper({ vol: 0.14, freq: 1800 + st * 400, dur: 0.22 }); A.tone({ type: 'triangle', freq: 300 + st * 90, to: 360 + st * 90, glide: 0.1, dur: 0.14, vol: 0.05 }); A.sync('fold', performance.now()); }
          const a = keys[st], b = keys[st + 1], x0 = CR.x, y0 = CR.y;
          await K.anim(red() ? 120 : (st === 0 ? 620 : 420), (k) => { const e = K.ease.inOutCubic(k); CR.poly = lerpPoly(a, b, e); if (st === 0) { CR.alpha = Math.min(1, k * 2.2); sh.fade = 1 - Math.min(1, k * 1.6); } CR.x = x0 + (tx - x0) * e * (st === 0 ? 1 : 0.5); CR.y = y0 + (ty - y0) * e * (st === 0 ? 1 : 0.5); if (st === keys.length - 2) CR.wing = e; });
          P.emit('star', CR.x, CR.y, 6, { colors: RAINBOW, speed: [40, 120] });
        }
        CR.x = tx; CR.y = ty;
        CR.hover = 1;
        if (A.ctx) { ['E5', 'G5', 'C6'].forEach((n, i) => A.chime(A.note(n), { when: A.now() + i * 0.12, vol: 0.06, dur: 1.6 })); }
        P.emit('star', tx, ty, 16, { colors: RAINBOW, speed: [50, 150] });
        await K.wait(red() ? 300 : 1300);
        CR.hover = 0;
        // 3. it flaps and flies off
        if (A.ctx) { A.whoosh({ vol: 0.12, dur: 0.9, from: 300, to: 2400 }); A.sync('fly', performance.now()); }
        const fx0 = CR.x, fy0 = CR.y;
        K.anim(red() ? 300 : 2300, (k) => {
          CR.fly = k;
          const e = k * k * (3 - 2 * k);
          CR.x = fx0 + (G.w * 0.5 + 60) * e + Math.sin(k * 5) * 18 * (1 - k);
          CR.y = fy0 - (fy0 + 140) * e * e - Math.sin(k * Math.PI) * 30;
          CR.s = 1 - 0.45 * e;
          if (Math.random() < 0.6) P.emit('star', CR.x, CR.y, 1, { colors: RAINBOW, speed: [10, 40] });
        });
        await K.wait(red() ? 200 : 700);
        // 4. "You popped N"
        finalEl.style.top = (G.phone ? 138 : 62) + 'px';
        finalEl.animate([{ opacity: 0, translate: '-50% 12px', scale: 0.9 }, { opacity: 1, translate: '-50% 0', scale: 1 }], { duration: 600, easing: 'cubic-bezier(.2,1.3,.4,1)', fill: 'forwards' });
        const num = finalEl.querySelector('b');
        K.anim(red() ? 100 : 1100, (k) => { num.textContent = String(Math.round(N * K.ease.outCubic(k))); });
        sync.say(line({ Jolly: 'All done! Tomorrow’s sheet is a new shape.', Cheeky: 'Cured. Until tomorrow’s new shape.', Unfiltered: 'Done. New shape tomorrow.' }), { ms: 0, mood: 'rainbow' });
        await K.finale('stars', { colors: ['#ffe9f4', '#ffe58a', '#bff6ff', '#d9c8ff'], chord: ['C4', 'E4', 'G4', 'B4', 'D5'], ms: 2400 });
        num.textContent = String(N);
        // results: skill and the shift, never time spent
        const badges = [];
        const pb = K.best('rhythm', pct, 'higher');
        if (pb.isNew) badges.push('New best: ' + pct + '% in rhythm'); else if (pb.first && pct >= 50) badges.push('First slow sheet: ' + pct + '% in rhythm');
        const tier = K.tier(pct / 100); if (tier) badges.push(tier + ' rhythm');
        if (ST.specials) { const c = K.collect(SPECIAL_NAME[special]); badges.push((c.isNew ? 'Collected: ' : 'Found again: ') + SPECIAL_NAME[special] + ' (' + c.count + ' of 3)'); }
        if (visits >= 1 && visits < PACKS.length) badges.push('New pop sound: ' + pack);
        const cb = K.best('chain', ST.chainBest, 'higher'); if (cb.isNew && ST.chainBest >= 6) badges.push('Longest ratatat: ' + ST.chainBest);
        ctx.track('done', { popped: N, rhythm: pct, chain: ST.chainBest, specials: ST.specials });
        finished = true;
        ctx.finish({
          title: 'Popped flat, folded calm', mood: 'rainbow',
          lines: [N + ' bubbles popped, one giant one squeezed', 'Today’s ' + SHAPE_NAME[shape] + ', ' + pack.toLowerCase() + ' pops', pct >= 30 ? pct + '% of the slow sheet in rhythm' : 'Finished on the slow sheet, four in, six out'],
          share: 'Popped ' + N + ' bubbles and one giant worry.',
          badges
        });
      }

      /* ---------------- frame loop ---------------- */
      K.loop((dt, t) => {
        frameN++;
        const g = cv.g; if (!g || !BG) return;
        TSC += (TSCT - TSC) * Math.min(1, dt * (TSCT < 1 ? 30 : 2.2));
        const sdt = dt * TSC, now = performance.now();
        bedTick();
        [prev, cur].forEach(sh => { if (sh && !sh.dead && sh.dirty) renderSheet(sh); });
        if (phase === 's1' || phase === 's2') {
          ST.idleT += dt;
          const left = cur.cells.filter(c => c.state === 'full').length;
          if (left === 0) sheetDone();
          else if (ST.idleT > 4.5 && left <= Math.max(2, Math.round(cur.cells.length * 0.12))) { ST.idleT = 0; autoFinish(); }
          if (phase === 's2' && !ptrs.size && Math.floor(t * 4) % 8 === 0) { const fr = lastRow(); if (fr && fr.r !== ST.guideRow) { ST.guideRow = fr.r; guideS2(); } }
        }
        if (phase === 'intro' && frameN > 3) return;
        if (finished && frameN % 3) return;
        draw(g, dt, sdt, t, now);
      });
      function autoFinish() {
        // the last few stragglers pop themselves in a little ratatat, so a sheet never drags on
        const left = cur.cells.filter(c => c.state === 'full' && !c.pill), pills = cur.pills.filter(p => p.state === 'full');
        pills.forEach((p, i) => S.later(() => popPill(cur, p), i * 90));
        left.forEach((c, i) => S.later(() => popCell(cur, c, { vol: 0.7 }), (pills.length + i) * 80));
      }
      function draw(g, dt, sdt, t, now) {
        const w = G.w, H = G.h;
        g.drawImage(BG.c, 0, 0, w, H);
        [prev, cur].forEach(sh => {
          if (!sh || sh.dead || !sh.cache) return;
          if (sh.fade != null && sh.fade <= 0.01) return;
          g.globalAlpha = sh.fade != null ? sh.fade : 1;
          if (sh.fadeIn != null) {
            const k = sh.fadeIn, sc = 0.9 + 0.1 * k, cx = sh.rect.x + sh.rect.w / 2, cy = sh.rect.y + sh.rect.h / 2;
            g.globalAlpha = k; g.save(); g.translate(cx, cy); g.scale(sc, sc); g.drawImage(sh.cache.c, -sh.rect.w / 2, -sh.rect.h / 2, sh.cache.w, sh.cache.h); g.restore();
          } else g.drawImage(sh.cache.c, sh.rect.x + sh.ox, sh.rect.y + sh.oy, sh.cache.w, sh.cache.h);
          g.globalAlpha = 1;
          if (sh.kind === 's3' && phase === 's3') drawGlow(g, sh);
          if (CR.shimmer > 0) drawShimmer(g, sh, t, sh.fade != null ? sh.fade : 1);
        });
        drawAnims(g, now);
        if (MG.on) drawMega(g, t, now);
        if (CR.on) drawCrane(g, t);
        drawBits(g, sdt);
        P.update(sdt); P.draw(g);
      }
      function drawGlow(g, sh) {
        const vn = vnow(), lead = R3 ? 60 / R3.bpm : 1, D = K.dark();
        for (const b of s3List(vn)) {
          const dtb = b.t - vn;
          if (dtb > lead * 1.6 || dtb < -lead * 0.8 || b.c.state !== 'full') continue;
          const k = dtb > 0 ? 1 - dtb / (lead * 1.6) : 1 + dtb / (lead * 0.8);
          const x = b.c.x + sh.ox, y = b.c.y + sh.oy, r = sh.r * (1.1 + 1.0 * Math.pow(Math.max(0, k), 2)), inP = b.c.breath === 'in';
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.max(0, Math.min(1, k)) * (D ? 0.95 : 0.8);
          g.drawImage(inP ? SP.glowIn : SP.glowOut, x - r, y - r, r * 2, r * 2);
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        }
        // the path ahead, dimly: the next few bubbles in line glow faintly so the snake is readable
        const nb = s3Next();
        if (nb) for (let i = nb.i + 1; i < Math.min(sh.path.length, nb.i + 4); i++) { const c = sh.path[i]; if (c.state !== 'full') continue; g.globalAlpha = 0.18 * (1 - (i - nb.i) / 4); g.drawImage(c.breath === 'in' ? SP.glowIn : SP.glowOut, c.x + sh.ox - sh.r * 1.2, c.y + sh.oy - sh.r * 1.2, sh.r * 2.4, sh.r * 2.4); }
        g.globalAlpha = 1;
        // breath meter on the label
        if (nb) {
          const inP = nb.c.breath === 'in', n = inP ? 4 : 6, cnt = nb.c.count + 1;
          const txt = (inP ? 'Breathe in · ' : 'Breathe out · ') + cnt + ' of ' + n;
          if (rxText.textContent !== txt) { rxText.textContent = txt; el.style.setProperty('--pt-fillc', inP ? '#8ff0cf' : '#ffb894'); }
          rx.style.setProperty('--fill', (inP ? cnt / 4 : 1 - (cnt - 1) / 6).toFixed(3));
        }
      }
      function drawShimmer(g, sh, t, fade) {
        const k = CR.shimmer, band = k * (sh.rect.w + sh.rect.h) * 1.2;
        g.globalCompositeOperation = 'lighter';
        for (const c of sh.cells) {
          const d = (c.x - sh.rect.x) + (c.y - sh.rect.y), a = Math.max(0, 1 - Math.abs(d - band) / 140);
          const b = Math.min(1, k * 1.6) * 0.55;
          const hi = Math.floor(((d / 60) + t * 2) % RAINBOW.length + RAINBOW.length) % RAINBOW.length;
          const alpha = Math.min(1, a + b) * fade;
          if (alpha < 0.03) continue;
          g.globalAlpha = alpha; const r = sh.r * 1.4;
          g.drawImage(SP.hue[hi], c.x + sh.ox - r, c.y + sh.oy - r, r * 2, r * 2);
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      function drawAnims(g, now) {
        for (let i = anims.length - 1; i >= 0; i--) {
          const a = anims[i], k = (now - a.t0) / (a.soft ? 420 : 260);
          if (k >= 1) { anims.splice(i, 1); continue; }
          // the dome squashes, then collapses into its wrinkled flat
          const sq = k < 0.3 ? k / 0.3 : 1, col = k < 0.3 ? 1 : 1 - (k - 0.3) / 0.7;
          const s = dome(a.r, a.kind);
          g.save(); g.translate(a.x, a.y); g.scale(1 + 0.16 * sq, 1 - 0.3 * sq); g.globalAlpha = Math.max(0, col) * (a.soft ? 0.7 : 1);
          g.drawImage(s.c, -s.r - s.pad, -s.r - s.pad, (s.r + s.pad) * 2, (s.r + s.pad) * 2);
          g.restore();
        }
        g.globalAlpha = 1;
      }
      function drawMega(g, t, now) {
        const m = G.mega, D = K.dark();
        if (MG.burst) return;
        MG.wob *= 0.92;
        const k = MG.k, shake = k > 0.72 && !red() ? (Math.random() - 0.5) * 4 * (k - 0.72) / 0.28 : 0;
        const sx = MG.scale * (1 + 0.16 * k + Math.sin(t * 20) * 0.03 * MG.wob), sy = MG.scale * (1 - 0.22 * k - Math.sin(t * 20) * 0.03 * MG.wob);
        const s = dome(m.r, ''), x = m.x + shake, y = m.y + m.r * 0.22 * k;
        g.save(); g.translate(x, y); g.scale(sx, sy);
        g.drawImage(s.c, -s.r - s.pad, -s.r - s.pad, (s.r + s.pad) * 2, (s.r + s.pad) * 2);
        if (k > 0.02) {
          // pressure: the plastic flushes pink and a thumb dent appears on top
          g.globalCompositeOperation = D ? 'lighter' : 'source-over';
          const pr = g.createRadialGradient(0, 0, m.r * 0.2, 0, 0, m.r);
          pr.addColorStop(0, 'rgba(255,120,190,' + (0.22 * k).toFixed(3) + ')'); pr.addColorStop(1, 'rgba(255,120,190,' + (0.08 * k).toFixed(3) + ')');
          g.fillStyle = pr; g.beginPath(); g.arc(0, 0, m.r, 0, TAU); g.fill();
          g.globalCompositeOperation = 'source-over';
          g.fillStyle = 'rgba(40,0,60,' + (0.16 * k).toFixed(3) + ')'; g.beginPath(); g.ellipse(0, -m.r * 0.78, m.r * 0.3 * k + 6, m.r * 0.1 * k + 2, 0, 0, TAU); g.fill();
        }
        g.restore();
        megaWord.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + Math.max(0.01, sx).toFixed(3) + ',' + Math.max(0.01, sy).toFixed(3) + ')';
        megaWord.style.letterSpacing = (0.02 + 0.12 * k).toFixed(3) + 'em';
        if (k > 0.5 && Math.random() < 0.2 * k && !red()) P.emit('dust', x + (Math.random() - 0.5) * m.r * 2 * sx, y + m.r * sy * 0.9, 1, { colors: ['rgba(255,220,250,0.6)'] });
      }
      function drawCrane(g, t) {
        if (!CR.poly) return;
        const pts = CR.poly, s = CR.s;
        let minX = Infinity, maxX = -Infinity; pts.forEach(p => { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); });
        g.save(); g.translate(CR.x, CR.y); g.scale(s, s); g.globalAlpha = CR.alpha;
        const gr = g.createLinearGradient(minX, 0, maxX, 0); RAINBOW.forEach((c, i) => gr.addColorStop(i / (RAINBOW.length - 1), c));
        // wings (behind and in front of the body), lifted as the last fold lands, then flapping
        const flap = CR.fly > 0 ? Math.sin(t * 12) : CR.hover > 0 ? Math.sin(t * 5.5) * 0.8 : 0.6, wk = CR.wing, sz = CR.unit || 60;
        const wing = (dx, tipX, light) => {
          if (wk <= 0) return;
          const up = flap * 0.5 + 0.5, ty = (-1.55 + 1.85 * (1 - up)) * sz * wk, tx = (tipX + 0.25 * (1 - up)) * sz * wk;
          g.beginPath(); g.moveTo(-sz * 0.36 + dx, -sz * 0.12); g.lineTo(sz * 0.44 + dx, -sz * 0.1); g.lineTo(tx + dx, ty); g.closePath();
          g.fillStyle = gr; g.globalAlpha = (light ? 0.97 : 0.7) * CR.alpha; g.fill(); g.globalAlpha = CR.alpha;
          g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.6 / s; g.stroke();
          g.strokeStyle = 'rgba(60,20,90,0.22)'; g.lineWidth = 1.2 / s; g.beginPath(); g.moveTo(sz * 0.04 + dx, -sz * 0.11); g.lineTo(tx + dx, ty); g.stroke();
        };
        wing(5, 0.62, false);
        g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
        g.fillStyle = gr; g.fill();
        g.fillStyle = 'rgba(40,0,80,0.12)'; g.beginPath(); g.moveTo(pts[2][0], pts[2][1]); g.lineTo(pts[5][0], pts[5][1]); g.lineTo(pts[6][0], pts[6][1]); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2 / s; g.lineJoin = 'round';
        g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.stroke();
        wing(-5, 0.12, true);
        if (wk > 0.3) {
          // the head: a little folded beak bent down at the tip of the neck
          const hx = pts[0][0], hy = pts[0][1];
          g.globalAlpha = CR.alpha * Math.min(1, (wk - 0.3) / 0.4);
          g.beginPath(); g.moveTo(hx + sz * 0.06, hy + sz * 0.02); g.lineTo(hx - sz * 0.22, hy + sz * 0.2); g.lineTo(hx + sz * 0.1, hy + sz * 0.12); g.closePath();
          g.fillStyle = RAINBOW[0]; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.4 / s; g.stroke();
        }
        g.restore();
      }
      function drawBits(g, sdt) {
        const D = K.dark();
        for (let i = flecks.length - 1; i >= 0; i--) {
          const f = flecks[i]; f.age += sdt; if (f.age >= f.life) { flecks.splice(i, 1); continue; }
          f.vy += 420 * sdt; f.vx *= Math.pow(0.9, sdt * 60 * 0.1); f.x += f.vx * sdt; f.y += f.vy * sdt; f.rot += f.vr * sdt;
          g.save(); g.translate(f.x, f.y); g.rotate(f.rot); g.globalAlpha = (1 - f.age / f.life) * 0.9;
          g.fillStyle = f.col; g.beginPath(); g.moveTo(-f.s, -f.s * 0.4); g.lineTo(f.s * 0.8, -f.s * 0.6); g.lineTo(f.s * 0.3, f.s * 0.6); g.closePath(); g.fill();
          if (!D) { g.strokeStyle = 'rgba(40,90,100,0.35)'; g.lineWidth = 0.8; g.stroke(); }
          g.restore();
        }
        for (let i = rings.length - 1; i >= 0; i--) {
          const r = rings[i]; r.age += sdt; if (r.age >= r.life) { rings.splice(i, 1); continue; }
          const k = r.age / r.life, rad = r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - k, 2));
          g.strokeStyle = r.col; g.globalAlpha = (1 - k) * 0.8; g.lineWidth = (r.w || 2.5) * (1 - k * 0.6);
          g.beginPath(); g.arc(r.x, r.y, rad, 0, TAU); g.stroke();
        }
        g.globalAlpha = 1;
        if (letters.length) g.textAlign = 'center', g.textBaseline = 'middle';
        for (let i = letters.length - 1; i >= 0; i--) {
          const L = letters[i]; L.age += sdt; if (L.age >= L.life) { letters.splice(i, 1); continue; }
          L.vy += (L.heart ? 160 : (L.grav || 380)) * sdt; L.x += L.vx * sdt; L.y += L.vy * sdt; L.rot += L.vr * sdt;
          g.save(); g.translate(L.x, L.y); g.rotate(L.rot); g.globalAlpha = Math.min(1, (1 - L.age / L.life) * 1.6);
          if (L.heart) { g.fillStyle = L.col; g.beginPath(); heartPath(g, 0, 0, L.s); g.fill(); }
          else { g.font = '800 ' + L.s + 'px "Bricolage Grotesque", Poppins, sans-serif'; g.fillStyle = L.col; if (!D) { g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3; g.strokeText(L.ch, 0, 0); } g.fillText(L.ch, 0, 0); }
          g.restore();
        }
        g.globalAlpha = 1;
      }

      /* ---------------- start ---------------- */
      (async () => {
        W = pickWords();
        if (!cur) { cur = makeSheet('s1'); placeSheet(cur); renderSheet(cur); positionWords(); }
        await K.intro({ title: 'Pop Therapy', sub: 'Three sheets of bubble wrap, prescribed by Sync. Some loud thoughts are hiding in there.', how: 'Tap to pop. Then swipe whole rows. Then pop slowly with the glow.', char: 'sync', mood: 'laugh' });
        ctx.track('start', { shape: SHAPES.indexOf(shape), special: ['golden', 'glitter', 'heart'].indexOf(special), visit: visits });
        startS1();
      })();

      return {
        async autoplay() {
          while (phase !== 's1') await K.wait(100);
          await K.wait(300);
          const local = (x, y) => ({ x, y: y - G.hitY });
          // sheet 1: tap every bubble and pillow, row by row
          let guard = 0;
          while (phase === 's1' && guard++ < 400) {
            // two thumbs at a time, the way people actually attack bubble wrap
            const singles = cur.cells.filter(x => x.state === 'full' && !x.pill).sort((a, b) => a.y - b.y || a.x - b.x);
            const targets = singles.slice(0, 2).map(c => ({ x: c.x, y: c.y }));
            if (!targets.length) { const pill = cur.pills.find(p => p.state === 'full'); if (pill) targets.push({ x: pill.x, y: pill.y }); }
            if (!targets.length) { await K.wait(120); continue; }
            const presses = [];
            for (const t of targets) { const p = local(t.x + cur.ox, t.y + cur.oy); presses.push(await K.sim.press(hitEl, p.x, p.y)); }
            await K.wait(70);
            presses.forEach(pr => pr.up());
            await K.wait(50);
          }
          while (phase !== 's2') await K.wait(100);
          await K.wait(400);
          guard = 0;
          while (phase === 's2' && guard++ < 60) {
            const fr = firstRow();
            if (!fr) { await K.wait(120); continue; }
            const a = local(cur.rect.x + cur.d * 0.25, fr.y), b = local(cur.rect.x + cur.rect.w - cur.d * 0.25, fr.y);
            await K.sim.drag(hitEl, a, b, 420, 12);
            await K.wait(100);
          }
          while (phase !== 'mega') await K.wait(100);
          await K.wait(1200);
          { const pr = await K.sim.press(megaBtn); let waited = 0; while (!MG.burst && waited < 40000) { await K.wait(100); waited += 100; } pr.up(); }
          while (phase !== 's3') await K.wait(100);
          guard = 0;
          while (phase === 's3' && guard++ < 4000) {
            const nb = s3Next();
            if (!nb) { await K.wait(30); continue; }
            const ms = (nb.t - vnow()) * 1000;
            if (ms > 16) { await K.wait(Math.min(ms - 10, 60)); continue; }
            const p = local(nb.c.x + cur.ox, nb.c.y + cur.oy);
            await K.sim.tap(hitEl, p.x, p.y);
          }
          while (!finished) await K.wait(200);
        }
      };
    }
  });
})(window.TSG_ENV);
