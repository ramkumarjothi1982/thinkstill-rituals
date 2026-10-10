/* 037 Thought Lab — Reframe · REFRAME · Beliefs / Evidence
 * Mechanism: behavioural experiments (Bennett-Levy et al. 2004, Oxford Guide to Behavioural Experiments in Cognitive
 * Therapy): the belief becomes a hypothesis with a rated prediction, tested by one small, safe action with a clear way to
 * observe what happens. Safety behaviours (Salkovskis 1991) are filtered out first, because when things go fine they take
 * the credit and the belief survives. Honest: when the facts back the worry, the test is framed as getting real answers
 * and a plan, never as proving the fear wrong; health, money, housing and legal worries get a test that goes to someone
 * qualified. Only test and observation kinds, the rating and the day are stored, never the player's words.
 * Verb: pour (carry a flask to the jar's rim, lift it to tip and pour to the line; pour your certainty to its level; pour
 * the whole jar through a filter), then hold to seal.
 * Finale: the sealed capsule glows with the four layers of the plan and the day to try it; the lab lights up shelf by
 * shelf, bubbles rise and the experiment card prints.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const hexRGB = (c) => { const n = parseInt(String(c).slice(1, 7), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mixHex = (a, b, k) => { const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => Math.max(0, Math.min(255, Math.round(v + (B[i] - v) * k))).toString(16).padStart(2, '0')).join(''); };
  const rgba = (c, a) => { const A = hexRGB(c); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')'; };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };

  /* ---- liquid in tilted glass: the glass turns, the surface stays level ---- */
  function clipBelow(poly, L) { const out = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], ai = a[1] >= L, bi = b[1] >= L; if (ai) out.push(a); if (ai !== bi) { const t = (L - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, L]); } } return out; }
  function clipHalf(poly, px, py, nx, ny) { const out = [], d = (p) => (p[0] - px) * nx + (p[1] - py) * ny; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], da = d(a), db = d(b); if (da >= 0) out.push(a); if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } } return out; }
  function areaOf(p) { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; }
  const areaBelow = (poly, L) => areaOf(clipBelow(poly, L));
  function levelFor(poly, v) { let lo = Infinity, hi = -Infinity; for (const p of poly) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); } if (v <= 0.5) return hi; for (let k = 0; k < 22; k++) { const m = (lo + hi) / 2; if (areaBelow(poly, m) > v) lo = m; else hi = m; } return (lo + hi) / 2; }
  function xform(pts, x, y, a, s) { const c = Math.cos(a), n = Math.sin(a); s = s || 1; return pts.map(([px, py]) => [x + (px * c - py * n) * s, y + (px * n + py * c) * s]); }
  const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

  /* ---- glassware shapes, local to the mouth's centre, y down ---- */
  function shErlen(w, h) { const n = w * 0.34, nh = h * 0.28, c = w * 0.12; return { k: 'erlen', w, h, mw: n, inner: [[-n / 2, 0], [-n / 2, nh], [-w / 2, h - c], [-w / 2 + c, h], [w / 2 - c, h], [w / 2, h - c], [n / 2, nh], [n / 2, 0]], hl: [[-n / 2 + 3.5, nh * 0.25], [-n / 2 + 3.5, nh + 2], [-w / 2 + 9, h - c - 6]] }; }
  function shTube(w, h) { const r = w / 2, pts = [[-r, 0], [-r, h - r]]; for (let i = 1; i < 10; i++) { const a = Math.PI - i / 10 * Math.PI; pts.push([Math.cos(a) * r, h - r + Math.sin(a) * r]); } pts.push([r, h - r], [r, 0]); return { k: 'tube', w, h, mw: w, inner: pts, hl: [[-r + 4, h * 0.1], [-r + 4, h - r]] }; }
  function shRound(w, h) { const n = w * 0.32, R = w / 2, cy = h - R, al = Math.acos(Math.min(0.99, (n / 2) / R)), yj = cy - R * Math.sin(al); const pts = [[-n / 2, 0], [-n / 2, yj]]; for (let k = 1; k < 20; k++) { const f = Math.PI + al - k / 20 * (Math.PI + 2 * al); pts.push([R * Math.cos(f), cy + R * Math.sin(f)]); } pts.push([n / 2, yj], [n / 2, 0]); return { k: 'round', w, h, mw: n, inner: pts, hl: [[-n / 2 + 3, 5], [-n / 2 + 3, yj], [-R * 0.62, cy - R * 0.55], [-R * 0.8, cy - R * 0.05]] }; }
  function shJar(w, h) { const c = Math.min(10, w * 0.12); return { k: 'jar', w, h, mw: w, inner: [[-w / 2, 0], [-w / 2, h - c], [-w / 2 + c, h], [w / 2 - c, h], [w / 2, h - c], [w / 2, 0]], hl: [[-w / 2 + 6, h * 0.07], [-w / 2 + 6, h * 0.88]] }; }

  const LIQ = {
    hyp: { col: '#9b6cff', hi: '#d6c2ff', visc: 0.55, name: 'Hypothesis' },
    test: { col: '#1fd3e3', hi: '#c2fbff', visc: 1.15, name: 'Test', fizz: true },
    pred: { col: '#ffad1f', hi: '#ffe7a6', visc: 0.8, name: 'Prediction' },
    obs: { col: '#9be64a', hi: '#e6ffb8', visc: 1, name: 'Observe' },
    murk: { col: '#6a5848', hi: '#a08a72', visc: 0.9, name: 'Contaminated' }
  };
  const ORDER = ['hyp', 'test', 'pred', 'obs'];
  /* Today's lab: the same all day, a different one tomorrow. */
  const LABS = [
    { key: 'midnight', name: 'Midnight Lab', acc: '#3fd4ff', neon: true,
      dark: { wall: ['#090e25', '#141b40'], tile: 'rgba(130,160,255,0.07)', bench: '#1d2550', benchHi: '#4a5ca8', cab: '#0f1534', cabHi: '#28336a', shelf: '#2a3570' },
      bright: { wall: ['#f0f6fc', '#d8e5f2'], tile: 'rgba(60,90,140,0.09)', bench: '#f6f8fc', benchHi: '#ffffff', cab: '#4d6ea6', cabHi: '#7a98cc', shelf: '#9fb2d2' } },
    { key: 'copper', name: 'Copper Lab', acc: '#ffae5c', pipes: true,
      dark: { wall: ['#150e11', '#2b1c19'], tile: 'rgba(255,170,110,0.06)', bench: '#2c201d', benchHi: '#7a5236', cab: '#1c1313', cabHi: '#432c25', shelf: '#4a3027' },
      bright: { wall: ['#fbf4ec', '#efdfcd'], tile: 'rgba(140,90,40,0.09)', bench: '#fffaf4', benchHi: '#ffffff', cab: '#a5653c', cabHi: '#c98a5c', shelf: '#c9a079' } },
    { key: 'crystal', name: 'Crystal Lab', acc: '#d98cff', facets: true,
      dark: { wall: ['#110b26', '#24173f'], tile: 'rgba(210,150,255,0.07)', bench: '#251c48', benchHi: '#6a54a8', cab: '#170f33', cabHi: '#33245f', shelf: '#3d2c6e' },
      bright: { wall: ['#faf4fe', '#ebdff7'], tile: 'rgba(120,70,170,0.09)', bench: '#fcf9ff', benchHi: '#ffffff', cab: '#7b5bb2', cabHi: '#a283d4', shelf: '#c4ade4' } },
    { key: 'greenhouse', name: 'Greenhouse Lab', acc: '#7ee08a', plants: true,
      dark: { wall: ['#07140f', '#122a1e'], tile: 'rgba(140,255,170,0.06)', bench: '#1b2b22', benchHi: '#3f6a4c', cab: '#0f1c15', cabHi: '#25402f', shelf: '#2c4a36' },
      bright: { wall: ['#f1f9f0', '#dbecd8'], tile: 'rgba(50,110,60,0.09)', bench: '#fbfdf8', benchHi: '#ffffff', cab: '#4f8a5c', cabHi: '#76ad80', shelf: '#a6c9a8' } },
    { key: 'observatory', name: 'Observatory Lab', acc: '#94b4ff', dome: true,
      dark: { wall: ['#060a1b', '#101a38'], tile: 'rgba(150,180,255,0.06)', bench: '#1a2244', benchHi: '#465a9c', cab: '#0d1330', cabHi: '#242f62', shelf: '#28336a' },
      bright: { wall: ['#eff3fd', '#d9e1f4'], tile: 'rgba(70,90,160,0.09)', bench: '#f7f8fd', benchHi: '#ffffff', cab: '#5263a8', cabHi: '#7d8dcc', shelf: '#a8b4dc' } }
  ];
  /* A new piece for the shelf on each finished visit (the same order for everyone, no luck involved). */
  const GLASS = [{ key: 'erlen', name: 'Erlenmeyer flask' }, { key: 'round', name: 'Round-bottom flask' }, { key: 'cyl', name: 'Graduated cylinder' }, { key: 'coil', name: 'Spiral condenser' },
    { key: 'vol', name: 'Volumetric flask' }, { key: 'retort', name: 'Retort' }, { key: 'rack', name: 'Test-tube rack' }, { key: 'sep', name: 'Separatory funnel' }];
  const ICON = {
    erlen: '<svg viewBox="0 0 40 48" aria-hidden="true"><path d="M9.4 33h21.2l3.9 8a2.7 2.7 0 0 1-2.4 3.9H7.9a2.7 2.7 0 0 1-2.4-3.9z" fill="var(--liq)"/><path d="M15.5 3.5h9v13l11.2 24.6A3.4 3.4 0 0 1 32.6 46H7.4a3.4 3.4 0 0 1-3.1-4.9L15.5 16.5z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M13.5 3.5h13" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="16" cy="39" r="1.5" fill="#fff" opacity=".7"/><circle cx="22" cy="36.5" r="1.1" fill="#fff" opacity=".7"/></svg>',
    tube: '<svg viewBox="0 0 40 48" aria-hidden="true"><path d="M14.4 20h11.2v17.4a5.6 5.6 0 0 1-11.2 0z" fill="var(--liq)"/><path d="M14 3.5h12v34a6 6 0 0 1-12 0z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 3.5h16" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="18" cy="32" r="1.6" fill="#fff" opacity=".75"/><circle cx="22" cy="26" r="1.1" fill="#fff" opacity=".75"/></svg>',
    round: '<svg viewBox="0 0 40 48" aria-hidden="true"><path d="M7.7 31h24.6a12.4 12.4 0 0 1-24.6 0z" fill="var(--liq)"/><path d="M16 3.5h8v13.3a13.5 13.5 0 1 1-8 0z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M14 3.5h12" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="15" cy="35" r="1.5" fill="#fff" opacity=".7"/></svg>'
  };

  (env.games = env.games || []).push({
    id: 'thought-lab', mode: 'reframe', name: 'Thought Lab', verb: 'pour', family: 'REFRAME', minutes: 2,
    parents: ['Beliefs / Evidence', 'Performance / Confidence', 'Social / Team / Perspective'],
    cast: ['glitch', 'sync'], poster: { char: 'glitch', mood: 'nerd' },
    fonts: ['Unbounded:wght@600;800', 'IBM+Plex+Mono:wght@500;600', 'Lexend:wght@400;500;600'],
    tagline: 'Pour a scary thought into a tiny, safe experiment. Then seal it.',
    why: 'For a belief you could test: plan one small, safe experiment and see what really happens.',
    css: `
.g-thought-lab { --tl-disp: "Unbounded", "Arial Black", "Trebuchet MS", system-ui, sans-serif; --tl-mono: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, "DejaVu Sans Mono", monospace;
  --tl-body: "Lexend", system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; --tl-acc: #3fd4ff; --tl-ink: #eef4ff; --tl-mute: #a9b8de; --tl-p1: #1c2452; --tl-p2: #121838; --tl-line: rgba(170, 200, 255, 0.3); background: #090e25; }
.g-thought-lab.tl-bright { --tl-ink: #18213d; --tl-mute: #4e5b80; --tl-p1: #ffffff; --tl-p2: #eef3fb; --tl-line: rgba(60, 90, 150, 0.28); background: #eef4fb; }
.g-thought-lab .tl-tray { position: absolute; z-index: 24; left: 12px; right: 12px; bottom: calc(env(safe-area-inset-bottom, 0px) + 14px); display: grid; gap: 8px; transition: transform 0.45s cubic-bezier(.2, 1.2, .4, 1), opacity 0.3s ease; }
.g-thought-lab .tl-tray.off { transform: translateY(calc(100% + 40px)); opacity: 0; pointer-events: none; }
.g-thought-lab .tl-tray > b { font: 600 12px/1 var(--tl-mono); letter-spacing: 0.12em; text-transform: uppercase; color: var(--tl-mute); text-align: center; padding: 2px 0; }
.g-thought-lab .tl-card { position: relative; display: flex; align-items: center; gap: 10px; min-height: 64px; padding: 7px 12px 7px 7px; border: 0; border-radius: 15px; text-align: left; cursor: grab; touch-action: none; color: var(--tl-ink);
  background: linear-gradient(180deg, var(--tl-p1), var(--tl-p2)); box-shadow: inset 0 0 0 1.5px var(--tl-line), inset 4px 0 0 var(--liq), 0 10px 22px rgba(0, 0, 0, 0.32); font: 500 15px/1.28 var(--tl-body); transition: opacity 0.2s ease, transform 0.2s ease; }
.g-thought-lab .tl-card:active { transform: scale(0.98); }
.g-thought-lab .tl-card i { flex: none; width: 46px; height: 50px; display: grid; place-items: center; color: var(--tl-ink); border-radius: 11px; background: rgba(255, 255, 255, 0.06); }
.g-thought-lab.tl-bright .tl-card i { background: rgba(30, 60, 120, 0.06); }
.g-thought-lab .tl-card i svg { width: 38px; height: 46px; display: block; }
.g-thought-lab .tl-card small { display: block; font: 600 12px/1.1 var(--tl-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--liq); margin-bottom: 3px; }
.g-thought-lab.tl-bright .tl-card small { color: var(--liqd); }
.g-thought-lab .tl-card.lift { opacity: 0.35; }
.g-thought-lab .tl-card.used { display: none; }
.g-thought-lab .tl-card:focus-visible { outline: 3px solid var(--tl-acc); outline-offset: 2px; }
.g-thought-lab .tl-log { position: absolute; z-index: 25; left: 12px; right: 12px; bottom: calc(env(safe-area-inset-bottom, 0px) + 14px); padding: 12px 15px 13px; border-radius: 16px; color: var(--tl-ink);
  background: linear-gradient(180deg, var(--tl-p1), var(--tl-p2)); box-shadow: inset 0 0 0 1.5px var(--tl-line), 0 14px 30px rgba(0, 0, 0, 0.35); transition: transform 0.45s cubic-bezier(.2, 1.2, .4, 1), opacity 0.3s ease; }
.g-thought-lab .tl-log.off { transform: translateY(calc(100% + 40px)); opacity: 0; pointer-events: none; }
.g-thought-lab .tl-log small { display: flex; align-items: center; gap: 8px; font: 600 12px/1.1 var(--tl-mono); letter-spacing: 0.12em; text-transform: uppercase; color: var(--liq, var(--tl-acc)); margin-bottom: 7px; }
.g-thought-lab.tl-bright .tl-log small { color: var(--liqd, #1f5fa8); }
.g-thought-lab .tl-log small::before { content: ""; width: 9px; height: 9px; border-radius: 50%; background: var(--liq, var(--tl-acc)); box-shadow: 0 0 10px var(--liq, var(--tl-acc)); }
.g-thought-lab .tl-log p { margin: 0; font: 500 16px/1.34 var(--tl-body); }
.g-thought-lab .tl-log p + p { margin-top: 6px; font-size: 14px; color: var(--tl-mute); }
.g-thought-lab .tl-tag { position: absolute; z-index: 22; left: 0; top: 0; font: 600 12px/1 var(--tl-mono); letter-spacing: 0.07em; text-transform: uppercase; padding: 6px 8px 5px; border-radius: 7px; white-space: nowrap; pointer-events: none;
  color: #071019; background: var(--liq, #dff3ff); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); will-change: transform, opacity; }
.g-thought-lab .tl-tag.goal { background: transparent; color: var(--liq); box-shadow: inset 0 0 0 1.5px var(--liq); }
.g-thought-lab.tl-bright .tl-tag.goal { color: var(--liqd); box-shadow: inset 0 0 0 1.5px var(--liqd); background: rgba(255, 255, 255, 0.85); }
.g-thought-lab .tl-tag.big { font: 800 21px/1 var(--tl-disp); letter-spacing: 0; padding: 8px 10px 7px; }
.g-thought-lab .tl-tag.big em { display: block; font: 600 12px/1 var(--tl-mono); letter-spacing: 0.1em; font-style: normal; margin-top: 4px; }
.g-thought-lab .tl-tag.out { background: #3b2f26; color: #ffe4c8; }
.g-thought-lab .tl-tag.out s { text-decoration-thickness: 2px; }
.g-thought-lab .tl-hit { position: absolute; z-index: 21; left: 0; top: 0; width: 72px; height: 72px; border: 0; padding: 0; margin: 0; background: transparent; border-radius: 18px; touch-action: none; cursor: grab; -webkit-tap-highlight-color: transparent; }
.g-thought-lab .tl-hit:focus-visible { outline: 3px solid var(--tl-acc); outline-offset: 2px; }
.g-thought-lab .tl-dates { position: absolute; z-index: 25; left: 12px; right: 12px; bottom: calc(env(safe-area-inset-bottom, 0px) + 14px); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; transition: transform 0.45s cubic-bezier(.2, 1.2, .4, 1), opacity 0.3s ease; }
.g-thought-lab .tl-dates.off { transform: translateY(calc(100% + 40px)); opacity: 0; pointer-events: none; }
.g-thought-lab .tl-dates > b { grid-column: 1 / -1; font: 600 12px/1 var(--tl-mono); letter-spacing: 0.12em; text-transform: uppercase; color: var(--tl-mute); text-align: center; padding-bottom: 2px; }
.g-thought-lab .tl-date { min-height: 60px; border: 0; border-radius: 14px; cursor: pointer; color: var(--tl-ink); background: linear-gradient(180deg, var(--tl-p1), var(--tl-p2)); box-shadow: inset 0 0 0 1.5px var(--tl-line), 0 8px 18px rgba(0, 0, 0, 0.3);
  font: 600 15px/1.2 var(--tl-body); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 6px 4px; }
.g-thought-lab .tl-date small { font: 600 12px/1 var(--tl-mono); letter-spacing: 0.04em; color: var(--tl-mute); }
.g-thought-lab .tl-date.pick { box-shadow: inset 0 0 0 2.5px var(--tl-acc), 0 0 22px rgba(63, 212, 255, 0.35); }
.g-thought-lab .tl-date:focus-visible { outline: 3px solid var(--tl-acc); outline-offset: 2px; }
.g-thought-lab .tl-final { position: absolute; z-index: 26; left: 12px; right: 12px; bottom: calc(env(safe-area-inset-bottom, 0px) + 14px); padding: 13px 15px 14px; border-radius: 18px; color: var(--tl-ink);
  background: linear-gradient(180deg, var(--tl-p1), var(--tl-p2)); box-shadow: inset 0 0 0 1.5px var(--tl-line), 0 0 0 4px rgba(63, 212, 255, 0.12), 0 18px 40px rgba(0, 0, 0, 0.45); transition: transform 0.6s cubic-bezier(.2, 1.2, .4, 1), opacity 0.4s ease; }
.g-thought-lab .tl-final.off { transform: translateY(calc(100% + 40px)); opacity: 0; }
.g-thought-lab .tl-final > small { display: block; font: 800 13px/1.1 var(--tl-disp); letter-spacing: 0.06em; text-transform: uppercase; color: var(--tl-acc); margin-bottom: 9px; }
.g-thought-lab.tl-bright .tl-final > small { color: #1d6fb0; }
.g-thought-lab .tl-final dl { margin: 0; display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 10px; row-gap: 6px; align-items: baseline; }
.g-thought-lab .tl-final dt { font: 600 12px/1.25 var(--tl-mono); letter-spacing: 0.05em; text-transform: uppercase; color: var(--tl-mute); white-space: nowrap; }
.g-thought-lab .tl-final dd { margin: 0; font: 500 14.5px/1.3 var(--tl-body); }
.g-thought-lab .tl-final dd.gk-user { font-size: 15px; }
.g-thought-lab .tl-final dd b { font-weight: 600; }
.g-thought-lab .tl-cheer { position: absolute; z-index: 27; left: 0; top: 0; font: 800 14px/1 var(--tl-disp); letter-spacing: 0.03em; text-transform: uppercase; color: #06202a; white-space: nowrap; pointer-events: none;
  background: linear-gradient(180deg, #e9fdff, #7fe6ff); padding: 8px 13px 7px; border-radius: 999px; box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9), 0 0 18px rgba(63, 212, 255, 0.6), 0 8px 18px rgba(0, 0, 0, 0.3); will-change: transform, opacity; }
@container (min-width: 700px) {
  .g-thought-lab .tl-tray { left: 50%; right: auto; width: min(980px, calc(100% - 300px)); transform: translateX(-50%); grid-template-columns: repeat(3, minmax(0, 1fr)); bottom: 24px; }
  .g-thought-lab .tl-tray.off { transform: translate(-50%, calc(100% + 40px)); }
  .g-thought-lab .tl-card { min-height: 88px; padding: 9px 14px 9px 9px; }
  .g-thought-lab .tl-log, .g-thought-lab .tl-dates { left: 50%; right: auto; width: min(620px, calc(100% - 300px)); transform: translateX(-50%); bottom: 24px; }
  .g-thought-lab .tl-log.off, .g-thought-lab .tl-dates.off { transform: translate(-50%, calc(100% + 40px)); }
  .g-thought-lab .tl-log p { font-size: 17px; }
  .g-thought-lab .tl-final { left: auto; right: 32px; bottom: auto; top: 176px; width: 380px; }
  .g-thought-lab .tl-final.off { transform: translateX(calc(100% + 60px)); }
  .g-thought-lab .tl-final dd { font-size: 15px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const clamp = K.clamp, lerp = K.lerp, ease = K.ease, now = () => performance.now(), reduced = () => K.reduced();
      const inten = ctx.intensity, gentle = inten === 0, full = inten === 2;
      const visits = K.visits();
      const L = (o, sub) => { let s = ctx.line(o) || ''; if (sub) Object.keys(sub).forEach(k => { s = s.split('{' + k + '}').join(sub[k]); }); return s; };
      const LAB = K.dailyPick(LABS, 37), GL = GLASS[visits % GLASS.length];
      const bright = () => S.scene() === 'bright', pal = () => LAB[bright() ? 'bright' : 'dark'];
      el.style.setProperty('--tl-acc', LAB.acc);

      /* ---------------- the experiment's content, from the player's words (or a gentle example) ---------------- */
      const text = String(ctx.text || ''), noText = !text.trim(), low = text.toLowerCase();
      const care = an.safety === 'care', strong = an.fear_support === 'strong';
      const arr = (v) => (Array.isArray(v) ? v : []);
      const trimEnd = (s) => String(s || '').replace(/[\s.,;:!…]+$/, '');
      const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); return (sp > n * 0.55 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; };
      const wordsOf = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9'’ ]+/g, ' ').split(/\s+/).filter(w => w.length > 2);
      let belief = '', beliefUser = false;
      if (!noText) {
        const concl = wordsOf(an.conclusion || an.thought);
        const brains = arr(an.spans).filter(s => s && typeof s.quote === 'string' && s.quote.trim() && s.kind !== 'camera' && low.includes(s.quote.trim().toLowerCase()));
        let best = null, bs = -1;
        brains.forEach((s, i) => { const sc = wordsOf(s.quote).filter(w => concl.includes(w)).length * 2 + i * 0.1; if (sc > bs) { bs = sc; best = s; } });
        if (best) { belief = clip(trimEnd(best.quote.trim()), 110); beliefUser = true; }
        else if (an.thought || an.conclusion) belief = clip(trimEnd(an.thought || an.conclusion), 110);
      }
      const beliefShown = belief ? (beliefUser ? '“' + belief + '”' : belief + '.') : 'A thought like: “If I speak up, they’ll laugh.”';
      // the kind of situation picks small, safe tests, ways to observe and the likely safety behaviour
      const DOMS = { work: /\b(boss|manager|supervisor|work|job|meeting|colleague|client|team|shift|office)\b/g, reply: /\b(text|texted|message|messaged|reply|replied|read|seen|ignor\w*|ghost\w*|dm|whatsapp|email|emailed)\b/g,
        social: /\b(presentation|speech|class|party|talk|speak|stage|group|everyone|people|friends?|laugh\w*|embarrass\w*|awkward)\b/g, close: /\b(partner|boyfriend|girlfriend|husband|wife|mum|mom|dad|family|sister|brother|parents?)\b/g,
        study: /\b(exam|test|grade|marks?|essay|assignment|teacher|lecturer|uni|school|course)\b/g };
      let domain = 'general';
      if (care) domain = 'care';
      else { let best = 0; Object.keys(DOMS).forEach(k => { const n = (low.match(DOMS[k]) || []).length * (k === 'reply' ? 0.8 : 1); if (n > best) { best = n; domain = k; } }); }
      const leadT = (k) => { const l = arr(an.leads).find(x => x && x.kind === k && x.text); return l ? clip(trimEnd(l.text), 120) + (/[?”"]$/.test(trimEnd(l.text)) ? '' : '.') : ''; };
      const ASK = { work: 'Ask them one question about what it’s about.', reply: 'Send one light follow-up: “No rush, just checking this reached you!”', social: 'Ask one friendly person: “How did that come across?”',
        close: 'Ask gently: “Anything on your mind?”', study: 'Ask your teacher one specific question about what’s expected.', general: 'Ask one simple question to fill the biggest gap.' };
      const TESTS = {
        work: [['ask', 'Ask one question'], ['update', 'Send one short update', 'Send your manager one short update on what you’re working on.'], ['speak', 'Speak up once', 'Say one thing in your next meeting, even a small one.']],
        reply: [['ask', 'One light follow-up'], ['wait', 'Wait, then check once', 'Leave it until tomorrow, then check your messages once.'], ['other', 'Message someone else', 'Message one other friend and notice how that goes.']],
        social: [['ask', 'Ask for honest feedback'], ['speak', 'Speak up once', 'Say one thing in the next group chat or meeting.'], ['hello', 'Say hi to one person', 'Say hi to one person and notice how they respond.']],
        close: [['ask', 'Ask gently'], ['share', 'Share one feeling', 'Tell them one small thing you felt, without blaming.'], ['plan', 'Suggest one plan', 'Suggest one small thing to do together this week.']],
        study: [['ask', 'Ask one question'], ['show', 'Show a rough draft', 'Show one rough draft or answer to someone you trust.'], ['try', 'Try one practice question', 'Do one practice question and check it honestly.']],
        care: [['pro', 'Ask a professional', 'Ask someone qualified (a GP, adviser or lawyer) one question about where you stand.'], ['line', 'Call a free advice line', 'Call a free advice service and ask one question.'], ['write', 'Get it in writing', 'Ask for the exact details in writing.']],
        general: [['ask', 'Ask one question'], ['step', 'Take one small step', 'Take one small, safe step toward it, then notice what actually happens.'], ['notice', 'Watch what happens', 'Next time it comes up, notice what actually happens and write it down.']]
      };
      const tests = (TESTS[domain] || TESTS.general).map(([id, short, full]) => ({ id, short, text: id === 'ask' ? (leadT('ask') || ASK[domain] || ASK.general) : full }));
      const OBS = {
        reply: [['time', 'How long it takes', 'Note how long a reply actually takes.'], ['words', 'Their actual reply', 'Write down what they actually say.'], ['nerves', 'My nerves, 0 to 10', 'Rate my nerves 0 to 10 before and after.']],
        social: [['count', 'Who reacts, and how', 'Count who reacts, and how.'], ['words', 'What people say', 'Write down what people actually say.'], ['nerves', 'My nerves, 0 to 10', 'Rate my nerves 0 to 10 before and after.']],
        care: [['facts', 'The exact facts', 'Write down the exact facts and options I’m given.'], ['next', 'The next step', 'Note the next step they suggest.'], ['nerves', 'My nerves, 0 to 10', 'Rate my nerves 0 to 10 before and after.']],
        general: [['words', 'Their exact words', 'Write down exactly what they say or do.'], ['nerves', 'My nerves, 0 to 10', 'Rate my nerves 0 to 10 before and after.'], ['compare', 'Fact vs prediction', 'Compare what happened with my prediction.']]
      };
      const obsList = (OBS[domain] || OBS.general).map(([id, short, full]) => ({ id, short, text: full }));
      const SAFE = { work: [['over-preparing', 'Over-preparing all night'], ['apologising first', 'Apologising before you start']], reply: [['checking', 'Checking every five minutes'], ['extra apologies', 'Adding three apologies']],
        social: [['over-rehearsing', 'Over-rehearsing every word'], ['avoiding eye contact', 'Avoiding eye contact']], close: [['apologising first', 'Apologising first'], ['keeping it vague', 'Keeping it vague']],
        study: [['cramming all night', 'Cramming all night'], ['reassurance-seeking', 'Asking for reassurance']], care: [['worst-case searching', 'Searching worst cases online'], ['reassurance-seeking', 'Asking everyone for reassurance']],
        general: [['over-rehearsing', 'Over-rehearsing'], ['avoiding eye contact', 'Avoiding eye contact']] };
      const safeList = (SAFE[domain] || SAFE.general).slice(0, full ? 2 : 1).map(([short, label]) => ({ short, label }));
      const NOTE_KEY = 'thought-lab:notebook', notebook = (() => { const v = S.store.get(NOTE_KEY, []); return Array.isArray(v) ? v : []; })(), expNo = notebook.length + 1;
      const DAY = 86400000, fmtDay = (d) => { try { return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/,/g, ''); } catch (e) { return d.toDateString().slice(0, 10); } };
      const DATES = [{ id: 'today', label: 'Today', off: 0 }, { id: 'tomorrow', label: 'Tomorrow', off: 1 }, { id: 'week', label: 'This week', off: 3, by: true }].map(d => Object.assign(d, { day: fmtDay(new Date(Date.now() + d.off * DAY)) }));
      const GOAL = { hyp: 0.16, test: 0.12, pred: 0.24, obs: 0.1 }, TOL = [0.06, 0.045, 0.034][inten] || 0.045;

      /* ---------------- lines (every one in three vibes) ---------------- */
      const sb = safeList[0];
      const LINES = {
        open: care ? { Jolly: 'Welcome to the lab. Let’s plan one small, careful step that gets you real facts.', Cheeky: 'Goggles on. Today we fetch facts from people who actually know.', Unfiltered: 'One careful test. Real facts. Let’s plan it.' }
          : visits ? { Jolly: 'Back in the lab! Experiment number {n}, coming right up.', Cheeky: 'My favourite scientist returns. Experiment {n}. Goggles on.', Unfiltered: 'Experiment {n}. Let’s build it.' }
            : { Jolly: 'Welcome to the lab! A scary thought is really a prediction. Let’s test one.', Cheeky: 'Goggles on. Your brain made a claim. Science would like a word.', Unfiltered: 'A belief is a prediction. Predictions can be tested.' },
        syncHi: { Jolly: 'I’m on bubbles! And moral support!', Cheeky: 'I brought snacks. Don’t drink anything in here.', Unfiltered: 'Assistant, reporting.' },
        hyp: { Jolly: 'First, the hypothesis. Carry the belief to the jar and pour it in, up to the line.', Cheeky: 'Step one: pour the belief in. To the line, please. This isn’t cocktail hour.', Unfiltered: 'Pour the belief in. Stop at the line.' },
        hypAuto: { Jolly: 'I’ll pour the hypothesis in for you. Watch the line.', Cheeky: 'I’ll pour this one. You look impressed.', Unfiltered: 'I’ll pour this one.' },
        hypDone: { Jolly: 'Logged. A belief is a guess until it’s tested.', Cheeky: 'Logged. Very dramatic colour. Completely untested.', Unfiltered: 'Logged. A guess, not a fact.' },
        test: care ? { Jolly: 'Now the test: one that goes to someone who really knows. Small and safe.', Cheeky: 'Pick a test. Qualified people beat 2am searching.', Unfiltered: 'Pick a test with a qualified person.' }
          : strong ? { Jolly: 'Now a test that gets you real answers. Small and safe.', Cheeky: 'Pick a test. We want answers, not drama.', Unfiltered: 'Pick a test that gets answers.' }
            : { Jolly: 'Now the test. Small and safe beats big and brave.', Cheeky: 'Pick a test. Tiny is fine. Tiny is great, actually.', Unfiltered: 'Choose one small, safe test.' },
        fizz: { Jolly: 'It’s fizzing! Is fizzing good?', Cheeky: 'Ooh, bubbles. Science is getting spicy.', Unfiltered: 'Reaction.' },
        testDone: { Jolly: 'Fizzing means it’s testable. Lovely.', Cheeky: 'Testable. My favourite kind of scary.', Unfiltered: 'Testable. Good.' },
        bigDose: { Jolly: 'Bit of a big dose. A smaller test teaches just as much.', Cheeky: 'Generous pour. Smaller tests work just as well.', Unfiltered: 'Big dose. Smaller works too.' },
        pred: { Jolly: 'Prediction time. Pour as high as you feel sure it will come true.', Cheeky: 'How sure are you? Pour it. The jar won’t judge.', Unfiltered: 'Pour how sure you are. Honest number.' },
        predDone: strong ? { Jolly: '{p}%, and the facts lean that way. The test still beats guessing.', Cheeky: '{p}%. Fair, given the facts. Now we get real answers.', Unfiltered: '{p}%. The test gets you facts.' }
          : { Jolly: '{p}% sure. Written down before the test, like real scientists.', Cheeky: '{p}%. Noted. In pen.', Unfiltered: 'Logged: {p}%.' },
        obs: { Jolly: 'Last ingredient: how will you know what happened?', Cheeky: 'How will you measure it? “A vibe” is not a measurement.', Unfiltered: 'Pick how you’ll observe it.' },
        glow: { Jolly: 'It’s glowing! So we’ll be able to see the result!', Cheeky: 'Glow-in-the-dark science. Very official.', Unfiltered: 'Glowing. Measurable.' },
        twist: care ? { Jolly: 'Wait, let me add a bit of {sb}. Just to be safe?', Cheeky: 'A splash of {sb}, maybe? For safety?', Unfiltered: 'Adding {sb}. For safety.' }
          : { Jolly: 'Wait! Let me add a little {sb}. Just to be safe!', Cheeky: 'Quick, a splash of {sb}! For luck!', Unfiltered: 'Adding {sb}. For safety.' },
        murk: { Jolly: 'Contaminated! If it goes fine, you’ll thank the {sb}, not the facts.', Cheeky: 'Sync. We talked about this. Now the {sb} would get all the credit.', Unfiltered: 'Contaminated. The {sb} would get the credit.' },
        filter: { Jolly: 'Let’s filter it out. Pour the whole jar through the funnel.', Cheeky: 'Into the filter. Out goes the {sb}.', Unfiltered: 'Pour it through the filter.' },
        filtered: { Jolly: 'Clean result. Now the test can actually teach you something.', Cheeky: 'Squeaky clean. Science can work now.', Unfiltered: 'Clean. Now it can teach you.' },
        sorry: { Jolly: 'Sorry! I panic-helped.', Cheeky: 'In my defence, panic is my whole personality.', Unfiltered: 'My bad.' },
        date: { Jolly: 'When will you run it? Pick a day.', Cheeky: 'Pick a day. Future you is very busy.', Unfiltered: 'Pick a day.' },
        seal: { Jolly: 'Hold the cap to seal it.', Cheeky: 'Hold the cap. Tight. Scientists hate leaks.', Unfiltered: 'Hold to seal.' },
        end: care ? { Jolly: 'Sealed. Next, someone qualified can tell you exactly where you stand.', Cheeky: 'Sealed. Real answers come from the right person.', Unfiltered: 'Sealed. Ask someone qualified.' }
          : strong ? { Jolly: 'Sealed. Whatever the result, you’ll know more, and you’ll have a plan.', Cheeky: 'Sealed. If the worry’s right, you’ll know early and have a plan.', Unfiltered: 'Sealed. Facts, then a plan.' }
            : { Jolly: 'Experiment sealed! Whatever happens, it’s data.', Cheeky: 'Sealed. Future you gets a fact instead of a fear.', Unfiltered: 'Sealed. Run it. Collect data.' },
        syncEnd: { Jolly: 'The whole lab looks proud of you!', Cheeky: 'I’m crying. Lab tears. Very clean ones.', Unfiltered: 'Nice.' }
      };

      /* ---------------- state ---------------- */
      const st = { phase: 'intro', step: '', lit: 0, litT: 0, murk: 0, murkT: 0, finale: 0, finT0: 0, lights: 0, precs: [], pred: 0, test: null, obs: null, date: null, sealK: 0, sealed: false, finished: false, auto: false, chosen: null, beat: 0, flash: 0 };
      if (S.isDev && S.isDev()) el.__st = st; // dev builds only: lets the test tools follow the phases
      const M = { w: 0, h: 0, phone: true, s: 1, bench: 0, jw: 84, jh: 176, Aj: 1, jarX: 0, srcX: 0, shelfY: 0 };
      const P = K.particles();
      const Q = { acc: 0, n: 0, steps: 0, level: 2 };

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: 2 });
      const tray = h('div', { class: 'tl-tray off', role: 'group' });
      const log = h('div', { class: 'tl-log off', 'aria-live': 'polite' });
      const dates = h('div', { class: 'tl-dates off', role: 'group', 'aria-label': 'When will you try it?' });
      const finalCard = h('div', { class: 'tl-final off', 'aria-live': 'polite' });
      const hit = h('button', { type: 'button', class: 'tl-hit', hidden: true, 'aria-label': 'The flask. Drag it to the jar, then lift it to pour. Or press Enter.' });
      const capHit = h('button', { type: 'button', class: 'tl-hit', hidden: true, 'aria-label': 'The capsule cap. Press and hold to seal the experiment.' });
      const srcTag = h('div', { class: 'tl-tag', hidden: true });
      const goalTag = h('div', { class: 'tl-tag goal', hidden: true });
      const outTag = h('div', { class: 'tl-tag out', hidden: true });
      const capTag = h('div', { class: 'tl-tag', hidden: true });
      const cheer = h('div', { class: 'tl-cheer', hidden: true, 'aria-hidden': 'true' });
      const layerTags = {};
      ORDER.forEach(k => { layerTags[k] = h('div', { class: 'tl-tag', hidden: true }); layerTags[k].style.setProperty('--liq', LIQ[k].col); });
      el.append(hit, capHit, srcTag, goalTag, outTag, capTag, ...ORDER.map(k => layerTags[k]), cheer, tray, log, dates, finalCard);
      const CH = K.phone() ? 56 : 92;
      const glitch = K.character('glitch', { side: 'below', mood: 'nerd', size: CH, x: 10, y: 60 });
      const sync = K.character('sync', { side: 'below', mood: 'happy', size: CH, x: 300, y: 60 });
      const say = (who, line, o) => { (who === glitch ? sync : glitch).hush(); return who.say(line, o); };
      function theme() { el.classList.toggle('tl-bright', bright()); }
      theme();

      /* ---------------- layout ---------------- */
      const V = { jar: null, src: null, cap: null, fun: null };
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        M.w = W; M.h = H; M.phone = W < 700;
        const ph = M.phone, os = M.s;
        M.s = clamp(H / 844, 0.8, 1.2) * (ph ? 1.12 : 1.18);
        M.bench = Math.round(H * (ph ? 0.645 : 0.665));
        M.jw = Math.round(86 * M.s); M.jh = Math.round(182 * M.s);
        M.jarX = Math.round(W * (ph ? 0.585 : 0.555)); M.srcX = Math.round(W * (ph ? 0.215 : 0.375));
        M.shelfY = Math.round(ph ? H * 0.3 : H * 0.31);
        M.jarTop = M.bench - M.jh;
        const jar = shJar(M.jw, M.jh); M.Aj = areaOf(jar.inner);
        if (!V.jar) V.jar = vessel(jar, { layers: [], kind: 'jar' }); else V.jar.sh = jar;
        if (!V.jar.held && !V.jar.docked) { V.jar.home = { x: M.jarX, y: M.jarTop }; if (!V.jar.moving) { V.jar.x = V.jar.tx = M.jarX; V.jar.y = V.jar.ty = M.jarTop; } }
        M.dockJar = { x: M.jarX - M.jw / 2 + 3 * M.s, y: M.jarTop - 7 * M.s };
        // funnel and capsule for the filter step
        M.capW = Math.round(0.56 * M.jw); M.capH = Math.round(0.7 * M.jh);
        M.funW = Math.round(0.95 * M.jw); M.funH = Math.round(0.3 * M.jh); M.stem = Math.round(0.13 * M.jh);
        M.capX = M.srcX; M.capTop = M.bench - M.capH; M.funTop = M.capTop - M.stem - M.funH + 12 * M.s;
        M.dockFun = { x: M.capX + M.funW / 2 + 1, y: M.funTop - 6 * M.s };
        if (V.cap) { V.cap.sh = shTube(M.capW, M.capH); V.cap.home = { x: st.capCentre ? capCentreX() : M.capX, y: M.capTop }; if (!V.cap.moving) { V.cap.x = V.cap.home.x; V.cap.y = V.cap.home.y; } }
        const Sv = V.src, isJar = Sv && Sv === V.jar;
        if (Sv && !isJar && os && os !== M.s) Sv.sh = scaleShape(Sv.sh, M.s / os);
        if (Sv) Sv.dock = isJar ? M.dockFun : M.dockJar;
        if (Sv && !isJar && !Sv.docked) { Sv.home = srcHome(Sv.sh); if (!Sv.held && !Sv.moving) { Sv.x = Sv.tx = Sv.home.x; Sv.y = Sv.ty = Sv.home.y; } }
        if (Sv && Sv.docked) Sv.pivot = { x: Sv.dock.x, y: Sv.dock.y };
        // characters
        if (ph) { glitch.place(10, 60); sync.place(W - CH - 10, 60); glitch.side('below'); sync.side('below'); }
        else { glitch.place(28, 78); sync.place(W - CH - 28, 78); glitch.side('right'); sync.side('left'); }
        BGC.key = '';
      }
      const capCentreX = () => (M.phone ? Math.round(M.w * 0.5) : M.jarX);
      const srcHome = (sh) => ({ x: M.srcX, y: M.bench - sh.h });
      function scaleShape(sh, k) { const f = { erlen: shErlen, tube: shTube, round: shRound, jar: shJar }[sh.k]; return f ? f(sh.w * k, sh.h * k) : sh; }
      function vessel(sh, o) { return Object.assign({ sh, x: 0, y: 0, ang: 0, tx: 0, ty: 0, tilt: 0, tiltT: 0, tiltV: 0, frac: 0, dir: 1, docked: false, held: false, pivot: null, slosh: 0, sloshV: 0, flow: 0, flowVis: 0, scale: 1, alpha: 1, bub: [], waves: [{ a: 0, v: 0 }, { a: 0, v: 0 }, { a: 0, v: 0 }], vx: 0, lastX: 0, lean: 0 }, o || {}); }

      /* ---------------- audio: a glassy, bubbling groove that clouds over with the contaminant ---------------- */
      let pourA = null, fizzA = null;
      function beds() { if (!A.ctx || pourA) return; pourA = A.loop({ pink: true, filter: 'bandpass', freq: 900, q: 1.2, bus: 'sfx' }); fizzA = A.loop({ filter: 'highpass', freq: 5400, q: 0.7, bus: 'sfx' }); }
      beds(); S.on('audio-ready', beds);
      S.onDestroy(() => { [pourA, fizzA].forEach(x => x && x.stop()); });
      const room = K.ambience('room'); room.level(0.35, 1);
      const MZ = { on: true, next: 0, i: 0, bpm: 96, layer: 0, vol: 0.9, pulses: [] };
      const PROG = [['D3', ['F#4', 'A4', 'C#5', 'E5']], ['E3', ['G#4', 'B4', 'D5', 'E5']], ['B2', ['D4', 'F#4', 'A4', 'C#5']], ['G2', ['B3', 'D4', 'F#4', 'A4']]];
      const MURKP = [['D3', ['F4', 'A4', 'C5', 'D5']], ['C3', ['E4', 'G4', 'C5', 'D5']], ['A#2', ['D4', 'F4', 'A4', 'C5']], ['A2', ['C#4', 'E4', 'G4', 'A4']]];
      const ARP = [0, 2, 1, 3, 2, 1, 3, 2];
      S.loop(() => {
        if (!A.ctx || !MZ.on) return;
        const step = 30 / MZ.bpm;
        if (!MZ.next) MZ.next = A.now() + 0.15;
        if (MZ.next < A.now() - 0.2) { const skip = Math.ceil((A.now() - MZ.next) / step); MZ.next += skip * step; MZ.i += skip; }
        while (MZ.next < A.now() + 0.25) { groove(MZ.next, MZ.i); MZ.next += 30 / MZ.bpm; MZ.i++; }
      });
      function groove(t, i) {
        const e = i % 8, bar = Math.floor(i / 8) % 4, Pp = (st.murk > 0.5 && st.murkT > 0 ? MURKP : PROG)[bar], v = MZ.vol, root = A.note(Pp[0]), ch = Pp[1];
        if (e === 0 || e === 4) A.tone({ when: t, type: 'sine', freq: root * 2, to: root, glide: 0.09, dur: 0.34, vol: 0.2 * v, bus: 'music' });
        if (MZ.layer >= 1) A.chime(A.note(ch[ARP[e] % ch.length]), { when: t, vol: (e % 2 ? 0.018 : 0.028) * v, dur: 0.7, bus: 'music', verb: 0.3 });
        if (e === 2 || e === 6) A.noise({ when: t, filter: 'highpass', freq: 6500, dur: 0.03, vol: 0.03 * v, bus: 'music' });
        if (MZ.layer >= 2 && (e === 3 || e === 7) && Math.random() < 0.6) A.tone({ when: t + 0.02, type: 'sine', freq: 420 + Math.random() * 380, to: 980 + Math.random() * 400, glide: 0.05, dur: 0.07, vol: 0.02 * v, bus: 'music' });
        if (MZ.layer >= 3 && e === 0) A.pad(ch.map(n => A.note(n)), { when: t, dur: 30 / MZ.bpm * 8, vol: 0.05 * v, attack: 0.3 });
        if (st.murk > 0.5 && st.murkT > 0 && e === 0) A.tone({ when: t, type: 'sawtooth', freq: root / 2, dur: 30 / MZ.bpm * 8, vol: 0.022 * v, lp: 320, attack: 0.25, bus: 'music' });
        MZ.pulses.push({ t, e }); if (MZ.pulses.length > 32) MZ.pulses.shift();
      }
      function sClink(p, v) { if (!A.ctx) return; const t = A.now(); [1, 2.76, 5.4].forEach((m, k) => A.tone({ when: t, type: 'sine', freq: 1850 * (p || 1) * m, dur: 0.55 / m, vol: [0.065, 0.03, 0.014][k] * (v || 1), verb: 0.35 })); }
      function sPick() { sClink(0.82, 0.8); if (A.ctx) A.noise({ filter: 'lowpass', freq: 900, dur: 0.06, vol: 0.05 }); }
      function sBlub() { if (!A.ctx) return; const f = 320 + Math.random() * 420; A.tone({ type: 'sine', freq: f, to: f * 2.3, glide: 0.06, dur: 0.08, vol: 0.035 }); }
      function sTick(p) { if (A.ctx) A.tone({ type: 'triangle', freq: 700 + 1100 * p, dur: 0.035, vol: 0.035 }); }
      function sType() { if (!A.ctx) return; const t = A.now(); for (let i = 0; i < 6; i++) A.typeKey({ when: t + i * 0.055 + Math.random() * 0.02, vol: 0.045 }); }
      function sPlop() { if (!A.ctx) return; A.tone({ type: 'sine', freq: 230, to: 85, glide: 0.13, dur: 0.2, vol: 0.18 }); A.noise({ filter: 'lowpass', freq: 600, dur: 0.15, vol: 0.08 }); }
      function sDrip(p) { if (A.ctx) A.tone({ type: 'sine', freq: 1350 * (p || 1), to: 720 * (p || 1), glide: 0.05, dur: 0.07, vol: 0.04, verb: 0.4 }); }
      function sLight(i) { if (!A.ctx) return; const N = ['D5', 'F#5', 'A5', 'C#6', 'E6', 'F#6', 'A6', 'C#7', 'D7']; const f = A.note(N[i % N.length]); A.pluck(f, { vol: 0.11, damp: 0.996, verb: 0.35 }); A.tone({ type: 'sine', freq: f * 2, dur: 0.45, vol: 0.018, verb: 0.4 }); }
      function sGood(n) { if (!A.ctx) return; ['D5', 'F#5', 'A5', 'D6'].slice(0, 2 + (n || 0)).forEach((x, i) => A.chime(A.note(x), { when: A.now() + i * 0.07, vol: 0.06, dur: 1.4 })); }

      /* ---------------- the lab (painted once per size and theme) ---------------- */
      const BGC = { key: '', c: null, bottles: [], win: null };
      function ensureBG() {
        const key = M.w + 'x' + M.h + ':' + (cv.dpr || 1) + ':' + S.scene();
        if (BGC.key === key && BGC.c) return; BGC.key = key; BGC.c = paintBG();
      }
      function paintBG() {
        const W = M.w, H = M.h, dpr = cv.dpr || 1, P0 = pal(), br = bright(), ph = M.phone, B = M.bench, s = M.s;
        const c = mk(W * dpr, H * dpr), g = c.getContext('2d', { alpha: false }); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        let gr = g.createLinearGradient(0, 0, 0, B); gr.addColorStop(0, P0.wall[0]); gr.addColorStop(1, P0.wall[1]); g.fillStyle = gr; g.fillRect(0, 0, W, B + 4);
        // tiles (or crystal facets)
        const ts = Math.round(30 * s); g.strokeStyle = P0.tile; g.lineWidth = 1; g.beginPath();
        if (LAB.facets) { for (let x = -H; x < W + H; x += ts * 1.4) { g.moveTo(x, 0); g.lineTo(x + B, B); g.moveTo(x, B); g.lineTo(x + B, 0); } }
        else { for (let x = ((W / 2) % ts) + 0.5; x < W; x += ts) { g.moveTo(x, 0); g.lineTo(x, B); } for (let y = B - ts + 0.5; y > 0; y -= ts) { g.moveTo(0, y); g.lineTo(W, y); } }
        g.stroke();
        // a soft pool of the lab's light behind the jar
        gr = g.createRadialGradient(M.jarX, B - M.jh * 0.55, 10, M.jarX, B - M.jh * 0.55, Math.max(W, H) * 0.55); gr.addColorStop(0, rgba(LAB.acc, br ? 0.14 : 0.2)); gr.addColorStop(1, rgba(LAB.acc, 0)); g.fillStyle = gr; g.fillRect(0, 0, W, B);
        BGC.win = null;
        if (!ph) paintWindow(g, P0, br);
        if (LAB.pipes) paintPipes(g, br);
        if (LAB.plants) paintPlants(g, P0, br);
        paintShelf(g, P0, br);
        if (!ph) paintLamp(g, P0, br);
        // bench: a slab with a lit edge, then the cabinet
        const bt = Math.round(15 * s);
        gr = g.createLinearGradient(0, B - 6, 0, B + bt); gr.addColorStop(0, P0.benchHi); gr.addColorStop(0.28, P0.bench); gr.addColorStop(1, mixHex(P0.bench, '#000000', 0.3));
        g.fillStyle = gr; g.fillRect(0, B - 6, W, bt + 6);
        g.fillStyle = br ? 'rgba(255,255,255,0.95)' : rgba(LAB.acc, 0.35); g.fillRect(0, B - 6, W, 1.5);
        gr = g.createLinearGradient(0, B + bt, 0, H); gr.addColorStop(0, P0.cab); gr.addColorStop(1, mixHex(P0.cab, '#000000', br ? 0.18 : 0.4)); g.fillStyle = gr; g.fillRect(0, B + bt, W, H - B - bt);
        g.fillStyle = 'rgba(0,0,0,' + (br ? 0.12 : 0.35) + ')'; g.fillRect(0, B + bt, W, 6);
        const dw = ph ? W / 3 : Math.min(220, W / 6), n = Math.ceil(W / dw), top = B + bt + 12, rowH = Math.round(54 * s);
        for (let i = 0; i < n; i++) {
          const x = i * dw;
          for (let r = 0; top + r * rowH < H - 20; r++) {
            const y = top + r * rowH, hh = r < 2 ? rowH - 8 : H - y - 14; if (hh < 24) break;
            g.fillStyle = rgba(P0.cabHi, br ? 0.12 : 0.1); g.fillRect(x + 7, y, dw - 14, hh);
            g.strokeStyle = rgba(P0.cabHi, 0.6); g.lineWidth = 1.2; g.strokeRect(x + 7.5, y + 0.5, dw - 15, hh - 1);
            g.fillStyle = rgba('#ffffff', br ? 0.75 : 0.12); g.fillRect(x + dw / 2 - 14, y + 9, 28, 9 * s);
            g.fillStyle = P0.cabHi; g.fillRect(x + dw / 2 - 16, y + 9 + 12 * s, 32, 4); if (r >= 2) break;
          }
        }
        // vignette
        gr = g.createRadialGradient(W / 2, H * 0.42, Math.min(W, H) * 0.32, W / 2, H * 0.5, Math.max(W, H) * 0.82); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, br ? 'rgba(40,50,90,0.16)' : 'rgba(0,0,12,0.5)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        return c;
      }
      function paintWindow(g, P0, br) {
        const W = M.w, H = M.h, x0 = W * 0.06, x1 = W * 0.26, y0 = H * 0.13, y1 = M.bench - M.jh * 0.32, cx = (x0 + x1) / 2, r = (x1 - x0) / 2, round = LAB.dome;
        const path = new Path2D();
        if (round) { const R = Math.min(r, (y1 - y0) / 2); path.arc(cx, (y0 + y1) / 2, R, 0, TAU); }
        else { path.moveTo(x0, y1); path.lineTo(x0, y0 + r); path.arc(cx, y0 + r, r, Math.PI, 0); path.lineTo(x1, y1); path.closePath(); }
        BGC.win = { path, x0, x1, y0, y1 };
        g.save(); g.clip(path);
        let gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, br ? '#7fb6ea' : '#081232'); gr.addColorStop(1, br ? '#d9eeff' : '#22356e'); g.fillStyle = gr; g.fillRect(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8);
        const R = K.rng(41);
        if (!br) { g.fillStyle = '#ffffff'; for (let i = 0; i < 60; i++) { g.globalAlpha = 0.3 + R() * 0.6; g.fillRect(x0 + R() * (x1 - x0), y0 + R() * (y1 - y0) * 0.75, 1.3, 1.3); } g.globalAlpha = 1; g.fillStyle = '#f3f0dc'; g.beginPath(); g.arc(x0 + (x1 - x0) * 0.7, y0 + (y1 - y0) * 0.25, 13, 0, TAU); g.fill(); g.fillStyle = gr; g.beginPath(); g.arc(x0 + (x1 - x0) * 0.7 + 6, y0 + (y1 - y0) * 0.25 - 4, 12, 0, TAU); g.fill(); }
        else { g.fillStyle = 'rgba(255,255,255,0.85)'; [[0.3, 0.3, 26], [0.7, 0.45, 20]].forEach(([fx, fy, s0]) => { const x = x0 + (x1 - x0) * fx, y = y0 + (y1 - y0) * fy; g.beginPath(); g.arc(x, y, s0 * 0.6, 0, TAU); g.arc(x + s0 * 0.6, y + 3, s0 * 0.5, 0, TAU); g.arc(x - s0 * 0.6, y + 4, s0 * 0.45, 0, TAU); g.fill(); }); }
        if (round) { g.strokeStyle = br ? 'rgba(80,100,170,0.5)' : 'rgba(200,215,255,0.35)'; g.lineWidth = 1; g.beginPath(); g.arc(x0 + (x1 - x0) * 0.36, y0 + (y1 - y0) * 0.6, 16, 0, TAU); g.stroke(); g.fillStyle = br ? '#e7b26a' : '#ffcf8a'; g.beginPath(); g.arc(x0 + (x1 - x0) * 0.36, y0 + (y1 - y0) * 0.6, 9, 0, TAU); g.fill(); }
        // a city skyline
        g.fillStyle = br ? '#9fb7d3' : '#0b1430'; let x = x0 - 4; while (x < x1 + 4) { const bw = 10 + R() * 18, bh = 20 + R() * 55; g.fillRect(x, y1 - bh, bw, bh + 4); if (!br) { g.fillStyle = 'rgba(255,214,140,0.7)'; for (let k = 0; k < 4; k++) if (R() < 0.5) g.fillRect(x + 3 + R() * (bw - 6), y1 - bh + 5 + R() * (bh - 10), 2, 2); g.fillStyle = '#0b1430'; } x += bw + 2; }
        g.restore();
        g.strokeStyle = br ? '#8c9bb8' : '#2a3466'; g.lineWidth = 7 * M.s; g.stroke(path);
        g.lineWidth = 3 * M.s; g.beginPath(); g.moveTo(cx, y0 + (round ? 6 : 0)); g.lineTo(cx, y1); g.moveTo(x0, (y0 + y1) / 2 + 10); g.lineTo(x1, (y0 + y1) / 2 + 10); g.stroke();
        g.fillStyle = br ? '#c7d2e4' : '#1c2550'; g.fillRect(x0 - 10, y1, x1 - x0 + 20, 8 * M.s);
      }
      function paintPipes(g, br) {
        const W = M.w, y = M.shelfY - 54 * M.s, cu = br ? '#c27a45' : '#b4693a';
        const pipe = (x0, y0, x1, y1) => { g.lineCap = 'round'; g.strokeStyle = mixHex(cu, '#000000', 0.35); g.lineWidth = 10 * M.s; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.strokeStyle = cu; g.lineWidth = 7 * M.s; g.stroke(); g.strokeStyle = 'rgba(255,220,170,0.55)'; g.lineWidth = 2 * M.s; g.beginPath(); g.moveTo(x0, y0 - 2); g.lineTo(x1, y1 - 2); g.stroke(); };
        pipe(-10, y, W + 10, y); pipe(W * 0.86, y, W * 0.86, M.bench - 20); pipe(W * 0.05, y, W * 0.05, -10);
        [W * 0.3, W * 0.62].forEach(x => { g.fillStyle = mixHex(cu, '#000000', 0.2); g.fillRect(x - 6 * M.s, y - 8 * M.s, 12 * M.s, 16 * M.s); g.fillStyle = '#c94a3f'; g.beginPath(); g.arc(x, y - 13 * M.s, 6 * M.s, 0, TAU); g.fill(); });
      }
      function paintPlants(g, P0, br) {
        const leaf = (x, y, a, s) => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = br ? '#5aa866' : '#2f7a45'; g.beginPath(); g.ellipse(0, 0, s, s * 0.42, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-s, 0); g.lineTo(s, 0); g.stroke(); g.restore(); };
        [[0.02, 1], [0.98, -1]].forEach(([fx, d]) => { const x = M.w * fx; for (let i = 0; i < 9; i++) { const y = 20 + i * 18 * M.s, a = d * (0.5 + 0.3 * Math.sin(i)); leaf(x + d * Math.sin(i * 1.7) * 10, y, a, (10 + (i % 3) * 3) * M.s); } });
        void P0;
      }
      function paintLamp(g, P0, br) {
        const x = M.jarX, y = M.jarTop - 150 * M.s, w = 70 * M.s;
        g.strokeStyle = br ? '#7d879c' : '#3a4470'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, y - 20 * M.s); g.stroke();
        const cone = g.createLinearGradient(0, y, 0, M.bench); cone.addColorStop(0, rgba(br ? '#fff3c8' : '#d8f2ff', br ? 0.32 : 0.16)); cone.addColorStop(1, rgba(br ? '#fff3c8' : '#d8f2ff', 0));
        g.fillStyle = cone; g.beginPath(); g.moveTo(x - w * 0.42, y); g.lineTo(x - w * 1.9, M.bench); g.lineTo(x + w * 1.9, M.bench); g.lineTo(x + w * 0.42, y); g.closePath(); g.fill();
        g.fillStyle = br ? '#56627e' : '#232c52'; g.beginPath(); g.moveTo(x - w * 0.18, y - 20 * M.s); g.lineTo(x + w * 0.18, y - 20 * M.s); g.lineTo(x + w * 0.5, y); g.lineTo(x - w * 0.5, y); g.closePath(); g.fill();
        g.fillStyle = br ? '#fff6d8' : '#e8f7ff'; g.beginPath(); g.ellipse(x, y, w * 0.46, 4 * M.s, 0, 0, TAU); g.fill();
        void P0;
      }
      function paintShelf(g, P0, br) {
        const W = M.w, ph = M.phone, y = M.shelfY, x0 = ph ? 10 : W * 0.3, x1 = ph ? W - 10 : W - 30, s = M.s * (ph ? 0.92 : 1.05);
        g.fillStyle = 'rgba(0,0,0,' + (br ? 0.1 : 0.3) + ')'; g.fillRect(x0 + 4, y + 8, x1 - x0, 8);
        g.fillStyle = P0.shelf; g.fillRect(x0, y, x1 - x0, 7 * M.s); g.fillStyle = 'rgba(255,255,255,' + (br ? 0.6 : 0.16) + ')'; g.fillRect(x0, y, x1 - x0, 1.5);
        [x0 + 18, x1 - 18].forEach(x => { g.fillStyle = mixHex(P0.shelf, '#000000', 0.25); g.fillRect(x - 3, y + 6, 6, 14 * M.s); });
        if (LAB.neon) { g.fillStyle = rgba(LAB.acc, br ? 0.5 : 0.9); g.fillRect(x0, y + 7 * M.s, x1 - x0, 2); }
        // the collection first (it grows every visit), then a few reagent bottles to fill the shelf
        const owned = K.collection().map(n => (GLASS.find(x => x.name === n) || {}).key).filter(Boolean);
        const COLS = [LIQ.hyp.col, LIQ.test.col, LIQ.pred.col, LIQ.obs.col, LAB.acc, '#ff6f9c'];
        const items = owned.map((k, i) => ({ k, col: COLS[i % COLS.length], own: true }));
        const fill = ['bottle', 'jarlet', 'bottle', 'flasklet', 'bottle', 'jarlet', 'flasklet', 'bottle', 'jarlet', 'bottle', 'flasklet', 'bottle'];
        let x = x0 + 30 * s, i = 0;
        BGC.bottles = [];
        const R = K.rng(9 + LAB.key.length);
        while (x < x1 - 26 * s) {
          const it = items[i] || { k: fill[(i - items.length) % fill.length], col: COLS[(i * 5 + 2) % COLS.length] };
          const wdt = drawGlassware(g, it.k, x, y, s, it.col, br, R);
          BGC.bottles.push({ x: x + wdt / 2, y: y - 22 * s, col: it.col, r: 26 * s });
          x += wdt + (10 + R() * 12) * s; i++;
        }
        // the piece this visit will add, shown as a glowing gap at the end of the collection (filled in the finale)
        BGC.newSlot = { x: x0 + 30 * s, y };
      }
      /* Glassware silhouettes for the shelf (vector, painted once). Returns the width used. */
      function drawGlassware(g, k, x, base, s, col, br, R) {
        const glass = br ? 'rgba(60,80,120,0.7)' : 'rgba(210,230,255,0.6)', tint = br ? 'rgba(255,255,255,0.5)' : 'rgba(200,225,255,0.07)';
        const liq = (path) => { g.save(); g.clip(path); g.fillStyle = rgba(col, br ? 0.85 : 0.75); g.fillRect(x - 60, base - 26 * s, 200, 40 * s); g.restore(); };
        const out = (path) => { g.fillStyle = tint; g.fill(path); liq(path); g.strokeStyle = glass; g.lineWidth = 1.6; g.stroke(path); };
        const p = new Path2D(); let w = 24 * s;
        if (k === 'erlen' || k === 'flasklet') { const W0 = (k === 'flasklet' ? 22 : 30) * s, H0 = (k === 'flasklet' ? 30 : 42) * s; w = W0; p.moveTo(x + W0 * 0.36, base - H0); p.lineTo(x + W0 * 0.36, base - H0 * 0.7); p.lineTo(x, base); p.lineTo(x + W0, base); p.lineTo(x + W0 * 0.64, base - H0 * 0.7); p.lineTo(x + W0 * 0.64, base - H0); }
        else if (k === 'round') { const R0 = 15 * s; w = R0 * 2; p.moveTo(x + R0 - 4 * s, base - R0 * 2 - 16 * s); p.lineTo(x + R0 - 4 * s, base - R0 * 1.8); p.arc(x + R0, base - R0, R0, -Math.PI * 0.62, Math.PI * 1.62, true); p.lineTo(x + R0 + 4 * s, base - R0 * 2 - 16 * s); }
        else if (k === 'cyl') { w = 14 * s; p.rect(x + 2 * s, base - 52 * s, 10 * s, 50 * s); g.fillStyle = glass; g.fillRect(x - 2 * s, base - 3 * s, 18 * s, 3 * s); }
        else if (k === 'coil') { w = 18 * s; p.rect(x + 3 * s, base - 54 * s, 12 * s, 52 * s); }
        else if (k === 'vol') { const R0 = 12 * s; w = R0 * 2; p.moveTo(x + R0 - 2.5 * s, base - 54 * s); p.lineTo(x + R0 - 2.5 * s, base - R0 * 2); p.arc(x + R0, base - R0, R0, -Math.PI * 0.56, Math.PI * 1.56, true); p.lineTo(x + R0 + 2.5 * s, base - 54 * s); }
        else if (k === 'retort') { const R0 = 13 * s; w = R0 * 2 + 18 * s; p.arc(x + R0, base - R0, R0, 0, TAU); }
        else if (k === 'rack') { w = 34 * s; for (let i = 0; i < 3; i++) p.rect(x + (3 + i * 11) * s, base - 34 * s, 7 * s, 30 * s); }
        else if (k === 'sep') { w = 24 * s; p.moveTo(x + 9 * s, base - 50 * s); p.lineTo(x + 15 * s, base - 50 * s); p.quadraticCurveTo(x + 26 * s, base - 30 * s, x + 14 * s, base - 14 * s); p.lineTo(x + 10 * s, base - 14 * s); p.quadraticCurveTo(x - 2 * s, base - 30 * s, x + 9 * s, base - 50 * s); }
        else if (k === 'jarlet') { w = 22 * s; p.roundRect ? p.roundRect(x, base - 26 * s, 22 * s, 26 * s, 3 * s) : p.rect(x, base - 26 * s, 22 * s, 26 * s); }
        else { w = 20 * s; p.moveTo(x + 6 * s, base - 40 * s); p.lineTo(x + 14 * s, base - 40 * s); p.lineTo(x + 14 * s, base - 30 * s); p.lineTo(x + 20 * s, base - 24 * s); p.lineTo(x + 20 * s, base); p.lineTo(x, base); p.lineTo(x, base - 24 * s); p.lineTo(x + 6 * s, base - 30 * s); p.closePath(); }
        out(p);
        if (k === 'coil') { g.strokeStyle = rgba(col, 0.9); g.lineWidth = 1.6; g.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40, yy = base - 50 * s + t * 46 * s, xx = x + 9 * s + Math.sin(t * TAU * 5) * 4 * s; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); }
        if (k === 'retort') { g.strokeStyle = glass; g.lineWidth = 4 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + 13 * s, base - 24 * s); g.quadraticCurveTo(x + 18 * s, base - 40 * s, x + 44 * s, base - 30 * s); g.stroke(); }
        if (k === 'sep') { g.fillStyle = glass; g.fillRect(x + 7 * s, base - 14 * s, 10 * s, 3 * s); g.fillRect(x + 11 * s, base - 12 * s, 2 * s, 12 * s); }
        if (k === 'rack') { g.fillStyle = br ? '#a07a52' : '#5a4030'; g.fillRect(x, base - 20 * s, 34 * s, 4 * s); g.fillRect(x, base - 3 * s, 34 * s, 3 * s); }
        if (k === 'bottle' || k === 'jarlet') { g.fillStyle = br ? 'rgba(255,255,255,0.92)' : 'rgba(235,240,255,0.85)'; g.fillRect(x + w * 0.18, base - (k === 'bottle' ? 18 : 17) * s, w * 0.64, 8 * s); g.fillStyle = rgba(col, 0.9); g.fillRect(x + w * 0.24, base - 15 * s, w * 0.3, 2); if (k === 'bottle') { g.fillStyle = br ? '#8a6a52' : '#4a3a30'; g.fillRect(x + 6.5 * s, base - 44 * s, 7 * s, 5 * s); } }
        void R;
        return w;
      }

      /* ---------------- vessels ---------------- */
      const lipLocal = (Vv) => [Vv.dir * Vv.sh.mw / 2, 0];
      const poly = (Vv) => xform(Vv.sh.inner, Vv.x, Vv.y, Vv.ang, Vv.scale);
      function poseAt(Vv, tilt) { const a = tilt * Vv.dir, lp = lipLocal(Vv), r = rot(lp[0], lp[1], a); return { x: Vv.pivot.x - r[0], y: Vv.pivot.y - r[1], ang: a }; }
      function onsetTilt(Vv) {
        const vol = Vv.frac * M.Aj;
        for (let tl = 0; tl < 2.5; tl += 0.03) { const ps = poseAt(Vv, tl); if (vol > areaBelow(xform(Vv.sh.inner, ps.x, ps.y, ps.ang), Vv.pivot.y) + 1) return tl; }
        return 2.5;
      }
      function lipWorld(Vv) { if (Vv.docked) return Vv.pivot; const lp = lipLocal(Vv), r = rot(lp[0], lp[1], Vv.ang); return { x: Vv.x + r[0], y: Vv.y + r[1] }; }
      function bodyCentre(Vv) { const r = rot(0, Vv.sh.h * 0.58, Vv.ang); return { x: Vv.x + r[0] * Vv.scale, y: Vv.y + r[1] * Vv.scale }; }
      function jarLayers() { return V.jar.layers; }
      const layerFrac = (k) => (V.jar.layers.find(l => l.k === k) || { f: 0 }).f;
      const jarTotal = () => V.jar.layers.reduce((a, l) => a + l.f, 0);
      function addLayer(Vv, k, df) { const ls = Vv.layers, top = ls[ls.length - 1]; if (top && top.k === k) top.f += df; else ls.push({ k, f: df }); }

      /* ---------------- grabbing, docking, tilting ---------------- */
      const GR = { on: false, a0: 0, t0: 0, off: { x: 0, y: 0 }, card: null, lastP: null };
      function grabStart(p, card) {
        const Vv = V.src; if (!Vv || st.auto || !st.canPour) return false;
        GR.on = true; GR.card = card || null; GR.lastP = p;
        if (Vv.docked) { GR.a0 = Math.atan2(p.y - Vv.pivot.y, p.x - Vv.pivot.x); GR.t0 = Vv.tilt; }
        else { Vv.held = true; Vv.moving = false; GR.off = { x: Vv.x - p.x, y: Vv.y - p.y }; }
        sPick(); K.guide(null); Vv.squash = 0.12;
        return true;
      }
      function grabMove(p) {
        const Vv = V.src; if (!GR.on || !Vv) return; GR.lastP = p;
        if (Vv.docked) {
          let d = Math.atan2(p.y - Vv.pivot.y, p.x - Vv.pivot.x) - GR.a0; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
          Vv.tiltT = clamp(GR.t0 + d * Vv.dir, 0, Vv.maxTilt || 2.2);
          if (Math.hypot(p.x - Vv.pivot.x, p.y - Vv.pivot.y) > Vv.sh.h * 2.4 * Vv.scale) undock(Vv, p);
        } else {
          Vv.tx = p.x + GR.off.x; Vv.ty = p.y + GR.off.y;
          const lp = lipLocal(Vv), lx = Vv.tx + lp[0], ly = Vv.ty + lp[1];
          if (Vv.dock && Math.hypot(lx - Vv.dock.x, ly - Vv.dock.y) < 54 * M.s) dock(Vv, p);
        }
      }
      function grabEnd() {
        const Vv = V.src; if (!GR.on) return; GR.on = false; if (!Vv) return;
        Vv.held = false;
        if (Vv.docked) { Vv.tiltT = Vv.restTilt; K.later(() => afterRelease(Vv), 380); }
        else sendHome(Vv);
      }
      function dock(Vv, p) {
        Vv.docked = true; Vv.pivot = { x: Vv.dock.x, y: Vv.dock.y }; Vv.from = { x: Vv.x, y: Vv.y, ang: Vv.ang }; Vv.dockK = 0;
        Vv.onset = onsetTilt(Vv); Vv.restTilt = clamp(Vv.onset - 0.34, 0.16, 1.4); Vv.maxTilt = Vv === V.jar ? 1.95 : 2.25;
        Vv.tilt = Vv.restTilt * 0.7; Vv.tiltT = Vv.restTilt; Vv.tiltV = 0;
        if (p) { GR.a0 = Math.atan2(p.y - Vv.pivot.y, p.x - Vv.pivot.x); GR.t0 = Vv.restTilt; }
        sClink(1.15); P.emit('star', Vv.pivot.x, Vv.pivot.y, 6, { colors: ['#ffffff', Vv.liq.hi], speed: [30, 90] });
        if (Vv.card && !st.chosen) commit(Vv.card);
        srcTag.hidden = true;
        ctx.track('dock', { step: st.step });
        if (!st.auto) K.later(() => { if (V.src === Vv && Vv.docked && !GR.on && Vv.flow < 1) tiltGuide(); }, 900);
      }
      function undock(Vv, p) {
        Vv.docked = false; Vv.held = true; Vv.pivot = null;
        GR.off = { x: Vv.x - p.x, y: Vv.y - p.y }; Vv.tx = Vv.x; Vv.ty = Vv.y;
      }
      function sendHome(Vv) {
        if (Vv.card && !st.chosen) { // never chosen: it goes back to its card
          const r = K.rectIn(Vv.card.el), x0 = Vv.x, y0 = Vv.y; Vv.moving = true;
          tween(260, q => { Vv.x = Vv.tx = lerp(x0, r.cx, q); Vv.y = Vv.ty = lerp(y0, r.cy - Vv.sh.h * 0.4, q); Vv.alpha = 1 - q; }, ease.inCubic).then(() => { if (V.src === Vv) { V.src = null; Vv.card.el.classList.remove('lift'); hit.hidden = true; } stepGuide(); });
          return;
        }
        Vv.moving = true; const x0 = Vv.x, y0 = Vv.y, h0 = Vv.home;
        tween(380, q => { Vv.tx = Vv.x = lerp(x0, h0.x, q); Vv.ty = Vv.y = lerp(y0, h0.y, q) - Math.sin(q * Math.PI) * 30; }, ease.inOutCubic).then(() => { Vv.moving = false; sClink(0.7, 0.6); Vv.squash = 0.14; stepGuide(); });
      }
      function afterRelease(Vv) {
        if (V.src !== Vv || GR.on || st.auto || !Vv.docked) return;
        const g = st.goal; if (!g) return;
        const got = g.k === 'filter' ? 0 : layerFrac(g.k);
        if (g.k === 'filter') { if (Vv.frac < 0.02) done(); else tiltGuide(true); return; }
        if (g.k === 'pred') { if (got >= 0.012) { st.predLockT = now(); K.later(() => { if (V.src === Vv && !GR.on && now() - st.predLockT >= 650) done(); }, 700); } else tiltGuide(true); return; }
        if (got >= g.f - TOL || Vv.frac < 0.004) done(); else tiltGuide(true);
      }

      /* ---------------- pouring: the lip, the stream, the receiving glass ---------------- */
      function pourStep(Vv, dt) {
        if (!Vv.docked || Vv.frac <= 0) { Vv.flow = 0; return; }
        const pts = poly(Vv), vol = Vv.frac * M.Aj, cap = areaBelow(pts, Vv.pivot.y), excess = vol - cap;
        let dv = 0;
        if (excess > 0.5) {
          const qMax = M.Aj * 0.085 * Vv.liq.visc, q = Math.min(qMax, excess * 5 + M.Aj * 0.012);
          dv = Math.min(vol, excess, q * dt);
        }
        if (dv > 0 && Vv === V.jar) { const room = Math.max(0, 0.16 - V.fun.f) * M.Aj; dv = Math.min(dv, room + M.Aj * 0.02 * dt); } // the funnel can only take so much
        Vv.frac -= dv / M.Aj; Vv.flow = dt > 0 ? dv / dt : 0;
        if (dv > 0) receive(Vv, dv / M.Aj);
      }
      function receive(Vv, df) {
        if (Vv === V.jar) { V.fun.f += df; return; }
        const k = st.goal.k;
        addLayer(V.jar, k, df);
        if (k === 'pred') { const p = Math.round(clamp(layerFrac('pred') / GOAL.pred, 0, 1) * 100); if (Math.floor(p / 5) !== Math.floor((st.pred || 0) / 5)) sTick(p / 100); st.pred = p; }
        const g = st.goal; if (g && g.f && !g.hit && k !== 'pred' && layerFrac(k) >= g.f - TOL * 0.4) { g.hit = true; st.flash = 1; sGood(0); }
      }
      // the stream as a falling ribbon from the lip to the surface below
      function streamPath(Vv) {
        const lip = Vv.pivot, q = Vv.flowVis, qMax = M.Aj * 0.085, k = clamp(q / qMax, 0, 1.4), a = Vv.ang;
        const dir = rot(Vv.dir, 0, a), v0 = (30 + 130 * k) * M.s, vx = dir[0] * v0, vy = Math.max(-20, dir[1] * v0), g0 = 1500 * M.s;
        let surf;
        if (Vv === V.jar) surf = M.funTop + M.funH * (1 - clamp(V.fun.f / 0.16, 0, 1)) * 0.85;
        else surf = V.jar.level != null ? V.jar.level : M.bench - 6;
        const dy = surf - lip.y, tl = (-vy + Math.sqrt(Math.max(0, vy * vy + 2 * g0 * Math.max(4, dy)))) / g0;
        const pts = []; for (let i = 0; i <= 12; i++) { const t = tl * i / 12; pts.push([lip.x + vx * t, lip.y + vy * t + 0.5 * g0 * t * t]); }
        return { pts, w: (2 + 9 * Math.sqrt(k)) * M.s, land: pts[12] };
      }

      /* ---------------- simulation ---------------- */
      function stepVessel(Vv, dt) {
        if (Vv.docked) {
          Vv.tiltV += ((Vv.tiltT - Vv.tilt) * 260 - Vv.tiltV * 26) * dt; Vv.tilt += Vv.tiltV * dt;
          Vv.tilt = clamp(Vv.tilt, 0, (Vv.maxTilt || 2.2) + 0.1);
          const ps = poseAt(Vv, Vv.tilt);
          if (Vv.dockK < 1) { Vv.dockK = Math.min(1, Vv.dockK + dt / 0.14); const e = ease.outCubic(Vv.dockK); Vv.x = lerp(Vv.from.x, ps.x, e); Vv.y = lerp(Vv.from.y, ps.y, e); Vv.ang = lerp(Vv.from.ang, ps.ang, e); }
          else { Vv.x = ps.x; Vv.y = ps.y; Vv.ang = ps.ang; }
        } else if ((Vv.held || Vv.moving || Vv.free) && !Vv.fixedAng) {
          const px = Vv.x;
          if (Vv.held) { const k = Math.min(1, dt * 24); Vv.x += (Vv.tx - Vv.x) * k; Vv.y += (Vv.ty - Vv.y) * k; }
          const vx = dt > 0 ? (Vv.x - px) / dt : 0; Vv.vx += (vx - Vv.vx) * Math.min(1, dt * 10);
          const leanT = clamp(-Vv.vx * 0.0009, -0.4, 0.4);
          Vv.lean += (leanT - Vv.lean) * Math.min(1, dt * 9); Vv.ang = Vv.lean;
        }
        // the surface sloshes against sideways acceleration
        const acc = dt > 0 ? (Vv.vx - (Vv.pvx || 0)) / dt : 0; Vv.pvx = Vv.vx;
        Vv.sloshV += (-Vv.slosh * 90 - Vv.sloshV * 5 - clamp(acc, -4000, 4000) * 0.00012) * dt; Vv.slosh = clamp(Vv.slosh + Vv.sloshV * dt, -0.3, 0.3);
        Vv.squash = (Vv.squash || 0) * Math.exp(-dt * 9);
        Vv.flowVis += (Vv.flow - Vv.flowVis) * Math.min(1, dt * 14);
      }
      function stepWaves(Vv, dt) { const W = [9, 14.5, 20]; Vv.waves.forEach((m, n) => { m.v += (-W[n] * W[n] * m.a - 3.2 * m.v) * dt; m.a += m.v * dt; m.a = clamp(m.a, -6, 6); }); }
      function kick(Vv, x, amp) { const l = Vv.x - Vv.sh.w * Vv.scale / 2, w = Vv.sh.w * Vv.scale; Vv.waves.forEach((m, n) => { m.v += amp * Math.cos((n + 1) * Math.PI * clamp((x - l) / w, 0, 1)) * (1 - n * 0.25); }); }
      const waveAt = (Vv, x) => { const l = Vv.x - Vv.sh.w * Vv.scale / 2, w = Vv.sh.w * Vv.scale; let y = 0; Vv.waves.forEach((m, n) => { y += m.a * Math.cos((n + 1) * Math.PI * clamp((x - l) / w, 0, 1)); }); return y; };
      function bubbles(Vv, x, y, n, o) { o = o || {}; for (let i = 0; i < n; i++) { if (Vv.bub.length > (Q.level < 1 ? 40 : 90)) break; Vv.bub.push({ x: x + (Math.random() - 0.5) * (o.spread || 14) * M.s, y: y + Math.random() * (o.depth || 10) * M.s, r: (o.r || 1.2) + Math.random() * (o.rr || 2.4), vy: -(30 + Math.random() * 50) * M.s, ph: Math.random() * TAU, life: 0 }); } }
      function stepBubbles(Vv, dt, surfaceY) {
        for (let i = Vv.bub.length - 1; i >= 0; i--) {
          const b = Vv.bub[i]; b.life += dt; b.vy -= 30 * dt; b.y += b.vy * dt; b.x += Math.sin(b.life * 7 + b.ph) * 12 * dt;
          const top = surfaceY(b.x);
          if (b.y - b.r <= top) { Vv.bub.splice(i, 1); if (Math.random() < 0.35) P.emit('drop', b.x, top, 1, { colors: ['rgba(255,255,255,0.8)'], speed: [20, 50], angle: -Math.PI / 2, spread: 1.2 }); if (Math.random() < 0.08) sBlub(); }
        }
      }

      /* ---------------- drawing ---------------- */
      function pathOf(g, pts, close) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); if (close) g.closePath(); }
      const liqCol = (k) => { const c = LIQ[k].col; return st.murk > 0 && st.murkT > 0 && V.jar.layers.length ? mixHex(c, LIQ.murk.col, st.murk * 0.7) : c; };
      function drawLayered(g, Vv, layers, unit, t, glow) {
        const pts = poly(Vv), br = bright(), xl = Vv.x - Vv.sh.w * Vv.scale / 2, w = Vv.sh.w * Vv.scale;
        let cum = 0; const total = layers.reduce((a, l) => a + l.f, 0);
        if (total * unit < 1) { Vv.level = Vv.y + Vv.sh.h * Vv.scale; return; }
        g.save(); pathOf(g, pts, true); g.clip();
        const yAt = (f) => levelFor(pts, f * unit);
        const top = yAt(total); Vv.level = top;
        for (let i = 0; i < layers.length; i++) {
          const lay = layers[i], y1 = yAt(cum), y0 = yAt(cum + lay.f); cum += lay.f;
          const col = Vv === V.jar ? liqCol(lay.k) : LIQ[lay.k].col, hi = LIQ[lay.k].hi;
          const gr = g.createLinearGradient(xl, 0, xl + w, 0); gr.addColorStop(0, mixHex(col, '#000000', 0.28)); gr.addColorStop(0.35, col); gr.addColorStop(0.62, mixHex(col, '#ffffff', 0.12)); gr.addColorStop(1, mixHex(col, '#000000', 0.35));
          g.fillStyle = gr;
          if (i === layers.length - 1) { g.beginPath(); g.moveTo(xl - 2, y1 + 1); for (let k = 0; k <= 16; k++) { const x = xl - 2 + (w + 4) * k / 16; g.lineTo(x, y0 + waveAt(Vv, x)); } g.lineTo(xl + w + 2, y1 + 1); g.closePath(); g.fill(); }
          else { g.fillRect(xl - 2, y0, w + 4, y1 - y0 + 1); g.fillStyle = rgba(hi, 0.35); g.fillRect(xl - 2, y0, w + 4, 1.5); }
          if (glow && !br) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.28 * glow; g.drawImage(K.glowSprite(rgba(hi, 0.9)), Vv.x - w * 0.55, (y0 + y1) / 2 - (y1 - y0) * 0.8 - 6, w * 1.1, (y1 - y0) * 1.6 + 12); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        }
        // meniscus
        g.strokeStyle = rgba(LIQ[layers[layers.length - 1].k].hi, 0.9); g.lineWidth = 1.6; g.beginPath();
        for (let k = 0; k <= 16; k++) { const x = xl + w * k / 16; const y = top + waveAt(Vv, x); k ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
        // contaminant swirls
        if (Vv === V.jar && st.murk > 0.02) {
          g.strokeStyle = rgba('#4a3b2e', 0.55 * st.murk); g.lineWidth = 3 * M.s; g.lineCap = 'round';
          for (let i = 0; i < 5; i++) { const yy = lerp(top + 8, Vv.y + Vv.sh.h - 10, (i + 0.5) / 5), ph = t * 1.3 + i * 1.7; g.beginPath(); g.moveTo(xl + 6, yy); g.bezierCurveTo(xl + w * 0.3, yy - 14 * Math.sin(ph), xl + w * 0.6, yy + 14 * Math.cos(ph * 0.8), xl + w - 6, yy + 4 * Math.sin(ph)); g.stroke(); }
          g.lineCap = 'butt';
        }
        // bubbles
        drawBubbles(g, Vv);
        g.restore();
      }
      function drawBubbles(g, Vv) {
        if (!Vv.bub.length) return;
        g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1; g.fillStyle = 'rgba(255,255,255,0.9)';
        for (const b of Vv.bub) { g.beginPath(); g.arc(b.x, b.y, b.r * M.s, 0, TAU); g.stroke(); g.fillRect(b.x - b.r * 0.4 * M.s, b.y - b.r * 0.5 * M.s, 1.2, 1.2); }
      }
      function drawSingle(g, Vv, col, hi) {
        const pts = poly(Vv), vol = Vv.frac * M.Aj; if (vol < 1) { Vv.level = null; return; }
        const Lv = levelFor(pts, vol); Vv.level = Lv;
        let cx = 0, n = 0; pts.forEach(p => { cx += p[0]; n++; }); cx /= n;
        const sl = Vv.docked ? 0 : Vv.slosh, nx = -Math.sin(sl), ny = Math.cos(sl);
        const liq = clipHalf(pts, cx, Lv, nx, ny); if (liq.length < 3) return;
        let y0 = Infinity, y1 = -Infinity; liq.forEach(p => { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
        const gr = g.createLinearGradient(0, y0, 0, y1 + 1); gr.addColorStop(0, mixHex(col, '#ffffff', 0.18)); gr.addColorStop(1, mixHex(col, '#000000', 0.25));
        g.fillStyle = gr; pathOf(g, liq, true); g.fill();
        // meniscus along the surface chord
        const surf = liq.filter(p => Math.abs((p[0] - cx) * nx + (p[1] - Lv) * ny) < 0.6);
        if (surf.length >= 2) { g.strokeStyle = rgba(hi, 0.95); g.lineWidth = 1.8; g.beginPath(); g.moveTo(surf[0][0], surf[0][1]); g.lineTo(surf[surf.length - 1][0], surf[surf.length - 1][1]); g.stroke(); }
        if (!bright()) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.22; const bc = bodyCentre(Vv); g.drawImage(K.glowSprite(rgba(hi, 0.9)), bc.x - Vv.sh.w * 0.7, bc.y - Vv.sh.h * 0.45, Vv.sh.w * 1.4, Vv.sh.h * 0.9); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      }
      function drawGlass(g, Vv, back) {
        const pts = poly(Vv), br = bright(), sc = Vv.scale;
        if (back) { g.fillStyle = br ? 'rgba(255,255,255,0.42)' : 'rgba(190,220,255,0.07)'; pathOf(g, pts, true); g.fill(); return; }
        g.lineJoin = 'round'; g.lineCap = 'round';
        pathOf(g, pts, false);
        g.strokeStyle = br ? 'rgba(52,72,110,0.78)' : 'rgba(205,228,255,0.62)'; g.lineWidth = 2.8 * M.s * sc; g.stroke();
        g.strokeStyle = br ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.22)'; g.lineWidth = 1; g.stroke();
        const hl = xform(Vv.sh.hl, Vv.x, Vv.y, Vv.ang, sc);
        pathOf(g, hl, false); g.strokeStyle = br ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.5)'; g.lineWidth = 2.6 * M.s * sc; g.stroke();
        // flared lips at the mouth
        const a = pts[0], b = pts[pts.length - 1], d = rot(1, 0, Vv.ang), f = 3.5 * M.s * sc;
        g.strokeStyle = br ? 'rgba(52,72,110,0.85)' : 'rgba(225,240,255,0.8)'; g.lineWidth = 3.4 * M.s * sc;
        g.beginPath(); g.moveTo(a[0] - d[0] * f, a[1] - d[1] * f); g.lineTo(a[0] + d[0] * 0.5, a[1] + d[1] * 0.5); g.moveTo(b[0] + d[0] * f, b[1] + d[1] * f); g.lineTo(b[0] - d[0] * 0.5, b[1] - d[1] * 0.5); g.stroke();
        g.lineCap = 'butt';
      }
      function drawJarMarks(g, Vv) {
        if (Vv.ang || st.murk > 0.6) return;
        const br = bright(), xr = Vv.x + Vv.sh.w / 2 - 3, y0 = Vv.y, hgt = Vv.sh.h;
        g.strokeStyle = br ? 'rgba(52,72,110,0.55)' : 'rgba(210,230,255,0.45)'; g.lineWidth = 1.2; g.beginPath();
        for (let i = 1; i < 10; i++) { const y = y0 + hgt * i / 10, l = i === 5 ? 12 : 7; g.moveTo(xr, y); g.lineTo(xr - l * M.s, y); }
        g.stroke();
        // the dose line for the current step: a glowing band where this layer should end
        const gl = st.goal; if (!gl || !gl.f || gl.k === 'pred' || gl.k === 'filter') return;
        const pts = poly(Vv), base = jarTotal() - layerFrac(gl.k), yT = levelFor(pts, (base + gl.f) * M.Aj), yA = levelFor(pts, (base + gl.f + TOL) * M.Aj), yB = levelFor(pts, (base + gl.f - TOL) * M.Aj);
        const col = LIQ[gl.k].hi, pulse = 0.5 + 0.5 * st.beat, hitk = st.flash;
        g.fillStyle = rgba(col, (br ? 0.2 : 0.14) + 0.12 * pulse + 0.3 * hitk); g.fillRect(Vv.x - Vv.sh.w / 2, yA, Vv.sh.w, yB - yA);
        g.setLineDash([6, 5]); g.strokeStyle = rgba(br ? mixHex(col, '#000000', 0.45) : col, 0.9); g.lineWidth = 2; g.beginPath(); g.moveTo(Vv.x - Vv.sh.w / 2 - 8 * M.s, yT); g.lineTo(Vv.x + Vv.sh.w / 2 + 8 * M.s, yT); g.stroke(); g.setLineDash([]);
        st.goalY = yT;
      }
      function drawStream(g, Vv, col, hi, t) {
        if (Vv.flowVis < M.Aj * 0.004) return null;
        const sp = streamPath(Vv), pts = sp.pts, L0 = [], R0 = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], ln = Math.hypot(dx, dy) || 1;
          const w = sp.w * (1 - 0.42 * i / (pts.length - 1)) * (1 + 0.12 * Math.sin(t * 40 + i * 1.3)) / 2;
          L0.push([pts[i][0] - dy / ln * w, pts[i][1] + dx / ln * w]); R0.push([pts[i][0] + dy / ln * w, pts[i][1] - dx / ln * w]);
        }
        g.fillStyle = col; g.beginPath(); L0.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); for (let i = R0.length - 1; i >= 0; i--) g.lineTo(R0[i][0], R0[i][1]); g.closePath(); g.fill();
        g.strokeStyle = rgba(hi, 0.85); g.lineWidth = 1.2; g.beginPath(); L0.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
        return sp;
      }
      function drawFunnel(g, t) {
        const F = V.fun; if (!F || F.alpha <= 0.01) return;
        const br = bright(), x = M.capX, y = M.funTop + F.dy, w = M.funW, fh = M.funH, sw = 7 * M.s;
        g.save(); g.globalAlpha = F.alpha;
        const cone = [[x - w / 2, y], [x - sw / 2, y + fh], [x + sw / 2, y + fh], [x + w / 2, y]];
        g.fillStyle = br ? 'rgba(255,255,255,0.45)' : 'rgba(190,220,255,0.08)'; pathOf(g, cone, true); g.fill();
        // filter paper, stained by what it catches
        const pp = [[x - w / 2 + 5 * M.s, y + 3], [x, y + fh - 3], [x + w / 2 - 5 * M.s, y + 3]];
        g.fillStyle = mixHex('#fbf6ea', '#5c4636', clamp(st.stain * 3, 0, 0.8)); pathOf(g, pp, true); g.fill();
        g.strokeStyle = 'rgba(150,130,100,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y + 3); g.lineTo(x, y + fh - 4); g.moveTo(x - w * 0.22, y + 3); g.lineTo(x - 2, y + fh - 6); g.moveTo(x + w * 0.22, y + 3); g.lineTo(x + 2, y + fh - 6); g.stroke();
        // the murk pooling in the paper
        if (F.f > 0.002) { const k = clamp(F.f / 0.16, 0, 1), ly = y + fh - 3 - (fh - 8) * Math.sqrt(k); g.save(); pathOf(g, pp, true); g.clip(); g.fillStyle = rgba(LIQ.murk.col, 0.92); g.fillRect(x - w / 2, ly, w, y + fh - ly); g.restore(); }
        pathOf(g, cone, false); g.strokeStyle = br ? 'rgba(52,72,110,0.78)' : 'rgba(205,228,255,0.62)'; g.lineWidth = 2.6 * M.s; g.stroke();
        g.fillStyle = br ? 'rgba(52,72,110,0.6)' : 'rgba(205,228,255,0.5)'; g.fillRect(x - sw / 2, y + fh, sw, M.stem);
        g.restore();
        // drips from the stem: the clean liquid, its colour the layer now settling below
        if (F.drip > 0.002 && F.alpha > 0.5) {
          const k = capFillingKey(), col = LIQ[k].col, y0 = y + fh + M.stem, y1 = V.cap.level != null ? V.cap.level : M.bench - 4;
          g.fillStyle = col; const w0 = (1.5 + 3 * clamp(F.drip / 0.12, 0, 1)) * M.s; g.fillRect(x - w0 / 2, y0, w0, Math.max(0, y1 - y0));
          for (let i = 0; i < 3; i++) { const yy = y0 + ((t * 2.4 + i / 3) % 1) * Math.max(1, y1 - y0); g.beginPath(); g.arc(x, yy, w0 * 0.9, 0, TAU); g.fill(); }
        }
      }
      function drawCap(g, t) {
        const C = V.cap; if (!C || !st.capOn) return;
        const sc = C.scale, cw = (M.capW + 12 * M.s) * sc, chh = 22 * M.s * sc, x = C.x, y = C.y - chh - st.capLift * (1 - st.sealK) + 4 * M.s * sc;
        const br = bright();
        if (!st.sealed) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = (0.35 + 0.25 * st.beat) * (1 - st.sealK * 0.5); g.drawImage(K.glowSprite(rgba(LAB.acc, 0.9)), x - cw, y - chh * 1.4, cw * 2, chh * 3.6); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        const gr = g.createLinearGradient(x - cw / 2, 0, x + cw / 2, 0); gr.addColorStop(0, '#5d6680'); gr.addColorStop(0.35, '#d9e0ef'); gr.addColorStop(0.6, '#f6f8ff'); gr.addColorStop(1, '#6a7390');
        g.fillStyle = gr; g.beginPath(); if (g.roundRect) g.roundRect(x - cw / 2, y, cw, chh, 5 * M.s); else g.rect(x - cw / 2, y, cw, chh); g.fill();
        g.strokeStyle = 'rgba(40,46,70,0.45)'; g.lineWidth = 1.2; const off = (st.sealK * 3 * cw) % (cw / 6);
        for (let i = -1; i < 7; i++) { const xx = x - cw / 2 + off + i * cw / 6; if (xx < x - cw / 2 + 2 || xx > x + cw / 2 - 2) continue; g.beginPath(); g.moveTo(xx, y + 3); g.lineTo(xx, y + chh - 3); g.stroke(); }
        g.fillStyle = st.sealed ? LAB.acc : (br ? '#8fa0c4' : '#aab6d6'); g.fillRect(x - cw * 0.32, y - 5 * M.s * sc, cw * 0.64, 5 * M.s * sc);
        if (st.sealK > 0 && !st.sealed) { g.strokeStyle = rgba(LAB.acc, 0.95); g.lineWidth = 4 * M.s; g.beginPath(); g.arc(x, y + chh / 2, cw * 0.62, -Math.PI / 2, -Math.PI / 2 + TAU * st.sealK); g.stroke(); }
        void t;
      }
      function capFillingKey() { const C = V.cap; for (const k of ORDER) { const want = st.capGoal[k] || 0, got = (C.layers.find(l => l.k === k) || { f: 0 }).f; if (got < want - 1e-4) return k; } return 'obs'; }
      function drawPool(g, x, col, a, w) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.drawImage(K.glowSprite(rgba(col, 0.9)), x - w, M.bench - w * 0.22, w * 2, w * 0.44); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      function drawShadow(g, x, w) { g.fillStyle = bright() ? 'rgba(40,50,80,0.16)' : 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x, M.bench - 1, w * 0.6, 4 * M.s, 0, 0, TAU); g.fill(); }

      function draw(g, t, dt) {
        const W = M.w, H = M.h, dpr = cv.dpr || 1, br = bright();
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        ensureBG(); g.drawImage(BGC.c, 0, 0, W, H);
        // the finale lights the shelf one bottle at a time, and the window warms
        if (st.lights > 0) {
          g.globalCompositeOperation = 'lighter';
          BGC.bottles.forEach((b, i) => { const k = clamp(st.lights * (BGC.bottles.length + 3) - i, 0, 1); if (k <= 0) return; g.globalAlpha = k * (br ? 0.45 : 0.75) * (0.85 + 0.15 * Math.sin(t * 3 + i)); g.drawImage(K.glowSprite(rgba(b.col, 0.95)), b.x - b.r * 1.6, b.y - b.r * 1.6, b.r * 3.2, b.r * 3.2); });
          if (BGC.win) { g.save(); g.clip(BGC.win.path); g.globalAlpha = 0.5 * st.lights; const gr = g.createLinearGradient(0, BGC.win.y1, 0, BGC.win.y0); gr.addColorStop(0, '#ffb36b'); gr.addColorStop(1, 'rgba(255,190,140,0)'); g.fillStyle = gr; g.fillRect(BGC.win.x0, BGC.win.y0, BGC.win.x1 - BGC.win.x0, BGC.win.y1 - BGC.win.y0); g.restore(); }
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        }
        // glow pools on the bench under the lit glass
        const J = V.jar, topK = J.layers.length ? J.layers[J.layers.length - 1].k : null;
        if (topK && J.alpha > 0.05 && !J.docked) drawPool(g, J.x, liqCol(topK), (br ? 0.25 : 0.55) * J.alpha, M.jw * 1.2);
        if (V.cap && V.cap.layers.length) drawPool(g, V.cap.x, LIQ[V.cap.layers[V.cap.layers.length - 1].k].col, (br ? 0.3 : 0.6) * (1 + st.finale), M.capW * 1.6 * V.cap.scale);
        // the capsule and its funnel
        if (V.cap && V.cap.alpha > 0.01) {
          const C = V.cap; drawShadow(g, C.x, M.capW * C.scale);
          if (st.finale > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = (br ? 0.35 : 0.6) * st.finale * (0.85 + 0.15 * st.beat); g.drawImage(K.glowSprite(rgba(LAB.acc, 0.9)), C.x - M.capW * 2.2 * C.scale, C.y - M.capH * 0.4, M.capW * 4.4 * C.scale, M.capH * 1.9 * C.scale); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
          drawGlass(g, C, true); drawLayered(g, C, C.layers, (st.capUnit || 1) * C.scale * C.scale, t, 0.6 + st.finale); drawGlass(g, C, false);
          drawCap(g, t);
        }
        drawFunnel(g, t);
        // the jar
        if (J.alpha > 0.01) {
          g.save(); g.globalAlpha = J.alpha;
          if (!J.docked && !J.held && !J.moving) drawShadow(g, J.x, M.jw);
          if (topK && !br) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.3 * J.alpha; g.drawImage(K.glowSprite(rgba(liqCol(topK), 0.9)), J.x - M.jw * 1.3, J.y - M.jh * 0.1, M.jw * 2.6, M.jh * 1.3); g.globalAlpha = J.alpha; g.globalCompositeOperation = 'source-over'; }
          drawGlass(g, J, true);
          if (J.single) drawSingle(g, J, J.single.col, J.single.hi); else drawLayered(g, J, J.layers, M.Aj, t, 1);
          drawJarMarks(g, J); drawGlass(g, J, false);
          g.restore();
          if (J.docked) { const sp = drawStream(g, J, J.single.col, J.single.hi, t); if (sp && Math.random() < 0.5) P.emit('drop', sp.land[0], sp.land[1], 1, { colors: [J.single.col], speed: [30, 90], angle: -Math.PI / 2, spread: 1.6 }); }
        }
        // the flask in hand
        const Sv = V.src;
        if (Sv && Sv !== J && Sv.alpha > 0.01) {
          g.save(); g.globalAlpha = Sv.alpha;
          if (!Sv.held && !Sv.docked && !Sv.moving) drawShadow(g, Sv.x, Sv.sh.w);
          drawGlass(g, Sv, true); drawSingle(g, Sv, Sv.liq.col, Sv.liq.hi); drawGlass(g, Sv, false);
          g.restore();
          const sp = Sv.docked ? drawStream(g, Sv, Sv.liq.col, Sv.liq.hi, t) : null;
          if (sp) { if (Math.random() < Math.min(0.9, Sv.flowVis / (M.Aj * 0.05))) { P.emit('drop', sp.land[0], sp.land[1] - 2, 1, { colors: [Sv.liq.hi, Sv.liq.col], speed: [40, 120], angle: -Math.PI / 2, spread: 1.8 }); bubbles(J, sp.land[0], sp.land[1] + 6 * M.s, 1, { depth: 18 }); } kick(J, sp.land[0], Sv.flowVis / M.Aj * 9 * dt * 60); }
        }
        P.update(dt); P.draw(g);
        // the lights come up when the lab opens
        if (st.lit < 1) { g.fillStyle = 'rgba(2,4,14,' + ((1 - st.lit) * (br ? 0.55 : 0.78)).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
      }

      /* ---------------- DOM that follows the glass ---------------- */
      function placeTag(node, x, y, align) { const w = node.__w || (node.__w = node.offsetWidth), hh = node.__h || (node.__h = node.offsetHeight); const left = align === 'l' ? x : align === 'r' ? x - w : x - w / 2; node.style.transform = 'translate(' + clamp(left, 6, M.w - 6 - w).toFixed(1) + 'px,' + (y - hh / 2).toFixed(1) + 'px)'; }
      function setTag(node, html, liqKey) { node.innerHTML = html; node.__w = 0; node.__h = 0; if (liqKey) { node.style.setProperty('--liq', LIQ[liqKey].col); node.style.setProperty('--liqd', mixHex(LIQ[liqKey].col, '#000000', 0.45)); } node.hidden = false; }
      function placeDom() {
        const Sv = V.src, J = V.jar;
        if (Sv && st.canPour && !st.auto && (Sv.docked || !Sv.card || st.chosen)) { const c = bodyCentre(Sv), sz = Math.max(72, Math.min(130, Sv.sh.w * 1.15 * Sv.scale)); hit.hidden = false; hit.style.width = hit.style.height = sz + 'px'; hit.style.transform = 'translate(' + (c.x - sz / 2).toFixed(1) + 'px,' + (c.y - sz / 2).toFixed(1) + 'px)'; }
        else hit.hidden = true;
        if (!srcTag.hidden && Sv) placeTag(srcTag, Sv.x, Sv.y - 18 * M.s);
        // layer labels beside the jar
        const xr = J.x + M.jw / 2 + 10 * M.s, pts = (J.single || J.ang || J.alpha < 0.5) ? null : poly(J);
        let cum = 0;
        ORDER.forEach(k => {
          const tg = layerTags[k], f = layerFrac(k);
          if (!pts || tg.hidden) { if (tg.hidden === false && !pts) tg.style.opacity = '0'; cum += f; return; }
          if (f > 0.004) { tg.style.opacity = '1'; const y = (levelFor(pts, cum * M.Aj) + levelFor(pts, (cum + f) * M.Aj)) / 2; placeTag(tg, xr, Math.max(y, M.jarTop + 10), 'l'); }
          else if (k === 'pred' && st.predLive) { tg.style.opacity = '1'; placeTag(tg, xr, levelFor(pts, cum * M.Aj) - 14 * M.s, 'l'); }
          else tg.style.opacity = '0';
          cum += f;
        });
        if (!goalTag.hidden && st.goalY != null) placeTag(goalTag, xr, st.goalY, 'l');
        if (!outTag.hidden) placeTag(outTag, M.capX, M.funTop + V.fun.dy - 26 * M.s);
        if (!capTag.hidden && V.cap) { const C = V.cap, x = C.x + M.capW * C.scale / 2 + 10 * M.s; placeTag(capTag, x, C.y + M.capH * C.scale * 0.45, 'l'); }
        if (st.cheerT) { const k = (now() - st.cheerT) / 1300; if (k >= 1) { st.cheerT = 0; cheer.hidden = true; } else { const w = cheer.__w || (cheer.__w = cheer.offsetWidth); cheer.style.transform = 'translate(' + clamp(st.cheerX - w / 2, 6, M.w - 6 - w).toFixed(1) + 'px,' + (st.cheerY - k * 34).toFixed(1) + 'px) scale(' + (k < 0.15 ? 0.7 + k * 2 : 1).toFixed(3) + ')'; cheer.style.opacity = (k > 0.7 ? (1 - k) / 0.3 : 1).toFixed(3); } }
        if (!capHit.hidden && V.cap) { const C = V.cap, sz = Math.max(84, M.capW * C.scale * 1.8); capHit.style.width = capHit.style.height = sz + 'px'; capHit.style.transform = 'translate(' + (C.x - sz / 2).toFixed(1) + 'px,' + (C.y - 16 * M.s - sz / 2).toFixed(1) + 'px)'; }
      }
      function showCheer(text, x, y) { cheer.textContent = text; cheer.__w = 0; cheer.hidden = false; st.cheerT = now(); st.cheerX = x; st.cheerY = y; }

      /* ---------------- tiny tween helper (runs in the frame loop) ---------------- */
      const TWS = [];
      function tween(ms, fn, ez) { if (reduced()) ms = Math.min(ms, 220); return new Promise(res => { TWS.push({ t0: now(), ms: Math.max(1, ms), fn, ez: ez || (k => k), res }); }); }
      function stepTweens() { for (let i = TWS.length - 1; i >= 0; i--) { const tw = TWS[i], k = clamp((now() - tw.t0) / tw.ms, 0, 1); try { tw.fn(tw.ez(k)); } catch (e) { console.error(e); } if (k >= 1) { TWS.splice(i, 1); tw.res(); } } }
      const waiters = {};
      const waitFor = (name) => new Promise(res => { waiters[name] = res; });
      const fire = (name) => { const r = waiters[name]; if (r) { waiters[name] = null; r(); } };

      /* ---------------- the frame loop ---------------- */
      cv.onResize(() => layout());
      S.on('theme', () => { theme(); BGC.key = ''; });
      let lastT = 0;
      K.loop((dt0, t) => {
        const g = cv.g; if (!g || !M.w) return;
        const dt = lastT ? clamp(t - lastT, 0.001, 0.1) : 0.016; lastT = t;
        Q.acc += dt; Q.n++;
        if (Q.acc > 1.5) { if (Q.acc / Q.n > 0.03 && Q.steps < 2) { Q.steps++; Q.level = Math.max(0, Q.level - 1); if (cv.setQuality) cv.setQuality(Q.steps === 1 ? 0.8 : 0.65); } Q.acc = 0; Q.n = 0; }
        stepTweens();
        const vt = A.ctx ? A.now() - A.latency() : 0;
        while (MZ.pulses.length && MZ.pulses[0].t <= vt) { const pl = MZ.pulses.shift(); if (pl.e % 2 === 0) st.beat = 1; }
        st.beat = Math.max(0, st.beat - dt * 3); st.flash = Math.max(0, st.flash - dt * 2.5);
        st.lit += ((st.litT || 0) - st.lit) * Math.min(1, dt * 4); if (st.litT === 1 && st.lit > 0.995) st.lit = 1;
        st.murk += (st.murkT - st.murk) * Math.min(1, dt * 1.4);
        // physics in small steps, so a slow frame never spills a whole flask at once
        for (let rem = dt; rem > 1e-5; rem -= 1 / 60) {
          const hs = Math.min(rem, 1 / 60);
          if (V.src) { stepVessel(V.src, hs); pourStep(V.src, hs); }
          if (V.jar !== V.src) stepVessel(V.jar, hs);
          stepWaves(V.jar, hs); if (V.cap) stepWaves(V.cap, hs);
          if (V.fun && V.fun.f > 0) { const d = Math.min(V.fun.f, 0.1 * hs); V.fun.f -= d; V.fun.drip = d / hs; st.stain += d * st.murkShare; const clean = d * (1 - st.murkShare) * st.capFillK; capReceive(clean); } else if (V.fun) V.fun.drip = 0;
        }
        // fizz from the test layer for a while after it lands, and a gentle simmer everywhere after
        const J = V.jar, surfJ = (x) => (J.level != null ? J.level + waveAt(J, x) : J.y + J.sh.h);
        if (st.fizzT > now() && J.layers.length && !J.single) { const n = Q.level < 1 ? 1 : 2; for (let i = 0; i < n; i++) if (Math.random() < 0.7) bubbles(J, J.x + (Math.random() - 0.5) * M.jw * 0.8, J.y + J.sh.h - 8 * M.s, 1, { r: 0.8, rr: 1.6 }); }
        else if (J.layers.length && !J.single && Math.random() < dt * 3) bubbles(J, J.x + (Math.random() - 0.5) * M.jw * 0.7, J.y + J.sh.h - 8 * M.s, 1, { r: 0.8, rr: 1.4 });
        stepBubbles(J, dt, surfJ);
        if (V.cap) { const C = V.cap; if (st.finale > 0 && Math.random() < dt * 14) bubbles(C, C.x + (Math.random() - 0.5) * M.capW * C.scale * 0.7, C.y + M.capH * C.scale - 6, 1, { r: 0.8, rr: 1.6 }); stepBubbles(C, dt, (x) => (C.level != null ? C.level + waveAt(C, x) : C.y + M.capH)); }
        // sound follows the pour: the note rises as the glass fills, viscous liquids glug
        const Sv = V.src, flow = Sv ? Sv.flowVis / M.Aj : 0;
        if (pourA) { pourA.level(Math.min(0.16, flow * 1.7), 0.05); const fill = Sv === J ? clamp(V.fun.f / 0.16, 0, 1) : clamp(jarTotal() / 0.7, 0, 1); pourA.freq(420 + 1500 * fill + 300 * Math.sin(t * 9), 0.05); }
        if (fizzA) fizzA.level(st.fizzT > now() ? 0.05 : 0.0001, 0.3);
        if (Sv && flow > 0.004 && Sv.liq.visc < 0.9 && now() > (st.glugT || 0)) { st.glugT = now() + 110 + Math.random() * 120; if (A.ctx) A.tone({ type: 'sine', freq: 150 + Math.random() * 60, to: 260, glide: 0.06, dur: 0.07, vol: Math.min(0.09, flow * 1.2) }); }
        if (V.fun && V.fun.drip > 0.002 && now() > (st.dripT || 0)) { st.dripT = now() + 140 + Math.random() * 160; sDrip(0.9 + Math.random() * 0.4); }
        draw(g, t, dt);
        placeDom();
      });

      /* ---------------- the capsule receives the filtered liquid, layer by layer ---------------- */
      function capReceive(df) {
        if (!V.cap || df <= 0) return;
        let rem = df;
        for (const k of ORDER) {
          if (rem <= 0) break;
          const want = st.capGoal[k] || 0; let lay = V.cap.layers.find(l => l.k === k);
          const got = lay ? lay.f : 0; if (got >= want - 1e-6) continue;
          const take = Math.min(rem, want - got); if (!lay) { lay = { k, f: 0 }; V.cap.layers.push(lay); } lay.f += take; rem -= take;
          kick(V.cap, V.cap.x, take * 60);
        }
      }

      /* ---------------- input ---------------- */
      K.drag(hit, { space: el, start: (p) => grabStart(p) === true ? undefined : false, move: (p) => grabMove(p), end: () => grabEnd() });
      S.listen(hit, 'keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && V.src && st.canPour && !st.auto) { e.preventDefault(); A.unlock(); autoPour(V.src); } });
      function makeCard(item, kind, liqKey, i) {
        const L0 = LIQ[liqKey];
        const b = h('button', { type: 'button', class: 'tl-card', 'aria-label': item.text + '. Drag it to the jar and pour, or press Enter.' }, h('i', { html: ICON[kind] }), h('span', null, h('small', { text: item.short }), document.createTextNode(item.text)));
        b.style.setProperty('--liq', L0.col); b.style.setProperty('--liqd', mixHex(L0.col, '#000000', 0.45));
        const card = { el: b, item, kind, liqKey, i };
        K.drag(b, {
          space: el,
          start: (p) => {
            if (!st.canPour || st.auto || V.src || st.chosen) return false;
            const sh = shapeFor(kind), Vv = vessel(sh, { liq: L0, key: liqKey, frac: st.goal.src, card, dock: M.dockJar, dir: 1, home: srcHome(sh), free: true });
            Vv.x = Vv.tx = p.x; Vv.y = Vv.ty = p.y - sh.h * 0.58; V.src = Vv; b.classList.add('lift');
            grabStart(p, card); Vv.squash = 0.25; P.emit('spark', p.x, p.y - sh.h * 0.3, 8, { colors: [L0.hi, '#ffffff'], speed: [40, 120] });
          },
          move: (p) => grabMove(p),
          end: () => grabEnd()
        });
        S.listen(b, 'keydown', (e) => {
          if ((e.key === 'Enter' || e.key === ' ') && st.canPour && !st.auto && !V.src && !st.chosen) {
            e.preventDefault(); A.unlock();
            const sh = shapeFor(kind), Vv = vessel(sh, { liq: L0, key: liqKey, frac: st.goal.src, card, dock: M.dockJar, dir: 1, home: srcHome(sh), free: true });
            const r = K.rectIn(b); Vv.x = Vv.tx = r.cx; Vv.y = Vv.ty = r.cy - sh.h; V.src = Vv; commit(card); autoPour(Vv);
          }
        });
        return card;
      }
      const shapeFor = (kind) => (kind === 'tube' ? shTube(0.46 * M.jw, 0.66 * M.jh) : kind === 'round' ? shRound(0.74 * M.jw, 0.6 * M.jh) : shErlen(0.86 * M.jw, 0.62 * M.jh));
      function commit(card) {
        st.chosen = card; card.el.classList.remove('lift');
        tray.classList.add('off');
        if (st.goal.k === 'test') st.test = card.item; else st.obs = card.item;
        ctx.track('choose', { step: st.goal.k, id: card.item.id });
      }
      K.hold(capHit, {
        ms: 1150,
        start: () => { if (st.phase !== 'seal') return; K.guide(null); if (A.ctx) A.noise({ filter: 'highpass', freq: 3200, to: 1600, dur: 1.2, attack: 0.1, vol: 0.06 }); },
        progress: (k, active) => { if (st.phase !== 'seal') return; st.sealK = k; if (active && Math.floor(k * 8) !== st.sealTick) { st.sealTick = Math.floor(k * 8); if (A.ctx) A.click({ vol: 0.06 }); } },
        cancel: () => { if (st.phase === 'seal' && !st.sealed) { K.guide({ id: 'seal2', g: 'hold', target: capHit, label: 'HOLD A LITTLE LONGER', delay: 500 }); } },
        decay: 1.5,
        done: () => { if (st.phase === 'seal') sealDone(); }
      });

      /* ---------------- guides ---------------- */
      function tiltGuide(more) {
        const Vv = V.src; if (!Vv || !Vv.docked || GR.on) return;
        const c = bodyCentre(Vv), d = Vv.dir, R0 = Math.max(50, Math.hypot(c.x - Vv.pivot.x, c.y - Vv.pivot.y));
        const label = st.goal.k === 'pred' ? 'POUR HOW SURE YOU ARE' : st.goal.k === 'filter' ? (more ? 'KEEP POURING' : 'TIP IT THROUGH') : more ? 'TIP A LITTLE MORE' : 'LIFT IT TO POUR';
        K.guide({ id: 'tilt-' + st.goal.k + (more ? 'm' : ''), g: 'drag', target: () => bodyCentre(V.src || Vv), dx: Math.round(-d * R0 * 0.35), dy: Math.round(-R0 * 0.75), label, delay: more ? 400 : 300, place: 'below' });
      }
      function stepGuide() {
        if (!st.canPour || st.auto) return;
        const Vv = V.src;
        if (Vv && Vv.docked) { tiltGuide(); return; }
        if (Vv && !Vv.card) { const lp = lipLocal(Vv), c = bodyCentre(Vv); K.guide({ id: 'carry-' + st.goal.k, g: 'drag', target: () => bodyCentre(V.src || Vv), dx: Math.round(Vv.dock.x - (Vv.home.x + lp[0])), dy: Math.round(Vv.dock.y - Vv.home.y), label: st.goal.k === 'filter' ? 'POUR IT THROUGH' : 'CARRY IT TO THE JAR', delay: 600, place: 'below' }); void c; return; }
        const first = st.cards && st.cards.find(c => !c.el.classList.contains('used'));
        if (first) { const r = K.rectIn(first.el); K.guide({ id: 'card-' + st.goal.k, g: 'drag', target: first.el, dx: Math.round(M.dockJar.x - r.cx), dy: Math.round(M.dockJar.y + 60 * M.s - r.cy), label: st.goal.k === 'test' ? 'DRAG A TEST TO THE JAR' : 'DRAG ONE TO THE JAR', delay: 700, place: 'above' }); }
      }

      /* ---------------- steps ---------------- */
      function done() { if (!st.canPour) return; st.canPour = false; K.guide(null); fire('step'); }
      function showLog(head, paras, liqKey) {
        log.style.setProperty('--liq', liqKey ? LIQ[liqKey].col : LAB.acc); log.style.setProperty('--liqd', liqKey ? mixHex(LIQ[liqKey].col, '#000000', 0.45) : '#1d6fb0');
        log.replaceChildren(h('small', { text: head }), ...paras.map(p => h('p', { class: p.user ? 'gk-user' : '', text: p.t })));
        log.classList.remove('off');
      }
      const hideLog = () => log.classList.add('off');
      async function autoPour(Vv, goalFrac) {
        st.auto = true; K.guide(null);
        if (!Vv.docked) {
          const lp = lipLocal(Vv), x0 = Vv.x, y0 = Vv.y, x1 = Vv.dock.x - lp[0], y1 = Vv.dock.y; Vv.moving = true;
          await tween(650, q => { Vv.x = Vv.tx = lerp(x0, x1, q); Vv.y = Vv.ty = lerp(y0, y1, q) - Math.sin(q * Math.PI) * 40 * M.s; }, ease.inOutCubic);
          Vv.moving = false; dock(Vv, null);
          await K.wait(250);
        }
        const g = st.goal, want = goalFrac != null ? goalFrac : g.k === 'filter' ? 0 : g.k === 'pred' ? GOAL.pred * 0.6 : g.f;
        const reached = () => (g.k === 'filter' ? Vv.frac < 0.012 : layerFrac(g.k) >= want - TOL * 0.5);
        const t0 = now();
        Vv.tiltT = Math.min(Vv.maxTilt, Vv.onset + 0.42);
        while (!reached() && Vv.frac > 0.003 && now() - t0 < 12000) { await K.wait(40); if (Vv.flow < M.Aj * 0.01) Vv.tiltT = Math.min(Vv.maxTilt, Vv.tiltT + 0.03); }
        Vv.tiltT = Vv.restTilt;
        await K.wait(420);
        st.auto = false;
        done();
      }
      async function pourPhase(o) {
        st.phase = o.phase; st.step = o.k; st.chosen = null; st.goal = { k: o.k, f: o.goal, src: o.src, hit: false }; st.goalY = null;
        if (o.k !== 'filter' && o.k !== 'pred') { setTag(goalTag, LIQ[o.k].name, o.k); goalTag.classList.add('goal'); }
        st.canPour = true;
        if (o.cards) {
          tray.replaceChildren(h('b', { text: o.trayTitle }));
          st.cards = o.cards.map((it, i) => makeCard(it, o.kind, o.k, i));
          st.cards.forEach(c => tray.append(c.el));
          tray.classList.remove('off');
        } else if (o.vessel) { V.src = o.vessel; }
        if (o.line) say(glitch, o.line, { mood: o.mood || 'nerd', ms: 5200 });
        await K.wait(reduced() ? 300 : 700);
        if (o.autoPour) await autoPour(V.src);
        else stepGuide();
        await waitFor('step');
        // tidy away: the flask goes back to the shelf edge and fades
        const Sv = V.src;
        if (Sv && Sv !== V.jar) {
          Sv.docked = false; Sv.moving = true; Sv.fixedAng = true; const x0 = Sv.x, y0 = Sv.y, a0 = Sv.ang;
          tween(460, q => { Sv.x = lerp(x0, x0 - 60 * M.s, q); Sv.y = lerp(y0, y0 - 40 * M.s, q); Sv.ang = lerp(a0, 0, q); Sv.alpha = 1 - q; }, ease.inCubic).then(() => { if (V.src === Sv) V.src = null; });
          sClink(0.95, 0.7);
        }
        goalTag.hidden = true; srcTag.hidden = true; st.goal.f = 0;
        const f = o.k === 'filter' ? 0 : layerFrac(o.k);
        if (o.goal && o.k !== 'pred' && o.k !== 'filter') {
          const err = Math.abs(f - o.goal), prec = clamp(1 - err / (TOL * 3), 0, 1); st.precs.push(prec);
          if (err <= TOL) { showCheer('✦ Clean dose', V.jar.x, V.jar.y - 26 * M.s); sGood(1); }
        }
        if (o.k !== 'filter') { setTag(layerTags[o.k], o.k === 'pred' ? st.pred + '% sure' : LIQ[o.k].name, o.k); }
        ctx.track('pour', { step: o.k, f: Math.round(f * 1000) });
        return f;
      }
      function hypVessel() { const sh = shapeFor('erlen'); const Vv = vessel(sh, { liq: LIQ.hyp, key: 'hyp', frac: GOAL.hyp * 1.42, dock: M.dockJar, dir: 1, home: srcHome(sh), free: true }); Vv.x = Vv.tx = Vv.home.x; Vv.y = Vv.ty = Vv.home.y; return Vv; }
      function predVessel() { const sh = shapeFor('erlen'); const Vv = vessel(sh, { liq: LIQ.pred, key: 'pred', frac: GOAL.pred, dock: M.dockJar, dir: 1, home: srcHome(sh), free: true }); Vv.x = Vv.tx = Vv.home.x; Vv.y = Vv.ty = Vv.home.y - 30; Vv.moving = true; tween(420, q => { Vv.y = Vv.ty = Vv.home.y - 30 * (1 - q); Vv.alpha = q; }, ease.outCubic).then(() => { Vv.moving = false; Vv.squash = 0.18; sClink(0.75, 0.6); }); return Vv; }

      async function flow() {
        await K.intro({ title: 'Thought Lab', sub: 'A scary thought is a prediction. Predictions can be tested, one small, safe experiment at a time.', how: 'Carry each flask to the jar and lift it to pour. Filter it. Seal it.', char: 'glitch', mood: 'nerd' });
        // lights on
        st.phase = 'open'; st.litT = 1; MZ.layer = 1;
        if (A.ctx) { A.click({ vol: 0.14 }); A.tone({ type: 'sine', freq: 120, dur: 0.9, vol: 0.05, attack: 0.2 }); }
        say(glitch, L(LINES.open, { n: String(expNo) }), { mood: 'nerd', ms: 4200 });
        await K.wait(reduced() ? 900 : 2200);
        say(sync, L(LINES.syncHi), { mood: 'happy', ms: 2600 });
        await K.wait(reduced() ? 500 : 1100);
        // 1. the hypothesis
        const hv = hypVessel(); V.src = hv; hv.alpha = 0; tween(400, q => { hv.alpha = q; });
        setTag(srcTag, 'Hypothesis', 'hyp');
        showLog('Hypothesis', [{ t: beliefShown, user: beliefUser }, { t: gentle ? 'Glitch pours it in. Watch it settle to the line.' : 'Carry it to the jar and pour it in, up to the glowing line.' }], 'hyp');
        await pourPhase({ phase: 'hyp', k: 'hyp', goal: GOAL.hyp, src: GOAL.hyp * 1.42, line: L(gentle ? LINES.hypAuto : LINES.hyp), autoPour: gentle });
        hideLog(); sType();
        say(glitch, L(LINES.hypDone), { mood: 'think', ms: 3000 });
        await K.wait(reduced() ? 600 : 1300);
        // 2. a small, safe test
        MZ.layer = 2;
        await pourPhase({ phase: 'test', k: 'test', goal: GOAL.test, src: GOAL.test * 1.45, cards: tests, kind: 'tube', trayTitle: care ? 'A small step with someone who knows' : 'Pick one small, safe test', line: L(LINES.test) });
        st.fizzT = now() + 2800; if (A.ctx) { A.noise({ filter: 'highpass', freq: 4200, dur: 1.4, attack: 0.2, vol: 0.06 }); sGood(1); }
        say(sync, L(LINES.fizz), { mood: 'wow', ms: 2400 }); sync.react('bounce');
        showLog('Test', [{ t: st.test.text }], 'test'); sType();
        if (layerFrac('test') > GOAL.test + TOL * 1.6) { await K.wait(1600); say(glitch, L(LINES.bigDose), { mood: 'think', ms: 3200 }); }
        else { await K.wait(1500); say(glitch, L(LINES.testDone), { mood: 'happy', ms: 2800 }); }
        await K.wait(reduced() ? 900 : 2000); hideLog();
        // 3. the prediction: pour to how sure you are
        const pv = predVessel(); V.src = pv; setTag(srcTag, 'Prediction', 'pred');
        setTag(layerTags.pred, '0%<em>sure</em>', 'pred'); layerTags.pred.classList.add('big');
        showLog('Your prediction', [{ t: 'How sure are you it will come true?' }, { t: beliefUser ? beliefShown : 'Pour as high as it feels. There’s no wrong answer.' }], 'pred');
        st.predLive = true;
        await pourPhase({ phase: 'pred', k: 'pred', goal: 0, src: GOAL.pred, line: L(LINES.pred), mood: 'think' });
        st.predLive = false; layerTags.pred.classList.remove('big'); layerTags.pred.__w = 0; layerTags.pred.__h = 0;
        hideLog(); sType();
        say(glitch, L(LINES.predDone, { p: String(st.pred) }), { mood: strong ? 'think' : 'nerd', ms: 3400 });
        await K.wait(reduced() ? 700 : 1500);
        // 4. how you'll know
        MZ.layer = 3;
        await pourPhase({ phase: 'obs', k: 'obs', goal: GOAL.obs, src: GOAL.obs * 1.5, cards: obsList, kind: 'round', trayTitle: 'How will you know?', line: L(LINES.obs) });
        say(sync, L(LINES.glow), { mood: 'love', ms: 2600 }); st.flash = 1; sGood(2);
        showLog('How I’ll know', [{ t: st.obs.text }], 'obs'); sType();
        await K.wait(reduced() ? 1200 : 2600); hideLog();
        // twist: Sync "helps"
        await twist();
        await filterPhase();
        await sealPhase();
        await finale();
      }
      async function twist() {
        st.phase = 'twist';
        say(sync, L(LINES.twist, { sb: sb.short }), { mood: 'silly', ms: 3000 }); sync.react('bounce');
        await K.wait(reduced() ? 700 : 1500);
        // a dropper of murk lands in the jar
        safeList.forEach((s, i) => { K.later(() => { sPlop(); const x = V.jar.x + (i ? 10 : -6) * M.s; P.emit('drop', x, V.jar.level || V.jar.y + 40, 10, { colors: [LIQ.murk.col, LIQ.murk.hi], speed: [40, 140], angle: -Math.PI / 2, spread: 1.4 }); addLayer(V.jar, V.jar.layers[V.jar.layers.length - 1].k, 0.032); kick(V.jar, x, 40); }, i * 500); });
        st.murkT = 1; if (A.ctx) K.sfx.glitch();
        glitch.face('facepalm', 2200);
        await K.wait(reduced() ? 900 : 1700);
        ORDER.forEach(k => { layerTags[k].hidden = true; });
        st.goal = { k: 'filter' };
        say(glitch, L(LINES.murk, { sb: sb.short }), { mood: 'scan', ms: 4600 });
        showLog('Result: unreadable', [{ t: 'A safety behaviour got in: ' + safeList.map(s => s.label.toLowerCase()).join(' and ') + '.' }, { t: 'If it goes fine, it gets the credit, and the scary thought survives.' }], 'murk');
        log.style.setProperty('--liq', '#d8a27a'); log.style.setProperty('--liqd', '#7a4a2a');
        ctx.track('twist', { n: safeList.length });
        await K.wait(reduced() ? 1600 : 3400);
      }
      async function filterPhase() {
        st.phase = 'filter';
        // the capsule and its funnel slide in on the left
        const sh = shTube(M.capW, M.capH);
        V.cap = vessel(sh, { layers: [], kind: 'cap', home: { x: M.capX, y: M.capTop } }); V.cap.x = M.capX; V.cap.y = M.capTop + 40; V.cap.alpha = 0;
        V.fun = { f: 0, drip: 0, alpha: 0, dy: -30 };
        tween(560, q => { V.cap.y = M.capTop + 40 * (1 - q); V.cap.alpha = q; V.fun.alpha = q; V.fun.dy = -30 * (1 - q); }, ease.outBack).then(() => sClink(0.9, 0.7));
        // what each clean layer will be in the capsule (the murk stays in the paper)
        const total = ORDER.reduce((a, k) => a + layerFrac(k), 0) || 0.5, cont = safeList.length * 0.032;
        st.capGoal = {}; ORDER.forEach(k => { st.capGoal[k] = layerFrac(k) / (total) * (total - cont); });
        st.capUnit = (areaOf(sh.inner) * 0.86) / Math.max(0.05, total - cont); st.capFillK = 1; st.murkShare = clamp(cont / total, 0.02, 0.2); st.stain = 0;
        // the jar becomes one murky liquid, ready to pour
        const J = V.jar, jt = jarTotal();
        J.single = { col: mixHex(LIQ.murk.col, '#7a6a8a', 0.25), hi: LIQ.murk.hi }; J.frac = jt; J.liq = LIQ.murk; J.key = 'murk'; J.dir = -1; J.dock = M.dockFun; J.home = { x: M.jarX, y: M.jarTop }; J.free = true;
        V.src = J;
        setTag(outTag, '<s>' + safeList[0].label + '</s>'); outTag.hidden = true;
        await K.wait(reduced() ? 300 : 700);
        await pourPhase({ phase: 'filter', k: 'filter', goal: 0, line: L(LINES.filter, { sb: sb.short }), mood: 'determined' });
        hideLog();
        // let the funnel finish dripping
        const t0 = now(); while (V.fun.f > 0.002 && now() - t0 < 6000) await K.wait(80);
        V.fun.f = 0; ORDER.forEach(k => { const lay = V.cap.layers.find(l => l.k === k); if (lay) lay.f = st.capGoal[k]; else V.cap.layers.push({ k, f: st.capGoal[k] }); });
        outTag.innerHTML = 'Filtered out<br><s>' + safeList.map(s => s.label).join(' + ') + '</s>'; outTag.__w = 0; outTag.__h = 0; outTag.hidden = false;
        st.murkT = 0; st.murk = 0; sGood(2); st.flash = 1;
        say(glitch, L(LINES.filtered), { mood: 'happy', ms: 3200 });
        P.emit('star', V.cap.x, V.cap.y + M.capH * 0.5, 14, { colors: [LIQ.hyp.hi, LIQ.test.hi, LIQ.pred.hi, LIQ.obs.hi], speed: [40, 140] });
        await K.wait(reduced() ? 700 : 1500);
        say(sync, L(LINES.sorry), { mood: 'shy', ms: 2600 });
        // tidy: the empty jar slides away; the funnel lifts off; the capsule moves to centre stage
        J.moving = true; J.docked = false; J.single = null; J.layers = []; const jx = J.x, jy = J.y, ja = J.ang;
        tween(600, q => { J.x = lerp(jx, M.w + M.jw, q); J.y = lerp(jy, M.jarTop, q); J.ang = lerp(ja, 0, q); J.alpha = 1 - q; }, ease.inCubic);
        V.src = null;
        tween(500, q => { V.fun.dy = -60 * q; V.fun.alpha = 1 - q; });
        outTag.hidden = true;
        await K.wait(reduced() ? 300 : 650);
        const cx0 = V.cap.x, cx1 = capCentreX(), sc1 = M.phone ? 1.3 : 1.35; st.capCentre = true; V.cap.moving = true;
        await tween(700, q => { V.cap.x = lerp(cx0, cx1, q); V.cap.scale = lerp(1, sc1, q); V.cap.y = M.bench - M.capH * V.cap.scale; }, ease.inOutCubic);
        V.cap.moving = false; V.cap.home = { x: cx1, y: V.cap.y };
      }
      async function sealPhase() {
        st.phase = 'date';
        dates.replaceChildren(h('b', { text: 'When will you try it?' }));
        DATES.forEach(d => { const b = h('button', { type: 'button', class: 'tl-date' }, document.createTextNode(d.label), h('small', { text: (d.by ? 'by ' : '') + d.day })); K.tap(b, () => pickDate(d, b)); dates.append(b); });
        dates.classList.remove('off');
        say(glitch, L(LINES.date), { mood: 'nerd', ms: 3400 });
        K.guide({ id: 'date', g: 'choose', target: () => Array.from(dates.querySelectorAll('.tl-date')), label: 'PICK A DAY', delay: 900 });
        await waitFor('date');
        st.phase = 'seal'; st.capOn = true; st.capLift = 46 * M.s; st.sealK = 0;
        await K.wait(reduced() ? 200 : 500);
        capHit.hidden = false;
        say(glitch, L(LINES.seal), { mood: 'determined', ms: 3000 });
        K.guide({ id: 'seal', g: 'hold', target: capHit, label: 'HOLD TO SEAL', delay: 600 });
        await waitFor('seal');
      }
      function pickDate(d, b) {
        if (st.phase !== 'date') return;
        st.date = d; K.guide(null); b.classList.add('pick'); sClink(1.05); sType();
        ctx.track('date', { off: d.off });
        K.later(() => { dates.classList.add('off'); fire('date'); }, 380);
      }
      function sealDone() {
        if (st.sealed) return; st.sealed = true; st.sealK = 1; capHit.hidden = true; K.guide(null);
        if (A.ctx) { A.thud({ vol: 0.3 }); A.wood(undefined, 0.16, 1.3); A.noise({ filter: 'highpass', freq: 5200, to: 2000, dur: 0.5, vol: 0.08 }); }
        st.flash = 1; P.emit('star', V.cap.x, V.cap.y, 22, { colors: ['#ffffff', LAB.acc, LIQ.pred.hi], speed: [60, 200] });
        setTag(capTag, 'Try it<br>' + st.date.day, null); capTag.style.setProperty('--liq', LAB.acc); capTag.style.lineHeight = '1.25'; capTag.style.textAlign = 'center';
        fire('seal');
      }
      async function finale() {
        st.phase = 'finale'; st.finT0 = now(); MZ.layer = 3; MZ.vol = 1;
        await tween(reduced() ? 300 : 900, q => { st.finale = q; }, ease.outCubic);
        // the lab lights up, shelf by shelf, to an arpeggio
        const nb = BGC.bottles.length || 6;
        for (let i = 0; i < nb + 3; i++) K.later(() => sLight(i), i * (reduced() ? 60 : 130));
        tween(reduced() ? 500 : (nb + 3) * 130, q => { st.lights = q; });
        if (A.ctx) A.pad(['D4', 'F#4', 'A4', 'C#5', 'E5'].map(n => A.note(n)), { dur: 5, vol: 0.12, attack: 0.5 });
        K.finale('bubbles', { from: [{ x: V.cap.x, y: V.cap.y + M.capH * V.cap.scale * 0.5 }], colors: [LIQ.hyp.hi, LIQ.test.hi, LIQ.pred.hi, LIQ.obs.hi], chord: ['D4', 'F#4', 'A4', 'E5'], ms: 4600, z: 3 });
        // the experiment card prints
        const col = K.collect(GL.name); st.col = col;
        const rows = [['Belief', beliefShown, beliefUser], ['Test', st.test.text], ['Prediction', st.pred + '% sure it comes true'], ['I’ll know by', st.obs.text], ['Leave out', safeList.map(s => s.label).join('; ')], ['Try it', (st.date.by ? 'By ' : '') + st.date.day]];
        finalCard.replaceChildren(h('small', { text: 'Experiment #' + expNo + ' · sealed' }), h('dl', null, ...rows.map(([k, v, u]) => h('div', { style: { display: 'contents' } }, h('dt', { text: k }), h('dd', { class: u ? 'gk-user' : '', text: v })))));
        finalCard.classList.remove('off'); sType();
        say(glitch, L(LINES.end), { mood: 'celebrate', ms: 0 }); glitch.react('bounce');
        await K.wait(reduced() ? 1400 : 2600);
        say(sync, L(LINES.syncEnd), { mood: 'love', ms: 0 }); sync.react('bounce');
        await K.wait(reduced() ? 1400 : 3000);
        finishGame();
      }
      function finishGame() {
        if (st.finished) return; st.finished = true;
        const avg = st.precs.length ? st.precs.reduce((a, b) => a + b, 0) / st.precs.length : 0.7, pct = Math.round(avg * 100);
        const best = K.best('steady', pct, 'higher'), tier = K.tier(avg, [0.5, 0.7, 0.86]), col = st.col || K.collect(GL.name);
        try { notebook.push({ t: st.test ? st.test.id : '', o: st.obs ? st.obs.id : '', p: st.pred, d: Date.now(), on: st.date ? st.date.off : 0 }); S.store.set(NOTE_KEY, notebook.slice(-60)); } catch (e) { /* storage unavailable */ }
        const badges = [];
        if (best.isNew) badges.push('New best: ' + pct + '% steady pour'); else if (best.first) badges.push('Steady pour: ' + pct + '%');
        if (tier) badges.push(tier + ' lab tech');
        if (col.isNew) badges.push('Collected: ' + GL.name + ' (' + Math.min(col.count, GLASS.length) + '/' + GLASS.length + ')');
        badges.push('Notebook: experiment #' + expNo);
        ctx.finish({
          title: 'Experiment #' + expNo + ' sealed', mood: 'celebrate',
          lines: ['Test for ' + (st.date ? st.date.day : 'soon') + ': ' + (st.test ? st.test.short.toLowerCase() : 'one small step'), 'Prediction logged: ' + st.pred + '% sure', 'Filtered out: ' + safeList.map(s => s.label.toLowerCase()).join(' and ')],
          share: 'Designed a tiny experiment to test a scary thought.', badges: badges.slice(0, 4)
        });
      }

      // live prediction readout
      K.loop(() => { if (st.predLive) { const tg = layerTags.pred, txt = st.pred + '%'; if (tg.__txt !== txt) { tg.__txt = txt; tg.innerHTML = txt + '<em>sure</em>'; tg.__w = 0; tg.__h = 0; } } });

      flow();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 30000)) await K.wait(80); };
          const local = (r0, x, y) => [x - r0.x, y - r0.y];
          // carry a flask (from a card or from the bench) to its rim, then lift it in an arc until the goal is met
          async function pour(startEl, goal) {
            const r0 = K.rectIn(startEl), pr = await K.sim.press(startEl, r0.w / 2, r0.h / 2);
            let fx = r0.cx, fy = r0.cy;
            await K.wait(60);
            const Vv = V.src; if (!Vv) { pr.up(r0.w / 2, r0.h / 2); return; }
            if (!Vv.docked) {
              const lp = lipLocal(Vv), tx = Vv.dock.x - lp[0] - GR.off.x, ty = Vv.dock.y - GR.off.y;
              for (let i = 1; i <= 18 && !Vv.docked; i++) { await K.wait(34); fx = lerp(r0.cx, tx, i / 18); fy = lerp(r0.cy, ty, i / 18); pr.move(...local(r0, fx, fy)); }
              for (let i = 0; i < 6 && !Vv.docked; i++) { await K.wait(60); pr.move(...local(r0, tx, ty)); }
            }
            if (!Vv.docked) { pr.up(...local(r0, fx, fy)); return; }
            const pv = Vv.pivot, R0 = Math.max(30, Math.hypot(fx - pv.x, fy - pv.y)), a0 = Math.atan2(fy - pv.y, fx - pv.x);
            let da = 0; const t0 = now();
            while (!goal() && now() - t0 < 14000 && Vv.frac > 0.003) {
              await K.wait(40);
              if (Vv.flow < M.Aj * 0.03 && da < 2.2) da += 0.05;
              pr.move(...local(r0, pv.x + Math.cos(a0 + Vv.dir * da) * R0, pv.y + Math.sin(a0 + Vv.dir * da) * R0));
            }
            for (let i = 0; i < 6; i++) { await K.wait(30); da *= 0.6; pr.move(...local(r0, pv.x + Math.cos(a0 + Vv.dir * da) * R0, pv.y + Math.sin(a0 + Vv.dir * da) * R0)); }
            pr.up(...local(r0, pv.x + Math.cos(a0) * R0, pv.y + Math.sin(a0) * R0));
          }
          const ready = (ph) => st.phase === ph && st.canPour && !st.auto;
          // 1. hypothesis (Gentle pours it for you)
          await until(() => st.phase === 'hyp', 30000);
          if (!gentle) { await until(() => ready('hyp') && !hit.hidden, 15000); await K.wait(500); await pour(hit, () => layerFrac('hyp') >= GOAL.hyp - TOL * 0.5); }
          // 2. test
          await until(() => ready('test') && st.cards && !tray.classList.contains('off'), 40000); await K.wait(900);
          await pour(st.cards[0].el, () => layerFrac('test') >= GOAL.test - TOL * 0.5);
          await until(() => ready('test') && !hit.hidden || st.phase !== 'test', 4000);
          if (st.phase === 'test' && st.canPour) await pour(hit, () => layerFrac('test') >= GOAL.test - TOL * 0.5);
          // 3. prediction
          await until(() => ready('pred') && !hit.hidden, 40000); await K.wait(800);
          await pour(hit, () => st.pred >= 62);
          // 4. observation
          await until(() => ready('obs') && st.cards && !tray.classList.contains('off'), 40000); await K.wait(900);
          await pour(st.cards[0].el, () => layerFrac('obs') >= GOAL.obs - TOL * 0.5);
          await until(() => ready('obs') && !hit.hidden || st.phase !== 'obs', 4000);
          if (st.phase === 'obs' && st.canPour) await pour(hit, () => layerFrac('obs') >= GOAL.obs - TOL * 0.5);
          // filter
          await until(() => ready('filter') && !hit.hidden, 40000); await K.wait(700);
          await pour(hit, () => V.jar.frac < 0.01);
          for (let i = 0; i < 3 && st.phase === 'filter' && st.canPour; i++) { await until(() => !hit.hidden, 3000); await pour(hit, () => V.jar.frac < 0.01); }
          // date and seal
          await until(() => st.phase === 'date' && !dates.classList.contains('off'), 40000); await K.wait(900);
          const db = dates.querySelectorAll('.tl-date')[1]; if (db) await K.sim.tap(db);
          await until(() => st.phase === 'seal' && !capHit.hidden, 15000); await K.wait(700);
          await K.sim.hold(capHit, 1500);
          await until(() => st.finished, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
