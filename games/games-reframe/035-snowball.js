/* 035 Snowball — Reframe · REFRAME · Overthinking / Thought Fusion
 * Mechanism: interrupting a catastrophic "and then… and then…" chain with Socratic questions (Beck; Padesky 1993;
 * decatastrophising, Beck & Emery 1985). A worry starts as one small fact, a snowflake, and grows a layer with every
 * "and then"; each question the player plants on the slope slows it and knocks the outer layer off, with an honest answer
 * drawn from their own facts (what is on record, what else could explain it, how they would cope, what they would tell a
 * friend). What is left is the fact, small enough to split into what they know, one step and one question to ask.
 * Honest: when the facts back the worry the answers say so, and the snowman carries a plan rather than a pep talk.
 * Verb: fence (drag question fences and log bumps onto the path ahead of the rolling snowball; firm snow gives a clean
 * break), then swipe to split the last small ball and drag the pieces into a snowman.
 * Finale: the clouds part and sunshine pours over the valley; the tiny snowman in today's hat, its scarf knitted with the
 * fair thought, bobs to a sleigh-bell waltz while the snow glitters.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const hexRGB = (c) => { const n = parseInt(String(c).slice(1, 7), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mixHex = (a, b, k) => { const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => Math.max(0, Math.min(255, Math.round(v + (B[i] - v) * k))).toString(16).padStart(2, '0')).join(''); };
  const rgba = (c, a) => { const A = hexRGB(c); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')'; };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };

  /* Today's mountain: the same all day, a different range tomorrow. */
  const MOUNTAINS = [
    { key: 'alpenglow', name: 'Alpenglow Peak', scarf: '#d9485f',
      bright: { sky: ['#86a9de', '#cfc6e8', '#ffdcc8'], far: '#a7b0d8', farSnow: '#f6eef6', mid: '#8290c2', midSnow: '#eceaf8', lit: '#fffaf5', shade: '#c9c4e4', deep: '#9e9bcb', rock: '#6d6990', pine: '#3f5d6c', plain: '#c7c3dc', roof: '#b9655a', sun: '#ffd9a8' },
      dark: { sky: ['#121838', '#352f63', '#b9708a'], far: '#46497f', farSnow: '#a7a2cf', mid: '#31366a', midSnow: '#8a88bc', lit: '#e9e6f6', shade: '#a19ecc', deep: '#6a6ea4', rock: '#3c3c62', pine: '#223645', plain: '#3e3f6c', roof: '#7c4560', sun: '#ffc79a' } },
    { key: 'bluebird', name: 'Bluebird Ridge', scarf: '#ef7d2d',
      bright: { sky: ['#2f86e0', '#76bdf2', '#dff3ff'], far: '#9fc0e4', farSnow: '#f4faff', mid: '#6f9bcf', midSnow: '#eef6ff', lit: '#ffffff', shade: '#bcd3ee', deep: '#8fb0dc', rock: '#5c7290', pine: '#2e5a52', plain: '#b9cfe6', roof: '#c2594a', sun: '#fff1c2' },
      dark: { sky: ['#07142e', '#123563', '#3a77b0'], far: '#2f4f80', farSnow: '#9cb8de', mid: '#203c68', midSnow: '#7f9fcb', lit: '#e3eefc', shade: '#94afd6', deep: '#5d7cac', rock: '#2c3d58', pine: '#18322f', plain: '#2b4166', roof: '#6b3b45', sun: '#ffe2a8' } },
    { key: 'pinewood', name: 'Pinewood Pass', scarf: '#2f9e7a',
      bright: { sky: ['#5f9fc9', '#a9d6dd', '#eef7e8'], far: '#9fbfc4', farSnow: '#f2f8f6', mid: '#6d9a98', midSnow: '#e6f2ef', lit: '#fbfffd', shade: '#bfd8d6', deep: '#8fb5b3', rock: '#5b6f6c', pine: '#2c5a46', plain: '#b5cfc7', roof: '#a8563d', sun: '#fff0c4' },
      dark: { sky: ['#0b1b26', '#1d4150', '#4f8a8a'], far: '#2f5560', farSnow: '#9cc0c2', mid: '#1f4048', midSnow: '#7fa6a8', lit: '#e2f1ee', shade: '#93b7b4', deep: '#5f8a87', rock: '#2a3c3c', pine: '#14302a', plain: '#284446', roof: '#5f3a35', sun: '#ffe0a8' } },
    { key: 'golden', name: 'Golden Hour Col', scarf: '#6a4fd8',
      bright: { sky: ['#6f8fd6', '#f2b9a0', '#ffe7b0'], far: '#b9a9c9', farSnow: '#fff2e6', mid: '#9a86b3', midSnow: '#f6eaf0', lit: '#fff8ef', shade: '#e2c9cf', deep: '#c3a3b8', rock: '#7a6278', pine: '#46504f', plain: '#d9c3c4', roof: '#a9483e', sun: '#ffd28a' },
      dark: { sky: ['#1a1433', '#5a3358', '#d98a5c'], far: '#5d4170', farSnow: '#c9a8c0', mid: '#40305c', midSnow: '#a688a8', lit: '#f3e6e8', shade: '#b89db2', deep: '#846a90', rock: '#45334f', pine: '#2a2e36', plain: '#4b3656', roof: '#82413f', sun: '#ffbe7a' } },
    { key: 'aurora', name: 'Aurora Summit', scarf: '#e0a21b',
      bright: { sky: ['#7cb0d8', '#bfe3df', '#f1f9ef'], far: '#a6c4d2', farSnow: '#f5fbfb', mid: '#78a0b6', midSnow: '#ebf5f7', lit: '#fdffff', shade: '#c0d6e2', deep: '#93b2c9', rock: '#5c6f82', pine: '#2f5560', plain: '#bed3dc', roof: '#b05e4e', sun: '#fff3c8', aurora: '#7fe0b8' },
      dark: { sky: ['#050b1c', '#0d2440', '#1f5a66'], far: '#22405a', farSnow: '#8fb2c4', mid: '#16304a', midSnow: '#7298ae', lit: '#dceaf2', shade: '#86a3ba', deep: '#52728f', rock: '#22334a', pine: '#10272d', plain: '#1d3448', roof: '#5a3448', sun: '#ffd9a0', aurora: '#5cf0b4' } }
  ];
  const STORM = { bright: ['#5f6579', '#878c9f', '#b3b6c3'], dark: ['#11131b', '#22252f', '#383b47'] };
  /* A new hat for the snowman on each finished visit: a wardrobe that fills up in the same order for everyone. */
  const OUTFITS = [
    { key: 'bobble', name: 'Bobble hat' }, { key: 'tophat', name: 'Top hat' }, { key: 'earmuffs', name: 'Earmuffs' }, { key: 'crown', name: 'Paper crown' },
    { key: 'beanie', name: 'Striped beanie' }, { key: 'flowers', name: 'Flower crown' }, { key: 'chef', name: 'Chef’s hat' }, { key: 'antlers', name: 'Felt antlers' }
  ];
  const ICON = {
    fence: '<svg viewBox="0 0 40 40" aria-hidden="true"><g fill="#a5713f" stroke="#5b391d" stroke-width="1.6" stroke-linejoin="round"><path d="M7 35V12l3-4 3 4v23z"/><path d="M17 35V9l3-4 3 4v26z"/><path d="M27 35V12l3-4 3 4v23z"/><rect x="4" y="16" width="32" height="4.5" rx="1.6"/><rect x="4" y="26" width="32" height="4.5" rx="1.6"/></g><g fill="#fff"><ellipse cx="10" cy="9" rx="3.6" ry="1.9"/><ellipse cx="20" cy="6" rx="3.6" ry="1.9"/><ellipse cx="30" cy="9" rx="3.6" ry="1.9"/></g></svg>',
    bump: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="4" y="18" width="27" height="13" rx="6.5" fill="#8a5a33" stroke="#5b391d" stroke-width="1.6"/><ellipse cx="30.5" cy="24.5" rx="5.2" ry="6.5" fill="#e6bb83" stroke="#5b391d" stroke-width="1.6"/><ellipse cx="30.5" cy="24.5" rx="2.6" ry="3.6" fill="none" stroke="#b07c46" stroke-width="1.3"/><path d="M7 18.5c5-3.4 17-3.4 22-.4" stroke="#fff" stroke-width="3.2" stroke-linecap="round" fill="none"/></svg>',
    flake: '<svg viewBox="0 0 40 40" aria-hidden="true"><g stroke="#3d8fc4" stroke-width="2.6" stroke-linecap="round"><path d="M20 5v30M7 12.5l26 15M7 27.5l26-15"/><path d="M20 10l-3.5-3.5M20 10l3.5-3.5M20 30l-3.5 3.5M20 30l3.5 3.5M11.3 15l-4.8 1.3M11.3 15l-1.3-4.8M28.7 25l4.8-1.3M28.7 25l1.3 4.8M11.3 25l-4.8-1.3M11.3 25l-1.3 4.8M28.7 15l4.8 1.3M28.7 15l1.3-4.8"/></g></svg>'
  };

  (env.games = env.games || []).push({
    id: 'snowball', mode: 'reframe', name: 'Snowball', verb: 'fence', family: 'REFRAME', minutes: 2,
    parents: ['Overthinking / Thought Fusion', 'Uncertainty / Future Worry / Reassurance', 'Panic / Body Alarm'],
    cast: ['loopie', 'still'], poster: { char: 'loopie', mood: 'worried' },
    fonts: ['Titan+One', 'M+PLUS+Rounded+1c:wght@500;700;800'],
    tagline: 'A worry rolls downhill and grows. Fence it with questions.',
    why: 'For an “and then… and then…” spiral: each question knocks a layer off until it’s manageable.',
    css: `
.g-snowball { --sb-disp: "Titan One", "Baloo 2", "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif; --sb-body: "M PLUS Rounded 1c", "Fredoka", "Nunito", "Trebuchet MS", system-ui, sans-serif; --sb-scarf: #d9485f; background: #c9d4ea; }
.g-snowball .sb-hit { position: absolute; z-index: 21; left: 0; top: 0; width: 64px; height: 64px; border: 0; padding: 0; margin: 0; background: transparent; border-radius: 50%; touch-action: none; cursor: pointer; -webkit-tap-highlight-color: transparent; will-change: transform; }
.g-snowball .sb-hit.grab { cursor: grab; }
.g-snowball .sb-hit:focus-visible { outline: 3px solid #ffd36b; outline-offset: 3px; }
.g-snowball .sb-tag { position: absolute; z-index: 22; left: 0; top: 0; width: max-content; max-width: min(290px, calc(100% - 24px)); padding: 7px 13px 9px; border-radius: 14px; pointer-events: none; text-align: center; color: #26304b;
  background: #ffffff; box-shadow: 0 2px 0 #b8c4dc, 0 10px 22px rgba(20, 30, 60, 0.3); will-change: transform, opacity; }
.g-snowball .sb-tag::after { content: ""; position: absolute; left: var(--ax, 50%); bottom: -6px; width: 13px; height: 13px; margin-left: -6.5px; background: #ffffff; transform: rotate(45deg); border-radius: 2px; box-shadow: 2px 2px 0 #b8c4dc; }
.g-snowball .sb-tag small { position: relative; z-index: 1; display: block; font: 400 12px/1.05 var(--sb-disp); letter-spacing: 0.12em; text-transform: uppercase; color: #7051b8; margin-bottom: 4px; }
.g-snowball .sb-tag span { position: relative; z-index: 1; display: block; font: 700 15px/1.25 var(--sb-body); text-wrap: balance; }
.g-snowball .sb-tag.gen span { font-style: italic; font-weight: 600; color: #4b5574; }
.g-snowball .sb-tag.fact small { color: #1b7a95; }
.g-snowball .sb-tag.fact { box-shadow: 0 0 0 2px #9fd9ea, 0 2px 0 #b8c4dc, 0 10px 22px rgba(20, 30, 60, 0.3); }
.g-snowball .sb-tray { position: absolute; z-index: 24; left: 10px; right: 10px; bottom: calc(env(safe-area-inset-bottom, 0px) + 12px); display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  transition: transform 0.5s cubic-bezier(.2, 1.25, .4, 1), opacity 0.3s ease; }
.g-snowball .sb-tray.off { transform: translateY(calc(100% + 40px)); opacity: 0; pointer-events: none; }
.g-snowball .sb-card { position: relative; display: flex; align-items: center; gap: 9px; min-height: 56px; padding: 7px 11px 7px 7px; border: 0; border-radius: 13px; cursor: grab; touch-action: none; text-align: left; color: #3a2416;
  background: linear-gradient(180deg, #fffaf0 0%, #f4e4c8 100%); box-shadow: inset 0 0 0 2px #9a6a3e, 0 4px 0 #6f4628, 0 10px 18px rgba(16, 24, 48, 0.35); font: 800 14px/1.18 var(--sb-body);
  transition: transform 0.18s ease, opacity 0.2s ease; transform: translateY(calc(var(--bob, 0) * -2px)); }
.g-snowball .sb-card:active { transform: translateY(2px); }
.g-snowball .sb-card.lift { opacity: 0.35; }
.g-snowball .sb-card.used { display: none; }
.g-snowball .sb-card i { flex: none; width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(180deg, #eaf3fd, #d3e3f5); display: grid; place-items: center; box-shadow: inset 0 0 0 1.5px rgba(80, 110, 150, 0.35); }
.g-snowball .sb-card i svg { width: 32px; height: 32px; display: block; }
.g-snowball .sb-card:focus-visible { outline: 3px solid #ffd36b; outline-offset: 2px; }
.g-snowball .sb-proxy { position: absolute; z-index: 40; left: 0; top: 0; pointer-events: none; display: flex; align-items: center; gap: 6px; padding: 6px 10px 6px 6px; border-radius: 11px; width: max-content; max-width: 210px;
  font: 800 13px/1.15 var(--sb-body); color: #3a2416; background: #fff7ea; box-shadow: inset 0 0 0 2px #9a6a3e, 0 12px 22px rgba(16, 24, 48, 0.42); will-change: transform; }
.g-snowball .sb-proxy i { flex: none; width: 28px; height: 28px; display: grid; place-items: center; }
.g-snowball .sb-proxy i svg { width: 26px; height: 26px; }
.g-snowball .sb-proxy.hot { box-shadow: inset 0 0 0 2px #e0a21b, 0 0 0 4px rgba(255, 214, 102, 0.55), 0 12px 22px rgba(16, 24, 48, 0.42); }
.g-snowball .sb-answer { position: absolute; z-index: 26; left: 12px; right: 12px; bottom: calc(env(safe-area-inset-bottom, 0px) + 12px); padding: 11px 15px 13px; border-radius: 16px; color: #262036;
  background: linear-gradient(180deg, #ffffff, #eef3fb); box-shadow: inset 0 0 0 2px #c4d2ea, 0 4px 0 #9fb2d3, 0 14px 28px rgba(16, 24, 48, 0.35); transition: transform 0.45s cubic-bezier(.2, 1.25, .4, 1), opacity 0.3s ease; }
.g-snowball .sb-answer.off { transform: translateY(calc(100% + 40px)); opacity: 0; pointer-events: none; }
.g-snowball .sb-answer small { display: flex; align-items: center; gap: 7px; font: 400 12.5px/1.1 var(--sb-disp); letter-spacing: 0.08em; text-transform: uppercase; color: #5d43a8; margin-bottom: 6px; }
.g-snowball .sb-answer small i { flex: none; width: 24px; height: 24px; display: grid; place-items: center; }
.g-snowball .sb-answer small i svg { width: 22px; height: 22px; }
.g-snowball .sb-answer p { margin: 0; font: 700 15.5px/1.32 var(--sb-body); }
.g-snowball .sb-answer p + p { margin-top: 5px; font-weight: 600; color: #463f5e; }
.g-snowball .sb-mtag { position: absolute; z-index: 22; left: 0; top: 0; font: 400 12px/1 var(--sb-disp); letter-spacing: 0.08em; text-transform: uppercase; color: #ffffff; background: #6248b4;
  padding: 6px 9px 5px; border-radius: 999px; white-space: nowrap; pointer-events: none; box-shadow: 0 4px 10px rgba(20, 20, 60, 0.3); will-change: transform; }
.g-snowball .sb-mtag.next { background: #e0a21b; color: #2b1a05; }
.g-snowball .sb-scarf { position: absolute; z-index: 27; left: 14px; right: 14px; bottom: calc(env(safe-area-inset-bottom, 0px) + 16px); padding: 12px 20px 14px; border-radius: 10px; color: #ffffff; text-align: center;
  background: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0 3px, rgba(0, 0, 0, 0.06) 3px 6px), var(--sb-scarf); box-shadow: inset 0 3px 0 rgba(255, 255, 255, 0.22), inset 0 -3px 0 rgba(0, 0, 0, 0.18), 0 14px 28px rgba(10, 16, 40, 0.42);
  transition: transform 0.6s cubic-bezier(.2, 1.25, .4, 1), opacity 0.4s ease; }
.g-snowball .sb-scarf.off { transform: translateY(calc(100% + 40px)) scaleX(0.6); opacity: 0; }
.g-snowball .sb-scarf::before, .g-snowball .sb-scarf::after { content: ""; position: absolute; top: 4px; bottom: 4px; width: 8px; background: repeating-linear-gradient(180deg, var(--sb-scarf) 0 5px, transparent 5px 8px); }
.g-snowball .sb-scarf::before { left: -7px; } .g-snowball .sb-scarf::after { right: -7px; }
.g-snowball .sb-scarf small { display: block; font: 400 12px/1 var(--sb-disp); letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.92; margin-bottom: 6px; }
.g-snowball .sb-scarf p { margin: 0; font: 800 16px/1.3 var(--sb-body); text-shadow: 0 1px 0 rgba(0, 0, 0, 0.28); text-wrap: balance; }
.g-snowball .sb-pill { position: absolute; z-index: 23; left: 0; top: 0; font: 400 12.5px/1 var(--sb-disp); letter-spacing: 0.06em; color: #2b1a05; background: linear-gradient(180deg, #fff1b8, #ffd36b);
  padding: 7px 11px 6px; border-radius: 999px; white-space: nowrap; pointer-events: none; box-shadow: 0 3px 0 rgba(120, 70, 10, 0.35), 0 8px 16px rgba(20, 20, 50, 0.3); will-change: transform; }
@container (min-width: 700px) {
  .g-snowball .sb-tray { left: auto; right: 24px; bottom: 26px; width: 272px; grid-template-columns: 1fr; gap: 10px; }
  .g-snowball .sb-card { min-height: 62px; font-size: 15px; }
  .g-snowball .sb-answer { left: auto; right: 24px; top: 78px; bottom: auto; width: 300px; }
  .g-snowball .sb-answer p { font-size: 16px; }
  .g-snowball .sb-scarf { left: 50%; right: auto; width: min(560px, calc(100% - 640px)); min-width: 420px; transform: translateX(-50%); bottom: 30px; }
  .g-snowball .sb-scarf.off { transform: translate(-50%, calc(100% + 40px)) scaleX(0.6); }
  .g-snowball .sb-scarf p { font-size: 18px; }
  .g-snowball .sb-tag span { font-size: 16px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const clamp = K.clamp, lerp = K.lerp, ease = K.ease;
      const inten = ctx.intensity, reduced = () => K.reduced(), now = () => performance.now();
      const visits = K.visits();
      const L = (o) => ctx.line(o) || '';
      const text = String(ctx.text || ''), noText = !text.trim(), low = text.toLowerCase();
      const care = an.safety === 'care', serious = an.fear_support === 'strong';
      const MT = K.dailyPick(MOUNTAINS, 11);
      const N = [3, 4, 5][inten] || 4;
      const OUTFIT = OUTFITS[visits % OUTFITS.length];
      const CLEAN = 0.8;
      el.style.setProperty('--sb-scarf', MT.scarf);

      /* ---------------- content: the fact, the "and then" layers, the questions and their honest answers ---------------- */
      const arr = (v) => (Array.isArray(v) ? v : []);
      const nWords = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;
      const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); return (sp > n * 0.55 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; };
      const keyOf = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const firstUp = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
      const lowFirst = (s) => (s && !/^(I\b|I’|I'|[A-Z]{2})/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
      const trimEnd = (s) => String(s || '').replace(/[\s.,;:!…]+$/, '');
      const spans = noText ? [] : arr(an.spans).filter(s => s && typeof s.quote === 'string' && s.quote.trim() && low.includes(s.quote.trim().toLowerCase()))
        .map(s => ({ q: s.quote.trim(), kind: s.kind === 'camera' ? 'camera' : 'brain', at: low.indexOf(s.quote.trim().toLowerCase()) })).sort((a, b) => a.at - b.at);
      let core = '', coreUser = false;
      if (!noText) {
        const c1 = spans.find(s => s.kind === 'camera' && nWords(s.q) >= 3);
        if (c1) core = c1.q;
        else {
          const ex = arr(an.exhibits).find(e => e && e.kind === 'camera' && e.text && !/^Something happened/i.test(e.text));
          if (ex) core = ex.text; else if (an.situation && !/^Something happened/i.test(an.situation)) core = an.situation;
        }
        if (core) { core = clip(trimEnd(core), 92); coreUser = true; }
      }
      if (!core) core = 'Something small happened';
      /* The spiral's own voice, used when the player's words run out: the shape of a spiral, never a fact about them. */
      const GEN_ESC = ['what if it gets worse?', 'what if I can’t handle it?', 'and then what?', 'what if it all goes wrong?', 'and it’ll never stop'];
      let mine = [];
      if (!noText) {
        spans.filter(s => s.kind === 'brain').forEach(s => { const t = clip(trimEnd(s.q), 76); if (nWords(t) >= 2 && keyOf(t) !== keyOf(core) && !mine.some(m => keyOf(m) === keyOf(t))) mine.push(t); });
        if (!mine.length) { const t = an.thought || an.conclusion; if (t && nWords(t) >= 2 && !/^This means something bad/i.test(t)) mine.push(clip(trimEnd(t), 76)); }
      }
      mine = mine.slice(-N);
      const genPool = noText ? ['it must mean something bad'].concat(GEN_ESC) : GEN_ESC;
      const layerDefs = mine.map(t => ({ text: firstUp(t), user: true })).concat(genPool.slice(0, Math.max(0, N - mine.length)).map(t => ({ text: firstUp(t), user: false })));

      const leads = arr(an.leads).filter(l => l && l.text);
      const lead = (k) => { const l = leads.find(x => x.kind === k); return l ? clip(trimEnd(l.text), 112) : ''; };
      const alt = arr(an.alternatives).find(a => a && !a.fear && a.theory);
      const titleCase = (s) => String(s || '').toLowerCase().replace(/(^|\s)([a-z])/g, (m, p, c) => p + c.toUpperCase());
      const QDEF = {
        evidence: { q: 'What’s the evidence?', kind: 'fence' },
        else: { q: 'What else could happen?', kind: 'bump' },
        cope: { q: 'Could I cope?', kind: 'fence' },
        friend: { q: 'What would I tell a friend?', kind: 'bump' },
        year: { q: 'Will it matter in a year?', kind: 'bump' }
      };
      const qOrder = ['evidence', 'else', 'cope', 'friend', 'year'].slice(0, N);
      function answerOf(id) {
        if (id === 'evidence') {
          if (noText) return [{ t: 'Only what a camera could record counts as evidence.' }, { t: 'Everything else in the snowball is the story filling gaps.' }];
          return [{ pre: 'On record: ', t: '“' + core + '”', user: coreUser }, { t: clip(an.support_reason || (serious ? 'Something on record points this way, so it deserves a plan.' : 'The facts on record don’t point to the fear more than to other explanations.'), 150) }];
        }
        if (id === 'else') {
          if (alt) return [{ t: (serious ? 'Also possible: ' : '') + (alt.name ? titleCase(alt.name) + '. ' : '') + firstUp(trimEnd(alt.theory)) + '.' }];
          return [{ t: 'Something more ordinary than the story. Ordinary explanations are common.' }];
        }
        if (id === 'cope') {
          const p = lead('prepare');
          if (care) return [{ t: 'You don’t have to work this out alone. Someone qualified can tell you exactly where you stand.' }].concat(p ? [{ t: 'One step: ' + lowFirst(p) + '.' }] : []);
          if (serious) return [{ t: 'This one deserves a plan, not panic.' }, { t: 'First step: ' + (p ? lowFirst(p) : 'write down what you’d do first') + '.' }];
          return [{ t: 'If it did go badly, there would still be next steps.' }, { t: 'One of them: ' + (p ? lowFirst(p) : 'write down what you’d do first') + '.' }];
        }
        if (id === 'friend') return [{ t: clip(an.friend || 'That sounds hard. It might not mean what it feels like it means. Check the facts first.', 170) }];
        return [{ t: clip(an.future || 'A year from now this will likely look smaller than it does today.', 160) }];
      }
      const askT = lead('ask') || (arr(an.unknowns)[0] && arr(an.unknowns)[0].text ? 'Ask: ' + arr(an.unknowns)[0].text : 'Ask one simple question instead of guessing');
      let stepT = (serious || care) ? (lead('prepare') || lead('steady')) : (lead('steady') || lead('prepare'));
      if (care && !/\b(advice|adviser|advisor|gp|doctor|lawyer|legal|service|qualified|bank|counsell)/i.test(stepT || '')) stepT = 'Ask someone qualified for the exact facts';
      if (!stepT) stepT = 'Take a ten-minute walk before deciding anything';
      const endDot = (s) => { s = trimEnd(s); return /[?”"]$/.test(s) ? s : s + '.'; };
      const PARTS = [
        { key: 'know', label: 'What I know', short: 'Facts', text: noText ? 'Something happened. That part is real.' : endDot(core), user: coreUser },
        { key: 'step', label: 'One small step', short: 'Step', text: endDot(clip(stepT, 112)), user: false },
        { key: 'ask', label: 'One question to ask', short: 'Ask', text: endDot(clip(askT, 112)), user: false }
      ];
      let fair = noText ? 'Something happened. The rest was guessing, and guesses can be checked.' : trimEnd(an.balanced || 'Something happened. The facts don’t settle the rest yet');
      if (/^That\b/.test(fair)) fair = 'What happened' + fair.slice(4);
      fair = clip(fair, 160); if (!/[.!?”"]$/.test(fair)) fair += '.';

      /* ---------------- lines (every one in three vibes) ---------------- */
      const LINES = {
        summit: care ? { Jolly: 'It starts as one small, true thing. Then it starts to roll.', Cheeky: 'One small fact. Watch what my brain does next.', Unfiltered: 'One fact. Then the spiral.' }
          : visits ? { Jolly: 'Back on the mountain! Tiny snowflake, big plans. Tap it.', Cheeky: 'Oh, it’s you. Here to watch me panic again?', Unfiltered: 'Back again. Tap the flake.' }
            : { Jolly: 'It’s just one little snowflake. Totally fine. Probably.', Cheeky: 'Look at it. Tiny. Harmless. What could possibly go wrong?', Unfiltered: 'One small thing. Watch what my brain does with it.' },
        fact: { Jolly: 'That’s what actually happened. Small, right?', Cheeky: 'That’s the whole fact. Suspiciously small.', Unfiltered: 'That’s the fact. Now watch.' },
        andThen: { Jolly: 'And then… and then… AND THEN…', Cheeky: 'Hold on, I’ve got a few more “and thens”…', Unfiltered: 'And then. And then. And then.' },
        spiralEnd: serious ? { Jolly: 'Some of this is real. Let’s keep the real part and knock off the extra snow.', Cheeky: 'Real worry, plus extra snow. Questions sort out which is which.', Unfiltered: 'Part of it’s real. The extra layers aren’t. Plant a question.' }
          : { Jolly: 'Whoa. Same snowflake, much bigger story. Let’s slow it down with questions.', Cheeky: 'That escalated. Questions are brakes. Plant one on the path.', Unfiltered: 'It grew on its own. Questions shrink it. Plant one.' },
        release: [{ Jolly: 'And then—', Cheeky: 'Here it goes again—', Unfiltered: 'And then—' }, { Jolly: 'Annnd then—', Cheeky: 'Wheee— I mean, oh no—', Unfiltered: 'Rolling—' }],
        hit: {
          evidence: serious ? { Jolly: 'Some of it is on record. That earns a plan, not panic.', Cheeky: 'The facts back part of it. Fine. Plans beat panic.', Unfiltered: 'Partly on record. So: plan.' }
            : { Jolly: 'Facts first. They’re smaller than the story.', Cheeky: 'The evidence is tiny. The story was a whole saga.', Unfiltered: 'That’s what’s on record. The rest is guessing.' },
          else: { Jolly: 'The scary version isn’t the only version.', Cheeky: care ? 'Other explanations fit the same facts.' : 'Plot twist: boring explanations exist.', Unfiltered: 'Other explanations fit too.' },
          cope: care ? { Jolly: 'You don’t have to carry this alone. Real help is a real step.', Cheeky: 'Proper advice beats guessing. Every time.', Unfiltered: 'Get qualified help. That’s the step.' }
            : serious ? { Jolly: 'Even the hard version has a first step.', Cheeky: 'A plan. Look at you.', Unfiltered: 'There’s a first step. Take it.' }
              : { Jolly: 'Even the hard version has a next step.', Cheeky: 'Turns out you’ve got moves.', Unfiltered: 'There’s a next step either way.' },
          friend: { Jolly: 'You’d be kind and fair with a friend. You get that too.', Cheeky: 'Funny how sensible you are with other people’s worries.', Unfiltered: 'Talk to yourself like that.' },
          year: { Jolly: 'Zoom out a year. It looks smaller from there.', Cheeky: 'Future you has a much wider view.', Unfiltered: 'Smaller from a year away.' }
        },
        half: care ? { Jolly: 'It’s getting smaller. Easier to look at.', Cheeky: 'Smaller. Easier to look at.', Unfiltered: 'Smaller.' }
          : { Jolly: 'It’s getting… smaller? I don’t know how to feel about this.', Cheeky: 'My beautiful avalanche is shrinking.', Unfiltered: 'Smaller. Huh.' },
        core: serious || care ? { Jolly: 'Still a real thing. But it’s the real size now.', Cheeky: 'Real, but not avalanche-sized.', Unfiltered: 'Real. Right-sized.' }
          : { Jolly: 'Wait. That’s it? That’s the whole thing?', Cheeky: 'All that rolling for THAT?', Unfiltered: 'Just the fact. That’s all it was.' },
        meadow: { Jolly: 'Small enough to handle. Even easier in pieces.', Cheeky: 'Snowman-sized now. Split it.', Unfiltered: 'Manageable. Split it into pieces.' },
        build: [
          { Jolly: 'What you know goes at the bottom. Solid.', Cheeky: 'Facts make the best foundations.', Unfiltered: 'Facts at the base.' },
          { Jolly: 'One small step in the middle.', Cheeky: 'A step, not a leap. Perfect.', Unfiltered: 'One step. Middle.' },
          { Jolly: 'And a question on top, to ask instead of guess.', Cheeky: 'A question instead of a guess. Smart hat rack.', Unfiltered: 'A question on top.' }
        ],
        loopieBuild: care ? { Jolly: 'Oh, a little snowman. I like that.', Cheeky: 'A snowman. That helps, honestly.', Unfiltered: 'A snowman. Okay.' }
          : { Jolly: 'Ooh, are we making a little guy?', Cheeky: 'Is this… a snowman? Am I allowed to be excited?', Unfiltered: 'A snowman. Fine. I’m in.' },
        face: { Jolly: 'He needs a face! And a hat!', Cheeky: 'Give him a face. Make him handsome.', Unfiltered: 'Face. Hat. Go.' },
        end: care ? { Jolly: 'Built from facts. Next: someone qualified for the details.', Cheeky: 'Solid. Next step: proper advice on the specifics.', Unfiltered: 'Facts in. Now get qualified advice.' }
          : serious ? { Jolly: 'A real worry, the right size, with a plan built in.', Cheeky: 'Still real. Now with a plan and a hat.', Unfiltered: 'Real worry. Plan built. Done.' }
            : { Jolly: 'Same snowflake. Now it’s a snowman, not an avalanche.', Cheeky: 'From avalanche to tiny guy in a hat. Nice work.', Unfiltered: 'One fact, one step, one question. Done.' },
        loopieEnd: care ? { Jolly: 'He looks sturdy. Like a plan.', Cheeky: 'Sturdy little guy. Like a plan.', Unfiltered: 'Sturdy.' }
          : { Jolly: 'I made THAT? From one worry? I love him.', Cheeky: 'I’m naming him Gerald.', Unfiltered: 'Okay. He’s great.' }
      };

      /* ---------------- state ---------------- */
      const st = { phase: 'intro', round: -1, hits: 0, storm: 0.3, stormT: 0.3, sun: 0, sunT: 0, ts: 1, tsT: 1, hitstop: 0, shake: 0, wt: 0, beat: 0, bar0: 0, barT: 0,
        answerUntil: 0, trayOn: false, answerOn: false, dragging: null, ghost: null, precs: [], buildIdx: -1, finished: false, scarf: 0, flake: 1, flakeShow: 1, deco: null, hat: null, man: false, camMode: 'summit', col: null, flash: 0 };
      const B = { x: 0, y: 0, r: 0, a: 0, v: 0, s: 6, li: 0, mode: 'hidden', vx: 0, vy: 0, sq: 0, sqA: 0, layers: [], wrap: null, wrapIdx: 0, wrapAt: [], dist: 0, vmin: 0, vmax: 300, fr: 0.2, hopY: 0, hop: null, settle: null, mroll: null, crA: 0, stampX: 0, stampY: 0 };
      const cam = { x: 0, y: 0, z: 1, ok: false };
      const M = { w: 0, h: 0, phone: true, ledges: [], worldH: 1000, vcx: 0, vcy: 0, viewTop: 0, viewBot: 0, R0: 40, rCore: 13, th: 7, bank: 22, gap: 140 };
      const FR = [];          // falling snow chunks
      const TRAIL = [];       // the groove the ball leaves in the snow
      const BARS = [];        // planted question barriers
      const P = K.particles();
      const Q = { level: 2, acc: 0, n: 0, steps: 0 };
      const pal = () => MT[S.scene() === 'dark' ? 'dark' : 'bright'];
      const T0 = performance.now(), mark = (nm) => { if (S.isDev && S.isDev()) (el.__marks = el.__marks || []).push(nm + '@' + ((performance.now() - T0) / 1000).toFixed(1)); };

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: 1.5 });
      const hitFlake = h('button', { type: 'button', class: 'sb-hit', hidden: true, 'aria-label': 'The snowflake. Tap it to see what actually happened.' });
      const hitBall = h('button', { type: 'button', class: 'sb-hit grab', hidden: true, 'aria-label': 'The small snowball. Swipe across it to split it, or press Enter.' });
      const tag = h('div', { class: 'sb-tag', hidden: true }, h('small'), h('span'));
      const pops = [0, 1, 2].map(() => ({ el: h('div', { class: 'sb-tag', hidden: true }, h('small'), h('span')), on: false, wx: 0, wy: 0, t0: 0, life: 0, w: 0, h: 0 }));
      const tray = h('div', { class: 'sb-tray off', role: 'group', 'aria-label': 'Question fences and bumps' });
      const answer = h('div', { class: 'sb-answer off', 'aria-live': 'polite' });
      const proxy = h('div', { class: 'sb-proxy', hidden: true, 'aria-hidden': 'true' }, h('i'), h('span'));
      const scarfEl = h('div', { class: 'sb-scarf off' });
      const pill = h('div', { class: 'sb-pill', hidden: true });
      const cards = qOrder.map((id) => {
        const d = QDEF[id];
        const b = h('button', { type: 'button', class: 'sb-card', 'aria-label': d.q + ' A question ' + (d.kind === 'fence' ? 'fence' : 'bump') + '. Drag it onto the path, or press Enter.' }, h('i', { html: ICON[d.kind] }), h('span', { text: d.q }));
        tray.append(b);
        return { id, d, el: b, used: false };
      });
      const minis = PARTS.map((p, i) => ({ p, i, el: h('button', { type: 'button', class: 'sb-hit grab', hidden: true, 'aria-label': p.label + ': ' + p.text + ' Drag it onto the snowman, or press Enter.' }),
        tag: h('div', { class: 'sb-mtag', hidden: true, text: p.short }), x: 0, y: 0, r: 0, a: 0, vis: false, placed: false, drag: null, fly: null, sq: 0, rest: { x: 0, y: 0 } }));
      el.append(hitFlake, hitBall, tag, ...pops.map(p => p.el), pill, tray, answer, proxy, scarfEl);
      minis.forEach(m => el.append(m.el, m.tag));
      const CH = K.phone() ? 56 : 84;
      const loopie = K.character('loopie', { side: 'below', mood: 'worried', size: CH, x: 10, y: 62 });
      const still = K.character('still', { side: 'below', mood: 'calm', size: CH, x: 300, y: 62 });
      const say = (who, line, o) => { (who === loopie ? still : loopie).hush(); return who.say(line, o); };

      /* ---------------- layout ---------------- */
      let tagW = 0, tagH = 0;
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        const sized = W !== M.w || H !== M.h;
        const keep = M.ledges.length ? { li: B.li, u: B.s / Math.max(1, (M.ledges[B.li] || M.ledges[0]).L), bars: BARS.map(b => b.s / Math.max(1, M.ledges[b.li].L)) } : null;
        M.w = W; M.h = H; M.phone = W < 700;
        const ph = M.phone;
        M.rCore = ph ? 13 : 17; M.th = ph ? 7 : 9; M.R0 = M.rCore + N * M.th;
        M.bottomZone = ph ? (N > 4 ? 196 : 150) : 0;
        M.viewTop = ph ? 136 : 70; M.viewBot = ph ? H - M.bottomZone - 8 : H - 16;
        M.vcy = Math.round((M.viewTop + M.viewBot) / 2);
        const colW = ph ? W : Math.round(clamp(W - 620, 520, 700));
        M.colL = Math.round((W - colW) / 2); M.colR = M.colL + colW; M.colW = colW; M.vcx = Math.round(W / 2);
        M.bank = ph ? 22 : 30;
        M.xa = M.colL + M.bank + (ph ? 8 : 18); M.xb = M.colR - M.bank - (ph ? 8 : 18);
        const Lx = M.xb - M.xa, drop = Math.round(Lx * (ph ? 0.15 : 0.11));
        M.gap = Math.round(M.R0 * 2 + (ph ? 64 : 84));
        M.summitY = ph ? 330 : 320;
        M.ledges = [];
        const total = 2 + N, R = K.rng(K.daily() * 7 + 17);
        let y = M.summitY;
        for (let i = 0; i < total; i++) {
          const dir = ((total - 1 - i) % 2 === 0) ? -1 : 1;
          let xs = dir > 0 ? M.xa : M.xb; const xe = dir > 0 ? M.xb : M.xa;
          if (i === 0) xs = Math.round((M.colL + M.colR) / 2);
          const lx = Math.abs(xe - xs), dd = i === 0 ? Math.round(lx * (ph ? 0.62 : 0.5)) : drop, Ll = Math.hypot(lx, dd);
          const tx = (xe - xs) / Ll, ty = dd / Ll;
          M.ledges.push({ i, dir, xs, xe, ys: y, ye: y + dd, L: Ll, tx, ty, nx: tx > 0 ? ty : -ty, ny: tx > 0 ? -tx : tx, open: i < 2, sweet: Ll * (0.56 + 0.14 * R()), barrier: null });
          y += dd + M.gap;
        }
        const last = M.ledges[total - 1];
        M.meadowY = last.ye + Math.round(M.gap * 2.35);
        M.worldH = M.meadowY + (ph ? 380 : 420);
        M.manX = Math.round(M.colL + colW * 0.5);
        M.stopX = M.manX - (ph ? 30 : 40);
        M.miniX = [M.manX - (ph ? 70 : 104), M.manX + (ph ? 48 : 76), M.manX + (ph ? 80 : 122)];
        M.partR = [M.rCore * 1.15, M.rCore * 0.88, M.rCore * 0.68];
        const manH = 2 * (M.partR[0] + M.partR[1] + M.partR[2]) * 0.9 + M.partR[2] * 2.2;
        M.zoom = clamp(((M.viewBot - M.viewTop) * (ph ? 0.4 : 0.42)) / manH, 1.5, ph ? 2.0 : 2.6);
        // restore the ball and the barriers on a resize
        if (keep) {
          BARS.forEach((b, k) => { b.s = keep.bars[k] * M.ledges[b.li].L; M.ledges[b.li].barrier = b; });
          if (B.mode !== 'hidden' && B.mode !== 'meadow' && B.mode !== 'mroll' && M.ledges[keep.li]) B.s = keep.u * M.ledges[keep.li].L;
        } else B.s = 6;
        // characters
        if (ph) { loopie.place(10, 60); still.place(W - CH - 10, 60); loopie.side('below'); still.side('below'); }
        else { loopie.place(24, 74); still.place(24, H - CH - 26); loopie.side('below'); still.side('above'); }
        SPR.key = ''; WORLD.key = ''; BG.key = ''; SKY.key = '';
        if (!cam.ok) { cam.x = M.vcx; cam.y = flakeWorld().y - 30; cam.z = 1; cam.ok = true; }
        if (sized) st.camSnap = true;
      }

      /* ---------------- geometry helpers ---------------- */
      const ledgePt = (ld, s) => ({ x: ld.xs + ld.tx * s, y: ld.ys + ld.ty * s });
      const ledgeCenter = (ld, s, r) => ({ x: ld.xs + ld.tx * s + ld.nx * r, y: ld.ys + ld.ty * s + ld.ny * r });
      const surfY = (ld, x) => ld.ys + (x - ld.xs) * (ld.ye - ld.ys) / (ld.xe - ld.xs);
      const toScreen = (wx, wy) => ({ x: (wx - cam.x) * cam.z + M.vcx, y: (wy - cam.y) * cam.z + M.vcy });
      const toWorld = (sx, sy) => ({ x: (sx - M.vcx) / cam.z + cam.x, y: (sy - M.vcy) / cam.z + cam.y });
      const flakeWorld = () => { const ld = M.ledges[0]; if (!ld) return { x: 0, y: 0 }; const c = ledgeCenter(ld, 6, M.rCore); return { x: c.x, y: c.y - 6 }; };
      const LIFT = () => (M.phone ? 62 : 46);
      function sweetScreen(k) { const ld = M.ledges[2 + k]; const p = ledgePt(ld, ld.sweet); return toScreen(p.x, p.y); }
      function stackPos(j) {
        const r = M.partR, gy = M.meadowY;
        const b0 = gy - r[0] * 0.92, b1 = b0 - r[0] * 0.8 - r[1] * 0.92, b2 = b1 - r[1] * 0.78 - r[2] * 0.95;
        return { x: M.manX, y: [b0, b1, b2][j] };
      }
      function stackScreen(j) { const p = stackPos(j); return toScreen(p.x, p.y); }

      /* ---------------- cached sprites ---------------- */
      const SPR = { key: '' };
      function ensureSprites() {
        const key = M.w + 'x' + M.h + ':' + S.scene();
        if (SPR.key === key) return; SPR.key = key;
        const P0 = pal(), W = M.w, H = M.h;
        // sphere shading for every snowball
        let c = mk(256, 256), g = c.getContext('2d'), R = 128;
        let gr = g.createRadialGradient(R * 0.68, R * 0.58, R * 0.06, R, R, R);
        gr.addColorStop(0, 'rgba(255,255,255,0.75)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.08)'); gr.addColorStop(0.72, rgba(P0.deep, 0.06)); gr.addColorStop(1, rgba(P0.deep, 0.36));
        g.fillStyle = gr; g.beginPath(); g.arc(R, R, R, 0, TAU); g.fill();
        gr = g.createRadialGradient(R * 1.38, R * 1.48, R * 0.15, R * 1.2, R * 1.25, R * 1.05); gr.addColorStop(0, rgba(P0.deep, 0.26)); gr.addColorStop(1, rgba(P0.deep, 0));
        g.fillStyle = gr; g.beginPath(); g.arc(R, R, R, 0, TAU); g.fill();
        g.globalCompositeOperation = 'lighter'; gr = g.createRadialGradient(R, R * 1.95, R * 0.2, R, R * 1.6, R * 0.95); gr.addColorStop(0, 'rgba(190,210,255,0.2)'); gr.addColorStop(1, 'rgba(190,210,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(R, R, R, 0, TAU); g.fill();
        g.globalCompositeOperation = 'source-over'; gr = g.createRadialGradient(R * 0.62, R * 0.52, 0, R * 0.62, R * 0.52, R * 0.26); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
        SPR.shade = c;
        // a glint star
        c = mk(64, 64); g = c.getContext('2d'); gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(225,240,255,0.55)'); gr.addColorStop(1, 'rgba(220,235,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64); g.fillStyle = '#ffffff'; K.starPath(g, 32, 32, 30, 2.2, 4, 0); g.fill(); K.starPath(g, 32, 32, 13, 1.8, 4, Math.PI / 4); g.fill();
        SPR.glint = c;
        // the sun and its rays
        c = mk(256, 256); g = c.getContext('2d'); gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
        gr.addColorStop(0, 'rgba(255,255,245,1)'); gr.addColorStop(0.12, 'rgba(255,250,225,0.95)'); gr.addColorStop(0.2, rgba(P0.sun, 0.55)); gr.addColorStop(0.5, rgba(P0.sun, 0.16)); gr.addColorStop(1, rgba(P0.sun, 0));
        g.fillStyle = gr; g.fillRect(0, 0, 256, 256); SPR.sun = c;
        c = mk(512, 512); g = c.getContext('2d'); g.translate(256, 256);
        for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, w = 0.05 + (i % 3) * 0.025; gr = g.createLinearGradient(0, 0, Math.cos(a) * 256, Math.sin(a) * 256); gr.addColorStop(0, 'rgba(255,240,200,0.5)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 256, a - w, a + w); g.closePath(); g.fill(); }
        SPR.rays = c;
        // storm haze, vignette, warm light (screen sized, 1x)
        c = mk(W, H); g = c.getContext('2d'); gr = g.createLinearGradient(0, 0, 0, H);
        const hz = S.scene() === 'dark' ? '#1a1c26' : '#8d91a3';
        gr.addColorStop(0, rgba(hz, 0.75)); gr.addColorStop(0.45, rgba(hz, 0.25)); gr.addColorStop(1, rgba(hz, 0.55)); g.fillStyle = gr; g.fillRect(0, 0, W, H); SPR.haze = c;
        c = mk(W, H); g = c.getContext('2d'); gr = g.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.36, W / 2, H * 0.5, Math.max(W, H) * 0.78);
        gr.addColorStop(0, 'rgba(10,14,40,0)'); gr.addColorStop(1, 'rgba(10,14,40,0.5)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); SPR.vig = c;
        c = mk(W, H); g = c.getContext('2d'); gr = g.createRadialGradient(W * 0.74, H * 0.2, 10, W * 0.74, H * 0.2, Math.max(W, H) * 0.9);
        gr.addColorStop(0, rgba(P0.sun, 0.42)); gr.addColorStop(0.5, rgba(P0.sun, 0.12)); gr.addColorStop(1, rgba(P0.sun, 0)); g.fillStyle = gr; g.fillRect(0, 0, W, H); SPR.warm = c;
      }

      /* ---------------- sky, far range, near ridges (cached) ---------------- */
      const SKY = { key: '', clear: null, storm: null, mix: null, q: -1 };
      function cloud(g, x, y, s, lit, shade, alpha, R) {
        const w = s * 2.2, hh = s * 0.9, c = mk(w, hh), cg = c.getContext('2d'), n = 7;
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n, px = w * (0.1 + 0.8 * t), r = hh * (0.22 + 0.24 * Math.sin(t * Math.PI)) * (0.8 + R() * 0.4), py = hh * 0.72 - r * 0.7 + (R() - 0.5) * hh * 0.08;
          const gr = cg.createRadialGradient(px - r * 0.3, py - r * 0.5, r * 0.08, px, py, r); gr.addColorStop(0, lit); gr.addColorStop(0.55, rgba(mixHex(lit, shade, 0.4), 0.95)); gr.addColorStop(0.82, rgba(shade, 0.6)); gr.addColorStop(1, rgba(shade, 0));
          cg.fillStyle = gr; cg.beginPath(); cg.arc(px, py, r, 0, TAU); cg.fill();
        }
        cg.globalCompositeOperation = 'destination-out'; const fade = cg.createLinearGradient(0, hh * 0.62, 0, hh * 0.8); fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)'); cg.fillStyle = fade; cg.fillRect(0, hh * 0.6, w, hh);
        g.globalAlpha = alpha; g.drawImage(c, x - w / 2, y - hh * 0.7); g.globalAlpha = 1;
      }
      function paintSky(storm) {
        const W = M.w, H = M.h, P0 = pal(), dark = S.scene() === 'dark', c = mk(W, H), g = c.getContext('2d', { alpha: false });
        const cols = storm ? STORM[dark ? 'dark' : 'bright'] : P0.sky;
        const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, cols[0]); gr.addColorStop(0.55, cols[1]); gr.addColorStop(1, cols[2]);
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        const R = K.rng(storm ? 71 : 37 + MT.key.length);
        if (!storm && dark) { g.fillStyle = '#ffffff'; for (let i = 0; i < Math.round(W * H / 2600); i++) { g.globalAlpha = 0.25 + R() * 0.6; const s = R() < 0.1 ? 1.8 : 1.1; g.fillRect(R() * W, R() * H * 0.62, s, s); } g.globalAlpha = 1; }
        if (!storm && P0.aurora) {
          for (let b = 0; b < 3; b++) { g.beginPath(); for (let x = 0; x <= W; x += 10) { const y = H * (0.1 + b * 0.06) + Math.sin(x * 0.011 + b * 1.7) * 22 + Math.sin(x * 0.031 + b) * 8; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.lineTo(W, 0); g.lineTo(0, 0); g.closePath(); const ag = g.createLinearGradient(0, 0, 0, H * 0.42); ag.addColorStop(0, 'rgba(0,0,0,0)'); ag.addColorStop(1, rgba(P0.aurora, dark ? 0.2 : 0.12)); g.fillStyle = ag; g.fill(); }
        }
        const nC = storm ? 9 : 4;
        for (let i = 0; i < nC; i++) {
          const cx = R() * W, cy = (storm ? 0.06 + i / nC * 0.5 : 0.1 + R() * 0.28) * H, s = (storm ? 80 : 44) + R() * (M.phone ? 70 : 140);
          if (storm) cloud(g, cx, cy, s * 1.3, dark ? '#343746' : '#a3a7b8', dark ? '#16181f' : '#5f6477', 0.75, R);
          else cloud(g, cx, cy, s, '#ffffff', mixHex(cols[1], '#ffffff', 0.35), dark ? 0.1 : 0.7, R);
        }
        return c;
      }
      function skyMix() {
        const key = M.w + 'x' + M.h + ':' + S.scene() + ':' + MT.key;
        if (SKY.key !== key) { SKY.key = key; SKY.clear = paintSky(false); SKY.storm = paintSky(true); SKY.mix = mk(M.w, M.h); SKY.q = -1; }
        const q = Math.round(clamp(st.storm, 0, 1) * 24);
        if (q !== SKY.q) { SKY.q = q; const m = SKY.mix.getContext('2d', { alpha: false }); m.globalAlpha = 1; m.drawImage(SKY.clear, 0, 0); if (q) { m.globalAlpha = q / 24; m.drawImage(SKY.storm, 0, 0); } m.globalAlpha = 1; }
        return SKY.mix;
      }
      const BG = { key: '', far: null, mid: null, farT: 0, midT: 0, village: [] };
      function house(g, x, y, s, P0, R) {
        g.fillStyle = mixHex(P0.plain, '#ffffff', 0.55); g.fillRect(x - s * 0.6, y - s * 0.7, s * 1.2, s * 0.7);
        g.fillStyle = P0.roof; g.beginPath(); g.moveTo(x - s * 0.78, y - s * 0.66); g.lineTo(x, y - s * 1.3); g.lineTo(x + s * 0.78, y - s * 0.66); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.moveTo(x - s * 0.5, y - s * 0.9); g.lineTo(x, y - s * 1.3); g.lineTo(x + s * 0.5, y - s * 0.9); g.lineTo(x, y - s * 1.12); g.closePath(); g.fill();
        void R;
      }
      function paintFar(travel) {
        const W = M.w, H = M.h, P0 = pal(), Hf = H + travel, c = mk(W, Hf), g = c.getContext('2d');
        const R = K.rng(MT.key.length * 131 + 3), base = H * 0.6;
        const pts = []; let x = -40;
        while (x < W + 80) { pts.push([x, base - H * (0.04 + R() * 0.07)]); x += 24 + R() * 40; pts.push([x, base - H * (0.12 + R() * 0.15)]); x += 28 + R() * 48; }
        g.beginPath(); g.moveTo(-50, Hf); pts.forEach(p => g.lineTo(p[0], p[1])); g.lineTo(W + 80, Hf); g.closePath();
        let gr = g.createLinearGradient(0, base - H * 0.3, 0, base + H * 0.22); gr.addColorStop(0, P0.far); gr.addColorStop(1, mixHex(P0.far, P0.sky[2], 0.55));
        g.fillStyle = gr; g.fill();
        g.fillStyle = P0.farSnow;
        for (let i = 1; i < pts.length - 1; i++) {
          const p = pts[i], l = pts[i - 1], r = pts[i + 1]; if (p[1] > l[1] || p[1] > r[1]) continue;
          const k = 0.3 + R() * 0.16;
          g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(lerp(p[0], r[0], k), lerp(p[1], r[1], k)); g.lineTo(lerp(p[0], r[0], k * 0.62), lerp(p[1], r[1], k * 0.62) + 4); g.lineTo(lerp(p[0], r[0], k * 0.3), lerp(p[1], r[1], k * 0.3) + 2);
          g.lineTo(lerp(p[0], l[0], k * 0.55), lerp(p[1], l[1], k * 0.55) + 5); g.lineTo(lerp(p[0], l[0], k), lerp(p[1], l[1], k)); g.closePath(); g.fill();
        }
        g.fillStyle = rgba(P0.sky[2], 0.22); g.fillRect(0, base - H * 0.05, W, H * 0.3);
        // the valley floor far below: fields, a river, a village with smoke
        const vy = base + H * 0.17;
        gr = g.createLinearGradient(0, vy - 10, 0, Hf); gr.addColorStop(0, mixHex(P0.plain, P0.sky[2], 0.4)); gr.addColorStop(1, P0.plain);
        g.fillStyle = gr; g.beginPath(); g.moveTo(-10, vy + 10); for (let xx = -10; xx <= W + 10; xx += 20) g.lineTo(xx, vy + Math.sin(xx * 0.013) * 5); g.lineTo(W + 10, Hf); g.lineTo(-10, Hf); g.closePath(); g.fill();
        for (let k = 0; k < 9; k++) { const yy = vy + 10 + Math.pow(k / 9, 1.4) * H * 0.3; g.fillStyle = rgba(k % 2 ? '#ffffff' : P0.deep, 0.05); g.fillRect(0, yy, W, 4 + k * 2.2); }
        g.strokeStyle = rgba(mixHex(P0.sky[2], '#ffffff', 0.4), 0.38); g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath();
        for (let k = 0; k <= 24; k++) { const t = k / 24, xx = W * (0.55 + 0.5 * t), yy = vy + 22 + t * H * 0.16 + Math.sin(t * 6) * 8; k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke();
        for (let i = 0; i < (M.phone ? 16 : 34); i++) { const cx0 = R() * W, cy0 = vy + 10 + R() * H * 0.22, n3 = 3 + Math.floor(R() * 5); g.fillStyle = rgba(mixHex(P0.pine, P0.sky[2], 0.25), 0.75); for (let j = 0; j < n3; j++) { const fx = cx0 + (j - n3 / 2) * 4.5 + R() * 2, fy = cy0 + R() * 3, sz = 5 + R() * 4; g.beginPath(); g.moveTo(fx, fy - sz * 1.5); g.lineTo(fx + sz * 0.5, fy); g.lineTo(fx - sz * 0.5, fy); g.closePath(); g.fill(); } }
        BG.village = []; const vx0 = W * (M.phone ? 0.68 : 0.64), vyy = vy + H * 0.075, vs = clamp(H / 760, 0.9, 1.4);
        for (let i = 0; i < (M.phone ? 12 : 20); i++) { const hx = vx0 + (R() - 0.5) * (M.phone ? 120 : 240), hy = vyy + (R() - 0.5) * 22, s = (6 + R() * 4) * vs; house(g, hx, hy, s, P0, R); BG.village.push([hx, hy - s * 0.35, R() * 6]); }
        g.fillStyle = mixHex(P0.plain, '#ffffff', 0.5); g.fillRect(vx0 - 2, vyy - 26, 4, 18); g.fillStyle = P0.roof; g.beginPath(); g.moveTo(vx0 - 5, vyy - 24); g.lineTo(vx0, vyy - 40); g.lineTo(vx0 + 5, vyy - 24); g.closePath(); g.fill();
        g.fillStyle = rgba(P0.sky[2], 0.28); g.fillRect(0, vy - 8, W, H * 0.06);
        return c;
      }
      function massif(g, x0, x1, base, hgt, Hm, P0, R) {
        const n = 7, pts = [];
        for (let i = 0; i <= n; i++) { const t = i / n, x = lerp(x0, x1, t), env2 = Math.sin(t * Math.PI); pts.push([x, base - hgt * env2 * (0.55 + R() * 0.45)]); }
        g.beginPath(); g.moveTo(x0, Hm); pts.forEach(p => g.lineTo(p[0], p[1])); g.lineTo(x1, Hm); g.closePath();
        const gr = g.createLinearGradient(0, base - hgt, 0, base + hgt * 0.6); gr.addColorStop(0, P0.mid); gr.addColorStop(1, mixHex(P0.mid, P0.sky[2], 0.35)); g.fillStyle = gr; g.fill();
        g.fillStyle = P0.midSnow;
        pts.forEach((p, i) => { if (i === 0 || i === n) return; const l = pts[i - 1], r = pts[i + 1]; if (p[1] > l[1] && p[1] > r[1]) return; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(lerp(p[0], r[0], 0.4), lerp(p[1], r[1], 0.4)); g.lineTo(lerp(p[0], r[0], 0.18), lerp(p[1], r[1], 0.18) + 9); g.lineTo(lerp(p[0], l[0], 0.25), lerp(p[1], l[1], 0.25) + 7); g.lineTo(lerp(p[0], l[0], 0.42), lerp(p[1], l[1], 0.42)); g.closePath(); g.fill(); });
        g.fillStyle = P0.pine;
        for (let i = 0; i < 28; i++) { const t = R(), x = lerp(x0, x1, t), y = base + hgt * 0.05 + R() * hgt * 0.5, s = 7 + R() * 9; g.beginPath(); g.moveTo(x, y - s * 1.6); g.lineTo(x + s * 0.55, y); g.lineTo(x - s * 0.55, y); g.closePath(); g.fill(); }
      }
      function paintMid(travel) {
        const W = M.w, H = M.h, P0 = pal(), Hm = H + travel, c = mk(W, Hm), g = c.getContext('2d');
        const R = K.rng(MT.key.length * 53 + 11), base = H * 0.86;
        massif(g, -W * 0.25, W * 0.4, base, H * 0.3, Hm, P0, R);
        massif(g, W * 0.86, W * 1.3, base + H * 0.03, H * 0.24, Hm, P0, R);
        return c;
      }
      function ensureBG() {
        const key = M.w + 'x' + M.h + ':' + S.scene();
        if (BG.key === key) return; BG.key = key;
        BG.farT = Math.round(M.h * 0.34); BG.midT = Math.round(M.h * 0.6);
        BG.far = paintFar(BG.farT); BG.mid = paintMid(BG.midT);
      }

      /* ---------------- the mountain itself (painted once, sliced each frame) ---------------- */
      const WORLD = { key: '', c: null, glints: [] };
      function pine(g, x, y, s, P0) {
        const dark = mixHex(P0.pine, '#000000', 0.22), snow = P0.lit;
        g.fillStyle = '#4a3426'; g.fillRect(x - s * 0.05, y - s * 0.16, s * 0.1, s * 0.18);
        for (let k = 0; k < 4; k++) {
          const ty = y - s * (0.12 + k * 0.2), w = s * (0.36 - k * 0.07), hh = s * 0.33;
          g.fillStyle = k % 2 ? P0.pine : dark; g.beginPath(); g.moveTo(x, ty - hh); g.lineTo(x + w, ty); g.lineTo(x - w, ty); g.closePath(); g.fill();
          g.fillStyle = snow; g.beginPath(); g.moveTo(x, ty - hh); g.lineTo(x + w * 0.62, ty - hh * 0.4); g.quadraticCurveTo(x, ty - hh * 0.22, x - w * 0.62, ty - hh * 0.4); g.closePath(); g.fill();
        }
      }
      function rock(g, x, y, s, P0, R) {
        g.fillStyle = mixHex(P0.rock, '#000000', 0.15); g.beginPath();
        const n = 6; for (let i = 0; i < n; i++) { const a = Math.PI + i / (n - 1) * Math.PI, rr = s * (0.7 + R() * 0.4); i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.75) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.75); } g.closePath(); g.fill();
        g.fillStyle = mixHex(P0.rock, '#ffffff', 0.18); g.beginPath(); g.moveTo(x - s * 0.7, y - s * 0.05); g.lineTo(x - s * 0.15, y - s * 0.7); g.lineTo(x + s * 0.05, y - s * 0.1); g.closePath(); g.fill();
        g.fillStyle = P0.lit; g.beginPath(); g.ellipse(x - s * 0.1, y - s * 0.62, s * 0.55, s * 0.18, -0.1, 0, TAU); g.fill();
      }
      function paintWorld() {
        const W = M.w, WH = M.worldH, dpr = cv.dpr || 1, P0 = pal();
        const c = mk(W * dpr, WH * dpr), g = c.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const R = K.rng(MT.key.length * 977 + N * 31);
        const Ls = M.ledges, L0 = Ls[0], last = Ls[Ls.length - 1], ph = M.phone;
        const sx = L0.xs, sy = L0.ys, mY = M.meadowY;
        // the mountain body: a summit cap, flanks that widen to the edges, a foot that opens to the valley on the right
        const eL = ph ? -30 : M.colL - 70, eR = ph ? W + 30 : M.colR + 70;
        const d0 = L0.dir, e0x = L0.xe, e0y = L0.ye, edge = (d) => (d > 0 ? eR : eL);
        const sideA = [[e0x + d0 * 14, e0y - 34], [edge(d0), e0y - 8]], sideB = [[2 * sx - e0x - d0 * 6, e0y - 24], [edge(-d0), e0y + 12]];
        const right = d0 > 0 ? sideA : sideB, left = d0 > 0 ? sideB : sideA;
        const body = new Path2D();
        const pkx = sx - L0.dir * 6, pky = sy - (ph ? 48 : 60);
        body.moveTo(sx - 26, sy + 3);
        body.quadraticCurveTo(sx - 18, sy - 18, pkx - 3, pky + 3); body.lineTo(pkx, pky); body.lineTo(pkx + 3, pky + 3);
        body.quadraticCurveTo(sx + 18, sy - 18, sx + 26, sy + 3);
        body.quadraticCurveTo((sx + 26 + right[0][0]) / 2 + 8, (sy + right[0][1]) / 2 - 6, right[0][0], right[0][1]);
        body.lineTo(right[1][0], right[1][1]);
        body.lineTo(eR, last.ys + 30);
        body.lineTo(eL, last.ye + 34);
        body.lineTo(eL, left[1][1]);
        body.lineTo(left[0][0], left[0][1]);
        body.quadraticCurveTo((sx - 26 + left[0][0]) / 2 - 8, (sy + left[0][1]) / 2 - 6, sx - 26, sy + 3);
        body.closePath();
        g.save(); g.fillStyle = rgba(P0.deep, 0.18); g.translate(6, 8); g.fill(body); g.restore();
        let pat = null;
        g.save(); g.clip(body);
        let gr = g.createLinearGradient(0, sy - 40, 0, mY); gr.addColorStop(0, P0.lit); gr.addColorStop(1, mixHex(P0.lit, P0.shade, 0.32));
        g.fillStyle = gr; g.fillRect(0, sy - 60, W, mY - sy + 80);
        gr = g.createLinearGradient(eL, 0, eR, 0); gr.addColorStop(0, 'rgba(255,255,255,0.32)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.04)'); gr.addColorStop(0.75, rgba(P0.shade, 0.3)); gr.addColorStop(1, rgba(P0.deep, 0.5));
        g.fillStyle = gr; g.fillRect(0, sy - 60, W, mY - sy + 80);
        // soft couloirs: stacked strokes give feathered edges with no blur
        g.lineCap = 'round';
        for (let i = 0; i < (ph ? 14 : 26); i++) {
          const x0 = eL + R() * (eR - eL), y0 = sy + 40 + R() * (last.ys - sy), w0 = 50 + R() * 120;
          const dg = g.createRadialGradient(x0, y0, 2, x0, y0, w0); dg.addColorStop(0, rgba(P0.deep, 0.12)); dg.addColorStop(1, rgba(P0.deep, 0));
          g.save(); g.translate(x0, y0); g.scale(1, 0.22); g.translate(-x0, -y0); g.fillStyle = dg; g.beginPath(); g.arc(x0, y0, w0, 0, TAU); g.fill(); g.restore();
        }
        // a lit ridge under every ledge: the face catches the light just below the cut
        for (const ld of Ls) {
          const lo = Math.min(ld.xs, ld.xe), hi = Math.max(ld.xs, ld.xe), yl = Math.max(ld.ys, ld.ye) + 44;
          const lg = g.createLinearGradient(0, yl - 10, 0, yl + 40); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.22)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = lg; g.fillRect(lo - 30, yl - 10, hi - lo + 60, 50);
        }
        // fine grain
        const grain = mk(96, 96), gg = grain.getContext('2d'), Rg = K.rng(5);
        for (let i = 0; i < 520; i++) { gg.fillStyle = Rg() < 0.5 ? 'rgba(255,255,255,0.5)' : rgba(P0.deep, 0.3); gg.fillRect(Rg() * 96, Rg() * 96, 1, 1); }
        pat = g.createPattern(grain, 'repeat'); if (pat) { g.globalAlpha = 0.5; g.fillStyle = pat; g.fillRect(0, sy - 60, W, last.ye - sy + 120); g.globalAlpha = 1; }
        for (let i = 0; i < (ph ? 22 : 44); i++) {
          const x0 = R() * W, y0 = sy + R() * (mY - sy), len = 20 + R() * 50;
          g.strokeStyle = 'rgba(255,255,255,' + (0.35 + R() * 0.3).toFixed(2) + ')'; g.lineWidth = 1.2 + R() * 1.4;
          g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + len * 0.5, y0 - 4, x0 + len, y0 + 3); g.stroke();
        }
        // rocks and pines on the faces between the ledges
        for (let i = 0; i < Ls.length; i++) {
          const ld = Ls[i], nx = Ls[i + 1];
          const top = Math.max(ld.ys, ld.ye) + 30, bot = nx ? Math.min(nx.ys, nx.ye) - M.R0 * 2 - 6 : mY - 40;
          if (bot - top < 14) continue;
          const nR = ph ? 2 : 4, nP = ph ? 5 : 10;
          const bw = eR - eL;
          for (let k = 0; k < nR; k++) { const x = R() < 0.5 ? eL + R() * bw * 0.2 : eR - R() * bw * 0.2, y = top + R() * (bot - top); rock(g, x, y, 8 + R() * (ph ? 10 : 16), P0, R); }
          for (let k = 0; k < nP; k++) {
            const x = eL + R() * bw, y = top + 12 + R() * (bot - top - 12), n2 = 1 + Math.floor(R() * 3);
            for (let j = 0; j < n2; j++) { const s = Math.min(bot - top + 6, (14 + R() * (ph ? 16 : 26)) * (j ? 0.75 : 1)); if (s < 11) continue; pine(g, x + (j - n2 / 2) * s * 0.42, y + j * 2, s, P0); }
          }
        }
        g.restore();
        // the summit: a lit face, a shadowed face and a rocky shoulder
        g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.moveTo(pkx, pky); g.quadraticCurveTo(sx - 18, sy - 18, sx - 26, sy + 3); g.lineTo(sx - 6, sy + 3); g.closePath(); g.fill();
        g.fillStyle = rgba(P0.deep, 0.22); g.beginPath(); g.moveTo(pkx, pky); g.quadraticCurveTo(sx + 18, sy - 18, sx + 26, sy + 3); g.lineTo(sx + 8, sy + 3); g.closePath(); g.fill();
        rock(g, sx - L0.dir * 36, sy + 12, ph ? 10 : 13, P0, R);
        // the cliff under the last ledge, with icicles, framing the valley below
        const cl = (x) => last.ys + 26 + (x - eR) / (eL - eR) * (last.ye - last.ys + 8);
        g.beginPath(); g.moveTo(eR, cl(eR));
        for (let x = eR; x >= eL; x -= 14) g.lineTo(x, cl(x) + 30 + Math.sin(x * 0.11) * 6 + (R() - 0.5) * 8);
        g.lineTo(eL, cl(eL)); g.closePath();
        gr = g.createLinearGradient(0, last.ys, 0, last.ye + 80); gr.addColorStop(0, mixHex(P0.rock, '#ffffff', 0.1)); gr.addColorStop(1, mixHex(P0.rock, '#000000', 0.3));
        g.fillStyle = gr; g.fill();
        g.fillStyle = 'rgba(220,240,255,0.9)';
        for (let x = eR - 8; x > eL; x -= 11 + R() * 10) { const y = cl(x) + 26 + Math.sin(x * 0.11) * 6, il = 6 + R() * 14; g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x + 2, y); g.lineTo(x, y + il); g.closePath(); g.fill(); }
        g.fillStyle = P0.lit; g.beginPath(); g.moveTo(eR, cl(eR) - 6); for (let x = eR; x >= eL; x -= 18) g.lineTo(x, cl(x) + 4 + Math.sin(x * 0.2) * 3); g.lineTo(eL, cl(eL) - 6); g.closePath(); g.fill();
        // the ledges, top to bottom
        WORLD.glints = [];
        Ls.forEach((ld) => drawLedge(g, ld, P0, R));
        // summit flag and a cairn
        const fx = pkx, fy = pky + 2;
        g.strokeStyle = '#5b4632'; g.lineWidth = 2; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy - (ph ? 34 : 42)); g.stroke();
        g.fillStyle = MT.scarf; g.beginPath(); g.moveTo(fx, fy - (ph ? 34 : 42)); g.quadraticCurveTo(fx + 12, fy - (ph ? 32 : 39), fx + 20, fy - (ph ? 28 : 34)); g.lineTo(fx, fy - (ph ? 22 : 27)); g.closePath(); g.fill();
        // the meadow: a snowy shelf above the valley, its back edge a soft horizon
        const mEdge = (x) => mY - 3 - 7 * Math.pow((x - M.manX) / (W * 0.6), 2) - 3 * Math.sin(x * 0.02);
        const meadow = new Path2D();
        meadow.moveTo(-30, mEdge(-30)); for (let x = -30; x <= W + 30; x += 10) meadow.lineTo(x, mEdge(x)); meadow.lineTo(W + 30, WH); meadow.lineTo(-30, WH); meadow.closePath();
        g.save(); g.fillStyle = rgba(P0.deep, 0.25); g.translate(0, -5); g.fill(meadow); g.restore();
        gr = g.createLinearGradient(0, mY - 16, 0, WH); gr.addColorStop(0, P0.lit); gr.addColorStop(0.35, mixHex(P0.lit, P0.shade, 0.2)); gr.addColorStop(1, mixHex(P0.lit, P0.shade, 0.5));
        g.fillStyle = gr; g.fill(meadow);
        g.save(); g.clip(meadow);
        for (let i = 0; i < (ph ? 7 : 12); i++) { const x = R() * W, y = mY + 40 + R() * 160, w0 = 60 + R() * 120; const dg = g.createRadialGradient(x, y, 2, x, y, w0); dg.addColorStop(0, rgba(P0.deep, 0.16)); dg.addColorStop(1, rgba(P0.deep, 0)); g.save(); g.translate(x, y); g.scale(1, 0.16); g.translate(-x, -y); g.fillStyle = dg; g.beginPath(); g.arc(x, y, w0, 0, TAU); g.fill(); g.restore(); }
        if (pat) { g.globalAlpha = 0.45; g.fillStyle = pat; g.fillRect(0, mY - 20, W, WH - mY + 20); g.globalAlpha = 1; }
        g.restore();
        g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2; g.beginPath(); for (let x = -30; x <= W + 30; x += 10) { x === -30 ? g.moveTo(x, mEdge(x)) : g.lineTo(x, mEdge(x)); } g.stroke();
        // a rustic fence along the far edge, pines on the horizon and in the foreground corners
        const fz = ph ? 1 : 1.3;
        for (let x = M.manX + 120 * fz; x < W + 20; x += 22 * fz) { const y = mEdge(x); g.fillStyle = '#7a5434'; g.fillRect(x - 1.5 * fz, y - 15 * fz, 3 * fz, 15 * fz); g.fillStyle = '#ffffff'; g.fillRect(x - 2.5 * fz, y - 17 * fz, 5 * fz, 2.4 * fz); }
        g.strokeStyle = '#7a5434'; g.lineWidth = 2 * fz; g.beginPath(); g.moveTo(M.manX + 120 * fz, mEdge(M.manX + 120 * fz) - 10 * fz); g.lineTo(W + 20, mEdge(W + 20) - 10 * fz); g.stroke();
        [[M.manX - 150 * fz, 30], [M.manX - 128 * fz, 22], [M.manX + 168 * fz, 26]].forEach(([x, s2]) => pine(g, x, mEdge(x) + 2, s2 * fz, P0));
        [[M.manX - 92 * fz, 46], [M.manX - 112 * fz, 34], [M.manX + 96 * fz, 50], [M.manX + 118 * fz, 36]].forEach(([x, s2]) => pine(g, x, mY + 62 * fz + s2 * 0.2, s2 * fz, P0));
        if (!ph) [[M.colL - 90, 74], [M.colR + 96, 80], [M.colL - 170, 54], [M.colR + 180, 60]].forEach(([x, s2]) => pine(g, x, mY + 40, s2, P0));
        // footprints round the snowman's spot
        g.fillStyle = rgba(P0.deep, 0.22);
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, x = M.manX + Math.cos(a) * M.rCore * 2.4, y = mY + 5 + Math.sin(a) * M.rCore * 0.45; g.beginPath(); g.ellipse(x, y, 2.6, 1.3, a, 0, TAU); g.fill(); }
        for (let i = 0; i < 26; i++) WORLD.glints.push({ x: M.colL + R() * M.colW, y: mY + 4 + R() * 120, ph: R() * TAU, sp: 0.6 + R() * 1.2 });
        return c;
      }
      function drawLedge(g, ld, P0, R) {
        const lxE = Math.min(ld.xs, ld.xe), rxE = Math.max(ld.xs, ld.xe);
        const ly = ld.xs < ld.xe ? ld.ys : ld.ye, ry = ld.xs < ld.xe ? ld.ye : ld.ys;
        const len = Math.hypot(rxE - lxE, ry - ly), ang = Math.atan2(ry - ly, rxE - lxE), ext = ld.i === 0 ? 0 : 6;
        g.save(); g.translate(lxE, ly); g.rotate(ang);
        // shadow cast below the lip
        let gr = g.createLinearGradient(0, 2, 0, 30); gr.addColorStop(0, rgba(P0.deep, ld.i ? 0.42 : 0.22)); gr.addColorStop(1, rgba(P0.deep, 0));
        g.fillStyle = gr; g.fillRect(-ext, 2, len + ext * 2, ld.i ? 30 : 12);
        // the cut face above the track
        gr = g.createLinearGradient(0, -26, 0, -8); gr.addColorStop(0, rgba(P0.shade, 0)); gr.addColorStop(1, rgba(P0.deep, 0.45));
        g.fillStyle = gr; g.fillRect(-ext, -26, len + ext * 2, 18);
        // the groomed track
        gr = g.createLinearGradient(0, -9, 0, 3); gr.addColorStop(0, mixHex(P0.lit, P0.shade, 0.25)); gr.addColorStop(0.5, P0.lit); gr.addColorStop(1, '#ffffff');
        g.fillStyle = gr; g.beginPath(); g.moveTo(-ext, -9); g.lineTo(len + ext, -9); g.lineTo(len + ext, 3); g.lineTo(-ext, 3); g.closePath(); g.fill();
        g.strokeStyle = rgba(P0.shade, 0.45); g.lineWidth = 0.8;
        for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(0, -7 + k * 3); g.lineTo(len, -7 + k * 3); g.stroke(); }
        g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.moveTo(-ext, 3); g.lineTo(len + ext, 3); g.stroke();
        g.restore();
        for (let k = 0; k < 4; k++) { const s = R() * ld.L, p = ledgePt(ld, s); WORLD.glints.push({ x: p.x, y: p.y - 3, ph: R() * TAU, sp: 0.6 + R() * 1.2 }); }
        // the lip: a rounded cornice with icicles
        const lipX = ld.xe, lipY = ld.ye, d = ld.dir;
        g.fillStyle = P0.lit; g.beginPath(); g.ellipse(lipX + d * 4, lipY + 1, 11, 6, 0, 0, TAU); g.fill();
        g.fillStyle = rgba(P0.deep, 0.3); g.beginPath(); g.ellipse(lipX + d * 4, lipY + 5, 10, 3, 0, 0, Math.PI); g.fill();
        g.fillStyle = 'rgba(220,240,255,0.9)';
        for (let k = 0; k < 3; k++) { const ix = lipX + d * (k * 5 - 2), il = 5 + R() * 8; g.beginPath(); g.moveTo(ix - 1.6, lipY + 5); g.lineTo(ix + 1.6, lipY + 5); g.lineTo(ix, lipY + 5 + il); g.closePath(); g.fill(); }
        if (ld.i === 0) return;
        // the snow bank that catches the ball at the start, and the soft landing drift
        const bx = ld.xs - d * (M.bank * 0.3), by = ld.ys, bh = M.R0 * 1.15, bw2 = M.bank;
        const dw = bw2 * 1.5, dh = bh * 0.95, dcx = bx - d * bw2 * 0.15;
        const dg2 = g.createLinearGradient(dcx - d * dw, by - dh, dcx + d * dw * 0.6, by);
        dg2.addColorStop(0, mixHex(P0.lit, P0.shade, 0.45)); dg2.addColorStop(0.55, '#ffffff'); dg2.addColorStop(1, mixHex(P0.lit, P0.shade, 0.2));
        g.fillStyle = dg2; g.beginPath(); g.moveTo(dcx - d * dw * 0.9, by + 4);
        g.bezierCurveTo(dcx - d * dw * 0.95, by - dh * 0.75, dcx - d * dw * 0.2, by - dh * 1.15, dcx + d * dw * 0.35, by - dh * 0.72);
        g.quadraticCurveTo(dcx + d * dw * 0.55, by - dh * 0.55, dcx + d * dw * 0.45, by - dh * 0.4);
        g.quadraticCurveTo(dcx + d * dw * 0.75, by - dh * 0.1, dcx + d * dw * 0.95, by + 4); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(dcx - d * dw * 0.6, by - dh * 0.82); g.quadraticCurveTo(dcx - d * dw * 0.1, by - dh * 1.12, dcx + d * dw * 0.32, by - dh * 0.74); g.stroke();
        if (ld.i % 2 === 0) {
          const lx = bx + d * bw2 * 0.15, ly = by - bh * 1.05;
          g.strokeStyle = '#5b4632'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(lx, ly + 6); g.lineTo(lx, ly - 26); g.lineTo(lx + d * 8, ly - 26); g.stroke();
          g.fillStyle = '#3b3346'; g.fillRect(lx + d * 8 - 4, ly - 25, 8, 3);
          g.fillStyle = '#ffd36b'; g.fillRect(lx + d * 8 - 3, ly - 22, 6, 7);
          g.globalAlpha = S.scene() === 'dark' ? 0.55 : 0.35; g.drawImage(K.glowSprite('rgba(255,170,60,0.9)'), lx + d * 8 - 18, ly - 37, 36, 36); g.globalAlpha = 1;
        }
        for (let k = 0; k < 4; k++) { const s = 4 + k * M.R0 * 0.32, p = ledgePt(ld, s); g.fillStyle = k % 2 ? '#ffffff' : mixHex(P0.lit, P0.shade, 0.15); g.beginPath(); g.ellipse(p.x, p.y - 4, M.R0 * 0.34, 4.5, ld.ty * Math.sign(ld.tx), 0, TAU); g.fill(); }
      }
      function ensureWorld() {
        const key = M.w + 'x' + M.h + ':' + (cv.dpr || 1) + ':' + S.scene() + ':' + M.worldH;
        if (WORLD.key === key) return; WORLD.key = key; WORLD.c = paintWorld();
        const g = WORLD.c.getContext('2d'); TRAIL.forEach(t => stampOn(g, t[0], t[1], t[2]));
      }
      function stampOn(g, x, y, r) { const dpr = cv.dpr || 1; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = rgba(pal().deep, 0.1); g.beginPath(); g.ellipse(x, y - 2, Math.max(3, r * 0.42), 2.2, 0, 0, TAU); g.fill(); }
      function stamp(x, y, r) { if (!WORLD.c) return; TRAIL.push([x, y, r]); if (TRAIL.length > 900) TRAIL.shift(); stampOn(WORLD.c.getContext('2d'), x, y, r); }

      /* ---------------- audio: wind, the rolling crunch, and a waltz that speeds up with the spiral ---------------- */
      let wind = null, rumble = null;
      function beds() {
        if (!A.ctx || wind) return;
        wind = A.loop({ pink: true, filter: 'bandpass', freq: 520, q: 0.55, bus: 'amb' }); if (wind) wind.level(0.05, 1);
        rumble = A.loop({ pink: true, filter: 'lowpass', freq: 200, q: 0.8, bus: 'sfx' });
      }
      beds(); S.on('audio-ready', beds);
      S.onDestroy(() => { [wind, rumble].forEach(x => x && x.stop()); });
      const MZ = { on: true, next: 0, i: 0, bpm: 92, target: 92, maj: 0, layer: 0, vol: 1, pulses: [] };
      const PMIN = [['D2', ['F3', 'A3', 'D4'], ['A5', 'F5']], ['A#1', ['F3', 'A#3', 'D4'], ['F5', 'D5']], ['G2', ['G3', 'A#3', 'D4'], ['G5', 'D5']], ['A1', ['E3', 'A3', 'C#4'], ['E5', 'C#5']]];
      const PMAJ = [['D2', ['F#3', 'A3', 'D4'], ['A5', 'F#5']], ['B1', ['F#3', 'B3', 'D4'], ['F#5', 'D5']], ['G2', ['G3', 'B3', 'D4'], ['B5', 'G5']], ['A1', ['E3', 'A3', 'C#4'], ['E5', 'C#5']]];
      S.loop(() => {
        if (!A.ctx || !MZ.on) return;
        if (!MZ.next) MZ.next = A.now() + 0.12;
        if (MZ.next < A.now() - 0.12) { const spb = 60 / MZ.bpm, skip = Math.ceil((A.now() - MZ.next) / spb); MZ.next += skip * spb; MZ.i += skip; }
        const ahead = A.now() + 0.28;
        while (MZ.next < ahead) { waltz(MZ.next, MZ.i); MZ.bpm += (MZ.target - MZ.bpm) * 0.14; MZ.next += 60 / MZ.bpm; MZ.i++; }
      });
      function sleigh(t, vol) { for (let k = 0; k < 3; k++) A.tone({ when: t + k * 0.017, type: 'sine', freq: 4100 + k * 650 + Math.random() * 180, dur: 0.1, vol: vol * 0.45, bus: 'music' }); A.noise({ when: t, filter: 'highpass', freq: 7200, dur: 0.07, vol, bus: 'music' }); }
      function waltz(t, i) {
        const b = i % 3, bar = Math.floor(i / 3), slot = bar % 4, majBars = Math.round(MZ.maj * 4);
        const [root, ch, mel] = (slot < majBars ? PMAJ : PMIN)[slot], v = MZ.vol, tense = st.storm;
        if (b === 0) {
          A.pluck(A.note(root), { when: t, vol: 0.3 * v, damp: 0.993, lp: 800, bus: 'music' });
          if (MZ.layer >= 1) A.chime(A.note(mel[0]), { when: t, vol: 0.05 * v, dur: 1.7, bus: 'music' });
          if (tense > 0.5 && MZ.layer < 3) A.drum(t, 0.13 * tense * v, 0.5, 0);
          if (MZ.layer >= 3 && bar % 2 === 0) A.pad(ch.map(n => A.note(n) * 2), { when: t, dur: 60 / MZ.bpm * 6, vol: 0.06 * v, attack: 0.4 });
        } else {
          ch.forEach((n, k) => A.pluck(A.note(n) * (b === 2 ? 2 : 1), { when: t + k * 0.009, vol: (b === 1 ? 0.085 : 0.065) * v, damp: 0.985, lp: 2400, bus: 'music' }));
          if (MZ.layer >= 2 && b === 2 && bar % 2 === 1) A.chime(A.note(mel[1]), { when: t, vol: 0.04 * v, dur: 1.2, bus: 'music' });
          if (MZ.maj > 0.45) sleigh(t, (b === 1 ? 0.03 : 0.022) * Math.min(1, MZ.maj * 1.4));
        }
        if (tense > 0.35 && MZ.layer < 3) A.wood(t, 0.035 * tense * v, b === 0 ? 1.5 : 1.9);
        MZ.pulses.push({ t, b });
        if (MZ.pulses.length > 24) MZ.pulses.shift();
      }
      const PENT = ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6'];
      function sCrunch(size) { if (!A.ctx) return; A.noise({ filter: 'bandpass', freq: 1500 + Math.random() * 1400, q: 1.1, dur: 0.035 + Math.random() * 0.03, vol: 0.02 + 0.045 * size }); }
      function sWrap(k) { if (!A.ctx) return; A.noise({ filter: 'lowpass', freq: 1100, to: 260, dur: 0.32, vol: 0.13 }); A.tone({ type: 'sine', freq: 170 - k * 14, to: 70, glide: 0.22, dur: 0.32, vol: 0.2 }); ['D5', 'F5', 'A5', 'C6', 'D6'].slice(0, 2).forEach((n, j) => A.chime(A.note(n) * Math.pow(1.06, k), { when: A.now() + 0.05 + j * 0.07, vol: 0.05, dur: 0.9 })); }
      function sImpact(kind, size, clean) {
        if (!A.ctx) return; const t = A.now();
        A.thud({ vol: 0.3 + 0.25 * size });
        for (let i = 0; i < 9; i++) A.noise({ when: t + i * 0.014 + Math.random() * 0.012, filter: 'bandpass', freq: 900 + Math.random() * 2600, q: 1.2, dur: 0.05 + Math.random() * 0.05, vol: 0.09 + 0.08 * size });
        if (kind === 'fence') { A.wood(t, 0.24, 0.55); A.tone({ when: t, type: 'square', freq: 170, to: 90, glide: 0.12, dur: 0.16, vol: 0.05, lp: 900 }); }
        else A.drum(t, 0.42, 0.62, 0);
        for (let i = 0; i < 7; i++) A.noise({ when: t + 0.16 + i * 0.07 + Math.random() * 0.05, filter: 'highpass', freq: 2200 + Math.random() * 2400, dur: 0.02, vol: 0.03 + Math.random() * 0.03 });
        if (clean) ['D5', 'F#5', 'A5', 'D6'].forEach((n, i) => A.chime(A.note(n), { when: t + 0.08 + i * 0.06, vol: 0.07, dur: 1.4 }));
      }
      function sPlant(kind) { if (!A.ctx) return; A.wood(undefined, 0.2, kind === 'fence' ? 0.8 : 0.62); A.noise({ filter: 'lowpass', freq: 700, to: 250, dur: 0.16, vol: 0.12 }); A.thud({ vol: 0.16 }); }
      function sLand(size) { if (!A.ctx) return; A.noise({ filter: 'lowpass', freq: 800, to: 200, dur: 0.26, vol: 0.12 + 0.12 * size }); A.tone({ type: 'sine', freq: 130 - 40 * size, to: 52, glide: 0.18, dur: 0.24, vol: 0.18 + 0.12 * size }); }
      function sCreak() { if (!A.ctx) return; A.tone({ type: 'sawtooth', freq: 150, to: 70, glide: 0.5, dur: 0.55, vol: 0.028, lp: 700 }); A.noise({ when: A.now() + 0.42, filter: 'lowpass', freq: 500, dur: 0.24, vol: 0.12 }); }
      function sBlip(p) { if (!A.ctx) return; A.tone({ type: 'sine', freq: 520 + 1100 * p, dur: 0.06, vol: 0.022 + 0.035 * p }); }
      function sLock() { if (!A.ctx) return; A.tone({ type: 'triangle', freq: 1760, dur: 0.08, vol: 0.05 }); A.tone({ when: A.now() + 0.06, type: 'triangle', freq: 2350, dur: 0.1, vol: 0.05 }); }
      function sTime(down) { if (!A.ctx) return; A.noise({ filter: 'lowpass', freq: down ? 2600 : 300, to: down ? 260 : 2600, q: 0.8, dur: 0.45, vol: 0.06 }); }
      function sPomf() { if (!A.ctx) return; A.noise({ filter: 'lowpass', freq: 1300, to: 300, dur: 0.36, vol: 0.18 }); A.pop({ freq: 420, vol: 0.16 }); for (let i = 0; i < 3; i++) A.noise({ when: A.now() + 0.32 + i * 0.09, filter: 'lowpass', freq: 600, dur: 0.1, vol: 0.1 }); }
      function sPat(j) { if (!A.ctx) return; const t = A.now(); [0, 0.09].forEach(o => A.noise({ when: t + o, filter: 'lowpass', freq: 520, dur: 0.07, vol: 0.13 })); A.chime(A.note(['D5', 'F#5', 'A5'][j]), { when: t + 0.12, vol: 0.08, dur: 1.4 }); }
      function sBoop(f) { if (!A.ctx) return; A.tone({ type: 'triangle', freq: f, to: f * 1.5, glide: 0.06, dur: 0.12, vol: 0.06 }); }

      /* ---------------- tiny tween helper (runs in the frame loop) ---------------- */
      const TWS = [];
      function tween(ms, fn, ez) { if (reduced()) ms = Math.min(ms, 240); return new Promise(res => { TWS.push({ t0: now(), ms: Math.max(1, ms), fn, ez: ez || (k => k), res }); }); }
      function stepTweens() { for (let i = TWS.length - 1; i >= 0; i--) { const tw = TWS[i], k = clamp((now() - tw.t0) / tw.ms, 0, 1); try { tw.fn(tw.ez(k)); } catch (e) { console.error(e); } if (k >= 1) { TWS.splice(i, 1); tw.res(); } } }
      const waiters = {};
      const waitFor = (name) => new Promise(res => { waiters[name] = res; });
      const fire = (name) => { const r = waiters[name]; if (r) { waiters[name] = null; r(); } };
      const untilT = async (t) => { while (now() < t) await K.wait(80); };

      /* ---------------- the snowball ---------------- */
      function makeLayer(r0, r1, def, k) {
        const R = K.rng(k * 131 + 7), P0 = pal();
        const col = def.user ? mixHex('#ffffff', P0.shade, 0.06 + 0.04 * k) : mixHex('#f2f4fa', '#959bb0', 0.16 + 0.04 * k);
        const bits = [];
        const nb = def.user ? 5 : 9;
        for (let i = 0; i < nb; i++) bits.push({ u: 0.25 + R() * 0.6, ph: R() * TAU, kind: def.user ? (R() < 0.7 ? 3 : 0) : (R() < 0.35 ? 1 : R() < 0.6 ? 2 : R() < 0.8 ? 0 : 3), s: 0.9 + R() * 1.2, rot: R() * TAU });
        return { r0, r1, def, col, seam: mixHex(col, '#5c6690', 0.42), bits, lump: [0.024 + R() * 0.016, R() * TAU, 0.014 + R() * 0.01, R() * TAU, 0.008, R() * TAU] };
      }
      function lumpy(g, r, lp, a) {
        g.beginPath();
        for (let i = 0; i <= 32; i++) { const th = i / 32 * TAU, q = th - a, k = 1 + lp[0] * Math.sin(3 * q + lp[1]) + lp[2] * Math.sin(5 * q + lp[3]) + lp[4] * Math.sin(7 * q + lp[5]), x = Math.cos(th) * r * k, y = Math.sin(th) * r * k; i ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.closePath();
      }
      const CORE_LUMP = [0.02, 1.2, 0.012, 2.1, 0.006, 0.4];
      function drawFlakeGlyph(g, s, a, alpha) {
        g.save(); g.rotate(a); g.globalAlpha *= alpha; g.strokeStyle = '#5aa8de'; g.lineCap = 'round'; g.lineWidth = Math.max(1, s * 0.13);
        g.beginPath();
        for (let i = 0; i < 6; i++) { const q = i / 6 * TAU, c = Math.cos(q), sn = Math.sin(q); g.moveTo(0, 0); g.lineTo(c * s, sn * s); const bx = c * s * 0.58, by = sn * s * 0.58; g.moveTo(bx, by); g.lineTo(bx + Math.cos(q + 0.7) * s * 0.3, by + Math.sin(q + 0.7) * s * 0.3); g.moveTo(bx, by); g.lineTo(bx + Math.cos(q - 0.7) * s * 0.3, by + Math.sin(q - 0.7) * s * 0.3); }
        g.stroke(); g.restore();
      }
      function drawBall(g, x, y, r, a, layers, o) {
        o = o || {};
        const P0 = pal();
        g.save(); g.translate(x, y);
        if (o.sq) { g.rotate(o.sqA || 0); g.scale(1 + o.sq, 1 - o.sq); g.rotate(-(o.sqA || 0)); }
        const outer = layers.length ? layers[layers.length - 1] : null;
        const sc = outer ? r / outer.r1 : r / M.rCore;
        const wrap = o.wrap;
        for (let i = layers.length - 1; i >= 0; i--) {
          const ly = layers[i]; lumpy(g, ly.r1 * sc, ly.lump, a); g.fillStyle = ly.col; g.fill();
          if (i < layers.length - 1) { g.strokeStyle = rgba(ly.seam, 0.55); g.lineWidth = 1.2; g.stroke(); lumpy(g, ly.r1 * sc - 1.6, ly.lump, a); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1; g.stroke(); }
        }
        if (layers.length) { lumpy(g, M.rCore * sc, CORE_LUMP, a); g.strokeStyle = rgba(layers[0].seam, 0.5); g.lineWidth = 1.2; g.stroke(); }
        // the core: the fact itself, clean and lit from inside
        const rc = M.rCore * sc;
        lumpy(g, rc, CORE_LUMP, a); g.fillStyle = '#ffffff'; g.fill();
        if (!layers.length || o.coreGlow) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 + 0.25 * (o.coreGlow || 0); g.drawImage(K.glowSprite('#bfe4ff'), -rc * 1.6, -rc * 1.6, rc * 3.2, rc * 3.2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        if (!layers.length) drawFlakeGlyph(g, rc * 0.62, a * 0.6, 0.85);
        // bits stuck in the snow, turning with the ball
        for (const ly of layers) {
          for (const b of ly.bits) {
            const rr = (ly.r0 + (ly.r1 - ly.r0) * b.u) * sc, q = b.ph + a, bx = Math.cos(q) * rr, by = Math.sin(q) * rr;
            if (b.kind === 0) { g.fillStyle = '#7c8193'; g.beginPath(); g.arc(bx, by, b.s, 0, TAU); g.fill(); }
            else if (b.kind === 1) { g.strokeStyle = '#6b4a2c'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(bx - Math.cos(b.rot + a) * 3.2, by - Math.sin(b.rot + a) * 3.2); g.lineTo(bx + Math.cos(b.rot + a) * 3.2, by + Math.sin(b.rot + a) * 3.2); g.stroke(); }
            else if (b.kind === 2) { g.strokeStyle = P0.pine; g.lineWidth = 1; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(b.rot + a) * 2.6, by + Math.sin(b.rot + a) * 2.6); g.stroke(); }
            else { g.fillStyle = 'rgba(255,255,255,0.95)'; g.fillRect(bx - 0.9, by - 0.9, 1.8, 1.8); }
          }
        }
        // the layer still wrapping on: a band of fresh snow that sweeps round from the ground
        let shadeR = outer ? outer.r1 * sc : rc;
        if (wrap) {
          const k = wrap.k, ly = wrap.layer, rOut = lerp(ly.r0, ly.r1, Math.max(0.15, k)), mid = (ly.r0 + rOut) / 2, w = rOut - ly.r0 + 0.8;
          const c0 = o.contact || Math.PI / 2, sweep = TAU * k * (o.dir || 1);
          const a0 = (o.dir || 1) > 0 ? c0 : c0 + sweep, a1 = (o.dir || 1) > 0 ? c0 + sweep : c0;
          g.strokeStyle = ly.col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, mid, a0, a1); g.stroke();
          g.strokeStyle = ly.seam; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, rOut, a0, a1); g.stroke(); g.lineCap = 'butt';
          shadeR = Math.max(shadeR, rOut);
        }
        // one sphere of light over every layer
        g.save(); if (outer && !wrap) lumpy(g, outer.r1 * sc, outer.lump, a); else { g.beginPath(); g.arc(0, 0, shadeR, 0, TAU); } g.clip();
        g.drawImage(SPR.shade, -shadeR, -shadeR, shadeR * 2, shadeR * 2); g.restore();
        if (outer && !wrap) lumpy(g, outer.r1 * sc, outer.lump, a); else { g.beginPath(); g.arc(0, 0, shadeR, 0, TAU); }
        g.strokeStyle = rgba(P0.deep, 0.5); g.lineWidth = 1.4; g.stroke();
        g.restore();
      }
      function drawPlainBall(g, x, y, r, a, o) {
        o = o || {};
        const P0 = pal();
        g.save(); g.translate(x, y); if (o.sy) g.scale(1 + (1 - o.sy) * 0.6, o.sy);
        lumpy(g, r, CORE_LUMP, a); g.fillStyle = '#ffffff'; g.fill();
        g.save(); g.clip(); g.drawImage(SPR.shade, -r, -r, r * 2, r * 2); g.restore();
        lumpy(g, r, CORE_LUMP, a); g.strokeStyle = rgba(P0.deep, 0.5); g.lineWidth = 1.2; g.stroke();
        if (o.glow) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = o.glow; g.drawImage(K.glowSprite('#cfeaff'), -r * 1.8, -r * 1.8, r * 3.6, r * 3.6); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        g.restore();
      }
      function shadowAt(g, x, y, r, k) { g.fillStyle = rgba(pal().deep, 0.26 * (k == null ? 1 : k)); g.beginPath(); g.ellipse(x, y, r * 0.95, Math.max(2, r * 0.22), 0, 0, TAU); g.fill(); }

      /* ---------------- physics: rolling, falling, landing, hitting ---------------- */
      const G_ROLL = 920, G_FALL = 1500;
      function curLedge() { return M.ledges[B.li]; }
      function placeOnLedge() { const ld = curLedge(); const c = ledgeCenter(ld, B.s, B.r); B.x = c.x; B.y = c.y - B.hopY; }
      function stepBall(dtw) {
        if (dtw <= 0) return;
        const ld = curLedge();
        if (B.wrap) {
          B.wrap.k = clamp((st.wt - B.wrap.t0) / B.wrap.dur, 0, 1);
          B.r = lerp(B.wrap.layer.r0, B.wrap.layer.r1, ease.outCubic(B.wrap.k));
          if (B.wrap.k >= 1) finishWrap();
        }
        if (B.mode === 'roll') {
          const acc = G_ROLL * ld.ty * (st.phase === 'spiral' ? 1.3 : 1) - B.fr * B.v;
          B.v = clamp(B.v + acc * dtw, B.vmin, B.vmax);
          const ds = B.v * dtw; B.s += ds; B.dist += ds; B.a += (ds / Math.max(4, B.r)) * Math.sign(ld.tx); B.crA += ds / Math.max(4, B.r);
          if (st.phase === 'spiral' && !B.wrap && B.wrapIdx < layerDefs.length && B.dist >= B.wrapAt[B.wrapIdx]) startWrap(B.wrapIdx++);
          const bar = ld.barrier;
          if (bar && !bar.hit && B.s + B.r >= bar.s - bar.half) impact(bar);
          if (bar && bar.hit && bar.state === 'flat') { const u = (B.s - (bar.s - bar.len / 2)) / Math.max(10, bar.len); B.hopY = (u > 0 && u < 1) ? Math.sin(u * Math.PI) * 4 : 0; }
          else B.hopY = 0;
          if (B.mode === 'roll') { placeOnLedge(); if (B.s >= ld.L) startFall(); }
        } else if (B.mode === 'stuck') {
          const bar = ld.barrier, target = bar.s - bar.half - B.r;
          B.s += (target - B.s) * Math.min(1, dtw * 10); placeOnLedge();
        } else if (B.mode === 'hop') {
          const hp = B.hop, k = clamp((st.wt - hp.t0) / hp.dur, 0, 1);
          const sPrev = B.s; B.s = lerp(hp.s0, hp.s1, k); B.hopY = Math.sin(k * Math.PI) * hp.hgt;
          B.a += ((B.s - sPrev) / Math.max(4, B.r)) * Math.sign(ld.tx) * 1.6;
          placeOnLedge();
          if (k >= 1) { B.mode = 'roll'; B.hopY = 0; B.v = hp.v1; B.sq = 0.16; B.sqA = Math.PI / 2; puff(B.x, B.y + B.r, 10); sLand(B.r / M.R0 * 0.6); }
        } else if (B.mode === 'fall') {
          B.vy += G_FALL * dtw; B.x += B.vx * dtw; B.y += B.vy * dtw; B.a += (B.vx / Math.max(4, B.r)) * dtw;
          const out = Math.sign(ld.tx), next = M.ledges[B.li + 1];
          const wallX = next ? next.xs + out * (M.bank - 6) : (out > 0 ? M.colR - 6 : M.colL + 6);
          if ((B.x + out * B.r - wallX) * out > 0) { B.x = wallX - out * B.r; B.vx = -B.vx * 0.25; B.sq = 0.14; B.sqA = 0; if (!B.splat) { B.splat = 1; puff(wallX, B.y, 6); } }
          if (next) {
            const sy0 = surfY(next, B.x);
            if (B.y + B.r >= sy0 - 1 && B.vy > 0) land(next);
          } else if (B.y + B.r >= M.meadowY - 1 && B.vy > 0) landMeadow();
        } else if (B.mode === 'settle') {
          const se = B.settle, k = clamp((st.wt - se.t0) / se.dur, 0, 1), sPrev = B.s;
          B.s = lerp(se.s0, se.s1, ease.outBack(k)); B.a += ((B.s - sPrev) / Math.max(4, B.r)) * Math.sign(ld.tx); placeOnLedge();
          if (k >= 1) { B.mode = 'rest'; fire('rest'); }
        } else if (B.mode === 'rest') {
          placeOnLedge();
        } else if (B.mode === 'mroll') {
          const mr = B.mroll, k = clamp((st.wt - mr.t0) / mr.dur, 0, 1), xPrev = B.x;
          B.x = lerp(mr.x0, mr.x1, ease.outCubic(k)); B.y = M.meadowY - B.r; B.a += (B.x - xPrev) / Math.max(4, B.r);
          B.crA += Math.abs(B.x - xPrev) / Math.max(4, B.r);
          if (k >= 1) { B.mode = 'meadow'; fire('rest'); }
        } else if (B.mode === 'meadow') { B.y = M.meadowY - B.r; }
        B.sq *= Math.exp(-dtw * 9);
        // the crunch of snow under a rolling ball, and the groove it leaves
        if (B.crA > Math.PI / 2) { B.crA = 0; sCrunch(clamp(B.r / M.R0, 0.2, 1)); }
        if ((B.mode === 'roll' || B.mode === 'settle') && Math.hypot(B.x - B.stampX, B.y - B.stampY) > 5) { B.stampX = B.x; B.stampY = B.y; const c2 = ledgePt(ld, B.s); stamp(c2.x, c2.y, B.r); }
        else if (B.mode === 'mroll' && Math.abs(B.x - B.stampX) > 5) { B.stampX = B.x; B.stampY = B.y; stamp(B.x, M.meadowY, B.r); }
      }
      function startFall() {
        const ld = curLedge();
        B.mode = 'fall'; B.splat = 0;
        B.vx = ld.tx * B.v * (st.phase === 'spiral' ? 0.5 : 0.42); B.vy = ld.ty * B.v + 40;
        if (rumble) rumble.level(0.0001, 0.2);
      }
      function land(next) {
        const imp = clamp(B.vy / 900, 0.15, 1);
        B.li = next.i;
        B.s = clamp(((B.x - next.xs) / (next.xe - next.xs)) * next.L, B.r * 0.4, next.L * 0.3);
        B.sq = 0.12 + 0.2 * imp; B.sqA = Math.PI / 2;
        const p = ledgePt(next, B.s); puff(p.x, p.y, 12 + Math.round(10 * imp)); sLand(clamp(B.r / M.R0, 0.2, 1) * imp);
        if (!reduced()) st.shake = Math.max(st.shake, 2 + 4 * imp * clamp(B.r / M.R0, 0.3, 1));
        if (st.phase === 'spiral' && next.open) { B.mode = 'roll'; B.v = Math.max(70, Math.abs(B.vx) * 0.9 + 50); placeOnLedge(); return; }
        if (st.phase === 'spiral') finishAllWraps();
        B.mode = 'settle'; B.settle = { t0: st.wt, dur: reduced() ? 0.25 : 0.5, s0: B.s, s1: B.r + 6 };
        placeOnLedge();
      }
      function landMeadow() {
        const imp = clamp(B.vy / 900, 0.15, 1);
        B.y = M.meadowY - B.r; B.sq = 0.2 * imp + 0.08; B.sqA = Math.PI / 2;
        puff(B.x, M.meadowY, 14); sLand(0.4 * imp);
        B.mode = 'mroll'; B.mroll = { t0: st.wt, dur: reduced() ? 0.5 : 1.5, x0: B.x, x1: M.stopX };
        st.camMode = 'meadow';
      }
      function startWrap(k) {
        const def = layerDefs[k], r0 = B.layers.length ? B.layers[B.layers.length - 1].r1 : M.rCore;
        B.wrap = { k: 0, t0: st.wt, dur: reduced() ? 0.3 : 0.6, layer: makeLayer(r0, r0 + M.th, def, k), idx: k };
      }
      function finishWrap() {
        const w = B.wrap; if (!w) return; B.wrap = null;
        B.layers.push(w.layer); B.r = w.layer.r1;
        sWrap(w.idx); B.sq = 0.1; B.sqA = 0;
        popTag(w.layer.def, B.x, B.y - B.r - 10);
        const kk = B.layers.length / N;
        st.stormT = 0.3 + 0.7 * kk; MZ.target = lerp(96, 156, kk);
        loopie.face(['worried', 'surprised', 'dizzy', 'cry', 'dizzy'][Math.min(4, w.idx)], 900);
        if (!reduced()) st.shake = Math.max(st.shake, 2.5);
      }
      function finishAllWraps() { while (B.wrap || B.wrapIdx < layerDefs.length) { if (!B.wrap) startWrap(B.wrapIdx++); B.wrap.k = 1; finishWrap(); } }

      /* ---------------- question barriers ---------------- */
      function barHeight() { return M.phone ? 44 : 56; }
      function logR() { return M.phone ? 11 : 14; }
      function plant(card, s, prec) {
        if (st.phase !== 'place' || card.used) return;
        const k = st.round, ld = M.ledges[2 + k], kind = card.d.kind;
        card.used = true; card.el.classList.add('used'); card.el.classList.remove('lift');
        proxy.hidden = true; st.dragging = null; st.ghost = null; st.tsT = 1; sTime(false);
        const bar = { li: ld.i, s, kind, qid: card.id, prec, clean: prec >= CLEAN, hit: false, state: 'planted', ang: 0, wob: 0, wobV: 0, drop: 1,
          half: kind === 'fence' ? barHeight() * 0.36 : logR() * 0.75, len: barHeight() * 0.8, flat: 0 };
        ld.barrier = bar; BARS.push(bar);
        tween(reduced() ? 120 : 300, q => { bar.drop = 1 - q; }, ease.outCubic).then(() => {
          const p = ledgePt(ld, s); puff(p.x, p.y, 10); sPlant(kind); bar.wobV = 2.4 * ld.dir;
          if (bar.clean) { P.emit('star', p.x, p.y - 20, 10, { colors: ['#ffffff', '#fff3b0', '#cfe9ff'], speed: [40, 120] }); sLock(); }
        });
        st.precs.push(prec);
        K.guide(null); hideTray();
        ctx.track('plant', { k, q: card.id, prec: Math.round(prec * 100) });
        st.phase = 'roll';
        fire('plant');
      }
      function impact(bar) {
        bar.hit = true; st.hits++;
        const ld = curLedge(), big = clamp(B.r / M.R0, 0.3, 1), dir = Math.sign(ld.tx);
        st.hitstop = reduced() ? 0 : 0.08;
        if (!reduced()) st.shake = 5 + 9 * big;
        st.flash = reduced() ? 0 : 1; st.flashX = B.x + dir * B.r; st.flashY = B.y;
        breakLayer(bar.clean, dir);
        sImpact(bar.kind, big, bar.clean);
        bar.wobV = 4 * dir;
        if (bar.clean) { const p = toScreen(B.x, B.y - B.r - 20); K.pop('Clean break', { x: clamp(p.x, 90, M.w - 90), y: p.y, kind: 'great' }); }
        if (bar.kind === 'fence') { B.mode = 'stuck'; B.v = 0; }
        else { B.mode = 'hop'; B.hop = { t0: st.wt, dur: reduced() ? 0.35 : 0.52, s0: B.s, s1: bar.s + bar.half + B.r + 14, hgt: 22 + B.r * 0.55, v1: Math.max(60, B.v * 0.4) }; }
        MZ.maj = st.hits / N; MZ.target = lerp(156, 88, st.hits / N); st.stormT = Math.max(0.04, (N - st.hits) / N * 0.95);
        if (rumble) rumble.level(0.0001, 0.08);
        onAnswer(bar);
        ctx.track('hit', { k: st.hits, clean: bar.clean ? 1 : 0 });
      }
      function breakLayer(clean, dir) {
        const ly = B.layers.pop(); if (!ly) return;
        B.r = B.layers.length ? B.layers[B.layers.length - 1].r1 : M.rCore;
        const n = clean ? 2 : (inten > 0 ? 7 : 5), base = Math.random() * TAU;
        for (let k = 0; k < n; k++) {
          const a0 = base + k * TAU / n + 0.04, a1 = a0 + TAU / n - 0.08, pts = [];
          const am = (a0 + a1) / 2, rm = (ly.r0 + ly.r1) / 2, cxF = Math.cos(am) * rm, cyF = Math.sin(am) * rm;
          const steps = clean ? 10 : 4;
          for (let i = 0; i <= steps; i++) { const q = lerp(a0, a1, i / steps), rr = ly.r1 * (1 + 0.04 * Math.sin(q * 5)); pts.push([Math.cos(q) * rr - cxF, Math.sin(q) * rr - cyF]); }
          for (let i = steps; i >= 0; i--) { const q = lerp(a0, a1, i / steps); pts.push([Math.cos(q) * ly.r0 - cxF, Math.sin(q) * ly.r0 - cyF]); }
          const sp = clean ? 150 : 110 + Math.random() * 150;
          FR.push({ x: B.x + cxF, y: B.y + cyF, vx: Math.cos(am) * sp - dir * (clean ? 70 : 40), vy: Math.sin(am) * sp - (clean ? 210 : 150), rot: 0, w: (Math.random() - 0.5) * (clean ? 5 : 9), pts, col: ly.col, seam: ly.seam, age: 0, life: 1.3 + Math.random() * 0.6, li: B.li });
        }
        P.emit('dust', B.x, B.y, 18, { colors: ['rgba(255,255,255,0.9)', 'rgba(225,235,255,0.8)'], speed: [60, 220] });
        P.emit('snow', B.x + dir * B.r, B.y, 16, { colors: ['#ffffff', '#e8f4ff'], speed: [80, 260], angle: -Math.PI / 2, spread: 2.6 });
        if (clean) P.emit('star', B.x, B.y, 12, { colors: ['#ffffff', '#fff3b0', '#cfe9ff'], speed: [80, 220] });
        // the layer's label flies off, struck through
        popTag(ly.def, B.x, B.y - B.r - 14, true);
      }
      function stepFrags(dtw) {
        for (let i = FR.length - 1; i >= 0; i--) {
          const f = FR[i]; f.age += dtw; f.vy += 1300 * dtw; f.x += f.vx * dtw; f.y += f.vy * dtw; f.rot += f.w * dtw;
          const ld = M.ledges[f.li];
          if (ld) { const lo = Math.min(ld.xs, ld.xe) - 6, hi = Math.max(ld.xs, ld.xe) + 6; if (f.x > lo && f.x < hi) { const gy = surfY(ld, f.x) - 4; if (f.y > gy && f.vy > 0 && f.y < gy + 30) { f.y = gy; f.vy *= -0.3; f.vx *= 0.7; f.w *= 0.6; f.vx += ld.tx * 30; } } else if (f.y > surfY(ld, clamp(f.x, lo, hi)) + 40 && M.ledges[f.li + 1]) f.li++; }
          if (f.age > f.life) { P.emit('snow', f.x, f.y, 5, { colors: ['#ffffff'], speed: [10, 50] }); FR.splice(i, 1); }
        }
      }
      function tipFence(bar) {
        if (bar.state !== 'planted' || !bar.hit) return;
        bar.state = 'tipping'; sCreak();
        const ld = M.ledges[bar.li], dir = Math.sign(ld.tx);
        tween(reduced() ? 200 : 480, q => { bar.flat = q; bar.ang = dir * 0.18 * Math.sin(q * Math.PI); }, ease.inCubic).then(() => {
          bar.state = 'flat'; bar.ang = 0; const p = ledgePt(ld, bar.s); puff(p.x, p.y, 12); if (A.ctx) A.noise({ filter: 'lowpass', freq: 420, dur: 0.22, vol: 0.14 });
          if (curLedge() === ld && B.mode === 'stuck') { B.mode = 'roll'; B.v = 34; B.vmin = 28; B.fr = 0.25; }
        });
      }
      function puff(x, y, n) { P.emit('dust', x, y, n, { colors: ['rgba(255,255,255,0.95)', 'rgba(230,240,255,0.85)'], speed: [30, 130], angle: -Math.PI / 2, spread: 2.4 }); }

      /* ---------------- tags (DOM labels that follow the world) ---------------- */
      function setTagContent(node, head, txt, cls) {
        node.className = 'sb-tag' + (cls ? ' ' + cls : '');
        node.children[0].textContent = head; node.children[1].textContent = txt;
        node.children[1].className = /\bgen\b|fact-gen/.test(cls || '') ? '' : 'gk-user';
      }
      let tagAnchor = null;
      function showTag(head, txt, cls, anchor) { setTagContent(tag, head, txt, cls); tag.hidden = false; tag.style.opacity = '1'; tagW = tag.offsetWidth; tagH = tag.offsetHeight; tagAnchor = anchor || null; }
      function hideTag() { tag.hidden = true; tagAnchor = null; }
      function popTag(def, wx, wy, struck) {
        const p = pops.find(x => !x.on) || pops[0];
        setTagContent(p.el, struck ? 'Knocked off' : (def.user ? 'And then…' : 'The spiral adds…'), def.text, def.user ? '' : 'gen');
        p.el.children[1].style.textDecoration = struck ? 'line-through' : '';
        p.el.children[1].style.textDecorationThickness = struck ? '2px' : '';
        p.el.hidden = false; p.on = true; p.wx = wx; p.wy = wy; p.t0 = now(); p.life = struck ? 1500 : 1700; p.struck = !!struck; p.w = p.el.offsetWidth; p.h = p.el.offsetHeight;
      }
      function placeTagEl(node, sx, sy, w, hh, alpha, scale) {
        const x = clamp(sx - w / 2, 10, M.w - 10 - w), y = sy - hh - 8;
        node.style.setProperty('--ax', clamp(sx - x, 14, w - 14).toFixed(1) + 'px');
        node.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + (scale || 1).toFixed(3) + ')';
        node.style.opacity = alpha.toFixed(3);
      }
      function placeDom() {
        const W = M.w;
        if (!tag.hidden) {
          const an0 = tagAnchor ? tagAnchor() : { x: B.x, y: B.y - B.r - 6 };
          const p = toScreen(an0.x, an0.y);
          placeTagEl(tag, p.x, Math.max(p.y, M.viewTop + tagH + 14), tagW, tagH, 1, 1);
        }
        for (const p of pops) {
          if (!p.on) continue;
          const k = (now() - p.t0) / p.life;
          if (k >= 1) { p.on = false; p.el.hidden = true; continue; }
          const s = toScreen(p.wx, p.wy), rise = p.struck ? -k * 30 : -k * 18, alpha = k < 0.12 ? k / 0.12 : k > 0.7 ? (1 - k) / 0.3 : 1;
          if (s.y + rise < M.viewTop - 10 || s.y > M.h - 20) { p.el.style.opacity = '0'; continue; }
          placeTagEl(p.el, s.x + (p.struck ? (k * 40) : 0), s.y + rise, p.w, p.h, alpha, k < 0.12 ? 0.8 + k / 0.12 * 0.2 : 1);
        }
        if (!hitFlake.hidden) { const f = flakeWorld(), s = toScreen(f.x, f.y); hitFlake.style.transform = 'translate(' + (s.x - 32) + 'px,' + (s.y - 32) + 'px)'; }
        if (!hitBall.hidden) { const s = toScreen(B.x, B.y), sz = Math.max(96, B.r * cam.z * 3); hitBall.style.width = hitBall.style.height = sz + 'px'; hitBall.style.transform = 'translate(' + (s.x - sz / 2) + 'px,' + (s.y - sz / 2) + 'px)'; }
        for (const m of minis) {
          if (!m.vis) continue;
          const s = toScreen(m.x, m.y), sz = Math.max(60, m.r * cam.z * 3.2);
          if (!m.el.hidden) { m.el.style.width = m.el.style.height = sz + 'px'; m.el.style.transform = 'translate(' + (s.x - sz / 2) + 'px,' + (s.y - sz / 2) + 'px)'; }
          if (!m.tag.hidden) { const tw = m.tagW || (m.tagW = m.tag.offsetWidth); m.tag.style.transform = 'translate(' + clamp(s.x - tw / 2, 8, W - 8 - tw).toFixed(1) + 'px,' + (s.y - m.r * cam.z - 34).toFixed(1) + 'px)'; }
        }
        if (!pill.hidden && st.hat) { const hp = headPos(), s = toScreen(hp.x, hp.y - M.partR[2] * 3.4); const pw = st.pillW || (st.pillW = pill.offsetWidth); pill.style.transform = 'translate(' + clamp(s.x - pw / 2, 8, W - 8 - pw).toFixed(1) + 'px,' + (s.y - 30).toFixed(1) + 'px)'; }
      }

      /* ---------------- the tray, the answer card and the drag ---------------- */
      function showTray() { st.trayOn = true; tray.classList.remove('off'); }
      function hideTray() { st.trayOn = false; tray.classList.add('off'); }
      function showAnswer(title, parts, icon) {
        answer.replaceChildren(h('small', null, icon ? h('i', { html: ICON[icon] }) : null, h('span', { text: title })), ...parts.map(p => h('p', { class: p.user ? 'gk-user' : '', text: (p.pre || '') + p.t })));
        answer.classList.remove('off'); st.answerOn = true;
      }
      function hideAnswer() { answer.classList.add('off'); st.answerOn = false; }
      function onAnswer(bar) {
        const d = QDEF[bar.qid], parts = answerOf(bar.qid);
        showAnswer(d.q, parts, d.kind);
        const words = parts.reduce((n, p) => n + nWords(p.t), 0);
        st.answerUntil = now() + clamp(2000 + words * 200, 3200, 7200);
        const mood = { evidence: serious ? 'think' : 'wink', else: 'idea', cope: 'determined', friend: 'love', year: 'calm' }[bar.qid] || 'happy';
        say(still, L(LINES.hit[bar.qid]), { mood, moodMs: 3600, ms: 3800 });
        loopie.face(bar.clean ? 'surprised' : 'worried', 1500);
        if (st.hits === N) S.later(() => { if (st.phase !== 'finale') say(loopie, L(LINES.core), { mood: serious || care ? 'calm' : 'surprised', ms: 3200 }); }, 2600);
        if (bar.kind === 'fence') S.later(() => tipFence(bar), clamp((st.answerUntil - now()) * 0.62, 1700, 4200));
      }
      function placeGuide() {
        const c = cards.find(x => !x.used); if (!c) return;
        const cr = K.rectIn(c.el), sp = sweetScreen(st.round);
        K.guide({ id: 'plant' + st.round, g: 'drag', target: c.el, dx: Math.round(sp.x - cr.cx), dy: Math.round(sp.y + LIFT() - cr.cy), label: st.round ? 'NEXT QUESTION' : 'PLANT A QUESTION', delay: st.round ? 700 : 1000, place: 'above' });
      }
      let blipT = 0, lastPrecHot = false;
      function dragStart(c, p) {
        st.dragging = c; c.el.classList.add('lift'); K.guide(null);
        proxy.children[0].innerHTML = ICON[c.d.kind]; proxy.children[1].textContent = c.d.q; proxy.hidden = false; st.proxyW = proxy.offsetWidth; st.proxyH = proxy.offsetHeight;
        st.tsT = 0.18; sTime(true); if (A.ctx) A.paper({ vol: 0.1 }); K.sfx.tap();
        if (st.answerOn) hideAnswer();
        dragMove(c, p);
      }
      function dragMove(c, p) {
        const px = p.x, py = p.y - LIFT();
        const ld = M.ledges[2 + st.round], w = toWorld(px, py);
        const s = (w.x - ld.xs) * ld.tx + (w.y - ld.ys) * ld.ty, dn = (w.x - ld.xs) * ld.nx + (w.y - ld.ys) * ld.ny;
        const sMin = B.s + B.r + (c.d.kind === 'fence' ? 26 : 30), sMax = ld.L - 30;
        const valid = s > sMin - 60 && s < sMax + 50 && dn > -90 && dn < 170;
        const ss = clamp(s, sMin, sMax), tol = [74, 58, 44][inten] || 58, prec = clamp(1 - Math.abs(ss - ld.sweet) / tol, 0, 1);
        st.ghost = valid ? { s: ss, prec, kind: c.d.kind } : null;
        const hot = valid && prec >= CLEAN;
        proxy.classList.toggle('hot', hot);
        if (hot && !lastPrecHot) sLock(); lastPrecHot = hot;
        if (valid && now() - blipT > 120) { blipT = now(); sBlip(prec); }
        let ax = px, ay = py;
        if (valid) { const gp = ledgePt(ld, ss), sp = toScreen(gp.x, gp.y); ax = sp.x; ay = sp.y - barHeight() * cam.z - 12; }
        const x = clamp(ax - st.proxyW / 2, 6, M.w - 6 - st.proxyW), y = clamp(ay - st.proxyH, 60, M.h - st.proxyH - 6);
        proxy.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      }
      function dragEnd(c) {
        const gh = st.ghost;
        if (gh && st.phase === 'place') { plant(c, gh.s, gh.prec); return; }
        c.el.classList.remove('lift'); proxy.hidden = true; st.dragging = null; st.ghost = null; st.tsT = 1; sTime(false); K.sfx.soft();
        placeGuide();
      }
      cards.forEach(c => {
        K.drag(c.el, {
          space: el,
          start: (p) => { if (st.phase !== 'place' || !st.trayOn || c.used || st.dragging) return false; dragStart(c, p); },
          move: (p) => { if (st.dragging === c) dragMove(c, p); },
          end: () => { if (st.dragging === c) dragEnd(c); }
        });
        S.listen(c.el, 'keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && st.phase === 'place' && st.trayOn && !c.used) { e.preventDefault(); A.unlock(); plant(c, M.ledges[2 + st.round].sweet, 1); } });
      });

      /* ---------------- summit tap, split, build ---------------- */
      K.tap(hitFlake, () => {
        if (st.phase !== 'summit') return;
        st.phase = 'fact'; hitFlake.hidden = true; K.guide(null);
        K.sfx.sparkle(); if (A.ctx) A.chime(A.note('A5'), { vol: 0.08, dur: 1.8 });
        const f = flakeWorld(); P.emit('star', f.x, f.y, 14, { colors: ['#ffffff', '#cfe9ff', '#fff3b0'], speed: [30, 110] });
        st.flakePop = 1;
        showTag('What actually happened', core, noText ? 'fact fact-gen' : 'fact', () => { const q = flakeWorld(); return { x: q.x, y: q.y - 18 }; });
        say(loopie, L(LINES.fact), { mood: 'think', ms: 3400 });
        fire('flake');
      });
      function doSplit() {
        if (st.phase !== 'split') return;
        st.phase = 'splitting'; hitBall.hidden = true; K.guide(null);
        sPomf(); P.emit('dust', B.x, B.y, 20, { colors: ['#ffffff', '#e6f2ff'], speed: [40, 180] }); P.emit('star', B.x, B.y, 10, { colors: ['#ffffff', '#cfe9ff'] });
        if (!reduced()) st.shake = 3;
        B.mode = 'hidden';
        minis.forEach((m, i) => {
          m.vis = true; m.r = M.partR[i]; m.x = B.x; m.y = B.y; m.rest = { x: M.miniX[i], y: M.meadowY - M.partR[i] };
          m.fly = { t0: st.wt, dur: reduced() ? 0.3 : 0.62 + i * 0.08, x0: B.x, y0: B.y, x1: m.rest.x, y1: m.rest.y, hgt: 46 + i * 12 };
        });
        S.later(() => { minis.forEach(m => { m.tag.hidden = false; m.tagW = m.tag.offsetWidth; }); fire('split'); }, reduced() ? 320 : 820);
        ctx.track('split', {});
      }
      K.drag(hitBall, { space: el, start: () => { if (st.phase !== 'split') return false; if (A.ctx) A.noise({ filter: 'bandpass', freq: 1400, dur: 0.08, vol: 0.05 }); }, move: (p, d) => { if (Math.hypot(d.dx, d.dy) > 34) doSplit(); }, end: () => doSplit() });
      S.listen(hitBall, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); A.unlock(); doSplit(); } });
      function headPos() { return stackPos(2); }
      function placePart(m) {
        if (m.placed || st.phase !== 'build' || st.buildIdx !== m.i) return;
        m.placed = true; m.drag = null; m.el.hidden = true; m.tag.hidden = true; K.guide(null);
        const tp = stackPos(m.i), x0 = m.x, y0 = m.y;
        tween(reduced() ? 160 : 380, q => { m.x = lerp(x0, tp.x, q); m.y = lerp(y0, tp.y, q) - Math.sin(q * Math.PI) * 26; }, ease.inOutCubic).then(() => {
          m.x = tp.x; m.y = tp.y; m.sq = 0.24; sPat(m.i); puff(tp.x, tp.y + m.r, 8);
          if (!reduced()) st.shake = Math.max(st.shake, 1.5);
          fire('built');
        });
        ctx.track('build', { part: m.i });
      }
      minis.forEach(m => {
        K.drag(m.el, {
          space: el,
          start: (p) => {
            if (st.phase !== 'build' || m.placed) return false;
            if (st.buildIdx !== m.i) { m.sq = 0.18; sBoop(380); return false; }
            const w = toWorld(p.x, p.y); m.drag = { ox: m.x - w.x, oy: m.y - w.y }; K.guide(null); if (A.ctx) A.noise({ filter: 'lowpass', freq: 600, dur: 0.06, vol: 0.08 });
          },
          move: (p) => { if (!m.drag) return; const w = toWorld(p.x, p.y); m.x = w.x + m.drag.ox; m.y = w.y + m.drag.oy; },
          end: (p) => {
            if (!m.drag) return; m.drag = null;
            const tp = stackScreen(m.i), sp = toScreen(m.x, m.y);
            if (Math.hypot(sp.x - tp.x, sp.y - tp.y) < (M.phone ? 76 : 96)) placePart(m);
            else { const x0 = m.x, y0 = m.y; tween(260, q => { m.x = lerp(x0, m.rest.x, q); m.y = lerp(y0, m.rest.y, q); }, ease.outCubic); if (A.ctx) K.sfx.soft(); buildGuide(m.i); }
            void p;
          }
        });
        S.listen(m.el, 'keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && st.phase === 'build' && st.buildIdx === m.i) { e.preventDefault(); A.unlock(); placePart(m); } });
      });
      function buildGuide(j) {
        const m = minis[j], tp = stackScreen(j), s = toScreen(m.x, m.y);
        K.guide({ id: 'build' + j, g: 'drag', target: m.el, dx: Math.round(tp.x - s.x), dy: Math.round(tp.y - s.y), label: ['BASE FIRST', 'NOW THE MIDDLE', 'HEAD ON TOP'][j], delay: 700, place: j === 0 ? 'above' : 'below' });
      }
      function stepMinis(dtw) {
        for (const m of minis) {
          if (!m.vis) continue;
          if (m.fly) { const f = m.fly, k = clamp((st.wt - f.t0) / f.dur, 0, 1); m.x = lerp(f.x0, f.x1, k); m.y = lerp(f.y0, f.y1, ease.inQuad(k)) - Math.sin(k * Math.PI) * f.hgt; m.a += dtw * 9 * Math.sign(f.x1 - f.x0); if (k >= 1) { m.fly = null; m.sq = 0.22; puff(m.x, m.y + m.r, 6); if (A.ctx) A.noise({ filter: 'lowpass', freq: 600, dur: 0.1, vol: 0.1 }); } }
          m.sq *= Math.exp(-dtw * 8);
        }
      }

      /* ---------------- camera ---------------- */
      function camTarget() {
        if (st.camMode === 'summit') { const f = flakeWorld(); return { x: M.vcx, y: f.y - 20, z: 1 }; }
        if (st.camMode === 'meadow') return { x: M.manX, y: M.meadowY - 46, z: M.zoom };
        if (st.camMode === 'final') return { x: M.manX, y: M.meadowY - 56, z: M.zoom * 0.94 };
        const ahead = st.phase === 'place' || B.mode === 'rest' ? 26 : 10;
        return { x: M.vcx, y: B.y + ahead, z: 1 };
      }
      function stepCam(dt) {
        const t = camTarget();
        const k = st.camSnap ? 1 : 1 - Math.exp(-dt * (st.camMode === 'follow' && st.phase === 'spiral' ? 5 : 3.4)), kz = st.camSnap ? 1 : 1 - Math.exp(-dt * 1.6);
        st.camSnap = false;
        cam.x += (t.x - cam.x) * k; cam.y += (t.y - cam.y) * k; cam.z += (t.z - cam.z) * kz;
        const maxY = M.worldH - (M.h - M.vcy) / cam.z;
        if (cam.y > maxY) cam.y = maxY;
        st.shake = Math.max(0, st.shake - dt * 30);
      }
      function camProgress() { const y0 = flakeWorld().y - 20, y1 = M.meadowY - 40; return clamp((cam.y - y0) / Math.max(1, y1 - y0), 0, 1); }

      /* ---------------- drawing ---------------- */
      const FLAKES = []; for (let i = 0; i < 120; i++) FLAKES.push({ x: Math.random(), y: Math.random(), z: i < 70 ? 0 : i < 106 ? 1 : 2, ph: Math.random() * TAU, sp: 0.7 + Math.random() * 0.6 });
      function drawSnow(g, dtw, t) {
        const W = M.w, H = M.h, storm = st.storm, n = Math.round(lerp(40, 120, storm) * (Q.level < 1 ? 0.6 : 1)), wind = 12 + 90 * storm;
        const SPD = [22, 46, 95], SZ = [1.3, 2.2, 3.4], AL = [0.55, 0.8, 0.6];
        for (let z = 0; z < 3; z++) {
          g.fillStyle = 'rgba(255,255,255,' + AL[z] + ')'; g.beginPath();
          for (let i = 0; i < n; i++) {
            const f = FLAKES[i]; if (f.z !== z) continue;
            f.x += ((wind * (0.4 + 0.4 * z) + Math.sin(t * f.sp + f.ph) * 10) * dtw) / W; f.y += (SPD[z] * f.sp * (1 + storm * 0.6) * dtw) / H;
            if (f.y > 1.02) { f.y -= 1.04; f.x = Math.random(); } if (f.x > 1.02) f.x -= 1.04; if (f.x < -0.02) f.x += 1.04;
            const x = f.x * W, y = f.y * H, s = SZ[z];
            if (z < 2) g.rect(x, y, s, s); else { g.moveTo(x + s, y); g.arc(x, y, s, 0, TAU); }
          }
          g.fill();
        }
      }
      function drawBarrier(g, bar, t) {
        const ld = M.ledges[bar.li], p = ledgePt(ld, bar.s), hgt = barHeight();
        const dropY = -bar.drop * 70;
        g.save(); g.translate(p.x, p.y + dropY); g.rotate(bar.ang + bar.wob * 0.06);
        if (bar.flat) g.scale(1 + 0.08 * bar.flat, 1 - 0.84 * bar.flat);
        if (bar.kind === 'fence') drawFence(g, hgt, bar.clean, t); else drawLog(g, logR(), bar.clean);
        g.restore();
      }
      function drawFence(g, hgt, glow, t) {
        const w = hgt * 0.8, pw = w * 0.2, wood = '#a5713f', dark = '#5b391d', light = '#d39a5e';
        g.fillStyle = rgba(pal().deep, 0.3); g.beginPath(); g.ellipse(2, 1, w * 0.62, 3.5, 0, 0, TAU); g.fill();
        if (glow) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 + 0.15 * Math.sin(t * 4); g.drawImage(K.glowSprite('#fff1a8'), -w, -hgt * 1.15, w * 2, hgt * 1.3); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        [-w * 0.36, 0, w * 0.36].forEach((x, i) => {
          const ph = i === 1 ? hgt : hgt * 0.88;
          g.fillStyle = wood; g.strokeStyle = dark; g.lineWidth = 1.4;
          g.beginPath(); g.moveTo(x - pw / 2, 2); g.lineTo(x - pw / 2, -ph + pw * 0.7); g.lineTo(x, -ph); g.lineTo(x + pw / 2, -ph + pw * 0.7); g.lineTo(x + pw / 2, 2); g.closePath(); g.fill(); g.stroke();
          g.fillStyle = light; g.fillRect(x - pw / 2 + 1.5, -ph + pw, 1.6, ph - pw - 1);
          g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x, -ph + 1.5, pw * 0.62, 2.6, 0, 0, TAU); g.fill();
        });
        [-hgt * 0.62, -hgt * 0.28].forEach(y => { g.fillStyle = wood; g.strokeStyle = dark; g.lineWidth = 1.4; g.beginPath(); g.rect(-w * 0.55, y - 3.5, w * 1.1, 7); g.fill(); g.stroke(); g.fillStyle = '#ffffff'; g.fillRect(-w * 0.5, y - 5.5, w, 2.2); });
        // the painted "?" plate
        g.fillStyle = '#fff6e2'; g.strokeStyle = dark; g.lineWidth = 1.2; const sw = w * 0.42, sh = hgt * 0.26;
        g.beginPath(); g.rect(-sw / 2, -hgt * 0.62 - sh * 0.5 + 9, sw, sh); g.fill(); g.stroke();
        g.fillStyle = '#6248b4'; g.font = '800 ' + Math.round(sh * 0.8) + 'px ' + 'system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, -hgt * 0.62 + 9 + 1);
      }
      function drawLog(g, r, glow) {
        g.fillStyle = rgba(pal().deep, 0.3); g.beginPath(); g.ellipse(4, 1, r * 1.5, 3.2, 0, 0, TAU); g.fill();
        if (glow) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45; g.drawImage(K.glowSprite('#fff1a8'), -r * 2.6, -r * 3.4, r * 5.2, r * 5.2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        const bx = r * 0.55, by = -r * 0.55;
        g.fillStyle = '#7a4c2a'; g.strokeStyle = '#4b2e17'; g.lineWidth = 1.4;
        g.beginPath(); g.arc(bx, by - r, r, 0, TAU); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(0, -2 * r); g.lineTo(bx, by - 2 * r); g.lineTo(bx, by); g.lineTo(0, 0); g.closePath(); g.fill();
        g.fillStyle = '#e6bb83'; g.beginPath(); g.arc(0, -r, r, 0, TAU); g.fill(); g.stroke();
        g.strokeStyle = '#b07c46'; g.lineWidth = 1.1; [0.66, 0.36].forEach(k => { g.beginPath(); g.arc(0, -r, r * k, 0, TAU); g.stroke(); });
        g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(bx * 0.5, -2 * r + 1, r * 0.9, 3.2, 0, 0, TAU); g.fill();
      }
      function drawGhost(g, t) {
        const k = st.round; if (k < 0 || k >= N) return;
        const ld = M.ledges[2 + k];
        if (st.phase === 'place' || st.dragging) {
          // the firm-snow sweet spot: packed and sparkly
          const p = ledgePt(ld, ld.sweet), hot = st.ghost ? st.ghost.prec : 0;
          g.save(); g.translate(p.x, p.y - 2); g.rotate(Math.atan2(ld.ye - ld.ys, ld.xe - ld.xs) * (ld.tx < 0 ? 1 : 1));
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 + 0.25 * st.beat + 0.4 * hot;
          g.drawImage(K.glowSprite('#ffe9a0'), -34, -16, 68, 26); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
          g.strokeStyle = 'rgba(224,162,27,' + (0.5 + 0.4 * hot).toFixed(2) + ')'; g.setLineDash([4, 4]); g.lineWidth = 1.6; g.beginPath(); g.ellipse(0, 0, 22, 5.5, 0, 0, TAU); g.stroke(); g.setLineDash([]);
          g.restore();
          if (Math.random() < 0.12) P.emit('star', p.x + (Math.random() - 0.5) * 36, p.y - 4, 1, { colors: ['#fff3b0', '#ffffff'], speed: [8, 24] });
        }
        if (st.ghost && st.dragging) {
          const gp = ledgePt(ld, st.ghost.s);
          g.save(); g.translate(gp.x, gp.y); g.globalAlpha = 0.62;
          if (st.ghost.kind === 'fence') drawFence(g, barHeight(), st.ghost.prec >= CLEAN, t); else drawLog(g, logR(), st.ghost.prec >= CLEAN);
          g.restore(); g.globalAlpha = 1;
        }
      }
      function drawFrags(g) {
        for (const f of FR) {
          const k = clamp(1 - (f.age - f.life + 0.35) / 0.35, 0, 1);
          g.save(); g.translate(f.x, f.y); g.rotate(f.rot); g.globalAlpha = k;
          g.beginPath(); f.pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath();
          g.fillStyle = f.col; g.fill(); g.strokeStyle = f.seam; g.lineWidth = 1; g.stroke();
          g.restore();
        }
        g.globalAlpha = 1;
      }
      function drawFlakeOnSummit(g, t) {
        if (!(st.phase === 'intro' || st.phase === 'summit' || st.phase === 'fact')) return;
        const f = flakeWorld(), bob = Math.sin(t * 2) * 2, s = (M.phone ? 15 : 19) * (1 + 0.25 * (st.flakePop || 0));
        g.save(); g.translate(f.x, f.y + bob - 4);
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6 + 0.3 * Math.sin(t * 3); g.drawImage(K.glowSprite('#cfe9ff'), -s * 3.2, -s * 3.2, s * 6.4, s * 6.4); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        if (st.phase === 'summit') { const k = (t * 0.8) % 1; g.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - k)).toFixed(2) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, s * (1.1 + k * 1.4), 0, TAU); g.stroke(); }
        g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(0, 0, s * 0.42, 0, TAU); g.fill();
        drawFlakeGlyph(g, s, t * 0.4, 1);
        g.restore();
        st.flakePop = Math.max(0, (st.flakePop || 0) - 0.02);
      }
      function drawSnowman(g, t) {
        const placed = minis.filter(m => m.placed);
        const bob = st.phase === 'finale' && !reduced() ? barBounce() : 0;
        const sy = 1 - 0.05 * bob;
        const base = stackPos(0), gy = M.meadowY;
        const yOf = (m) => gy - (gy - m.y) * sy;
        // arms behind the body
        if (st.deco && placed.length === 3) {
          const body = minis[1], by = yOf(body), arm = st.deco.arms;
          if (arm > 0) {
            g.strokeStyle = '#5b3a1e'; g.lineWidth = Math.max(1.4, body.r * 0.14); g.lineCap = 'round';
            [-1, 1].forEach(sd => {
              const ax = body.x + sd * body.r * 0.8, ay = by - body.r * 0.1, ex = ax + sd * body.r * 1.25 * arm, ey = ay - body.r * (0.55 + 0.25 * Math.sin(t * 3 + sd)) * arm;
              g.beginPath(); g.moveTo(ax, ay); g.lineTo(ex, ey); g.moveTo(lerp(ax, ex, 0.7), lerp(ay, ey, 0.7)); g.lineTo(lerp(ax, ex, 0.7) + sd * body.r * 0.28 * arm, lerp(ay, ey, 0.7) - body.r * 0.36 * arm); g.stroke();
            });
            g.lineCap = 'butt';
          }
        }
        if (placed.length) shadowAt(g, base.x, M.meadowY, M.partR[0] * 1.2, 1);
        for (const m of minis) {
          if (!m.vis) continue;
          if (!m.placed) { shadowAt(g, m.x, M.meadowY, m.r, clamp(1 - (M.meadowY - m.y - m.r) / 60, 0.2, 1)); drawPlainBall(g, m.x, m.y, m.r, m.a, { sy: 1 - m.sq, glow: st.phase === 'build' && st.buildIdx === m.i ? 0.25 + 0.2 * Math.sin(t * 5) : 0 }); }
        }
        for (const m of placed) drawPlainBall(g, m.x, yOf(m), m.r, 0, { sy: (1 - m.sq) * sy });
        if (!st.deco || placed.length < 3) return;
        const d = st.deco, head = minis[2], body = minis[1], hx = head.x, hy = yOf(head), hr = head.r;
        // buttons
        for (let i = 0; i < 3; i++) { if (d.buttons * 3 <= i) break; g.fillStyle = '#2a2a33'; g.beginPath(); g.arc(body.x, yOf(body) - body.r * 0.45 + i * body.r * 0.42, Math.max(1.1, body.r * 0.1), 0, TAU); g.fill(); }
        // scarf at the neck, with a tail that swings
        if (st.scarf > 0) {
          const sc = st.scarf, nY = hy + hr * 0.82, col = MT.scarf, dk = mixHex(col, '#000000', 0.25);
          g.fillStyle = col; g.beginPath(); g.ellipse(hx, nY, hr * 1.02 * sc + 1, hr * 0.32, 0, 0, TAU); g.fill();
          g.fillStyle = dk; g.fillRect(hx - hr * 0.9 * sc, nY - 0.6, hr * 1.8 * sc, 1.2);
          const sw = Math.sin(t * 2.2) * 0.12;
          g.save(); g.translate(hx + hr * 0.45, nY + 1); g.rotate(0.18 + sw);
          g.fillStyle = col; g.fillRect(-hr * 0.22, 0, hr * 0.44, hr * 1.25 * sc);
          g.fillStyle = dk; g.fillRect(-hr * 0.22, hr * 0.45 * sc, hr * 0.44, hr * 0.12); g.fillRect(-hr * 0.22, hr * 0.8 * sc, hr * 0.44, hr * 0.12);
          g.strokeStyle = col; g.lineWidth = 0.9; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-hr * 0.18 + i * hr * 0.12, hr * 1.25 * sc); g.lineTo(-hr * 0.18 + i * hr * 0.12, hr * 1.25 * sc + hr * 0.25); g.stroke(); }
          g.restore();
        }
        // face
        if (d.eyes > 0) { g.fillStyle = '#23232b'; [-1, 1].forEach(sd => { g.beginPath(); g.arc(hx + sd * hr * 0.34, hy - hr * 0.18, Math.max(0.9, hr * 0.12 * d.eyes), 0, TAU); g.fill(); }); g.fillStyle = '#ffffff'; [-1, 1].forEach(sd => g.fillRect(hx + sd * hr * 0.34 - hr * 0.05, hy - hr * 0.24, Math.max(0.6, hr * 0.06), Math.max(0.6, hr * 0.06))); }
        if (d.nose > 0) { g.fillStyle = '#f08a24'; g.beginPath(); g.moveTo(hx, hy - hr * 0.06); g.lineTo(hx + hr * 0.95 * d.nose, hy + hr * 0.06); g.lineTo(hx, hy + hr * 0.12); g.closePath(); g.fill(); g.strokeStyle = 'rgba(160,80,10,0.6)'; g.lineWidth = 0.6; g.stroke(); }
        if (d.smile > 0) { g.fillStyle = '#23232b'; for (let i = 0; i < 5; i++) { if (d.smile * 5 <= i) break; const a = Math.PI * (0.22 + i * 0.14); g.beginPath(); g.arc(hx + Math.cos(a) * hr * 0.48, hy + Math.sin(a) * hr * 0.42 - hr * 0.02, Math.max(0.6, hr * 0.065), 0, TAU); g.fill(); } }
        if (st.hat) drawOutfit(g, OUTFIT.key, hx, hy - st.hat.y * hr, hr, t);
      }
      function barBounce() {
        const vt = A.ctx ? A.now() - A.latency() : now() / 1000;
        const k = clamp((vt - st.barT) / (3 * 60 / Math.max(60, MZ.bpm)), 0, 1);
        return Math.max(0, Math.sin(Math.min(1, k * 3) * Math.PI)) * (1 - k);
      }
      function drawOutfit(g, key, x, y, r, t) {
        const top = y - r * 0.82, acc = MT.scarf;
        g.save();
        if (key === 'bobble') { g.fillStyle = acc; g.beginPath(); g.ellipse(x, top + r * 0.12, r * 0.92, r * 0.62, 0, Math.PI, TAU); g.fill(); g.fillStyle = '#ffffff'; g.fillRect(x - r * 0.95, top + r * 0.02, r * 1.9, r * 0.26); g.beginPath(); g.arc(x, top - r * 0.6, r * 0.28, 0, TAU); g.fill(); }
        else if (key === 'tophat') { g.fillStyle = '#22222c'; g.fillRect(x - r * 0.95, top + r * 0.02, r * 1.9, r * 0.2); g.fillRect(x - r * 0.6, top - r * 1.05, r * 1.2, r * 1.1); g.fillStyle = acc; g.fillRect(x - r * 0.6, top - r * 0.25, r * 1.2, r * 0.22); }
        else if (key === 'earmuffs') { g.strokeStyle = '#3b3b48'; g.lineWidth = r * 0.16; g.beginPath(); g.arc(x, y - r * 0.05, r * 1.0, Math.PI * 1.08, Math.PI * 1.92); g.stroke(); g.fillStyle = acc; [-1, 1].forEach(sd => { g.beginPath(); g.ellipse(x + sd * r * 0.98, y - r * 0.05, r * 0.3, r * 0.38, 0, 0, TAU); g.fill(); }); }
        else if (key === 'crown') { g.fillStyle = '#ffd34d'; g.beginPath(); g.moveTo(x - r * 0.8, top + r * 0.2); g.lineTo(x - r * 0.8, top - r * 0.4); g.lineTo(x - r * 0.4, top - r * 0.05); g.lineTo(x, top - r * 0.6); g.lineTo(x + r * 0.4, top - r * 0.05); g.lineTo(x + r * 0.8, top - r * 0.4); g.lineTo(x + r * 0.8, top + r * 0.2); g.closePath(); g.fill(); g.fillStyle = acc; g.beginPath(); g.arc(x, top - r * 0.05, r * 0.12, 0, TAU); g.fill(); }
        else if (key === 'beanie') { g.fillStyle = acc; g.beginPath(); g.ellipse(x, top + r * 0.15, r * 0.9, r * 0.72, 0, Math.PI, TAU); g.fill(); g.fillStyle = '#ffffff'; for (let i = 0; i < 2; i++) g.fillRect(x - r * 0.8 + i * 0.06 * r, top - r * 0.12 - i * r * 0.26, r * 1.6 - i * 0.12 * r, r * 0.1); g.fillStyle = mixHex(acc, '#000000', 0.2); g.fillRect(x - r * 0.95, top + r * 0.02, r * 1.9, r * 0.24); }
        else if (key === 'flowers') { const cols = ['#ff7aa8', '#ffd34d', '#ffffff', '#8fd3ff', '#ff9a5a']; for (let i = 0; i < 5; i++) { const a = Math.PI * (1.12 + i * 0.19), fx = x + Math.cos(a) * r * 0.95, fy = y - r * 0.05 + Math.sin(a) * r * 0.95; g.fillStyle = cols[i]; for (let p = 0; p < 5; p++) { g.beginPath(); g.arc(fx + Math.cos(p / 5 * TAU) * r * 0.13, fy + Math.sin(p / 5 * TAU) * r * 0.13, r * 0.1, 0, TAU); g.fill(); } g.fillStyle = '#f0b429'; g.beginPath(); g.arc(fx, fy, r * 0.07, 0, TAU); g.fill(); } }
        else if (key === 'chef') { g.fillStyle = '#ffffff'; g.strokeStyle = '#c9cfdc'; g.lineWidth = 1; g.fillRect(x - r * 0.62, top - r * 0.15, r * 1.24, r * 0.38); g.beginPath(); g.arc(x - r * 0.38, top - r * 0.42, r * 0.38, 0, TAU); g.arc(x + r * 0.38, top - r * 0.42, r * 0.38, 0, TAU); g.arc(x, top - r * 0.7, r * 0.44, 0, TAU); g.fill(); g.stroke(); }
        else { g.strokeStyle = '#8a5a33'; g.lineWidth = r * 0.14; g.lineCap = 'round'; [-1, 1].forEach(sd => { g.beginPath(); g.moveTo(x + sd * r * 0.45, top + r * 0.1); g.lineTo(x + sd * r * 0.75, top - r * 0.7); g.moveTo(x + sd * r * 0.62, top - r * 0.35); g.lineTo(x + sd * r * 1.0, top - r * 0.48); g.stroke(); }); }
        g.restore(); void t;
      }
      function drawSun(g, t) {
        const W = M.w, H = M.h, k = st.sun, sx = W * 0.76, sy = H * (0.3 - 0.1 * k), s = Math.min(W, H) * (0.36 + 0.14 * k);
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = 0.22 * k; g.save(); g.translate(sx, sy); g.rotate(t * 0.05); g.drawImage(SPR.rays, -s * 1.6, -s * 1.6, s * 3.2, s * 3.2); g.restore();
        g.globalAlpha = k; g.drawImage(SPR.sun, sx - s * 0.5, sy - s * 0.5, s, s);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      function villageLights(g, t, p) {
        if (!BG.village.length) return;
        const dark = S.scene() === 'dark', a = dark ? 0.85 : st.sun * 0.5; if (a < 0.03) return;
        g.fillStyle = '#ffd36b';
        for (const v of BG.village) { const tw = 0.6 + 0.4 * Math.sin(t * 2 + v[2]); g.globalAlpha = a * tw; g.fillRect(v[0] - 1, v[1] - p * BG.farT - 1, 2, 2); }
        g.globalAlpha = 1;
      }
      function drawGlints(g, t) {
        const vy0 = cam.y - M.vcy / cam.z - 10, vy1 = cam.y + (M.h - M.vcy) / cam.z + 10;
        g.globalCompositeOperation = 'lighter';
        const boost = 0.55 + 0.45 * st.sun + 0.3 * st.beat;
        for (const gl of WORLD.glints) {
          if (gl.y < vy0 || gl.y > vy1) continue;
          const k = Math.pow(Math.max(0, Math.sin(t * gl.sp * 1.6 + gl.ph)), 10); if (k < 0.05) continue;
          const s = (7 + 9 * k) * (1 + st.sun * 0.5); g.globalAlpha = k * boost; g.drawImage(SPR.glint, gl.x - s / 2, gl.y - s / 2, s, s);
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      const BACK = { c: null, key: '' }, OVER = { c: null, key: '' };
      function backdrop(p) {
        const W = M.w, H = M.h, sky = skyMix(), fy = Math.round(-p * BG.farT), my = Math.round(-p * BG.midT);
        const key = W + 'x' + H + ':' + SKY.key + ':' + SKY.q + ':' + fy + ':' + my + ':' + Q.level;
        if (BACK.key === key) return BACK.c;
        if (!BACK.c || BACK.c.width !== W || BACK.c.height !== H) BACK.c = mk(W, H);
        const g = BACK.c.getContext('2d', { alpha: false });
        g.globalAlpha = 1; g.drawImage(sky, 0, 0); g.drawImage(BG.far, 0, fy); if (Q.level >= 1) g.drawImage(BG.mid, 0, my);
        BACK.key = key; return BACK.c;
      }
      function overlay() {
        const W = M.w, H = M.h, qs = Math.round(st.storm * 20), qn = Math.round(st.sun * 10);
        const key = W + 'x' + H + ':' + S.scene() + ':' + qs + ':' + qn;
        if (OVER.key === key) return OVER.c;
        if (!OVER.c || OVER.c.width !== W || OVER.c.height !== H) OVER.c = mk(W, H);
        const g = OVER.c.getContext('2d'); g.clearRect(0, 0, W, H);
        if (qs) { g.globalAlpha = qs / 20 * 0.32; g.drawImage(SPR.haze, 0, 0); }
        g.globalAlpha = clamp(0.42 + 0.3 * qs / 20 - 0.22 * qn / 10, 0, 1); g.drawImage(SPR.vig, 0, 0); g.globalAlpha = 1;
        OVER.key = key; return OVER.c;
      }
      function draw(g, t, dtw) {
        const W = M.w, H = M.h, dpr = cv.dpr || 1;
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        ensureBG();
        const p = camProgress();
        g.drawImage(backdrop(p), 0, 0, W, H);
        if (st.sun > 0.01) drawSun(g, t);
        villageLights(g, t, p);
        ensureWorld();
        const shx = st.shake ? (Math.random() - 0.5) * st.shake : 0, shy = st.shake ? (Math.random() - 0.5) * st.shake : 0;
        g.save(); g.translate(M.vcx + shx, M.vcy + shy); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);
        // the visible slice of the painted mountain
        const x0 = Math.max(0, cam.x - M.vcx / cam.z), y0 = Math.max(0, cam.y - M.vcy / cam.z), x1 = Math.min(M.w, cam.x + (W - M.vcx) / cam.z), y1 = Math.min(M.worldH, cam.y + (H - M.vcy) / cam.z);
        if (x1 > x0 && y1 > y0) g.drawImage(WORLD.c, x0 * dpr, y0 * dpr, (x1 - x0) * dpr, (y1 - y0) * dpr, x0, y0, x1 - x0, y1 - y0);
        drawGhost(g, t);
        BARS.forEach(b => drawBarrier(g, b, t));
        drawFlakeOnSummit(g, t);
        if (B.mode !== 'hidden') {
          const ld = curLedge(), onGround = B.mode !== 'fall' && B.mode !== 'meadow' && B.mode !== 'mroll';
          if (onGround && ld) { const c = ledgePt(ld, B.s); shadowAt(g, c.x, c.y, B.r, 1 - B.hopY / 60); }
          else if (B.mode === 'meadow' || B.mode === 'mroll') shadowAt(g, B.x, M.meadowY, B.r, 1);
          const contact = ld ? Math.atan2(-ld.ny, -ld.nx) : Math.PI / 2;
          const rest = B.mode === 'rest' || B.mode === 'meadow' ? Math.sin(barPhase() * TAU) * 0.05 : 0;
          drawBall(g, B.x, B.y, B.r, B.a + rest, B.layers, { sq: B.sq, sqA: B.sqA, wrap: B.wrap, contact, dir: ld ? Math.sign(ld.tx) : 1, coreGlow: st.phase === 'split' ? 0.6 + 0.4 * Math.sin(t * 5) : 0 });
        }
        drawFrags(g);
        drawSnowman(g, t);
        P.draw(g);
        drawGlints(g, t);
        if (st.flash > 0.02) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = st.flash * 0.8; const fs = 60 + (1 - st.flash) * 120; g.drawImage(K.glowSprite('#ffffff'), st.flashX - fs / 2, st.flashY - fs / 2, fs, fs); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        g.restore();
        g.drawImage(overlay(), 0, 0, W, H);
        drawSnow(g, dtw, t);
        if (st.sun > 0.01) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = st.sun * 0.5; g.drawImage(SPR.warm, 0, 0, W, H); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      }
      function barPhase() {
        const vt = A.ctx ? A.now() - A.latency() : now() / 1000;
        if (!A.ctx) return (vt * MZ.bpm / 60 / 3) % 1;
        return clamp((vt - st.barT) / (3 * 60 / Math.max(60, MZ.bpm)), 0, 1);
      }

      /* ---------------- the frame loop ---------------- */
      cv.onResize(() => { layout(); });
      S.on('theme', () => { WORLD.key = ''; BG.key = ''; SKY.key = ''; SPR.key = ''; BACK.key = ''; OVER.key = ''; });
      let rumLvl = 0, lastBob = -1, lastT = 0;
      K.loop((dt0, t) => {
        const g = cv.g; if (!g || !M.w) return;
        const dt = lastT ? clamp(t - lastT, 0.001, 0.5) : 0.016; lastT = t;
        Q.acc += dt; Q.n++;
        if (Q.acc > 1.5) { if (Q.acc / Q.n > 0.03 && Q.steps < 3) { Q.steps++; Q.level = Math.max(0, Q.level - 1); if (Q.steps === 3 && cv.setQuality) cv.setQuality(0.75); } Q.acc = 0; Q.n = 0; }
        ensureSprites();
        st.ts += (st.tsT - st.ts) * Math.min(1, dt * 10);
        let dtw = dt * st.ts;
        if (st.hitstop > 0) { st.hitstop -= dt; dtw = 0; }
        st.wt += dtw;
        stepTweens();
        const vt = A.ctx ? A.now() - A.latency() : 0;
        while (MZ.pulses.length && MZ.pulses[0].t <= vt) { const pl = MZ.pulses.shift(); st.beat = 1; if (pl.b === 0) { st.barT = pl.t; } }
        st.beat = Math.max(0, st.beat - dt * 3.2);
        const bob = st.trayOn ? Math.round(Math.max(0, st.beat) * 10) / 10 : 0; if (bob !== lastBob) { lastBob = bob; tray.style.setProperty('--bob', bob.toFixed(1)); }
        for (let rem = dtw; rem > 1e-5; rem -= 1 / 60) {
          const hs = Math.min(rem, 1 / 60); stepBall(hs);
          for (const b of BARS) { b.wobV += (-b.wob * 60 - b.wobV * 6) * hs; b.wob += b.wobV * hs; }
        }
        stepFrags(dtw); stepMinis(dtw);
        P.update(dtw);
        stepCam(dt);
        st.storm += (st.stormT - st.storm) * Math.min(1, dt * 1.1);
        st.sun += (st.sunT - st.sun) * Math.min(1, dt * 0.8);
        st.flash = Math.max(0, st.flash - dt * 4);
        if (wind) { wind.level(0.03 + 0.11 * st.storm, 0.4); wind.freq(420 + 260 * Math.sin(t * 0.37) + 300 * st.storm, 0.4); }
        const rolling = B.mode === 'roll' || B.mode === 'mroll';
        const want = rolling ? Math.min(0.2, B.v * B.r * 0.0000085 + 0.01) : 0.0001;
        rumLvl += (want - rumLvl) * Math.min(1, dt * 8); if (rumble) { rumble.level(Math.max(0.0001, rumLvl), 0.06); rumble.freq(140 + B.v * 0.5, 0.1); }
        const pt0 = performance.now();
        draw(g, t, dtw);
        placeDom();
        if (ctx.TS.isDev && ctx.TS.isDev()) { const pr = el.__prof || (el.__prof = { n: 0, ms: 0, max: 0 }); const d = performance.now() - pt0; pr.n++; pr.ms += d; pr.max = Math.max(pr.max, d); pr.avg = +(pr.ms / pr.n).toFixed(2); }
      });

      /* ---------------- the flow ---------------- */
      async function spiral() {
        st.phase = 'spiral'; st.camMode = 'follow'; mark('spiral'); K.guide(null); MZ.layer = 1;
        hideTag();
        say(loopie, L(LINES.andThen), { mood: 'worried', ms: 3800 });
        B.mode = 'form'; B.li = 0; B.s = 6; B.layers = []; B.r = 2;
        await tween(reduced() ? 160 : 460, k => { B.r = lerp(2, M.rCore, ease.outBack(k)); placeOnLedge(); });
        B.r = M.rCore;
        const d0 = M.ledges[0].L - B.s, d1 = M.ledges[1].L;
        B.wrapAt = layerDefs.map((_, k) => (d0 + d1 * 0.82) * (0.08 + 0.86 * k / Math.max(1, N - 0.3)));
        B.wrapIdx = 0; B.dist = 0;
        B.mode = 'roll'; B.v = 40; B.vmin = 36; B.fr = 0.1; B.vmax = M.phone ? 172 : 230;
        await waitFor('rest');
      }
      async function round(k) {
        st.round = k; st.phase = 'rest';
        const outer = B.layers[B.layers.length - 1];
        await untilT(st.answerUntil);
        if (outer) showTag(outer.def.user ? 'And then…' : 'The spiral adds…', outer.def.text, outer.def.user ? '' : 'gen');
        hideAnswer(); st.phase = 'place'; showTray(); mark('place');
        if (k === 0) say(still, L(LINES.spiralEnd), { mood: serious ? 'think' : 'determined', moodMs: 4000, ms: 5600 });
        await K.wait(reduced() ? 250 : 650);
        if (st.phase === 'place') placeGuide();
        await waitFor('plant');
        hideTag();
        await K.wait(reduced() ? 240 : 520);
        const half = Math.ceil(N / 2);
        if (k === half && N > 2) say(loopie, L(LINES.half), { mood: care ? 'calm' : 'confused', ms: 2400 });
        else say(loopie, L(LINES.release[k % 2]), { mood: 'worried', ms: 1800 });
        B.mode = 'roll'; B.v = 34; B.vmin = 26; B.fr = 0.18; B.vmax = M.phone ? 260 : 330;
        await waitFor('rest');
      }
      async function meadowSplit() {
        st.phase = 'meadow'; st.camMode = 'meadow';
        MZ.maj = 1; MZ.target = 90; MZ.layer = 2; st.stormT = 0.05;
        await untilT(st.answerUntil);
        hideAnswer();
        await K.wait(reduced() ? 200 : 500);
        say(still, L(LINES.meadow), { mood: 'happy', ms: 4400 });
        st.phase = 'split'; hitBall.hidden = false; mark('split');
        K.guide({ id: 'split', g: 'sweep', target: () => toScreen(B.x, B.y), d: Math.max(36, Math.round(B.r * cam.z * 1.5)), label: 'SWIPE TO SPLIT IT', delay: 900 });
        await waitFor('split');
      }
      async function build() {
        say(loopie, L(LINES.loopieBuild), { mood: 'happy', ms: 3000 });
        for (let j = 0; j < 3; j++) {
          st.phase = 'build'; st.buildIdx = j;
          minis.forEach(m => { m.el.hidden = m.placed; m.tag.classList.toggle('next', m.i === j); });
          await K.wait(reduced() ? 120 : 280);
          buildGuide(j);
          await waitFor('built');
          const pt = PARTS[j];
          showAnswer(pt.label, [{ t: pt.text, user: pt.user }]);
          say(still, L(LINES.build[j]), { mood: 'happy', ms: 3000 });
          await K.wait(j < 2 ? (reduced() ? 700 : 1500) : 1200);
        }
        st.phase = 'built';
      }
      async function finale() {
        st.phase = 'finale'; st.camMode = 'final'; mark('finale'); K.guide(null);
        MZ.layer = 3; MZ.maj = 1; MZ.target = 96;
        minis.forEach(m => { m.el.hidden = true; m.tag.hidden = true; });
        say(loopie, L(LINES.face), { mood: 'celebrate', ms: 2600 });
        st.deco = { eyes: 0, nose: 0, smile: 0, buttons: 0, arms: 0 };
        const stepD = reduced() ? 120 : 260;
        await tween(stepD, q => { st.deco.eyes = q; }, ease.outBack); sBoop(880);
        await tween(stepD, q => { st.deco.nose = q; }, ease.outBack); sBoop(660);
        await tween(stepD * 1.4, q => { st.deco.smile = q; }); sBoop(990);
        await tween(stepD, q => { st.deco.buttons = q; }); if (A.ctx) A.click({ vol: 0.1 });
        tween(stepD * 1.4, q => { st.deco.arms = q; }, ease.outBack); K.sfx.whoosh();
        await K.wait(stepD);
        // the hat drops in from today's wardrobe
        st.hat = { y: 5 }; const col = K.collect(OUTFIT.name); st.col = col;
        await tween(reduced() ? 200 : 620, q => { st.hat.y = 5 * (1 - ease.outCubic(q)) + (q > 0.7 ? Math.sin((q - 0.7) / 0.3 * Math.PI) * 0.25 : 0); });
        st.hat.y = 0; if (A.ctx) { A.boing({ freq: 520, vol: 0.12 }); A.chime(A.note('A5'), { vol: 0.08, dur: 1.4 }); }
        const hp = headPos(); P.emit('star', hp.x, hp.y - M.partR[2], 10, { colors: ['#fff3b0', '#ffffff'], speed: [30, 90] });
        pill.textContent = (col.isNew ? 'New hat: ' : 'Hat: ') + OUTFIT.name + ' · ' + Math.min(col.count, OUTFITS.length) + '/' + OUTFITS.length; pill.hidden = false; st.pillW = 0;
        // the scarf, knitted with the fair thought
        tween(reduced() ? 200 : 700, q => { st.scarf = q; }, ease.outBack); K.sfx.whoosh(); if (A.ctx) A.paper({ vol: 0.12 });
        scarfEl.replaceChildren(h('small', { text: 'Knitted into the scarf' }), h('p', { class: noText ? '' : 'gk-user', text: fair }));
        hideAnswer(); scarfEl.classList.remove('off');
        // sunshine over the valley
        st.stormT = 0; st.sunT = 1;
        const dawn = K.ambience('dawn'); dawn.level(0.5, 2);
        if (A.ctx) ['D5', 'F#5', 'A5', 'D6', 'F#6', 'A6'].forEach((n, i) => A.chime(A.note(n), { when: A.now() + 0.3 + i * 0.12, vol: 0.05, dur: 2 }));
        K.finale('stars', { z: 3, colors: ['#ffffff', '#fff3c4', '#d8ecff'], chord: ['D4', 'F#4', 'A4', 'D5'], ms: 4800 });
        await K.wait(reduced() ? 1200 : 2600);
        say(loopie, L(LINES.loopieEnd), { mood: care ? 'happy' : 'laugh', ms: 2600 });
        await K.wait(reduced() ? 1200 : 2800);
        say(still, L(LINES.end), { mood: 'happy', ms: 0 });
        loopie.base(care || serious ? 'happy' : 'celebrate');
        await K.wait(reduced() ? 1600 : 3200);
        finishGame();
      }
      function finishGame() {
        if (st.finished) return; st.finished = true; mark('finish');
        const avg = st.precs.length ? st.precs.reduce((a, b) => a + b, 0) / st.precs.length : 0.6;
        const pct = Math.round(avg * 100), cleanN = st.precs.filter(p => p >= CLEAN).length;
        const best = K.best('aim', pct, 'higher'), tier = K.tier(avg, [0.45, 0.68, 0.86]), col = st.col || K.collect(OUTFIT.name);
        const badges = [];
        if (best.isNew) badges.push('New best: ' + pct + '% steady aim'); else if (best.first) badges.push('Steady aim: ' + pct + '%');
        if (tier) badges.push(tier + ' snow-stopper');
        if (col.isNew) badges.push('Collected: ' + OUTFIT.name + ' (' + Math.min(col.count, OUTFITS.length) + '/' + OUTFITS.length + ')');
        ctx.finish({
          title: serious ? 'Right-sized, with a plan' : 'From avalanche to snowman', mood: 'celebrate',
          lines: [N + ' questions asked, ' + N + ' layers knocked off', 'Built a snowman: what you know, one step, one question', cleanN + ' of ' + N + ' clean breaks on firm snow'],
          share: 'Stopped a worry snowball with ' + N + ' questions. Built a snowman.', badges: badges.slice(0, 4)
        });
      }

      (async () => {
        await K.intro({ title: 'Snowball', sub: 'A worry starts as one small fact. Then it rolls: and then… and then… Questions slow it down.', how: 'Drag question fences onto the slope. Knock off the layers. Build a snowman.', char: 'loopie', mood: 'worried' });
        st.phase = 'summit'; hitFlake.hidden = false; mark('summit');
        say(loopie, L(LINES.summit), { mood: 'worried', ms: 4600 });
        K.guide({ id: 'flake', g: 'tap', target: hitFlake, label: 'TAP THE SNOWFLAKE', delay: 900, place: 'below' });
        await waitFor('flake');
        await K.wait(reduced() ? 1600 : 2800);
        await spiral();
        for (let k = 0; k < N; k++) await round(k);
        await meadowSplit();
        await build();
        await finale();
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 30000)) await K.wait(80); };
          await until(() => st.phase === 'summit', 15000);
          await K.wait(600);
          await K.sim.tap(hitFlake);
          for (let k = 0; k < N; k++) {
            await until(() => st.phase === 'place' && st.trayOn && st.round === k, 40000);
            await K.wait(800);
            const c = cards.find(x => !x.used); if (!c) break;
            const cr = K.rectIn(c.el), sp = sweetScreen(k);
            await K.sim.drag(c.el, { x: cr.w / 2, y: cr.h / 2 }, { x: sp.x - cr.x + (k === 1 ? 14 : 0), y: sp.y + LIFT() - cr.y }, 900, 18);
            await K.wait(300);
            if (st.phase === 'place' && !c.used) plant(c, M.ledges[2 + k].sweet, 1);
          }
          await until(() => st.phase === 'split', 45000);
          await K.wait(700);
          const hr = K.rectIn(hitBall);
          await K.sim.drag(hitBall, { x: hr.w * 0.2, y: hr.h * 0.35 }, { x: hr.w * 0.8, y: hr.h * 0.65 }, 380, 10);
          for (let j = 0; j < 3; j++) {
            await until(() => st.phase === 'build' && st.buildIdx === j, 15000);
            await K.wait(600);
            const m = minis[j], mr = K.rectIn(m.el), tp = stackScreen(j);
            await K.sim.drag(m.el, { x: mr.w / 2, y: mr.h / 2 }, { x: tp.x - mr.x, y: tp.y - mr.y }, 700, 14);
            await until(() => m.placed, 3000);
            if (!m.placed) placePart(m);
          }
          await until(() => st.finished, 40000);
        }
      };
    }
  });
})(window.TSG_ENV);
