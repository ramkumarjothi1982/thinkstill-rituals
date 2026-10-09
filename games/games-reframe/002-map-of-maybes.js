/* 002 Map of Maybes — Reframe · REFRAME · Uncertainty / Future Worry / Reassurance
 * Mechanism: generating alternative explanations and checking each one against the facts lowers certainty in the
 * catastrophic one (Clark & Beck 2010: alternative explanations and evidence testing for anxious predictions). Every road
 * starts at the same plaza (what actually happened); fact gates open only when that fact fits the district; the feared
 * district under the storm turns out to be one district among several (or, when the facts back it, gets a plan).
 * Verb: route (draw a route with your finger along the roads, then drop a hunch pin). Finale: the map zooms out, every
 * travelled road glows like a constellation and fireworks burst over the districts you explored.
 */
(function (env) {
  'use strict';
  const PIN = '<svg viewBox="0 0 56 66" aria-hidden="true"><defs><radialGradient id="mmPinG" cx="38%" cy="30%" r="70%"><stop offset="0" stop-color="#fff6cf"/><stop offset=".45" stop-color="#ffc83f"/><stop offset="1" stop-color="#d47a06"/></radialGradient></defs><ellipse cx="28" cy="62" rx="9" ry="3" fill="rgba(0,0,0,.35)"/><path d="M28 61C28 61 7 38 7 24a21 21 0 1 1 42 0c0 14-21 37-21 37z" fill="url(#mmPinG)" stroke="#5b3500" stroke-width="2.5"/><circle cx="28" cy="24" r="10" fill="#3b2205"/><path d="M28 16.5l2.3 4.9 5.3.6-3.9 3.6 1.1 5.2-4.8-2.7-4.8 2.7 1.1-5.2-3.9-3.6 5.3-.6z" fill="#ffe27a"/></svg>';
  const CAM = '<svg viewBox="0 0 22 16" aria-hidden="true"><rect x="1" y="4" width="20" height="11" rx="3" fill="currentColor"/><rect x="7" y="1" width="8" height="4.5" rx="1.4" fill="currentColor"/><circle cx="11" cy="9.5" r="3.6" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="1.8"/></svg>';
  /* No GPU (VMs, blocklisted devices): every canvas pixel is rasterised on the CPU, so the map runs at 1x and ~30 fps there
   * (even motion beats dropped frames). Devices with a GPU keep the crisp 2x, 60 fps city. */
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
  /* K.canvas with an opaque backing store: the city covers every pixel, so the compositor never blends what's under it. */
  function opaqueCanvas(parent, o, S) {
    const c = document.createElement('canvas'); c.className = 'gk-canvas'; c.setAttribute('aria-hidden', 'true'); parent.append(c);
    const st = { el: c, g: null, w: 0, h: 0, dpr: 1 }, cbs = [];
    st.fit = () => {
      const w = c.clientWidth || parent.clientWidth, hh = c.clientHeight || parent.clientHeight; if (!w || !hh) return;
      const dpr = Math.min(window.devicePixelRatio || 1, o.maxDpr || 2), pw = Math.round(w * dpr), ph = Math.round(hh * dpr);
      if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
      st.g = st.g || c.getContext('2d', { alpha: false }); st.g.setTransform(dpr, 0, 0, dpr, 0, 0);
      st.dpr = dpr; st.w = w; st.h = hh;
      cbs.forEach(f => { try { f(st); } catch (e) { console.error(e); } });
    };
    st.onResize = (f) => { cbs.push(f); if (st.w) f(st); };
    try { const ro = new ResizeObserver(() => st.fit()); ro.observe(c); S.onDestroy(() => ro.disconnect()); } catch (e) { S.listen(window, 'resize', st.fit); }
    st.fit();
    return st;
  }
  (env.games = env.games || []).push({
    id: 'map-of-maybes', mode: 'reframe', name: 'Map of Maybes', verb: 'route', family: 'REFRAME', minutes: 2,
    parents: ['Uncertainty / Future Worry / Reassurance', 'Beliefs / Evidence'],
    cast: ['glitch'], poster: { char: 'glitch', mood: 'cool' },
    tagline: 'Drive every road the facts allow. The fear is one district.',
    why: 'For a story stuck on one ending: drive every explanation the facts allow, then pick a hunch.',
    css: `
.g-map-of-maybes .mm-hit { position: absolute; inset: 0; z-index: 12; touch-action: none; cursor: crosshair; }
.g-map-of-maybes .mm-sign { position: absolute; left: 0; top: 0; z-index: 14; transform: translate(-50%, -100%); pointer-events: none; display: flex; flex-direction: column; align-items: center; gap: 4px; width: max-content; max-width: min(140px, 30cqw); transition: opacity .4s ease; }
.g-map-of-maybes .mm-sign b { display: block; font: 700 12px/1.12 var(--font-ui); letter-spacing: .05em; text-align: center; color: #fff; padding: 5px 8px 4px; border-radius: 8px; background: rgba(8, 10, 28, .82); border: 1.5px solid var(--c, #fff);
  box-shadow: 0 0 14px color-mix(in srgb, var(--c, #fff) 45%, transparent), 0 4px 10px rgba(0, 0, 0, .35); text-wrap: balance; transition: transform .2s ease; }
.g-map-of-maybes .mm-sign.dim b { border-style: dashed; color: rgba(255, 255, 255, .88); box-shadow: 0 4px 10px rgba(0, 0, 0, .3); }
.g-map-of-maybes .mm-sign.lit b { animation: mm-signon .7s cubic-bezier(.2, 1.5, .4, 1) backwards; }
.g-map-of-maybes .mm-sign.out b { text-decoration: line-through; opacity: .8; }
.g-map-of-maybes .mm-sign.hover b { transform: scale(1.14); box-shadow: 0 0 22px var(--c, #fff), 0 4px 10px rgba(0, 0, 0, .35); }
.g-map-of-maybes .mm-pl { display: inline-flex; align-items: center; gap: 5px; font: 700 12px/1 var(--font-ui); letter-spacing: .06em; color: var(--pc); background: rgba(8, 10, 28, .85); padding: 4px 8px 4px 6px; border-radius: 999px; white-space: nowrap; }
.g-map-of-maybes .mm-bars { display: inline-flex; gap: 2px; align-items: flex-end; height: 11px; }
.g-map-of-maybes .mm-bars i { width: 3px; border-radius: 1px; background: currentColor; opacity: .28; }
.g-map-of-maybes .mm-bars i:nth-child(1) { height: 5px; }
.g-map-of-maybes .mm-bars i:nth-child(2) { height: 8px; }
.g-map-of-maybes .mm-bars i:nth-child(3) { height: 11px; }
.g-map-of-maybes .mm-bars i.on { opacity: 1; }
@keyframes mm-signon { 0% { transform: scale(.6); } 60% { transform: scale(1.16); } 100% { transform: none; } }
.g-map-of-maybes .mm-board { position: absolute; z-index: 33; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 60px); transform: translateX(-50%); width: min(420px, calc(100% - 20px)); padding: 11px 14px 12px; border-radius: 18px;
  background: var(--ui-surface); color: var(--ui-fg); border: 1.5px solid color-mix(in srgb, var(--c, #ffb24f) 75%, transparent);
  box-shadow: 0 0 28px color-mix(in srgb, var(--c, #ffb24f) 30%, transparent), 0 14px 30px rgba(0, 0, 0, .35); pointer-events: none;
  display: flex; flex-direction: column; gap: 6px; transition: opacity .3s ease, transform .4s cubic-bezier(.2, 1.3, .4, 1); }
.g-map-of-maybes .mm-board.off { opacity: 0; transform: translateX(-50%) translateY(-12px) scale(.96); }
.g-map-of-maybes .mm-btop { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.g-map-of-maybes .mm-name { font: 800 19px/1.05 var(--font-display); letter-spacing: .03em; color: var(--ct, var(--c)); text-transform: uppercase; }
.g-map-of-maybes .mm-board .mm-pl { background: var(--pc); color: #10131f; }
.g-map-of-maybes .mm-theory { font: 600 15px/1.32 var(--font-ui); }
.g-map-of-maybes .mm-needs { font: 500 14px/1.35 var(--font-ui); color: var(--ui-muted); }
.g-map-of-maybes .mm-needs b { color: var(--ui-fg); font-weight: 700; }
.g-map-of-maybes .mm-quote { font: italic 500 13px/1.35 var(--font-ui); color: var(--ui-muted); }
.g-map-of-maybes .mm-tag { display: inline-flex; align-items: center; gap: 6px; font: 700 12px/1 var(--font-ui); letter-spacing: .1em; text-transform: uppercase; color: var(--ui-muted); }
.g-map-of-maybes .mm-tag svg { width: 18px; height: 14px; color: var(--ct, var(--c)); }
.g-map-of-maybes .mm-verdict { font: 800 13px/1 var(--font-ui); letter-spacing: .08em; padding: 5px 9px; border-radius: 999px; color: #05230f; background: #6ee7a0; white-space: nowrap; }
.g-map-of-maybes .mm-verdict.no { background: #ff9b9b; color: #2b0606; }
.g-map-of-maybes .mm-fact { font: 600 15px/1.32 var(--font-ui); }
.g-map-of-maybes .mm-plan { font: 600 14px/1.35 var(--font-ui); padding: 7px 10px; border-radius: 12px; background: color-mix(in srgb, var(--ui-accent) 15%, transparent); border: 1px solid color-mix(in srgb, var(--ui-accent) 45%, transparent); }
.g-map-of-maybes .mm-plan b { color: var(--ui-accent); }
.g-map-of-maybes .mm-final { font: 800 clamp(22px, 6.4cqw, 30px)/1.05 var(--font-display); letter-spacing: .01em; color: var(--ct, var(--ui-fg)); text-align: center; text-wrap: balance; }
.g-map-of-maybes .mm-sub { font: 600 14px/1.3 var(--font-ui); text-align: center; color: var(--ui-muted); }
.g-map-of-maybes .mm-start { position: absolute; z-index: 16; left: 50%; top: 0; transform: translateX(-50%); width: min(380px, calc(100% - 24px)); padding: 8px 13px 10px; border-radius: 14px;
  background: color-mix(in srgb, var(--ui-surface) 94%, transparent); color: var(--ui-fg); border: 1.5px solid color-mix(in srgb, var(--ui-accent) 60%, transparent); box-shadow: 0 0 22px color-mix(in srgb, var(--ui-accent) 22%, transparent), 0 10px 24px rgba(0, 0, 0, .35);
  pointer-events: none; display: flex; flex-direction: column; gap: 4px; transition: opacity .4s ease; }
.g-map-of-maybes .mm-start-top { display: flex; justify-content: space-between; gap: 8px; font: 700 12px/1 var(--font-ui); letter-spacing: .1em; text-transform: uppercase; color: var(--ui-accent); }
.g-map-of-maybes .mm-start .gk-user { font: 600 15px/1.3 var(--font-ui); }
.g-map-of-maybes .mm-count { color: var(--ui-muted); display: inline-block; transform-origin: right center; }
.g-map-of-maybes .mm-count.bump { animation: mm-bump .5s cubic-bezier(.2, 1.6, .4, 1); color: var(--ui-fg); }
@keyframes mm-bump { 40% { transform: scale(1.14); } }
.g-map-of-maybes .mm-pin { position: absolute; z-index: 20; left: 0; top: 0; width: 56px; height: 66px; margin: -62px 0 0 -28px; cursor: grab; touch-action: none; filter: drop-shadow(0 6px 8px rgba(0, 0, 0, .45));
  transition: left .55s cubic-bezier(.2, 1.2, .4, 1), top .55s cubic-bezier(.2, 1.2, .4, 1), opacity .2s ease; }
.g-map-of-maybes .mm-pin svg { width: 100%; height: 100%; display: block; animation: mm-pinin .6s cubic-bezier(.2, 1.6, .4, 1) both; }
.g-map-of-maybes .mm-pin.drag { opacity: .25; transition: none; }
.g-map-of-maybes .mm-pin.planted svg { animation: mm-plant .6s cubic-bezier(.2, 1.6, .4, 1) both; }
.g-map-of-maybes .mm-pin:focus-visible { outline: 3px solid #fff; outline-offset: 4px; border-radius: 12px; }
@keyframes mm-pinin { from { transform: translateY(-34px) scale(.4); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes mm-plant { 0% { transform: translateY(-40px) scale(1.1); } 55% { transform: translateY(0) scale(1.18, .82); } 100% { transform: none; } }
.g-map-of-maybes .gk-char { left: 18px; bottom: calc(env(safe-area-inset-bottom, 0px) + 26px); }
.g-map-of-maybes .mm-cab { position: absolute; z-index: 29; left: 6px; bottom: calc(env(safe-area-inset-bottom, 0px) + 10px); width: var(--cw, 100px); height: var(--ch, 58px); border-radius: 26px 26px 14px 14px; pointer-events: none;
  background: linear-gradient(180deg, #ffe066, #f6b71f 62%, #d68f0b); box-shadow: inset 0 -6px 0 rgba(120, 70, 0, .35), inset 0 2px 0 rgba(255, 255, 255, .5), 0 10px 18px rgba(0, 0, 0, .4); }
.g-map-of-maybes .mm-cab::before { content: ""; position: absolute; left: 9px; right: 9px; bottom: 13px; height: 7px; border-radius: 2px; background: repeating-linear-gradient(90deg, #1d1d1d 0 7px, #fff 7px 14px); opacity: .92; }
.g-map-of-maybes .mm-cab::after { content: ""; position: absolute; left: 10px; right: 10px; bottom: -7px; height: 15px;
  background: radial-gradient(circle at 10px 7px, #1c1c22 0 6px, #6b6f80 6.5px 7.2px, transparent 7.6px), radial-gradient(circle at calc(100% - 10px) 7px, #1c1c22 0 6px, #6b6f80 6.5px 7.2px, transparent 7.6px); }
.g-map-of-maybes .mm-cab i { position: absolute; top: 18px; width: 9px; height: 6px; border-radius: 3px; background: #fff7d1; box-shadow: 0 0 10px #fff1a8; }
.g-map-of-maybes .mm-cab i:first-child { left: 4px; } .g-map-of-maybes .mm-cab i:last-child { right: 4px; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const TAU = Math.PI * 2, clamp = K.clamp, lerp = K.lerp, hexA = K.hexA;
      const now = () => performance.now();
      const L = (o, sub) => { let s = ctx.line(o) || ''; if (sub) Object.keys(sub).forEach(k => { s = s.split('{' + k + '}').join(sub[k]); }); return s; };
      // trims to n characters on a word boundary, and closes a quote the reader's sentence split left open (at the end of the
      // quoted sentence, restoring the question mark of an obvious question such as "Can we talk")
      const shut = (s) => {
        const fix = (s, at, close) => {
          if (at < 0) return s;
          const m = /[.!?…](?=\s|$)/.exec(s.slice(at + 1)), q = /^(can|could|would|will|do|does|did|are|is|should|shall|may|have|has)\s+(we|you|i|he|she|they|it|someone|anyone)\b/i.test(s.slice(at + 1).trim()) ? '?' : '';
          if (!m) return s + q + close;
          const end = at + 1 + m.index;
          return s[end] === '.' ? s.slice(0, end) + (q || '.') + close + s.slice(end + 1) : s.slice(0, end + 1) + close + s.slice(end + 1);
        };
        s = fix(s, (s.match(/"/g) || []).length % 2 ? s.lastIndexOf('"') : -1, '"');
        return fix(s, (s.match(/“/g) || []).length > (s.match(/”/g) || []).length ? s.lastIndexOf('“') : -1, '”');
      };
      const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return shut(s); const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); return shut((sp > n * 0.6 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'); };
      const care = an.safety === 'care';
      const support = an.fear_support === 'strong' ? 'strong' : an.fear_support === 'some' ? 'some' : 'weak';
      const serious = support !== 'weak';
      const inten = ctx.intensity;
      const visits = K.visits();
      const bright = () => S.scene() === 'bright';
      const hash = (a, b, c) => { const x = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453; return x - Math.floor(x); };
      const mix = (a, b, k) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const c = (s) => Math.round(((pa >> s) & 255) + ((((pb >> s) & 255) - ((pa >> s) & 255)) * k)); return '#' + [16, 8, 0].map(s => c(s).toString(16).padStart(2, '0')).join(''); };

      /* ---------------- the case: facts become toll gates, explanations become districts ---------------- */
      const exh = (Array.isArray(an.exhibits) ? an.exhibits : []).filter(e => e && e.text);
      let facts = exh.filter(e => e.kind === 'camera').slice(0, 3).map(e => ({ id: String(e.id), text: clip(e.text, 130) }));
      if (!facts.length) facts = [{ id: exh[0] ? String(exh[0].id) : 'e1', text: clip(exh[0] ? exh[0].text : (an.situation || 'Something happened.'), 130) }];
      let alts = (Array.isArray(an.alternatives) ? an.alternatives : []).filter(a => a && (a.name || a.theory)).slice(0, 4);
      if (!alts.some(a => a.fear)) alts = alts.slice(0, 3).concat([{ id: 'sf', name: 'THE FEAR', theory: an.conclusion || 'The worst-case story.', needs: 'Facts you don’t have yet.', plausibility: 'possible', fear: true, line: '' }]);
      if (alts.length < 2) alts = [{ id: 's0', name: 'THE ORDINARY REASON', theory: 'Something everyday explains it.', needs: 'An ordinary, boring cause.', plausibility: 'common', fear: false, line: 'I’m boring. Boring things happen a lot.' }].concat(alts);
      let fearSeen = false;
      alts = alts.map(a => { const f = !!a.fear && !fearSeen; if (f) fearSeen = true; return Object.assign({}, a, { fear: f }); });
      alts = alts.filter(a => !a.fear).concat(alts.filter(a => a.fear)).slice(-4);
      const N = alts.length;
      const fitsFact = (a, f) => { const list = Array.isArray(a.fits) ? a.fits.map(String) : []; return !list.length || list.includes(f.id); };
      const leads = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text);
      const lead = (k) => clip((leads.find(l => l.kind === k) || leads[0] || { text: 'Ask one simple question that would settle it.' }).text, 120);
      const situation = clip(an.situation || facts[0].text, 150);

      /* ---------------- today's city (daily palette, weather, landmark) ---------------- */
      const PALS = [
        { sky0: '#04071a', sky1: '#18214f', haze: '#4a3a86', ground: '#0d1433', ground2: '#090e26', block: '#151e47', block2: '#1a2555', road: '#2a3462', edge: '#3d4a8c', dash: '#ffd27a', lamp: '#ffd98a', river0: '#0a2443', river1: '#16477a', park: '#0f2c2e', tree: '#1d5443', front: '#1e2954', side: '#151c3d', roof: '#2d3b76', rim: '#4657a8', win: '#ffd98a', star: '#ffffff', moon: '#f6f1d8' },
        { sky0: '#0a0619', sky1: '#2b1552', haze: '#7a3a8e', ground: '#130d2c', ground2: '#0d0920', block: '#1e1543', block2: '#261a51', road: '#332662', edge: '#523e96', dash: '#ff9bd8', lamp: '#ffb8e8', river0: '#160f3d', river1: '#2d216e', park: '#162b36', tree: '#22504f', front: '#281e56', side: '#1b153e', roof: '#382b74', rim: '#614cb4', win: '#ffc9ec', star: '#ffe8fb', moon: '#ffe9f6' },
        { sky0: '#03111a', sky1: '#0f3445', haze: '#24706a', ground: '#081b23', ground2: '#06141b', block: '#0f2a35', block2: '#143340', road: '#1f404f', edge: '#326678', dash: '#9ff3df', lamp: '#b9fff1', river0: '#062b3c', river1: '#0e5168', park: '#0c3025', tree: '#16573c', front: '#143441', side: '#0d242e', roof: '#1f4a5a', rim: '#33788c', win: '#ccfff4', star: '#ebfffb', moon: '#effff9' }
      ];
      const BRIGHT = { sky0: '#8aa4de', sky1: '#f4d6c8', haze: '#ffd2b0', ground: '#c1cbe6', ground2: '#cdd5ee', block: '#b1bcdc', block2: '#a8b4d7', road: '#f1f3fb', edge: '#8a98c2', dash: '#d4842a', lamp: '#ff9a3c', river0: '#80a9d8', river1: '#a3c4ea', park: '#a1cc9f', tree: '#69a368', front: '#94a2cb', side: '#808fbb', roof: '#c6cfeb', rim: '#f2f5fd', win: '#ffb93f', star: '#ffffff', moon: '#fffaf0' };
      const palDark = K.dailyPick(PALS, 1);
      const pal = () => (bright() ? BRIGHT : palDark);
      const weather = K.dailyPick(['clear', 'drizzle', 'mist', 'clear', 'snow', 'fireflies', 'clear'], 2);
      const LANDMARKS = ['Ferris Wheel', 'Clock Tower', 'Observatory', 'Radio Mast', 'Lantern Bridge', 'Harbour Crane'];
      const landmark = K.dailyPick(LANDMARKS, 3);
      const riverY = (x) => 0.5 + 0.035 * Math.sin(x * 5.2 + 0.7) + 0.018 * Math.sin(x * 11 + 2);
      const LMP = landmark === 'Lantern Bridge' ? [0.9, riverY(0.9)] : [0.915, 0.865];

      /* ---------------- districts and roads (world space: x 0..1 left→right, y 0 far → 1 near) ---------------- */
      const NEON = [{ c: '#43e8da', d: '#08766e' }, { c: '#ff7fd4', d: '#a8237c' }, { c: '#b2f36f', d: '#3b7a10' }, { c: '#ffb74f', d: '#9e5600' }];
      const FEARC = { c: '#ff6178', d: '#b0122f' };
      const SLOT = { W: [0.155, 0.6], NW: [0.29, 0.21], N: [0.5, 0.2], NE: [0.71, 0.21], E: [0.845, 0.6] };
      const ROADS = {
        W: [[0.5, 0.9], [0.4, 0.894], [0.29, 0.866], [0.205, 0.79], [0.165, 0.69]],
        NW: [[0.5, 0.9], [0.4, 0.894], [0.335, 0.8], [0.348, 0.64], [0.3, 0.46], [0.29, 0.31]],
        N: [[0.5, 0.9], [0.5, 0.79], [0.455, 0.63], [0.53, 0.46], [0.5, 0.3]],
        NE: [[0.5, 0.9], [0.6, 0.894], [0.665, 0.8], [0.652, 0.64], [0.7, 0.46], [0.71, 0.31]],
        E: [[0.5, 0.9], [0.6, 0.894], [0.71, 0.866], [0.795, 0.79], [0.835, 0.69]]
      };
      const SETS = { 2: [['NW'], 'NE'], 3: [['W', 'E'], 'N'], 4: [['W', 'NW', 'E'], 'NE'] };
      const set = SETS[N] || SETS[4];
      let oi = 0;
      const districts = alts.map(a => {
        const slot = a.fear ? set[1] : set[0][oi++];
        const col = a.fear ? FEARC : NEON[(oi - 1) % NEON.length];
        return { a, fear: !!a.fear, name: clip(String(a.name || 'THE MAYBE').toUpperCase(), 28), theory: clip(a.theory, 140), needs: clip(a.needs, 100), line: clip(a.line, 90), plaus: a.plausibility, slot, cx: SLOT[slot][0], cy: SLOT[slot][1], col,
          explored: false, blocked: false, litTimes: null, buildings: [], windows: [], anchor: { x: 0, y: 0 }, ground: { x: 0, y: 0 }, sign: null };
      });
      const fearD = districts.find(d => d.fear);
      const RING = [[-0.095, -0.004, 0], [-0.062, 0.036, 0], [0.062, 0.036, 0], [0.095, -0.004, 0], [-0.072, -0.058, 1], [0.072, -0.058, 1], [-0.033, -0.086, 1], [0.033, -0.086, 1]];
      districts.forEach((d, i) => {
        const r = K.rng(31 + i * 17);
        RING.forEach(([dx, dy, back], k) => { const bw = 0.03 + r() * 0.014, bd = 0.022 + r() * 0.01; d.buildings.push({ x0: d.cx + dx - bw / 2, x1: d.cx + dx + bw / 2, y0: d.cy + dy - bd / 2, y1: d.cy + dy + bd / 2, hz: (back ? 30 : 20) + r() * 20 + (d.fear ? 8 : 0), d, k }); });
        d.buildings.push({ x0: d.cx - 0.022, x1: d.cx + 0.022, y0: d.cy - 0.05, y1: d.cy - 0.022, hz: 62 + r() * 12 + (d.fear ? 10 : 0), d, k: RING.length, tower: true });
      });
      function catmull(pts, per) {
        const out = [];
        for (let i = 0; i < pts.length - 1; i++) {
          const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
          for (let k = 0; k < per; k++) {
            const t = k / per, t2 = t * t, t3 = t2 * t;
            const f = (j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
            out.push([f(0), f(1)]);
          }
        }
        out.push(pts[pts.length - 1].slice());
        return out;
      }
      const roads = districts.map(d => { const r = { d, w: catmull(ROADS[d.slot], 12), sp: [], cum: [0], len: 1, prog: 0, inStroke: false, dist: 1e9, forkS: 0, lamps: [], gates: facts.map((f, i) => ({ f, i, fits: fitsFact(d.a, f), state: 'idle', open: 0, s: 0, x: 0, y: 0, ang: 0, bx: 0, by: 0, t0: 0 })) }; d.road = r; return r; });
      const hasSibling = (r) => roads.some(o => o !== r && ROADS[o.d.slot][1][0] === ROADS[r.d.slot][1][0] && ROADS[o.d.slot][1][1] === ROADS[r.d.slot][1][1]);

      /* ---------------- state ---------------- */
      const req = inten === 2 ? N : Math.min(3, N);
      const st = { phase: 'intro', drawing: false, active: null, explored: 0, accs: [], stroke: { n: 0, good: 0 }, hunch: null, hunchShown: false, pinDrag: null, pinHover: null, lastNag: 0, lastOff: 0, gatesOpened: 0, finished: false, con: 0, finT0: 0, plazaPing: 0, auto: null };
      const cam = { z: 1, px: 0, py: 0, sx: 0, sy: 0, kick: 0, target: 1 };
      const taxi = { x: 0, y: 0, ang: 0, sc: 1, road: null, s: 0, mode: 'park', squash: 0, t0: 0, lx: 0, ly: 0, speed: 0 };
      const storm = { k: 1, target: 1, flash: 0, nextBolt: now() + 2600, bolt: null };
      const ripples = [], rockets = [], flashes = [];
      const P = K.particles();
      const M = { w: 0, h: 0, cx: 0, top: 0, mw: 0, mh: 0, zk: 1, SF: 0.74, phone: true, roadW: 11, TOL: 40, plaza: { x: 0, y: 0, rx: 30, ry: 12 }, startR: 50 };
      function proj(wx, wy, z) { const s = M.SF + (1 - M.SF) * wy; return { x: M.cx + (wx - 0.5) * M.mw * s, y: M.top + M.mh * wy * (0.8 + 0.2 * wy) - (z || 0) * M.zk * s, s }; }
      const camPt = (x, y) => ({ x: (x - cam.px) * cam.z + cam.px + cam.sx, y: (y - cam.py) * cam.z + cam.py + cam.sy });

      /* ---------------- DOM: map, signs, board, START plaque, taxi cab, hunch pin ---------------- */
      const SOFT = softwareGfx(), cvOpts = { maxDpr: SOFT ? 1 : 2 }, cv = opaqueCanvas(el, cvOpts, S);
      const base = document.createElement('canvas');
      const qual = { acc: 0, n: 0, steps: 0 };
      let baseOK = false, fullNext = 2, wasFull = true;
      const hit = h('div', { class: 'mm-hit', role: 'application', 'aria-label': 'City map. Draw a route from the start plaza along a road to a district. Keys 1 to ' + N + ' drive a road.' });
      el.append(hit);
      districts.forEach(d => { d.sign = h('div', { class: 'mm-sign dim' + (d.fear ? ' fear' : ''), style: { '--c': d.col.c } }, h('b', { text: d.name }), h('span', { class: 'mm-pl', hidden: true })); el.append(d.sign); });
      const board = h('div', { class: 'mm-board off', role: 'status', 'aria-live': 'polite' });
      const countEl = h('span', { class: 'mm-count', text: '0/' + N + ' explored' });
      const plaque = h('div', { class: 'mm-start' }, h('div', { class: 'mm-start-top' }, h('span', { text: 'Start · what happened' }), countEl), h('span', { class: 'gk-user', text: situation }));
      const cab = h('div', { class: 'mm-cab', 'aria-hidden': 'true' }, h('i'), h('i'));
      const pin = h('div', { class: 'mm-pin', role: 'button', tabindex: '0', 'aria-label': 'Hunch pin. Drag it onto the district you think is most likely, or press 1 to ' + N + '.', hidden: true, html: PIN });
      el.append(plaque, board, cab, pin);
      const glitch = K.character('glitch', { side: 'right', mood: 'happy', size: K.phone() ? 76 : 96 });
      if (!K.phone()) { cab.style.setProperty('--cw', '122px'); cab.style.setProperty('--ch', '70px'); }
      const music = K.music('lofi'); music.level(0.72);
      let hum = null, rain = null, engine = null;
      function audioBeds() {
        if (!A.ctx || hum) return;
        hum = A.loop({ pink: true, filter: 'lowpass', freq: 240, q: 0.5, bus: 'amb' }); if (hum) hum.level(0.035, 1.5);
        rain = K.ambience('rain');
        engine = A.loop({ filter: 'lowpass', freq: 150, q: 1.6, bus: 'sfx' });
        S.onDestroy(() => { [hum, engine].forEach(x => { try { x && x.stop(); } catch (e) { /* gone */ } }); });
      }
      audioBeds(); S.on('audio-ready', audioBeds);

      /* ---------------- music clock (visuals and cues ride the lo-fi beat) ---------------- */
      const LOFI = [['F4', 'A4', 'C5', 'E5', 'F5', 'A5'], ['F4', 'A4', 'B4', 'D5', 'F5', 'A5'], ['E4', 'G4', 'B4', 'D5', 'E5', 'G5'], ['E4', 'G4', 'C5', 'E5', 'G5', 'C6']];
      const BEAT = () => 60 / (music.bpm || 78);
      function beatPhase() { if (A.ctx && music.next) { const k = (A.now() - music.next) / BEAT(); return k - Math.floor(k); } return ((now() / 1000) / BEAT()) % 1; }
      function nextGrid(div) { const bl = BEAT() / (div || 1); if (!A.ctx) return 0; const t = A.now(); if (!music.next) return t + 0.04; let q = music.next; while (q - bl > t + 0.03) q -= bl; while (q < t + 0.03) q += bl; return q; }
      const perfAt = (when) => (A.ctx ? now() + (when - A.now()) * 1000 : now());
      function chord() { const bl = BEAT(); const ahead = A.ctx && music.next ? Math.max(0, Math.ceil((music.next - A.now()) / bl)) : 0; const b = Math.max(0, (music.beat || 0) - ahead); return LOFI[Math.floor(b / 4) % 4]; }
      let lampN = 0;
      function lampNote(l) { if (!A.ctx) return; const ch = chord(); A.pluck(A.note(ch[lampN++ % ch.length]), { vol: 0.1, damp: 0.994, verb: 0.35, lp: 3400 }); P.emit('spark', l.x, l.y, 4, { colors: [pal().lamp, '#ffffff'], speed: [30, 90] }); }

      /* ---------------- sprites ---------------- */
      function sprite(w, hh, fn) { const c = document.createElement('canvas'); c.width = w; c.height = hh; fn(c.getContext('2d'), w, hh); return c; }
      const glowCache = {};
      function glow(col) {
        if (glowCache[col]) return glowCache[col];
        return (glowCache[col] = sprite(64, 64, (g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, hexA(col, 0.95)); gr.addColorStop(0.3, hexA(col, 0.38)); gr.addColorStop(1, hexA(col, 0)); g.fillStyle = gr; g.fillRect(0, 0, s, s); }));
      }
      const cloudSprite = (c0) => sprite(160, 100, (g, w, hh) => {
        [[0.5, 0.58, 0.3], [0.3, 0.64, 0.22], [0.7, 0.64, 0.23], [0.42, 0.44, 0.24], [0.6, 0.46, 0.2], [0.18, 0.72, 0.14], [0.83, 0.72, 0.14]].forEach(([x, y, r]) => {
          const gr = g.createRadialGradient(x * w, y * hh, 0, x * w, y * hh, r * w); gr.addColorStop(0, hexA(c0, 0.95)); gr.addColorStop(0.62, hexA(c0, 0.8)); gr.addColorStop(1, hexA(c0, 0)); g.fillStyle = gr; g.beginPath(); g.arc(x * w, y * hh, r * w, 0, TAU); g.fill();
        });
      });
      const clouds = { dark: cloudSprite('#463e6c'), bright: cloudSprite('#7c7898'), rimD: cloudSprite('#a99ee0'), rimB: cloudSprite('#eeeaf8'), base: cloudSprite('#241d3d'), baseB: cloudSprite('#5d5878') };
      const shade = (c0, a) => sprite(96, 96, (g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, hexA(c0, a)); gr.addColorStop(0.55, hexA(c0, a * 0.55)); gr.addColorStop(1, hexA(c0, 0)); g.fillStyle = gr; g.fillRect(0, 0, s, s); });
      const shadows = { dark: shade('#060212', 0.62), bright: shade('#463c6e', 0.32) };
      const massCache = {};
      function stormMass(br) {
        const key = (br ? 'b' : 'd') + (M.phone ? 'p' : 'w'); if (massCache[key]) return massCache[key];
        const sc = M.phone ? 1 : 1.5, spread = 184 * sc, pw = 120 * sc, W2 = Math.ceil(spread * 2 + pw * 1.2), H2 = Math.ceil(pw * 1.25);
        return (massCache[key] = sprite(W2, H2, (g) => {
          const cx = W2 / 2, cy = H2 * 0.55;
          [[br ? clouds.baseB : clouds.base, 0.95, 8], [br ? clouds.bright : clouds.dark, 0.97, 0], [br ? clouds.rimB : clouds.rimD, br ? 0.55 : 0.42, -7]].forEach(([img, al, dy]) => {
            for (let i = 0; i < 11; i++) { const f = (i + 0.5) / 11 - 0.5, x = cx + f * spread * 2, y = cy - Math.cos(f * Math.PI) * 26 * sc + dy * sc, w = (120 + (i % 3) * 14) * sc * (dy < 0 ? 0.8 : 1), hh = w * 0.62; g.globalAlpha = al; g.drawImage(img, x - w / 2, y - hh / 2, w, hh); }
          });
        }));
      }

      /* ---------------- geometry helpers ---------------- */
      function pointAt(r, s) {
        s = clamp(s, 0, r.len); const c = r.cum; let lo = 0, hi = c.length - 1;
        while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
        const a = r.sp[lo], b = r.sp[hi], k = (s - c[lo]) / Math.max(1e-6, c[hi] - c[lo]);
        return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, ang: Math.atan2(b.y - a.y, b.x - a.x), sc: a.s + (b.s - a.s) * k, i: lo };
      }
      function nearestOn(r, p, s0, s1) {
        let best = { d: 1e9, s: 0 }; const c = r.cum, sp = r.sp;
        for (let i = 0; i < sp.length - 1; i++) {
          if (c[i + 1] < s0 || c[i] > s1) continue;
          const a = sp[i], b = sp[i + 1], vx = b.x - a.x, vy = b.y - a.y, L2 = vx * vx + vy * vy || 1;
          const k = clamp(((p.x - a.x) * vx + (p.y - a.y) * vy) / L2, 0, 1);
          const x = a.x + vx * k, y = a.y + vy * k, dd = Math.hypot(p.x - x, p.y - y);
          if (dd < best.d) best = { d: dd, s: c[i] + (c[i + 1] - c[i]) * k };
        }
        return best;
      }
      function pathTo(g, r, upto) {
        g.beginPath(); g.moveTo(r.sp[0].x, r.sp[0].y);
        for (let i = 1; i < r.sp.length; i++) { if (r.cum[i] >= upto) { const q = pointAt(r, upto); g.lineTo(q.x, q.y); return; } g.lineTo(r.sp[i].x, r.sp[i].y); }
      }
      function boxPts(b) { const fl = proj(b.x0, b.y1), fr = proj(b.x1, b.y1), br = proj(b.x1, b.y0), bl = proj(b.x0, b.y0); return { fl, fr, br, bl, hf: b.hz * fl.s * M.zk, hb: b.hz * bl.s * M.zk }; }
      function quad(g, a, b, c, d) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); }
      function rrect(g, x, y, w, hh, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

      /* ---------------- layout (on resize) ---------------- */
      let filler = [], parks = [];
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        const oldLens = roads.map(r => r.len);
        M.w = W; M.h = H; M.phone = W < 700; M.ox = Math.round(W * 0.09); M.oy = Math.round(H * 0.07);
        M.top = M.phone ? 258 : 238;
        const bottom = M.phone ? H - 214 : H - 190;
        M.mh = Math.max(260, bottom - M.top);
        M.mw = M.phone ? W - 10 : Math.min(W - 150, 1120);
        M.cx = W / 2; M.zk = M.phone ? 1 : 1.3;
        M.roadW = M.phone ? 11 : 15;
        M.TOL = (M.phone ? 40 : 48) * [1.25, 1, 0.85][inten];
        cam.px = W / 2; cam.py = M.top + M.mh * 0.5;
        const pc = proj(0.5, 0.9); M.plaza = { x: pc.x, y: pc.y, rx: 0.085 * M.mw * pc.s, ry: 0.085 * M.mw * pc.s * 0.4 }; M.startR = Math.max(50, M.plaza.rx + 16);
        roads.forEach((r, ri) => {
          r.sp = r.w.map(p => proj(p[0], p[1]));
          r.cum = [0]; for (let i = 1; i < r.sp.length; i++) r.cum.push(r.cum[i - 1] + Math.hypot(r.sp[i].x - r.sp[i - 1].x, r.sp[i].y - r.sp[i - 1].y));
          r.len = r.cum[r.cum.length - 1];
          if (oldLens[ri] > 1) r.prog = r.prog / oldLens[ri] * r.len;
          r.forkS = hasSibling(r) ? r.cum[12] : 0;
          const k = r.gates.length;
          let lastS = -99;
          r.gates.forEach((gt, i) => {
            let s = r.forkS + (r.len - r.forkS) * lerp(0.32, 0.8, (i + 0.5) / k);
            for (let tries = 0; tries < 6; tries++) { const wi = pointAt(r, s).i, wp = r.w[wi]; if (Math.abs(wp[1] - riverY(wp[0])) < 0.05) s += r.len * 0.05; else break; }
            if (s - lastS < 30) s = lastS + 30; lastS = s;
            const q = pointAt(r, s); gt.s = s; gt.x = q.x; gt.y = q.y; gt.ang = q.ang; gt.sc = q.sc;
            const side = (r.d.cx < 0.5 ? 1 : -1), nx = -Math.sin(q.ang) * side, ny = Math.cos(q.ang) * side, off = M.roadW * q.sc * 0.5 + (M.phone ? 12 : 15);
            gt.bx = q.x + nx * off; gt.by = q.y + ny * off; gt.nx = nx; gt.ny = ny;
          });
          r.lamps = []; const step = M.phone ? 27 : 34; let side = 1;
          for (let s = 30; s < r.len - 16; s += step) {
            if (r.gates.some(gt => Math.abs(gt.s - s) < 18)) continue;
            const q = pointAt(r, s), off = M.roadW * q.sc * 0.5 + 4; side = -side;
            r.lamps.push({ s, x: q.x - Math.sin(q.ang) * off * side, y: q.y + Math.cos(q.ang) * off * side, sc: q.sc, v: r.d.explored ? 1 : 0, hit: 0 });
          }
          void ri;
        });
        districts.forEach(d => {
          const tw = d.buildings[d.buildings.length - 1], bp = boxPts(tw);
          d.anchor = { x: (bp.fl.x + bp.fr.x) / 2, y: bp.fl.y - bp.hf - 6 };
          d.ground = proj(d.cx, d.cy);
        });
        // the band of the map that changes between frames (storm and balloon down to just past the plaza); the rest is still city
        const ssc = M.phone ? 1 : 1.5, top0 = Math.min((fearD ? fearD.anchor.y : M.top) - 150 * ssc - 8, (M.phone ? 168 : 150) - 26);
        M.band = { y0: Math.max(56, Math.floor(top0)), y1: Math.min(H, Math.ceil(M.phone ? M.plaza.y + M.plaza.ry + 56 : H - 110)) };
        // filler city and parks (screen-space rejection keeps roads clear)
        const fr = K.rng(911); filler = [];
        const nearRoad = (c, pad) => roads.some(r => nearestOn(r, c, 0, r.len).d < M.roadW * c.s * 0.5 + pad);
        for (let gy = 0; gy < 16; gy++) for (let gx = -4; gx < 21; gx++) {
          const x = -0.05 + gx * 0.068 + (fr() - 0.5) * 0.03, y = 0.03 + gy * 0.074 + (fr() - 0.5) * 0.026;
          const bw = 0.022 + fr() * 0.02, bd = 0.016 + fr() * 0.016, hz = 6 + fr() * 20 * (1.1 - Math.min(1, y) * 0.4), skip = fr() < 0.22;
          if (skip || y > 1.22) continue;
          const c = proj(x, y); if (c.x < -M.ox - 30 || c.x > W + M.ox + 30) continue;
          if (Math.abs(y - riverY(x)) < 0.052) continue;
          if (districts.some(d => Math.hypot(x - d.cx, (y - d.cy) * 1.15) < 0.14)) continue;
          if (Math.hypot(x - 0.5, (y - 0.9) * 1.3) < 0.15) continue;
          if (Math.hypot(x - LMP[0], y - LMP[1]) < 0.085) continue;
          if (nearRoad(c, bw * M.mw * c.s * 0.6 + 7)) continue;
          filler.push({ x0: x - bw / 2, x1: x + bw / 2, y0: y - bd / 2, y1: y + bd / 2, hz, seed: fr() * 1000 });
        }
        parks = [[0.08, 0.93], [0.9, 0.38], [0.08, 0.34], [0.5, 0.62], [0.62, 0.74], [0.38, 0.73], [0.94, 0.72], [0.22, 1.02], [0.78, 1.03]].filter(([x, y]) => {
          const c = proj(x, y);
          return !nearRoad(c, 0.06 * M.mw * c.s + 6) && !districts.some(d => Math.hypot(x - d.cx, y - d.cy) < 0.16) && Math.hypot(x - 0.5, y - 0.9) > 0.16 && Math.abs(y - riverY(x)) > 0.08 && Math.hypot(x - LMP[0], y - LMP[1]) > 0.1;
        }).slice(0, 4);
        renderBase();
        placeLabels(true);
      }

      /* ---------------- the static city, pre-rendered once per size/theme ---------------- */
      function drawBox(g, b, cols) {
        const { fl, fr, br, bl, hf, hb } = boxPts(b);
        const left = (b.x0 + b.x1) / 2 < 0.5;
        g.fillStyle = cols.side;
        if (left) quad(g, [fr.x, fr.y], [br.x, br.y], [br.x, br.y - hb], [fr.x, fr.y - hf]); else quad(g, [fl.x, fl.y], [bl.x, bl.y], [bl.x, bl.y - hb], [fl.x, fl.y - hf]);
        g.fill();
        g.fillStyle = cols.front; quad(g, [fl.x, fl.y], [fr.x, fr.y], [fr.x, fr.y - hf], [fl.x, fl.y - hf]); g.fill();
        g.fillStyle = cols.roof; quad(g, [fl.x, fl.y - hf], [fr.x, fr.y - hf], [br.x, br.y - hb], [bl.x, bl.y - hb]); g.fill();
        g.strokeStyle = cols.rim; g.lineWidth = 0.8; g.stroke();
        return { fl, fr, hf };
      }
      function renderBase() {
        const W = M.w, H = M.h, dpr = cv.dpr || 1, PL = pal(), br = bright(), ox = M.ox, oy = M.oy;
        base.width = Math.max(2, Math.round((W + 2 * ox) * dpr)); base.height = Math.max(2, Math.round((H + 2 * oy) * dpr));
        const g = base.getContext('2d', { alpha: false }); g.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);
        // sky, haze, stars, moon (rendered with overscan so the finale can zoom out onto more city)
        let gr = g.createLinearGradient(0, -oy, 0, M.top + 30); gr.addColorStop(0, PL.sky0); gr.addColorStop(1, PL.sky1); g.fillStyle = gr; g.fillRect(-ox, -oy, W + 2 * ox, M.top + 30 + oy);
        gr = g.createRadialGradient(W / 2, M.top + 14, 10, W / 2, M.top + 14, W * 0.8); gr.addColorStop(0, hexA(PL.haze, br ? 0.65 : 0.6)); gr.addColorStop(1, hexA(PL.haze, 0)); g.fillStyle = gr; g.fillRect(-ox, -oy, W + 2 * ox, M.top + 30 + oy);
        if (!br) { const r = K.rng(9); g.fillStyle = PL.star; for (let i = 0; i < (weather === 'clear' ? 190 : 120); i++) { const x = -ox + r() * (W + 2 * ox), y = -oy + r() * (M.top - 12 + oy), s = r() < 0.12 ? 1.9 : 1.1; g.globalAlpha = 0.2 + r() * 0.7; g.fillRect(x, y, s, s); } g.globalAlpha = 1; }
        const mx = W * (M.phone ? 0.17 : 0.13), my = M.phone ? 128 : 124, mr = M.phone ? 17 : 22;
        gr = g.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 4.2); gr.addColorStop(0, hexA(br ? '#fff1d6' : PL.moon, br ? 0.7 : 0.35)); gr.addColorStop(1, hexA(PL.moon, 0)); g.fillStyle = gr; g.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
        g.fillStyle = br ? '#fff4e0' : PL.moon; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
        if (!br) { g.fillStyle = hexA(PL.sky1, 0.85); g.beginPath(); g.arc(mx + mr * 0.42, my - mr * 0.18, mr * 0.86, 0, TAU); g.fill(); }
        // ground and city blocks
        gr = g.createLinearGradient(0, M.top, 0, H + oy); gr.addColorStop(0, PL.ground); gr.addColorStop(1, PL.ground2); g.fillStyle = gr; g.fillRect(-ox, M.top, W + 2 * ox, H - M.top + oy);
        const r2 = K.rng(21);
        for (let j = 0; j < 24; j++) for (let i = -8; i < 22; i++) {
          const x0 = i * 0.075, y0 = j * 0.075, ins = 0.0095;
          const a = proj(x0 + ins, y0 + ins), b = proj(x0 + 0.075 - ins, y0 + ins), c = proj(x0 + 0.075 - ins, y0 + 0.075 - ins), d = proj(x0 + ins, y0 + 0.075 - ins);
          const pick = r2(), alpha = 0.5 + r2() * 0.5;
          if (d.y < M.top - 2 || a.y > H + oy + 4 || b.x < -ox - 10 || a.x > W + ox + 10) continue;
          g.globalAlpha = alpha; g.fillStyle = pick < 0.5 ? PL.block : PL.block2; quad(g, [a.x, a.y], [b.x, b.y], [c.x, c.y], [d.x, d.y]); g.fill();
        }
        g.globalAlpha = 1;
        // river with banks
        const riv = (off) => { const pts = []; for (let i = 0; i <= 120; i++) { const x = -0.7 + i * 0.02; pts.push(proj(x, riverY(x) + off)); } return pts; };
        const top = riv(-0.026), bot = riv(0.026);
        g.beginPath(); top.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); bot.slice().reverse().forEach(p => g.lineTo(p.x, p.y)); g.closePath();
        gr = g.createLinearGradient(0, proj(0.5, 0.45).y, 0, proj(0.5, 0.56).y); gr.addColorStop(0, PL.river0); gr.addColorStop(1, PL.river1); g.fillStyle = gr; g.fill();
        g.strokeStyle = hexA(PL.rim, br ? 0.8 : 0.45); g.lineWidth = 1.2;
        [top, bot].forEach(line => { g.beginPath(); line.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke(); });
        // parks with trees
        parks.forEach(([px, py], pi) => {
          g.beginPath(); for (let i = 0; i <= 28; i++) { const a = i / 28 * TAU, q = proj(px + Math.cos(a) * 0.06, py + Math.sin(a) * 0.042); i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); } g.closePath();
          g.fillStyle = PL.park; g.fill(); g.strokeStyle = hexA(PL.tree, 0.8); g.lineWidth = 1; g.stroke();
          const tr = K.rng(400 + pi);
          for (let i = 0; i < 9; i++) { const a = tr() * TAU, rr = Math.sqrt(tr()) * 0.85, q = proj(px + Math.cos(a) * 0.05 * rr, py + Math.sin(a) * 0.034 * rr), s = (M.phone ? 3.2 : 4.4) * q.s; g.fillStyle = PL.tree; g.beginPath(); g.arc(q.x, q.y - s * 0.6, s, 0, TAU); g.fill(); g.fillStyle = hexA('#ffffff', br ? 0.25 : 0.08); g.beginPath(); g.arc(q.x - s * 0.3, q.y - s, s * 0.45, 0, TAU); g.fill(); }
        });
        // roads: edges, asphalt, bridges, centre dashes
        g.lineCap = 'round';
        [[PL.edge, 3.5], [PL.road, 0]].forEach(([col, extra]) => { g.strokeStyle = col; roads.forEach(r => { for (let i = 0; i < r.sp.length - 1; i++) { const a = r.sp[i], b = r.sp[i + 1]; g.lineWidth = M.roadW * a.s + extra; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); } }); });
        roads.forEach(r => { g.strokeStyle = hexA(PL.rim, 0.9); g.lineWidth = 1.4; [-1, 1].forEach(sd => { let on = false; g.beginPath(); r.w.forEach((wp, i) => { const inRiver = Math.abs(wp[1] - riverY(wp[0])) < 0.034; const p = r.sp[i], b = r.sp[Math.min(i + 1, r.sp.length - 1)], ang = Math.atan2(b.y - p.y, b.x - p.x), off = (M.roadW * p.s * 0.5 + 2.5) * sd; const x = p.x - Math.sin(ang) * off, y = p.y + Math.cos(ang) * off; if (inRiver) { on ? g.lineTo(x, y) : g.moveTo(x, y); on = true; } else on = false; }); g.stroke(); }); });
        g.setLineDash([5, 7]); g.strokeStyle = hexA(PL.dash, br ? 0.7 : 0.42); g.lineWidth = 1.2;
        roads.forEach(r => { g.beginPath(); r.sp.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke(); });
        g.setLineDash([]);
        // plaza
        const pz = M.plaza;
        g.fillStyle = PL.edge; g.beginPath(); g.ellipse(pz.x, pz.y, pz.rx + 3, pz.ry + 2, 0, 0, TAU); g.fill();
        g.fillStyle = PL.road; g.beginPath(); g.ellipse(pz.x, pz.y, pz.rx, pz.ry, 0, 0, TAU); g.fill();
        g.strokeStyle = hexA(PL.dash, br ? 0.55 : 0.3); g.lineWidth = 1; [0.78, 0.56].forEach(k => { g.beginPath(); g.ellipse(pz.x, pz.y, pz.rx * k, pz.ry * k, 0, 0, TAU); g.stroke(); });
        g.fillStyle = PL.river1; g.beginPath(); g.ellipse(pz.x, pz.y, pz.rx * 0.32, pz.ry * 0.32, 0, 0, TAU); g.fill();
        // buildings (painter's order, far first)
        const fearTint = (c, k) => mix(c, br ? '#8a6f9e' : '#3a1840', k);
        const all = filler.map(b => ({ b, y: b.y1 })).concat([].concat(...districts.map(d => d.buildings)).map(b => ({ b, y: b.y1 })));
        all.sort((a, b) => a.y - b.y);
        districts.forEach(d => { d.windows = []; });
        all.forEach(({ b }) => {
          const d = b.d, fear = d && d.fear;
          const cols = d ? { front: fear ? fearTint(PL.front, 0.5) : PL.front, side: fear ? fearTint(PL.side, 0.5) : PL.side, roof: fear ? fearTint(PL.roof, 0.45) : PL.roof, rim: fear ? fearTint(PL.rim, 0.4) : PL.rim }
            : { front: mix(PL.front, PL.ground, 0.25), side: mix(PL.side, PL.ground, 0.25), roof: mix(PL.roof, PL.ground, 0.3), rim: mix(PL.rim, PL.ground, 0.45) };
          const { fl, fr, hf } = drawBox(g, b, cols);
          const fw = fr.x - fl.x;
          const colsN = clamp(Math.floor(fw / 5), 2, 7), rowsN = clamp(Math.floor(hf / 7), 1, 12);
          const cw = fw / colsN, ch = hf / rowsN;
          for (let i = 0; i < colsN; i++) for (let j = 0; j < rowsN; j++) {
            const x = fl.x + i * cw + cw * 0.27, y = fl.y - hf + j * ch + ch * 0.3, w = cw * 0.46, hh = Math.max(1.4, ch * 0.42);
            if (d) {
              g.fillStyle = hexA(br ? '#5b6894' : '#070a1c', br ? 0.45 : 0.55); g.fillRect(x, y, w, hh);
              d.windows.push({ x, y, w, h: hh, k: b.k, on: hash(i, j, b.k + d.cx * 10) > 0.24, warm: hash(j, i, b.k) > 0.4, ph: hash(i + 3, j, b.k) });
            } else if (hash(i, j, b.seed) > (br ? 0.86 : 0.8)) { g.fillStyle = hexA(PL.win, br ? 0.5 : 0.32); g.fillRect(x, y, w, hh); }
          }
          if (b.tower && d) { g.fillStyle = hexA(d.col.c, 0.9); g.fillRect(fl.x + fw * 0.5 - 0.6, fl.y - hf - 7 * M.zk, 1.2, 7 * M.zk); }
        });
        // lamp posts and toll booths are static: bake them into the base
        roads.forEach(r => r.lamps.forEach(l => { const s = l.sc * (M.phone ? 1 : 1.25); g.fillStyle = br ? '#59648c' : '#0a0d1e'; g.fillRect(l.x - 0.7 * s, l.y - 7 * s, 1.4 * s, 7 * s); g.fillStyle = br ? '#8a94b8' : '#3a4270'; g.beginPath(); g.arc(l.x, l.y - 7 * s, 1.8 * s, 0, TAU); g.fill(); }));
        roads.forEach(r => r.gates.forEach(gt => {
          const s = gt.sc * (M.phone ? 1.35 : 1.6);
          g.fillStyle = br ? '#7d89b4' : '#232c55'; rrect(g, gt.bx - 5 * s, gt.by - 10 * s, 10 * s, 10 * s, 2 * s); g.fill();
          g.fillStyle = br ? '#e9edf9' : '#39457e'; rrect(g, gt.bx - 6 * s, gt.by - 12 * s, 12 * s, 3 * s, 1.5 * s); g.fill();
          g.fillStyle = br ? '#2b3150' : '#d8def7'; rrect(g, gt.bx - 3.4 * s, gt.by - 17 * s, 6.8 * s, 4.4 * s, 1.2 * s); g.fill();
          g.fillStyle = br ? '#d8def7' : '#232c55'; g.beginPath(); g.arc(gt.bx, gt.by - 14.8 * s, 1.4 * s, 0, TAU); g.fill();
        }));
        // each district's lit windows, cached as one sprite for after the cascade
        districts.forEach(d => {
          const on = d.windows.filter(w => w.on); if (!on.length) { d.winSprite = null; return; }
          const x0 = Math.min(...on.map(w => w.x)) - 1, y0 = Math.min(...on.map(w => w.y)) - 1, x1 = Math.max(...on.map(w => w.x + w.w)) + 1, y1 = Math.max(...on.map(w => w.y + w.h)) + 1;
          d.winBox = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
          d.winSprite = sprite(Math.ceil(d.winBox.w * dpr), Math.ceil(d.winBox.h * dpr), (wg) => { wg.scale(dpr, dpr); on.forEach(w => { wg.globalAlpha = 0.82 + 0.18 * w.ph; wg.fillStyle = w.warm ? PL.win : d.col.c; wg.fillRect(w.x - x0, w.y - y0, w.w, w.h); }); });
        });
        // horizon fade where the city meets the sky
        gr = g.createLinearGradient(0, M.top - 6, 0, M.top + 46); gr.addColorStop(0, hexA(PL.sky1, 1)); gr.addColorStop(1, hexA(PL.sky1, 0)); g.fillStyle = gr; g.fillRect(-ox, M.top - 6, W + 2 * ox, 52);
        baseOK = true; fullNext = 2;
        roads.forEach(r => { if (r.baked) bakeTrail(r); });
      }
      /* a finished route never changes again, so it is painted into the city itself (the fear road stays live, above the storm's shadow) */
      function strokeTrail(g, r, upto, col, br) {
        g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
        pathTo(g, r, upto);
        if (!br) g.globalCompositeOperation = 'lighter';
        g.strokeStyle = hexA(col, br ? 0.25 : 0.2); g.lineWidth = M.roadW * 2; g.stroke();
        g.strokeStyle = hexA(col, br ? 0.85 : 0.6); g.lineWidth = M.roadW * 0.75; g.stroke();
        g.strokeStyle = br ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.85)'; g.lineWidth = 1.5; g.stroke();
        g.restore();
      }
      function bakeTrail(r) {
        if (!baseOK || r.d.fear) return;
        const dpr = cv.dpr || 1, br = bright(), g = base.getContext('2d', { alpha: false });
        g.setTransform(dpr, 0, 0, dpr, M.ox * dpr, M.oy * dpr);
        strokeTrail(g, r, r.d.blocked ? r.prog : r.len, br ? r.d.col.d : r.d.col.c, br);
        r.baked = true;
      }

      /* ---------------- labels ---------------- */
      function plPill(d) {
        const pl = plaus(d);
        return h('span', { class: 'mm-pl', style: { '--pc': pl.c } }, h('span', { class: 'mm-bars', 'aria-hidden': 'true' }, [0, 1, 2].map(i => h('i', { class: i < pl.bars ? 'on' : '' }))), pl.label);
      }
      function plaus(d) {
        if (d.blocked) return { label: 'RULED OUT', bars: 0, c: '#b9c0d6' };
        if (d.fear && support === 'strong') return { label: 'FACTS LEAN HERE', bars: 3, c: '#ff8a8a' };
        if (d.fear && support === 'some') return { label: 'SOME BASIS', bars: 2, c: '#ffab6b' };
        const p = String(d.plaus || 'possible');
        if (p === 'common') return { label: 'COMMON', bars: 3, c: '#6be5a2' };
        if (p === 'long shot') return { label: 'LONG SHOT', bars: 1, c: '#b5bdd6' };
        return { label: 'POSSIBLE', bars: 2, c: '#ffd36b' };
      }
      // only touch the DOM when a label actually moved (the finale camera re-places them every frame)
      function setPos(e, x, y) { const k = (x == null ? '' : x.toFixed(1)) + ',' + y.toFixed(1); if (e._mmPos === k) return; e._mmPos = k; if (x != null) e.style.left = x.toFixed(1) + 'px'; e.style.top = y.toFixed(1) + 'px'; }
      function placeLabels(force) {
        if (!M.w) return;
        const boxes = districts.map(d => {
          if (force || !d.signW) { d.signW = d.sign.offsetWidth || 110; d.signH = d.sign.offsetHeight || 40; }
          const a = camPt(d.anchor.x, d.anchor.y), half = d.signW / 2;
          return { d, x: clamp(a.x, half + 6, M.w - half - 6), y: Math.max(M.phone ? 120 : 110, a.y), half };
        });
        // keep neighbouring signs apart (long district names on narrow screens)
        for (let pass = 0; pass < 3; pass++) for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
          const A1 = boxes[i], B1 = boxes[j]; if (Math.abs(A1.y - B1.y) > Math.max(A1.d.signH, B1.d.signH)) continue;
          const over = A1.half + B1.half + 6 - Math.abs(A1.x - B1.x); if (over <= 0) continue;
          const dir = A1.x <= B1.x ? -1 : 1; A1.x = clamp(A1.x + dir * over / 2, A1.half + 6, M.w - A1.half - 6); B1.x = clamp(B1.x - dir * over / 2, B1.half + 6, M.w - B1.half - 6);
        }
        boxes.forEach(b => setPos(b.d.sign, b.x, b.y));
        const pz = camPt(M.plaza.x, M.plaza.y + M.plaza.ry + 14);
        setPos(plaque, null, Math.min(pz.y, M.h - (M.phone ? 230 : 160)));
        if (st.hunch) { const q = camPt(st.hunch.ground.x, st.hunch.ground.y + 4); setPos(pin, q.x, q.y); }
        else if (!pin.hidden || force) { const nRoad = districts.some(d => d.slot === 'N'), q = camPt(M.plaza.x + (nRoad ? M.plaza.rx + 30 : 0), M.plaza.y + (nRoad ? 22 : -44)); setPos(pin, q.x, q.y); }
      }
      function setBoard(col, kids, ms) {
        S.cancel(st.boardT);
        board.style.setProperty('--c', col.c);
        board.style.setProperty('--ct', bright() ? col.d : col.c);
        board.replaceChildren(...kids.filter(Boolean));
        board.classList.remove('off');
        if (ms) st.boardT = K.later(hideBoard, ms);
      }
      function hideBoard() { S.cancel(st.boardT); board.classList.add('off'); }
      function showFact(d, gt) {
        setBoard(d.col, [
          h('div', { class: 'mm-btop' }, h('span', { class: 'mm-tag', html: CAM + '<span>Fact gate' + (facts.length > 1 ? ' ' + (gt.i + 1) + ' of ' + facts.length : '') + '</span>' }), h('span', { class: 'mm-verdict' + (gt.fits ? '' : ' no'), text: gt.fits ? 'FITS ✓' : 'DOESN’T FIT' })),
          h('p', { class: 'gk-user mm-fact', text: gt.f.text })
        ], gt.fits ? 2600 : 0);
      }
      function showDistrict(d) {
        const showQuote = d.line && !d.fear && (!M.phone || d.line.length < 46);
        setBoard(d.col, [
          h('div', { class: 'mm-btop' }, h('span', { class: 'mm-name', text: d.name }), plPill(d)),
          h('p', { class: 'mm-theory', text: d.theory }),
          h('p', { class: 'mm-needs' }, h('b', { text: 'Would need: ' }), d.needs || 'More facts than we have.'),
          d.fear && serious ? h('p', { class: 'mm-plan' }, h('b', { text: 'Plan: ' }), lead('prepare')) : null,
          d.fear && !serious ? h('p', { class: 'mm-quote', text: 'It fits the facts. So do the others.' }) : null,
          showQuote ? h('p', { class: 'mm-quote', text: '“' + d.line + '”' }) : null
        ], 9000);
      }
      function updateCount() { countEl.textContent = st.explored + '/' + N + ' explored'; countEl.classList.remove('bump'); void countEl.offsetWidth; countEl.classList.add('bump'); }
      function litSign(d) {
        d.sign.classList.remove('dim'); d.sign.classList.add(d.blocked ? 'out' : 'lit');
        const pl = d.sign.querySelector('.mm-pl'); pl.replaceWith(plPill(d));
        K.later(() => placeLabels(true), 30);
      }

      /* ---------------- sound cues ---------------- */
      function honk() { if (!A.ctx) return; const t = A.now(); [0, 0.15].forEach(o => { A.tone({ when: t + o, type: 'square', freq: 392, dur: 0.1, vol: 0.045, lp: 1500 }); A.tone({ when: t + o, type: 'square', freq: 494, dur: 0.1, vol: 0.035, lp: 1500 }); }); }
      function scanBeep() { if (!A.ctx) return; const t = A.now(); A.tone({ when: t, type: 'square', freq: 1480, dur: 0.045, vol: 0.03, lp: 4200 }); A.tone({ when: t + 0.07, type: 'square', freq: 1975, dur: 0.05, vol: 0.03, lp: 4200 }); }
      function thunder(v) { if (A.ctx) A.noise({ pink: true, filter: 'lowpass', freq: 190, to: 80, dur: 2.4, attack: 0.05, vol: v || 0.2 }); }
      function ripple(x, y, c) { ripples.push({ x, y, t: 0, c: c || '#ffffff' }); }
      function popAt(text, x, y, kind) { const half = text.length * 7.6 + 12; K.pop(text, { x: clamp(x, half, M.w - half), y: clamp(y, 100, M.h - 80), kind }); }

      /* ---------------- input: draw a route from the plaza ---------------- */
      const roadsLeft = () => roads.some(r => !r.d.explored);
      const met = () => st.explored >= req && (!fearD || fearD.explored);
      const pausedRoad = () => { let b = null; roads.forEach(r => { if (!r.d.explored && r.prog > 20 && (!b || r.prog > b.prog)) b = r; }); return b; };
      function suggestRoad() {
        const open = roads.filter(r => !r.d.explored); if (!open.length) return null;
        const nonFear = open.filter(r => !r.d.fear), fearR = open.find(r => r.d.fear);
        const doneNon = districts.filter(d => d.explored && !d.fear).length;
        if (fearR && (doneNon >= Math.min(2, N - 1) || !nonFear.length)) return fearR;
        return nonFear[0] || fearR;
      }
      const dirOf = (r) => (r.d.slot === 'W' || r.d.slot === 'NW' ? 'l' : 'r');
      function routeGuide(quick) {
        const r = suggestRoad(); st.suggest = r; if (!r) return;
        const dir = dirOf(r);
        const label = (r.d.fear && st.explored > 0) ? (serious ? 'CHECK THE STORM' : 'DRIVE INTO THE STORM') : st.explored ? 'DRAW ANOTHER ROUTE' : 'DRAW A ROUTE';
        K.guide({ id: 'route-' + r.d.slot, g: 'drag', target: () => { const p = camPt(M.plaza.x, M.plaza.y); return { x: p.x + (dir === 'l' ? -8 : 8), y: p.y }; }, dir, d: M.phone ? 62 : 96, label, delay: quick ? 120 : 900 });
      }
      function hunchGuide() { K.guide({ id: 'hunch', g: 'drag', target: pin, oy: 0.4, dir: 'r', d: M.phone ? 70 : 110, label: 'DRAG YOUR HUNCH PIN', delay: 900 }); }

      K.press(hit, { down: onDown, move: onMove, up: onUp });
      function onDown(p) {
        ripple(p.x, p.y);
        if (st.phase !== 'route' && st.phase !== 'hunch') { K.sfx.tap(); return; }
        if (!roadsLeft()) { K.sfx.soft(); pin.classList.remove('planted'); void pin.offsetWidth; hunchGuide(); return; }
        if (K.dist(p, camPt(M.plaza.x, M.plaza.y)) <= M.startR) { beginStroke(null); return; }
        const tip = pausedRoad();
        if (tip && K.dist(p, pointAt(tip, tip.prog)) <= 62) { beginStroke(tip); return; }
        K.sfx.soft(); st.plazaPing = 1;
        if (now() - st.lastNag > 6000) { st.lastNag = now(); glitch.say(L(LINES.plaza), { mood: 'think', ms: 2600 }); }
        routeGuide(true);
      }
      function beginStroke(resume) {
        hideBoard(); K.guide(null);
        if (!resume) { roads.forEach(r => { if (!r.d.explored) { r.prog = 0; r.inStroke = true; } }); taxi.road = null; taxi.mode = 'plaza'; }
        else roads.forEach(r => { r.inStroke = r === resume; });
        st.drawing = true; st.active = resume || null; st.stroke = { n: 0, good: 0 };
        K.sfx.pop(undefined, 640); taxi.squash = 1; st.plazaPing = 1;
        audioBeds();
      }
      function onMove(p) {
        if (!st.drawing) return;
        let best = null;
        for (const r of roads) {
          if (!r.inStroke || r.d.explored) continue;
          const q = nearestOn(r, p, r.prog - 50, r.prog + 170); r.dist = q.d;
          if (q.d <= M.TOL) { if (q.s > r.prog) advance(r, q.s); if (!st.drawing) return; if (!best || r.prog > best.prog) best = r; }
        }
        st.stroke.n++;
        if (best) { st.active = best; st.off = 0; if (best.dist <= M.TOL * 0.5) st.stroke.good++; }
        else {
          st.off = 1;
          if (now() - st.lastOff > 900) { st.lastOff = now(); if (A.ctx) A.noise({ pink: true, filter: 'lowpass', freq: 140, dur: 0.25, vol: 0.12 }); P.emit('dust', p.x, p.y, 5); }
          if (now() - st.lastNag > 7000) { st.lastNag = now(); glitch.say(L(LINES.off), { mood: 'surprised', ms: 2400 }); }
        }
      }
      function onUp() {
        if (!st.drawing) return;
        st.drawing = false; roads.forEach(r => { r.inStroke = false; });
        const tip = pausedRoad();
        if (tip) K.guide({ id: 'resume', g: 'drag', target: () => camPt(pointAt(tip, tip.prog).x, pointAt(tip, tip.prog).y), dir: Math.cos(pointAt(tip, tip.prog).ang) >= 0 ? 'r' : 'l', d: 56, label: 'KEEP DRAWING', delay: 700 });
        else routeGuide();
      }
      function advance(r, s) {
        for (const gt of r.gates) {
          if (gt.state === 'closed') s = Math.min(s, gt.s - 12);
          else if (gt.state === 'idle' && s >= gt.s - 4) { checkGate(r, gt); if (gt.state === 'closed') { s = Math.min(s, gt.s - 12); break; } }
        }
        const old = r.prog; if (s <= old) return;
        r.prog = Math.min(s, r.len);
        const lead1 = !roads.some(o => o !== r && o.inStroke && !o.d.explored && o.prog > r.prog);
        r.lamps.forEach(l => { if (l.s > old && l.s <= r.prog) { l.hit = now(); if (lead1) lampNote(l); } });
        if (r.prog >= r.len - 4 && st.drawing) { st.drawing = false; roads.forEach(o => { o.inStroke = false; }); arrive(r); }
      }
      function checkGate(r, gt) {
        gt.state = gt.fits ? 'open' : 'closed'; gt.t0 = now();
        scanBeep(); showFact(r.d, gt);
        ctx.track('gate', { fits: gt.fits ? 1 : 0 });
        if (gt.fits) {
          K.sfx.lock(); K.sfx.good(undefined, 5 + gt.i);
          P.emit('spark', gt.x, gt.y - 6, 16, { colors: ['#9dffb8', '#ffffff', r.d.col.c] });
          popAt('FITS', gt.x, gt.y - 30, 'good');
          st.gatesOpened++;
          if (st.gatesOpened === 1) glitch.say(L(LINES.gate1), { mood: 'surprised', ms: 3200 }); else glitch.face('wow', 700);
        } else {
          K.sfx.no(); if (A.ctx) A.tone({ type: 'sawtooth', freq: 110, dur: 0.3, vol: 0.04, lp: 700 });
          popAt('NO FIT', gt.x, gt.y - 30, 'soft');
          glitch.say(L(LINES.closed), { mood: 'think', ms: 3400 });
          st.drawing = false; roads.forEach(o => { o.inStroke = false; });
          st.phase = 'arrive';
          K.later(() => ruledOut(r), 700);
        }
      }

      /* ---------------- arriving at a district ---------------- */
      async function arrive(r) {
        const d = r.d; r.prog = r.len;
        st.phase = 'arrive'; d.explored = true; st.explored++; K.guide(null);
        const acc = st.stroke.n > 4 ? st.stroke.good / st.stroke.n : 1; st.accs.push(acc);
        bakeTrail(r);
        taxi.road = r; taxi.mode = 'follow'; taxi.squash = 1;
        honk(); K.sfx.great(); cam.kick = 1;
        const t0 = nextGrid(2), step = BEAT() / 4, ch = chord();
        d.litTimes = d.buildings.map((b, k) => (A.ctx ? perfAt(t0 + k * step) : now() + k * 120));
        if (A.ctx) d.buildings.forEach((b, k) => A.pluck(A.note(ch[k % ch.length]) * (k >= ch.length ? 2 : 1), { when: t0 + k * step, vol: 0.11, damp: 0.995, verb: 0.4, lp: 3600 }));
        P.emit('star', d.anchor.x, d.anchor.y + 10, 18, { colors: [d.col.c, '#ffffff'] });
        ripple(d.ground.x, d.ground.y, d.col.c);
        litSign(d); updateCount(); if (d.fear) hideBoard(); else showDistrict(d);
        popAt(acc >= 0.9 ? 'CLEAN ROUTE' : acc >= 0.7 ? 'NICE DRIVING' : 'ARRIVED', M.w / 2, M.top + M.mh * (M.phone ? 0.47 : 0.44), acc >= 0.9 ? 'great' : 'good');
        ctx.track('route', { n: st.explored, acc: Math.round(acc * 100), fear: d.fear ? 1 : 0 });
        if (d.fear) await fearTwist(d);
        else {
          const k = districts.filter(x => x.explored && !x.fear && !x.blocked).length;
          glitch.say(L(k <= 1 ? LINES.arrive1 : LINES.arrive2), { mood: k <= 1 ? 'wow' : 'surprised', ms: 3400 }); glitch.react('bounce');
          storm.target = Math.max(serious ? 0.62 : 0.45, storm.target - 0.14);
        }
        await K.wait(K.reduced() ? 600 : 1500);
        taxi.road = r; taxi.mode = 'return'; taxi.t0 = now();
        afterVisit();
      }
      async function ruledOut(r) {
        const d = r.d; d.explored = true; d.blocked = true; st.explored++; K.guide(null); bakeTrail(r);
        litSign(d); updateCount();
        setBoard(d.col, [
          h('div', { class: 'mm-btop' }, h('span', { class: 'mm-name', text: d.name }), plPill(d)),
          h('p', { class: 'mm-theory', text: d.theory }),
          h('p', { class: 'mm-needs' }, h('b', { text: 'Ruled out: ' }), 'it doesn’t fit a fact on record.')
        ], 7000);
        if (d.fear) storm.target = 0.18;
        await K.wait(1300);
        taxi.road = r; taxi.mode = 'return'; taxi.t0 = now();
        afterVisit();
      }
      async function fearTwist(d) {
        thunder(serious ? 0.16 : 0.22); if (!K.reduced() && inten > 0) storm.flash = 1;
        glitch.face(serious ? 'think' : 'surprised');
        await K.wait(K.reduced() ? 300 : 700);
        st.fastStorm = true; K.later(() => { st.fastStorm = false; showDistrict(d); }, K.reduced() ? 300 : 1500);
        if (!serious) {
          storm.target = 0.28; K.sfx.rise();
          if (A.ctx) A.pad(['D4', 'F4', 'A4', 'E5'].map(n => A.note(n)), { dur: 3.2, vol: 0.1, attack: 0.4 });
          glitch.say(care ? L(LINES.fearCare, { n: String(N) }) : L(LINES.fearWeak, { n: String(N), k: String(N - 1) }), { mood: 'shy', ms: 4400 });
          K.later(() => glitch.base('calm'), 4400);
        } else {
          storm.target = support === 'strong' ? 0.8 : 0.64;
          glitch.say(L(support === 'strong' ? LINES.fearStrong : LINES.fearSome), { mood: 'determined', ms: 4400 });
        }
      }
      function afterVisit() {
        if (st.phase === 'finale' || st.phase === 'planted') return;
        if (met()) {
          if (!st.hunchShown) { st.hunchShown = true; st.phase = 'hunch'; pin.hidden = false; placeLabels(true); glitch.say(L(roadsLeft() ? LINES.hunchMore : LINES.hunchAll), { mood: 'think', ms: 5200 }); }
          st.phase = 'hunch'; placeLabels(true); hunchGuide();
        } else { st.phase = 'route'; routeGuide(); }
      }

      /* ---------------- the hunch pin ---------------- */
      function nearestDistrict(p) {
        let b = null, bd = M.phone ? 74 : 96;
        districts.forEach(d => { if (!d.explored) return; const a = camPt(d.ground.x, d.ground.y - 18), dd = K.dist(p, a); if (dd < bd) { bd = dd; b = d; } });
        return b;
      }
      K.drag(pin, {
        space: el,
        start: (p) => { if (st.phase !== 'hunch') return false; st.pinDrag = { x: p.x, y: p.y }; pin.classList.add('drag'); K.sfx.pop(undefined, 720); K.guide(null); },
        move: (p) => {
          if (!st.pinDrag) return; st.pinDrag.x = p.x; st.pinDrag.y = p.y;
          const nd = nearestDistrict(p);
          if (nd !== st.pinHover) { if (st.pinHover) st.pinHover.sign.classList.remove('hover'); st.pinHover = nd; if (nd) { nd.sign.classList.add('hover'); if (A.ctx) A.pluck(A.note(chord()[2]), { vol: 0.09, damp: 0.993 }); } }
        },
        end: (p) => {
          if (!st.pinDrag) return; st.pinDrag = null; pin.classList.remove('drag');
          const nd = nearestDistrict(p); if (st.pinHover) st.pinHover.sign.classList.remove('hover'); st.pinHover = null;
          if (nd && !nd.blocked) plant(nd);
          else { K.sfx.soft(); if (nd && nd.blocked) glitch.say(L(LINES.pinOut), { mood: 'think', ms: 2600 }); hunchGuide(); }
        }
      });
      K.onKey(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4'], (e) => {
        const i = Number(String(e.code).slice(-1)) - 1, d = districts[i]; if (!d) return;
        if (st.phase === 'hunch' && d.explored && !d.blocked && (!roadsLeft() || document.activeElement === pin)) { plant(d); return; }
        if ((st.phase === 'route' || st.phase === 'hunch') && !d.explored && !st.drawing) { beginStroke(null); st.auto = { r: d.road, t0: now() }; }
      });
      async function plant(d) {
        if (st.phase !== 'hunch') return;
        st.phase = 'planted'; st.hunch = d; K.guide(null);
        pin.classList.add('planted'); placeLabels(true);
        K.sfx.thud(); K.sfx.chime(7); cam.kick = 0.7;
        P.emit('star', d.ground.x, d.ground.y - 10, 22, { colors: ['#ffe27a', '#ffffff', d.col.c] });
        ripple(d.ground.x, d.ground.y, '#ffe27a');
        const line = d.fear ? (serious ? LINES.hFearSerious : LINES.hFearWeak) : LINES.hOther;
        glitch.say(L(line, { name: d.name }), { mood: d.fear && serious ? 'determined' : 'think', ms: 3600 });
        setBoard(d.col, [
          h('div', { class: 'mm-btop' }, h('span', { class: 'mm-tag', text: 'Your hunch' }), plPill(d)),
          h('span', { class: 'mm-name', text: d.name }),
          h('p', { class: 'mm-needs', text: d.fear && serious ? 'The facts lean this way. That deserves a plan.' : 'Still a maybe until a fact settles it.' }),
          h('p', { class: 'mm-plan' }, h('b', { text: d.fear && serious ? 'Plan: ' : 'Settle it: ' }), lead(d.fear && serious ? 'prepare' : 'ask'))
        ]);
        ctx.track('hunch', { fear: d.fear ? 1 : 0 });
        await K.wait(K.reduced() ? 1400 : 2800);
        finale();
      }

      /* ---------------- render loop ---------------- */
      cv.onResize(() => layout());
      S.on('theme', () => { el.classList.toggle('mm-bright', bright()); if (M.w) renderBase(); });
      el.classList.toggle('mm-bright', bright());
      // 30 fps when the CPU keeps up; a starved device steps down to 20 then 15 fps within half a second, and back up after calm
      function pace(dt0, t) {
        PACE.n++; if (dt0 > 0.04) PACE.slow++;
        if (PACE.n >= 30) {
          const r = PACE.slow / PACE.n; PACE.n = 0; PACE.slow = 0;
          if (r > 0.04) { PACE.gap = Math.min(0.062, PACE.gap + 0.017); PACE.calm = 0; } else if (!r && ++PACE.calm >= 4) { PACE.gap = Math.max(0.028, PACE.gap - 0.017); PACE.calm = 0; }
        }
        return t - lastDraw < PACE.gap;
      }
      let lastDraw = -1, dtAcc = 0;
      const PACE = { gap: 0.028, n: 0, slow: 0, calm: 0 };
      K.loop((dt0, t) => {
        const g = cv.g; if (!g || !baseOK) return;
        // software rendering: draw every other display frame (every third when the device is starved) so frames stay even
        dtAcc += dt0; if (SOFT && pace(dt0, t)) return;
        const dt = Math.min(0.1, dtAcc); dtAcc = 0; lastDraw = t;
        // adaptive resolution: a struggling device steps down once or twice; a healthy one stays crisp
        qual.acc += dt; qual.n++;
        if (dt > 0.03) qual.slow = (qual.slow || 0) + 1;
        if (qual.n >= 60) { if ((qual.acc / qual.n > 0.024 || qual.slow > 7) && qual.steps < 2 && (cv.dpr || 1) > 1.05) { qual.steps++; cvOpts.maxDpr = qual.steps === 1 ? 1.5 : 1.15; cv.fit(); } qual.acc = 0; qual.n = 0; qual.slow = 0; }
        const W = M.w, H = M.h, PL = pal(), br = bright();
        const bp = beatPhase(), pulse = Math.exp(-bp * 5);
        update(dt, t);
        // only the band that moves is repainted; a camera move, the storm's flash or a pin drag repaints everything, then one
        // settling frame clears anything that strayed outside the band
        const wantFull = fullNext > 0 || cam.kick > 0.01 || cam.z < 0.999 || st.phase === 'finale' || st.phase === 'done' || storm.flash > 0 || !!st.pinDrag;
        const settle = !wantFull && wasFull;
        wasFull = wantFull; if (fullNext > 0) fullNext--;
        g.save();
        if (!wantFull && !settle) bandClip(g);
        if (cam.z < 0.999) { g.fillStyle = PL.ground2; g.fillRect(0, 0, W, H); }
        g.translate(cam.px + cam.sx, cam.py + cam.sy); g.scale(cam.z, cam.z); g.translate(-cam.px, -cam.py);
        g.drawImage(base, -M.ox, -M.oy, W + 2 * M.ox, H + 2 * M.oy);
        if (settle) bandClip(g);
        drawShimmer(g, t, PL, br);
        drawFearShadow(g, br);
        drawPreview(g, t, br);
        drawTrails(g, t, br);
        drawLamps(g, pulse, PL, br);
        drawLights(g, t, pulse, br);
        drawGates(g, t, br);
        drawLandmark(g, t, pulse, PL, br);
        drawPlaza(g, t, pulse, PL, br);
        drawTaxi(g, t);
        drawStorm(g, t, dt, br);
        drawConstellation(g, t, br);
        drawRockets(g);
        drawFlashes(g);
        drawPinGhost(g);
        drawRipples(g, dt);
        P.update(dt); drawParticles(g);
        g.restore();
        g.save(); if (!wantFull) bandClip(g); drawWeather(g, t, dt, br); g.restore();
        if (storm.flash > 0) { g.fillStyle = 'rgba(225,230,255,' + (storm.flash * 0.28).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
        if (cam.z < 0.999 || cam.kick > 0.01) placeLabels();
      });
      function bandClip(g) { const b = M.band; g.beginPath(); g.rect(-8, b.y0, M.w + 16, b.y1 - b.y0); g.clip(); }
      function update(dt, t) {
        // auto-drive (keyboard): glide the stroke along a road
        if (st.auto && st.drawing) { const a = st.auto, k = (now() - a.t0) / 1800; advance(a.r, a.r.len * Math.min(1, k)); st.active = a.r; if (!st.drawing) st.auto = null; }
        // taxi
        const tx0 = taxi.x, ty0 = taxi.y;
        if (taxi.mode === 'plaza' || !taxi.road) { const p = { x: M.plaza.x + 2, y: M.plaza.y - 2 }; if (st.drawing && st.active) { taxi.road = st.active; taxi.mode = 'follow'; taxi.s = 0; } taxi.x += (p.x - taxi.x) * Math.min(1, dt * 12); taxi.y += (p.y - taxi.y) * Math.min(1, dt * 12); taxi.sc = 1; }
        if (taxi.mode === 'follow' && taxi.road) {
          if (st.drawing && st.active && st.active !== taxi.road) { taxi.road = st.active; }
          const target = taxi.road.prog; taxi.s += (target - taxi.s) * Math.min(1, dt * 13);
          const q = pointAt(taxi.road, taxi.s); taxi.x = q.x; taxi.y = q.y; taxi.sc = q.sc;
          let da = q.ang - taxi.ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; taxi.ang += da * Math.min(1, dt * 14);
        }
        if (taxi.mode === 'return' && taxi.road) {
          const k = clamp((now() - taxi.t0) / (K.reduced() ? 400 : 1150), 0, 1), e = K.ease.inOutCubic(k);
          taxi.s = taxi.road.len * (1 - e);
          const q = pointAt(taxi.road, taxi.s); taxi.x = q.x; taxi.y = q.y; taxi.sc = q.sc;
          let da = (q.ang + Math.PI) - taxi.ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; taxi.ang += da * Math.min(1, dt * 10);
          if (k >= 1) { taxi.mode = 'plaza'; taxi.road = null; }
        }
        taxi.speed = Math.hypot(taxi.x - tx0, taxi.y - ty0) / Math.max(0.001, dt);
        taxi.squash = Math.max(0, taxi.squash - dt * 4);
        if (engine) { const v = st.drawing || taxi.mode === 'return' ? clamp(0.012 + taxi.speed * 0.00006, 0.012, 0.06) : 0.0001; engine.level(v, 0.08); engine.freq(110 + Math.min(260, taxi.speed * 0.5), 0.08); }
        // storm, camera, finale
        storm.k += (storm.target - storm.k) * Math.min(1, dt * (st.fastStorm ? 3.2 : 1.5));
        storm.flash = Math.max(0, storm.flash - dt * 3.5);
        if (rain && rain.level) rain.level(fearD && !fearD.explored ? 0.12 + storm.k * 0.25 : storm.k * 0.12, 1.2);
        if (fearD && !fearD.explored && !K.reduced() && inten > 0 && now() > storm.nextBolt && st.phase !== 'intro') { storm.nextBolt = now() + 3800 + Math.random() * 5200; storm.bolt = { t: now(), seed: Math.random() * 1000 }; storm.flash = 0.45; thunder(0.12); }
        cam.kick = Math.max(0, cam.kick - dt * 3);
        if (!K.reduced()) { cam.sx = Math.sin(t * 47) * cam.kick * 2.4; cam.sy = Math.cos(t * 39) * cam.kick * 1.8; } else { cam.sx = cam.sy = 0; }
        if (st.phase === 'finale' || st.phase === 'done') {
          const k = clamp((now() - st.finT0) / 1800, 0, 1);
          cam.z = lerp(1, cam.target, K.ease.inOutCubic(k)); st.con = clamp((now() - st.finT0 - 500) / 1400, 0, 1);
        }
        st.plazaPing = Math.max(0, st.plazaPing - dt * 1.6);
        roads.forEach(r => r.gates.forEach(gt => { gt.open += ((gt.state === 'open' ? 1 : 0) - gt.open) * Math.min(1, dt * 9); }));
      }

      /* ---------------- dynamic layers ---------------- */
      function drawShimmer(g, t, PL, br) {
        g.strokeStyle = hexA(br ? '#ffffff' : PL.moon, br ? 0.5 : 0.22); g.lineWidth = 1;
        g.beginPath();
        for (let i = 0; i < 16; i++) { const x = ((i * 0.137 + t * 0.012 * (i % 3 + 1)) % 1.3) - 0.15, y = riverY(x) + ((i % 5) - 2) * 0.008, q = proj(x, y), w = 8 * q.s * (0.6 + 0.4 * Math.sin(t * 2 + i)); g.moveTo(q.x - w, q.y); g.lineTo(q.x + w, q.y); }
        g.stroke();
      }
      function drawFearShadow(g, br) {
        if (!fearD || storm.k < 0.05) return;
        const c = fearD.ground, R = (M.phone ? 64 : 120) + (M.phone ? 120 : 280) * storm.k;
        g.globalAlpha = Math.min(1, storm.k + 0.3); g.drawImage(br ? shadows.bright : shadows.dark, c.x - R, c.y - 24 - R * 0.62, R * 2, R * 1.24); g.globalAlpha = 1;
      }
      function drawPreview(g, t, br) {
        if (st.phase !== 'route' || st.drawing || !st.suggest) return;
        const r = st.suggest, sp = 20, off = (t * 46) % sp, col = r.d.col.c;
        g.fillStyle = hexA(br ? r.d.col.d : col, 0.75);
        for (let s = off + 8; s < r.len - 6; s += sp) { const q = pointAt(r, s), a = 0.35 + 0.65 * Math.sin((s / r.len) * Math.PI); g.globalAlpha = a; g.beginPath(); g.arc(q.x, q.y, 1.9 * q.sc, 0, TAU); g.fill(); }
        g.globalAlpha = 1;
      }
      function drawTrails(g, t, br) {
        roads.forEach(r => {
          const upto = r.d.explored ? (r.d.blocked ? r.prog : r.len) : r.prog;
          if (upto <= 1) return;
          const past = r.prog > r.forkS + 6 || r.d.explored;
          const col = past ? (br ? r.d.col.d : r.d.col.c) : (br ? '#b26a00' : '#ffe08a');
          if (!r.baked) strokeTrail(g, r, upto, col, br);
          if (r.d.explored && !r.d.blocked) { const ph = ((t / (BEAT() * 4)) + r.d.cx) % 1, q = pointAt(r, r.len * ph), s = 16 * q.sc; g.drawImage(glow(br ? '#ffffff' : r.d.col.c), q.x - s, q.y - s, s * 2, s * 2); }
        });
      }
      function drawLamps(g, pulse, PL, br) {
        const T = now(), gl = glow(PL.lamp);
        roads.forEach(r => {
          const done = r.d.explored && !r.d.blocked;
          r.lamps.forEach(l => {
            const want = done || r.prog >= l.s ? 1 : 0; l.v += (want - l.v) * 0.25;
            if (l.v <= 0.05) return;
            const flash = l.hit ? Math.max(0, 1 - (T - l.hit) / 500) : 0, s = l.sc * (M.phone ? 1 : 1.25), R = (9 + 10 * flash + 3 * pulse) * s;
            g.globalAlpha = Math.min(1, l.v * (br ? 0.55 : 0.7) + flash * 0.4); g.drawImage(gl, l.x - R, l.y - 7 * s - R, R * 2, R * 2);
            g.globalAlpha = l.v; g.fillStyle = PL.lamp; g.fillRect(l.x - 1.6 * s, l.y - 8.6 * s, 3.2 * s, 3.2 * s); g.globalAlpha = 1;
          });
        });
      }
      function drawLights(g, t, pulse, br) {
        const T = now(), PL = pal();
        districts.forEach(d => {
          if (!d.explored || d.blocked || !d.litTimes) return;
          const k0 = clamp((T - d.litTimes[0]) / 500, 0, 1); if (k0 <= 0) return;
          const R = (M.phone ? 66 : 110) * k0 * (0.94 + 0.06 * pulse);
          g.save(); if (!br) g.globalCompositeOperation = 'lighter'; g.globalAlpha = br ? 0.35 : 0.42; g.drawImage(glow(d.col.c), d.ground.x - R, d.ground.y - R * 0.95, R * 2, R * 1.5); g.restore();
          if (T - d.litTimes[d.litTimes.length - 1] > 200 && d.winSprite) { g.globalAlpha = 0.9 + 0.1 * pulse; g.drawImage(d.winSprite, d.winBox.x, d.winBox.y, d.winBox.w, d.winBox.h); }
          else d.windows.forEach(w => {
            if (!w.on) return; const k = clamp((T - d.litTimes[w.k]) / 160, 0, 1); if (k <= 0) return;
            g.globalAlpha = k * 0.9; g.fillStyle = w.warm ? PL.win : d.col.c; g.fillRect(w.x, w.y, w.w, w.h);
          });
          g.globalAlpha = 1;
          const tk = clamp((T - d.litTimes[d.litTimes.length - 1]) / 300, 0, 1);
          if (tk > 0) { const s = (14 + 6 * pulse) * (M.phone ? 1 : 1.3); g.globalAlpha = tk; g.drawImage(glow(d.col.c), d.anchor.x - s, d.anchor.y - s + 4, s * 2, s * 2); g.globalAlpha = 1; }
        });
      }
      function drawGates(g, t, br) {
        roads.forEach(r => r.gates.forEach(gt => {
          const s = gt.sc * (M.phone ? 1.35 : 1.6), ok = gt.state === 'open', no = gt.state === 'closed';
          const lc = ok ? '#5dffa0' : no ? '#ff5a6a' : '#ffc94a', blink = ok || no ? 1 : 0.5 + 0.5 * Math.sin(t * 6);
          g.globalAlpha = blink; g.drawImage(glow(lc), gt.bx - 9 * s, gt.by - 26 * s, 18 * s, 18 * s); g.globalAlpha = 1;
          g.fillStyle = lc; g.beginPath(); g.arc(gt.bx, gt.by - 17 * s, 1.3 * s, 0, TAU); g.fill();
          // barrier arm: across the road when closed, swung along the road when open
          const across = Math.atan2(-gt.ny, -gt.nx), along = gt.ang + (Math.cos(gt.ang) >= 0 ? 0 : Math.PI);
          let da = along - across; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
          const a = across + da * gt.open * 0.85, len = (M.roadW * gt.sc + 10) * (M.phone ? 1 : 1.1);
          const x0 = gt.bx - gt.nx * 4 * s, y0 = gt.by - gt.ny * 4 * s - 5 * s, x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
          g.lineCap = 'round'; g.strokeStyle = no ? '#ff5a6a' : '#ffffff'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
          g.strokeStyle = no ? '#7a0f1e' : '#e2384e'; g.setLineDash([3 * s, 3 * s]); g.lineWidth = 3 * s; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.setLineDash([]);
          if (ok && now() - gt.t0 < 900) { const k = (now() - gt.t0) / 900; g.strokeStyle = hexA('#7dffb2', 1 - k); g.lineWidth = 2; g.beginPath(); g.ellipse(gt.x, gt.y, 10 + k * 26, (10 + k * 26) * 0.5, 0, 0, TAU); g.stroke(); }
          void t;
        }));
      }
      function drawPlaza(g, t, pulse, PL, br) {
        const pz = M.plaza, s = M.phone ? 1 : 1.3, bob = Math.sin(t * 2.2) * 1.5;
        if (st.plazaPing > 0) { const k = 1 - st.plazaPing; g.strokeStyle = hexA(br ? '#a3550f' : '#ffd36b', st.plazaPing); g.lineWidth = 2.5; g.beginPath(); g.ellipse(pz.x, pz.y, pz.rx * (0.6 + k * 0.9), pz.ry * (0.6 + k * 0.9), 0, 0, TAU); g.stroke(); }
        if (st.phase === 'route' && !st.drawing) { const k = (t * 0.8) % 1; g.strokeStyle = hexA(br ? '#a3550f' : '#ffd36b', 0.5 * (1 - k)); g.lineWidth = 2; g.beginPath(); g.ellipse(pz.x, pz.y, pz.rx * (0.7 + k * 0.5), pz.ry * (0.7 + k * 0.5), 0, 0, TAU); g.stroke(); }
        const R = (18 + 6 * pulse) * s; g.drawImage(glow(br ? '#ffb13b' : '#ffd36b'), pz.x - R, pz.y - 20 * s - R + bob, R * 2, R * 2);
        g.fillStyle = br ? '#5a4220' : '#2a1e10'; g.beginPath(); g.moveTo(pz.x - 3 * s, pz.y - 2); g.lineTo(pz.x + 3 * s, pz.y - 2); g.lineTo(pz.x + 1.4 * s, pz.y - 18 * s + bob); g.lineTo(pz.x - 1.4 * s, pz.y - 18 * s + bob); g.closePath(); g.fill();
        g.fillStyle = '#ffd36b'; K.starPath(g, pz.x, pz.y - 21 * s + bob, 6.5 * s, 2.6 * s, 4, t * 0.6); g.fill();
        void PL;
      }
      function drawTaxi(g, t) {
        const s = (M.phone ? 1.05 : 1.35) * (0.72 + 0.28 * taxi.sc) * (1 + taxi.squash * 0.18);
        g.save(); g.translate(taxi.x, taxi.y - 2); g.rotate(taxi.ang); g.scale(s, s * (1 - taxi.squash * 0.1));
        const beam = g.createLinearGradient(9, 0, 44, 0); beam.addColorStop(0, 'rgba(255,244,200,0.5)'); beam.addColorStop(1, 'rgba(255,244,200,0)');
        g.fillStyle = beam; g.beginPath(); g.moveTo(9, -3.5); g.lineTo(44, -12); g.lineTo(44, 12); g.lineTo(9, 3.5); g.closePath(); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.38)'; g.beginPath(); g.ellipse(1, 2.5, 12.5, 7.5, 0, 0, TAU); g.fill();
        rrect(g, -11, -6.5, 22, 13, 4); g.fillStyle = '#ffcd3c'; g.fill(); g.strokeStyle = '#7a5200'; g.lineWidth = 1; g.stroke();
        if (visits >= 1) { g.fillStyle = '#1b1b1b'; for (let i = 0; i < 5; i++) g.fillRect(-9 + i * 4, (i % 2 ? -6.3 : 5.0), 2, 1.3); }
        g.fillStyle = '#26314f'; rrect(g, -5, -5, 10, 10, 2.5); g.fill();
        g.fillStyle = '#fff3c0'; rrect(g, -2.2, -2.6, 4.4, 5.2, 1); g.fill();
        if (visits >= 1) { const on = Math.exp(-beatPhase() * 4); g.globalAlpha = 0.4 + 0.6 * on; g.drawImage(glow('#ffe27a'), -8, -8, 16, 16); g.globalAlpha = 1; }
        g.fillStyle = '#ff4a5a'; g.fillRect(-11.6, -5, 1.7, 2.6); g.fillRect(-11.6, 2.4, 1.7, 2.6);
        g.fillStyle = '#fff6d6'; g.fillRect(9.9, -5, 1.7, 2.6); g.fillRect(9.9, 2.4, 1.7, 2.6);
        g.restore(); void t;
      }
      function drawStorm(g, t, dt, br) {
        if (!fearD || storm.k < 0.02) return;
        const c = fearD.anchor, k = storm.k, sc = M.phone ? 1 : 1.5;
        const spread = (34 + 150 * k) * sc, cy = c.y - (26 + 26 * k) * sc;
        const spr = br ? clouds.bright : clouds.dark, rim = br ? clouds.rimB : clouds.rimD;
        // rain under the cloud
        g.strokeStyle = br ? 'rgba(70,80,140,0.45)' : 'rgba(200,205,255,0.42)'; g.lineWidth = 1.2; g.beginPath();
        const nDrops = Math.round((18 + 70 * k) * (K.reduced() ? 0.4 : 1));
        for (let i = 0; i < nDrops; i++) { const x = c.x + ((i * 53.7) % (spread * 1.6)) - spread * 0.8, y0 = cy + 10, len = (fearD.ground.y - y0 + 10), yy = y0 + ((i * 37.3 + t * 260) % Math.max(10, len)); g.moveTo(x, yy); g.lineTo(x - 2, yy + 7); }
        g.stroke();
        // lightning bolt
        if (storm.bolt && now() - storm.bolt.t < 220) {
          const r = K.rng(storm.bolt.seed | 0); g.strokeStyle = 'rgba(235,240,255,0.95)'; g.lineWidth = 2; g.beginPath();
          let x = c.x + (r() - 0.5) * spread * 0.6, y = cy + 6; g.moveTo(x, y);
          while (y < fearD.anchor.y + 10) { x += (r() - 0.5) * 16; y += 9 + r() * 8; g.lineTo(x, y); }
          g.stroke();
        }
        // ominous underglow on the district, then one pre-composed cloud mass (dark base, body, moonlit rim)
        const ug = (60 + 70 * k) * sc; g.save(); if (!br) g.globalCompositeOperation = 'lighter'; g.globalAlpha = (br ? 0.28 : 0.42) * (0.75 + 0.25 * Math.sin(t * 1.3)) + storm.flash * 0.4; g.drawImage(glow('#ff4d6d'), c.x - ug, cy - ug * 0.35, ug * 2, ug * 1.5); g.restore();
        const mass = stormMass(br), pw = (60 + 60 * k) * sc, mw = (spread * 2 + pw * 1.2) * (1 + 0.012 * Math.sin(t * 0.7)), mh = mass.height * (pw / (120 * sc));
        g.globalAlpha = 1; g.drawImage(mass, c.x - mw / 2 + Math.sin(t * 0.3) * 4, cy - mh * 0.55, mw, mh);
        void spr; void rim;
        if (storm.flash > 0.05) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = storm.flash * 0.8; g.drawImage(glow('#d8dcff'), c.x - spread, cy - spread * 0.5, spread * 2, spread); g.restore(); }
        g.globalAlpha = 1; void dt;
      }
      function drawConstellation(g, t, br) {
        const k = st.con; if (k <= 0) return;
        g.save();
        if (br) { const vg = g.createLinearGradient(0, -M.oy, 0, M.h + M.oy); vg.addColorStop(0, hexA('#10163f', 0.7 * k)); vg.addColorStop(1, hexA('#2b1f52', 0.5 * k)); g.fillStyle = vg; } else g.fillStyle = hexA('#02030c', 0.58 * k);
        g.fillRect(-M.w, -M.h, M.w * 3, M.h * 3);
        g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
        const done = roads.filter(r => r.d.explored);
        done.forEach((r, i) => {
          const upto = (r.d.blocked ? r.prog : r.len) * K.ease.outCubic(k);
          pathTo(g, r, upto); g.strokeStyle = hexA(r.d.col.c, 0.3 * k); g.lineWidth = M.roadW * 1.8; g.stroke();
          g.strokeStyle = hexA('#fff4d0', 0.95 * k); g.lineWidth = 1.8; g.stroke();
          const ph = ((t / (BEAT() * 2)) + i * 0.25) % 1, q = pointAt(r, upto * ph); g.globalAlpha = k; g.drawImage(glow('#fff4d0'), q.x - 12, q.y - 12, 24, 24); g.globalAlpha = 1;
          r.gates.forEach(gt => { if (gt.s <= upto) starAt(g, gt.x, gt.y, 6, k, '#d8fff0', t); });
        });
        const pts = districts.filter(d => d.explored).map(d => d.anchor);
        g.setLineDash([2, 6]); g.strokeStyle = hexA('#fff4d0', 0.45 * k); g.lineWidth = 1.2; g.beginPath();
        pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); if (pts.length > 2) g.closePath(); g.stroke(); g.setLineDash([]);
        starAt(g, M.plaza.x, M.plaza.y - 20, 10, k, '#ffe08a', t);
        districts.forEach(d => { if (d.explored) starAt(g, d.anchor.x, d.anchor.y, 9, k, d.col.c, t); });
        g.restore();
      }
      function starAt(g, x, y, R, k, col, t) {
        const tw = 0.85 + 0.15 * Math.sin(t * 3 + x * 0.1);
        g.globalAlpha = k; g.drawImage(glow(col), x - R * 2.6, y - R * 2.6, R * 5.2, R * 5.2);
        g.fillStyle = '#ffffff'; K.starPath(g, x, y, R * tw, R * 0.32, 4, 0); g.fill(); g.globalAlpha = 1;
      }
      function drawRockets(g) {
        const T = now();
        for (let i = rockets.length - 1; i >= 0; i--) {
          const r = rockets[i]; if (T < r.launch) continue;
          const k = clamp((T - r.launch) / (r.burst - r.launch), 0, 1);
          if (k < 1) { const x = lerp(r.x0, r.x1, k), y = lerp(r.y0, r.y1, K.ease.outCubic(k)); g.fillStyle = '#fff6d0'; g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill(); if (Math.random() < 0.7) P.emit('ember', x, y, 1); }
          else {
            const big = M.phone ? 1 : 1.4;
            P.emit('spark', r.x1, r.y1, 60, { colors: [r.c, '#ffffff', '#fff2b0'], speed: [120 * big, 330 * big], life: [0.7, 1.5] }); P.emit('star', r.x1, r.y1, 14, { colors: [r.c, '#ffffff'], speed: [60 * big, 200 * big] });
            P.emit('ember', r.x1, r.y1, 14, { colors: [r.c, '#ffe08a'], speed: [30, 120] });
            flashes.push({ x: r.x1, y: r.y1, c: r.c, t: T }); rockets.splice(i, 1);
          }
        }
      }
      function drawFlashes(g) {
        const T = now();
        for (let i = flashes.length - 1; i >= 0; i--) {
          const f = flashes[i], k = (T - f.t) / 650; if (k >= 1) { flashes.splice(i, 1); continue; }
          const R = (M.phone ? 90 : 140) * (0.5 + 0.5 * K.ease.outCubic(k)); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (1 - k) * 0.85; g.drawImage(glow(f.c), f.x - R, f.y - R, R * 2, R * 2); g.restore();
        }
      }
      function drawPinGhost(g) {
        if (!st.pinDrag) return;
        const p = st.pinDrag, pz = M.plaza, inv = (q) => ({ x: (q.x - cam.px - cam.sx) / cam.z + cam.px, y: (q.y - cam.py - cam.sy) / cam.z + cam.py }), q = inv(p);
        g.setLineDash([4, 6]); g.strokeStyle = 'rgba(255,226,122,0.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(pz.x, pz.y); g.lineTo(q.x, q.y); g.stroke(); g.setLineDash([]);
        if (st.pinHover) { const a = st.pinHover.ground; g.strokeStyle = hexA(st.pinHover.col.c, 0.9); g.lineWidth = 2.5; g.beginPath(); g.ellipse(a.x, a.y - 6, 46, 20, 0, 0, TAU); g.stroke(); }
        g.save(); g.translate(q.x, q.y - 4); g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(0, 4, 9, 3, 0, 0, TAU); g.fill();
        g.fillStyle = '#ffc83f'; g.strokeStyle = '#5b3500'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-4, -8, -18, -20, -18, -34); g.arc(0, -34, 18, Math.PI, 0); g.bezierCurveTo(18, -20, 4, -8, 0, 0); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#3b2205'; g.beginPath(); g.arc(0, -34, 8, 0, TAU); g.fill(); g.fillStyle = '#ffe27a'; K.starPath(g, 0, -34, 6, 2.5, 5, 0); g.fill(); g.restore();
      }
      /* the kit's particles, drawn with cached glow sprites instead of a fresh gradient per particle per frame */
      const pgCache = {};
      function pglow(col) { return pgCache[col] || (pgCache[col] = sprite(32, 32, (pg) => { const gr = pg.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)'); pg.fillStyle = gr; pg.fillRect(0, 0, 32, 32); })); }
      function drawParticles(g) {
        for (const q of P.list) {
          const p = q.p, k = 1 - q.age / q.life, a = p.flicker ? k * (0.6 + 0.4 * Math.sin(q.age * 30 + q.ph)) : k, s = q.size * (p.grow ? 1 + (1 - k) * 1.6 : 1);
          g.globalAlpha = Math.max(0, Math.min(1, a));
          if (p.glow) g.drawImage(pglow(q.col), q.x - s * 3, q.y - s * 3, s * 6, s * 6);
          g.fillStyle = q.col; g.strokeStyle = q.col;
          if (p.star) { K.starPath(g, q.x, q.y, s * 1.6, s * 0.6, 4, q.rot); g.fill(); }
          else if (p.rect) { g.save(); g.translate(q.x, q.y); g.rotate(q.rot); g.fillRect(-s / 2, -s / 4, s, s / 2); g.restore(); }
          else if (p.petal) { g.save(); g.translate(q.x, q.y); g.rotate(q.rot); g.beginPath(); g.ellipse(0, 0, s, s * 0.5, 0, 0, TAU); g.fill(); g.restore(); }
          else if (p.ring) { g.lineWidth = 1.2; g.beginPath(); g.arc(q.x, q.y, s, 0, TAU); g.stroke(); }
          else { g.beginPath(); g.arc(q.x, q.y, s, 0, TAU); g.fill(); }
        }
        g.globalAlpha = 1;
      }
      function drawRipples(g, dt) {
        for (let i = ripples.length - 1; i >= 0; i--) {
          const r = ripples[i]; r.t += dt; const k = r.t / (r.big ? 0.9 : 0.55); if (k >= 1) { ripples.splice(i, 1); continue; }
          const R = (r.big ? 70 : 34) * K.ease.outCubic(k); g.strokeStyle = hexA(r.c, 0.75 * (1 - k)); g.lineWidth = r.big ? 3 : 2; g.beginPath(); g.ellipse(r.x, r.y, R, R * (r.big ? 1 : 0.5), 0, 0, TAU); g.stroke();
        }
      }
      function drawWeather(g, t, dt, br) {
        if (weather === 'drizzle') { g.strokeStyle = br ? 'rgba(80,100,150,0.22)' : 'rgba(190,210,255,0.2)'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 44; i++) { const x = (i * 97.3 + t * 50) % (M.w + 40) - 20, y = (i * 53.1 + t * 420) % M.h; g.moveTo(x, y); g.lineTo(x - 3, y + 9); } g.stroke(); }
        else if (weather === 'snow') { if (Math.random() < dt * (K.reduced() ? 4 : 12)) P.emit('snow', Math.random() * M.w, M.top - 40 + Math.random() * 40, 1); }
        else if (weather === 'mist') { for (let i = 0; i < 2; i++) { const y = M.top + 30 + i * 70, x = ((t * 8 * (i + 1)) % (M.w + 400)) - 400; const gr = g.createLinearGradient(x, 0, x + 400, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, br ? 'rgba(255,255,255,0.28)' : 'rgba(170,180,220,0.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x, y - 16, 400, 32); } }
        if (st.starRain && Math.random() < dt * 10) P.emit('star', Math.random() * M.w, 80 + Math.random() * (M.top - 40), 1, { speed: [4, 16], colors: ['#fffbe6', '#ffe58a', '#d8e4ff'] });
        if (weather === 'fireflies' && !br && parks.length && Math.random() < dt * 4) { const [px, py] = parks[Math.floor(Math.random() * parks.length)], q = proj(px + (Math.random() - 0.5) * 0.08, py + (Math.random() - 0.5) * 0.05); P.emit('mote', q.x, q.y - 6, 1, { colors: ['#e9ff9a', '#fff3a0'] }); }
      }
      function drawLandmark(g, t, pulse, PL, br) {
        const q = proj(LMP[0], LMP[1]), s = q.s * (M.phone ? 1 : 1.3), x = q.x, y = q.y;
        const ink = br ? '#4d5a86' : '#9aa6dc', fill = br ? '#8e9cc6' : '#28336a';
        g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = ink; g.lineWidth = 1.4 * s;
        if (landmark === 'Ferris Wheel') {
          const R = 24 * s, cy = y - R - 7 * s;
          g.beginPath(); g.moveTo(x - 11 * s, y); g.lineTo(x, cy); g.lineTo(x + 11 * s, y); g.stroke();
          g.beginPath(); g.arc(x, cy, R, 0, TAU); g.stroke();
          const rot = t * 0.25;
          for (let i = 0; i < 10; i++) { const a = rot + i / 10 * TAU, cx = x + Math.cos(a) * R, cyy = cy + Math.sin(a) * R; g.beginPath(); g.moveTo(x, cy); g.lineTo(cx, cyy); g.stroke(); g.fillStyle = i % 2 ? PL.lamp : '#ff8fc8'; g.globalAlpha = 0.6 + 0.4 * pulse; g.beginPath(); g.arc(cx, cyy + 3 * s, 2.6 * s, 0, TAU); g.fill(); g.globalAlpha = 1; }
          g.globalAlpha = 0.35 + 0.25 * pulse; g.drawImage(glow(PL.lamp), x - R * 1.4, cy - R * 1.4, R * 2.8, R * 2.8); g.globalAlpha = 1;
        } else if (landmark === 'Clock Tower') {
          const w = 11 * s, hh = 50 * s;
          g.fillStyle = fill; g.fillRect(x - w / 2, y - hh, w, hh); g.strokeRect(x - w / 2, y - hh, w, hh);
          g.beginPath(); g.moveTo(x - w / 2 - 2 * s, y - hh); g.lineTo(x, y - hh - 14 * s); g.lineTo(x + w / 2 + 2 * s, y - hh); g.closePath(); g.fillStyle = ink; g.fill();
          const cy = y - hh + 9 * s, d = new Date(); g.fillStyle = '#fff3c4'; g.globalAlpha = 0.85 + 0.15 * pulse; g.beginPath(); g.arc(x, cy, 5 * s, 0, TAU); g.fill(); g.globalAlpha = 1;
          g.strokeStyle = '#2a1e10'; g.lineWidth = 1 * s; const ha = (d.getHours() % 12 + d.getMinutes() / 60) / 12 * TAU - Math.PI / 2, ma = d.getMinutes() / 60 * TAU - Math.PI / 2;
          g.beginPath(); g.moveTo(x, cy); g.lineTo(x + Math.cos(ha) * 2.6 * s, cy + Math.sin(ha) * 2.6 * s); g.moveTo(x, cy); g.lineTo(x + Math.cos(ma) * 4 * s, cy + Math.sin(ma) * 4 * s); g.stroke();
          g.globalAlpha = 0.4; g.drawImage(glow('#fff3c4'), x - 16 * s, cy - 16 * s, 32 * s, 32 * s); g.globalAlpha = 1;
        } else if (landmark === 'Observatory') {
          const w = 22 * s; g.fillStyle = fill; g.fillRect(x - w / 2, y - 12 * s, w, 12 * s);
          g.beginPath(); g.arc(x, y - 12 * s, w / 2, Math.PI, 0); g.closePath(); g.fillStyle = br ? '#c6cfeb' : '#3b4a8a'; g.fill(); g.stroke();
          const a = -Math.PI / 2 - 0.45 + Math.sin(t * 0.3) * 0.3, L0 = 150 * s, ox = x, oy = y - 20 * s, sp = 0.07;
          const gr = g.createLinearGradient(ox, oy, ox + Math.cos(a) * L0, oy + Math.sin(a) * L0); gr.addColorStop(0, hexA(br ? '#fff3c4' : PL.lamp, br ? 0.75 : 0.5)); gr.addColorStop(1, hexA(PL.lamp, 0));
          g.save(); if (!br) g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + Math.cos(a - sp) * L0, oy + Math.sin(a - sp) * L0); g.lineTo(ox + Math.cos(a + sp) * L0, oy + Math.sin(a + sp) * L0); g.closePath(); g.fill(); g.restore();
          g.fillStyle = br ? '#2b3150' : '#d8def7'; g.save(); g.translate(ox, oy); g.rotate(a); g.fillRect(0, -2 * s, 12 * s, 4 * s); g.restore();
        } else if (landmark === 'Radio Mast') {
          const hh = 64 * s; g.beginPath(); g.moveTo(x - 9 * s, y); g.lineTo(x, y - hh); g.lineTo(x + 9 * s, y);
          for (let i = 1; i < 7; i++) { const k0 = i / 7, k1 = (i + 1) / 7; g.moveTo(x - 9 * s * (1 - k0), y - hh * k0); g.lineTo(x + 9 * s * (1 - k1), y - hh * k1); }
          g.stroke(); const on = Math.exp(-beatPhase() * 3.5); g.fillStyle = '#ff4a5a'; g.globalAlpha = 0.3 + 0.7 * on; g.drawImage(glow('#ff4a5a'), x - 12 * s, y - hh - 12 * s, 24 * s, 24 * s); g.beginPath(); g.arc(x, y - hh, 2.2 * s, 0, TAU); g.fill(); g.globalAlpha = 1;
        } else if (landmark === 'Lantern Bridge') {
          const w = 34 * s; g.lineWidth = 3 * s; g.strokeStyle = fill; g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x, y - 22 * s, x + w, y); g.stroke();
          g.lineWidth = 1.2 * s; g.strokeStyle = ink; g.beginPath(); g.moveTo(x - w, y - 6 * s); g.quadraticCurveTo(x, y - 28 * s, x + w, y - 6 * s); g.stroke();
          for (let i = 0; i < 5; i++) { const k = (i + 1) / 6, lx = x - w + 2 * w * k, ly = y - 6 * s - Math.sin(k * Math.PI) * 11 * s + 5 * s + Math.sin(t * 2 + i) * 0.8; g.globalAlpha = 0.5 + 0.5 * pulse; g.drawImage(glow('#ff9a5a'), lx - 7 * s, ly - 7 * s, 14 * s, 14 * s); g.globalAlpha = 1; g.fillStyle = '#ffb36b'; g.fillRect(lx - 1.6 * s, ly - 2 * s, 3.2 * s, 4 * s); }
        } else {
          const hh = 52 * s; g.lineWidth = 2.2 * s; g.strokeStyle = br ? '#c07a2a' : '#ffb24f'; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - hh); g.moveTo(x - 14 * s, y - hh); g.lineTo(x + 30 * s, y - hh); g.stroke();
          const sw = Math.sin(t * 0.8) * 3 * s; g.lineWidth = 1 * s; g.strokeStyle = ink; g.beginPath(); g.moveTo(x + 24 * s, y - hh); g.lineTo(x + 24 * s + sw, y - hh + 22 * s); g.stroke();
          g.fillStyle = ink; g.fillRect(x + 21.5 * s + sw, y - hh + 22 * s, 5 * s, 3 * s); g.fillStyle = PL.lamp; g.globalAlpha = 0.5 + 0.5 * pulse; g.beginPath(); g.arc(x + 1, y - hh - 3 * s, 2 * s, 0, TAU); g.fill(); g.globalAlpha = 1;
        }
        g.restore();
        // a balloon drifts over regulars' cities; a third visit brings a cameo on the plaza billboard
        if (visits >= 2) { const bx = ((t * 9) % (M.w + 120)) - 60, by = (M.phone ? 168 : 150) + Math.sin(t * 0.5) * 6, R = (M.phone ? 11 : 15); g.fillStyle = br ? '#ff8a5a' : '#ff6f91'; g.beginPath(); g.arc(bx, by, R, 0, TAU); g.fill(); g.fillStyle = '#ffd36b'; g.beginPath(); g.moveTo(bx - R * 0.9, by + R * 0.3); g.lineTo(bx + R * 0.9, by + R * 0.3); g.lineTo(bx, by + R * 1.05); g.closePath(); g.globalAlpha = 0.35; g.fill(); g.globalAlpha = 1; g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(bx - 4, by + R); g.lineTo(bx - 3, by + R + 7); g.moveTo(bx + 4, by + R); g.lineTo(bx + 3, by + R + 7); g.stroke(); g.fillStyle = '#6b4a2a'; g.fillRect(bx - 4, by + R + 7, 8, 5); }
        if (visits >= 3 && cameo.complete && cameo.naturalWidth) { const pz = M.plaza, sz = M.phone ? 30 : 40, bx = pz.x - pz.rx - sz - 10, by = pz.y - sz - 22; g.fillStyle = br ? '#5d6a92' : '#141a3a'; g.fillRect(bx + sz / 2 - 1, by + sz, 2, 22); g.fillStyle = br ? '#ffffff' : '#1d2550'; rrect(g, bx - 4, by - 4, sz + 8, sz + 8, 6); g.fill(); g.drawImage(cameo, bx, by, sz, sz); }
      }
      const cameo = new Image(); if (visits >= 3) cameo.src = K.face('loopie', 'wink');

      /* ---------------- finale ---------------- */
      async function finale() {
        if (st.phase === 'finale' || st.phase === 'done') return;
        st.phase = 'finale'; K.guide(null); hit.style.pointerEvents = 'none'; pin.style.pointerEvents = 'none';
        st.finT0 = now(); cam.target = M.phone ? 0.9 : 0.86;
        music.level(1);
        const ex = st.explored, fearIs = fearD ? (fearD.blocked ? 'ruled out by the facts' : 'one district of ' + N) : '';
        const col = { c: '#ffd36b', d: '#8a4a00' };
        hideBoard(); plaque.style.opacity = '0'; await K.wait(K.reduced() ? 60 : 450);
        board.style.top = Math.max(M.phone ? 470 : 520, parseFloat(plaque.style.top) - (M.phone ? 30 : 20)) + 'px';
        setBoard(col, [
          h('div', { class: 'mm-final', text: serious ? 'One district has more facts' : (fearD && fearD.blocked ? 'The fear didn’t fit the facts' : 'The fear is 1 district of ' + N) }),
          h('p', { class: 'mm-sub', text: 'Hunch: ' + (st.hunch ? st.hunch.name : '—') + ' · ' + ex + ' roads checked' }),
          h('p', { class: 'mm-plan' }, h('b', { text: serious ? 'Plan: ' : 'Next step: ' }), lead(serious ? 'prepare' : 'ask')),
          care ? h('p', { class: 'mm-sub', text: 'Someone qualified can tell you exactly where you stand.' }) : null
        ]);
        const charTop = K.rectIn(glitch.el).y, bh = board.offsetHeight || 150;
        board.style.top = Math.max(M.phone ? 300 : 260, Math.min(parseFloat(board.style.top) || 470, charTop - 14 - bh)) + 'px';
        void fearIs;
        glitch.say(care ? L(LINES.endCare) : L(serious ? LINES.endSerious : LINES.endWeak, { n: String(ex) }), { mood: serious ? 'determined' : 'celebrate', ms: 0 });
        if (A.ctx) A.pad(['D4', 'A4', 'C5', 'E5'].map(n => A.note(n)), { dur: 6.5, vol: 0.16, attack: 0.6 });
        st.starRain = true; K.later(() => { st.starRain = false; }, 5200);
        const lit = districts.filter(d => d.explored && !d.blocked);
        const count = Math.max(3, lit.length * (inten === 2 ? 3 : 2)), t0 = nextGrid(1) || 0, bl = BEAT();
        for (let i = 0; i < count; i++) {
          const d = lit[i % Math.max(1, lit.length)] || { anchor: { x: M.w / 2, y: M.top }, col: { c: '#ffd36b' } };
          const burstWhen = t0 + 1.2 + i * bl * 0.5, burstPerf = A.ctx ? perfAt(burstWhen) : now() + 1200 + i * bl * 500;
          const x1 = clamp(d.anchor.x + (Math.random() - 0.5) * 70, 40, M.w - 40), y1 = Math.max(M.phone ? 112 : 104, d.anchor.y - (M.phone ? 86 : 130) - Math.random() * 70);
          rockets.push({ x0: d.anchor.x, y0: d.anchor.y, x1, y1, c: d.col.c, launch: burstPerf - 620, burst: burstPerf });
          if (A.ctx) { A.tone({ when: burstWhen - 0.6, type: 'sine', freq: 520, to: 1500, glide: 0.55, dur: 0.6, vol: 0.025 }); A.noise({ when: burstWhen, filter: 'lowpass', freq: 900, dur: 0.45, vol: 0.12 }); A.chime(A.note(LOFI[0][i % 4]) * 2, { when: burstWhen, vol: 0.06, dur: 1.4 }); }
        }
        await K.wait(K.reduced() ? 2600 : 6400);
        finishGame();
      }
      function finishGame() {
        if (st.finished) return; st.finished = true; st.phase = 'done';
        const acc = st.accs.length ? st.accs.reduce((a, b) => a + b, 0) / st.accs.length : 1, pct = Math.round(acc * 100);
        const best = K.best('route', pct, 'higher'), tier = K.tier(acc, [0.55, 0.78, 0.92]), col = K.collect(landmark);
        const badges = [];
        if (best.isNew) badges.push('New best: ' + pct + '% on the road'); else if (best.first) badges.push('First map: ' + pct + '% on the road');
        if (tier) badges.push(tier + ' route');
        if (col.isNew) badges.push('Collected: ' + landmark + ' (' + Math.min(col.count, LANDMARKS.length) + '/' + LANDMARKS.length + ')');
        if (st.explored >= N && badges.length < 4) badges.push('Every road explored');
        const ex = st.explored;
        ctx.finish({
          title: serious ? 'A real worry, mapped, with a plan' : 'The fear is one district',
          mood: serious ? 'determined' : 'celebrate',
          lines: ['Explored ' + ex + ' explanation' + (ex === 1 ? '' : 's'), 'Hunch: ' + (st.hunch ? st.hunch.name : 'none yet'), serious ? 'Plan: ' + clip(lead('prepare'), 70) : (fearD && fearD.blocked ? 'The fear didn’t fit the facts' : 'The fear is one district out of ' + N)],
          share: serious ? 'I checked ' + ex + ' explanations against the facts and made a plan.' : 'I drove ' + ex + ' roads from one set of facts. The fear was just one district.',
          badges: badges.slice(0, 4)
        });
      }

      /* ---------------- lines (every one in three vibes) ---------------- */
      const LINES = {
        intro: visits ? { Jolly: 'Back on shift! Same plaza, fresh streets. Draw me a route.', Cheeky: 'You again! Meter’s running. Draw me a route.', Unfiltered: 'New night, same job. Draw a route from the plaza.' }
          : { Jolly: 'Hop in! Every road starts at this plaza: what actually happened.', Cheeky: 'Your brain only ever drives one road. Rude. Draw me a route.', Unfiltered: 'Plaza = the facts. Districts = explanations. Draw a route.' },
        gate1: { Jolly: 'Ooh, the gate opened! That fact fits here too.', Cheeky: 'Wait, the facts let us through? I had money on a dead end.', Unfiltered: 'Gate’s open. The fact fits this one too.' },
        closed: { Jolly: 'Barrier’s down. That fact doesn’t fit this one.', Cheeky: 'Denied! This story can’t get past the facts.', Unfiltered: 'Closed. Doesn’t fit the facts. Crossed off.' },
        arrive1: { Jolly: 'Look at that! A whole district that fits the same facts.', Cheeky: 'Huh. This road was open the whole time. I never took it.', Unfiltered: 'Same facts, different district. It fits.' },
        arrive2: { Jolly: 'Another one fits! How many roads does this city have?', Cheeky: 'This is getting awkward for my one-road theory.', Unfiltered: 'Fits again. The facts allow more than one story.' },
        fearWeak: { Jolly: 'So that’s the fear. It’s a real district… just one of {n}.', Cheeky: 'I thought the storm was the whole city. It’s one district.', Unfiltered: 'The fear fits. So do {k} others. One district, not the map.' },
        fearCare: { Jolly: 'That’s the fear: one district of {n}. Worth checking properly.', Cheeky: 'The fear fits, and so do others. Worth checking properly.', Unfiltered: 'One district of {n}. Get the real facts on it.' },
        fearSome: { Jolly: 'Some facts do point here. That deserves a plan, not a panic.', Cheeky: 'Not pretending this one’s empty. It has some basis. Plan time.', Unfiltered: 'Some facts point here. Take it seriously. Make a plan.' },
        fearStrong: { Jolly: 'The facts lean this way. Let’s take it seriously and plan.', Cheeky: 'No jokes here. The facts back this one. So: a plan.', Unfiltered: 'This one has real backing. Plan, not panic.' },
        off: { Jolly: 'Stay on the road! The taxi only goes where streets go.', Cheeky: 'I’m a cab, not a helicopter. Roads, please.', Unfiltered: 'Off-road. Follow the street.' },
        plaza: { Jolly: 'Start at the plaza. That’s where the facts are.', Cheeky: 'Every trip starts at the plaza. House rules.', Unfiltered: 'Plaza first. Facts first.' },
        hunchMore: { Jolly: 'Seen enough? Pin the district you think is likeliest, or drive one more.', Cheeky: 'Gut check: pin the likeliest district. Or keep touring.', Unfiltered: 'Pin the likeliest district. Or drive another road first.' },
        hunchAll: { Jolly: 'Every road driven! Pin the district you think is likeliest.', Cheeky: 'Full tour. Now pin your hunch, detective.', Unfiltered: 'All roads done. Pin the likeliest district.' },
        pinOut: { Jolly: 'That one didn’t fit the facts. Pick a district that’s still open.', Cheeky: 'Ruled out, remember? Pick a live one.', Unfiltered: 'That one failed the facts. Choose another.' },
        hFearSerious: { Jolly: 'Fair read. The facts lean that way, so let’s plan.', Cheeky: 'Honest pick. The facts agree enough to plan.', Unfiltered: 'Agreed, it’s the likeliest. Plan time.' },
        hFearWeak: { Jolly: 'That’s your hunch, and that’s allowed. Still a maybe.', Cheeky: 'Bold. Still just one district though.', Unfiltered: 'Your call. A maybe, not a fact.' },
        hOther: { Jolly: 'Noted! Your hunch lives in {name}.', Cheeky: '{name}. Nice. Still a maybe.', Unfiltered: 'Hunch: {name}. Worth checking.' },
        endWeak: { Jolly: 'Look at that map. One set of facts, {n} roads.', Cheeky: 'Turns out my scary road had neighbours. Lots of them.', Unfiltered: '{n} explanations fit. The fear is one district.' },
        endSerious: { Jolly: 'Every road checked, and a plan for the one that matters.', Cheeky: 'Real worry, real plan. That’s pro driving.', Unfiltered: 'All checked. Plan set. Do step one.' },
        endCare: { Jolly: 'Every road checked. Next, get the real facts from someone who knows.', Cheeky: 'Map done. Now ask someone qualified for the facts.', Unfiltered: 'Checked them all. Get proper advice next.' }
      };

      /* ---------------- start ---------------- */
      (async () => {
        await K.intro({ title: 'Map of Maybes', sub: 'Your mind drove one road. Let’s map every road the facts allow.', how: 'Draw a route from START along a road. Pass the fact gates.', char: 'glitch', mood: 'cool' });
        st.phase = 'route';
        glitch.say(L(LINES.intro), { mood: 'happy', ms: 4200 });
        routeGuide();
      })();

      return {
        async autoplay() {
          while (st.phase === 'intro') await K.wait(120);
          const nonFear = roads.filter(r => !r.d.fear), fearR = roads.find(r => r.d.fear);
          const order = nonFear.slice(0, 2).concat(fearR ? [fearR] : [], nonFear.slice(2));
          for (const r of order) {
            while (st.phase !== 'route' && st.phase !== 'hunch') await K.wait(100);
            if (r.d.explored) continue;
            while (taxi.mode === 'return') await K.wait(60);
            const pts = r.sp, hp = await K.sim.press(hit, M.plaza.x, M.plaza.y);
            for (let i = 1; i < pts.length && !r.d.explored && st.drawing; i += 2) { await K.wait(30); hp.move(pts[i].x, pts[i].y); }
            const last = pts[pts.length - 1]; hp.move(last.x, last.y); await K.wait(40); hp.up(last.x, last.y);
            const t0 = now(); while (!r.d.explored && now() - t0 < 4000) await K.wait(80);
            while (st.phase === 'arrive') await K.wait(100);
            await K.wait(500);
          }
          while (st.phase !== 'hunch') await K.wait(100);
          await K.wait(900);
          const open = districts.filter(d => d.explored && !d.blocked);
          const pick = (serious && fearD && !fearD.blocked ? fearD : null) || open.filter(d => !d.fear).sort((a, b) => (a.plaus === 'common' ? 0 : 1) - (b.plaus === 'common' ? 0 : 1))[0] || open[0];
          const pr = K.rectIn(pin), tgt = camPt(pick.ground.x, pick.ground.y - 12);
          await K.sim.drag(pin, { x: pr.w / 2, y: pr.h * 0.4 }, { x: tgt.x - pr.x, y: tgt.y - pr.y }, 900, 22);
          while (!st.finished) await K.wait(200);
        }
      };
    }
  });
})(window.TSG_ENV);
