/* 033 Don’t Open It — Reframe · REFRAME · Uncertainty / Future Worry / Reassurance
 * Mechanism: reducing reassurance-seeking and checking (intolerance of uncertainty; Dugas, Ladouceur and colleagues).
 * A check soothes for a moment and keeps the worry alive, so the next urge comes back bigger; letting the question sit
 * while doing something absorbing lets each urge rise and fall on its own (exposure with response prevention, urge
 * surfing) and teaches that you can handle not knowing. When the facts genuinely back the worry, one planned step
 * (problem-solving, done once) is kept apart from checking (done over and over).
 * Verb: resist (one experimental shake, then drag the box to the shelf and tap through small cosy tasks while the box
 * hops down to tempt you: shelve it again, or simply let the urge pass). Twist: the box opens by itself, and inside is a
 * note: "You were okay not knowing." Finale: sunset pours through the window, everything you tended glows in turn, and
 * the box shrinks into an ordinary ornament on the shelf while Loopie dozes beside it.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const hexRgb = (hx) => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hx || ''); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [128, 128, 128]; };
  const mixC = (a, b, k) => { const A = hexRgb(a), B = hexRgb(b); return '#' + [0, 1, 2].map(i => Math.max(0, Math.min(255, Math.round(A[i] + (B[i] - A[i]) * k))).toString(16).padStart(2, '0')).join(''); };
  const shade = (a, k) => (k < 1 ? mixC(a, '#000000', 1 - k) : mixC(a, '#ffffff', k - 1));
  const rgba = (hx, a) => { const c = hexRgb(hx); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  function rr(g, x, y, w, hh, r) { r = Math.max(0, Math.min(r, w / 2, hh / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function poly(g, p) { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); }

  /* Daily rooms: palette, weather in the window, today's to-do objects and their collectable names. */
  const ROOMS = [
    { key: 'sunday', name: 'Sunday Studio', shell: '#f1e7d8', wall: '#f3e2c4', wall2: '#e8cfa5', pat: 'stripe', ceil: '#ead8b8', side: '#e2c9a0', wood: '#b47c4f', woodL: '#d6a06c', woodD: '#7a4e30', floor: '#c48f62', floorL: '#d8a676',
      rug: '#cf6b52', rug2: '#f3d3a2', curtain: '#8eae88', kettle: '#c9784b', cup: '#f6f1e6', tea: '#b5652b', vinyl: '#e2b04a', frameWood: '#8a5a36', can: '#6f9bb3', cat: '#e0904a',
      paint: ['#86c5e8', '#f7e6b5', '#5f9e8f', '#f2c46b'], sky: 'clear', amb: 'dawn', flower: '#ff8a7a', books: ['#3d6e8f', '#d9a441', '#8f4a5a', '#5f8f6a'],
      tasks: ['plant', 'frame', 'tea', 'record', 'books', 'candle'],
      items: { plant: 'Monstera', frame: 'Seaside painting', tea: 'Copper kettle', record: 'Sunday jazz record', books: 'Poetry stack', candle: 'Honey candle', phone: 'Knitted phone cosy', note: 'Lined notepad' } },
    { key: 'rainy', name: 'Rainy Reading Nook', shell: '#e7eaee', wall: '#cfdae0', wall2: '#bdcbd4', pat: 'dots', ceil: '#c3cfd6', side: '#b6c5ce', wood: '#8d5f3f', woodL: '#b0805a', woodD: '#5e3d27', floor: '#9c6d4b', floorL: '#b4845f',
      rug: '#3f7f86', rug2: '#e8c77a', curtain: '#d9a25a', kettle: '#4f7fa8', cup: '#fbf6ec', tea: '#a3612e', vinyl: '#d9604c', frameWood: '#5e3d27', can: '#d0743c', cat: '#8f8f98',
      paint: ['#9fb4c9', '#e9eef2', '#4d6a7f', '#f2d27a'], sky: 'rain', amb: 'rain', flower: '#f2d27a', books: ['#7a3b4a', '#2f5d6e', '#c98f3a', '#4f4a7a'],
      tasks: ['candle', 'tea', 'books', 'record', 'plant', 'frame'],
      items: { plant: 'Maidenhair fern', frame: 'Lighthouse print', tea: 'Blue teapot', record: 'Rainy-day blues', books: 'Mystery novels', candle: 'Lavender candle', phone: 'Woolly phone cosy', note: 'Rainproof notebook' } },
    { key: 'autumn', name: 'Autumn Den', shell: '#f0e2d2', wall: '#ecc6a2', wall2: '#e0b28a', pat: 'leaf', ceil: '#e3bf9b', side: '#d9b089', wood: '#8f5a39', woodL: '#b37a4b', woodD: '#5f3a24', floor: '#a8714a', floorL: '#bf8759',
      rug: '#8e3b46', rug2: '#e9b45c', curtain: '#c8643a', kettle: '#3a3330', cup: '#f3e9da', tea: '#9c5428', vinyl: '#e9b45c', frameWood: '#4f2f1c', can: '#5f8a5a', cat: '#3a3536',
      paint: ['#f0b46a', '#f7dcb0', '#b5532e', '#6b8a4a'], sky: 'leaves', amb: 'room', flower: '#f0904a', books: ['#6b8a4a', '#b5532e', '#2f4a6b', '#d9a441'],
      tasks: ['record', 'plant', 'candle', 'frame', 'tea', 'books'],
      items: { plant: 'Rubber plant', frame: 'Harvest painting', tea: 'Cast-iron kettle', record: 'Autumn folk record', books: 'Cookbook stack', candle: 'Cinnamon candle', phone: 'Tweed phone cosy', note: 'Leather notebook' } },
    { key: 'snow', name: 'Snowy Cabin', shell: '#ece6de', wall: '#bd8f64', wall2: '#a97b53', pat: 'panel', ceil: '#a47652', side: '#9c6f4b', wood: '#7f5233', woodL: '#a2704a', woodD: '#553521', floor: '#8a5c3c', floorL: '#a3704b',
      rug: '#b8343c', rug2: '#f4ede2', curtain: '#efe5d3', kettle: '#c8343c', cup: '#fbf7ef', tea: '#8a4a24', vinyl: '#f4ede2', frameWood: '#4a2d1a', can: '#3f6f8f', cat: '#f2f0ea',
      paint: ['#cfe0ef', '#ffffff', '#5d7d9a', '#f2c46b'], sky: 'snow', amb: 'room', flower: '#ff6f7a', books: ['#2f5d4a', '#b8343c', '#d9b25a', '#3b4f7a'],
      tasks: ['tea', 'candle', 'books', 'frame', 'record', 'plant'],
      items: { plant: 'Winter cactus', frame: 'Mountain sketch', tea: 'Red enamel kettle', record: 'Fireside record', books: 'Adventure books', candle: 'Pine candle', phone: 'Fair Isle phone cosy', note: 'Field notebook' } },
    { key: 'garden', name: 'Garden Room', shell: '#eef0e6', wall: '#dde8d2', wall2: '#cbdbbd', pat: 'trellis', ceil: '#d3dfc6', side: '#c6d6b6', wood: '#c39a6b', woodL: '#dcb88a', woodD: '#8c6a45', floor: '#cfae84', floorL: '#ddc19a',
      rug: '#e0a43c', rug2: '#fff3d6', curtain: '#f2b6b0', kettle: '#7fae8a', cup: '#fffaf0', tea: '#c07a3a', vinyl: '#7fae8a', frameWood: '#8c6a45', can: '#e07a5f', cat: '#e0904a',
      paint: ['#bfe3f2', '#f7f0d0', '#6aa86a', '#f29a8a'], sky: 'clear', amb: 'dawn', flower: '#f2789a', books: ['#e0a43c', '#6aa86a', '#d9605c', '#4f7fa8'],
      tasks: ['plant', 'books', 'record', 'tea', 'frame', 'candle'],
      items: { plant: 'Fiddle-leaf fig', frame: 'Botanical print', tea: 'Mint teapot', record: 'Birdsong record', books: 'Garden almanacs', candle: 'Rose candle', phone: 'Floral phone cosy', note: 'Seed notebook' } }
  ];
  /* The box's wrapping changes with each visit (a collection that fills by coming back, never by chance). */
  const WRAPS = [
    { key: 'Teal and gold wrap', base: '#2e8c89', ribbon: '#f3c34f', pat: 'dots', light: '#ffe29a' },
    { key: 'Plum and silver wrap', base: '#7b4a93', ribbon: '#eef0f6', pat: 'stars', light: '#ffd6f0' },
    { key: 'Candy-stripe wrap', base: '#e04f5f', ribbon: '#fff4e2', pat: 'stripes', light: '#ffe2c4' },
    { key: 'Kraft and twine wrap', base: '#c79a62', ribbon: '#8a4f2c', pat: 'none', light: '#ffe6b0' },
    { key: 'Midnight-stars wrap', base: '#2a3a6e', ribbon: '#f0c45a', pat: 'stars', light: '#fff0b8' }
  ];
  const SKY = { // [bright, dark] × [afternoon, golden hour, sunset] × [top, bottom]
    clear: [[['#8cc5ee', '#e4f3fb'], ['#efb57a', '#ffe6b5'], ['#6f4f98', '#ffb26a']], [['#33406e', '#8b8db5'], ['#6a4c86', '#e99e78'], ['#2a2152', '#f0895c']]],
    rain: [[['#8796a6', '#c6d0da'], ['#c3a892', '#f2dcc0'], ['#6e5a8f', '#f7b37a']], [['#2c3447', '#5d6880'], ['#5a4a6e', '#c98a76'], ['#261f48', '#e8865e']]],
    leaves: [[['#9cc3dc', '#f3e4c8'], ['#e9a46a', '#ffd9a6'], ['#6b3f7a', '#ff9e5e']], [['#3b3f68', '#9a8aa8'], ['#6e4a78', '#e6956a'], ['#2b1f4c', '#ee8550']]],
    snow: [[['#a9bbcf', '#e8eef5'], ['#d6b3a8', '#f6e1d6'], ['#5f5590', '#f5a08a']], [['#2e3a58', '#7d89a6'], ['#5c4f7e', '#d99a8f'], ['#28224e', '#e98a76']]]
  };
  const ICON_BOX = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v10.5H4z" fill="currentColor" opacity=".8"/><path d="M3 6.6h18v3.8H3z" fill="currentColor"/><path d="M11 6.6h2v13.9h-2z" fill="#fff" opacity=".75"/><path d="M12 6.4C10.4 3 6.8 2.9 6.8 4.9c0 1.3 2.6 1.7 5.2 1.5zm0 0c1.6-3.4 5.2-3.5 5.2-1.5 0 1.3-2.6 1.7-5.2 1.5z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  const ICON_SIT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3h11M6.5 21h11M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9.6 19.2c.8-1.6 4-1.6 4.8 0z" fill="currentColor"/></svg>';

  (env.games = env.games || []).push({
    id: 'dont-open-it', mode: 'reframe', name: 'Don’t Open It', verb: 'resist', family: 'REFRAME', minutes: 2,
    parents: ['Uncertainty / Future Worry / Reassurance', 'Urges / Habit Loops', 'Overthinking / Thought Fusion'],
    cast: ['rush', 'still', 'loopie'], poster: { char: 'rush', mood: 'worried' },
    fonts: ['DynaPuff:wght@500;700', 'Kalam:wght@400;700'],
    tagline: 'A box holds the answer. Don’t open it. Water a plant instead.',
    why: 'For checking and reassurance loops: let the question sit and watch the urge rise and fall.',
    css: `
.g-dont-open-it { --do-ink: #3a2a1e; --do-paper: #fff8ea; --do-disp: "DynaPuff", "Baloo 2", "Arial Rounded MT Bold", system-ui, sans-serif;
  --do-hand: "Kalam", "Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", cursive; }
.g-dont-open-it .do-hud { position: absolute; z-index: 26; top: calc(env(safe-area-inset-top, 0px) + 60px); left: 10px; right: 10px; display: flex; justify-content: space-between; gap: 8px; pointer-events: none; }
.g-dont-open-it .do-pill { display: flex; align-items: center; gap: 7px; padding: 5px 12px 5px 5px; border-radius: 999px; background: color-mix(in srgb, var(--ui-surface) 92%, transparent); border: 1px solid var(--ui-line);
  color: var(--ui-fg); font: 600 14px/1 var(--font-ui); box-shadow: 0 6px 16px rgba(0, 0, 0, .18); white-space: nowrap; min-width: 0; }
.g-dont-open-it .do-pill i { flex: none; width: 27px; height: 27px; border-radius: 50%; display: grid; place-items: center; background: var(--do-chip, #2e8c89); color: #fff; }
.g-dont-open-it .do-pill i svg { width: 16px; height: 16px; }
.g-dont-open-it .do-pill b { font-weight: 700; font-variant-numeric: tabular-nums; }
.g-dont-open-it .do-sit i { background: #c9874a; }
.g-dont-open-it .do-bars { display: inline-flex; align-items: flex-end; gap: 2px; height: 14px; margin-left: 2px; color: var(--do-chip, #2e8c89); }
.g-dont-open-it .do-bars b { width: 4px; border-radius: 2px; background: currentColor; opacity: .22; transition: opacity .3s ease; }
.g-dont-open-it .do-bars b:nth-child(1) { height: 30%; } .g-dont-open-it .do-bars b:nth-child(2) { height: 46%; } .g-dont-open-it .do-bars b:nth-child(3) { height: 62%; }
.g-dont-open-it .do-bars b:nth-child(4) { height: 80%; } .g-dont-open-it .do-bars b:nth-child(5) { height: 100%; }
.g-dont-open-it .do-bars b.on { opacity: 1; }
.g-dont-open-it .do-hit { position: absolute; z-index: 20; margin: 0; padding: 0; border: 0; background: transparent; border-radius: 14px; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.g-dont-open-it .do-hit:focus-visible, .g-dont-open-it .do-box:focus-visible { outline: 3px solid #ffd36b; outline-offset: 2px; }
.g-dont-open-it .do-box { position: absolute; left: 0; top: 0; z-index: 21; border-radius: 12px; touch-action: none; cursor: grab; }
.g-dont-open-it .do-label { position: absolute; left: 0; top: 0; z-index: 22; pointer-events: none; transform-origin: 50% 50%; padding: 4px 6px 5px; border-radius: 5px; background: var(--do-paper); color: var(--do-ink); text-align: center;
  box-shadow: 0 1px 0 rgba(90, 60, 30, .3), 0 5px 10px rgba(0, 0, 0, .2); transition: opacity .35s ease; }
.g-dont-open-it .do-label small { display: block; font: 700 12px/1.1 var(--do-disp); letter-spacing: .03em; text-transform: uppercase; color: #b4472e; white-space: nowrap; }
.g-dont-open-it .do-label span { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; overflow: hidden; font: 700 15px/1.12 var(--do-hand); text-wrap: balance; overflow-wrap: anywhere; }
.g-dont-open-it .do-whisper { position: absolute; left: 0; top: 0; z-index: 24; width: max-content; max-width: min(232px, 64cqw); padding: 8px 12px 9px; border-radius: 16px; background: rgba(46, 20, 52, .94); color: #ffeef7;
  font: 500 15px/1.25 var(--font-ui); pointer-events: none; opacity: 0; transition: opacity .35s ease; box-shadow: 0 8px 20px rgba(0, 0, 0, .3); }
.g-dont-open-it .do-whisper i { display: block; font: 700 12px/1.2 var(--do-disp); font-style: normal; letter-spacing: .08em; text-transform: uppercase; color: #ff9fca; margin-bottom: 2px; }
.g-dont-open-it .do-whisper::after { content: ""; position: absolute; left: calc(50% + var(--do-tail, 0px)); bottom: -6px; width: 12px; height: 12px; margin-left: -6px; background: inherit; transform: rotate(45deg); border-radius: 2px; }
.g-dont-open-it .do-whisper.on { opacity: 1; }
.g-dont-open-it .do-slip { position: absolute; z-index: 25; left: 0; top: 0; padding: 5px 10px 6px; background: var(--do-paper); color: var(--do-ink); font: 700 15px/1.15 var(--do-hand); border-radius: 4px; white-space: nowrap;
  box-shadow: 0 3px 8px rgba(0, 0, 0, .25); pointer-events: none; opacity: 0; transition: opacity .25s ease, transform .55s cubic-bezier(.2, 1.4, .4, 1); }
.g-dont-open-it .do-slip.on { opacity: 1; }
.g-dont-open-it .do-slip.doubt { color: #a8302a; background: #fff0ea; }
.g-dont-open-it .do-note { position: absolute; z-index: 40; left: 0; top: 0; width: var(--do-nw, 260px); margin: 0; padding: 12px 16px 14px; border: 0; border-radius: 6px; cursor: pointer; text-align: center; color: var(--do-ink);
  background: linear-gradient(180deg, #fffaf0, #f6e9d0); box-shadow: 0 2px 0 rgba(120, 90, 50, .25), 0 14px 30px rgba(0, 0, 0, .32); opacity: 0; transform: translateY(14px) scale(.6) rotate(-4deg);
  transition: opacity .45s ease, transform .7s cubic-bezier(.2, 1.35, .4, 1); }
.g-dont-open-it .do-note.on { opacity: 1; transform: rotate(-1.5deg); }
.g-dont-open-it .do-note.kept { transform: rotate(-2deg); padding: 9px 14px 11px; box-shadow: 0 0 0 3px #ffd36b, 0 0 26px rgba(255, 214, 140, .55), 0 10px 22px rgba(0, 0, 0, .3); }
.g-dont-open-it .do-note.kept small, .g-dont-open-it .do-note.kept span { display: none; }
.g-dont-open-it .do-note.kept b { margin-top: 0; font-size: 20px; }
.g-dont-open-it .do-note small { display: block; font: 700 12px/1.1 var(--do-disp); letter-spacing: .08em; text-transform: uppercase; color: #b4472e; }
.g-dont-open-it .do-note b { display: block; margin-top: 5px; font: 700 22px/1.12 var(--do-disp); text-wrap: balance; }
.g-dont-open-it .do-note span { display: block; margin-top: 6px; font: 500 15px/1.3 var(--font-ui); color: #5a4632; text-wrap: balance; }
.g-dont-open-it .do-note em { display: block; margin-top: 6px; font: 600 13px/1.3 var(--font-ui); font-style: normal; color: #7a5a3a; }
.g-dont-open-it .do-note:focus-visible { outline: 3px solid #ffd36b; outline-offset: 3px; }
.g-dont-open-it .do-step { position: absolute; z-index: 36; left: 0; top: 0; width: var(--do-sw, 236px); padding: 9px 12px 11px; border-radius: 3px; background: #fff6bd; color: #3a2a1e; box-shadow: 0 8px 18px rgba(0, 0, 0, .28);
  transform: rotate(-2deg); pointer-events: none; opacity: 0; transition: opacity .4s ease; }
.g-dont-open-it .do-step.on { opacity: 1; }
.g-dont-open-it .do-step small { display: block; font: 700 12px/1.1 var(--do-disp); letter-spacing: .06em; text-transform: uppercase; color: #95560a; margin-bottom: 4px; }
.g-dont-open-it .do-step span { display: block; font: 700 15px/1.22 var(--do-hand); }
.g-dont-open-it .do-step em { display: block; margin-top: 4px; font: 600 13px/1.25 var(--font-ui); font-style: normal; color: #6b4a1a; }
.g-dont-open-it .gk-char .gk-bubble { max-width: var(--do-bub, 240px); }
.g-dont-open-it .do-low .gk-bubble { top: auto; bottom: 0; }
.g-dont-open-it .do-low.gk-side-right .gk-bubble::before, .g-dont-open-it .do-low.gk-side-left .gk-bubble::before { top: auto; bottom: 18px; }
@container (min-width: 700px) { .g-dont-open-it .do-pill { font-size: 15px; } .g-dont-open-it .do-note b { font-size: 25px; } }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const clamp = K.clamp, lerp = K.lerp, now = () => performance.now();
      const L = (o) => ctx.line(o) || '';
      const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); return (sp > n * 0.6 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; };
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
      const inten = ctx.intensity;
      const care = an.safety === 'care';
      const support = an.fear_support === 'strong' ? 'strong' : an.fear_support === 'some' ? 'some' : 'weak';
      const serious = support === 'strong';
      const noWords = !String(ctx.text || '').trim();
      const visits = K.visits();
      const bright = () => S.scene() === 'bright';
      const RM = () => K.reduced();

      /* ---------------- what's on the box (the player's words only as the analysis gives them) ---------------- */
      const userBox = !noWords && !!String(an.conclusion || an.thought || '').trim();
      const boxText = userBox ? K.sentence(clip(an.conclusion || an.thought, 84)) : 'What if it all goes wrong?';
      const unknowns = noWords ? [] : (Array.isArray(an.unknowns) ? an.unknowns : []).map(u => u && u.text ? K.sentence(clip(u.text, 66)) : '').filter(Boolean);
      const WHISPERS = unknowns.slice(0, 3).concat(['Just one quick peek?', 'Don’t you want to know for sure?', 'What if you missed something?']);
      const leads = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text);
      const lead = (k) => ((leads.find(l => l.kind === k) || {}).text || '');
      const useNote = !noWords && (serious || support === 'some' || care);
      const stepText = clip(lead('prepare') || lead('ask') || 'Write down one thing you can do, and when.', 116);
      const RELIEF = serious || care ? ['A moment of relief…', 'Phew… for now.'] : ['Probably fine.', 'It’s likely nothing.', 'Phew. Probably okay.'];
      const DOUBT = serious || care ? ['…still don’t know.', '…check again?'] : ['…but what if it isn’t?', '…but are you sure?', '…but what if?'];
      const NOTE_SUB = serious ? 'It’s a real worry. You have one step for later; the rest can sit.' : support === 'some' ? 'Some of it is real. You can act on that part when it’s time.' : 'The question waited on the shelf, and you carried on.';
      const NOTE_CARE = care ? 'For the facts, ask someone qualified.' : '';

      /* ---------------- today's room, today's to-dos ---------------- */
      const room = ROOMS[3];
      const wrap = WRAPS[visits % WRAPS.length];
      el.style.setProperty('--do-chip', wrap.base);
      const NT = [3, 4, 5][inten] || 4;
      const keys = room.tasks.slice(0, NT - 1);
      if (useNote) keys.push('note'); else keys.splice(1, 0, 'phone');
      const TEMPTS = NT - 1;
      const catOn = visits >= 1;
      const STEPS = { plant: 3, frame: 3, tea: 3, record: 2, books: 4, candle: 2, phone: 2, note: 1 };
      const GUIDE = { plant: ['TAP: WATER THE PLANT'], frame: ['TAP: STRAIGHTEN IT'], tea: ['TAP: BOIL THE KETTLE', 'TAP: POUR THE TEA', 'TAP: GIVE IT A STIR'], record: ['TAP: LIFT THE ARM', 'TAP: DROP THE NEEDLE'],
        books: ['TAP: TIDY THE BOOKS'], candle: ['TAP: STRIKE A MATCH', 'TAP: LIGHT THE WICK'], phone: ['TAP: PHONE FACE DOWN', 'TAP: TUCK IT IN'], note: ['TAP: JOT ONE STEP'] };
      const ARIA = { plant: 'Water the plant', frame: 'Straighten the picture', tea: 'Make a cup of tea', record: 'Play a record', books: 'Tidy the books', candle: 'Light the candle', phone: 'Turn the phone face down and tuck it away', note: 'Jot down one useful step' };
      const SHARE = { plant: 'Watered a plant', frame: 'Straightened a picture', tea: 'Made tea', record: 'Played a record', books: 'Tidied my books', candle: 'Lit a candle', phone: 'Put my phone face down', note: 'Wrote one real step' };
      const DID = { plant: 'watered the plant', frame: 'straightened the picture', tea: 'made tea', record: 'played a record', books: 'tidied the books', candle: 'lit the candle', phone: 'put the phone away', note: 'wrote one step' };

      /* ---------------- lines (every one in three vibes) ---------------- */
      const LINES = {
        open: { Jolly: 'What’s in the box?! We have to know. Right now.', Cheeky: 'A box with OUR answer inside? Open it. Open it now.', Unfiltered: 'The answer’s in there. Open it.' },
        poke: { Jolly: 'Psst! Just one little shake?', Cheeky: 'One tiny shake. Who’d know?', Unfiltered: 'Shake it. Go on.' },
        tryShake: { Jolly: 'Go on, give it one shake. Then notice what happens next.', Cheeky: 'Fine. One shake, for science. Watch what happens after.', Unfiltered: 'Shake it once. Watch what happens.' },
        grew: { Jolly: 'Ooh! It got bigger. And louder!', Cheeky: 'It grew! I love it when it grows.', Unfiltered: 'Bigger. Louder.' },
        explain: serious
          ? { Jolly: 'This worry has real weight. Checking over and over won’t settle it; one planned step can. Shelf the box for now.', Cheeky: 'This one’s real. Re-checking won’t fix it, a plan might. Shelf the box for now.', Unfiltered: 'It’s real. Checking won’t fix it. A plan might. Shelf it.' }
          : { Jolly: 'A second of relief, then the box grows. Let’s pop it on the shelf instead.', Cheeky: 'One second of relief, then a bigger box. Classic. Shelf it.', Unfiltered: 'Relief, then bigger. Shelf it.' },
        skipShake: { Jolly: 'Straight to the shelf? That’s the whole skill, right there.', Cheeky: 'Didn’t even shake it. Show-off.', Unfiltered: 'No shake. That’s the skill.' },
        shelved: { Jolly: 'But… we still don’t KNOW.', Cheeky: 'So we just… leave it? Unopened?', Unfiltered: 'We don’t know. I hate that.' },
        shelved2: { Jolly: 'We don’t. Let’s do something nice while it sits there.', Cheeky: 'Correct. Cosy stuff while it sulks.', Unfiltered: 'Right. Do something else.' },
        tempt: { Jolly: 'Whoops! It hopped down. Here you go!', Cheeky: 'Oops. I may have nudged it. Here.', Unfiltered: 'Box. For you.' },
        temptRush: { Jolly: 'It’s RIGHT THERE. Just check!', Cheeky: 'It’s literally glowing at us!', Unfiltered: 'Check it!' },
        temptStill: { Jolly: 'Notice the urge. Keep going, or pop it back. Either way, it passes.', Cheeky: 'Urge incoming. Ignore it or shelf it. Both work.', Unfiltered: 'An urge. Let it pass.' },
        passShelf: { Jolly: 'Back on the shelf. Nicely done.', Cheeky: 'Shelved. Smooth.', Unfiltered: 'Shelved.' },
        passRide: { Jolly: 'See? The urge rose… and fell on its own.', Cheeky: 'The urge peaked, then wandered off. Like urges do.', Unfiltered: 'Rose. Fell. On its own.' },
        passLater: { Jolly: 'And it settled anyway. Urges do.', Cheeky: 'Still settled down in the end. Funny, that.', Unfiltered: 'Settled anyway.' },
        giveUp: { Jolly: 'Fine. Back up you go, box.', Cheeky: 'Nobody wants a shake? Boring.', Unfiltered: 'Fine.' },
        again: { Jolly: 'Again! Again!', Cheeky: 'Yes! Feed the loop!', Unfiltered: 'Again!' },
        afterCheck: { Jolly: 'That’s the loop: a little relief, then a bigger box. Totally normal. Let it sit now.', Cheeky: 'Relief, then a bigger box. Happens to everyone. Let it be for a bit.', Unfiltered: 'Relief, then bigger. Now let it sit.' },
        dn_plant: { Jolly: 'It perked right up. So did I, a bit.', Cheeky: 'The plant’s thriving. Unlike my patience.', Unfiltered: 'Plant’s happy.' },
        dn_frame: { Jolly: 'Perfectly straight. Weirdly satisfying.', Cheeky: 'Level. I could stare at that all day.', Unfiltered: 'Straight.' },
        dn_tea: { Jolly: 'Tea. Warm hands. Okay, this helps.', Cheeky: 'Tea fixes a surprising number of things.', Unfiltered: 'Tea’s ready.' },
        dn_record: { Jolly: 'Oh, I like this song.', Cheeky: 'Vinyl. Very sophisticated of us.', Unfiltered: 'Good song.' },
        dn_books: { Jolly: 'Tidy shelf, tidier head.', Cheeky: 'Look at them, all upright. Like a team.', Unfiltered: 'Tidy.' },
        dn_candle: { Jolly: 'Ooh, cosy. The light’s gone all warm.', Cheeky: 'Candle lit. Vibes: immaculate.', Unfiltered: 'Lit.' },
        dn_phone: { Jolly: 'Phone’s tucked in. Nothing to refresh.', Cheeky: 'No phone, no checking. Sneaky.', Unfiltered: 'Phone away.' },
        dn_note: { Jolly: 'One real step, written down once. That’s action, not checking.', Cheeky: 'A plan, written once. Not a refresh. A plan.', Unfiltered: 'One step. Written once.' },
        forgot: { Jolly: 'Huh. I haven’t thought about the box in ages.', Cheeky: 'Wait. I forgot about the box. Is that allowed?', Unfiltered: 'Forgot the box.' },
        opens: { Jolly: 'Oh! It’s opening by itself.', Cheeky: 'Well, look at that. It opened on its own.', Unfiltered: 'It opened itself.' },
        inside: { Jolly: 'No answer in there. Just a note for you.', Cheeky: 'No answer inside. Just a note. Rude, but fair.', Unfiltered: 'No answer. Just a note.' },
        fin: { Jolly: 'We never opened it. And look at this room.', Cheeky: 'Never opened it. Still here. Room looks great.', Unfiltered: 'Didn’t open it. Still fine.' },
        finStill: serious
          ? { Jolly: 'A real step for later, and a calm room now.', Cheeky: 'Plan in your pocket. Box on the shelf.', Unfiltered: 'Plan kept. Box shelved.' }
          : { Jolly: 'Not knowing, and still okay.', Cheeky: 'Unanswered and unbothered.', Unfiltered: 'Not knowing. Okay.' },
        cat: { Jolly: 'Prrrr. The cat approves.', Cheeky: 'Cat says: correct priorities.', Unfiltered: 'Purr.' }
      };

      /* ---------------- state ---------------- */
      const st = { phase: 'intro', finished: false, temptClean: true, pending: 0, doneOrder: [], whisperI: 0, lastTn: 0, fn: 0, slow: 0, q: 1, nextWig: 0, nextPeek: 0,
        openT0: 0, paper: null, sunT0: 0, chainT0: 0, notes: [], purrT: 0, catPets: 0, stepOn: 0 };
      const U = { base: [0.7, 0.78, 0.84][inten] || 0.78, itch: 0.8, wave: null, relief: null, checks: 0, tut: 0, passes: 0, tempts: 0, sat: 0 };
      const WD = { tod: 0, todT: 0, sun: 0 };
      const B = { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0, size: 0, held: false, at: 'rug', hop: null, grow: 1, gs: 1, gv: 0, rot: 0, rv: 0, sq: 0, sqv: 0, jy: 0, jv: 0,
        peek: 0, lid: 0, tip: 0, light: 0, orn: 0, labelOn: true, ex: 0, ey: 0, ew: 0, eh: 0 };
      const M = {};
      const P = K.particles({ max: 320 });
      el.__dbg = { st, U, B, M, WD };

      /* ---------------- tasks ---------------- */
      const mkTask = (key, decor) => ({ key, decor: !!decor, n: STEPS[key], d: 0, done: !!decor, busy: false, btn: null, shine: 0, tw: {},
        can: 0, grown: decor ? 3 : 0, perk: 0, perkV: 0, bloom: 0, pourUntil: 0, canBack: 0,
        ang: decor ? 0 : -0.3, av: 0, target: decor ? 0 : -0.3, glint: 0,
        heat: 0, heating: false, ready: false, pour: 0, pouring: false, fill: 0, stir: 0, steamy: 0,
        arm: 0, spin: 0, playing: false, rot: 0, noteAt: 0,
        fixed: decor ? 4 : 0, bAng: decor ? [0, 0, 0, 0] : [-0.46, 0.2, 0.58, -0.26], bX: decor ? [0, 0, 0, 0] : [-2, 2, 7, 10], bAv: [0, 0, 0, 0], bXv: [0, 0, 0, 0], end: decor ? 1 : 0,
        match: 0, lit: 0, flip: 0, cosy: 0, scrib: 0 });
      const TASKS = keys.map(k => mkTask(k));
      const TK = {}; TASKS.forEach(T => { TK[T.key] = T; });
      const DECOR = {}; ['plant', 'frame', 'tea', 'record', 'books', 'candle'].forEach(k => { if (!TK[k]) DECOR[k] = mkTask(k, true); });
      const S_ = (k) => TK[k] || DECOR[k];

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: 2 });
      const hud = h('div', { class: 'do-hud' });
      const boxTxt = h('span', { text: 'Box: buzzing' });
      const bars = [h('b'), h('b'), h('b'), h('b'), h('b')];
      const satNum = h('b', { text: '0:00' });
      hud.append(h('div', { class: 'do-pill', role: 'status', 'aria-live': 'off' }, h('i', { html: ICON_BOX }), boxTxt, h('span', { class: 'do-bars', 'aria-hidden': 'true' }, bars)),
        h('div', { class: 'do-pill do-sit' }, h('i', { html: ICON_SIT }), h('span', { text: 'Sat with it' }), satNum));
      const hitWrap = h('div');
      TASKS.forEach(T => { T.btn = h('button', { type: 'button', class: 'do-hit', 'aria-label': ARIA[T.key], hidden: true }); K.tap(T.btn, () => tapTask(T)); hitWrap.append(T.btn); });
      const catBtn = catOn ? h('button', { type: 'button', class: 'do-hit', 'aria-label': 'Pet the sleepy cat' }) : null;
      if (catBtn) { K.tap(catBtn, () => petCat()); hitWrap.append(catBtn); }
      const boxEl = h('div', { class: 'do-box', role: 'button', tabindex: '0', 'aria-label': 'The mystery box. Drag it onto the shelf, or shake it.' });
      const label = h('div', { class: 'do-label', 'aria-hidden': 'true' }, h('small', { text: userBox ? 'Is it true?' : 'For example' }), h('span', { class: userBox ? 'gk-user' : '', text: boxText }));
      const whisper = h('div', { class: 'do-whisper', role: 'status' }, h('i', { text: 'psst…' }), h('span'));
      const stepEl = useNote ? h('div', { class: 'do-step', role: 'status' }, h('small', { text: serious ? 'One real step, once' : 'One useful step, once' }), h('span', { text: stepText }), care ? h('em', { text: 'For the facts, ask someone qualified.' }) : null) : null;
      const noteEl = h('button', { type: 'button', class: 'do-note', hidden: true, 'aria-label': 'A note from inside the box. Tap to keep it.' },
        h('small', { text: 'Inside the box' }), h('b', { text: 'You were okay not knowing.' }), h('span', { text: NOTE_SUB }), NOTE_CARE ? h('em', { text: NOTE_CARE }) : null);
      el.append(hitWrap, boxEl, label, whisper, hud, noteEl);
      if (stepEl) el.append(stepEl);
      K.tap(noteEl, () => keepNote());
      const still = K.character('still', { side: 'right', mood: 'calm', x: 12, y: 700, size: 64 });
      const rush = K.character('rush', { side: 'left', mood: 'worried', x: 300, y: 700, size: 64 });
      const loopie = K.character('loopie', { side: 'left', mood: 'silly', x: 200, y: 200, size: 46 });
      function say(c, line, o) { if (!M.side && (c === still || c === rush)) (c === still ? rush : still).hush(); return c.say(line, o); }

      /* ---------------- layout ---------------- */
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        M.W = W; M.H = H; M.phone = W < 700; M.side = W >= 900 && H >= 600;
        const top = M.side ? 102 : 104, bot = M.side ? 30 : (M.phone ? 128 : 152);
        const rh = Math.max(360, H - top - bot);
        const rw = M.side ? clamp(W - 720, 440, Math.min(920, rh * 1.05)) : Math.min(W - 20, 760);
        const x0 = Math.round((W - rw) / 2), y0 = top, x1 = x0 + rw, yF = y0 + rh;
        const s = clamp(Math.min(rh / 600, rw / 366), 0.72, 1.35);
        const t = Math.round(8 * s);
        const fx0 = x0 + t, fx1 = x1 - t, fy0 = y0 + t, fy1 = yF - Math.round(t * 2.1);
        const fw = fx1 - fx0, fh = fy1 - fy0;
        const dIn = Math.round(Math.min(fw * 0.1, 48 * s)), dT = Math.round(fh * 0.07), dB = Math.round(fh * 0.3);
        Object.assign(M, { x0, y0, x1, yF, rw, rh, s, t, fx0, fx1, fy0, fy1, fw, fh, bx0: fx0 + dIn, bx1: fx1 - dIn, by0: fy0 + dT, by1: fy1 - dB });
        M.bw = M.bx1 - M.bx0; M.bh = M.by1 - M.by0; M.wk = M.bw / M.fw;
        M.floor = (u, z) => { const y = lerp(M.by1, M.fy1, z), xa = lerp(M.bx0, M.fx0, z), xb = lerp(M.bx1, M.fx1, z); return { x: lerp(xa, xb, u), y, k: lerp(M.wk, 1, z) }; };
        const wk = M.wk;
        M.win = { x: Math.round(M.bx0 + M.bw * 0.07), y: Math.round(M.by0 + M.bh * 0.1), w: Math.round(M.bw * 0.38), h: Math.round(M.bh * 0.42) };
        M.sillY = M.win.y + M.win.h;
        M.shelf = { x0: Math.round(M.bx0 + M.bw * 0.53), x1: M.bx1, y: Math.round(M.by0 + M.bh * 0.35) };
        M.bShelf = 62 * s;
        M.spotShelf = { x: M.shelf.x1 - 5 * s - 0.75 * M.bShelf, y: M.shelf.y };
        M.pend = { x: Math.round((M.win.x + M.win.w + M.shelf.x0) / 2), y: Math.round(M.by0 + M.bh * 0.12) };
        M.frame = { x: M.bx0 + M.bw * 0.77, y: M.by0 + M.bh * 0.62, k: s * wk * 1.12 };
        const cabH = 54 * s * wk;
        M.cab = { x0: M.bx0 + M.bw * 0.03, x1: M.bx0 + M.bw * 0.5, top: M.by1 - cabH, bot: M.by1 + 4 * s };
        M.record = { x: lerp(M.cab.x0, M.cab.x1, 0.3), y: M.cab.top, k: s * wk };
        M.tea = { x: lerp(M.cab.x0, M.cab.x1, 0.74), y: M.cab.top, k: s * wk };
        M.candle = { x: M.win.x + M.win.w - 15 * s, y: M.sillY, k: s * wk };
        const ru = M.floor(0.5, 0.66); M.rug = { x: ru.x, y: ru.y, rx: M.fw * 0.38, ry: (M.fy1 - M.by1) * 0.25 };
        const rs = M.floor(0.5, 0.69); M.spotRug = { x: rs.x, y: rs.y };
        M.bRug = 124 * s * rs.k;
        const sd = M.floor(0.875, 0.6); M.st = { x: sd.x, y: sd.y, k: sd.k * s, w: 80 * sd.k * s, hgt: 62 * sd.k * s };
        M.st.top = M.st.y - M.st.hgt; M.st.low = M.st.top + M.st.hgt * 0.6;
        const pl = M.floor(0.1, 0.86); M.plant = { x: pl.x, y: pl.y, k: pl.k * s };
        const cn = M.floor(0.24, 0.93); M.can = { x: cn.x, y: cn.y, k: cn.k * s };
        const ca = M.floor(0.72, 0.965); M.cat = { x: ca.x, y: ca.y, k: ca.k * s };
        // task anchors (sparkles) and hit areas
        const hit = (cx, cy, w, hh) => { const ww = Math.max(48, w), hx = Math.max(48, hh); return { x: cx - ww / 2, y: cy - hx / 2, w: ww, h: hx }; };
        const pk = M.plant.k, fk = M.frame.k, tk = M.tea.k, rk = M.record.k, sk = M.st.k, ck = M.candle.k;
        M.hits = { plant: hit(M.plant.x + 14 * pk, M.plant.y - 52 * pk, 92 * pk, 112 * pk), frame: hit(M.frame.x, M.frame.y, 72 * fk, 64 * fk), tea: hit(M.tea.x + 4 * tk, M.tea.y - 16 * tk, 56 * tk, 46 * tk),
          record: hit(M.record.x - 2 * rk, M.record.y - 14 * rk, 60 * rk, 44 * rk), books: hit(M.st.x, M.st.top - 24 * sk, M.st.w + 4 * sk, 50 * sk), candle: hit(M.candle.x, M.candle.y - 22 * ck, 30 * ck, 56 * ck),
          phone: hit(M.st.x, M.st.low - 2 * sk, M.st.w + 4 * sk, 46 * sk), cat: hit(M.cat.x - 2 * M.cat.k, M.cat.y - 12 * M.cat.k, 54 * M.cat.k, 34 * M.cat.k) };
        M.hits.note = M.hits.phone;
        M.anc = { plant: { x: M.plant.x + 6 * pk, y: M.plant.y - 100 * pk }, frame: { x: M.frame.x + 34 * fk, y: M.frame.y - 26 * fk }, tea: { x: M.tea.x, y: M.tea.y - 32 * tk }, record: { x: M.record.x, y: M.record.y - 26 * rk },
          books: { x: M.st.x - 10 * sk, y: M.st.top - 52 * sk }, candle: { x: M.candle.x + 10 * ck, y: M.candle.y - 46 * ck }, phone: { x: M.st.x + 22 * sk, y: M.st.low - 14 * sk } };
        M.anc.note = M.anc.phone;
        TASKS.forEach(T => { const r = M.hits[T.key]; Object.assign(T.btn.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' }); });
        if (catBtn) { const r = M.hits.cat; Object.assign(catBtn.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' }); }
        // box rests where it was (first layout: on the rug)
        if (!st.laid) { B.x = M.spotRug.x; B.y = M.spotRug.y; B.size = M.bRug; st.laid = true; }
        else if (!B.held && !B.hop) { B.x = B.at === 'shelf' ? M.shelf.x1 - 5 * s - 0.75 * M.bShelf * Math.min(B.gs, 1.2) : M.spotRug.x; B.y = B.at === 'shelf' ? M.spotShelf.y : M.spotRug.y; }
        label.style.width = Math.round(M.bRug * 0.9) + 'px';
        M.lw = label.offsetWidth; M.lh = label.offsetHeight;
        // HUD + characters
        hud.style.left = (M.side ? M.x0 : 10) + 'px'; hud.style.right = (M.side ? W - M.x1 : 10) + 'px';
        const lsz = Math.round(44 * s);
        loopie.el.style.setProperty('--sz', lsz + 'px'); loopie.place(Math.round(M.shelf.x0 - 10 * s), Math.round(M.shelf.y - lsz + 5 * s)); loopie.side('left');
        loopie.el.style.setProperty('--do-bub', Math.round(clamp(M.shelf.x0 - M.fx0 - 18, 130, 240)) + 'px');
        if (M.side) {
          const sz = 104, y = Math.round(M.y0 + M.rh * 0.46 - sz / 2), bub = Math.round(clamp(M.x0 - 24 - sz - 24, 150, 280));
          [still, rush].forEach(c => { c.el.style.setProperty('--sz', sz + 'px'); c.el.classList.remove('do-low'); c.el.style.setProperty('--do-bub', bub + 'px'); });
          still.place(24, y); still.side('right'); rush.place(W - 24 - sz, y + 50); rush.side('left');
        } else {
          const sz = M.phone ? 64 : 84, y = H - 14 - sz, bub = Math.round(clamp(W - 2 * (12 + sz) - 30, 150, 420));
          [still, rush].forEach(c => { c.el.style.setProperty('--sz', sz + 'px'); c.el.classList.add('do-low'); c.el.style.setProperty('--do-bub', bub + 'px'); });
          still.place(12, y); still.side('right'); rush.place(W - 12 - sz, y); rush.side('left');
        }
        if (noteEl.classList.contains('on')) placeNote();
        if (stepEl) placeStep();
        st.statOK = false;
      }

      /* ---------------- colours by theme ---------------- */
      const cCache = new Map();
      const C = (hx) => { const key = (bright() ? 'b' : 'd') + hx; let v = cCache.get(key); if (!v) { v = bright() ? hx : mixC(hx, '#1d1530', 0.4); cCache.set(key, v); } return v; };

      /* ---------------- the static room (cached; redrawn on resize or theme change) ---------------- */
      const stat = document.createElement('canvas');
      function renderStatic() {
        const W = M.W, H = M.H, d = cv.dpr || 1, br = bright(), s = M.s, R = room;
        stat.width = Math.max(2, Math.round(W * d)); stat.height = Math.max(2, Math.round(H * d));
        const g = stat.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H);
        let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, br ? '#f8efe2' : '#150f1d'); gr.addColorStop(1, br ? '#e8d6be' : '#271b30'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        gr = g.createRadialGradient(W / 2, M.y0 + M.rh * 0.42, 20, W / 2, M.y0 + M.rh * 0.42, Math.max(W, H) * 0.75); gr.addColorStop(0, br ? 'rgba(255,238,210,0.95)' : 'rgba(150,90,150,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        const bk = K.rng(33); // a few soft bokeh lights around the diorama
        for (let i = 0; i < 18; i++) { const x = bk() * W, y = bk() * H, r = 8 + bk() * 26, c = [R.rug, R.curtain, R.rug2, wrap.base][i % 4], rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, rgba(c, br ? 0.16 : 0.2)); rg.addColorStop(1, rgba(c, 0)); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); }
        g.fillStyle = br ? 'rgba(110,70,30,0.22)' : 'rgba(0,0,0,0.5)'; g.beginPath(); g.ellipse(W / 2, M.yF + 5 * s, M.rw * 0.54, 15 * s, 0, 0, TAU); g.fill();
        // shell (the cut walls of the diorama) and the floor slab
        rr(g, M.x0, M.y0, M.rw, M.rh, 12 * s); g.fillStyle = C(R.shell); g.fill();
        g.save(); rr(g, M.x0, M.y0, M.rw, M.rh, 12 * s); g.clip();
        gr = g.createLinearGradient(0, M.fy1, 0, M.yF); gr.addColorStop(0, C(R.woodL)); gr.addColorStop(1, C(R.woodD)); g.fillStyle = gr; g.fillRect(M.x0, M.fy1, M.rw, M.yF - M.fy1);
        g.strokeStyle = rgba(C(R.woodD), 0.35); g.lineWidth = 1; g.beginPath(); for (let x = M.x0 + 18 * s; x < M.x1; x += 34 * s) { g.moveTo(x, M.fy1 + 3); g.lineTo(x, M.yF); } g.stroke();
        g.restore();
        // ceiling and side walls
        poly(g, [M.fx0, M.fy0, M.fx1, M.fy0, M.bx1, M.by0, M.bx0, M.by0]);
        gr = g.createLinearGradient(0, M.fy0, 0, M.by0); gr.addColorStop(0, C(shade(R.ceil, 0.8))); gr.addColorStop(1, C(R.ceil)); g.fillStyle = gr; g.fill();
        [[M.fx0, M.bx0], [M.fx1, M.bx1]].forEach(([fx, bx]) => {
          poly(g, [fx, M.fy0, bx, M.by0, bx, M.by1, fx, M.fy1]);
          gr = g.createLinearGradient(fx, 0, bx, 0); gr.addColorStop(0, C(shade(R.side, 0.78))); gr.addColorStop(1, C(shade(R.side, 0.95))); g.fillStyle = gr; g.fill();
          g.strokeStyle = rgba(C(shade(R.side, 0.62)), 0.3); g.lineWidth = 1; g.beginPath();
          for (let j = 1; j < 7; j++) { const u = Math.pow(j / 7, 1.2), x = lerp(fx, bx, u); g.moveTo(x, lerp(M.fy0, M.by0, u)); g.lineTo(x, lerp(M.fy1, M.by1, u)); }
          g.stroke();
        });
        // back wall + wallpaper
        g.fillStyle = C(R.wall); g.fillRect(M.bx0, M.by0, M.bw, M.bh);
        g.save(); g.beginPath(); g.rect(M.bx0, M.by0, M.bw, M.bh); g.clip(); wallPattern(g, s); g.restore();
        gr = g.createLinearGradient(0, M.by0, 0, M.by1); gr.addColorStop(0, 'rgba(0,0,0,0.1)'); gr.addColorStop(0.28, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.07)'); g.fillStyle = gr; g.fillRect(M.bx0, M.by0, M.bw, M.bh);
        [[M.bx0, 1], [M.bx1, -1]].forEach(([x, sg]) => { const g2 = g.createLinearGradient(x, 0, x + sg * 22 * s, 0); g2.addColorStop(0, 'rgba(0,0,0,0.12)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = g2; g.fillRect(sg > 0 ? x : x - 22 * s, M.by0, 22 * s, M.bh); });
        // floor + planks
        const floorPoly = () => poly(g, [M.bx0, M.by1, M.bx1, M.by1, M.fx1, M.fy1, M.fx0, M.fy1]);
        floorPoly(); gr = g.createLinearGradient(0, M.by1, 0, M.fy1); gr.addColorStop(0, C(shade(R.floor, 0.76))); gr.addColorStop(1, C(R.floorL)); g.fillStyle = gr; g.fill();
        g.save(); floorPoly(); g.clip();
        g.strokeStyle = rgba(C(shade(R.floor, 0.5)), 0.45); g.lineWidth = 1; g.beginPath();
        const n = 9;
        for (let i = 1; i < n; i++) { g.moveTo(lerp(M.bx0, M.bx1, i / n), M.by1); g.lineTo(lerp(M.fx0, M.fx1, i / n), M.fy1); }
        for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) { const z = ((i * 0.37 + j * 0.33) % 1) * 0.9 + 0.05, y = lerp(M.by1, M.fy1, z); g.moveTo(lerp(lerp(M.bx0, M.bx1, i / n), lerp(M.fx0, M.fx1, i / n), z), y); g.lineTo(lerp(lerp(M.bx0, M.bx1, (i + 1) / n), lerp(M.fx0, M.fx1, (i + 1) / n), z), y); }
        g.stroke(); g.restore();
        gr = g.createLinearGradient(0, M.by1, 0, M.by1 + 18 * s); gr.addColorStop(0, 'rgba(0,0,0,0.24)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(M.bx0, M.by1, M.bw, 18 * s);
        g.fillStyle = C(shade(R.shell, 0.97)); g.fillRect(M.bx0, M.by1 - 7 * s, M.bw, 7 * s); g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(M.bx0, M.by1 - 7 * s, M.bw, 1.2);
        g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(M.bx0, M.by0); g.lineTo(M.bx0, M.by1); g.moveTo(M.bx1, M.by0); g.lineTo(M.bx1, M.by1); g.moveTo(M.bx0, M.by1); g.lineTo(M.fx0, M.fy1); g.moveTo(M.bx1, M.by1); g.lineTo(M.fx1, M.fy1); g.stroke();
        // window, curtains, sill
        const w = M.win, fwd = 7 * s;
        rr(g, w.x - fwd, w.y - fwd, w.w + fwd * 2, w.h + fwd * 2, 4 * s); g.fillStyle = C('#f6efe2'); g.fill();
        g.save(); g.globalCompositeOperation = 'destination-out'; g.fillRect(w.x, w.y, w.w, w.h); g.restore();
        g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 1.2; g.strokeRect(w.x - 0.6, w.y - 0.6, w.w + 1.2, w.h + 1.2);
        g.fillStyle = C('#f6efe2'); g.fillRect(w.x + w.w / 2 - 2.5 * s, w.y, 5 * s, w.h); g.fillRect(w.x, w.y + w.h * 0.46 - 2.5 * s, w.w, 5 * s);
        g.fillStyle = C('#efe3cd'); rr(g, w.x - 12 * s, M.sillY, w.w + 24 * s, 7 * s, 2 * s); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(w.x - 10 * s, M.sillY + 7 * s, w.w + 20 * s, 3 * s);
        const rodY = w.y - 15 * s;
        [-1, 1].forEach(sd => {
          const ox = sd < 0 ? w.x : w.x + w.w, out = sd * 26 * s, inn = -sd * 13 * s, tie = w.y + w.h * 0.62, bot2 = M.sillY + 30 * s;
          g.beginPath(); g.moveTo(ox + out, rodY); g.lineTo(ox + inn, rodY); g.quadraticCurveTo(ox + inn * 0.9, tie - 18 * s, ox + sd * 1 * s, tie);
          g.quadraticCurveTo(ox + inn * 0.4, tie + 22 * s, ox + inn * 0.6, bot2); g.lineTo(ox + out + sd * 2 * s, bot2); g.closePath();
          gr = g.createLinearGradient(ox + out, 0, ox + inn, 0); const cc = C(R.curtain);
          [0, 0.2, 0.42, 0.62, 0.82, 1].forEach((p, i) => gr.addColorStop(p, i % 2 ? shade(cc, 0.82) : shade(cc, 1.06)));
          g.fillStyle = gr; g.fill();
          g.fillStyle = C(shade(R.curtain, 0.7)); rr(g, ox + sd * 3 * s - 6 * s, tie - 3 * s, 12 * s, 6 * s, 3 * s); g.fill();
        });
        g.strokeStyle = C(R.woodD); g.lineWidth = 3 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(w.x - 30 * s, rodY); g.lineTo(w.x + w.w + 30 * s, rodY); g.stroke();
        g.fillStyle = C(R.woodD); [w.x - 32 * s, w.x + w.w + 32 * s].forEach(x => { g.beginPath(); g.arc(x, rodY, 3.4 * s, 0, TAU); g.fill(); });
        // pendant lamp (static parts)
        const pd = M.pend;
        g.strokeStyle = C('#3a2e28'); g.lineWidth = 1.2; g.beginPath(); g.moveTo(pd.x, M.fy0 + 2); g.lineTo(pd.x, pd.y - 16 * s); g.stroke();
        gr = g.createLinearGradient(0, pd.y - 16 * s, 0, pd.y); gr.addColorStop(0, C(shade(R.rug2, 0.92))); gr.addColorStop(1, C(R.rug2));
        poly(g, [pd.x - 5 * s, pd.y - 17 * s, pd.x + 5 * s, pd.y - 17 * s, pd.x + 15 * s, pd.y, pd.x - 15 * s, pd.y]); g.fillStyle = gr; g.fill();
        // shelf with trailing ivy
        const sh = M.shelf, th = 8 * s;
        gr = g.createLinearGradient(0, sh.y + th, 0, sh.y + th + 16 * s); gr.addColorStop(0, 'rgba(0,0,0,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(sh.x0 + 4 * s, sh.y + th, sh.x1 - sh.x0 - 8 * s, 16 * s);
        g.fillStyle = C(R.woodL); poly(g, [sh.x0, sh.y, sh.x1, sh.y, sh.x1, sh.y - 4 * s, sh.x0 + 3 * s, sh.y - 4 * s]); g.fill();
        g.fillStyle = C(R.wood); g.fillRect(sh.x0, sh.y, sh.x1 - sh.x0, th); g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(sh.x0, sh.y, sh.x1 - sh.x0, 1.4);
        g.fillStyle = C(R.woodD); [sh.x0 + 12 * s, sh.x1 - 22 * s].forEach(bx => { poly(g, [bx, sh.y + th, bx + 4 * s, sh.y + th, bx + 4 * s, sh.y + th + 15 * s]); g.fill(); });
        const ivx = sh.x0 + (sh.x1 - sh.x0) * 0.42;
        g.strokeStyle = C('#4f7a3a'); g.lineWidth = 1.3; g.beginPath(); g.moveTo(ivx, sh.y + th); g.quadraticCurveTo(ivx - 8 * s, sh.y + 30 * s, ivx - 2 * s, sh.y + 48 * s); g.stroke();
        for (let i = 0; i < 6; i++) { const k2 = i / 5, x = ivx - 6 * s * Math.sin(k2 * 2.6) - 2 * s, y = sh.y + th + 6 * s + k2 * 40 * s; g.fillStyle = C(i % 2 ? '#5f9e4f' : '#4f8f45'); g.beginPath(); g.ellipse(x + (i % 2 ? 4 : -4) * s, y, 4.2 * s, 2.6 * s, i % 2 ? 0.5 : -0.5, 0, TAU); g.fill(); }
        // low cabinet
        const cb = M.cab, cw = cb.x1 - cb.x0;
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse((cb.x0 + cb.x1) / 2, cb.bot, cw * 0.55, 5 * s, 0, 0, TAU); g.fill();
        g.fillStyle = C(R.wood); rr(g, cb.x0, cb.top + 4 * s, cw, cb.bot - cb.top - 8 * s, 2 * s); g.fill();
        g.fillStyle = C(R.woodL); poly(g, [cb.x0 - 2 * s, cb.top + 4 * s, cb.x1 + 2 * s, cb.top + 4 * s, cb.x1, cb.top, cb.x0 + 2 * s, cb.top]); g.fill();
        g.strokeStyle = rgba(C(R.woodD), 0.75); g.lineWidth = 1.2; const dh = cb.bot - cb.top - 18 * s;
        [0, 1].forEach(i => { g.strokeRect(cb.x0 + 5 * s + i * (cw / 2 - 2 * s), cb.top + 9 * s, cw / 2 - 8 * s, dh); g.fillStyle = C(R.woodD); g.beginPath(); g.arc(cb.x0 + (i ? cw / 2 + 6 * s : cw / 2 - 6 * s), cb.top + 9 * s + dh / 2, 1.8 * s, 0, TAU); g.fill(); });
        g.fillStyle = C(R.woodD); [cb.x0 + 4 * s, cb.x1 - 7 * s].forEach(x => g.fillRect(x, cb.bot - 4 * s, 3 * s, 4 * s));
        // rug
        const rg = M.rug;
        g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.ellipse(rg.x, rg.y + 3 * s, rg.rx, rg.ry, 0, 0, TAU); g.fill();
        g.fillStyle = C(R.rug); g.beginPath(); g.ellipse(rg.x, rg.y, rg.rx, rg.ry, 0, 0, TAU); g.fill();
        g.strokeStyle = C(R.rug2); g.lineWidth = 3 * s; g.beginPath(); g.ellipse(rg.x, rg.y, rg.rx * 0.86, rg.ry * 0.8, 0, 0, TAU); g.stroke();
        g.lineWidth = 1.4; g.beginPath(); g.ellipse(rg.x, rg.y, rg.rx * 0.7, rg.ry * 0.62, 0, 0, TAU); g.stroke();
        g.fillStyle = C(R.rug2); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, x = rg.x + Math.cos(a) * rg.rx * 0.78, y = rg.y + Math.sin(a) * rg.ry * 0.71, q = 2.6 * s; poly(g, [x, y - q, x + q * 1.3, y, x, y + q, x - q * 1.3, y]); g.fill(); }
        g.strokeStyle = C(R.rug2); g.lineWidth = 1; g.beginPath(); for (let i = -3; i <= 3; i++) { const y = rg.y + i * rg.ry * 0.12; [-1, 1].forEach(sd => { g.moveTo(rg.x + sd * rg.rx * Math.sqrt(1 - Math.pow(i * 0.12, 2)), y); g.lineTo(rg.x + sd * (rg.rx * Math.sqrt(1 - Math.pow(i * 0.12, 2)) + 5 * s), y); }); } g.stroke();
        // side table (top, apron, lower shelf, legs)
        const sd = M.st, sk = sd.k, w2 = sd.w / 2;
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(sd.x, sd.y, w2 * 1.05, 5 * sk, 0, 0, TAU); g.fill();
        g.fillStyle = C(R.woodD); [sd.x - w2 + 2 * sk, sd.x + w2 - 5 * sk].forEach(x => g.fillRect(x, sd.top + 4 * sk, 3.2 * sk, sd.y - sd.top - 4 * sk));
        g.fillStyle = C(shade(R.woodD, 0.85)); [sd.x - w2 + 9 * sk, sd.x + w2 - 11 * sk].forEach(x => g.fillRect(x, sd.top + 4 * sk, 2.4 * sk, sd.y - sd.top - 8 * sk));
        g.fillStyle = C(R.woodL); poly(g, [sd.x - w2, sd.low, sd.x + w2, sd.low, sd.x + w2 - 4 * sk, sd.low - 5 * sk, sd.x - w2 + 4 * sk, sd.low - 5 * sk]); g.fill();
        g.fillStyle = C(R.wood); g.fillRect(sd.x - w2, sd.low, sd.w, 4 * sk);
        g.fillStyle = C(R.wood); g.fillRect(sd.x - w2, sd.top + 3 * sk, sd.w, 9 * sk); g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(sd.x - w2, sd.top + 11 * sk, sd.w, 1.2);
        g.fillStyle = C(R.woodL); poly(g, [sd.x - w2 - 3 * sk, sd.top + 3 * sk, sd.x + w2 + 3 * sk, sd.top + 3 * sk, sd.x + w2 - 1 * sk, sd.top - 4 * sk, sd.x - w2 + 1 * sk, sd.top - 4 * sk]); g.fill();
        // plant pot
        const pl = M.plant, pk = pl.k, pw = 44 * pk, pb = 32 * pk, ph = 38 * pk;
        g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(pl.x, pl.y, pw * 0.62, 5 * pk, 0, 0, TAU); g.fill();
        gr = g.createLinearGradient(pl.x - pw / 2, 0, pl.x + pw / 2, 0); gr.addColorStop(0, C('#b45a37')); gr.addColorStop(0.45, C('#d9774c')); gr.addColorStop(1, C('#a24f30'));
        g.fillStyle = gr; poly(g, [pl.x - pw / 2, pl.y - ph, pl.x + pw / 2, pl.y - ph, pl.x + pb / 2, pl.y, pl.x - pb / 2, pl.y]); g.fill();
        g.fillStyle = C('#3f2a1e'); g.beginPath(); g.ellipse(pl.x, pl.y - ph - 4 * pk, pw / 2 + 1 * pk, 4 * pk, 0, 0, TAU); g.fill();
        g.fillStyle = C('#e08a5c'); rr(g, pl.x - pw / 2 - 3 * pk, pl.y - ph - 2 * pk, pw + 6 * pk, 8 * pk, 2 * pk); g.fill();
        // the cut edge highlight
        g.strokeStyle = br ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.12)'; g.lineWidth = 1.5; g.strokeRect(M.fx0 - 0.75, M.fy0 - 0.75, M.fw + 1.5, M.fy1 - M.fy0 + 1.5);
        // vignette sprite for the frame (drawn last each frame)
        st.statOK = true;
      }
      function wallPattern(g, s) {
        const R = room, x0 = M.bx0, y0 = M.by0, x1 = M.bx1, y1 = M.by1;
        g.fillStyle = C(R.wall2); g.strokeStyle = C(R.wall2);
        if (R.pat === 'stripe') { for (let x = x0; x < x1; x += 22 * s) g.fillRect(x, y0, 9 * s, y1 - y0); }
        else if (R.pat === 'dots') { let r = 0; for (let y = y0 + 8 * s; y < y1; y += 16 * s, r++) for (let x = x0 + (r % 2 ? 8 : 0) * s + 4 * s; x < x1; x += 16 * s) { g.beginPath(); g.arc(x, y, 1.8 * s, 0, TAU); g.fill(); } }
        else if (R.pat === 'leaf') { const rn = K.rng(9); for (let i = 0; i < 46; i++) { const x = x0 + rn() * (x1 - x0), y = y0 + rn() * (y1 - y0); g.beginPath(); g.ellipse(x, y, 4.5 * s, 2.2 * s, rn() * 3, 0, TAU); g.fill(); } }
        else if (R.pat === 'panel') { g.lineWidth = 1.4; g.globalAlpha = 0.7; g.beginPath(); for (let x = x0 + 14 * s; x < x1; x += 18 * s) { g.moveTo(x, y0); g.lineTo(x, y1); } g.stroke(); g.globalAlpha = 1; for (let x = x0 + 5 * s; x < x1; x += 36 * s) { g.fillStyle = rgba(C(shade(R.wall, 0.8)), 0.5); g.beginPath(); g.ellipse(x, y0 + ((x * 7) % (y1 - y0)), 2 * s, 3.4 * s, 0, 0, TAU); g.fill(); } }
        else { g.lineWidth = 1.2; g.globalAlpha = 0.85; g.beginPath(); const sp = 26 * s; for (let k = -(y1 - y0); k < x1 - x0 + (y1 - y0); k += sp) { g.moveTo(x0 + k, y0); g.lineTo(x0 + k + (y1 - y0), y1); g.moveTo(x0 + k, y1); g.lineTo(x0 + k + (y1 - y0), y0); } g.stroke(); g.globalAlpha = 1; }
      }

      /* ---------------- tweens ---------------- */
      function tw(o, key, to, ms, ease) { o.tw = o.tw || {}; o.tw[key] = { from: o[key] || 0, to, t0: now(), ms: Math.max(1, RM() ? Math.min(ms, 220) : ms), ease: ease || K.ease.inOutCubic }; }
      function twStep(o, tn) { const m = o.tw; if (!m) return; for (const key in m) { const w = m[key]; if (!w) continue; const k = clamp((tn - w.t0) / w.ms, 0, 1); o[key] = lerp(w.from, w.to, w.ease(k)); if (k >= 1) m[key] = null; } }

      /* ---------------- sound design ---------------- */
      const SFX = {
        rattle(v) { const t0 = A.now(); A.wood(t0, 0.08 + 0.1 * v, 0.55 + Math.random() * 0.2); A.noise({ when: t0 + 0.012, filter: 'bandpass', freq: 1300 + Math.random() * 700, q: 2.4, dur: 0.06, vol: 0.05 + 0.07 * v }); A.wood(t0 + 0.05, 0.05 + 0.06 * v, 0.72); },
        psst() { const t0 = A.now(); A.noise({ when: t0, filter: 'highpass', freq: 3800, dur: 0.16, attack: 0.05, vol: 0.05 }); A.noise({ when: t0 + 0.2, filter: 'highpass', freq: 4400, dur: 0.24, attack: 0.07, vol: 0.06 }); },
        hop() { A.boing({ freq: 260, vol: 0.06 }); A.whoosh({ vol: 0.05, dur: 0.3 }); },
        land(w) { A.thud({ vol: 0.16 + w * 0.12 }); A.wood(undefined, 0.09, 0.5); },
        relief() { const t0 = A.now(); A.tone({ type: 'sine', freq: 520, to: 700, glide: 0.5, dur: 0.8, vol: 0.05, attack: 0.08, verb: 0.4 }); ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => A.chime(A.note(n), { when: t0 + 0.04 + i * 0.05, vol: 0.045, dur: 1.2 })); },
        grow() { A.tone({ type: 'sine', freq: 150, to: 58, glide: 0.55, dur: 0.75, vol: 0.24 }); A.tone({ type: 'triangle', freq: 233, to: 92, glide: 0.5, dur: 0.6, vol: 0.06, lp: 800 }); A.noise({ filter: 'lowpass', freq: 320, dur: 0.45, vol: 0.13 }); },
        pass() { const t0 = A.now(); ['A5', 'C6', 'F6'].forEach((n, i) => A.chime(A.note(n), { when: t0 + i * 0.08, vol: 0.05, dur: 1.5 })); },
        water() { const t0 = A.now(); A.noise({ filter: 'bandpass', freq: 2600, to: 1700, q: 1.2, dur: 0.65, attack: 0.08, vol: 0.07 }); for (let i = 0; i < 5; i++) A.tone({ when: t0 + 0.12 + i * 0.09, type: 'sine', freq: 1500 + Math.random() * 1400, to: 900, glide: 0.04, dur: 0.06, vol: 0.02 }); },
        thunk(i) { A.wood(undefined, 0.16, 0.4 + i * 0.06); A.thud({ vol: 0.09 }); },
        creak() { A.tone({ type: 'triangle', freq: 330, to: 280, glide: 0.2, dur: 0.22, vol: 0.035, lp: 1200 }); A.wood(undefined, 0.1, 1.1); },
        tock() { A.wood(undefined, 0.2, 1.3); },
        strike() { A.noise({ filter: 'bandpass', freq: 3200, q: 0.8, dur: 0.2, attack: 0.01, vol: 0.12 }); A.noise({ when: A.now() + 0.12, filter: 'lowpass', freq: 900, dur: 0.3, vol: 0.05 }); },
        fwump() { A.noise({ filter: 'lowpass', freq: 700, dur: 0.35, attack: 0.05, vol: 0.12 }); A.tone({ type: 'sine', freq: 180, to: 300, glide: 0.25, dur: 0.35, vol: 0.06 }); },
        whistle() { A.tone({ type: 'sine', freq: 1900, to: 2180, glide: 0.35, dur: 0.55, vol: 0.03, attack: 0.08 }); A.click({ vol: 0.12 }); },
        pour() { const t0 = A.now(); for (let i = 0; i < 6; i++) A.noise({ when: t0 + i * 0.11, filter: 'bandpass', freq: 700 + i * 90, q: 3, dur: 0.12, vol: 0.06 }); },
        clink(i) { A.chime(A.note(['E6', 'G6', 'B6'][i % 3]), { vol: 0.03, dur: 0.45 }); },
        needle() { A.noise({ filter: 'highpass', freq: 2500, dur: 0.08, vol: 0.06 }); A.tone({ type: 'sine', freq: 60, dur: 0.15, vol: 0.08 }); },
        whirr() { A.tone({ type: 'sine', freq: 70, to: 115, glide: 0.6, dur: 0.8, vol: 0.06, lp: 300 }); A.click({ vol: 0.08 }); },
        flip() { A.paper({ vol: 0.12 }); A.thud({ vol: 0.1 }); },
        knit() { A.noise({ filter: 'bandpass', freq: 900, q: 0.7, dur: 0.3, attack: 0.06, vol: 0.08 }); },
        scribble() { const t0 = A.now(); for (let i = 0; i < 5; i++) A.noise({ when: t0 + i * 0.13, filter: 'bandpass', freq: 3600 + Math.random() * 900, q: 3, dur: 0.09, vol: 0.05 }); },
        purr() { const t0 = A.now(); for (let i = 0; i < 12; i++) A.noise({ when: t0 + i * 0.075, filter: 'lowpass', freq: 170, dur: 0.07, attack: 0.02, vol: 0.14 }); },
        musicBox() { const t0 = A.now(); ['C6', 'A5', 'F5', 'G5', 'A5', 'C6', 'D6', 'C6', 'A5', 'F6'].forEach((n, i) => A.chime(A.note(n), { when: t0 + i * 0.21, vol: 0.05, dur: 1.4 })); },
        note(i) { A.pluck(A.note(['F5', 'G5', 'A5', 'C6', 'D6', 'F6'][i % 6]), { vol: 0.13, damp: 0.995, verb: 0.3 }); }
      };

      /* ---------------- music: a cosy room that fills with instruments as you settle; the box hums against it ---------------- */
      const MU = { on: false, next: 0, i: 0, bpm: 72, layers: 0, vinyl: false, vol: 1 };
      const PROG = [['F2', ['A3', 'C4', 'E4', 'G4']], ['D2', ['F3', 'A3', 'C4', 'E4']], ['A#1', ['D4', 'F4', 'A4', 'C5']], ['C2', ['E4', 'G4', 'A4', 'D5']]];
      const MEL = [[0, 'C6'], [3, 'A5'], [5, 'G5'], [8, 'F5'], [10, 'A5'], [13, 'C6'], [14, 'D6']];
      function musicOn() { if (!A.ctx || MU.on) return; MU.on = true; MU.next = A.now() + 0.15; }
      S.on('audio-ready', musicOn);
      K.loop(() => {
        if (!MU.on || !A.ctx) return;
        const ahead = A.now() + 0.25, beat = 60 / MU.bpm;
        while (MU.next < ahead) {
          const time = MU.next, i = MU.i, bar = Math.floor(i / 4) % PROG.length, b = i % 4, ch = PROG[bar][1], bass = PROG[bar][0], v = MU.vol, lay = MU.layers;
          if (b === 0) ch.forEach((n, k) => A.tone({ when: time + k * 0.014, type: 'triangle', freq: A.note(n), dur: beat * 3.7, vol: 0.022 * v, attack: 0.03, lp: 1300, verb: 0.35, bus: 'music' }));
          if (b === 2) [ch[1], ch[3]].forEach((n, k) => A.pluck(A.note(n), { when: time + k * 0.02, vol: 0.05 * v, damp: 0.993, lp: 1800, bus: 'music' }));
          if (lay >= 1 && inten > 0) { if (b === 0 || b === 2) A.kick(time, 0.09 * v); if (b === 1 || b === 3) A.brush(time, 0.03 * v, 0.18); A.shaker(time + beat / 2, 0.012 * v); }
          if (lay >= 2 && (b === 0 || b === 2)) A.pluck(A.note(bass) * (b === 2 ? 1.5 : 1) * 2, { when: time, vol: 0.2 * v, damp: 0.992, lp: 600, bus: 'music' });
          if (lay >= 3) MEL.forEach(([step, n]) => { if (Math.floor(step / 4) === b && (i % 8 < 4 ? step % 2 === 0 : true)) A.chime(A.note(n), { when: time + (step % 4) * beat / 4, vol: 0.026 * v, dur: 1.3, bus: 'music' }); });
          if (MU.vinyl) for (let c = 0; c < 3; c++) A.noise({ when: time + Math.random() * beat, filter: 'highpass', freq: 3000 + Math.random() * 3000, dur: 0.006 + Math.random() * 0.01, vol: 0.012, bus: 'music' });
          const it = U.itch;
          if (it > 0.06 && st.phase !== 'finale' && st.phase !== 'done') {
            const root = A.note(bass) * 4;
            A.tone({ when: time, type: 'sine', freq: root, dur: beat * 1.15, vol: 0.03 * it, attack: 0.2, verb: 0.2 });
            if (it > 0.3) A.tone({ when: time, type: 'triangle', freq: root * 1.0595, dur: beat * 1.05, vol: 0.026 * (it - 0.3) / 0.7, attack: 0.22, lp: 900 });
          }
          MU.i++; MU.next += beat;
        }
      });
      const amb = K.ambience(room.amb); amb.level(0.45, 1);

      /* ---------------- the box: drag, shake, drop ---------------- */
      const canGrab = () => ['shake', 'shelve', 'tasks'].includes(st.phase) && !B.hop;
      let grab = null;
      K.drag(boxEl, {
        space: el,
        start: (p) => {
          if (!canGrab()) return false;
          grab = { ox: p.x - B.x, oy: p.y - B.y, ax: { dir: 0, ext: p.x, rev: 0, last: 0 }, ay: { dir: 0, ext: p.y, rev: 0, last: 0 } };
          B.held = true; B.tx = B.x; B.ty = B.y; B.vx = 0; B.vy = 0; B.sqv -= 2.2; B.labelOn = true;
          K.sfx.tap(); A.wood(undefined, 0.08, 0.6); K.guide(null);
        },
        move: (p) => {
          if (!grab) return;
          B.tx = p.x - grab.ox; B.ty = p.y - grab.oy;
          // a shake = quick direction changes (at least 12 px of travel each way), on either axis
          [[grab.ax, p.x], [grab.ay, p.y]].forEach(([a, v]) => {
            const tn = now(), dv = v - a.ext, thr = 12 * M.s;
            if ((a.dir > 0 && v > a.ext) || (a.dir < 0 && v < a.ext)) { a.ext = v; return; }
            if (Math.abs(dv) < thr) return;
            const nd = dv > 0 ? 1 : -1;
            if (a.dir && nd !== a.dir) {
              a.rev = tn - a.last < 520 ? a.rev + 1 : 1; a.last = tn;
              SFX.rattle(Math.min(1, U.itch + 0.2)); B.rv += nd * 3; if (!RM()) P.emit('dust', B.x, B.y - B.size * 0.5, 2, { colors: [rgba(wrap.light, 0.6)] });
              if (a.rev >= 3) { a.rev = 0; check(); }
            }
            a.dir = nd; a.ext = v;
          });
        },
        end: (p) => { if (!grab) return; const gx = p.x - grab.ox, gy = p.y - grab.oy; grab = null; B.held = false; dropBox(gx, gy); }
      });
      S.listen(boxEl, 'keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault();
        if (st.phase === 'shake') { SFX.rattle(0.8); check(); return; }
        if (canGrab() && B.at === 'rug') hopTo('shelf', onShelved);
      });
      const sizeAt = (where) => (where === 'shelf' ? M.bShelf * Math.min(B.gs, 1.2) : M.bRug * B.gs) * (1 - 0.42 * B.orn);
      const shelfX = () => M.shelf.x1 - 5 * M.s - 0.75 * sizeAt('shelf');
      function boxSizeTarget() { return sizeAt(B.held ? 'rug' : B.at); }
      function hopTo(to, cb) {
        const sp = to === 'shelf' ? { x: shelfX(), y: M.spotShelf.y } : M.spotRug, dist = Math.hypot(sp.x - B.x, sp.y - B.y);
        B.hop = { x0: B.x, y0: B.y, x1: sp.x, y1: sp.y, s0: B.size, s1: sizeAt(to), t0: now(), dur: RM() ? 280 : clamp(380 + dist * 0.9, 420, 820), peak: Math.min(130 * M.s, 26 * M.s + dist * (to === 'shelf' ? 0.1 : 0.3)), to, cb };
        if (to === 'shelf') { B.labelOn = false; hideWhisper(); }
        SFX.hop();
      }
      function dropBox(gx, gy) { // judged where the finger lets go (the box trails it on a spring)
        const sp = { x: shelfX(), y: M.spotShelf.y }, cx = gx == null ? B.x : gx, cy = (gy == null ? B.y : gy) - B.size * 0.4;
        const near = Math.hypot(cx - sp.x, cy - (sp.y - M.bShelf * 0.4)) < 104 * M.s || (cy < M.shelf.y + 34 * M.s && cx > M.shelf.x0 - 26 * M.s);
        if (near) hopTo('shelf', onShelved); else hopTo('rug', onRug);
      }
      function onShelved() {
        if (st.phase === 'shake') { st.phase = 'pre'; K.guide(null); say(still, L(LINES.skipShake), { mood: 'wow', ms: 3000 }); rush.face('surprised', 1600); K.later(() => startTasks(), RM() ? 1400 : 2600); return; }
        if (st.phase === 'shelve') {
          st.phase = 'pre'; K.guide(null);
          say(rush, L(LINES.shelved), { mood: 'worried', ms: 2400 });
          K.later(() => { say(still, L(LINES.shelved2), { mood: 'calm', ms: 2800 }); startTasks(); }, RM() ? 1300 : 2300);
          return;
        }
        if (st.phase === 'tasks') { if (U.wave && !U.wave.fastAt) { U.wave.fastFrom = waveLevel(now()); U.wave.fastAt = now(); } guideNow(); K.later(maybeTwist, 400); }
      }
      function onRug() { if (st.phase === 'tasks' && !U.wave) startWave(false); guideNow(); }

      /* ---------------- checking: a little relief, then the box grows ---------------- */
      function check() {
        if (U.relief || !['shake', 'shelve', 'tasks'].includes(st.phase)) return;
        const tut = st.phase === 'shake';
        U.relief = { t0: now() };
        if (tut) U.tut++; else { U.checks++; if (U.wave) st.temptClean = false; }
        tw(B, 'peek', 1, 140, K.ease.outCubic); K.later(() => tw(B, 'peek', 0, 380), 950);
        SFX.relief(); K.sfx.sparkle(); S.buzz([8, 30, 8]);
        P.emit('star', B.x + B.size * 0.12, B.y - B.size * 0.95, 18, { colors: ['#fffbe6', wrap.light, '#ffffff'] });
        slip(pick(RELIEF), false);
        loopie.face('celebrate', 1200);
        ctx.track('dont_check', { tut: tut ? 1 : 0, n: U.checks });
        K.guide(null);
        K.later(grow, RM() ? 900 : 1250);
      }
      function grow() {
        U.relief = null;
        U.base = Math.min(0.98, U.base + 0.13);
        B.grow = Math.min(1.42, B.grow + 0.11); B.gv += 3.4; B.sqv += 3;
        SFX.grow(); slip(pick(DOUBT), true);
        if (!RM()) P.emit('dust', B.x, B.y - 3, 12, { colors: ['rgba(255,255,255,0.6)', rgba(wrap.base, 0.5)] });
        say(loopie, L(st.phase === 'shake' ? LINES.grew : LINES.again), { mood: 'laugh', ms: 2200 }); loopie.react('bounce');
        if (st.phase === 'shake') {
          K.later(() => { if (st.phase !== 'shake') return; st.phase = 'shelve'; say(still, L(LINES.explain), { mood: 'think', ms: serious ? 5600 : 4400 }); guideNow(1600); }, RM() ? 900 : 1500);
          return;
        }
        if (st.phase === 'tasks') {
          if (U.wave) { U.wave.t0 = now(); U.wave.fastAt = 0; U.wave.amp = Math.min(0.62, U.wave.amp + 0.1); }
          else startWave(false);
          if (U.checks === 1) K.later(() => say(still, L(LINES.afterCheck), { mood: 'calm', ms: 4200 }), 1500);
        }
        guideNow(1600);
      }
      function slip(text, doubt) {
        const e = h('div', { class: 'do-slip' + (doubt ? ' doubt' : ''), text, 'aria-hidden': 'true' });
        el.append(e);
        const w = e.offsetWidth, x = clamp(B.x + B.size * 0.12 - w / 2, M.fx0 + 4, M.fx1 - w - 4), y = B.y - B.size * 1.08 - 34;
        e.style.transform = 'translate(' + x.toFixed(1) + 'px,' + (y + 18).toFixed(1) + 'px) scale(.7)';
        void e.offsetWidth; e.classList.add('on'); e.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + (doubt ? 2 : -2) + 'deg)';
        K.later(() => e.classList.remove('on'), doubt ? 1700 : 1050);
        K.later(() => e.remove(), doubt ? 2100 : 1400);
      }

      /* ---------------- urges: they rise and fall on their own ---------------- */
      function waveLevel(tn) {
        const w = U.wave; if (!w) return 0;
        if (w.fastAt) return w.fastFrom * Math.max(0, 1 - (tn - w.fastAt) / 700);
        const k = (tn - w.t0) / w.T; return k <= 0 || k >= 1 ? 0 : w.amp * Math.pow(Math.sin(Math.PI * k), 1.2);
      }
      function startWave(fromTempt) {
        if (st.phase !== 'tasks') return;
        U.wave = { t0: now(), T: [7600, 6600, 6000][inten] || 6600, amp: Math.min(0.55, 0.32 + 0.07 * U.checks), fastAt: 0, fastFrom: 0, tempt: !!fromTempt };
        showWhisper(WHISPERS[st.whisperI++ % WHISPERS.length]);
        K.later(() => { if (U.wave && st.phase === 'tasks') say(rush, L(LINES.temptRush), { mood: 'panic', ms: 2200 }); }, 700);
        if (U.tempts <= 1) K.later(() => { if (U.wave && st.phase === 'tasks') say(still, L(LINES.temptStill), { mood: 'calm', ms: 3600 }); }, 2900);
        guideNow(1300);
      }
      function endWave(reason) {
        if (!U.wave) return;
        const fromTempt = U.wave.tempt;
        U.wave = null; hideWhisper(); st.waveEnd = now();
        const clean = st.temptClean; st.temptClean = true;
        if (clean) { if (fromTempt) U.passes++; U.base = Math.max(0.05, U.base - 0.05); SFX.pass(); P.emit('star', B.x + B.size * 0.1, B.y - B.size * 0.7, 9, { colors: ['#fff3c4', '#cfe9ff', '#ffffff'] }); }
        ctx.track('dont_wave', { r: reason === 'rode' ? 1 : 2, clean: clean ? 1 : 0 });
        if (reason === 'rode') {
          say(still, L(clean ? LINES.passRide : LINES.passLater), { mood: 'happy', ms: 2800 });
          K.later(() => {
            if (st.phase !== 'tasks' || B.at !== 'rug' || B.held || B.hop) return;
            say(loopie, L(LINES.giveUp), { mood: 'sleepy', ms: 2200 });
            hopTo('shelf', () => { guideNow(); K.later(maybeTwist, 300); });
          }, 1000);
        } else say(still, L(LINES.passShelf), { mood: 'happy', ms: 2200 });
        guideNow(1600);
        K.later(maybeTwist, 1300);
      }
      // one queue: temptations come one at a time, with a breather after each urge has passed
      function queueTempt() { st.pending++; if (!st.tPoll) st.tPoll = K.later(tryTempt, 1500); }
      function tryTempt() {
        st.tPoll = 0;
        if (st.phase !== 'tasks' || st.pending <= 0 || TASKS.every(T => T.done)) { st.pending = 0; return; }
        if (B.at !== 'shelf' || B.held || B.hop || U.wave || U.relief || st.tempting || now() - (st.waveEnd || 0) < 2600) { st.tPoll = K.later(tryTempt, 600); return; }
        st.pending--; st.tempting = true;
        loopie.react('bounce'); loopie.face('silly', 1800); say(loopie, L(LINES.tempt), { mood: 'determined', moodMs: 1800, ms: 2400 });
        SFX.psst();
        K.later(() => {
          st.tempting = false;
          if (st.phase === 'tasks' && B.at === 'shelf' && !B.held && !B.hop && !U.wave) { U.tempts++; st.temptClean = true; hopTo('rug', () => startWave(true)); }
          else st.pending++;
          if (st.pending > 0 && !st.tPoll) st.tPoll = K.later(tryTempt, 2600);
        }, 380);
      }
      function showWhisper(text) { whisper.lastChild.textContent = text; st.whW = whisper.offsetWidth; st.whH = whisper.offsetHeight; whisper.classList.add('on'); }
      function hideWhisper() { whisper.classList.remove('on'); }

      /* ---------------- tasks: small, absorbing, satisfying ---------------- */
      function tapTask(T) {
        if (st.phase !== 'tasks' || T.done || T.d >= T.n) return;
        if (T.busy) { A.click({ vol: 0.05 }); T.shine = 0.6; return; }
        T.d++;
        K.sfx.tap(); SFX.note(st.doneOrder.length * 2 + T.d);
        DO[T.key](T, T.d);
        ctx.track('dont_task', { k: T.key, s: T.d });
        guideNow();
      }
      const later = (fn, ms) => K.later(fn, RM() ? Math.min(ms, 400) : ms);
      const DO = {
        plant(T, d) {
          tw(T, 'can', 1, 300, K.ease.outCubic); T.pourUntil = now() + 650; SFX.water();
          later(() => { tw(T, 'grown', d, 650, K.ease.outBack); T.perkV -= 3.2; }, 380);
          S.cancel(T.canBack); T.canBack = later(() => tw(T, 'can', 0, 420), 1000);
          if (d >= T.n) { T.busy = true; later(() => { tw(T, 'bloom', 1, 700, K.ease.outBack); SFX.fwump(); P.emit('petal', M.plant.x + 2 * M.plant.k, M.plant.y - 100 * M.plant.k, 10, { colors: [room.flower, '#ffffff', '#ffe08a'] }); }, 650); later(() => complete(T), 1300); }
        },
        frame(T, d) {
          const tg = [-0.15, -0.055, 0][d - 1]; T.target = tg; T.av += (tg - T.ang) * 9; SFX.creak();
          if (d >= T.n) { T.busy = true; later(() => { SFX.tock(); tw(T, 'glint', 1, 700, K.ease.inOutSine); }, 520); later(() => complete(T), 1100); }
        },
        tea(T, d) {
          if (d === 1) { T.busy = true; T.heating = true; tw(T, 'heat', 1, 1500, K.ease.linear); const loop = A.ctx ? A.loop({ filter: 'bandpass', freq: 380, q: 1.2 }) : null; if (loop) { loop.level(0.05, 0.4); loop.freq(1600, 0.7); }
            later(() => { if (loop) { loop.level(0.0001, 0.05); K.later(() => loop.stop(), 200); } T.heating = false; T.ready = true; T.busy = false; SFX.whistle(); T.steamy = 1; guideNow(300); }, 1550); }
          if (d === 2) { T.busy = true; tw(T, 'pour', 1, 380, K.ease.outCubic); later(() => { T.pouring = true; SFX.pour(); tw(T, 'fill', 1, 700, K.ease.inOutSine); }, 360); later(() => { T.pouring = false; tw(T, 'pour', 0, 420); }, 1100); later(() => { T.busy = false; guideNow(200); }, 1350); }
          if (d === 3) { T.busy = true; tw(T, 'stir', 1, 900, K.ease.inOutSine); [0, 300, 600].forEach((ms, i) => later(() => SFX.clink(i), ms + 100)); later(() => complete(T), 1100); }
        },
        record(T, d) {
          if (d === 1) { tw(T, 'arm', 1, 600); tw(T, 'spin', 1, 1200, K.ease.inOutSine); SFX.whirr(); }
          if (d === 2) { T.busy = true; later(() => { T.playing = true; MU.vinyl = true; SFX.needle(); }, 260); later(() => complete(T), 900); }
        },
        books(T, d) {
          const i = d - 1; T.fixed = d; T.bAv[i] += T.bAng[i] > 0 ? -7 : 7; SFX.thunk(i);
          if (!RM()) P.emit('dust', M.st.x - M.st.w * 0.3 + i * 10 * M.st.k, M.st.top - 4, 4, { colors: ['rgba(240,225,200,0.7)'] });
          if (d >= T.n) { T.busy = true; later(() => { tw(T, 'end', 1, 500, K.ease.outBack); SFX.tock(); }, 380); later(() => complete(T), 900); }
        },
        candle(T, d) {
          if (d === 1) { tw(T, 'match', 1, 260, K.ease.outCubic); SFX.strike(); if (!RM()) P.emit('spark', M.candle.x + 12 * M.candle.k, M.candle.y - 34 * M.candle.k, 10); }
          if (d === 2) { T.busy = true; tw(T, 'lit', 1, 600, K.ease.outBack); SFX.fwump(); later(() => tw(T, 'match', 0, 400), 350); later(() => complete(T), 900); }
        },
        phone(T, d) {
          if (d === 1) { tw(T, 'flip', 1, 420, K.ease.inOutBack); later(() => SFX.flip(), 300); }
          if (d === 2) { T.busy = true; tw(T, 'cosy', 1, 650, K.ease.outBack); SFX.knit(); later(() => complete(T), 900); }
        },
        note(T) {
          T.busy = true; tw(T, 'scrib', 1, 1100, K.ease.linear); SFX.scribble();
          if (stepEl) { placeStep(); stepEl.classList.add('on'); st.stepUntil = now() + 3800; K.guide(null); K.later(() => stepEl.classList.remove('on'), 5600); }
          later(() => complete(T), 1300);
        }
      };
      function complete(T) {
        if (T.done) return;
        T.done = true; T.busy = false; T.btn.hidden = true; T.shine = 1;
        st.doneOrder.push(T.key);
        const nd = st.doneOrder.length;
        U.base = Math.max(0.06, U.base - [0.22, 0.18, 0.15][inten]);
        WD.todT = nd / TASKS.length;
        MU.layers = Math.min(3, MU.layers + 1);
        K.sfx.great(); const a = M.anc[T.key]; P.emit('star', a.x, a.y, 14, { colors: ['#fff6d8', '#ffd27a', '#ffffff'] });
        ctx.track('dont_done', { k: T.key, n: nd });
        say(nd % 2 ? rush : still, L(LINES['dn_' + T.key]), { mood: nd >= 2 ? 'happy' : 'calm', ms: 2600 });
        rush.base(nd >= TASKS.length - 1 ? 'happy' : 'calm');
        if (nd < TASKS.length && U.tempts + st.pending + (st.tempting ? 1 : 0) < TEMPTS) queueTempt();
        if (nd >= TASKS.length) K.later(maybeTwist, 900);
        guideNow();
      }
      function petCat() {
        if (st.phase === 'intro') return;
        st.purrT = now(); st.catPets++; SFX.purr(); K.sfx.tap();
        P.emit('star', M.cat.x - 12 * M.cat.k, M.cat.y - 26 * M.cat.k, 6, { colors: ['#ffb3c8', '#fff0f5'] });
        if (st.catPets === 1) say(still, L(LINES.cat), { mood: 'happy', ms: 2000 });
      }

      /* ---------------- guide (an arrow on every step) ---------------- */
      function nextTask() { return TASKS.find(T => !T.done); }
      function guideNow(delay) {
        if (st.stepUntil && now() < st.stepUntil) delay = Math.max(delay || 0, st.stepUntil - now()); // let the step card be read first
        if (st.phase === 'shake') { K.guide({ id: 'shake', g: 'sweep', target: boxEl, oy: 0.3, d: Math.round(30 * M.s), label: 'SHAKE IT ONCE', place: 'above', delay: delay ?? 900 }); return; }
        if (st.phase === 'shelve' || (st.phase === 'tasks' && U.wave && !U.wave.fastAt && B.at === 'rug' && !B.hop && !B.held && !U.relief)) {
          const bt = { x: B.ex + B.ew * 0.5, y: B.ey + B.eh * 0.12 }, sp = { x: shelfX() + M.bShelf * 0.12, y: M.spotShelf.y - M.bShelf * 0.7 };
          K.guide({ id: 'shelf' + U.tempts + st.phase, g: 'drag', target: boxEl, ox: 0.5, oy: 0.12, dx: Math.round(sp.x - bt.x), dy: Math.round(sp.y - bt.y), label: st.phase === 'shelve' ? 'DRAG IT TO THE SHELF' : 'BACK ON THE SHELF', place: 'above', delay: delay ?? 800 });
          return;
        }
        if (st.phase === 'tasks') {
          const T = nextTask(); if (!T) { K.guide(null); return; }
          K.guide({ id: 'task-' + T.key + T.d, g: 'tap', target: T.btn, label: GUIDE[T.key][Math.min(T.d, GUIDE[T.key].length - 1)], place: 'above', delay: delay ?? (T.busy ? 1600 : 800) });
          return;
        }
        if (st.phase === 'note') { K.guide({ id: 'note', g: 'tap', target: noteEl, label: 'TAP TO KEEP IT', place: 'above', delay: delay ?? 1200 }); return; }
        K.guide(null);
      }

      /* ---------------- flow ---------------- */
      function startTasks() {
        if (st.phase === 'tasks') return;
        st.phase = 'tasks'; TASKS.forEach(T => { T.btn.hidden = T.done; });
        musicOn(); guideNow(900);
      }
      function maybeTwist() {
        if (st.phase !== 'tasks' || !TASKS.every(T => T.done)) return;
        if (U.wave || U.relief || B.held || B.hop) { K.later(maybeTwist, 600); return; }
        if (B.at !== 'shelf') { say(loopie, L(LINES.giveUp), { mood: 'sleepy', ms: 2000 }); hopTo('shelf', () => K.later(maybeTwist, 300)); return; }
        twist();
      }
      async function twist() {
        st.phase = 'twist'; K.guide(null); hideWhisper();
        say(rush, L(LINES.forgot), { mood: 'calm', ms: 2800 });
        await K.wait(RM() ? 900 : 2300);
        st.openT0 = now(); SFX.musicBox(); loopie.face('wow');
        await K.wait(RM() ? 500 : 1000);
        say(still, L(LINES.opens), { mood: 'wow', ms: 2400 });
        await K.wait(RM() ? 400 : 1000);
        st.paper = { t0: now(), x0: B.x + B.size * 0.12, y0: B.y - B.size * 0.9, x1: M.spotRug.x, y1: M.fy1 - 70 * M.s };
        A.whoosh({ vol: 0.1, dur: 0.6 });
        await K.wait(RM() ? 300 : 900);
        st.paper = null; showNote();
        say(still, L(LINES.inside), { mood: 'happy', ms: 3400 });
        st.phase = 'note'; guideNow(1500);
      }
      function showNote() {
        noteEl.hidden = false; placeNote();
        void noteEl.offsetWidth; noteEl.classList.add('on');
        K.sfx.paper(); SFX.pass();
      }
      function placeNote() {
        const nw = Math.round(st.kept ? Math.min(M.side ? 250 : 190, M.fw * 0.56) : Math.min(M.side ? 330 : 270, M.fw - 64));
        noteEl.style.setProperty('--do-nw', nw + 'px');
        const nh = noteEl.offsetHeight || 130;
        noteEl.style.left = Math.round(M.spotRug.x - nw / 2) + 'px';
        noteEl.style.top = Math.round(st.kept ? M.rug.y - nh * 0.62 : Math.max(M.by1 - 10 * M.s, M.fy1 - nh - 8 * M.s)) + 'px';
      }
      function placeStep() { // the open wall band between the window sill and the cabinet: clear of Loopie, the box and its label
        const sw = Math.round(Math.min(M.side ? 300 : 250, M.fw - 48)); stepEl.style.setProperty('--do-sw', sw + 'px');
        const sh = stepEl.offsetHeight || 110;
        stepEl.style.left = Math.round((M.fx0 + M.fx1) / 2 - sw / 2) + 'px';
        stepEl.style.top = Math.round(clamp(M.sillY - 30 * M.s, M.shelf.y + 6, M.cab.top + 10 * M.s - sh)) + 'px';
      }
      function keepNote() {
        if (st.phase !== 'note') return;
        noteEl.classList.add('kept'); st.kept = true; placeNote(); K.sfx.ok(); A.chime(A.note('F6'), { vol: 0.06, dur: 1.6 });
        finale();
      }
      async function finale() {
        st.phase = 'finale'; K.guide(null);
        st.sunT0 = now(); st.chainT0 = now() + 500;
        tw(B, 'orn', 1, 1600, K.ease.inOutCubic); tw(B, 'lid', 0, 900); tw(B, 'tip', 0, 900); tw(B, 'light', 0, 1200);
        MU.layers = 3; MU.vol = 1.1;
        loopie.base('sleepy'); still.base('happy');
        say(rush, L(LINES.fin), { mood: 'happy', ms: 3200 });
        st.doneOrder.forEach((k, i) => K.later(() => { TK[k].shine = 1; const a = M.anc[k]; P.emit('star', a.x, a.y, 10, { colors: ['#fff6d8', '#ffc98a', '#ffffff'] }); if (A.ctx) A.chime(A.note(['F5', 'A5', 'C6', 'E6', 'G6', 'A6'][i % 6]), { vol: 0.06, dur: 1.8 }); }, 600 + i * 380));
        K.later(() => { say(still, L(LINES.finStill), { mood: 'celebrate', ms: 0 }); rush.base('happy'); }, 3400);
        await K.finale('fireflies', { colors: ['#ffe9a8', '#ffd27a', '#fff3cf', '#ffc4a0'], chord: ['F3', 'A3', 'C4', 'E4', 'G4'], ms: 4800 });
        await K.wait(RM() ? 200 : 600);
        finish();
      }
      function finish() {
        if (st.finished) return; st.finished = true; st.phase = 'done';
        const tm = U.tempts, ps = U.passes, ck = U.checks;
        const score = tm ? clamp(ps / tm - 0.12 * Math.max(0, ck - (tm - ps)), 0, 1) : clamp(1 - 0.25 * ck, 0, 1);
        const tier = K.tier(score, [0.3, 0.6, 0.95]);
        const sat = Math.round(U.sat), fmt = (x) => Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0');
        const badges = [];
        if (tier) badges.push(tier + ' · let it sit');
        const b = K.best('sat', sat, 'higher'); if (b.isNew) badges.push('New best: sat with it ' + fmt(sat));
        const items = st.doneOrder.map(k => room.items[k]).concat(st.catPets ? ['Sleepy cat'] : []).concat([wrap.key]);
        let firstNew = null, count = 0; items.forEach(it => { const c = K.collect(it); count = c.count; if (c.isNew && !firstNew) firstNew = it; });
        if (firstNew) badges.push('Collected: ' + firstNew + ' · ' + count + ' so far');
        const did = st.doneOrder.map(k => DID[k]);
        const lines = [tm ? 'Let ' + ps + ' of ' + tm + ' urge' + (tm === 1 ? '' : 's') + ' rise and fall without checking' : 'Let the question sit on the shelf',
          'Sat with not knowing for ' + fmt(sat) + (ck ? ' · checked ' + ck + (ck === 1 ? ' time' : ' times') : ' · no checking'),
          useNote ? 'Your one step: ' + clip(stepText, 72) : 'Instead: ' + clip(did.join(', '), 74)];
        ctx.finish({ title: serious ? 'Let it sit, kept one real step' : 'Let it sit', mood: 'calm', lines, share: 'Didn’t open the worry box. ' + (SHARE[st.doneOrder[0]] || 'Made tea') + ' instead.', badges: badges.slice(0, 4) });
      }

      /* ---------------- per-frame update ---------------- */
      function update(dt, tn, t) {
        const rdt = st.lastTn ? Math.min(0.25, (tn - st.lastTn) / 1000) : 0; st.lastTn = tn;
        if (U.wave) {
          const w = U.wave;
          if (w.fastAt) { if (tn - w.fastAt >= 700) endWave('shelved'); }
          else if ((tn - w.t0) / w.T >= 1) endWave('rode');
        }
        let lvl = U.base + waveLevel(tn);
        if (U.relief) lvl = 0.1;
        if (st.phase === 'twist' || st.phase === 'note' || st.phase === 'finale' || st.phase === 'done') lvl = 0;
        U.itch += (clamp(lvl, 0, 1) - U.itch) * Math.min(1, dt * (U.relief ? 9 : 2.4));
        if (st.phase === 'tasks' && !U.relief) U.sat += rdt;
        WD.tod += (WD.todT - WD.tod) * Math.min(1, dt * 0.8);
        if (st.sunT0) WD.sun = clamp((tn - st.sunT0) / (RM() ? 600 : 3200), 0, 1);
        boxStep(dt, tn, t);
        TASKS.forEach(T => taskStep(T, dt, tn, t));
        P.update(dt);
        for (let i = st.notes.length - 1; i >= 0; i--) { const n = st.notes[i]; n.age += dt; n.x += n.vx * dt; n.y += n.vy * dt; if (n.age > n.life) st.notes.splice(i, 1); }
        if (!RM() && Math.random() < dt * 1.6 * (0.3 + WD.tod)) { const w = M.win; P.emit('mote', lerp(w.x + w.w * 0.3, w.x + w.w * 1.6, Math.random()), lerp(M.sillY, M.by1 + 60 * M.s, Math.random()), 1, { colors: ['#fff6d8'] }); }
      }
      function boxStep(dt, tn, t) {
        B.gv += ((B.grow - B.gs) * 110 - B.gv * 9) * dt; B.gs += B.gv * dt;
        twStep(B, tn);
        if (B.hop) {
          const hp = B.hop, k = clamp((tn - hp.t0) / hp.dur, 0, 1), e = K.ease.inOutCubic(k), es = hp.to === 'shelf' ? K.ease.outCubic(k) : K.ease.inCubic(k); // shrinks as it leaves, grows as it comes to you
          B.x = lerp(hp.x0, hp.x1, e); B.y = lerp(hp.y0, hp.y1, e) - Math.sin(Math.PI * k) * hp.peak; B.size = lerp(hp.s0, hp.s1, es);
          B.rot = Math.sin(Math.PI * k) * 0.22 * Math.sign(hp.x1 - hp.x0 || 1);
          if (k >= 1) { B.hop = null; B.at = hp.to; B.x = hp.x1; B.y = hp.y1; B.rot = 0; B.sqv += 3.2; if (hp.to === 'rug') B.labelOn = true; SFX.land(Math.min(1, (B.gs - 1) * 2 + 0.2)); S.buzz(6); if (!RM()) P.emit('dust', B.x, B.y, 6, { colors: ['rgba(230,210,180,0.6)'] }); if (hp.cb) hp.cb(); }
        } else if (B.held) {
          const k = 160 / (B.gs * B.gs), c = 15 / B.gs;
          B.vx += ((B.tx - B.x) * k - B.vx * c) * dt; B.vy += ((B.ty - B.y) * k - B.vy * c) * dt;
          B.x += B.vx * dt; B.y += B.vy * dt;
          B.x = clamp(B.x, M.fx0 + 30, M.fx1 - 30); B.y = clamp(B.y, M.fy0 + B.size, M.fy1 + 6);
          B.size += (boxSizeTarget() - B.size) * Math.min(1, dt * 10);
          const tgt = clamp(B.vx * 0.0008, -0.32, 0.32);
          B.rv += ((tgt - B.rot) * 140 - B.rv * 11) * dt; B.rot += B.rv * dt;
        } else {
          const sx = B.at === 'shelf' ? shelfX() : M.spotRug.x, sy = B.at === 'shelf' ? M.spotShelf.y : M.spotRug.y;
          B.x += (sx - B.x) * Math.min(1, dt * 12); B.y += (sy - B.y) * Math.min(1, dt * 12);
          B.size += (boxSizeTarget() - B.size) * Math.min(1, dt * 8);
          B.rv += (-B.rot * 150 - B.rv * 9) * dt; B.rot += B.rv * dt;
        }
        B.sqv += (-B.sq * 230 - B.sqv * 13) * dt; B.sq = clamp(B.sq + B.sqv * dt, -0.22, 0.22);
        B.jv += (-B.jy * 260 - B.jv * 12) * dt; B.jy += B.jv * dt;
        // temptation: wiggles, hops and peeks (gentler as the itch fades; none with reduced motion)
        const out = !B.held && !B.hop && ['shake', 'shelve', 'tasks'].includes(st.phase);
        if (out && tn > st.nextWig && U.itch > 0.3) {
          st.nextWig = tn + (B.at === 'rug' ? 2400 - U.itch * 1500 : 4200 - U.itch * 1800) * (0.8 + Math.random() * 0.4);
          if (!RM()) { const sg = Math.random() < 0.5 ? -1 : 1; B.rv += sg * (2 + U.itch * 4); B.sqv -= 1.6 + U.itch * 1.4; if (B.at === 'rug' && U.itch > 0.5) B.jv -= 120 + U.itch * 120; }
          SFX.rattle(U.itch * (B.at === 'rug' ? 1 : 0.5));
        }
        if (out && tn > st.nextPeek && U.itch > 0.42 && !U.relief) {
          st.nextPeek = tn + 3200 + Math.random() * 2400;
          tw(B, 'peek', 0.55, 260, K.ease.outCubic); K.later(() => { if (!U.relief) tw(B, 'peek', 0, 320); }, 760);
          if (B.at === 'rug') SFX.psst();
        }
        if (st.openT0) { const k = clamp((tn - st.openT0) / (RM() ? 300 : 1100), 0, 1); if (st.phase === 'twist' || st.phase === 'note') { B.lid = K.ease.outBack(k); B.tip = k; B.light = k; } }
        placeBoxDom();
      }
      function taskStep(T, dt, tn, t) {
        twStep(T, tn);
        T.shine = Math.max(0, T.shine - dt * 1.4);
        if (T.key === 'plant') { T.perkV += (-T.perk * 120 - T.perkV * 8) * dt; T.perk += T.perkV * dt; if (tn < T.pourUntil && !RM()) { const sp = canSpout(T); P.emit('drop', sp.x, sp.y, 1, { angle: Math.PI * 0.62, spread: 0.3, speed: [30, 70] }); } }
        if (T.key === 'frame') { T.av += ((T.target - T.ang) * 70 - T.av * 4.2) * dt; T.ang += T.av * dt; }
        if (T.key === 'books') for (let i = 0; i < 4; i++) { if (i < T.fixed) { T.bAv[i] += (-T.bAng[i] * 220 - T.bAv[i] * 13) * dt; T.bAng[i] += T.bAv[i] * dt; T.bXv[i] += (-T.bX[i] * 200 - T.bXv[i] * 14) * dt; T.bX[i] += T.bXv[i] * dt; } }
        if (T.key === 'record') { T.rot += dt * 5.5 * T.spin; if (T.playing && tn > T.noteAt && !RM()) { T.noteAt = tn + 900 + Math.random() * 500; st.notes.push({ x: M.record.x - 6 * M.record.k, y: M.record.y - 20 * M.record.k, vx: (Math.random() - 0.3) * 14, vy: -22, age: 0, life: 2.6, c: Math.random() < 0.5 ? 0 : 1 }); } }
        if (T.key === 'tea') { if ((T.heating && T.heat > 0.45) || T.steamy > 0) { T.steamy = Math.max(0, T.steamy - dt * 0.6); if (!RM() && Math.random() < dt * 6) { const sp = spoutTip(T); P.emit('smoke', sp.x, sp.y, 1, { colors: ['rgba(255,255,255,0.26)'], angle: -Math.PI / 2, spread: 0.5, speed: [10, 22], size: [2.5, 5], life: [0.8, 1.5] }); } } }
      }

      /* ---------------- draw ---------------- */
      const skyCols = () => { const set = SKY[room.sky][bright() ? 0 : 1], a = WD.tod; let top = mixC(set[0][0], set[1][0], a), bot = mixC(set[0][1], set[1][1], a); if (WD.sun > 0) { top = mixC(top, set[2][0], WD.sun); bot = mixC(bot, set[2][1], WD.sun); } return [top, bot]; };
      function draw(g, t, dt) {
        const s = M.s, w = M.win, br = bright();
        // the window: sky, sun, hills, weather (the static room is drawn over it, with the glass cut out)
        const [sTop, sBot] = skyCols();
        let gr = g.createLinearGradient(0, w.y, 0, w.y + w.h); gr.addColorStop(0, sTop); gr.addColorStop(1, sBot); g.fillStyle = gr; g.fillRect(w.x - 2, w.y - 2, w.w + 4, w.h + 4);
        const warm = Math.max(WD.tod * 0.55, WD.sun);
        const sunY = lerp(w.y + w.h * 0.22, w.y + w.h * 0.8, warm), sunX = w.x + w.w * 0.7, sunVis = room.sky === 'rain' ? clamp(WD.tod * 1.6 - 0.4 + WD.sun, 0, 1) : 1;
        if (sunVis > 0.02) { const gs2 = (br ? 44 : 34) * s; g.globalAlpha = sunVis * (br ? 1 : 0.55); g.globalCompositeOperation = 'lighter'; g.drawImage(K.glowSprite(warm > 0.5 ? '#ffb46b' : '#fff1c4'), sunX - gs2, sunY - gs2, gs2 * 2, gs2 * 2); g.globalCompositeOperation = 'source-over'; g.globalAlpha = sunVis; g.fillStyle = mixC(br ? '#fffbe8' : '#fff0cf', '#ff9a5a', warm); g.beginPath(); g.arc(sunX, sunY, 9 * s, 0, TAU); g.fill(); g.globalAlpha = 1; }
        if (room.sky === 'rain' && WD.sun > 0.2) { g.save(); g.beginPath(); g.rect(w.x, w.y, w.w, w.h); g.clip(); g.globalAlpha = (WD.sun - 0.2) * 0.5; ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'].forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 2.4 * s; g.beginPath(); g.arc(w.x + w.w * 0.4, w.y + w.h * 1.1, w.w * 0.7 - i * 2.6 * s, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }); g.restore(); g.globalAlpha = 1; }
        const hill = (c, y0, amp, ph) => { g.fillStyle = c; g.beginPath(); g.moveTo(w.x, w.y + w.h); for (let x = 0; x <= w.w; x += 6) g.lineTo(w.x + x, w.y + y0 * w.h - Math.sin(x / w.w * 3 + ph) * amp * w.h - Math.sin(x / w.w * 7 + ph * 2) * amp * 0.3 * w.h); g.lineTo(w.x + w.w, w.y + w.h); g.closePath(); g.fill(); };
        const snowy = room.sky === 'snow';
        hill(mixC(sBot, snowy ? '#eef3f8' : '#6f8fa0', 0.45), 0.7, 0.06, 0.8); hill(mixC(sBot, snowy ? '#dfe7ef' : (room.sky === 'leaves' ? '#a85a2a' : '#3f6a4a'), 0.62), 0.82, 0.05, 2.2);
        g.fillStyle = mixC(sBot, room.sky === 'leaves' ? '#c8642a' : snowy ? '#5a7a6a' : '#2f5a3a', 0.6);
        [[0.18, 0.72, 0.09], [0.3, 0.76, 0.06], [0.86, 0.78, 0.07]].forEach(([u, v, r]) => { g.beginPath(); g.arc(w.x + u * w.w, w.y + v * w.h, r * w.w, 0, TAU); g.fill(); });
        drawWeather(g, t);
        // the room (only the diorama is redrawn each frame; the backdrop around it never changes)
        const d = stat.width / M.W, rx = Math.max(0, M.x0 - 2), ry = Math.max(0, M.y0 - 2), rw2 = Math.min(M.W - rx, M.rw + 4), rh2 = Math.min(M.H - ry, M.rh + 4);
        g.drawImage(stat, rx * d, ry * d, rw2 * d, rh2 * d, rx, ry, rw2, rh2);
        // glass sheen
        g.fillStyle = 'rgba(255,255,255,0.07)'; poly(g, [w.x + w.w * 0.08, w.y, w.x + w.w * 0.3, w.y, w.x + w.w * 0.08, w.y + w.h * 0.46, w.x, w.y + w.h * 0.46, w.x, w.y + w.h * 0.18]); g.fill();
        drawBeam(g, warm);
        // back to front
        drawFrame(g, S_('frame'), t);
        drawCandle(g, S_('candle'), t);
        drawRecord(g, S_('record'), t);
        drawTea(g, S_('tea'), t);
        drawNotes(g);
        if (B.at === 'shelf' && !B.held && !B.hop) drawTheBox(g, t);
        drawBooks(g, S_('books'), t);
        if (TK.phone) drawPhone(g, TK.phone, t);
        if (TK.note) drawPad(g, TK.note, t);
        if (!(B.at === 'shelf' && !B.held && !B.hop) && !B.held && !B.hop) drawTheBox(g, t);
        drawPlant(g, S_('plant'), t);
        if (catOn) drawCat(g, t);
        if (B.held || B.hop) drawTheBox(g, t);
        if (st.paper) drawPaper(g);
        // lights: pendant, candle, finale warmth
        g.globalCompositeOperation = 'lighter';
        const pd = M.pend, lampA = br ? 0.12 + WD.sun * 0.2 : 0.55;
        g.globalAlpha = lampA; g.drawImage(K.glowSprite('#ffd79a'), pd.x - 70 * s, pd.y - 40 * s, 140 * s, 140 * s); g.globalAlpha = 1;
        const cd = S_('candle'); if (cd.lit > 0.02) { const fl = 1 + Math.sin(t * 11) * 0.05 + Math.sin(t * 6.3) * 0.04, r = 52 * M.candle.k * cd.lit * fl; g.globalAlpha = br ? 0.5 : 0.8; g.drawImage(K.glowSprite('#ffc46b'), M.candle.x - r, M.candle.y - 32 * M.candle.k - r, r * 2, r * 2); g.globalAlpha = 1; }
        TASKS.forEach(T => { if (T.shine > 0.01) { const a = M.anc[T.key], r = 34 * s; g.globalAlpha = T.shine * 0.42; g.drawImage(K.glowSprite('#ffc979'), a.x - r, a.y + 14 * s - r, r * 2, r * 2); g.globalAlpha = 1; } });
        g.globalCompositeOperation = 'source-over';
        if (WD.sun > 0) { g.fillStyle = rgba('#ff8a4a', 0.08 * WD.sun); g.fillRect(M.fx0, M.fy0, M.fw, M.fy1 - M.fy0); }
        // to-do sparkles on today's undone objects
        if (st.phase === 'tasks') TASKS.forEach((T, i) => { if (T.done) return; const a = M.anc[T.key], pz = 0.6 + 0.4 * Math.sin(t * 3 + i * 1.3); g.globalAlpha = 0.85 * pz; g.fillStyle = '#fff6c8'; K.starPath(g, a.x, a.y, 5.5 * s * pz, 1.8 * s, 4, t * 0.6); g.fill(); g.globalAlpha = 1; });
        P.draw(g);
      }
      function drawWeather(g, t) {
        const w = M.win, s = M.s, kind = room.sky; if (kind === 'clear') { const bx = w.x + ((t * 9) % (w.w + 40)) - 20, by = w.y + w.h * 0.3; g.strokeStyle = 'rgba(40,40,60,0.45)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(bx - 4 * s, by - 2 * s); g.quadraticCurveTo(bx - 2 * s, by - 3.5 * s, bx, by); g.quadraticCurveTo(bx + 2 * s, by - 3.5 * s, bx + 4 * s, by - 2 * s); g.stroke(); return; }
        g.save(); g.beginPath(); g.rect(w.x, w.y, w.w, w.h); g.clip();
        if (kind === 'rain') { const a = clamp(1 - WD.tod * 0.85 - WD.sun, 0, 1); if (a > 0.02) { g.strokeStyle = 'rgba(220,232,245,' + (0.5 * a) + ')'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 28; i++) { const x = w.x + ((i * 37.3 + t * 30) % w.w), y = w.y + ((i * 53.1 + t * 240) % w.h); g.moveTo(x, y); g.lineTo(x - 2, y + 8 * s); } g.stroke(); } }
        else if (kind === 'snow') { g.fillStyle = 'rgba(255,255,255,0.9)'; for (let i = 0; i < 26; i++) { const x = w.x + ((i * 41.7 + Math.sin(t * 0.8 + i) * 6 + t * 6) % w.w), y = w.y + ((i * 29.3 + t * 22) % w.h); g.beginPath(); g.arc(x, y, (1 + (i % 3) * 0.5) * s, 0, TAU); g.fill(); } }
        else { for (let i = 0; i < 6; i++) { const x = w.x + ((i * 51.3 + t * 14) % (w.w + 20)) - 10, y = w.y + ((i * 37.7 + t * 18) % w.h); g.fillStyle = ['#e07a3a', '#d9a441', '#b5532e'][i % 3]; g.beginPath(); g.ellipse(x, y, 3.4 * s, 1.8 * s, t * 2 + i, 0, TAU); g.fill(); } }
        g.restore();
      }
      function drawBeam(g, warm) {
        const w = M.win, s = M.s, inten2 = (bright() ? 0.55 : 0.35) * (0.45 + WD.tod * 0.45 + WD.sun * 0.6) * (room.sky === 'rain' ? 0.45 + WD.tod * 0.55 : 1);
        if (inten2 < 0.03) return;
        const col = mixC('#fff3d0', '#ffad6b', clamp(warm, 0, 1)), sh = w.w * (0.35 + WD.sun * 0.35), fz = lerp(M.by1, M.fy1, 0.5 + WD.sun * 0.12), bz = M.by1 + 6 * s, wide = 1.22;
        const P1 = [w.x + sh * 0.35, bz], P2 = [w.x + w.w + sh * 0.35, bz], P3 = [w.x + w.w * wide + sh, fz], P4 = [w.x + sh, fz];
        g.save(); g.globalCompositeOperation = 'lighter';
        let gr = g.createLinearGradient(0, w.y, 0, fz); gr.addColorStop(0, rgba(col, 0.17 * inten2)); gr.addColorStop(1, rgba(col, 0.03 * inten2));
        g.fillStyle = gr; poly(g, [w.x, w.y, w.x + w.w, w.y, P3[0], P3[1], P4[0], P4[1]]); g.fill();
        g.fillStyle = rgba(col, 0.34 * inten2);
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
          const q = (u, v) => [lerp(lerp(P1[0], P2[0], u), lerp(P4[0], P3[0], u), v), lerp(P1[1], P4[1], v)];
          const g0 = 0.04, u0 = i * 0.5 + g0, u1 = i * 0.5 + 0.5 - g0, v0 = j * 0.5 + g0, v1 = j * 0.5 + 0.5 - g0;
          const a = q(u0, v0), b = q(u1, v0), c = q(u1, v1), d = q(u0, v1); poly(g, [a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]]); g.fill();
        }
        g.restore();
      }
      function drawTheBox(g, t) {
        const Bs = B.size, it = U.itch, x = B.x, y = B.y + B.jy;
        // contact shadow
        const air = B.hop ? Math.sin(Math.PI * clamp((now() - B.hop.t0) / B.hop.dur, 0, 1)) : B.held ? 0.6 : 0;
        const sy = B.hop ? lerp(B.hop.y0, B.hop.y1, K.ease.inOutCubic(clamp((now() - B.hop.t0) / B.hop.dur, 0, 1))) : B.held ? Math.min(M.fy1 - 6, B.y + 30 * M.s) : B.y;
        g.fillStyle = 'rgba(30,15,10,' + (0.24 - air * 0.12) + ')'; g.beginPath(); g.ellipse(x + Bs * 0.14, sy + 1, Bs * (0.62 - air * 0.15), Bs * 0.11, 0, 0, TAU); g.fill();
        // glow behind (warm when calm, rosy when buzzing)
        const lit = st.phase === 'twist' || st.phase === 'note' ? B.light : it;
        if (lit > 0.08 && B.orn < 0.95) {
          const col = st.phase === 'twist' || st.phase === 'note' ? '#ffe7a6' : mixC(wrap.light, '#ff7ab0', clamp((it - 0.4) / 0.6, 0, 1)), pul = 0.75 + 0.25 * Math.sin(t * (2 + it * 5)), r = Bs * (0.95 + lit * 0.9);
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = clamp((0.08 + lit * 0.42 * pul) * (1 - B.orn), 0, 0.7);
          g.drawImage(K.glowSprite(col), x + Bs * 0.12 - r, y - Bs * 0.5 - r, r * 2, r * 2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        }
        drawBox(g, x, y, Bs, { rot: B.rot, sq: B.sq, lift: Bs * (0.07 * B.peek + 0.42 * B.lid), tip: 0.42 * B.tip, light: Math.max(B.peek * (0.4 + it * 0.6), B.light), back: B.at === 'shelf' && !B.held && !B.hop }, t);
      }
      function drawBox(g, x, y, Bs, o, t) {
        const fh = Bs * 0.8, lid = Bs * 0.17, dx = Bs * 0.25, dy = -Bs * 0.18, base = C(wrap.base), rib = C(wrap.ribbon), lb = -fh + lid, top = -fh, ex = Bs * 0.035;
        g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); if (o.sq) g.scale(1 + o.sq, 1 - o.sq);
        g.fillStyle = shade(base, 0.7); poly(g, [Bs / 2, lb, Bs / 2 + dx, lb + dy, Bs / 2 + dx, dy, Bs / 2, 0]); g.fill();
        const ry0 = lb + (fh - lid) * 0.42, rh2 = Bs * 0.1;
        g.fillStyle = shade(rib, 0.78); poly(g, [Bs / 2, ry0, Bs / 2 + dx, ry0 + dy, Bs / 2 + dx, ry0 + dy + rh2, Bs / 2, ry0 + rh2]); g.fill();
        let gr = g.createLinearGradient(0, lb, 0, 0); gr.addColorStop(0, shade(base, 1.05)); gr.addColorStop(1, shade(base, 0.84));
        g.fillStyle = gr; g.fillRect(-Bs / 2, lb, Bs, -lb);
        facePattern(g, -Bs / 2, lb, Bs, -lb, Bs);
        g.fillStyle = rib; g.fillRect(-Bs * 0.055, lb, Bs * 0.11, -lb); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(Bs * 0.04, lb, Bs * 0.015, -lb);
        g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(-Bs / 2, -Bs * 0.03, Bs, Bs * 0.03);
        if (o.back) { g.fillStyle = shade(C('#fff8ea'), 0.98); g.beginPath(); g.arc(-Bs * 0.24, lb + (fh - lid) * 0.55, Bs * 0.14, 0, TAU); g.fill(); g.fillStyle = '#b4472e'; g.font = '700 ' + Math.round(Bs * 0.2) + 'px "DynaPuff", "Baloo 2", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', -Bs * 0.24, lb + (fh - lid) * 0.56); }
        const lift = o.lift || 0;
        if (lift > 0.6) {
          g.fillStyle = '#2a1a12'; poly(g, [-Bs / 2, lb, Bs / 2, lb, Bs / 2 + dx, lb + dy, -Bs / 2 + dx, lb + dy]); g.fill();
          if (o.light > 0.02) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rgba('#ffe7a6', 0.7 * o.light); poly(g, [-Bs / 2, lb, Bs / 2, lb, Bs / 2 + dx, lb + dy, -Bs / 2 + dx, lb + dy]); g.fill();
            const rays = 5; for (let i = 0; i < rays; i++) { const u = (i + 0.5) / rays, bx2 = lerp(-Bs / 2, Bs / 2, u) + dx * 0.5, wob = Math.sin(t * 1.7 + i) * 0.08, len = Bs * (0.55 + lift / Bs * 1.6);
              const rg = g.createLinearGradient(0, lb, 0, lb - len); rg.addColorStop(0, rgba('#fff3c4', 0.32 * o.light)); rg.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = rg;
              poly(g, [bx2 - Bs * 0.06, lb + dy * 0.5, bx2 + Bs * 0.06, lb + dy * 0.5, bx2 + Bs * (0.16 + wob), lb - len, bx2 - Bs * (0.1 - wob), lb - len]); g.fill(); }
            g.restore(); }
        }
        g.save(); g.translate(0, -lift);
        if (o.tip) { g.translate(Bs / 2 + dx, top + dy); g.rotate(-o.tip); g.translate(-(Bs / 2 + dx), -(top + dy)); }
        g.fillStyle = shade(base, 0.62); poly(g, [Bs / 2 + ex, top - ex * 0.5, Bs / 2 + ex + dx, top - ex * 0.5 + dy, Bs / 2 + ex + dx, lb + dy, Bs / 2 + ex, lb]); g.fill();
        gr = g.createLinearGradient(0, top + dy, 0, top); gr.addColorStop(0, shade(base, 1.2)); gr.addColorStop(1, shade(base, 1.03)); g.fillStyle = gr;
        poly(g, [-Bs / 2 - ex, top - ex * 0.5, Bs / 2 + ex, top - ex * 0.5, Bs / 2 + ex + dx, top - ex * 0.5 + dy, -Bs / 2 - ex + dx, top - ex * 0.5 + dy]); g.fill();
        g.fillStyle = shade(base, 0.98); g.fillRect(-Bs / 2 - ex, top - ex * 0.5, Bs + ex * 2, lid + ex * 0.5);
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(-Bs / 2 - ex, lb - 1.4, Bs + ex * 2, 1.4); g.fillStyle = 'rgba(255,255,255,0.24)'; g.fillRect(-Bs / 2 - ex, top - ex * 0.5, Bs + ex * 2, 1.3);
        g.fillStyle = rib; g.fillRect(-Bs * 0.055, top - ex * 0.5, Bs * 0.11, lid + ex * 0.5);
        g.fillStyle = shade(rib, 1.08); poly(g, [-Bs * 0.055, top - ex * 0.5, Bs * 0.055, top - ex * 0.5, Bs * 0.055 + dx, top - ex * 0.5 + dy, -Bs * 0.055 + dx, top - ex * 0.5 + dy]); g.fill();
        const my = top - ex * 0.5 + dy * 0.5, mx = dx * 0.5;
        g.fillStyle = shade(rib, 0.95); poly(g, [-Bs / 2 - ex + mx, my - Bs * 0.028, Bs / 2 + ex + mx, my - Bs * 0.028, Bs / 2 + ex + mx, my + Bs * 0.028, -Bs / 2 - ex + mx, my + Bs * 0.028]); g.fill();
        drawBow(g, mx, my, Bs, rib, t);
        g.restore();
        if (o.light > 0.02 && lift < 0.6 + Bs) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = clamp(o.light, 0, 1); g.drawImage(K.glowSprite(wrap.light), -Bs * 0.62, lb - lift * 0.5 - Bs * 0.1, Bs * 1.24 + dx, Bs * 0.2 + lift); g.restore(); }
        g.restore();
      }
      function drawBow(g, x, y, Bs, rib, t) {
        const r = Bs * 0.12, wob = Math.sin(t * 5.5) * 0.05 * U.itch;
        g.lineWidth = Math.max(1, Bs * 0.012); g.strokeStyle = shade(rib, 0.66);
        [-1, 1].forEach(sd => { g.save(); g.translate(x, y - r * 0.2); g.rotate(sd * (0.45 + wob)); g.fillStyle = rib; g.beginPath(); g.ellipse(sd * r * 0.85, -r * 0.3, r, r * 0.55, sd * -0.25, 0, TAU); g.fill(); g.stroke(); g.fillStyle = shade(rib, 0.7); g.beginPath(); g.ellipse(sd * r * 0.75, -r * 0.3, r * 0.42, r * 0.2, sd * -0.25, 0, TAU); g.fill(); g.restore(); });
        g.fillStyle = rib; poly(g, [x - Bs * 0.02, y, x - Bs * 0.11, y + Bs * 0.13, x - Bs * 0.05, y + Bs * 0.12]); g.fill(); poly(g, [x + Bs * 0.02, y, x + Bs * 0.08, y + Bs * 0.14, x + Bs * 0.12, y + Bs * 0.1]); g.fill();
        g.beginPath(); g.arc(x, y - r * 0.25, r * 0.38, 0, TAU); g.fill(); g.stroke();
      }
      function facePattern(g, x, y, w, hh, Bs) {
        if (wrap.pat === 'none') return;
        g.save(); g.beginPath(); g.rect(x, y, w, hh); g.clip(); g.fillStyle = 'rgba(255,255,255,0.22)';
        const step = Bs * 0.16;
        if (wrap.pat === 'stripes') { g.fillStyle = 'rgba(255,255,255,0.3)'; for (let xx = x - hh; xx < x + w; xx += step) { poly(g, [xx, y + hh, xx + step * 0.45, y + hh, xx + step * 0.45 + hh, y, xx + hh, y]); g.fill(); } }
        else { let r = 0; for (let yy = y + step * 0.5; yy < y + hh; yy += step, r++) for (let xx = x + (r % 2 ? step * 0.5 : 0) + step * 0.25; xx < x + w; xx += step) { if (wrap.pat === 'dots') { g.beginPath(); g.arc(xx, yy, Bs * 0.022, 0, TAU); g.fill(); } else { K.starPath(g, xx, yy, Bs * 0.04, Bs * 0.016, 4, 0); g.fill(); } } }
        g.restore();
      }
      function drawPaper(g) {
        const p = st.paper, k = clamp((now() - p.t0) / (RM() ? 300 : 900), 0, 1), e = K.ease.inOutCubic(k), x = lerp(p.x0, p.x1, e), y = lerp(p.y0, p.y1, e) - Math.sin(Math.PI * k) * 60 * M.s, sz = lerp(10, 38, e) * M.s;
        g.save(); g.translate(x, y); g.rotate(Math.sin(k * 9) * 0.3); g.fillStyle = '#fff8ea'; g.fillRect(-sz / 2, -sz * 0.35, sz, sz * 0.7); g.strokeStyle = 'rgba(120,90,50,0.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-sz / 2, 0); g.lineTo(sz / 2, 0); g.stroke(); g.restore();
        if (!RM() && Math.random() < 0.5) P.emit('star', x, y, 1, { colors: ['#fff3c4'] });
      }
      function drawCandle(g, T, t) {
        const c = M.candle, k = c.k, x = c.x, y = c.y, ch = 24 * k, cw = 9 * k, wy = y - 3 * k - ch;
        g.fillStyle = C('#caa25c'); g.beginPath(); g.ellipse(x, y - 1.5 * k, 10 * k, 3 * k, 0, 0, TAU); g.fill();
        let gr = g.createLinearGradient(x - cw / 2, 0, x + cw / 2, 0); gr.addColorStop(0, C('#eadcbc')); gr.addColorStop(0.5, C('#fff8e8')); gr.addColorStop(1, C('#dccaa4'));
        g.fillStyle = gr; rr(g, x - cw / 2, wy, cw, ch, 2 * k); g.fill(); g.fillStyle = C('#fffaf0'); rr(g, x + cw * 0.12, wy, 2.4 * k, 8 * k, 1.2 * k); g.fill();
        g.strokeStyle = '#3a2a1e'; g.lineWidth = 1.1 * k; g.beginPath(); g.moveTo(x, wy); g.lineTo(x + 0.6 * k, wy - 4 * k); g.stroke();
        if (T.match > 0.02) {
          const mx = x + lerp(16, 3, T.match) * k, my = wy - lerp(2, 6, T.match) * k;
          g.globalAlpha = clamp(T.match * 1.4, 0, 1); g.strokeStyle = '#d9b07a'; g.lineWidth = 1.6 * k; g.beginPath(); g.moveTo(mx + 11 * k, my + 9 * k); g.lineTo(mx, my); g.stroke();
          g.fillStyle = '#b8322a'; g.beginPath(); g.arc(mx, my, 1.8 * k, 0, TAU); g.fill(); if (T.lit < 0.6) flame(g, mx, my - 1 * k, k * 0.6, t); g.globalAlpha = 1;
        }
        if (T.lit > 0.02) flame(g, x + 0.6 * k, wy - 3.6 * k, k * T.lit, t);
      }
      function flame(g, x, y, k, t) {
        const f = 1 + Math.sin(t * 13) * 0.06 + Math.sin(t * 7.1 + 1) * 0.05, hh = 12 * k * f, w = 4.2 * k;
        g.save(); g.translate(x, y); g.rotate(Math.sin(t * 3.3) * 0.06);
        const gr = g.createRadialGradient(0, -hh * 0.3, 0, 0, -hh * 0.3, hh); gr.addColorStop(0, '#fffbe6'); gr.addColorStop(0.4, '#ffd36b'); gr.addColorStop(1, 'rgba(255,120,40,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(0, -hh); g.bezierCurveTo(w, -hh * 0.45, w * 0.9, 0, 0, 0); g.bezierCurveTo(-w * 0.9, 0, -w, -hh * 0.45, 0, -hh); g.fill(); g.restore();
      }
      function drawFrame(g, T, t) {
        const F = M.frame, k = F.k, fw = 60 * k, fh = 46 * k, nx = F.x, ny = F.y - fh / 2 - 8 * k, a = T.ang;
        const cs = Math.cos(a), sn = Math.sin(a), rot = (px, py) => ({ x: px * cs - py * sn, y: px * sn + py * cs });
        const c1 = rot(-fw * 0.32, 8 * k), c2 = rot(fw * 0.32, 8 * k);
        g.strokeStyle = 'rgba(60,40,30,0.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(nx + c1.x, ny + c1.y); g.lineTo(nx, ny); g.lineTo(nx + c2.x, ny + c2.y); g.stroke();
        g.save(); g.translate(nx, ny); g.rotate(a);
        g.fillStyle = 'rgba(0,0,0,0.2)'; rr(g, -fw / 2 + 3 * k, 11 * k, fw, fh, 2 * k); g.fill();
        g.fillStyle = C(room.frameWood); rr(g, -fw / 2, 8 * k, fw, fh, 2 * k); g.fill();
        g.fillStyle = C(shade(room.frameWood, 1.35)); g.fillRect(-fw / 2 + 2 * k, 9.5 * k, fw - 4 * k, 1.6 * k);
        const ix = -fw / 2 + 6 * k, iy = 14 * k, iw = fw - 12 * k, ih = fh - 12 * k, pc = room.paint;
        g.save(); g.beginPath(); g.rect(ix, iy, iw, ih); g.clip();
        const gr = g.createLinearGradient(0, iy, 0, iy + ih); gr.addColorStop(0, C(pc[0])); gr.addColorStop(1, C(pc[1])); g.fillStyle = gr; g.fillRect(ix, iy, iw, ih);
        g.fillStyle = C(pc[3]); g.beginPath(); g.arc(ix + iw * 0.72, iy + ih * 0.36, ih * 0.16, 0, TAU); g.fill();
        g.fillStyle = C(pc[2]); g.beginPath(); g.moveTo(ix, iy + ih); g.lineTo(ix, iy + ih * 0.62); g.quadraticCurveTo(ix + iw * 0.3, iy + ih * 0.45, ix + iw * 0.55, iy + ih * 0.66); g.quadraticCurveTo(ix + iw * 0.8, iy + ih * 0.78, ix + iw, iy + ih * 0.6); g.lineTo(ix + iw, iy + ih); g.closePath(); g.fill();
        if (T.glint > 0.01 && T.glint < 0.99) { const gx = ix - iw * 0.3 + T.glint * iw * 1.6; g.fillStyle = 'rgba(255,255,255,0.5)'; poly(g, [gx, iy, gx + 7 * k, iy, gx + 1 * k, iy + ih, gx - 6 * k, iy + ih]); g.fill(); }
        g.restore();
        g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 1; g.strokeRect(ix, iy, iw, ih);
        g.restore();
        g.fillStyle = '#8a8a90'; g.beginPath(); g.arc(nx, ny, 1.7 * k, 0, TAU); g.fill();
      }
      function drawRecord(g, T, t) {
        const R = M.record, k = R.k, x = R.x, y = R.y, bw = 58 * k, bh = 12 * k;
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(x, y - 1, bw * 0.55, 3 * k, 0, 0, TAU); g.fill();
        g.fillStyle = C(room.woodD); rr(g, x - bw / 2, y - bh, bw, bh, 2 * k); g.fill();
        g.fillStyle = C(shade(room.woodD, 1.3)); poly(g, [x - bw / 2, y - bh, x + bw / 2, y - bh, x + bw / 2 - 3 * k, y - bh - 7 * k, x - bw / 2 + 3 * k, y - bh - 7 * k]); g.fill();
        const px = x - 6 * k, py = y - bh - 3.5 * k;
        g.fillStyle = '#18181c'; g.beginPath(); g.ellipse(px, py, 19 * k, 5 * k, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.13)'; g.lineWidth = 0.8; [14, 10].forEach(r => { g.beginPath(); g.ellipse(px, py, r * k, r * k * 0.26, 0, 0, TAU); g.stroke(); });
        g.fillStyle = C(room.vinyl); g.beginPath(); g.ellipse(px, py, 5.5 * k, 1.6 * k, 0, 0, TAU); g.fill();
        if (T.spin > 0.01) { g.strokeStyle = 'rgba(255,255,255,' + (0.4 * T.spin) + ')'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(px, py, 12 * k, 3.2 * k, 0, T.rot, T.rot + 0.9); g.stroke(); }
        const ax = x + bw / 2 - 7 * k, ay = y - bh - 4 * k, ang = lerp(1.85, 2.95, T.arm), Lr = 20 * k, nx = ax + Math.cos(ang) * Lr, ny = ay + Math.sin(ang) * Lr * 0.4 + (T.playing ? 1.2 * k : 0);
        g.fillStyle = '#c9c9cf'; g.beginPath(); g.arc(ax, ay, 2.6 * k, 0, TAU); g.fill();
        g.strokeStyle = '#dcdce2'; g.lineWidth = 1.6 * k; g.lineCap = 'round'; g.beginPath(); g.moveTo(ax, ay); g.lineTo(nx, ny); g.stroke();
        g.fillStyle = '#8e8e96'; g.fillRect(nx - 2 * k, ny - 1.5 * k, 4 * k, 3 * k);
        g.fillStyle = T.playing ? '#ffcf6b' : '#5a4a3a'; g.beginPath(); g.arc(x + bw / 2 - 6 * k, y - bh / 2, 1.8 * k, 0, TAU); g.fill();
      }
      function drawNotes(g) {
        if (!st.notes.length) return;
        const k = M.record.k; g.fillStyle = C(room.vinyl); g.strokeStyle = C(room.vinyl);
        st.notes.forEach(n => {
          g.globalAlpha = clamp(Math.min(n.age * 3, (n.life - n.age) / 0.8), 0, 1) * 0.9;
          const x = n.x + Math.sin(n.age * 3) * 4 * k, y = n.y;
          g.beginPath(); g.ellipse(x, y, 3 * k, 2.2 * k, -0.4, 0, TAU); g.fill(); g.lineWidth = 1.2 * k; g.beginPath(); g.moveTo(x + 2.6 * k, y); g.lineTo(x + 2.6 * k, y - 10 * k);
          if (n.c) { g.lineTo(x + 7 * k, y - 8 * k); } g.stroke();
        });
        g.globalAlpha = 1;
      }
      function spoutTip(T) { const P0 = M.tea, k = P0.k, kx = P0.x - 8 * k, ky = P0.y - T.pour * 10 * k, a = T.pour * 0.75, lx = 19 * k, ly = -15 * k; return { x: kx + lx * Math.cos(a) - ly * Math.sin(a), y: ky + lx * Math.sin(a) + ly * Math.cos(a) }; }
      function drawTea(g, T, t) {
        const P0 = M.tea, k = P0.k, x = P0.x, y = P0.y, cx = x + 17 * k, cy = y;
        g.fillStyle = 'rgba(0,0,0,0.16)'; g.beginPath(); g.ellipse(x + 4 * k, y - 0.5, 26 * k, 3 * k, 0, 0, TAU); g.fill();
        g.fillStyle = C(shade(room.cup, 0.92)); g.beginPath(); g.ellipse(cx, cy - 1.5 * k, 9.5 * k, 2.5 * k, 0, 0, TAU); g.fill();
        g.fillStyle = C(room.cup); g.beginPath(); g.moveTo(cx - 6 * k, cy - 12 * k); g.lineTo(cx + 6 * k, cy - 12 * k); g.quadraticCurveTo(cx + 6.4 * k, cy - 2.5 * k, cx, cy - 2.5 * k); g.quadraticCurveTo(cx - 6.4 * k, cy - 2.5 * k, cx - 6 * k, cy - 12 * k); g.fill();
        g.strokeStyle = C(room.cup); g.lineWidth = 1.8 * k; g.beginPath(); g.arc(cx + 7 * k, cy - 8.5 * k, 2.6 * k, -1.3, 1.3); g.stroke();
        g.fillStyle = C(shade(room.cup, 0.82)); g.beginPath(); g.ellipse(cx, cy - 12 * k, 6 * k, 1.7 * k, 0, 0, TAU); g.fill();
        if (T.fill > 0.02) { g.fillStyle = C(room.tea); g.beginPath(); g.ellipse(cx, cy - 12 * k + (1 - T.fill) * 0.8 * k, 5.2 * k * (0.6 + 0.4 * T.fill), 1.35 * k, 0, 0, TAU); g.fill(); }
        if (T.stir > 0.01 && T.stir < 0.99) { const a = T.stir * TAU * 2.5; g.strokeStyle = '#d8d8de'; g.lineWidth = 1.2 * k; g.beginPath(); g.moveTo(cx + Math.cos(a) * 2.6 * k, cy - 12 * k + Math.sin(a) * 0.8 * k); g.lineTo(cx + 3.5 * k + Math.cos(a) * 1.4 * k, cy - 23 * k); g.stroke(); }
        if (T.decor ? false : T.done) { g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1.2 * k; for (let i = 0; i < 2; i++) { const ph = t * 1.6 + i * 2; g.beginPath(); for (let j = 0; j <= 10; j++) { const yy = cy - 14 * k - j * 1.6 * k, xx = cx - 1.5 * k + i * 3 * k + Math.sin(ph + j * 0.6) * 1.8 * k; if (!j) g.moveTo(xx, yy); else g.lineTo(xx, yy); } g.globalAlpha = 0.6; g.stroke(); g.globalAlpha = 1; } }
        const kx = x - 8 * k, body = C(room.kettle), jit = T.heating && !RM() ? Math.sin(t * 60) * 0.4 * k * T.heat : 0;
        g.save(); g.translate(kx + jit, y - T.pour * 10 * k); g.rotate(T.pour * 0.75);
        g.fillStyle = body; g.beginPath(); g.moveTo(-12 * k, 0); g.quadraticCurveTo(-14.5 * k, -14 * k, -6 * k, -17 * k); g.lineTo(6 * k, -17 * k); g.quadraticCurveTo(14.5 * k, -14 * k, 12 * k, 0); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(-6 * k, -10 * k, 2.2 * k, 4.6 * k, -0.3, 0, TAU); g.fill();
        g.strokeStyle = body; g.lineWidth = 3 * k; g.lineCap = 'round'; g.beginPath(); g.moveTo(9 * k, -6 * k); g.quadraticCurveTo(17 * k, -7 * k, 19 * k, -15 * k); g.stroke();
        g.fillStyle = shade(body, 0.82); g.beginPath(); g.ellipse(0, -17 * k, 7 * k, 2 * k, 0, 0, TAU); g.fill();
        g.fillStyle = '#2b2b2b'; g.beginPath(); g.arc(0, -20 * k, 1.8 * k, 0, TAU); g.fill();
        g.strokeStyle = '#2b2b2b'; g.lineWidth = 2 * k; g.beginPath(); g.arc(0, -17 * k, 9 * k, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
        if (T.heating) { g.fillStyle = rgba('#ff7a3a', 0.4 + 0.6 * T.heat); g.beginPath(); g.arc(-7 * k, -3 * k, 1.4 * k, 0, TAU); g.fill(); }
        g.restore();
        if (T.pouring) { const sp = spoutTip(T); g.strokeStyle = C(room.tea); g.lineWidth = 1.7 * k; g.beginPath(); g.moveTo(sp.x, sp.y); g.quadraticCurveTo(sp.x + 3 * k, sp.y + 4 * k, cx, cy - 11 * k); g.stroke(); }
      }
      function drawBooks(g, T, t) {
        const sd = M.st, k = sd.k, base = sd.top - 4 * k, BW = [9, 12, 8, 11], BH = [38, 44, 34, 41];
        let x = sd.x - sd.w / 2 + 7 * k; const neat = [];
        for (let i = 0; i < 4; i++) { neat.push(x + BW[i] * k / 2); x += BW[i] * k + 0.7 * k; }
        if (T.end > 0.01) { const ex2 = x + 4 * k, eh = 22 * k * T.end; g.fillStyle = C('#c99a4a'); rr(g, ex2, base - eh, 9 * k, eh, 2 * k); g.fill(); g.fillStyle = C('#a87a2e'); g.fillRect(ex2 - 2 * k, base - 2 * k, 13 * k, 2 * k); }
        for (let i = 0; i < 4; i++) {
          const bw = BW[i] * k, bh = BH[i] * k, a = T.bAng[i], bx = neat[i] + T.bX[i] * k, piv = a >= 0 ? bw / 2 : -bw / 2;
          g.save(); g.translate(bx + piv, base); g.rotate(a);
          g.fillStyle = C(room.books[i]); rr(g, -piv - bw / 2, -bh, bw, bh, 1.2 * k); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.24)'; g.fillRect(-piv - bw / 2 + 1 * k, -bh + 4 * k, bw - 2 * k, 1.6 * k); g.fillRect(-piv - bw / 2 + 1 * k, -6 * k, bw - 2 * k, 1.6 * k);
          g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(-piv + bw / 2 - 1.6 * k, -bh, 1.6 * k, bh);
          g.restore();
        }
      }
      function drawPhone(g, T, t) {
        const sd = M.st, k = sd.k, x = sd.x + 8 * k, y = sd.low - 1 * k, f = T.flip, pw = 30 * k, ph = 7 * k;
        g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(x, y, pw * 0.55, 2 * k, 0, 0, TAU); g.fill();
        const sy = Math.cos(f * Math.PI), up = sy > 0;
        g.save(); g.translate(x, y - ph * 0.5); g.scale(1, Math.max(0.08, Math.abs(sy)));
        g.fillStyle = '#26262c'; rr(g, -pw / 2, -ph / 2 - 2 * k, pw, ph + 4 * k, 2.2 * k); g.fill();
        if (up) { const it = U.itch, buzz = 0.55 + 0.45 * Math.sin(t * (4 + it * 6)); g.fillStyle = mixC('#7fb8ff', '#ff8fb8', clamp(it, 0, 1)); g.globalAlpha = 0.6 + 0.4 * buzz * it; rr(g, -pw / 2 + 2 * k, -ph / 2, pw - 4 * k, ph, 1.4 * k); g.fill(); g.globalAlpha = 1; g.fillStyle = '#ff4d5e'; g.beginPath(); g.arc(pw / 2 - 4 * k, -ph / 2 + 1 * k, 2 * k * (0.7 + 0.3 * buzz), 0, TAU); g.fill(); }
        else { g.fillStyle = '#3a3a42'; g.beginPath(); g.arc(-pw / 2 + 6 * k, 0, 1.6 * k, 0, TAU); g.fill(); }
        g.restore();
        if (up && !RM() && U.itch > 0.5 && Math.sin(t * 9) > 0.96) { g.strokeStyle = 'rgba(255,140,170,0.6)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y - ph, 10 * k, -2.4, -0.7); g.stroke(); }
        if (T.cosy > 0.01) {
          const cw2 = pw * 1.08 * Math.min(1, T.cosy), cx = x - pw * 0.54;
          g.fillStyle = C(room.rug); rr(g, cx, y - ph - 3.5 * k, cw2, ph + 4 * k, 3 * k); g.fill();
          g.strokeStyle = C(room.rug2); g.lineWidth = 1; g.beginPath(); for (let i = 0; i < cw2 / (3 * k); i++) { const xx = cx + 1.5 * k + i * 3 * k; g.moveTo(xx, y - ph - 2 * k); g.lineTo(xx + 1.5 * k, y - ph * 0.5 - 1 * k); g.lineTo(xx, y); } g.stroke();
          g.fillStyle = C(room.rug2); g.fillRect(cx, y - ph - 3.5 * k, cw2, 2 * k);
        }
      }
      function drawPad(g, T, t) {
        const sd = M.st, k = sd.k, x = sd.x + 6 * k, y = sd.low - 1 * k, pw = 26 * k, ph = 18 * k;
        g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(x, y, pw * 0.6, 2 * k, 0, 0, TAU); g.fill();
        g.save(); g.translate(x, y); g.rotate(-0.06);
        g.fillStyle = C('#fff6c0'); rr(g, -pw / 2, -ph, pw, ph, 1.5 * k); g.fill();
        g.fillStyle = C('#e2b04a'); g.fillRect(-pw / 2, -ph, pw, 2.6 * k);
        g.strokeStyle = 'rgba(80,60,30,0.25)'; g.lineWidth = 0.8; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-pw / 2 + 2 * k, -ph + 6 * k + i * 3 * k); g.lineTo(pw / 2 - 2 * k, -ph + 6 * k + i * 3 * k); g.stroke(); }
        if (T.scrib > 0.01) { g.strokeStyle = '#3a4a8a'; g.lineWidth = 1.1 * k; g.beginPath(); const n = Math.floor(T.scrib * 22); for (let i = 0; i <= n; i++) { const row = Math.floor(i / 11), xx = -pw / 2 + 3 * k + (i % 11) * 1.8 * k, yy = -ph + 5.5 * k + row * 3 * k + (i % 2 ? -1 : 0.6) * k; if (i % 11 === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy); } g.stroke(); }
        if (T.done) { g.fillStyle = '#e2a33a'; K.starPath(g, pw / 2 - 5 * k, -5 * k, 3 * k, 1.3 * k, 5, 0); g.fill(); }
        g.restore();
        const pa = T.scrib > 0 && T.scrib < 1 ? Math.sin(T.scrib * 40) * 2 * k : 0;
        g.save(); g.translate(x + pw * 0.3 + pa, y - ph * 0.8 - (T.scrib > 0 && T.scrib < 1 ? 2 * k : 0)); g.rotate(0.9); g.fillStyle = '#e2b04a'; g.fillRect(-1.4 * k, -14 * k, 2.8 * k, 14 * k); g.fillStyle = '#3a2a1e'; poly(g, [-1.4 * k, 0, 1.4 * k, 0, 0, 3.4 * k]); g.fill(); g.restore();
      }
      function canSpout(T) { const c = M.can, k = c.k, x = lerp(c.x, M.plant.x + 32 * k, T.can), y = lerp(c.y, M.plant.y - 72 * k, T.can), a = lerp(0, -0.75, T.can), lx = -24 * k, ly = -19 * k; return { x: x + lx * Math.cos(a) - ly * Math.sin(a), y: y + lx * Math.sin(a) + ly * Math.cos(a) }; }
      function drawPlant(g, T, t) {
        const Pl = M.plant, k = Pl.k, x = Pl.x, soil = Pl.y - 42 * k, grown = T.decor ? 3 : T.grown, droop = T.decor ? 0 : clamp(1 - grown / 3, 0, 1) * 0.95 + T.perk;
        const LEAF = [[-2.2, 50, 0], [-1.15, 62, 0], [-0.6, 50, 0], [-1.75, 58, 1], [-0.9, 46, 2], [-2.55, 42, 3]];
        LEAF.forEach(([a0, len, at], i) => {
          const sc = at === 0 ? 1 : clamp(grown - (at - 1), 0, 1); if (sc <= 0.01) return;
          const side = a0 < -Math.PI / 2 ? -1 : 1, a = a0 + side * droop * 0.6 + Math.sin(t * 1.2 + i * 1.7) * 0.025, Lf = len * k * (0.35 + 0.65 * sc);
          const ex = x + Math.cos(a) * Lf * 0.55, ey = soil + Math.sin(a) * Lf * 0.55;
          g.strokeStyle = C('#4f7a3a'); g.lineWidth = 2 * k; g.beginPath(); g.moveTo(x + side * 2 * k, soil); g.quadraticCurveTo(x + Math.cos(a) * Lf * 0.15, soil + Math.sin(a) * Lf * 0.42, ex, ey); g.stroke();
          leaf(g, ex, ey, a + side * droop * 0.55, Lf * 0.6, Lf * 0.34, i);
        });
        if (T.bloom > 0.01) {
          const fx = x + 3 * k, fy = soil - 58 * k, r = 7 * k * T.bloom;
          g.strokeStyle = C('#4f7a3a'); g.lineWidth = 1.6 * k; g.beginPath(); g.moveTo(x + 1 * k, soil); g.quadraticCurveTo(x - 4 * k, soil - 30 * k, fx, fy); g.stroke();
          g.fillStyle = C(room.flower); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + t * 0.2; g.beginPath(); g.ellipse(fx + Math.cos(a) * r * 0.7, fy + Math.sin(a) * r * 0.7, r * 0.55, r * 0.36, a, 0, TAU); g.fill(); }
          g.fillStyle = '#ffe48a'; g.beginPath(); g.arc(fx, fy, r * 0.32, 0, TAU); g.fill();
        }
        // watering can (spout on the left, tips over the pot while watering)
        const c = M.can, ck = c.k, lift = T.decor ? 0 : T.can, cx = lerp(c.x, x + 32 * ck, lift), cy = lerp(c.y, Pl.y - 72 * ck, lift), ca = lerp(0, -0.75, lift);
        g.fillStyle = 'rgba(0,0,0,' + (0.18 * (1 - lift)) + ')'; g.beginPath(); g.ellipse(c.x, c.y, 14 * ck, 3 * ck, 0, 0, TAU); g.fill();
        g.save(); g.translate(cx, cy); g.rotate(ca);
        const cc = C(room.can);
        g.strokeStyle = cc; g.lineWidth = 3 * ck; g.lineCap = 'round'; g.beginPath(); g.moveTo(-8 * ck, -7 * ck); g.lineTo(-23 * ck, -18 * ck); g.stroke();
        g.fillStyle = shade(cc, 0.8); rr(g, -27 * ck, -21 * ck, 6 * ck, 4 * ck, 1.5 * ck); g.fill();
        g.fillStyle = cc; rr(g, -11 * ck, -18 * ck, 22 * ck, 18 * ck, 3 * ck); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(-8 * ck, -16 * ck, 3 * ck, 13 * ck);
        g.strokeStyle = shade(cc, 0.75); g.lineWidth = 2.2 * ck; g.beginPath(); g.arc(3 * ck, -18 * ck, 7 * ck, Math.PI, Math.PI * 1.95); g.stroke();
        g.restore();
      }
      function leaf(g, x, y, a, len, wid, i) {
        g.save(); g.translate(x, y); g.rotate(a);
        g.fillStyle = C(i % 2 ? '#5f9e4f' : '#4c8c43'); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(len * 0.25, -wid * 0.78, len * 0.82, -wid * 0.62, len, 0); g.bezierCurveTo(len * 0.82, wid * 0.62, len * 0.25, wid * 0.78, 0, 0); g.fill();
        g.fillStyle = C(i % 2 ? '#6fb05c' : '#5aa04e'); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(len * 0.25, -wid * 0.78, len * 0.82, -wid * 0.62, len, 0); g.lineTo(0, 0); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(len * 0.06, 0); g.lineTo(len * 0.9, 0); g.stroke();
        g.restore();
      }
      function drawCat(g, t) {
        const c = M.cat, k = c.k, x = c.x, y = c.y, purr = now() - st.purrT < 1600, br2 = 1 + Math.sin(t * (purr ? 9 : 1.6)) * (purr ? 0.02 : 0.03), col = C(room.cat);
        g.fillStyle = 'rgba(0,0,0,0.16)'; g.beginPath(); g.ellipse(x, y, 24 * k, 4 * k, 0, 0, TAU); g.fill();
        g.save(); g.translate(x, y); g.scale(1, br2);
        g.strokeStyle = col; g.lineWidth = 4.2 * k; g.lineCap = 'round'; g.beginPath(); g.moveTo(14 * k, -5 * k); g.quadraticCurveTo(24 * k, -2 * k + (purr ? Math.sin(t * 8) * 3 * k : 0), 10 * k, 1 * k); g.quadraticCurveTo(0, 2 * k, -10 * k, 0); g.stroke();
        g.fillStyle = col; g.beginPath(); g.ellipse(0, -8 * k, 18 * k, 9 * k, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.12)'; [-6, 0, 6].forEach(sx => { g.beginPath(); g.ellipse(sx * k, -14 * k, 1.6 * k, 3.2 * k, 0, 0, TAU); g.fill(); });
        g.fillStyle = col; g.beginPath(); g.arc(-15 * k, -9 * k, 7.5 * k, 0, TAU); g.fill();
        poly(g, [-21 * k, -12 * k, -19.5 * k, -20 * k, -15 * k, -15 * k]); g.fill(); poly(g, [-14 * k, -15.5 * k, -10 * k, -19.5 * k, -9.5 * k, -12 * k]); g.fill();
        g.strokeStyle = 'rgba(40,30,30,0.7)'; g.lineWidth = 1; g.beginPath(); g.arc(-18 * k, -9 * k, 1.6 * k, 0.2, Math.PI - 0.2); g.moveTo(-11.2 * k, -9 * k); g.arc(-12.6 * k, -9 * k, 1.6 * k, 0.2, Math.PI - 0.2); g.stroke();
        g.fillStyle = '#ff9fb2'; g.beginPath(); g.arc(-15.4 * k, -6.6 * k, 0.9 * k, 0, TAU); g.fill();
        g.restore();
        if (purr && !RM() && Math.random() < 0.05) P.emit('star', x - 14 * k, y - 22 * k, 1, { colors: ['#ffb3c8'] });
      }

      /* ---------------- DOM that follows the box ---------------- */
      function placeBoxDom() {
        const Bs = B.size, fh = Bs * 0.8, dx = Bs * 0.25, ew = Math.max(64, Bs + dx), eh = Math.max(64, fh - Bs * -0.18 + Bs * 0.16);
        const ex = B.x - Bs / 2 - (ew - (Bs + dx)) / 2, ey = B.y + B.jy - eh + 4;
        if (Math.abs(ew - B.ew) > 0.5 || Math.abs(eh - B.eh) > 0.5) { boxEl.style.width = ew.toFixed(1) + 'px'; boxEl.style.height = eh.toFixed(1) + 'px'; B.ew = ew; B.eh = eh; }
        if (Math.abs(ex - B.ex) > 0.2 || Math.abs(ey - B.ey) > 0.2) { boxEl.style.transform = 'translate(' + ex.toFixed(1) + 'px,' + ey.toFixed(1) + 'px)'; B.ex = ex; B.ey = ey; }
        const vis = B.labelOn && B.orn < 0.05 && !(st.phase === 'twist' || st.phase === 'note' || st.phase === 'finale' || st.phase === 'done');
        if (vis !== st.labVis) { st.labVis = vis; label.style.opacity = vis ? '1' : '0'; }
        if (vis) {
          const lid = Bs * 0.17, ly = -(fh - lid) * 0.48 - fh * 0.0, sx = 1 + B.sq, sy = 1 - B.sq, cs = Math.cos(B.rot), sn = Math.sin(B.rot);
          const lx = 0, px = B.x + lx * sx * cs - ly * sy * sn, py = B.y + B.jy + lx * sx * sn + ly * sy * cs, sc = clamp(Bs / M.bRug, 0.55, 1.45);
          label.style.transform = 'translate(' + (px - M.lw / 2).toFixed(1) + 'px,' + (py - M.lh / 2).toFixed(1) + 'px) rotate(' + (B.rot - 0.03).toFixed(3) + 'rad) scale(' + (sc * sx).toFixed(3) + ',' + (sc * sy).toFixed(3) + ')';
        }
        if (whisper.classList.contains('on')) {
          const ww = st.whW || 200, wh = st.whH || 50, wx = clamp(B.x + Bs * 0.1 - ww / 2, M.fx0 + 6, M.fx1 - ww - 6), wy = Math.max(M.fy0 + 6, B.y + B.jy - Bs * 1.06 - wh - 14);
          whisper.style.transform = 'translate(' + wx.toFixed(1) + 'px,' + wy.toFixed(1) + 'px)';
          const tail = clamp(B.x + Bs * 0.1 - (wx + ww / 2), -ww / 2 + 18, ww / 2 - 18);
          if (Math.abs(tail - (st.wTail || 0)) > 0.5) { st.wTail = tail; whisper.style.setProperty('--do-tail', tail.toFixed(1) + 'px'); }
        }
      }

      /* ---------------- HUD ---------------- */
      const HUDC = { lvl: -1, sec: -1 };
      const WORD = ['silent', 'quiet', 'murmuring', 'humming', 'rattling', 'buzzing'];
      function hudTick() {
        const lvl = clamp(Math.ceil(U.itch * 5 - 0.2), 0, 5);
        if (lvl !== HUDC.lvl) { HUDC.lvl = lvl; boxTxt.textContent = 'Box: ' + WORD[lvl]; bars.forEach((b, i) => b.classList.toggle('on', i < lvl)); }
        const sec = Math.floor(U.sat);
        if (sec !== HUDC.sec) { HUDC.sec = sec; satNum.textContent = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
      }

      /* ---------------- frame loop ---------------- */
      cv.onResize(() => layout());
      S.on('theme', () => { st.statOK = false; cCache.clear(); });
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !M.W) return;
        const tn = now();
        st.fn++; if (dt > 0.034) st.slow++;
        if (st.fn >= 120) { if (st.slow > 40 && st.q > 0.7) { st.q = 0.7; cv.setQuality(st.q); st.statOK = false; } st.fn = 0; st.slow = 0; }
        if (!st.statOK) { renderStatic(); st.fullN = 2; }
        if (st.fullN > 0) { st.fullN--; g.drawImage(stat, 0, 0, M.W, M.H); }
        update(dt, tn, t);
        g.save(); g.beginPath(); g.rect(M.x0 - 2, M.y0 - 2, M.rw + 4, M.rh + 4); g.clip();
        draw(g, t, dt);
        g.restore();
        hudTick();
      });

      /* ---------------- start ---------------- */
      (async () => {
        await K.intro({ title: 'Don’t Open It', sub: 'A box holds the answer to your worry. It really, really wants to be opened.', how: 'Shelve the box. Do small, cosy things. Let the question sit.', char: 'rush', mood: 'worried' });
        musicOn();
        say(rush, L(LINES.open), { mood: 'worried', ms: 3000 }); rush.react('shake');
        SFX.rattle(1); B.rv += 4; B.sqv -= 2;
        await K.wait(RM() ? 900 : 2200);
        say(loopie, L(LINES.poke), { mood: 'silly', ms: 2400 }); loopie.react('bounce'); SFX.psst();
        await K.wait(RM() ? 700 : 1500);
        say(still, L(LINES.tryShake), { mood: 'calm', ms: 4000 });
        st.phase = 'shake'; guideNow(900);
      })();

      return {
        async autoplay() {
          const wait = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 30000)) await K.wait(80); return fn(); };
          const dragToShelf = async () => {
            const w = B.ew, hh = B.eh, px = B.ex + w / 2, py = B.ey + hh * 0.6, ox = px - B.x, oy = py - B.y;
            const tx = shelfX() + ox - B.ex, ty = M.spotShelf.y + oy - B.ey - 8;
            await K.sim.drag(boxEl, { x: w / 2, y: hh * 0.6 }, { x: tx, y: ty }, 900, 24);
          };
          await wait(() => st.phase === 'shake', 25000);
          await K.wait(1000);
          for (let k = 0; k < 3 && st.phase === 'shake' && !U.relief; k++) {
            await wait(() => !B.hop && !B.held, 4000);
            const w = B.ew, hh = B.eh, pr = await K.sim.press(boxEl, w / 2, hh * 0.6);
            for (let i = 0; i < 12 && !U.relief; i++) { await K.wait(70); pr.move(w / 2 + (i % 2 ? -32 : 32), hh * 0.6); }
            await K.wait(60); pr.up(w / 2, hh * 0.6); await K.wait(400);
          }
          await wait(() => st.phase === 'shelve', 20000);
          await K.wait(1500);
          for (let i = 0; i < 4 && st.phase === 'shelve'; i++) { await wait(() => !B.hop && !B.held, 4000); await dragToShelf(); await wait(() => st.phase !== 'shelve', 2500); }
          await wait(() => st.phase === 'tasks', 20000);
          let shelvedOnce = false;
          const t0 = now();
          while (st.phase === 'tasks' && now() - t0 < 100000) {
            if (U.wave && B.at === 'rug' && !B.hop && !B.held && !shelvedOnce && now() - U.wave.t0 > 1400) { await dragToShelf(); shelvedOnce = true; await K.wait(500); continue; }
            const T = TASKS.find(x => !x.done);
            if (T && !T.busy && T.d < T.n) { await K.sim.tap(T.btn); await K.wait(560); }
            else await K.wait(220);
          }
          await wait(() => st.phase === 'note', 30000);
          await K.wait(1500);
          await K.sim.tap(noteEl);
          await wait(() => st.finished, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
