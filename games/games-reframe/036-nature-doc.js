/* 036 Nature Doc — Reframe · REFRAME · Social / Team / Perspective
 * Mechanism: self-distancing by describing. DBT's observe-and-describe skill (Linehan 2015) and distanced, third-person
 * self-talk (Kross et al. 2014) separate what happened from the verdict laid over it: narrated calmly, like a wildlife
 * documentary, the same moment loses some of its sting. The player pans a camera to frame "the human" (Loopie, standing in
 * for them) in today's habitat, then picks the narrator's line. Lines a camera could actually film (their own camera facts,
 * a feeling named plainly) make the footage beautiful; verdicts (their own "brain" words read out as fact) glitch the tape
 * and get a kindly "Cut!". Honest: a well-founded worry gets a plan in the closing narration; care topics point to proper help.
 * Verb: pan (drag the fluid-head camera to frame and then track the human, hold steady to pull focus), narrate (pick the
 * line the camera can film). Twist: the crew wonder if this is a rare sighting; pan across and a whole herd is doing exactly
 * the same thing. Finale: golden hour, the series title card and rolling credits ("Filmed on location in your Tuesday").
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const hexRGB = (c) => { const n = parseInt(String(c).slice(1, 7), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgba = (c, a) => { const A = hexRGB(c); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')'; };
  const mixHex = (a, b, k) => { const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => Math.max(0, Math.min(255, Math.round(v + (B[i] - v) * k))).toString(16).padStart(2, '0')).join(''); };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const rr = (g, x, y, w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const sprite = (size, stops) => { const c = mk(size, size), g = c.getContext('2d'), r = size / 2, gr = g.createRadialGradient(r, r, 0, r, r, r); stops.forEach(s => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.fillRect(0, 0, size, size); return c; };
  const outBack = (k) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
  const vgrad = (g, y0, y1, stops) => { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => gr.addColorStop(i / Math.max(1, stops.length - 1), c)); return gr; };
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const HOT = /\b(definitely|going to|gonna|must|never|always|everyone|nobody|ruined|fired|over|losing|hates?|can'?t|won'?t|clearly|obviously|\w+['’]ll)\b/i;
  const JUDGE_POOL = ['The human has clearly messed everything up. As usual.', 'Everyone is definitely judging the human. Obviously.', 'This always happens to the human. Typical.', 'This means the worst. Clearly.', 'The human should be over this by now.'];

  /* ---------------- painting helpers (offscreen layers, painted once per size and theme) ---------------- */
  function ridge(g, w, base, amp, col, R, f, bottom) {
    const ph = [R() * 6, R() * 6, R() * 6]; f = f || 1;
    g.fillStyle = col; g.beginPath(); g.moveTo(-10, bottom);
    for (let x = -10; x <= w + 10; x += 6) g.lineTo(x, base - amp * (0.55 + 0.28 * Math.sin(x * 0.0055 * f + ph[0]) + 0.13 * Math.sin(x * 0.019 * f + ph[1]) + 0.05 * Math.sin(x * 0.06 * f + ph[2])));
    g.lineTo(w + 10, bottom); g.closePath(); g.fill();
  }
  function blades(g, w, base, hMin, hMax, col, R, n, o) {
    o = o || {};
    g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = o.at != null ? o.at + (R() - 0.5) * (o.spread || 60) : R() * (w + 40) - 20, hh = hMin + R() * (hMax - hMin), lean = (R() - 0.5) * hh * (o.lean || 0.5), wd = (o.wd || 3) * (0.6 + R() * 0.8);
      if (o.frond) { // fern frond: a curved rib with leaflets
        g.lineWidth = 2.2; g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x + lean * 0.3, base - hh * 0.6, x + lean, base - hh); g.stroke();
        for (let k = 0.15; k < 1; k += 0.09) { const px = x + lean * k * k, py = base - hh * k, s = (1 - k) * hh * 0.28 + 4; g.beginPath(); g.ellipse(px - s * 0.6, py, s * 0.62, s * 0.2, -0.5, 0, TAU); g.ellipse(px + s * 0.6, py, s * 0.62, s * 0.2, 0.5, 0, TAU); g.fill(); }
      } else if (o.wavy) { // kelp: a wavy ribbon
        g.lineWidth = wd * 2.4; g.beginPath(); g.moveTo(x, base);
        for (let k = 0; k <= 1.001; k += 0.1) g.lineTo(x + Math.sin(k * 7 + i) * 9 * k + lean * k, base - hh * k);
        g.stroke();
      } else {
        g.lineWidth = wd; g.beginPath(); g.moveTo(x - wd, base); g.quadraticCurveTo(x + lean * 0.3, base - hh * 0.55, x + lean, base - hh); g.quadraticCurveTo(x + lean * 0.3 + wd * 0.4, base - hh * 0.55, x + wd, base); g.closePath(); g.fill();
        if (o.seeds && R() < 0.3) { g.beginPath(); g.ellipse(x + lean, base - hh - 4, 2.4, 6, lean * 0.01, 0, TAU); g.fill(); }
      }
    }
  }
  function cloud(g, x, y, s, col) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, s * 1.6, s * 0.42, 0, 0, TAU); g.ellipse(x - s * 0.6, y - s * 0.2, s * 0.62, s * 0.42, 0, 0, TAU); g.ellipse(x + s * 0.35, y - s * 0.32, s * 0.72, s * 0.5, 0, 0, TAU); g.fill(); }

  /* Today's habitat: one per day, each its own palette, props, critters, sounds and species name (an episode collection). */
  const HABITATS = [
    { key: 'savannah', name: 'Office Savannah', species: 'Homo sapiens officinalis', amb: 'prairie', particle: 'mote', pcols: ['#ffe6a8', '#ffd27a', '#fff3d0'], critter: 'bird', finale: 'fireflies',
      day: { sky: ['#4f9fd6', '#93c9e6', '#d9ead9', '#f6e3b0'], sun: '#fff6d8', far: ['#c9b48a', '#b39a6e'], tree: '#56622a', mound: '#8b7b62', ground: ['#d6b25e', '#b48a40', '#8c6631'], fg: '#4e5a22', rim: '#fff3c4', water: '#7fc1d9', haze: '#c8d3d8', warm: '#ffc27a' },
      dusk: { sky: ['#20163f', '#55285a', '#b2465a', '#ef8550', '#ffc879'], sun: '#ffe6a6', far: ['#9a4f68', '#713a5a'], tree: '#2a1530', mound: '#5a3048', ground: ['#b8693e', '#8a4a30', '#3a1c16'], fg: '#160910', rim: '#ffb46b', water: '#f09a70', haze: '#8a5f78', warm: '#ff9d55' } },
    { key: 'reef', name: 'Group-Chat Reef', species: 'Homo sapiens textualis', amb: 'reef', particle: 'bubble', pcols: ['rgba(210,245,255,0.9)'], critter: 'fish', finale: 'bubbles',
      day: { sky: ['#9eeef5', '#4cc4dc', '#1e93b5', '#0f6f93'], sun: '#e8fdff', far: ['#3aa6bd', '#2a8aa6'], tree: '#ff8a7a', mound: '#b78cff', ground: ['#f0dba2', '#d9bc7c', '#b8955a'], fg: '#1d6e5a', rim: '#ffffff', water: '#bff6ff', haze: '#9fdbe6', warm: '#c8fbff' },
      dusk: { sky: ['#041a32', '#08345c', '#0e527c', '#1a7398'], sun: '#c8f4ff', far: ['#11496a', '#0c3b58'], tree: '#e06a82', mound: '#8a64d4', ground: ['#3f7c88', '#2b5e6c', '#123642'], fg: '#031a26', rim: '#9ff3ff', water: '#5fd0e8', haze: '#22678a', warm: '#7ff0ff' } },
    { key: 'tundra', name: 'Kitchen Tundra', species: 'Homo sapiens nocturnus', amb: 'wind', particle: 'snow', pcols: ['#ffffff', '#e8f4ff'], critter: 'owl', finale: 'stars',
      day: { sky: ['#8fb8e0', '#bcd6ee', '#e3eef8', '#f7fbff'], sun: '#ffffff', far: ['#e6eef8', '#c3d3e6'], tree: '#2f4a52', mound: '#eef4fb', ground: ['#ffffff', '#e4edf7', '#c9d8ea'], fg: '#dfe9f5', rim: '#ffffff', water: '#cfe6ff', haze: '#d4e2ef', warm: '#ffe6b8' },
      dusk: { sky: ['#040a1e', '#0a1b40', '#13325e', '#285684'], sun: '#eef4ff', far: ['#b4c6e0', '#7c94b8'], tree: '#0d1f2e', mound: '#d6e2f2', ground: ['#c2d2ea', '#94a8cc', '#4e6290'], fg: '#2a3a5e', rim: '#b8ffe0', water: '#7fb7e8', haze: '#3a5684', warm: '#9effd0' } },
    { key: 'rainforest', name: 'Inbox Rainforest', species: 'Homo sapiens inboxii', amb: 'forest', particle: 'leaf', pcols: ['#9ccf6b', '#e0b84f', '#7fbf5a'], critter: 'butterfly', finale: 'petals',
      day: { sky: ['#cdeeb4', '#94d38a', '#5aa865', '#2f7a45'], sun: '#fff8d0', far: ['#4f9a5a', '#3a8048'], tree: '#2d5a32', mound: '#7a5a3a', ground: ['#6f8a3a', '#536b2c', '#36481d'], fg: '#1f4a24', rim: '#fff8c0', water: '#8fd8c8', haze: '#a6cf9a', warm: '#fff1a6' },
      dusk: { sky: ['#05201a', '#0d3a2c', '#1d5a3e', '#3f7e4a'], sun: '#f6ffd8', far: ['#1e5236', '#15432c'], tree: '#0a2418', mound: '#4a3420', ground: ['#557a32', '#3a5a22', '#16260c'], fg: '#04140a', rim: '#d8ff9a', water: '#3f8f7a', haze: '#3a6a48', warm: '#e8ff9a' } }
  ];
  const TORTOISE = '<svg viewBox="0 0 40 32" aria-hidden="true"><ellipse cx="18" cy="27" rx="15" ry="3" fill="rgba(0,0,0,.35)"/><path d="M5 24c0-9 6-15 14-15s14 6 14 15z" fill="#7aa35a"/><path d="M10 23c1-6 4-10 9-10s8 4 9 10" fill="none" stroke="#4f7a3a" stroke-width="1.6"/><path d="M19 13v10M13 16l3 7M25 16l-3 7" stroke="#4f7a3a" stroke-width="1.4"/><path d="M33 22c2-1 5-1 6 1 1 2-1 4-4 3" fill="#c9b27a"/><circle cx="36.5" cy="22.6" r=".9" fill="#2a2016"/><rect x="2" y="13" width="3" height="8" rx="1.5" fill="#3a3a44"/><circle cx="3.5" cy="12" r="2.6" fill="#1f1f26"/><path d="M8 24v4M15 24v4M23 24v4M29 24v4" stroke="#c9b27a" stroke-width="3" stroke-linecap="round"/></svg>';

  (env.games = env.games || []).push({
    id: 'nature-doc', mode: 'reframe', name: 'Nature Doc', verb: 'pan', family: 'REFRAME', minutes: 2,
    parents: ['Social / Team / Perspective', 'Emotion', 'Inner Speech / Mental Text'],
    cast: ['glitch', 'drop', 'loopie'], poster: { char: 'glitch', mood: 'nerd' },
    fonts: ['Fraunces:ital,wght@0,600;0,800;1,500;1,600', 'Atkinson+Hyperlegible:wght@400;700', 'Courier+Prime:wght@400;700'],
    tagline: 'Film your day as a calm wildlife documentary. Narrate what you see.',
    why: 'For a harsh inner commentary: describe it like a nature doc and the verdict steps back.',
    css: `
.g-nature-doc { --nd-serif: Fraunces, "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif; --nd-sans: "Atkinson Hyperlegible", Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
  --nd-mono: "Courier Prime", "Courier New", ui-monospace, monospace; --nd-gold: #ffd27a; --nd-paper: #fff8ea; background: #0b1018; }
.g-nature-doc .nd-hit { position: absolute; inset: 0; z-index: 18; touch-action: none; cursor: grab; }
.g-nature-doc .nd-hit.drag { cursor: grabbing; }
.g-nature-doc .nd-hud { position: absolute; z-index: 34; left: 12px; right: 12px; top: calc(env(safe-area-inset-top, 0px) + 60px); display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; pointer-events: none; }
.g-nature-doc .nd-chip { display: flex; flex-direction: column; gap: 4px; padding: 7px 10px 7px; border-radius: 9px; background: rgba(5, 8, 12, 0.64); border: 1px solid rgba(255, 255, 255, 0.16); color: #efe8d8; font: 700 12px/1.1 var(--nd-mono); letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; min-width: 0; }
.g-nature-doc .nd-chip b { font: 600 16px/1.1 var(--nd-serif); letter-spacing: 0; text-transform: none; color: #fffaf0; overflow: hidden; text-overflow: ellipsis; }
.g-nature-doc .nd-rec { align-items: flex-end; }
.g-nature-doc .nd-rec span { display: flex; align-items: center; gap: 7px; font-variant-numeric: tabular-nums; }
.g-nature-doc .nd-rec i { width: 9px; height: 9px; border-radius: 50%; background: #6b6b6b; }
.g-nature-doc .nd-rec.on i { background: #ff3b30; box-shadow: 0 0 8px #ff3b30; animation: nature-doc-blink 1.2s steps(2, jump-none) infinite; }
.g-nature-doc .nd-pips { display: flex; gap: 5px; }
.g-nature-doc .nd-pips u { width: 15px; height: 6px; border-radius: 2px; background: rgba(255, 255, 255, 0.22); text-decoration: none; }
.g-nature-doc .nd-pips u.on { background: var(--nd-gold); box-shadow: 0 0 6px rgba(255, 210, 122, 0.8); }
@keyframes nature-doc-blink { 0% { opacity: 1; } 100% { opacity: 0.25; } }
.g-nature-doc .nd-ep.gold b { color: #ffd27a; }
.g-nature-doc .nd-sub { position: absolute; z-index: 33; left: 50%; width: min(700px, calc(100% - 24px)); box-sizing: border-box; display: flex; gap: 10px; align-items: flex-start; padding: 9px 13px 11px 10px; border-radius: 12px;
  background: rgba(4, 7, 11, 0.76); border: 1px solid rgba(255, 255, 255, 0.1); color: #fffaf0; pointer-events: none; opacity: 0; transform: translate(-50%, 8px); transition: opacity 0.3s ease, transform 0.35s ease, border-color 0.3s ease; }
.g-nature-doc .nd-sub.on { opacity: 1; transform: translate(-50%, 0); }
.g-nature-doc .nd-sub svg { flex: none; width: 38px; height: 30px; margin-top: 2px; }
.g-nature-doc .nd-subt { flex: 1; min-width: 0; font: 400 17px/1.36 var(--nd-sans); text-wrap: pretty; }
.g-nature-doc .nd-subt small { display: block; font: 700 12px/1 var(--nd-mono); letter-spacing: 0.16em; color: var(--nd-gold); margin-bottom: 5px; text-transform: uppercase; }
.g-nature-doc .nd-subt .w { opacity: 0.45; transition: opacity 0.16s ease; }
.g-nature-doc .nd-subt .w.on { opacity: 1; }
.g-nature-doc .nd-subt .w.x { opacity: 0.6; text-decoration: line-through; text-decoration-color: #ff5a5f; text-decoration-thickness: 2px; }
.g-nature-doc .nd-subt .gk-user { font-weight: 700; color: #fff2d6; }
.g-nature-doc .nd-sub.bad { border-color: rgba(255, 90, 95, 0.7); }
.g-nature-doc .nd-sub.bad small { color: #ff8a8e; }
.g-nature-doc .nd-sub.good { border-color: rgba(255, 210, 122, 0.55); }
.g-nature-doc .nd-tag { position: absolute; z-index: 32; left: 0; top: 0; transform: translate(-50%, -100%); padding: 6px 9px 5px; border-radius: 7px; background: rgba(255, 249, 236, 0.95); color: #2a1d0e; font: 700 12px/1.15 var(--nd-mono);
  letter-spacing: 0.05em; white-space: nowrap; pointer-events: none; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35); opacity: 0; transition: opacity 0.3s ease; }
.g-nature-doc .nd-tag.on { opacity: 1; }
.g-nature-doc .nd-tag em { font: italic 600 14px/1 var(--nd-serif); letter-spacing: 0; }
.g-nature-doc .nd-tag::after { content: ""; position: absolute; left: 50%; bottom: -5px; width: 10px; height: 10px; margin-left: -5px; background: inherit; transform: rotate(45deg); border-radius: 0 0 2px 0; }
.g-nature-doc .nd-tray { position: absolute; z-index: 36; display: grid; gap: 9px; pointer-events: none; }
.g-nature-doc .nd-tray[hidden] { display: none; }
.g-nature-doc .nd-tray > b { font: 700 12px/1 var(--nd-mono); letter-spacing: 0.16em; text-transform: uppercase; color: #fff6e0; text-align: center; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8); grid-column: 1 / -1; }
.g-nature-doc .nd-card { position: relative; appearance: none; border: 0; margin: 0; text-align: left; cursor: pointer; pointer-events: auto; border-radius: 11px; padding: 10px 13px 12px; min-height: 64px; box-sizing: border-box;
  background: linear-gradient(180deg, #fffaf0, #f1e4c8); color: #22190e; box-shadow: 0 2px 0 #cbb88f, 0 12px 24px rgba(0, 0, 0, 0.45); display: flex; flex-direction: column; gap: 6px;
  transition: transform 0.3s cubic-bezier(.2, 1.3, .4, 1), opacity 0.28s ease, box-shadow 0.2s ease; }
.g-nature-doc .nd-card::before { content: ""; position: absolute; left: 0; top: 10px; bottom: 10px; width: 4px; border-radius: 0 3px 3px 0; background: #d9b56a; }
.g-nature-doc .nd-card:focus-visible { outline: 3px solid #ffd27a; outline-offset: 3px; }
.g-nature-doc .nd-card:active { transform: scale(0.98); }
.g-nature-doc .nd-ch { display: flex; justify-content: space-between; gap: 8px; font: 700 12px/1 var(--nd-mono); letter-spacing: 0.12em; text-transform: uppercase; color: #8a6524; }
.g-nature-doc .nd-cl { font: 400 15.5px/1.34 var(--nd-sans); }
.g-nature-doc .nd-cl .gk-user { font-weight: 700; color: #3a1f06; }
.g-nature-doc .nd-stamp { position: absolute; right: 9px; top: 5px; font: 700 12px/1 var(--nd-mono); letter-spacing: 0.1em; padding: 6px 8px 5px; border: 2px solid currentColor; border-radius: 6px; background: rgba(255, 250, 240, 0.95);
  transform: rotate(-5deg) scale(1.6); opacity: 0; transition: transform 0.35s cubic-bezier(.2, 1.5, .4, 1), opacity 0.2s ease; pointer-events: none; }
.g-nature-doc .nd-card.good .nd-stamp, .g-nature-doc .nd-card.bad .nd-stamp { opacity: 1; transform: rotate(-5deg) scale(1); }
.g-nature-doc .nd-card.good .nd-ch span + span, .g-nature-doc .nd-card.bad .nd-ch span + span { visibility: hidden; }
.g-nature-doc .nd-card.good { box-shadow: 0 0 0 3px #46c37b, 0 14px 28px rgba(0, 0, 0, 0.45); }
.g-nature-doc .nd-card.good .nd-stamp { color: #19774a; }
.g-nature-doc .nd-card.bad { box-shadow: 0 0 0 3px #e2474c, 0 14px 28px rgba(0, 0, 0, 0.45); }
.g-nature-doc .nd-card.bad .nd-stamp { color: #c0262d; }
.g-nature-doc .nd-card.bad .nd-cl { text-decoration: line-through; text-decoration-color: rgba(192, 38, 45, 0.7); text-decoration-thickness: 2px; }
.g-nature-doc .nd-card.in0 { opacity: 0; transform: translateY(22px) scale(0.97); }
.g-nature-doc .nd-card.out { opacity: 0; transform: translateY(18px) scale(0.94); pointer-events: none; }
.g-nature-doc .nd-title { position: absolute; z-index: 40; left: 12px; right: 12px; text-align: center; color: #fffaf0; pointer-events: none; text-shadow: 0 2px 18px rgba(0, 0, 0, 0.6); opacity: 0; transform: translateY(10px); transition: opacity 1s ease, transform 1.2s ease; }
.g-nature-doc .nd-title.on { opacity: 1; transform: none; }
.g-nature-doc .nd-title small { display: block; font: 700 12px/1 var(--nd-mono); letter-spacing: 0.34em; color: var(--nd-gold); text-transform: uppercase; }
.g-nature-doc .nd-title b { display: block; margin: 9px 0 7px; font: 800 clamp(30px, 8.4cqw, 64px)/0.98 var(--nd-serif); letter-spacing: -0.01em; }
.g-nature-doc .nd-title span { display: block; font: italic 500 17px/1.3 var(--nd-serif); color: #f5ead2; }
.g-nature-doc .nd-cred { position: absolute; z-index: 40; overflow: hidden; pointer-events: none; opacity: 0; transition: opacity 0.8s ease;
  -webkit-mask-image: linear-gradient(transparent, #000 16%, #000 84%, transparent); mask-image: linear-gradient(transparent, #000 16%, #000 84%, transparent); }
.g-nature-doc .nd-cred.on { opacity: 1; }
.g-nature-doc .nd-credi { display: flex; flex-direction: column; align-items: center; gap: 13px; text-align: center; color: #f6efe0; will-change: transform; }
.g-nature-doc .nd-credi p { margin: 0; font: 400 15px/1.3 var(--nd-sans); text-shadow: 0 1px 8px rgba(0, 0, 0, 0.7); }
.g-nature-doc .nd-credi p small { display: block; font: 700 12px/1.2 var(--nd-mono); letter-spacing: 0.2em; color: var(--nd-gold); text-transform: uppercase; margin-bottom: 4px; }
.g-nature-doc .nd-credi p.big { font: italic 600 19px/1.3 var(--nd-serif); color: #fff6dc; }
.g-nature-doc .gk-char { transition: opacity 0.4s ease; }
.g-nature-doc .nd-off { opacity: 0; }
@container (min-width: 700px) {
  .g-nature-doc .nd-subt { font-size: 20px; }
  .g-nature-doc .nd-cl { font-size: 17px; }
  .g-nature-doc .nd-chip b { font-size: 18px; }
  .g-nature-doc .nd-credi p { font-size: 17px; }
  .g-nature-doc .nd-credi p.big { font-size: 22px; }
  .g-nature-doc .nd-title span { font-size: 20px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const clamp = K.clamp, lerp = K.lerp, ease = K.ease, now = () => performance.now(), reduced = () => K.reduced();
      const inten = ctx.intensity, L = (o) => ctx.line(o) || '';
      const text = String(ctx.text || '').trim(), hasText = text.length > 0;
      const care = an.safety === 'care', strong = an.fear_support === 'strong';
      const visits = K.visits();
      const hab = K.dailyPick(HABITATS, 11);
      const weekday = WEEKDAYS[new Date().getDay()];
      const episode = visits + 1;
      const ZONE = [0.22, 0.17, 0.135][inten], FOCUS_S = [0.6, 0.8, 0.95][inten], TRACK_S = [2.2, 2.8, 3.2][inten], WALK = [0.075, 0.1, 0.14][inten];

      /* ---------------- the player's words → the narrator's script ---------------- */
      const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); return (sp > n * 0.5 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; };
      const tidy = (s) => String(s || '').replace(/^[\s,;:–-]+|[\s,;:.!?–-]+$/g, '');
      const exact = (q) => { const i = text.toLowerCase().indexOf(String(q).toLowerCase()); return i < 0 ? '' : text.slice(i, i + String(q).length); };
      const lowFirst = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
      const spans = (Array.isArray(an.spans) ? an.spans : []).filter(s => s && typeof s.quote === 'string' && s.quote.trim());
      const twoWords = (q) => q && q.split(/\s+/).length >= 2;
      const cams = hasText ? spans.filter(s => s.kind === 'camera').map(s => tidy(exact(s.quote.trim()))).filter(twoWords) : [];
      const brains = hasText ? spans.filter(s => s.kind === 'brain').map(s => tidy(exact(s.quote.trim()))).filter(twoWords) : [];
      let hotB = '';
      if (brains.length) { let bs = -1; brains.forEach((q, i) => { const sc = (HOT.test(q) ? 2 : 0) + (q.length <= 70 ? 1 : 0) + i * 0.01; if (sc > bs) { bs = sc; hotB = q; } }); }
      const otherB = brains.find(q => q !== hotB) || '';
      const feeling = (typeof an.feeling === 'string' && /^[a-z][a-z' -]{1,16}$/i.test(an.feeling.trim())) ? an.feeling.trim().toLowerCase() : '';
      const Q = (q) => ({ t: '“' + clip(q, 92) + '”', user: true });
      const leadOf = (k) => { const l = (Array.isArray(an.leads) ? an.leads : []).find(x => x && x.kind === k && x.text); return l ? tidy(clip(l.text, 90)) : ''; };
      const unknown = (Array.isArray(an.unknowns) ? an.unknowns : []).map(u => u && u.text).filter(Boolean)[0] || '';
      const balanced = typeof an.balanced === 'string' && an.balanced.trim() ? clip(an.balanced.trim(), 112) : '';
      const friend = typeof an.friend === 'string' && an.friend.trim() ? clip(an.friend.trim(), 104) : '';
      let jpool = JUDGE_POOL.slice();
      const judgeGeneric = () => jpool.shift() || JUDGE_POOL[0];
      const D = (segs) => ({ kind: 'desc', segs }), J = (segs) => ({ kind: 'judge', segs });
      function script(i, kind) {
        const cards = [];
        if (kind === 'final') {
          if (care) { cards.push(D([{ t: 'Next, the human seeks proper advice from someone who knows this territory. A sensible creature.' }])); cards.push(D([{ t: 'A fair summary, for now: ' + lowFirst(balanced || 'it’s a real concern, and the facts are still coming in.') }])); }
          else if (strong) { const p = leadOf('prepare'); cards.push(D([{ t: 'This is a real challenge, and the human is taking it seriously. Its next move: ' + (p ? lowFirst(p) : 'one small, practical step') + '.' }])); if (friend) cards.push(D([{ t: 'If another human were here, it might say: “' + friend + '”' }])); }
          else { cards.push(D([{ t: 'A fair summary, for now: ' + lowFirst(balanced || 'this fits more than one story, and the facts don’t settle it yet.') }])); if (friend && hasText) cards.push(D([{ t: 'If another human were here, it might say: “' + friend + '”' }])); else cards.push(D([{ t: 'The human has had a hard moment, and it is still here, doing its best. A resilient creature.' }])); }
          cards.push(J([{ t: 'The human should be over this by now. Honestly.' }]));
          if (inten === 0) cards.splice(1, cards.length - 2);
          return cards;
        }
        if (i === 0) {
          cards.push(D(cams[0] ? [{ t: 'Here we see the human. On record: ' }, Q(cams[0]), { t: '.' }] : [{ t: 'Here we see the human, sitting quietly with something on its mind.' }]));
          cards.push(J(hotB ? [{ t: 'The human has decided: ' }, Q(hotB), { t: '. Case closed.' }] : [{ t: judgeGeneric() }]));
        } else if (i === 1) {
          cards.push(D(cams[1] ? [{ t: 'The footage shows: ' }, Q(cams[1]), { t: '. That is all the camera saw.' }]
            : feeling ? [{ t: 'The human is feeling ' + feeling + '. A very common weather system in this species.' }] : [{ t: 'The human moves to a new spot, carrying a feeling. It lets the feeling come along.' }]));
          cards.push(J(otherB ? [{ t: 'Obviously, ' }, Q(otherB), { t: '. Everyone can tell.' }] : [{ t: hotB ? 'Everyone is definitely judging the human. Obviously.' : judgeGeneric() }]));
        } else {
          cards.push(D(unknown ? [{ t: 'Still unfilmed: ' + lowFirst(tidy(clip(unknown, 80))) + '? The camera keeps an open mind.' }] : [{ t: 'The human pauses. Nothing new has happened. Only the volume of the thought has changed.' }]));
          cards.push(J([{ t: judgeGeneric() }]));
        }
        if (inten === 2) cards.push(J([{ t: judgeGeneric() }]));
        return cards;
      }
      const plain = (segs) => segs.map(s => s.t).join('');

      /* ---------------- lines (every one in three vibes) ---------------- */
      const NAR = {
        savannah: { est: { Jolly: 'The office savannah, at the end of a long day. Somewhere in the long grass, a human sits.', Cheeky: 'The office savannah: home of the water cooler, the printer, and one human, thinking.', Unfiltered: 'The office savannah. One human, thinking.' },
          aside: { Jolly: 'The water cooler: where the herd gathers to discuss the weather.', Cheeky: 'A wild printer, jammed since the dry season.', Unfiltered: 'A water cooler. The herd gathers here.' } },
        reef: { est: { Jolly: 'The group-chat reef. Messages drift by on the current. On a quiet rock, a human waits.', Cheeky: 'The group-chat reef, where three little dots can mean absolutely anything.', Unfiltered: 'The group-chat reef. A human, on a rock.' },
          aside: { Jolly: 'A school of notifications passes by. None of them urgent.', Cheeky: 'The typing indicator: three dots, endlessly hopeful.', Unfiltered: 'Notifications. None urgent.' } },
        tundra: { est: { Jolly: 'The kitchen tundra, late at night. Lit only by the fridge, a human keeps watch.', Cheeky: 'The kitchen tundra. The fridge light is the only aurora for miles.', Unfiltered: 'The kitchen tundra. Late. One human.' },
          aside: { Jolly: 'A kettle boils, unwatched. A rare and beautiful event.', Cheeky: 'Here, the toast pops up roughly every forty minutes.', Unfiltered: 'A kettle. Boiling.' } },
        rainforest: { est: { Jolly: 'The inbox rainforest. Under a canopy of unread messages, a human rests on a log.', Cheeky: 'The inbox rainforest: three hundred unread, and thriving.', Unfiltered: 'The inbox rainforest. A human, resting.' },
          aside: { Jolly: 'An envelope butterfly. It has been circling back since Monday.', Cheeky: 'Somewhere above, an out-of-office blooms.', Unfiltered: 'Envelope butterflies.' } }
      }[hab.key];
      const HERD = care ? { Jolly: 'And here is the remarkable thing. Many humans face exactly this. Most need a hand with it, and that is completely normal.', Cheeky: 'Remarkable. This is a very human situation, and asking for help is very human too.', Unfiltered: 'Many humans face this. Getting help is normal.' }
        : strong ? { Jolly: 'The human is not alone. Many have faced something like this, and taken it one step at a time.', Cheeky: 'Not rare at all. Many humans have stood exactly here, and moved one step at a time.', Unfiltered: 'Not alone. Others faced this. One step at a time.' }
          : { Jolly: 'And here is the remarkable thing. The human is not alone. Nearly every member of the species does exactly this.', Cheeky: 'Remarkable. Not rare at all. This is one of the most common behaviours in the species.', Unfiltered: 'Not alone. Very common behaviour.' };
      const CLOSE = { Jolly: 'Our human, at golden hour. Same day, same facts. Described, rather than judged.', Cheeky: 'Same human. Same facts. Much better narrator.', Unfiltered: 'Same facts. Described, not judged.' };
      const GL = {
        hello: { Jolly: 'We’re rolling! Frame the human for me, nice and steady.', Cheeky: 'Rolling. Find the human. Try not to film your thumb.', Unfiltered: 'Rolling. Frame the human.' },
        steady: { Jolly: 'Lovely. Hold it there and let the focus find them.', Cheeky: 'Hold still. The focus is shy.', Unfiltered: 'Hold. Let it focus.' },
        rule: { Jolly: 'One house rule: our narrator only says what the camera can actually film.', Cheeky: 'House rule: if the camera can’t film it, the narrator can’t say it.', Unfiltered: 'Narrate only what the camera can film.' },
        cut: { Jolly: 'CUT! Lovely voice. But that’s a verdict, and cameras can’t film verdicts.', Cheeky: 'CUT! That’s the inner critic’s script. Wrong department.', Unfiltered: 'Cut. That’s not footage.' },
        take2: { Jolly: 'Take two. Read what the camera saw.', Cheeky: 'Take two. Facts, please. The critic can wait outside.', Unfiltered: 'Take two.' },
        good: [{ Jolly: 'Beautiful. Look at that light.', Cheeky: 'Award season, here we come.', Unfiltered: 'Good. That’s footage.' },
          { Jolly: 'Gorgeous. Same moment, gentler story.', Cheeky: 'Somebody frame this. Oh wait, I did.', Unfiltered: 'Clean take.' },
          { Jolly: 'That’s the one. Kind and true.', Cheeky: 'Chef’s kiss. Print it.', Unfiltered: 'Perfect.' }],
        track: { Jolly: 'The human’s on the move! Follow it, smooth as you can.', Cheeky: 'It’s wandering off. Very on-brand. Follow it.', Unfiltered: 'It’s moving. Track it.' },
        herdA: { Jolly: 'Rare? Pan across and see for yourself.', Cheeky: 'Rare? Pan across. Prepare to be humbled.', Unfiltered: 'Pan across. Look.' },
        herdFact: { Jolly: 'Most common behaviour in the species. It’s in my notes. I wrote the notes.', Cheeky: 'Textbook. Literally, I’m writing the textbook.', Unfiltered: 'Very common. Very normal.' },
        golden: { Jolly: 'Golden hour. One last shot of our human.', Cheeky: 'Magic hour. Don’t waste it, I paid for this sun.', Unfiltered: 'Last shot. Golden hour.' },
        wrap: { Jolly: 'That’s a wrap! What a film.', Cheeky: 'That’s a wrap. Somebody call the awards people.', Unfiltered: 'That’s a wrap.' }
      };
      const DR = {
        hello: { Jolly: 'Sound’s rolling. Shh… the human is in its thinking pose.', Cheeky: 'Mic’s live. Very quiet species. Very busy heads.', Unfiltered: 'Sound rolling.' },
        herdQ: { Jolly: 'Psst. Is this a rare sighting?', Cheeky: 'Are we filming something rare? Be honest.', Unfiltered: 'Is this rare?' },
        herdWow: { Jolly: 'There’s hundreds of them! All doing the same thing!', Cheeky: 'Oh. It’s a whole herd. Of humans. Doing the thing.', Unfiltered: 'Hundreds. Same thing.' },
        calm: { Jolly: 'Hear that? The music changed when the words did.', Cheeky: 'Even the birds calmed down. Coincidence? Yes. Still nice.', Unfiltered: 'Calmer.' }
      };

      /* ---------------- state ---------------- */
      const ST = { phase: 'intro', shot: -1, keep: true, focus: 0, track: 0, locked: false, beauty: 0.12, beautyT: 0.12, glitchT: -1e9, golden: 0, goldenT: 0, finished: false, scores: [], takes: 0, choices: 0, firstPick: true,
        picks: [], picked: null, canPick: false, herdOn: false, herdN: 0, letter: 0, letterT: 0, flash: 0, spoken: null, credY: 0, credOn: false, lockFlash: 0, finalText: '' };
      const CAM = { x: 0, v: 0, tx: 0, drag: false, grab: 0, fling: 0, speed: 0 };
      const SUBJ = { x: 0, tx: 0, path: null, bob: 0, mood: 'worried', alpha: 1, hop: 0, sharp: 0 };
      const M = { w: 0, h: 0, phone: true, ww: 0, hz: 0, fy: 0, sz: 100, dpr: 1 };
      const P = K.particles();
      const HERDS = [], CRIT = [];
      const CAMEO = visits >= 1 ? K.dailyPick([['rush', 'Rush', 'speed'], ['patch', 'Patch', 'wink'], ['still', 'Still', 'calm'], ['sync', 'Sync', 'cool']], 4) : null;
      const cameoImg = CAMEO ? Object.assign(new Image(), { src: K.face(CAMEO[0], CAMEO[2]) }) : null;
      let cards = [];

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: 1.5 });
      const hit = h('div', { class: 'nd-hit', role: 'application', 'aria-label': 'Documentary camera. Drag left or right to pan, or use the arrow keys.' });
      const recEl = h('div', { class: 'nd-chip nd-rec' }, h('span', null, h('i'), document.createTextNode('REC'), h('em', { style: { fontStyle: 'normal' }, text: '00:00:00:00' })), h('div', { class: 'nd-pips' }));
      const tcEl = recEl.querySelector('em'), pipsEl = recEl.querySelector('.nd-pips');
      const epS = h('span', { text: 'Planet You · Ep ' + episode }), epB = h('b', { text: hab.name });
      const hud = h('div', { class: 'nd-hud' }, h('div', { class: 'nd-chip nd-ep' }, epS, epB), recEl);
      const subEl = h('div', { class: 'nd-sub', role: 'status', 'aria-live': 'polite', html: TORTOISE }); const subT = h('div', { class: 'nd-subt' }); subEl.append(subT);
      const tagEl = h('div', { class: 'nd-tag', 'aria-hidden': 'true' });
      const tray = h('div', { class: 'nd-tray', role: 'group', 'aria-label': 'The narrator’s script', hidden: true });
      const titleEl = h('div', { class: 'nd-title', 'aria-live': 'polite' });
      const credEl = h('div', { class: 'nd-cred', 'aria-hidden': 'true' }), credIn = h('div', { class: 'nd-credi' }); credEl.append(credIn);
      el.append(hit, hud, tagEl, subEl, tray, titleEl, credEl);
      const phoneNow = K.phone();
      const glitch = K.character('glitch', { side: 'right', mood: 'nerd', size: phoneNow ? 74 : 96, x: 10, y: 600 });
      const drop = K.character('drop', { side: 'left', mood: 'happy', size: phoneNow ? 66 : 88, x: 300, y: 120 });

      /* the human (Loopie, standing in for the player) is drawn in the footage, whole, with focus pulled by the camera */
      const MOODS = ['worried', 'think', 'calm', 'happy', 'love', 'surprised', 'confused', 'celebrate'];
      const FACES = {};
      MOODS.forEach(m => { const im = new Image(); im.decoding = 'async'; const f = { im, blur: null, ok: false }; im.onload = () => { f.ok = true; f.blur = null; }; im.src = K.face('loopie', m); FACES[m] = f; });
      function blurOf(f) { // a soft copy made once by shrinking and re-enlarging (works everywhere, no filter support needed)
        if (f.blur || !f.ok) return f.blur;
        const small = mk(22, 22), sg = small.getContext('2d'); sg.drawImage(f.im, 0, 0, 22, 22);
        const big = mk(96, 96), bgx = big.getContext('2d'); bgx.imageSmoothingEnabled = true; bgx.drawImage(small, 0, 0, 96, 96);
        f.blur = big; return big;
      }
      function setMood(m) { if (FACES[m]) SUBJ.mood = m; }

      /* ---------------- sound: narrator, score, camera, habitat ---------------- */
      const AU = { voice: null, whirr: null, wind: null, rumble: null, musNext: 0, musBeat: 0, duck: 0, swell: 0, timers: [] };
      function buildAudio() {
        if (!A.ctx || AU.voice) return;
        const c = A.ctx;
        AU.voice = c.createGain(); AU.voice.gain.value = 0.9;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400; lp.Q.value = 0.5;
        AU.voice.connect(lp); lp.connect(A.bus('sfx'));
        AU.whirr = A.loop({ filter: 'bandpass', freq: 320, q: 1.6, bus: 'sfx' });
        if (hab.amb === 'reef') AU.rumble = A.loop({ pink: true, filter: 'lowpass', freq: 260, q: 0.4, bus: 'amb' });
        if (hab.amb === 'wind') AU.wind = A.loop({ pink: true, filter: 'bandpass', freq: 520, q: 0.5, bus: 'amb' });
        AU.musNext = A.now() + 0.2;
      }
      buildAudio(); S.on('audio-ready', buildAudio);
      const amb = hab.amb === 'prairie' ? [K.ambience('prairie')] : hab.amb === 'forest' ? [K.ambience('rain'), K.ambience('dawn')] : [];
      amb.forEach((a, i) => a.level(i ? 0.5 : (hab.amb === 'forest' ? 0.28 : 0.55), 1.5));
      S.onDestroy(() => { ['whirr', 'wind', 'rumble'].forEach(k => { if (AU[k]) AU[k].stop(); }); });
      // the score: a slow, warm documentary theme (strings, harp, a little flute) that blooms as the footage does
      const BPM = 68, BEAT = 60 / BPM;
      const CHORDS = [['D2', ['D3', 'A3', 'F#4', 'A4'], ['D5', 'F#5', 'A5', 'D6']], ['B1', ['B2', 'F#3', 'D4', 'F#4'], ['B4', 'D5', 'F#5', 'B5']], ['G1', ['G2', 'D3', 'B3', 'D4'], ['G4', 'B4', 'D5', 'G5']], ['A1', ['A2', 'E3', 'C#4', 'E4'], ['A4', 'C#5', 'E5', 'A5']]];
      const MEL = [['F#5', 'E5', 'D5'], ['D5', 'C#5', 'B4'], ['B4', 'D5', 'G5'], ['A5', 'G5', 'E5']];
      function musicTick() {
        if (!A.ctx || !AU.voice) return;
        const c = A.ctx, horizon = c.currentTime + 0.35;
        if (AU.musNext < c.currentTime - 0.5) AU.musNext = c.currentTime + 0.05;
        while (AU.musNext < horizon) {
          const t = AU.musNext, b = AU.musBeat, bar = Math.floor(b / 4) % 4, bi = b % 4, ch = CHORDS[bar];
          const lv = (0.5 + 0.5 * ST.beauty) * (1 - 0.85 * AU.duck) * (1 + AU.swell * 0.6), nf = (n) => A.note(n);
          if (bi === 0) {
            A.pluck(nf(ch[0]), { when: t, vol: 0.2 * lv, damp: 0.993, lp: 420, bus: 'music' });
            ch[1].forEach((n, k) => A.tone({ when: t + k * 0.02, type: k ? 'triangle' : 'sawtooth', freq: nf(n), dur: BEAT * 4.3, vol: (k ? 0.026 : 0.012) * lv, attack: 1.1, lp: 1300, verb: 0.55, bus: 'music', detune: k % 2 ? 5 : -5 }));
          }
          // harp: rising eighths, denser as the footage gets more beautiful
          for (let e = 0; e < 2; e++) { const tt = t + e * BEAT / 2, k = (bi * 2 + e) % 8; if (Math.random() < 0.3 + 0.55 * ST.beauty) A.pluck(nf(ch[2][k % 4]) * (k >= 4 ? 2 : 1) / 2, { when: tt, vol: 0.07 * lv, damp: 0.9965, verb: 0.45, bus: 'music' }); }
          // the flute answers every other bar once things have warmed up
          if (bi === 0 && bar % 2 === 1 && ST.beauty > 0.35) MEL[bar].forEach((n, k) => { const f = nf(n), tt = t + k * BEAT * 0.9; A.tone({ when: tt, type: 'sine', freq: f, dur: BEAT * 1.1, vol: 0.03 * lv, attack: 0.09, verb: 0.5, bus: 'music' }); A.tone({ when: tt, type: 'sine', freq: f * 1.004, dur: BEAT * 1.1, vol: 0.016 * lv, attack: 0.12, verb: 0.5, bus: 'music' }); });
          AU.musNext += BEAT; AU.musBeat++;
        }
      }
      /* the narrator: Basil Fennimore, a very calm tortoise (an invented voice), speaks in warm synthesised babble under captions */
      const VOW = [[730, 1090, 2440], [530, 1840, 2480], [390, 1990, 2550], [570, 840, 2410], [440, 1020, 2240]];
      function plan(words) {
        let t = 0; const out = [];
        words.forEach((w, i) => {
          const syl = Math.max(1, Math.min(4, (w.toLowerCase().match(/[aeiouy]+/g) || [1]).length)), st = t;
          const sy = [];
          for (let k = 0; k < syl; k++) { const d = 0.115 + Math.random() * 0.05; sy.push({ t, d, stress: k === 0 }); t += d + 0.012; }
          t += /[,;:]$/.test(w) ? 0.26 : /[.!?…]["”]?$/.test(w) ? 0.42 : 0.07;
          out.push({ w, t: st, sy, i });
        });
        return { words: out, dur: t };
      }
      let narGain = null;
      function voice(pl, o) {
        o = o || {}; if (!A.ctx || !AU.voice) return;
        const c = A.ctx, t0 = c.currentTime + 0.06, base = 112, n = pl.words.length, cut = o.cutAt == null ? 1e9 : o.cutAt;
        // each line has its own fader: a newer line fades the older one out instead of talking over it
        if (narGain) { const og = narGain; try { og.gain.setTargetAtTime(0.0001, c.currentTime, 0.04); } catch (e) { /* closed */ } S.later(() => { try { og.disconnect(); } catch (e) { /* gone */ } }, 700); }
        const vg = c.createGain(); vg.gain.value = 1; vg.connect(AU.voice); narGain = vg;
        pl.words.forEach((wd, wi) => {
          if (wi > cut) return;
          const k = wi / Math.max(1, n - 1), q = /[?]["”]?$/.test(wd.w);
          wd.sy.forEach((sy, si) => {
            const t = t0 + sy.t, glitchy = wi >= cut - 1 && o.cutAt != null;
            let f0 = base * (1.08 - 0.22 * k) * (sy.stress ? 1.06 : 1) * (q && si === wd.sy.length - 1 ? 1.18 : 1) * (1 + (Math.random() - 0.5) * 0.05);
            if (glitchy) f0 *= 0.8;
            const osc = c.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(f0 * 1.02, t); osc.frequency.linearRampToValueAtTime(f0 * (glitchy ? 0.55 : 0.96), t + sy.d);
            const g = c.createGain(), v = 0.2 * (sy.stress ? 1 : 0.82);
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.022); g.gain.setValueAtTime(v, t + sy.d * 0.65); g.gain.exponentialRampToValueAtTime(0.0001, t + sy.d + 0.05);
            const V = VOW[Math.floor(Math.random() * VOW.length)];
            V.forEach((F, fi) => { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = F; bp.Q.value = [7, 9, 11][fi]; const ga = c.createGain(); ga.gain.value = [1.1, 0.55, 0.2][fi] * 3; osc.connect(bp); bp.connect(ga); ga.connect(g); });
            g.connect(vg); osc.start(t); osc.stop(t + sy.d + 0.08);
            if (si === 0 && Math.random() < 0.45) A.noise({ when: t - 0.012, filter: 'highpass', freq: 3800 + Math.random() * 2400, dur: 0.03, vol: 0.022 });
          });
        });
      }
      function sClapper() { if (!A.ctx) return; A.wood(undefined, 0.4, 0.85); A.noise({ filter: 'highpass', freq: 2400, dur: 0.05, vol: 0.2 }); A.thud({ vol: 0.18 }); }
      function sTapeStop() { if (!A.ctx) return; A.tone({ type: 'sawtooth', freq: 260, to: 38, glide: 0.55, dur: 0.6, vol: 0.06, lp: 1400 }); A.noise({ filter: 'bandpass', freq: 1800, to: 300, q: 0.8, dur: 0.6, vol: 0.08 }); K.sfx.glitch(); }
      function sFocusLock() { if (!A.ctx) return; const t = A.now(); [0, 0.09].forEach(o => A.tone({ when: t + o, type: 'sine', freq: 2093, dur: 0.06, vol: 0.06 })); A.tone({ when: t + 0.22, type: 'sine', freq: 1046, to: 1568, glide: 0.12, dur: 0.18, vol: 0.05 }); }
      function sHarp(up) { if (!A.ctx) return; const t = A.now(), ns = ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6']; (up ? ns : ns.slice().reverse()).forEach((n, i) => A.pluck(A.note(n), { when: t + i * 0.045, vol: 0.11, damp: 0.997, verb: 0.5 })); }
      function sTimpani() { if (!A.ctx) return; const t = A.now(); for (let i = 0; i < 14; i++) A.tone({ when: t + i * 0.06, type: 'sine', freq: 72, to: 60, dur: 0.22, vol: 0.05 + i * 0.012, bus: 'music' }); A.tone({ when: t + 0.9, type: 'sine', freq: 70, to: 46, glide: 0.6, dur: 1.4, vol: 0.32, bus: 'music' }); A.noise({ when: t + 0.9, filter: 'lowpass', freq: 500, dur: 1.2, vol: 0.12, bus: 'music' }); }
      let focusTick = 0;

      /* ---------------- captions ---------------- */
      let capWords = [];
      function showCaption(segs, label, cls) {
        subEl.className = 'nd-sub on' + (cls ? ' ' + cls : '');
        const kids = [h('small', { text: label || 'Narrator' })]; capWords = [];
        segs.forEach(sg => {
          const wrap = sg.user ? h('span', { class: 'gk-user' }) : null;
          sg.t.split(/(\s+)/).forEach(tok => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { const sp = document.createTextNode(tok); if (wrap) wrap.append(sp); else kids.push(sp); return; }
            const w = h('span', { class: 'w', text: tok }); capWords.push(w);
            if (wrap) wrap.append(w); else kids.push(w);
          });
          if (wrap) kids.push(wrap);
        });
        subT.replaceChildren(...kids);
        if (reduced()) capWords.forEach(w => w.classList.add('on'));
        placeSub();
      }
      let narTok = 0;
      function hideCaption(tok) { if (tok != null && tok !== narTok) return; subEl.className = 'nd-sub'; }
      /* speak a line: babble + captions lighting word by word; resolves { how, tok } when said, glitched or superseded */
      function narrate(segs, o) {
        o = o || {};
        const tok = ++narTok;
        showCaption(segs, o.label, o.cls);
        const words = capWords.slice(), pl = plan(words.map(w => w.textContent)), cut = o.glitch ? Math.max(1, Math.floor(words.length * 0.5)) : null;
        voice(pl, { cutAt: cut });
        const t0 = now();
        return new Promise(res => {
          let i = 0;
          const step = () => {
            if (S.destroyed) return;
            if (tok !== narTok) { res({ how: 'superseded', tok }); return; }
            const el2 = (now() - t0) / 1000 - 0.06;
            while (i < pl.words.length && pl.words[i].t <= el2 && (cut == null || i <= cut)) { words[i] && words[i].classList.add('on'); i++; }
            if (cut != null && i > cut) { for (let k = cut + 1; k < words.length; k++) words[k].classList.add('x'); res({ how: 'cut', tok }); return; }
            if (i >= pl.words.length) { S.later(() => res({ how: 'done', tok }), reduced() ? 300 : 650); return; }
            S.later(step, 40);
          };
          step();
        });
      }

      /* ---------------- layout ---------------- */
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        const first = !M.w;
        M.w = W; M.h = H; M.phone = W < 700; M.dpr = cv.dpr || 1;
        M.ww = Math.round(W * (M.phone ? 2.6 : 2.0));
        M.hz = Math.round(H * (M.phone ? 0.43 : 0.5));
        M.fy = Math.round(H * (M.phone ? 0.535 : 0.6));
        M.sz = M.phone ? 112 : 140;
        M.zone = W * ZONE;
        M.fgTop = Math.round(M.fy + M.sz * 0.42);
        M.spots = [M.ww * 0.62, M.ww * 0.36, M.ww * 0.5];
        M.below = M.fy + (M.phone ? 24 : 32);
        const csz = M.phone ? 74 : 96, dsz = M.phone ? 66 : 88;
        M.csz = csz; M.dsz = dsz; M.dropX = W - dsz - (M.phone ? 12 : 24); M.dropY = M.phone ? 116 : 118;
        glitch.place(M.phone ? 10 : 24, H - csz - (M.phone ? 18 : 26));
        drop.place(M.dropX, M.dropY);
        const tw = M.phone ? W - 24 : Math.min(960, W - 2 * (csz + 48));
        Object.assign(tray.style, { left: Math.round((W - tw) / 2) + 'px', width: tw + 'px', top: M.below + 'px' });
        Object.assign(titleEl.style, { top: (M.phone ? M.dropY + dsz + 10 : Math.round(H * 0.15)) + 'px' });
        const cw = Math.min(M.phone ? W - 40 : 560, W - 40), ct = M.below, cb = H - (M.phone ? 112 : 36);
        Object.assign(credEl.style, { left: Math.round((W - cw) / 2) + 'px', width: cw + 'px', top: ct + 'px', height: Math.max(80, cb - ct) + 'px' });
        layoutCards(); placeSub();
        if (first) { SUBJ.x = M.spots[0]; CAM.x = CAM.tx = clampCam(SUBJ.x - (W - M.sz / 2 - 14)); }
        else { SUBJ.x = clamp(SUBJ.x, 0, M.ww); CAM.tx = clampCam(CAM.tx); CAM.x = clampCam(CAM.x); }
        buildHerd(); buildCritters();
        LAY.key = ''; SPR.key = '';
      }
      function placeSub() { subEl.style.top = M.below + 'px'; }
      function layoutCards() {
        if (!cards.length) return;
        const live = cards.filter(c => !c.gone);
        tray.style.gridTemplateColumns = M.phone ? '1fr' : 'repeat(' + Math.max(1, live.length) + ', minmax(0, 1fr))';
      }

      /* ---------------- the camera ---------------- */
      function clampCam(x) {
        let lo = 0, hi = Math.max(0, M.ww - M.w);
        if (ST.keep) { const r = M.sz / 2 + 12; lo = Math.max(lo, SUBJ.x - (M.w - r)); hi = Math.min(hi, SUBJ.x - r); }
        return clamp(x, lo, Math.max(lo, hi));
      }
      const canPan = () => ['pan', 'track', 'golden', 'herd'].includes(ST.phase) && !ST.locked;
      K.drag(hit, {
        start: (p) => { if (!canPan()) return false; CAM.drag = true; CAM.grab = CAM.tx + p.x; CAM.fling = 0; hit.classList.add('drag'); if (A.ctx) A.click({ vol: 0.06 }); else K.sfx.tap(); K.sfx.tap(); ST.grabT = now(); return true; },
        move: (p) => { if (!CAM.drag) return; CAM.tx = clampCam(CAM.grab - p.x); },
        end: (p, d) => { CAM.drag = false; hit.classList.remove('drag'); CAM.fling = clamp(-(d.vx || 0) * 0.8, -2200, 2200); }
      });
      K.onKey(['ArrowLeft', 'ArrowRight'], (e) => { if (!canPan()) return; A.unlock(); buildAudio(); CAM.fling = 0; CAM.tx = clampCam(CAM.tx + ((e.code || e.key) === 'ArrowRight' ? 36 : -36)); });
      function stepCamera(dt) {
        if (!CAM.drag && Math.abs(CAM.fling) > 1) { CAM.tx = clampCam(CAM.tx + CAM.fling * dt); CAM.fling *= Math.exp(-5.5 * dt); }
        if (ST.glide) { const k = clamp((now() - ST.glide.t0) / ST.glide.ms, 0, 1); CAM.tx = lerp(ST.glide.from, ST.glide.to, ease.inOutCubic(k)); if (k >= 1) ST.glide = null; }
        CAM.tx = clampCam(CAM.tx);
        const kk = 110, c = 2 * Math.sqrt(kk) * 0.92;   // a heavy fluid head: the frame follows the hand with weight
        CAM.v += (kk * (CAM.tx - CAM.x) - c * CAM.v) * dt; CAM.x += CAM.v * dt;
        const cx = clampCam(CAM.x); if (cx !== CAM.x) { CAM.x = cx; CAM.v *= 0.5; }
        CAM.speed = Math.abs(CAM.v);
        if (AU.whirr) { AU.whirr.level(clamp(CAM.speed / 900, 0, 1) * 0.07 + 0.0001, 0.05); AU.whirr.freq(240 + Math.min(500, CAM.speed * 0.4), 0.08); }
      }
      function glideCam(to, ms) { ST.glide = { from: CAM.tx, to: clampCam(to), t0: now(), ms: reduced() ? Math.min(ms, 300) : ms }; }
      const subjScreen = () => ({ x: SUBJ.x - CAM.x, y: M.fy - M.sz * 0.5 });

      /* ---------------- the herd and the critters ---------------- */
      function buildHerd() {
        HERDS.length = 0; if (!M.w) return;
        const Rg = K.rng(77 + hab.key.length), n = M.phone ? 30 : 46, cols = ['#ff9ec4', '#9fd8ff', '#ffd27a', '#b7a4ff', '#9ff0c0', '#ffb38a'];
        for (let i = 0; i < n; i++) {
          let x = 0, tries = 0;
          do { x = M.w * 0.12 + Rg() * (M.ww - M.w * 0.24); tries++; } while (tries < 12 && M.spots.some(s => Math.abs(s - x) < M.sz * 0.85));
          const depth = Rg(), y = lerp(M.hz + 10, M.fy - 12, depth);
          HERDS.push({ x, y, s: lerp(0.34, 0.66, depth) * M.sz, c: Math.floor(Rg() * cols.length), v: Rg() < 0.5 ? 0 : 1, ph: Rg() * 6, seen: false, popT: 0, cols });
        }
        HERDS.sort((a, b) => a.y - b.y);
        if (CAMEO && HERDS.length > 4) { const m = HERDS[HERDS.length - 3]; m.cameo = true; m.s = M.sz * 0.62; }
        ST.herdN = HERDS.filter(x => x.seen).length;
      }
      function buildCritters() {
        CRIT.length = 0; if (!M.w) return;
        const Rg = K.rng(5 + hab.key.length), n = hab.critter === 'owl' ? 2 : 6;
        for (let i = 0; i < n; i++) CRIT.push({ x: Rg() * M.ww, y: hab.critter === 'fish' ? lerp(M.hz - 90, M.hz + 30, Rg()) : hab.critter === 'owl' ? M.hz - 40 - Rg() * 30 : lerp(70, M.hz - 30, Rg()), v: (Rg() < 0.5 ? -1 : 1) * (14 + Rg() * 26), ph: Rg() * 6, s: 0.7 + Rg() * 0.6 });
      }

      /* ---------------- painting the habitat (layers painted once; the camera pans across them) ---------------- */
      const LAY = { key: '', sky: null, far: null, mid: null, ground: null, fg: null };
      const SPR = { key: '' };
      function pal() { return S.scene() === 'bright' ? hab.day : hab.dusk; }
      function layer(wCss, hCss, ld, paint, y, f) {
        const c = mk(wCss * ld, hCss * ld), g = c.getContext('2d'); g.setTransform(ld, 0, 0, ld, 0, 0);
        paint(g, wCss, hCss);
        return { c, y, h: hCss, f, ld, w: wCss };
      }
      function buildLayers() {
        const key = M.w + 'x' + M.h + ':' + M.dpr + ':' + S.scene(); if (LAY.key === key) return; LAY.key = key;
        const W = M.w, H = M.h, Pp = pal(), dark = S.scene() !== 'bright', ld = Math.min(M.dpr, 1.5), ldFar = Math.min(M.dpr, 1);
        const lw = (f) => Math.ceil(W + f * (M.ww - W)) + 2;
        // sky: a screen-sized backdrop (no parallax)
        LAY.sky = layer(W, H, ldFar, (g) => paintSky(g, W, H, Pp, dark), 0, 0);
        const farTop = M.hz - Math.round(H * 0.2), midTop = M.hz - Math.round(H * (M.phone ? 0.24 : 0.3));
        LAY.far = layer(lw(0.18), M.hz + 24 - farTop, ldFar, (g, w, hh) => paintFar(g, w, hh, Pp, dark), farTop, 0.18);
        LAY.mid = layer(lw(0.5), M.hz + 40 - midTop, ld, (g, w, hh) => paintMid(g, w, hh, Pp, dark), midTop, 0.5);
        LAY.ground = layer(lw(1), H - M.hz + 2, ld, (g, w, hh) => paintGround(g, w, hh, Pp, dark), M.hz - 2, 1);
        LAY.fg = layer(lw(1.3), H - M.fgTop, ld, (g, w, hh) => paintFg(g, w, hh, Pp, dark), M.fgTop, 1.3);
      }
      function paintSky(g, W, H, Pp, dark) {
        const R = K.rng(3 + hab.key.length), hz = M.hz;
        g.fillStyle = vgrad(g, 0, hz + 30, Pp.sky); g.fillRect(0, 0, W, H);
        if (hab.key === 'reef') {
          for (let i = 0; i < 7; i++) { const x = W * (0.08 + i * 0.14) + (R() - 0.5) * 30, w0 = 18 + R() * 30; const gr = g.createLinearGradient(0, 0, 0, hz + 60); gr.addColorStop(0, rgba(Pp.sun, dark ? 0.16 : 0.32)); gr.addColorStop(1, rgba(Pp.sun, 0)); g.fillStyle = gr; g.beginPath(); g.moveTo(x - w0 / 2, 0); g.lineTo(x + w0 / 2, 0); g.lineTo(x + w0 * 1.6 + 40, hz + 60); g.lineTo(x - w0 * 0.4 + 40, hz + 60); g.closePath(); g.fill(); }
          g.strokeStyle = rgba(Pp.sun, dark ? 0.25 : 0.5); g.lineWidth = 2; for (let k = 0; k < 2; k++) { g.beginPath(); for (let x = 0; x <= W; x += 10) g.lineTo(x, 8 + k * 7 + Math.sin(x * 0.05 + k) * 3); g.stroke(); }
          return;
        }
        if (dark) { for (let i = 0; i < (M.phone ? 60 : 130); i++) { const sx = R() * W, sy = R() * hz * 0.8; g.fillStyle = 'rgba(255,255,255,' + (0.2 + R() * 0.55).toFixed(2) + ')'; g.fillRect(sx, sy, R() < 0.12 ? 2 : 1.2, R() < 0.12 ? 2 : 1.2); } }
        if (hab.key === 'tundra' && dark) { // the aurora (really the fridge light, according to the locals)
          for (let b = 0; b < 3; b++) { g.beginPath(); const y0 = hz * (0.22 + b * 0.1); for (let x = 0; x <= W; x += 8) g.lineTo(x, y0 + Math.sin(x * 0.012 + b * 1.7) * 22 + Math.sin(x * 0.031 + b) * 8); g.lineTo(W, y0 + 90); for (let x = W; x >= 0; x -= 8) g.lineTo(x, y0 + 70 + Math.sin(x * 0.012 + b * 1.7) * 22); g.closePath(); const gr = g.createLinearGradient(0, y0 - 20, 0, y0 + 90); gr.addColorStop(0, 'rgba(120,255,190,0)'); gr.addColorStop(0.4, b === 1 ? 'rgba(255,140,220,0.22)' : 'rgba(120,255,190,0.26)'); gr.addColorStop(1, 'rgba(120,255,190,0)'); g.fillStyle = gr; g.fill(); }
        }
        // the sun (or moon) low over the habitat
        const sx = W * (hab.key === 'rainforest' ? 0.7 : 0.66), sy = dark ? hz - (M.phone ? 46 : 70) : hz * 0.38, sr = (M.phone ? 30 : 44) * (dark && hab.key === 'savannah' ? 1.5 : 1);
        const glow = g.createRadialGradient(sx, sy, sr * 0.4, sx, sy, sr * 6); glow.addColorStop(0, rgba(Pp.sun, 0.6)); glow.addColorStop(0.3, rgba(Pp.warm, 0.18)); glow.addColorStop(1, rgba(Pp.warm, 0)); g.fillStyle = glow; g.fillRect(0, 0, W, H);
        g.fillStyle = Pp.sun; g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill();
        if (dark && hab.key !== 'savannah') { g.fillStyle = Pp.sky[1]; g.beginPath(); g.arc(sx + sr * 0.42, sy - sr * 0.22, sr * 0.88, 0, TAU); g.fill(); }
        if (hab.key === 'savannah' || hab.key === 'rainforest' || !dark) for (let i = 0; i < 5; i++) cloud(g, R() * W, 40 + R() * hz * 0.45, 16 + R() * 26, rgba(dark ? '#ffd7c0' : '#ffffff', dark ? 0.1 + R() * 0.08 : 0.35 + R() * 0.25));
      }
      function paintFar(g, w, hh, Pp, dark) {
        const R = K.rng(11 + hab.key.length), base = hh - 24;
        if (hab.key === 'savannah') {
          let x = -30; while (x < w) { const bw = 70 + R() * 160, bh = hh * (0.25 + R() * 0.35); g.fillStyle = Pp.far[0]; g.beginPath(); g.moveTo(x, base + 30); g.lineTo(x + bw * 0.16, base - bh); g.lineTo(x + bw * 0.84, base - bh); g.lineTo(x + bw, base + 30); g.closePath(); g.fill(); x += bw + 40 + R() * 200; }
          ridge(g, w, base + 6, hh * 0.18, Pp.far[1], R, 1.3, hh + 2);
        } else if (hab.key === 'reef') {
          for (let i = 0; i < 26; i++) { const x = R() * w, r = 18 + R() * 46; g.fillStyle = i % 2 ? Pp.far[0] : Pp.far[1]; g.beginPath(); g.arc(x, base + 8, r, Math.PI, 0); g.fill(); }
          g.fillStyle = Pp.far[1]; g.fillRect(0, base + 6, w, hh);
        } else if (hab.key === 'tundra') {
          let x = -40; while (x < w) { const bw = 120 + R() * 180, bh = hh * (0.45 + R() * 0.5); g.fillStyle = Pp.far[1]; g.beginPath(); g.moveTo(x, base + 20); g.lineTo(x + bw / 2, base - bh); g.lineTo(x + bw, base + 20); g.closePath(); g.fill();
            g.fillStyle = Pp.far[0]; g.beginPath(); g.moveTo(x + bw / 2, base - bh); g.lineTo(x + bw * 0.5 - bw * 0.16, base - bh * 0.62); g.lineTo(x + bw * 0.46, base - bh * 0.7); g.lineTo(x + bw * 0.55, base - bh * 0.58); g.lineTo(x + bw * 0.5 + bw * 0.17, base - bh * 0.64); g.closePath(); g.fill(); x += bw * 0.62 + R() * 40; }
          ridge(g, w, base + 10, hh * 0.1, Pp.far[0], R, 1, hh + 2);
        } else {
          for (let row = 0; row < 2; row++) { g.fillStyle = Pp.far[row]; for (let x = -20; x < w + 40; x += 22 + R() * 26) { const r = 24 + R() * 30; g.beginPath(); g.arc(x, base - hh * (0.45 - row * 0.2) + R() * 16, r, 0, TAU); g.fill(); } g.fillRect(0, base - hh * (0.45 - row * 0.2), w, hh); }
        }
        if (!dark) { g.fillStyle = rgba(Pp.haze, 0.25); g.fillRect(0, 0, w, hh); }
      }
      function paintMid(g, w, hh, Pp, dark) {
        const R = K.rng(23 + hab.key.length), base = hh - 40, rim = rgba(Pp.rim, dark ? 0.35 : 0.5);
        const at = (fx) => fx * (w - M.w) + M.w * 0.5; // place a prop so it passes the centre when the camera pans there
        if (hab.key === 'savannah') {
          for (let x = 40 + R() * 80; x < w; x += 170 + R() * 230) { // acacias
            const th = hh * (0.42 + R() * 0.3), lean = (R() - 0.5) * 20, cx = x + lean;
            g.strokeStyle = Pp.tree; g.lineWidth = 4 + R() * 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, base + 4); g.quadraticCurveTo(x + lean * 0.2, base - th * 0.6, cx, base - th); g.stroke();
            g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx, base - th * 0.8); g.lineTo(cx - 26, base - th - 4); g.moveTo(cx, base - th * 0.85); g.lineTo(cx + 30, base - th - 2); g.stroke();
            g.fillStyle = Pp.tree; [[-30, -6, 44, 9], [10, -10, 48, 10], [-6, -16, 40, 9], [34, -4, 30, 7]].forEach(([dx, dy, rx, ry]) => { g.beginPath(); g.ellipse(cx + dx * 0.9, base - th + dy, rx, ry, 0, 0, TAU); g.fill(); });
            g.fillStyle = rim; g.beginPath(); g.ellipse(cx - 2, base - th - 20, 38, 3, 0, 0, TAU); g.fill();
          }
          for (let i = 0; i < 4; i++) { const x = at(0.12 + i * 0.25) + (R() - 0.5) * 80, ch = 34 + R() * 24, cw = 26 + R() * 8; // filing-cabinet termite mounds
            g.fillStyle = Pp.mound; rr(g, x - cw / 2, base - ch, cw, ch + 6, 4); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.2; for (let k = 1; k < 4; k++) { const y = base - ch + k * ch / 4; g.beginPath(); g.moveTo(x - cw / 2 + 3, y); g.lineTo(x + cw / 2 - 3, y); g.stroke(); g.fillStyle = rim; g.fillRect(x - 4, y - ch / 8 - 1, 8, 2); g.fillStyle = Pp.mound; } }
          const wx = at(0.46); // the watering hole and its water cooler
          g.fillStyle = Pp.water; g.beginPath(); g.ellipse(wx, base + 10, 70, 9, 0, 0, TAU); g.fill(); g.fillStyle = rgba('#ffffff', 0.25); g.fillRect(wx - 40, base + 8, 50, 1.5);
          g.fillStyle = Pp.mound; rr(g, wx + 40, base - 26, 18, 30, 3); g.fill(); g.fillStyle = dark ? '#5fa8d0' : '#8fd0f0'; rr(g, wx + 41, base - 46, 16, 22, 7); g.fill(); g.fillStyle = rgba('#ffffff', 0.5); g.fillRect(wx + 44, base - 42, 3, 12);
        } else if (hab.key === 'reef') {
          const corals = ['#ff8a7a', '#ffb36b', '#c79bff', '#ff7aa8', '#7fe0c0'];
          for (let x = 20 + R() * 60; x < w; x += 70 + R() * 120) { // speech-bubble coral
            const n = 2 + Math.floor(R() * 3); for (let k = 0; k < n; k++) { const bw = 26 + R() * 34, bh = 16 + R() * 14, bx = x + (R() - 0.5) * 30, by = base - 10 - k * (bh + 6) - R() * 10, col = corals[Math.floor(R() * corals.length)];
              g.fillStyle = dark ? mixHex(col, '#0a2440', 0.45) : col; rr(g, bx - bw / 2, by - bh, bw, bh, bh / 2); g.fill(); g.beginPath(); g.moveTo(bx - bw * 0.2, by - 2); g.lineTo(bx - bw * 0.3, by + 7); g.lineTo(bx - bw * 0.02, by - 2); g.fill();
              g.fillStyle = rgba('#ffffff', dark ? 0.35 : 0.7); for (let d = -1; d <= 1; d++) { g.beginPath(); g.arc(bx + d * 6, by - bh / 2, 1.8, 0, TAU); g.fill(); } }
            g.strokeStyle = dark ? '#1d5a4a' : '#2e9a6a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 30, base + 6); for (let k = 0; k < 6; k++) g.lineTo(x + 30 + Math.sin(k * 1.4) * 6, base - k * 14); g.stroke();
          }
          for (let i = 0; i < 6; i++) { const x = R() * w, r = 14 + R() * 12; g.fillStyle = dark ? '#4a3a7a' : '#d9a0ff'; g.beginPath(); g.arc(x, base + 6, r, Math.PI, 0); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 1; for (let k = 1; k < 4; k++) { g.beginPath(); g.arc(x, base + 6, r * k / 4, Math.PI, 0); g.stroke(); } }
        } else if (hab.key === 'tundra') {
          for (let x = 30 + R() * 80; x < w; x += 120 + R() * 200) { // snowy pines
            const th = hh * (0.3 + R() * 0.32); g.fillStyle = Pp.tree; for (let k = 0; k < 4; k++) { const y = base - th * (0.25 + k * 0.22), wd = (1 - k * 0.2) * th * 0.32; g.beginPath(); g.moveTo(x, y - th * 0.3); g.lineTo(x - wd, y); g.lineTo(x + wd, y); g.closePath(); g.fill(); }
            g.fillStyle = rgba('#ffffff', dark ? 0.55 : 0.9); for (let k = 0; k < 4; k++) { const y = base - th * (0.25 + k * 0.22), wd = (1 - k * 0.2) * th * 0.32; g.beginPath(); g.moveTo(x, y - th * 0.3); g.lineTo(x - wd * 0.45, y - th * 0.16); g.lineTo(x + wd * 0.4, y - th * 0.15); g.closePath(); g.fill(); }
          }
          const fx = at(0.5); // the fridge, a monolith of light
          const fh = hh * 0.6, fw = fh * 0.45; g.fillStyle = dark ? '#d8e4f0' : '#f4f8fc'; rr(g, fx - fw / 2, base - fh, fw, fh, 8); g.fill(); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(fx - fw / 2 + 4, base - fh * 0.62, fw - 8, 2); g.fillStyle = '#9aa8b8'; g.fillRect(fx + fw / 2 - 9, base - fh * 0.86, 3, 14); g.fillRect(fx + fw / 2 - 9, base - fh * 0.5, 3, 18);
          if (dark) { const gl = g.createRadialGradient(fx, base - fh / 2, fw * 0.3, fx, base - fh / 2, fh * 1.2); gl.addColorStop(0, 'rgba(190,255,230,0.3)'); gl.addColorStop(1, 'rgba(190,255,230,0)'); g.fillStyle = gl; g.fillRect(fx - fh * 1.2, base - fh * 1.7, fh * 2.4, fh * 2.4); }
          const kx = at(0.22); g.fillStyle = dark ? '#8a9ab0' : '#c0ccd8'; g.beginPath(); g.ellipse(kx, base - 12, 16, 13, 0, 0, TAU); g.fill(); g.fillRect(kx - 3, base - 30, 6, 6); g.strokeStyle = g.fillStyle; g.lineWidth = 3; g.beginPath(); g.moveTo(kx + 14, base - 16); g.lineTo(kx + 24, base - 24); g.stroke();
        } else {
          for (let x = 10 + R() * 50; x < w; x += 90 + R() * 140) { // trunks, vines and envelope leaves
            const tw0 = 10 + R() * 14; g.fillStyle = Pp.tree; g.fillRect(x - tw0 / 2, 0, tw0, base + 10);
            g.strokeStyle = dark ? '#1f4a2a' : '#4f9a4a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + tw0 / 2, 0); g.quadraticCurveTo(x + 30 + R() * 30, hh * 0.4, x + 10, hh * (0.6 + R() * 0.3)); g.stroke();
            for (let k = 0; k < 3; k++) { const ex = x + (R() - 0.3) * 50, ey = hh * (0.2 + R() * 0.5), ew = 16, eh = 11; g.fillStyle = dark ? '#d8e8c8' : '#fffbe8'; g.save(); g.translate(ex, ey); g.rotate((R() - 0.5) * 0.8); g.fillRect(-ew / 2, -eh / 2, ew, eh); g.strokeStyle = 'rgba(80,60,40,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-ew / 2, -eh / 2); g.lineTo(0, 1); g.lineTo(ew / 2, -eh / 2); g.stroke(); g.restore(); }
          }
          blades(g, w, base + 10, hh * 0.15, hh * 0.32, dark ? '#143a20' : '#3f8a46', R, Math.round(w / 40), { frond: true, lean: 0.6 });
        }
              const fog = g.createLinearGradient(0, base - hh * 0.35, 0, hh); fog.addColorStop(0, rgba(Pp.haze, 0)); fog.addColorStop(0.75, rgba(Pp.haze, dark ? 0.42 : 0.38)); fog.addColorStop(1, rgba(Pp.haze, dark ? 0.6 : 0.5)); g.fillStyle = fog; g.fillRect(0, base - hh * 0.35, w, hh);
      }
      function paintGround(g, w, hh, Pp, dark) {
        const R = K.rng(37 + hab.key.length), key = hab.key;
        g.fillStyle = vgrad(g, 0, hh, [mixHex(Pp.ground[0], Pp.haze, 0.5), Pp.ground[0], Pp.ground[1], Pp.ground[2]]); g.fillRect(0, 0, w, hh);
        // dappled light pools (sun through leaves, caustics, moonlight), flattened by perspective
        const pool = sprite(128, [[0, rgba(Pp.warm, dark ? 0.3 : 0.36)], [0.55, rgba(Pp.warm, dark ? 0.1 : 0.12)], [1, rgba(Pp.warm, 0)]]);
        g.globalCompositeOperation = 'lighter';
        for (let i = 0, n = Math.round(w / 120); i < n; i++) { const y = (0.12 + R() * 0.5) * hh, rx = (50 + R() * 110) * (0.6 + y / hh), x = R() * w; g.globalAlpha = 0.5 + R() * 0.5; g.drawImage(pool, x - rx, y - rx * 0.2, rx * 2, rx * 0.4); }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        // texture in perspective: fine near the horizon, coarse towards the lens
        const n = Math.round(w * hh / 120), lite = mixHex(Pp.ground[0], Pp.rim, 0.35), deep = mixHex(Pp.ground[2], '#000000', 0.2);
        for (let i = 0; i < n; i++) {
          const y = hh * Math.pow(R(), 0.75), k = y / hh, x = R() * w, s = 0.5 + k * 3.2;
          if (key === 'savannah' || key === 'rainforest') { g.strokeStyle = rgba(R() < 0.55 ? lite : deep, 0.18 + R() * 0.22); g.lineWidth = Math.max(0.7, s * 0.5); g.beginPath(); for (let b2 = -1; b2 <= 1; b2++) { g.moveTo(x + b2 * s, y); g.lineTo(x + b2 * s * 2 + (R() - 0.5) * s, y - s * (2.5 + R() * 2.5)); } g.stroke(); }
          else if (key === 'reef') { g.strokeStyle = rgba(R() < 0.6 ? '#ffffff' : deep, 0.07 + R() * 0.1); g.lineWidth = 0.8 + k; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + s * 4, y - s * 0.8, x + s * 8, y); g.stroke(); }
          else { g.fillStyle = rgba(R() < 0.5 ? '#ffffff' : deep, 0.16 + R() * 0.3); g.fillRect(x, y, 0.8 + k * 1.6, 0.8 + k * 1.6); }
        }
        // small things that live here, scattered with perspective
        for (let i = 0, m = Math.round(w / 70); i < m; i++) {
          const y = hh * (0.08 + Math.pow(R(), 0.9) * 0.85), k = y / hh, x = R() * w, s = 0.5 + k * 1.8;
          if (M.spots.some(sx => Math.abs(sx - x) < M.sz * 0.9) && y < (M.fy - M.hz) * 1.3) continue;
          if (key === 'savannah') { g.fillStyle = mixHex(Pp.ground[1], '#000000', 0.25); g.beginPath(); g.ellipse(x, y, 7 * s, 4 * s, 0, Math.PI, 0); g.fill(); g.fillStyle = rgba(Pp.rim, 0.35); g.beginPath(); g.ellipse(x - 2 * s, y - 2.6 * s, 3 * s, 1.1 * s, 0, 0, TAU); g.fill(); }
          else if (key === 'rainforest') { if (R() < 0.5) { g.fillStyle = dark ? '#e9dcc0' : '#f6ead0'; g.fillRect(x - 0.8 * s, y - 6 * s, 1.6 * s, 6 * s); g.fillStyle = R() < 0.5 ? '#d9583a' : '#f0b04a'; g.beginPath(); g.ellipse(x, y - 6 * s, 4.5 * s, 3 * s, 0, Math.PI, 0); g.fill(); } else { g.fillStyle = mixHex(Pp.ground[0], '#7fbf4a', 0.45); g.beginPath(); g.ellipse(x, y, 9 * s, 2.6 * s, 0, 0, TAU); g.fill(); } }
          else if (key === 'reef') { g.fillStyle = R() < 0.5 ? '#ffb38a' : '#ff8ab0'; g.globalAlpha = dark ? 0.55 : 0.85; g.save(); g.translate(x, y); g.rotate(R() * TAU); g.beginPath(); for (let a2 = 0; a2 < 10; a2++) { const rad = a2 % 2 ? 1.6 * s : 5 * s, an2 = a2 * Math.PI / 5; g.lineTo(Math.cos(an2) * rad, Math.sin(an2) * rad * 0.5); } g.closePath(); g.fill(); g.restore(); g.globalAlpha = 1; }
          else { g.fillStyle = rgba('#ffffff', dark ? 0.55 : 0.9); g.beginPath(); g.ellipse(x, y, 10 * s, 3.4 * s, 0, Math.PI, 0); g.fill(); g.fillStyle = rgba(Pp.haze, 0.35); g.beginPath(); g.ellipse(x + 2 * s, y + 0.5, 9 * s, 1.6 * s, 0, 0, TAU); g.fill(); }
        }
        // haze where the ground meets the backdrop
        const fog = g.createLinearGradient(0, 0, 0, hh * 0.22); fog.addColorStop(0, rgba(Pp.haze, dark ? 0.6 : 0.5)); fog.addColorStop(1, rgba(Pp.haze, 0)); g.fillStyle = fog; g.fillRect(0, 0, w, hh * 0.22);
        // the perches where the human settles: a boulder, a coral rock, a snow mound, a mossy log
        const ny = M.fy - (M.hz - 2);
        M.spots.forEach((sx) => {
          const pw = M.sz * 0.66, ph2 = M.sz * 0.16;
          g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(sx + 8, ny + ph2 * 0.55, pw * 1.12, ph2 * 0.6, 0, 0, TAU); g.fill();
          if (key === 'rainforest') { // a mossy log, end-on ring towards us
            const lw = pw * 2.1, lh = ph2 * 1.7, x0 = sx - lw / 2, y0 = ny - lh * 0.75;
            g.fillStyle = dark ? '#3a2616' : '#6a4426'; rr(g, x0, y0, lw, lh, lh / 2); g.fill();
            g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.2; for (let k = 0; k < 6; k++) { const yy = y0 + lh * (0.25 + k * 0.1); g.beginPath(); g.moveTo(x0 + lh * 0.4, yy); g.lineTo(x0 + lw - lh * 0.3, yy + (R() - 0.5) * 3); g.stroke(); }
            g.fillStyle = dark ? '#8a6a44' : '#c9a070'; g.beginPath(); g.ellipse(x0 + lw - lh * 0.22, y0 + lh / 2, lh * 0.28, lh * 0.48, 0, 0, TAU); g.fill();
            g.strokeStyle = 'rgba(80,50,20,0.55)'; g.beginPath(); g.ellipse(x0 + lw - lh * 0.22, y0 + lh / 2, lh * 0.14, lh * 0.26, 0, 0, TAU); g.stroke();
            g.fillStyle = dark ? '#3f7a2e' : '#7fc24a'; for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(x0 + lh * 0.3 + k * (lw - lh) / 8, y0 + 2, 4 + (k % 3) * 1.6, 0, TAU); g.fill(); }
            g.fillStyle = dark ? '#e9dcc0' : '#f6ead0'; g.fillRect(x0 + lw * 0.12, y0 - 7, 2.2, 7); g.fillStyle = '#d9583a'; g.beginPath(); g.ellipse(x0 + lw * 0.12 + 1.1, y0 - 7, 6, 4, 0, Math.PI, 0); g.fill();
          } else if (key === 'tundra') {
            g.fillStyle = dark ? '#d6e2f2' : '#ffffff'; g.beginPath(); g.ellipse(sx, ny - ph2 * 0.2, pw * 1.05, ph2 * 1.25, 0, Math.PI, 0); g.fill();
            g.fillStyle = dark ? 'rgba(80,110,170,0.45)' : 'rgba(150,180,220,0.45)'; g.beginPath(); g.ellipse(sx + pw * 0.3, ny - ph2 * 0.1, pw * 0.6, ph2 * 0.5, 0, Math.PI, 0); g.fill();
          } else {
            const base = key === 'reef' ? (dark ? '#3a5a6a' : '#a69280') : (dark ? '#7a4a3a' : '#bf9466');
            g.fillStyle = mixHex(base, '#000000', 0.25); g.beginPath(); g.ellipse(sx, ny - ph2 * 0.35, pw, ph2 * 1.25, 0, 0, TAU); g.fill();
            g.fillStyle = base; g.beginPath(); g.ellipse(sx - pw * 0.06, ny - ph2 * 0.75, pw * 0.92, ph2 * 0.95, 0, 0, TAU); g.fill();
            g.fillStyle = rgba(Pp.rim, dark ? 0.3 : 0.5); g.beginPath(); g.ellipse(sx - pw * 0.25, ny - ph2 * 1.25, pw * 0.5, ph2 * 0.32, -0.08, 0, TAU); g.fill();
            if (key === 'reef') { g.strokeStyle = dark ? '#ff7aa8' : '#ff5a8a'; g.lineWidth = 2.6; g.lineCap = 'round'; for (let k = 0; k < 7; k++) { const ax = sx + pw * 0.5 + k * 4; g.beginPath(); g.moveTo(ax, ny - ph2 * 1.2); g.quadraticCurveTo(ax + 4, ny - ph2 * 1.2 - 10, ax + (k % 2 ? 7 : -3), ny - ph2 * 1.2 - 19); g.stroke(); } }
            else { g.strokeStyle = mixHex(Pp.fg, Pp.ground[0], 0.4); g.lineWidth = 1.6; for (let k = 0; k < 8; k++) { const ax = sx - pw * 0.95 + k * 5; g.beginPath(); g.moveTo(ax, ny); g.lineTo(ax - 3 + R() * 6, ny - 8 - R() * 8); g.stroke(); } }
          }
        });
      }
      function paintFg(g, w, hh, Pp, dark) {
        // what is between the lens and the human: out-of-focus foliage framing the shot, darkest at the camera's feet
        const R = K.rng(51 + hab.key.length), key = hab.key;
        const fade = g.createLinearGradient(0, 0, 0, hh); fade.addColorStop(0, rgba(Pp.fg, 0)); fade.addColorStop(0.45, rgba(Pp.fg, dark ? 0.45 : 0.28)); fade.addColorStop(1, rgba(Pp.fg, dark ? 0.94 : 0.78)); g.fillStyle = fade; g.fillRect(0, 0, w, hh);
        const sil = rgba(mixHex(Pp.fg, '#000000', dark ? 0.1 : 0), dark ? 0.97 : 0.9), rim = rgba(Pp.rim, dark ? 0.22 : 0.3);
        // clumps gather at the edges of the frame (every half screen), leaving the middle clear
        for (let cx = R() * 60; cx < w + 60; cx += M.w * (0.42 + R() * 0.2)) {
          const size = hh * (0.55 + R() * 0.5);
          if (key === 'savannah') { for (let k = 0; k < 16; k++) { const x = cx + (R() - 0.5) * 70, bh = size * (0.4 + R() * 0.7), lean = (R() - 0.5) * bh * 0.6; g.fillStyle = sil; g.beginPath(); g.moveTo(x - 3, hh + 2); g.quadraticCurveTo(x + lean * 0.3, hh - bh * 0.55, x + lean, hh - bh); g.quadraticCurveTo(x + lean * 0.3 + 2, hh - bh * 0.55, x + 4, hh + 2); g.closePath(); g.fill(); if (R() < 0.4) { g.beginPath(); g.ellipse(x + lean, hh - bh - 5, 2.6, 7, lean * 0.01, 0, TAU); g.fill(); g.strokeStyle = rim; g.lineWidth = 1; g.stroke(); } } }
          else if (key === 'reef') { blades(g, w, hh + 4, size * 0.5, size * 1.1, sil, R, 5, { wavy: true, wd: 3.4, at: cx + 40, spread: 70 }); g.save(); g.translate(cx, hh); g.fillStyle = sil; for (let a2 = -1.2; a2 <= 1.21; a2 += 0.2) { g.beginPath(); g.ellipse(Math.sin(a2) * size * 0.32, -Math.cos(a2) * size * 0.32, 5, size * 0.3, a2, 0, TAU); g.fill(); } g.restore(); }
          else if (key === 'tundra') { g.fillStyle = sil; g.beginPath(); g.ellipse(cx, hh + size * 0.15, size * 1.1, size * 0.55, 0, Math.PI, 0); g.fill(); g.strokeStyle = rgba('#ffffff', dark ? 0.28 : 0.6); g.lineWidth = 2; g.beginPath(); g.ellipse(cx, hh + size * 0.15, size * 1.1, size * 0.55, 0, Math.PI * 1.15, Math.PI * 1.75); g.stroke(); }
          else { blades(g, w, hh + 6, size * 0.6, size * 1.05, sil, R, 4, { frond: true, lean: 0.9, at: cx, spread: 90 }); for (let k = 0; k < 3; k++) { const lx = cx + (R() - 0.5) * 80, ly = hh - size * (0.2 + R() * 0.4), a2 = (R() - 0.5) * 1.6; g.save(); g.translate(lx, ly); g.rotate(a2); g.fillStyle = sil; g.beginPath(); g.ellipse(0, 0, size * 0.32, size * 0.11, 0, 0, TAU); g.fill(); g.strokeStyle = rim; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-size * 0.3, 0); g.lineTo(size * 0.3, 0); g.stroke(); g.restore(); } }
        }
        // a low continuous hedge so the bottom edge is never bare
        if (key === 'tundra') ridge(g, w, hh * 0.95, hh * 0.22, sil, R, 2.2, hh + 4);
        else blades(g, w, hh + 4, hh * 0.12, hh * 0.3, sil, R, Math.round(w / (key === 'savannah' ? 7 : 18)), { lean: 0.4, wd: 2.4, wavy: key === 'reef' });
      }
      /* sprites: the herd (a species of glossy bubble creatures), glows, vignette, film grain */
      function buildSprites() {
        const key = M.w + 'x' + M.h + ':' + M.dpr + ':' + S.scene(); if (SPR.key === key) return; SPR.key = key;
        const Pp = pal(), dark = S.scene() !== 'bright', d = Math.min(2, M.dpr);
        SPR.herd = [];
        ['#ff9ec4', '#9fd8ff', '#ffd27a', '#b7a4ff', '#9ff0c0', '#ffb38a'].forEach(col => {
          const s = 64, c = mk(s * d, s * 1.25 * d), g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
          const r = s * 0.42, cx = s / 2, cy = s * 0.62;
          g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(cx, cy + r * 0.98, r * 0.85, r * 0.16, 0, 0, TAU); g.fill();
          const gr = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r); gr.addColorStop(0, mixHex(col, '#ffffff', 0.6)); gr.addColorStop(0.55, col); gr.addColorStop(1, mixHex(col, '#2a1a3a', 0.45));
          g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(cx - r * 0.38, cy - r * 0.5, r * 0.22, r * 0.12, -0.6, 0, TAU); g.fill();
          [[-0.3, 0], [0.3, 0]].forEach(([ex]) => { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(cx + ex * r, cy - r * 0.05, r * 0.17, r * 0.2, 0, 0, TAU); g.fill(); g.fillStyle = '#20162a'; g.beginPath(); g.arc(cx + ex * r, cy + r * 0.04, r * 0.09, 0, TAU); g.fill(); });
          SPR.herd.push(c);
        });
        SPR.phone = sprite(32, [[0, 'rgba(210,240,255,0.95)'], [0.4, 'rgba(160,210,255,0.35)'], [1, 'rgba(160,210,255,0)']]);
        SPR.warm = sprite(256, [[0, rgba(Pp.warm, 0.55)], [0.4, rgba(Pp.warm, 0.18)], [1, rgba(Pp.warm, 0)]]);
        SPR.amber = sprite(256, [[0, 'rgba(255,190,90,0.6)'], [0.45, 'rgba(255,150,60,0.2)'], [1, 'rgba(255,140,60,0)']]);
        SPR.gold = sprite(128, [[0, 'rgba(255,226,150,0.95)'], [0.4, 'rgba(255,200,110,0.3)'], [1, 'rgba(255,200,110,0)']]);
        const vg = mk(256, 256), vx = vg.getContext('2d'), vr = vx.createRadialGradient(128, 128, 70, 128, 128, 182); vr.addColorStop(0, 'rgba(0,0,0,0)'); vr.addColorStop(1, dark ? 'rgba(0,0,0,0.62)' : 'rgba(20,10,0,0.35)'); vx.fillStyle = vr; vx.fillRect(0, 0, 256, 256); SPR.vig = vg;
        const nz = mk(256, 256), nx = nz.getContext('2d'), id = nx.createImageData(256, 256); for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = Math.random() < 0.5 ? 26 : 0; } nx.putImageData(id, 0, 0); SPR.noise = nz;
        const mic = mk(120, 48), mx = mic.getContext('2d'); mx.translate(60, 24); mx.fillStyle = dark ? '#8d8a96' : '#a8a4b2'; rr(mx, -46, -12, 92, 24, 12); mx.fill();
        mx.strokeStyle = dark ? '#b9b6c4' : '#d2cfdc'; mx.lineWidth = 1.6; mx.lineCap = 'round'; for (let i = 0; i < 90; i++) { const a = Math.random() * TAU, ex = Math.cos(a) * 44, ey = Math.sin(a) * 11; mx.beginPath(); mx.moveTo(ex * 0.9, ey * 0.9); mx.lineTo(ex * 1.08 + (Math.random() - 0.5) * 4, ey * 1.25 + (Math.random() - 0.5) * 4); mx.stroke(); }
        mx.fillStyle = 'rgba(255,255,255,0.25)'; rr(mx, -36, -9, 60, 5, 3); mx.fill(); SPR.mic = mic;
        const rays = mk(128, 512), rx = rays.getContext('2d'), rg = rx.createLinearGradient(0, 0, 0, 512); rg.addColorStop(0, rgba(Pp.warm, 0.5)); rg.addColorStop(1, rgba(Pp.warm, 0)); rx.fillStyle = rg; rx.beginPath(); rx.moveTo(52, 0); rx.lineTo(76, 0); rx.lineTo(128, 512); rx.lineTo(0, 512); rx.closePath(); rx.fill(); SPR.ray = rays;
      }

      /* ---------------- the frame loop ---------------- */
      let tc0 = 0, lastTc = '';
      const QA = { acc: 0, n: 0, steps: 0 };
      K.loop(() => {
        const g = cv.g; if (!g || !M.w) return;
        const tn = now(), real = Math.max(0.001, (tn - (ST.lastT || tn)) / 1000), dt = Math.min(0.05, real); ST.lastT = tn;
        // a struggling device steps the canvas resolution down (twice at most); nothing else changes
        QA.acc += real; QA.n++;
        if (QA.n >= 90) { if (QA.acc / QA.n > 0.036 && QA.steps < 2 && cv.setQuality) { QA.steps++; cv.setQuality(QA.steps === 1 ? 0.8 : 0.66); } QA.acc = 0; QA.n = 0; }
        buildLayers(); buildSprites(); musicTick(); ambTick(tn / 1000);
        stepCamera(dt); stepSubject(dt, tn); stepShot(dt, tn);
        ST.beauty += (ST.beautyT - ST.beauty) * Math.min(1, dt * 1.2);
        ST.golden += ((ST.goldenT || 0) - ST.golden) * Math.min(1, dt * 0.8);
        AU.duck = Math.max(0, AU.duck - dt * 1.4); AU.swell += ((ST.phase === 'finale' || ST.phase === 'end' ? 1 : 0) - AU.swell) * Math.min(1, dt * 0.5);
        ST.lockFlash = Math.max(0, ST.lockFlash - dt * 1.6);
        if (ST.rec) { const s = (tn - tc0) / 1000, fr = Math.floor((s % 1) * 25), tcs = '00:' + String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0') + ':' + String(fr).padStart(2, '0'); if (tcs !== lastTc) { lastTc = tcs; tcEl.textContent = tcs; } }
        ambientEmit(dt);
        P.update(dt);
        draw(g, tn / 1000, dt);
        placeTag();
        if (ST.credOn) { ST.credY -= dt * (M.phone ? 30 : 34); credIn.style.transform = 'translateY(' + ST.credY.toFixed(1) + 'px)'; }
      });
      let ambAt = 0;
      function ambTick(t) {
        if (!A.ctx || t - ambAt < 0.2) return; ambAt = t;
        if (AU.rumble) AU.rumble.level(0.14, 0.6);
        if (AU.wind) { AU.wind.level(0.05 + 0.035 * Math.sin(t * 0.37) + 0.02 * Math.sin(t * 1.3), 0.4); AU.wind.freq(430 + 170 * Math.sin(t * 0.21), 0.6); }
        if (hab.amb === 'reef' && Math.random() < 0.35) { const f = 500 + Math.random() * 900; A.tone({ type: 'sine', freq: f, to: f * 1.9, glide: 0.07, dur: 0.09, vol: 0.018, bus: 'amb', pan: Math.random() * 1.4 - 0.7 }); }
      }
      function ambientEmit(dt) {
        if (ST.fx) finaleFx(dt);
        const W = M.w, k = hab.particle, r = Math.random();
        if (k === 'mote' && r < dt * (1.5 + 5 * ST.beauty)) P.emit('mote', Math.random() * W, M.hz - 40 + Math.random() * (M.fy - M.hz + 80), 1, { colors: hab.pcols });
        if (k === 'bubble' && r < dt * 3.5) P.emit('bubble', Math.random() * W, M.fy + 30 + Math.random() * 60, 1);
        if (k === 'snow' && r < dt * 9) P.emit('snow', Math.random() * W, M.hz - 160 + Math.random() * 60, 1, { angle: Math.PI / 2, spread: 0.6, speed: [12, 30] });
        if (k === 'leaf' && r < dt * (0.8 + 2 * ST.beauty)) P.emit(Math.random() < 0.5 ? 'leaf' : 'mote', Math.random() * W, 60 + Math.random() * 60, 1, { colors: Math.random() < 0.5 ? hab.pcols : ['#fff6c8', '#e8ffb0'], angle: Math.PI / 2, spread: 0.8, speed: [10, 40] });
      }

      /* ---------------- the subject and the shot logic ---------------- */
      function stepSubject(dt, tn) {
        if (SUBJ.path) {
          const p = SUBJ.path, k = clamp((tn - p.t0) / p.ms, 0, 1), e = ease.inOutSine(k);
          SUBJ.x = lerp(p.from, p.to, e); SUBJ.hop = Math.abs(Math.sin(k * p.hops * Math.PI)) * (reduced() ? 2 : 7) * (k < 1 ? 1 : 0);
          if (k >= 1) SUBJ.path = null;
        } else SUBJ.hop *= Math.exp(-10 * dt);
        SUBJ.bob = Math.sin(tn / 1000 * 1.8) * 1.6;
        const want = ST.phase === 'herd' || ST.phase === 'narrate' || ST.phase === 'speaking' || ST.phase === 'finale' || ST.phase === 'end' || ST.locked ? 1 : ST.focus;
        SUBJ.sharp += (want - SUBJ.sharp) * Math.min(1, dt * 6);
      }
      function inZone() { const s = subjScreen(); return Math.abs(s.x - M.w / 2) <= M.zone; }
      function stepShot(dt, tn) {
        const ph = ST.phase;
        if ((ph === 'pan' || ph === 'golden') && !ST.locked) {
          const ok = inZone() && CAM.speed < 40;
          if (ok) { ST.focus = Math.min(1, ST.focus + dt / FOCUS_S); ST.sc.err += Math.abs(subjScreen().x - M.w / 2) / M.zone * dt; ST.sc.spd += CAM.speed * dt; ST.sc.t += dt; }
          else ST.focus = Math.max(0, ST.focus - dt * 1.2);
          if (ST.focus > 0 && ST.focus < 1 && A.ctx && tn - focusTick > 85) { focusTick = tn; A.tone({ type: 'square', freq: 2600 + Math.random() * 1400, dur: 0.008, vol: 0.012, lp: 5000 }); }
          if (inZone() !== ST.wasIn) { ST.wasIn = inZone(); if (ST.wasIn) { K.sfx.tap(); ST.inAt = tn; } }
          if (ST.focus >= 1) lockShot();
        }
        if (ph === 'track' && !ST.locked) {
          const zin = inZone();
          ST.trackT += dt; if (zin) ST.trackIn += dt;
          ST.track = zin ? Math.min(1, ST.track + dt / TRACK_S) : Math.max(0, ST.track - dt * 0.25);
          ST.focus = zin ? Math.min(1, ST.focus + dt * 2) : Math.max(0.25, ST.focus - dt);
          if (!SUBJ.path && ST.track < 1) walkNext();
          if (zin !== ST.wasIn) { ST.wasIn = zin; if (zin) K.sfx.tap(); }
          if (ST.track >= 1 && !SUBJ.path) lockShot();
        }
        if (ph === 'herd') {
          HERDS.forEach(m => { if (m.seen) return; const sx = m.x - CAM.x; if (sx > -10 && sx < M.w + 10) { m.seen = true; m.popT = now(); ST.herdN++; herdPop(ST.herdN); if (m.cameo) { K.pop('Rare sighting: ' + CAMEO[1] + '!', { x: clamp(sx, 110, M.w - 110), y: m.y - m.s - 22, kind: 'great' }); K.sfx.sparkle(); } } });
        }
      }
      function walkNext() { // the human wanders between its two perches in short hops, pausing now and then
        if (ST.walkTo == null || Math.abs(ST.walkTo - SUBJ.x) < 4) ST.walkTo = SUBJ.x > M.ww * 0.49 ? M.spots[1] : M.spots[0];
        const d2 = ST.walkTo - SUBJ.x, seg = Math.min(Math.abs(d2), M.w * (0.26 + Math.random() * 0.2)), dir = Math.sign(d2) || 1;
        SUBJ.path = { from: SUBJ.x, to: SUBJ.x + dir * seg, t0: now() + 260 + Math.random() * 380, ms: Math.max(600, seg / (M.w * WALK) * 1000), hops: Math.max(2, Math.round(seg / 28)) };
      }
      function lockShot() {
        if (ST.locked) return;
        ST.locked = true; ST.lockFlash = 1; CAM.fling = 0; K.guide(null);
        sFocusLock(); if (!ST.rec) { ST.rec = true; tc0 = now(); recEl.classList.add('on'); }
        const sc = ST.phase === 'track' ? clamp(ST.trackIn / Math.max(0.1, ST.trackT), 0, 1) : clamp(1 - (ST.sc.t ? ST.sc.err / ST.sc.t : 0.3) * 0.7 - Math.min(0.3, (ST.sc.t ? ST.sc.spd / ST.sc.t : 0) / 120), 0.3, 1);
        ST.scores.push(sc);
        ctx.track('shot', { i: ST.shot, s: Math.round(sc * 100) });
        const ss = subjScreen();
        P.emit('star', ss.x, ss.y - M.sz * 0.1, 10, { colors: ['#fff6cf', '#ffd27a'], speed: [60, 160] });
        showTag('<em>' + hab.species + '</em> · in focus');
        glitch.face('nerd', 900);
        Array.from(pipsEl.children).forEach((p, i) => p.classList.toggle('on', i <= ST.shot));
      }
      function herdPop(n) {
        if (A.ctx) { const pen = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6']; A.pluck(A.note(pen[n % pen.length]), { vol: 0.09, damp: 0.996, verb: 0.3 }); if (n % 4 === 0) A.pop({ vol: 0.05, freq: 700 + (n % 7) * 60 }); }
        epS.textContent = 'Herd count'; epB.textContent = n + ' sighted'; epB.parentNode.classList.add('gold');
      }

      /* ---------------- drawing ---------------- */
      function blit(g, Ly) { if (!Ly) return; const sx = Math.max(0, Math.min(Ly.c.width - M.w * Ly.ld, CAM.x * Ly.f * Ly.ld)); g.drawImage(Ly.c, sx, 0, M.w * Ly.ld, Ly.h * Ly.ld, 0, Ly.y, M.w, Ly.h); }
      function draw(g, t, dt) {
        const W = M.w, H = M.h, Pp = pal(), dark = S.scene() !== 'bright', red = reduced();
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        g.drawImage(LAY.sky.c, 0, 0, W, H);
        // light: sun rays sway with the beauty of the footage
        if (SPR.ray && (hab.key !== 'tundra' || !dark)) { g.globalCompositeOperation = 'lighter'; const n = M.phone ? 3 : 5; for (let i = 0; i < n; i++) { const a = (0.08 + 0.22 * ST.beauty + 0.3 * ST.golden) * (0.7 + 0.3 * Math.sin(t * 0.5 + i * 2)); g.globalAlpha = a * (dark ? 0.6 : 0.8); g.save(); g.translate(W * (0.55 + i * 0.12) - CAM.x * 0.08, -20); g.rotate(0.35 + Math.sin(t * 0.2 + i) * 0.04 * (red ? 0 : 1)); g.drawImage(SPR.ray, -60, 0, 120 + i * 20, M.fy + 60); g.restore(); } g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        if (hab.key === 'tundra' && dark) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25 + 0.2 * Math.sin(t * 0.6); g.drawImage(LAY.sky.c, 0, 0, LAY.sky.c.width, LAY.sky.c.height * 0.4, (Math.sin(t * 0.15) * 12), 0, W, H * 0.4); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        blit(g, LAY.far);
        drawCritters(g, t, 0.5, dt);
        blit(g, LAY.mid);
        blit(g, LAY.ground);
        // the grade works on the world only (never on the characters): raw footage is flat and hazy, described footage blooms
        g.globalAlpha = 0.26 * (1 - ST.beauty) * (1 - ST.golden); g.fillStyle = Pp.haze; g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = (0.1 + 0.36 * ST.beauty) * (dark ? 0.85 : 0.6) * (1 - 0.5 * ST.golden);
        const ss = subjScreen(), wr = Math.max(W, H) * 0.9; g.drawImage(SPR.warm, W * 0.66 - wr, M.hz - 40 - wr, wr * 2, wr * 2);
        if (ST.golden > 0.02) { g.globalAlpha = ST.golden * (dark ? 0.55 : 0.4); g.drawImage(SPR.amber, W * 0.78 - wr, -wr * 0.55, wr * 2, wr * 2); g.globalAlpha = ST.golden * 0.6; g.drawImage(SPR.gold, ss.x - M.sz * 1.5, ss.y - M.sz * 1.5, M.sz * 3, M.sz * 3); }
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.drawImage(SPR.vig, -W * 0.1, -H * 0.08, W * 1.2, H * 1.16);
        if (!red) { g.globalAlpha = 0.5; const ox = Math.floor(Math.random() * 256), oy = Math.floor(Math.random() * 256); for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) g.drawImage(SPR.noise, x, y, 256, 256); g.globalAlpha = 1; }
        // what lives in the shot, in front of the grade: drifting motes, the herd, our human, then the foliage by the lens
        P.draw(g);
        if (ST.herdOn) drawHerd(g, t);
        drawSubject(g, t);
        blit(g, LAY.fg);
        drawBoom(g, t);
        drawGlitch(g, t);
        drawViewfinder(g, t);
        if (ST.letter > 0.001) { const lb = ST.letter * (M.phone ? 54 : 70); g.fillStyle = '#05070a'; g.fillRect(0, 0, W, lb); g.fillRect(0, H - lb, W, lb); }
        if (ST.flash > 0.01 && !red) { g.globalAlpha = ST.flash * 0.6; g.fillStyle = '#fff8e8'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; ST.flash = Math.max(0, ST.flash - dt * 2.5); }
      }
      function drawCritters(g, t, f, dt) {
        const W = M.w, dark = S.scene() !== 'bright';
        CRIT.forEach((c, i) => {
          c.x += c.v * dt * (reduced() ? 0.4 : 1); if (c.x < -60) c.x = M.ww + 40; if (c.x > M.ww + 60) c.x = -40;
          const x = c.x - CAM.x * f; if (x < -40 || x > W + 40) return;
          const y = c.y + Math.sin(t * 1.4 + c.ph) * 6, s = c.s;
          if (hab.critter === 'bird') { g.strokeStyle = dark ? 'rgba(30,14,30,0.85)' : 'rgba(40,40,40,0.75)'; g.lineWidth = 1.8; const fl = Math.sin(t * 9 + c.ph) * 5 * s; g.beginPath(); g.moveTo(x - 9 * s, y - fl); g.quadraticCurveTo(x - 4 * s, y - 3, x, y); g.quadraticCurveTo(x + 4 * s, y - 3, x + 9 * s, y - fl); g.stroke(); }
          else if (hab.critter === 'fish') { const dir = Math.sign(c.v); g.fillStyle = ['#ffb36b', '#ff8ab0', '#9ff0ff', '#ffe08a'][i % 4]; g.globalAlpha = dark ? 0.7 : 0.9; g.beginPath(); g.ellipse(x, y, 9 * s, 4.5 * s, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x - dir * 8 * s, y); g.lineTo(x - dir * 14 * s, y - 5 * s + Math.sin(t * 12 + i) * 2); g.lineTo(x - dir * 14 * s, y + 5 * s); g.closePath(); g.fill(); g.globalAlpha = 1; }
          else if (hab.critter === 'butterfly') { const fl = Math.abs(Math.sin(t * 10 + c.ph)); g.fillStyle = dark ? '#d8e8c8' : '#fffbe8'; g.strokeStyle = 'rgba(80,60,40,0.6)'; g.lineWidth = 1; [-1, 1].forEach(sd => { g.save(); g.translate(x, y); g.scale(sd * (0.35 + 0.65 * fl), 1); g.fillRect(0, -5 * s, 11 * s, 9 * s); g.strokeRect(0, -5 * s, 11 * s, 9 * s); g.restore(); }); }
          else { g.fillStyle = dark ? 'rgba(230,240,255,0.85)' : 'rgba(80,90,110,0.7)'; g.beginPath(); g.ellipse(x, y, 7 * s, 9 * s, 0, 0, TAU); g.fill(); g.fillStyle = '#ffd27a'; g.beginPath(); g.arc(x - 2.5 * s, y - 3 * s, 1.4 * s, 0, TAU); g.arc(x + 2.5 * s, y - 3 * s, 1.4 * s, 0, TAU); g.fill(); }
        });
      }
      function drawHerd(g, t) {
        const tn = now(), W = M.w;
        HERDS.forEach((m, i) => {
          if (!m.seen) return;
          const x = m.x - CAM.x; if (x < -m.s || x > W + m.s) return;
          const k = clamp((tn - m.popT) / 420, 0, 1), sc = reduced() ? k : outBack(k), s = m.s * sc;
          if (s < 1) return;
          // the sprite's feet sit 1.03 sprite-widths below its top edge; each herd member either glows at a phone or wears a "…" cloud
          const bob = Math.sin(t * 2.2 + m.ph) * 1.5, spr = SPR.herd[m.c], top = m.y - s * 1.03 + bob;
          if (m.cameo && cameoImg && cameoImg.complete && cameoImg.naturalWidth) { g.globalAlpha = 0.25; g.fillStyle = '#000'; g.beginPath(); g.ellipse(x, m.y, s * 0.4, s * 0.08, 0, 0, TAU); g.fill(); g.globalAlpha = 1; g.drawImage(cameoImg, x - s / 2, m.y - s + bob, s, s); return; }
          g.drawImage(spr, x - s / 2, top, s, s * 1.25);
          if (m.v === 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.65 + 0.25 * Math.sin(t * 3 + i); g.drawImage(SPR.phone, x - s * 0.24, m.y - s * 0.42 + bob, s * 0.48, s * 0.48); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = '#e4f4ff'; rr(g, x - s * 0.07, m.y - s * 0.3 + bob, s * 0.14, s * 0.2, s * 0.03); g.fill(); }
          else { g.fillStyle = 'rgba(255,255,255,0.9)'; const cy = top + s * 0.05; g.beginPath(); g.ellipse(x + s * 0.34, cy, s * 0.22, s * 0.13, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(x + s * 0.17, cy + s * 0.15, s * 0.04, 0, TAU); g.fill(); g.fillStyle = '#5a4a6a'; for (let d = -1; d <= 1; d++) { g.beginPath(); g.arc(x + s * 0.34 + d * s * 0.075, cy, Math.max(0.9, s * 0.024), 0, TAU); g.fill(); } }
        });
      }
      function drawSubject(g, t) {
        const s = subjScreen(), sz = M.sz, f = FACES[SUBJ.mood] || FACES.worried;
        const r = sz / 2, edge = Math.min(s.x - r, M.w - r - s.x), alpha = clamp((edge + 24) / 28, 0, 1); SUBJ.alpha = alpha;
        if (alpha <= 0.01) return;
        const x = s.x - r, y = M.fy - sz - SUBJ.hop + SUBJ.bob;
        g.globalAlpha = alpha * 0.32; g.fillStyle = '#000'; g.beginPath(); g.ellipse(s.x, M.fy + 2, r * 0.78 * (1 - SUBJ.hop / 40), r * 0.16, 0, 0, TAU); g.fill();
        if (f.ok) {
          const sh = clamp(SUBJ.sharp, 0, 1), b = blurOf(f);
          if (sh < 0.98 && b) { g.globalAlpha = alpha * (1 - sh); g.drawImage(b, x - 3, y - 3, sz + 6, sz + 6); }
          g.globalAlpha = alpha * Math.max(0.15, sh); g.drawImage(f.im, x, y, sz, sz);
        } else { g.globalAlpha = alpha * 0.8; g.fillStyle = '#c070e0'; g.beginPath(); g.arc(s.x, y + r, r * 0.92, 0, TAU); g.fill(); }
        g.globalAlpha = 1;
        void t;
      }
      function drawViewfinder(g, t) {
        const W = M.w, H = M.h, ph = ST.phase, live = ph === 'pan' || ph === 'track' || ph === 'golden' || ph === 'herd';
        const top = (M.phone ? 112 : 108), bot = (ph === 'narrate' ? M.fy + 16 : H - M.csz - (M.phone ? 30 : 40)), inset = 12, L = 22;
        const pinch = CAM.drag ? Math.min(1, (now() - (ST.grabT || 0)) / 140) * 6 : 0;
        g.strokeStyle = CAM.drag ? 'rgba(255,226,160,0.95)' : 'rgba(255,255,255,0.78)'; g.lineWidth = CAM.drag ? 2.6 : 2;
        [[inset, top, 1, 1], [W - inset, top, -1, 1], [inset, bot, 1, -1], [W - inset, bot, -1, -1]].forEach(([x, y, sx, sy]) => { x += sx * pinch; y += sy * pinch; g.beginPath(); g.moveTo(x, y + sy * L); g.lineTo(x, y); g.lineTo(x + sx * L, y); g.stroke(); });
        if (!live || ST.locked) { if (ST.lockFlash > 0.01) drawReticle(g, t, 1); return; }
        // thirds, and the framing zone where the human should sit
        g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1; g.beginPath(); [1, 2].forEach(k => { g.moveTo(W * k / 3, top + 8); g.lineTo(W * k / 3, bot - 8); }); g.stroke();
        if (ph !== 'herd') {
          const zin = inZone(), zx = W / 2 - M.zone - M.sz * 0.5, zw = (M.zone + M.sz * 0.5) * 2, zy = M.fy - M.sz - 22, zh = M.sz + 36;
          g.save(); g.setLineDash([6, 6]); g.lineDashOffset = -t * 12; g.strokeStyle = zin ? 'rgba(255,210,122,0.95)' : 'rgba(255,255,255,0.45)'; g.lineWidth = zin ? 2 : 1.5; rr(g, zx, zy, zw, zh, 14); g.stroke(); g.restore();
          drawReticle(g, t, ST.phase === 'track' ? ST.track : ST.focus);
        } else {
          g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(W / 2 - 10, M.fy - M.sz * 0.5); g.lineTo(W / 2 + 10, M.fy - M.sz * 0.5); g.moveTo(W / 2, M.fy - M.sz * 0.5 - 10); g.lineTo(W / 2, M.fy - M.sz * 0.5 + 10); g.stroke();
        }
      }
      function drawReticle(g, t, k) {
        const s = subjScreen(); if (SUBJ.alpha < 0.3) return;
        const R0 = M.sz * 0.6 + (1 - k) * (8 + Math.sin(t * 18) * 4 * (reduced() ? 0 : 1)), L = 14, lock = ST.locked || k >= 1;
        const col = lock ? 'rgba(255,210,122,' + (0.5 + 0.5 * Math.max(ST.lockFlash, lock ? 0.6 : 0)).toFixed(2) + ')' : 'rgba(255,255,255,0.85)';
        g.strokeStyle = col; g.lineWidth = 2.2;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { const x = s.x + sx * R0, y = s.y + sy * R0; g.beginPath(); g.moveTo(x, y - sy * L); g.lineTo(x, y); g.lineTo(x - sx * L, y); g.stroke(); });
        if (!lock && k > 0) { g.strokeStyle = 'rgba(255,210,122,0.9)'; g.lineWidth = 3; g.beginPath(); g.arc(s.x, s.y, R0 + 8, -Math.PI / 2, -Math.PI / 2 + TAU * k); g.stroke(); }
      }
      function drawBoom(g, t) { // Drop's boom mic dips into the top of the frame, as boom mics do
        if (!M.dropX || ST.phase === 'intro' || !SPR.mic) return;
        const hx = M.dropX + M.dsz * 0.2, hy = M.dropY + M.dsz * 0.8, sw = reduced() ? 0 : 1;
        const tx = M.w * (M.phone ? 0.6 : 0.64) + Math.sin(t * 0.9) * 4 * sw, ty = M.fy - M.sz - (M.phone ? 72 : 90) + Math.sin(t * 1.3) * 2 * sw;
        g.lineCap = 'round'; g.strokeStyle = '#17161d'; g.lineWidth = 4.5; g.beginPath(); g.moveTo(hx, hy); g.lineTo(tx + 20, ty - 2); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(hx, hy - 2); g.lineTo(tx + 20, ty - 4); g.stroke();
        g.save(); g.translate(tx, ty); g.rotate(Math.atan2(hy - ty, hx - tx) * 0.25); g.drawImage(SPR.mic, -30, -12, 60, 24); g.restore();
      }
      function drawGlitch(g, t) {
        const age = (now() - ST.glitchT) / 1000; if (age > 1.1) return;
        const k = 1 - age / 1.1, W = M.w, H = M.h;
        if (reduced()) { g.globalAlpha = 0.35 * k; g.fillStyle = '#3a0d18'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; return; }
        const d = cv.dpr || 1, src = cv.el;
        for (let i = 0; i < 7; i++) { const y = Math.random() * H, hh = 6 + Math.random() * 34, dx = (Math.random() - 0.5) * 70 * k; try { g.drawImage(src, 0, y * d, W * d, hh * d, dx, y, W, hh); } catch (e) { /* nothing to copy yet */ } }
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) { g.globalAlpha = 0.22 * k; g.fillStyle = i % 2 ? '#ff2a6a' : '#22e3ff'; g.fillRect(0, Math.random() * H, W, 2 + Math.random() * 10); }
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 0.5 * k; const ox = Math.floor(Math.random() * 128); for (let y = 0; y < H; y += 64) for (let x = -ox; x < W; x += 128) g.drawImage(SPR.noise, x, y, 128, 64);
        g.globalAlpha = 1; void t;
      }

      /* ---------------- the field tag above the human ---------------- */
      let tagOn = false;
      function showTag(html) { tagEl.innerHTML = html; tagEl.classList.add('on'); tagOn = true; ST.tagW = 0; }
      function hideTag() { tagEl.classList.remove('on'); tagOn = false; }
      function placeTag() {
        if (!tagOn) return;
        const s = subjScreen(), half = (ST.tagW || (ST.tagW = tagEl.offsetWidth || 160)) / 2 + 8;
        const x = clamp(s.x, half, M.w - half), y = M.fy - M.sz - SUBJ.hop - 12;
        tagEl.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
        tagEl.style.opacity = SUBJ.alpha < 0.5 ? '0' : '';
      }

      /* ---------------- the script: pick the narrator's line ---------------- */
      function openScript(list, take) {
        const rg = K.rng(K.daily() + ST.shot * 13 + take); // a seeded shuffle, so the filmable line is not always first
        cards = K.shuffle(list, rg).map((c, i) => {
          const kids = c.segs.map(sg => sg.user ? h('span', { class: 'gk-user', text: sg.t }) : document.createTextNode(sg.t));
          const e = h('button', { type: 'button', class: 'nd-card in0', 'aria-label': 'Narration: ' + plain(c.segs) },
            h('span', { class: 'nd-ch' }, h('span', { text: 'Script · line ' + (i + 1) }), h('span', { text: 'Take ' + take })), h('span', { class: 'nd-cl' }, ...kids), h('span', { class: 'nd-stamp', text: c.kind === 'desc' ? 'FOOTAGE ✓' : 'NOT FOOTAGE' }));
          const card = Object.assign({}, c, { el: e, gone: false });
          K.tap(e, () => pick(card));
          return card;
        });
        tray.replaceChildren(h('b', { text: take > 1 ? 'Take ' + take + ' · read what the camera saw' : 'The narrator’s script · pick a line' }), ...cards.map(c => c.el));
        tray.hidden = false; layoutCards(); crewAside(true);
        cards.forEach((c, i) => S.later(() => c.el.classList.remove('in0'), reduced() ? 0 : 60 + i * 90));
        ST.canPick = true;
      }
      function closeScript() { cards.forEach(c => c.el.classList.add('out')); S.later(() => { tray.hidden = true; tray.replaceChildren(); crewAside(false); }, reduced() ? 40 : 320); }
      function pick(card) {
        if (!ST.canPick || card.gone || ST.phase !== 'narrate') return;
        ST.canPick = false; ST.picked = card; K.guide(null);
        ST.choices += ST.firstPick ? 1 : 0;
        if (ST.firstPick && card.kind === 'desc') ST.takes++;
        ST.firstPick = false;
        card.el.classList.add(card.kind === 'desc' ? 'good' : 'bad');
        if (A.ctx) A.paper({ vol: 0.12 }); K.sfx.tap();
        ctx.track('narrate', { shot: ST.shot, k: card.kind === 'desc' ? 1 : 0 });
      }

      /* ---------------- steps ---------------- */
      const until = async (fn, ms) => { const t0 = now(); while (!fn()) { if (ms && now() - t0 > ms) return false; await K.wait(50); } return true; };
      function guidePan(label, id) {
        // the hand grabs the human and pulls it to the middle of the frame (the footage moves with the finger)
        const s = subjScreen(), dx = Math.round(M.w / 2 - s.x);
        K.guide({ id: id || 'pan', g: 'drag', target: () => { const q = subjScreen(); return { x: q.x, y: q.y }; }, dx: Math.abs(dx) < 30 ? (dx < 0 ? -40 : 40) : dx, dy: 0, label, place: 'above', delay: 700, ms: 1700 });
      }
      async function holdGuide() {
        // once the human is in the frame zone, the hand shows "hold still" until the focus locks
        const t0 = now();
        while (!ST.locked && !S.destroyed) {
          if (inZone() && !ST.holdShown && now() - t0 > 500) { ST.holdShown = true; K.guide({ id: 'hold', g: 'still', target: () => { const q = subjScreen(); return { x: q.x, y: M.fy - M.sz - 6 }; }, label: 'HOLD STEADY', place: 'above', delay: 300 }); if (ST.shot === 0) gSay(L(GL.steady), { mood: 'nerd', ms: 2600 }); }
          if (!inZone() && ST.holdShown) { ST.holdShown = false; guidePan(ST.phase === 'track' ? 'FOLLOW THE HUMAN' : 'PAN TO FRAME THE HUMAN', 'pan2'); }
          await K.wait(120);
        }
      }
      async function shotStep(i, kind) {
        ST.phase = kind; ST.shot = i; ST.locked = false; ST.focus = 0; ST.track = 0; ST.trackT = 0; ST.trackIn = 0; ST.wasIn = false; ST.holdShown = false; ST.keep = true; ST.sc = { err: 0, spd: 0, t: 0 };
        hideTag();
        if (kind === 'track') { ST.walkTo = SUBJ.x > M.ww * 0.5 ? M.spots[1] : M.spots[0]; gSay(L(GL.track), { mood: 'determined', ms: 3000 }); setMood(ST.beauty > 0.3 ? 'think' : 'worried'); }
        if (kind === 'golden') { ST.goldenT = 1; gSay(L(GL.golden), { mood: 'happy', ms: 3000 }); }
        guidePan(kind === 'track' ? 'FOLLOW THE HUMAN' : 'PAN TO FRAME THE HUMAN', 'pan' + i);
        holdGuide();
        await until(() => ST.locked);
        await K.wait(reduced() ? 300 : 700);
      }
      async function narrateStep(i, kind) {
        ST.phase = 'narrate'; ST.firstPick = true; SUBJ.path = null;
        let list = script(i, kind), take = 1;
        if (i === 0) { gSay(L(GL.rule), { mood: 'nerd', ms: 3800 }); if (M.phone) await K.wait(reduced() ? 1400 : 2600); }
        for (;;) {
          openScript(list, take);
          K.guide({ id: 'script' + i + take, g: 'choose', target: () => cards.filter(c => !c.gone).map(c => c.el), label: take > 1 ? 'TAKE 2: PICK AGAIN' : 'NARRATE WHAT IT SEES', place: 'above', delay: 900 });
          await until(() => !ST.canPick && ST.picked);
          const card = ST.picked; ST.picked = null;
          await K.wait(reduced() ? 200 : 520);
          closeScript();
          ST.phase = 'speaking';
          if (card.kind === 'desc') {
            const said = narrate(card.segs, { label: 'Narrator · footage', cls: 'good' });
            await K.wait(400); ST.beautyT = Math.min(1, ST.beautyT + (kind === 'final' ? 0.35 : 0.3)); sHarp(true); ST.flash = 0.25;
            const s = subjScreen(); P.emit('mote', s.x, s.y + M.sz * 0.2, 16, { colors: ['#fff3c4', '#ffd27a', '#ffffff'], speed: [30, 90] });
            setMood(i === 0 ? 'think' : kind === 'final' ? 'happy' : 'calm');
            const r = await said;
            if (kind === 'final') ST.finalText = plain(card.segs);
            hideCaption(r.tok);
            gSay(L(GL.good[Math.min(GL.good.length - 1, i)]), { mood: i % 2 ? 'happy' : 'wow', ms: 2400 });
            if (i === 1) { await K.wait(500); dropSay(DR.calm, 'happy', 2400); }
            showTag(i === 0 ? 'Observed <em>calmly</em> ✓' : kind === 'final' ? '<em>' + hab.species + '</em>' : 'Described, not judged ✓');
            await K.wait(reduced() ? 900 : 1700);
            break;
          }
          // a verdict: the tape chews, the director calls cut, take two
          await narrate(card.segs, { label: 'Narrator · a verdict?', cls: 'bad', glitch: true });
          ST.glitchT = now(); sTapeStop(); AU.duck = 1; setMood('confused');
          if (!reduced()) glitch.react('shake');
          await K.wait(reduced() ? 200 : 450);
          sClapper(); gSay(L(GL.cut), { mood: 'facepalm', ms: 3600 });
          await K.wait(reduced() ? 1600 : 2900);
          hideCaption(); setMood(i === 0 ? 'worried' : 'think');
          list = list.filter(x => x !== cardSrc(card, list));
          take++;
          if (!list.some(x => x.kind === 'desc')) break;
          gSay(L(GL.take2), { mood: 'nerd', ms: 2200 });
          if (M.phone) await K.wait(reduced() ? 900 : 1600);
          ST.phase = 'narrate';
        }
      }
      const cardSrc = (card, list) => list.find(x => x.segs === card.segs);
      function dropSay(line, mood, ms) { glitch.hush(); drop.say(L(line), { mood, ms }); }
      function gSay(line, o) { drop.hush(); glitch.say(line, o); }
      /* on a phone the script tray fills the lower screen, so the crew step out of shot while it is open (never under a card) */
      function crewAside(on) { if (!M.phone) return; glitch.el.classList.toggle('nd-off', on); if (on) { glitch.hush(); drop.hush(); } }
      async function herdStep() {
        ST.phase = 'herdIntro'; ST.keep = false; ST.locked = false; hideTag();
        dropSay(DR.herdQ, 'think', 3000);
        await K.wait(reduced() ? 900 : 1700);
        gSay(L(GL.herdA), { mood: 'smug', ms: 3000 });
        ST.herdOn = true; ST.phase = 'herd'; ST.herdStart = now();
        const target = Math.max(8, Math.round(HERDS.length * 0.55));
        const left = CAM.x > (M.ww - M.w) / 2;
        K.guide({ id: 'herd', g: 'drag', target: () => ({ x: M.w * (left ? 0.3 : 0.7), y: M.fy - M.sz * 0.4 }), dx: left ? Math.round(M.w * 0.4) : -Math.round(M.w * 0.4), dy: 0, label: 'PAN ACROSS THE HERD', place: 'above', delay: 600 });
        await until(() => ST.herdN >= target || (now() - ST.herdStart > 9000 && ST.herdN >= 4));
        K.guide(null);
        dropSay(DR.herdWow, 'wow', 2800); setMood('surprised');
        epS.textContent = ST.herdN + ' sighted · worldwide'; epB.textContent = 'Billions';
        ST.phase = 'herdTalk'; CAM.fling = 0;
        // swing to where the herd is thickest, and let every member in the valley show itself
        let bestX = CAM.x, bestN = -1; for (let x = 0; x <= M.ww - M.w; x += M.w * 0.1) { const n = HERDS.filter(m => m.x > x + 20 && m.x < x + M.w - 20).length; if (n > bestN) { bestN = n; bestX = x; } }
        glideCam(bestX, reduced() ? 300 : 900);
        HERDS.forEach((m, i) => { if (!m.seen) { m.seen = true; m.popT = now() + 300 + i * 40; } });
        await K.wait(reduced() ? 600 : 1200);
        const said = narrate([{ t: L(HERD) }], { label: 'Narrator' });
        ST.beautyT = Math.min(1, ST.beautyT + 0.2); sHarp(true);
        const r = await said; hideCaption(r.tok);
        gSay(L(GL.herdFact), { mood: 'nerd', ms: 3000 }); setMood('happy');
        await K.wait(reduced() ? 900 : 2200);
        epS.textContent = 'Planet You · Ep ' + episode; epB.textContent = hab.name; epB.parentNode.classList.remove('gold');
        // the human has wandered off towards the light; the camera swings back to find it at the edge of frame
        SUBJ.path = null; SUBJ.x = M.spots[2]; ST.glide = null;
        glideCam(M.spots[2] - (M.w - M.sz / 2 - 18), reduced() ? 300 : 1100);
        await K.wait(reduced() ? 350 : 1150);
        ST.keep = true;
      }
      function finaleFx(dt) { // the habitat's own celebration, drawn behind the human
        const W = M.w, r = Math.random(), k = hab.finale;
        if (k === 'fireflies' && r < dt * 26) P.emit('mote', Math.random() * W, M.hz - 60 + Math.random() * (M.fy - M.hz + 120), 1, { colors: ['#ffe9a0', '#fff3c4', '#ffd27a'], life: [2, 3.6] });
        if (k === 'bubbles' && r < dt * 22) P.emit('bubble', Math.random() * W, M.fy + 20 + Math.random() * 80, 1, { speed: [30, 80] });
        if (k === 'stars' && r < dt * 18) P.emit('star', Math.random() * W, 60 + Math.random() * (M.hz - 20), 1, { colors: ['#fffbe6', '#b8ffe0', '#ffd9f0'], speed: [4, 16] });
        if (k === 'petals' && r < dt * 20) P.emit('petal', Math.random() * W, 40 + Math.random() * 40, 1, { colors: ['#ffd9e6', '#fff3c4', '#c8f0a0', '#ffffff'], angle: Math.PI / 2, spread: 0.7, speed: [30, 70] });
      }
      async function finaleStep() {
        ST.phase = 'finale'; K.guide(null); hideTag(); hideCaption();
        sClapper(); gSay(L(GL.wrap), { mood: 'celebrate', ms: 4200 }); drop.base('love');
        setMood('love'); ST.goldenT = 1; ST.beautyT = 1; ST.fx = true;
        const tw = { t0: now() }; const lb = () => { const k = clamp((now() - tw.t0) / 900, 0, 1); ST.letter = ease.inOutCubic(k); if (k < 1 && !S.destroyed) S.later(lb, 30); }; lb();
        sTimpani();
        await K.wait(reduced() ? 300 : 900);
        titleEl.replaceChildren(h('small', { text: 'Planet You · Episode ' + episode }), h('b', { text: 'The ' + hab.name }), h('span', { text: 'Narrated by Basil Fennimore, a very calm tortoise' }));
        titleEl.classList.add('on'); ST.flash = 0.4;
        if (A.ctx) A.pad(['D3', 'A3', 'D4', 'F#4', 'A4'].map(n => A.note(n)), { dur: 7, vol: 0.16, attack: 0.8 });
        const s0 = subjScreen(); P.emit('star', s0.x, s0.y + M.sz * 0.3, 22, { colors: ['#fff6cf', '#ffd27a', '#ffffff'], speed: [80, 220] });
        await K.wait(reduced() ? 400 : 1100);
        const r = await narrate([{ t: L(CLOSE) }], { label: 'Narrator' });
        await K.wait(reduced() ? 200 : 500);
        hideCaption(r.tok);
        const steady = Math.round((ST.scores.length ? ST.scores.reduce((a, b) => a + b, 0) / ST.scores.length : 0.8) * 100);
        const credits = [['Starring', 'The Human (you)'], ['Played by', 'Loopie, a very good sport'], ['Narration', 'Basil Fennimore, a very calm tortoise'], ['Camera', 'Glitch · steady hands ' + steady + '%'], ['Sound', 'Drop'],
          ['Extras', 'The herd · ' + Math.max(ST.herdN, 1) + ' sighted, billions more'], ['Habitat', hab.name], ['Filmed on location in', 'your ' + weekday], [null, 'No humans were judged in the making of this film.']];
        credIn.replaceChildren(...credits.map(c => h('p', { class: c[0] ? null : 'big' }, c[0] ? h('small', { text: c[0] }) : null, document.createTextNode(c[1]))));
        ST.credY = reduced() ? 0 : (parseFloat(credEl.style.height) || 300) * 0.85; credIn.style.transform = 'translateY(' + ST.credY + 'px)';
        credEl.classList.add('on'); ST.credOn = !reduced();
        await K.wait(reduced() ? 3200 : 6600);
        finishGame(steady);
      }
      function finishGame(steady) {
        if (ST.finished) return; ST.finished = true; ST.phase = 'end';
        const takeSc = ST.choices ? ST.takes / ST.choices : 1;
        const best = K.best('steady', steady, 'higher'), tier = K.tier(0.55 * steady / 100 + 0.45 * takeSc, [0.5, 0.7, 0.86]), col = K.collect('ep:' + hab.key);
        const have = col.items.filter(x => /^ep:/.test(String(x))).length;
        const badges = [];
        if (best.isNew) badges.push('New best: steady hands ' + steady + '%'); else badges.push('Steady hands: ' + steady + '%');
        if (tier) badges.push(tier + ' cinematographer');
        badges.push((col.isNew ? 'New episode: ' : 'Episode: ') + hab.name + ' (' + Math.min(have, HABITATS.length) + '/' + HABITATS.length + ')');
        if (CAMEO && HERDS.some(m => m.cameo && m.seen)) { const c2 = K.collect('cameo:' + CAMEO[0]); badges.push((c2.isNew ? 'Rare sighting: ' : 'Spotted again: ') + CAMEO[1]); }
        const lines = [ST.finalText ? 'Closing narration: ' + clip(ST.finalText, 88) : 'Narrated what the camera could see', 'Footage, not verdicts: ' + ST.takes + '/' + ST.choices + ' first takes', care ? 'Next step: proper advice from someone qualified.' : 'Filmed on location in your ' + weekday];
        ctx.track('finish', { steady, takes: ST.takes, choices: ST.choices, herd: ST.herdN });
        ctx.finish({ title: 'Filmed on location in your ' + weekday, mood: 'celebrate', lines, share: 'My ' + weekday + ', narrated as a nature documentary. Fascinating species.', badges: badges.slice(0, 4) });
      }

      cv.onResize(layout);
      S.on('theme', () => { LAY.key = ''; SPR.key = ''; });
      pipsEl.replaceChildren(...Array.from({ length: [2, 3, 4][inten] }, () => h('u')));
      const SHOTS = [['pan', 'first'], ['track', 'mid']].slice(0, inten === 0 ? 1 : 2);
      (async () => {
        await K.intro({ title: 'Nature Doc', sub: 'Today’s episode: your day, filmed like a calm wildlife documentary.', how: 'Drag to pan the camera and frame the human. Then pick the line the camera can actually film.', char: 'glitch', mood: 'nerd' });
        ST.phase = 'pan'; ST.shot = 0;
        gSay(L(GL.hello), { mood: 'nerd', ms: 3400 });
        narrate([{ t: L(NAR.est) }], { label: 'Narrator' }).then(r => hideCaption(r.tok));
        S.later(() => { if (ST.phase === 'pan' && !ST.locked) dropSay(DR.hello, 'happy', 2600); }, 4200);
        for (let i = 0; i < SHOTS.length; i++) {
          await shotStep(i, SHOTS[i][0]);
          await narrateStep(i, SHOTS[i][1]);
          if (i === 0 && SHOTS.length > 1) S.later(() => { if (ST.phase === 'track' && !ST.locked) narrate([{ t: L(NAR.aside) }], { label: 'Narrator' }).then(r => hideCaption(r.tok)); }, reduced() ? 600 : 1800);
        }
        await herdStep();
        if (inten === 2) { await shotStep(2, 'track'); await narrateStep(2, 'extra'); }
        await shotStep(SHOTS.length + (inten === 2 ? 1 : 0), 'golden');
        await narrateStep(9, 'final');
        await finaleStep();
      })();

      return {
        async autoplay() {
          const t0 = now();
          let judged = false;
          while (!ST.finished && now() - t0 < 140000) {
            const ph = ST.phase;
            if ((ph === 'pan' || ph === 'golden' || ph === 'track') && !ST.locked && !ST.glide) {
              const s = subjScreen(), dx = M.w / 2 - s.x, y = M.fy - M.sz * 0.45;
              if (Math.abs(dx) > M.zone * 0.4) { await K.sim.drag(hit, { x: s.x, y }, { x: s.x + dx, y }, ph === 'track' ? 380 : 760, ph === 'track' ? 8 : 14); await K.wait(ph === 'track' ? 60 : 350); }
              else await K.wait(ph === 'track' ? 120 : 250);
            } else if (ph === 'narrate' && ST.canPick && cards.length && !tray.hidden) {
              await K.wait(900);
              if (ST.phase !== 'narrate' || !ST.canPick) continue;
              const wantJudge = !judged && ST.shot === 0;
              const c = cards.find(x => !x.gone && (wantJudge ? x.kind === 'judge' : x.kind === 'desc')) || cards.find(x => !x.gone);
              if (c) { if (c.kind === 'judge') judged = true; await K.sim.tap(c.el); }
            } else if (ph === 'herd') {
              const y = M.fy - M.sz * 0.4, maxX = M.ww - M.w;
              if (CAM.x <= 4) ST.apDir = 1; else if (CAM.x >= maxX - 4) ST.apDir = -1; else if (!ST.apDir) ST.apDir = CAM.x < maxX / 2 ? 1 : -1;
              // the footage follows the finger: dragging left swings the camera right
              const a = ST.apDir === 1 ? M.w * 0.85 : M.w * 0.15, b = ST.apDir === 1 ? M.w * 0.15 : M.w * 0.85;
              await K.sim.drag(hit, { x: a, y }, { x: b, y }, 650, 12); await K.wait(150);
            }
            await K.wait(90);
          }
          await until(() => ST.finished, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
