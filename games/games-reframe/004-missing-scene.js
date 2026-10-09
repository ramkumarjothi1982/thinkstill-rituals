/* 004 Missing Scene — Reframe · REFRAME · Memory / Replay / Rumination
 * Mechanism: rumination replays the same few frames; adding context (what came before, what else was going on, the other
 * person's side) changes what the memory means. Perspective taking and contextualising (Watkins 2008 on concrete,
 * contextual processing versus abstract rumination; perspective taking in cognitive therapy). The player splices possible
 * scenes into the gaps, replays the new cut, discovers the feared final frame was never filmed, and picks an honest ending.
 * Verb: splice (drag scene cards into the "?" gaps, press play, pick the ending). Finale: premiere night in a tiny cinema:
 * the projector beam lights the new final frame, the bubble cast audience cheers and popcorn flies.
 */
(function (env) {
  'use strict';
  const PIC = {
    phone: '<rect x="44" y="12" width="32" height="56" rx="6" fill="var(--ink)"/><rect x="48" y="19" width="24" height="38" rx="2" fill="var(--bg)"/><rect x="51" y="24" width="15" height="7" rx="3" fill="var(--ink)"/><rect x="55" y="35" width="14" height="7" rx="3" fill="var(--hi)"/><circle cx="60" cy="62" r="2.4" fill="var(--bg)"/><path d="M84 26q10-8 18 0M86 33q7-5 13 0" stroke="var(--ink)" stroke-width="3" fill="none" stroke-linecap="round"/>',
    meeting: '<circle cx="36" cy="28" r="9" fill="var(--ink)"/><path d="M22 58q14-22 28 0z" fill="var(--ink)"/><circle cx="84" cy="28" r="9" fill="var(--ink)"/><path d="M70 58q14-22 28 0z" fill="var(--ink)"/><rect x="18" y="56" width="84" height="7" rx="2" fill="var(--hi)"/><path d="M50 30q10-7 20 0" stroke="var(--ink)" stroke-width="2.5" fill="none" stroke-dasharray="3 4"/>',
    clock: '<circle cx="60" cy="40" r="25" fill="var(--bg)" stroke="var(--ink)" stroke-width="5"/><path d="M60 40V25M60 40l11 7" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/><circle cx="60" cy="40" r="3" fill="var(--hi)"/><path d="M28 18l-8-6M92 18l8-6" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/>',
    people: '<circle cx="30" cy="30" r="8" fill="var(--ink)"/><path d="M18 64q12-24 24 0z" fill="var(--ink)"/><circle cx="60" cy="26" r="9" fill="var(--ink)"/><path d="M46 64q14-27 28 0z" fill="var(--ink)"/><circle cx="90" cy="30" r="8" fill="var(--ink)"/><path d="M78 64q12-24 24 0z" fill="var(--ink)"/><rect x="25" y="44" width="9" height="13" rx="2" fill="var(--hi)"/><rect x="86" y="44" width="9" height="13" rx="2" fill="var(--hi)"/>',
    home: '<path d="M20 64V36l40-22 40 22v28z" fill="var(--ink)"/><rect x="34" y="40" width="16" height="13" fill="var(--hi)"/><rect x="70" y="40" width="16" height="24" fill="var(--bg)"/><circle cx="42" cy="20" r="0" fill="none"/><path d="M84 14q6-6 4-12" stroke="var(--ink)" stroke-width="3" fill="none"/>',
    stage: '<path d="M30 8l-14 60h88L90 8z" fill="var(--hi)" opacity=".45"/><circle cx="60" cy="30" r="8" fill="var(--ink)"/><path d="M48 56q12-22 24 0z" fill="var(--ink)"/><rect x="44" y="52" width="32" height="16" rx="2" fill="var(--ink)"/><rect x="10" y="66" width="100" height="6" fill="var(--ink)"/>',
    mind: '<path d="M42 66V52q-14-4-14-20 0-18 22-20 24-2 30 16 3 9-4 12l4 8h-8v10z" fill="var(--ink)"/><path d="M70 10q8-8 18-2 8-4 14 4 8 2 6 10-2 8-12 6H76q-10 0-8-10z" fill="var(--hi)"/><path d="M84 26l-4 9h6l-5 10" stroke="var(--ink)" stroke-width="2.5" fill="none"/>',
    side: '<circle cx="40" cy="34" r="10" fill="var(--ink)"/><path d="M24 68q16-28 32 0z" fill="var(--ink)"/><circle cx="78" cy="22" r="13" fill="var(--hi)"/><circle cx="62" cy="34" r="4" fill="var(--hi)"/><circle cx="55" cy="40" r="2.5" fill="var(--hi)"/><path d="M72 22h12M72 27h8" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round"/>',
    busy: '<rect x="18" y="48" width="84" height="6" fill="var(--ink)"/><rect x="62" y="24" width="30" height="22" rx="2" fill="var(--ink)"/><rect x="65" y="27" width="24" height="15" fill="var(--hi)"/><circle cx="38" cy="30" r="8" fill="var(--ink)"/><path d="M26 48q12-20 24 0z" fill="var(--ink)"/><circle cx="30" cy="12" r="7" fill="none" stroke="var(--ink)" stroke-width="2.5"/><path d="M30 12V8M30 12h3" stroke="var(--ink)" stroke-width="2"/>',
    unknown: '<circle cx="60" cy="28" r="11" fill="none" stroke="var(--ink)" stroke-width="3" stroke-dasharray="4 4"/><path d="M42 68q18-30 36 0" fill="none" stroke="var(--ink)" stroke-width="3" stroke-dasharray="4 4"/><text x="60" y="34" text-anchor="middle" font-size="16" font-weight="800" fill="var(--hi)" font-family="sans-serif">?</text>',
    both: '<circle cx="38" cy="30" r="9" fill="var(--ink)"/><path d="M24 64q14-24 28 0z" fill="var(--ink)"/><circle cx="82" cy="30" r="9" fill="var(--ink)"/><path d="M68 64q14-24 28 0z" fill="var(--ink)"/><path d="M50 22q10-10 20 0M52 26h16" stroke="var(--hi)" stroke-width="3" fill="none" stroke-linecap="round"/>'
  };
  const svg = (k) => '<svg viewBox="0 0 120 80" aria-hidden="true" preserveAspectRatio="xMidYMid meet">' + (PIC[k] || PIC.people) + '</svg>';
  /* No GPU (VMs, blocklisted devices): every canvas pixel is rasterised on the CPU, so the canvas runs at 1x and ~30 fps
   * there (even motion beats dropped frames). Devices with a GPU keep the crisp 2x, 60 fps picture. */
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
  /* K.canvas with an opaque backing store: the scene covers every pixel, so the compositor never blends what's under it. */
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
  /* the kit's particles, drawn with cached glow sprites instead of a fresh gradient per particle per frame */
  function particleDrawer(K) {
    const cache = {}, TAU = Math.PI * 2;
    const glow = (col) => cache[col] || (cache[col] = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return c; })());
    return (g, P) => {
      for (const q of P.list) {
        const p = q.p, k = 1 - q.age / q.life, a = p.flicker ? k * (0.6 + 0.4 * Math.sin(q.age * 30 + q.ph)) : k, s = q.size * (p.grow ? 1 + (1 - k) * 1.6 : 1);
        g.globalAlpha = Math.max(0, Math.min(1, a));
        if (p.glow) g.drawImage(glow(q.col), q.x - s * 3, q.y - s * 3, s * 6, s * 6);
        g.fillStyle = q.col; g.strokeStyle = q.col;
        if (p.star) { K.starPath(g, q.x, q.y, s * 1.6, s * 0.6, 4, q.rot); g.fill(); }
        else if (p.rect) { g.save(); g.translate(q.x, q.y); g.rotate(q.rot); g.fillRect(-s / 2, -s / 4, s, s / 2); g.restore(); }
        else if (p.petal) { g.save(); g.translate(q.x, q.y); g.rotate(q.rot); g.beginPath(); g.ellipse(0, 0, s, s * 0.5, 0, 0, TAU); g.fill(); g.restore(); }
        else if (p.ring) { g.lineWidth = 1.2; g.beginPath(); g.arc(q.x, q.y, s, 0, TAU); g.stroke(); }
        else { g.beginPath(); g.arc(q.x, q.y, s, 0, TAU); g.fill(); }
      }
      g.globalAlpha = 1;
    };
  }
  (env.games = env.games || []).push({
    id: 'missing-scene', mode: 'reframe', name: 'Missing Scene', verb: 'splice', family: 'REFRAME', minutes: 2,
    parents: ['Memory / Replay / Rumination', 'Social / Team / Perspective'],
    cast: ['drop'], poster: { char: 'drop', mood: 'happy' },
    tagline: 'Splice the missing scenes into a memory on repeat. Then roll it.',
    why: 'For a moment you keep replaying: add the context the replay cut out, then watch it again.',
    css: `
.g-missing-scene { --ms-film: #1a1410; --ms-table: #fff4dc; --ms-ink: #2a1d10; }
.g-missing-scene .ms-meter { position: absolute; z-index: 20; left: 50%; transform: translateX(-50%); top: calc(env(safe-area-inset-top, 0px) + 60px); width: min(420px, calc(100% - 24px)); display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px;
  padding: 7px 11px; border-radius: 12px; background: color-mix(in srgb, var(--ui-surface) 94%, transparent); border: 1px solid var(--ui-line); box-shadow: 0 8px 20px rgba(0, 0, 0, .3); font: 800 12px/1 var(--font-ui); letter-spacing: .1em; text-transform: uppercase; color: var(--ui-muted); pointer-events: none; }
.g-missing-scene .ms-meter b { color: var(--ui-fg); }
.g-missing-scene .ms-track { position: relative; height: 12px; border-radius: 6px; background: linear-gradient(90deg, #e2394f, #f08a3c 40%, #f4c64e 62%, #5fd39a); box-shadow: inset 0 1px 3px rgba(0, 0, 0, .35); }
.g-missing-scene .ms-needle { position: absolute; top: -6px; width: 4px; height: 24px; margin-left: -2px; border-radius: 2px; background: var(--ui-fg); box-shadow: 0 0 0 2px var(--ui-surface), 0 2px 6px rgba(0, 0, 0, .4); left: calc(var(--tone, .1) * 100%); transition: left .9s cubic-bezier(.2, 1.6, .4, 1); }
.g-missing-scene .ms-table { position: absolute; z-index: 10; border-radius: 18px; background: radial-gradient(120% 90% at 50% 40%, #fffaf0, #f6e6c4 70%, #e8d2a6); box-shadow: 0 0 0 6px #3a2a1a, 0 0 60px rgba(255, 236, 190, .35), 0 20px 40px rgba(0, 0, 0, .5); }
.g-missing-scene .ms-strip { position: absolute; z-index: 12; display: flex; }
.g-missing-scene .ms-strip.v { flex-direction: column; gap: 8px; }
.g-missing-scene .ms-strip.h { flex-direction: row; gap: 10px; align-items: flex-start; }
.g-missing-scene .ms-row { display: flex; align-items: center; gap: 10px; min-height: 64px; }
.g-missing-scene .ms-strip.h .ms-row { flex-direction: column; align-items: center; width: var(--cw, 150px); gap: 8px; }
.g-missing-scene .ms-film { position: relative; flex: none; width: 88px; padding: 6px 13px; background: var(--ms-film); border-radius: 3px;
  background-image: radial-gradient(circle at 6px 50%, #e9dcc0 2.4px, transparent 2.8px), radial-gradient(circle at calc(100% - 6px) 50%, #e9dcc0 2.4px, transparent 2.8px); background-size: 100% 10px; background-repeat: repeat-y; box-shadow: 0 3px 8px rgba(0, 0, 0, .35); }
.g-missing-scene .ms-strip.h .ms-film { width: var(--cw, 150px); padding: 13px 6px; background-image: radial-gradient(circle at 50% 6px, #e9dcc0 2.4px, transparent 2.8px), radial-gradient(circle at 50% calc(100% - 6px), #e9dcc0 2.4px, transparent 2.8px); background-size: 12px 100%; background-repeat: repeat-x; }
.g-missing-scene .ms-pic { --ink: #3a2412; --bg: #f3dfb8; --hi: #b9622f; position: relative; height: 48px; border-radius: 2px; overflow: hidden; background: linear-gradient(160deg, #f6e4c0, #d8b07a);
  filter: saturate(calc(1 + var(--harsh, 1) * 1.8)) hue-rotate(calc(var(--harsh, 1) * -26deg)) contrast(calc(1 + var(--harsh, 1) * .2)); transition: filter 1.2s ease; }
.g-missing-scene .ms-strip.h .ms-pic { height: 92px; }
.g-missing-scene .ms-pic svg { width: 100%; height: 100%; display: block; }
.g-missing-scene .ms-pic::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(90deg, transparent 0 23px, rgba(60, 30, 10, .08) 23px 24px); pointer-events: none; }
.g-missing-scene .ms-num { position: absolute; right: 3px; bottom: 2px; font: 800 12px/1 var(--font-ui); color: #fff3d6; text-shadow: 0 1px 2px #000; }
.g-missing-scene .ms-cap { flex: 1; min-width: 0; font: 600 15px/1.28 var(--font-ui); color: var(--ms-ink); }
.g-missing-scene .ms-strip.h .ms-cap { text-align: center; }
.g-missing-scene .ms-cap .gk-user { font: 600 15px/1.28 var(--font-ui); }
.g-missing-scene .ms-cap small { display: block; font: 800 12px/1 var(--font-ui); letter-spacing: .1em; text-transform: uppercase; color: #9a5a1c; margin-bottom: 3px; }
.g-missing-scene .ms-cap.brain small { color: #b3233c; }
.g-missing-scene .ms-gap .ms-pic { background: repeating-linear-gradient(45deg, #2a2017 0 8px, #33281d 8px 16px); display: grid; place-items: center; filter: none; outline: 2px dashed #ffcf6b; outline-offset: -4px; animation: ms-gapflick 2.4s ease-in-out infinite; }
.g-missing-scene .ms-gap .ms-pic b { font: 800 26px/1 var(--font-display); color: #ffcf6b; text-shadow: 0 0 10px rgba(255, 207, 107, .8); }
.g-missing-scene .ms-gap .ms-cap { color: #8a6a3a; font-style: italic; font-weight: 500; }
.g-missing-scene .ms-gap.next .ms-pic { box-shadow: 0 0 0 2px rgba(255, 207, 107, .5), 0 0 18px rgba(255, 207, 107, .55); }
.g-missing-scene .ms-gap.hot .ms-pic { outline-color: #fff; box-shadow: 0 0 0 3px #ffcf6b, 0 0 22px rgba(255, 207, 107, .9); animation: none; }
.g-missing-scene .ms-gap.filled .ms-pic { outline: 2px solid #ffcf6b; animation: ms-splice .6s cubic-bezier(.2, 1.5, .4, 1); }
.g-missing-scene .ms-gap.filled .ms-cap { font-style: normal; font-weight: 600; color: var(--ms-ink); }
.g-missing-scene .ms-gap.filled .ms-film::after { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 9px; margin-top: -4.5px; background: rgba(255, 244, 200, .55); box-shadow: 0 0 6px rgba(255, 220, 140, .6); }
@keyframes ms-gapflick { 0%, 100% { opacity: 1; } 50% { opacity: .78; } }
@keyframes ms-splice { 0% { transform: scale(1.25); filter: brightness(2); } 100% { transform: none; } }
.g-missing-scene .ms-bin { position: absolute; z-index: 14; display: grid; gap: 8px; }
.g-missing-scene .ms-bintitle { grid-column: 1 / -1; font: 800 12px/1 var(--font-ui); letter-spacing: .12em; text-transform: uppercase; color: var(--ui-muted); text-align: center; }
.g-missing-scene .ms-card { position: relative; touch-action: none; cursor: grab; border-radius: 10px; padding: 8px 10px 9px; min-height: 64px; background: linear-gradient(180deg, #fffaf0, #f3e3c2); color: #2a1d10; box-shadow: 0 2px 0 #cdb486, 0 8px 16px rgba(0, 0, 0, .35);
  display: flex; flex-direction: column; gap: 3px; transition: opacity .25s ease, transform .2s cubic-bezier(.2, 1.4, .4, 1); animation: ms-cardin .5s cubic-bezier(.2, 1.3, .4, 1) backwards; }
.g-missing-scene .ms-card small { font: 800 12px/1 var(--font-ui); letter-spacing: .08em; text-transform: uppercase; color: #9a5a1c; }
.g-missing-scene .ms-card span { font: 600 14px/1.25 var(--font-ui); display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; overflow: hidden; }
.g-missing-scene .ms-bin.compact .ms-card span { font-size: 13px; -webkit-line-clamp: 4; overflow-wrap: anywhere; }
.g-missing-scene .ms-bin.compact .ms-card.extra:not(.used) { display: none; }
.g-missing-scene .ms-bin.compact .ms-card small { overflow-wrap: anywhere; }
.g-missing-scene .ms-bin.compact .ms-bintitle { display: none; }
.g-missing-scene .ms-cap .gk-user { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; overflow: hidden; }
.g-missing-scene .ms-card:focus-visible { outline: 3px solid #ffcf6b; outline-offset: 2px; }
.g-missing-scene .ms-card.lift { opacity: .3; transform: scale(.96); }
.g-missing-scene .ms-card.used { opacity: 0; transform: scale(.8); pointer-events: none; }
.g-missing-scene .ms-ghost { position: absolute; z-index: 60; pointer-events: none; transform: rotate(-3deg) scale(1.06); box-shadow: 0 2px 0 #cdb486, 0 22px 36px rgba(0, 0, 0, .55); animation: none; }
@keyframes ms-cardin { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
.g-missing-scene .ms-play { position: absolute; z-index: 22; left: 50%; transform: translateX(-50%); min-width: 230px; min-height: 58px; font: 800 18px/1 var(--font-display); letter-spacing: .04em; border-radius: 999px; border: 0; cursor: pointer;
  background: linear-gradient(180deg, #ff6b6b, #d6283f); color: #fff; box-shadow: 0 5px 0 #8a1023, 0 14px 30px rgba(214, 40, 63, .45); animation: ms-pulse 1.4s ease-in-out infinite; }
.g-missing-scene .ms-play:active { transform: translateX(-50%) translateY(4px); box-shadow: 0 1px 0 #8a1023; }
.g-missing-scene .ms-play:focus-visible { outline: 3px solid #fff; outline-offset: 4px; }
@keyframes ms-pulse { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.05); } }
.g-missing-scene .ms-viewer { position: absolute; z-index: 40; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 10px; pointer-events: auto; }
.g-missing-scene .ms-screen { position: relative; border-radius: 6px; overflow: hidden; background: #f6e4c0; box-shadow: 0 0 0 4px #0c0906, 0 0 60px rgba(255, 236, 190, .55); animation: ms-flicker .18s steps(2) infinite; }
.g-missing-scene .ms-screen .ms-pic { height: 100%; }
.g-missing-scene .ms-screen::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(40, 20, 5, .45)), repeating-linear-gradient(0deg, rgba(0, 0, 0, .05) 0 1px, transparent 1px 3px); }
.g-missing-scene .ms-screen.glitch { animation: ms-glitch .5s steps(3) 3; }
.g-missing-scene .ms-scap { width: 100%; text-align: center; font: 600 17px/1.32 var(--font-ui); color: #fff6e0; text-shadow: 0 2px 8px rgba(0, 0, 0, .7); min-height: 2.6em; }
.g-missing-scene .ms-scap small { display: block; font: 800 12px/1 var(--font-ui); letter-spacing: .14em; text-transform: uppercase; color: #ffcf6b; margin-bottom: 6px; }
.g-missing-scene .ms-scap.added small { color: #7ee6b0; }
.g-missing-scene .ms-scap s { text-decoration-thickness: 2px; text-decoration-color: #ff5f78; opacity: .75; }
.g-missing-scene .ms-stamp { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) rotate(-8deg); font: 900 22px/1 var(--font-display); letter-spacing: .08em; color: #c8102e; border: 4px solid #c8102e; padding: 6px 12px; border-radius: 8px; background: rgba(255, 246, 230, .9); animation: ms-stampin .45s cubic-bezier(.2, 1.6, .4, 1) both; white-space: nowrap; }
@keyframes ms-stampin { from { opacity: 0; transform: translate(-50%, -50%) rotate(-8deg) scale(2.4); } to { opacity: 1; transform: translate(-50%, -50%) rotate(-8deg); } }
@keyframes ms-flicker { 0% { opacity: 1; } 50% { opacity: .94; } }
@keyframes ms-glitch { 0% { transform: translate(-4px, 1px) skewX(4deg); filter: hue-rotate(40deg); } 33% { transform: translate(4px, -2px) skewX(-6deg); } 66% { transform: translate(-2px, 2px); filter: invert(.15); } 100% { transform: none; filter: none; } }
.g-missing-scene .ms-ends { position: absolute; z-index: 44; left: 50%; transform: translateX(-50%); width: min(400px, calc(100% - 24px)); display: flex; flex-direction: column; gap: 10px; }
.g-missing-scene .ms-ends > b { font: 800 13px/1.2 var(--font-ui); letter-spacing: .12em; text-transform: uppercase; color: #ffcf6b; text-align: center; text-shadow: 0 2px 6px rgba(0, 0, 0, .6); }
.g-missing-scene .ms-end { appearance: none; text-align: left; cursor: pointer; border: 0; border-radius: 12px; padding: 11px 14px 12px; background: linear-gradient(180deg, #fffaf0, #f3e3c2); color: #2a1d10; box-shadow: 0 3px 0 #cdb486, 0 12px 24px rgba(0, 0, 0, .45);
  display: flex; flex-direction: column; gap: 4px; animation: ms-cardin .5s cubic-bezier(.2, 1.3, .4, 1) backwards; }
.g-missing-scene .ms-end:nth-child(3) { animation-delay: .1s; } .g-missing-scene .ms-end:nth-child(4) { animation-delay: .2s; }
.g-missing-scene .ms-end small { font: 800 12px/1 var(--font-ui); letter-spacing: .1em; text-transform: uppercase; color: #1e7a4c; }
.g-missing-scene .ms-end span { font: 600 15px/1.32 var(--font-ui); }
.g-missing-scene .ms-end:active { transform: scale(.97); }
.g-missing-scene .ms-end:focus-visible { outline: 3px solid #ffcf6b; outline-offset: 3px; }
.g-missing-scene .ms-end.pick { box-shadow: 0 0 0 3px #7ee6b0, 0 14px 28px rgba(0, 0, 0, .5); }
.g-missing-scene .ms-end.gone { opacity: 0; transform: translateY(16px) scale(.92); transition: all .3s ease; }
.g-missing-scene .ms-final { position: absolute; z-index: 42; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; padding: 10px 16px; color: #2a1d10; pointer-events: none; animation: ms-fadein 1.1s ease .3s both; overflow: hidden; }
@keyframes ms-fadein { from { opacity: 0; } to { opacity: 1; } }
.g-missing-scene .ms-final small { font: 800 12px/1 var(--font-ui); letter-spacing: .16em; text-transform: uppercase; color: #9a2a3a; }
.g-missing-scene .ms-final b { font: 800 clamp(22px, 6.4cqw, 30px)/1.05 var(--font-display); }
.g-missing-scene .ms-final span { font: 600 clamp(16px, 2.1cqw, 26px)/1.3 var(--font-ui); text-wrap: balance; }
.g-missing-scene .ms-final small { font-size: clamp(12px, 1.1cqw, 14px); }
.g-missing-scene .gk-char { left: 14px; bottom: calc(env(safe-area-inset-bottom, 0px) + 14px); }
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
      const leads = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text);
      const lead = (k) => clip((leads.find(l => l.kind === k) || leads[0] || { text: 'Ask one simple question that would fill the gap.' }).text, 120);

      /* ---------------- the reel: footage (exhibits), the feared final frame, the gaps and the bin ---------------- */
      const words = (t) => String(t || '').replace(/[^A-Za-z0-9’' ]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
      const exh = (Array.isArray(an.exhibits) ? an.exhibits : []).filter(e => e && e.text && words(e.text) >= 3);
      const witness = exh.find(e => String(e.id) === String(an.witness_id)) || exh.filter(e => e.kind === 'brain').slice(-1)[0] || null;
      const picFor = (t, kind) => {
        t = String(t || '').toLowerCase();
        if (/\b(text|texted|message|messaged|email|emailed|reply|replied|read|seen|dm|whatsapp)\b/.test(t)) return 'phone';
        if (/\b(presentation|speech|talk|stage|class|um)\b/.test(t)) return 'stage';
        if (/\b(boss|manager|meeting|chat|team|colleague|client|work)\b/.test(t)) return 'meeting';
        if (/\b(dinner|bed|home|partner|quiet|tired|kitchen|evening)\b/.test(t)) return 'home';
        if (/\b(\d+(:\d+)?\s?(am|pm)|hours?|minutes?|tonight|late|now)\b/.test(t)) return 'clock';
        if (/\b(people|everyone|looked|phones|friend|they)\b/.test(t)) return 'people';
        return kind === 'brain' ? 'mind' : 'people';
      };
      let shots = exh.filter(e => e !== witness).slice(0, inten === 0 ? 2 : 3).map(e => ({ text: clip(e.text, 92), kind: e.kind === 'camera' ? 'camera' : 'brain', pic: picFor(e.text, e.kind), type: 'shot' }));
      if (!shots.length) shots = [{ text: clip(an.situation || 'Something happened.', 110), kind: 'camera', pic: picFor(an.situation, 'camera'), type: 'shot' }];
      const ending = { text: clip(witness ? witness.text : (an.conclusion || 'It means the worst.'), 92), kind: 'brain', pic: 'mind', type: 'end' };
      const frames = shots.concat([ending]);
      // gaps: between every pair of frames, plus "before" when there are too few
      const seq = [];
      if (frames.length < 3 || inten === 2) seq.push({ type: 'gap', label: 'Before' });
      frames.forEach((f, i) => { seq.push(f); if (i < frames.length - 1) seq.push({ type: 'gap', label: i === frames.length - 2 ? 'Just before the ending' : 'In between' }); });
      while (seq.filter(x => x.type === 'gap').length > 3) { const gi = seq.findIndex(x => x.type === 'gap'); seq.splice(gi, 1); }
      const gaps = seq.filter(x => x.type === 'gap');
      const alts = (Array.isArray(an.alternatives) ? an.alternatives : []).filter(a => a && !a.fear && a.theory).slice(0, 3);
      const unk = (Array.isArray(an.unknowns) ? an.unknowns : []).filter(u => u && u.text).slice(0, 2);
      const TAGS = ['Their side · maybe', 'Meanwhile · maybe', 'Also possible'];
      const PICS = ['side', 'busy', 'both'];
      const cand = [];
      alts.forEach((a, i) => cand.push({ tag: TAGS[i], text: clip(a.theory, 72), pic: PICS[i] }));
      unk.forEach((u, i) => cand.splice(Math.min(cand.length, 1 + i * 2), 0, { tag: 'Not filmed', text: clip(u.text, 72), pic: 'unknown' }));
      while (cand.length < gaps.length + 1) cand.push({ tag: 'Also possible', text: ['Something on their side you can’t see.', 'An ordinary reason nobody mentioned.', 'A moment that went fine and got forgotten.'][cand.length % 3], pic: 'both' });
      const bin = cand.slice(0, Math.min(4, Math.max(3, gaps.length + 1)));

      /* ---------------- daily look ---------------- */
      const STOCKS = [{ key: 'sepia', glow: '#ffe7b0', room0: '#1d140c', room1: '#0a0705', curtain: '#9b1c2c' }, { key: 'noir', glow: '#e8eeff', room0: '#121620', room1: '#06070b', curtain: '#3d2a6e' }, { key: 'technicolor', glow: '#ffd9ef', room0: '#1d1020', room1: '#09050b', curtain: '#b8204a' }];
      const stock = K.dailyPick(STOCKS, 6);
      const STUBS = ['Golden Ticket', 'Silver Reel', 'Velvet Seat', 'Popcorn Crown', 'Director’s Chair', 'Spotlight Pin', 'Clapperboard'];
      const stub = K.dailyPick(STUBS, 7);

      /* ---------------- state ---------------- */
      const st = { phase: 'intro', tone: 0.1, filled: 0, drops: [], drag: null, hot: null, viewer: null, endPick: null, finished: false, reels: 0, reelSpeed: 0.4, beam: 0, cinema: 0, cheer: 0, harsh: 1 };
      const M = { w: 0, h: 0, phone: true, table: { x: 0, y: 0, w: 0, h: 0 } };
      const P = K.particles(), drawP = particleDrawer(K);
      const pop = [];

      /* ---------------- DOM ---------------- */
      const SOFT = softwareGfx(), cvOpts = { maxDpr: SOFT ? 1 : 2 }, cv = opaqueCanvas(el, cvOpts, S), qual = { acc: 0, n: 0, steps: 0 };
      const room = document.createElement('canvas'); let roomOK = false, roomKey = '', msDirty = true;
      const meter = h('div', { class: 'ms-meter', role: 'meter', 'aria-label': 'Tone of the memory', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '10' }, h('span', { text: 'Harsh' }), h('div', { class: 'ms-track' }, h('i', { class: 'ms-needle' })), h('b', { text: 'Balanced' }));
      const table = h('div', { class: 'ms-table', 'aria-hidden': 'true' });
      const strip = h('div', { class: 'ms-strip', role: 'list', 'aria-label': 'The memory, frame by frame' });
      const binEl = h('div', { class: 'ms-bin', role: 'group', 'aria-label': 'Possible missing scenes' });
      el.append(table, strip, binEl, meter);
      const drop = K.character('drop', { side: 'right', mood: 'think', size: K.phone() ? 72 : 92 });
      const music = K.music('musicbox'); music.level(0.6);
      let motor = null;
      function beds() { if (!A.ctx || motor) return; motor = A.loop({ filter: 'lowpass', freq: 120, q: 3, bus: 'amb' }); S.onDestroy(() => motor && motor.stop()); }
      beds(); S.on('audio-ready', beds);
      const BEAT = () => 60 / (music.bpm || 84);
      function nextBeat(div) { const bl = BEAT() / (div || 1); if (!A.ctx) return 0; const t = A.now(); if (!music.next) return t + 0.04; let q = music.next; while (q - bl > t + 0.03) q -= bl; while (q < t + 0.03) q += bl; return q; }
      const BOX = ['C6', 'E6', 'G6', 'A6', 'C7', 'E7'];

      function setTone(v) { msDirty = true; st.tone = clamp(v, 0, 1); meter.style.setProperty('--tone', st.tone.toFixed(3)); meter.setAttribute('aria-valuenow', String(Math.round(st.tone * 100))); st.harsh = 1 - st.tone; strip.style.setProperty('--harsh', st.harsh.toFixed(3)); }
      setTone(0.1);

      /* ---------------- build the strip and the bin ---------------- */
      const rows = seq.map((f, i) => {
        if (f.type === 'gap') {
          const r = h('div', { class: 'ms-row ms-gap', role: 'listitem', 'aria-label': 'Missing scene: empty' }, h('div', { class: 'ms-film' }, h('div', { class: 'ms-pic', html: '<b>?</b>' })), h('div', { class: 'ms-cap', html: '<small>Missing scene</small>' + f.label + ': not in the replay' }));
          f.el = r; return r;
        }
        const r = h('div', { class: 'ms-row', role: 'listitem' }, h('div', { class: 'ms-film' }, h('div', { class: 'ms-pic', html: svg(f.pic) }, h('span', { class: 'ms-num', text: String(frames.indexOf(f) + 1) }))),
          h('div', { class: 'ms-cap' + (f.kind === 'brain' ? ' brain' : '') }, h('small', { text: f.type === 'end' ? 'The ending you replay' : f.kind === 'camera' ? 'Footage' : 'How it felt' }), h('span', { class: 'gk-user', text: f.text })));
        f.el = r; void i; return r;
      });
      strip.append(...rows);
      binEl.append(h('div', { class: 'ms-bintitle', text: 'Possible scenes · drag one into a gap' }));
      bin.forEach((c, i) => {
        const card = h('div', { class: 'ms-card', role: 'button', tabindex: '0', 'aria-label': 'Possible scene: ' + c.text + '. Press Enter to splice it into the next gap.' }, h('small', { text: c.tag }), h('span', { text: c.text }));
        card.style.animationDelay = (0.08 * i + 0.2) + 's';
        if (i >= 3) card.classList.add('extra');
        c.el = card; binEl.append(card); bindCard(c);
      });

      /* ---------------- layout ---------------- */
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        M.w = W; M.h = H; M.phone = W < 700;
        const vertical = W < 820;
        strip.classList.toggle('v', vertical); strip.classList.toggle('h', !vertical);
        if (vertical) {
          const top = 112, x = 18, w = W - 36;
          Object.assign(strip.style, { left: x + 'px', top: top + 'px', width: w + 'px', right: 'auto' });
          const sh = strip.offsetHeight || 380;
          M.table = { x: 10, y: top - 12, w: W - 20, h: sh + 24 };
          const by = top + sh + 26;
          binEl.classList.remove('compact');
          Object.assign(binEl.style, { left: '12px', right: '12px', top: by + 'px', width: 'auto', gridTemplateColumns: '1fr 1fr' });
          // never let the bin reach the character: fall back to one compact row
          const limit = K.rectIn(drop.el).y - 10;
          if (by + binEl.offsetHeight > limit) { binEl.classList.add('compact'); binEl.style.gridTemplateColumns = 'repeat(' + Math.min(3, bin.length) + ', minmax(0, 1fr))'; binEl.style.top = Math.max(top + sh + 12, Math.min(by, limit - binEl.offsetHeight)) + 'px'; }
        } else {
          const n = seq.length, cw = Math.min(170, Math.floor((W - 160) / n) - 10);
          strip.style.setProperty('--cw', cw + 'px');
          const w = n * (cw + 10) - 10, x = Math.round((W - w) / 2), top = 128;
          Object.assign(strip.style, { left: x + 'px', top: top + 'px', width: w + 'px' });
          const sh = strip.offsetHeight || 260;
          M.table = { x: x - 26, y: top - 24, w: w + 52, h: sh + 48 };
          const bw = Math.min(980, W - 200);
          Object.assign(binEl.style, { left: Math.round((W - bw) / 2) + 'px', right: 'auto', width: bw + 'px', top: (top + sh + 52) + 'px', gridTemplateColumns: 'repeat(' + bin.length + ', 1fr)' });
        }
        Object.assign(table.style, { left: M.table.x + 'px', top: M.table.y + 'px', width: M.table.w + 'px', height: M.table.h + 'px' });
        if (st.playBtn) placePlay();
        roomOK = false; st.screenRect = null; st.fullN = 3; msDirty = true;
      }
      cv.onResize(() => layout());
      S.later(layout, 60);
      S.on('theme', () => { msDirty = true; roomOK = false; st.fullN = 3; });

      /* ---------------- drag a scene into a gap ---------------- */
      function gapAt(p) {
        let best = null, bd = 1e9;
        gaps.forEach(g => { if (g.filled) return; const r = (st.gapRects && st.gapRects.get(g)) || K.rectIn(g.el.querySelector('.ms-pic')), cx = r.cx, cy = r.cy, d = Math.hypot(p.x - cx, p.y - cy); const reach = Math.max(70, r.w * 0.9); if (d < reach && d < bd) { bd = d; best = { g, d, reach }; } });
        return best;
      }
      function bindCard(c) {
        K.drag(c.el, {
          space: el,
          start: (p) => {
            if (st.phase !== 'splice' || c.used) return false;
            const r = K.rectIn(c.el);
            const ghost = c.el.cloneNode(true); ghost.classList.add('ms-ghost'); ghost.removeAttribute('tabindex'); ghost.removeAttribute('role');
            Object.assign(ghost.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
            el.append(ghost); c.el.classList.add('lift');
            st.drag = { c, ghost, ox: p.x - r.x, oy: p.y - r.y, r };
            st.gapRects = new Map(gaps.filter(g => !g.filled).map(g => [g, K.rectIn(g.el.querySelector('.ms-pic'))]));
            K.sfx.pop(undefined, 640); if (A.ctx) A.paper({ vol: 0.08 });
            K.guide(null);
          },
          move: (p) => {
            const d = st.drag; if (!d) return;
            d.ghost.style.left = (p.x - d.ox) + 'px'; d.ghost.style.top = (p.y - d.oy) + 'px';
            const hit = gapAt(p), g = hit && hit.g;
            if (g !== st.hot) { if (st.hot) st.hot.el.classList.remove('hot'); st.hot = g; if (g) { g.el.classList.add('hot'); if (A.ctx) A.chime(A.note('G5'), { vol: 0.03, dur: 0.4 }); } }
          },
          end: (p) => {
            const d = st.drag; if (!d) return; st.drag = null;
            if (st.hot) st.hot.el.classList.remove('hot'); st.hot = null;
            const hit = gapAt(p); st.gapRects = null;
            if (hit) splice(d, hit.g, 1 - hit.d / hit.reach);
            else { // spring back
              K.sfx.soft();
              Object.assign(d.ghost.style, { transition: 'left .3s cubic-bezier(.2,1.3,.4,1), top .3s cubic-bezier(.2,1.3,.4,1)', left: d.r.x + 'px', top: d.r.y + 'px' });
              K.later(() => { d.ghost.remove(); d.c.el.classList.remove('lift'); }, 320);
              spliceGuide();
            }
          }
        });
        S.listen(c.el, 'keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && st.phase === 'splice' && !c.used) { e.preventDefault(); const g = gaps.find(x => !x.filled); if (!g) return; const r = K.rectIn(c.el); const ghost = c.el.cloneNode(true); ghost.classList.add('ms-ghost'); Object.assign(ghost.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' }); el.append(ghost); c.el.classList.add('lift'); splice({ c, ghost, r }, g, 0.8); } });
      }
      function splice(d, g, precision) {
        const c = d.c; c.used = true; g.filled = c; st.filled++;
        st.drops.push(clamp(precision, 0, 1));
        const pr = K.rectIn(g.el.querySelector('.ms-pic'));
        Object.assign(d.ghost.style, { transition: 'all .28s cubic-bezier(.2,1.2,.4,1)', left: pr.x + 'px', top: pr.y + 'px', width: pr.w + 'px', height: pr.h + 'px', opacity: '0.2', transform: 'none' });
        K.later(() => d.ghost.remove(), 300);
        c.el.classList.remove('lift'); c.el.classList.add('used');
        // the gap becomes a spliced scene
        const pic = g.el.querySelector('.ms-pic'); pic.innerHTML = svg(c.pic);
        const cap = g.el.querySelector('.ms-cap'); cap.innerHTML = ''; cap.append(h('small', { text: 'Added · ' + c.tag.replace(' · maybe', '') + (c.pic === 'unknown' ? '' : ' · maybe') }), document.createTextNode(c.text));
        g.el.classList.add('filled'); g.el.setAttribute('aria-label', 'Spliced scene: ' + c.text);
        // snip, tape, a music-box note, the tone needle swings
        if (A.ctx) { const t = A.now(); A.noise({ when: t, filter: 'highpass', freq: 4200, dur: 0.03, vol: 0.14 }); A.noise({ when: t + 0.07, filter: 'highpass', freq: 3800, dur: 0.03, vol: 0.12 }); A.paper({ when: t + 0.16, vol: 0.12 }); A.chime(A.note(BOX[Math.min(BOX.length - 1, st.filled + 1)]), { when: nextBeat(2), vol: 0.09, dur: 1.6 }); }
        K.sfx.good(undefined, 3 + st.filled);
        P.emit('spark', pr.cx, pr.cy, 18, { colors: ['#fff3c4', '#ffcf6b', '#7ee6b0'] });
        st.reelSpeed = 3; setTone(st.tone + (0.78 / gaps.length));
        ctx.track('splice', { n: st.filled, unknown: c.pic === 'unknown' ? 1 : 0 });
        const left = gaps.filter(x => !x.filled).length;
        if (st.filled === 1) drop.say(L(LINES.splice1), { mood: 'wow', ms: 3400 });
        else if (left) drop.say(L(LINES.splice2), { mood: 'happy', ms: 3000 });
        drop.react('bounce');
        K.later(layout, 340);
        if (!left) K.later(readyToPlay, 700); else spliceGuide(true);
      }
      function spliceGuide(quick) {
        const g = gaps.find(x => !x.filled), c = bin.find(x => !x.used && x.el.offsetParent !== null);
        gaps.forEach(x => x.el.classList.toggle('next', x === g));
        if (!g || !c) return;
        K.guide({ id: 'splice', g: 'drag', target: c.el, dir: M.phone ? 'r' : 'r', d: M.phone ? 60 : 90, label: st.filled ? 'SPLICE ANOTHER SCENE' : 'DRAG A SCENE TO A GAP', delay: quick ? 1200 : 900, place: 'above' });
      }

      /* ---------------- play the new cut ---------------- */
      function placePlay() { const b = st.playBtn; if (!b) return; const r = K.rectIn(strip); b.style.top = Math.round(Math.min(M.h - 170, r.y + r.h + 34)) + 'px'; }
      function readyToPlay() {
        st.phase = 'ready'; binEl.style.transition = 'opacity .3s ease'; binEl.style.opacity = '0'; K.later(() => { binEl.hidden = true; }, 320);
        const b = h('button', { type: 'button', class: 'ms-play', text: '▶  PLAY THE NEW CUT' });
        st.playBtn = b; el.append(b); placePlay();
        K.tap(b, () => playReel());
        drop.say(L(LINES.ready), { mood: 'celebrate', ms: 3600 });
        K.guide({ id: 'play', g: 'tap', target: b, label: 'PRESS PLAY', delay: 700 });
      }
      async function playReel() {
        if (st.phase !== 'ready') return;
        st.phase = 'playing'; K.guide(null); K.sfx.thud(); st.playBtn.remove(); st.playBtn = null;
        st.beam = 0.001; st.reelSpeed = 6; st.lightsT = now();
        [strip, table, meter].forEach(x => { x.style.transition = 'opacity .5s ease'; x.style.opacity = '0'; });
        drop.say(L(LINES.lights), { mood: 'wow', ms: 2400 });
        const viewer = h('div', { class: 'ms-viewer' });
        const scr = h('div', { class: 'ms-screen' }), cap = h('div', { class: 'ms-scap', 'aria-live': 'polite' });
        viewer.append(scr, cap); el.append(viewer); st.viewer = viewer;
        const sw = Math.min(M.w - 40, M.phone ? 340 : 520), shh = Math.round(sw * 0.6);
        Object.assign(scr.style, { width: sw + 'px', height: shh + 'px' }); viewer.style.top = (M.phone ? 118 : 120) + 'px'; viewer.style.width = sw + 'px';
        st.screen = { w: sw, h: shh };
        let skip = null; K.tap(viewer, () => { if (skip) skip(); });
        const order = seq.map(x => (x.type === 'gap' ? Object.assign({ added: true }, x.filled) : x));
        await K.wait(K.reduced() ? 300 : 900);
        for (let i = 0; i < order.length; i++) {
          const f = order[i], isEnd = f.type === 'end';
          scr.innerHTML = '<div class="ms-pic" style="--harsh:' + (isEnd ? 1 : Math.max(0, 0.6 - i * 0.12)) + '">' + svg(f.pic) + '</div>';
          cap.className = 'ms-scap' + (f.added ? ' added' : '');
          cap.replaceChildren(h('small', { text: f.added ? 'Added scene' + (f.pic === 'unknown' ? ' · not filmed' : ' · possible') : isEnd ? 'The ending you replay' : 'Frame ' + (frames.indexOf(f) + 1) }), h('span', { class: f.added ? '' : 'gk-user', text: f.text }));
          projectorTick(); st.flashT = now();
          if (isEnd) { await twist(scr, cap, f); break; }
          await new Promise(res => { skip = res; const t = nextBeat(1) ? (nextBeat(1) - (A.ctx ? A.now() : 0)) * 1000 : 0; K.later(res, (K.reduced() ? 900 : BEAT() * 2000) + Math.max(0, t)); });
          skip = null;
        }
        pickEnding();
      }
      function projectorTick() {
        if (!A.ctx) return;
        const t = A.now(); for (let i = 0; i < 10; i++) A.noise({ when: t + i * 0.075, filter: 'highpass', freq: 2600 + Math.random() * 800, dur: 0.012, vol: 0.05 + Math.random() * 0.03, pan: 0.2 });
        A.tone({ when: t, type: 'square', freq: 90, dur: 0.05, vol: 0.03, lp: 400 });
      }
      async function twist(scr, cap, f) {
        await K.wait(K.reduced() ? 600 : 1300);
        scr.classList.add('glitch'); K.sfx.glitch(); if (A.ctx) A.tone({ type: 'sawtooth', freq: 140, to: 60, glide: 0.5, dur: 0.6, vol: 0.05, lp: 900 });
        await K.wait(K.reduced() ? 200 : 700);
        cap.replaceChildren(h('small', { text: serious ? 'Not footage yet' : 'Never filmed' }), h('s', { class: 'gk-user', text: f.text }));
        scr.innerHTML = '<div class="ms-pic" style="--harsh:0">' + svg('unknown') + '</div>';
        scr.append(h('div', { class: 'ms-stamp', text: serious ? 'NOT FILMED YET' : 'NEVER FILMED' }));
        K.sfx.thud(); st.flashT = now();
        drop.say(L(serious ? LINES.twistSerious : LINES.twist), { mood: serious ? 'think' : 'surprised', ms: 4600 });
        ctx.track('twist', { serious: serious ? 1 : 0 });
        await K.wait(K.reduced() ? 1400 : 3000);
      }

      /* ---------------- splice a new ending ---------------- */
      function pickEnding() {
        st.phase = 'ending'; st.fullN = 2;
        const opts = serious
          ? [{ tag: 'The honest ending', text: clip(an.balanced || 'This is a real concern, and it deserves a plan.', 150) }, { tag: 'The next scene', text: 'Next scene: ' + lead('prepare') }]
          : [{ tag: 'The honest ending', text: clip(an.balanced || 'It fits more than one story, and I don’t know the ending yet.', 150) }, { tag: 'What a friend would say', text: clip(an.friend || 'One moment isn’t the whole story. Check before deciding.', 150) }];
        const box = h('div', { class: 'ms-ends' }, h('b', { text: 'Splice in a new ending' }));
        opts.forEach((o, i) => { const b = h('button', { type: 'button', class: 'ms-end' }, h('small', { text: o.tag }), h('span', { text: o.text })); K.tap(b, () => chooseEnd(o, b, box)); box.append(b); void i; });
        const sr = st.viewer ? K.rectIn(st.viewer.querySelector('.ms-screen')) : { y: 120, h: 200 };
        box.style.top = Math.round(sr.y + sr.h + (M.phone ? 14 : 24)) + 'px';
        if (st.viewer) st.viewer.querySelector('.ms-scap').style.visibility = 'hidden';
        el.append(box); st.endsBox = box;
        drop.say(L(LINES.pickEnd), { mood: 'think', ms: 4200 });
        K.guide({ id: 'end', g: 'choose', target: () => Array.from(box.querySelectorAll('.ms-end')), label: 'PICK THE ENDING', delay: 900 });
      }
      function chooseEnd(o, b, box) {
        if (st.phase !== 'ending') return;
        st.phase = 'premiere'; st.endPick = o; K.guide(null);
        b.classList.add('pick'); K.sfx.great(); if (A.ctx) { A.noise({ filter: 'highpass', freq: 4200, dur: 0.03, vol: 0.14 }); A.paper({ when: A.now() + 0.1, vol: 0.12 }); }
        box.querySelectorAll('.ms-end').forEach(x => { if (x !== b) x.classList.add('gone'); });
        setTone(1);
        ctx.track('ending', { i: Array.from(box.querySelectorAll('.ms-end')).indexOf(b) });
        K.later(() => { box.remove(); premiere(); }, 750);
      }

      /* ---------------- finale: premiere night ---------------- */
      const CAST = ['loopie', 'glitch', 'patch', 'rush', 'still', 'sync', 'drop'];
      const MOODS = ['celebrate', 'laugh', 'love', 'happy', 'wow', 'celebrate', 'laugh'];
      const nSeats = visits >= 2 ? 7 : visits >= 1 ? 5 : 4;
      const audience = CAST.slice(0, 6).filter((c, i) => i < nSeats).map((c, i) => { const im = new Image(); im.src = K.face(c, MOODS[i]); return { c, im, ph: i * 0.9 }; });
      async function premiere() {
        st.phase = 'cinema'; st.cinemaT = now(); st.cinema = 0.001;
        if (st.viewer) { st.viewer.remove(); st.viewer = null; }
        music.level(0.85);
        const scr = cinemaScreen();
        const fin = h('div', { class: 'ms-final' }, h('small', { text: 'The new ending' }), h('span', { text: st.endPick.text }));
        Object.assign(fin.style, { left: scr.x + 'px', top: scr.y + 'px', width: scr.w + 'px', height: scr.h + 'px' });
        el.append(fin);
        drop.say(L(care ? LINES.endCare : serious ? LINES.endSerious : LINES.end), { mood: 'celebrate', ms: 0 });
        // applause and cheers on the beat
        if (A.ctx) {
          const t0 = A.now();
          for (let i = 0; i < 70; i++) { const w = t0 + 0.2 + Math.random() * 2.6; A.noise({ when: w, filter: 'bandpass', freq: 1400 + Math.random() * 1800, q: 1.2, dur: 0.018 + Math.random() * 0.02, vol: 0.03 + Math.random() * 0.05, pan: Math.random() * 1.6 - 0.8 }); }
          [0.3, 0.9, 1.6].forEach((o, i) => A.tone({ when: t0 + o, type: 'sine', freq: 520 + i * 90, to: 820 + i * 120, glide: 0.25, dur: 0.35, vol: 0.025 }));
          A.pad(['C4', 'E4', 'G4', 'C5'].map(n => A.note(n)), { dur: 5, vol: 0.14, attack: 0.5 });
          ['G5', 'C6', 'E6', 'G6'].forEach((n, i) => A.chime(A.note(n), { when: nextBeat(1) + i * BEAT() / 2, vol: 0.07, dur: 1.8 }));
        }
        st.cheer = 1;
        await K.wait(K.reduced() ? 2400 : 6200);
        finishGame();
      }
      function cinemaScreen() { const W = M.w, sw = Math.min(W - 32, M.phone ? 350 : 620), sh = Math.round(sw * (M.phone ? 0.62 : 0.48)), cy = (M.phone ? 96 : 88) + sh / 2; return { cx: W / 2, cy, w: sw, h: sh, x: W / 2 - sw / 2, y: cy - sh / 2 }; }
      function finishGame() {
        if (st.finished) return; st.finished = true;
        const prec = st.drops.length ? st.drops.reduce((a, b) => a + b, 0) / st.drops.length : 0.8, pct = Math.round(prec * 100);
        const best = K.best('splice', pct, 'higher'), tier = K.tier(prec, [0.4, 0.62, 0.8]), col = K.collect(stub);
        const badges = [];
        if (best.isNew) badges.push('New best: ' + pct + '% clean splices'); else if (best.first) badges.push('Clean splices: ' + pct + '%');
        if (tier) badges.push(tier + ' editor');
        if (col.isNew) badges.push('Collected: ' + stub + ' (' + Math.min(col.count, STUBS.length) + '/' + STUBS.length + ')');
        const n = st.filled;
        ctx.finish({ title: serious ? 'The full story, with a next scene' : 'The full story', mood: 'celebrate', lines: ['Added ' + n + ' missing scene' + (n === 1 ? '' : 's'), 'New ending: ' + clip(st.endPick ? st.endPick.text : '', 80), 'Tone: harsh → balanced'], share: 'I spliced ' + n + ' missing scenes into a memory on repeat. New ending.', badges: badges.slice(0, 4) });
      }

      /* ---------------- canvas: editing room, projector, cinema ---------------- */
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
        const g = cv.g; if (!g || !M.w) return;
        // software rendering: at most every other display frame (every third when starved), so frames stay even
        dtAcc += dt0; if (SOFT && pace(dt0, t)) return;
        const dt = Math.min(0.1, dtAcc); dtAcc = 0;
        qual.acc += dt; qual.n++;
        if (dt > 0.03) qual.slow = (qual.slow || 0) + 1;
        if (qual.n >= 60) { if ((qual.acc / qual.n > 0.024 || qual.slow > 7) && qual.steps < 2 && (cv.dpr || 1) > 1.05) { qual.steps++; cvOpts.maxDpr = qual.steps === 1 ? 1.5 : 1.15; cv.fit(); } qual.acc = 0; qual.n = 0; qual.slow = 0; }
        const W = M.w, H = M.h, br = bright();
        st.reelSpeed += ((st.phase === 'playing' ? 6 : 0) - st.reelSpeed) * Math.min(1, dt * 1.5); if (st.reelSpeed < 0.02) st.reelSpeed = 0; st.reels += st.reelSpeed * dt;
        // render on demand: the editing room is static once the reels stop
        const live = st.phase === 'playing' || st.phase === 'cinema' || st.phase === 'premiere' || st.cinema > 0 || st.reelSpeed > 0 || P.count() > 0 || pop.length > 0 || !roomOK || msDirty;
        if (!live) return;
        const full0 = msDirty || !roomOK || roomKey !== (br ? 'b' : 'd') + st.tone.toFixed(2) + W + 'x' + H;
        msDirty = false; lastDraw = t;
        if (motor) motor.level(st.phase === 'playing' ? 0.05 : 0.0001, 0.3);
        const cin = st.cinema > 0 ? clamp((now() - st.cinemaT) / 1200, 0, 1) : 0;
        P.update(dt);
        // once a scene settles only the part that moves is repainted: the spinning reels and the sparks in the editing room,
        // below the viewer while the reel plays, below the screen once the premiere is lit (everything else is still)
        if (cin >= 1) st.cinN = (st.cinN || 0) + 1;
        let clipY = 0, rects = null;
        if (cin >= 1 && st.cinN > 2) { const sc = cinemaScreen(); clipY = sc.y + sc.h + 6; }
        else if (st.phase === 'playing' && cin <= 0 && st.lightsT && now() - st.lightsT > 800 && st.screenRect) clipY = st.screenRect.y + st.screenRect.h + 2;
        else if (cin <= 0 && !full0 && (!st.lightsT || now() - st.lightsT > 800)) {
          rects = [];
          if (st.reelSpeed > 0 || st.reelsLive) reelRects().forEach(r => rects.push(r));
          st.reelsLive = st.reelSpeed > 0;
          let pb = null;
          P.list.forEach(q => { const r = q.size * (q.p.glow ? 3 : 1) * (q.p.grow ? 2.6 : 1) + 3; pb = pb ? [Math.min(pb[0], q.x - r), Math.min(pb[1], q.y - r), Math.max(pb[2], q.x + r), Math.max(pb[3], q.y + r)] : [q.x - r, q.y - r, q.x + r, q.y + r]; });
          [pb, st.prevPB].forEach(b => { if (b) rects.push({ x: b[0], y: b[1], w: b[2] - b[0], h: b[3] - b[1] }); });
          st.prevPB = pb;
        }
        if (st.fullN > 0) { st.fullN--; clipY = 0; rects = null; }
        if (rects) { g.save(); g.beginPath(); rects.forEach(r => g.rect(r.x, r.y, r.w, r.h)); g.clip(); }
        else if (clipY) { g.save(); g.beginPath(); g.rect(0, clipY, W, H - clipY); g.clip(); }
        // the room (static parts pre-rendered; only the reels turn)
        if (cin < 1) { if (!roomOK || roomKey !== (br ? 'b' : 'd') + st.tone.toFixed(2) + W + 'x' + H) renderRoom(br); g.drawImage(room, 0, 0, W, H); drawReels(g, br); }
        // lights down for the screening (in both themes), so the beam and the captions read
        if (st.lightsT && cin < 1) { const k = clamp((now() - st.lightsT) / 700, 0, 1); g.fillStyle = 'rgba(10,6,4,' + ((br ? 0.8 : 0.66) * k).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
        if (cin > 0 && cin < 1) { g.fillStyle = stock.room1; g.globalAlpha = cin; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
        if (st.beam > 0 && st.phase === 'playing') drawProjector(g, t, br);
        if (cin > 0) drawCinema(g, t, cin, br);
        // popcorn
        for (let i = pop.length - 1; i >= 0; i--) { const q = pop[i]; q.vy += 520 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += q.vr * dt; if (q.y > H + 20) { pop.splice(i, 1); continue; } g.save(); g.translate(q.x, q.y); g.rotate(q.r); g.fillStyle = '#fff6dc'; g.beginPath(); g.arc(-2.5, 0, 3.6 * q.s, 0, TAU); g.arc(2.5, -1, 3.2 * q.s, 0, TAU); g.arc(0, 2.5, 3 * q.s, 0, TAU); g.fill(); g.fillStyle = '#ffcf6b'; g.beginPath(); g.arc(0.5, 0.5, 1.6 * q.s, 0, TAU); g.fill(); g.restore(); }
        drawP(g, P);
        if (rects || clipY) g.restore();
      });
      function reelRects() { const W = M.w, tb = M.table, rs = M.phone ? 46 : 70; return [[W - rs * 0.55, tb.y + tb.h + rs * 0.2], [rs * 0.55, Math.max(70, tb.y - rs * 0.1)]].map(([x, y]) => ({ x: x - rs - 3, y: y - rs - 3, w: rs * 2 + 6, h: rs * 2 + 6 })); }
      function renderRoom(br) {
        const W = M.w, H = M.h, dpr = cv.dpr || 1;
        room.width = Math.max(2, Math.round(W * dpr)); room.height = Math.max(2, Math.round(H * dpr));
        const g = room.getContext('2d', { alpha: false }); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, br ? '#efe2c8' : stock.room0); gr.addColorStop(1, br ? '#cdb994' : stock.room1); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        drawEditRoom(g, 0, br, 1);
        roomOK = true; roomKey = (br ? 'b' : 'd') + st.tone.toFixed(2) + W + 'x' + H;
      }
      function drawReels(g, br) {
        const W = M.w, tb = M.table, rs = M.phone ? 46 : 70;
        [[W - rs * 0.55, tb.y + tb.h + rs * 0.2, 1], [rs * 0.55, Math.max(70, tb.y - rs * 0.1), -1]].forEach(([x, y, dir]) => drawReel(g, x, y, rs, st.reels * dir, br));
      }
      function drawEditRoom(g, t, br, a) {
        const W = M.w, H = M.h, tb = M.table;
        g.globalAlpha = a;
        // warm glow from the light table, tinted by the tone (harsh red to balanced warm)
        const tone = st.tone, hc = tone < 0.5 ? '#ff5a5a' : '#ffe7b0';
        g.save(); if (!br) g.globalCompositeOperation = 'lighter';
        const R = Math.max(tb.w, tb.h) * 0.85, gr = g.createRadialGradient(tb.x + tb.w / 2, tb.y + tb.h / 2, 10, tb.x + tb.w / 2, tb.y + tb.h / 2, R);
        gr.addColorStop(0, hexA(hc, (br ? 0.25 : 0.32) * a)); gr.addColorStop(1, hexA(hc, 0)); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
        // film scraps
        g.globalAlpha = a * 0.7; g.fillStyle = br ? '#3a2a1a' : '#2a2017';
        [[0.08, 0.92, 0.3], [0.86, 0.95, -0.4], [0.5, 0.97, 0.1]].forEach(([fx, fy, r]) => { g.save(); g.translate(W * fx, H * fy); g.rotate(r); g.fillRect(-26, -7, 52, 14); g.fillStyle = br ? '#efe2c8' : '#5a4632'; for (let i = -22; i < 24; i += 8) { g.fillRect(i, -5, 3, 2.4); g.fillRect(i, 2.6, 3, 2.4); } g.fillStyle = br ? '#3a2a1a' : '#2a2017'; g.restore(); });
        g.globalAlpha = 1; void t;
      }
      function drawReel(g, x, y, r, rot, br) {
        g.save(); g.translate(x, y); g.rotate(rot);
        g.fillStyle = br ? '#5a4632' : '#2a2421'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
        g.fillStyle = br ? '#c9b48c' : '#4a3f38'; g.beginPath(); g.arc(0, 0, r * 0.86, 0, TAU); g.fill();
        g.fillStyle = br ? '#efe2c8' : '#120d0a';
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.beginPath(); g.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.2, 0, TAU); g.fill(); }
        g.fillStyle = br ? '#5a4632' : '#2a2421'; g.beginPath(); g.arc(0, 0, r * 0.12, 0, TAU); g.fill();
        g.restore();
      }
      function drawProjector(g, t, br) {
        const W = M.w, H = M.h, v = st.viewer; if (!v) return;
        const sr = st.screenRect || (st.screenRect = K.rectIn(v.querySelector('.ms-screen'))), px = W / 2, py = H - (M.phone ? 150 : 120);
        const fl = 0.85 + 0.15 * Math.sin(t * 40) + (st.flashT && now() - st.flashT < 160 ? 0.4 : 0);
        g.save(); g.globalCompositeOperation = 'lighter';
        const gr = g.createLinearGradient(px, py, px, sr.y + sr.h / 2); gr.addColorStop(0, hexA(stock.glow, 0.5 * fl)); gr.addColorStop(1, hexA(stock.glow, 0.12 * fl));
        g.fillStyle = gr; g.beginPath(); g.moveTo(px - 8, py); g.lineTo(sr.x, sr.y + sr.h); g.lineTo(sr.x + sr.w, sr.y + sr.h); g.lineTo(px + 8, py); g.closePath(); g.fill();
        for (let i = 0; i < 18; i++) { const k = ((i * 0.137 + t * 0.05) % 1), x = lerp(px, sr.x + ((i * 53) % sr.w), k), y = lerp(py, sr.y + sr.h, k); g.fillStyle = hexA('#ffffff', 0.35 * (1 - k)); g.fillRect(x, y, 1.6, 1.6); }
        g.restore();
        // projector body
        g.fillStyle = br ? '#2a2017' : '#0c0906'; g.beginPath(); g.ellipse(px, py + 16, 46, 14, 0, 0, TAU); g.fill();
        g.fillStyle = '#3a3330'; g.fillRect(px - 30, py - 4, 60, 22); g.fillStyle = '#fff1c4'; g.beginPath(); g.arc(px, py + 2, 7, 0, TAU); g.fill();
        drawReel(g, px - 22, py - 22, 18, st.reels, false); drawReel(g, px + 22, py - 22, 18, st.reels, false);
      }
      const cinemaBase = document.createElement('canvas'); let cinemaKey = '';
      function renderCinema() {
        const W = M.w, H = M.h, sc = cinemaScreen(), dpr = cv.dpr || 1;
        cinemaBase.width = Math.max(2, Math.round(W * dpr)); cinemaBase.height = Math.max(2, Math.round(H * dpr));
        const g = cinemaBase.getContext('2d', { alpha: false }); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.fillStyle = '#07050a'; g.fillRect(0, 0, W, H);
        const cw = W * 0.16;
        [[0, 1], [W, -1]].forEach(([x0, dir]) => { for (let i = 0; i < 6; i++) { const x = x0 + dir * (i * cw / 6); const gr = g.createLinearGradient(x, 0, x + dir * cw / 6, 0); gr.addColorStop(0, stock.curtain); gr.addColorStop(0.5, '#3a0610'); gr.addColorStop(1, stock.curtain); g.fillStyle = gr; g.fillRect(Math.min(x, x + dir * cw / 6), 0, cw / 6, H * 0.78); } });
        g.fillStyle = stock.curtain; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, 40); for (let x = W; x >= 0; x -= W / 10) g.quadraticCurveTo(x - W / 20, 64, x - W / 10, 40); g.closePath(); g.fill();
        g.save(); g.shadowColor = hexA(stock.glow, 0.8); g.shadowBlur = 40; g.fillStyle = '#fbf1dc'; g.fillRect(sc.x, sc.y, sc.w, sc.h); g.restore();
        g.strokeStyle = '#1a1208'; g.lineWidth = 4; g.strokeRect(sc.x - 2, sc.y - 2, sc.w + 4, sc.h + 4);
        cinemaKey = W + 'x' + H + ':' + dpr;
      }
      function drawCinema(g, t, k, br) {
        const W = M.w, H = M.h, sc = cinemaScreen(), e = K.ease.inOutCubic(k);
        if (cinemaKey !== W + 'x' + H + ':' + (cv.dpr || 1)) renderCinema();
        g.globalAlpha = e; g.drawImage(cinemaBase, 0, 0, W, H);
        // projector beam from the back
        const px = W / 2, py = H - 30, fl = 0.9 + 0.1 * Math.sin(t * 37);
        g.save(); g.globalCompositeOperation = 'lighter';
        let gr = g.createLinearGradient(px, py, px, sc.y); gr.addColorStop(0, hexA(stock.glow, 0.42 * fl * e)); gr.addColorStop(1, hexA(stock.glow, 0.1 * e));
        g.fillStyle = gr; g.beginPath(); g.moveTo(px - 10, py); g.lineTo(sc.x + 6, sc.y + sc.h); g.lineTo(sc.x + sc.w - 6, sc.y + sc.h); g.lineTo(px + 10, py); g.closePath(); g.fill();
        for (let i = 0; i < 26; i++) { const kk = ((i * 0.091 + t * 0.04) % 1), x = lerp(px, sc.x + ((i * 61) % sc.w), kk), y = lerp(py, sc.y + sc.h, kk); g.fillStyle = hexA('#fff6dc', 0.4 * (1 - kk)); g.fillRect(x, y, 1.8, 1.8); }
        g.restore();
        // audience: the bubble cast, heads above the seat backs, bouncing on the beat
        const bl = BEAT(), bp = ((now() / 1000) % bl) / bl, bounce = Math.exp(-bp * 6);
        const backY = H - (M.phone ? 236 : 214), bs = M.phone ? 34 : 44;
        for (let i = 0, nb = Math.ceil(W / (bs * 1.5)); i < nb; i++) { const x = (i + 0.5) * W / nb, bob = st.cheer ? Math.max(0, Math.sin(t * 6 + i)) * 4 : 0; g.fillStyle = '#1c1420'; g.beginPath(); g.arc(x, backY - bs * 0.5 - bob, bs * 0.42, 0, TAU); g.fill(); g.fillStyle = '#3a0a16'; g.fillRect(x - bs * 0.62, backY - 4, bs * 1.24, 34); }
        const n = audience.length, rowY = H - (M.phone ? 184 : 158), size = M.phone ? 60 : 78, gap = Math.min(size * 1.22, (W - 40) / Math.max(1, n));
        const x0 = W / 2 - (n - 1) * gap / 2;
        audience.forEach((a, i) => {
          const x = x0 + i * gap, jump = (st.cheer ? (6 + 10 * bounce) * (0.6 + 0.4 * Math.sin(t * 3 + a.ph)) : 0), y = rowY - jump;
          if (a.im.complete && a.im.naturalWidth) g.drawImage(a.im, x - size / 2, y - size, size, size);
          // seat back sits fully below the face (never covering the art)
          g.fillStyle = '#5a0f1c'; const sbw = size * 0.98; g.beginPath(); g.moveTo(x - sbw / 2, rowY + 6); g.lineTo(x + sbw / 2, rowY + 6); g.lineTo(x + sbw / 2 - 4, rowY + 46); g.lineTo(x - sbw / 2 + 4, rowY + 46); g.closePath(); g.fill();
          g.fillStyle = '#7d1a2c'; g.fillRect(x - sbw / 2 + 4, rowY + 9, sbw - 8, 6);
          if (st.cheer && Math.random() < 0.04) spawnPop(x, y - size * 0.7);
        });
        g.fillStyle = '#0d0a10'; g.fillRect(0, rowY + 46, W, H - rowY - 46);
        g.globalAlpha = 1; void br;
      }
      function spawnPop(x, y) { if (pop.length > 120) return; for (let i = 0; i < 3; i++) pop.push({ x, y, vx: (Math.random() - 0.5) * 160, vy: -220 - Math.random() * 220, r: Math.random() * 6, vr: (Math.random() - 0.5) * 8, s: 0.8 + Math.random() * 0.5 }); }

      /* ---------------- lines (every one in three vibes) ---------------- */
      const LINES = {
        intro: visits ? { Jolly: 'Back in the edit suite! Same memory? Let’s find what got cut.', Cheeky: 'Another reel on repeat? Pass me the scissors.', Unfiltered: 'New reel. Find the missing scenes.' }
          : { Jolly: 'Your memory keeps replaying the same few frames. Let’s find the scenes that got cut.', Cheeky: 'This reel is all highlights of the worst bits. Let’s fix the edit.', Unfiltered: 'Same frames on loop. Add what’s missing.' },
        splice1: { Jolly: 'Oh! One scene and the whole reel feels different.', Cheeky: 'Plot twist: there was more footage all along.', Unfiltered: 'More context. Different meaning.' },
        splice2: { Jolly: 'More context, warmer colours. Funny how that works.', Cheeky: 'The colours are calming down. So is the plot.', Unfiltered: 'Better. Keep going.' },
        ready: { Jolly: 'The director’s cut is ready. Press play!', Cheeky: 'Roll it. I brought snacks.', Unfiltered: 'Press play. Watch it with context.' },
        lights: { Jolly: 'Lights down…', Cheeky: 'Phones off, please.', Unfiltered: 'Rolling.' },
        twist: { Jolly: 'Wait. This last frame was never filmed. Your brain spliced it in.', Cheeky: 'Hold on. No footage of this ending. Your brain added it.', Unfiltered: 'That ending isn’t footage. It’s a guess.' },
        twistSerious: { Jolly: 'This frame isn’t footage yet. The facts lean that way, so the next scene is a plan.', Cheeky: 'Not filmed yet, though the facts lean there. So: plan the next scene.', Unfiltered: 'Not footage yet. Facts lean that way. Plan it.' },
        pickEnd: { Jolly: 'Pick the ending that’s honest.', Cheeky: 'New ending. Make it true, not cheesy.', Unfiltered: 'Choose the honest ending.' },
        end: { Jolly: 'Premiere night! Same memory, the full story.', Cheeky: 'Standing ovation. For the edit, obviously.', Unfiltered: 'Full story. That’s a wrap.' },
        endSerious: { Jolly: 'The full story, with a plan for the next scene.', Cheeky: 'Real worry, real plan. Roll credits.', Unfiltered: 'Full story. Now do the next scene.' },
        endCare: { Jolly: 'The full story. Next, get the real facts from someone who knows.', Cheeky: 'That’s the cut. Now ask someone qualified.', Unfiltered: 'Full story. Get proper advice next.' }
      };

      /* ---------------- flow ---------------- */
      (async () => {
        await K.intro({ title: 'Missing Scene', sub: 'Your memory replays a few frames. The scenes in between got cut.', how: 'Drag possible scenes into the gaps. Press play. Pick an honest ending.', char: 'drop', mood: 'think' });
        layout();
        st.phase = 'splice';
        drop.say(L(LINES.intro), { mood: 'think', ms: 4400 });
        spliceGuide();
      })();

      return {
        async autoplay() {
          const wait = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 30000)) await K.wait(90); };
          await wait(() => st.phase === 'splice');
          await K.wait(1000);
          for (let i = 0; i < gaps.length; i++) {
            const g = gaps.find(x => !x.filled), c = bin.find(x => !x.used && x.el.offsetParent !== null); if (!g || !c) break;
            const cr = K.rectIn(c.el), gr2 = K.rectIn(g.el.querySelector('.ms-pic'));
            await K.sim.drag(c.el, { x: cr.w / 2, y: cr.h / 2 }, { x: gr2.cx - cr.x, y: gr2.cy - cr.y }, 900, 20);
            await wait(() => g.filled, 2000);
            await K.wait(700);
          }
          await wait(() => st.phase === 'ready');
          await K.wait(900);
          if (st.playBtn) await K.sim.tap(st.playBtn);
          await wait(() => st.phase === 'ending', 40000);
          await K.wait(1200);
          const b = st.endsBox && st.endsBox.querySelector('.ms-end'); if (b) await K.sim.tap(b);
          await wait(() => st.finished, 20000);
        }
      };
    }
  });
})(window.TSG_ENV);
