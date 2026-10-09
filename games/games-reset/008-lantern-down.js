/* 008 Lantern Down — Reset · QUIET · Sleep / Winding Down
 * Mechanism: worry postponement plus stimulus control for sleep (Borkovec et al. 1983; Bootzin 1972). Each of
 * tomorrow's items is parked in a "Tomorrow" postbox while the player pulls a lit window's blind down slowly; slow,
 * deliberate movement, a dimming city and a slowing music box all lower arousal before bed.
 * Verb: pull (a slow vertical drag with a speed limit). Finale: the city sleeps, the moon (Still) yawns and dims, the
 * camera tilts up to tonight's constellation, a slow shooting star crosses and a soft aurora settles over the rooftops.
 */
(function (env) {
  'use strict';
  /* Machines that draw without a graphics card get a lighter canvas, so the night stays smooth. */
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

  /* Window silhouettes in a 120 x 80 box: [svg path data, options]. o.s = stroke width, o.a = alpha, o.c = colour. */
  const C = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
  const E = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0z`;
  const SIL = {
    reader: [['M16 80V54c0-8 5-12 12-12h3v-9c0-5 4-8 9-8h24c5 0 9 3 9 8v9h3c7 0 12 4 12 12v26z', { a: 0.5 }], [C(50, 31, 8)], ['M37 62c0-14 6-21 13-21s13 7 13 21z'], ['M56 47l15-6 3 9-15 6z'], ['M103 80V33', { s: 2.5 }], ['M93 34h20l-5-13h-10z']],
    cat: [['M8 74h104v6H8z', { a: 0.6 }], ['M40 74c-9 0-13-6-13-15s6-15 15-15 14 6 14 15-4 15-13 15z'], [C(42, 40, 9)], ['M34 36l1-11 7 7zM50 36l-1-11-7 7z'], ['M54 70c10 2 18-2 16-14', { s: 4.5 }], ['M88 74h16l-2-10H90z'], ['M96 64c-9-8-8-20 0-28 8 8 9 20 0 28zM96 64c3-10 10-15 18-14-3 9-9 14-18 14zM96 64c-4-9-11-13-19-11 3 8 10 12 19 11z']],
    laptop: [['M10 56h100v4H10z'], ['M18 60v20M102 60v20', { s: 3 }], [C(36, 27, 8)], ['M22 56c0-15 6-23 14-23s14 8 14 23z'], ['M58 56l7-20h26l-7 20z'], ['M61 54l5.5-15.5h21.5l-5.5 15.5z', { c: '#a9dcff', a: 0.8 }], ['M94 48h9v8h-9z']],
    stretch: [[C(60, 33, 8)], ['M48 80l2-26c0-9 5-14 10-14s10 5 10 14l2 26z'], ['M52 46L40 20M68 46l12-26', { s: 6 }], ['M90 80V62h22v18z', { a: 0.5 }], ['M10 80V66h18v14z', { a: 0.5 }]],
    plants: [['M30 0v12', { s: 1.5 }], ['M22 12h16l-3 9h-10z'], ['M25 20c-6 8-8 18-4 26M35 20c5 10 6 20 2 28M30 21c0 10 1 22-2 32', { s: 2.5 }], ['M78 80h24l-3-14H81z'], ['M90 66c-14-8-20-24-12-40 14 6 18 22 12 40zM90 66c4-16 16-26 30-24-4 14-16 22-30 24zM90 66c-2-18 4-34 14-44 6 14 2 32-14 44z'], ['M44 80h14l-2-9H46z'], ['M51 71c-3-6-2-13 0-17 3 4 3 11 0 17z']],
    tea: [['M20 80V58h80v22z', { a: 0.45 }], [C(54, 31, 8)], ['M40 70c0-18 6-28 14-28s14 10 14 28z'], ['M64 46h10v11h-10z']],
    guitar: [['M46 80l4-16h20l4 16', { s: 3 }], [C(60, 27, 8)], ['M47 64c0-18 6-28 13-28s13 10 13 28z'], [E(70, 57, 11, 8.5)], ['M74 51l24-20', { s: 3.5 }], ['M14 80V40h10v40zM26 80V46h8v34z', { a: 0.5 }]],
    books: [['M12 22h60v4H12zM12 46h60v4H12zM12 70h60v4H12z', { a: 0.7 }], ['M16 22V8h5v14zM22 22V10h4v12zM28 22V6h6v16zM36 22V12h4v10zM44 46V30h5v16zM50 46V33h6v13zM58 46V28h4v18zM18 70V56h6v14zM26 70V54h5v16zM33 70V58h7v12z'], ['M92 80V70h14v10z'], ['M99 70V44', { s: 2.5 }], ['M99 44l-12-6 4-8 13 8z']],
    writer: [['M18 56h84v4H18z'], ['M26 60v20M94 60v20', { s: 3 }], [C(48, 28, 8)], ['M34 56c0-15 6-22 14-22s14 7 14 22z'], ['M58 52l18-3 1 4-18 3z', { a: 0.8 }], ['M84 56V40', { s: 2.5 }], ['M76 40h16l-4-10h-8z']]
  };
  /* Tonight's constellation (the collectible). Points in a unit box, edges join them. */
  const CONS = [
    { name: 'The Teapot', pts: [[0.18, 0.55], [0.3, 0.35], [0.62, 0.35], [0.74, 0.55], [0.62, 0.78], [0.3, 0.78], [0.04, 0.38], [0.92, 0.42], [0.46, 0.18]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 6], [3, 7], [1, 8], [8, 2]] },
    { name: 'The Paper Boat', pts: [[0.04, 0.62], [0.96, 0.62], [0.78, 0.88], [0.22, 0.88], [0.5, 0.62], [0.5, 0.1], [0.82, 0.54]], edges: [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 4]] },
    { name: 'The Sleeping Cat', pts: [[0.1, 0.72], [0.3, 0.45], [0.6, 0.4], [0.86, 0.55], [0.8, 0.8], [0.45, 0.86], [0.2, 0.3], [0.34, 0.26], [0.98, 0.84]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [1, 6], [6, 7], [7, 2], [4, 8]] },
    { name: 'The Kite', pts: [[0.5, 0.02], [0.8, 0.34], [0.5, 0.64], [0.2, 0.34], [0.4, 0.8], [0.58, 0.9], [0.44, 0.99]], edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [2, 4], [4, 5], [5, 6]] },
    { name: 'The Little Whale', pts: [[0.06, 0.56], [0.3, 0.36], [0.62, 0.38], [0.82, 0.56], [0.62, 0.76], [0.3, 0.74], [0.97, 0.36], [0.97, 0.76], [0.3, 0.14], [0.4, 0.04]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [3, 6], [3, 7], [1, 8], [8, 9]] },
    { name: 'The Lantern', pts: [[0.5, 0.02], [0.5, 0.15], [0.3, 0.26], [0.7, 0.26], [0.24, 0.64], [0.76, 0.64], [0.36, 0.86], [0.64, 0.86]], edges: [[0, 1], [1, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 6], [5, 7], [6, 7]] },
    { name: 'The Snail', pts: [[0.06, 0.84], [0.9, 0.84], [0.66, 0.5], [0.46, 0.3], [0.26, 0.46], [0.36, 0.64], [0.52, 0.56], [0.94, 0.56], [0.99, 0.42]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [1, 7], [7, 8]] }
  ];
  const FACADES = [
    { base: [112, 58, 52], trim: '#eadcc4', roof: [58, 62, 84] }, { base: [126, 98, 74], trim: '#f1e6d2', roof: [70, 60, 72] },
    { base: [70, 82, 110], trim: '#e3e6ee', roof: [52, 50, 66] }, { base: [138, 76, 56], trim: '#f3e2cc', roof: [64, 58, 80] }
  ];
  const LIGHTS = [['#fff0bd', '#ffc56a', '#d97a32'], ['#ffe8c4', '#ffb27c', '#c8653b'], ['#fff6d0', '#ffd37c', '#e09848'], ['#ffeccc', '#ffc08f', '#cf7a52']];
  const BLINDS = [['#f4e8d2', '#d6c19c'], ['#dbe8d4', '#a8c09e'], ['#efd6d9', '#c8a0a8'], ['#d6e2f0', '#9fb4cd'], ['#f1e2c6', '#cbb085'], ['#e4daf2', '#b2a2cf']];
  const LULLABY = ['C6', 'A5', 'G5', 'E5', 'D5', 'C5', 'A4', 'G4', 'E4', 'C4'];

  function pickItems(an, n) {
    const own = [], seen = new Set();
    const add = (s) => {
      let l = String(s || '').replace(/\s+/g, ' ').trim().toUpperCase().replace(/[.!?,;:]+$/, '');
      const k = l.replace(/[^A-Z0-9]/g, '');
      if (!k || k.length < 2 || seen.has(k)) return;
      seen.add(k);
      if (l.length > 30) l = l.slice(0, 29) + '…';
      own.push(l);
    };
    const st = Array.isArray(an.strands) ? an.strands : [];
    if (an.task) add(an.task);
    st.filter(s => s && s.loop !== 'body' && s.loop !== 'urge').forEach(s => add(s.label));
    if (an.core && an.core.loop !== 'body' && an.core.loop !== 'urge') add(an.core.label);
    const mine = own.slice(0, n);
    const fill = ['LOOSE ENDS', 'ANYTHING ELSE', 'THE LITTLE THINGS', 'SOMEDAY STUFF', 'WHAT’S NEXT', 'THE REST OF IT'].filter(f => !seen.has(f.replace(/[^A-Z0-9]/g, '')));
    return { wins: mine.concat(fill.slice(0, Math.max(0, n - mine.length))), attic: own[n] || 'ONE MORE THING…', own: Math.min(n + 1, own.length) };
  }

  (env.games = env.games || []).push({
    id: 'lantern-down', mode: 'reset', name: 'Lantern Down', verb: 'pull', family: 'QUIET', minutes: 2,
    parents: ['Sleep / Winding Down', 'Mental Overload / Working Memory'],
    cast: ['still'], poster: { char: 'still', mood: 'E18' },
    tagline: 'Pull the city’s blinds down slowly and post tomorrow to tomorrow.',
    why: 'For a busy head at bedtime: park tomorrow’s list, slow right down, lights out.',
    css: `
.g-lantern-down .ld-world, .g-lantern-down .ld-fore { position: absolute; inset: 0; pointer-events: none; }
.g-lantern-down .ld-world { z-index: 12; }
.g-lantern-down .ld-fore { z-index: 14; }
.g-lantern-down .ld-halo { position: absolute; z-index: 11; border-radius: 50%; pointer-events: none; background: radial-gradient(closest-side, rgba(255, 246, 214, 0.72) 30%, rgba(255, 236, 196, 0.3) 46%, rgba(206, 220, 255, 0.1) 70%, rgba(206, 220, 255, 0) 100%); transition: opacity 2.6s ease; will-change: opacity; }
.g-lantern-down .ld-halo.ld-dim { opacity: 0.38; }
.g-lantern-down .ld-win { position: absolute; pointer-events: auto; touch-action: none; cursor: grab; outline: none; border-radius: 6px; }
.g-lantern-down .ld-win:focus-visible { box-shadow: 0 0 0 3px #ffe9a8; }
.g-lantern-down .ld-win.ld-done, .g-lantern-down .ld-win.ld-unlit { cursor: default; }
.g-lantern-down .ld-round { border-radius: 50%; }
.g-lantern-down .ld-sill { position: absolute; left: -10px; right: -10px; top: calc(var(--gh) + 10px); display: flex; justify-content: center; pointer-events: none; transition: opacity 0.6s ease; }
.g-lantern-down .ld-unlit .ld-sill { opacity: 0; }
.g-lantern-down .ld-note { display: block; max-width: 100%; padding: 5px 9px 4px; border-radius: 4px; background: #fbf4e4; color: #2b2335; font: 600 15px/1.18 var(--font-ui); letter-spacing: 0.02em; text-align: center; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.38); text-wrap: balance; }
.g-lantern-down .ld-round .ld-sill { right: auto; top: 50%; left: calc(100% + 14px); width: max-content; max-width: 172px; transform: translateY(-50%); justify-content: flex-start; }
.g-lantern-down .ld-fly { position: absolute; z-index: 36; left: 0; top: 0; pointer-events: none; will-change: transform; }
.g-lantern-down .ld-fly > span { position: relative; display: block; padding: 5px 9px 4px; border-radius: 4px; background: #fbf4e4; color: #2b2335; font: 600 15px/1.18 var(--font-ui); letter-spacing: 0.02em; text-align: center;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.38); transition: transform 0.55s cubic-bezier(.3, 1.3, .5, 1); transform-origin: 50% 50%; text-wrap: balance; }
.g-lantern-down .ld-fly > span::after { content: ""; position: absolute; inset: 0; border-radius: 4px; background: linear-gradient(180deg, rgba(0, 0, 0, 0) 47%, rgba(60, 40, 20, 0.3) 50%, rgba(0, 0, 0, 0) 53%); opacity: 0; transition: opacity 0.4s; }
.g-lantern-down .ld-fly.ld-fold > span { transform: perspective(260px) rotateX(62deg) scale(0.62); }
.g-lantern-down .ld-fly.ld-fold > span::after { opacity: 1; }
.g-lantern-down .ld-slow { position: absolute; z-index: 40; transform: translate(-50%, -100%); padding: 8px 13px; border-radius: 999px; background: rgba(22, 18, 50, 0.92); color: #ffe8b4; font: 600 15px/1 var(--font-ui);
  border: 1px solid rgba(255, 222, 150, 0.5); pointer-events: none; animation: ld-slowcue 1.7s ease both; white-space: nowrap; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35); }
@keyframes ld-slowcue { 0% { opacity: 0; transform: translate(-50%, -70%) scale(0.92); } 14%, 74% { opacity: 1; transform: translate(-50%, -100%); } 100% { opacity: 0; transform: translate(-50%, -125%); } }
.g-lantern-down .ld-box { position: absolute; width: 96px; height: 130px; margin-left: -48px; pointer-events: none; }
.g-lantern-down .ld-box-lamp { position: absolute; left: 50%; top: -46px; width: 150px; height: 150px; margin-left: -75px; border-radius: 50%; background: radial-gradient(closest-side, rgba(255, 214, 140, 0.5), rgba(255, 214, 140, 0.16) 50%, rgba(255, 214, 140, 0) 100%); opacity: var(--glow, 0.15); transition: opacity 0.9s ease; }
.g-lantern-down .ld-box-body { position: absolute; left: 8px; right: 8px; top: 0; height: 86px; border-radius: 40px 40px 9px 9px; background: linear-gradient(90deg, #1d5f58, #3a9a8d 42%, #2a7c71 62%, #174d47); box-shadow: inset 0 -7px 0 rgba(0, 0, 0, 0.22), inset 0 3px 0 rgba(255, 255, 255, 0.22), 0 12px 22px rgba(0, 0, 0, 0.45); transform-origin: 50% 100%; }
.g-lantern-down .ld-box-slot { position: absolute; left: 21px; right: 21px; top: 24px; height: 7px; border-radius: 4px; background: #082220; box-shadow: inset 0 2px 2px rgba(0, 0, 0, 0.6), 0 1px 0 rgba(255, 255, 255, 0.2); }
.g-lantern-down .ld-box-label { position: absolute; left: 0; right: 0; top: 44px; text-align: center; font: 800 14px/1 var(--font-display); color: #fff6e0; letter-spacing: 0.02em; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4); }
.g-lantern-down .ld-box-post { position: absolute; left: 50%; width: 14px; margin-left: -7px; top: 84px; bottom: 0; background: linear-gradient(90deg, #17202a, #3a4858, #17202a); border-radius: 2px; }
.g-lantern-down .ld-box-flag { position: absolute; right: -3px; top: 30px; width: 3px; height: 34px; border-radius: 2px; background: #c9d3dc; transform-origin: 50% 100%; transform: rotate(-90deg); transition: transform 0.6s cubic-bezier(.2, 1.5, .4, 1); }
.g-lantern-down .ld-box-flag::after { content: ""; position: absolute; left: 2px; top: 0; width: 15px; height: 11px; border-radius: 0 2px 2px 0; background: #ff7a5c; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); }
.g-lantern-down .ld-box.ld-has .ld-box-flag { transform: rotate(0deg); }
.g-lantern-down .ld-box-count { position: absolute; left: calc(100% - 26px); top: -12px; min-width: 32px; height: 32px; padding: 0 9px; border-radius: 16px; background: #ffd36b; color: #3a2405; font: 800 17px/32px var(--font-ui); text-align: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35); transform: scale(0); transition: transform 0.35s cubic-bezier(.2, 1.6, .4, 1); }
.g-lantern-down .ld-box.ld-has .ld-box-count { transform: scale(1); }
.g-lantern-down .ld-box.ld-bump .ld-box-body { animation: ld-bump 0.45s cubic-bezier(.2, 1.5, .4, 1); }
@keyframes ld-bump { 0% { transform: scale(1); } 35% { transform: scale(1.06, 0.93); } 70% { transform: scale(0.98, 1.03); } 100% { transform: scale(1); } }
.g-lantern-down .ld-cap { position: absolute; z-index: 16; transform: translate(-50%, 0); font: 600 14px/1.2 var(--font-ui); letter-spacing: 0.16em; text-transform: uppercase; color: #eef1ff; text-shadow: 0 2px 10px rgba(0, 0, 30, 0.9); opacity: 0; transition: opacity 1.6s ease; pointer-events: none; white-space: nowrap; }
.g-lantern-down .ld-cap.ld-on { opacity: 0.95; }
.g-lantern-down .ld-moondim .gk-char-img { filter: brightness(0.8) saturate(0.85) drop-shadow(0 8px 14px rgba(0, 0, 0, 0.35)); transition: filter 2.6s ease; }
.g-lantern-down .gk-char.ld-moon { animation: ld-float 6s ease-in-out infinite; }
@keyframes ld-float { 0%, 100% { translate: 0 0; } 50% { translate: 0 -5px; } }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis;
      const inten = ctx.intensity;
      const N = [4, 6, 8][inten], TOTAL = N + 1;
      const PULL = [1.5, 1.9, 2.3][inten];   // seconds: the fastest a blind will roll down
      const SNAP = [0.62, 0.44, 0.36][inten]; // how far a finger may run ahead before the blind springs back up
      const visits = K.visits();
      const DAY = { weather: K.dailyPick(['clear', 'snow', 'mist', 'fireflies', 'drizzle'], 1), cons: K.dailyPick(CONS, 2), fac: K.dailyPick(FACADES, 3) };
      const items = pickItems(an, N);
      const silOrder = K.shuffle(['reader', 'cat', 'laptop', 'stretch', 'plants', 'tea', 'guitar', 'books'], K.rng(K.daily() + 3));
      const line = (o) => ctx.line(o);
      const dark = () => K.dark();
      const PATHS = {};
      Object.keys(SIL).forEach(k => { PATHS[k] = SIL[k].map(([d, o]) => ({ p: new Path2D(d), o: o || {} })); });

      /* ---------------- scene ---------------- */
      const SOFT = softwareGfx(), cvOpts = { maxDpr: SOFT ? 1.25 : 2 }, cv = opaqueCanvas(el, cvOpts, S), qual = { acc: 0, n: 0, slow: 0 };
      const P = K.particles({ max: 260 });
      let busyUntil = 0;
      const kick = (ms) => { busyUntil = Math.max(busyUntil, performance.now() + (ms || 1800)); };
      const halo = h('div', { class: 'ld-halo', 'aria-hidden': 'true' });
      const world = h('div', { class: 'ld-world' });
      const fore = h('div', { class: 'ld-fore' });
      el.append(halo, world, fore);
      const G = { w: 0, H: 0, phone: true, cam: 0, camT: 0 };
      const W = { depth: 0, depthT: 0, city: 0, cityT: 0, aur: 0, aurT: 0, cons: -1, shoot: null, lights: 1, lightsT: 1, catCurl: 0 };
      let LAY = null;

      const wins = [];
      const mkWin = (i, label, round) => {
        const node = h('div', { class: 'ld-win' + (round ? ' ld-round ld-unlit' : ''), role: 'slider', tabindex: round ? '-1' : '0', 'aria-label': 'Blind. Pull down slowly to park: ' + label, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' });
        const note = h('span', { class: 'ld-note gk-user', text: label });
        node.append(h('div', { class: 'ld-sill' }, note));
        world.append(node);
        const win = { i, label, round, node, note, sil: round ? 'writer' : silOrder[i % silOrder.length], lights: LIGHTS[(i + K.daily()) % LIGHTS.length], blind: BLINDS[(i * 5 + K.daily()) % BLINDS.length],
          f: 0, target: 0, last: 0, speed: 0, sv: 0, dragging: false, snapping: false, closed: false, active: !round, snaps: 0, mv: 0, st: 0, score: 1, lit: round ? 0 : 1, litNow: round ? 0 : 1, swing: 0, good: 0, x: 0, y: 0, w: 0, gh: 0, startY: 0, startF: 0, keyT: 0, spr: null };
        wins.push(win);
        bindWin(win);
        return win;
      };

      /* ---------------- audio ---------------- */
      const music = K.music('musicbox');
      const amb = K.ambience(DAY.weather === 'drizzle' ? 'rain' : 'room');
      if (amb && amb.level) amb.level(DAY.weather === 'drizzle' ? 0.22 : 0.28, 1.5);
      let zip = null;
      const zipOn = () => { if (!zip && A.ctx) zip = A.loop({ filter: 'bandpass', freq: 1500, q: 0.8 }); return zip; };
      S.onDestroy(() => { if (zip) zip.stop(); });
      const ratchet = (k) => { if (A.ctx) A.wood(undefined, 0.07, 0.75 + k * 0.5); };

      /* ---------------- moon (Still), postbox, caption ---------------- */
      const still = K.character('still', { side: 'right', mood: 'E18', x: 14, y: 62, size: 92 });
      still.el.classList.add('ld-moon');
      const box = h('div', { class: 'ld-box' }, h('div', { class: 'ld-box-lamp' }), h('div', { class: 'ld-box-post' }), h('div', { class: 'ld-box-body' }, h('div', { class: 'ld-box-slot' }), h('span', { class: 'ld-box-label', text: 'Tomorrow' })), h('div', { class: 'ld-box-flag' }), h('b', { class: 'ld-box-count', 'aria-live': 'polite', text: '0' }));
      fore.append(box);
      const boxCount = box.querySelector('.ld-box-count');
      const cap = h('div', { class: 'ld-cap', 'aria-hidden': 'true', text: DAY.cons.name });
      el.append(cap);

      let phase = 'intro', closed = 0, posted = 0, twistDone = false, snapsTotal = 0, anySnapLine = false;
      for (let i = 0; i < N; i++) mkWin(i, items.wins[i], false);
      const attic = mkWin(N, items.attic, true);

      /* ---------------- layout ---------------- */
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        const phone = w < 700;
        Object.assign(G, { w, H, phone });
        const cols = phone ? 2 : Math.max(2, Math.round(N / 2)), rows = Math.ceil(N / cols);
        G.parapet = H - (phone ? 130 : 120);
        const top = phone ? (N > 6 ? 238 : 248) : 240;
        const bottom = G.parapet - (phone ? 38 : 34);
        const rowH = (bottom - top) / rows;
        const labelH = phone ? 46 : 50;
        const gh = Math.round(Math.max(54, Math.min(phone ? 150 : 172, rowH - labelH - (phone ? 8 : 22))));
        let ww, gapX, padX;
        if (phone) { padX = 20; const fw = w - 24; ww = Math.round(Math.min(160, (fw - padX * 2 - 24) / 2)); gapX = fw - padX * 2 - ww * 2; G.fac = { x: 12, w: fw }; }
        else { ww = Math.round(cols >= 4 ? 168 : Math.min(200, gh * 1.22)); gapX = cols >= 4 ? 58 : 72; padX = 56; const fw = cols * ww + (cols - 1) * gapX + padX * 2; G.fac = { x: Math.round(w * 0.45 - fw / 2), w: fw }; }
        G.fac.y = top - (phone ? 34 : 42); G.fac.h = G.parapet - G.fac.y + 40;
        for (let i = 0; i < N; i++) {
          const win = wins[i], c = i % cols, r = Math.floor(i / cols);
          win.x = Math.round(G.fac.x + padX + c * (ww + gapX)); win.y = Math.round(top + r * rowH); win.w = ww; win.gh = gh;
          setBox(win);
        }
        const ar = phone ? 31 : 38;
        attic.w = ar * 2; attic.gh = ar * 2;
        attic.x = Math.round(G.fac.x + G.fac.w * (phone ? 0.36 : 0.3) - ar); attic.y = Math.round(G.fac.y - ar * 2 - (phone ? 16 : 20));
        setBox(attic);
        G.attic = { cx: attic.x + ar, cy: attic.y + ar, r: ar };
        const sz = phone ? 92 : 118;
        if (phone) { still.side('right'); still.place(14, 62); G.moon = { x: 14 + sz / 2, y: 62 + sz / 2, r: sz / 2 }; }
        else { still.side('left'); still.place(w - sz - 44, 72); G.moon = { x: w - 44 - sz / 2, y: 72 + sz / 2, r: sz / 2 }; }
        still.el.style.setProperty('--sz', sz + 'px');
        const hr = sz * 1.5;
        Object.assign(halo.style, { left: (G.moon.x - hr) + 'px', top: (G.moon.y - hr) + 'px', width: hr * 2 + 'px', height: hr * 2 + 'px' });
        G.box = { x: Math.round(G.fac.x + G.fac.w / 2), y: G.parapet - 16 };
        G.slot = G.box.y + 24;
        box.style.left = G.box.x + 'px'; box.style.top = (G.box.y - 4) + 'px';
        G.camMax = phone ? 150 : 96;
        const cw = phone ? Math.min(176, w * 0.45) : 230;
        G.cons = phone ? { x: w - cw - 30, y: 92, w: cw, h: cw * 0.78 } : { x: G.moon.x - 470, y: 76, w: cw, h: cw * 0.76 };
        cap.style.left = (G.cons.x + G.cons.w / 2) + 'px'; cap.style.top = (G.cons.y + G.cons.h + 14) + 'px';
        paintLayers();
      }
      function setBox(win) {
        Object.assign(win.node.style, { left: win.x + 'px', top: win.y + 'px', width: win.w + 'px', height: (win.gh + (win.round ? 0 : 56)) + 'px' });
        win.node.style.setProperty('--gh', win.gh + 'px');
      }

      /* ---------------- painting: static layers and window sprites ---------------- */
      const rr = (seed) => K.rng(seed);
      const rgb = (c, k, a) => `rgba(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)},${a == null ? 1 : a})`;
      const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
      function off(w, hh) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * cv.dpr)); c.height = Math.max(1, Math.round(hh * cv.dpr)); const g = c.getContext('2d'); g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0); return { c, g, w, h: hh }; }
      function paintLayers() {
        if (!G.w) return;
        const D = dark();
        G.foreTop = G.parapet - 64;
        LAY = { city: off(G.w, G.H), fore: off(G.w, G.H - G.foreTop), bwin: [], bulbs: [], sprites: {} };
        paintSkyline(LAY.city.g, D);
        paintFacade(LAY.city.g, D);
        LAY.fore.g.translate(0, -G.foreTop); paintFore(LAY.fore.g, D);
        ['#ffd98a', '#ffb0a0', '#bfe3ff', '#d9ffb8'].forEach(c => {
          const s = off(30, 30), gr = s.g.createRadialGradient(15, 15, 0, 15, 15, 15);
          gr.addColorStop(0, K.hexA(c, 0.6)); gr.addColorStop(0.35, K.hexA(c, 0.24)); gr.addColorStop(1, K.hexA(c, 0));
          s.g.fillStyle = gr; s.g.fillRect(0, 0, 30, 30); s.g.fillStyle = c; s.g.beginPath(); s.g.ellipse(15, 15, 2.6, 3.4, 0, 0, K.TAU); s.g.fill();
          LAY.sprites[c] = s.c;
        });
        const gl = off(64, 64), gg = gl.g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gg.addColorStop(0, 'rgba(255,176,90,0.42)'); gg.addColorStop(0.55, 'rgba(255,176,90,0.13)'); gg.addColorStop(1, 'rgba(255,176,90,0)');
        gl.g.fillStyle = gg; gl.g.fillRect(0, 0, 64, 64); LAY.glow = gl.c;
        wins.forEach(paintWin);
        backKey = '';
        try {
          const cc = LAY.city.c, px = cc.getContext('2d').getImageData(0, 0, cc.width, cc.height).data, k = cv.dpr, top = G.fac.y * 0.98;
          const at = G.attic;
          for (const s of stars) { const X = Math.min(cc.width - 1, Math.round(s.x * G.w * k)), Y = Math.min(cc.height - 1, Math.round(s.y * top * k)); s.hid = px[(Y * cc.width + X) * 4 + 3] > 24 || (at && Math.hypot(s.x * G.w - at.cx, s.y * top - at.cy) < at.r + 10); }
        } catch (e) { /* no mask: every star is drawn */ }
      }
      function clipShape(g, win) { g.beginPath(); if (win.round) g.arc(win.w / 2, win.gh / 2, win.w / 2, 0, K.TAU); else g.rect(0, 0, win.w, win.gh); g.clip(); }
      function paintWin(win) {
        const w = win.w, gh = win.gh, D = dark();
        const room = (lit) => {
          const s = off(w, gh), g = s.g;
          g.save(); clipShape(g, win);
          if (lit) { const gr = g.createRadialGradient(w / 2, gh * 0.2, 4, w / 2, gh * 0.2, Math.max(w, gh) * 1.05); gr.addColorStop(0, win.lights[0]); gr.addColorStop(0.52, win.lights[1]); gr.addColorStop(1, win.lights[2]); g.fillStyle = gr; }
          else g.fillStyle = D ? '#0d0b18' : '#1b1730';
          g.fillRect(0, 0, w, gh);
          const sc = Math.min(w / 120, gh * 0.9 / 80), ox = (w - 120 * sc) / 2, oy = gh - 80 * sc;
          g.translate(ox, oy); g.scale(sc, sc);
          for (const it of PATHS[win.sil]) {
            g.globalAlpha = (it.o.a ?? 1) * (lit ? 0.86 : 0.35);
            const col = it.o.c && lit ? it.o.c : (lit ? 'rgb(52,26,16)' : 'rgb(4,4,10)');
            if (it.o.s) { g.strokeStyle = col; g.lineWidth = it.o.s; g.lineCap = 'round'; g.stroke(it.p); } else { g.fillStyle = col; g.fill(it.p); }
          }
          g.restore();
          return s.c;
        };
        const blind = (glow) => {
          const s = off(w, gh), g = s.g;
          if (!glow) {
            const gr = g.createLinearGradient(0, 0, 0, gh); gr.addColorStop(0, win.blind[0]); gr.addColorStop(1, win.blind[1]);
            g.fillStyle = gr; g.fillRect(0, 0, w, gh);
            for (let y = 1; y < gh; y += 6) { g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(0, y + 2, w, 1); }
            const sd = g.createLinearGradient(0, 0, w, 0); sd.addColorStop(0, 'rgba(0,0,0,0.12)'); sd.addColorStop(0.18, 'rgba(0,0,0,0)'); sd.addColorStop(0.82, 'rgba(0,0,0,0)'); sd.addColorStop(1, 'rgba(0,0,0,0.12)');
            g.fillStyle = sd; g.fillRect(0, 0, w, gh);
          } else {
            const gr = g.createRadialGradient(w / 2, gh * 0.95, 4, w / 2, gh * 0.95, Math.max(w, gh) * 0.85); gr.addColorStop(0, 'rgba(255,200,120,0.62)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
            g.fillStyle = gr; g.fillRect(0, 0, w, gh);
          }
          return s.c;
        };
        const frame = () => {
          const s = off(w + 16, gh + 16), g = s.g;
          g.translate(8, 8);
          if (win.round) {
            g.lineWidth = 9; g.strokeStyle = 'rgba(12,8,18,0.55)'; g.beginPath(); g.arc(w / 2, gh / 2, w / 2 + 2, 0, K.TAU); g.stroke();
            g.lineWidth = 5; g.strokeStyle = '#efe4d0'; g.stroke();
            g.save(); clipShape(g, win); g.fillStyle = '#efe4d0'; g.fillRect(w / 2 - 2, 0, 4, gh); g.fillRect(0, gh / 2 - 2, w, 4); g.restore();
          } else {
            g.fillStyle = 'rgba(12,8,18,0.55)'; g.fillRect(-6, -6, w + 12, gh + 12);
            g.clearRect(0, 0, w, gh);
            g.strokeStyle = '#efe4d0'; g.lineWidth = 4; g.strokeRect(-2, -2, w + 4, gh + 4);
            g.fillStyle = '#efe4d0'; g.fillRect(w / 2 - 2, 0, 4, gh); g.fillRect(0, Math.round(gh * 0.46) - 2, w, 4);
            g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(w / 2 + 2, 0, 1, gh); g.fillRect(0, Math.round(gh * 0.46) + 2, w, 1);
            const rl = g.createLinearGradient(0, 0, 0, 7); rl.addColorStop(0, '#fff6e2'); rl.addColorStop(0.7, '#c9ae84'); rl.addColorStop(1, '#8f7350');
            g.fillStyle = rl; g.fillRect(-1, 0, w + 2, 7);
          }
          g.save(); clipShape(g, win);
          const sh = g.createLinearGradient(0, 0, w * 0.6, gh); sh.addColorStop(0, 'rgba(255,255,255,0.2)'); sh.addColorStop(0.4, 'rgba(255,255,255,0)');
          g.fillStyle = sh; g.fillRect(0, 0, w, gh); g.restore();
          return s.c;
        };
        win.spr = { lit: room(true), dark: room(false), blind: blind(false), glow: blind(true), frame: frame(), shut: null };
      }
      function paintSkyline(g, D) {
        const R = rr(K.daily() + 101), w = G.w, base = G.parapet + 30, F = G.fac;
        // skyline windows behind the attic dormer stay hidden (the dormer is painted later, over the skyline)
        const at = G.attic, apY = at ? at.cy - at.r - 40 : 0, baseY = F.y + 2, hw0 = at ? at.r + 40 : 0;
        const underDormer = (xx, yy) => { if (!at || yy + 8 < apY) return false; const hw = hw0 * Math.min(1, (yy + 8 - apY) / Math.max(1, baseY - apY)); return Math.abs(xx + 2.5 - at.cx) < hw + 5; };
        const cols = D ? [[30, 31, 68], [22, 23, 52], [38, 34, 74]] : [[78, 76, 134], [62, 60, 116], [92, 82, 142]];
        let x = -20;
        while (x < w + 20) {
          const bw = 40 + R() * (G.phone ? 64 : 110), top = (G.phone ? 96 : 116) + R() * (G.phone ? 100 : 180);
          const c = cols[Math.floor(R() * 3)];
          g.fillStyle = rgb(c, 1); g.fillRect(x, top, bw, base - top);
          g.fillStyle = rgb(c, 1.3, 0.7); g.fillRect(x, top, bw, 2);
          g.fillStyle = rgb(c, 0.8, 0.5); g.fillRect(x + bw - 6, top, 6, base - top);
          if (R() < 0.35) { const tx = x + bw * (0.25 + R() * 0.4); g.fillStyle = rgb(c, 0.85); g.fillRect(tx - 1, top - 18, 2, 18); g.fillRect(tx - 7, top - 13, 14, 1.5); }
          if (R() < 0.32 && bw > 50) { const tx = x + bw * 0.55, ty = top - 24; g.fillStyle = rgb(c, 0.9); g.fillRect(tx, ty + 8, 18, 15); g.beginPath(); g.moveTo(tx - 2, ty + 9); g.lineTo(tx + 9, ty); g.lineTo(tx + 20, ty + 9); g.closePath(); g.fill(); g.fillRect(tx + 2, ty + 23, 2, 6); g.fillRect(tx + 14, ty + 23, 2, 6); }
          for (let yy = top + 10; yy < G.parapet - 6; yy += 15) for (let xx = x + 7; xx < x + bw - 10; xx += 12) {
            const hidden = (xx > F.x - 6 && xx < F.x + F.w + 2 && yy > F.y - 4) || yy > G.parapet - 60 || underDormer(xx, yy);
            if (!hidden && R() < 0.55) LAY.bwin.push({ x: xx, y: yy, w: 5, h: 8, off: R(), warm: R() < 0.75 ? 1 : 0 });
            else if (!hidden) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(xx, yy, 5, 8); }
          }
          x += bw + R() * 6;
        }
      }
      function paintFacade(g, D) {
        const F = G.fac, B = DAY.fac.base, k = D ? 0.62 : 0.86, R = rr(K.daily() + 7), trim = DAY.fac.trim;
        // dormer (behind the cornice): slate roof slopes with shingles, then the gable face
        const at = G.attic, pk = at.cy - at.r - 30, half = at.r + 30;
        g.fillStyle = rgb(DAY.fac.roof, D ? 0.8 : 1.1);
        g.beginPath(); g.moveTo(at.cx - half - 8, F.y + 2); g.lineTo(at.cx, pk - 8); g.lineTo(at.cx + half + 8, F.y + 2); g.closePath(); g.fill();
        g.strokeStyle = rgb(DAY.fac.roof, D ? 0.55 : 0.8); g.lineWidth = 1;
        for (let y = pk; y < F.y; y += 6) { const t = (y - pk + 8) / (F.y - pk + 10), hw = (half + 8) * t; g.beginPath(); g.moveTo(at.cx - hw, y); g.lineTo(at.cx + hw, y); g.stroke(); }
        g.fillStyle = rgb(B, k * 0.95);
        g.beginPath(); g.moveTo(at.cx - half + 8, F.y + 2); g.lineTo(at.cx, pk + 8); g.lineTo(at.cx + half - 8, F.y + 2); g.closePath(); g.fill();
        g.strokeStyle = trim; g.globalAlpha = D ? 0.7 : 0.9; g.lineWidth = 4; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(at.cx - half + 6, F.y + 3); g.lineTo(at.cx, pk + 5); g.lineTo(at.cx + half - 6, F.y + 3); g.stroke(); g.globalAlpha = 1;
        // body and bricks
        g.fillStyle = rgb(B, k * 0.6); g.fillRect(F.x, F.y, F.w, F.h);
        const bw = G.phone ? 15 : 20, bh = 7;
        for (let y = F.y + 18, row = 0; y < F.y + F.h; y += bh, row++) {
          for (let x = F.x - (row % 2 ? bw / 2 : 0); x < F.x + F.w; x += bw) {
            const x0 = Math.max(F.x, x), x1 = Math.min(F.x + F.w, x + bw - 1);
            if (x1 - x0 < 1) continue;
            g.fillStyle = rgb(B, k * (0.9 + R() * 0.2)); g.fillRect(x0, y, x1 - x0, bh - 1);
          }
        }
        const sh = g.createLinearGradient(0, F.y, 0, F.y + F.h);
        sh.addColorStop(0, D ? 'rgba(150,160,255,0.1)' : 'rgba(255,255,255,0.12)'); sh.addColorStop(1, D ? 'rgba(6,6,26,0.55)' : 'rgba(30,24,60,0.3)');
        g.fillStyle = sh; g.fillRect(F.x, F.y, F.w, F.h);
        const sd = g.createLinearGradient(F.x, 0, F.x + F.w, 0);
        sd.addColorStop(0, 'rgba(0,0,0,0.24)'); sd.addColorStop(0.1, 'rgba(0,0,0,0)'); sd.addColorStop(0.9, 'rgba(0,0,0,0)'); sd.addColorStop(1, 'rgba(0,0,0,0.3)');
        g.fillStyle = sd; g.fillRect(F.x, F.y, F.w, F.h);
        // cornice and dentils
        g.fillStyle = trim; g.globalAlpha = D ? 0.8 : 0.95; g.fillRect(F.x - 8, F.y, F.w + 16, 11);
        g.globalAlpha = D ? 0.55 : 0.75; for (let x = F.x - 4; x < F.x + F.w + 4; x += 10) g.fillRect(x, F.y + 12, 6, 5);
        g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,0.32)'; g.fillRect(F.x - 8, F.y + 11, F.w + 16, 2);
        // the attic opening
        g.fillStyle = 'rgba(8,6,14,0.8)'; g.beginPath(); g.arc(at.cx, at.cy, at.r + 7, 0, K.TAU); g.fill();
        // window recesses, lintels, sills
        wins.forEach(win => {
          if (win.round) return;
          g.fillStyle = 'rgba(8,6,14,0.72)'; g.fillRect(win.x - 9, win.y - 9, win.w + 18, win.gh + 16);
          g.fillStyle = trim; g.globalAlpha = D ? 0.72 : 0.92;
          g.fillRect(win.x - 13, win.y - 18, win.w + 26, 9);
          g.fillRect(win.x - 15, win.y + win.gh + 6, win.w + 30, 7);
          g.globalAlpha = 1;
          g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(win.x - 15, win.y + win.gh + 13, win.w + 30, 3);
          g.fillStyle = 'rgba(0,0,0,0.25)'; for (let s = 0; s < 3; s++) g.fillRect(win.x - 13 + (win.w + 26) * (s / 3) + (win.w + 26) / 6 - 1, win.y - 18, 2, 9);
        });
        g.fillStyle = D ? 'rgba(20,22,34,0.85)' : 'rgba(40,40,60,0.7)';
        const dx = F.x + F.w - 9; g.fillRect(dx, F.y + 16, 5, F.h); for (let y = F.y + 60; y < F.y + F.h; y += 90) g.fillRect(dx - 2, y, 9, 4);
      }
      function paintFore(g, D) {
        const w = G.w, H = G.H, y0 = G.parapet, R = rr(K.daily() + 31);
        const wall = D ? [40, 32, 50] : [96, 80, 100];
        g.fillStyle = rgb(wall, 1); g.fillRect(0, y0, w, H - y0);
        for (let y = y0 + 12, row = 0; y < H; y += 9, row++) for (let x = -(row % 2) * 11; x < w; x += 22) { g.fillStyle = rgb(wall, 0.85 + R() * 0.3); g.fillRect(x + 1, y, 20, 8); }
        g.fillStyle = D ? '#4c4560' : '#a99ab0'; g.fillRect(-4, y0 - 4, w + 8, 14);
        g.fillStyle = D ? '#6d6585' : '#cfc2d2'; g.fillRect(-4, y0 - 4, w + 8, 3);
        const gr = g.createLinearGradient(0, y0, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, D ? 'rgba(4,4,16,0.62)' : 'rgba(20,14,40,0.35)');
        g.fillStyle = gr; g.fillRect(0, y0, w, H - y0);
        // brick chimney stack with two pots and an aerial
        const cx = G.phone ? 18 : Math.max(36, G.fac.x - 130), cw = G.phone ? 44 : 64, ct = y0 - (G.phone ? 34 : 60);
        const brick = D ? [86, 46, 50] : [150, 86, 80];
        g.fillStyle = rgb(brick, 0.8); g.fillRect(cx, ct, cw, y0 - ct);
        for (let y = ct + 2, row = 0; y < y0; y += 6, row++) for (let x = cx - (row % 2) * 5; x < cx + cw; x += 10) { const xa = Math.max(cx, x), xb = Math.min(cx + cw, x + 9); if (xb > xa) { g.fillStyle = rgb(brick, 0.85 + R() * 0.25); g.fillRect(xa, y, xb - xa, 5); } }
        g.fillStyle = D ? '#5a4a64' : '#b9a3b0'; g.fillRect(cx - 4, ct - 2, cw + 8, 7);
        g.fillStyle = rgb(brick, 1.05); g.fillRect(cx + 7, ct - 16, 11, 14); g.fillRect(cx + cw - 19, ct - 12, 11, 10);
        g.strokeStyle = D ? '#2a2236' : '#5d4c66'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx + cw / 2, ct); g.lineTo(cx + cw / 2, ct - 40); g.moveTo(cx + cw / 2 - 14, ct - 32); g.lineTo(cx + cw / 2 + 14, ct - 32); g.moveTo(cx + cw / 2 - 9, ct - 24); g.lineTo(cx + cw / 2 + 9, ct - 24); g.stroke();
        G.chim = { x: cx + 12, y: ct - 18 };
        const plant = (px, s, leaf) => {
          g.fillStyle = D ? '#6a3f35' : '#b0664f'; g.beginPath(); g.moveTo(px - 13 * s, y0 - 4); g.lineTo(px + 13 * s, y0 - 4); g.lineTo(px + 10 * s, y0 - 24 * s); g.lineTo(px - 10 * s, y0 - 24 * s); g.closePath(); g.fill();
          g.fillStyle = leaf;
          for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.38; g.beginPath(); g.ellipse(px + Math.cos(a) * 14 * s, y0 - 28 * s + Math.sin(a) * 14 * s, 5.5 * s, 13 * s, a + Math.PI / 2, 0, K.TAU); g.fill(); }
        };
        plant(w - (G.phone ? 30 : 70), G.phone ? 0.95 : 1.3, D ? '#2c4a3e' : '#4f8a68');
        if (!G.phone) plant(G.fac.x + G.fac.w + 40, 1.1, D ? '#30503f' : '#5a9670');
        // fairy lights strung along the parapet
        const x0 = cx + cw, x1 = w + 10, sag = G.phone ? 8 : 12, yA = y0 - 14, yB = y0 - 16;
        g.strokeStyle = D ? 'rgba(20,16,30,0.9)' : 'rgba(60,50,70,0.8)'; g.lineWidth = 1.5; g.beginPath();
        for (let i = 0; i <= 40; i++) { const t = i / 40, x = x0 + (x1 - x0) * t, y = yA + (yB - yA) * t + Math.sin(t * Math.PI) * sag; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke();
        const nb = G.phone ? 9 : 16;
        for (let i = 1; i < nb; i++) { const t = i / nb, x = x0 + (x1 - x0) * t, y = yA + (yB - yA) * t + Math.sin(t * Math.PI) * sag; LAY.bulbs.push({ x, y: y + 5, ph: i * 1.7, c: ['#ffd98a', '#ffb0a0', '#bfe3ff', '#d9ffb8'][i % 4] }); }
        if (visits >= 2) {
          const tx = G.phone ? 98 : cx + cw + 80;
          g.strokeStyle = D ? '#2a2234' : '#584866'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(tx, y0 - 4); g.lineTo(tx + 10, y0 - 30); g.lineTo(tx + 20, y0 - 4); g.moveTo(tx + 10, y0 - 30); g.lineTo(tx + 10, y0 - 4); g.stroke();
          g.save(); g.translate(tx + 10, y0 - 32); g.rotate(-0.55); g.fillStyle = D ? '#3c3350' : '#6e5c80'; g.fillRect(-16, -5, 34, 10); g.fillStyle = D ? '#b9a6d8' : '#e4d6f2'; g.fillRect(16, -6, 5, 12); g.restore();
        }
      }

      /* ---------------- guide (vertical drag, shown by moving the hand down the live blind) ---------------- */
      let gShown = performance.now();
      S.on('guide', (e) => { if (e && e.visible) gShown = performance.now(); });
      function movingTarget(from, to, period, a, b) {
        return () => {
          const p = from(), q = to(); if (!p || !q) return null;
          const ph = ((performance.now() - gShown) % period) / period;
          const k = ph < a ? 0 : ph > b ? 1 : K.ease.inOutSine((ph - a) / (b - a));
          return { x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k };
        };
      }
      function guidePull(win, label, delay) {
        if (!win) { K.guide(null); return; }
        const from = () => ({ x: win.x + win.w / 2, y: win.y + win.gh * Math.max(0, win.f) + 20 });
        const to = () => ({ x: win.x + win.w / 2, y: win.y + win.gh * 0.98 + 20 });
        K.guide({ id: 'pull-' + win.i + '-' + win.snaps, g: 'hold', ms: 3400, target: movingTarget(from, to, 3400, 0.14, 0.82), label, delay: delay ?? 800 });
      }
      const nextWin = () => (attic.active && !attic.closed ? attic : null) || wins.find(x => x.active && !x.closed && !x.round) || null;
      function nextGuide(delay) {
        if (phase !== 'play') return;
        const w = nextWin();
        if (!w) { K.guide(null); return; }
        guidePull(w, w.snaps ? 'SLOWER THIS TIME' : w.round ? 'ONE MORE: PULL SLOWLY' : closed ? 'NEXT: PULL SLOWLY' : 'PULL DOWN SLOWLY', delay);
      }

      /* ---------------- interaction ---------------- */
      function bindWin(win) {
        K.drag(win.node, {
          space: el,
          start: (p) => {
            if (phase !== 'play' || !win.active || win.closed || win.snapping) return false;
            win.dragging = true; win.startY = p.y; win.startF = Math.max(0, win.f); win.target = win.f + 0.015; win.last = win.target; win.speed = 0;
            win.swing = 1; ratchet(win.f); K.sfx.tap();
            if (zipOn()) zip.level(0.0001);
          },
          move: (p) => { if (win.dragging) win.target = K.clamp(win.startF + (p.y - win.startY) / win.gh, 0, 1); },
          end: () => {
            if (!win.dragging) return;
            win.dragging = false; // the blind follows through to where the finger let go, then the ratchet holds it
            win.good = 0;
            if (!win.closed && win.target < 0.98) guidePull(win, 'KEEP PULLING SLOWLY', 1600);
          }
        });
        S.listen(win.node, 'keydown', (e) => {
          if ((e.code === 'ArrowDown' || e.code === 'Space') && phase === 'play' && win.active && !win.closed && !win.snapping) { e.preventDefault(); win.keyT = 0.35; win.target = Math.min(1, Math.max(win.target, win.f) + 0.12); A.unlock(); ratchet(win.f); }
        });
      }
      // taps that land on the sky, a sleeping window or the postbox still get a small twinkle back
      S.listen(el, 'pointerdown', (e) => {
        const wn = e.target && e.target.closest ? e.target.closest('.ld-win') : null;
        const win = wn && wins.find(x => x.node === wn);
        if (win && win.active && !win.closed) return;
        const p = K.local(e, el);
        kick(); P.emit('star', p.x, p.y, 6, { colors: ['#fffbe6', '#ffe9a8', '#d8e6ff'], speed: [20, 70] });
        if (A.ctx) { A.chime(A.note(['E6', 'G6', 'A6', 'C7'][Math.floor(Math.random() * 4)]), { vol: 0.035, dur: 1.2, verb: 0.5 }); A.sync('twinkle', performance.now()); }
      });
      K.onKey(['ArrowDown'], (e) => {
        const ae = document.activeElement; if (ae && ae.classList && ae.classList.contains('ld-win')) return;
        const w = nextWin(); if (!w || phase !== 'play' || w.snapping) return;
        e.preventDefault(); A.unlock(); w.keyT = 0.35; w.target = Math.min(1, Math.max(w.target, w.f) + 0.12); ratchet(w.f);
      });

      function snap(win) {
        win.dragging = false; win.snapping = true; win.sv = -0.6; win.snaps++; snapsTotal++; win.good = 0;
        if (zip) zip.level(0.0001, 0.05);
        if (A.ctx) { A.whoosh({ from: 600, to: 2800, dur: 0.26, vol: 0.1 }); A.boing({ freq: 360, vol: 0.06 }); }
        win.swing = 1.4;
        const cue = h('div', { class: 'ld-slow', text: 'Slower…' });
        cue.style.left = (win.x + win.w / 2) + 'px'; cue.style.top = (win.y - 14) + 'px';
        el.append(cue); K.later(() => cue.remove(), 1750);
        still.face('surprised', 1200);
        if (!anySnapLine) {
          anySnapLine = true;
          still.say(line({ Jolly: 'Whoops, up it went. Slower, like heavy eyelids.', Cheeky: 'Too keen! Blinds like it slow. So do brains.', Unfiltered: 'Too fast. Slow it right down.' }), { ms: 2800 });
        }
        ctx.track('snap', { n: snapsTotal });
        K.later(() => { if (phase === 'play' && !win.closed) guidePull(win, 'SLOWER THIS TIME', 0); }, 900);
      }
      function closeWin(win) {
        win.closed = true; win.dragging = false; win.f = 1; win.target = 1; win.good = 0;
        win.node.classList.add('ld-done');
        win.node.setAttribute('aria-valuenow', '100');
        win.node.setAttribute('aria-label', 'Blind closed. Parked for tomorrow: ' + win.label);
        closed++;
        if (zip) zip.level(0.0001, 0.05);
        win.score = (win.mv > 0.12 ? K.clamp(win.st / win.mv, 0, 1) : 0.85) * Math.pow(0.88, win.snaps);
        if (A.ctx) { A.wood(undefined, 0.22, 0.62); A.thud({ vol: 0.12 }); A.chime(A.note(LULLABY[Math.min(LULLABY.length - 1, closed - 1)]), { vol: 0.08, dur: 2.2, verb: 0.5 }); }
        K.sfx.chime(0);
        kick(); P.emit('mote', win.x + win.w / 2, win.y + win.gh, 12, { colors: ['#fff1c4', '#ffd98a'] });
        K.later(() => { win.lit = 0; if (A.ctx) A.click({ vol: 0.07 }); }, 420);
        K.later(() => flyNote(win), 760);
        W.depthT = closed / TOTAL; W.cityT = Math.min(0.85, closed / TOTAL);
        music.tempo(Math.max(46, 84 * Math.pow(0.915, closed)));
        music.level(Math.max(0.55, 1 - closed / TOTAL * 0.45));
        still.face(['calm', 'E17', 'E02', 'glow', 'E87', 'calm'][closed % 6], 1400);
        ctx.track('blind', { n: closed, steady: Math.round(win.score * 100), snaps: win.snaps });
        if (closed === 1) still.say(line({ Jolly: 'Parked. It’ll keep perfectly well till morning.', Cheeky: 'Posted to Tomorrow-You. They love admin.', Unfiltered: 'Done for tonight. Tomorrow handles it.' }), { ms: 3000 });
        else if (closed === TOTAL - 1) still.say(line({ Jolly: 'Last one. Hear how slow the music’s got?', Cheeky: 'Last window. Even the music box is nodding off.', Unfiltered: 'Last one. Then sleep.' }), { ms: 2800 });
        nextGuide(1400);
      }
      function flyNote(win) {
        const r = K.rectIn(win.note, el);
        const fly = h('div', { class: 'ld-fly', 'aria-hidden': 'true' }, h('span', { class: 'gk-user', text: win.label }));
        fly.firstChild.style.width = Math.ceil(r.w) + 'px';
        fly.style.transform = `translate(${r.x}px, ${r.y}px)`;
        el.append(fly);
        win.note.style.visibility = 'hidden';
        K.sfx.paper();
        K.later(() => fly.classList.add('ld-fold'), 30);
        K.later(async () => {
          const bx = G.box.x - r.w / 2, by = G.slot - r.h / 2;
          if (A.ctx) A.whoosh({ from: 300, to: 900, dur: 0.9, vol: 0.05 });
          const sway = (win.x + win.w / 2 < G.box.x ? 1 : -1) * (G.phone ? 34 : 60);
          await K.anim(K.reduced() ? 300 : 1700, (k) => {
            const e = K.ease.inOutSine(k);
            const x = r.x + (bx - r.x) * e + Math.sin(k * Math.PI * 2) * sway * (1 - k);
            const y = r.y + (by - r.y) * (k * k * 0.4 + e * 0.6);
            fly.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(Math.sin(k * Math.PI * 3) * 16 * (1 - k)).toFixed(1)}deg) scale(${(1 - 0.72 * k).toFixed(3)})`;
            fly.style.opacity = k > 0.86 ? ((1 - k) / 0.14).toFixed(2) : '1';
          });
          fly.remove();
          postNote();
        }, 560);
      }
      function postNote() {
        posted++;
        box.classList.add('ld-has'); box.classList.remove('ld-bump'); void box.offsetWidth; box.classList.add('ld-bump');
        boxCount.textContent = String(posted);
        box.style.setProperty('--glow', String(0.25 + 0.75 * posted / TOTAL));
        if (A.ctx) { A.thud({ vol: 0.16 }); A.chime(A.note(LULLABY[(posted + 2) % LULLABY.length]), { vol: 0.05, dur: 1.6 }); }
        kick(); P.emit('star', G.box.x, G.box.y - 6, 9, { colors: ['#fff3c4', '#ffe08a'], speed: [40, 110], angle: -Math.PI / 2, spread: 1.6 });
        if (!twistDone && posted >= Math.ceil(N / 2)) { twistDone = true; K.later(twist, 700); }
        else if (posted >= TOTAL) K.later(finale, 900);
      }
      function twist() {
        if (phase !== 'play') return;
        attic.active = true;
        attic.node.setAttribute('tabindex', '0');
        if (A.ctx) { A.click({ vol: 0.1 }); K.later(() => { if (A.ctx) A.click({ vol: 0.06 }); }, 130); }
        let flick = 0;
        const fl = () => { flick++; attic.lit = flick % 2 ? 1 : 0; attic.litNow = attic.lit; if (flick < 3) K.later(fl, K.reduced() ? 40 : 120); else { attic.node.classList.remove('ld-unlit'); attic.lit = 1; } };
        fl();
        kick(); P.emit('mote', G.attic.cx, G.attic.cy, 10, { colors: ['#fff1c4', '#ffd98a'] });
        still.say(line({ Jolly: 'Oh, look. A “one more thing”. Same treatment.', Cheeky: 'Classic. The one-more-thing thought. Nice try, attic.', Unfiltered: 'There it is: one more thing. Park it too.' }), { mood: 'think', ms: 3200 });
        ctx.track('twist', { at: posted });
        nextGuide(1500);
      }

      /* ---------------- frame loop ---------------- */
      let half = 0, accDt = 0, drawn = 0, finTick = 0;
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !LAY) return;
        // quality guard: if frames run slow, paint the night with fewer pixels (2 -> 1.5 -> 1.25 -> 1)
        if (dt < 0.25) { qual.acc += dt; qual.n++; if (dt > 0.03) qual.slow++; }
        if (qual.n >= 90) { if ((qual.acc / qual.n > 0.022 || qual.slow > 12) && (cv.dpr || 1) > 1.01) { cvOpts.maxDpr = cv.dpr > 1.6 ? 1.5 : cv.dpr > 1.3 ? 1.25 : 1; cv.fit(); } qual.acc = qual.n = qual.slow = 0; }
        const ez = (a, b, r) => a + (b - a) * Math.min(1, dt * r);
        W.depth = ez(W.depth, W.depthT, 0.9); W.city = ez(W.city, W.cityT, 0.7); W.aur = ez(W.aur, W.aurT, 0.45); W.lights = ez(W.lights, W.lightsT, 1.2);
        G.cam = ez(G.cam, G.camT, 0.7);
        for (const win of wins) stepWin(win, dt);
        // while nothing is being pulled or posted, only the slow night moves (twinkle, smoke, snow): paint every other frame.
        // On a slow machine everything in this game is slow on purpose (speed-limited pulls, drifting sky), so only the
        // springy snap-back needs every frame.
        const lite = SOFT || cvOpts.maxDpr < 2;
        const calm = lite ? !wins.some(wn => wn.snapping) : phase !== 'end' && !W.shoot && performance.now() > busyUntil && Math.abs(G.cam - G.camT) < 0.3 && Math.abs(W.depth - W.depthT) < 0.004 && Math.abs(W.city - W.cityT) < 0.004 && Math.abs(W.aur - W.aurT) < 0.004 && Math.abs(W.lights - W.lightsT) < 0.004
          && !wins.some(wn => wn.dragging || wn.snapping || wn.keyT > 0 || wn.swing > 0.01 || Math.abs(wn.litNow - wn.lit) > 0.004 || (wn.active && !wn.closed && Math.abs(wn.target - wn.f) > 0.001));
        accDt += dt;
        if (calm && (half ^= 1)) {
          // use the quiet frame to refresh the cached picture, so a drawn frame never has to do both
          if (SKYC && backMode()) { paintSky(); const sig = backSig(); if (sig !== backKey || !BACK) paintBack(sig); }
          return;
        }
        // under the title card (a blurred overlay) and behind the results panel the night holds still, so the browser can
        // reuse its blur instead of recomputing it every frame
        if ((phase === 'intro' && drawn > 1) || (finished && (++finTick & 1))) return;
        draw(g, Math.min(0.1, accDt), t); accDt = 0; drawn++;
      });
      function stepWin(win, dt) {
        win.litNow += (win.lit - win.litNow) * Math.min(1, dt * 1.6);
        if (win.swing > 0.01) win.swing *= Math.pow(0.04, dt); else win.swing = 0;
        if (win.closed || !win.active) return;
        if (win.snapping) {
          win.sv += (-75 * win.f - 11 * win.sv) * dt; win.f += win.sv * dt;
          if (Math.abs(win.f) < 0.004 && Math.abs(win.sv) < 0.05) { win.f = 0; win.sv = 0; win.snapping = false; win.target = 0; }
          return;
        }
        if (win.keyT > 0) win.keyT -= dt;
        if (!win.dragging && win.keyT <= 0 && Math.abs(win.target - win.f) < 0.001) return;
        const rate = 1 / PULL, gap = win.target - win.f;
        const fr = (win.target - win.last) / Math.max(dt, 0.001); win.last = win.target;
        win.speed = win.speed * 0.82 + fr * 0.18;
        if (win.dragging && gap > SNAP) { snap(win); return; }
        const before = win.f;
        if (gap > 0) win.f = Math.min(win.target, win.f + rate * dt);
        else win.f = Math.max(win.target, win.f + gap * Math.min(1, dt * 12));
        const moved = win.f - before;
        if (win.dragging || win.keyT > 0) {
          const r = win.speed / rate;
          if (r > 0.06) { win.mv += dt; win.st += dt * (r <= 1.3 ? 1 : Math.max(0, 1 - (r - 1.3) / 1.2)); }
          win.good = r > 0.06 && r <= 1.3 ? 1 : 0;
          if (win.good && Math.random() < dt * 9) P.emit('mote', win.x + win.w / 2 + (Math.random() - 0.5) * win.w * 0.6, win.y + win.gh * win.f, 1, { colors: ['#fff1c4', '#d6ffe4'] });
        }
        if (zip) { zip.level(Math.min(0.09, Math.abs(moved) / dt * 0.12), 0.05); zip.freq(1100 + win.f * 900, 0.08); }
        if (Math.floor(win.f * 14) !== Math.floor(before * 14) && moved > 0) ratchet(win.f);
        win.node.setAttribute('aria-valuenow', String(Math.round(Math.max(0, win.f) * 100)));
        if (win.f >= 0.985) closeWin(win);
      }

      /* ---------------- drawing ---------------- */
      const SKY = {
        dark: { top: [[38, 44, 104], [6, 8, 26]], mid: [[78, 70, 140], [14, 18, 54]], low: [[196, 128, 140], [34, 34, 82]] },
        bright: { top: [[96, 120, 204], [28, 38, 98]], mid: [[160, 150, 218], [52, 58, 126]], low: [[255, 192, 158], [92, 82, 150]] }
      };
      const stars = (() => { const R = rr(K.daily() + 55), out = []; for (let i = 0; i < 260; i++) out.push({ x: R(), y: Math.pow(R(), 1.25), s: R() < 0.12 ? 2.2 : R() < 0.5 ? 1.5 : 1, th: R(), ph: R() * 6, sp: 0.6 + R() * 2.2 }); return out; })();
      let skyKey = '', SKYC = null, BACK = null, backKey = '';
      /* While the camera rests, the sky, the skyline, the facade and every window that is not changing are one cached
         picture; only the moving parts (the window being pulled, twinkles, smoke, weather) are drawn each frame. */
      const isStatic = (wn) => !wn.active && !wn.snapping && wn.swing === 0 && Math.abs(wn.litNow - wn.lit) < 0.004;
      const backMode = () => phase !== 'end' && Math.abs(G.cam) < 0.01 && W.aur <= 0.01 && W.cons < 0 && !W.shoot;
      function backSig() { let k = skyKey + '|'; for (const wn of wins) k += isStatic(wn) ? (wn.closed ? 'c' : 'l') + Math.round(wn.litNow * 40) : 'd'; return k; }
      function paintBack(sig) {
        if (!BACK || BACK.c.width !== Math.round(G.w * cv.dpr) || BACK.c.height !== Math.round(G.H * cv.dpr)) BACK = off(G.w, G.H);
        const bg = BACK.g;
        bg.drawImage(SKYC.c, 0, 0, G.w, G.H);
        bg.drawImage(LAY.city.c, 0, G.cam, G.w, G.H);
        for (const wn of wins) if (isStatic(wn)) drawWin(bg, wn, 0);
        bg.drawImage(LAY.fore.c, 0, G.foreTop, G.w, G.H - G.foreTop);
        backKey = sig;
      }
      S.on('theme', () => { paintLayers(); skyKey = ''; });
      function paintSky() {
        const D = dark(), sk = SKY[D ? 'dark' : 'bright'], d = Math.round(W.depth * 24) / 24, key = (D ? 'd' : 'b') + d + ':' + G.w + 'x' + G.H + '@' + cv.dpr;
        if (key === skyKey || !G.H) return;
        skyKey = key;
        const skyH = G.parapet + 40 + (G.camMax || 0), low = rgb(mixc(sk.low[0], sk.low[1], Math.min(1, d * 1.1)), 1), top = rgb(mixc(sk.top[0], sk.top[1], d), 1), mid = rgb(mixc(sk.mid[0], sk.mid[1], d), 1);
        if (!el.style.backgroundColor) el.style.backgroundColor = top; // only seen for the instant before the first frame
        // the sky lives in the opaque canvas: a tiny gradient bitmap that the blit stretches to full size
        const sh = Math.max(8, Math.ceil(G.H / 4));
        if (!SKYC || SKYC.c.height !== sh) { const c = document.createElement('canvas'); c.width = 4; c.height = sh; SKYC = { c, g: c.getContext('2d') }; }
        const sg = SKYC.g, sc = sh / G.H, gr = sg.createLinearGradient(0, 0, 0, Math.max(1, skyH * sc));
        gr.addColorStop(0, top); gr.addColorStop(0.55, mid); gr.addColorStop(1, low);
        sg.fillStyle = gr; sg.fillRect(0, 0, 4, sh);
      }
      function drawWin(g, win, t) {
        const S2 = win.spr; if (!S2) return;
        const x = win.x, y = win.y + G.cam, w = win.w, gh = win.gh, f = Math.max(0, Math.min(1, win.f)), lit = win.litNow;
        if (win.closed && lit < 0.004) {
          if (!S2.shut) S2.shut = composeShut(win);
          g.drawImage(S2.shut, x - 8, y - 8, w + 16, gh + 16);
          return;
        }
        if (lit > 0.02) { g.globalAlpha = lit; g.drawImage(LAY.glow, x - w * 0.28, y - gh * 0.36, w * 1.56, gh * 1.72); g.globalAlpha = 1; }
        if (lit < 0.99) g.drawImage(S2.dark, x, y, w, gh);
        if (lit > 0.01) { g.globalAlpha = lit; g.drawImage(S2.lit, x, y, w, gh); g.globalAlpha = 1; }
        if (f > 0.004) {
          const bh = Math.max(1, f * gh), sh = S2.blind.height, sw = S2.blind.width;
          if (win.round) { g.save(); g.beginPath(); g.arc(x + w / 2, y + gh / 2, w / 2, 0, K.TAU); g.clip(); }
          g.drawImage(S2.blind, 0, (1 - f) * sh, sw, f * sh, x, y, w, bh);
          if (lit > 0.02) { g.globalAlpha = lit; g.drawImage(S2.glow, 0, (1 - f) * sh, sw, f * sh, x, y, w, bh); g.globalAlpha = 1; }
          if (lit < 0.98) { g.globalAlpha = (1 - lit) * 0.6; g.fillStyle = dark() ? '#0a0c22' : '#1c1f44'; g.fillRect(x, y, w, bh); g.globalAlpha = 1; }
          const by = y + bh;
          g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x - 2, by, w + 4, 3);
          g.fillStyle = lit > 0.5 ? '#c9a676' : '#6e5a48'; g.fillRect(x - 3, by - 4, w + 6, 6);
          g.fillStyle = 'rgba(255,240,210,0.5)'; g.fillRect(x - 3, by - 4, w + 6, 1.5);
          if (win.round) g.restore();
        }
        g.drawImage(S2.frame, x - 8, y - 8, w + 16, gh + 16);
        if (win.active && !win.closed) {
          const cx = x + w / 2, cy = y + f * gh + 1, ang = Math.sin(t * 9) * 0.3 * win.swing;
          const ex = cx + Math.sin(ang) * 12, ey = cy + Math.cos(ang) * 12;
          g.strokeStyle = '#e6d2a8'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(ex, ey); g.stroke();
          g.strokeStyle = win.good ? '#c8ffd8' : '#f5deae'; g.lineWidth = 3; g.beginPath(); g.arc(ex, ey + 7, 6, 0, K.TAU); g.stroke();
          g.globalAlpha = win.good ? 0.5 : 0.25; g.fillStyle = win.good ? '#c8ffd8' : '#ffe2a8'; g.beginPath(); g.arc(ex, ey + 7, 11, 0, K.TAU); g.fill(); g.globalAlpha = 1;
        }
      }
      function composeShut(win) {
        // a sleeping window never changes again, so it becomes one cached sprite
        const S2 = win.spr, s = off(win.w + 16, win.gh + 16), g = s.g, w = win.w, gh = win.gh;
        g.save(); g.translate(8, 8);
        g.drawImage(S2.dark, 0, 0, w, gh);
        g.save(); clipShape(g, win);
        g.drawImage(S2.blind, 0, 0, w, gh);
        g.globalAlpha = 0.6; g.fillStyle = dark() ? '#0a0c22' : '#1c1f44'; g.fillRect(0, 0, w, gh); g.globalAlpha = 1;
        const mg = g.createLinearGradient(0, 0, w, gh); mg.addColorStop(0, 'rgba(190,210,255,0.16)'); mg.addColorStop(0.45, 'rgba(190,210,255,0)'); g.fillStyle = mg; g.fillRect(0, 0, w, gh);
        g.restore();
        g.fillStyle = '#6e5a48'; g.fillRect(-3, gh - 4, w + 6, 6); g.fillStyle = 'rgba(255,240,210,0.5)'; g.fillRect(-3, gh - 4, w + 6, 1.5);
        g.restore();
        g.drawImage(S2.frame, 0, 0, w + 16, gh + 16);
        return s.c;
      }
      function draw(g, dt, t) {
        const w = G.w, H = G.H, D = dark(), d = W.depth;
        paintSky();
        const vis = 0.22 + d * 0.78, starTop = (G.fac.y + G.cam) * 0.98, cached = backMode();
        if (cached) { const sig = backSig(); if (sig !== backKey || !BACK) paintBack(sig); g.drawImage(BACK.c, 0, 0, w, H); }
        else g.drawImage(SKYC.c, 0, 0, w, H);
        // stars twinkle every frame; over the cached picture only the ones no rooftop hides are drawn
        g.fillStyle = '#fff';
        for (const s of stars) {
          if (s.th > vis || (cached && s.hid)) continue;
          const a = Math.min(1, (vis - s.th) * 6) * (0.45 + 0.4 * Math.sin(t * s.sp + s.ph)) * (D ? 1 : 0.85);
          if (a <= 0.02) continue;
          g.globalAlpha = a; g.fillRect(s.x * w, s.y * starTop, s.s, s.s);
        }
        g.globalAlpha = 1;
        if (!cached) {
          if (W.aur > 0.01) drawAurora(g, t);
          if (W.cons >= 0) drawConstellation(g, t);
          if (W.shoot) drawShoot(g);
          g.drawImage(LAY.city.c, 0, G.cam, w, H);
        }
        const cityOff = W.city * 1.05;
        for (let pass = 0; pass < 2; pass++) {
          g.beginPath();
          for (const b of LAY.bwin) { if (b.warm === pass && b.off >= cityOff && b.off <= 0.82) g.rect(b.x, b.y + G.cam, b.w, b.h); }
          g.fillStyle = pass ? '#ffd98a' : '#cfe4ff'; g.globalAlpha = D ? 0.78 : 0.62; g.fill();
        }
        g.globalAlpha = 1;
        if (DAY.weather === 'mist') { const my = G.parapet - 150 + Math.sin(t * 0.2) * 10, mg2 = g.createLinearGradient(0, my - 60, 0, my + 60); mg2.addColorStop(0, 'rgba(200,210,255,0)'); mg2.addColorStop(0.5, `rgba(200,210,255,${D ? 0.1 : 0.16})`); mg2.addColorStop(1, 'rgba(200,210,255,0)'); g.fillStyle = mg2; g.fillRect(0, my - 60, w, 120); }
        for (const win of wins) { if (!cached || !isStatic(win)) drawWin(g, win, t); if (win.sil === 'tea' && win.litNow > 0.5 && Math.random() < dt * 3) P.emit('smoke', win.x + win.w * 0.56, win.y + G.cam + win.gh * 0.42, 1, { speed: [4, 10], angle: -Math.PI / 2, spread: 0.3, size: [2, 4] }); }
        if (!cached) g.drawImage(LAY.fore.c, 0, G.foreTop, w, H - G.foreTop);
        if (W.lights > 0.03) for (const b of LAY.bulbs) { g.globalAlpha = W.lights * (0.72 + 0.28 * Math.sin(t * 1.3 + b.ph)); g.drawImage(LAY.sprites[b.c], b.x - 15, b.y - 15, 30, 30); }
        g.globalAlpha = 1;
        if (visits >= 1) drawCat(g, t);
        if (G.chim && Math.random() < dt * 0.7) P.emit('smoke', G.chim.x + 4, G.chim.y, 1, { speed: [6, 14], angle: -Math.PI / 2 - 0.2, spread: 0.5, size: [3, 6], colors: ['rgba(170,170,200,0.14)'] });
        if (DAY.weather === 'snow' && Math.random() < dt * (G.phone ? 10 : 22)) P.emit('snow', Math.random() * w, -6, 1, { angle: Math.PI / 2, spread: 0.4, speed: [14, 34] });
        if (DAY.weather === 'fireflies' && Math.random() < dt * 2.2) P.emit('mote', Math.random() * w, G.parapet - 20 - Math.random() * 120, 1, { colors: ['#e9ff9a', '#fff3a0'] });
        if (DAY.weather === 'drizzle') { g.strokeStyle = D ? 'rgba(190,205,255,0.16)' : 'rgba(80,90,140,0.18)'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < (G.phone ? 50 : 110); i++) { const rx = (i * 73.1 + t * 160) % (w + 40) - 20, ry = (i * 41.3 + t * 420) % H; g.moveTo(rx, ry); g.lineTo(rx - 2, ry + 9); } g.stroke(); }
        P.update(dt); P.draw(g);
      }
      function drawCat(g, t) {
        const x = G.w - (G.phone ? 88 : 150), y = G.parapet - 4, c = W.catCurl;
        g.fillStyle = dark() ? '#14101c' : '#2c2236';
        if (c < 0.5) {
          g.beginPath(); g.ellipse(x, y - 13, 12, 13, 0, 0, K.TAU); g.fill();
          g.beginPath(); g.arc(x + 2, y - 31, 8, 0, K.TAU); g.fill();
          g.beginPath(); g.moveTo(x - 4, y - 36); g.lineTo(x - 3, y - 46); g.lineTo(x + 2, y - 38); g.moveTo(x + 4, y - 38); g.lineTo(x + 9, y - 45); g.lineTo(x + 9, y - 34); g.fill();
          g.strokeStyle = g.fillStyle; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 10, y - 4); g.quadraticCurveTo(x - 28, y - 2 + Math.sin(t * 1.5) * 3, x - 24, y - 20); g.stroke();
        } else {
          g.beginPath(); g.ellipse(x, y - 9, 18, 10, 0, 0, K.TAU); g.fill();
          g.beginPath(); g.arc(x + 13, y - 12, 7, 0, K.TAU); g.fill();
          g.beginPath(); g.moveTo(x + 10, y - 17); g.lineTo(x + 12, y - 25); g.lineTo(x + 16, y - 18); g.fill();
        }
      }
      function drawAurora(g, t) {
        const w = G.w, top = 70, a = W.aur, span = G.fac.y + G.cam - top;
        const cols = [[121, 255, 216], [141, 183, 255], [196, 166, 255]];
        g.save(); g.globalCompositeOperation = 'lighter';
        for (let b = 0; b < 3; b++) {
          const base = top + b * span * 0.16, amp = 14 + b * 6, hgt = span * (0.55 - b * 0.08);
          g.beginPath();
          for (let x = 0; x <= w; x += 16) { const y = base + Math.sin(x * 0.009 + t * (0.35 + b * 0.1) + b * 2) * amp + Math.sin(x * 0.023 - t * 0.5) * 7; if (x) g.lineTo(x, y); else g.moveTo(x, y); }
          for (let x = w; x >= 0; x -= 16) g.lineTo(x, base + hgt + Math.sin(x * 0.007 + t * 0.3 + b) * amp * 0.7);
          g.closePath();
          const c = cols[b], ag = g.createLinearGradient(0, base - amp, 0, base + hgt);
          ag.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.34 * a})`); ag.addColorStop(0.4, `rgba(${c[0]},${c[1]},${c[2]},${0.13 * a})`); ag.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = ag; g.fill();
        }
        g.restore();
      }
      function drawConstellation(g, t) {
        const Cn = DAY.cons, B = G.cons, k = W.cons, n = Cn.pts.length;
        const pt = (i) => ({ x: B.x + Cn.pts[i][0] * B.w, y: B.y + Cn.pts[i][1] * B.h });
        g.strokeStyle = 'rgba(220,232,255,0.6)'; g.lineWidth = 1.4;
        Cn.edges.forEach(([i, j], e) => {
          const lk = K.clamp((k * (Cn.edges.length + 2) - e) / 1.2, 0, 1); if (lk <= 0) return;
          const a = pt(i), b = pt(j);
          g.globalAlpha = 0.85 * lk; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x + (b.x - a.x) * lk, a.y + (b.y - a.y) * lk); g.stroke();
        });
        for (let i = 0; i < n; i++) {
          const sk = K.clamp(k * (n + 1) - i, 0, 1); if (sk <= 0) continue;
          const p = pt(i), tw = 0.8 + 0.2 * Math.sin(t * 2.4 + i);
          g.globalAlpha = sk * tw; g.drawImage(LAY.sprites['#ffd98a'], p.x - 12, p.y - 12, 24, 24);
          g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(p.x, p.y, 2.2 * sk, 0, K.TAU); g.fill();
        }
        g.globalAlpha = 1;
      }
      function drawShoot(g) {
        const s = W.shoot, k = (performance.now() - s.t0) / s.ms;
        if (k > 1.25) { W.shoot = null; return; }
        const e = Math.min(1, k), x = s.x0 + (s.x1 - s.x0) * e, y = s.y0 + (s.y1 - s.y0) * e;
        const tx = x - (s.x1 - s.x0) * 0.24, ty = y - (s.y1 - s.y0) * 0.24, fade = k > 1 ? 1 - (k - 1) * 4 : 1;
        const lg = g.createLinearGradient(tx, ty, x, y); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(1, `rgba(255,250,235,${0.92 * fade})`);
        g.strokeStyle = lg; g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(tx, ty); g.lineTo(x, y); g.stroke();
        g.globalAlpha = Math.max(0, fade); g.drawImage(LAY.sprites['#bfe3ff'], x - 14, y - 14, 28, 28); g.globalAlpha = 1;
        if (k < 1 && Math.random() < 0.5) P.emit('star', x, y, 1, { speed: [4, 14], colors: ['#fffbe6'] });
      }

      /* ---------------- finale ---------------- */
      let finished = false;
      async function finale() {
        if (phase === 'end') return;
        phase = 'end';
        K.guide(null);
        music.tempo(48); music.level(0.5);
        W.cityT = 1; W.depthT = 1;
        still.base('E18');
        still.say(line({ Jolly: 'All tucked in. Tomorrow’s got your list. Night night.', Cheeky: 'City’s asleep. Your worries are in the post. Your turn.', Unfiltered: 'Everything’s parked. Nothing left to do tonight.' }), { ms: 3200 });
        if (amb && amb.level) amb.level(0.16, 3);
        await K.sleep(1200);
        G.camT = G.camMax; W.lightsT = 0.25;
        await K.sleep(2300);
        still.face('E88');
        if (A.ctx) { A.tone({ type: 'sawtooth', freq: 330, to: 170, glide: 1.5, dur: 1.7, vol: 0.035, lp: 800, attack: 0.25, verb: 0.3 }); A.noise({ pink: true, filter: 'lowpass', freq: 700, to: 300, dur: 1.5, attack: 0.3, vol: 0.05 }); }
        still.el.classList.add('ld-moondim'); halo.classList.add('ld-dim');
        await K.sleep(1400);
        still.base('E19');
        W.aurT = 1; W.cons = 0;
        if (A.ctx) A.pad([A.note('F3'), A.note('A3'), A.note('C4'), A.note('E4')], { dur: 7, vol: 0.13, attack: 1.2 });
        let rung = 0;
        if (visits >= 1) W.catCurl = 1;
        await K.anim(K.reduced() ? 400 : 2600, (k) => {
          W.cons = k;
          const n = Math.floor(k * DAY.cons.pts.length);
          while (rung < n) { if (A.ctx) A.chime(A.note(['C6', 'E6', 'G6', 'A6', 'C7', 'D7', 'E7', 'G6', 'A6', 'C7'][rung % 10]), { vol: 0.035, dur: 1.6, verb: 0.6 }); rung++; }
        });
        W.cons = 1; cap.classList.add('ld-on');
        W.shoot = { t0: performance.now(), ms: K.reduced() ? 900 : 2600, x0: G.w * (G.phone ? 0.1 : 0.12), y0: G.phone ? 96 : 70, x1: G.w * (G.phone ? 0.72 : 0.5), y1: 250 };
        if (A.ctx) { A.tone({ type: 'sine', freq: 2600, to: 900, glide: 2.4, dur: 2.6, vol: 0.03, attack: 0.3, verb: 0.6 }); K.sfx.sparkle(); }
        await K.sleep(K.reduced() ? 900 : 2900);
        const best = Math.max(...wins.map(x => x.score));
        const mean = wins.reduce((s, x) => s + x.score, 0) / wins.length;
        const pct = Math.round(mean * 100), bestPct = Math.round(best * 100);
        const badges = [];
        const pb = K.best('steady', pct, 'higher');
        if (pb.isNew) badges.push('New best: ' + pct + '% steady');
        else if (pb.first) badges.push('First night: ' + pct + '% steady');
        const tier = K.tier(mean);
        if (tier) badges.push(tier + ': steady hands');
        const col = K.collect(DAY.cons.name);
        badges.push((col.isNew ? 'Collected: ' : 'Seen again: ') + DAY.cons.name + ' (' + col.count + ' of ' + CONS.length + ')');
        if (!snapsTotal) badges.push('Never rushed once');
        ctx.track('done', { steady: pct, snaps: snapsTotal, own: items.own });
        finished = true;
        ctx.finish({
          title: 'The city sleeps', mood: 'E19',
          lines: [TOTAL + ' worries parked for tomorrow', 'Lights out', 'Steadiest pull: ' + bestPct + '%'],
          share: TOTAL + ' worries parked for tomorrow. Lights out.',
          badges
        });
      }

      /* ---------------- start ---------------- */
      // a pixel-ratio change (quality guard) keeps every cached sprite and just redraws; a real resize lays out again
      cv.onResize(() => { if (!(LAY && cv.w === G.w && cv.h === G.H)) layout(); half = 1; if (cv.g && LAY) draw(cv.g, 0, performance.now() / 1000); });
      (async () => {
        await K.intro({ title: 'Lantern Down', sub: 'The city is still awake, and so are tomorrow’s worries. Tuck them in, one window at a time.', how: 'Pull each blind down slowly. Too fast and it springs back up.', char: 'still', mood: 'E18' });
        phase = 'play';
        still.say(line({ Jolly: 'Evening. Let’s tuck the city in, one window at a time. Slowly.', Cheeky: 'Bedtime, city. Pull those blinds like you’ve got all night. You do.', Unfiltered: 'Lights on, brain still at work. Close them. Slowly.' }), { ms: 3800 });
        nextGuide(1200);
      })();

      return {
        async autoplay() {
          while (phase !== 'play') await K.wait(120);
          let guard = 0;
          while (!finished && guard++ < 60) {
            if (phase !== 'play') { await K.wait(200); continue; }
            const w = nextWin();
            if (!w) { await K.wait(250); continue; }
            if (w.snapping) { await K.wait(150); continue; }
            const x = w.w / 2, y0 = Math.max(4, w.gh * Math.max(0, w.f) + 6), y1 = w.gh + 26;
            const ms = Math.round(PULL * 1000 * 1.45 * (1 - Math.max(0, w.f)) + 300);
            await K.sim.drag(w.node, { x, y: y0 }, { x, y: y1 }, ms, Math.max(12, Math.round(ms / 45)));
            const t0 = performance.now();
            while (!w.closed && performance.now() - t0 < 900) await K.wait(60);
          }
          while (!finished) await K.wait(200);
        }
      };
    }
  });
})(window.TSG_ENV);
