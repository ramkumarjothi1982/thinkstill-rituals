/* 009 Scale Shop — Reframe · REFRAME · Mental Overload / Working Memory
 * Mechanism: decatastrophising by scaling, the "catastrophe scale" (Beck; Leahy 2003): instead of asking how bad something
 * feels, the player weighs it against anchored everyday events (a stubbed toe 1, a flat tyre 3, a burst pipe 6), so the
 * felt 10 settles at a calibrated, honest weight. When the facts back the fear, the weight stays high and comes with a plan.
 * Verb: weigh (drag the parcel onto the brass scale, drag everyday items onto the other pan until the beam balances, wrap
 * the parcel to its real size).
 * Finale: the wrapped parcel is shelved among ordinary things, the shop bell rings and sunset light streams in.
 */
(function (env) {
  'use strict';
  (env.games = env.games || []).push({
    id: 'scale-shop', mode: 'reframe', name: 'Scale Shop', verb: 'weigh', family: 'REFRAME', minutes: 2,
    parents: ['Mental Overload / Working Memory', 'Uncertainty / Future Worry / Reassurance', 'Emotion'],
    cast: ['rush'], poster: { char: 'rush', mood: 'determined' },
    tagline: 'It feels like a 10. Weigh it against real things on a brass scale.',
    why: 'When a worry feels enormous: compare it with everyday mishaps to find its real weight.',
    css: `
.g-scale-shop { --ss-paper: #f3e3c4; --ss-ink: #3b2614; }
.g-scale-shop .ss-tag { position: absolute; z-index: 18; left: 0; top: 0; transform: translateX(-50%); display: flex; align-items: center; gap: 4px; padding: 3px 4px 3px 7px; border-radius: 6px 12px 12px 6px;
  background: linear-gradient(180deg, #f8ead0, #ecd4a8); color: var(--ss-ink); box-shadow: 0 3px 7px rgba(40, 20, 0, .35); pointer-events: none; white-space: nowrap; transition: opacity .25s ease, transform .25s ease; }
.g-scale-shop .ss-tag::before { content: ""; position: absolute; left: 3px; top: 50%; width: 4px; height: 4px; margin-top: -2px; border-radius: 50%; background: rgba(60, 35, 10, .45); }
.g-scale-shop .ss-tag span { font: 600 12px/1.08 var(--font-ui); max-width: var(--nw, 56px); white-space: normal; text-align: left; }
.g-scale-shop .ss-tag b { flex: none; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: #3b2614; color: #ffe6a8; font: 800 14px/1 var(--font-ui); }
.g-scale-shop .ss-tag.is-away { opacity: .45; }
.g-scale-shop .ss-tag.is-hint { box-shadow: 0 0 0 3px #ffd36b, 0 3px 7px rgba(40, 20, 0, .35); }
.g-scale-shop .ss-hit { position: absolute; z-index: 24; left: 0; top: 0; width: 72px; height: 66px; margin: -66px 0 0 -36px; padding: 0; border: 0; border-radius: 16px; background: transparent; cursor: grab; touch-action: none; appearance: none; }
.g-scale-shop .ss-hit:focus-visible { outline: 3px solid #ffd36b; outline-offset: 2px; }
.g-scale-shop .ss-phit { position: absolute; z-index: 25; left: 0; top: 0; padding: 0; border: 0; background: transparent; cursor: grab; touch-action: none; appearance: none; border-radius: 14px; }
.g-scale-shop .ss-phit:focus-visible { outline: 3px solid #ffd36b; outline-offset: 3px; }
.g-scale-shop .ss-plabel { position: absolute; z-index: 22; left: 0; top: 0; width: var(--w, 96px); transform: translate(-50%, -50%) rotate(-2deg); padding: 6px 7px 7px; border-radius: 4px; background: #fffdf6; color: #2b1d10;
  font: 700 15px/1.12 var(--font-ui); text-align: center; box-shadow: 0 2px 4px rgba(0, 0, 0, .25); pointer-events: none; text-wrap: balance; overflow-wrap: break-word; transition: opacity .35s ease; }
.g-scale-shop .ss-plabel small { display: block; font: 700 12px/1 var(--font-ui); letter-spacing: .12em; color: #b23a2a; margin-bottom: 3px; }
.g-scale-shop .ss-plabel.is-gone { opacity: 0; }
.g-scale-shop .ss-feels { position: absolute; z-index: 23; left: 0; top: 0; transform: translate(-50%, -50%) rotate(8deg); padding: 6px 9px; border-radius: 8px; border: 2.5px solid #d63a2a; color: #d63a2a; background: rgba(255, 248, 240, .94);
  font: 800 14px/1 var(--font-ui); letter-spacing: .06em; white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity .2s ease; box-shadow: 0 3px 8px rgba(0, 0, 0, .2); }
.g-scale-shop .ss-feels.on { opacity: 1; animation: ss-stamp .45s cubic-bezier(.2, 1.7, .4, 1) both; }
.g-scale-shop .ss-feels.is-weighed { border-color: #2f8a4f; color: #2f8a4f; }
.g-scale-shop .ss-feels s { opacity: .7; margin-right: 6px; }
@keyframes ss-stamp { from { transform: translate(-50%, -50%) rotate(8deg) scale(2.2); opacity: 0; } to { transform: translate(-50%, -50%) rotate(8deg); opacity: 1; } }
.g-scale-shop .ss-sum { position: absolute; z-index: 23; left: 0; top: 0; transform: translate(-50%, 0); padding: 5px 10px; border-radius: 999px; background: linear-gradient(180deg, #f6d27a, #c99632); color: #3b2614;
  font: 800 14px/1 var(--font-ui); white-space: nowrap; pointer-events: none; box-shadow: 0 3px 8px rgba(0, 0, 0, .3), inset 0 1px 0 rgba(255, 255, 255, .6); opacity: 0; transition: opacity .25s ease; }
.g-scale-shop .ss-sum.on { opacity: 1; }
.g-scale-shop .ss-dock { position: absolute; z-index: 32; left: 50%; top: 0; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 10px; width: min(calc(100% - 32px), 420px); }
.g-scale-shop .ss-btn { appearance: none; border: 0; cursor: pointer; min-height: 56px; padding: 0 26px; border-radius: 28px; font: 800 18px/1 var(--font-display); letter-spacing: .04em; color: #3b2614;
  background: linear-gradient(180deg, #ffe39a, #f2b53c); box-shadow: 0 5px 0 #a8701a, 0 14px 26px rgba(0, 0, 0, .3); transition: transform .1s ease, box-shadow .1s ease; }
.g-scale-shop .ss-btn:active { transform: translateY(3px); box-shadow: 0 2px 0 #a8701a, 0 8px 16px rgba(0, 0, 0, .3); }
.g-scale-shop .ss-btn:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.g-scale-shop .ss-btn.is-new { animation: ss-in .5s cubic-bezier(.2, 1.6, .4, 1) backwards; }
@keyframes ss-in { from { transform: scale(.5); opacity: 0; } to { transform: none; opacity: 1; } }
.g-scale-shop .ss-coupon { position: relative; display: block; width: 100%; margin: 0; padding: 12px 18px 10px 22px; border-radius: 10px; background: #fff7e6; color: #3b2614; box-shadow: 0 12px 26px rgba(0, 0, 0, .35);
  border: 2px dashed #c99632; animation: ss-coupon .6s cubic-bezier(.2, 1.3, .3, 1) both; appearance: none; cursor: pointer; text-align: left; font: inherit; }
.g-scale-shop .ss-coupon:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.g-scale-shop .ss-coupon em { display: block; margin-top: 7px; font: 700 12px/1 var(--font-ui); font-style: normal; letter-spacing: .14em; text-transform: uppercase; color: #a3550f; text-align: right; }
.g-scale-shop .ss-coupon::before, .g-scale-shop .ss-coupon::after { content: ""; position: absolute; top: 50%; width: 18px; height: 18px; margin-top: -9px; border-radius: 50%; background: var(--ss-notch, #3a2416); }
.g-scale-shop .ss-coupon::before { left: -10px; } .g-scale-shop .ss-coupon::after { right: -10px; }
.g-scale-shop .ss-coupon h3 { margin: 0 0 6px; font: 800 13px/1 var(--font-ui); letter-spacing: .16em; text-transform: uppercase; color: #a3550f; }
.g-scale-shop .ss-coupon ol { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 4px; font: 600 14px/1.3 var(--font-ui); }
.g-scale-shop .ss-coupon.is-taken { animation: ss-taken .55s cubic-bezier(.5, 0, .7, .4) both; }
.g-scale-shop .ss-receipt { position: relative; width: min(100%, 280px); padding: 10px 14px 16px; background: #fffdf7; color: #2b1d10; box-shadow: 0 14px 30px rgba(0, 0, 0, .4); font: 500 13px/1.3 var(--font-ui);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 8px), 95% 100%, 90% calc(100% - 8px), 85% 100%, 80% calc(100% - 8px), 75% 100%, 70% calc(100% - 8px), 65% 100%, 60% calc(100% - 8px), 55% 100%, 50% calc(100% - 8px), 45% 100%, 40% calc(100% - 8px), 35% 100%, 30% calc(100% - 8px), 25% 100%, 20% calc(100% - 8px), 15% 100%, 10% calc(100% - 8px), 5% 100%, 0 calc(100% - 8px));
  animation: ss-print 1.1s cubic-bezier(.2, .8, .3, 1) both; transform-origin: 50% 0; }
.g-scale-shop .ss-receipt h3 { margin: 0; text-align: center; font: 800 16px/1 var(--font-display); letter-spacing: .16em; }
.g-scale-shop .ss-receipt small { display: block; text-align: center; margin: 3px 0 6px; font: 600 12px/1 var(--font-ui); letter-spacing: .08em; text-transform: uppercase; color: #7a5a3a; }
.g-scale-shop .ss-receipt ul { margin: 0; padding: 5px 0; list-style: none; border-top: 1.5px dashed rgba(43, 29, 16, .35); border-bottom: 1.5px dashed rgba(43, 29, 16, .35); display: flex; flex-direction: column; gap: 4px; }
.g-scale-shop .ss-receipt li { display: flex; justify-content: space-between; gap: 10px; line-height: 1.22; }
.g-scale-shop .ss-receipt li b { font-weight: 700; text-align: right; }
.g-scale-shop .ss-receipt .ss-total { display: flex; justify-content: space-between; align-items: baseline; margin-top: 5px; font: 800 15px/1 var(--font-ui); text-transform: uppercase; letter-spacing: .06em; }
.g-scale-shop .ss-receipt .ss-total b { font: 800 22px/1 var(--font-display); }
.g-scale-shop .ss-receipt em { display: block; margin-top: 6px; text-align: center; font: 600 12px/1 var(--font-ui); font-style: normal; letter-spacing: .1em; text-transform: uppercase; color: #7a5a3a; }
@keyframes ss-print { from { transform: translateY(-24px) scaleY(.1); opacity: 0; } 30% { opacity: 1; } to { transform: none; opacity: 1; } }
@keyframes ss-coupon { from { transform: translateY(40px) scale(.9); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes ss-taken { to { transform: translateY(-260px) scale(.25) rotate(-12deg); opacity: 0; } }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const inten = ctx.intensity;
      const clamp = K.clamp, lerp = K.lerp, TAU = K.TAU;
      const RM = () => K.reduced();
      const visits = K.visits();

      /* ---------------- honest weight ---------------- */
      const care = () => an.safety === 'care';
      const strong = () => an.fear_support === 'strong';
      const serious = () => strong() || an.fear_support === 'some' || care();
      function trueWeight() {
        let t = strong() ? 6 : an.fear_support === 'some' ? 5 : ((an.intensity || 6) >= 8 ? 4 : 3);
        if (care()) t = Math.max(t, 5);
        return t;
      }
      let T = trueWeight();
      const trimEnd = (s) => String(s || '').replace(/[\s.!?…,;:]+$/, '').trim();
      let CONCL = K.words(trimEnd(an.conclusion || an.thought) || 'This is a disaster', 9);
      const ITEMS = [
        { id: 'toe', name: 'Stubbed toe', w: 1, the: 'a stubbed toe' }, { id: 'bus', name: 'Missed bus', w: 2, the: 'a missed bus' },
        { id: 'tyre', name: 'Flat tyre', w: 3, the: 'a flat tyre' }, { id: 'keys', name: 'Locked out', w: 3, the: 'getting locked out' },
        { id: 'phone', name: 'Cracked phone', w: 4, the: 'a cracked phone' }, { id: 'wallet', name: 'Lost wallet', w: 5, the: 'a lost wallet' },
        { id: 'pipe', name: 'Burst pipe', w: 6, the: 'a burst pipe' }, { id: 'arm', name: 'Broken arm', w: 7, the: 'a broken arm' }
      ].map((it, i) => Object.assign(it, { i, shelf: i < 4 ? 0 : 1, slot: i % 4, state: 'shelf', x: 0, y: 0, hx: 0, hy: 0, lift: 0, fly: null, panI: -1 }));
      const PAPERS = [
        { name: 'Gingham', base: '#e86a7e', ink: '#ffffff', pat: 'check', rib: '#fff3c4' }, { name: 'Starry night', base: '#2f3a8f', ink: '#ffe58a', pat: 'stars', rib: '#ffd36b' },
        { name: 'Kraft and twine', base: '#c79a68', ink: '#8a5a32', pat: 'twine', rib: '#f6efe2' }, { name: 'Polka dot', base: '#3fb8af', ink: '#ffffff', pat: 'dots', rib: '#ff6f91' },
        { name: 'Candy stripe', base: '#ff9ab5', ink: '#ffffff', pat: 'stripes', rib: '#e0407b' }, { name: 'Botanical', base: '#5f9e6e', ink: '#d9f2c7', pat: 'leaves', rib: '#fff3c4' },
        { name: 'Gold foil', base: '#d9a93e', ink: '#fff2b8', pat: 'foil', rib: '#7a2b2b' }, { name: 'Tartan', base: '#a33b3b', ink: '#2c3e70', pat: 'tartan', rib: '#f2d16b' }
      ];
      const PAPER = K.dailyPick(PAPERS, 5);
      const WEATHER = K.dailyPick(['sun', 'rain', 'snow', 'leaves', 'sun', 'rain'], 2);
      const OLD = K.collection().map(n => PAPERS.find(p => p.name === n)).filter(Boolean).slice(-6);

      /* ---------------- scene ---------------- */
      el.classList.add(K.dark() ? 'ss-dark' : 'ss-bright');
      const DPR = (el.clientWidth || 390) < 700 ? 1.5 : 2;
      const cv = K.canvas(el, { maxDpr: DPR });
      const bgCv = K.canvas(el, { maxDpr: DPR, before: true }); // the static shop: painted on resize only
      const P = K.particles({ max: inten === 2 ? 600 : 420 });
      const G = {
        stage: 'intro', a: 0.0, av: 0, swing: [0, 0], swv: [0, 0], felt: true, onPan: [], placed: 0, first: null, moves: 0,
        parcel: { state: 'away', x: -200, y: 0, s: 1, k: 0, wrap: 0, bow: 0, shrink: 0, sx: 0, sy: 0 }, drag: null, sunset: 0, bell: 0, shake: 0, balanced: false,
        lastCreak: 0, lastIB: -1, peanuts: [], cat: 0
      };
      const tags = ITEMS.map(it => { const t = h('div', { class: 'ss-tag' }, h('span', { text: it.name }), h('b', { text: String(it.w) })); el.append(t); it.tag = t; return t; });
      ITEMS.forEach(it => {
        it.hit = h('button', { type: 'button', class: 'ss-hit', 'aria-label': it.name + ', badness ' + it.w + '. Drag onto the right pan, or press Enter.' });
        el.append(it.hit);
        K.drag(it.hit, { space: el, start: (p) => grabItem(it, p), move: (p, d) => moveDrag(p, d), end: (p) => dropItem(it, p) });
        it.hit.addEventListener('click', (e) => { if (e.detail !== 0 || G.stage !== 'weigh') return; if (it.state === 'shelf') toPan(it); else if (it.state === 'pan') toShelf(it); });
      });
      const phit = h('button', { type: 'button', class: 'ss-phit', 'aria-label': 'The parcel. Drag it onto the left pan of the scale, or press Enter.' });
      const plabel = h('div', { class: 'ss-plabel' }, h('small', { text: 'CONTENTS' }), h('span', { class: 'gk-user', text: CONCL }));
      const feels = h('div', { class: 'ss-feels', text: 'FEELS LIKE 10' });
      const sum = h('div', { class: 'ss-sum', text: '' });
      const dock = h('div', { class: 'ss-dock' });
      const wrapBtn = h('button', { type: 'button', class: 'ss-btn', hidden: true, text: 'Wrap to size' });
      dock.append(wrapBtn);
      el.append(phit, plabel, feels, sum, dock);
      plabel.hidden = true;
      K.drag(phit, { space: el, start: (p) => grabParcel(p), move: (p, d) => moveDrag(p, d), end: (p) => dropParcel(p) });
      phit.addEventListener('click', (e) => { if (e.detail === 0 && G.stage === 'parcel') parcelToPan(); });

      const rush = K.character('rush', { side: 'right', mood: 'panic', x: 12, y: 700 });
      const LN = lines();
      // care topics (health, money, housing, legal): no jokes, so the Cheeky vibe borrows the gentler wording
      function say(o, so) { if (care() && o && o.Jolly) o = Object.assign({}, o, { Cheeky: o.Jolly }); return rush.say(ctx.line(o), Object.assign({ ms: 4200 }, so || {})); }
      const itemOf = (w) => ITEMS.filter(i => i.w === w)[0] || ITEMS.reduce((b, i) => Math.abs(i.w - w) < Math.abs(b.w - w) ? i : b, ITEMS[0]);

      /* ---------------- layout ---------------- */
      const L = { W: 390, H: 844, ph: true };
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return false;
        const ph = W < 700;
        L.W = W; L.H = H; L.ph = ph;
        L.s = ph ? 1.12 : 1.35;
        L.win = { w: ph ? W - 132 : Math.min(600, W * 0.5), h: ph ? 100 : 150, y: ph ? 66 : 64 };
        L.win.x = W / 2 - L.win.w / 2;
        L.sill = L.win.y + L.win.h + 10;
        L.bell = { x: L.win.x - (ph ? 26 : 40), y: L.win.y + 30 };
        L.slotW = ph ? (W - 20) / 4 : 150;
        L.shelfY = [ph ? 240 : 300, ph ? 330 : 418];
        L.pivot = { x: W / 2, y: ph ? 418 : 506 };
        L.bw = ph ? Math.min(124, W * 0.32) : 230;
        L.chain = ph ? 58 : 66;
        L.panW = ph ? 104 : 168;
        L.counterY = L.pivot.y + L.chain + (ph ? 70 : 74);
        L.deliver = { x: W / 2, y: L.counterY + (ph ? 150 : 150) };
        L.rushY = H - (ph ? 84 : 104) - 14;
        L.dockY = L.counterY + (ph ? 22 : 30);
        return true;
      }
      const slotX = (it) => L.W / 2 + (it.slot - 1.5) * L.slotW;
      function pos(node, x, y) {
        const xs = x.toFixed(1), ys = y.toFixed(1);
        if (node._px === xs && node._py === ys) return; // skip unchanged writes: no style or layout work
        node._px = xs; node._py = ys; node.style.left = xs + 'px'; node.style.top = ys + 'px';
      }
      function place() {
        if (!layout()) return;
        paintBG();
        ITEMS.forEach(it => {
          it.hx = slotX(it); it.hy = L.shelfY[it.shelf];
          if (it.state === 'shelf') { it.x = it.hx; it.y = it.hy; }
          pos(it.tag, it.hx, it.hy + 3); it.tag.style.setProperty('--nw', (L.ph ? 56 : 90) + 'px');
          it.hit.style.width = (L.slotW - 8) + 'px'; it.hit.style.height = (ph() ? 66 : 84) + 'px'; it.hit.style.marginLeft = -(L.slotW - 8) / 2 + 'px'; it.hit.style.marginTop = -(ph() ? 66 : 84) + 'px';
          if (it.state === 'shelf') pos(it.hit, it.hx, it.hy);
        });
        pos(dock, L.W / 2, L.dockY); dock.style.left = '50%';
        plabel.style.setProperty('--w', (L.ph ? 96 : 124) + 'px');
        rush.place(L.ph ? 10 : Math.max(16, L.W / 2 - 470), L.rushY);
        if (G.parcel.state === 'deliver' || G.parcel.state === 'away') { G.parcel.x = G.parcel.state === 'away' ? -200 : L.deliver.x; G.parcel.y = L.deliver.y; }
      }
      const ph = () => L.ph;

      /* ---------------- drawing helpers ---------------- */
      function rr(g, x, y, w, hh, r) { r = Math.min(r, w / 2, hh / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      function brass(g, x0, y0, x1, y1) { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, '#8a5a17'); gr.addColorStop(0.3, '#f7d77c'); gr.addColorStop(0.5, '#fff0b8'); gr.addColorStop(0.7, '#d9a43c'); gr.addColorStop(1, '#7a4c12'); return gr; }
      function wood(g, x0, y0, x1, y1, dark) { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, dark ? '#7a4a2a' : '#a8703f'); gr.addColorStop(1, dark ? '#4a2a16' : '#7d4c26'); return gr; }

      /* ---------------- static backdrop ---------------- */
      function paintBG() {
        const W = L.W, H = L.H, dpr = cv.dpr || 1, dark = K.dark();
        bgCv.fit(); if (!bgCv.g) return;
        const g = bgCv.g; g.setTransform(bgCv.dpr, 0, 0, bgCv.dpr, 0, 0); g.clearRect(0, 0, W, H); void dpr;
        // wallpaper with stripes and a tiny motif
        g.fillStyle = dark ? '#3a2a3a' : '#f6e7d2'; g.fillRect(0, 0, W, H);
        for (let x = 0; x < W; x += 28) { g.fillStyle = dark ? 'rgba(255,220,180,0.035)' : 'rgba(170,110,70,0.07)'; g.fillRect(x, 0, 12, H); }
        g.fillStyle = dark ? 'rgba(255,210,150,0.08)' : 'rgba(170,100,60,0.12)';
        for (let y = 20; y < L.counterY; y += 46) for (let x = 20 + ((y / 46) % 2) * 14; x < W; x += 28) { g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); }
        // window onto the street
        const w = L.win;
        g.fillStyle = dark ? '#2a1a14' : '#7b4a26'; rr(g, w.x - 10, w.y - 10, w.w + 20, w.h + 20, 10); g.fill();
        g.save(); rr(g, w.x, w.y, w.w, w.h, 6); g.clip();
        const sky = g.createLinearGradient(0, w.y, 0, w.y + w.h);
        if (dark) { sky.addColorStop(0, '#1b2350'); sky.addColorStop(1, '#4a3d6b'); } else { sky.addColorStop(0, WEATHER === 'rain' ? '#aab8c8' : WEATHER === 'snow' ? '#d6e2ee' : '#9ed4f5'); sky.addColorStop(1, WEATHER === 'rain' ? '#d4dbe3' : '#e8f4fb'); }
        g.fillStyle = sky; g.fillRect(w.x, w.y, w.w, w.h);
        // buildings across the street
        for (let i = 0; i < 7; i++) {
          const bx = w.x + i * w.w / 6 - 14, bh = w.h * (0.45 + ((i * 37) % 30) / 100), bw = w.w / 6 + 4;
          g.fillStyle = dark ? ['#2c2440', '#352a4a', '#2a2238'][i % 3] : ['#d9a58a', '#c98f7a', '#e2b99a'][i % 3];
          g.fillRect(bx, w.y + w.h - bh, bw, bh);
          g.fillStyle = dark ? 'rgba(255,214,140,0.75)' : 'rgba(255,255,255,0.6)';
          for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) if ((i + r + c) % 3 !== 0 || !dark) g.fillRect(bx + 8 + c * (bw / 2 - 4), w.y + w.h - bh + 10 + r * 18, 8, 10);
        }
        // pavement + lamp post
        g.fillStyle = dark ? '#241c2c' : '#b9a89a'; g.fillRect(w.x, w.y + w.h - 12, w.w, 12);
        const lx = w.x + w.w * 0.82; g.fillStyle = dark ? '#151020' : '#4a3a38'; g.fillRect(lx, w.y + w.h * 0.3, 3, w.h * 0.7);
        if (dark) { const lg = g.createRadialGradient(lx + 1, w.y + w.h * 0.3, 2, lx + 1, w.y + w.h * 0.3, 40); lg.addColorStop(0, 'rgba(255,220,150,0.7)'); lg.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = lg; g.fillRect(lx - 40, w.y, 80, 80); }
        g.restore();
        // mullion and mirrored lettering on the glass
        g.fillStyle = dark ? '#2a1a14' : '#7b4a26'; g.fillRect(W / 2 - 3, w.y, 6, w.h);
        g.save(); g.translate(W / 2, w.y + 22); g.scale(-1, 1); g.font = '800 ' + (L.ph ? 15 : 20) + 'px ' + FONT; g.textAlign = 'center'; g.fillStyle = 'rgba(255,214,107,0.85)';
        g.fillText('CORNER  SHOP', 0, 0); g.restore();
        // glass reflections
        g.save(); rr(g, w.x, w.y, w.w, w.h, 6); g.clip(); g.fillStyle = 'rgba(255,255,255,0.12)';
        g.beginPath(); g.moveTo(w.x + w.w * 0.1, w.y); g.lineTo(w.x + w.w * 0.22, w.y); g.lineTo(w.x + w.w * 0.08, w.y + w.h); g.lineTo(w.x - w.w * 0.04, w.y + w.h); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(w.x + w.w * 0.62, w.y); g.lineTo(w.x + w.w * 0.67, w.y); g.lineTo(w.x + w.w * 0.55, w.y + w.h); g.lineTo(w.x + w.w * 0.5, w.y + w.h); g.closePath(); g.fill();
        g.restore();
        // sill
        g.fillStyle = wood(g, 0, L.sill - 8, 0, L.sill, dark); rr(g, w.x - 18, L.sill - 9, w.w + 36, 9, 3); g.fill();
        // the pendant lamp's warm pool of light (static); the shade itself sways in the loop
        if (!L.ph) { const lx = W / 2, ly = 54; const gl = g.createRadialGradient(lx, ly, 4, lx, ly, 260); gl.addColorStop(0, dark ? 'rgba(255,214,140,0.24)' : 'rgba(255,230,170,0.3)'); gl.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = gl; g.fillRect(lx - 260, 0, 520, ly + 260); }
        // shelves
        L.shelfY.forEach((sy) => {
          const x0 = L.W / 2 - L.slotW * 2 - 10, x1 = L.W / 2 + L.slotW * 2 + 10;
          g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x0 + 4, sy + 9, x1 - x0, 6);
          g.fillStyle = wood(g, 0, sy, 0, sy + 10, dark); rr(g, x0, sy, x1 - x0, 10, 3); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x0 + 3, sy + 1, x1 - x0 - 6, 2);
          g.fillStyle = dark ? '#2a1a10' : '#5c3418'; [x0 + 14, x1 - 20].forEach(bx => { g.beginPath(); g.moveTo(bx, sy + 10); g.lineTo(bx + 6, sy + 10); g.lineTo(bx + 6, sy + 24); g.closePath(); g.fill(); });
        });
        // decorative side shelves (desktop)
        if (!L.ph) {
          [[70, 1], [W - 70, -1]].forEach(([cx, d]) => {
            for (let r = 0; r < 3; r++) {
              const sy = 230 + r * 120;
              g.fillStyle = wood(g, 0, sy, 0, sy + 8, dark); rr(g, cx - 60, sy, 120, 8, 3); g.fill();
              for (let j = 0; j < 3; j++) { const jx = cx - 36 + j * 36, c = ['#e0a458', '#8cc6a1', '#e57f84', '#9fb7e6'][(r + j) % 4]; g.fillStyle = 'rgba(255,255,255,0.5)'; rr(g, jx - 12, sy - 40, 24, 40, 6); g.fill(); g.fillStyle = c; rr(g, jx - 10, sy - 26, 20, 24, 5); g.fill(); g.fillStyle = dark ? '#6b4a2a' : '#9c6a3c'; rr(g, jx - 13, sy - 46, 26, 8, 3); g.fill(); }
            }
            void d;
          });
        }
        // counter
        const cy = L.counterY;
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, cy - 2, W, 6);
        g.fillStyle = wood(g, 0, cy, 0, cy + 16, dark); g.fillRect(0, cy, W, 16);
        g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(0, cy + 1, W, 2);
        const fr = g.createLinearGradient(0, cy + 16, 0, H); fr.addColorStop(0, dark ? '#4a2c1a' : '#8a5530'); fr.addColorStop(1, dark ? '#24140c' : '#5e3519');
        g.fillStyle = fr; g.fillRect(0, cy + 16, W, H - cy - 16);
        g.strokeStyle = dark ? 'rgba(255,200,140,0.08)' : 'rgba(255,220,180,0.16)'; g.lineWidth = 2;
        const pw = L.ph ? W / 3 : 220;
        for (let x = (W % pw) / 2; x < W; x += pw) { rr(g, x + 10, cy + 30, pw - 20, Math.min(110, H - cy - 46), 8); g.stroke(); }
        // the scale's foot on the counter
        const px = L.pivot.x, bs = L.s;
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(px, cy + 2, 70 * bs, 9 * bs, 0, 0, TAU); g.fill();
        g.fillStyle = brass(g, px - 64 * bs, 0, px + 64 * bs, 0); g.beginPath(); g.ellipse(px, cy - 6 * bs, 60 * bs, 12 * bs, 0, 0, TAU); g.fill();
        rr(g, px - 46 * bs, cy - 22 * bs, 92 * bs, 16 * bs, 6); g.fill();
        g.fillStyle = brass(g, px - 9 * bs, 0, px + 9 * bs, 0); g.fillRect(px - 8 * bs, L.pivot.y + 10, 16 * bs, cy - 22 * bs - L.pivot.y - 10);
        // vignette
        const vg = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.45, Math.max(W, H) * 0.75);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, dark ? 'rgba(10,4,2,0.55)' : 'rgba(90,50,20,0.18)');
        g.fillStyle = vg; g.fillRect(0, 0, W, H);
      }

      /* ---------------- items ---------------- */
      const SPR = new Map();
      function itemSprite(id, s) {
        const key = id + ':' + s + ':' + (cv.dpr || 1);
        if (SPR.has(key)) return SPR.get(key);
        const dpr = cv.dpr || 1, w = Math.ceil(70 * s), hh = Math.ceil(64 * s), c = document.createElement('canvas');
        c.width = Math.ceil(w * dpr); c.height = Math.ceil(hh * dpr);
        const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.translate(w / 2, hh - 4 * s); g.scale(s, s);
        drawItemArt(g, id);
        const sp = { c, w, hh, ox: w / 2, oy: hh - 4 * s }; SPR.set(key, sp); return sp;
      }
      function drawItemArt(g, id) {
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(0, 0, 22, 4, 0, 0, TAU); g.fill();
        if (id === 'toe') {
          g.fillStyle = '#f0b393'; g.beginPath(); g.ellipse(0, -13, 21, 12, 0, 0, TAU); g.fill();
          [[-15, -24, 6.5], [-6, -27, 5], [2, -27.5, 4.4], [9, -26.2, 3.9], [15, -23.5, 3.4]].forEach(([x, y, r], i) => { g.fillStyle = i === 0 ? '#ff7f6e' : '#f5c2a6'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
          g.fillStyle = '#ffe9b0'; g.save(); g.translate(-15, -24); g.rotate(-0.5); rr(g, -6, -3, 12, 6, 2); g.fill(); g.restore();
          g.strokeStyle = '#e8443a'; g.lineWidth = 2; g.lineCap = 'round'; [[-26, -34, -22, -30], [-18, -40, -17, -34], [-30, -24, -24, -24]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); });
        } else if (id === 'bus') {
          g.fillStyle = '#ffc93c'; rr(g, -24, -34, 48, 28, 7); g.fill();
          g.fillStyle = '#2b3a55'; for (let i = 0; i < 4; i++) rr(g, -20 + i * 10.5, -30, 8, 9, 2), g.fill();
          g.fillStyle = '#e09a10'; g.fillRect(-24, -16, 48, 4);
          g.fillStyle = '#2b2b33'; [-13, 13].forEach(x => { g.beginPath(); g.arc(x, -6, 5.5, 0, TAU); g.fill(); g.fillStyle = '#c9c9d4'; g.beginPath(); g.arc(x, -6, 2, 0, TAU); g.fill(); g.fillStyle = '#2b2b33'; });
          g.fillStyle = '#fff6c4'; g.beginPath(); g.arc(21, -12, 2.4, 0, TAU); g.fill();
        } else if (id === 'tyre') {
          g.fillStyle = '#2b2b33'; g.beginPath(); g.ellipse(0, -18, 19, 17, 0, 0, TAU); g.fill();
          g.fillStyle = '#2b2b33'; g.beginPath(); g.ellipse(0, -4, 22, 5, 0, 0, TAU); g.fill();
          g.strokeStyle = '#4a4a55'; g.lineWidth = 2; for (let a = 0; a < 8; a++) { const r1 = 14, r2 = 18, aa = a / 8 * TAU; g.beginPath(); g.moveTo(Math.cos(aa) * r1, -18 + Math.sin(aa) * r1 * 0.9); g.lineTo(Math.cos(aa) * r2, -18 + Math.sin(aa) * r2 * 0.9); g.stroke(); }
          g.fillStyle = '#c9ccd6'; g.beginPath(); g.arc(0, -18, 7.5, 0, TAU); g.fill(); g.fillStyle = '#8e93a3'; g.beginPath(); g.arc(0, -18, 3, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(160,200,255,0.9)'; g.lineWidth = 1.6; g.lineCap = 'round'; [[22, -10, 30, -14], [22, -4, 31, -4]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); });
        } else if (id === 'keys') {
          g.strokeStyle = '#b9bcc8'; g.lineWidth = 3; g.beginPath(); g.arc(-4, -30, 8, 0, TAU); g.stroke();
          g.fillStyle = '#e6b84a'; g.beginPath(); g.arc(-12, -18, 7, 0, TAU); g.fill(); g.fillRect(-10, -18, 26, 4.5); g.fillRect(8, -14, 3, 5); g.fillRect(13, -14, 3, 4);
          g.fillStyle = '#9fa6b8'; g.beginPath(); g.arc(4, -10, 6, 0, TAU); g.fill(); g.fillRect(5, -11, 20, 4); g.fillRect(19, -7, 3, 4);
          g.fillStyle = '#7a4c12'; g.beginPath(); g.arc(-12, -18, 2.2, 0, TAU); g.fill();
        } else if (id === 'phone') {
          g.save(); g.rotate(-0.12); g.fillStyle = '#1f2533'; rr(g, -14, -48, 28, 46, 6); g.fill();
          const sg = g.createLinearGradient(0, -44, 0, -6); sg.addColorStop(0, '#6ec3ff'); sg.addColorStop(1, '#8f7bff'); g.fillStyle = sg; rr(g, -11, -44, 22, 38, 3); g.fill();
          g.strokeStyle = '#ffffff'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-9, -40); g.lineTo(-2, -30); g.lineTo(-6, -24); g.lineTo(4, -14); g.lineTo(2, -9); g.moveTo(-2, -30); g.lineTo(8, -34); g.moveTo(-6, -24); g.lineTo(-10, -18); g.stroke(); g.restore();
        } else if (id === 'wallet') {
          g.fillStyle = '#8a5a3c'; rr(g, -22, -30, 44, 28, 6); g.fill(); g.fillStyle = '#a06d4a'; rr(g, -22, -30, 44, 12, 6); g.fill();
          g.strokeStyle = 'rgba(255,230,190,0.6)'; g.setLineDash([2.5, 2.5]); g.lineWidth = 1.2; rr(g, -19, -27, 38, 22, 4); g.stroke(); g.setLineDash([]);
          g.fillStyle = '#e8c26a'; g.beginPath(); g.arc(14, -20, 4, 0, TAU); g.fill();
          g.fillStyle = '#ffffff'; g.beginPath(); g.arc(18, -38, 8, 0, TAU); g.fill(); g.fillStyle = '#8a5a3c'; g.font = '800 12px ' + FONT; g.textAlign = 'center'; g.fillText('?', 18, -33.5);
        } else if (id === 'pipe') {
          const pg = g.createLinearGradient(0, -26, 0, -10); pg.addColorStop(0, '#d5d9e3'); pg.addColorStop(0.5, '#9ea4b5'); pg.addColorStop(1, '#6d7385');
          g.fillStyle = pg; rr(g, -26, -26, 52, 16, 4); g.fill(); g.fillStyle = '#7d8396'; g.fillRect(-6, -29, 12, 22);
          g.strokeStyle = '#4aa8ff'; g.lineWidth = 2.2; g.lineCap = 'round'; [[-0.9, 16], [-0.4, 20], [0.1, 18], [0.6, 15]].forEach(([a, l]) => { g.beginPath(); g.moveTo(0, -29); g.quadraticCurveTo(Math.sin(a) * l * 0.6, -29 - l, Math.sin(a) * l, -29 - l * 0.4); g.stroke(); });
          g.fillStyle = '#7cc4ff'; [[-14, -40], [14, -42], [-6, -48], [8, -50]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill(); });
          g.fillStyle = 'rgba(80,160,255,0.35)'; g.beginPath(); g.ellipse(0, -2, 18, 3, 0, 0, TAU); g.fill();
        } else if (id === 'arm') {
          g.fillStyle = '#5a8fd6'; g.beginPath(); g.moveTo(-26, -40); g.lineTo(-18, -44); g.lineTo(18, -8); g.lineTo(10, -4); g.closePath(); g.fill();
          g.save(); g.rotate(-0.25); g.fillStyle = '#f7f5ef'; rr(g, -22, -22, 40, 16, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1; g.stroke();
          g.fillStyle = '#f0b393'; g.beginPath(); g.arc(22, -14, 6, 0, TAU); g.fill();
          g.strokeStyle = '#e8443a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-12, -16); g.quadraticCurveTo(-8, -20, -4, -16); g.quadraticCurveTo(0, -12, 4, -16); g.stroke();
          g.fillStyle = '#ffb800'; K.starPath(g, 8, -14, 3.6, 1.6, 5, 0); g.fill(); g.restore();
        }
      }

      /* ---------------- parcel ---------------- */
      function parcelSize() { const base = L.ph ? 1 : 1.25; return { w: 112 * base, h: 88 * base }; }
      function drawParcel(g, x, yb, s, t) {
        const sz = parcelSize(), w = sz.w * s, hh = sz.h * s, d = 12 * s, x0 = x - w / 2, y0 = yb - hh;
        const P2 = G.parcel;
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + 4, yb + 1, w * 0.55, 5, 0, 0, TAU); g.fill();
        // top face
        g.fillStyle = '#d9a46a'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + d, y0 - d); g.lineTo(x0 + w + d, y0 - d); g.lineTo(x0 + w, y0); g.closePath(); g.fill();
        // side face
        g.fillStyle = '#a8713c'; g.beginPath(); g.moveTo(x0 + w, y0); g.lineTo(x0 + w + d, y0 - d); g.lineTo(x0 + w + d, yb - d); g.lineTo(x0 + w, yb); g.closePath(); g.fill();
        // front
        const fg = g.createLinearGradient(x0, y0, x0, yb); fg.addColorStop(0, '#d39a5c'); fg.addColorStop(1, '#b97f45'); g.fillStyle = fg; g.fillRect(x0, y0, w, hh);
        if (P2.wrap > 0.001) {
          // wrapping paper sweeps across
          const ww = w * Math.min(1, P2.wrap);
          g.save(); g.beginPath(); g.rect(x0 - 1, y0 - d - 1, ww + d + 2, hh + d + 2); g.clip();
          paperFill(g, x0, y0, w, hh, d, s);
          g.restore();
        } else {
          // tape and stamps
          g.fillStyle = 'rgba(240,220,170,0.75)'; g.fillRect(x0 + w * 0.42, y0, w * 0.16, hh);
          g.beginPath(); g.moveTo(x0 + w * 0.42 + 0, y0); g.lineTo(x0 + w * 0.42 + d, y0 - d); g.lineTo(x0 + w * 0.58 + d, y0 - d); g.lineTo(x0 + w * 0.58, y0); g.closePath(); g.fill();
          g.strokeStyle = 'rgba(200,50,40,0.55)'; g.lineWidth = 2; g.save(); g.translate(x0 + w * 0.2, yb - hh * 0.2); g.rotate(-0.18); rr(g, -16 * s, -7 * s, 32 * s, 14 * s, 3); g.stroke(); g.restore();
          g.strokeStyle = 'rgba(120,70,30,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0 + 6, y0 + 6); g.lineTo(x0 + 18 * s, y0 + 6); g.moveTo(x0 + 6, y0 + 6); g.lineTo(x0 + 6, y0 + 18 * s); g.stroke();
        }
        if (P2.bow > 0.01) drawBow(g, x + d / 2, y0 - d / 2, s * K.ease.outBack(Math.min(1, P2.bow)), t);
        if (P2.state === 'shelf' || (P2.state === 'fly' && G.stage === 'end')) { // weight medallion
          const right = !G.match || G.match.slot < 3, mx = right ? x0 + w + d * 0.5 : x0 - 2, my = yb - hh * 0.3, r = 11;
          g.fillStyle = brass(g, mx - r, my - r, mx + r, my + r); g.beginPath(); g.arc(mx, my, r, 0, TAU); g.fill();
          g.fillStyle = '#3b2614'; g.font = '800 14px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(T), mx, my + 1); g.textBaseline = 'alphabetic';
        }
        if (P2.wrap >= 1) { // ribbon
          g.fillStyle = PAPER.rib; g.fillRect(x0 + w * 0.46, y0, w * 0.08, hh); g.fillRect(x0, y0 + hh * 0.46, w, hh * 0.08);
          g.beginPath(); g.moveTo(x0 + w * 0.46, y0); g.lineTo(x0 + w * 0.46 + d, y0 - d); g.lineTo(x0 + w * 0.54 + d, y0 - d); g.lineTo(x0 + w * 0.54, y0); g.closePath(); g.fill();
        }
      }
      function paperFill(g, x0, y0, w, hh, d, s) {
        g.fillStyle = PAPER.base; g.fillRect(x0, y0, w, hh);
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + d, y0 - d); g.lineTo(x0 + w + d, y0 - d); g.lineTo(x0 + w + d, y0 + hh - d); g.lineTo(x0 + w, y0 + hh); g.lineTo(x0 + w, y0); g.closePath(); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.moveTo(x0 + w, y0); g.lineTo(x0 + w + d, y0 - d); g.lineTo(x0 + w + d, y0 + hh - d); g.lineTo(x0 + w, y0 + hh); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + d, y0 - d); g.lineTo(x0 + w + d, y0 - d); g.lineTo(x0 + w, y0); g.closePath(); g.fill();
        g.save(); g.beginPath(); g.rect(x0, y0, w, hh); g.clip(); g.fillStyle = PAPER.ink; g.strokeStyle = PAPER.ink;
        const st = 12 * Math.max(0.6, s);
        if (PAPER.pat === 'check') { g.globalAlpha = 0.35; for (let x = x0; x < x0 + w; x += st * 2) g.fillRect(x, y0, st, hh); for (let y = y0; y < y0 + hh; y += st * 2) g.fillRect(x0, y, w, st); }
        else if (PAPER.pat === 'stars') { for (let i = 0; i < 14; i++) { K.starPath(g, x0 + ((i * 37) % 100) / 100 * w, y0 + ((i * 53) % 100) / 100 * hh, 3.5, 1.4, 5, 0); g.fill(); } }
        else if (PAPER.pat === 'twine') { g.globalAlpha = 0.4; g.lineWidth = 1; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(x0, y0 + i * hh / 6); g.lineTo(x0 + w, y0 + i * hh / 6 + 6); g.stroke(); } }
        else if (PAPER.pat === 'dots') { for (let y = y0 + 6, r = 0; y < y0 + hh; y += st, r++) for (let x = x0 + 6 + (r % 2) * st / 2; x < x0 + w; x += st) { g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill(); } }
        else if (PAPER.pat === 'stripes') { g.globalAlpha = 0.6; g.lineWidth = st * 0.45; for (let x = x0 - hh; x < x0 + w; x += st * 1.4) { g.beginPath(); g.moveTo(x, y0 + hh); g.lineTo(x + hh, y0); g.stroke(); } }
        else if (PAPER.pat === 'leaves') { for (let i = 0; i < 10; i++) { g.save(); g.translate(x0 + ((i * 41) % 100) / 100 * w, y0 + ((i * 67) % 100) / 100 * hh); g.rotate(i); g.beginPath(); g.ellipse(0, 0, 5, 2.4, 0, 0, TAU); g.fill(); g.restore(); } }
        else if (PAPER.pat === 'foil') { g.globalAlpha = 0.45; const fg = g.createLinearGradient(x0, y0, x0 + w, y0 + hh); fg.addColorStop(0, 'rgba(255,255,255,0)'); fg.addColorStop(0.5, '#ffffff'); fg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = fg; g.fillRect(x0, y0, w, hh); }
        else if (PAPER.pat === 'tartan') { g.globalAlpha = 0.45; for (let x = x0; x < x0 + w; x += st * 2.2) g.fillRect(x, y0, st * 0.6, hh); for (let y = y0; y < y0 + hh; y += st * 2.2) g.fillRect(x0, y, w, st * 0.6); g.fillStyle = '#f2d16b'; for (let x = x0 + st; x < x0 + w; x += st * 2.2) g.fillRect(x, y0, 1.5, hh); }
        g.restore(); g.globalAlpha = 1;
      }
      function drawBow(g, x, y, s, t) {
        g.save(); g.translate(x, y); g.scale(s, s); g.rotate(Math.sin(t * 2) * 0.03);
        g.fillStyle = PAPER.rib; g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1;
        [-1, 1].forEach(d => { g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(d * 22, -22, d * 30, 2, 0, 0); g.fill(); g.stroke(); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(d * 8, 10, d * 14, 18); g.lineTo(d * 8, 18); g.closePath(); g.fill(); });
        g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.fill(); g.stroke();
        g.restore();
      }

      /* ---------------- the scale ---------------- */
      function beamEnds() {
        const c = Math.cos(G.a), s = Math.sin(G.a), p = L.pivot;
        return [{ x: p.x - L.bw * c, y: p.y + L.bw * s }, { x: p.x + L.bw * c, y: p.y - L.bw * s }];
      }
      function panPos(i) { const e = beamEnds()[i], sw = G.swing[i]; return { x: e.x + Math.sin(sw) * L.chain, y: e.y + Math.cos(sw) * L.chain }; }
      function drawScale(g, t) {
        const p = L.pivot, ends = beamEnds(), s = L.s;
        // dial behind the pivot
        const dr = 30 * s;
        const key = p.x + ':' + p.y + ':' + s;
        if (!G.brassK || G.brassK !== key) { G.brassK = key; G.brass = { dial: brass(g, p.x - dr, p.y - dr, p.x + dr, p.y + dr), beam: brass(g, 0, -6 * s, 0, 6 * s), pivot: brass(g, p.x - 10, p.y - 10, p.x + 10, p.y + 10), fin: brass(g, p.x - 8, 0, p.x + 8, 0) }; }
        const BR = G.brass;
        g.fillStyle = BR.dial; g.beginPath(); g.arc(p.x, p.y - 6, dr + 4, Math.PI, TAU); g.fill();
        g.fillStyle = '#fff8e6'; g.beginPath(); g.arc(p.x, p.y - 6, dr, Math.PI, TAU); g.fill();
        g.fillStyle = 'rgba(70,170,90,0.35)'; g.beginPath(); g.moveTo(p.x, p.y - 6); g.arc(p.x, p.y - 6, dr, -Math.PI / 2 - 0.12, -Math.PI / 2 + 0.12); g.closePath(); g.fill();
        g.strokeStyle = '#7a4c12'; g.lineWidth = 1.2; for (let i = -4; i <= 4; i++) { const a = -Math.PI / 2 + i * 0.3; g.beginPath(); g.moveTo(p.x + Math.cos(a) * dr * 0.78, p.y - 6 + Math.sin(a) * dr * 0.78); g.lineTo(p.x + Math.cos(a) * dr * 0.94, p.y - 6 + Math.sin(a) * dr * 0.94); g.stroke(); }
        const na = -Math.PI / 2 - G.a * 2.2;
        g.strokeStyle = G.balanced ? '#2f8a4f' : '#b23a2a'; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(p.x, p.y - 6); g.lineTo(p.x + Math.cos(na) * dr * 0.9, p.y - 6 + Math.sin(na) * dr * 0.9); g.stroke(); g.lineCap = 'butt';
        // chains and pans
        [0, 1].forEach(i => {
          const e = ends[i], pp = panPos(i), pw = L.panW / 2;
          g.strokeStyle = '#a9782a'; g.lineWidth = 1.6;
          g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(pp.x - pw * 0.86, pp.y - 2); g.moveTo(e.x, e.y); g.lineTo(pp.x + pw * 0.86, pp.y - 2); g.moveTo(e.x, e.y); g.lineTo(pp.x, pp.y - 4); g.stroke();
          g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.ellipse(pp.x, pp.y + 16, pw * 0.8, 4, 0, 0, TAU); g.fill();
          g.fillStyle = brass(g, pp.x - pw, 0, pp.x + pw, 0);
          g.beginPath(); g.ellipse(pp.x, pp.y, pw, 7 * s, 0, 0, Math.PI); g.lineTo(pp.x - pw, pp.y); g.closePath();
          g.beginPath(); g.moveTo(pp.x - pw, pp.y); g.quadraticCurveTo(pp.x, pp.y + 22 * s, pp.x + pw, pp.y); g.closePath(); g.fill();
          g.fillStyle = '#ffe9a8'; g.beginPath(); g.ellipse(pp.x, pp.y, pw, 5 * s, 0, 0, TAU); g.fill();
          g.strokeStyle = '#8a5a17'; g.lineWidth = 1.2; g.stroke();
          if (G.panGlow && G.panGlow[i] > 0.01) { g.strokeStyle = `rgba(255,236,150,${G.panGlow[i]})`; g.lineWidth = 4; g.beginPath(); g.ellipse(pp.x, pp.y, pw + 6, 9 * s, 0, 0, TAU); g.stroke(); }
        });
        // beam
        g.save(); g.translate(p.x, p.y); g.rotate(-G.a);
        g.fillStyle = BR.beam;
        g.beginPath(); g.moveTo(-L.bw, -2.5 * s); g.quadraticCurveTo(0, -9 * s, L.bw, -2.5 * s); g.lineTo(L.bw, 2.5 * s); g.quadraticCurveTo(0, 7 * s, -L.bw, 2.5 * s); g.closePath(); g.fill();
        [-L.bw, L.bw].forEach(x => { g.beginPath(); g.arc(x, 0, 5 * s, 0, TAU); g.fill(); });
        g.restore();
        g.fillStyle = BR.pivot; g.beginPath(); g.arc(p.x, p.y, 9 * s, 0, TAU); g.fill();
        g.fillStyle = '#7a4c12'; g.beginPath(); g.arc(p.x, p.y, 3 * s, 0, TAU); g.fill();
        // finial
        g.fillStyle = BR.fin; g.beginPath(); g.moveTo(p.x - 5 * s, p.y - 8 * s); g.lineTo(p.x, p.y - 26 * s - dr * 0.6); g.lineTo(p.x + 5 * s, p.y - 8 * s); g.closePath(); g.fill();
        g.beginPath(); g.arc(p.x, p.y - 28 * s - dr * 0.6, 5 * s, 0, TAU); g.fill();
        void t;
      }
      const PAN_SLOTS = [[-0.42, 0], [0.42, 0], [0, -1], [-0.38, -1.9]];
      function panItemPos(it) {
        const pp = panPos(1), sl = PAN_SLOTS[it.panI] || [0, -2.6], sc = L.s * 0.9;
        return { x: pp.x + sl[0] * L.panW * 0.5, y: pp.y - 2 + sl[1] * 34 * sc };
      }

      /* ---------------- loop ---------------- */
      let M = null, frame = 0;
      const FONT = (getComputedStyle(el).getPropertyValue('--font-ui') || '').trim() || 'system-ui, sans-serif';
      function counterWeight() { return G.onPan.reduce((s, it) => s + (it.state === 'pan' ? it.w : 0), 0); }
      function leftWeight() { return G.parcel.state === 'pan' || G.parcel.state === 'wrapped' ? (G.felt ? 10 : T) : 0; }
      function beamTarget() { return clamp((leftWeight() - counterWeight()) * 0.07, -0.24, 0.26); }
      function beatPos() { if (A.ctx && M && M.next > 0) { const spb = 60 / M.bpm; return (M.beat - 1) + (A.now() - (M.next - spb)) / spb; } return performance.now() / 1000 * 84 / 60; }
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !L.W) return;
        frame++;
        // beam physics: a sprung balance with weight and follow-through
        const tgt = beamTarget(), k = RM() ? 140 : 77, damp = RM() ? 20 : 5.6;
        G.av += (-(G.a - tgt) * k - G.av * damp) * dt; G.a += G.av * dt;
        if (Math.abs(G.av) > 0.5 && performance.now() - G.lastCreak > 260 && A.ctx) { G.lastCreak = performance.now(); A.noise({ filter: 'bandpass', freq: 260 + Math.random() * 240, to: 180, q: 9, dur: 0.16, vol: 0.05 }); }
        [0, 1].forEach(i => { G.swv[i] += (-G.swing[i] * 30 - G.swv[i] * 3.2 + G.av * (i ? -1 : 1) * 2.4) * dt; G.swing[i] += G.swv[i] * dt; });
        G.panGlow = G.panGlow || [0, 0];
        G.panGlow[0] += (((G.drag && G.drag.kind === 'parcel' && G.drag.over) ? 0.9 : 0) - G.panGlow[0]) * Math.min(1, dt * 10);
        G.panGlow[1] += (((G.drag && G.drag.kind === 'item' && G.drag.over) ? 0.9 : 0) - G.panGlow[1]) * Math.min(1, dt * 10);
        G.shake = Math.max(0, G.shake - dt * 3); G.bell = Math.max(0, G.bell - dt * 1.6);
        if (G.stage === 'end') G.sunset = Math.min(1, G.sunset + dt / (RM() ? 0.3 : 2.2));
        // parcel motion
        const Pc = G.parcel;
        if (Pc.fly) { Pc.fly.k = Math.min(1, Pc.fly.k + dt / Pc.fly.dur); const e = K.ease.inOutCubic(Pc.fly.k); const to = Pc.fly.to(); Pc.x = lerp(Pc.fly.x, to.x, e); Pc.y = lerp(Pc.fly.y, to.y, e) - Math.sin(e * Math.PI) * Pc.fly.arc; if (Pc.fly.k >= 1) { const f = Pc.fly; Pc.fly = null; f.done && f.done(); } }
        else if (Pc.state === 'pan' || Pc.state === 'wrapped') { const pp = panPos(0); Pc.x = pp.x; Pc.y = pp.y - 2; }
        if (Pc.shrinkTo != null) { Pc.s += (Pc.shrinkTo - Pc.s) * Math.min(1, dt * 5); }
        if (Pc.wrapping) Pc.wrap = Math.min(1, Pc.wrap + dt / (RM() ? 0.2 : 0.75));
        if (Pc.wrap >= 1 && Pc.bowing) Pc.bow = Math.min(1, Pc.bow + dt / 0.5);
        // items
        ITEMS.forEach(it => {
          if (it.fly) { it.fly.k = Math.min(1, it.fly.k + dt / it.fly.dur); const e = K.ease.inOutCubic(it.fly.k), to = it.fly.to(); it.x = lerp(it.fly.x, to.x, e); it.y = lerp(it.fly.y, to.y, e) - Math.sin(e * Math.PI) * it.fly.arc; if (it.fly.k >= 1) { const f = it.fly; it.fly = null; f.done && f.done(); } }
          else if (it.state === 'pan') { const q = panItemPos(it); it.x = q.x; it.y = q.y; }
          else if (it.state === 'shelf') { it.x += (it.hx - it.x) * Math.min(1, dt * 12); it.y += (it.hy - it.y) * Math.min(1, dt * 12); }
          it.lift += (((G.drag && G.drag.it === it) ? 1 : 0) - it.lift) * Math.min(1, dt * 14);
        });
        if (G.drag) { const D = G.drag; if (D.kind === 'item') { D.it.x = D.x; D.it.y = D.y + 26; } else { Pc.x = D.x; Pc.y = D.y + 40; } }
        // DOM followers
        if (frame % 2 === 0 || G.drag) syncDom();
        const bp = beatPos(), ib = Math.floor(bp);
        if (ib !== G.lastIB) { G.lastIB = ib; onBeat(ib); }

        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0); g.globalAlpha = 1;
        if (G.shake > 0 && !RM()) { el.style.transform = `translate(${((Math.random() - 0.5) * G.shake * 6).toFixed(1)}px,${((Math.random() - 0.5) * G.shake * 6).toFixed(1)}px)`; G.shook = true; }
        else if (G.shook) { G.shook = false; el.style.transform = ''; }
        g.clearRect(0, 0, L.W, L.H);
        drawWindowDyn(g, t, dt);
        drawBell(g, t);
        drawSill(g, t, bp);
        drawLamp(g, t, bp);
        // shelf items
        ITEMS.forEach(it => { if (it.state === 'shelf' && !it.fly) drawItemAt(g, it, t); });
        drawScale(g, t);
        // parcel on the pan / in flight (behind the right pan items)
        if (Pc.state !== 'away') drawParcel(g, Pc.x, Pc.y, Pc.s * (1 + 0.04 * (G.drag && G.drag.kind === 'parcel' ? 1 : 0)), t);
        ITEMS.forEach(it => { if (it.state === 'pan' || (it.fly && it.state !== 'drag')) drawItemAt(g, it, t); });
        drawPeanuts(g, dt);
        ITEMS.forEach(it => { if (it.state === 'drag') drawItemAt(g, it, t); });
        drawHintArc(g, t);
        P.update(dt); P.draw(g);
        if (G.sunset > 0) drawSunset(g, t);
      });
      function drawItemAt(g, it, t) {
        const s = L.s * (it.state === 'pan' || it.fly ? 0.9 : 1) * (1 + it.lift * 0.12), sp = itemSprite(it.id, Math.round(s * 10) / 10);
        const bob = it.state === 'shelf' && G.stage === 'weigh' && it === G.hintIt ? Math.sin(t * 5) * 2 : 0;
        g.drawImage(sp.c, it.x - sp.ox, it.y - sp.oy - it.lift * 10 + bob, sp.w, sp.hh);
      }
      function drawHintArc(g, t) {
        if (!G.arc) return;
        let a = null, b = null;
        if (G.stage === 'parcel' && G.parcel.state === 'deliver' && !G.drag) { a = { x: G.parcel.x, y: G.parcel.y - 60 }; const pp = panPos(0); b = { x: pp.x, y: pp.y - 20 }; }
        if (G.stage === 'weigh' && !G.drag && G.placed === 0 && G.hintIt) { a = { x: G.hintIt.x, y: G.hintIt.y - 20 }; const pp = panPos(1); b = { x: pp.x, y: pp.y - 16 }; }
        if (!a) return;
        g.strokeStyle = K.dark() ? 'rgba(255,214,107,0.85)' : 'rgba(170,100,10,0.75)'; g.lineWidth = 3; g.lineCap = 'round'; g.setLineDash([2, 9]); g.lineDashOffset = -t * 30;
        g.beginPath(); g.moveTo(a.x, a.y); g.quadraticCurveTo((a.x + b.x) / 2 + (b.x > a.x ? -30 : 30), Math.min(a.y, b.y) - 50, b.x, b.y); g.stroke(); g.setLineDash([]); g.lineCap = 'butt';
        g.fillStyle = K.dark() ? 'rgba(255,214,107,0.9)' : 'rgba(170,100,10,0.8)'; g.beginPath(); g.arc(b.x, b.y, 4 + Math.sin(t * 6) * 1.5, 0, TAU); g.fill();
      }
      function drawLamp(g, t, bp) {
        const x = L.W / 2 + Math.sin(t * 0.9) * 3, top = 0, y = L.ph ? 46 : 40, fr = bp - Math.floor(bp);
        if (L.ph) return; // on phones the window owns the top; the lamp glow is painted into the room light below
        g.strokeStyle = 'rgba(30,20,10,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(L.W / 2, top); g.lineTo(x, y); g.stroke();
        g.fillStyle = `rgba(255,236,170,${0.25 + 0.2 * (1 - fr)})`; g.beginPath(); g.ellipse(x, y + 20, 20, 7, 0, 0, TAU); g.fill();
        g.fillStyle = '#3d5a4a'; g.beginPath(); g.moveTo(x - 26, y + 18); g.lineTo(x - 10, y); g.lineTo(x + 10, y); g.lineTo(x + 26, y + 18); g.closePath(); g.fill();
        g.fillStyle = '#fff1c4'; g.beginPath(); g.ellipse(x, y + 19, 12, 4, 0, 0, TAU); g.fill();
      }
      const flakes = []; for (let i = 0; i < 26; i++) flakes.push({ x: Math.random(), y: Math.random(), v: 0.4 + Math.random() * 0.6, p: Math.random() * 6 });
      function drawWindowDyn(g, t, dt) {
        const w = L.win;
        g.save(); rr(g, w.x, w.y, w.w, w.h, 6); g.clip();
        if (G.sunset > 0) { const sg = g.createLinearGradient(0, w.y, 0, w.y + w.h); sg.addColorStop(0, `rgba(255,120,80,${0.75 * G.sunset})`); sg.addColorStop(1, `rgba(255,200,110,${0.8 * G.sunset})`); g.fillStyle = sg; g.fillRect(w.x, w.y, w.w, w.h); const sx = w.x + w.w * 0.3, sy = w.y + w.h * (0.95 - 0.25 * G.sunset); const sun = g.createRadialGradient(sx, sy, 2, sx, sy, 40); sun.addColorStop(0, `rgba(255,250,210,${G.sunset})`); sun.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = sun; g.fillRect(sx - 40, sy - 40, 80, 80); }
        const wt = WEATHER;
        if (wt === 'rain') { g.strokeStyle = K.dark() ? 'rgba(180,200,255,0.4)' : 'rgba(90,110,140,0.4)'; g.lineWidth = 1; g.beginPath(); flakes.forEach(f => { f.y = (f.y + dt * f.v * 1.6) % 1; const x = w.x + f.x * w.w, y = w.y + f.y * w.h; g.moveTo(x, y); g.lineTo(x - 2, y + 8); }); g.stroke(); }
        else if (wt === 'snow') { g.fillStyle = 'rgba(255,255,255,0.9)'; flakes.forEach(f => { f.y = (f.y + dt * f.v * 0.18) % 1; const x = w.x + (f.x + Math.sin(t + f.p) * 0.02) * w.w, y = w.y + f.y * w.h; g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); }); }
        else if (wt === 'leaves') { flakes.slice(0, 10).forEach((f, i) => { f.y = (f.y + dt * f.v * 0.22) % 1; const x = w.x + (f.x + Math.sin(t * 1.3 + f.p) * 0.05) * w.w, y = w.y + f.y * w.h; g.fillStyle = ['#e0a33a', '#d06a2a', '#b9c24a'][i % 3]; g.save(); g.translate(x, y); g.rotate(t * 2 + f.p); g.beginPath(); g.ellipse(0, 0, 4, 2, 0, 0, TAU); g.fill(); g.restore(); }); }
        else { if (!K.dark()) { g.fillStyle = 'rgba(255,255,255,0.85)'; [[0.2, 0.25, 1], [0.66, 0.18, 0.8]].forEach(([fx, fy, s], i) => { const x = w.x + ((fx + t * 0.006 * (i + 1)) % 1.2) * w.w, y = w.y + fy * w.h; g.beginPath(); g.ellipse(x, y, 18 * s, 6 * s, 0, 0, TAU); g.ellipse(x + 12 * s, y - 4 * s, 11 * s, 6 * s, 0, 0, TAU); g.fill(); }); } else { g.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 12; i++) { const x = w.x + ((i * 61) % 100) / 100 * w.w, y = w.y + ((i * 29) % 40) / 100 * w.h + 30; g.globalAlpha = 0.4 + 0.4 * Math.sin(t * 2 + i); g.fillRect(x, y, 1.5, 1.5); } g.globalAlpha = 1; } }
        g.restore();
      }
      function drawSill(g, t, bp) {
        // parcels shelved on earlier visits sit on the window sill, in their papers
        const y = L.sill - 9;
        OLD.forEach((p, i) => {
          const n = OLD.length, x = L.win.x + 24 + i * Math.min(42, (L.win.w - 48) / Math.max(1, n)), s = 0.3 * (L.ph ? 1 : 1.2), w = 70 * s, hh = 56 * s;
          g.fillStyle = p.base; g.fillRect(x - w / 2, y - hh, w, hh); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + w / 2 - 4, y - hh, 4, hh);
          g.fillStyle = p.rib; g.fillRect(x - 1.5, y - hh, 3, hh); g.fillRect(x - w / 2, y - hh / 2 - 1.5, w, 3);
          g.beginPath(); g.arc(x - 3, y - hh - 2, 3, 0, TAU); g.arc(x + 3, y - hh - 2, 3, 0, TAU); g.fill();
        });
        if (visits >= 2) { // the shop cat naps on the sill; its tail keeps time with the music box
          const cx = L.win.x + L.win.w - 40, cy = y, fr = bp - Math.floor(bp), dark = K.dark();
          g.fillStyle = dark ? '#d9a066' : '#e2a05a'; g.beginPath(); g.ellipse(cx, cy - 9, 18, 9, 0, 0, TAU); g.fill();
          g.beginPath(); g.arc(cx - 15, cy - 13, 8, 0, TAU); g.fill();
          g.beginPath(); g.moveTo(cx - 21, cy - 19); g.lineTo(cx - 19, cy - 27); g.lineTo(cx - 14, cy - 20); g.closePath(); g.fill(); g.beginPath(); g.moveTo(cx - 12, cy - 20); g.lineTo(cx - 9, cy - 27); g.lineTo(cx - 7, cy - 18); g.closePath(); g.fill();
          g.strokeStyle = dark ? '#d9a066' : '#e2a05a'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx + 16, cy - 6); g.quadraticCurveTo(cx + 30, cy - 4 - Math.sin(fr * Math.PI) * 10, cx + 26, cy - 18 - Math.sin(fr * Math.PI) * 4); g.stroke(); g.lineCap = 'butt';
          g.strokeStyle = '#5a3a1a'; g.lineWidth = 1.2; g.beginPath(); g.arc(cx - 17, cy - 13, 2, 0.2, Math.PI - 0.2); g.stroke(); g.beginPath(); g.arc(cx - 12, cy - 13, 2, 0.2, Math.PI - 0.2); g.stroke();
        }
        void t;
      }
      function drawPeanuts(g, dt) {
        G.peanuts = G.peanuts.filter(p => p.life > 0);
        G.peanuts.forEach(p => { p.life -= dt; p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; if (p.y > L.counterY - 3) { p.y = L.counterY - 3; p.vy *= -0.3; p.vx *= 0.7; }
          g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.min(1, p.life * 2); g.fillStyle = '#f6efe0'; g.beginPath(); g.ellipse(-3, 0, 4, 3, 0, 0, TAU); g.ellipse(3, 0, 4, 3, 0, 0, TAU); g.fill(); g.restore(); });
        g.globalAlpha = 1;
      }
      let RAYS = null;
      const dust = []; for (let i = 0; i < 34; i++) dust.push({ x: Math.random(), y: Math.random(), v: 0.2 + Math.random() * 0.5, p: Math.random() * 6, r: 0.8 + Math.random() * 1.6 });
      function buildRays() {
        const dpr = cv.dpr || 1, w = L.win, c = document.createElement('canvas');
        c.width = Math.ceil(L.W * dpr); c.height = Math.ceil(L.H * dpr);
        const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 5; i++) {
          const x0 = w.x + w.w * (0.15 + i * 0.17), x1 = x0 + L.W * 0.35, len = L.H * 0.95;
          const gr = g.createLinearGradient(x0, w.y + w.h, x1, len); gr.addColorStop(0, 'rgba(255,170,90,0.16)'); gr.addColorStop(1, 'rgba(255,170,90,0)');
          g.fillStyle = gr; g.beginPath(); g.moveTo(x0, w.y + w.h * 0.6); g.lineTo(x0 + 26, w.y + w.h * 0.6); g.lineTo(x1 + 70, len); g.lineTo(x1 - 20, len); g.closePath(); g.fill();
        }
        g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(255,140,60,0.1)'; g.fillRect(0, 0, L.W, L.H);
        RAYS = { c, W: L.W, H: L.H };
      }
      function drawSunset(g, t) {
        const k = G.sunset, w = L.win;
        if (!RAYS || RAYS.W !== L.W || RAYS.H !== L.H) buildRays();
        g.globalAlpha = k; g.drawImage(RAYS.c, 0, 0, L.W, L.H); g.globalAlpha = 1;
        // dust drifting in the beams
        g.fillStyle = 'rgba(255,236,190,0.75)';
        dust.forEach(d => {
          const yy = ((d.y + t * d.v * 0.03) % 1), x = w.x + w.w * 0.1 + (d.x * L.W * 0.6) + yy * L.W * 0.25 + Math.sin(t + d.p) * 6, y = w.y + w.h + yy * (L.H * 0.7);
          g.globalAlpha = k * (0.35 + 0.35 * Math.sin(t * 1.5 + d.p)); g.beginPath(); g.arc(x, y, d.r, 0, TAU); g.fill();
        });
        g.globalAlpha = 1;
      }
      function drawBell(g, t) {
        // a brass shop bell on a bracket by the window; it swings when it rings
        const bx = L.bell.x, by = L.bell.y, sw = Math.sin(t * 22) * 0.4 * G.bell;
        g.strokeStyle = K.dark() ? '#8a6a4a' : '#6b4a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(bx - 16, by - 20); g.lineTo(bx, by - 20); g.lineTo(bx, by - 12); g.stroke();
        g.save(); g.translate(bx, by - 12); g.rotate(sw);
        g.fillStyle = brass(g, -12, 0, 12, 0); g.beginPath(); g.moveTo(-3, 0); g.quadraticCurveTo(-11, 2, -12, 18); g.lineTo(12, 18); g.quadraticCurveTo(11, 2, 3, 0); g.closePath(); g.fill();
        g.fillStyle = '#7a4c12'; g.fillRect(-13, 17, 26, 3);
        g.beginPath(); g.arc(Math.sin(sw * 3) * 4, 22, 3, 0, TAU); g.fill();
        g.restore();
        if (G.bell > 0.05 && !RM()) { g.strokeStyle = `rgba(255,220,140,${0.5 * G.bell})`; g.lineWidth = 2; [12, 20].forEach((r, i) => { g.beginPath(); g.arc(bx, by, r + (1 - G.bell) * 18 + i * 4, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(bx, by, r + (1 - G.bell) * 18 + i * 4, Math.PI - 0.9, Math.PI + 0.9); g.stroke(); }); }
      }
      function onBeat(i) { void i; }
      function syncDom() {
        // the parcel label, the felt stamp, the pan sum and the hit areas follow the swinging pans
        const Pc = G.parcel, sz = parcelSize(), pw = sz.w * Pc.s, phh = sz.h * Pc.s;
        if (Pc.state !== 'away') {
          pos(plabel, Pc.x - 2, Pc.y - phh * 0.52);
          pos(feels, Pc.x + pw * 0.38, Pc.y - phh - 12);
        }
        if (!G.drag && Pc.state === 'deliver' && !Pc.fly) { pos(phit, Pc.x - pw / 2 - 8, Pc.y - phh - 20); phit.style.width = (pw + 28) + 'px'; phit.style.height = (phh + 28) + 'px'; }
        const pp = panPos(1);
        pos(sum, pp.x, pp.y + 16 * L.s);
        ITEMS.forEach(it => { if (it.state === 'pan' && !it.fly) pos(it.hit, it.x, it.y); });
      }

      /* ---------------- step 1: the parcel arrives ---------------- */
      function deliver() {
        const Pc = G.parcel;
        Pc.state = 'deliver'; Pc.x = -160; Pc.y = L.deliver.y;
        Pc.fly = { k: 0, dur: RM() ? 0.2 : 0.75, x: -160, y: L.deliver.y, arc: 0, to: () => ({ x: L.deliver.x, y: L.deliver.y }), done: () => {
          G.shake = RM() ? 0 : 0.8; K.sfx.thud(); bell(); P.emit('dust', L.deliver.x, L.deliver.y, 16, { colors: ['rgba(220,190,150,0.55)'] });
          plabel.hidden = false; plabel.classList.remove('is-gone');
          G.stage = 'parcel'; G.arc = true;
          say(care() ? LN.startCare : LN.start, { mood: 'panic', moodMs: 1600, ms: 4600 });
          K.guide({ id: 'parcel', g: 'drag', target: phit, dir: 'l', d: 70, label: 'DRAG IT ONTO THE SCALE', delay: 1100 });
        } };
        K.sfx.whoosh();
      }
      function grabParcel(p) {
        if (G.stage !== 'parcel' || G.parcel.state !== 'deliver') return false;
        G.drag = { kind: 'parcel', x: p.x, y: p.y, over: false }; G.arc = false;
        K.sfx.pop(undefined, 300); if (A.ctx) A.tone({ type: 'triangle', freq: 140, to: 220, glide: 0.1, dur: 0.14, vol: 0.08 });
        rush.face('wow', 700);
      }
      function moveDrag(p) {
        const D = G.drag; if (!D) return;
        D.x = p.x; D.y = p.y;
        const pp = panPos(D.kind === 'parcel' ? 0 : 1);
        D.over = Math.abs(p.x - pp.x) < L.panW * 0.75 && p.y > pp.y - 170 && p.y < pp.y + 60;
      }
      function dropParcel(p) {
        const D = G.drag; if (!D || D.kind !== 'parcel') return;
        G.drag = null; moveDrag(p);
        if (D.over) parcelToPan();
        else { const Pc = G.parcel; Pc.fly = { k: 0, dur: 0.35, x: Pc.x, y: Pc.y, arc: 10, to: () => ({ x: L.deliver.x, y: L.deliver.y }) }; K.sfx.soft(); G.arc = true; K.guide({ id: 'parcel2', g: 'drag', target: phit, dir: 'l', d: 70, label: 'DRAG IT ONTO THE SCALE', delay: 1400 }); }
      }
      function parcelToPan() {
        const Pc = G.parcel; if (G.stage !== 'parcel') return;
        G.stage = 'slam'; K.guide(null); G.arc = false;
        phit.hidden = true;
        Pc.fly = { k: 0, dur: RM() ? 0.12 : 0.28, x: Pc.x, y: Pc.y, arc: 20, to: () => { const pp = panPos(0); return { x: pp.x, y: pp.y - 2 }; }, done: () => slam() };
      }
      function slam() {
        const Pc = G.parcel; Pc.state = 'pan';
        G.av += RM() ? 0 : 3.4; G.swv[0] += 2; G.shake = RM() ? 0 : 1;
        K.sfx.thud(); if (A.ctx) { A.thud({ vol: 0.5 }); A.noise({ filter: 'bandpass', freq: 420, to: 200, q: 6, dur: 0.5, vol: 0.12 }); }
        const pp = panPos(0); P.emit('dust', pp.x, pp.y, 22, { colors: ['rgba(230,200,160,0.6)'] });
        feels.classList.add('on');
        rush.base('worried'); rush.react('shake');
        say(LN.slam, { mood: 'panic', moodMs: 1500, ms: 3800 });
        S.later(startWeigh, RM() ? 600 : 2000);
      }

      /* ---------------- step 2: weigh against real things ---------------- */
      function startWeigh() {
        G.stage = 'weigh';
        G.hintIt = ITEMS.find(i => i.id === (T === 4 ? 'tyre' : 'phone'));
        G.arc = true;
        say(LN.weigh, { mood: 'think', ms: 5200 });
        guideItem(900);
      }
      function guideItem(delay) {
        const it = G.hintIt && G.hintIt.state === 'shelf' ? G.hintIt : ITEMS.find(i => i.state === 'shelf');
        if (!it) return;
        K.guide({ id: 'item', g: 'drag', target: it.hit, dir: panPos(1).x >= it.hx ? 'r' : 'l', d: 50, label: G.placed ? 'ADD OR REMOVE ITEMS' : 'DRAG ONTO THE RIGHT PAN', place: 'above', delay });
      }
      function grabItem(it, p) {
        if (G.stage !== 'weigh' || it.fly) return false;
        if (it.state === 'pan') { removeAt(it); }
        else if (it.state !== 'shelf') return false;
        it.state = 'drag'; G.drag = { kind: 'item', it, x: p.x, y: p.y, over: false }; G.arc = false;
        it.tag.classList.add('is-away');
        K.sfx.pop(undefined, 500 + it.w * 60);
        if (A.ctx) A.tone({ type: 'sine', freq: 900 + it.w * 80, dur: 0.06, vol: 0.05 });
      }
      function dropItem(it, p) {
        const D = G.drag; if (!D || D.it !== it) return;
        G.drag = null; moveDrag(p);
        if (D.over && G.onPan.length < 4) toPan(it, true); else toShelf(it, true);
      }
      function removeAt(it) {
        const i = G.onPan.indexOf(it); if (i >= 0) G.onPan.splice(i, 1);
        G.onPan.forEach((q, j) => { q.panI = j; });
        it.panI = -1;
        updateSum();
        G.balanced = false;
      }
      function toPan(it, fromDrag) {
        if (G.stage !== 'weigh' || G.onPan.length >= 4) { toShelf(it, fromDrag); return; }
        if (it.state === 'pan') return;
        it.state = 'fly'; G.moves++;
        it.panI = G.onPan.length; G.onPan.push(it);
        it.fly = { k: 0, dur: fromDrag ? 0.18 : 0.45, x: it.x, y: it.y, arc: fromDrag ? 6 : 40, to: () => panItemPos(it), done: () => {
          it.state = 'pan';
          G.swv[1] += 1.2 + it.w * 0.15; G.av -= RM() ? 0 : 0.6 + it.w * 0.12;
          clink(it.w);
          const pp = panPos(1); P.emit('spark', pp.x, pp.y - 6, 8, { colors: ['#fff3c4', '#ffd36b'], speed: [60, 160] });
          if (G.first == null) { G.first = it.w; G.felt = false; twist(it); }
          updateSum(); judge(it);
        } };
        it.tag.classList.add('is-away');
        K.guide(null);
      }
      function toShelf(it, fromDrag) {
        if (it.state === 'pan') { removeAt(it); G.moves++; }
        it.state = 'fly';
        it.fly = { k: 0, dur: fromDrag ? 0.3 : 0.45, x: it.x, y: it.y, arc: 30, to: () => ({ x: it.hx, y: it.hy }), done: () => { it.state = 'shelf'; it.tag.classList.remove('is-away'); pos(it.hit, it.hx, it.hy); if (A.ctx) A.wood(undefined, 0.08, 0.7); } };
        K.sfx.soft();
        if (G.stage === 'weigh') { S.later(() => { if (G.stage === 'weigh') judge(null); }, 500); }
      }
      function clink(w) {
        if (!A.ctx) return;
        const f = 1500 + w * 140;
        A.tone({ type: 'sine', freq: f, dur: 0.18, vol: 0.06, verb: 0.3 }); A.tone({ when: A.now() + 0.05, type: 'sine', freq: f * 1.5, dur: 0.22, vol: 0.04, verb: 0.3 });
        A.thud({ vol: 0.08 + w * 0.02 });
        A.sync('clink', performance.now());
      }
      function updateSum() {
        if (G.quietSum) return;
        const c = counterWeight();
        if (!G.onPan.length) { sum.classList.remove('on'); return; }
        sum.textContent = G.onPan.map(i => i.w).join(' + ') + (G.onPan.length > 1 ? ' = ' + c : '');
        sum.classList.add('on');
      }
      function twist(it) {
        // the felt 10 meets a real thing: the parcel is lifted, and packing peanuts spill out
        const pp = panPos(0);
        for (let i = 0; i < (inten === 0 ? 8 : 14); i++) G.peanuts.push({ x: pp.x + (Math.random() - 0.5) * 50, y: pp.y - 60, vx: (Math.random() - 0.5) * 220, vy: -160 - Math.random() * 200, r: Math.random() * 6, vr: (Math.random() - 0.5) * 10, life: 2.2 + Math.random() });
        if (A.ctx) { A.tone({ type: 'sine', freq: 300, to: 900, glide: 0.35, dur: 0.4, vol: 0.06 }); }
        feels.innerHTML = ''; feels.append(h('s', { text: '10' }), document.createTextNode('?'));
        rush.base('surprised');
        const lines2 = it.w < T ? LN.lighter : it.w > T ? LN.heavier : null;
        if (serious()) say(LN.twistReal, { mood: 'think', ms: 4200 });
        else say(it.w === T ? LN.twistExact : LN.twist, { mood: 'wow', ms: 4200 });
        G.twistLine = lines2;
      }
      function judge(last) {
        if (G.stage !== 'weigh') return;
        const c = counterWeight();
        if (c === T && G.onPan.length) { balanced(); return; }
        G.balanced = false;
        if (last && G.placed++ > 0) {
          if (c < T) say(LN.lighter, { mood: 'think', ms: 2600 });
          else say(LN.heavier, { mood: 'surprised', ms: 2600 });
        }
        if (c > T && A.ctx) A.boing({ freq: 200, vol: 0.05 });
        guideItem(c > T ? 2600 : 2200);
        if (c > T) K.guide({ id: 'remove', g: 'tap', target: G.onPan[G.onPan.length - 1].hit, label: 'TAP TO PUT IT BACK', delay: 2600 });
      }

      /* ---------------- step 3: balanced, shrink and wrap ---------------- */
      function balanced() {
        if (G.stage !== 'weigh') return;
        G.stage = 'balanced'; G.balanced = true; K.guide(null); G.arc = false;
        const match = itemOf(T);
        G.match = G.onPan.length === 1 ? G.onPan[0] : match;
        G.usedNames = G.onPan.map(i => i.name);
        K.sfx.great(); bell();
        const pp = panPos(0), qq = panPos(1);
        [pp, qq].forEach(q => P.emit('star', q.x, q.y - 30, 10, { colors: ['#fff3c4', '#ffd36b', '#ffffff'] }));
        rush.base('happy'); rush.react('bounce');
        say(serious() ? LN.balancedReal : LN.balanced, { mood: 'celebrate', moodMs: 1400, ms: 5200 });
        // the parcel shrinks to its calibrated size: packing spills out
        S.later(() => {
          const Pc = G.parcel; Pc.shrinkTo = clamp(0.42 + T * 0.065, 0.5, 0.9);
          plabel.classList.add('is-gone');
          feels.classList.add('is-weighed'); feels.innerHTML = ''; feels.append(h('s', { text: '10' }), document.createTextNode('WEIGHS ' + T));
          for (let i = 0; i < (inten === 2 ? 26 : 18); i++) G.peanuts.push({ x: pp.x + (Math.random() - 0.5) * 60, y: pp.y - 70, vx: (Math.random() - 0.5) * 300, vy: -200 - Math.random() * 260, r: Math.random() * 6, vr: (Math.random() - 0.5) * 12, life: 2.4 + Math.random() });
          if (A.ctx) { A.noise({ filter: 'bandpass', freq: 1800, to: 600, q: 1.2, dur: 0.5, vol: 0.08 }); A.tone({ type: 'sine', freq: 700, to: 250, glide: 0.4, dur: 0.45, vol: 0.06 }); }
          S.later(() => {
            G.stage = 'wrap';
            wrapBtn.hidden = false; wrapBtn.classList.add('is-new'); K.sfx.ok();
            K.guide({ id: 'wrap', g: 'tap', target: wrapBtn, label: 'TAP: WRAP TO SIZE', delay: 1200 });
          }, RM() ? 200 : 900);
        }, RM() ? 200 : 700);
      }
      K.tap(wrapBtn, () => {
        if (G.stage !== 'wrap') return;
        G.stage = 'wrapping'; K.guide(null);
        wrapBtn.hidden = true;
        const Pc = G.parcel; Pc.wrapping = true;
        if (A.ctx) { A.paper({ vol: 0.16 }); A.paper({ when: A.now() + 0.25, vol: 0.12 }); A.tone({ when: A.now() + 0.6, type: 'triangle', freq: 500, to: 1100, glide: 0.25, dur: 0.3, vol: 0.06 }); }
        S.later(() => {
          Pc.bowing = true; K.sfx.pop(); K.sfx.sparkle(); P.emit('star', Pc.x, Pc.y - parcelSize().h * Pc.s - 8, 12, { colors: [PAPER.rib, '#ffffff', '#ffd36b'] });
          feels.classList.remove('on'); void feels.offsetWidth; feels.classList.add('on');
          say(LN.wrapped, { mood: 'happy', ms: 3200 });
          if (serious()) S.later(coupon, 900); else S.later(finale, 1500);
        }, RM() ? 250 : 850);
      });
      function coupon() {
        G.stage = 'coupon';
        const leads = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text).slice(0, 3);
        const card = h('button', { type: 'button', class: 'ss-coupon', 'aria-label': 'Plan coupon. Tap to keep it.' }, h('h3', { text: 'Plan coupon · valid any day' }), h('ol', null, (leads.length ? leads : [{ text: 'Write down the next single step, then pause for tonight.' }]).map(l => h('li', { text: K.sentence(K.words(l.text, 16)) }))), h('em', { text: 'Tap to keep it' }));
        card.style.setProperty('--ss-notch', K.dark() ? '#4a2c1a' : '#8a5530');
        const keep = card;
        dock.innerHTML = ''; dock.append(card);
        if (A.ctx) for (let i = 0; i < 6; i++) A.typeKey({ when: A.now() + i * 0.06, vol: 0.06 });
        say(LN.coupon, { mood: 'determined', ms: 5200 });
        G.couponEl = card; G.keepBtn = keep;
        K.tap(keep, () => {
          if (G.stage !== 'coupon') return;
          G.stage = 'kept'; K.guide(null);
          card.classList.add('is-taken');
          if (A.ctx) { A.noise({ filter: 'highpass', freq: 3000, dur: 0.18, vol: 0.08 }); }
          K.sfx.lock();
          S.later(() => { dock.innerHTML = ''; finale(); }, 600);
        });
        K.guide({ id: 'coupon', g: 'tap', target: keep, label: 'TAP: KEEP THE PLAN', delay: 2400, place: 'above' });
      }
      function bell() { G.bell = 1; if (A.ctx) { const t0 = A.now(); A.chime(A.note('E6'), { when: t0, vol: 0.1, dur: 1.6 }); A.chime(A.note('C6'), { when: t0 + 0.14, vol: 0.08, dur: 1.8 }); A.sync('bell', performance.now()); } }

      /* ---------------- finale: shelved among ordinary things ---------------- */
      let finished = false;
      async function finale() {
        if (G.stage === 'end') return;
        G.stage = 'end'; K.guide(null);
        const match = G.match || itemOf(T);
        // items on the pan return home, the shelf opens a gap beside the match, the parcel flies in
        sum.classList.remove('on'); G.quietSum = true;
        G.onPan.slice().forEach(it => { removeAt(it); it.state = 'fly'; it.fly = { k: 0, dur: 0.5, x: it.x, y: it.y, arc: 30, to: () => ({ x: it.hx, y: it.hy }), done: () => { it.state = 'shelf'; it.tag.classList.remove('is-away'); } }; });
        sum.classList.remove('on');
        const Pc = G.parcel; Pc.state = 'fly';
        const target = () => ({ x: slotX(match) + (match.slot < 3 ? 0.54 : -0.54) * L.slotW, y: L.shelfY[match.shelf] });
        Pc.shrinkTo = L.ph ? 0.42 : 0.48;
        feels.classList.remove('on');
        Pc.fly = { k: 0, dur: RM() ? 0.3 : 1.0, x: Pc.x, y: Pc.y, arc: 90, to: target, done: () => { Pc.state = 'shelf'; K.sfx.thud(); if (A.ctx) A.wood(undefined, 0.15, 0.6); P.emit('dust', Pc.x, Pc.y, 8, { colors: ['rgba(240,210,170,0.6)'] }); } };
        K.sfx.whoosh();
        await K.sleep(1100);
        printReceipt(match);
        bell(); S.later(bell, 700);
        rush.base('celebrate'); rush.react('bounce');
        say(serious() ? LN.finalReal : LN.final, { ms: 0 });
        if (M) M.level(0.9);
        await K.finale('ripple', { from: [{ x: L.bell.x, y: L.bell.y }, { x: G.parcel.x, y: G.parcel.y - 20 }], count: 4, colors: ['#ffd08a', '#fff1c4', '#ffb36b', '#ffe3a3'], chord: ['F4', 'A4', 'C5', 'E5'], ms: RM() ? 1800 : 4300 });
        const R = rewards(match);
        finished = true;
        ctx.finish({
          title: serious() ? 'Weighed honestly, with a plan' : 'Weighed and shelved', mood: 'celebrate',
          lines: ['Felt like 10, weighs about ' + T, 'Shelved next to ' + match.the, serious() ? 'Plan coupon kept' : 'First guess: ' + (G.first == null ? '-' : G.first) + ' (real weight ' + T + ')'],
          share: 'A worry that felt like a 10 weighed in at ' + T + ' at the Scale Shop.',
          badges: R.badges
        });
      }
      function printReceipt(match) {
        const used = G.usedNames && G.usedNames.length ? G.usedNames : [match.name];
        const rows = [['1 × worry, as felt', '10'], ['Shelved next to', match.name.toLowerCase()], serious() ? ['Plan coupon', 'kept'] : ['Weighed against', used.join(' + ').toLowerCase()]];
        const card = h('div', { class: 'ss-receipt', role: 'status' }, h('h3', { text: 'SCALE SHOP' }), h('small', { text: 'Receipt · ' + PAPER.name + ' wrap' }),
          h('ul', null, rows.map(([a, b]) => h('li', null, h('span', { text: a }), h('b', { text: b })))),
          h('div', { class: 'ss-total' }, h('span', { text: 'Real weight' }), h('b', { text: T + ' / 10' })), h('em', { text: 'Thank you, come again' }));
        dock.innerHTML = ''; dock.append(card);
        pos(dock, L.ph ? L.W / 2 : L.W / 2 + Math.min(300, L.W * 0.22), L.counterY + (L.ph ? -16 : 8));
        if (L.ph) dock.style.left = '50%';
        if (A.ctx) for (let i = 0; i < 10; i++) A.typeKey({ when: A.now() + i * 0.07, vol: 0.05 });
      }
      function rewards() {
        const diff = G.first == null ? 6 : Math.abs(G.first - T), score = clamp(1 - diff / 5, 0, 1), tier = K.tier(score, [0.35, 0.75, 0.95]);
        const best = K.best('estimate', diff, 'lower');
        const col = K.collect(PAPER.name);
        const badges = [];
        if (tier) badges.push(tier + ' estimate');
        if (best.isNew) badges.push('New best: first guess within ' + diff);
        badges.push(col.isNew ? 'Collected: ' + PAPER.name + ' paper' : PAPER.name + ' paper · ' + col.count + ' of ' + PAPERS.length);
        ctx.track('result', { T, first: G.first == null ? -1 : G.first, moves: G.moves, papers: col.count });
        return { badges };
      }

      /* ---------------- lines (every vibe) ---------------- */
      function lines() {
        const name = () => (G.match || itemOf(T)).the;
        return {
          start: { Jolly: 'Delivery! A huge one! Quick, let’s see what it really weighs.', Cheeky: 'Oof, that box nearly took the door off. On the scale with it!', Unfiltered: 'Big parcel. Feels massive. Scale. Now.' },
          startCare: { Jolly: 'This one sounds genuinely tough. Let’s weigh it properly, no pretending.', Cheeky: 'Serious parcel. No jokes from me. Let’s weigh it fairly.', Unfiltered: 'Real problem. We weigh it honestly.' },
          slam: { Jolly: 'TEN?! It slammed the scale flat! That’s how it feels.', Cheeky: 'Ten out of ten, apparently. The scale is clutching its pearls.', Unfiltered: 'Feels like a 10. Feelings aren’t a scale though.' },
          weigh: { Jolly: 'Now compare it with real things. Drag over something that weighs about the same.', Cheeky: 'Grab something off the shelf that feels about as bad. Go on.', Unfiltered: 'Real things on the other pan. Start with your best guess.' },
          twist: { Jolly: 'Wait… it’s nowhere near 10. It’s mostly packing foam!', Cheeky: 'Ten? Hang on, it’s mostly bubble wrap.', Unfiltered: 'It felt like 10. It isn’t.' },
          twistExact: { Jolly: 'Whoa, look at that beam! First try!', Cheeky: 'Show-off. First guess, dead level.', Unfiltered: 'First guess. Level.' },
          twistReal: { Jolly: 'Not a 10, but it does have real weight. Let’s find out exactly how much.', Cheeky: 'Less than 10. Still heavy. Keep weighing.', Unfiltered: 'Not 10. Still heavy. Keep going.' },
          lighter: { Jolly: 'The parcel’s still heavier. Add a little more.', Cheeky: 'Parcel’s winning. Add something.', Unfiltered: 'Heavier. Add more.' },
          heavier: { Jolly: 'Whoa, the other side dropped! It’s lighter than that. Tap something to put it back.', Cheeky: 'Too much! Your parcel’s lighter than that pile. Take something off.', Unfiltered: 'Too heavy. Take something off.' },
          balanced: { Jolly: 'Balanced! About as heavy as ' + '{m}' + '. Annoying, real, and fixable.', Cheeky: 'Dead level. Same as {m}. Rude, but survivable.', Unfiltered: 'Level. About {m}.' },
          balancedReal: { Jolly: 'Level at {t}. That’s genuinely heavy, like {m}. Heavy things get a plan.', Cheeky: 'It’s a {t}. Properly heavy. You get a coupon for that.', Unfiltered: '{t}. Real weight. Plan coming.' },
          wrapped: { Jolly: 'Wrapped to its real size. Much easier to carry.', Cheeky: 'Look at that. Shrink-wrapped drama.', Unfiltered: 'Right size. Wrapped.' },
          coupon: { Jolly: 'Here, a plan coupon. Valid any day, no expiry.', Cheeky: 'Coupon! Redeemable for one actual next step.', Unfiltered: 'Plan. Take it.' },
          final: { Jolly: 'Shelved next to {m}. Just one more ordinary thing in the shop.', Cheeky: 'Filed under “things that happen to people”.', Unfiltered: 'Shelved. Ordinary size.' },
          finalReal: { Jolly: 'Shelved at its real weight, with a plan in your pocket.', Cheeky: 'Heavy, but shelved. And you’ve got the coupon.', Unfiltered: 'Shelved. Plan in hand.' },
          _name: name
        };
      }
      const rawSay = say;
      say = function (o, so) { const m = LN._name(); const fill = (v) => typeof v === 'string' ? v.split('{m}').join(m).split('{t}').join(String(T)) : v; return rawSay({ Jolly: fill(o.Jolly), Cheeky: fill(o.Cheeky), Unfiltered: fill(o.Unfiltered) }, so); };

      /* ---------------- start ---------------- */
      cv.onResize(() => place());
      S.on('theme', () => { el.classList.toggle('ss-dark', K.dark()); el.classList.toggle('ss-bright', !K.dark()); paintBG(); });
      if (ctx.analysisReady && ctx.analysisReady.then) ctx.analysisReady.then(a => {
        if (!a || a === an || (G.stage !== 'intro' && G.stage !== 'parcel')) return;
        an = a; T = trueWeight(); CONCL = K.words(trimEnd(an.conclusion || an.thought) || CONCL, 9); plabel.lastChild.textContent = CONCL;
      }).catch(() => {});
      (async () => {
        M = K.music('musicbox'); M.level(0.55);
        await K.intro({ title: 'Scale Shop', sub: 'Some worries arrive like a ton of bricks. This shop has a brass scale and an honest shelf.', how: 'Drag the parcel onto the scale, then balance it with everyday things.', char: 'rush', mood: 'determined' });
        deliver();
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = performance.now(); while (!fn()) { if (performance.now() - t0 > (ms || 20000)) return false; await K.wait(80); } return true; };
          await until(() => G.stage === 'parcel', 15000);
          await K.wait(800);
          const r = K.rectIn(phit), pp = panPos(0);
          await K.sim.drag(phit, { x: r.w / 2, y: r.h / 2 }, { x: pp.x - r.x, y: pp.y - 40 - r.y }, 700, 18);
          await until(() => G.stage === 'weigh', 8000);
          await K.wait(900);
          // first a lighter guess, then top it up to balance (or a heavier guess and take it back)
          const exact = ITEMS.find(i => i.w === T), light = ITEMS.find(i => i.w === T - 1) || ITEMS[0], top = ITEMS.find(i => i.w === 1 && i !== light);
          const dragTo = async (it) => { const rr2 = K.rectIn(it.hit), q = panPos(1); await K.sim.drag(it.hit, { x: rr2.w / 2, y: rr2.h / 2 }, { x: q.x - rr2.x, y: q.y - 30 - rr2.y }, 600, 14); await until(() => it.state === 'pan' || G.stage !== 'weigh', 3000); };
          if (T >= 2 && top && light !== top) { await dragTo(light); await K.wait(1300); if (G.stage === 'weigh') await dragTo(top); }
          else await dragTo(exact);
          await K.wait(600);
          if (G.stage === 'weigh') { while (G.onPan.length) { const it = G.onPan[G.onPan.length - 1]; await K.sim.tap(it.hit); it.hit.click(); await K.wait(700); } await dragTo(exact); }
          await until(() => G.stage === 'wrap', 8000);
          await K.wait(900);
          await K.sim.tap(wrapBtn);
          await until(() => G.stage === 'coupon' || G.stage === 'end', 8000);
          if (G.stage === 'coupon') { await K.wait(1800); await K.sim.tap(G.keepBtn); }
          await until(() => finished, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
