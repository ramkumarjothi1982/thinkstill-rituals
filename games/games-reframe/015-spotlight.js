/* 015 Spotlight — Reframe · REFRAME · Social / Team / Perspective
 * Mechanism: the spotlight effect (Gilovich, Medvec & Savitsky 2000): we overestimate how many people notice our slips,
 * because we sit at the centre of our own experience; seeing what others are actually attending to corrects the bias.
 * The player guesses how many of a pretend audience noticed, sweeps a followspot across the house to read what each person
 * is really thinking (mostly their own lives, a few kind noticers), finds everyone sitting under a spotlight of their own,
 * then pulls their own harsh light down to its real size. The study's real numbers are quoted honestly.
 * Verb: sweep (drag the followspot across the dark audience); set and pull a lighting fader; hold to take a bow.
 * Finale: curtain call: the harsh light softens into warm house lights, the audience rises row by row in a standing
 * ovation for being human, and roses arc onto the stage.
 */
(function (env) {
  'use strict';

  /* ---------------- the audience's minds: an album of 122 thoughts, new ones first on every visit ---------------- */
  // [id, pose, thought]. Poses: up (thinking), phone, snack, notes, hair, side, watch, drink, cold, sleep, yawn, warm
  const BUSY = [
    ['b01', 'up', 'Did I leave the oven on?'], ['b02', 'snack', 'I’m starving.'], ['b03', 'notes', 'My talk is next.'], ['b04', 'hair', 'Is my hair weird?'],
    ['b05', 'phone', 'What was the wifi password?'], ['b06', 'phone', 'I should text Mum back.'], ['b07', 'up', 'Spinach in my teeth? Since lunch?'],
    ['b08', 'cold', 'Why is it so cold in here?'], ['b09', 'up', 'Did I lock the back door?'], ['b10', 'snack', 'Is it rude to unwrap a mint now?'],
    ['b11', 'up', 'I left my umbrella on the train.'], ['b12', 'up', 'What rhymes with orange?'], ['b13', 'sleep', 'Five more minutes…'],
    ['b14', 'phone', 'Did I reply to that email?'], ['b15', 'up', 'Do dogs know they’re dogs?'], ['b16', 'notes', 'Note to self: buy milk.'],
    ['b17', 'snack', 'Was that my stomach?'], ['b18', 'watch', 'My parking runs out at three.'], ['b19', 'up', 'Why did I wear new shoes today?'],
    ['b20', 'snack', 'Still thinking about that sandwich.'], ['b21', 'up', 'Wait, is it Tuesday?'], ['b22', 'up', 'I really should water my plants.'],
    ['b23', 'side', 'Pretty sure I’m in the wrong seat.'], ['b24', 'up', 'Mentally redecorating my kitchen.'], ['b25', 'up', 'Who’s that actor from that thing?'],
    ['b26', 'side', 'My cat would hate this.'], ['b27', 'watch', 'I need the loo.'], ['b28', 'up', 'Still cringing about something from 2014.'],
    ['b29', 'up', 'What’s for dinner?'], ['b30', 'phone', 'Is that my phone buzzing?'], ['b31', 'notes', 'Rehearsing my own speech.'],
    ['b32', 'up', 'Nice ceiling, honestly.'], ['b33', 'up', 'What time is it in Tokyo?'], ['b34', 'up', 'Planning my whole weekend.'],
    ['b35', 'up', 'Song stuck in my head. Send help.'], ['b36', 'up', 'My nose itches. Must not scratch.'], ['b37', 'hair', 'Should I get a fringe?'],
    ['b38', 'phone', 'I need to cancel that subscription.'], ['b39', 'up', 'Wait. Was today bin night?'], ['b40', 'side', 'Love that person’s earrings.'],
    ['b41', 'drink', 'I should drink more water.'], ['b42', 'up', 'Did I pack my charger?'], ['b43', 'yawn', 'Holding in a yawn. Heroically.'],
    ['b44', 'up', 'Counting the ceiling lights.'], ['b45', 'up', 'What was that dream last night?'], ['b46', 'sleep', 'I could really go for a nap.'],
    ['b47', 'up', 'My knee just clicked.'], ['b48', 'phone', 'What did my boss mean by “noted”?'], ['b49', 'hair', 'Haircut on Friday? Maybe.'],
    ['b50', 'drink', 'This coffee is a hug.'], ['b51', 'up', 'Rehearsing an argument I’ll never have.'], ['b52', 'up', 'Doing my tax return in my head.'],
    ['b53', 'phone', 'Group chat’s on fire. Must not look.'], ['b54', 'snack', 'Saving these crisps for later. Later is now.'], ['b55', 'up', 'Is a hot dog a sandwich?'],
    ['b56', 'side', 'Whose perfume is that?'], ['b57', 'hair', 'Are my sunglasses still on my head?'], ['b58', 'up', 'Holiday in 41 days. Not that I’m counting.'],
    ['b59', 'notes', 'I wrote “pay rent” on my hand.'], ['b60', 'cold', 'Should’ve brought a cardigan.'], ['b61', 'up', 'Are pigeons just tired doves?'],
    ['b62', 'phone', 'Two percent battery. Two!'], ['b63', 'yawn', 'Big week. Tiny sleep.'], ['b64', 'up', 'I said “you too” to a waiter today.'],
    ['b65', 'side', 'Was that wave for me? Oh. No.']
  ];
  const KIND = [
    ['k01', 'warm', 'Oof, been there.'], ['k02', 'warm', 'Happens to everyone.'], ['k03', 'warm', 'Brave, being up there.'], ['k04', 'warm', 'I’d have frozen completely.'],
    ['k05', 'warm', 'They handled that well.'], ['k06', 'warm', 'Hope they’re okay.'], ['k07', 'warm', 'Honestly? Very human.'], ['k08', 'warm', 'Did that myself last week.'],
    ['k09', 'warm', 'Nobody minds. Truly.'], ['k10', 'warm', 'Rooting for them.'], ['k11', 'warm', 'Huh. Anyway, lunch.'], ['k12', 'warm', 'Barely noticed, honestly.']
  ];
  // the twist: what each of them worries the whole room noticed about THEM
  const OWN = [
    ['o01', 'Did everyone hear my stomach?'], ['o02', 'Was my laugh too loud?'], ['o03', 'I clapped at the wrong time.'], ['o04', 'Is my hair sticking up?'],
    ['o05', 'They definitely saw me yawn.'], ['o06', 'Do I look bored? I’m not bored!'], ['o07', 'Everyone saw me come in late.'], ['o08', 'My shoes squeak. They can all hear.'],
    ['o09', 'I waved back at a wave for someone else.'], ['o10', 'My phone lit up. Everyone saw.'], ['o11', 'I said “you too” to the usher.'], ['o12', 'Is it obvious I don’t know anyone?'],
    ['o13', 'I sneezed. They’ll talk about it forever.'], ['o14', 'Is this outfit too much?'], ['o15', 'I laughed a second too late.'], ['o16', 'Did I say that out loud?'],
    ['o17', 'My chair creaked. Mortifying.'], ['o18', 'I tripped on the stairs. Did anyone see?'], ['o19', 'Something’s on my shirt, isn’t it?'], ['o20', 'Everyone can tell I’m nervous.'],
    ['o21', 'I hummed. Out loud. Oh no.'], ['o22', 'I’m sure I’m sitting weird.']
  ];
  const CAMEOS = [
    { slug: 'sync', mood: 'think', name: 'Sync', id: 's01', text: 'Feeling all the feelings. Also: snacks?' },
    { slug: 'glitch', mood: 'coffee', name: 'Glitch', id: 's02', text: 'Spotlight effect detected. Did I lock my screen?' },
    { slug: 'rush', mood: 'speed', name: 'Rush', id: 's03', text: 'How long is this? Places to be!' }
  ];
  /* ---------------- daily venues ---------------- */
  const VENUES = [
    { id: 'grand', name: 'The Grand', layout: 'rows', glare: '#e8f2ff', pool: '#fff1d8', warm: '#ffb35c',
      wall: { d: ['#05070f', '#0d1430'], b: ['#5c6380', '#878ca6'], lit: ['#3c2a48', '#6e4249'], litB: ['#f1dfcf', '#e4c3b4'] },
      seat: { d: '#08161d', b: '#4b646d', lit: '#1d7c83', trim: '#d9b45c' }, floor: ['#3a2416', '#6b4426'],
      tops: ['#c2414b', '#2f6db0', '#e0a43c', '#3d8f6a', '#8a4fb5', '#e8dccb', '#2a3652', '#e46f4a', '#4fb3c9'],
      lines: [['g1', 'snack', 'Who keeps rustling the sweets?'], ['g2', 'watch', 'Is it nearly the interval?'], ['g3', 'side', 'These seats are so velvety.'], ['g4', 'up', 'Is that chandelier real?']] },
    { id: 'hall', name: 'School Hall', layout: 'rows', glare: '#f2fff6', pool: '#fff6e2', warm: '#ffd77a',
      wall: { d: ['#06100f', '#10211f'], b: ['#6a8580', '#8fa8a2'], lit: ['#9fcfbf', '#7fb2a2'], litB: ['#d9f2e6', '#bfe3d3'] },
      seat: { d: '#0b1419', b: '#56707a', lit: '#2f6fd1', lit2: '#e8742c' }, floor: ['#5a3a1c', '#b07a3e'],
      tops: ['#e2574c', '#3b7dd8', '#f2c14e', '#5bb36a', '#9b6bd3', '#f4f1e8', '#2e3a4f', '#ef8a3c', '#45b5c4'],
      lines: [['h1', 'up', 'Is that the bell?'], ['h2', 'up', 'Smells like floor polish in here.'], ['h3', 'notes', 'I need to sign that permission slip.'], ['h4', 'cold', 'These chairs were made for tiny people.']] },
    { id: 'allhands', name: 'All-Hands', layout: 'rows', glare: '#eef3ff', pool: '#fff4e2', warm: '#ffcf86',
      wall: { d: ['#05080c', '#0d151d'], b: ['#5f6b78', '#86919c'], lit: ['#8fa3b6', '#6d8193'], litB: ['#dfe7ee', '#c6d3de'] },
      seat: { d: '#07090c', b: '#4a5058', lit: '#2a2f38', mesh: true }, floor: ['#1d2633', '#3a4a5c'],
      tops: ['#3d5a80', '#98c1d9', '#e0fbfc', '#ee6c4d', '#293241', '#7b8c9e', '#c9ada7', '#4a4e69', '#f2cc8f'],
      lines: [['a1', 'phone', '47 unread emails. Forty-seven.'], ['a2', 'snack', 'Is there cake after this?'], ['a3', 'watch', 'Can I leave at five sharp?'], ['a4', 'up', 'Is that slide in Comic Sans?']] },
    { id: 'wedding', name: 'Garden Wedding', layout: 'rows', glare: '#fff6ee', pool: '#fff0e4', warm: '#ffc28e',
      wall: { d: ['#07061a', '#1d1433'], b: ['#6d6488', '#9a8fae'], lit: ['#e8bfd2', '#c39cc4'], litB: ['#fbe3ec', '#ecd2e6'] },
      seat: { d: '#121022', b: '#8a8698', lit: '#f6f1ea', bow: '#f2a6bf' }, floor: ['#16301e', '#3f6b3a'],
      tops: ['#1f2a44', '#f4e9dc', '#b5838d', '#6d597a', '#e5989b', '#355070', '#ffb4a2', '#2b2d42', '#9ad1d4'],
      lines: [['w1', 'snack', 'Is it rude to start on the bread rolls?'], ['w2', 'up', 'I hope they play my song.'], ['w3', 'up', 'Did I sign the card?'], ['w4', 'cold', 'These heels were a mistake.']] },
    { id: 'call', name: 'Group Call', layout: 'grid', glare: '#eafff0', pool: '#f4f7ff', warm: '#ffe0a8',
      wall: { d: ['#07080c', '#0e1118'], b: ['#5a6070', '#7c8292'], lit: ['#262b38', '#1b1f2a'], litB: ['#d7dbe6', '#c3c8d6'] },
      seat: { d: '#10131a', b: '#666c7c', lit: '#2a3040' }, floor: ['#1a120c', '#3b2a1c'],
      tops: ['#5b8def', '#ef6f6c', '#f7c548', '#6bcb77', '#a06cd5', '#e8e2d6', '#30394d', '#f08a4b', '#4cc9f0'],
      rooms: ['#d8cfc0', '#b9d3c9', '#e9c9b0', '#c7c3e3', '#f1e3b5', '#bcd0e8', '#e3c0c8', '#cfe0b8'],
      lines: [['c1', 'phone', 'Am I on mute?'], ['c2', 'hair', 'Is that my reflection?'], ['c3', 'side', 'My cat is on the keyboard.'], ['c4', 'phone', 'Wrong tab for ten minutes. Oops.']] }
  ];
  const ALBUM_TOTAL = BUSY.length + KIND.length + OWN.length + CAMEOS.length + VENUES.reduce((n, v) => n + v.lines.length, 0);
  const SKIN = ['#f7d7bd', '#eec09a', '#d9a274', '#bf8458', '#9c643e', '#734a2c', '#f2c9a8', '#cf9670', '#5e3a22'];
  const HAIRC = ['#1b1411', '#3a2517', '#5e3a20', '#8a5a2b', '#c48a3c', '#e6cf96', '#9a9fa8', '#b2442e', '#2a2238', '#d9d4cc'];
  const HAIRS = ['short', 'bob', 'bun', 'curly', 'long', 'bald', 'pony', 'spiky', 'afro', 'short', 'long', 'cap'];

  /* Machines without a graphics card rasterise every canvas pixel on the CPU: there the house renders at 1x and ~30 fps. */
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
  /* ---------------- colour helpers ---------------- */
  const hex3 = (c) => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(c || ''); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0]; };
  const mixHex = (a, b, k) => { const x = hex3(a), y = hex3(b), f = (i) => Math.round(x[i] + (y[i] - x[i]) * k).toString(16).padStart(2, '0'); return '#' + f(0) + f(1) + f(2); };
  const rgba = (c, a) => { const x = hex3(c); return 'rgba(' + x[0] + ',' + x[1] + ',' + x[2] + ',' + a + ')'; };
  const shade = (c, k) => (k >= 0 ? mixHex(c, '#ffffff', k) : mixHex(c, '#000000', -k));

  (env.games = env.games || []).push({
    id: 'spotlight', mode: 'reframe', name: 'Spotlight', verb: 'sweep', family: 'REFRAME', minutes: 2,
    parents: ['Social / Team / Perspective', 'Performance / Confidence', 'Memory / Replay / Rumination'],
    cast: ['patch', 'rush', 'sync', 'glitch'], poster: { char: 'patch', mood: 'shy' },
    fonts: ['DM+Serif+Display', 'Patrick+Hand'],
    tagline: 'Sweep the spotlight over the audience and read their minds.',
    why: 'For “everyone noticed”: see what the audience is really thinking about (mostly lunch).',
    css: `
.g-spotlight { --sp-gold: #e8c46a; --sp-deco: "DM Serif Display", "Playfair Display", "Bodoni 72", Didot, "Palatino Linotype", Palatino, Georgia, serif;
  --sp-hand: "Patrick Hand", "Chalkboard SE", "Comic Neue", "Segoe Print", var(--font-ui); }
.g-spotlight .sp-hit { position: absolute; inset: 0; z-index: 20; touch-action: none; }
.g-spotlight .sp-hit.on { cursor: grab; }
.g-spotlight .sp-hit.on:active { cursor: grabbing; }
.g-spotlight .sp-bubs { position: absolute; inset: 0; z-index: 24; pointer-events: none; }
.g-spotlight .sp-bub { position: absolute; left: 0; top: 0; width: max-content; max-width: var(--bw, 168px); padding: 7px 12px 8px; border-radius: 18px; background: #fffaf0; color: #2a1d12;
  font: 400 17px/1.12 var(--sp-hand); text-align: center; text-wrap: balance; box-shadow: 0 6px 18px rgba(0, 0, 0, .45); opacity: 0; transform: scale(.5);
  transform-origin: var(--tx, 50%) 112%; transition: opacity .16s ease, transform .36s cubic-bezier(.2, 1.7, .4, 1); }
.g-spotlight .sp-bub.below { transform-origin: var(--tx, 50%) -12%; }
.g-spotlight .sp-bub.on { opacity: 1; transform: none; }
.g-spotlight .sp-bub::before, .g-spotlight .sp-bub::after { content: ""; position: absolute; left: var(--tx, 50%); border-radius: 50%; background: inherit; box-shadow: 0 3px 6px rgba(0, 0, 0, .3); }
.g-spotlight .sp-bub::before { width: 11px; height: 11px; bottom: -9px; margin-left: -6px; }
.g-spotlight .sp-bub::after { width: 6px; height: 6px; bottom: -17px; margin-left: -3px; }
.g-spotlight .sp-bub.below::before { bottom: auto; top: -9px; }
.g-spotlight .sp-bub.below::after { bottom: auto; top: -17px; }
.g-spotlight .sp-bub i { display: block; font: 700 12px/1 var(--font-ui); font-style: normal; letter-spacing: .1em; text-transform: uppercase; color: #9a6a12; margin-bottom: 4px; }
.g-spotlight .sp-bub.kind { background: #fff2cc; box-shadow: 0 0 0 2px var(--sp-gold), 0 0 24px rgba(232, 196, 106, .6), 0 6px 18px rgba(0, 0, 0, .45); }
.g-spotlight .sp-bub.own { background: #e9f0ff; color: #17223f; }
.g-spotlight .sp-bub.own i { color: #3b5bb5; }
.g-spotlight .sp-bub.cameo i { color: #7a3fb0; }
.g-spotlight .sp-hud { position: absolute; z-index: 32; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 62px); transform: translateX(-50%); width: min(400px, calc(100% - 24px));
  display: grid; grid-template-columns: 1fr 1fr 1fr; border-radius: 14px; overflow: hidden; pointer-events: none; transition: opacity .45s ease, transform .45s ease;
  background: linear-gradient(180deg, rgba(22, 24, 42, .95), rgba(10, 12, 26, .95)); border: 1px solid rgba(232, 196, 106, .55); box-shadow: 0 10px 26px rgba(0, 0, 0, .5), inset 0 0 0 3px rgba(232, 196, 106, .07); }
.g-spotlight .sp-hud.hide { opacity: 0; transform: translate(-50%, -12px); }
.g-spotlight .sp-hud > div { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px 4px 7px; min-width: 0; }
.g-spotlight .sp-hud > div + div { border-left: 1px solid rgba(232, 196, 106, .22); }
.g-spotlight .sp-hud b { font: 400 24px/1 var(--sp-deco); color: #fbf1dc; font-variant-numeric: tabular-nums; }
.g-spotlight .sp-hud small { font: 700 12px/1 var(--font-ui); letter-spacing: .08em; text-transform: uppercase; color: #cdb98f; white-space: nowrap; }
.g-spotlight .sp-hud .n b { color: var(--sp-gold); }
.g-spotlight .sp-hud .bump b { animation: spotlight-bump .5s cubic-bezier(.2, 1.6, .4, 1); }
.g-spotlight .sp-hud.wide { grid-template-columns: 1fr; }
.g-spotlight .sp-hud.wide > div { flex-direction: row; justify-content: center; gap: 10px; padding: 9px 8px; }
.g-spotlight .sp-hud.wide b { color: #bcd2ff; }
.g-spotlight .sp-hud.wide .sp-eff { padding: 0 8px 8px; border-left: 0; }
.g-spotlight .sp-hud.wide .sp-eff small { color: #e8c46a; letter-spacing: .06em; white-space: normal; text-align: center; }
@keyframes spotlight-bump { 0% { transform: translateY(-5px) scale(1.4); } 100% { transform: none; } }
.g-spotlight .sp-card, .g-spotlight .sp-desk, .g-spotlight .sp-ova { position: absolute; left: 50%; transform: translateX(-50%); }
.g-spotlight .sp-card { z-index: 33; width: min(440px, calc(100% - 24px)); padding: 13px 16px 14px; border-radius: 6px; text-align: center; color: #2a1d12;
  background: linear-gradient(180deg, #fdf6e7, #f0e0bf); box-shadow: 0 0 0 1px #b8955a, 0 0 0 5px #fdf6e7, 0 0 0 6px #b8955a, 0 18px 40px rgba(0, 0, 0, .55); animation: spotlight-in .5s cubic-bezier(.2, 1.3, .4, 1) both; }
.g-spotlight .sp-card small { display: block; font: 700 12px/1 var(--font-ui); letter-spacing: .18em; text-transform: uppercase; color: #8a5a1c; margin-bottom: 8px; }
.g-spotlight .sp-row { display: flex; gap: 12px; align-items: center; text-align: left; }
.g-spotlight .sp-mini { flex: none; width: 78px; height: 62px; border-radius: 4px; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .3); background: #140f1e; }
.g-spotlight .sp-mini svg { display: block; width: 100%; height: 100%; }
.g-spotlight .sp-mini .sp-fig { transform-origin: 40px 50px; animation: spotlight-oops 2.2s ease-in-out infinite; }
.g-spotlight .sp-mini .sp-loop { transform-origin: 68px 11px; animation: spotlight-spin 2.2s linear infinite; }
@keyframes spotlight-oops { 0%, 40%, 100% { transform: none; } 50% { transform: rotate(-9deg) translateX(-2px); } 60% { transform: rotate(6deg); } 70% { transform: rotate(-3deg); } 80% { transform: none; } }
@keyframes spotlight-spin { to { transform: rotate(-360deg); } }
.g-spotlight .sp-sit { margin: 0; font: 500 15px/1.35 var(--font-ui); }
.g-spotlight .sp-hot { margin-top: 10px; font: 400 21px/1.16 var(--sp-deco); color: #7d1d33; text-wrap: balance; }
.g-spotlight .sp-hot .gk-user, .g-spotlight .sp-head .gk-user { font-weight: 400; font-size: inherit; }
.g-spotlight .sp-head { font: 400 23px/1.12 var(--sp-deco); color: #6b1a2e; text-wrap: balance; }
.g-spotlight .sp-body { margin: 9px 0 0; font: 500 15px/1.38 var(--font-ui); text-wrap: pretty; }
.g-spotlight .sp-plan { margin: 8px 0 0; font: 600 15px/1.35 var(--font-ui); color: #23503a; }
.g-spotlight .sp-care { margin: 6px 0 0; font: 500 14px/1.35 var(--font-ui); color: #5a4630; }
.g-spotlight .sp-desk { z-index: 34; width: min(440px, calc(100% - 24px)); padding: 12px 16px 14px; border-radius: 18px; color: #f6eedc; display: flex; flex-direction: column; gap: 8px;
  background: linear-gradient(180deg, #252a45, #141829); border: 1px solid rgba(232, 196, 106, .42); box-shadow: 0 18px 44px rgba(0, 0, 0, .6), inset 0 1px 0 rgba(255, 255, 255, .08); animation: spotlight-in .45s cubic-bezier(.2, 1.3, .4, 1) both; }
.g-spotlight .sp-q { font: 600 16px/1.3 var(--font-ui); text-align: center; text-wrap: balance; }
.g-spotlight .sp-read { display: flex; align-items: baseline; justify-content: center; gap: 8px; }
.g-spotlight .sp-read b { font: 400 46px/1 var(--sp-deco); color: #fff; font-variant-numeric: tabular-nums; min-width: 2ch; text-align: right; }
.g-spotlight .sp-read span { font: 600 15px/1 var(--font-ui); color: #cdb98f; }
.g-spotlight .sp-read.bump b { animation: spotlight-bump .32s cubic-bezier(.2, 1.6, .4, 1); }
.g-spotlight .sp-fader { position: relative; height: 60px; touch-action: none; cursor: grab; outline: none; border-radius: 12px; margin-top: 12px; }
.g-spotlight .sp-fader:focus-visible { box-shadow: 0 0 0 3px var(--sp-gold); }
.g-spotlight .sp-groove { position: absolute; left: 22px; right: 22px; top: 50%; height: 10px; margin-top: -5px; border-radius: 5px; background: #06080e; box-shadow: inset 0 2px 4px rgba(0, 0, 0, .8), 0 1px 0 rgba(255, 255, 255, .08); }
.g-spotlight .sp-ticks { position: absolute; left: 22px; right: 22px; top: 50%; height: 9px; margin-top: 11px; background-image: linear-gradient(90deg, rgba(246, 238, 220, .38) 1px, transparent 1px); background-size: 10% 100%; border-right: 1px solid rgba(246, 238, 220, .38); }
.g-spotlight .sp-fill { position: absolute; left: 22px; top: 50%; height: 4px; margin-top: -2px; border-radius: 2px; width: calc((100% - 44px) * var(--k, .5)); background: linear-gradient(90deg, #ffe6a8, #ffffff); box-shadow: 0 0 10px rgba(255, 240, 200, .8); }
.g-spotlight .sp-knob { position: absolute; top: 50%; left: calc(22px + (100% - 44px) * var(--k, .5)); width: 40px; height: 56px; margin: -28px 0 0 -20px; border-radius: 9px;
  background: linear-gradient(180deg, #fbfbfb 0%, #cdd0d9 44%, #8c91a1 56%, #dcdfe6 100%); box-shadow: 0 6px 12px rgba(0, 0, 0, .6), inset 0 1px 0 #fff; }
.g-spotlight .sp-knob::after { content: ""; position: absolute; left: 6px; right: 6px; top: 50%; height: 3px; margin-top: -1.5px; background: #e5484d; border-radius: 2px; }
.g-spotlight .sp-target { position: absolute; top: 2px; bottom: 2px; left: calc(22px + (100% - 44px) * var(--t, 0)); width: 4px; margin-left: -2px; border-radius: 2px; background: var(--sp-gold); box-shadow: 0 0 12px rgba(232, 196, 106, .95); }
.g-spotlight .sp-target b { position: absolute; bottom: calc(100% + 3px); left: 50%; transform: translateX(-50%); font: 700 12px/1 var(--font-ui); letter-spacing: .08em; color: var(--sp-gold); white-space: nowrap; text-transform: uppercase; }
.g-spotlight .sp-ends { display: flex; justify-content: space-between; font: 600 12px/1.2 var(--font-ui); color: #b9a985; padding: 0 4px; }
.g-spotlight .sp-btn { appearance: none; border: 0; cursor: pointer; min-height: 48px; padding: 12px 24px; border-radius: 999px; font: 700 16px/1 var(--font-ui); letter-spacing: .02em; color: #2a1a05;
  background: linear-gradient(180deg, #ffe6a3, #e8b44a); box-shadow: 0 4px 0 #9a6a1c, 0 10px 22px rgba(0, 0, 0, .4); align-self: center; margin-top: 12px; }
.g-spotlight .sp-btn:active { transform: translateY(3px); box-shadow: 0 1px 0 #9a6a1c; }
.g-spotlight .sp-btn:focus-visible, .g-spotlight .sp-hold:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.g-spotlight .sp-note { font: 500 13px/1.35 var(--font-ui); color: #c4b490; text-align: center; text-wrap: balance; }
.g-spotlight .sp-verdict { font: 600 16px/1.3 var(--font-ui); text-align: center; color: #ffe6a8; text-wrap: balance; }
.g-spotlight .sp-float { position: absolute; z-index: 35; left: 50%; transform: translateX(-50%); margin-top: 0; min-width: 200px; box-shadow: 0 0 0 2px rgba(255, 246, 220, .6), 0 0 26px rgba(232, 196, 106, .5), 0 4px 0 #9a6a1c, 0 12px 26px rgba(0, 0, 0, .45); animation: spotlight-in .5s .25s cubic-bezier(.2, 1.3, .4, 1) both; }
.g-spotlight .sp-hold { position: absolute; z-index: 35; left: 50%; width: min(300px, calc(100% - 48px)); margin-left: calc(min(300px, calc(100% - 48px)) / -2); min-height: 56px; border: 0; border-radius: 999px; cursor: pointer; overflow: hidden; touch-action: none;
  background: #2b1d10; color: #fff4dc; font: 700 17px/1 var(--font-ui); letter-spacing: .03em; box-shadow: 0 0 0 2px var(--sp-gold), 0 0 26px rgba(232, 196, 106, .45), 0 5px 0 #120b05, 0 14px 26px rgba(0, 0, 0, .45); animation: spotlight-rise .5s .2s cubic-bezier(.2, 1.3, .4, 1) both; }
.g-spotlight .sp-hold i { position: absolute; inset: 0; transform-origin: 0 50%; transform: scaleX(var(--f, 0)); background: linear-gradient(90deg, #e8b44a, #ffe6a3); }
.g-spotlight .sp-hold span { position: relative; z-index: 1; text-shadow: 0 1px 2px rgba(20, 10, 0, .85), 0 0 8px rgba(20, 10, 0, .6); }
.g-spotlight .sp-hold.full span { color: #2a1a05; text-shadow: none; }
.g-spotlight .sp-ova { z-index: 33; width: min(620px, calc(100% - 24px)); text-align: center; pointer-events: none; }
.g-spotlight .sp-ova b { display: block; font: 400 clamp(27px, 7.6cqw, 50px)/1.02 var(--sp-deco); color: #fff4dc; text-shadow: 0 2px 0 rgba(60, 20, 0, .45), 0 0 30px rgba(255, 180, 90, .7); text-wrap: balance;
  animation: spotlight-rise 1s cubic-bezier(.2, 1.2, .4, 1) both; }
.g-spotlight .sp-ova span { display: block; margin-top: 8px; font: 600 15px/1.3 var(--font-ui); color: #ffeccc; text-shadow: 0 1px 6px rgba(0, 0, 0, .6); animation: spotlight-rise 1s .35s cubic-bezier(.2, 1.2, .4, 1) both; }
@keyframes spotlight-in { from { opacity: 0; transform: translate(-50%, 16px) scale(.96); } to { opacity: 1; transform: translateX(-50%); } }
@keyframes spotlight-rise { from { opacity: 0; transform: translateY(18px) scale(.94); } to { opacity: 1; transform: none; } }
.g-spotlight .gk-bubble { max-width: min(250px, calc(100cqw - var(--sz, 96px) - 44px)); }
/* Patch sits docked at the bottom: the speech bubble grows upwards, so a long line never runs off the screen */
.g-spotlight .gk-char.gk-side-right .gk-bubble { top: auto; bottom: 6px; }
.g-spotlight .gk-char.gk-side-right .gk-bubble::before { top: auto; bottom: 20px; }
.g-spotlight .sp-out { opacity: 0 !important; transition: opacity .35s ease; pointer-events: none; }
@container (min-width: 700px) {
  .g-spotlight .sp-bub { font-size: 19px; }
  .g-spotlight .sp-card { width: min(480px, calc(100% - 24px)); }
  .g-spotlight .sp-desk { width: min(480px, calc(100% - 24px)); }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const TAU = Math.PI * 2, clamp = K.clamp, lerp = K.lerp, now = () => performance.now();
      const inten = ctx.intensity, visits = K.visits(), noWords = !String(ctx.text || '').trim();
      const L = (o) => ctx.line(o) || '';
      const isBright = () => S.scene() === 'bright';
      const reduced = () => K.reduced();
      const R = K.rng((K.daily() * 131 + visits * 977 + 7) >>> 0);
      const shuffle = (arr) => K.shuffle(arr, R);
      const V = visits === 0 ? VENUES[0] : K.dailyPick(VENUES, 5);
      const N = [24, 30, 36][inten] || 30;
      const care = () => an.safety === 'care';
      const support = () => (an.fear_support === 'strong' ? 'strong' : an.fear_support === 'some' ? 'some' : 'weak');

      /* ---------------- words (only the reader's version of what they wrote) ---------------- */
      const clip = (s, n) => {
        s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
        if (s.length > n) { const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); s = (sp > n * 0.6 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; }
        if ((s.match(/"/g) || []).length % 2) s += '"';
        if ((s.match(/“/g) || []).length > (s.match(/”/g) || []).length) s += '”';
        return s;
      };
      const tidy = (s, n) => { s = clip(String(s || '').replace(/;\s+/g, '. '), n || 150); if (!s) return ''; s = s[0].toUpperCase() + s.slice(1); return /[.!?…"”’)]$/.test(s) ? s : s + '.'; };
      const leadOf = (kind) => { const ls = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text); const l = ls.find(x => x.kind === kind) || ls[0]; return l ? tidy(l.text, 110) : ''; };

      /* ---------------- the audience ---------------- */
      const album = new Set(K.collection());
      const unseenFirst = (list) => { const sh = shuffle(list); return sh.filter(x => !album.has('t:' + x[0])).concat(sh.filter(x => album.has('t:' + x[0]))); };
      const cameoN = Math.min(3, 1 + visits);
      const nKind = clamp(2 + Math.floor(R() * 3) - (inten === 0 ? 1 : 0), 2, 4);
      const busyPool = unseenFirst(BUSY.concat(V.lines)), kindPool = unseenFirst(KIND), ownPool = unseenFirst(OWN);
      const people = [];
      const cameoSeats = [1, 4, 2].slice(0, cameoN);
      const kindSeats = [];
      while (kindSeats.length < nKind) {
        const i = 6 + Math.floor(R() * (N - 6));
        if (!kindSeats.some(j => Math.abs(j - i) < 3) && !cameoSeats.includes(i)) kindSeats.push(i);
        if (kindSeats.length < nKind && R() < 0.02) break;
      }
      while (kindSeats.length < nKind) kindSeats.push(N - 1 - kindSeats.length);
      let bi = 0, ki = 0;
      for (let i = 0; i < N; i++) {
        const look = { skin: SKIN[Math.floor(R() * SKIN.length)], hair: HAIRS[Math.floor(R() * HAIRS.length)], hairC: HAIRC[Math.floor(R() * HAIRC.length)], top: V.tops[Math.floor(R() * V.tops.length)],
          glasses: R() < 0.24, ear: R() < 0.16, phones: R() < 0.07, room: V.rooms ? V.rooms[Math.floor(R() * V.rooms.length)] : null, tilt: (R() - 0.5) * 0.12 };
        if (look.hair === 'bald' && R() < 0.5) look.hair = 'short';
        const own = ownPool[i % ownPool.length];
        const p = { i, look, own: { id: own[0], text: own[1] }, rev: false, dwell: 0, glow: 0, spot: 0, blink: 0, nextBlink: 1 + R() * 6, spr: {} };
        const ci = cameoSeats.indexOf(i);
        if (ci >= 0) { const c = CAMEOS[ci]; Object.assign(p, { kind: 'cameo', cameo: c, tid: c.id, text: c.text, pose: 'up' }); }
        else if (kindSeats.includes(i)) { const t = kindPool[ki++ % kindPool.length]; Object.assign(p, { kind: 'kind', tid: t[0], pose: t[1], text: t[2] }); }
        else { const t = busyPool[bi++ % busyPool.length]; Object.assign(p, { kind: 'busy', tid: t[0], pose: t[1], text: t[2] }); }
        people.push(p);
      }
      const cameoImg = {};
      const loadFace = (slug, mood) => { const k = slug + ':' + mood; if (cameoImg[k]) return cameoImg[k]; const im = new Image(); im.onload = () => { people.forEach(p => { if (p.cameo && p.cameo.slug === slug) p.spr = {}; }); dirtyAll(); }; im.src = K.face(slug, mood); cameoImg[k] = im; return im; };
      people.forEach(p => { if (p.cameo) { loadFace(p.cameo.slug, p.cameo.mood); loadFace(p.cameo.slug, 'celebrate'); } });

      /* ---------------- state ---------------- */
      const P = {
        phase: 'intro', glare: 0, glareT: 0.35, warm: 0, warmT: 0, val: Math.round(N / 2), guess: null, touched: false, revealed: 0, noticed: 0, busy: 0,
        pool: { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, on: 0, onT: 0 }, drag: false, moving: 0, calm: 0, last: null, lampAng: -2.3,
        rigY: -60, rigT: -60, rigOn: 0, spotsOn: 0, spotsT: 0, spotFrac: 0, house: 0, houseT: 0, dip: 0, finT: 0, stand: [], roses: [], newThoughts: 0, finished: false, sweepT0: 0, glints: 0, glintsT: 0
      };
      const M = { W: 0, H: 0, phone: true, rows: 1, cols: 6, houseTop: 108, houseBottom: 600, rowsTop: 220, booth: { x: 0, y: 0 }, lamp: { x: 0, y: 0 }, rigY: 120, prx: 60, pry: 40, spacing: 60, byRow: [], cardBottom: 100 };
      const FX = K.particles({ max: 260 });

      /* ---------------- DOM ---------------- */
      const SOFT = softwareGfx();
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFT ? 1 : 1.5 });
      const hit = h('div', { class: 'sp-hit', 'aria-label': 'The audience. Drag to move the spotlight; arrow keys work too.', tabindex: '-1' });
      const bubs = h('div', { class: 'sp-bubs', 'aria-live': 'polite' });
      const cellN = h('div', { class: 'n' }, h('b', { text: '0' }), h('small', { text: 'Noticed' }));
      const cellB = h('div', null, h('b', { text: '0' }), h('small', { text: 'Own lives' }));
      const cellD = h('div', null, h('b', { text: String(N) }), h('small', { text: 'In the dark' }));
      const hud = h('div', { class: 'sp-hud hide', role: 'status' }, cellN, cellB, cellD);
      el.append(hit, bubs, hud);
      const patch = K.character('patch', { side: 'right', mood: 'shy', size: K.phone() ? 78 : 100 });
      const patchSize = K.phone() ? 78 : 100;
      let card = null, desk = null, ova = null;

      /* ---------------- sound ---------------- */
      const music = K.music('noir'); music.level(0.3);
      let murmur = null, hum = null, whirr = null;
      function beds() {
        if (!A.ctx) return;
        if (!murmur) { murmur = A.loop({ pink: true, filter: 'bandpass', freq: 380, q: 0.7, bus: 'amb' }); if (murmur) murmur.level(0.035, 1.5); }
        if (!hum) { hum = A.loop({ filter: 'bandpass', freq: 150, q: 5, bus: 'sfx' }); }
        if (!whirr) { whirr = A.loop({ pink: true, filter: 'bandpass', freq: 900, q: 2.5, bus: 'sfx' }); }
      }
      beds(); S.on('audio-ready', beds);
      S.onDestroy(() => { [murmur, hum, whirr].forEach(x => { if (x) x.stop(); }); });
      const SCALE = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6'];
      function grid16() { if (!A.ctx) return 0; const t = A.now(), bl = 60 / (music.bpm || 76) / 4; let q = music.next || (t + 0.03); while (q - bl > t + 0.025) q -= bl; while (q < t + 0.025) q += bl; return q; }
      function plink(p) {
        if (!A.ctx) return;
        const idx = clamp(Math.round((p.j / Math.max(1, M.cols - 1)) * 6) + p.k * 2, 0, SCALE.length - 1);
        A.pluck(A.note(SCALE[idx]), { when: grid16(), vol: 0.2, damp: 0.996, verb: 0.35, pan: clamp((p.x / M.W - 0.5) * 1.3, -0.8, 0.8) });
        A.sync('reveal', now());
      }
      function kindChord() { if (!A.ctx) return; const t = grid16(); ['F5', 'A5', 'C6', 'E6'].forEach((n, i) => A.chime(A.note(n), { when: t + i * 0.05, vol: 0.06, dur: 1.8 })); }
      function cough() { if (!A.ctx || P.phase === 'finale') return; const t = A.now() + 0.02, pan = Math.random() * 1.6 - 0.8; A.noise({ when: t, filter: 'bandpass', freq: 700 + Math.random() * 500, q: 1.4, dur: 0.12, vol: 0.025, pan, bus: 'amb' }); if (Math.random() < 0.5) A.noise({ when: t + 0.16, filter: 'bandpass', freq: 650 + Math.random() * 400, q: 1.4, dur: 0.1, vol: 0.02, pan, bus: 'amb' }); }
      function rustle() { if (!A.ctx) return; A.noise({ filter: 'highpass', freq: 3500 + Math.random() * 2500, dur: 0.18 + Math.random() * 0.2, attack: 0.06, vol: 0.012, pan: Math.random() * 1.6 - 0.8, bus: 'amb' }); }
      S.every(() => { if (P.phase !== 'finale' && P.phase !== 'done') { if (Math.random() < 0.3) cough(); else if (Math.random() < 0.5) rustle(); } }, 2300);
      function applause(sec, vol) {
        if (!A.ctx) return;
        const t0 = A.now();
        for (let i = 0; i < sec * 46; i++) { const w = t0 + 0.05 + Math.random() * sec; A.noise({ when: w, filter: 'bandpass', freq: 1200 + Math.random() * 2200, q: 1.1, dur: 0.016 + Math.random() * 0.02, vol: (0.025 + Math.random() * 0.05) * vol * (1 - (w - t0) / (sec * 1.6)), pan: Math.random() * 1.8 - 0.9 }); }
        [0.5, 1.1, 1.9, 2.6].forEach((o, i) => A.tone({ when: t0 + o, type: 'sine', freq: 900 + i * 80, to: 1700 + i * 140, glide: 0.22, dur: 0.32, vol: 0.022 * vol }));
      }

      /* ---------------- layout ---------------- */
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        M.W = W; M.H = H; M.phone = W < 700;
        M.houseTop = M.phone ? 108 : 104;
        const band = M.phone ? clamp(H * 0.255, 200, 250) : clamp(H * 0.24, 180, 220);
        M.houseBottom = Math.round(H - band);
        // seating plans that fill the house at each size: phone 4x6 / 5x6 / 6x6, desktop 8x3 / 10x3 / 9x4
        M.cols = M.phone ? (N <= 24 ? 4 : N <= 30 ? 5 : 6) : (N <= 24 ? 8 : N <= 30 ? 10 : 9);
        M.rows = Math.ceil(N / M.cols);
        M.booth = { x: W / 2, y: M.houseTop + (M.phone ? 46 : 52) };
        M.rigY = M.houseTop + (M.phone ? 26 : 30);
        M.rowsTop = M.houseTop + (M.phone ? 104 : 128);
        const grid = V.layout === 'grid', n = M.rows;
        const mx = M.phone ? (M.cols <= 4 ? 50 : 30) : Math.max(96, W * 0.085);
        const spacing = (W - 2 * mx) / (M.cols - 1); M.spacing = spacing;
        const s = [], sx = [];
        for (let k = 0; k < n; k++) { const t = n > 1 ? k / (n - 1) : 0; s.push(grid ? 1 : lerp(1, M.phone ? 0.66 : 0.74, t)); sx.push(grid ? 1 : lerp(1, M.phone ? 0.8 : 0.86, t)); }
        let r0 = spacing * (grid ? 0.29 : 0.31);
        const avail = M.houseBottom - M.rowsTop;
        let sumMid = 0; for (let k = 0; k < n - 1; k++) sumMid += (s[k] + s[k + 1]) / 2;
        const minGap = grid ? 3.7 : 2.5, front = grid ? 2.4 : 2.3, back = grid ? 1.5 : 1.55;
        if (r0 * (front + minGap * sumMid + back * s[n - 1]) > avail) r0 = avail / (front + minGap * sumMid + back * s[n - 1]);
        let gap = n > 1 ? (avail - r0 * (front + back * s[n - 1])) / (r0 * sumMid) : 0;
        gap = clamp(gap, minGap, grid ? 4.1 : 3.9);
        let y = M.houseBottom - front * r0;
        M.byRow = [];
        for (let k = 0; k < n; k++) {
          if (k > 0) y -= gap * r0 * (s[k - 1] + s[k]) / 2;
          const r = r0 * s[k], row = [];
          for (let j = 0; j < M.cols; j++) {
            const i = k * M.cols + j; if (i >= N) break;
            const p = people[i];
            const off = grid ? 0 : (k % 2 ? 0.2 : 0) * spacing * sx[k];
            const x = W / 2 + (j - (M.cols - 1) / 2) * spacing * sx[k] + off;
            const bow = grid ? 0 : r * 0.9 * Math.pow((x - W / 2) / (W / 2), 2);
            Object.assign(p, { k, j, r, x, y: y + bow, spr: {} });
            row.push(p);
          }
          M.byRow.push(row);
        }
        M.prx = spacing * (M.phone ? 0.95 : 0.84) * (inten === 0 ? 1.15 : 1);
        M.pry = M.prx * (grid ? 0.82 : 0.66);
        M.lamp = M.phone ? { x: W - 58, y: M.houseBottom + 84 } : { x: W - 170, y: M.houseBottom + 104 };
        M.cardBottom = M.phone ? patchSize + 26 : 26;
        if (!P.pool.x) { const f = M.byRow[0][Math.floor(M.cols / 2) - 1] || people[0]; P.pool.x = P.pool.tx = f.x; P.pool.y = P.pool.ty = f.y + f.r * 0.4; }
        else { P.pool.tx = clamp(P.pool.tx, 0, W); P.pool.ty = clamp(P.pool.ty, M.houseTop, M.houseBottom); }
        placeUI();
        bubbleClear();
        dirtyAll();
      }
      function placeUI() {
        [card, desk].forEach(x => { if (x) x.style.bottom = M.cardBottom + 'px'; });
        if (P.floatBtn && card && P.floatBtn.isConnected) P.floatBtn.style.bottom = (M.cardBottom + (card.offsetHeight || 160) + 16) + 'px';
        if (ova) { ova.style.bottom = 'auto'; ova.style.top = (M.houseBottom + (M.phone ? 14 : 22)) + 'px'; }
      }

      /* ---------------- drawing: people, seats, the house ---------------- */
      function rr(g, x, y, w, hh, r) { r = Math.min(r, w / 2, hh / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      function torso(g, r) {
        g.beginPath(); g.moveTo(-0.42 * r, 0.78 * r);
        g.bezierCurveTo(-0.92 * r, 0.86 * r, -1.32 * r, 1.05 * r, -1.36 * r, 1.75 * r); g.lineTo(-1.42 * r, 3.2 * r); g.lineTo(1.42 * r, 3.2 * r); g.lineTo(1.36 * r, 1.75 * r);
        g.bezierCurveTo(1.32 * r, 1.05 * r, 0.92 * r, 0.86 * r, 0.42 * r, 0.78 * r); g.closePath();
      }
      function hairBack(g, r, st) {
        g.beginPath();
        if (st === 'long') { g.ellipse(0, 0.32 * r, 1.2 * r, 1.5 * r, 0, 0, TAU); }
        else if (st === 'bob') { g.moveTo(-1.14 * r, 0.75 * r); g.lineTo(-1.14 * r, -0.2 * r); g.arc(0, -0.2 * r, 1.14 * r, Math.PI, 0); g.lineTo(1.14 * r, 0.75 * r); g.closePath(); }
        else if (st === 'afro') { g.arc(0, -0.28 * r, 1.46 * r, 0, TAU); }
        else if (st === 'curly') { for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; g.moveTo(Math.cos(a) * 0.95 * r + 0.44 * r, -0.12 * r + Math.sin(a) * 0.95 * r); g.arc(Math.cos(a) * 0.95 * r, -0.12 * r + Math.sin(a) * 0.95 * r, 0.44 * r, 0, TAU); } }
        else if (st === 'pony') { g.ellipse(1.02 * r, 0.3 * r, 0.32 * r, 0.78 * r, -0.35, 0, TAU); }
        else if (st === 'bun') { g.arc(0, -1.12 * r, 0.48 * r, 0, TAU); }
        else return;
        g.fill();
      }
      function hairFront(g, r, st) {
        if (st === 'bald') return;
        g.beginPath();
        if (st === 'spiky') { g.moveTo(-1.03 * r, 0); for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI, rr2 = (i % 2 ? 1.36 : 1.02) * r; g.lineTo(Math.cos(a) * rr2, -0.04 * r + Math.sin(a) * rr2); } g.closePath(); }
        else if (st === 'cap') { g.arc(0, -0.08 * r, 1.07 * r, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); g.fill(); g.beginPath(); g.ellipse(0.25 * r, -0.12 * r, 1.25 * r, 0.24 * r, -0.05, 0, TAU); }
        else if (st === 'afro' || st === 'curly') { g.arc(0, -0.06 * r, 1.05 * r, Math.PI * 1.04, Math.PI * 1.96); g.quadraticCurveTo(0, -0.62 * r, -1.02 * r, -0.2 * r); g.closePath(); }
        else { g.arc(0, -0.02 * r, 1.05 * r, Math.PI * 1.02, Math.PI * 1.98); g.quadraticCurveTo(0.35 * r, -0.62 * r, -0.2 * r, -0.44 * r); g.quadraticCurveTo(-0.72 * r, -0.36 * r, -1.04 * r, -0.04 * r); g.closePath(); }
        g.fill();
      }
      function hand(g, r, x, y, skin) { g.fillStyle = skin; g.beginPath(); g.arc(x, y, 0.25 * r, 0, TAU); g.fill(); }
      function face(g, r, pose, L) {
        const ex = 0.36 * r, ey = 0.1 * r, er = Math.max(1.1, 0.12 * r);
        let dx = 0, dy = 0, shut = false, mouth = 'smile';
        if (pose === 'phone' || pose === 'notes') { dy = 0.1 * r; mouth = 'flat'; }
        else if (pose === 'up') { dx = -0.06 * r; dy = -0.1 * r; mouth = 'hmm'; }
        else if (pose === 'hair') { dy = -0.09 * r; dx = 0.05 * r; }
        else if (pose === 'side') { dx = 0.1 * r; }
        else if (pose === 'watch') { dx = -0.08 * r; dy = 0.09 * r; mouth = 'flat'; }
        else if (pose === 'sleep') { shut = true; mouth = 'o'; }
        else if (pose === 'yawn') { shut = true; mouth = 'yawn'; }
        else if (pose === 'snack') { mouth = 'chew'; }
        else if (pose === 'cold') { mouth = 'wobble'; }
        else if (pose === 'drink') { dx = 0.06 * r; mouth = 'flat'; }
        else if (pose === 'warm') { mouth = 'big'; }
        else if (pose === 'cheer') { mouth = 'open'; }
        g.fillStyle = 'rgba(255,110,110,0.22)'; g.beginPath(); g.arc(-0.56 * r, 0.42 * r, 0.19 * r, 0, TAU); g.arc(0.56 * r, 0.42 * r, 0.19 * r, 0, TAU); g.fill();
        g.fillStyle = '#1e1520'; g.strokeStyle = '#1e1520'; g.lineWidth = Math.max(1, 0.1 * r); g.lineCap = 'round';
        if (shut || pose === 'cheer') { [-1, 1].forEach(sg => { g.beginPath(); if (pose === 'cheer') g.arc(sg * ex, ey + er * 0.4, er * 1.15, 1.15 * Math.PI, 1.85 * Math.PI); else g.arc(sg * ex, ey - er * 0.2, er * 1.1, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }); }
        else {
          [-1, 1].forEach(sg => { g.beginPath(); g.arc(sg * ex + dx, ey + dy, er, 0, TAU); g.fill(); });
          if (r > 14) { g.fillStyle = '#ffffff'; [-1, 1].forEach(sg => { g.beginPath(); g.arc(sg * ex + dx - er * 0.3, ey + dy - er * 0.35, er * 0.38, 0, TAU); g.fill(); }); }
        }
        g.fillStyle = '#7a2a35'; g.strokeStyle = '#4a1d24'; g.lineWidth = Math.max(1, 0.08 * r);
        const my = 0.5 * r;
        g.beginPath();
        if (mouth === 'smile') { g.arc(0, my - 0.12 * r, 0.24 * r, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); }
        else if (mouth === 'big' || mouth === 'open') { g.moveTo(-0.28 * r, my - 0.04 * r); g.quadraticCurveTo(0, my + (mouth === 'open' ? 0.42 : 0.3) * r, 0.28 * r, my - 0.04 * r); g.closePath(); g.fill(); }
        else if (mouth === 'flat') { g.moveTo(-0.14 * r, my); g.lineTo(0.14 * r, my); g.stroke(); }
        else if (mouth === 'hmm') { g.moveTo(-0.12 * r, my + 0.02 * r); g.quadraticCurveTo(0.05 * r, my - 0.06 * r, 0.18 * r, my + 0.01 * r); g.stroke(); }
        else if (mouth === 'o') { g.arc(0, my, 0.08 * r, 0, TAU); g.fill(); }
        else if (mouth === 'yawn') { g.ellipse(0, my + 0.04 * r, 0.15 * r, 0.22 * r, 0, 0, TAU); g.fill(); }
        else if (mouth === 'chew') { g.ellipse(0.04 * r, my, 0.14 * r, 0.09 * r, 0, 0, TAU); g.fill(); }
        else if (mouth === 'wobble') { g.moveTo(-0.2 * r, my); for (let i = 1; i <= 4; i++) g.lineTo(-0.2 * r + i * 0.1 * r, my + (i % 2 ? -0.05 : 0.05) * r); g.stroke(); }
        if (pose === 'warm') { g.fillStyle = 'rgba(255,90,120,0.34)'; g.beginPath(); g.arc(-0.56 * r, 0.42 * r, 0.22 * r, 0, TAU); g.arc(0.56 * r, 0.42 * r, 0.22 * r, 0, TAU); g.fill(); }
      }
      function props(g, r, pose, L) {
        const sk = L.skin;
        if (pose === 'phone') {
          const gl = g.createRadialGradient(0, 0.7 * r, 0, 0, 0.7 * r, 1.25 * r); gl.addColorStop(0, 'rgba(130,210,255,0.32)'); gl.addColorStop(1, 'rgba(130,210,255,0)'); g.fillStyle = gl; g.beginPath(); g.arc(0, 0.7 * r, 1.25 * r, 0, TAU); g.fill();
          g.fillStyle = '#191c26'; rr(g, -0.34 * r, 1.42 * r, 0.68 * r, 1.0 * r, 0.12 * r); g.fill();
          g.fillStyle = '#8fdcff'; rr(g, -0.26 * r, 1.5 * r, 0.52 * r, 0.8 * r, 0.06 * r); g.fill();
          hand(g, r, -0.42 * r, 2.05 * r, sk); hand(g, r, 0.42 * r, 2.05 * r, sk);
        } else if (pose === 'snack') {
          g.fillStyle = '#fff6e6'; [-0.25, 0.05, 0.3, -0.05, 0.18].forEach((x, i) => { g.beginPath(); g.arc((x + 0.55) * r, (1.32 - (i % 2) * 0.12) * r, 0.17 * r, 0, TAU); g.fill(); });
          g.fillStyle = '#d63a3a'; g.beginPath(); g.moveTo(0.18 * r, 1.4 * r); g.lineTo(1.12 * r, 1.4 * r); g.lineTo(1.0 * r, 2.5 * r); g.lineTo(0.3 * r, 2.5 * r); g.closePath(); g.fill();
          g.fillStyle = '#fff6e6'; g.fillRect(0.46 * r, 1.4 * r, 0.16 * r, 1.1 * r); g.fillRect(0.76 * r, 1.4 * r, 0.16 * r, 1.1 * r);
          hand(g, r, 0.25 * r, 0.95 * r, sk);
        } else if (pose === 'notes') {
          g.save(); g.translate(0, 1.95 * r); g.rotate(-0.08); g.fillStyle = '#fbf6e8'; rr(g, -0.62 * r, -0.42 * r, 1.24 * r, 0.84 * r, 0.06 * r); g.fill();
          g.strokeStyle = 'rgba(60,80,140,0.6)'; g.lineWidth = Math.max(0.8, 0.06 * r); for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-0.45 * r, (-0.18 + i * 0.18) * r); g.lineTo((0.42 - i * 0.12) * r, (-0.18 + i * 0.18) * r); g.stroke(); } g.restore();
          hand(g, r, -0.62 * r, 2.15 * r, sk); hand(g, r, 0.62 * r, 2.15 * r, sk);
        } else if (pose === 'hair') {
          g.strokeStyle = L.top; g.lineWidth = 0.42 * r; g.lineCap = 'round'; g.beginPath(); g.moveTo(1.1 * r, 1.6 * r); g.quadraticCurveTo(1.5 * r, 0.3 * r, 0.82 * r, -0.62 * r); g.stroke();
          hand(g, r, 0.78 * r, -0.72 * r, sk);
        } else if (pose === 'watch') {
          g.strokeStyle = L.top; g.lineWidth = 0.42 * r; g.lineCap = 'round'; g.beginPath(); g.moveTo(1.15 * r, 2.2 * r); g.lineTo(-0.15 * r, 1.65 * r); g.stroke();
          g.fillStyle = '#d9b45c'; g.beginPath(); g.arc(-0.12 * r, 1.62 * r, 0.2 * r, 0, TAU); g.fill(); g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(-0.12 * r, 1.62 * r, 0.12 * r, 0, TAU); g.fill();
          hand(g, r, -0.42 * r, 1.58 * r, sk);
        } else if (pose === 'drink') {
          g.fillStyle = '#f4efe6'; rr(g, 0.48 * r, 1.25 * r, 0.56 * r, 0.7 * r, 0.1 * r); g.fill(); g.fillStyle = '#7a4a2a'; g.fillRect(0.48 * r, 1.25 * r, 0.56 * r, 0.16 * r);
          g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = Math.max(0.8, 0.05 * r); g.beginPath(); g.moveTo(0.7 * r, 1.12 * r); g.quadraticCurveTo(0.6 * r, 0.95 * r, 0.75 * r, 0.82 * r); g.stroke();
          hand(g, r, 0.6 * r, 1.85 * r, sk);
        } else if (pose === 'cold') {
          g.fillStyle = shade(L.top, -0.15); g.beginPath(); g.ellipse(-0.25 * r, 1.85 * r, 0.95 * r, 0.24 * r, 0.25, 0, TAU); g.fill(); g.beginPath(); g.ellipse(0.25 * r, 2.1 * r, 0.95 * r, 0.24 * r, -0.25, 0, TAU); g.fill();
          hand(g, r, 0.82 * r, 1.65 * r, sk); hand(g, r, -0.82 * r, 2.3 * r, sk);
          g.strokeStyle = 'rgba(160,210,255,0.8)'; g.lineWidth = Math.max(0.8, 0.06 * r); [-1, 1].forEach(sg => { g.beginPath(); g.moveTo(sg * 1.45 * r, 0.9 * r); g.lineTo(sg * 1.6 * r, 1.05 * r); g.lineTo(sg * 1.45 * r, 1.2 * r); g.stroke(); });
        } else if (pose === 'sleep') {
          g.strokeStyle = '#9fb6ff'; g.lineWidth = Math.max(1, 0.1 * r); g.lineJoin = 'round';
          [[0.9, -0.95, 0.3], [1.3, -1.45, 0.4]].forEach(([x, y, s2]) => { g.beginPath(); g.moveTo(x * r, y * r); g.lineTo((x + s2) * r, y * r); g.lineTo(x * r, (y + s2) * r); g.lineTo((x + s2) * r, (y + s2) * r); g.stroke(); });
        } else if (pose === 'yawn') {
          hand(g, r, -0.32 * r, 0.62 * r, sk);
        } else if (pose === 'up') {
          hand(g, r, 0.3 * r, 0.92 * r, sk);
        } else if (pose === 'warm') {
          hand(g, r, -0.16 * r, 1.7 * r, sk); hand(g, r, 0.16 * r, 1.7 * r, sk);
        }
      }
      function drawPerson(g, p, mode) {
        const r = p.r, Lk = p.look, dark = mode === 'dark', stand = mode === 'stand', br = isBright();
        const sil = br ? '#535c76' : '#0a0f1e', rim = br ? 'rgba(255,255,255,0.32)' : 'rgba(176,204,255,0.34)';
        if (p.cameo) {
          const im = cameoImg[p.cameo.slug + ':' + (stand ? 'celebrate' : p.cameo.mood)], size = 2.9 * r, cy = 0.55 * r - (stand ? 0.2 * r : 0);
          if (dark) { g.fillStyle = sil; g.beginPath(); g.arc(0, cy, size * 0.47, 0, TAU); g.fill(); g.strokeStyle = rim; g.lineWidth = Math.max(1, 0.08 * r); g.beginPath(); g.arc(0, cy, size * 0.46, Math.PI * 1.12, Math.PI * 1.88); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.9)'; [-1, 1].forEach(sg => { g.beginPath(); g.arc(sg * 0.42 * r, cy - 0.05 * r, Math.max(1.2, 0.12 * r), 0, TAU); g.fill(); }); }
          else if (im && im.complete && im.naturalWidth) g.drawImage(im, -size / 2, cy - size / 2, size, size);
          else { g.fillStyle = p.cameo.slug === 'rush' ? '#e23b3b' : p.cameo.slug === 'sync' ? '#7cc8ff' : '#26203a'; g.beginPath(); g.arc(0, cy, size * 0.45, 0, TAU); g.fill(); }
          return;
        }
        g.save();
        if (!dark && p.pose === 'sleep' && !stand) g.rotate(0.16); else g.rotate(Lk.tilt);
        if (stand) {
          g.strokeStyle = dark ? sil : Lk.top; g.lineWidth = 0.46 * r; g.lineCap = 'round';
          [-1, 1].forEach(sg => { g.beginPath(); g.moveTo(sg * 1.05 * r, 1.25 * r); g.quadraticCurveTo(sg * 1.75 * r, 0.2 * r, sg * 1.42 * r, -1.0 * r); g.stroke(); hand(g, r, sg * 1.42 * r, -1.1 * r, dark ? sil : Lk.skin); });
        }
        g.fillStyle = dark ? sil : Lk.hairC; hairBack(g, r, Lk.hair);
        g.fillStyle = dark ? sil : Lk.top; torso(g, r); g.fill();
        if (!dark) {
          g.fillStyle = 'rgba(0,0,0,0.14)'; g.beginPath(); g.moveTo(-0.32 * r, 0.82 * r); g.lineTo(0, 1.25 * r); g.lineTo(0.32 * r, 0.82 * r); g.closePath(); g.fill();
          if (V.id === 'wedding' || V.id === 'allhands') { g.fillStyle = '#f4efe6'; g.beginPath(); g.moveTo(-0.36 * r, 0.8 * r); g.lineTo(0, 1.32 * r); g.lineTo(0.36 * r, 0.8 * r); g.lineTo(0.18 * r, 0.8 * r); g.lineTo(0, 1.05 * r); g.lineTo(-0.18 * r, 0.8 * r); g.closePath(); g.fill(); }
          const shg = g.createLinearGradient(0, 0.8 * r, 0, 3.2 * r); shg.addColorStop(0, 'rgba(255,255,255,0.10)'); shg.addColorStop(1, 'rgba(0,0,0,0.25)'); g.fillStyle = shg; torso(g, r); g.fill();
        }
        g.fillStyle = dark ? sil : Lk.skin; g.fillRect(-0.28 * r, 0.55 * r, 0.56 * r, 0.42 * r);
        g.beginPath(); g.arc(-0.98 * r, 0.12 * r, 0.2 * r, 0, TAU); g.arc(0.98 * r, 0.12 * r, 0.2 * r, 0, TAU); g.fill();
        g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
        if (!dark) { const hg = g.createRadialGradient(-0.35 * r, -0.4 * r, 0, -0.35 * r, -0.4 * r, 1.2 * r); hg.addColorStop(0, 'rgba(255,255,255,0.22)'); hg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = hg; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); }
        g.fillStyle = dark ? sil : Lk.hairC; hairFront(g, r, Lk.hair);
        if (Lk.ear && !dark) { g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(-0.98 * r, 0.42 * r, Math.max(1, 0.1 * r), 0, TAU); g.arc(0.98 * r, 0.42 * r, Math.max(1, 0.1 * r), 0, TAU); g.fill(); }
        if (dark) {
          g.strokeStyle = rim; g.lineWidth = Math.max(1, 0.08 * r);
          g.beginPath(); g.arc(0, 0, r * (Lk.hair === 'afro' ? 1.5 : 1.06), Math.PI * 1.12, Math.PI * 1.88); g.stroke();
          g.beginPath(); g.moveTo(-1.3 * r, 1.5 * r); g.quadraticCurveTo(-1.2 * r, 0.95 * r, -0.5 * r, 0.82 * r); g.moveTo(1.3 * r, 1.5 * r); g.quadraticCurveTo(1.2 * r, 0.95 * r, 0.5 * r, 0.82 * r); g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.92)'; [-1, 1].forEach(sg => { g.beginPath(); g.arc(sg * 0.35 * r, 0.12 * r, Math.max(1.05, 0.1 * r), 0, TAU); g.fill(); });
        } else {
          face(g, r, stand ? 'cheer' : p.pose, Lk);
          if (Lk.glasses) { g.strokeStyle = '#2a2230'; g.lineWidth = Math.max(1, 0.07 * r); [-1, 1].forEach(sg => { g.beginPath(); g.arc(sg * 0.36 * r, 0.1 * r, 0.25 * r, 0, TAU); g.stroke(); }); g.beginPath(); g.moveTo(-0.11 * r, 0.08 * r); g.lineTo(0.11 * r, 0.08 * r); g.stroke(); }
          if (Lk.phones) { g.strokeStyle = '#2b2f3a'; g.lineWidth = Math.max(1.2, 0.16 * r); g.beginPath(); g.arc(0, 0, 1.12 * r, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); g.fillStyle = '#e5484d'; [-1, 1].forEach(sg => { rr(g, sg * 1.12 * r - 0.2 * r, -0.1 * r, 0.4 * r, 0.56 * r, 0.14 * r); g.fill(); }); }
          if (!stand) props(g, r, p.pose, Lk);
        }
        g.restore();
      }
      function drawSeat(g, p, mode) {
        const r = p.r, dark = mode === 'dark', br = isBright(), s = V.seat, col = dark ? (br ? s.b : s.d) : (s.lit2 && p.j % 2 ? s.lit2 : s.lit);
        if (V.id === 'grand') {
          g.fillStyle = col; rr(g, -1.5 * r, -0.25 * r, 3.0 * r, 3.5 * r, 0.8 * r); g.fill();
          g.fillStyle = shade(col, -0.28); rr(g, -1.18 * r, 0.12 * r, 2.36 * r, 3.1 * r, 0.6 * r); g.fill();
          g.strokeStyle = dark ? rgba(s.trim, br ? 0.35 : 0.22) : s.trim; g.lineWidth = Math.max(1, 0.1 * r); rr(g, -1.5 * r, -0.25 * r, 3.0 * r, 3.5 * r, 0.8 * r); g.stroke();
        } else if (V.id === 'hall') {
          g.fillStyle = shade(col, -0.2); g.fillRect(-1.25 * r, 1.2 * r, 0.14 * r, 2 * r); g.fillRect(1.11 * r, 1.2 * r, 0.14 * r, 2 * r);
          g.fillStyle = col; rr(g, -1.3 * r, 0.25 * r, 2.6 * r, 1.25 * r, 0.35 * r); g.fill();
          if (!dark) { g.fillStyle = 'rgba(255,255,255,0.22)'; rr(g, -1.1 * r, 0.36 * r, 2.2 * r, 0.22 * r, 0.1 * r); g.fill(); }
        } else if (V.id === 'allhands') {
          g.fillStyle = col; rr(g, -1.36 * r, -0.6 * r, 2.72 * r, 3.6 * r, 0.9 * r); g.fill();
          g.strokeStyle = dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)'; g.lineWidth = 1;
          for (let x = -1.2; x <= 1.2; x += 0.24) { g.beginPath(); g.moveTo(x * r, -0.4 * r); g.lineTo(x * r, 2.9 * r); g.stroke(); }
        } else if (V.id === 'wedding') {
          g.fillStyle = col; g.fillRect(-1.3 * r, -0.2 * r, 0.2 * r, 3.4 * r); g.fillRect(1.1 * r, -0.2 * r, 0.2 * r, 3.4 * r);
          [0.0, 0.5, 1.0].forEach(y => { rr(g, -1.3 * r, y * r, 2.6 * r, 0.24 * r, 0.1 * r); g.fill(); });
          if (!dark) { g.fillStyle = s.bow; g.beginPath(); g.ellipse(1.42 * r, 0.25 * r, 0.3 * r, 0.18 * r, 0.5, 0, TAU); g.ellipse(1.42 * r, 0.6 * r, 0.3 * r, 0.18 * r, -0.5, 0, TAU); g.fill(); g.fillRect(1.36 * r, 0.42 * r, 0.12 * r, 0.9 * r); }
        }
      }
      function tileRect(p) { const r = p.r; return { x: -1.45 * r, y: -1.3 * r, w: 2.9 * r, h: 3.55 * r }; }
      function drawTile(g, p, mode, withPerson) {
        const r = p.r, dark = mode === 'dark', br = isBright(), t = tileRect(p);
        g.fillStyle = dark ? (br ? '#6a7080' : '#11141c') : p.look.room; rr(g, t.x, t.y, t.w, t.h, 0.28 * r); g.fill();
        if (!dark) { g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(t.x + 0.2 * r, t.y + 0.35 * r, 0.8 * r, 1.1 * r); g.fillStyle = shade(p.look.room, -0.18); g.fillRect(t.x + t.w - 0.75 * r, t.y + 0.3 * r, 0.12 * r, 1.4 * r); g.fillRect(t.x + t.w - 0.95 * r, t.y + 0.5 * r, 0.12 * r, 1.2 * r); }
        if (withPerson) { g.save(); rr(g, t.x, t.y, t.w, t.h, 0.28 * r); g.clip(); drawPerson(g, p, mode); g.restore(); }
        g.strokeStyle = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.25)'; g.lineWidth = 1; rr(g, t.x, t.y, t.w, t.h, 0.28 * r); g.stroke();
        g.fillStyle = dark ? 'rgba(255,255,255,0.18)' : '#e5484d'; g.beginPath(); g.arc(t.x + t.w - 0.42 * r, t.y + t.h - 0.42 * r, 0.18 * r, 0, TAU); g.fill();
      }
      function sprite(p, mode) {
        if (p.spr[mode]) return p.spr[mode];
        const r = p.r, dpr = cv.dpr || 1, c = document.createElement('canvas');
        c.width = Math.max(2, Math.ceil(4 * r * dpr)); c.height = Math.max(2, Math.ceil(6 * r * dpr));
        const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.translate(2 * r, 2.6 * r);
        if (V.layout === 'grid') drawTile(g, p, mode, true); else drawPerson(g, p, mode);
        p.spr[mode] = c; return c;
      }
      const drawSprite = (g, p, mode, dy) => g.drawImage(sprite(p, mode), p.x - 2 * p.r, p.y - 2.6 * p.r + (dy || 0), 4 * p.r, 6 * p.r);

      /* the room behind and around the audience */
      function drawWall(g, mode) {
        const W = M.W, Hb = M.houseBottom, br = isBright(), lit = mode !== 'dark', pal = lit ? (br ? V.wall.litB : V.wall.lit) : br ? V.wall.b : V.wall.d;
        const gr = g.createLinearGradient(0, 0, 0, Hb); gr.addColorStop(0, pal[0]); gr.addColorStop(1, pal[1]); g.fillStyle = gr; g.fillRect(0, 0, W, Hb + 2);
        const bx = M.booth.x, by = M.booth.y, gold = lit ? '#e2bd63' : br ? 'rgba(255,240,200,0.4)' : 'rgba(217,180,92,0.22)';
        if (V.id === 'grand') {
          g.save(); g.globalAlpha = lit ? 0.16 : br ? 0.16 : 0.08; g.strokeStyle = '#e2bd63'; g.lineWidth = 1.2;
          for (let i = 0; i < 26; i++) { const a = Math.PI * (0.02 + 0.96 * i / 25); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(a) * W, by + Math.sin(a) * W * 0.9); g.stroke(); }
          g.restore();
          [[0.08, 1], [0.92, -1]].forEach(([fx]) => { const x = W * fx, y = by + 4, w = M.phone ? 46 : 92, hh = M.phone ? 54 : 84; g.fillStyle = lit ? '#2a1420' : br ? '#4a5068' : '#04050b'; g.beginPath(); g.moveTo(x - w / 2, y + hh); g.lineTo(x - w / 2, y + w / 2); g.arc(x, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w / 2, y + hh); g.closePath(); g.fill(); g.strokeStyle = gold; g.lineWidth = 2; g.stroke(); g.fillStyle = lit ? '#8a2434' : br ? '#6b5468' : '#1a0c14'; g.fillRect(x - w / 2, y + hh - 10, w, 10); });
          const ry = by + (M.phone ? 40 : 52);
          g.fillStyle = lit ? '#4a2430' : br ? '#666c86' : '#080a14'; g.beginPath(); g.moveTo(0, ry - 8); g.quadraticCurveTo(W / 2, ry + 26, W, ry - 8); g.lineTo(W, ry + 12); g.quadraticCurveTo(W / 2, ry + 46, 0, ry + 12); g.closePath(); g.fill();
          g.strokeStyle = gold; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, ry - 8); g.quadraticCurveTo(W / 2, ry + 26, W, ry - 8); g.stroke();
          for (let i = 1; i < 10; i++) { const x = W * i / 10, y = ry + 2 + 34 * (1 - Math.pow((x - W / 2) / (W / 2), 2)) * 0.5; g.fillStyle = lit ? 'rgba(255,214,140,0.95)' : 'rgba(255,214,140,0.28)'; g.beginPath(); g.arc(x, y, M.phone ? 2 : 3, 0, TAU); g.fill(); }
          g.fillStyle = lit ? '#1a1018' : '#020308'; rr(g, bx - (M.phone ? 30 : 40), by - 16, M.phone ? 60 : 80, 30, 4); g.fill(); g.strokeStyle = gold; g.lineWidth = 1.5; g.stroke();
        } else if (V.id === 'hall') {
          const wood = lit ? '#c99a5c' : br ? '#8c8478' : '#1a1712';
          [[0, 1], [W, -1]].forEach(([x0, d]) => { for (let i = 0; i < 2; i++) { const x = x0 + d * (10 + i * 24); g.fillStyle = wood; g.fillRect(x - 3, M.houseTop - 10, 6, Hb - M.houseTop); } for (let y = M.houseTop; y < Hb; y += 22) { g.fillRect(Math.min(x0 + d * 10, x0 + d * 34) - 3, y, 30, 4); } });
          const cols = ['#e2574c', '#f2c14e', '#3b7dd8', '#5bb36a', '#9b6bd3'];
          g.strokeStyle = lit ? 'rgba(80,60,40,0.7)' : 'rgba(255,255,255,0.12)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, M.houseTop + 6); g.quadraticCurveTo(W / 2, M.houseTop + 40, W, M.houseTop + 6); g.stroke();
          for (let i = 0; i < 14; i++) { const t = (i + 0.5) / 14, x = W * t, y = M.houseTop + 6 + 34 * 2 * t * (1 - t) * 1; g.fillStyle = lit ? cols[i % cols.length] : br ? rgba(cols[i % cols.length], 0.45) : rgba(cols[i % cols.length], 0.16); g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x + 7, y); g.lineTo(x, y + 13); g.closePath(); g.fill(); }
          const hx = W * 0.2, hy = by + 6; g.fillStyle = lit ? '#f4f1e8' : br ? '#9a9a9a' : '#14171a'; g.fillRect(hx - 26, hy - 18, 52, 34); g.strokeStyle = lit ? '#e8742c' : 'rgba(232,116,44,0.35)'; g.lineWidth = 2.5; g.strokeRect(hx - 10, hy - 4, 20, 13); g.beginPath(); g.ellipse(hx, hy + 18, 12, 3.5, 0, 0, TAU); g.stroke();
          const cx = W * 0.82, cy = by; g.fillStyle = lit ? '#fbf8f0' : br ? '#a3a6a2' : '#121614'; g.beginPath(); g.arc(cx, cy, 15, 0, TAU); g.fill(); g.strokeStyle = lit ? '#30343a' : 'rgba(255,255,255,0.2)'; g.lineWidth = 2; g.stroke(); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy - 9); g.moveTo(cx, cy); g.lineTo(cx + 6, cy + 3); g.stroke();
          g.fillStyle = lit ? '#2a2f33' : '#050607'; g.fillRect(bx - 44, by - 10, 88, 8); for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(bx - 33 + i * 22, by + 4, 7, 0, TAU); g.fill(); }
        } else if (V.id === 'allhands') {
          const top = M.houseTop + 6, bot = M.rowsTop + 10;
          for (let i = 0; i < 4; i++) {
            const x0 = W * (0.04 + i * 0.24), w = W * 0.2;
            g.fillStyle = lit ? '#1d2b3e' : br ? '#566274' : '#03060b'; g.fillRect(x0, top, w, bot - top);
            for (let b = 0; b < 5; b++) { const bw = w / 5, bh = (bot - top) * (0.3 + ((i * 7 + b * 3) % 5) * 0.12); g.fillStyle = lit ? '#2f405a' : br ? '#6a7688' : '#0a111b'; g.fillRect(x0 + b * bw, bot - bh, bw - 2, bh); for (let wy = bot - bh + 5; wy < bot - 4; wy += 7) for (let wx = x0 + b * bw + 3; wx < x0 + (b + 1) * bw - 5; wx += 6) if (((wx * 13 + wy * 7) | 0) % 5 < 2) { g.fillStyle = lit ? 'rgba(255,220,140,0.75)' : br ? 'rgba(255,240,200,0.5)' : 'rgba(255,214,140,0.35)'; g.fillRect(wx, wy, 2, 3); } }
            g.strokeStyle = lit ? '#9fb2c4' : 'rgba(255,255,255,0.12)'; g.lineWidth = 3; g.strokeRect(x0, top, w, bot - top);
          }
          g.fillStyle = lit ? '#cfd6de' : br ? '#7a8290' : '#0b0d12'; g.fillRect(bx - 2, M.houseTop - 10, 4, by - M.houseTop + 2); rr(g, bx - 26, by - 10, 52, 22, 5); g.fill();
          [[0.04, 1], [0.96, -1]].forEach(([fx]) => { const x = W * fx, y = M.rowsTop - 4; g.fillStyle = lit ? '#7a4a2a' : br ? '#6b6560' : '#0c0a08'; g.fillRect(x - 10, y, 20, 22); g.fillStyle = lit ? '#3f8a4f' : br ? '#6f8a76' : '#08120b'; for (let l = 0; l < 6; l++) { g.beginPath(); g.ellipse(x + Math.cos(l) * 9, y - 8 - (l % 3) * 9, 6, 13, l, 0, TAU); g.fill(); } });
        } else if (V.id === 'wedding') {
          g.fillStyle = lit ? '#fff2d6' : br ? 'rgba(255,255,255,0.7)' : 'rgba(240,235,255,0.6)'; g.beginPath(); g.arc(W * 0.78, M.houseTop + 40, M.phone ? 16 : 24, 0, TAU); g.fill();
          [[0, 1], [W, -1]].forEach(([x0, d]) => { g.fillStyle = lit ? '#4d6b45' : br ? '#58606f' : '#05050d'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(x0 + d * (8 + (i % 3) * 22), M.houseTop + 30 + i * 30, 30 + (i % 2) * 10, 0, TAU); g.fill(); } });
          for (let s = 0; s < 3; s++) {
            const y0 = M.houseTop + 14 + s * 36, sag = 26 + s * 6;
            g.strokeStyle = lit ? 'rgba(60,40,40,0.5)' : 'rgba(255,255,255,0.14)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, y0); g.quadraticCurveTo(W / 2, y0 + sag * 2, W, y0); g.stroke();
            for (let i = 1; i < 16; i++) { const t = i / 16, x = W * t, y = y0 + sag * 2 * 2 * t * (1 - t); const gl = K.glowSprite('#ffd98a'); g.globalAlpha = lit ? 0.95 : 0.55; g.drawImage(gl, x - 7, y - 7, 14, 14); g.globalAlpha = 1; g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); }
          }
          g.fillStyle = lit ? '#3a2a30' : '#020206'; g.fillRect(bx - 2, by, 4, M.rowsTop - by); rr(g, bx - 16, by - 12, 32, 22, 6); g.fill();
        } else if (V.id === 'call') {
          g.fillStyle = lit ? '#2f3546' : br ? '#7a8090' : '#151822'; rr(g, W * 0.18, M.houseTop + 4, W * 0.64, 34, 17); g.fill();
          for (let i = 0; i < 5; i++) { g.fillStyle = i === 4 ? (lit ? '#e5484d' : 'rgba(229,72,77,0.4)') : (lit ? '#4a5268' : 'rgba(255,255,255,0.1)'); g.beginPath(); g.arc(W * 0.18 + 30 + i * (W * 0.64 - 60) / 4, M.houseTop + 21, 9, 0, TAU); g.fill(); }
          g.fillStyle = lit ? '#0f1219' : '#05060a'; rr(g, bx - 22, by - 10, 44, 20, 10); g.fill();
        }
      }
      function drawBand(g, mode) {
        const W = M.W, H = M.H, y0 = M.houseBottom, lit = mode !== 'dark', br = isBright();
        const f = V.floor, a = lit ? shade(f[0], 0.08) : br ? mixHex(f[0], '#8890a8', 0.55) : shade(f[0], -0.35), b = lit ? f[1] : br ? mixHex(f[1], '#a0a8bc', 0.55) : shade(f[1], -0.45);
        const gr = g.createLinearGradient(0, y0, 0, H); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, y0, W, H - y0);
        const vpx = W / 2, vpy = y0 - (M.phone ? 520 : 700);
        if (V.id === 'grand' || V.id === 'hall') {
          g.strokeStyle = lit ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
          for (let i = -12; i <= 12; i++) { const xb = W / 2 + i * W / 9; const t = (y0 - vpy) / (H - vpy); g.beginPath(); g.moveTo(lerp(vpx, xb, t), y0); g.lineTo(xb, H); g.stroke(); }
          if (V.id === 'hall') { g.strokeStyle = lit ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.12)'; g.lineWidth = 3; g.beginPath(); g.ellipse(W / 2, H + 40, W * 0.42, (H - y0) * 0.7, 0, Math.PI, 0); g.stroke(); }
        } else if (V.id === 'wedding') {
          g.fillStyle = lit ? '#f8f1e8' : br ? '#c8c4d0' : '#1a1820'; g.beginPath(); g.moveTo(W / 2 - 40, y0); g.lineTo(W / 2 + 40, y0); g.lineTo(W / 2 + W * 0.22, H); g.lineTo(W / 2 - W * 0.22, H); g.closePath(); g.fill();
          for (let i = 0; i < 26; i++) { const x = W / 2 + Math.sin(i * 2.3) * W * 0.18 * ((i % 7) / 7 + 0.3), y = y0 + 10 + ((i * 37) % (H - y0 - 20)); g.fillStyle = lit ? (i % 2 ? '#f29bb5' : '#ffd1dc') : 'rgba(242,155,181,0.25)'; g.beginPath(); g.ellipse(x, y, 3, 1.8, i, 0, TAU); g.fill(); }
        } else if (V.id === 'allhands') {
          g.fillStyle = lit ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)'; for (let y = y0 + 8; y < H; y += 14) for (let x = (y / 14 % 2) * 14; x < W; x += 28) g.fillRect(x, y, 6, 6);
        } else if (V.id === 'call') {
          g.fillStyle = lit ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)'; for (let i = 0; i < 6; i++) g.fillRect(0, y0 + 18 + i * 34, W, 2);
        }
        if (V.id !== 'call' && !lit) {
          const fx = W / 2, fy = y0 + (H - y0) * 0.5, sz = M.phone ? 16 : 22;
          g.save(); g.globalAlpha = lit ? 0.55 : br ? 0.35 : 0.22; g.fillStyle = lit ? 'rgba(255,214,150,0.25)' : 'rgba(255,214,150,0.12)'; g.beginPath(); g.ellipse(fx, fy, sz * 4.2, sz * 1.3, 0, 0, TAU); g.fill();
          g.globalAlpha = lit ? 0.9 : br ? 0.6 : 0.35; g.strokeStyle = V.id === 'wedding' ? '#f6f1ea' : '#f2d36b'; g.lineWidth = M.phone ? 4 : 5; g.lineCap = 'round';
          g.beginPath(); g.moveTo(fx - sz, fy - sz * 0.32); g.lineTo(fx + sz, fy + sz * 0.32); g.moveTo(fx + sz, fy - sz * 0.32); g.lineTo(fx - sz, fy + sz * 0.32); g.stroke(); g.restore();
        }
        g.fillStyle = lit ? '#e2bd63' : br ? '#c8b98a' : '#3a2c18'; g.fillRect(0, y0 - 1, W, 4);
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y0 + 3, W, 6);
        if (V.id !== 'call' && V.id !== 'wedding') {
          const n = M.phone ? 6 : 9;
          for (let i = 0; i < n; i++) { const x = W * (i + 0.5) / n; g.save(); g.globalCompositeOperation = br && !lit ? 'source-over' : 'lighter'; g.globalAlpha = lit ? 0.6 : 0.5; g.drawImage(K.glowSprite('#ffc46b'), x - 26, y0 - 22, 52, 34); g.restore(); g.fillStyle = '#1a120a'; g.beginPath(); g.ellipse(x, y0 + 4, 14, 6, 0, Math.PI, 0); g.fill(); g.fillStyle = '#ffe2a8'; g.fillRect(x - 6, y0 - 1, 12, 2); }
        }
      }
      /* composites: the whole house in the dark and in full light; the pool shows the lit one through a soft hole */
      const darkC = document.createElement('canvas'), litC = document.createElement('canvas');
      let litPat = null, compKey = '', dirty = true;
      function dirtyAll() { dirty = true; }
      function renderComposites() {
        const dpr = cv.dpr || 1, W = M.W, H = M.H; if (!W) return;
        people.forEach(p => { p.spr = {}; });
        [[darkC, 'dark'], [litC, 'lit']].forEach(([c, mode]) => {
          c.width = Math.max(2, Math.round(W * dpr)); c.height = Math.max(2, Math.round(H * dpr));
          const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
          drawWall(g, mode);
          for (let k = M.rows - 1; k >= 0; k--) {
            const row = M.byRow[k] || [];
            if (V.layout !== 'grid') row.forEach(p => { g.save(); g.translate(p.x, p.y); drawSeat(g, p, mode); g.restore(); });
            row.forEach(p => drawSprite(g, p, mode));
          }
          drawBand(g, mode);
        });
        litPat = null;
        try { litPat = cv.g.createPattern(litC, 'no-repeat'); if (litPat && litPat.setTransform && typeof DOMMatrix === 'function') litPat.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0])); else litPat = null; } catch (e) { litPat = null; }
        compKey = W + 'x' + H + ':' + dpr + ':' + (isBright() ? 'b' : 'd'); dirty = false;
      }
      /* the house as seen so far: the dark composite with every revealed face baked in at its after-glow (one draw per frame),
         and the twist's version with every seat under its own little light */
      const seenC = document.createElement('canvas'), spotC = document.createElement('canvas');
      let seenG = null, seenKey = '', spotKey = '';
      function patFor(g) {
        if (g === cv.g) return litPat;
        if (g.__pk === compKey) return g.__pat;
        let pt = null; try { pt = g.createPattern(litC, 'no-repeat'); if (pt && pt.setTransform && typeof DOMMatrix === 'function') pt.setTransform(new DOMMatrix([1 / (cv.dpr || 1), 0, 0, 1 / (cv.dpr || 1), 0, 0])); else pt = null; } catch (e) { pt = null; }
        g.__pat = pt; g.__pk = compKey; return pt;
      }
      function sizeLike(c) { const dpr = cv.dpr || 1; c.width = darkC.width; c.height = darkC.height; const g = c.getContext('2d', { alpha: false }); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.drawImage(darkC, 0, 0, M.W, M.H); return g; }
      const glowOf = (g, p, a) => softLit(g, p.x, p.y + 0.55 * p.r, p.r * 2.0, p.r * 2.25, a, 4);
      function rebuildSeen() { seenG = sizeLike(seenC); people.forEach(p => { if (p.baked) glowOf(seenG, p, 0.9); }); seenKey = compKey; }
      function bake(p) { p.baked = true; if (seenG && seenKey === compKey) glowOf(seenG, p, 0.9); }
      function rebuildSpot() { const g = sizeLike(spotC); people.forEach(p => glowOf(g, p, 1)); spotKey = compKey; }
      /* a soft ellipse of the lit house (concentric rings, each filled with the lit composite, so the edge stays soft) */
      function softLit(g, x, y, rx, ry, a, steps) {
        if (a <= 0.01 || rx < 2) return;
        const pat = patFor(g);
        if (!pat) { g.save(); g.beginPath(); g.ellipse(x, y, rx * 0.85, ry * 0.85, 0, 0, TAU); g.clip(); g.globalAlpha = a; g.drawImage(litC, 0, 0, M.W, M.H); g.restore(); return; }
        const inner = 0.5;
        g.save(); g.fillStyle = pat;
        g.globalAlpha = Math.min(1, a); g.beginPath(); g.ellipse(x, y, rx * inner, ry * inner, 0, 0, TAU); g.fill();
        for (let i = 0; i < steps; i++) {
          const d0 = inner + (1 - inner) * i / steps, d1 = inner + (1 - inner) * (i + 1) / steps, m = 1 - ((d0 + d1) / 2 - inner) / (1 - inner);
          g.globalAlpha = Math.min(1, a) * m * m * (3 - 2 * m);
          g.beginPath(); g.ellipse(x, y, rx * d1, ry * d1, 0, 0, TAU); g.moveTo(x + rx * d0, y); g.ellipse(x, y, rx * d0, ry * d0, 0, 0, TAU, true); g.fill();
        }
        g.restore();
      }
      /* cached light sprites */
      const sprites = {};
      function beamSprite(col) {
        const key = 'beam' + col; if (sprites[key]) return sprites[key];
        const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
        for (let i = 0; i < 9; i++) {
          const f = 1 - i / 10, w0 = 7 * f, w1 = 62 * f;
          const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, rgba(col, 0.16)); gr.addColorStop(0.5, rgba(col, 0.07)); gr.addColorStop(1, rgba(col, 0.045));
          g.fillStyle = gr; g.beginPath(); g.moveTo(64 - w0, 0); g.lineTo(64 + w0, 0); g.lineTo(64 + w1, 256); g.lineTo(64 - w1, 256); g.closePath(); g.fill();
        }
        return (sprites[key] = c);
      }
      function streakSprite() {
        if (sprites.streak) return sprites.streak;
        const c = document.createElement('canvas'); c.width = 256; c.height = 16; const g = c.getContext('2d');
        const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, 'rgba(160,200,255,0)'); gr.addColorStop(0.5, 'rgba(235,245,255,0.9)'); gr.addColorStop(1, 'rgba(160,200,255,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(128, 8, 128, 4, 0, 0, TAU); g.fill();
        return (sprites.streak = c);
      }
      function drawBeam(g, sx, sy, tx, ty, w1, alpha, col) {
        const dx = tx - sx, dy = ty - sy, len = Math.hypot(dx, dy); if (len < 4 || alpha <= 0.01) return;
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha;
        g.translate(sx, sy); g.rotate(Math.atan2(dy, dx) - Math.PI / 2); g.scale(w1 / 128, len / 256);
        g.drawImage(beamSprite(col), -64, 0); g.restore();
      }

      /* ---------------- thought bubbles ---------------- */
      const shown = [];
      function bubbleClear() { shown.splice(0).forEach(b => b.el.classList.remove('on')); }
      function bubble(p, text, kind, ms, tag) {
        let b = p.bub; if (!b) { b = h('div', { class: 'sp-bub' }); bubs.append(b); p.bub = b; }
        const ex = shown.findIndex(s => s.p === p); if (ex >= 0) shown.splice(ex, 1);
        b.className = 'sp-bub' + (kind ? ' ' + kind : '');
        b.replaceChildren(...(tag ? [h('i', { text: tag })] : []), document.createTextNode(text));
        const bw = M.phone ? Math.min(176, M.W * 0.46) : 230;
        b.style.setProperty('--bw', bw + 'px');
        const w = Math.min(bw, b.offsetWidth || bw), hh = b.offsetHeight || 40;
        const top0 = M.phone ? 112 : 108, gapY = 18;
        const cands = [];
        const above = p.y - p.r * (p.cameo ? 2.05 : 1.45) - gapY - hh, below = p.y + p.r * 1.7 + gapY;
        [0, -0.62, 0.62].forEach(sh => cands.push({ x: p.x - w / 2 + sh * w, y: above, below: false }));
        cands.push({ x: p.x - w / 2, y: below, below: true });
        const fit = (c) => { c.x = clamp(c.x, 8, M.W - 8 - w); return c.y >= top0 && c.y + hh <= M.houseBottom - 6; };
        const overl = (c) => shown.some(s => !(c.x + w + 6 < s.x || s.x + s.w + 6 < c.x || c.y + hh + 6 < s.y || s.y + s.h + 6 < c.y));
        let pick = null;
        for (let pass = 0; pass < 8 && !pick; pass++) {
          for (const c of cands) { if (fit(c) && !overl(c)) { pick = c; break; } }
          if (pick) break;
          // make room: drop whichever visible bubble is in the way of the preferred spot (oldest first, kind ones last)
          const want = cands.find(c => fit(c)) || cands[0];
          const blockers = shown.filter(s2 => !(want.x + w + 6 < s2.x || s2.x + s2.w + 6 < want.x || want.y + hh + 6 < s2.y || s2.y + s2.h + 6 < want.y));
          const victim = (blockers.length ? blockers : shown).slice().sort((x, y) => (x.prio - y.prio) || (x.t0 - y.t0))[0];
          if (!victim) { pick = want; break; }
          hideBub(victim, true);
        }
        if (!pick) { pick = cands[0]; fit(pick); }
        b.classList.toggle('below', pick.below);
        b.style.left = Math.round(pick.x) + 'px'; b.style.top = Math.round(pick.y) + 'px';
        b.style.setProperty('--tx', Math.round(clamp(p.x - pick.x, 14, w - 14)) + 'px');
        void b.offsetWidth; b.classList.add('on');
        shown.push({ p, el: b, x: pick.x, y: pick.y, w, h: hh, t0: now(), until: now() + ms, prio: kind === 'kind' });
        if (shown.length > (M.phone ? 3 : 5)) hideBub(shown.filter(s2 => !s2.prio).sort((x, y) => x.t0 - y.t0)[0] || shown[0], true);
      }
      function hideBub(s, fast) {
        if (!s) return;
        if (fast) { s.el.style.transition = 'none'; s.el.classList.remove('on'); void s.el.offsetWidth; s.el.style.transition = ''; } else s.el.classList.remove('on');
        const i = shown.indexOf(s); if (i >= 0) shown.splice(i, 1);
      }

      /* ---------------- the replay card, the lighting desk, the fair version ---------------- */
      const MINI = '<svg viewBox="0 0 80 64" aria-hidden="true"><rect width="80" height="64" fill="#140f1e"/><path d="M33 0h14l17 50H16z" fill="#eaf3ff" opacity=".2"/><ellipse cx="40" cy="51" rx="20" ry="4" fill="#eaf3ff" opacity=".35"/>' +
        '<rect y="50" width="80" height="14" fill="#3a2414"/><g class="sp-fig"><circle cx="40" cy="31" r="5" fill="#f2d4b6"/><path d="M33 50q0-12 7-13 7 1 7 13z" fill="#c2414b"/><path d="M36 34l-5-4M44 34l5-4" stroke="#f2d4b6" stroke-width="2" stroke-linecap="round"/></g>' +
        '<g class="sp-loop"><path d="M74 11a6 6 0 1 1-2-4.5" fill="none" stroke="#e8c46a" stroke-width="2" stroke-linecap="round"/><path d="M72 3v4h-4" fill="none" stroke="#e8c46a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>' +
        '<g fill="#fff" opacity=".85"><circle cx="12" cy="20" r="1"/><circle cx="16" cy="20" r="1"/><circle cx="62" cy="26" r="1"/><circle cx="66" cy="26" r="1"/><circle cx="20" cy="34" r="1"/><circle cx="24" cy="34" r="1"/></g></svg>';
      let goBtn = null, sitEl = null, hotEl = null;
      function fillReplay() {
        if (!sitEl) return;
        const sit = noWords ? '' : tidy(an.situation, 130), th = noWords ? '' : tidy(an.thought || an.conclusion, 90);
        sitEl.replaceChildren(sit ? h('span', { class: 'gk-user', text: sit }) : document.createTextNode('That moment you keep replaying.'));
        hotEl.replaceChildren(document.createTextNode('“'), th ? h('span', { class: 'gk-user', text: th.replace(/[.!]$/, '') }) : document.createTextNode('Everyone saw. Everyone’s still thinking about it'), document.createTextNode('”'));
      }
      function showCard(nodes, cls) {
        if (card) { const old = card; old.classList.add('sp-out'); S.later(() => old.remove(), 380); }
        card = h('div', { class: 'sp-card' + (cls ? ' ' + cls : '') }, ...nodes);
        el.append(card); placeUI();
        return card;
      }
      function floatOver(btn) { P.floatBtn = btn; placeUI(); }
      function hideCard() { if (card) { const old = card; card = null; old.classList.add('sp-out'); S.later(() => old.remove(), 380); } }

      let fader = null, knob = null, readB = null, readBox = null, lockBtn = null, targetEl = null, deskQ = null, deskNote = null, verdictEl = null;
      function buildDesk() {
        if (desk) desk.remove();
        deskQ = h('div', { class: 'sp-q' });
        readB = h('b', { text: String(P.val) }); readBox = h('div', { class: 'sp-read', 'aria-hidden': 'true' }, readB, h('span', { text: 'of ' + N }));
        knob = h('div', { class: 'sp-knob' });
        targetEl = h('div', { class: 'sp-target', hidden: true }, h('b'));
        fader = h('div', { class: 'sp-fader', role: 'slider', tabindex: '0', 'aria-valuemin': '0', 'aria-valuemax': String(N), 'aria-valuenow': String(P.val), 'aria-label': 'How many noticed' },
          h('div', { class: 'sp-groove' }), h('div', { class: 'sp-ticks' }), h('div', { class: 'sp-fill' }), targetEl, knob);
        lockBtn = h('button', { type: 'button', class: 'sp-btn', text: 'Lock it in' });
        verdictEl = h('div', { class: 'sp-verdict', hidden: true });
        deskNote = h('div', { class: 'sp-note', hidden: true });
        desk = h('div', { class: 'sp-desk' }, deskQ, readBox, fader, h('div', { class: 'sp-ends' }, h('span', { text: '0 · nobody' }), h('span', { text: N + ' · everyone' })), verdictEl, lockBtn, deskNote);
        el.append(desk); placeUI();
        setVal(P.val, true);
        K.drag(fader, {
          start: (p) => { if (P.phase !== 'guess' && P.phase !== 'compare') return false; K.sfx.tap(); faderTo(p.x); },
          move: (p) => { if (P.phase === 'guess' || P.phase === 'compare') { faderTo(p.x); const t = now(); if (t - (P.gd || 0) > 400) { P.gd = t; K.guideDone(); } } },
          end: () => { if (P.phase === 'compare') checkShrink(true); }
        });
        S.listen(fader, 'keydown', (e) => {
          if (P.phase !== 'guess' && P.phase !== 'compare') return;
          const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
          if (d) { e.preventDefault(); setVal(P.val + d); if (P.phase === 'compare') checkShrink(true); }
        });
        K.tap(lockBtn, () => lockGuess());
      }
      function faderTo(x) { const w = fader.clientWidth || 300; setVal(Math.round(clamp((x - 22) / Math.max(1, w - 44), 0, 1) * N)); }
      function setVal(v, quiet) {
        v = clamp(Math.round(v), 0, N);
        const changed = v !== P.val; P.val = v;
        fader.style.setProperty('--k', (v / N).toFixed(4)); readB.textContent = String(v); fader.setAttribute('aria-valuenow', String(v));
        if (changed && !quiet) {
          if (A.ctx) { A.click({ vol: 0.07 }); A.tone({ type: 'triangle', freq: 220 + v * 14, dur: 0.06, vol: 0.03 }); }
          readBox.classList.remove('bump'); void readBox.offsetWidth; readBox.classList.add('bump');
          if (P.phase === 'guess') { P.touched = true; if (!P.lockGuided) { P.lockGuided = true; K.guide({ id: 'lock', g: 'tap', target: lockBtn, label: 'LOCK IT IN', delay: 1600 }); } }
        }
        if (P.phase === 'guess') { P.glareT = 0.22 + 0.78 * (v / N); P.warmT = 0; }
        if (P.phase === 'compare') { const g0 = Math.max(1, P.guess); P.glareT = 0.12 + 0.88 * (v / N); P.warmT = clamp(1 - v / g0, 0, 1); }
      }

      /* ---------------- reveal ---------------- */
      function updHud(bump) {
        cellN.firstChild.textContent = String(P.noticed); cellB.firstChild.textContent = String(P.busy); cellD.firstChild.textContent = String(N - P.revealed);
        if (bump) { [bump].forEach(c => { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }); }
      }
      // new thoughts go into the album in small batches (storage writes stay out of the sweep's frames)
      const albumQ = [];
      function albumAdd(id) { if (!album.has('t:' + id)) { album.add('t:' + id); P.newThoughts++; albumQ.push('t:' + id); } }
      function albumFlush() { albumQ.splice(0).forEach(k => K.collect(k)); }
      const milestones = {};
      function reveal(p) {
        if (p.rev) return; p.rev = true; p.revT = now(); P.revealed++;
        if (p.kind === 'kind') P.noticed++; else P.busy++;
        albumAdd(p.tid);
        const tag = p.kind === 'kind' ? 'Noticed · kind' : p.kind === 'cameo' ? p.cameo.name : '';
        bubble(p, p.text, p.kind === 'kind' ? 'kind' : p.kind === 'cameo' ? 'cameo' : '', p.kind === 'kind' ? 3600 : 2600, tag);
        plink(p); S.buzz(p.kind === 'kind' ? [10, 40, 14] : 7);
        if (p.kind === 'kind') { kindChord(); FX.emit('star', p.x, p.y - p.r, 10, { colors: ['#ffe6a3', '#ffd36b', '#fff'] }); }
        else FX.emit('mote', p.x, p.y - p.r * 0.5, 6, { colors: [V.pool, '#ffffff'] });
        updHud(p.kind === 'kind' ? cellN : cellB); cellD.classList.remove('bump'); void cellD.offsetWidth; cellD.classList.add('bump');
        if (P.revealed === 1 || P.revealed === N) ctx.track('reveal', { n: P.revealed });
        const say = (key, o, mood) => { if (milestones[key]) return; milestones[key] = 1; patch.say(L(o), { mood, ms: 3200 }); };
        if (p.kind === 'kind') say('kind', { Jolly: 'This one noticed. And look how kind.', Cheeky: 'One noticed! Verdict: “happens to everyone.”', Unfiltered: 'One noticed. Kindly.' }, 'love');
        else if (P.revealed === 1) say('first', { Jolly: 'Ha! Not about you at all.', Cheeky: 'Plot twist: they’re thinking about snacks.', Unfiltered: 'Not about you.' }, 'laugh');
        else if (P.revealed === 6) say('six', { Jolly: 'Six people in, and nobody is replaying your moment.', Cheeky: 'So far the big story is soup and parking.', Unfiltered: 'Six in. None replaying it.' }, 'happy');
        else if (P.revealed === Math.round(N * 0.75)) say('most', { Jolly: 'Just a few left in the dark.', Cheeky: 'A few stragglers still in the shadows.', Unfiltered: 'A few left.' }, 'wink');
        if (P.revealed >= N) S.later(endSweep, 1100);
        else if (P.revealed >= Math.round(N * 0.8) && !P.moreGuided) { P.moreGuided = true; S.later(sweepGuide, 2500); }
      }
      function sweepGuide() {
        if (P.phase !== 'sweep') return;
        const left = people.filter(p => !p.rev);
        if (!left.length) return;
        if (P.revealed < Math.round(N * 0.8)) { K.guide({ id: 'sweep', g: 'drag', target: () => ({ x: P.pool.x, y: P.pool.y }), dir: P.pool.x > M.W / 2 ? 'l' : 'r', d: Math.min(150, M.W * 0.36), label: 'SWEEP THE LIGHT', delay: 900 }); return; }
        const t = left.sort((a, b) => Math.hypot(a.x - P.pool.x, a.y - P.pool.y) - Math.hypot(b.x - P.pool.x, b.y - P.pool.y))[0];
        K.guide({ id: 'sweep-more', g: 'drag', target: () => ({ x: P.pool.x, y: P.pool.y }), dx: t.x - P.pool.x, dy: t.y - P.pool.y, label: 'SOME STILL IN THE DARK', delay: 600 });
      }

      /* ---------------- input: the followspot ---------------- */
      const touchOff = () => M.pry * 0.45;
      function aimAt(x, y, e) {
        const off = e && e.pointerType === 'touch' ? touchOff() : 0;
        const top = P.phase === 'twistAsk' ? M.rigY - 10 : M.rowsTop - M.pry * 0.4;
        P.pool.tx = clamp(x, 10, M.W - 10); P.pool.ty = clamp(y - off, top, M.houseBottom - M.pry * 0.25);
      }
      K.drag(hit, {
        start: (p, e) => {
          if (P.phase !== 'sweep' && P.phase !== 'twistAsk') { pokeHouse(p); return false; }
          P.drag = true; P.last = { x: p.x, y: p.y, t: now() }; aimAt(p.x, p.y, e);
          K.sfx.tap(); if (A.ctx) A.tone({ type: 'triangle', freq: 180, to: 140, dur: 0.12, vol: 0.05 });
        },
        move: (p, d, e) => {
          if (!P.drag) return;
          const t = now(), dt = Math.max(1, t - P.last.t) / 1000, sp = Math.hypot(p.x - P.last.x, p.y - P.last.y) / dt;
          if (P.phase === 'sweep' && sp > 4) { P.moving += dt; if (sp < M.W * 0.95) P.calm += dt; }
          P.last = { x: p.x, y: p.y, t };
          aimAt(p.x, p.y, e);
          if (t - (P.gd || 0) > 400) { P.gd = t; K.guideDone(); }
        },
        end: () => { P.drag = false; if (P.phase === 'sweep') sweepGuide(); }
      });
      // a tap on the house outside the sweep still gets an answer: a ripple of blinks and a rustle
      function pokeHouse(p) {
        if (P.phase === 'finale' || P.phase === 'done' || P.phase === 'intro') return;
        K.sfx.tap(); rustle();
        people.forEach(q => { if (q.rev || q.cameo) return; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < M.spacing * 2.2) S.later(() => { q.blink = 0.16; }, d * 2.2); });
        FX.emit('mote', p.x, p.y, 5, { colors: ['#ffffff', V.pool] });
      }
      K.onKey(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'], (e) => {
        if (P.phase !== 'sweep' && P.phase !== 'twistAsk') return;
        e.preventDefault();
        const st = M.spacing * 0.7, dx = e.key === 'ArrowLeft' ? -st : e.key === 'ArrowRight' ? st : 0, dy = e.key === 'ArrowUp' ? -st : e.key === 'ArrowDown' ? st : 0;
        aimAt(P.pool.tx + dx, P.pool.ty + dy, null);
      });

      /* ---------------- the frame ---------------- */
      const motes = Array.from({ length: 34 }, () => ({ u: Math.random(), v: Math.random() * 2 - 1, s: 0.8 + Math.random() * 1.6, sp: 0.03 + Math.random() * 0.06, ph: Math.random() * TAU }));
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !M.W) return;
        const key = M.W + 'x' + M.H + ':' + (cv.dpr || 1) + ':' + (isBright() ? 'b' : 'd');
        if (dirty || key !== compKey) renderComposites();
        const tn = now(), rdt = Math.min(0.4, Math.max(0, (tn - (P.lastNow || tn)) / 1000)); P.lastNow = tn;
        const W = M.W, H = M.H, br = isBright();
        // physics: the instrument is heavy, so the pool follows on a spring (real time, in small steps)
        const pl = P.pool, kS = 70, cS = 2 * Math.sqrt(kS) * 0.82;
        for (let rem = rdt; rem > 1e-4; rem -= 0.025) { const st = Math.min(0.025, rem); pl.vx += (kS * (pl.tx - pl.x) - cS * pl.vx) * st; pl.vy += (kS * (pl.ty - pl.y) - cS * pl.vy) * st; pl.x += pl.vx * st; pl.y += pl.vy * st; }
        const ease = (k) => Math.min(1, rdt * k);
        pl.on += (pl.onT - pl.on) * ease(4);
        P.glare += (P.glareT - P.glare) * ease(5);
        P.warm += (P.warmT - P.warm) * ease(4);
        P.rigY += (P.rigT - P.rigY) * ease(3.2);
        P.house += (P.houseT - P.house) * ease(1.6);
        P.glints += (P.glintsT - P.glints) * ease(2);
        P.spotsOn += (P.spotsT - P.spotsOn) * ease(3);
        const speed = Math.hypot(pl.vx, pl.vy);
        if (whirr) { whirr.level(Math.min(0.05, speed / 9000) * (P.phase === 'sweep' || P.phase === 'twistAsk' ? 1 : 0), 0.08); whirr.freq(500 + Math.min(900, speed * 0.9), 0.1); }
        if (hum) { hum.level(0.006 + 0.05 * P.glare * (1 - P.warm * 0.7), 0.2); hum.freq(110 + 260 * P.glare, 0.2); }
        // reveal by dwelling under the pool
        if (P.phase === 'sweep' && pl.on > 0.6) {
          const DW = [0.18, 0.26, 0.3][inten] || 0.26;
          people.forEach(p => {
            if (p.rev) return;
            const d = Math.hypot((p.x - pl.x) / M.prx, (p.y - pl.y) / M.pry);
            if (d < 0.66) { p.dwell += rdt; if (p.dwell >= DW) reveal(p); } else p.dwell = Math.max(0, p.dwell - rdt * 0.5);
          });
        }
        people.forEach(p => { if (p.rev) p.glow = Math.min(0.9, p.glow + rdt * 2.4); });
        shown.slice().forEach(s => { if (now() > s.until) { const d = Math.hypot((s.p.x - pl.x) / M.prx, (s.p.y - pl.y) / M.pry); if (P.phase !== 'sweep' || d > 0.75 || now() > s.until + 2600) hideBub(s); } });
        // ---- draw ----
        const dip = P.dip;
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
        if (dip) { g.fillStyle = '#05070f'; g.fillRect(0, 0, W, dip + 1); g.translate(0, dip); }
        const inFinale = P.phase === 'finale' || P.phase === 'done';
        if (inFinale && P.house > 0.985) drawFinale(g, t, dt);
        else {
          if (seenKey !== compKey) rebuildSeen();
          g.drawImage(seenC, 0, 0, W, H + 1);
          // blinking eyes in the dark (they feel like they are all on you)
          if (P.glints > 0.02) {
            g.fillStyle = br ? '#535c76' : '#0a0f1e';
            people.forEach(p => {
              if (p.rev || p.cameo) return;
              p.nextBlink -= dt; if (p.nextBlink < 0) { p.blink = 0.14; p.nextBlink = 2 + Math.random() * 7; }
              if (p.blink > 0) { p.blink -= dt; const r = p.r; g.fillRect(p.x - 0.35 * r - 0.16 * r, p.y + 0.12 * r - 0.16 * r, 0.32 * r, 0.32 * r); g.fillRect(p.x + 0.35 * r - 0.16 * r, p.y + 0.12 * r - 0.16 * r, 0.32 * r, 0.32 * r); }
            });
          }
          if (P.glints < 0.98) { g.fillStyle = br ? 'rgba(83,92,118,' + (1 - P.glints).toFixed(3) + ')' : 'rgba(10,15,30,' + (1 - P.glints).toFixed(3) + ')'; people.forEach(p => { if (p.cameo || p.rev) return; const r = p.r; g.fillRect(p.x - 0.55 * r, p.y - 0.06 * r, 1.1 * r, 0.36 * r); }); }
          // after-glows still fading in (finished ones are baked into the seen house)
          people.forEach(p => { if (p.rev && !p.baked) { glowOf(g, p, p.glow); if (p.glow >= 0.9) bake(p); } });
          // the twist: every seat under its own small light
          if (P.spotsOn > 0.01 && P.spotFrac > 0) { if (spotKey !== compKey) rebuildSpot(); g.globalAlpha = Math.min(1, P.spotsOn * P.spotFrac); g.drawImage(spotC, 0, 0, W, H + 1); g.globalAlpha = 1; }
          // the followspot pool
          if (pl.on > 0.01) {
            softLit(g, pl.x, pl.y, M.prx, M.pry, pl.on, 9);
            g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (br ? 0.07 : 0.2) * pl.on;
            g.drawImage(K.glowSprite(V.pool), pl.x - M.prx * 1.2, pl.y - M.pry * 1.2, M.prx * 2.4, M.pry * 2.4); g.restore();
          }
          if (P.rigY > -50) drawRigSpots(g, t);
          drawGlare(g, t);
          if (pl.on > 0.01) drawLampAndBeam(g, t, dt);
          // thought dots while someone is being read
          if (inFinale) { g.save(); g.globalAlpha = P.house; drawFinale(g, t, dt); g.restore(); }
          if (P.phase === 'sweep') people.forEach(p => { if (!p.rev && p.dwell > 0.03) { const k = clamp(p.dwell / 0.26, 0, 1); g.fillStyle = 'rgba(255,248,230,' + (0.5 + 0.5 * k).toFixed(2) + ')'; for (let i = 0; i < 3; i++) { if (k < i / 3) break; g.beginPath(); g.arc(p.x - p.r * 0.5 + i * p.r * 0.5, p.y - p.r * 1.55 - Math.sin(t * 9 + i) * 1.5, Math.max(1.5, p.r * 0.13), 0, TAU); g.fill(); } } });
        }
        FX.update(dt); FX.draw(g);
      });
      function drawGlare(g, t) {
        const k = P.glare; if (k <= 0.01) return;
        const bx = M.booth.x, by = M.booth.y, br = isBright(), warm = P.warm;
        const col = mixHex(V.glare, '#ffc27a', warm), f = clamp((k - 0.03) / 0.3, 0, 1), on = f * f * (3 - 2 * f);
        // the harsh cone pours down onto you (the camera): wide, cold, dusty
        drawBeam(g, bx, by, bx, M.H + 60, M.W * (0.55 + 1.05 * k) * (1 - warm * 0.55), (br ? 0.5 : 0.85) * (0.3 + 0.7 * k) * on, col);
        g.save(); g.globalCompositeOperation = 'lighter';
        const R0 = (60 + 190 * k) * (M.phone ? 0.85 : 1.1) * (1 - warm * 0.45);
        g.globalAlpha = Math.min(1, 0.5 + 0.5 * k) * (br ? 0.55 : 1) * on; g.drawImage(K.glowSprite(col), bx - R0, by - R0, R0 * 2, R0 * 2);
        if (!reduced()) { const sw = M.W * (0.7 + 0.9 * k) * (1 - warm * 0.6); g.globalAlpha = (0.35 + 0.4 * k) * (1 - warm * 0.7) * on; g.drawImage(streakSprite(), bx - sw / 2, by - 5 - 7 * k, sw, 10 + 14 * k); }
        g.globalAlpha = 0.35 + 0.65 * on; const c0 = 10 + 22 * k; g.drawImage(K.glowSprite('#ffffff'), bx - c0, by - c0, c0 * 2, c0 * 2);
        g.restore();
        // veil: under a harsh light you can barely see the faces
        const veil = (br ? 0.12 : 0.2) * k * (1 - warm);
        if (veil > 0.005) { g.fillStyle = rgba(col, veil); g.fillRect(0, M.houseTop - 60, M.W, M.houseBottom - M.houseTop + 60); }
        // dust in the cone
        if (k > 0.05) {
          g.save(); g.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 26; i++) { const m = motes[i], u = (m.u + t * m.sp * 0.6) % 1, y = lerp(by, M.H, u), half = lerp(10, M.W * (0.3 + 0.5 * k), u), x = bx + m.v * half + Math.sin(t * 0.7 + m.ph) * 6; g.globalAlpha = 0.25 * k * (1 - u * 0.6); g.fillStyle = '#ffffff'; g.fillRect(x, y, m.s, m.s); }
          g.restore();
        }
      }
      function lampLens() { const a = P.lampAng; return { x: M.lamp.x + Math.cos(a) * (M.phone ? 40 : 52), y: M.lamp.y + Math.sin(a) * (M.phone ? 40 : 52) }; }
      function drawLampAndBeam(g, t, dt) {
        const pl = P.pool, L0 = M.lamp, want = Math.atan2(pl.y - L0.y, pl.x - L0.x);
        P.lampAng += (want - P.lampAng) * Math.min(1, dt * 14);
        const lens = lampLens(), on = pl.on, br = isBright();
        drawBeam(g, lens.x, lens.y, pl.x, pl.y, M.prx * 2.1, (br ? 0.5 : 0.9) * on, V.pool);
        // dust motes drifting in the beam
        g.save(); g.globalCompositeOperation = 'lighter';
        const dx = pl.x - lens.x, dy = pl.y - lens.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
        motes.forEach((m) => { const u = (m.u + t * m.sp) % 1, half = lerp(4, M.prx * 0.95, u), x = lens.x + dx * u + nx * m.v * half + Math.sin(t * 1.3 + m.ph) * 3, y = lens.y + dy * u + ny * m.v * half; g.globalAlpha = 0.35 * on * Math.sin(u * Math.PI); g.fillStyle = '#fff8e8'; g.fillRect(x, y, m.s, m.s); });
        g.restore();
        // the instrument: a stand, a yoke, a heavy barrel that turns to follow the pool
        const s = M.phone ? 1 : 1.3, x = L0.x, y = L0.y;
        g.save(); g.strokeStyle = '#0e1018'; g.lineCap = 'round'; g.lineWidth = 4 * s;
        g.beginPath(); g.moveTo(x, y + 8 * s); g.lineTo(x, y + 64 * s); g.moveTo(x, y + 52 * s); g.lineTo(x - 22 * s, y + 92 * s); g.moveTo(x, y + 52 * s); g.lineTo(x + 22 * s, y + 92 * s); g.moveTo(x, y + 52 * s); g.lineTo(x + 4 * s, y + 96 * s); g.stroke();
        g.lineWidth = 3 * s; g.strokeStyle = '#2a2f40'; g.beginPath(); g.arc(x, y, 20 * s, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
        g.translate(x, y); g.rotate(P.lampAng);
        const bg = g.createLinearGradient(0, -14 * s, 0, 14 * s); bg.addColorStop(0, '#3a4058'); bg.addColorStop(0.5, '#1a1d2b'); bg.addColorStop(1, '#0c0e16');
        g.fillStyle = bg; rr(g, -30 * s, -14 * s, 66 * s, 28 * s, 7 * s); g.fill();
        g.fillStyle = '#0b0c12'; rr(g, 30 * s, -17 * s, 14 * s, 34 * s, 4 * s); g.fill();
        g.fillStyle = '#4a5068'; g.fillRect(-14 * s, -14 * s, 3 * s, 28 * s); g.fillRect(-4 * s, -14 * s, 3 * s, 28 * s);
        g.strokeStyle = '#596080'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(-30 * s, 0); g.lineTo(-48 * s, 0); g.stroke();
        g.restore();
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = on; const gs = (M.phone ? 30 : 40) * (0.8 + 0.2 * Math.sin(t * 7)); g.drawImage(K.glowSprite(V.pool), lens.x - gs, lens.y - gs, gs * 2, gs * 2); g.restore();
      }
      function drawRigSpots(g, t) {
        const k = P.spotsOn, ry = P.rigY, br = isBright();
        // the lighting truss over the house: two rails and a zigzag, a little can for every seat
        g.save(); g.strokeStyle = br ? '#3a4058' : '#3a4262'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, ry - 6); g.lineTo(M.W, ry - 6); g.moveTo(0, ry + 4); g.lineTo(M.W, ry + 4); g.stroke();
        g.lineWidth = 1.5; g.beginPath(); for (let x = 0; x < M.W; x += 16) { g.moveTo(x, ry - 6); g.lineTo(x + 8, ry + 4); g.lineTo(x + 16, ry - 6); } g.stroke();
        g.strokeStyle = 'rgba(200,215,255,0.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, ry - 7.5); g.lineTo(M.W, ry - 7.5); g.stroke();
        g.restore();
        const pulse = P.phase === 'twistAsk' ? 0.35 + 0.35 * Math.sin(t * 5) : 0;
        people.forEach((p) => {
          const a = p.spot * k, lx = lerp(M.W / 2, p.x, 0.92);
          if (a > 0.01) drawBeam(g, lx, ry + 8, p.x, p.y + p.r * 0.4, p.r * 2.5, 0.36 * a, '#dfe9ff');
          g.fillStyle = '#151824'; rr(g, lx - 6, ry + 2, 12, 12, 3); g.fill();
          const gl = Math.max(a, pulse * 0.5);
          if (gl > 0.01) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = gl; g.drawImage(K.glowSprite('#dfe9ff'), lx - 10, ry - 2, 20, 20); g.restore(); }
        });
      }

      /* ---------------- finale drawing ---------------- */
      const fin = { wall: null, band: null, seats: [], ready: false, t0: 0 };
      function prepFinale() {
        if (fin.ready && fin.key === compKey) return;
        const dpr = cv.dpr || 1, W = M.W, H = M.H;
        const mk = (w, hh) => { const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(w * dpr)); c.height = Math.max(2, Math.round(hh * dpr)); const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); return [c, g]; };
        let g; [fin.wall, g] = mk(W, M.houseBottom + 2); drawWall(g, 'lit');
        [fin.band, g] = mk(W, H - M.houseBottom + 6); g.translate(0, -M.houseBottom + 4); drawBand(g, 'lit');
        fin.seats = M.byRow.map(row => {
          if (!row.length || V.layout === 'grid') return null;
          const r = row[0].r, top = Math.min(...row.map(p => p.y)) - r * 0.9, bot = Math.max(...row.map(p => p.y)) + r * 3.6;
          const [c, sg] = mk(W, bot - top); sg.translate(0, -top); row.forEach(p => { sg.save(); sg.translate(p.x, p.y); drawSeat(sg, p, 'lit'); sg.restore(); }); return { c, top, h: bot - top };
        });
        people.forEach(p => sprite(p, V.layout === 'grid' ? 'lit' : 'stand'));
        fin.ready = true; fin.key = compKey;
      }
      function drawFinale(g, t, dt) {
        if (!fin.ready || fin.key !== compKey) prepFinale();
        const W = M.W, H = M.H, e = (now() - fin.t0) / 1000, A0 = g.globalAlpha;
        g.drawImage(fin.wall, 0, 0, W, M.houseBottom + 2);
        for (let k = M.rows - 1; k >= 0; k--) {
          const row = M.byRow[k] || [], st = fin.seats[k];
          if (st) g.drawImage(st.c, 0, st.top, W, st.h);
          const rise = clamp((e - 0.5 - k * 0.32) / 0.5, 0, 1), ez = rise < 1 ? 1 - Math.pow(1 - rise, 3) : 1;
          row.forEach((p) => {
            if (V.layout === 'grid') { const j = Math.max(0, Math.sin(t * 7 + p.i * 1.7)) * 3 * rise; drawSprite(g, p, 'lit', -j); return; }
            const bounce = rise >= 1 ? Math.abs(Math.sin(t * 6.5 + p.i * 1.3)) * p.r * 0.18 : 0;
            if (ez < 0.5) drawSprite(g, p, 'lit', -p.r * 0.5 * ez * 2);
            else drawSprite(g, p, 'stand', -p.r * (0.6 + 0.35 * ez) - bounce);
          });
        }
        g.drawImage(fin.band, 0, M.houseBottom - 4, W, H - M.houseBottom + 6);
        // warm house lights
        g.save(); g.globalCompositeOperation = 'lighter';
        const hk = P.house * A0, brt = isBright() ? 0.35 : 1;
        g.globalAlpha = 0.32 * hk * brt; g.drawImage(K.glowSprite(V.warm), W / 2 - W * 0.9, M.houseTop - H * 0.35, W * 1.8, H * 0.95);
        g.globalAlpha = 0.5 * hk * brt; for (let i = 0; i < 5; i++) { const x = W * (0.1 + 0.2 * i); g.drawImage(K.glowSprite('#ffd9a0'), x - 60, M.houseTop + 10 - 60, 120, 120); }
        g.restore();
        g.save(); g.globalAlpha = A0;
        for (let i = 0; i < 5; i++) { const x = W * (0.1 + 0.2 * i), y = M.houseTop + 10; g.fillStyle = '#7a5a2a'; g.beginPath(); g.moveTo(x - 9, y + 8); g.lineTo(x + 9, y + 8); g.lineTo(x + 5, y - 4); g.lineTo(x - 5, y - 4); g.closePath(); g.fill(); g.fillStyle = '#fff1cc'; g.beginPath(); g.ellipse(x, y - 4, 6, 3, 0, 0, TAU); g.fill(); }
        g.restore();
        // roses arcing onto the stage
        P.roses.forEach(ro => {
          const k = clamp((now() - ro.t0) / ro.ms, 0, 1); if (k <= 0) return;
          const x = lerp(ro.x0, ro.x1, k), y = lerp(ro.y0, ro.y1, k) - Math.sin(k * Math.PI) * ro.arc, a = ro.r0 + ro.spin * k;
          if (k >= 1 && !ro.landed) { ro.landed = true; if (A.ctx && Math.random() < 0.5) A.tone({ type: 'sine', freq: 300 + Math.random() * 120, to: 200, dur: 0.08, vol: 0.03 }); }
          drawRose(g, x, y, a, ro.s);
        });
        void dt;
      }
      function drawRose(g, x, y, a, s) {
        g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s);
        g.strokeStyle = '#3f7a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 2); g.lineTo(0, 18); g.stroke();
        g.fillStyle = '#4f9a48'; g.beginPath(); g.ellipse(3.5, 11, 3.5, 1.8, -0.6, 0, TAU); g.fill();
        g.fillStyle = '#c81d3a'; g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill();
        g.fillStyle = '#e8364f'; g.beginPath(); g.arc(-1.5, -1.5, 4, 0, TAU); g.fill();
        g.strokeStyle = '#8a0f24'; g.lineWidth = 1.2; g.beginPath(); g.arc(0.5, -0.5, 2.4, 0.4, 4.4); g.stroke();
        g.restore();
      }

      /* ---------------- lines (every one in three vibes) ---------------- */
      const LN = {
        replay: visits ? { Jolly: 'Back under the big light. Same feeling: every eye on you. Let’s check the house.', Cheeky: 'Encore of the cringe? Fine. Let’s see who’s actually watching.', Unfiltered: 'Back on stage. Check the house.' }
          : { Jolly: 'That moment again, under the big light. Feels like every eye is on you, right?', Cheeky: 'Ah, the greatest hit. On repeat, under a very rude light.', Unfiltered: 'Same moment, on loop, under a harsh light.' },
        guess: { Jolly: 'Be honest: how many of them are thinking about it?', Cheeky: 'Go on. How many are judging you? Gut number.', Unfiltered: 'Guess. How many noticed?' },
        guessBig: { Jolly: 'That’s a big light to stand under. Let’s test it.', Cheeky: 'Oof. That’s a lot of imaginary eyeballs.', Unfiltered: 'Big number. Test it.' },
        guessSmall: { Jolly: 'A small number. Let’s see if the house agrees.', Cheeky: 'Modest. Let’s check the receipts.', Unfiltered: 'Small number. Check it.' },
        take: { Jolly: 'Your turn to hold the light. Sweep it slowly and read their minds. Pretend audience, real pattern.', Cheeky: 'Grab the spotlight. Pretend audience, very real effect. Sweep away.', Unfiltered: 'Take the light. Sweep slowly. Read minds.' },
        twistAsk: { Jolly: 'Everyone’s seen! Now swing the light up to the rig. Trust me.', Cheeky: 'Fling that light at the ceiling. Something’s up there.', Unfiltered: 'Swing it up to the rig.' },
        twist: { Jolly: 'Look! Every single one of them feels watched too. That’s the spotlight effect.', Cheeky: 'Everybody thinks they’re the main character. It’s called the spotlight effect.', Unfiltered: 'They all feel watched. The spotlight effect.' },
        shrink: { Jolly: 'Now your spotlight. Pull it down to its real size.', Cheeky: 'Your light is wildly oversized. Pull it down.', Unfiltered: 'Pull your light to real size.' },
        shrinkUp: { Jolly: 'You guessed low! Set your light to the real number.', Cheeky: 'Look at you, underestimating. Set it to the real number.', Unfiltered: 'Set it to the real number.' },
        shrunk: { Jolly: 'That’s its real size. Much easier to stand in.', Cheeky: 'Much better. You can actually see the audience now.', Unfiltered: 'Real size.' },
        bow: { Jolly: 'Take a bow. You were human in public. Brave.', Cheeky: 'Now bow. Milk it.', Unfiltered: 'Take a bow.' },
        end: { Jolly: 'Take it in. That noise is for you.', Cheeky: 'Encore! Most relatable moment of the night.', Unfiltered: 'Hear that? Yours.' },
        endReal: { Jolly: 'Real worry, real plan, and a whole house on your side.', Cheeky: 'Fewer eyes, real plan. Take the applause.', Unfiltered: 'Fewer eyes. Real plan. Bow.' },
        endCare: { Jolly: 'Fewer eyes than it felt. Next, ask someone qualified where you stand.', Cheeky: 'Bow first. Then a proper chat with someone who knows.', Unfiltered: 'Fewer eyes. Get proper advice next.' }
      };

      /* ---------------- steps ---------------- */
      function waitFor(fn) { return new Promise(res => { const tick = () => { if (fn()) res(); else S.later(tick, 80); }; tick(); }); }
      async function replayStep() {
        P.phase = 'replay'; P.glareT = 0.55; P.glintsT = 1;
        if (A.ctx) { A.tone({ type: 'sine', freq: 60, to: 90, glide: 0.6, dur: 1.2, vol: 0.12 }); A.noise({ filter: 'lowpass', freq: 400, dur: 0.8, attack: 0.3, vol: 0.06 }); }
        sitEl = h('p', { class: 'sp-sit' }); hotEl = h('div', { class: 'sp-hot' });
        fillReplay();
        goBtn = h('button', { type: 'button', class: 'sp-btn sp-float', text: 'Check the house' });
        showCard([h('small', { text: 'Now replaying · ' + V.name }), h('div', { class: 'sp-row' }, h('div', { class: 'sp-mini', html: MINI }), sitEl), hotEl]);
        el.append(goBtn); floatOver(goBtn);
        patch.say(L(LN.replay), { mood: 'shy', ms: 5200 });
        K.guide({ id: 'replay', g: 'tap', target: goBtn, label: 'CHECK THE HOUSE', delay: 1800 });
        await new Promise(res => K.tap(goBtn, () => { if (P.phase === 'replay') { K.sfx.tap(); res(); } }));
        P.floatBtn = null; goBtn.classList.add('sp-out'); S.later(() => goBtn.remove(), 400);
      }
      async function guessStep() {
        P.phase = 'guess'; hideCard(); K.guide(null);
        buildDesk();
        deskQ.textContent = 'How many of these ' + N + ' are thinking about your moment?';
        fader.setAttribute('aria-label', 'How many of the ' + N + ' are thinking about your moment');
        setVal(P.val, true);
        patch.say(L(LN.guess), { mood: 'think', ms: 4200 });
        K.guide({ id: 'guess', g: 'drag', target: knob, dir: 'r', d: Math.min(120, (fader.clientWidth || 300) * 0.3), label: 'SLIDE: HOW MANY?', place: 'below', delay: 700 });
        await new Promise(res => { P.lockRes = res; });
      }
      function lockGuess() {
        if (P.phase !== 'guess' || !P.lockRes) return;
        P.guess = P.val; K.guide(null); K.sfx.lock();
        if (A.ctx) { A.tone({ type: 'sine', freq: 90, to: 50, glide: 0.25, dur: 0.4, vol: 0.2 }); A.noise({ filter: 'lowpass', freq: 600, dur: 0.25, vol: 0.08 }); }
        ctx.track('guess', { g: P.guess, n: N });
        patch.say(L(P.guess >= N * 0.5 ? LN.guessBig : LN.guessSmall), { mood: P.guess >= N * 0.5 ? 'worried' : 'think', ms: 2600 });
        const r = P.lockRes; P.lockRes = null; S.later(r, 900);
      }
      async function sweepStep() {
        if (desk) { desk.classList.add('sp-out'); const d = desk; S.later(() => d.remove(), 380); desk = null; }
        P.phase = 'sweep'; P.sweepT0 = now();
        P.glareT = 0.06; P.glintsT = 0.85; P.pool.onT = 1; hit.classList.add('on');
        if (A.ctx) { A.noise({ filter: 'highpass', freq: 1800, dur: 0.05, vol: 0.12 }); A.tone({ type: 'sine', freq: 110, to: 70, dur: 0.4, vol: 0.12 }); }
        music.level(0.48);
        updHud(); hudEl(true);
        patch.base('happy'); patch.say(L(LN.take), { mood: 'determined', ms: 4400 });
        sweepGuide();
        const cap = [80000, 70000, 70000][inten] || 70000;
        await waitFor(() => P.phase !== 'sweep' || now() - P.sweepT0 > cap);
        if (P.phase === 'sweep') { people.filter(p => !p.rev).forEach((p, i) => S.later(() => reveal(p), i * 160)); await waitFor(() => P.phase !== 'sweep'); }
      }
      function hudEl(on) { hud.classList.toggle('hide', !on); }
      function endSweep() {
        if (P.phase !== 'sweep') return;
        P.phase = 'twistAsk'; K.guide(null);
        const secs = Math.round((now() - P.sweepT0) / 1000);
        P.calmRatio = P.moving > 0.4 ? clamp(P.calm / P.moving, 0, 1) : 0.8;
        S.later(albumFlush, 300);
        ctx.track('sweep', { secs, calm: Math.round(P.calmRatio * 100) });
        P.rigT = M.rigY;
        if (A.ctx) { A.tone({ type: 'sawtooth', freq: 70, to: 55, dur: 0.9, vol: 0.03, lp: 300 }); A.wood(A.now() + 0.6, 0.16, 0.6); }
        patch.say(L(LN.twistAsk), { mood: 'idea', ms: 4600 });
        S.later(() => { if (P.phase === 'twistAsk') bubbleClear(); }, 700);
        S.later(() => { if (P.phase === 'twistAsk') K.guide({ id: 'rig', g: 'drag', target: () => ({ x: P.pool.x, y: P.pool.y }), dx: 0, dy: (M.rigY + 10) - P.pool.y, label: 'SWING IT UP', delay: 200 }); }, 900);
      }
      async function twistStep() {
        await waitFor(() => P.phase === 'twistAsk');
        await waitFor(() => P.phase === 'twistAsk' && P.pool.y < M.rigY + M.pry * 0.9);
        P.phase = 'twist'; K.guide(null); P.drag = false; hit.classList.remove('on');
        bubbleClear();
        P.pool.onT = 0; P.spotsT = 1; P.spotsOn = 1;
        K.sfx.whoosh();
        // every seat gets a light of its own, a ripple from the middle out
        const order = people.slice().sort((a, b) => Math.abs(a.x - M.W / 2) + a.k * 10 - (Math.abs(b.x - M.W / 2) + b.k * 10));
        hud.classList.add('wide'); hud.replaceChildren(h('div', null, h('small', { text: 'Feeling watched' }), h('b', { text: '0 / ' + N })), h('div', { class: 'sp-eff' }, h('small', { text: 'It has a name: the spotlight effect' })));
        const watchB = hud.querySelector('b');
        let lit = 0;
        order.forEach((p, i) => S.later(() => {
          p.spot = 1; lit++; P.spotFrac = lit / N; watchB.textContent = lit + ' / ' + N;
          if (A.ctx && i % 2 === 0) { A.wood(undefined, 0.05, 1.4 + (i % 7) * 0.08); A.chime(A.note(SCALE[(i * 3) % SCALE.length]), { vol: 0.025, dur: 0.9 }); }
        }, 200 + i * (reduced() ? 20 : 55)));
        await K.wait(400 + order.length * (reduced() ? 20 : 55));
        if (murmur) murmur.level(0.06, 1);
        patch.say(L(LN.twist), { mood: 'surprised', ms: 5200 });
        ctx.track('twist', {});
        // a chorus of their own worries
        const chorus = shuffle(people.filter(p => !p.cameo)), perWave = M.phone ? 2 : 4, waves = [4, 5, 5][inten] || 5;
        for (let w = 0; w < waves; w++) {
          chorus.slice(w * perWave, w * perWave + perWave).forEach((p, i) => S.later(() => { bubble(p, p.own.text, 'own', 2200, 'Their spotlight'); albumAdd(p.own.id); if (A.ctx) A.tone({ type: 'sine', freq: 520 + i * 90, to: 640 + i * 90, dur: 0.12, vol: 0.025 }); }, i * 350));
          await K.wait(reduced() ? 900 : 1500);
        }
        await K.wait(900);
      }
      async function compareStep() {
        P.phase = 'compare'; bubbleClear(); hudEl(false); albumFlush();
        people.forEach(p => { if (!p.rev) { p.rev = true; } });
        P.spotsT = 0;
        P.rigT = -70;
        const g0 = P.guess == null ? Math.round(N / 2) : P.guess, n = P.noticed;
        P.val = g0;
        buildDesk();
        lockBtn.hidden = true;
        targetEl.hidden = false; targetEl.style.setProperty('--t', (n / N).toFixed(4)); targetEl.firstChild.textContent = 'Real: ' + n;
        deskQ.textContent = 'You guessed ' + g0 + '. Thinking about your moment: ' + n + '.';
        fader.setAttribute('aria-label', 'Your spotlight. Set it to the real number, ' + n);
        setVal(g0, true);
        P.glare = P.glareT = 0.12 + 0.88 * (g0 / N); P.warmT = 0;
        if (A.ctx) A.tone({ type: 'sine', freq: 140, to: 220, glide: 0.5, dur: 0.7, vol: 0.06 });
        if (g0 === n) { verdictEl.hidden = false; verdictEl.textContent = 'Spot on. Most of the house was busy anyway.'; await K.wait(600); finishShrink(); }
        else {
          patch.say(L(g0 > n ? LN.shrink : LN.shrinkUp), { mood: 'determined', ms: 4200 });
          const kw = fader.clientWidth || 300;
          K.guide({ id: 'shrink', g: 'drag', target: knob, dx: ((n - g0) / N) * (kw - 44), dy: 0, label: g0 > n ? 'PULL IT TO REAL SIZE' : 'SET THE REAL NUMBER', place: 'below', delay: 700 });
        }
        await waitFor(() => P.shrunk);
        await K.wait(reduced() ? 1200 : 2600);
      }
      function checkShrink(released) {
        if (P.phase !== 'compare' || P.shrunk) return;
        if (P.val === P.noticed || (released && Math.abs(P.val - P.noticed) <= 1)) { setVal(P.noticed, true); finishShrink(); }
      }
      function finishShrink() {
        if (P.shrunk) return;
        P.shrunk = true; K.guide(null);
        P.glareT = 0.1 + 0.3 * (P.noticed / N); P.warmT = 1;
        K.sfx.lock(); if (A.ctx) { A.tone({ type: 'sine', freq: 320, to: 160, glide: 0.5, dur: 0.6, vol: 0.06 }); ['C5', 'E5', 'G5'].forEach((nn, i) => A.chime(A.note(nn), { when: A.now() + 0.1 + i * 0.07, vol: 0.06, dur: 1.4 })); }
        const g0 = P.guess == null ? P.val : P.guess, n = P.noticed, diff = g0 - n;
        verdictEl.hidden = false;
        verdictEl.textContent = diff > 0 ? 'Your spotlight was ' + diff + ' seat' + (diff === 1 ? '' : 's') + ' too big. The other ' + (N - n) + ' were starring in their own lives.' : diff < 0 ? 'You guessed low. And still, ' + (N - n) + ' were busy with their own lives.' : 'Spot on. ' + (N - n) + ' were busy with their own lives.';
        deskNote.hidden = false; deskNote.textContent = 'A pretend audience, a real effect: in studies, people guessed about twice as many noticed as really did (Gilovich, Medvec & Savitsky, 2000).';
        patch.say(L(LN.shrunk), { mood: 'happy', ms: 3200 });
        FX.emit('star', M.booth.x, M.booth.y, 12, { colors: ['#ffe6a3', '#ffc27a', '#fff'] });
        ctx.track('shrink', { g: g0, n });
        S.later(() => prepFinale(), 400);
      }
      async function bowStep() {
        P.phase = 'fair';
        if (desk) { desk.classList.add('sp-out'); const d = desk; S.later(() => d.remove(), 380); desk = null; }
        const sup = support(), bal = tidy(an.balanced, 160);
        const head = sup === 'strong' ? 'It matters. And you’re not on trial in front of everyone.' : sup === 'some' ? 'Fewer eyes than it feels. The worry still gets a plan.' : 'Fewer eyes than it feels.';
        const nodes = [h('small', { text: 'The fair version' }), h('div', { class: 'sp-head', text: head })];
        if (!noWords && bal) nodes.push(h('p', { class: 'sp-body' }, h('span', { class: 'gk-user', text: bal })));
        else nodes.push(h('p', { class: 'sp-body', text: 'A few people may notice a slip. Most are busy being the star of their own show.' }));
        const plan = sup !== 'weak' ? (leadOf('prepare') || leadOf('ask')) : '';
        if (plan) nodes.push(h('p', { class: 'sp-plan', text: 'Next step: ' + plan }));
        if (care()) nodes.push(h('p', { class: 'sp-care', text: 'If this involves health, money, housing or legal stuff, someone qualified can tell you exactly where you stand.' }));
        const bowBtn = h('button', { type: 'button', class: 'sp-hold', 'aria-label': 'Press and hold to take a bow' }, h('i'), h('span', { text: 'Hold to take a bow' }));
        showCard(nodes);
        el.append(bowBtn); P.bowBtn = bowBtn; floatOver(bowBtn);
        patch.say(L(LN.bow), { mood: 'celebrate', ms: 4000 });
        K.guide({ id: 'bow', g: 'hold', target: bowBtn, label: 'HOLD: TAKE A BOW', ms: 1700, delay: 1100 });
        let hum2 = null;
        await new Promise(res => {
          K.hold(bowBtn, {
            ms: [900, 1300, 1500][inten] || 1300, decay: 1.4,
            start: () => { K.sfx.tap(); if (A.ctx && !hum2) { hum2 = A.loop({ pink: true, filter: 'bandpass', freq: 600, q: 1.2, bus: 'sfx' }); if (hum2) hum2.level(0.04, 0.3); } },
            progress: (k, active) => { bowBtn.style.setProperty('--f', k.toFixed(3)); bowBtn.classList.toggle('full', k > 0.55); P.dip = reduced() ? 0 : Math.sin(Math.min(1, k) * Math.PI * 0.5) * 22 * (active ? 1 : 0.6); if (hum2) hum2.freq(500 + k * 700, 0.05); },
            cancel: () => { if (hum2) { hum2.level(0.0001, 0.1); const x = hum2; S.later(() => x.stop(), 300); hum2 = null; } },
            done: () => { S.buzz([18, 50, 18, 50, 30]); if (hum2) { hum2.level(0.0001, 0.1); const x = hum2; S.later(() => x.stop(), 300); hum2 = null; } bowBtn.classList.add('sp-out'); S.later(() => bowBtn.remove(), 400); res(); }
          });
        });
      }
      async function finale() {
        P.phase = 'finale'; K.guide(null); hideCard(); bubbleClear(); hit.classList.remove('on');
        prepFinale(); fin.t0 = now();
        P.houseT = 1; P.glareT = 0; P.spotsT = 0;
        K.anim(reduced() ? 160 : 900, (k) => { P.dip = 22 * (1 - k) * (1 - k); });
        music.stop(); if (murmur) murmur.level(0.0001, 0.6);
        if (A.ctx) {
          const t0 = A.now();
          A.pad(['F3', 'A3', 'C4', 'E4', 'A4'].map(n => A.note(n)), { dur: 6, vol: 0.16, attack: 0.5 });
          ['C5', 'F5', 'A5', 'C6', 'E6'].forEach((n, i) => A.chime(A.note(n), { when: t0 + 0.4 + i * 0.16, vol: 0.07, dur: 2 }));
          A.sync('finale', now());
        }
        applause(4.2, [0.8, 1, 1.15][inten] || 1);
        const nR = [14, 22, 30][inten] || 22;
        for (let i = 0; i < nR; i++) {
          const p = people[Math.floor(Math.random() * people.length)];
          P.roses.push({ t0: now() + 700 + i * 140 + Math.random() * 120, ms: 900 + Math.random() * 500, x0: p.x, y0: p.y - p.r, x1: M.W * (0.06 + 0.88 * Math.random()), y1: M.houseBottom + 2 + Math.random() * (M.phone ? 9 : 12), arc: 90 + Math.random() * 120, r0: Math.random() * 6, spin: 4 + Math.random() * 6, s: (M.phone ? 1 : 1.35) * (0.85 + Math.random() * 0.3) });
        }
        S.later(() => { if (!reduced()) people.forEach((p, i) => { if (i % 3 === 0) S.later(() => FX.emit('petal', p.x, p.y - p.r * 2, 3, { colors: ['#ff6b8a', '#ffd1dc', '#ffe9b3', '#ffffff'] }), i * 40); }); }, 1100);
        const sup = support();
        ova = h('div', { class: 'sp-ova' }, h('b', { text: 'A standing ovation for being human.' }), h('span', { text: N + ' people. ' + N + ' spotlights. One human moment.' }));
        el.append(ova); placeUI();
        patch.base('celebrate'); patch.say(L(care() ? LN.endCare : sup !== 'weak' ? LN.endReal : LN.end), { mood: 'celebrate', ms: 0 });
        patch.react('bounce');
        await K.wait(reduced() ? 3200 : 6600);
        finish();
      }
      function finish() {
        if (P.finished) return; P.finished = true; P.phase = 'done'; albumFlush();
        const calm = P.calmRatio == null ? 0.8 : P.calmRatio, pct = Math.round(calm * 100);
        const best = K.best('calm', pct, 'higher'), tier = K.tier(calm, [0.5, 0.7, 0.86]);
        const venue = K.collect('v:' + V.id);
        const thoughts = K.collection().filter(x => x.indexOf('t:') === 0).length;
        const badges = [];
        if (best.isNew) badges.push('New best: ' + pct + '% steady sweep'); else badges.push('Steady sweep: ' + pct + '%');
        if (tier) badges.push(tier + ' followspot');
        badges.push('Album: ' + Math.min(thoughts, ALBUM_TOTAL) + '/' + ALBUM_TOTAL + ' thoughts' + (P.newThoughts ? ' (+' + P.newThoughts + ')' : ''));
        if (venue.isNew) badges.push('New venue: ' + V.name);
        const g0 = P.guess == null ? Math.round(N / 2) : P.guess, n = P.noticed, sup = support();
        ctx.finish({
          title: sup === 'weak' ? 'Fewer eyes than it felt' : 'Fewer eyes, and a plan', mood: 'celebrate',
          lines: ['You guessed ' + g0 + ' of ' + N + '. Noticed: ' + n + ', all kind.', (N - n) + ' were busy starring in their own lives', 'Everyone in the house had their own spotlight'],
          share: 'I thought everyone noticed. The spotlight says: ' + n + ' out of ' + N + '.',
          badges: badges.slice(0, 4)
        });
      }

      /* ---------------- start: size the world, then run the flow ---------------- */
      cv.onResize(() => layout());
      S.on('theme', () => dirtyAll());
      if (ctx.analysisReady && typeof ctx.analysisReady.then === 'function') ctx.analysisReady.then((a) => { if (a && typeof a === 'object' && (P.phase === 'intro' || P.phase === 'replay')) { an = a; fillReplay(); } }, () => {});

      (async () => {
        await K.intro({ title: 'Spotlight', sub: 'Under the big light it feels like every eye saw it. Let’s check what the audience is actually thinking.', how: 'Guess how many noticed. Then sweep the spotlight across the house.', char: 'patch', mood: 'shy' });
        await replayStep();
        await guessStep();
        await sweepStep();
        await twistStep();
        await compareStep();
        await bowStep();
        await finale();
      })();

      return {
        async autoplay() {
          const wait = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 30000)) await K.wait(90); };
          const off = () => touchOff();
          await wait(() => P.phase === 'replay' && goBtn);
          await K.wait(1400);
          await K.sim.tap(goBtn);
          await wait(() => P.phase === 'guess' && fader);
          await K.wait(900);
          {
            const w = fader.clientWidth || 300, hh = fader.clientHeight || 60, x0 = 22 + (w - 44) * (P.val / N), x1 = 22 + (w - 44) * (Math.round(N * 0.73) / N);
            await K.sim.drag(fader, { x: x0, y: hh / 2 }, { x: x1, y: hh / 2 }, 900, 18);
          }
          await K.wait(700);
          await K.sim.tap(lockBtn);
          await wait(() => P.phase === 'sweep', 8000);
          await K.wait(1200);
          const order = [];
          M.byRow.forEach((row, k) => { const rw = row.slice().sort((a, b) => a.x - b.x); if (k % 2) rw.reverse(); rw.forEach(p => order.push(p)); });
          for (let pass = 0; pass < 3 && P.phase === 'sweep'; pass++) {
            const todo = order.filter(p => !p.rev); if (!todo.length) break;
            let cur = { x: P.pool.x, y: P.pool.y };
            const s0 = await K.sim.press(hit, cur.x, cur.y + off());
            for (const p of todo) {
              if (P.phase !== 'sweep') break;
              if (p.rev) continue;
              const to = { x: p.x, y: p.y + p.r * 0.2 };
              for (let k = 1; k <= 4; k++) { s0.move(lerp(cur.x, to.x, k / 4), lerp(cur.y, to.y, k / 4) + off()); await K.wait(85); }
              cur = to;
              await wait(() => p.rev || P.phase !== 'sweep', 1800);
            }
            s0.up(cur.x, cur.y + off()); await K.wait(120);
          }
          await wait(() => P.phase === 'twistAsk', 20000);
          await K.wait(1600);
          {
            const x = P.pool.x, y0 = P.pool.y, s1 = await K.sim.press(hit, x, y0 + off());
            for (let k = 1; k <= 6; k++) { s1.move(x, lerp(y0, M.rigY - 4, k / 6) + off()); await K.wait(110); }
            await wait(() => P.phase !== 'twistAsk', 6000);
            s1.up(x, M.rigY + off());
          }
          await wait(() => P.phase === 'compare' && fader, 30000);
          await K.wait(1400);
          if (!P.shrunk) {
            const w = fader.clientWidth || 300, hh = fader.clientHeight || 60, x0 = 22 + (w - 44) * (P.val / N), x1 = 22 + (w - 44) * (P.noticed / N);
            await K.sim.drag(fader, { x: x0, y: hh / 2 }, { x: x1, y: hh / 2 }, 1100, 22);
          }
          await wait(() => P.phase === 'fair' && P.bowBtn, 20000);
          await K.wait(1500);
          const hold = await K.sim.press(P.bowBtn);
          await wait(() => P.phase === 'finale' || P.finished, 20000);
          hold.up();
          await wait(() => P.finished, 25000);
        }
      };
    }
  });
})(window.TSG_ENV);
