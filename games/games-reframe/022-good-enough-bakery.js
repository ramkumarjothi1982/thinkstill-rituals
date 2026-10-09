/* 022 Good Enough Bakery — Reframe · REFRAME · Getting Started
 * Mechanism: a behavioural experiment against clinical perfectionism (Shafran, Cooper & Fairburn 2002; Egan, Wade &
 * Shafran 2011) testing the prediction "if it isn't perfect, people will be disappointed". The Perfect-o-meter keeps
 * climbing with visibly diminishing returns while customer delight plateaus at about two thirds; the same customer gets an
 * 80% cake and a 100% cake and says exactly the same thing, and the (never counting down) timer shows what the last 20%
 * cost. Then the player names what 80% would look like for their own task and picks one done-step.
 * Verb: pipe (drag squishy, glossy icing along the design) and serve (tap SERVE when you decide it is good enough).
 * Finale: closing time: the display case fills with the imperfect, delicious cakes you made, thank-you notes appear, the
 * OPEN sign flips to CLOSED and sprinkles drift through the sunset light from the window.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const outCubic = (t) => 1 - Math.pow(1 - t, 3);
  const outBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const rgbOf = (c) => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(c || ''); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [128, 128, 128]; };
  const toHex = (r) => '#' + r.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, k) => { const A = rgbOf(a), B = rgbOf(b); return toHex(A.map((v, i) => v + (B[i] - v) * k)); };
  const rgba = (c, a) => { const A = rgbOf(c); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + a + ')'; };
  const shade = (c, k) => (k < 0 ? mix(c, '#000000', -k) : mix(c, '#ffffff', k));
  function rr(g, x, y, w, hh, r) { r = Math.max(0, Math.min(r, w / 2, hh / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function ell(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); g.fill(); }
  function heartPath(g, x, y, s) { g.beginPath(); g.moveTo(x, y + s * 0.35); g.bezierCurveTo(x - s * 1.1, y - s * 0.35, x - s * 0.45, y - s * 1.05, x, y - s * 0.45); g.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s * 1.1, y - s * 0.35, x, y + s * 0.35); g.closePath(); }
  /* No GPU (VMs, blocklisted devices): canvas pixels are rasterised on the CPU, so render at 1x and an even 30 fps there. */
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

  /* designs: strokes in unit-disk coordinates (u right, v down), drawn onto the cake's elliptical top */
  const circ = (cx, cy, r, n, a0) => { const p = []; for (let i = 0; i <= n; i++) { const a = (a0 || 0) + i / n * TAU; p.push({ u: cx + Math.cos(a) * r, v: cy + Math.sin(a) * r }); } return p; };
  function densify(p) { const out = [p[0]]; for (let i = 1; i < p.length; i++) { const a = p[i - 1], b = p[i], n = Math.max(1, Math.ceil(Math.hypot(b.u - a.u, b.v - a.v) / 0.03)); for (let k = 1; k <= n; k++) out.push({ u: lerp(a.u, b.u, k / n), v: lerp(a.v, b.v, k / n) }); } return out; }
  const DESIGNS = [
    { key: 'swirl', name: 'Rose Swirl', lv: 0, make: () => { const p = []; for (let i = 0; i <= 180; i++) { const k = i / 180, a = k * TAU * 2.1 - Math.PI / 2, r = 0.12 + 0.72 * k; p.push({ u: Math.cos(a) * r, v: Math.sin(a) * r }); } return [p]; } },
    { key: 'heart', name: 'Sweetheart', lv: 0, make: () => { const p = []; for (let i = 0; i <= 140; i++) { const a = i / 140 * TAU, x = 16 * Math.pow(Math.sin(a), 3), y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); p.push({ u: x / 19, v: (y - 2.5) / 17 }); } return [p]; } },
    { key: 'waves', name: 'Ribbon Waves', lv: 0, make: () => [-0.5, 0, 0.5].map((v0, j) => { const p = [], w = Math.sqrt(1 - v0 * v0) * 0.8; for (let i = 0; i <= 64; i++) { const u = -w + 2 * w * i / 64; p.push({ u, v: v0 + 0.12 * Math.sin(u * 8 + j) }); } return p; }) },
    { key: 'zigzag', name: 'Lemon Zigzag', lv: 1, make: () => [-0.48, 0.02, 0.52].map((v0, j) => { const p = [], w = Math.sqrt(1 - v0 * v0) * 0.78, n = 7; for (let i = 0; i <= n; i++) p.push({ u: -w + 2 * w * i / n, v: v0 + (i % 2 ? 0.15 : -0.15) }); return densify(j % 2 ? p.reverse() : p); }) },
    { key: 'scallop', name: 'Scallop Crown', lv: 1, make: () => { const p = []; for (let i = 0; i <= 240; i++) { const a = i / 240 * TAU - Math.PI / 2, r = 0.6 + 0.14 * Math.abs(Math.sin(a * 4.5)); p.push({ u: Math.cos(a) * r, v: Math.sin(a) * r }); } return [p]; } },
    { key: 'star', name: 'Starlight', lv: 1, make: () => { const p = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i / 10 * TAU, r = i % 2 ? 0.36 : 0.82; p.push({ u: Math.cos(a) * r, v: Math.sin(a) * r }); } return [densify(p)]; } },
    { key: 'loops', name: 'Loop-de-Loop', lv: 1, make: () => { const p = []; for (let i = 0; i <= 220; i++) { const k = i / 220, t = k * TAU * 3.5; p.push({ u: -0.7 + 1.4 * k + 0.17 * Math.sin(t), v: -0.04 - 0.3 * Math.cos(t) }); } return [p]; } },
    { key: 'daisy', name: 'Daisy Chain', lv: 2, make: () => { const s = []; for (let j = 0; j < 6; j++) { const a0 = j / 6 * TAU, p = []; for (let i = 0; i <= 40; i++) { const t = i / 40 * TAU, lx = 0.46 + Math.cos(t) * 0.24, ly = Math.sin(t) * 0.13; p.push({ u: Math.cos(a0) * lx - Math.sin(a0) * ly, v: Math.sin(a0) * lx + Math.cos(a0) * ly }); } s.push(p); } s.push(circ(0, 0, 0.12, 24)); return s; } },
    { key: 'rosettes', name: 'Rosette Ring', lv: 2, make: () => { const s = []; for (let j = 0; j < 8; j++) { const a = j / 8 * TAU; s.push(circ(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0.14, 24, a)); } return s; } },
    { key: 'lattice', name: 'Lattice Top', lv: 2, make: () => { const s = []; [-0.42, 0, 0.42].forEach(o => { const w = Math.sqrt(Math.max(0.05, 1 - o * o)) * 0.76; s.push(densify([{ u: o, v: -w }, { u: o, v: w }])); s.push(densify([{ u: -w, v: o }, { u: w, v: o }])); }); return s; } }
  ];
  const FLAVOURS = [
    { key: 'strawberry', name: 'Strawberry', icing: '#ff7aa5', top: '#fff4ea', side: '#f7d8b5' },
    { key: 'pistachio', name: 'Pistachio', icing: '#7fca78', top: '#fff8ee', side: '#efd3a6' },
    { key: 'lemon', name: 'Lemon', icing: '#ffd03f', top: '#fffbef', side: '#f5ddb0' },
    { key: 'blueberry', name: 'Blueberry', icing: '#7d86ff', top: '#fdf6ef', side: '#efd0aa' },
    { key: 'chocolate', name: 'Chocolate', icing: '#fff1e2', top: '#7b4a34', side: '#5d3626' },
    { key: 'raspberry', name: 'Raspberry', icing: '#ea4f78', top: '#fff6f0', side: '#f4d6b6' },
    { key: 'lavender', name: 'Lavender', icing: '#b39bf2', top: '#fff9f2', side: '#f1d8b8' },
    { key: 'mint', name: 'Mint', icing: '#4fd1ab', top: '#fffaf3', side: '#f0d5ad' }
  ];
  const WEATHER = ['sun', 'rain', 'snow', 'petals', 'sun', 'leaves'];
  const TASKS = /\b(presentation|essay|report|e-?mail|assignment|application|slides|deck|project|speech|thesis|proposal|portfolio|resume|cv|cover letter|website|article|blog post|video|design|painting|homework|chapter|pitch|review|paper|draft|plan|budget|book|song|story|code|tax return|spreadsheet)\b/i;
  const STEPS_T = ['Do the 80% version of {t}, then send it.', 'Give {t} 25 minutes, then call it done.', 'Decide what “done” looks like for {t} first.'];
  const STEPS_G = ['Do the 80% version, then send it.', 'Give it 25 minutes, then call it done.', 'Decide what “done” looks like before you start.'];
  const SVG_HEART = '<svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 21.2C5.4 16.3 1.5 12.7 1.5 7.6 1.5 4.3 4 1.8 7.1 1.8c2 0 3.7 1 4.9 2.6 1.2-1.6 2.9-2.6 4.9-2.6 3.1 0 5.6 2.5 5.6 5.8 0 5.1-3.9 8.7-10.5 13.6z"/></svg>';
  const SVG_CLOCK = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="11" r="7.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 7.2V11l2.6 1.8M8 1.8h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const SVG_BELL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17.5h16c-1.6-1.4-2.2-3-2.2-6.2A5.8 5.8 0 0 0 12 5.5a5.8 5.8 0 0 0-5.8 5.8c0 3.2-.6 4.8-2.2 6.2z" fill="currentColor"/><circle cx="12" cy="4" r="1.6" fill="currentColor"/><path d="M2.5 20h19" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

  const LINES = {
    intro: { Jolly: 'Welcome to the Good Enough Bakery! Pipe along the dots, and serve whenever it looks good to you.', Cheeky: 'Pipe the dots. Serve when you like. Nobody’s grading. Except the hearts.', Unfiltered: 'Pipe along the dots. Serve when it looks good.' },
    hearts: { Jolly: 'See the hearts? That’s how happy they’ll be. Notice where they stop climbing.', Cheeky: 'Hearts: full. Meter: still going. Interesting, isn’t it?', Unfiltered: 'Hearts full. The rest is extra.' },
    expA: { Jolly: 'Experiment time! Serve this one at about 80%.', Cheeky: 'Science! This one goes out at about 80%.', Unfiltered: 'Serve this one at about 80%.' },
    expB: { Jolly: 'Now the twin: take it all the way to 100%. I’ll keep the clock.', Cheeky: 'Now make the twin perfect. Every last dot. I’ve got a stopwatch.', Unfiltered: 'Now go for 100%. I’m timing it.' },
    gaps: { Jolly: 'The last few dots are the fiddly bit. I’ve made them glow.', Cheeky: 'The final few percent: where joy goes to hide. They’re glowing.', Unfiltered: 'Gaps are glowing. Fill them.' },
    perfect: { Jolly: 'A perfect 100%! Serve it and let’s see.', Cheeky: 'Flawless. Allegedly. Serve it.', Unfiltered: '100%. Serve it.' },
    cmp: { Jolly: 'Same smile, same words. The perfect one took {x} times as long.', Cheeky: 'Identical reviews. One cost {x} times the time. Hmm.', Unfiltered: 'Same result. {x} times the time.' },
    cmpDiff: { Jolly: 'See where the hearts stop climbing? That’s good enough. Past it is polish.', Cheeky: 'Hearts stop at about two thirds. After that it’s polish for the Critic.', Unfiltered: 'Hearts max out around two thirds.' },
    expA1: { Jolly: 'Welcome! Pipe along the dots, then serve this one at about 80%.', Cheeky: 'Pipe the dots. Serve at about 80%. Science!', Unfiltered: 'Pipe the dots. Serve at about 80%.' },
    cmpSame: { Jolly: 'Same smile, same words. The extra polish didn’t change a thing for them.', Cheeky: 'Identical reviews. The extra polish was just for the Critic.', Unfiltered: 'Same result either way.' },
    free: { Jolly: 'Last order of the day. Serve it whenever it feels good enough.', Cheeky: 'Last one. You decide when it’s done. Wild, I know.', Unfiltered: 'Last order. Your call when it’s done.' },
    critic: { Jolly: 'The Critic sees smudges. Customers taste cake.', Cheeky: 'The Critic has notes. The customer has cake.', Unfiltered: 'Nobody saw the smudge.' },
    close: { Jolly: 'Closing time! Every cake was good enough, and every customer was delighted.', Cheeky: 'Shop’s shut. Zero perfect cakes required. Zero complaints.', Unfiltered: 'Closing time. Everyone was happy.' },
    newRegular: { Jolly: 'Oh! A new regular: {n}!', Cheeky: 'Look who found us: {n}!', Unfiltered: 'New regular: {n}.' },
    rushA: { Jolly: 'Two {d} cakes, please! Twins! I’m in a… no, take your time.', Cheeky: 'Two {d} cakes! Twins. I’m Rush, but I’ll wait. Probably.', Unfiltered: 'Two {d} cakes. Same design.' },
    rushWait: { Jolly: 'No rush! Ironic, I know.', Cheeky: 'I’ve aged a little. It’s fine. Keep going.', Unfiltered: 'Still here.' },
    yum: { Jolly: 'Mmm! Delicious!', Cheeky: 'Mmm! Delicious!', Unfiltered: 'Mmm! Delicious!' },
    react5: { Jolly: ['Ooh, it’s gorgeous! Thank you!', 'This made my day!'], Cheeky: ['Stunning. I’m eating it immediately.', 'Chef’s kiss. Literally.'], Unfiltered: ['Great cake.', 'Love it.'] },
    react3: { Jolly: 'Lovely! Very homemade. Thank you!', Cheeky: 'Rustic! I love rustic.', Unfiltered: 'Nice. Thanks.' },
    react1: { Jolly: 'Ooh, minimalist! Still tasty. Thank you!', Cheeky: 'Abstract art! Edible abstract art.', Unfiltered: 'Simple. Tasty. Thanks.' },
    whatSmudge: { Jolly: 'Smudge? It’s a cake. A lovely one.', Cheeky: 'I don’t see a smudge. I see lunch.', Unfiltered: 'It’s cake.' },
    twistYum: { Jolly: 'Mmm! Best cake all week.', Cheeky: 'Mmm! Smudge-flavoured. My favourite.', Unfiltered: 'Mmm. Great.' }
  };
  const HELLO = {
    drop: { Jolly: 'Hi! One {d}, please. No pressure!', Cheeky: 'One {d}, please. Make it cute. Or don’t. I’m easy.', Unfiltered: 'One {d}, please.' },
    still: { Jolly: 'One {d}, please. Whenever you’re ready.', Cheeky: 'One {d}. I’ll just be here. Being calm.', Unfiltered: 'One {d}, please.' },
    sync: { Jolly: 'Hello! Could I get a {d}? It looks so fun!', Cheeky: 'A {d}, please! My vibes demand it.', Unfiltered: 'A {d}, please.' },
    loopie: { Jolly: 'One {d}, please! I keep thinking about cake. Round and round.', Cheeky: 'A {d}! I’ve thought about it 40 times today.', Unfiltered: 'One {d}.' },
    glitch: { Jolly: 'One {d}, please. I’ve analysed the menu. All of it.', Cheeky: 'A {d}. My data says it’s the optimal cake.', Unfiltered: 'One {d}.' }
  };
  const NAMES = { drop: 'Drop', still: 'Still', sync: 'Sync', loopie: 'Loopie', glitch: 'Glitch', rush: 'Rush' };

  (env.games = env.games || []).push({
    id: 'good-enough-bakery', mode: 'reframe', name: 'Good Enough Bakery', verb: 'pipe', family: 'REFRAME', minutes: 2,
    parents: ['Getting Started', 'Performance / Confidence', 'Mental Overload / Working Memory'],
    cast: ['rush', 'patch', 'drop'], poster: { char: 'rush', mood: 'happy' },
    fonts: ['Pacifico', 'Nunito:wght@600;800;900'],
    tagline: 'Pipe glossy icing, serve when it’s good enough, watch them love it.',
    why: 'For perfectionism: test whether 80% delights people just as much as 100% does.',
    css: `
.g-good-enough-bakery { --gb-ink: #4a2c22; --gb-pink: #e8457a; --gb-script: "Pacifico", "Brush Script MT", "Segoe Script", cursive; --gb-round: "Nunito", "Trebuchet MS", system-ui, sans-serif; background: #f3ebe2; }
.g-good-enough-bakery .gb-hud { position: absolute; z-index: 26; top: calc(env(safe-area-inset-top, 0px) + 60px); left: 10px; right: 10px; padding: 8px 13px 9px; border-radius: 18px; background: linear-gradient(180deg, #fffaf3, #fff0e0); color: var(--gb-ink);
  box-shadow: 0 0 0 2px #f6c6d5, 0 10px 24px rgba(80, 40, 30, .24); font-family: var(--gb-round); }
.g-good-enough-bakery .gb-hrow { display: flex; align-items: center; gap: 8px; min-height: 26px; }
.g-good-enough-bakery .gb-title { font: 400 17px/1.15 var(--gb-script); color: #d63f74; white-space: nowrap; }
.g-good-enough-bakery .gb-pct { margin-left: auto; font: 900 22px/1 var(--gb-round); font-variant-numeric: tabular-nums; color: var(--gb-ink); }
.g-good-enough-bakery .gb-timer { display: inline-flex; align-items: center; gap: 5px; padding: 5px 9px; border-radius: 999px; background: #fde2ea; color: #8a3a52; font: 800 13px/1 var(--gb-round); font-variant-numeric: tabular-nums; white-space: nowrap; }
.g-good-enough-bakery .gb-timer svg { width: 14px; height: 14px; }
.g-good-enough-bakery .gb-bar { position: relative; height: 14px; margin: 6px 0 7px; border-radius: 8px; background: #f2e2d3; box-shadow: inset 0 1px 3px rgba(80, 40, 30, .2); }
.g-good-enough-bakery .gb-fill { position: absolute; left: 0; top: 0; bottom: 0; width: 0; border-radius: 8px; background: linear-gradient(90deg, #ffb0c8, #ff6f9c 70%, #ff5a8a); box-shadow: inset 0 2px 0 rgba(255, 255, 255, .45); transition: width .14s ease; }
.g-good-enough-bakery .gb-polish { position: absolute; top: 0; bottom: 0; width: 0; border-radius: 0 8px 8px 0; background: repeating-linear-gradient(45deg, #cbbbe9 0 5px, #b7a3df 5px 10px); transition: width .14s ease; }
.g-good-enough-bakery .gb-mark { position: absolute; top: -5px; bottom: -5px; width: 3px; margin-left: -1.5px; border-radius: 2px; background: #d63f74; }
.g-good-enough-bakery .gb-mark svg { position: absolute; left: 50%; top: -12px; width: 13px; height: 12px; margin-left: -6.5px; fill: #ff4f86; }
.g-good-enough-bakery .gb-dl { font: 800 12px/1 var(--gb-round); letter-spacing: .08em; text-transform: uppercase; color: #a26b5a; white-space: nowrap; }
.g-good-enough-bakery .gb-hearts { display: flex; gap: 3px; }
.g-good-enough-bakery .gb-hearts svg { width: 21px; height: 19px; fill: #f0d4dc; transition: fill .2s ease, transform .25s cubic-bezier(.2, 1.6, .4, 1); }
.g-good-enough-bakery .gb-hearts svg.on { fill: #ff4f86; transform: scale(1.12); }
.g-good-enough-bakery .gb-max { margin-left: auto; padding: 4px 8px; border-radius: 999px; background: #ff4f86; color: #fff; font: 900 12px/1 var(--gb-round); letter-spacing: .04em; white-space: nowrap; animation: good-enough-bakery-pop .5s cubic-bezier(.2, 1.6, .4, 1) both; }
.g-good-enough-bakery .gb-pad { position: absolute; z-index: 12; touch-action: none; cursor: crosshair; border-radius: 40%; }
.g-good-enough-bakery .gb-serve { position: absolute; z-index: 28; display: flex; align-items: center; justify-content: center; gap: 9px; height: 58px; border: 0; border-radius: 999px; cursor: pointer; color: #fff; touch-action: manipulation;
  font: 900 20px/1 var(--gb-round); letter-spacing: .08em; background: linear-gradient(180deg, #ff8db1, #e8457a); box-shadow: 0 6px 0 #a8264f, 0 14px 26px rgba(168, 38, 79, .35), inset 0 2px 0 rgba(255, 255, 255, .45); transition: transform .08s ease, box-shadow .08s ease, opacity .25s ease; }
.g-good-enough-bakery .gb-serve svg { width: 24px; height: 24px; }
.g-good-enough-bakery .gb-serve:active, .g-good-enough-bakery .gb-serve.down { transform: translateY(5px); box-shadow: 0 1px 0 #a8264f, 0 6px 12px rgba(168, 38, 79, .3), inset 0 2px 0 rgba(255, 255, 255, .45); }
.g-good-enough-bakery .gb-serve.ready { background: linear-gradient(180deg, #ffd36b, #f08a24); box-shadow: 0 6px 0 #a85a12, 0 0 0 4px rgba(255, 211, 107, .45), 0 14px 30px rgba(240, 138, 36, .45); animation: good-enough-bakery-pulse 1.3s ease-in-out infinite; }
.g-good-enough-bakery .gb-serve:focus-visible { outline: 3px solid #fff; outline-offset: 4px; }
.g-good-enough-bakery .gb-ticket { position: absolute; z-index: 20; width: 96px; transform: rotate(3deg); transform-origin: 50% 0; filter: drop-shadow(0 5px 6px rgba(60, 30, 20, .3)); pointer-events: none; transition: opacity .3s ease; }
.g-good-enough-bakery .gb-ticket::before { content: ""; position: absolute; z-index: 1; left: 50%; top: -7px; width: 28px; height: 13px; margin-left: -14px; border-radius: 4px; background: linear-gradient(180deg, #f3d27a, #b8862b); box-shadow: inset 0 1px 0 rgba(255, 255, 255, .6); }
.g-good-enough-bakery .gb-tk { padding: 10px 8px 13px; background: #fffdf6; color: var(--gb-ink); border-radius: 3px 3px 0 0; text-align: center;
  -webkit-mask: linear-gradient(#000 0 0) top / 100% calc(100% - 6px) no-repeat, conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / 12px 6px repeat-x; mask: linear-gradient(#000 0 0) top / 100% calc(100% - 6px) no-repeat, conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / 12px 6px repeat-x; }
.g-good-enough-bakery .gb-ticket small { display: block; font: 900 12px/1 var(--gb-round); letter-spacing: .1em; color: #b0572e; }
.g-good-enough-bakery .gb-ticket b { display: block; margin: 5px 0 3px; font: 400 15px/1.15 var(--gb-script); color: #d63f74; }
.g-good-enough-bakery .gb-ticket span { display: block; font: 700 12px/1.2 var(--gb-round); color: #7a5a4c; }
.g-good-enough-bakery .gb-ticket i { display: inline-block; margin-top: 5px; padding: 3px 7px; border-radius: 999px; background: #fde2ea; color: #8a3a52; font: 900 12px/1 var(--gb-round); font-style: normal; letter-spacing: .04em; }
.g-good-enough-bakery .gb-ticket.swap { animation: good-enough-bakery-ticket .45s cubic-bezier(.2, 1.4, .4, 1); }
.g-good-enough-bakery .gb-sign { position: absolute; z-index: 18; width: 86px; height: 32px; perspective: 300px; pointer-events: none; }
.g-good-enough-bakery .gb-sign i { position: absolute; inset: 0; display: grid; place-items: center; border-radius: 8px; backface-visibility: hidden; font: 400 16px/1 var(--gb-script); box-shadow: 0 3px 8px rgba(0, 0, 0, .25); transition: transform .8s cubic-bezier(.3, 1.5, .5, 1); }
.g-good-enough-bakery .gb-sign i:first-child { background: #ffffff; color: #1f9e7a; border: 2px solid #1f9e7a; }
.g-good-enough-bakery .gb-sign i:last-child { background: #ffe4ec; color: #d63f74; border: 2px solid #d63f74; transform: rotateY(180deg); }
.g-good-enough-bakery .gb-sign.closed i:first-child { transform: rotateY(-180deg); }
.g-good-enough-bakery .gb-sign.closed i:last-child { transform: rotateY(0deg); }
.g-good-enough-bakery .gb-sign::before { content: ""; position: absolute; left: 50%; top: -14px; width: 46px; height: 16px; margin-left: -23px; border: 2px solid #8a6a4a; border-bottom: 0; border-radius: 50% 50% 0 0; }
.g-good-enough-bakery .gb-card { position: absolute; z-index: 32; left: 50%; transform: translateX(-50%); width: min(420px, calc(100% - 24px)); padding: 14px 16px 16px; border-radius: 22px; background: linear-gradient(180deg, #fffaf3, #ffeede); color: var(--gb-ink);
  box-shadow: 0 0 0 3px #f6c6d5, 0 22px 44px rgba(60, 25, 20, .35); font-family: var(--gb-round); text-align: center; animation: good-enough-bakery-card .55s cubic-bezier(.2, 1.4, .4, 1) both; }
.g-good-enough-bakery .gb-card > small { display: block; font: 900 12px/1 var(--gb-round); letter-spacing: .14em; color: #b0572e; }
.g-good-enough-bakery .gb-card > b { display: block; margin: 7px 0 4px; font: 400 22px/1.2 var(--gb-script); color: #d63f74; text-wrap: balance; }
.g-good-enough-bakery .gb-card p { margin: 8px 0 0; font: 800 16px/1.35 var(--gb-round); text-wrap: balance; }
.g-good-enough-bakery .gb-card .gb-care { font: 600 13px/1.35 var(--gb-round); color: #7a5a4c; }
.g-good-enough-bakery .gb-cols { display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; align-items: center; margin-top: 10px; }
.g-good-enough-bakery .gb-col { padding: 10px 8px; border-radius: 14px; background: #fff; box-shadow: 0 2px 0 #f0d6c4; }
.g-good-enough-bakery .gb-col canvas { display: block; width: 100%; max-width: 116px; height: auto; margin: -2px auto 4px; }
.g-good-enough-bakery .gb-col em { display: block; font: 900 22px/1 var(--gb-round); font-style: normal; color: var(--gb-ink); }
.g-good-enough-bakery .gb-col i { display: flex; justify-content: center; gap: 2px; margin: 7px 0; }
.g-good-enough-bakery .gb-col i svg { width: 15px; height: 14px; fill: #ff4f86; }
.g-good-enough-bakery .gb-col i svg.off { fill: #f0d4dc; }
.g-good-enough-bakery .gb-col span { display: block; font: 700 14px/1.25 var(--gb-round); color: #7a4a3a; }
.g-good-enough-bakery .gb-col small { display: inline-flex; align-items: center; gap: 4px; margin-top: 7px; padding: 4px 8px; border-radius: 999px; background: #fde2ea; color: #8a3a52; font: 900 13px/1 var(--gb-round); }
.g-good-enough-bakery .gb-col small svg { width: 13px; height: 13px; }
.g-good-enough-bakery .gb-vs { font: 400 16px/1 var(--gb-script); color: #b0572e; }
.g-good-enough-bakery .gb-btn { appearance: none; margin-top: 12px; min-height: 48px; padding: 0 22px; border: 0; border-radius: 999px; cursor: pointer; color: #fff; font: 900 16px/1 var(--gb-round); letter-spacing: .04em; background: linear-gradient(180deg, #ff8db1, #e8457a); box-shadow: 0 4px 0 #a8264f; }
.g-good-enough-bakery .gb-btn:active { transform: translateY(3px); box-shadow: 0 1px 0 #a8264f; }
.g-good-enough-bakery .gb-btn:focus-visible { outline: 3px solid #d63f74; outline-offset: 3px; }
.g-good-enough-bakery .gb-chips { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.g-good-enough-bakery .gb-chip { appearance: none; min-height: 48px; padding: 9px 14px; border-radius: 14px; border: 2px solid #f6c6d5; background: #fff; color: var(--gb-ink); font: 800 15px/1.3 var(--gb-round); text-align: left; cursor: pointer; box-shadow: 0 3px 0 #f0d6c4; transition: transform .1s ease, border-color .2s ease, opacity .25s ease; }
.g-good-enough-bakery .gb-chip:active { transform: translateY(2px); }
.g-good-enough-bakery .gb-chip:focus-visible { outline: 3px solid #d63f74; outline-offset: 2px; }
.g-good-enough-bakery .gb-chip.pick { border-color: #e8457a; background: #ffeef4; }
.g-good-enough-bakery .gb-chip.gone { opacity: 0; transform: scale(.96); }
.g-good-enough-bakery .gb-critic { position: absolute; z-index: 34; max-width: calc(100% - 24px); padding: 10px 14px 11px; border-radius: 16px; background: #2e2433; color: #fff; box-shadow: 0 0 0 3px #d9b45a, 0 14px 30px rgba(0, 0, 0, .4); animation: good-enough-bakery-pop .45s cubic-bezier(.2, 1.6, .4, 1) both; pointer-events: none; }
.g-good-enough-bakery .gb-critic b { display: block; font: 900 17px/1.15 var(--gb-round); letter-spacing: .03em; color: #ffd36b; }
.g-good-enough-bakery .gb-critic span { display: block; margin-top: 5px; font: 700 15px/1.3 var(--gb-round); color: #f4e8ff; }
.g-good-enough-bakery .gb-note { position: absolute; z-index: 22; transform: translate(-50%, 0) rotate(var(--r, -2deg)); padding: 5px 8px 6px; border-radius: 4px; background: #fffdf4; color: var(--gb-ink); box-shadow: 0 4px 10px rgba(60, 30, 20, .25); text-align: center; white-space: nowrap; pointer-events: none; animation: good-enough-bakery-note .5s cubic-bezier(.2, 1.5, .4, 1) both; }
.g-good-enough-bakery .gb-note b { display: block; font: 400 14px/1.15 var(--gb-script); color: #d63f74; }
.g-good-enough-bakery .gb-note span { display: block; font: 800 12px/1.2 var(--gb-round); color: #7a5a4c; }
.g-good-enough-bakery .gb-order { position: absolute; z-index: 30; left: 50%; transform: translateX(-50%); width: min(440px, calc(100% - 28px)); padding: 11px 16px 13px; border-radius: 14px; text-align: center; color: var(--gb-ink); background: #fffdf6; box-shadow: 0 0 0 3px #e8457a, 0 16px 34px rgba(60, 25, 20, .35); animation: good-enough-bakery-card .6s cubic-bezier(.2, 1.4, .4, 1) both; pointer-events: none; }
.g-good-enough-bakery .gb-order small { display: block; font: 900 12px/1 var(--gb-round); letter-spacing: .14em; color: #b0572e; }
.g-good-enough-bakery .gb-order span { display: block; margin-top: 6px; font: 800 17px/1.3 var(--gb-round); text-wrap: balance; }
.g-good-enough-bakery .gk-char.gb-patch .gk-bubble { max-width: min(204px, calc(100cqw - 110px)); }
.g-good-enough-bakery .gk-char.gb-cust .gk-bubble { max-width: min(212px, calc(100cqw - 116px)); }
@container (min-width: 700px) { .g-good-enough-bakery .gk-char.gb-patch .gk-bubble, .g-good-enough-bakery .gk-char.gb-cust .gk-bubble { max-width: 270px; } .g-good-enough-bakery .gb-ticket { width: 124px; } .g-good-enough-bakery .gb-ticket b { font-size: 18px; } }
@keyframes good-enough-bakery-pop { from { opacity: 0; transform: scale(.7); } to { opacity: 1; } }
@keyframes good-enough-bakery-note { from { opacity: 0; transform: translate(-50%, 10px) rotate(var(--r, -2deg)) scale(.7); } to { opacity: 1; transform: translate(-50%, 0) rotate(var(--r, -2deg)); } }
@keyframes good-enough-bakery-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@keyframes good-enough-bakery-ticket { 0% { transform: rotate(3deg) translateY(-30px); opacity: 0; } 100% { transform: rotate(3deg); opacity: 1; } }
@keyframes good-enough-bakery-card { from { opacity: 0; transform: translateX(-50%) translateY(26px) scale(.94); } to { opacity: 1; transform: translateX(-50%); } }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      const inten = clamp(ctx.intensity | 0, 0, 2), visits = K.visits();
      const now = () => performance.now() / 1000;
      let an = ctx.analysis || {};
      const care = () => an.safety === 'care';
      const L = (o, sub) => { let s = ctx.line(o) || ''; if (sub) Object.keys(sub).forEach(k => { s = s.split('{' + k + '}').join(sub[k]); }); return s; };
      const bright = () => S.scene() === 'bright';
      const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); return (sp > n * 0.55 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; };
      const fmt = (sec) => { const s = Math.max(0, Math.round(sec)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
      const SOFT = softwareGfx();
      const BR = 6, TOL = [3.2, 2.2, 1.4][inten], GAP = 2.2, MINSERVE = [20, 25, 25][inten];
      const heartsFor = (p) => (p <= 0 ? 0 : clamp(Math.floor(5 * smooth(0.05, 0.7, p / 100) + 0.15), 1, 5));
      let MAXP = 100; for (let p = 1; p <= 100; p++) if (heartsFor(p) >= 5) { MAXP = p; break; }

      /* ---------------- today's menu (the same all day, new tomorrow) ---------------- */
      const R0 = K.rng('bakery:' + K.daily());
      const pool = DESIGNS.filter(d => (inten === 0 ? d.lv === 0 : inten === 1 ? d.lv <= 1 : d.lv >= 1));
      const menu = K.shuffle(pool, R0);
      const expD = menu.find(d => d.lv <= 1) || menu[0];
      const rest = menu.filter(d => d !== expD);
      const flav = K.shuffle(FLAVOURS, R0);
      const WX = K.dailyPick(WEATHER, 2);
      const TWIST_WHO = ['still', 'sync', 'loopie', 'glitch'][Math.min(3, visits)];
      const orders = [];
      if (inten > 0) orders.push({ who: 'drop', d: rest[0] || expD, f: flav[0], kind: 'free1' });
      orders.push({ who: 'rush', d: expD, f: flav[1], kind: 'expA' });
      orders.push({ who: 'rush', d: expD, f: flav[1], kind: 'expB', twin: true });
      orders.push({ who: TWIST_WHO, d: rest[1] || rest[0] || expD, f: flav[2], kind: 'twist' });
      orders.forEach((o, i) => { o.n = i + 1; });

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFT ? 1 : 2 });
      const P = K.particles({ max: 260 });
      const hTitle = h('span', { class: 'gb-title', text: 'Perfect-o-meter' });
      const hPct = h('b', { class: 'gb-pct', text: '0%' });
      const hTimeT = h('i', { text: '0:00' }); hTimeT.style.fontStyle = 'normal';
      const hTime = h('span', { class: 'gb-timer', 'aria-label': 'Time on this cake' }, h('span', { html: SVG_CLOCK, style: { display: 'inline-flex' } }), hTimeT);
      const hFill = h('i', { class: 'gb-fill' }), hPolish = h('i', { class: 'gb-polish', style: { left: MAXP + '%' } }), hMark = h('i', { class: 'gb-mark', html: SVG_HEART, style: { left: MAXP + '%' } });
      const hearts = h('span', { class: 'gb-hearts', role: 'img', 'aria-label': 'Customer delight: 0 of 5 hearts' });
      for (let i = 0; i < 5; i++) hearts.insertAdjacentHTML('beforeend', SVG_HEART);
      const hRow3 = h('div', { class: 'gb-hrow' }, h('span', { class: 'gb-dl', text: 'Delight' }), hearts);
      const hud = h('div', { class: 'gb-hud', role: 'group', 'aria-label': 'Perfect-o-meter and customer delight' }, h('div', { class: 'gb-hrow' }, hTitle, hPct, hTime), h('div', { class: 'gb-bar' }, hFill, hPolish, hMark), hRow3);
      const pad = h('div', { class: 'gb-pad', 'aria-label': 'Cake top: drag to pipe icing along the dots', role: 'application' });
      const serve = h('button', { type: 'button', class: 'gb-serve', hidden: true, 'aria-label': 'Serve the cake' }, h('span', { html: SVG_BELL, style: { display: 'inline-flex' } }), h('span', { class: 'gb-serve-t', text: 'SERVE' }));
      const ticketIn = h('div', { class: 'gb-tk' });
      const ticket = h('div', { class: 'gb-ticket', 'aria-live': 'polite', style: { opacity: '0' } }, ticketIn);
      const sign = h('div', { class: 'gb-sign', 'aria-hidden': 'true' }, h('i', { text: 'Open' }), h('i', { text: 'Closed' }));
      const live = h('div', { class: 'tsg-sr', 'aria-live': 'polite' });
      el.append(pad, serve, ticket, sign, hud, live);
      const patch = K.character('patch', { side: 'right', mood: 'happy', size: K.phone() ? 60 : 88, x: 10, y: 160 });
      patch.el.classList.add('gb-patch');
      const custs = {};
      function cust(who) {
        if (custs[who]) return custs[who];
        const c = K.character(who, { side: 'left', mood: 'happy', size: M.ph ? 80 : 110, x: M.W + 30, y: M.cust ? M.cust.y : 240 });
        c.el.classList.add('gb-cust'); c.el.hidden = true; custs[who] = c; return c;
      }
      /* one speaker at a time; a line's mood is a reaction that relaxes back (pass moodMs: 0 to keep it) */
      function say(c, line, o) { if (!line) return; Object.values(custs).concat([patch]).forEach(x => { if (x !== c) x.hush(); }); const ms = Math.max(2800, line.length * 58); c.say(line, Object.assign({ ms, moodMs: ms }, o || {})); live.textContent = line; }

      /* ---------------- sound: a café bossa in the background, squelchy piping in the foreground ---------------- */
      const SND = {
        squish() { if (!A.ctx) return; A.tone({ type: 'sine', freq: 240, to: 140, glide: 0.12, dur: 0.16, vol: 0.09 }); A.noise({ pink: true, filter: 'lowpass', freq: 700, to: 240, dur: 0.14, vol: 0.08 }); },
        plop() { if (!A.ctx) return; A.tone({ type: 'sine', freq: 420, to: 760, glide: 0.06, dur: 0.12, vol: 0.06 }); },
        bell() { if (!A.ctx) return; const t = A.now(); A.chime(A.note('E6'), { when: t, vol: 0.07, dur: 1.4 }); A.chime(A.note('B6'), { when: t + 0.12, vol: 0.06, dur: 1.6 }); },
        door() { if (!A.ctx) return; const t = A.now(); ['A6', 'E6', 'C#7'].forEach((n, i) => A.chime(A.note(n), { when: t + i * 0.07, vol: 0.035, dur: 0.9 })); },
        heart(n) { if (!A.ctx) return; A.pop({ vol: 0.11, freq: 470 + n * 75 }); },
        munch() { if (!A.ctx) return; const t = A.now(); for (let i = 0; i < 3; i++) A.noise({ when: t + 0.05 + i * 0.13, filter: 'bandpass', freq: 1300 + Math.random() * 900, q: 0.9, dur: 0.07, vol: 0.09 }); },
        mmm() { if (!A.ctx) return; const t = A.now() + 0.45; A.tone({ when: t, type: 'sine', freq: 196, to: 247, glide: 0.45, dur: 0.6, vol: 0.06, lp: 900 }); A.tone({ when: t, type: 'triangle', freq: 392, to: 494, glide: 0.45, dur: 0.55, vol: 0.018, lp: 1200 }); },
        ahem() { if (!A.ctx) return; const t = A.now(); A.tone({ when: t, type: 'square', freq: 330, to: 240, glide: 0.12, dur: 0.14, vol: 0.03, lp: 900 }); A.tone({ when: t + 0.18, type: 'square', freq: 280, to: 200, glide: 0.14, dur: 0.18, vol: 0.03, lp: 900 }); },
        zoom() { if (!A.ctx) return; A.tone({ type: 'sine', freq: 300, to: 1400, glide: 0.4, dur: 0.45, vol: 0.04 }); A.whoosh({ vol: 0.06, dur: 0.4 }); },
        sting() { if (!A.ctx) return; const t = A.now(); ['C3', 'Eb3', 'Gb3'].forEach(n => A.tone({ when: t, type: 'sawtooth', freq: A.note(n), dur: 0.5, vol: 0.03, lp: 1400 })); A.noise({ when: t, filter: 'highpass', freq: 3000, dur: 0.12, vol: 0.05 }); },
        trombone() { if (!A.ctx) return; const t = A.now(); [['G3', 0.3], ['F#3', 0.3], ['F3', 0.3], ['E3', 0.9]].reduce((tt, [n, d]) => { A.tone({ when: tt, type: 'sawtooth', freq: A.note(n), to: A.note(n) * 0.98, glide: d, dur: d, vol: 0.035, lp: 800, attack: 0.03 }); return tt + d * 0.95; }, t + 0.1); A.noise({ when: t, pink: true, filter: 'lowpass', freq: 1800, to: 200, dur: 1.1, vol: 0.05 }); },
        flip() { if (!A.ctx) return; A.wood(undefined, 0.15, 1.2); },
        /* a rising chime every 10%; past the delight plateau the chimes thin out (diminishing returns you can hear) */
        step(i, thin) { if (!A.ctx) return; A.chime(A.note(['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'A6'][clamp(i - 1, 0, 9)]), { vol: thin ? 0.02 : 0.055, dur: thin ? 0.45 : 1.1 }); },
        sprinkle() { if (!A.ctx) return; const t = A.now(); for (let i = 0; i < 6; i++) A.tone({ when: t + i * 0.04, type: 'sine', freq: 2400 + Math.random() * 1800, dur: 0.06, vol: 0.02 }); }
      };
      const BPM = [76, 84, 92][inten], BEAT = 60 / BPM;
      const PROG = [{ r: 'G2', f: 'D3', c: ['Bb3', 'D4', 'F4', 'A4'] }, { r: 'C3', f: 'G2', c: ['Bb3', 'E4', 'G4', 'D5'] }, { r: 'F2', f: 'C3', c: ['A3', 'C4', 'E4', 'G4'] }, { r: 'D3', f: 'A2', c: ['A3', 'C4', 'F4', 'E5'] }];
      const MUS = { t0: 0, next: 0, on: false, vol: 0.75 };
      const beatT = (n) => MUS.t0 + n * BEAT;
      function rhodes(f, w, dur, vol) { A.tone({ when: w, type: 'sine', freq: f, dur, vol, attack: 0.008, lp: 2200, bus: 'music', verb: 0.22 }); A.tone({ when: w, type: 'triangle', freq: f * 2.002, dur: dur * 0.35, vol: vol * 0.2, attack: 0.004, lp: 3200, bus: 'music' }); }
      function playBeat(n, w) {
        const v = MUS.vol, bar = Math.floor(n / 4), b = n % 4, ch = PROG[bar % 4];
        if (b === 0) { A.pluck(A.note(ch.r), { when: w, vol: 0.2 * v, damp: 0.992, lp: 600, bus: 'music' }); ch.c.forEach((nn, i) => rhodes(A.note(nn), w + i * 0.012, BEAT * 1.3, 0.03 * v)); }
        if (b === 1) ch.c.forEach((nn, i) => rhodes(A.note(nn), w + BEAT * 0.5 + i * 0.01, BEAT * 0.9, 0.022 * v));
        if (b === 2) A.pluck(A.note(ch.f), { when: w, vol: 0.16 * v, damp: 0.991, lp: 600, bus: 'music' });
        if (b === 3 && bar % 2) A.pluck(A.note(ch.r), { when: w + BEAT * 0.5, vol: 0.12 * v, damp: 0.99, lp: 600, bus: 'music' });
        if (inten > 0 && (b === 1 || b === 3)) A.brush(w, 0.026 * v, 0.16);
        A.shaker(w, 0.008 * v); A.shaker(w + BEAT * 0.5, 0.006 * v);
        if (b === 0 && bar % 2 === 1) [ch.c[3], ch.c[2], ch.c[1]].forEach((nn, i) => A.chime(A.note(nn) * 2, { when: w + BEAT * (0.5 + i * 0.5), vol: 0.02 * v, dur: 1.1, bus: 'music' }));
        if (MUS.big && b === 0) A.pad(ch.c.map(nn => A.note(nn)), { when: w, dur: BEAT * 4, vol: 0.06 * v, attack: 0.3 });
      }
      function musicTick(t) {
        if (!MUS.on || !A.ctx) return;
        if (beatT(MUS.next) < t - 0.06) MUS.next = Math.ceil((t - 0.02 - MUS.t0) / BEAT);
        let guard = 0;
        while (beatT(MUS.next) < t + 0.22 && guard++ < 8) { const n = MUS.next++, w = A.now() + (beatT(n) - t); if (w >= A.now() - 0.01) playBeat(n, Math.max(A.now(), w)); }
      }

      /* ---------------- layout ---------------- */
      const M = { W: 0, H: 0, ph: true };
      const ST = { phase: 'boot', made: [], sunset: false, critic: null, plate: null, cake: null, case: null, done: null, notes: [], sprinkles: [], hearts: [], finished: false, task: null, step: null };
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        const ph = W < 700; Object.assign(M, { W, H, ph });
        if (ph) Object.assign(hud.style, { left: '10px', right: '10px', width: 'auto' });
        else { const w = Math.min(560, W - 240); Object.assign(hud.style, { left: Math.round((W - w) / 2) + 'px', right: 'auto', width: w + 'px' }); }
        M.hudB = 60 + 92;
        M.counter = ph ? M.hudB + 186 : Math.round(H * 0.44);
        const R = ph ? Math.min(158, W * 0.405) : Math.max(120, Math.min(240, W * 0.19, (H - M.counter - 78) / 1.47));
        M.cake = { cx: ph ? Math.round(W / 2) : Math.round(W * 0.42), cy: ph ? Math.round(lerp(M.counter, H, 0.4)) : Math.round(M.counter + 46 + R * 0.56), rx: R, ry: R * 0.56, side: R * 0.36 };
        M.k = R / 100;
        M.win = ph ? { x: 84, y: M.hudB + 16, w: W - 84 - 102, h: M.counter - M.hudB - 40 } : { x: Math.round(W * 0.33), y: M.hudB + 8, w: Math.round(W * 0.34), h: M.counter - M.hudB - 30 };
        M.patch = ph ? { x: 10, y: M.hudB + 10, s: 60 } : { x: 36, y: M.hudB + 12, s: 88 };
        M.cust = ph ? { x: W - 10 - 80, y: M.counter - 80, s: 80 } : { x: Math.round(W * 0.7), y: M.counter - 116, s: 110 };
        patch.place(M.patch.x, M.patch.y);
        Object.keys(custs).forEach(k => { const c = custs[k]; if (!c.el.hidden && c.here) c.place(M.cust.x, M.cust.y); });
        const c = M.cake;
        if (ph) Object.assign(serve.style, { left: Math.round(W / 2 - 112) + 'px', top: Math.round(Math.min(H - 70, c.cy + c.ry + c.side + 50)) + 'px', width: '224px' });
        else Object.assign(serve.style, { left: Math.round(Math.min(W - 250, c.cx + c.rx + 60)) + 'px', top: Math.round(c.cy - 20) + 'px', width: '230px' });
        M.pad = { x: Math.round(c.cx - c.rx - 34), y: Math.round(c.cy - c.ry - 46), w: Math.round(c.rx * 2 + 68), h: Math.round(c.ry * 2 + 96) };
        Object.assign(pad.style, { left: M.pad.x + 'px', top: M.pad.y + 'px', width: M.pad.w + 'px', height: M.pad.h + 'px' });
        /* the order ticket hangs from the counter rail, clear of every character */
        if (ph) Object.assign(ticket.style, { left: '10px', top: (M.counter + 14) + 'px' });
        else Object.assign(ticket.style, { left: Math.round(M.cust.x + 130) + 'px', top: (M.hudB + 14) + 'px' });
        Object.assign(sign.style, { left: Math.round(M.win.x + M.win.w / 2 - 43) + 'px', top: Math.round(M.win.y + 20) + 'px' });
        bgKey = ''; cakeKey = ''; icingDirty = true;
        if (ST.cake) buildGuide(ST.cake);
        if (ST.case) { Object.assign(ST.case, caseGeom(ST.made.length)); caseKey = ''; }
        ST.notes.forEach(n => placeNote(n)); placeOrd();
        if (ST.card) placeCard(ST.card);
      }

      /* ---------------- the cake being decorated ---------------- */
      function newCake(o) {
        const d = o.d.make();
        const ck = { o, design: d, guide: [], cov: null, covN: 0, strokes: [], live: [], pct: 0, hearts: 0, tStart: 0, tEnd: 0, served: false, mess: [], chimed: 0, maxed: false, enter: now(), slide: 0 };
        ST.cake = ck; buildGuide(ck); icingDirty = true; cakeKey = '';
        return ck;
      }
      function buildGuide(ck) {
        const pts = [];
        ck.design.forEach((stroke, si) => {
          let acc = 0, prev = null;
          stroke.forEach((p, i) => { const u = p.u * 80, v = p.v * 80 * 0.56; if (!prev) { pts.push({ u, v, s: si, first: true }); prev = { u, v }; return; } const d = Math.hypot(u - prev.u, v - prev.v); acc += d; if (acc >= 3.6 || i === stroke.length - 1) { pts.push({ u, v, s: si }); acc = 0; } prev = { u, v }; });
        });
        const old = ck.cov; ck.guide = pts; ck.cov = new Uint8Array(pts.length);
        if (old && old.length === pts.length) { ck.cov.set(old); ck.covN = old.reduce((a, b) => a + b, 0); }
      }
      const toPx = (u, v) => ({ x: M.cake.cx + u * M.k, y: M.cake.cy + v * M.k });
      function cover(b) {
        const ck = ST.cake, g = ck.guide, r2 = (b.r + TOL) * (b.r + TOL);
        let n = 0, md = 1e9;
        for (let i = 0; i < g.length; i++) { const du = g[i].u - b.u, dv = g[i].v - b.v, dd = du * du + dv * dv; if (dd < md) md = dd; if (!ck.cov[i] && dd <= r2) { ck.cov[i] = 1; n++; } }
        if (Math.sqrt(md) > BR * 2.8) ck.mess.push(b);
        if (n) { ck.covN += n; onCoverage(); }
      }
      function onCoverage() {
        const ck = ST.cake, tot = ck.guide.length || 1;
        const pct = ck.covN >= tot ? 100 : Math.min(99, Math.floor(100 * ck.covN / tot));
        if (pct === ck.pct) return;
        const prevH = ck.hearts; ck.pct = pct; ck.hearts = heartsFor(pct);
        hPct.textContent = pct + '%';
        hFill.style.width = Math.min(pct, MAXP) + '%'; hPolish.style.width = Math.max(0, pct - MAXP) + '%';
        if (ck.hearts !== prevH) {
          Array.from(hearts.children).forEach((s, i) => s.classList.toggle('on', i < ck.hearts));
          hearts.setAttribute('aria-label', 'Customer delight: ' + ck.hearts + ' of 5 hearts');
          if (ck.hearts > prevH) { SND.heart(ck.hearts); const hr = K.rectIn(hearts); P.emit('star', hr.x + (ck.hearts - 0.5) * 24, hr.cy, 5, { colors: ['#ff8fb1', '#fff0f5'] }); }
        }
        const step = Math.floor(pct / 10);
        if (step > ck.chimed) { ck.chimed = step; SND.step(step, pct > MAXP); }
        if (ck.hearts >= 5 && !ck.maxed) { ck.maxed = true; showMax(true); K.sfx.sparkle(); if (ck.o.kind === 'free1' || (ck.o.kind === 'twist' && !ST.heartsTold)) { ST.heartsTold = true; say(patch, L(LINES.hearts), { mood: 'wink' }); } }
        if (pct >= MINSERVE && serve.hidden) { serve.hidden = false; serve.style.opacity = '0'; K.later(() => { serve.style.opacity = '1'; }, 20); }
        const k = ck.o.kind, ready = k === 'expB' ? pct >= 100 : k === 'expA' ? pct >= 76 : ck.hearts >= 5;
        if (ready !== serve.classList.contains('ready')) { serve.classList.toggle('ready', ready); if (ready) serveGuide(); }
        if (k === 'expB' && pct >= 86 && !ck.gapTold) { ck.gapTold = true; say(patch, L(LINES.gaps), { mood: 'think' }); }
        if (k === 'expB' && pct >= 100 && !ck.perfTold) { ck.perfTold = true; say(patch, L(LINES.perfect), { mood: 'wow' }); }
      }
      let maxEl = null;
      function showMax(on) { if (maxEl) { maxEl.remove(); maxEl = null; } if (on) { maxEl = h('span', { class: 'gb-max', text: 'Max delight!' }); hRow3.append(maxEl); } }
      function resetHud() { hPct.textContent = '0%'; hFill.style.width = '0%'; hPolish.style.width = '0%'; Array.from(hearts.children).forEach(s => s.classList.remove('on')); hTimeT.textContent = '0:00'; showMax(false); serve.hidden = true; serve.classList.remove('ready'); }

      /* ---------------- piping: squishy, glossy icing that follows the finger ---------------- */
      const PIPE = { down: false, cur: null, lastQ: null, tip: null, loop: null, moveT: 0, squeeze: 0, sp: 0, bag: { x: 0, y: 0 } };
      K.press(pad, {
        space: el,
        down: (p) => {
          if ((ST.phase !== 'pipe' && ST.phase !== 'order') || !ST.cake || now() - ST.cake.slide < 0.5) return;
          if (ST.phase === 'order') ST.phase = 'pipe';
          const ck = ST.cake; PIPE.down = true; PIPE.lastQ = null; PIPE.moveT = now(); PIPE.sp = 0;
          PIPE.cur = { beads: [], t0: now(), done: false }; ck.strokes.push(PIPE.cur); ck.live.push(PIPE.cur);
          if (!ck.tStart) ck.tStart = now();
          ingest({ x: p.x, y: p.y, t: now() });
          K.sfx.soft(); SND.squish();
          if (A.ctx && !PIPE.loop) { PIPE.loop = A.loop({ pink: true, filter: 'bandpass', freq: 340, q: 1.5 }); }
        },
        move: (p) => { if (!PIPE.down) return; ingest({ x: p.x, y: p.y, t: now() }); PIPE.moveT = now(); },
        up: () => pipeUp()
      });
      function pipeUp() {
        if (!PIPE.down) return;
        PIPE.down = false;
        if (PIPE.cur) { PIPE.cur.done = true; PIPE.cur.tEnd = now(); }
        SND.plop();
        if (PIPE.loop) { const l = PIPE.loop; l.level(0.0001, 0.05); K.later(() => l.stop(), 160); PIPE.loop = null; }
        if (ST.cake && ST.phase === 'pipe' && ST.cake.pct < MINSERVE) pipeGuide(900);
      }
      function addBead(st, u, v, r, t) { const b = { u, v, r, t }; st.beads.push(b); cover(b); return b; }
      /* every pointer sample becomes icing straight away (no per-frame queue, so a quick flick at a low frame rate keeps all of its icing) */
      function ingest(q) {
        const st = PIPE.cur, c = M.cake; if (!st || st.done || !ST.cake) return;
        let u = (q.x - c.cx) / M.k, v = (q.y - c.cy) / M.k;
        const e = Math.hypot(u / 100, v / 56); if (e > 1.1) { u /= e / 1.1; v /= e / 1.1; }
        if (PIPE.lastQ) { const inst = Math.hypot(q.x - PIPE.lastQ.x, q.y - PIPE.lastQ.y) / Math.max(0.016, q.t - PIPE.lastQ.t); PIPE.sp = lerp(PIPE.sp, inst, 0.35); }
        PIPE.lastQ = q;
        const flow = clamp((q.t - st.t0) * 5 + 0.5, 0.5, 1), rT = BR * clamp(1.3 - PIPE.sp / 1500, 0.78, 1.3) * flow;
        const last = st.beads[st.beads.length - 1];
        PIPE.tip = { u, v };
        if (!last) { addBead(st, u, v, rT * 0.95, q.t); return; }
        let pu = last.u, pv = last.v, pr = last.r, d = Math.hypot(u - pu, v - pv);
        while (d >= GAP) { const kk = GAP / d; pu += (u - pu) * kk; pv += (v - pv) * kk; pr = lerp(pr, rT, 0.22); addBead(st, pu, pv, pr, q.t); d = Math.hypot(u - pu, v - pv); }
      }
      function pipeTick(dt, t) {
        const ck = ST.cake; if (!ck) return;
        const st = PIPE.cur;
        if (PIPE.down && st && !st.done && st.beads.length && t - PIPE.moveT > 0.08) { const b = st.beads[st.beads.length - 1]; if (b.r < BR * 1.5) { b.r = Math.min(BR * 1.5, b.r + dt * BR * 1.2); cover(b); } }
        if (PIPE.loop) { const s = clamp((PIPE.sp || 0) / 700, 0, 1); PIPE.loop.level(PIPE.down ? 0.035 + 0.075 * s : 0.0001, 0.05); PIPE.loop.freq(280 + s * 380, 0.06); }
        if (PIPE.down && t - (PIPE.spDecay || 0) > 0.05) { PIPE.spDecay = t; if (t - PIPE.moveT > 0.1) PIPE.sp = (PIPE.sp || 0) * 0.6; }
        ck.live = ck.live.filter(s => { if (s.done && t - s.tEnd > 0.55) { bakeStroke(s); return false; } return true; });
        if (ck.tStart && !ck.served && t - (PIPE.clockT || 0) > 0.25) { PIPE.clockT = t; hTimeT.textContent = fmt(t - ck.tStart); }
      }

      /* ---------------- painting icing (live strokes each frame, settled strokes baked once) ---------------- */
      const icing = document.createElement('canvas'); let icingDirty = true;
      const ICM = 26;
      function icingOrigin() { const c = M.cake; return { x: c.cx - c.rx - ICM, y: c.cy - c.ry - ICM, w: c.rx * 2 + ICM * 2, h: c.ry * 2 + ICM * 2 }; }
      function cols(f) { const base = f.icing; return { base, edge: shade(base, -0.24), mid: shade(base, 0.24), hi: shade(base, 0.78), shadow: f.key === 'chocolate' ? 'rgba(20,8,4,0.32)' : 'rgba(90,40,30,0.2)' }; }
      function paintBeads(g, beads, ox, oy, k, col, t) {
        if (!beads.length) return;
        const rad = (b) => { if (!t) return b.r; const a = t - b.t; return a > 0.6 ? b.r : b.r * (1 + 0.24 * Math.exp(-a * 8) * Math.cos(a * 24)); };
        const pass = (fill, kx, ky, sc, add) => { g.fillStyle = fill; g.beginPath(); for (let i = 0; i < beads.length; i++) { const b = beads[i], r = (rad(b) * sc + add) * k; if (r <= 0.25) continue; const x = ox + (b.u + kx * b.r) * k, y = oy + (b.v + ky * b.r) * k; g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); } g.fill(); };
        pass(col.shadow, 0.3, 0.62, 1, 0.3);
        pass(col.edge, 0, 0, 1, 0.22);
        pass(col.base, 0, 0, 1, -0.12);
        pass(col.mid, -0.2, -0.26, 0.58, 0);
        /* the specular streak is one smooth stroke (a chain of tiny circles would read as beads) */
        if (beads.length < 2) { pass(col.hi, -0.3, -0.42, 0.27, 0); return; }
        g.strokeStyle = col.hi; g.lineCap = 'round'; g.lineJoin = 'round';
        let w0 = -1, px = 0, py = 0;
        for (let i = 0; i < beads.length; i++) {
          const b = beads[i], x = ox + (b.u - 0.3 * b.r) * k, y = oy + (b.v - 0.42 * b.r) * k, w = Math.max(0.5, Math.round(rad(b) * 0.54 * k * 2) / 2);
          if (w !== w0) { if (w0 > 0) { g.lineTo(x, y); g.stroke(); } g.lineWidth = w; g.beginPath(); g.moveTo(i ? px : x, i ? py : y); w0 = w; }
          g.lineTo(x, y); px = x; py = y;
        }
        g.stroke();
      }
      function rebakeIcing() {
        const o = icingOrigin(), d = cv.dpr || 1;
        icing.width = Math.max(2, Math.round(o.w * d)); icing.height = Math.max(2, Math.round(o.h * d));
        const g = icing.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, o.w, o.h);
        const ck = ST.cake; icingDirty = false;
        if (!ck) return;
        const col = cols(ck.o.f), cx = M.cake.cx - o.x, cy = M.cake.cy - o.y;
        ck.strokes.forEach(s => { if (s.baked) paintBeads(g, s.beads, cx, cy, M.k, col, 0); });
        if (ck.topping) paintTopping(g, cx, cy, ck);
      }
      function bakeStroke(s) {
        s.baked = true;
        if (icingDirty) { rebakeIcing(); return; }
        const o = icingOrigin(), g = icing.getContext('2d');
        paintBeads(g, s.beads, M.cake.cx - o.x, M.cake.cy - o.y, M.k, cols(ST.cake.o.f), 0);
      }
      function paintTopping(g, cx, cy, ck) {
        const k = M.k, R = K.rng('top' + ck.o.n);
        const sc = ['#ff5f8f', '#ffd36b', '#5fd6b3', '#7d86ff', '#ffffff', '#ff8a4d'];
        for (let i = 0; i < 26; i++) { const a = R() * TAU, r = Math.sqrt(R()) * 74, x = cx + Math.cos(a) * r * k, y = cy + Math.sin(a) * r * 0.56 * k; g.save(); g.translate(x, y); g.rotate(R() * TAU); g.fillStyle = sc[i % sc.length]; rr(g, -2.2 * k, -0.7 * k, 4.4 * k, 1.4 * k, 0.7 * k); g.fill(); g.restore(); }
        const chx = cx + 4 * k, chy = cy - 6 * k;
        g.strokeStyle = '#5e7d2e'; g.lineWidth = 1.4 * k; g.beginPath(); g.moveTo(chx, chy - 5 * k); g.quadraticCurveTo(chx + 4 * k, chy - 13 * k, chx + 9 * k, chy - 15 * k); g.stroke();
        g.fillStyle = 'rgba(90,20,30,0.3)'; ell(g, chx + 1.5 * k, chy + 3 * k, 6.5 * k, 3 * k);
        const cg = g.createRadialGradient(chx - 2 * k, chy - 3 * k, 0.5, chx, chy, 6.5 * k); cg.addColorStop(0, '#ff8a9a'); cg.addColorStop(0.5, '#e0213f'); cg.addColorStop(1, '#8a0f24');
        g.fillStyle = cg; g.beginPath(); g.arc(chx, chy, 6.2 * k, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.85)'; ell(g, chx - 2.2 * k, chy - 2.6 * k, 1.8 * k, 1.1 * k);
      }

      /* ---------------- the cake body and stand (cached per cake) ---------------- */
      const body = document.createElement('canvas'); let cakeKey = '';
      function bodyOrigin() { const c = M.cake; return { x: c.cx - c.rx * 1.3, y: c.cy - c.ry - 30, w: c.rx * 2.6, h: c.ry * 2 + c.side + c.ry * 0.9 + 70 }; }
      function renderBody() {
        const ck = ST.cake; if (!ck) return;
        const key = M.W + 'x' + M.H + ':' + ck.o.n + ':' + (cv.dpr || 1) + bright();
        if (cakeKey === key) return; cakeKey = key;
        const o = bodyOrigin(), d = cv.dpr || 1, c = M.cake, f = ck.o.f;
        body.width = Math.max(2, Math.round(o.w * d)); body.height = Math.max(2, Math.round(o.h * d));
        const g = body.getContext('2d'); g.setTransform(d, 0, 0, d, -o.x * d, -o.y * d); g.clearRect(o.x, o.y, o.w, o.h);
        const by = c.cy + c.side, pr = c.rx * 1.2, pry = c.ry * 1.2;
        g.fillStyle = 'rgba(70,40,30,0.22)'; ell(g, c.cx + 8, by + pry * 0.7 + 34, pr * 0.62, pry * 0.32);
        g.fillStyle = '#e8ddd6'; rr(g, c.cx - 14, by + 8, 28, pry * 0.6 + 22, 6); g.fill();
        g.fillStyle = '#f7f1ec'; ell(g, c.cx, by + pry * 0.62 + 28, pr * 0.46, pry * 0.2);
        g.fillStyle = '#d8cbc2'; ell(g, c.cx, by + 9, pr, pry * 0.56);
        const pg = g.createLinearGradient(c.cx - pr, 0, c.cx + pr, 0); pg.addColorStop(0, '#f2ebe5'); pg.addColorStop(0.5, '#ffffff'); pg.addColorStop(1, '#e9e0d9');
        g.fillStyle = pg; ell(g, c.cx, by + 4, pr, pry * 0.56);
        g.strokeStyle = '#8fdcc2'; g.lineWidth = 3; g.beginPath(); g.ellipse(c.cx, by + 4, pr - 3, pry * 0.56 - 3, 0, 0, TAU); g.stroke();
        g.fillStyle = 'rgba(80,40,30,0.25)'; ell(g, c.cx + 4, by + 6, c.rx * 1.02, c.ry * 0.98);
        const sg = g.createLinearGradient(c.cx - c.rx, 0, c.cx + c.rx, 0); sg.addColorStop(0, shade(f.side, -0.2)); sg.addColorStop(0.28, f.side); sg.addColorStop(0.62, shade(f.side, 0.12)); sg.addColorStop(1, shade(f.side, -0.26));
        g.fillStyle = sg; g.beginPath(); g.moveTo(c.cx - c.rx, c.cy); g.lineTo(c.cx - c.rx, by); g.ellipse(c.cx, by, c.rx, c.ry, 0, Math.PI, 0, true); g.lineTo(c.cx + c.rx, c.cy); g.closePath(); g.fill();
        /* a naked cake: sponge with two cream layers and a few crumbs */
        const cream = f.key === 'chocolate' ? '#f3dcc6' : '#fff0d9', lw = Math.max(3, c.side * 0.075);
        [0.47, 0.8].forEach(kk => {
          const yy = c.cy + c.side * kk;
          g.strokeStyle = rgba(shade(f.side, -0.4), 0.22); g.lineWidth = lw + 1.5; g.beginPath(); g.ellipse(c.cx, yy + 1.2, c.rx - 0.5, c.ry, 0, 0.03, Math.PI - 0.03); g.stroke();
          g.strokeStyle = cream; g.lineWidth = lw; g.beginPath(); g.ellipse(c.cx, yy, c.rx - 0.5, c.ry, 0, 0.03, Math.PI - 0.03); g.stroke();
        });
        { const Rc = K.rng('crumb' + ck.o.n); g.fillStyle = rgba(shade(f.side, -0.35), 0.4); for (let i = 0; i < 46; i++) { const a = 0.08 + Rc() * (Math.PI - 0.16); ell(g, c.cx + Math.cos(a) * c.rx * 0.98, c.cy + Math.sin(a) * c.ry + c.side * (0.12 + Rc() * 0.84), 1.3, 0.9); } }
        g.fillStyle = f.top;
        g.beginPath(); g.moveTo(c.cx - c.rx, c.cy);
        const nd = 11; for (let i = 0; i <= nd; i++) { const a = Math.PI - i / nd * Math.PI, x = c.cx + Math.cos(a) * c.rx, y = c.cy + Math.sin(a) * c.ry, dl = (i % 2 ? 0.34 : 0.2) * c.side; g.lineTo(x, y + dl * (0.4 + 0.6 * Math.sin(i * 1.7) ** 2)); }
        g.lineTo(c.cx + c.rx, c.cy); g.closePath(); g.fill();
        const tg = g.createRadialGradient(c.cx - c.rx * 0.25, c.cy - c.ry * 0.35, 4, c.cx, c.cy, c.rx * 1.05); tg.addColorStop(0, shade(f.top, 0.35)); tg.addColorStop(0.7, f.top); tg.addColorStop(1, shade(f.top, -0.1));
        g.fillStyle = tg; ell(g, c.cx, c.cy, c.rx, c.ry);
        g.strokeStyle = rgba(shade(f.top, -0.3), 0.8); g.lineWidth = 2; g.beginPath(); g.ellipse(c.cx, c.cy, c.rx - 1, c.ry - 1, 0, 0, TAU); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.35)'; ell(g, c.cx - c.rx * 0.35, c.cy - c.ry * 0.45, c.rx * 0.3, c.ry * 0.14);
      }
      function drawCakeAt(g, x, y, s) {
        const c = M.cake, bo = bodyOrigin(), io = icingOrigin();
        g.save(); g.translate(x, y); g.scale(s, s); g.translate(-c.cx, -c.cy);
        if (body.width > 2) g.drawImage(body, bo.x, bo.y, bo.w, bo.h);
        if (icing.width > 2) g.drawImage(icing, io.x, io.y, io.w, io.h);
        g.restore();
      }

      /* ---------------- the shop (static, rendered once per size/theme) ---------------- */
      const bg = document.createElement('canvas'), winOver = document.createElement('canvas'); let bgKey = '';
      const glow = (c) => K.glowSprite(c);
      function renderBg() {
        const W = M.W, H = M.H, d = cv.dpr || 1, br = bright(), key = W + 'x' + H + ':' + d + ':' + br + ':' + ST.sunset;
        if (bgKey === key) return; bgKey = key;
        bg.width = Math.max(2, Math.round(W * d)); bg.height = Math.max(2, Math.round(H * d));
        const g = bg.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
        const R = K.rng('shop' + W + 'x' + H);
        const ct = M.counter;
        const wg = g.createLinearGradient(0, 0, 0, ct);
        wg.addColorStop(0, br ? '#d9f3e8' : '#1d4643'); wg.addColorStop(1, br ? '#bfe8d6' : '#163a37');
        g.fillStyle = wg; g.fillRect(0, 0, W, ct);
        g.fillStyle = br ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.05)'; for (let x = 0; x < W; x += 28) g.fillRect(x, 0, 13, ct);
        g.fillStyle = br ? 'rgba(232,120,160,0.16)' : 'rgba(255,150,190,0.06)'; for (let x = 14; x < W; x += 28) for (let y = 12; y < ct; y += 28) { g.beginPath(); g.arc(x, y, 1.8, 0, TAU); g.fill(); }
        g.fillStyle = br ? '#fff4e6' : '#2c2a35'; g.fillRect(0, ct - 46, W, 46);
        g.fillStyle = br ? '#f2dcc8' : '#24222c'; for (let x = 6; x < W; x += 34) rr(g, x, ct - 40, 26, 32, 4), g.fill();
        drawWindow(g, br, R);
        const shelf = (x0, x1, y) => {
          g.fillStyle = 'rgba(60,30,20,0.25)'; g.fillRect(x0 + 3, y + 4, x1 - x0, 6);
          g.fillStyle = br ? '#c98f5a' : '#7a5236'; g.fillRect(x0, y, x1 - x0, 7); g.fillStyle = br ? '#e2ad78' : '#946642'; g.fillRect(x0, y, x1 - x0, 2);
          for (let x = x0 + 6; x < x1 - 14; x += 20 + R() * 8) {
            const kind = R();
            if (kind < 0.45) { const jw = 12 + R() * 5, jh = 16 + R() * 8, jc = ['#ff9fbf', '#ffd36b', '#8fe0c4', '#b9a6ef', '#ffb38a'][Math.floor(R() * 5)]; g.fillStyle = 'rgba(255,255,255,0.55)'; rr(g, x, y - jh, jw, jh, 3); g.fill(); g.fillStyle = jc; rr(g, x + 2, y - jh * 0.72, jw - 4, jh * 0.68, 2); g.fill(); g.fillStyle = br ? '#e86a92' : '#b8506e'; g.fillRect(x - 1, y - jh - 3, jw + 2, 4); }
            else if (kind < 0.75) { g.fillStyle = '#d99a52'; ell(g, x + 10, y - 7, 11, 7); g.fillStyle = '#f1c27d'; ell(g, x + 9, y - 9, 9, 4.5); g.strokeStyle = '#b8783a'; g.lineWidth = 1.2; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(x + 9 + i * 4 - 2, y - 12); g.lineTo(x + 9 + i * 4 + 2, y - 5); g.stroke(); } x += 6; }
            else { g.fillStyle = '#e9785f'; rr(g, x + 2, y - 12, 12, 12, 2); g.fill(); g.fillStyle = '#5aa84c'; ell(g, x + 8, y - 16, 7, 5); ell(g, x + 4, y - 19, 4, 4); ell(g, x + 12, y - 19, 4, 4); }
          }
        };
        if (M.ph) { shelf(4, M.win.x - 8, ct - 50); shelf(M.win.x + M.win.w + 8, W - 4, M.cust.y - 14); }
        else {
          const lx0 = Math.max(140, M.patch.x + M.patch.s + 16), lx1 = M.win.x - 20, sx = (lx0 + lx1) / 2;
          shelf(lx0, lx1, M.hudB + 86); shelf(M.win.x + M.win.w + 20, Math.min(W - 20, M.cust.x + M.cust.s + 10), M.hudB + 86);
          g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
          g.font = '400 ' + (lx1 - lx0 < 250 ? 24 : 30) + 'px Pacifico, "Brush Script MT", "Segoe Script", cursive';
          if (!br) { g.shadowColor = '#ff5f9e'; g.shadowBlur = ST.sunset ? 18 : 10; }
          g.fillStyle = br ? '#d63f74' : '#ffc4dc'; g.fillText('Good Enough Bakery', sx, ct - 82);
          g.shadowBlur = 0; g.font = '800 13px Nunito, "Trebuchet MS", sans-serif'; g.fillStyle = br ? '#7a5a4c' : '#e9c9b0'; g.fillText('DONE IS DELICIOUS', sx, ct - 58);
          g.restore();
        }
        [M.ph ? W * 0.3 : W * 0.24, M.ph ? W * 0.7 : W * 0.78].forEach(x => {
          g.strokeStyle = br ? '#7a6a5a' : '#120f14'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, M.hudB + (M.ph ? 18 : 30)); g.stroke();
          const ly = M.hudB + (M.ph ? 18 : 30);
          g.fillStyle = br ? '#f28fae' : '#d4688c'; g.beginPath(); g.moveTo(x - 16, ly + 14); g.quadraticCurveTo(x, ly - 8, x + 16, ly + 14); g.closePath(); g.fill();
          g.fillStyle = '#fff3cf'; ell(g, x, ly + 14, 6, 2.6);
          if (!br) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55; g.drawImage(glow('#ffcf7a'), x - 110, ly - 40, 220, 200); g.restore(); }
        });
        if (M.ph && ST.sunset) { /* closing time: the shop sign lights up where the meter was */
          g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
          g.font = '400 32px Pacifico, "Brush Script MT", "Segoe Script", cursive';
          g.shadowColor = br ? 'rgba(255,95,158,0.55)' : '#ff5f9e'; g.shadowBlur = 16; g.fillStyle = br ? '#e2457a' : '#ffd1e3'; g.fillText('Good Enough Bakery', W / 2, 98);
          g.shadowBlur = 6; g.fillText('Good Enough Bakery', W / 2, 98);
          g.shadowBlur = 0; g.font = '800 13px Nunito, "Trebuchet MS", sans-serif'; g.fillStyle = br ? '#7a5a4c' : '#ffd9a8'; g.fillText('DONE IS DELICIOUS', W / 2, 132);
          g.restore();
        }
        g.fillStyle = 'rgba(60,30,20,0.25)'; g.fillRect(0, ct, W, 8);
        const cg = g.createLinearGradient(0, ct - 6, 0, ct + 22); cg.addColorStop(0, br ? '#e2a66c' : '#9a6a44'); cg.addColorStop(1, br ? '#b8743c' : '#6a4426');
        g.fillStyle = cg; g.fillRect(0, ct - 6, W, 26); g.fillStyle = 'rgba(255,240,220,0.35)'; g.fillRect(0, ct - 6, W, 2);
        const mt = ct + 20;
        const mg = g.createLinearGradient(0, mt, 0, H); mg.addColorStop(0, br ? '#f7d9dc' : '#b8959b'); mg.addColorStop(1, br ? '#edc6cc' : '#836679');
        g.fillStyle = mg; g.fillRect(0, mt, W, H - mt);
        const vein = (n, col, lw) => { /* long, gently wandering marble veins */
          g.strokeStyle = col; g.lineCap = 'round';
          for (let i = 0; i < n; i++) {
            const pts = []; let x = -40 + R() * (W + 80), y = mt + R() * (H - mt), a = (R() < 0.5 ? 0.35 : -0.35) + (R() - 0.5) * 0.5;
            for (let k = 0; k < 7; k++) { pts.push({ x, y }); a += (R() - 0.5) * 0.7; const st = 50 + R() * 50; x += Math.cos(a) * st; y += Math.sin(a) * st * 0.6; }
            g.lineWidth = lw * (0.6 + R() * 0.8); g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
            for (let k = 1; k < pts.length - 1; k++) g.quadraticCurveTo(pts[k].x, pts[k].y, (pts[k].x + pts[k + 1].x) / 2, (pts[k].y + pts[k + 1].y) / 2);
            g.stroke();
          }
        };
        vein(M.ph ? 6 : 10, br ? 'rgba(255,255,255,0.55)' : 'rgba(255,228,236,0.16)', 2.4);
        vein(M.ph ? 7 : 12, br ? 'rgba(255,255,255,0.8)' : 'rgba(255,228,236,0.24)', 1.1);
        vein(M.ph ? 4 : 7, br ? 'rgba(190,110,130,0.2)' : 'rgba(50,25,45,0.26)', 0.9);
        g.fillStyle = 'rgba(255,255,255,0.4)'; for (let i = 0; i < 4; i++) { g.save(); g.globalAlpha = 0.3; g.drawImage(glow('#ffffff'), R() * W - 80, mt + R() * (H - mt) - 40, 160, 80); g.restore(); }
        const c = M.cake;
        const bowl = (x, y, s, col) => { g.fillStyle = 'rgba(70,40,30,0.2)'; ell(g, x + 4, y + s * 0.42, s * 0.95, s * 0.28); const bg2 = g.createLinearGradient(x - s, 0, x + s, 0); bg2.addColorStop(0, '#d9cfc8'); bg2.addColorStop(0.5, '#ffffff'); bg2.addColorStop(1, '#d4c9c2'); g.fillStyle = bg2; g.beginPath(); g.ellipse(x, y, s, s * 0.32, 0, 0, Math.PI); g.lineTo(x - s, y); g.fill(); g.beginPath(); g.moveTo(x - s, y); g.quadraticCurveTo(x - s * 0.9, y + s * 0.62, x, y + s * 0.62); g.quadraticCurveTo(x + s * 0.9, y + s * 0.62, x + s, y); g.fill(); g.fillStyle = col; ell(g, x, y, s * 0.9, s * 0.26); g.fillStyle = 'rgba(255,255,255,0.5)'; ell(g, x - s * 0.3, y - s * 0.06, s * 0.25, s * 0.06); };
        const bx = M.ph ? 44 : Math.min(c.cx - c.rx - 70, W * 0.1), byy = M.ph ? H - 70 : H * 0.83;
        bowl(bx, byy, M.ph ? 30 : 44, '#ffc0d4');
        const jx = M.ph ? W - 46 : Math.min(c.cx - c.rx - 70, W * 0.16), jy = M.ph ? H - 96 : Math.max(mt + 70, H * 0.6);
        if (!M.ph) { /* a glass cake dome with today's cupcake */
          const dx = Math.max(c.cx + c.rx + 120, W * 0.885), dy = Math.min(H - 70, H * 0.84), dr = Math.min(80, W * 0.06);
          g.fillStyle = 'rgba(70,40,30,0.22)'; ell(g, dx + 6, dy + 6, dr * 1.25, dr * 0.3);
          g.fillStyle = '#fbf6f1'; ell(g, dx, dy, dr * 1.18, dr * 0.3); g.fillStyle = '#e4d8cf'; ell(g, dx, dy + 3, dr * 1.12, dr * 0.24); g.fillStyle = '#fffdf9'; ell(g, dx, dy - 2, dr * 1.1, dr * 0.24);
          g.fillStyle = '#c98f5a'; g.beginPath(); g.moveTo(dx - dr * 0.42, dy - 30); g.lineTo(dx + dr * 0.42, dy - 30); g.lineTo(dx + dr * 0.32, dy - 2); g.lineTo(dx - dr * 0.32, dy - 2); g.closePath(); g.fill();
          g.strokeStyle = 'rgba(90,50,25,0.35)'; g.lineWidth = 1.2; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(dx + i * dr * 0.11, dy - 30); g.lineTo(dx + i * dr * 0.085, dy - 2); g.stroke(); }
          g.fillStyle = '#ff9fc0'; g.beginPath(); g.moveTo(dx - dr * 0.5, dy - 28); g.quadraticCurveTo(dx - dr * 0.55, dy - 52, dx - dr * 0.2, dy - 58); g.quadraticCurveTo(dx, dy - 78, dx + dr * 0.2, dy - 58); g.quadraticCurveTo(dx + dr * 0.55, dy - 52, dx + dr * 0.5, dy - 28); g.closePath(); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.55)'; ell(g, dx - dr * 0.18, dy - 52, dr * 0.14, 4);
          g.fillStyle = '#e0213f'; g.beginPath(); g.arc(dx + 2, dy - 74, 6, 0, TAU); g.fill();
          g.save(); g.beginPath(); g.moveTo(dx - dr, dy - 2); g.bezierCurveTo(dx - dr, dy - dr * 1.9, dx + dr, dy - dr * 1.9, dx + dr, dy - 2); g.closePath();
          g.fillStyle = 'rgba(230,245,255,0.18)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2; g.stroke(); g.restore();
          g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(dx - dr * 0.72, dy - dr * 0.5); g.quadraticCurveTo(dx - dr * 0.66, dy - dr * 1.2, dx - dr * 0.2, dy - dr * 1.38); g.stroke();
          g.fillStyle = '#fbf6f1'; ell(g, dx, dy - dr * 1.45, 7, 6); g.fillStyle = '#d9cfc8'; ell(g, dx, dy - dr * 1.4, 7, 2.5);
        }
        g.fillStyle = 'rgba(70,40,30,0.2)'; ell(g, jx + 4, jy + 44, 22, 6);
        g.fillStyle = 'rgba(255,255,255,0.6)'; rr(g, jx - 18, jy, 36, 44, 7); g.fill();
        const sc = ['#ff5f8f', '#ffd36b', '#5fd6b3', '#7d86ff', '#ffffff'];
        for (let i = 0; i < 40; i++) { g.fillStyle = sc[i % 5]; g.save(); g.translate(jx - 14 + R() * 28, jy + 14 + R() * 26); g.rotate(R() * TAU); g.fillRect(-2.4, -0.8, 4.8, 1.6); g.restore(); }
        g.fillStyle = '#ff8db1'; rr(g, jx - 19, jy - 6, 38, 9, 3); g.fill();
        for (let i = 0; i < (M.ph ? 18 : 34); i++) { const x = R() * W, y = mt + 20 + R() * (H - mt - 30); if (Math.abs(x - c.cx) < c.rx * 1.3 && Math.abs(y - c.cy) < c.ry + c.side + 60) continue; g.fillStyle = sc[i % 5]; g.save(); g.translate(x, y); g.rotate(R() * TAU); g.fillRect(-2.4, -0.8, 4.8, 1.6); g.restore(); }
        { /* a pool of warm lamplight on the worktop (evening: dusky edges; daytime: a soft falloff) */
          const lx = c.cx, ly = c.cy - c.ry * 0.4, pool = g.createRadialGradient(lx, ly, c.rx * 0.5, lx, ly, Math.max(W, H - mt) * (M.ph ? 0.78 : 0.62));
          pool.addColorStop(0, '#ffffff'); pool.addColorStop(1, br ? '#ecd9da' : '#6b5a80');
          g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = pool; g.fillRect(0, mt, W, H - mt); g.restore();
          if (!br) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.2; g.drawImage(glow('#ffcf8a'), c.cx - c.rx * 2, c.cy - c.ry * 3, c.rx * 4, c.ry * 6); g.restore(); }
        }
        g.fillStyle = br ? '#c98f5a' : '#5a3a26'; g.fillRect(0, H - 10, W, 10); g.fillStyle = 'rgba(255,230,200,0.3)'; g.fillRect(0, H - 10, W, 1.5);
        const vg = g.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, br ? 'rgba(90,50,30,0.16)' : 'rgba(10,6,20,0.4)');
        g.fillStyle = vg; g.fillRect(0, 0, W, H);
        renderWinOver(br);
      }
      function winSky(g, br) {
        const w = M.win, sg = g.createLinearGradient(0, w.y, 0, w.y + w.h);
        if (ST.sunset) { sg.addColorStop(0, '#5b3a7a'); sg.addColorStop(0.45, '#e8706e'); sg.addColorStop(1, '#ffc27a'); }
        else if (br) { sg.addColorStop(0, WX === 'rain' ? '#9fb4c8' : '#8fd2ff'); sg.addColorStop(1, WX === 'rain' ? '#d4dde6' : '#e6f7ff'); }
        else { sg.addColorStop(0, '#141a3e'); sg.addColorStop(1, '#3a3366'); }
        g.fillStyle = sg; g.fillRect(w.x, w.y, w.w, w.h);
      }
      function drawWindow(g, br, R) {
        const w = M.win;
        g.save(); rr(g, w.x, w.y, w.w, w.h, 10); g.clip();
        winSky(g, br);
        if (ST.sunset) { const gl = g.createRadialGradient(w.x + w.w * 0.7, w.y + w.h * 0.75, 4, w.x + w.w * 0.7, w.y + w.h * 0.75, w.w * 0.6); gl.addColorStop(0, 'rgba(255,240,190,0.95)'); gl.addColorStop(1, 'rgba(255,200,140,0)'); g.fillStyle = gl; g.fillRect(w.x, w.y, w.w, w.h); }
        else if (br && WX === 'sun') { g.save(); g.globalAlpha = 0.7; g.drawImage(glow('#fff6cc'), w.x + w.w * 0.62, w.y - w.h * 0.1, w.w * 0.5, w.w * 0.5); g.restore(); }
        const street = w.y + w.h * 0.72;
        const cols2 = ST.sunset ? ['#8a4a6a', '#a8586a', '#7a4466'] : br ? ['#f6c6a8', '#cfe3f6', '#f7e1a0', '#d8c6f2', '#bfe8cf'] : ['#2c2f55', '#3a3463', '#2a3a5c'];
        for (let x = w.x - 10; x < w.x + w.w + 10;) { const bw = 34 + R() * 30, bh = w.h * (0.32 + R() * 0.3); g.fillStyle = cols2[Math.floor(R() * cols2.length)]; g.fillRect(x, street - bh, bw - 3, bh); g.fillStyle = ST.sunset || !br ? 'rgba(255,214,140,0.85)' : 'rgba(255,255,255,0.6)'; for (let yy = street - bh + 6; yy < street - 8; yy += 12) for (let xx = x + 5; xx < x + bw - 10; xx += 10) if (R() < 0.7) g.fillRect(xx, yy, 5, 6); x += bw; }
        g.fillStyle = ST.sunset ? '#5a3550' : br ? '#c9c0b8' : '#2a2638'; g.fillRect(w.x, street, w.w, w.h - (street - w.y));
        g.fillStyle = ST.sunset ? '#6d3f5c' : br ? '#ddd5cd' : '#363146'; g.fillRect(w.x, street, w.w, 4);
        const tx = w.x + w.w * 0.18; g.fillStyle = '#6b4a35'; g.fillRect(tx - 2, street - 26, 4, 26); g.fillStyle = ST.sunset ? '#7a4a6e' : br ? (WX === 'leaves' ? '#e08a3c' : WX === 'petals' ? '#f6aecb' : '#6cbf5a') : '#24414a'; ell(g, tx, street - 32, 15, 13); ell(g, tx - 8, street - 26, 9, 8); ell(g, tx + 9, street - 26, 9, 8);
        if (!br && !ST.sunset) { const lx = w.x + w.w * 0.84; g.fillStyle = '#1a1626'; g.fillRect(lx - 1.5, street - 34, 3, 34); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.9; g.drawImage(glow('#ffd27a'), lx - 26, street - 60, 52, 52); g.restore(); g.fillStyle = '#ffe7a8'; g.beginPath(); g.arc(lx, street - 35, 3, 0, TAU); g.fill(); }
        g.restore();
        M.street = street;
      }
      function renderWinOver(br) {
        const w = M.win, d = cv.dpr || 1, pad2 = 14;
        winOver.width = Math.max(2, Math.round((w.w + pad2 * 2) * d)); winOver.height = Math.max(2, Math.round((w.h + pad2 * 2 + 20) * d));
        const g = winOver.getContext('2d'); g.setTransform(d, 0, 0, d, -(w.x - pad2) * d, -(w.y - pad2) * d);
        g.save(); rr(g, w.x, w.y, w.w, w.h, 10); g.clip();
        g.globalAlpha = br ? 0.22 : 0.12; g.fillStyle = '#ffffff';
        g.beginPath(); g.moveTo(w.x + w.w * 0.12, w.y); g.lineTo(w.x + w.w * 0.3, w.y); g.lineTo(w.x + w.w * 0.1, w.y + w.h); g.lineTo(w.x - w.w * 0.08, w.y + w.h); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(w.x + w.w * 0.36, w.y); g.lineTo(w.x + w.w * 0.42, w.y); g.lineTo(w.x + w.w * 0.22, w.y + w.h); g.lineTo(w.x + w.w * 0.16, w.y + w.h); g.closePath(); g.fill();
        g.restore();
        const fc = br ? '#fffaf2' : '#3a3445';
        g.strokeStyle = 'rgba(60,30,20,0.25)'; g.lineWidth = 9; rr(g, w.x + 2, w.y + 3, w.w, w.h, 10); g.stroke();
        g.strokeStyle = fc; g.lineWidth = 8; rr(g, w.x, w.y, w.w, w.h, 10); g.stroke();
        g.lineWidth = 5; g.beginPath(); g.moveTo(w.x + w.w / 2, w.y); g.lineTo(w.x + w.w / 2, w.y + w.h); g.moveTo(w.x, w.y + w.h * 0.46); g.lineTo(w.x + w.w, w.y + w.h * 0.46); g.stroke();
        g.fillStyle = br ? '#f0d9c3' : '#4a4256'; g.fillRect(w.x - 10, w.y + w.h + 2, w.w + 20, 8);
        const aw = w.y - 2, n = Math.max(6, Math.round(w.w / 26)), sw = (w.w + 24) / n;
        for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? '#ffffff' : (br ? '#ff8db1' : '#d4688c'); g.beginPath(); g.moveTo(w.x - 12 + i * sw, aw - 12); g.lineTo(w.x - 12 + (i + 1) * sw, aw - 12); g.lineTo(w.x - 12 + (i + 1) * sw, aw + 2); g.quadraticCurveTo(w.x - 12 + (i + 0.5) * sw, aw + 12, w.x - 12 + i * sw, aw + 2); g.closePath(); g.fill(); }
        M.winOverO = { x: w.x - pad2, y: w.y - pad2, w: w.w + pad2 * 2, h: w.h + pad2 * 2 + 20 };
      }

      /* ---------------- per-frame drawing ---------------- */
      const faceImgs = {};
      const faceOf = (who, mood) => { const k = who + ':' + mood; if (!faceImgs[k]) { const im = new Image(); im.src = K.face(who, mood); faceImgs[k] = im; } return faceImgs[k]; };
      const WXP = [];
      function drawWindowLife(g, t, dt) {
        const w = M.win;
        g.save(); rr(g, w.x, w.y, w.w, w.h, 10); g.clip();
        const q = queueFaces();
        q.forEach((who, i) => { const im = faceOf(who, 'happy'), s = M.ph ? 30 : 42, x = w.x + w.w * (0.32 + i * 0.22), y = M.street - s * 0.55 + Math.sin(t * 2 + i) * 2; if (im.complete && im.naturalWidth) g.drawImage(im, x - s / 2, y - s / 2, s, s); });
        if (!ST.sunset && WX !== 'sun') {
          if (WXP.length < 26 && Math.random() < dt * 30) WXP.push({ x: w.x + Math.random() * w.w, y: w.y - 6, v: WX === 'rain' ? 260 : WX === 'snow' ? 30 : 40, ph: Math.random() * 6 });
          g.strokeStyle = 'rgba(220,235,255,0.7)'; g.lineWidth = 1.2;
          for (let i = WXP.length - 1; i >= 0; i--) {
            const p = WXP[i]; p.y += p.v * dt; p.x += (WX === 'rain' ? -40 : Math.sin(t * 2 + p.ph) * 18) * dt;
            if (p.y > w.y + w.h) { WXP.splice(i, 1); continue; }
            if (WX === 'rain') { g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - 2, p.y + 9); g.stroke(); }
            else { g.fillStyle = WX === 'snow' ? '#ffffff' : WX === 'petals' ? '#ffc4d6' : '#e8913a'; if (WX === 'snow') { g.beginPath(); g.arc(p.x, p.y, 1.8, 0, TAU); g.fill(); } else { g.save(); g.translate(p.x, p.y); g.rotate(t * 2 + p.ph); ell(g, 0, 0, 3, 1.6); g.restore(); } }
          }
        }
        g.restore();
        const o = M.winOverO; if (o && winOver.width > 2) g.drawImage(winOver, o.x, o.y, o.w, o.h);
      }
      function queueFaces() { if (!ST.order || ST.phase === 'closing') return []; const i = orders.indexOf(ST.order); const out = []; for (let j = i + 1; j < orders.length && out.length < 2; j++) { const o = orders[j]; if (o.who !== ST.order.who && out.indexOf(o.who) < 0) out.push(o.who); } return out; }
      function drawGuide(g, t) {
        const ck = ST.cake; if (!ck || ck.served || (ST.phase !== 'pipe' && ST.phase !== 'order')) return;
        const col = shade(ck.o.f.icing, ck.o.f.key === 'chocolate' ? -0.5 : -0.3), help = ck.o.kind === 'expB' && ck.pct >= 80;
        g.fillStyle = rgba(col, 0.62);
        g.beginPath();
        for (let i = 0; i < ck.guide.length; i++) { if (ck.cov[i]) continue; const p = ck.guide[i], x = M.cake.cx + p.u * M.k, y = M.cake.cy + p.v * M.k; g.moveTo(x + 2.1, y); g.arc(x, y, 2.1, 0, TAU); }
        g.fill();
        if (help) { const pl = 0.5 + 0.5 * Math.sin(t * 6); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 + 0.4 * pl; for (let i = 0; i < ck.guide.length; i++) { if (ck.cov[i]) continue; const p = ck.guide[i]; g.drawImage(glow('#ffe066'), M.cake.cx + p.u * M.k - 11, M.cake.cy + p.v * M.k - 11, 22, 22); } g.restore(); }
        const s0 = firstUncovered(); if (s0) { const p = toPx(s0.u, s0.v), pl = 0.5 + 0.5 * Math.sin(t * 5); g.strokeStyle = rgba('#ffffff', 0.5 + 0.4 * pl); g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, 7 + pl * 3, 0, TAU); g.stroke(); }
      }
      function firstUncovered() { const ck = ST.cake; if (!ck) return null; for (let i = 0; i < ck.guide.length; i++) if (!ck.cov[i]) return ck.guide[i]; return null; }
      function drawLive(g, t) {
        const ck = ST.cake; if (!ck || !ck.live.length) return;
        const col = cols(ck.o.f);
        ck.live.forEach(s => paintBeads(g, s.beads, M.cake.cx, M.cake.cy, M.k, col, t));
      }
      function drawBag(g, t, dt) {
        const c = M.cake, ck = ST.cake;
        if (!ck || ST.phase === 'closing' || ST.phase === 'task') return;
        let tx, ty;
        if (PIPE.down && PIPE.tip) { const p = toPx(PIPE.tip.u, PIPE.tip.v); tx = p.x; ty = p.y; }
        else if (M.ph) { tx = c.cx + c.rx * 0.8; ty = c.cy + c.ry * 0.32; }
        else { tx = c.cx + c.rx * 0.98 + 30; ty = c.cy + c.ry * 0.95; }
        const b = PIPE.bag, kk = Math.min(1, dt * (PIPE.down ? 40 : 7));
        if (!b.x) { b.x = tx; b.y = ty; }
        b.x += (tx - b.x) * kk; b.y += (ty - b.y) * kk;
        PIPE.squeeze += ((PIPE.down ? 1 : 0) - PIPE.squeeze) * Math.min(1, dt * 12);
        const angT = M.ph && !PIPE.down ? -1.12 : -0.92; PIPE.ang = PIPE.ang == null ? angT : PIPE.ang + (angT - PIPE.ang) * Math.min(1, dt * 8);
        const sq = PIPE.squeeze, len = M.ph ? 84 : 110, wt = M.ph ? 44 : 58, ang = PIPE.ang + Math.sin(t * 1.4) * 0.03;
        g.save(); g.translate(b.x, b.y); g.rotate(ang);
        g.fillStyle = 'rgba(70,40,30,0.18)'; ell(g, len * 0.55 + 10, 18, len * 0.5, wt * 0.3);
        g.fillStyle = '#b9bec7'; g.beginPath(); g.moveTo(0, 0); g.lineTo(15, -5.5); g.lineTo(15, 5.5); g.closePath(); g.fill();
        g.strokeStyle = '#8d939c'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(2 + i * 4, -1.5 - i * 1.2); g.lineTo(2 + i * 4, 1.5 + i * 1.2); g.stroke(); }
        g.fillStyle = '#e8ecf2'; g.fillRect(12, -6, 4, 12);
        g.save(); g.scale(1 - sq * 0.05, 1 + sq * 0.1);
        const bgc = g.createLinearGradient(0, -wt / 2, 0, wt / 2); bgc.addColorStop(0, '#ffffff'); bgc.addColorStop(0.5, '#f5ece6'); bgc.addColorStop(1, '#dccfc6');
        g.fillStyle = bgc; g.beginPath(); g.moveTo(15, -6); g.quadraticCurveTo(len * 0.45, -wt * 0.52, len * 0.86, -wt * 0.42); g.quadraticCurveTo(len * 1.02, -wt * 0.1, len * 0.94, wt * 0.08); g.quadraticCurveTo(len * 0.9, wt * 0.42, len * 0.82, wt * 0.44); g.quadraticCurveTo(len * 0.45, wt * 0.52, 15, 6); g.closePath(); g.fill();
        g.save(); g.clip(); g.fillStyle = ck.o.f.icing; g.globalAlpha = 0.85; g.fillRect(14, -wt, len * 0.34, wt * 2); g.globalAlpha = 1;
        g.strokeStyle = 'rgba(232,69,122,0.35)'; g.lineWidth = 2; for (let x = 30; x < len; x += 10) { g.beginPath(); g.moveTo(x, -wt); g.lineTo(x + 8, wt); g.stroke(); } g.restore();
        g.fillStyle = 'rgba(255,255,255,0.7)'; ell(g, len * 0.48, -wt * 0.24, len * 0.24, 2.4);
        g.fillStyle = '#e8457a'; ell(g, len * 0.96, 0, 5, 9); g.restore();
        g.restore();
        if (PIPE.down && Math.random() < dt * 8) P.emit('drop', b.x, b.y, 1, { colors: [ck.o.f.icing], speed: [10, 30], size: [1, 2] });
      }
      function drawCritic(g, t) {
        const cr = ST.critic; if (!cr) return;
        const k = t - cr.t0;
        let x, y, s = 1, rot = 0, a = 1;
        if (cr.mode === 'in') { const e = outBack(clamp(k / 0.9, 0, 1)); x = lerp(M.W + 80, cr.x, e); y = lerp(-80, cr.y, e); rot = (1 - e) * 0.8; }
        else if (cr.mode === 'hover') { x = cr.x + Math.sin(t * 2.2) * 4; y = cr.y + Math.sin(t * 3.1) * 3; }
        else { const e = clamp(k / 1.4, 0, 1); x = cr.x + e * 60; y = cr.y - e * 180; s = 1 - e * 0.75; rot = e * 3.5; a = 1 - e; if (e >= 1) { ST.critic = null; return; } }
        cr.cx = x; cr.cy = y;
        const R = (M.ph ? 44 : 58) * s;
        g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(rot);
        g.strokeStyle = '#6b4226'; g.lineWidth = 11 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(R * 0.7, R * 0.7); g.lineTo(R * 1.55, R * 1.55); g.stroke();
        g.strokeStyle = '#8a5a34'; g.lineWidth = 6 * s; g.beginPath(); g.moveTo(R * 0.8, R * 0.8); g.lineTo(R * 1.5, R * 1.5); g.stroke();
        g.save(); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
        g.fillStyle = '#fbf7f2'; g.fillRect(-R, -R, R * 2, R * 2);
        if (cr.mode !== 'out') { const mz = 2.1, sx = cr.sx, sy = cr.sy; g.save(); g.rotate(-rot); g.translate(-sx * mz, -sy * mz); g.scale(mz, mz); const bo = bodyOrigin(), io = icingOrigin(); if (body.width > 2) g.drawImage(body, bo.x, bo.y, bo.w, bo.h); if (icing.width > 2) g.drawImage(icing, io.x, io.y, io.w, io.h); g.restore(); }
        if (cr.mode === 'hover' && cr.hoverT) { /* the Critic's red pen circles the "smudge" */
          const p = clamp((t - cr.hoverT - 0.25) / 0.55, 0, 1);
          if (p > 0) { g.strokeStyle = '#e8233f'; g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath(); const n = 40, a0 = -2.2; for (let i = 0; i <= n * p; i++) { const a = a0 + i / n * TAU * 1.12, rw = R * (0.5 + 0.04 * Math.sin(i * 0.9)); const x = Math.cos(a) * rw * 1.15, y = Math.sin(a) * rw * 0.8; if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
        }
        g.restore();
        g.save(); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip(); g.fillStyle = 'rgba(160,210,255,0.16)'; g.fillRect(-R, -R, R * 2, R * 2); g.fillStyle = 'rgba(255,255,255,0.55)'; ell(g, -R * 0.4, -R * 0.45, R * 0.32, R * 0.16); g.restore();
        const rg = g.createLinearGradient(-R, -R, R, R); rg.addColorStop(0, '#ffe7a0'); rg.addColorStop(0.5, '#d9a43a'); rg.addColorStop(1, '#9a6a1a');
        g.strokeStyle = rg; g.lineWidth = 7 * s; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
        const look = cr.mode === 'hover' ? 1 : 0;
        [[-R * 0.36, -R * 1.12], [R * 0.36, -R * 1.12]].forEach(([ex, ey]) => { g.fillStyle = '#ffffff'; ell(g, ex, ey, R * 0.26, R * 0.3); g.strokeStyle = '#2e2433'; g.lineWidth = 2; g.beginPath(); g.ellipse(ex, ey, R * 0.26, R * 0.3, 0, 0, TAU); g.stroke(); g.fillStyle = '#2e2433'; ell(g, ex + R * 0.04, ey + R * (0.06 + look * 0.1), R * 0.11, R * 0.13); g.strokeStyle = '#2e2433'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(ex - R * 0.24, ey - R * 0.42 - (ex < 0 ? 0 : R * 0.08)); g.lineTo(ex + R * 0.22, ey - R * 0.42 - (ex < 0 ? R * 0.08 : 0)); g.stroke(); });
        g.strokeStyle = '#2e2433'; g.lineWidth = 3.4 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(-R * 0.05, R * 1.08); g.bezierCurveTo(-R * 0.3, R * 0.92, -R * 0.55, R * 1.2, -R * 0.4, R * 1.28); g.moveTo(R * 0.05, R * 1.08); g.bezierCurveTo(R * 0.3, R * 0.92, R * 0.55, R * 1.2, R * 0.4, R * 1.28); g.stroke();
        g.restore();
      }
      function drawPlate(g, t) {
        const pl = ST.plate; if (!pl) return;
        const k = clamp((t - pl.t0) / 0.75, 0, 1), e = outCubic(k);
        const c = M.cake, x = lerp(c.cx, pl.x, e), y = lerp(c.cy, pl.y, e) - Math.sin(k * Math.PI) * 40, s = lerp(1, pl.s, e) * (pl.bite ? 1 - pl.bite * 0.25 : 1);
        if (pl.fade) { g.save(); g.globalAlpha = Math.max(0, 1 - (t - pl.fade) / 0.5); drawCakeAt(g, x, y, s); g.restore(); if (t - pl.fade > 0.5) ST.plate = null; return; }
        drawCakeAt(g, x, y, s);
      }
      function drawHearts(g, dt) {
        for (let i = ST.hearts.length - 1; i >= 0; i--) {
          const q = ST.hearts[i]; q.age += dt; if (q.age > q.life) { ST.hearts.splice(i, 1); continue; }
          q.x += q.vx * dt + Math.sin(q.age * 4 + q.ph) * 14 * dt; q.y += q.vy * dt; const a = 1 - q.age / q.life;
          g.globalAlpha = a; g.fillStyle = q.c; heartPath(g, q.x, q.y, q.s * (0.8 + 0.2 * Math.sin(q.age * 6))); g.fill(); g.globalAlpha = 1;
        }
      }
      function burstHearts(x, y, n) { for (let i = 0; i < n; i++) ST.hearts.push({ x: x + (Math.random() - 0.5) * 30, y, vx: (Math.random() - 0.5) * 40, vy: -60 - Math.random() * 70, s: 5 + Math.random() * 5, age: 0, life: 1.4 + Math.random() * 0.8, ph: Math.random() * 6, c: ['#ff4f86', '#ff8fb1', '#ffd36b'][i % 3] }); }
      /* closing time: a glass display case of today's cakes (shell cached once per size/theme) */
      const caseCv = document.createElement('canvas'); let caseKey = '';
      function caseGeom(n) {
        const W = M.W, H = M.H;
        const r = M.ph ? { x: 14, y: M.counter + 24, w: W - 28, h: Math.min(H - M.counter - 196, 320) } : { x: Math.round(W * 0.14), y: M.counter + 26, w: Math.round(W * 0.72), h: Math.min(H - M.counter - 160, 244) };
        const inner = { x: r.x + 10, y: r.y + 34, w: r.w - 20, h: r.h - 34 - 18 };
        const perRow = M.ph ? 2 : Math.max(3, n), rows = Math.max(1, Math.ceil(n / perRow)), cellH = inner.h / rows;
        const slots = [], shelves = [];
        for (let row = 0; row < rows; row++) shelves.push(inner.y + (row + 1) * cellH - 46);
        for (let i = 0; i < n; i++) {
          const row = Math.floor(i / perRow), colI = i % perRow, inRow = Math.min(perRow, n - row * perRow), cw = inner.w / inRow;
          const maxH = shelves[row] - (inner.y + row * cellH) - 6;
          slots.push({ x: inner.x + cw * (colI + 0.5), shelf: shelves[row], tw: Math.min(cw * 0.72, M.ph ? 132 : 170, maxH / 0.78) });
        }
        return { r, inner, slots, shelves };
      }
      function scallop(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); const n = 16; for (let i = 0; i < n; i++) { const a = i / n * TAU; g.beginPath(); g.arc(x + Math.cos(a) * rx, y + Math.sin(a) * ry, ry * 0.42, 0, TAU); g.fill(); } }
      function renderCase(cs) {
        const key = M.W + 'x' + M.H + ':' + (cv.dpr || 1) + ':' + cs.slots.length;
        if (caseKey === key) return; caseKey = key;
        const r = cs.r, I = cs.inner, d = cv.dpr || 1, pd = 16;
        caseCv.width = Math.max(2, Math.round((r.w + pd * 2) * d)); caseCv.height = Math.max(2, Math.round((r.h + pd * 2) * d));
        const g = caseCv.getContext('2d'); g.setTransform(d, 0, 0, d, -(r.x - pd) * d, -(r.y - pd) * d);
        g.fillStyle = 'rgba(40,18,20,0.35)'; rr(g, r.x + 4, r.y + 10, r.w, r.h, 16); g.fill();
        const wg = g.createLinearGradient(0, r.y, 0, r.y + r.h); wg.addColorStop(0, '#c98d55'); wg.addColorStop(1, '#8a5430');
        g.fillStyle = wg; rr(g, r.x, r.y, r.w, r.h, 16); g.fill();
        g.strokeStyle = 'rgba(255,232,200,0.4)'; g.lineWidth = 1.5; rr(g, r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3, 15); g.stroke();
        const ig = g.createLinearGradient(0, I.y, 0, I.y + I.h); ig.addColorStop(0, '#fff7ea'); ig.addColorStop(1, '#f3d6bb');
        g.fillStyle = ig; rr(g, I.x, I.y, I.w, I.h, 8); g.fill();
        g.save(); rr(g, I.x, I.y, I.w, I.h, 8); g.clip();
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45; g.drawImage(glow('#ffe3b0'), I.x + I.w * 0.05, I.y - I.h * 0.5, I.w * 0.9, I.h * 1.1); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        for (let x = I.x + 24; x < I.x + I.w - 12; x += 46) { g.fillStyle = 'rgba(255,214,140,0.35)'; ell(g, x, I.y + 5, 9, 4); g.fillStyle = '#fff4d6'; ell(g, x, I.y + 3, 4, 2); }
        cs.shelves.forEach(y => { g.fillStyle = 'rgba(90,50,30,0.16)'; g.fillRect(I.x, y + 7, I.w, 9); g.fillStyle = '#ecd0ae'; g.fillRect(I.x, y - 2, I.w, 8); g.fillStyle = '#fff3e2'; g.fillRect(I.x, y - 2, I.w, 1.5); g.fillStyle = '#c3946a'; g.fillRect(I.x, y + 6, I.w, 2.5); });
        g.restore();
        g.strokeStyle = 'rgba(70,38,20,0.45)'; g.lineWidth = 3; rr(g, I.x, I.y, I.w, I.h, 8); g.stroke();
        const hx = r.x + r.w / 2, hy = r.y + 17, hw = Math.min(170, r.w * 0.5);
        const pg = g.createLinearGradient(0, hy - 11, 0, hy + 11); pg.addColorStop(0, '#ffe9a8'); pg.addColorStop(1, '#c9922e');
        g.fillStyle = 'rgba(60,30,10,0.35)'; rr(g, hx - hw / 2 + 1, hy - 10, hw, 22, 11); g.fill();
        g.fillStyle = pg; rr(g, hx - hw / 2, hy - 11, hw, 22, 11); g.fill();
        g.fillStyle = '#5a3412'; g.font = '900 13px Nunito, "Trebuchet MS", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TODAY’S BAKES', hx, hy + 0.5);
      }
      function drawCase(g, t) {
        const cs = ST.case; if (!cs) return;
        renderCase(cs);
        const k = clamp((t - cs.t0) / 0.7, 0, 1); if (k <= 0) return;
        const e = outCubic(k), r = cs.r, I = cs.inner;
        g.save(); g.globalAlpha = e; g.drawImage(caseCv, r.x - 16, r.y - 16 + (1 - e) * 34, r.w + 32, r.h + 32); g.restore();
        if (k < 1) return;
        cs.slots.forEach((sl, i) => {
          const kk = clamp((t - cs.t0 - 0.8 - i * 0.42) / 0.5, 0, 1); if (kk <= 0) return;
          const m = ST.made[i]; if (!m || !m.thumb) return;
          const s = outBack(kk), tw = sl.tw * s, th = tw * m.thumb.height / m.thumb.width;
          g.fillStyle = 'rgba(255,255,255,0.96)'; scallop(g, sl.x, sl.shelf + 1, tw * 0.32, tw * 0.075);
          g.drawImage(m.thumb, sl.x - tw / 2, sl.shelf + 1 - th * 0.943, tw, th);
          if (!sl.rang) { sl.rang = true; K.sfx.chime(4 + i); P.emit('star', sl.x, sl.shelf - th * 0.5, 8, { colors: ['#fff6d8', '#ffd0e0'] }); showNote(i); }
        });
        g.save(); rr(g, I.x, I.y, I.w, I.h, 8); g.clip(); g.globalAlpha = 0.16; g.fillStyle = '#ffffff';
        const sk = I.h * 0.5; g.beginPath(); g.moveTo(I.x + I.w * 0.1, I.y); g.lineTo(I.x + I.w * 0.1 + 34, I.y); g.lineTo(I.x + I.w * 0.1 + 34 - sk, I.y + I.h); g.lineTo(I.x + I.w * 0.1 - sk, I.y + I.h); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(I.x + I.w * 0.1 + 48, I.y); g.lineTo(I.x + I.w * 0.1 + 58, I.y); g.lineTo(I.x + I.w * 0.1 + 58 - sk, I.y + I.h); g.lineTo(I.x + I.w * 0.1 + 48 - sk, I.y + I.h); g.closePath(); g.fill();
        g.restore();
      }
      function drawSprinkles(g, t, dt) {
        if (!ST.sprinkleOn) return;
        if (ST.sprinkles.length < (M.ph ? 90 : 130) && Math.random() < dt * 70) ST.sprinkles.push({ x: Math.random() * M.W, y: M.hudB - 10, vy: 60 + Math.random() * 70, r: Math.random() * TAU, vr: (Math.random() - 0.5) * 6, c: ['#ff5f8f', '#ffd36b', '#5fd6b3', '#7d86ff', '#ffffff', '#ff8a4d'][Math.floor(Math.random() * 6)] });
        for (let i = ST.sprinkles.length - 1; i >= 0; i--) { const s = ST.sprinkles[i]; s.y += s.vy * dt; s.r += s.vr * dt; s.x += Math.sin(t + i) * 10 * dt; if (s.y > M.H + 10) { ST.sprinkles.splice(i, 1); continue; } g.save(); g.translate(s.x, s.y); g.rotate(s.r); g.fillStyle = s.c; rr(g, -3.2, -1, 6.4, 2, 1); g.fill(); g.restore(); }
      }

      /* ---------------- flow ---------------- */
      function pipeGuide(delay) {
        const s0 = firstUncovered(), ck = ST.cake; if (!s0 || !ck) return;
        const i0 = ck.guide.indexOf(s0); let j = i0; while (j < ck.guide.length - 1 && ck.guide[j + 1].s === s0.s && Math.hypot(ck.guide[j + 1].u - s0.u, ck.guide[j + 1].v - s0.v) * M.k < 64) j++;
        const a = toPx(s0.u, s0.v), b = toPx(ck.guide[j].u, ck.guide[j].v);
        const lbl = ck.o.kind === 'expB' && ck.pct >= 80 ? 'FILL THE GLOWING GAPS' : ck.pct > 0 ? 'KEEP PIPING' : 'PIPE ALONG THE DOTS';
        K.guide({ id: 'pipe' + ck.o.n + ':' + Math.round(ck.pct / 10), g: 'drag', target: () => { const p = firstUncovered(); return p ? toPx(p.u, p.v) : a; }, dx: b.x - a.x, dy: b.y - a.y, label: lbl, place: 'below', delay: delay == null ? 800 : delay });
      }
      function serveGuide() {
        const ck = ST.cake; if (!ck) return;
        const lbl = ck.o.kind === 'expA' ? 'SERVE IT AT ABOUT 80%' : ck.o.kind === 'expB' ? 'PERFECT! NOW SERVE' : 'SERVE WHEN IT’S GOOD';
        K.guide({ id: 'serve' + ck.o.n, g: 'tap', target: serve, label: lbl, place: M.ph ? 'below' : 'above', delay: 600 });
      }
      K.tap(serve, () => onServe());
      function setTicket(o) {
        ticket.style.opacity = '1';
        ticketIn.replaceChildren(...[h('small', { text: 'ORDER #' + o.n }), h('b', { text: o.d.name }), h('span', { text: o.f.name }), o.twin || o.kind === 'expA' ? h('i', { text: o.kind === 'expA' ? 'Twin 1' : 'Twin 2' }) : null].filter(Boolean));
        ticket.classList.remove('swap'); void ticket.offsetWidth; ticket.classList.add('swap');
      }
      async function enter(c) {
        c.el.hidden = false; c.here = true; c.base('happy');
        c.place(M.W + 30, M.cust.y); await K.wait(40);
        SND.door(); c.place(M.cust.x, M.cust.y, 650); await K.wait(720); c.react('bounce');
      }
      async function leave(c) { c.hush(); c.here = false; c.place(M.W + 40, M.cust.y, 600); await K.wait(650); c.el.hidden = true; }
      async function runOrder(o) {
        ST.order = o;
        const c = cust(o.who);
        if (!o.twin) await enter(c); else c.base('happy');
        setTicket(o);
        resetHud(); newCake(o); ST.cake.slide = now();
        ST.phase = 'order'; /* the design shows straight away, and the player may start piping while the customer is still ordering */
        if (A.ctx) A.whoosh({ vol: 0.08, dur: 0.4 });
        if (o.kind === 'expB') { c.face('determined', 1200); }
        else if (o.who === 'rush') say(c, L(LINES.rushA, { d: o.d.name }), { mood: 'happy' });
        else say(c, L(HELLO[o.who] || HELLO.still, { d: o.d.name }), { mood: 'happy' });
        if (o.kind === 'twist' && visits >= 1 && visits <= 3) K.later(() => { if (ST.order === o && !ST.cake.tStart) say(patch, L(LINES.newRegular, { n: NAMES[o.who] }), { mood: 'wow', ms: 2400 }); }, 2900);
        { const w0 = performance.now(), wait = o.kind === 'expB' ? 600 : 2600; while (performance.now() - w0 < wait && ST.phase === 'order') await K.wait(60); }
        const pl = o.kind === 'expA' ? (o.n === 1 ? LINES.expA1 : LINES.expA) : o.kind === 'expB' ? LINES.expB : o.kind === 'twist' ? LINES.free : (o.n === 1 ? LINES.intro : LINES.free);
        if (!(o.kind === 'twist' && visits >= 1 && visits <= 3)) say(patch, L(pl), { mood: o.kind === 'expB' ? 'determined' : 'happy' });
        else K.later(() => { if (ST.order === o && !ST.cake.tStart) say(patch, L(pl), { mood: 'happy' }); }, 2600);
        ST.phase = 'pipe';
        pipeGuide(1200);
        if (o.kind === 'expB') { ST.rushNag = K.later(() => { if (ST.order === o && ST.phase === 'pipe') { c.face('sleepy', 2600); say(c, L(LINES.rushWait), { mood: 'sleepy', ms: 2600 }); } }, 14000); }
        await new Promise(res => { o.resolve = res; });
        if (ST.rushNag) { S.cancel(ST.rushNag); ST.rushNag = null; }
      }
      async function onServe() {
        const ck = ST.cake; if (ST.phase !== 'pipe' || !ck || ck.pct < MINSERVE) return;
        serve.classList.add('down'); K.later(() => serve.classList.remove('down'), 140);
        if (PIPE.down) pipeUp();
        ST.phase = 'serve'; K.guide(null);
        ck.served = true; ck.tEnd = now(); const secs = ck.tStart ? ck.tEnd - ck.tStart : 0;
        hTimeT.textContent = fmt(secs);
        ck.live.forEach(s => { s.done = true; s.baked = true; }); ck.live = [];
        ck.topping = true; rebakeIcing();
        K.sfx.ok(); SND.bell(); SND.sprinkle(); serve.hidden = true;
        P.emit('star', M.cake.cx, M.cake.cy - M.cake.ry, 14, { colors: ['#fff6d8', '#ffd36b', '#ff8fb1'] });
        const o = ck.o, c = cust(o.who);
        const made = { kind: o.kind, who: o.who, d: o.d, f: o.f, pct: ck.pct, hearts: ck.hearts, secs, thumb: thumb() };
        ST.made.push(made);
        ctx.track('serve', { n: o.n, pct: ck.pct, hearts: ck.hearts, s: Math.round(secs) });
        await K.wait(500);
        if (o.kind === 'twist') await critic(o, c);
        const px = M.cust.x - (M.ph ? 46 : 70), py = M.counter - (M.ph ? 6 : 10);
        ST.plate = { t0: now(), x: px, y: py, s: M.ph ? 0.3 : 0.28, bite: 0 }; ck.gone = true;
        if (A.ctx) A.whoosh({ vol: 0.1, dur: 0.45 });
        await K.wait(800);
        c.face('wow', 600); await K.wait(450);
        SND.munch(); P.emit('dust', px, py - 10, 8, { colors: [o.f.side, o.f.icing, '#fff4e6'] }); ST.plate.bite = 0.5;
        await K.wait(400);
        const exp = o.kind === 'expA' || o.kind === 'expB';
        const line = o.kind === 'twist' ? L(LINES.twistYum) : exp && ck.hearts >= 5 ? L(LINES.yum) : ck.hearts >= 5 ? L(LINES.react5) : ck.hearts >= 3 ? L(LINES.react3) : L(LINES.react1);
        made.line = line;
        SND.mmm(); say(c, line, { mood: ck.hearts >= 5 ? 'love' : ck.hearts >= 3 ? 'happy' : 'wink', ms: 2800 }); c.react('bounce');
        burstHearts(M.cust.x + M.cust.s / 2, M.cust.y + 10, ck.hearts * 2 + 2);
        await K.wait(2600);
        if (o.kind === 'twist') { say(patch, L(LINES.critic), { mood: 'wink', ms: 3200 }); await K.wait(1600); }
        ST.plate.fade = now();
        const next = orders[orders.indexOf(o) + 1];
        if (!(next && next.twin) && o.kind !== 'expB') await leave(c); /* Rush stays for the verdict on the twins */
        o.resolve();
      }
      function thumb() {
        const bo = bodyOrigin(), c = M.cake, tw = M.ph ? 132 : 170, sc = tw / (c.rx * 2.5), th = Math.round((c.ry * 2 + c.side + 70) * sc);
        const t = document.createElement('canvas'), d = Math.min(2, cv.dpr || 1); t.width = Math.round(tw * d); t.height = Math.round(th * d);
        const g = t.getContext('2d'); g.setTransform(d * sc, 0, 0, d * sc, 0, 0); g.translate(-(c.cx - c.rx * 1.25), -(c.cy - c.ry - 26));
        const io = icingOrigin(); if (body.width > 2) g.drawImage(body, bo.x, bo.y, bo.w, bo.h); if (icing.width > 2) g.drawImage(icing, io.x, io.y, io.w, io.h);
        return t;
      }
      async function critic(o, c) {
        ST.phase = 'critic'; ticket.style.opacity = '0';
        const ck = ST.cake;
        let sm = ck.mess.length ? ck.mess.reduce((a, b) => (Math.hypot(b.u, b.v) > Math.hypot(a.u, a.v) ? b : a)) : null;
        if (!sm) { const s = ck.strokes.find(x => x.beads.length) ; sm = s ? s.beads[Math.floor(s.beads.length * 0.6)] : { u: 20, v: 6 }; }
        const sp = toPx(sm.u, sm.v);
        /* the lens hovers over the cake and magnifies the smudge; its shout sits on the counter rail, clear of every character */
        const cx = M.ph ? clamp(sp.x + (sp.x < M.W / 2 ? 46 : -46), 72, M.W - 112) : clamp(sp.x - 60, 90, M.W - 140);
        const cy = M.ph ? Math.max(M.counter + 150, M.cake.cy - 6) : clamp(sp.y - 110, M.counter + 80, M.H - 220);
        ST.critic = { t0: now(), mode: 'in', x: cx, y: cy, sx: sp.x, sy: sp.y };
        SND.ahem(); await K.wait(950);
        ST.critic.mode = 'hover'; ST.critic.hoverT = now(); SND.zoom(); c.face('surprised', 1400);
        await K.wait(700);
        const quote = criticQuote();
        const bub = h('div', { class: 'gb-critic' }, h('b', { text: 'WAIT! A SMUDGE!' }), quote ? h('span', { class: 'gk-user', text: '“' + quote + '”' }) : h('span', { text: 'It isn’t PERFECT!' }));
        el.append(bub);
        /* phone: on the counter rail above the lens; desktop: beside the lens (left if it fits), below the shop band where the customer talks */
        const bw = Math.min(M.ph ? 320 : 290, M.W - 24), lr = 58 + 18;
        const bx = M.ph ? clamp(cx - bw / 2, 12, M.W - bw - 12) : (cx - lr - bw >= 12 ? cx - lr - bw : Math.min(M.W - bw - 12, cx + lr));
        const by = M.ph ? M.counter + 10 : clamp(cy - 54, M.counter + 24, M.H - 160);
        Object.assign(bub.style, { left: bx + 'px', top: by + 'px', width: bw + 'px' });
        SND.sting(); ctx.track('critic', { quote: quote ? 1 : 0 });
        await K.wait(2600);
        say(c, L(LINES.whatSmudge), { mood: 'confused', ms: 2400 });
        await K.wait(2000);
        bub.style.transition = 'opacity .3s ease'; bub.style.opacity = '0'; K.later(() => bub.remove(), 320);
        ST.critic.mode = 'out'; ST.critic.t0 = now(); SND.trombone();
        await K.wait(600);
      }
      function criticQuote() {
        if (care() || !String(ctx.text || '').trim()) return '';
        const spans = (Array.isArray(an.spans) ? an.spans : []).filter(s => s && typeof s.quote === 'string' && s.quote.trim());
        const dq = (Array.isArray(an.distortions) ? an.distortions : []).filter(d => d && ['should', 'all_or_nothing', 'labelling'].indexOf(d.type) >= 0 && d.quote).map(d => String(d.quote).toLowerCase());
        let s = spans.find(sp => dq.some(q => sp.quote.toLowerCase().indexOf(q) >= 0));
        if (!s) s = spans.find(sp => /\b(perfect\w*|should(n'?t)?|must|have to|good enough|not enough|mess(ed)? up|ruin\w*)\b/i.test(sp.quote));
        return s ? clip(s.quote.trim(), 64) : '';
      }
      function placeCard(cd) { const top = M.ph ? M.counter + 8 : Math.round(M.H * 0.24); cd.style.top = top + 'px'; }
      async function compare() {
        const a = ST.made.find(m => m.kind === 'expA'), b = ST.made.find(m => m.kind === 'expB'); if (!a || !b) return;
        ST.phase = 'compare';
        const hs = (n) => { const w = h('i'); for (let i = 0; i < 5; i++) w.insertAdjacentHTML('beforeend', SVG_HEART.replace('<svg ', '<svg class="' + (i < n ? '' : 'off') + '" ')); return w; };
        const pic = (m) => { if (!m.thumb) return null; const c2 = document.createElement('canvas'); c2.width = m.thumb.width; c2.height = m.thumb.height; c2.getContext('2d').drawImage(m.thumb, 0, 0); c2.setAttribute('aria-hidden', 'true'); return c2; };
        const col = (m) => h('div', { class: 'gb-col' }, pic(m), h('em', { text: m.pct + '%' }), hs(m.hearts), h('span', { text: '“' + (m.line || '') + '”' }), h('small', null, h('span', { html: SVG_CLOCK, style: { display: 'inline-flex' } }), document.createTextNode(fmt(m.secs))));
        const ratio = a.secs > 0.5 ? b.secs / a.secs : 0, same = a.hearts === b.hearts;
        const rx = ratio >= 1.25 ? (Math.round(ratio * 10) / 10).toString().replace(/\.0$/, '') : '';
        const msg = same ? (rx ? 'Same delight. ' + rx + '× the time.' : 'Same delight either way.') : 'Delight: ' + a.hearts + ' vs ' + b.hearts + ' hearts.';
        const btn = h('button', { type: 'button', class: 'gb-btn', text: 'NEXT ORDER' });
        const card = h('div', { class: 'gb-card', role: 'dialog', 'aria-label': 'The experiment' }, h('small', { text: 'THE EXPERIMENT' }), h('b', { text: 'Rush’s twin cakes' }), h('div', { class: 'gb-cols' }, col(a), h('span', { class: 'gb-vs', text: 'vs' }), col(b)), h('p', { text: msg }), btn);
        el.append(card); ST.card = card; placeCard(card);
        K.sfx.great();
        say(patch, !same ? L(LINES.cmpDiff) : rx ? L(LINES.cmp, { x: rx }) : L(LINES.cmpSame), { mood: 'idea', ms: 4200 });
        ctx.track('experiment', { a: a.pct, b: b.pct, r: Math.round(ratio * 10) });
        K.guide({ id: 'cmp', g: 'tap', target: btn, label: 'ON TO THE NEXT ORDER', place: 'below', delay: 1600 });
        await new Promise(res => { K.tap(btn, () => { K.sfx.tap(); res(); }); });
        K.guide(null); card.style.transition = 'opacity .3s ease'; card.style.opacity = '0'; await K.wait(320); card.remove(); ST.card = null;
        const r = cust('rush'); if (r.here) await leave(r);
      }
      async function taskStep() {
        ST.phase = 'task'; ST.cake = null; resetHud(); hud.style.transition = 'opacity .4s'; hud.style.opacity = '0.0'; ticket.style.opacity = '0';
        /* the task noun comes only from the player's own words as quoted in the analysis (never invented, never in care mode) */
        const src = (Array.isArray(an.spans) ? an.spans : []).map(x => (x && typeof x.quote === 'string' ? x.quote : '')).join(' · ');
        const m = !care() && String(ctx.text || '').trim() ? TASKS.exec(src) : null;
        const word = m ? (/^[A-Z]{2,4}$/.test(m[0]) ? m[0] : m[0].toLowerCase()) : '';
        const t = word ? 'the ' + word : '';
        ST.task = t;
        const q = t ? h('b', null, 'What would 80% look like for the ', h('span', { class: 'gk-user', text: word }), '?') : h('b', { text: 'What would 80% look like for the thing you’re polishing?' });
        const steps = (t ? STEPS_T : STEPS_G).map(s => s.split('{t}').join(t));
        const chips = steps.map((s) => h('button', { type: 'button', class: 'gb-chip', text: s }));
        const card = h('div', { class: 'gb-card', role: 'group', 'aria-label': 'Your real-life order' }, h('small', { text: 'YOUR REAL-LIFE ORDER' }), q, h('div', { class: 'gb-chips' }, ...chips));
        if (care()) card.append(h('p', { class: 'gb-care', text: S.safety.CARE_LINE }));
        el.append(card); ST.card = card; placeCard(card);
        say(patch, L({ Jolly: 'Your turn. Pick one done-step for real life.', Cheeky: 'Real life time. Pick one.', Unfiltered: 'Pick one done-step.' }), { mood: 'idea', ms: 3600 });
        K.guide({ id: 'task', g: 'choose', target: () => { const r = K.rectIn(chips[chips.length - 1]); return { x: r.x + r.w * 0.7, y: r.y + r.h }; }, label: 'PICK ONE DONE-STEP', place: 'below', delay: 1200 });
        const pick = await new Promise(res => { chips.forEach((b, i) => K.tap(b, () => res(i))); });
        K.guide(null); K.sfx.great();
        chips.forEach((b, i) => b.classList.add(i === pick ? 'pick' : 'gone'));
        ST.step = steps[pick];
        ctx.track('donestep', { i: pick, task: t ? 1 : 0 });
        await K.wait(900);
        card.style.transition = 'opacity .35s ease'; card.style.opacity = '0'; await K.wait(360); card.remove(); ST.card = null;
      }
      async function closing() {
        ST.phase = 'closing'; ST.order = null;
        pad.style.pointerEvents = 'none';
        ST.sunset = true; bgKey = '';
        sign.classList.add('closed'); SND.flip(); SND.door();
        const n = ST.made.length;
        ST.case = Object.assign({ t0: now() + 0.4 }, caseGeom(n));
        MUS.big = true; MUS.vol = 0.9;
        await K.wait(900);
        K.sfx.win();
        if (M.ph) patch.side('below');
        say(patch, L(LINES.close), { mood: 'celebrate', ms: 0, moodMs: 0 }); patch.react('bounce');
        ST.sprinkleOn = true;
        await K.wait(Math.max(1700, 700 + n * 420));
        const ord = h('div', { class: 'gb-order' }, h('small', { text: 'TODAY’S ORDER FOR YOU' }), h('span', { text: ST.step || 'One good-enough thing, then stop.' }));
        ST.ordEl = ord; placeOrd();
        el.append(ord); SND.bell();
        await K.wait(K.reduced() ? 2400 : 5200);
      }
      function placeOrd() { if (ST.ordEl && ST.case) ST.ordEl.style.top = Math.round(Math.min(M.H - 96, ST.case.r.y + ST.case.r.h + 20)) + 'px'; }
      const NOTE = { free1: 'Made my day!', expA: 'Delicious!', expB: 'Delicious!', twist: 'Best cake all week!' };
      function placeNote(nt) { const sl = ST.case && ST.case.slots[nt.i]; if (!sl) return; nt.el.style.left = clamp(sl.x, 64, M.W - 64) + 'px'; nt.el.style.top = Math.round(sl.shelf + 9) + 'px'; }
      function showNote(i) {
        const m = ST.made[i]; if (!m) return;
        const txt = m.hearts >= 5 ? NOTE[m.kind] || 'Thank you!' : m.hearts >= 3 ? 'So tasty, thanks!' : 'Still tasty!';
        const e = h('div', { class: 'gb-note', style: { '--r': (i % 2 ? 2.5 : -2.5) + 'deg' } }, h('b', { text: txt }), h('span', { text: '— ' + (NAMES[m.who] || '') + ' · ' + m.pct + '%' }));
        el.append(e); const nt = { el: e, i }; ST.notes.push(nt); placeNote(nt);
      }
      function finishGame() {
        if (ST.finished) return; ST.finished = true;
        const served = ST.made, n = served.length;
        const ge = served.filter(m => m.kind !== 'expB' && m.pct >= MAXP && m.pct <= 94 && m.hearts >= 5).length;
        const elig = served.filter(m => m.kind !== 'expB').length || 1;
        const a = served.find(m => m.kind === 'expA'), b = served.find(m => m.kind === 'expB');
        const expDone = !!(a && b && b.pct >= 100);
        const tier = K.tier(0.7 * (ge / elig) + 0.3 * (expDone ? 1 : 0.5), [0.4, 0.65, 0.85]);
        const badges = [];
        if (tier) badges.push(tier + ' baker');
        const best = K.best('good-enough', ge, 'higher');
        if (best.isNew) badges.push('New best: ' + ge + ' good-enough cakes'); else if (best.first && ge) badges.push('Good-enough cakes: ' + ge);
        let collected = null; served.forEach(m => { const c = K.collect('Design: ' + m.d.name); if (c.isNew && !collected) collected = { name: m.d.name, count: c.items.filter(x => /^Design: /.test(x)).length }; });
        if (collected) badges.push('Collected: ' + collected.name + ' (' + Math.min(collected.count, DESIGNS.length) + '/' + DESIGNS.length + ')');
        if (a && b && b.secs > a.secs + 3) badges.push('Time saved at 80%: ' + fmt(b.secs - a.secs));
        const cmpLine = a && b ? a.pct + '%: ' + a.hearts + '♥ in ' + fmt(a.secs) + ' · ' + b.pct + '%: ' + b.hearts + '♥ in ' + fmt(b.secs) : 'Every customer delighted';
        ctx.track('done', { n, ge, tier: tier || 'none' });
        ctx.finish({
          title: 'Closing time: everyone was delighted', mood: 'celebrate',
          lines: ['Served ' + n + ' cake' + (n === 1 ? '' : 's') + ', ' + served.filter(m => m.hearts >= 5).length + ' with full hearts', cmpLine, 'Today’s order: ' + clip(ST.step || 'one good-enough thing', 70)],
          share: 'Served ' + n + ' good-enough cakes. Customers rated them the same as the perfect one.',
          badges: badges.slice(0, 4)
        });
      }

      /* ---------------- the loop ---------------- */
      let lastT = now();
      K.loop(() => {
        const g = cv.g; if (!g || !M.W) return;
        const t = now(); if (SOFT && t - lastT < 0.03) return;
        const dt = Math.min(0.1, Math.max(0.001, t - lastT)); lastT = t;
        musicTick(t);
        pipeTick(dt, t);
        renderBg(); renderBody(); if (icingDirty && ST.cake) rebakeIcing();
        g.drawImage(bg, 0, 0, M.W, M.H);
        drawWindowLife(g, t, dt);
        const ck = ST.cake;
        if (ck && !ck.served && ST.phase !== 'task') {
          const k = clamp((t - ck.slide) / 0.55, 0, 1), off = (1 - outBack(k)) * -M.W * 0.7;
          if (k < 1) { g.save(); g.translate(off, 0); drawCakeAt(g, M.cake.cx, M.cake.cy, 1); g.restore(); }
          else { drawCakeAt(g, M.cake.cx, M.cake.cy, 1); drawGuide(g, t); drawLive(g, t); }
        } else if (ck && ck.served && !ck.gone && ST.phase !== 'task') drawCakeAt(g, M.cake.cx, M.cake.cy, 1); /* stays put until it is carried over */
        drawPlate(g, t);
        drawCase(g, t);
        drawBag(g, t, dt);
        drawCritic(g, t);
        P.update(dt); P.draw(g);
        drawHearts(g, dt);
        drawSprinkles(g, t, dt);
      });
      cv.onResize(() => layout());
      S.on('theme', () => { bgKey = ''; cakeKey = ''; });
      try { if (document.fonts) S.listen(document.fonts, 'loadingdone', () => { bgKey = ''; }); } catch (e) { /* no font events */ }

      /* ---------------- start ---------------- */
      (async () => {
        await K.intro({ title: 'Good Enough Bakery', sub: 'Customers are queuing. The Perfect-o-meter keeps climbing. Their smiles stop at good enough.', how: 'Drag to pipe icing along the dots. Tap SERVE whenever you decide it’s good enough.', char: 'rush', mood: 'happy' });
        try { const a2 = await Promise.race([ctx.analysisReady, K.wait(600).then(() => null)]); if (a2 && typeof a2 === 'object' && Array.isArray(a2.spans)) an = a2; } catch (e) { /* keep the local reading */ }
        MUS.t0 = now() + 0.1; MUS.next = 0; MUS.on = true;
        for (const o of orders) { await runOrder(o); if (o.kind === 'expB') await compare(); }
        await taskStep();
        await closing();
        finishGame();
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const s0 = performance.now(); while (!fn() && performance.now() - s0 < (ms || 30000)) await K.wait(50); return fn(); };
          await K.wait(600);
          const card = el.querySelector('.gk-intro'); if (card) await K.sim.tap(card);
          /* pipe along the guide like a person would, stopping at the target percentage */
          const trace = async (ck, target) => {
            let pr = K.rectIn(pad);
            for (let si = 0; si < ck.design.length && ck.pct < target && ST.cake === ck; si++) {
              const pts = ck.guide.filter((p, i) => p.s === si && !ck.cov[i]); if (pts.length < 2) continue;
              pr = K.rectIn(pad);
              const p0 = toPx(pts[0].u, pts[0].v); let lx = p0.x - pr.x, ly = p0.y - pr.y;
              const h2 = await K.sim.press(pad, lx, ly);
              for (let i = 1; i < pts.length; i++) { const p = toPx(pts[i].u, pts[i].v); lx = p.x - pr.x; ly = p.y - pr.y; h2.move(lx, ly); await K.wait(16); if (ck.pct >= target) break; }
              await K.wait(40); h2.up(lx, ly); await K.wait(160);
            }
            for (let guard = 0; guard < 60 && ck.pct < target && ST.cake === ck && ST.phase === 'pipe'; guard++) {
              const p = firstUncovered(); if (!p) break; const q = toPx(p.u, p.v);
              const h3 = await K.sim.press(pad, q.x - pr.x, q.y - pr.y); await K.wait(150); h3.up(q.x - pr.x, q.y - pr.y); await K.wait(90);
            }
          };
          const goal = (o) => (o.kind === 'expA' ? 80 : o.kind === 'expB' ? 100 : o.kind === 'twist' ? 74 : 84);
          let lastCake = null, tasked = false;
          const t0 = performance.now();
          while (!ST.finished && performance.now() - t0 < 240000) {
            if (ST.phase === 'pipe' && ST.cake && !ST.cake.served && ST.cake !== lastCake) {
              const ck = lastCake = ST.cake;
              await K.wait(800);
              await trace(ck, goal(ck.o));
              await until(() => !serve.hidden || ST.cake !== ck, 6000);
              await K.wait(450);
              if (ST.phase === 'pipe' && ST.cake === ck) await K.sim.tap(serve);
            } else if (ST.phase === 'compare' && ST.card) {
              await K.wait(1800);
              const b = ST.card && ST.card.querySelector('.gb-btn'); if (b) await K.sim.tap(b);
              await until(() => ST.phase !== 'compare', 4000);
            } else if (ST.phase === 'task' && ST.card && !tasked) {
              tasked = true; await K.wait(1600);
              const chip = ST.card && ST.card.querySelector('.gb-chip'); if (chip) await K.sim.tap(chip);
            }
            await K.wait(100);
          }
        }
      };
    }
  });
})(window.TSG_ENV);
