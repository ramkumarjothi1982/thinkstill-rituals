/* 016 Gold Pan — Reframe · REFRAME · Emotion
 * Mechanism: correcting the mental filter and the discounting of positives (Beck 1979; Burns 1980). A low mood keeps
 * the heavy negatives and washes the rest out, so the player searches on purpose for the overlooked facts that are
 * true and specific. Honest, not toxic positivity: the heavy stones are kept and weighed, and fool's gold (a sweeping,
 * untrue positive, often the fear flipped inside out) is bite-tested and tossed. Only true facts count.
 * Verb: swirl (circle the pan in a steady rhythm until the light gravel washes out; tweezer-pick each gold fleck, hold
 * to bite-test the fool's gold, flick it back, drag the vial onto the scale).
 * Finale: the vial pours into a stone mould; a gold nugget engraved with the fair thought rises over a river glittering
 * at sunset.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const hexRGB = (c) => { const n = parseInt(String(c).slice(1, 7), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mixHex = (a, b, k) => { const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => Math.max(0, Math.min(255, Math.round(v + (B[i] - v) * k))).toString(16).padStart(2, '0')).join(''); };
  const shade = (c, k) => mixHex(c, k < 0 ? '#000000' : '#ffffff', Math.abs(k));
  const rgba = (c, a) => { const A = hexRGB(c); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')'; };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const wrapA = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
  const rr = (g, x, y, w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };

  /* Today's river: the same all day, a different creek tomorrow. Each one casts its own nugget for the collection. */
  const RIVERS = [
    { key: 'alpine', name: 'Alpine Creek', nugget: 'Alpine nugget', deco: 'alpine', mud: '#6d6a58',
      bank: ['#7aa660', '#4f7a3c'], edge: '#cfc8b2', rock: ['#a9b2ba', '#7f8a94'], bed: ['#8e9aa5', '#adb6be', '#6f7b86', '#c6cdd3', '#5d6872'], sand: '#bdb7a3',
      water: ['#8fd3e0', '#3b8ea8', '#1f5f7a'], flower: ['#ffffff', '#c3a6ff', '#ffe36e'], bird: 'wind' },
    { key: 'canyon', name: 'Red Canyon', nugget: 'Canyon nugget', deco: 'canyon', mud: '#7a4a2e',
      bank: ['#c8703f', '#94452a'], edge: '#ecc391', rock: ['#b85c36', '#8c3f24'], bed: ['#c97a52', '#a85d3c', '#e3a67c', '#8c4a31', '#efc59c'], sand: '#e2b285',
      water: ['#86d0b4', '#33907b', '#1d5f53'], flower: ['#ffd36b', '#ffffff', '#f08a5d'], bird: 'wren' },
    { key: 'rainforest', name: 'Rainforest Falls', nugget: 'Rainforest nugget', deco: 'fern', mud: '#4d4a32',
      bank: ['#3f7d3c', '#22562a'], edge: '#a39b75', rock: ['#5f6b52', '#454f3d'], bed: ['#5a6650', '#717f62', '#3f4a39', '#8b9476', '#a3a682'], sand: '#958f6b',
      water: ['#7fcba5', '#2e7f5f', '#174d3b'], flower: ['#ff7aa8', '#ffffff', '#ffd36b'], bird: 'whip' },
    { key: 'billabong', name: 'Outback Billabong', nugget: 'Billabong nugget', deco: 'gum', mud: '#7a5530',
      bank: ['#bb6c3c', '#8f4c2a'], edge: '#e8c892', rock: ['#c49a6c', '#9a7450'], bed: ['#c9934e', '#e6d4b0', '#9c6a3a', '#b78450', '#f2e6cc'], sand: '#d9b27a',
      water: ['#b5c57f', '#6a8549', '#3d502c'], flower: ['#ffd36b', '#ff9a5a', '#ffffff'], bird: 'bell' }
  ];
  /* True for anyone holding this pan right now: warm, specific enough, never a promise. */
  const GEN_GOLD = ['You’re checking the facts, not just the feeling.', 'You’ve got through every hard day so far.', 'Strong feelings rise, peak and pass.',
    'A low mood hides good things. It doesn’t delete them.', 'This is one part of today, not all of it.', 'You can choose your next small step.'];
  /* A plain fact for each thinking trap the reading found: what the filter skipped over. */
  const COUNTER = {
    fortune_telling: 'Tomorrow hasn’t happened yet.', mind_reading: 'What they think is still a guess.', catastrophising: 'The worst case is one possibility, not the only one.',
    all_or_nothing: 'Real life mostly happens between “always” and “never”.', labelling: 'One moment isn’t a whole person.', should: 'A “should” is a rule, not a fact.',
    emotional_reasoning: 'A strong feeling isn’t proof.', personalising: 'Most things have more than one cause.', overgeneralising: 'One time isn’t every time.',
    discounting_positive: 'A good thing still counts, even if it felt easy.', magnifying: 'Up close, everything looks bigger.', filtering: 'The rest of the day happened too.'
  };
  /* Fool's gold: the fear flipped inside out. Shiny, sweeping and just as made up. */
  const FOOL = [[/\b(boss|manager|work|job|meeting|team|client|colleague)\b/i, 'Your boss thinks you’re perfect!'],
    [/\b(text|texted|message|messaged|reply|replied|read|seen|ignor\w*|ghost\w*)\b/i, 'They’re thrilled with you, guaranteed!'],
    [/\b(presentation|speech|class|party|embarrass\w*|awkward|froze)\b/i, 'Everyone thought you were flawless!'],
    [/\b(partner|boyfriend|girlfriend|husband|wife|relationship|date)\b/i, 'They adore every single thing you do!'],
    [/\b(mum|mom|dad|mother|father|sister|brother|family|parents?)\b/i, 'They’ll never say a hard word again!'],
    [/\b(exam|test|grade|marks|assignment|essay|course|uni|school)\b/i, 'You’ll ace everything, guaranteed!']];
  const PYRITE = (cls) => '<svg viewBox="0 0 240 240" aria-hidden="true" class="' + cls + '"><defs>' +
    '<linearGradient id="gpT" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffbd2"/><stop offset=".5" stop-color="#f1df86"/><stop offset="1" stop-color="#d3bd59"/></linearGradient>' +
    '<linearGradient id="gpL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6c062"/><stop offset="1" stop-color="#9c8a34"/></linearGradient>' +
    '<linearGradient id="gpR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a99640"/><stop offset="1" stop-color="#6c5f22"/></linearGradient></defs>' +
    '<g class="gp-half-a">' + cube(112, 100, 38) + cube(78, 132, 27) + '</g><g class="gp-half-b">' + cube(152, 136, 25) + '</g>' +
    '<path class="gp-crack" d="M116 64 L106 92 L122 104 L104 128 L118 146" fill="none" stroke="#2b2408" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<g class="gp-iri"><circle cx="96" cy="78" r="4" fill="#fff"/><circle cx="150" cy="118" r="3" fill="#bff6ff"/><circle cx="70" cy="122" r="2.6" fill="#ffc2f0"/></g></svg>';
  function cube(x, y, s) {
    const a = s * 0.87, b = s * 0.5, p = (pts) => pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');
    return '<polygon points="' + p([[x, y - s], [x + a, y - b], [x, y], [x - a, y - b]]) + '" fill="url(#gpT)"/>' +
      '<polygon points="' + p([[x - a, y - b], [x, y], [x, y + s], [x - a, y + b]]) + '" fill="url(#gpL)"/>' +
      '<polygon points="' + p([[x, y], [x + a, y - b], [x + a, y + b], [x, y + s]]) + '" fill="url(#gpR)"/>' +
      '<path d="M' + (x - a * 0.7) + ' ' + (y - b * 0.4) + ' L' + (x - a * 0.1) + ' ' + (y - b * 0.05) + ' M' + (x + a * 0.15) + ' ' + (y + s * 0.3) + ' L' + (x + a * 0.8) + ' ' + (y - b * 0.1) + '" stroke="rgba(255,255,255,.35)" stroke-width="1.4"/>';
  }

  (env.games = env.games || []).push({
    id: 'gold-pan', mode: 'reframe', name: 'Gold Pan', verb: 'swirl', family: 'REFRAME', minutes: 2,
    parents: ['Emotion', 'Positive State', 'Beliefs / Evidence'],
    cast: ['drop', 'rush'], poster: { char: 'drop', mood: 'happy' },
    fonts: ['Cinzel:wght@700;800', 'Fraunces:wght@500;600;700'],
    tagline: 'Swirl your day like a prospector. Keep the gold, toss the fool’s gold.',
    why: 'For a low mood that keeps only the bad bits: pan for the true facts it washed out.',
    css: `
.g-gold-pan { --gp-serif: "Fraunces", "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif; --gp-cap: "Cinzel", "Trajan Pro", Optima, "Palatino Linotype", Georgia, serif; background: #3b4a3c; }
.g-gold-pan .gp-panhit { position: absolute; z-index: 12; border-radius: 50%; touch-action: none; cursor: grab; }
.g-gold-pan .gp-panhit.on:active { cursor: grabbing; }
.g-gold-pan .gp-stone { position: absolute; z-index: 18; left: 0; top: 0; transform: translate(-50%, -50%) rotate(var(--rot, 0deg)) scale(var(--sc, 1)); width: max-content; min-width: 124px; max-width: min(250px, 64cqw);
  padding: 13px 20px 15px; border-radius: 46% 54% 50% 50% / 58% 52% 48% 42%; text-align: center; touch-action: none; cursor: grab; color: #f4efe5;
  background: radial-gradient(120% 95% at 34% 26%, #6d737d 0%, #40464f 38%, #262a31 76%, #1a1d22 100%);
  box-shadow: inset 3px 5px 4px rgba(255, 255, 255, 0.15), inset -5px -9px 13px rgba(0, 0, 0, 0.55), 0 12px 18px rgba(0, 0, 0, 0.45);
  transition: transform 0.28s cubic-bezier(.2, 1.4, .4, 1), opacity 0.3s ease, left 0.34s cubic-bezier(.3, .8, .3, 1), top 0.34s cubic-bezier(.3, .8, .3, 1); animation: gold-pan-stonein 0.6s cubic-bezier(.2, 1.3, .4, 1) backwards; }
.g-gold-pan .gp-stone span { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; font: 600 15px/1.24 var(--gp-serif); text-shadow: 0 1px 1px rgba(0, 0, 0, 0.7); }
.g-gold-pan .gp-stone small { display: block; font: 700 12px/1 var(--gp-cap); letter-spacing: 0.16em; color: #b9c0c9; margin-bottom: 5px; }
.g-gold-pan .gp-stone.next { box-shadow: inset 3px 5px 4px rgba(255, 255, 255, 0.15), inset -5px -9px 13px rgba(0, 0, 0, 0.55), 0 0 0 3px rgba(255, 213, 74, 0.55), 0 12px 18px rgba(0, 0, 0, 0.45); }
.g-gold-pan .gp-stone.lift { --sc: 1.07; cursor: grabbing; transition: transform 0.18s ease; box-shadow: inset 3px 5px 4px rgba(255, 255, 255, 0.15), inset -5px -9px 13px rgba(0, 0, 0, 0.55), 0 26px 30px rgba(0, 0, 0, 0.5); }
.g-gold-pan .gp-stone.gone { --sc: 0.22; opacity: 0; pointer-events: none; }
.g-gold-pan .gp-stone:focus-visible { outline: 3px solid #ffd54a; outline-offset: 4px; }
@keyframes gold-pan-stonein { from { opacity: 0; transform: translate(-50%, -80%) rotate(var(--rot, 0deg)) scale(1.15); } to { opacity: 1; } }
.g-gold-pan .gp-hint { position: absolute; z-index: 22; left: 50%; transform: translateX(-50%); width: max-content; max-width: calc(100% - 32px); padding: 8px 15px 9px; border-radius: 999px; pointer-events: none;
  background: rgba(16, 20, 22, 0.7); color: #fbf1d6; border: 1px solid rgba(255, 213, 74, 0.3); font: 600 15px/1.2 var(--gp-serif); text-align: center; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3); transition: color 0.25s ease, border-color 0.25s ease; }
.g-gold-pan .gp-hint.ok { color: #ffe27a; border-color: rgba(255, 213, 74, 0.85); }
.g-gold-pan .gp-hint.warn { color: #d4ecff; border-color: rgba(190, 225, 255, 0.6); }
.g-gold-pan .gp-card { position: absolute; z-index: 24; padding: 11px 15px 13px 15px; border-radius: 14px; color: #3a2604; border: 1px solid #c08a1c; transform-origin: 50% 0;
  background: linear-gradient(135deg, #fff5cc 0%, #ffdc70 34%, #f3b93f 60%, #ffe9a6 100%); box-shadow: 0 2px 0 #a8730f, 0 14px 28px rgba(0, 0, 0, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.75); }
.g-gold-pan .gp-card.gp-in { animation: gold-pan-cardin 0.55s cubic-bezier(.2, 1.4, .4, 1) both; }
.g-gold-pan .gp-card small { display: block; font: 800 12px/1 var(--gp-cap); letter-spacing: 0.15em; text-transform: uppercase; color: #6b4708; margin: 0 64px 7px 0; }
.g-gold-pan .gp-card p { margin: 0; font: 600 16px/1.3 var(--gp-serif); }
.g-gold-pan .gp-card b { position: absolute; right: 10px; top: -11px; font: 800 12px/1 var(--gp-cap); letter-spacing: 0.12em; color: #17603a; border: 2px solid #17603a; background: #fffbe8; padding: 5px 8px 4px; border-radius: 7px;
  transform: rotate(5deg); animation: gold-pan-stamp 0.42s 0.35s cubic-bezier(.2, 1.6, .4, 1) both; box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2); }
@keyframes gold-pan-cardin { 0% { opacity: 0; transform: translateY(26px) scale(0.6) rotate(-4deg); } 100% { opacity: 1; transform: none; } }
@keyframes gold-pan-stamp { 0% { opacity: 0; transform: rotate(5deg) scale(2.3); } 100% { opacity: 1; transform: rotate(5deg); } }
.g-gold-pan .gp-fleck { position: absolute; z-index: 20; width: 54px; height: 54px; margin: -27px 0 0 -27px; border-radius: 50%; border: 0; padding: 0; background: transparent; cursor: pointer; touch-action: none; }
.g-gold-pan .gp-fleck::after { content: ""; position: absolute; inset: 5px; border-radius: 50%; border: 2px solid rgba(255, 228, 140, 0.8); animation: gold-pan-ring 1.6s ease-in-out infinite; }
.g-gold-pan .gp-fleck.fool { width: 76px; height: 76px; margin: -38px 0 0 -38px; }
.g-gold-pan .gp-fleck:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
@keyframes gold-pan-ring { 0%, 100% { opacity: 0; transform: scale(0.75); } 50% { opacity: 1; transform: scale(1.04); } }
.g-gold-pan .gp-loupe { position: absolute; z-index: 26; transform: translate(-50%, -50%); border-radius: 50%; touch-action: none; cursor: pointer; overflow: visible;
  background: radial-gradient(circle at 50% 40%, #3d3249 0%, #1f1829 60%, #100c16 100%); box-shadow: 0 0 0 7px #c79a3a, 0 0 0 11px #6e4f13, 0 20px 44px rgba(0, 0, 0, 0.6), inset 0 0 44px rgba(0, 0, 0, 0.65);
  animation: gold-pan-pop 0.45s cubic-bezier(.2, 1.5, .4, 1) both; }
.g-gold-pan .gp-loupe.out { animation: gold-pan-out 0.35s ease both; }
@keyframes gold-pan-out { to { opacity: 0; transform: translate(-50%, -50%) scale(0.4); } }
.g-gold-pan .gp-fade { animation: gold-pan-fade 0.5s ease both !important; }
@keyframes gold-pan-fade { to { opacity: 0; } }
.g-gold-pan .gp-loupe > svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; overflow: visible; }
.g-gold-pan .gp-jaw-top { transform: translateY(calc(var(--bite, 0) * 46px)); }
.g-gold-pan .gp-jaw-bot { transform: translateY(calc(var(--bite, 0) * -42px)); }
.g-gold-pan .gp-crack { stroke-dasharray: 130; stroke-dashoffset: 130; transition: stroke-dashoffset 0.22s ease; }
.g-gold-pan .gp-half-a, .g-gold-pan .gp-half-b { transform-box: fill-box; transform-origin: 50% 70%; transition: transform 0.4s cubic-bezier(.2, 1.4, .4, 1); }
.g-gold-pan .gp-cracked .gp-crack { stroke-dashoffset: 0; }
.g-gold-pan .gp-cracked .gp-half-a { transform: translate(-15px, 10px) rotate(-15deg); }
.g-gold-pan .gp-cracked .gp-half-b { transform: translate(17px, 13px) rotate(18deg); }
.g-gold-pan .gp-cracked .gp-iri { opacity: 0; }
.g-gold-pan .gp-iri { animation: gold-pan-twinkle 0.9s ease-in-out infinite alternate; }
@keyframes gold-pan-twinkle { from { opacity: 0.25; } to { opacity: 1; } }
.g-gold-pan .gp-ring circle { fill: none; stroke: #ffd54a; stroke-width: 6; stroke-linecap: round; stroke-dasharray: 100; stroke-dashoffset: calc(100 - var(--bite, 0) * 100); filter: drop-shadow(0 0 5px rgba(255, 213, 74, 0.8)); }
.g-gold-pan .gp-holdlbl { position: absolute; left: 50%; bottom: -16px; transform: translateX(-50%); white-space: nowrap; font: 800 13px/1 var(--gp-cap); letter-spacing: 0.14em; text-transform: uppercase; color: #3a2604;
  background: linear-gradient(180deg, #ffe58a, #e8b33a); padding: 8px 13px 7px; border-radius: 999px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4); pointer-events: none; }
.g-gold-pan .gp-cracked .gp-holdlbl { background: #e9e2d0; color: #6d1a1a; }
.g-gold-pan .gp-shake { animation: gold-pan-shake 0.42s ease; }
@keyframes gold-pan-shake { 0%, 100% { margin-left: 0; } 20% { margin-left: -7px; } 40% { margin-left: 6px; } 60% { margin-left: -4px; } 80% { margin-left: 2px; } }
@keyframes gold-pan-pop { from { opacity: 0; transform: translate(-50%, -50%) scale(0.3); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
.g-gold-pan .gp-fool { position: absolute; z-index: 27; transform: translate(-50%, -100%); width: max-content; max-width: min(330px, calc(100% - 28px)); padding: 9px 15px 11px; border-radius: 13px; text-align: center;
  background: linear-gradient(115deg, #fff7b8 0%, #ffd84a 28%, #a9f2ff 50%, #ffb6ea 72%, #ffe58a 100%); background-size: 220% 100%; color: #33240a; border: 1px solid #fff4c0;
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.42); animation: gold-pan-foil 2.6s linear infinite, gold-pan-foolin 0.5s cubic-bezier(.2, 1.4, .4, 1) both; }
@keyframes gold-pan-foolin { from { opacity: 0; transform: translate(-50%, -70%) scale(0.6) rotate(-4deg); } to { opacity: 1; transform: translate(-50%, -100%); } }
.g-gold-pan .gp-fool small { display: block; font: 800 12px/1 var(--gp-cap); letter-spacing: 0.15em; text-transform: uppercase; color: #6c1f7d; margin-bottom: 6px; }
.g-gold-pan .gp-fool span { font: 700 16px/1.25 var(--gp-serif); }
.g-gold-pan .gp-fool.gp-cracked { background: linear-gradient(115deg, #e6dfcc, #c9bf9f); animation: none; }
.g-gold-pan .gp-fool.gp-cracked small { color: #8c1d1d; }
.g-gold-pan .gp-fool.gp-cracked span { text-decoration: line-through; text-decoration-thickness: 2px; text-decoration-color: #b3233c; opacity: 0.8; }
@keyframes gold-pan-foil { from { background-position: 0% 0; } to { background-position: 220% 0; } }
.g-gold-pan .gp-chunk { position: absolute; z-index: 28; width: 86px; height: 86px; margin: -43px 0 0 -43px; touch-action: none; cursor: grab; filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.45)); }
.g-gold-pan .gp-chunk svg { width: 100%; height: 100%; display: block; }
.g-gold-pan .gp-chunk.fly { transition: left 0.6s cubic-bezier(.3, .7, .4, 1), top 0.6s cubic-bezier(.5, -0.3, .8, .6), transform 0.6s ease, opacity 0.6s ease; transform: rotate(160deg) scale(0.45); opacity: 0.2; }
.g-gold-pan .gp-chunk.back { transition: left 0.3s cubic-bezier(.2, 1.4, .4, 1), top 0.3s cubic-bezier(.2, 1.4, .4, 1); }
.g-gold-pan .gp-vialhit { position: absolute; z-index: 21; width: 64px; height: 104px; margin: -98px 0 0 -32px; border-radius: 18px; touch-action: none; cursor: grab; }
.g-gold-pan .gp-vialhit::after { content: ""; position: absolute; inset: 0; border-radius: 18px; border: 2px dashed rgba(255, 228, 140, 0.85); animation: gold-pan-ring 1.6s ease-in-out infinite; }
.g-gold-pan .gp-vialhit.drag::after { display: none; }
.g-gold-pan .gp-vialhit:focus-visible { outline: 3px solid #ffd54a; outline-offset: 3px; }
.g-gold-pan .gp-even { position: absolute; z-index: 23; transform: translate(-50%, -50%) rotate(-6deg); font: 800 14px/1 var(--gp-cap); letter-spacing: 0.16em; color: #17603a; background: rgba(255, 251, 232, 0.95);
  border: 3px solid #17603a; border-radius: 9px; padding: 7px 11px 6px; white-space: nowrap; pointer-events: none; box-shadow: 0 6px 14px rgba(0, 0, 0, 0.3); animation: gold-pan-slam 0.45s cubic-bezier(.2, 1.6, .4, 1) both; }
.g-gold-pan .gp-even.lean { color: #7a4a0a; border-color: #7a4a0a; }
@keyframes gold-pan-slam { from { opacity: 0; transform: translate(-50%, -50%) rotate(-6deg) scale(2.4); } to { opacity: 1; transform: translate(-50%, -50%) rotate(-6deg) scale(1); } }
.g-gold-pan .gp-jartag { position: absolute; z-index: 15; left: 10px; font: 800 12px/1 var(--gp-cap); letter-spacing: 0.1em; text-transform: uppercase; color: #fff5d6; background: rgba(40, 26, 10, 0.66);
  padding: 5px 8px 4px; border-radius: 999px; pointer-events: none; white-space: nowrap; }
.g-gold-pan .gp-plate { position: absolute; z-index: 60; transform: translate(-50%, -50%); text-align: center; color: #4f3303; pointer-events: none; animation: gold-pan-engrave 1.4s ease both; }
.g-gold-pan .gp-plate small { display: block; font: 800 12px/1.15 var(--gp-cap); letter-spacing: 0.18em; text-transform: uppercase; color: #6e4a08; margin-bottom: 8px; text-shadow: 0 1px 0 rgba(255, 244, 200, 0.75); }
.g-gold-pan .gp-plate p { margin: 0; font: 700 16px/1.32 var(--gp-serif); text-shadow: 0 1px 0 rgba(255, 246, 205, 0.8), 0 -1px 0 rgba(110, 66, 0, 0.5); text-wrap: balance; }
.g-gold-pan .gp-plate.long p { font-size: 15px; }
@keyframes gold-pan-engrave { 0% { opacity: 0; letter-spacing: 0.08em; filter: blur(2px); } 100% { opacity: 1; filter: none; } }
.g-gold-pan .gk-char.gp-drop { left: 12px; top: auto; bottom: calc(env(safe-area-inset-bottom, 0px) + 26px); }
.g-gold-pan .gp-rush.gk-side-above .gk-bubble { left: auto; right: 0; }
@container (min-width: 700px) {
  .g-gold-pan .gp-plate p { font-size: 19px; }
  .g-gold-pan .gp-plate.long p { font-size: 17px; }
  .g-gold-pan .gp-card p { font-size: 17px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const clamp = K.clamp, lerp = K.lerp, ease = K.ease;
      const inten = ctx.intensity, reduced = () => K.reduced(), now = () => performance.now();
      const visits = K.visits();
      const L = (o, sub) => { let s = ctx.line(o) || ''; if (sub) Object.keys(sub).forEach(k => { s = s.split('{' + k + '}').join(sub[k]); }); return s; };
      const text = String(ctx.text || ''), noText = !text.trim();
      const care = an.safety === 'care', serious = an.fear_support === 'strong';
      const river = K.dailyPick(RIVERS, 5);

      /* ---------------- content: heavy stones, true gold, fool's gold ---------------- */
      const nWords = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;
      const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); return (sp > n * 0.55 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; };
      const keyOf = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const firstUp = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
      const lowFirst = (s) => (s && !/^(I\b|[A-Z]{2})/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
      const leads = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text);
      const lead = (k) => { const l = leads.find(x => x.kind === k) || leads[0]; return l ? clip(l.text, 90) : ''; };
      const stoneN = inten === 0 ? 2 : 3, goldN = [3, 4, 5][inten], rounds = inten === 0 ? 2 : 3, TWIST = 1;
      const plan = inten === 0 ? [[0], [1, 2]] : inten === 1 ? [[0], [1], [2, 3]] : [[0, 1], [2], [3, 4]];
      const stones = [];
      const addStone = (t, user) => { t = clip(String(t || '').replace(/[\s.!…]+$/, ''), 72); if (nWords(t) < 2 || stones.some(s => keyOf(s.text) === keyOf(t))) return false; stones.push({ text: firstUp(t), user: !!user }); return true; };
      if (!noText) {
        const spans = (Array.isArray(an.spans) ? an.spans : []).filter(s => s && typeof s.quote === 'string' && s.quote.trim());
        const brain = spans.filter(s => s.kind === 'brain').map(s => s.quote), cam = spans.filter(s => s.kind === 'camera').map(s => s.quote);
        const concl = brain.length ? brain[brain.length - 1] : (an.thought || an.conclusion || '');
        const pre = (an.source === 'ai' && Array.isArray(an.evidence_for) ? an.evidence_for : []).concat(brain.slice(0, -1), cam);
        for (const t of pre) { if (stones.length >= stoneN - 1) break; addStone(t, true); }
        addStone(concl, true);
        for (const t of pre) { if (stones.length >= stoneN) break; addStone(t, true); }
      }
      for (const t of ['What went wrong today', 'The heavy feeling', 'The worry on repeat']) { if (stones.length >= stoneN) break; addStone(t, false); }
      stones.length = Math.min(stones.length, stoneN);

      const gold = [];
      const addGold = (t, tag, user) => {
        t = String(t || '').replace(/\s+/g, ' ').trim(); if (!t) return false;
        t = clip(firstUp(t), 112); if (!/[.!?…”"]$/.test(t)) t += '.';
        if (nWords(t) < 3 || gold.some(g => keyOf(g.text) === keyOf(t)) || stones.some(s => keyOf(s.text) === keyOf(t))) return false;
        gold.push({ text: t, tag, user: !!user }); return true;
      };
      if (an.source === 'ai' && Array.isArray(an.evidence_against)) an.evidence_against.forEach(t => addGold(t, 'From what happened', true));
      const quoted = /["“]([^"”]{6,90})["”]/.exec(text);
      const NEG = /\b(no|not|never|unacceptable|disappoint\w*|angry|upset|fired|sacked|bad|wrong|fail\w*|hate|sorry|problem|concern\w*|worr\w*|serious|terrible|awful|over|leave|leaving|end|ending|done|warning|complain\w*|late|why)\b/i;
      if (quoted && !serious && !NEG.test(quoted[1])) addGold('The actual words were “' + quoted[1].trim() + '”', 'On the record', true);
      (Array.isArray(an.distortions) ? an.distortions : []).forEach(d => { if (!d || !COUNTER[d.type]) return; if (serious && /mind_reading|fortune_telling|catastrophising/.test(d.type)) return; addGold(COUNTER[d.type], 'Plain fact'); });
      const unk = (Array.isArray(an.unknowns) ? an.unknowns : []).find(u => u && u.text);
      if (unk && !serious && !noText) addGold('Not known yet: ' + lowFirst(String(unk.text).trim().replace(/[.?]*$/, '?')), 'Still unknown');
      if (serious) { addGold('You know about it now, so you can plan for it.', 'Also true'); const lp = lead('prepare'); if (lp) addGold('There’s a next step: ' + lowFirst(lp.replace(/[.!]+$/, '')), 'Also true'); }
      const reserve = care ? 1 : 0;
      gold.length = Math.min(gold.length, goldN - reserve);
      const gOff = K.daily() % GEN_GOLD.length;
      for (let i = 0; i < GEN_GOLD.length && gold.length < goldN - reserve; i++) addGold(GEN_GOLD[(i + gOff) % GEN_GOLD.length], 'Also true');
      if (care) addGold('Someone qualified can tell you exactly where you stand.', 'Also true');
      while (gold.length < goldN) gold.push({ text: GEN_GOLD[gold.length % GEN_GOLD.length], tag: 'Also true', user: false });
      let fool = 'Everyone loves you, always!';
      if (care) fool = 'It’ll all just sort itself out!'; else { const f = FOOL.find(([re]) => re.test(text)); if (f) fool = f[1]; }
      const fair = noText ? 'Some of today was heavy, and some of it was gold. Both are true.' : clip(an.balanced || 'The heavy stones are real, and so is the gold. Both are true.', 160);

      /* ---------------- lines (every one in three vibes) ---------------- */
      const LINES = {
        intro: visits ? { Jolly: 'Back at the river! Fresh gravel today. Heavy stones off the top first.', Cheeky: 'Couldn’t stay away from the gold, huh? Stones first.', Unfiltered: 'Back again. Stones off the top first.' }
          : { Jolly: 'Gloomy day on the river. The heavy stones sit on top and hide everything else.', Cheeky: 'Your mood’s been panning for rocks all day. Let’s pan for gold.', Unfiltered: 'Low mood keeps the rocks and washes out the gold. We’re going back for it.' },
        lift1: { Jolly: 'That one’s real. It goes on the scale, not in the bin.', Cheeky: 'Heavy, right? We keep it. We just don’t stop there.', Unfiltered: 'Real weight. It stays on the scale.' },
        liftDone: { Jolly: 'Heavy stuff’s on the scale. Now swirl, slow and steady.', Cheeky: 'Rocks: weighed. Now the fun bit. Swirl!', Unfiltered: 'Stones are out. Swirl the pan.' },
        steady: { Jolly: 'That’s it. Round and round, like the river does.', Cheeky: 'Ooh, smooth. Have you done this before?', Unfiltered: 'Good rhythm. Hold it.' },
        fast: { Jolly: 'Easy! Gold is heavy. It likes a steady swirl.', Cheeky: care ? 'Easy. Slow and steady keeps the gold in.' : 'Whoa, cowboy. Panning, not making a smoothie.', Unfiltered: 'Too fast. Steady.' },
        slow: { Jolly: 'A little faster. Keep the water moving.', Cheeky: 'The gravel’s having a nap. Wake it up.', Unfiltered: 'Faster. Keep it moving.' },
        reveal: { Jolly: 'There! See it glint? Pick it out.', Cheeky: 'Hello, gorgeous. Tweezers, please.', Unfiltered: 'Gold. Pick it.' },
        tag: {
          'From what happened': { Jolly: 'Straight from what happened. Real gold.', Cheeky: 'From the actual facts. The gloom hid this one.', Unfiltered: 'From the facts. It counts.' },
          'On the record': { Jolly: 'The plain words. Smaller than the story, aren’t they?', Cheeky: 'No drama in the actual words. Interesting.', Unfiltered: 'Plain words. No verdict in them.' },
          'Plain fact': { Jolly: 'True, and the gloom skipped right over it.', Cheeky: 'Boring? Maybe. True? Very.', Unfiltered: 'True. Keep it.' },
          'Still unknown': { Jolly: 'An honest blank. Better than a made-up ending.', Cheeky: 'Don’t know yet. That’s a fact too.', Unfiltered: 'Unknown is honest. Keep it.' },
          'Also true': { Jolly: 'Small, true and yours.', Cheeky: 'Tiny. True. Into the vial.', Unfiltered: 'True. In it goes.' }
        },
        scoop: { Jolly: 'Another scoop. Same day, more to find.', Cheeky: 'The river’s feeling generous. Again!', Unfiltered: 'Scoop again.' },
        rushIn: care ? { Jolly: 'Ooh, a big shiny one! It says “{fool}”', Cheeky: 'Big shiny one here! It says “{fool}”', Unfiltered: 'Shiny one. “{fool}”' }
          : { Jolly: 'JACKPOT! Look at the size of it! It says “{fool}”', Cheeky: 'Stand back, I’m rich! It says “{fool}”', Unfiltered: 'Massive nugget! “{fool}”' },
        biteFirst: { Jolly: 'Hmm. Too shiny. Bite-test it first.', Cheeky: 'Easy, Rush. Anything that shiny gets the tooth test.', Unfiltered: 'Too shiny. Bite it.' },
        crack: { Jolly: 'Fool’s gold! Too big to be true. It cracks the moment you test it.', Cheeky: 'Crunch. That’s pyrite, Rush. Pretty, and made up.', Unfiltered: 'Fool’s gold. Not true. Toss it.' },
        aw: care ? { Jolly: 'Oh. It looked so comforting.', Cheeky: 'Fair. Shiny isn’t the same as true.', Unfiltered: 'Fine. Real stuff only.' }
          : { Jolly: 'Aw. It was SO shiny.', Cheeky: 'I’d like to file a complaint with the river.', Unfiltered: 'Fine. Real stuff only.' },
        lesson: care ? { Jolly: '“It’ll all be fine” is fool’s gold. Real facts from someone qualified are the gold.', Cheeky: 'Pep talks crack. Proper facts don’t.', Unfiltered: 'Fake comfort cracks. Get real facts.' }
          : { Jolly: 'That was the fear flipped inside out. Just as made up. Real gold is small and true.', Cheeky: '“Everything’s perfect” is as fake as “everything’s ruined”.', Unfiltered: 'Fake good is still fake. Only true things go in.' },
        under: { Jolly: 'And look what was underneath. The real thing.', Cheeky: 'Under the fake stuff, the real stuff. Classic river.', Unfiltered: 'Real gold under it. Pick it.' },
        weigh: { Jolly: 'Now pop the vial on the scale, across from the stones.', Cheeky: 'Moment of truth. Weigh it.', Unfiltered: 'Weigh it against the stones.' },
        even: { Jolly: 'It evens out. The stones are still there. They’re just not the whole story.', Cheeky: 'Look at that. Not all rocks after all.', Unfiltered: 'Even. Both true. That’s fair.' },
        evenSerious: { Jolly: 'Still heavy, and that’s honest. Now there’s gold on the other side too.', Cheeky: 'It still leans. Real rocks are real. Now you’ve got something to build with.', Unfiltered: 'Still heavy. Now it has a counterweight. Plan from here.' },
        pour: { Jolly: 'Let’s cast it. All of it, into one nugget.', Cheeky: 'Smelting time. Stand back, Rush.', Unfiltered: 'Cast it.' },
        end: { Jolly: 'Your fair thought, cast in gold. Heavy bits and all.', Cheeky: 'One nugget, freshly cast. Worth more than any pep talk.', Unfiltered: 'Cast in gold. True and fair.' },
        endSerious: { Jolly: 'Cast in gold: the honest version, with a plan in it.', Cheeky: 'Real worry, real gold. Now the next step.', Unfiltered: 'Honest and solid. Now act on it.' },
        endCare: { Jolly: 'Cast in gold. Next step: real answers from someone qualified.', Cheeky: 'Yours to keep. Now get proper advice on the rest.', Unfiltered: 'Cast. Now get qualified advice.' },
        rushEnd: care || serious ? { Jolly: 'That one’s real. Proud of you.', Cheeky: 'Real gold. Heavier than it looks.', Unfiltered: 'Real gold. Nice.' }
          : { Jolly: 'Can I bite it? Just a little bite?', Cheeky: 'Best. River. Ever.', Unfiltered: 'Real gold. Nice.' }
      };

      /* ---------------- state ---------------- */
      const LIP = 0;                       // the downstream side, where the light gravel washes over the riffles
      const BPM = 88, IDEAL = TAU * BPM / 120; // one lap of the pan every two beats
      const BAND = [[2.1, 10.6], [2.5, 9.8], [2.9, 9.1]][inten], REVS = [3.6, 4.2, 4.8][inten], BITE_MS = 1100;
      const st = { phase: 'intro', round: 0, prog: 0, murk: 1, sun: 0, sunTarget: 0, sunset: 0, tilt: 0, tiltV: 0, tiltT: 0, stonesOn: 0, vialN: 0, vialOn: false, vialDrag: null, vialFly: null, vialGold: 1,
        busy: false, finished: false, dip: 0, panA: 1, panDy: 0, wob: { x: 0, y: 0 }, mould: null, pour: null, nug: null, flush: false, beat: 0, rushOn: false, lifting: false, cracked: false, jarN: K.collection().length, jarPlus: 0 };
      const SW = { last: null, wG: 0, wW: 0, phase: 0, active: false, moveT: 0, fa: 0, inBand: 0, total: 0, sum: 0, sum2: 0, n: 0, state: 'idle', stateT: 0, said: {}, half: 0, kb: 0, dir: 1, cum: 0, hist: [], lastAdv: 0 };
      const bite = { on: false, t0: 0, k: 0 };
      const M = { w: 0, h: 0, phone: true, cx: 0, cy: 0, r: 100, bankH: 150, bedBot: 700, bal: { x: 0, y: 0, arm: 70, chain: 40, pw: 56, base: 120 }, vial: { x: 0, y: 0 }, jar: { x: 0, y: 0 }, card: { x: 16, y: 0, w: 300 } };
      const GR = [];      // gravel in the pan
      const SG = [];      // gravel washed out, drifting downstream
      const FL = [];      // gold flecks (and the fool's gold)
      const RIP = [];     // ripple rings
      const TWZ = { on: false, x: 0, y: 0, open: 1, a: 1 };
      const P = K.particles();
      const BIRD = visits >= 1 ? { x: 0, y: 0, fly: 0, gone: false, ph: Math.random() * 6 } : null;
      const Q = { level: 2, acc: 0, n: 0, slowN: 0, steps: 0 };
      const FLOW = 34;    // px/s of current

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: 1.5 });
      const panHit = h('div', { class: 'gp-panhit', 'aria-hidden': 'true' });
      const hint = h('div', { class: 'gp-hint', role: 'status', 'aria-live': 'polite', hidden: true });
      const card = h('div', { class: 'gp-card', hidden: true, 'aria-live': 'polite' });
      const vialHit = h('div', { class: 'gp-vialhit', role: 'button', tabindex: '0', 'aria-label': 'The vial of gold. Drag it onto the scale, or press Enter.', hidden: true });
      const jarTag = h('div', { class: 'gp-jartag', 'aria-hidden': 'true' });
      el.append(panHit, hint, card, vialHit, jarTag);
      const drop = K.character('drop', { side: 'right', mood: 'sad', size: K.phone() ? 70 : 96 });
      drop.el.classList.add('gp-drop');
      const rush = K.character('rush', { side: K.phone() ? 'left' : 'above', mood: 'wow', size: K.phone() ? 62 : 90, x: -200, y: -200 });
      rush.el.classList.add('gp-rush'); rush.show(false);
      const stoneEls = stones.map((s, i) => {
        const e = h('div', { class: 'gp-stone', role: 'button', tabindex: '0', 'aria-label': 'Heavy stone: ' + s.text + '. Drag it onto the scale, or press Enter.' }, h('small', { text: 'Heavy' }), h('span', { class: s.user ? 'gk-user' : '', text: s.text }));
        e.style.setProperty('--rot', ([-4, 3, -2][i] || 0) + 'deg'); e.style.animationDelay = (0.12 * i) + 's';
        el.append(e); return { el: e, i, x: 0, y: 0, done: false, s };
      });
      function setJarTag() { jarTag.hidden = !st.jarN; jarTag.textContent = 'Nuggets ' + Math.min(st.jarN, RIVERS.length) + '/' + RIVERS.length; }
      setJarTag();

      /* ---------------- layout ---------------- */
      const spr = { key: '' };
      const bg = { key: '', gloom: null, sun: null, sunset: null }, bgMix = { key: '', c: null };
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        M.w = W; M.h = H; M.phone = W < 700;
        if (M.phone) {
          M.bankH = Math.round(clamp(H * 0.25, 168, 214));
          M.bedBot = H - Math.round(clamp(H * 0.12, 84, 104));
          M.r = Math.round(Math.max(110, Math.min(W * 0.43, (M.bedBot - M.bankH - 170) / 2, 196)));
          M.cx = Math.round(W / 2); M.cy = Math.round(M.bankH + 22 + M.r);
          M.bal = { x: Math.round(W / 2 - 6), y: Math.round(clamp(M.bankH * 0.42, 82, 96)), arm: 72, chain: 40, pw: 56, base: M.bankH - 20 };
          M.vial = { x: W - 44, y: M.bankH - 16 };
          M.jar = { x: 34, y: M.bankH - 26 };
          M.card = { x: 16, y: M.cy + M.r + 22, w: W - 32 };
        } else {
          M.bankH = Math.round(clamp(H * 0.23, 160, 210));
          M.bedBot = H - Math.round(clamp(H * 0.13, 90, 120));
          M.r = Math.round(Math.max(150, Math.min(H * 0.3, (M.bedBot - M.bankH - 60) / 2, 250)));
          M.cx = Math.round(W / 2); M.cy = Math.round(M.bankH + 22 + M.r);
          M.bal = { x: Math.round(W / 2), y: Math.round(clamp(M.bankH * 0.46, 80, 98)), arm: 118, chain: 54, pw: 92, base: M.bankH - 18 };
          M.vial = { x: Math.round(W / 2 + 228), y: M.bankH - 14 };
          M.jar = { x: Math.round(W / 2 - 236), y: M.bankH - 20 };
          const right = M.cx + M.r + 44, cw = Math.min(330, W - right - 24);
          M.card = cw >= 240 ? { x: right, y: M.cy - 120, w: cw } : { x: 16, y: M.cy + M.r + 18, w: Math.min(520, W - 32) };
        }
        const hs = M.r * 1.24;
        Object.assign(panHit.style, { left: (M.cx - hs) + 'px', top: (M.cy - hs) + 'px', width: (hs * 2) + 'px', height: (hs * 2) + 'px' });
        hint.style.top = (M.cy + M.r + (M.phone ? 28 : 32)) + 'px';
        placeHint();
        jarTag.style.top = (M.jar.y + 6) + 'px'; jarTag.style.left = Math.max(8, M.jar.x - 26) + 'px';
        placeCard();
        if (M.phone) rush.place(W - 12 - 62, M.cy + M.r + 18); else rush.place(W - 150, H - 196);
        layoutStones();
        FL.forEach(placeFleckBtn);
        placeVialHit();
        if (st.loupe) Object.assign(st.loupe.style, { left: M.cx + 'px', top: M.cy + 'px' });
        if (st.foolEl) Object.assign(st.foolEl.style, { left: M.cx + 'px', top: (M.cy - loupeSize() / 2 - 18) + 'px' });
        if (st.plate) placePlate();
        spr.key = ''; bg.key = ''; bg.sunset = null;
      }
      function loupeSize() { return Math.round(Math.min(M.r * 1.55, M.phone ? 250 : 320)); }
      function layoutStones() {
        const n = stoneEls.length, offs = n >= 3 ? [[-0.16, -0.46], [0.17, -0.02], [-0.1, 0.44]] : [[-0.12, -0.26], [0.12, 0.26]];
        stoneEls.forEach((s, i) => { if (s.done || s.drag) return; s.x = M.cx + offs[i][0] * M.r; s.y = M.cy + offs[i][1] * M.r; s.el.style.left = s.x + 'px'; s.el.style.top = s.y + 'px'; });
      }
      function placeHint() {
        const shift = M.phone && st.rushOn;
        hint.style.left = (shift ? (M.w - 78) / 2 : M.w / 2) + 'px'; hint.style.maxWidth = (shift ? M.w - 104 : M.w - 32) + 'px';
      }
      function placeCard() {
        const narrow = M.phone && st.rushOn;
        Object.assign(card.style, { left: M.card.x + 'px', top: M.card.y + 'px', width: (narrow ? M.card.w - 70 : M.card.w) + 'px' });
      }
      function placeVialHit() { const v = vialAt(); vialHit.style.left = v.x + 'px'; vialHit.style.top = v.y + 'px'; }
      cv.onResize(layout);
      S.on('theme', () => { bg.key = ''; bg.sunset = null; });

      /* ---------------- sprites (cached; rebuilt only on resize) ---------------- */
      let caus = null;
      function causticTile(seed) {
        const N = 128, c = mk(N, N), g = c.getContext('2d'), img = g.createImageData(N, N), d = img.data, R = K.rng(seed), pts = [];
        for (let i = 0; i < 13; i++) pts.push([R() * N, R() * N]);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          let f1 = 1e9, f2 = 1e9;
          for (let i = 0; i < pts.length; i++) {
            let dx = Math.abs(x - pts[i][0]), dy = Math.abs(y - pts[i][1]); if (dx > N / 2) dx = N - dx; if (dy > N / 2) dy = N - dy;
            const dd = dx * dx + dy * dy; if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd;
          }
          const e = Math.sqrt(f2) - Math.sqrt(f1), v = Math.pow(Math.max(0, 1 - e / 7), 2.4), o = (y * N + x) * 4;
          d[o] = 255; d[o + 1] = 249; d[o + 2] = 222; d[o + 3] = Math.round(v * 235);
        }
        g.putImageData(img, 0, 0); return c;
      }
      function buildSprites() {
        const dpr = cv.dpr || 1, key = M.w + 'x' + M.h + ':' + dpr;
        if (spr.key === key) return; spr.key = key;
        if (!caus) caus = causticTile(river.key.length * 7 + 3);
        spr.patRiver = cv.g ? cv.g.createPattern(caus, 'repeat') : null; spr.patPan = spr.patRiver;
        // the pan: rolled steel rim, sloped wall, riffles on the lip side, flat bottom, its shadow on the riverbed
        const r = M.r, pad = Math.round(r * 0.18) + 18, S0 = (r + pad) * 2, c = mk(S0 * dpr, S0 * dpr), g = c.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, (r + pad) * dpr, (r + pad) * dpr);
        const sh = g.createRadialGradient(9, 15, r * 0.82, 9, 15, r + pad - 2); sh.addColorStop(0, 'rgba(0,0,0,0.42)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = sh; g.beginPath(); g.arc(9, 15, r + pad - 2, 0, TAU); g.fill();
        const rim = g.createLinearGradient(-r, -r, r, r); rim.addColorStop(0, '#dbe2e8'); rim.addColorStop(0.28, '#6e7680'); rim.addColorStop(0.62, '#2a3037'); rim.addColorStop(1, '#9ca5ae');
        g.fillStyle = rim; g.beginPath(); g.arc(0, 0, r + 12, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, r + 12, 0, TAU); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r + 8.5, Math.PI * 1.02, Math.PI * 1.62); g.stroke();
        const wall = g.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.2, 0, 0, r); wall.addColorStop(0, '#4a5663'); wall.addColorStop(0.6, '#3a4450'); wall.addColorStop(0.86, '#4b5664'); wall.addColorStop(1, '#6b7684');
        g.fillStyle = wall; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
        g.lineWidth = 1; for (let k = 0; k < 10; k++) { g.strokeStyle = 'rgba(255,255,255,' + (0.025 + (k % 3) * 0.012).toFixed(3) + ')'; g.beginPath(); g.arc(0, 0, r * (0.6 + k * 0.04), 0, TAU); g.stroke(); }
        for (let i = 0; i < 3; i++) { const q = r * (0.94 - i * 0.075); g.lineWidth = 3.4; g.strokeStyle = 'rgba(6,8,10,0.8)'; g.beginPath(); g.arc(0, 0, q, LIP - 0.95, LIP + 0.95); g.stroke(); g.lineWidth = 1.3; g.strokeStyle = 'rgba(215,225,235,0.34)'; g.beginPath(); g.arc(0, 0, q - 2.3, LIP - 0.95, LIP + 0.95); g.stroke(); }
        const bt = g.createRadialGradient(-r * 0.15, -r * 0.2, 4, 0, 0, r * 0.58); bt.addColorStop(0, '#4a5562'); bt.addColorStop(1, '#2c333c');
        g.fillStyle = bt; g.beginPath(); g.arc(0, 0, r * 0.58, 0, TAU); g.fill();
        const cp = g.createPattern(caus, 'repeat'); if (cp) { g.save(); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.clip(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.09; g.scale(1.5, 1.5); g.fillStyle = cp; g.fillRect(-r, -r, r * 1.4, r * 1.4); g.restore(); }
        g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, r * 0.58, 0, TAU); g.stroke();
        spr.pan = c; spr.panPad = pad;
        // swirling water streaks
        const sw = mk(r * 2 * dpr, r * 2 * dpr), sg = sw.getContext('2d'), Rn = K.rng(77);
        sg.setTransform(dpr, 0, 0, dpr, r * dpr, r * dpr); sg.lineCap = 'round';
        for (let i = 0; i < 110; i++) { const q = r * (0.1 + 0.88 * Math.sqrt(Rn())), a0 = Rn() * TAU, len = 0.18 + Rn() * 0.9; sg.strokeStyle = 'rgba(255,255,255,' + (0.05 + Rn() * 0.2).toFixed(3) + ')'; sg.lineWidth = 0.7 + Rn() * 2.4; sg.beginPath(); sg.arc(0, 0, q, a0, a0 + len); sg.stroke(); }
        for (let i = 0; i < 26; i++) { const q = r * (0.78 + Rn() * 0.2), a0 = Rn() * TAU; sg.strokeStyle = 'rgba(255,255,255,' + (0.25 + Rn() * 0.3).toFixed(3) + ')'; sg.lineWidth = 1.2 + Rn() * 1.6; sg.beginPath(); sg.arc(0, 0, q, a0, a0 + 0.08 + Rn() * 0.2); sg.stroke(); }
        spr.swirl = sw;
        // vortex dimple: darker centre, lighter wall
        const vx = mk(r * 2 * dpr, r * 2 * dpr), vg = vx.getContext('2d'); vg.setTransform(dpr, 0, 0, dpr, r * dpr, r * dpr);
        const vr = vg.createRadialGradient(0, 0, 0, 0, 0, r); vr.addColorStop(0, 'rgba(6,14,18,0.55)'); vr.addColorStop(0.45, 'rgba(6,14,18,0.12)'); vr.addColorStop(0.8, 'rgba(255,255,255,0)'); vr.addColorStop(1, 'rgba(255,255,255,0.16)');
        vg.fillStyle = vr; vg.fillRect(-r, -r, r * 2, r * 2); spr.vortex = vx;
        // sun on the water
        const sp = mk(160, 90), pg = sp.getContext('2d'), pr = pg.createRadialGradient(80, 45, 2, 80, 45, 78);
        pr.addColorStop(0, 'rgba(255,255,240,0.75)'); pr.addColorStop(0.3, 'rgba(255,250,220,0.25)'); pr.addColorStop(1, 'rgba(255,250,220,0)');
        pg.setTransform(1, 0, 0, 0.56, 0, 20); pg.fillStyle = pr; pg.fillRect(0, 0, 160, 160); spr.spec = sp;
        // glint star
        const gl = mk(64, 64), gg = gl.getContext('2d'), gr = gg.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, 'rgba(255,253,235,1)'); gr.addColorStop(0.18, 'rgba(255,240,180,0.55)'); gr.addColorStop(1, 'rgba(255,230,150,0)');
        gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64); gg.fillStyle = '#fffdf0'; K.starPath(gg, 32, 32, 30, 2.6, 4, 0); gg.fill(); K.starPath(gg, 32, 32, 14, 2, 4, Math.PI / 4); gg.fill();
        spr.glint = gl;
        // gold flecks (three flakes) and the fool's gold cluster
        spr.fleck = [0, 1, 2].map(v => {
          const s = 40, fc = mk(s * dpr, s * dpr), fg = fc.getContext('2d'), Rf = K.rng(11 + v * 7); fg.setTransform(dpr, 0, 0, dpr, s / 2 * dpr, s / 2 * dpr);
          fg.beginPath(); const n = 7 + v; for (let i = 0; i < n; i++) { const a = i / n * TAU, q = 11 * (0.6 + Rf() * 0.45); i ? fg.lineTo(Math.cos(a) * q, Math.sin(a) * q * 0.8) : fg.moveTo(Math.cos(a) * q, Math.sin(a) * q * 0.8); } fg.closePath();
          const fgr = fg.createLinearGradient(-10, -10, 10, 10); fgr.addColorStop(0, '#fff6c4'); fgr.addColorStop(0.4, '#ffd54a'); fgr.addColorStop(1, '#b77f12');
          fg.fillStyle = fgr; fg.shadowColor = 'rgba(255,200,60,0.9)'; fg.shadowBlur = 8; fg.fill(); fg.shadowBlur = 0; fg.strokeStyle = 'rgba(120,70,0,0.6)'; fg.lineWidth = 1; fg.stroke();
          fg.fillStyle = 'rgba(255,255,240,0.85)'; fg.beginPath(); fg.ellipse(-3, -3, 3.4, 1.8, -0.6, 0, TAU); fg.fill();
          return fc;
        });
        const pc = mk(60 * dpr, 60 * dpr), pgc = pc.getContext('2d'); pgc.setTransform(dpr, 0, 0, dpr, 30 * dpr, 30 * dpr);
        [[0, -2, 15], [-11, 9, 10], [12, 10, 9]].forEach(([x, y, s]) => { const a = s * 0.87, b = s * 0.5; const face = (pts, col) => { pgc.fillStyle = col; pgc.beginPath(); pts.forEach((p, i) => i ? pgc.lineTo(x + p[0], y + p[1]) : pgc.moveTo(x + p[0], y + p[1])); pgc.closePath(); pgc.fill(); };
          face([[0, -s], [a, -b], [0, 0], [-a, -b]], '#f8eaa0'); face([[-a, -b], [0, 0], [0, s], [-a, b]], '#c7b25a'); face([[0, 0], [a, -b], [a, b], [0, s]], '#8f7e32'); });
        spr.pyr = pc;
        bg.key = '';
      }
      function paintBg(mode) {
        const W = M.w, H = M.h, dpr = cv.dpr || 1, c = mk(W * dpr, H * dpr), g = c.getContext('2d', { alpha: false });
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const dark = S.scene() === 'dark';
        const tone = (col) => { let x = col; if (mode === 'gloom') x = mixHex(shade(x, -0.16), '#4c5d78', 0.42); else if (mode === 'sunset') x = mixHex(x, '#ff8f52', 0.2); if (dark) x = shade(x, mode === 'sunset' ? -0.1 : -0.18); return x; };
        const R = K.rng(river.key.length * 131 + 17), top = M.bankH, bot = M.bedBot;
        g.fillStyle = tone(river.sand); g.fillRect(0, 0, W, H);
        const cols = river.bed.map(tone), n = Math.round(W * (bot - top + 40) / (M.phone ? 360 : 720));
        for (let i = 0; i < n; i++) {
          const x = R() * W, y = top - 16 + R() * (bot - top + 32), rw = 2.6 + Math.pow(R(), 2.3) * (M.phone ? 15 : 19), rh = rw * (0.6 + R() * 0.32), rot = (R() - 0.5) * 1.2, col = cols[(R() * cols.length) | 0];
          g.fillStyle = 'rgba(0,0,0,0.24)'; g.beginPath(); g.ellipse(x + 1.3, y + 1.9, rw, rh, rot, 0, TAU); g.fill();
          g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rw, rh, rot, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.17)'; g.beginPath(); g.ellipse(x - rw * 0.22, y - rh * 0.3, rw * 0.5, rh * 0.38, rot, 0, TAU); g.fill();
        }
        const wc = river.water.map(tone), wg = g.createLinearGradient(0, top, 0, bot);
        wg.addColorStop(0, rgba(wc[0], 0.42)); wg.addColorStop(0.18, rgba(wc[1], 0.52)); wg.addColorStop(0.55, rgba(wc[2], 0.6)); wg.addColorStop(0.86, rgba(wc[1], 0.5)); wg.addColorStop(1, rgba(wc[0], 0.42));
        g.fillStyle = wg; g.fillRect(0, top - 20, W, bot - top + 40);
        const bpat = caus ? g.createPattern(caus, 'repeat') : null;
        if (bpat) { g.save(); g.beginPath(); g.rect(0, top, W, bot - top); g.clip(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = mode === 'gloom' ? 0.05 : 0.1; g.scale(2.1, 2.1); g.fillStyle = bpat; g.fillRect(0, 0, W / 2.1 + 2, H / 2.1 + 2); g.restore(); }
        if (mode === 'sunset') { const sg = g.createLinearGradient(0, top, W * 0.4, bot); sg.addColorStop(0, 'rgba(255,175,95,0.46)'); sg.addColorStop(0.5, 'rgba(255,118,120,0.32)'); sg.addColorStop(1, 'rgba(140,86,200,0.36)'); g.fillStyle = sg; g.fillRect(0, top - 10, W, bot - top + 20); }
        paintBank(g, R, tone, true); paintBank(g, R, tone, false);
        if (mode !== 'gloom') { g.globalCompositeOperation = 'lighter'; const sb = g.createRadialGradient(W * 0.1, -H * 0.06, 10, W * 0.1, -H * 0.06, Math.max(W, H) * 0.95); sb.addColorStop(0, mode === 'sunset' ? 'rgba(255,160,70,0.36)' : 'rgba(255,244,200,0.2)'); sb.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = sb; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
        if (mode === 'gloom') { const v = g.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.3, W / 2, H * 0.46, Math.max(W, H) * 0.78); v.addColorStop(0, 'rgba(16,22,34,0)'); v.addColorStop(1, 'rgba(16,22,34,0.55)'); g.fillStyle = v; g.fillRect(0, 0, W, H); }
        if (mode === 'sunset') { const v = g.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.8); v.addColorStop(0, 'rgba(60,20,50,0)'); v.addColorStop(1, 'rgba(60,20,50,0.4)'); g.fillStyle = v; g.fillRect(0, 0, W, H); }
        return c;
      }
      function paintBank(g, R, tone, isTop) {
        const W = M.w, H = M.h, y0 = isTop ? M.bankH : M.bedBot, ph = isTop ? 1.3 : 4.1, amp = isTop ? 7 : 6;
        const edge = (x) => y0 + Math.sin(x * 0.021 + ph) * amp + Math.sin(x * 0.057 + ph * 2) * 3.5;
        if (isTop) { const sh = g.createLinearGradient(0, y0 - 6, 0, y0 + 32); sh.addColorStop(0, 'rgba(0,0,0,0.34)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(0, y0 - 6, W, 38); }
        g.beginPath(); g.moveTo(0, isTop ? 0 : H); g.lineTo(W, isTop ? 0 : H); for (let x = W + 8; x >= -8; x -= 8) g.lineTo(x, edge(x)); g.closePath();
        const lg = g.createLinearGradient(0, isTop ? 0 : y0, 0, isTop ? y0 : H);
        if (isTop) { lg.addColorStop(0, tone(river.bank[1])); lg.addColorStop(1, tone(river.bank[0])); } else { lg.addColorStop(0, tone(river.edge)); lg.addColorStop(1, tone(shade(river.edge, -0.16))); }
        g.fillStyle = lg; g.fill();
        const strokeEdge = (off, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); for (let x = -8; x <= W + 8; x += 8) { const y = edge(x) + off; x === -8 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); };
        if (isTop) strokeEdge(-3, tone(river.edge), 8);
        strokeEdge(isTop ? 1.5 : -1.5, rgba(shade(tone(river.edge), -0.4), 0.55), 2.5);
        strokeEdge(isTop ? 6 : -6, 'rgba(255,255,255,0.34)', 1.6);
        const yr = (x) => (isTop ? [58, edge(x) - 10] : [edge(x) + 10, H - 4]);
        const nb = isTop ? (M.phone ? 4 : 8) : (M.phone ? 3 : 6);
        for (let i = 0; i < nb; i++) {
          const x = R() * W, [a, b] = yr(x), y = isTop ? b - R() * 16 : a + 8 + R() * 22, rw = 8 + R() * (isTop ? 17 : 13), rh = rw * (0.55 + R() * 0.2), col = tone(river.rock[(R() * 2) | 0]);
          g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(x + 3, y + 4, rw, rh, 0, 0, TAU); g.fill();
          g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rw, rh, 0, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.2)'; g.beginPath(); g.ellipse(x - rw * 0.25, y - rh * 0.35, rw * 0.5, rh * 0.35, 0, 0, TAU); g.fill();
        }
        if (!isTop) {
          for (let i = 0; i < (M.phone ? 70 : 160); i++) { const x = R() * W, [a, b] = yr(x), y = a + R() * (b - a), s = 1.2 + R() * 2.6; g.fillStyle = tone(river.bed[(R() * river.bed.length) | 0]); g.beginPath(); g.ellipse(x, y, s * 1.3, s, 0, 0, TAU); g.fill(); }
          return;
        }
        const d = river.deco, cnt = Math.round(W / (M.phone ? 7 : 9));
        if (d === 'alpine' || d === 'gum') {
          const gc = d === 'alpine' ? [tone('#3f6a2f'), tone('#9dc26f'), tone('#5f8f45')] : [tone('#c9a24a'), tone('#e3c27a'), tone('#9c7b3a')];
          g.lineCap = 'round';
          for (let i = 0; i < cnt * 1.6; i++) { const x = R() * W, [a, b] = yr(x), y = a + Math.pow(R(), 0.5) * (b - a); g.strokeStyle = gc[i % 3]; g.lineWidth = 1.5; g.beginPath(); for (let k = 0; k < 4; k++) { const dx = (R() - 0.5) * 8, len = 6 + R() * 8; g.moveTo(x, y); g.quadraticCurveTo(x + dx * 0.4, y - len * 0.6, x + dx, y - len); } g.stroke(); }
          for (let i = 0; i < cnt * 0.35; i++) { const x = R() * W, [a, b] = yr(x), y = a + R() * (b - a); if (d === 'alpine') { g.fillStyle = tone(river.flower[(R() * 3) | 0]); g.beginPath(); g.arc(x, y, 1.6 + R() * 1.4, 0, TAU); g.fill(); } else { g.fillStyle = tone(R() < 0.5 ? '#8fa38a' : '#b4b98f'); g.beginPath(); g.ellipse(x, y, 5 + R() * 3, 1.6, R() * Math.PI, 0, TAU); g.fill(); } }
        } else if (d === 'canyon') {
          g.strokeStyle = rgba(tone('#6e2d18'), 0.35); g.lineWidth = 2;
          for (let k = 0; k < 6; k++) { const yy = 60 + k * (M.bankH - 70) / 6; g.beginPath(); for (let x = 0; x <= W; x += 10) { const y = yy + Math.sin(x * 0.03 + k) * 3; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
          for (let i = 0; i < cnt * 0.12; i++) { const x = R() * W, [a, b] = yr(x), y = a + R() * (b - a); g.fillStyle = tone(R() < 0.5 ? '#5d6b34' : '#7c8a44'); g.beginPath(); g.arc(x, y, 3 + R() * 4, 0, TAU); g.arc(x + 4, y + 1, 2 + R() * 3, 0, TAU); g.fill(); }
          for (let i = 0; i < cnt * 0.2; i++) { const x = R() * W, [a, b] = yr(x), y = a + R() * (b - a); g.fillStyle = tone(river.flower[(R() * 3) | 0]); g.beginPath(); g.arc(x, y, 1.4 + R(), 0, TAU); g.fill(); }
        } else {
          for (let i = 0; i < cnt * 0.32; i++) {
            const x = R() * W, [, b] = yr(x), y = b - R() * 30, len = 18 + R() * 22, ang = -Math.PI / 2 + (R() - 0.5) * 1.6 + (R() < 0.5 ? 0.9 : -0.9) * 0.5;
            g.strokeStyle = tone(['#2f6b33', '#5fae52', '#7cc463', '#3f8a3a'][i % 4]); g.fillStyle = g.strokeStyle; g.lineWidth = 1.6;
            const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len + len * 0.5;
            g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(ang) * len * 0.6, y + Math.sin(ang) * len * 0.6, ex, ey); g.stroke();
            for (let k = 1; k < 7; k++) { const t = k / 7, px = lerp(x, ex, t), py = lerp(y, ey, t) + Math.sin(t * Math.PI) * -len * 0.25; g.beginPath(); g.ellipse(px, py, 4.5 * (1 - t * 0.6), 1.6, ang + 1.1, 0, TAU); g.ellipse(px, py, 4.5 * (1 - t * 0.6), 1.6, ang - 1.1, 0, TAU); g.fill(); }
          }
          for (let i = 0; i < cnt * 0.15; i++) { const x = R() * W, [a, b] = yr(x), y = a + R() * (b - a); g.fillStyle = tone(river.flower[(R() * 3) | 0]); g.beginPath(); g.arc(x, y, 1.5 + R() * 1.2, 0, TAU); g.fill(); }
          for (let i = 0; i < cnt * 0.25; i++) { const x = R() * W, [a, b] = yr(x), y = a + R() * (b - a); g.fillStyle = rgba(tone('#9fd17a'), 0.35); g.beginPath(); g.ellipse(x, y, 6 + R() * 10, 3 + R() * 4, R() * 3, 0, TAU); g.fill(); }
        }
      }
      function ensureBg() {
        const key = M.w + 'x' + M.h + ':' + (cv.dpr || 1) + ':' + S.scene();
        if (bg.key === key) return; bg.key = key;
        bg.gloom = paintBg('gloom'); bg.sun = paintBg('sun'); bg.sunset = st.sunset > 0 || st.phase === 'weighed' || st.phase === 'pour' ? paintBg('sunset') : null;
      }
      function ensureSunset() { if (!bg.sunset && M.w) bg.sunset = paintBg('sunset'); }

      /* ---------------- the pan's gravel ---------------- */
      const gcols = () => { const b = river.bed; return [mixHex(river.sand, '#e8d6ae', 0.55), mixHex(b[1], '#cdb48a', 0.45), mixHex(b[3] || b[0], '#b08a5e', 0.4), mixHex(b[2] || b[0], '#5d5248', 0.35), '#121417']; };
      let GC = gcols();
      function fillPan(layer) {
        GR.length = 0; GC = gcols();
        const n = Math.round((reduced() ? 100 : [150, 190, 230][inten]) * (M.phone ? 0.95 : 1.25)), R = K.rng(1000 + layer * 77 + K.daily());
        for (let i = 0; i < n; i++) {
          const type = i < n * 0.1 ? 2 : (R() < 0.6 ? 0 : 1);
          const r0 = type === 2 ? 0.52 + R() * 0.32 : Math.sqrt(R()) * 0.88;
          GR.push({ type, r: r0 * (0.5 + 0.5 * R()), r0, a: type === 2 ? LIP + (R() - 0.5) * 1.6 : R() * TAU, s: type === 1 ? 2.6 + R() * 3.8 : type === 2 ? 1.4 + R() * 1.4 : 1.3 + R() * 1.7, ci: type === 2 ? 4 : (type === 1 ? 2 + ((R() * 2) | 0) : (R() * 2) | 0), out: 0, q: R(), k: i });
        }
        GR.nLight = GR.filter(p => p.type !== 2).length;
      }
      function washOut(p, ri) {
        const x0 = M.cx + st.wob.x, y0 = M.cy + st.wob.y, x = x0 + Math.cos(p.a) * p.r * ri, y = y0 + Math.sin(p.a) * p.r * ri, tv = SW.wW * p.r * ri;
        p.out = 1; SG.push({ x, y, vx: -Math.sin(p.a) * tv * 0.5 + Math.cos(p.a) * 60 + FLOW, vy: Math.cos(p.a) * tv * 0.5 + Math.sin(p.a) * 40, life: 1, s: p.s, c: GC[p.ci] });
        if (SG.length > 160) SG.splice(0, SG.length - 160);
      }
      function updateGravel(dt) {
        const sp = SW.wW, asp = Math.abs(sp), spin = clamp(asp / 6, 0, 1), ri = M.r * 0.985;
        let light = 0; for (const p of GR) if (!p.out && p.type !== 2) light++;
        let need = light - Math.round((GR.nLight || 0) * (1 - st.prog));
        if (st.flush) need = light;
        const win = st.flush ? 9 : 0.5 + Math.min(1.2, Math.max(0, need - 4) * 0.08);
        for (const p of GR) {
          if (p.out) continue;
          const heavy = p.type === 2;
          p.a += sp * (heavy ? 0.4 : 1) * (0.62 + 0.38 * (1 - p.r)) * dt;
          const target = heavy ? (asp > 1.5 ? 0.6 + p.q * 0.14 : p.r0) : lerp(p.r0, 0.64 + p.q * 0.3, spin);
          p.r += (target - p.r) * Math.min(1, dt * (heavy ? 1.2 : 2.4));
          if (heavy && asp < 1.2) p.a += wrapA(LIP - p.a) * Math.min(1, dt * 0.7) * (0.2 + p.q * 0.5);
          if (need > 0 && !heavy && (p.r > 0.58 || st.flush) && Math.abs(wrapA(p.a - LIP)) < win) { washOut(p, ri); need--; }
        }
        for (let i = SG.length - 1; i >= 0; i--) { const q = SG[i]; q.x += q.vx * dt; q.y += q.vy * dt; q.vx += (FLOW - q.vx) * Math.min(1, dt * 1.4); q.vy *= Math.exp(-dt * 2.2); q.life -= dt * 0.75; if (q.life <= 0 || q.x > M.w + 20) SG.splice(i, 1); }
      }

      /* ---------------- audio: a creek, a swirl you can hear, and a fingerpicked guitar that warms up ---------------- */
      let slosh = null, flow = null, babble = null;
      function beds() {
        if (!A.ctx || flow) return;
        flow = A.loop({ pink: true, filter: 'lowpass', freq: 640, q: 0.4, bus: 'amb' }); flow && flow.level(0.15, 1.6);
        babble = A.loop({ filter: 'bandpass', freq: 1700, q: 1.6, bus: 'amb' });
        slosh = A.loop({ pink: true, filter: 'bandpass', freq: 420, q: 0.9, bus: 'sfx' });
      }
      beds(); S.on('audio-ready', beds);
      S.onDestroy(() => { [slosh, flow, babble].forEach(x => x && x.stop()); });
      function drip() {
        if (A.ctx && !st.finished) { const f = 900 + Math.random() * 1500; A.tone({ type: 'sine', freq: f, to: f * 0.55, glide: 0.05, dur: 0.08, vol: 0.012 + Math.random() * 0.018, bus: 'amb', pan: Math.random() * 1.6 - 0.8 }); }
        S.later(drip, 280 + Math.random() * 1100);
      }
      function bird() {
        if (A.ctx) {
          const t = A.now() + 0.05;
          if (river.bird === 'wren') for (let i = 0; i < 9; i++) A.tone({ when: t + i * 0.07, type: 'sine', freq: 4300 - i * 220, to: 4100 - i * 220, glide: 0.04, dur: 0.06, vol: 0.016, bus: 'amb', pan: 0.5 });
          else if (river.bird === 'whip') { A.tone({ when: t, type: 'sine', freq: 1200, to: 2600, glide: 0.8, dur: 0.85, vol: 0.016, bus: 'amb', pan: -0.5 }); A.noise({ when: t + 0.9, filter: 'highpass', freq: 3800, dur: 0.05, vol: 0.05, bus: 'amb', pan: -0.5 }); [1.05, 1.22].forEach(o => A.tone({ when: t + o, type: 'sine', freq: 2500, to: 1700, glide: 0.08, dur: 0.1, vol: 0.016, bus: 'amb', pan: -0.5 })); }
          else if (river.bird === 'bell') { const n = 1 + (Math.random() < 0.4 ? 1 : 0); for (let i = 0; i < n; i++) A.tone({ when: t + i * 0.32, type: 'sine', freq: 2950 + Math.random() * 60, dur: 0.28, vol: 0.022, bus: 'amb', pan: Math.random() * 1.4 - 0.7, verb: 0.4 }); }
          else A.noise({ when: t, pink: true, filter: 'lowpass', freq: 380, to: 900, q: 0.5, dur: 2.6, attack: 1.2, vol: 0.05, bus: 'amb' });
        }
        S.later(bird, 5000 + Math.random() * 6000);
      }
      S.later(drip, 900); S.later(bird, 3500);
      const MZ = { on: true, next: 0, i: 0, t0: 0, layer: 0, warmBar: 1e9, vol: 1 };
      const SAD = [['B2', ['D4', 'F#4', 'B4']], ['G2', ['D4', 'G4', 'B4']], ['D3', ['D4', 'F#4', 'A4']], ['A2', ['C#4', 'E4', 'A4']]];
      const WARM = [['D3', ['F#4', 'A4', 'D5']], ['G2', ['G4', 'B4', 'D5']], ['B2', ['F#4', 'B4', 'D5']], ['A2', ['E4', 'A4', 'C#5']]];
      const MEL = ['A5', 'F#5', 'E5', 'D5', 'B4', 'D5', 'E5', 'F#5'];
      const chordAt = (i) => { const bar = Math.floor(i / 8); return (bar >= MZ.warmBar ? WARM : SAD)[bar % 4]; };
      function warmUp() { if (MZ.warmBar > 1e8) MZ.warmBar = Math.floor(MZ.i / 8) + 1; }
      S.loop(() => {
        if (!A.ctx || !MZ.on) return;
        if (!MZ.next) { MZ.next = A.now() + 0.12; MZ.t0 = MZ.next; }
        const e8 = 30 / BPM, ahead = A.now() + 0.3;
        if (MZ.next < A.now() - 0.08) { const skip = Math.ceil((A.now() - MZ.next) / e8); MZ.next += skip * e8; MZ.i += skip; }
        while (MZ.next < ahead) { eighth(MZ.next, MZ.i); MZ.i++; MZ.next += e8; }
      });
      function eighth(t, i) {
        const e = i % 8, bar = Math.floor(i / 8), [root, ch] = chordAt(i), v = MZ.vol, rf = A.note(root);
        if (e % 2 === 0) {
          const f = e === 2 || e === 6 ? rf * 1.5 : (e === 4 && MZ.layer >= 1 ? rf * 2 : rf);
          A.pluck(f, { when: t, vol: (e === 0 ? 0.26 : 0.17) * v, damp: 0.992, lp: 1150, bus: 'music' });
          const d = Math.max(0, (t - A.now()) * 1000); S.later(() => { st.beat = 1; FL.forEach((f2, k) => { if ((e / 2 + k) % 2 === 0) f2.flash = 1; }); }, d);
        }
        if (MZ.layer >= 1 && e % 2 === 1) A.pluck(A.note(ch[[2, 1, 2, 0][(e - 1) / 2]]), { when: t + 0.012, vol: 0.1 * v, damp: 0.996, verb: 0.22, bus: 'music' });
        if (MZ.layer >= 1 && e === 0) A.pluck(A.note(ch[2]) * 2, { when: t + 0.006, vol: 0.06 * v, damp: 0.997, verb: 0.3, bus: 'music' });
        if (MZ.layer >= 2 && inten > 0) A.noise({ when: t + (e % 2 ? 0.035 : 0), filter: 'highpass', freq: 6800, dur: 0.05, attack: 0.012, vol: (e % 2 ? 0.01 : 0.018) * v, bus: 'music' });
        if (MZ.layer >= 3 && (e === 0 || e === 3 || e === 5)) A.chime(A.note(MEL[(bar * 3 + e) % MEL.length]), { when: t, vol: 0.032 * v, dur: 1.5, bus: 'music' });
      }
      const noteUp = (i) => A.note(['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6'][Math.min(6, i)]);
      function sTink() { if (!A.ctx) return; A.tone({ type: 'triangle', freq: 3400, to: 2900, glide: 0.03, dur: 0.06, vol: 0.05 }); A.noise({ filter: 'highpass', freq: 5000, dur: 0.02, vol: 0.05 }); }
      function sPlink(i) { if (!A.ctx) return; A.tone({ type: 'sine', freq: 1500, to: 900, glide: 0.08, dur: 0.12, vol: 0.06 }); A.pluck(noteUp(i), { vol: 0.2, damp: 0.997, verb: 0.35 }); A.chime(noteUp(i) * 2, { when: A.now() + 0.08, vol: 0.05, dur: 1.4 }); }
      function sSplash(v) { if (!A.ctx) return; v = v || 1; A.noise({ filter: 'lowpass', freq: 2200, to: 300, dur: 0.35, vol: 0.12 * v }); A.tone({ type: 'sine', freq: 620, to: 150, glide: 0.14, dur: 0.18, vol: 0.09 * v }); for (let i = 0; i < 4; i++) A.tone({ when: A.now() + 0.08 + Math.random() * 0.25, type: 'sine', freq: 1200 + Math.random() * 1400, to: 700, glide: 0.04, dur: 0.06, vol: 0.02 * v }); }
      function sThunk() { if (!A.ctx) return; A.thud({ vol: 0.32 }); A.wood(undefined, 0.12, 0.6); A.tone({ when: A.now() + 0.05, type: 'sawtooth', freq: 140, to: 95, glide: 0.4, dur: 0.45, vol: 0.02, lp: 700 }); }
      function sCrunch() { if (!A.ctx) return; const t = A.now(); for (let i = 0; i < 9; i++) A.noise({ when: t + i * 0.022 + Math.random() * 0.02, filter: 'bandpass', freq: 1800 + Math.random() * 3600, q: 1.3, dur: 0.04 + Math.random() * 0.05, vol: 0.12 + Math.random() * 0.08 }); for (let i = 0; i < 6; i++) A.chime(1700 + Math.random() * 1400, { when: t + 0.08 + i * 0.05, vol: 0.025, dur: 0.5 }); A.tone({ when: t, type: 'square', freq: 220, to: 70, glide: 0.18, dur: 0.22, vol: 0.05, lp: 1200 }); }
      function sShimmer() { if (!A.ctx) return; const t = A.now(); ['C6', 'E6', 'G6', 'B6', 'D7', 'G7'].forEach((n, i) => A.tone({ when: t + i * 0.045, type: 'triangle', freq: A.note(n), dur: 0.5, vol: 0.035, verb: 0.5 })); A.noise({ when: t, filter: 'highpass', freq: 7000, dur: 0.6, attack: 0.1, vol: 0.05 }); }

      /* ---------------- tiny tween helper (runs in the game loop) ---------------- */
      const TWS = [];
      function tween(ms, fn, ez) { if (reduced()) ms = Math.min(ms, 240); return new Promise(res => { TWS.push({ t0: now(), ms: Math.max(1, ms), fn, ez: ez || (k => k), res }); }); }
      function stepTweens() { for (let i = TWS.length - 1; i >= 0; i--) { const tw = TWS[i], k = clamp((now() - tw.t0) / tw.ms, 0, 1); try { tw.fn(tw.ez(k)); } catch (e) { console.error(e); } if (k >= 1) { TWS.splice(i, 1); tw.res(); } } }
      function ripple(x, y, max, life) { RIP.push({ x, y, t0: now(), max: max || 60, life: (life || 0.9) * 1000 }); if (RIP.length > 14) RIP.shift(); }

      /* ---------------- geometry helpers ---------------- */
      function balEnds() { const B = M.bal, c = Math.cos(st.tilt), s = Math.sin(st.tilt); return { lx: B.x - B.arm * c, ly: B.y + B.arm * s, rx: B.x + B.arm * c, ry: B.y - B.arm * s }; }
      const leftPan = () => { const e = balEnds(); return { x: e.lx, y: e.ly + M.bal.chain }; };
      const rightPan = () => { const e = balEnds(); return { x: e.rx, y: e.ry + M.bal.chain }; };
      const vialScale = () => (M.phone ? 0.92 : 1.3);
      function vialAt() { if (st.vialDrag) return st.vialDrag; if (st.vialOn) { const p = rightPan(); return { x: p.x, y: p.y + 2 }; } return { x: M.vial.x, y: M.vial.y }; }
      function vialMouth() { const v = vialAt(); return { x: v.x, y: v.y - 70 * vialScale() + 6 }; }
      function fleckPos(f) { const ri = M.r * 0.985; return { x: M.cx + Math.cos(f.a) * f.r * ri, y: M.cy + Math.sin(f.a) * f.r * ri }; }
      function placeFleckBtn(f) { if (!f.btn) return; const p = fleckPos(f); f.btn.style.left = p.x + 'px'; f.btn.style.top = p.y + 'px'; }

      /* ---------------- hint pill and the gold card ---------------- */
      let hintText = '', hintCls = '';
      function hintSet(t, cls) { cls = cls || ''; if (t === hintText && cls === hintCls) return; hintText = t; hintCls = cls; hint.hidden = !t; hint.textContent = t; hint.className = 'gp-hint' + (cls ? ' ' + cls : ''); }
      function showCard(fact) {
        card.hidden = false; card.className = 'gp-card'; placeCard();
        card.replaceChildren(h('small', { text: fact.tag }), h('p', { class: fact.user ? 'gk-user' : '', text: fact.text }), h('b', { text: 'True ✓' }));
        void card.offsetWidth; card.classList.add('gp-in');
      }
      function hideCard() { card.hidden = true; }

      /* ---------------- step 1: lift the heavy stones onto the scale ---------------- */
      let liftResolve = null;
      stoneEls.forEach(s => {
        K.drag(s.el, {
          space: el,
          start: (p) => {
            if (st.phase !== 'lift' || s.done || st.lifting) return false;
            s.drag = { dx: p.x - s.x, dy: p.y - s.y }; s.el.classList.add('lift'); s.el.style.zIndex = '19';
            K.sfx.pop(undefined, 300); sSplashSmall(s.x, s.y);
            K.guide(null);
          },
          move: (p) => { if (!s.drag) return; s.x = p.x - s.drag.dx; s.y = p.y - s.drag.dy; s.el.style.left = s.x + 'px'; s.el.style.top = s.y + 'px'; if (Math.random() < 0.25) P.emit('drop', s.x + (Math.random() - 0.5) * 60, s.y + 18, 1); },
          end: (p, d) => {
            if (!s.drag) return; s.drag = null; s.el.classList.remove('lift');
            const L0 = leftPan();
            if (Math.hypot(s.x - L0.x, s.y - L0.y) < 120 || s.y < M.cy - M.r * 0.62 || d.vy < -650) landStone(s);
            else { K.sfx.soft(); layoutStones(); liftGuide(); }
          }
        });
        S.listen(s.el, 'keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && st.phase === 'lift' && !s.done && !st.lifting) { e.preventDefault(); A.unlock(); K.sfx.pop(undefined, 300); landStone(s); } });
      });
      function sSplashSmall(x, y) { ripple(x, y + 10, 50, 0.7); P.emit('drop', x, y + 12, 8, { angle: -Math.PI / 2, spread: 1.6, speed: [40, 120] }); if (A.ctx) A.noise({ filter: 'bandpass', freq: 1400, to: 600, q: 0.8, dur: 0.22, vol: 0.06 }); }
      function landStone(s) {
        st.lifting = true; s.done = true; K.guide(null);
        const L0 = leftPan();
        s.el.style.zIndex = '19'; s.el.style.left = L0.x + 'px'; s.el.style.top = (L0.y - 6) + 'px'; s.el.classList.add('gone');
        K.later(() => {
          s.el.remove(); st.stonesOn++; st.tiltT = Math.min(0.36, st.stonesOn * (0.36 / stoneN)); st.tiltV -= 1.6;
          sThunk(); K.sfx.thud(); P.emit('dust', L0.x, L0.y - 2, 10, { colors: ['rgba(200,190,170,0.55)'] });
          ctx.track('stone', { n: st.stonesOn });
          drop.react('bounce');
          st.lifting = false;
          const left = stoneEls.filter(x => !x.done).length;
          if (st.stonesOn === 1 && left) drop.say(L(LINES.lift1), { mood: 'calm', ms: 3200 });
          if (!left) { if (liftResolve) { const r = liftResolve; liftResolve = null; r(); } }
          else liftGuide();
        }, reduced() ? 120 : 360);
      }
      function liftGuide() {
        const s = stoneEls.find(x => !x.done); stoneEls.forEach(x => x.el.classList.toggle('next', x === s));
        if (!s) return;
        const L0 = leftPan();
        const r0 = K.rectIn(s.el), ay = r0.y + 4;
        K.guide({ id: 'lift', g: 'drag', target: () => ({ x: s.x, y: ay }), dx: Math.round((L0.x - s.x) * 0.75), dy: Math.round((L0.y - ay) * 0.75), label: st.stonesOn ? 'NEXT STONE' : 'LIFT IT ONTO THE SCALE', delay: st.stonesOn ? 700 : 900, place: 'above' });
      }

      /* ---------------- step 2: swirl ---------------- */
      K.press(panHit, {
        space: el,
        down: (p) => {
          if (st.phase !== 'swirl') return;
          SW.active = true; SW.last = null; SW.moveT = now(); SW.hist.length = 0; SW.lastAdv = now();
          const dx = p.x - M.cx, dy = p.y - M.cy;
          if (Math.hypot(dx, dy) > M.r * 0.12) { SW.last = Math.atan2(dy, dx); SW.fa = SW.last; }
          ripple(p.x, p.y, 40, 0.6); if (A.ctx) { A.noise({ filter: 'bandpass', freq: 900, to: 500, q: 0.9, dur: 0.18, vol: 0.05 }); A.sync('swirl', now()); }
        },
        move: (p) => {
          if (st.phase !== 'swirl' || !SW.active) return;
          const dx = p.x - M.cx, dy = p.y - M.cy;
          if (Math.hypot(dx, dy) < M.r * 0.12) { SW.last = null; return; }
          const a = Math.atan2(dy, dx);
          if (SW.last != null) advance(wrapA(a - SW.last), now());
          SW.last = a; SW.fa = a;
        },
        up: () => { SW.active = false; SW.last = null; }
      });
      /* The hand's speed is measured over the last ~half second of real time and progress comes from the laps actually
         swept, so the swirl feels the same on a fast phone and a struggling one. */
      function advance(da, tN) {
        SW.cum += da; SW.hist.push({ t: tN, a: SW.cum });
        while (SW.hist.length > 2 && SW.hist[0].t < tN - 700) SW.hist.shift();
        let i = 0; while (i < SW.hist.length - 2 && SW.hist[i].t < tN - 450) i++;
        const s0 = SW.hist[i], s1 = SW.hist[SW.hist.length - 1], span = (s1.t - s0.t) / 1000;
        if (span > 0.025) SW.wG = clamp((s1.a - s0.a) / span, -30, 30);
        if (Math.abs(SW.wG) > 0.5) SW.dir = Math.sign(SW.wG);
        SW.moveT = tN;
        const dts = Math.min(0.25, Math.max(0, (tN - (SW.lastAdv || tN)) / 1000)); SW.lastAdv = tN;
        if (st.phase !== 'swirl') return;
        const sp = Math.abs(SW.wG), [lo, hi] = BAND;
        const q = sp < lo ? 0.25 + 0.5 * sp / lo : sp > hi ? Math.max(0.3, 1 - (sp - hi) * 0.14) : 1;
        st.prog = Math.min(1, st.prog + Math.abs(da) * q / (REVS * TAU));
        if (sp > 0.8) { SW.n++; SW.sum += sp; SW.sum2 += sp * sp; SW.total += dts; if (sp >= lo && sp <= hi) SW.inBand += dts; }
        st.murk = Math.max(0.12, 1 - st.prog * 0.92);
        if (st.prog >= 1) cleared();
      }
      K.onKey(['Space', 'ArrowLeft', 'ArrowRight'], (e) => { if (st.phase !== 'swirl') return; if (e.preventDefault) e.preventDefault(); A.unlock(); if (!SW.kbOn) SW.lastAdv = now(); SW.kb = now(); SW.kdir = e.code === 'ArrowLeft' ? -1 : 1; });
      let roundResolve = null;
      function startSwirl() {
        st.phase = 'swirl'; st.prog = 0; SW.said = {}; SW.state = 'idle'; SW.stateT = now();
        panHit.classList.add('on');
        hintSet(st.round === 0 ? 'Swirl steadily. Follow the glint.' : 'Scoop ' + (st.round + 1) + ' of ' + rounds + ' · swirl steadily');
        K.guide({ id: 'swirl', g: 'circle', target: panHit, r: Math.round(M.r * 0.56), label: st.round ? 'SWIRL AGAIN' : 'SWIRL THE PAN', delay: st.round ? 450 : 800 });
        return new Promise(res => { roundResolve = res; });
      }
      function swirlFeedback(sp, tNow) {
        const [lo, hi] = BAND, active = SW.active || SW.kbOn;
        const s = active || sp > 1.2 ? (sp > hi ? 'fast' : sp < lo ? 'slow' : 'ok') : 'idle';
        if (s !== SW.state) { SW.state = s; SW.stateT = tNow; }
        const held = tNow - SW.stateT;
        if (s === 'ok') hintSet('Steady… that’s it', 'ok');
        else if (s === 'fast') hintSet('Easy, slower and steady', 'warn');
        else if (s === 'slow' && active) hintSet('A little faster', 'warn');
        else hintSet(st.round === 0 ? 'Swirl steadily. Follow the glint.' : 'Scoop ' + (st.round + 1) + ' of ' + rounds + ' · swirl steadily');
        if (s === 'fast' && held > 700 && !SW.said.fast) { SW.said.fast = 1; drop.say(L(LINES.fast), { mood: 'surprised', ms: 2600 }); if (st.rushOn) rush.face('laugh', 1400); }
        if (s === 'slow' && active && held > 1700 && !SW.said.slow) { SW.said.slow = 1; drop.say(L(LINES.slow), { mood: 'think', ms: 2400 }); }
        if (s === 'ok' && held > 1300 && !SW.said.steady && st.round === 0) { SW.said.steady = 1; drop.say(L(LINES.steady), { mood: 'happy', ms: 2600 }); }
      }
      async function cleared() {
        if (st.phase !== 'swirl') return;
        st.phase = 'reveal'; K.guide(null); hintSet(''); panHit.classList.remove('on'); SW.active = false;
        st.flush = true; if (A.ctx) A.noise({ pink: true, filter: 'lowpass', freq: 1400, to: 380, q: 0.6, dur: 0.7, attack: 0.08, vol: 0.12 });
        K.sfx.whoosh();
        await K.wait(reduced() ? 220 : 520);
        st.flush = false;
        const mean = SW.n ? SW.sum / SW.n : 0, sd = SW.n ? Math.sqrt(Math.max(0, SW.sum2 / SW.n - mean * mean)) : 0;
        ctx.track('round', { r: st.round + 1, steady: mean ? Math.round(clamp(1 - sd / mean, 0, 1) * 100) : 0 });
        if (roundResolve) { const r = roundResolve; roundResolve = null; r(); }
      }

      /* ---------------- step 3: the gold surfaces; pick it with tweezers ---------------- */
      let pickResolve = null;
      function surface(idxs, under) {
        const n = idxs.length, spread = n > 1 ? 0.62 : 0;
        const made = idxs.map((gi, k) => {
          const f = { kind: 'gold', gi, a: LIP + (n > 1 ? (k / (n - 1) - 0.5) * spread * 2 : (under ? 0.15 : -0.12)), r: 0.7 + (k % 2) * 0.08, size: M.phone ? 30 : 36, rot: Math.random() * TAU, v: (gi + k) % 3, shown: 0, flash: 0, ph: Math.random() * 6, picked: false, gone: false };
          const b = h('button', { type: 'button', class: 'gp-fleck', 'aria-label': 'Gold fleck. Pick it with the tweezers.' });
          f.btn = b; el.append(b); placeFleckBtn(f);
          K.tap(b, () => pickFleck(f));
          FL.push(f); return f;
        });
        made.forEach((f, k) => K.later(() => {
          tween(420, q => { f.shown = q; }, ease.outBack);
          const p = fleckPos(f); P.emit('star', p.x, p.y, 10, { colors: ['#fffbe6', '#ffe58a'] }); ripple(p.x, p.y, 34, 0.7);
          if (A.ctx) { A.chime(noteUp(st.vialN + k + 2) * 2, { vol: 0.07, dur: 1.6 }); K.sfx.sparkle(); }
        }, 160 + k * 220));
        st.murk = Math.min(st.murk, 0.12);
        return new Promise(res => { pickResolve = res; K.later(() => { st.phase = 'pick'; pickGuide(); }, 300 + n * 220); });
      }
      function pickGuide() {
        const f = FL.find(x => x.kind === 'gold' && !x.picked && x.btn); if (!f) return;
        K.guide({ id: 'pick', g: 'tap', target: f.btn, label: 'PICK THE GOLD', delay: 650 });
      }
      function pickFleck(f) {
        if (st.phase !== 'pick' || f.picked) return;
        f.picked = true; if (f.btn) { f.btn.remove(); f.btn = null; } K.guide(null);
        K.sfx.tap();
        const p = fleckPos(f), v = vialMouth();
        f.held = true; f.hx = p.x; f.hy = p.y;
        showCard(gold[f.gi]);
        ripple(p.x, p.y, 28, 0.6); P.emit('drop', p.x, p.y, 5, { angle: -Math.PI / 2, spread: 1.4, speed: [30, 90] });
        TWZ.on = true; TWZ.owner = f; TWZ.open = 1;
        let gripped = false;
        tween(860, k => {
          let x = p.x, y = p.y;
          const mine = TWZ.owner === f;
          if (k < 0.2) { const q = ease.outCubic(k / 0.2); if (mine) { TWZ.x = lerp(p.x + 140, p.x, q); TWZ.y = lerp(p.y - 200, p.y, q); TWZ.a = q; TWZ.open = 1; } }
          else if (k < 0.34) { if (!gripped) { gripped = true; sTink(); } const q = ease.outCubic((k - 0.2) / 0.14); y = p.y - 34 * q; if (mine) { TWZ.open = 0; TWZ.x = x; TWZ.y = y; } }
          else { const q = ease.inOutCubic((k - 0.34) / 0.66); x = lerp(p.x, v.x, q); y = lerp(p.y - 34, v.y, q) - Math.sin(q * Math.PI) * 70; if (mine) { TWZ.open = 0; TWZ.x = x; TWZ.y = y; TWZ.a = 1; } if (Math.random() < 0.5) P.emit('spark', x, y, 1, { colors: ['#fff3c4', '#ffd54a'], speed: [10, 40] }); }
          f.hx = x; f.hy = y;
        }).then(() => landFleck(f));
      }
      function landFleck(f) {
        f.held = false; f.gone = true; st.vialN++;
        if (TWZ.owner === f) { TWZ.owner = null; TWZ.open = 1; tween(200, k => { TWZ.a = 1 - k; TWZ.y -= 1.5; }).then(() => { if (!TWZ.owner) TWZ.on = false; }); }
        const v = vialMouth();
        sPlink(st.vialN); K.sfx.good(undefined, 4 + st.vialN);
        P.emit('star', v.x, v.y + 10, 8, { colors: ['#fffbe6', '#ffd54a'] });
        st.sunTarget = clamp(0.2 + 0.75 * st.vialN / goldN, 0, 1);
        if (st.vialN === 1) { warmUp(); drop.base('calm'); if (BIRD && !BIRD.fly) birdAway(); }
        const fact = gold[f.gi];
        drop.say(L(LINES.tag[fact.tag] || LINES.tag['Also true']), { mood: st.vialN >= goldN - 1 ? 'happy' : 'calm', ms: 2600 });
        if (st.rushOn) rush.face('laugh', 1200);
        ctx.track('gold', { n: st.vialN });
        const left = FL.filter(x => x.kind === 'gold' && !x.gone);
        if (!left.length) { if (pickResolve) { const r = pickResolve; pickResolve = null; K.later(r, 600); } }
        else if (!FL.some(x => x.kind === 'gold' && !x.picked)) { /* the rest are still flying */ }
        else pickGuide();
      }

      /* ---------------- the twist: fool's gold, bite-tested and tossed ---------------- */
      let foolResolve = null;
      function foolsGold() {
        st.phase = 'fool';
        const f = { kind: 'fool', a: -2.2, r: 0.3, size: M.phone ? 50 : 60, rot: 0.2, shown: 0, flash: 0, ph: 0, picked: false, gone: false };
        const b = h('button', { type: 'button', class: 'gp-fleck fool', 'aria-label': 'A huge shiny nugget. Tap it to bite-test it.' });
        f.btn = b; el.append(b); placeFleckBtn(f); FL.push(f);
        K.tap(b, () => pickFool(f));
        tween(520, q => { f.shown = q; }, ease.outBack);
        const p = fleckPos(f);
        P.emit('star', p.x, p.y, 26, { colors: ['#ffffff', '#fff3a0', '#bff6ff', '#ffc2f0'] }); ripple(p.x, p.y, 60, 0.9); sShimmer();
        st.rushOn = true; rush.show(true); rush.base('wow'); rush.react('bounce'); placeCard(); placeHint(); hideCard();
        drop.hush();
        rush.say(L(LINES.rushIn, { fool }), { mood: 'wow', ms: 4200 });
        K.later(() => { if (st.phase !== 'fool') return; drop.say(L(LINES.biteFirst), { mood: 'think', ms: 3400 }); }, 2300);
        K.guide({ id: 'fool', g: 'tap', target: b, label: 'TAP THE BIG ONE', delay: 2600 });
        return new Promise(res => { foolResolve = res; });
      }
      async function pickFool(f) {
        if (st.phase !== 'fool' || f.picked) return;
        f.picked = true; if (f.btn) { f.btn.remove(); f.btn = null; } K.guide(null); K.sfx.tap();
        const p = fleckPos(f);
        TWZ.on = true; TWZ.open = 1;
        await tween(180, k => { TWZ.x = lerp(p.x + 150, p.x, k); TWZ.y = lerp(p.y - 210, p.y, k); TWZ.a = k; }, ease.outCubic);
        TWZ.open = 0; sTink(); f.held = true; f.hx = p.x; f.hy = p.y;
        await tween(260, k => { TWZ.x = lerp(p.x, M.cx, k); TWZ.y = lerp(p.y, M.cy, k); f.hx = TWZ.x; f.hy = TWZ.y; }, ease.inOutCubic);
        f.held = false; f.gone = true; TWZ.on = false;
        openLoupe();
      }
      function openLoupe() {
        st.phase = 'bite';
        const sz = loupeSize();
        const lp = h('div', { class: 'gp-loupe', role: 'button', tabindex: '0', 'aria-label': 'Bite test. Press and hold to bite.' });
        lp.innerHTML = '<svg viewBox="0 0 240 240" aria-hidden="true">' +
          '<g class="gp-ring"><circle cx="120" cy="120" r="126" pathLength="100" transform="rotate(-90 120 120)"/></g>' +
          PYRITE('gp-pyr').replace('<svg viewBox="0 0 240 240" aria-hidden="true" class="gp-pyr">', '<g>').replace(/<\/svg>$/, '</g>') +
          '<g class="gp-jaw-top"><path d="M24 0 H216 V30 Q216 44 200 44 H40 Q24 44 24 30 Z" fill="#e98a9a"/>' + teeth(36, 'down') + '</g>' +
          '<g class="gp-jaw-bot"><path d="M24 240 H216 V210 Q216 196 200 196 H40 Q24 196 24 210 Z" fill="#e98a9a"/>' + teeth(204, 'up') + '</g></svg>' +
          '<span class="gp-holdlbl">Hold to bite</span>';
        Object.assign(lp.style, { left: M.cx + 'px', top: M.cy + 'px', width: sz + 'px', height: sz + 'px' });
        el.append(lp); st.loupe = lp;
        const fr = h('div', { class: 'gp-fool' }, h('small', { text: 'Too shiny?' }), h('span', { text: '“' + fool + '”' }));
        Object.assign(fr.style, { left: M.cx + 'px', top: (M.cy - sz / 2 - 18) + 'px' });
        el.append(fr); st.foolEl = fr;
        sShimmer(); K.sfx.whoosh();
        const start = () => { if (st.phase !== 'bite' || bite.on) return; bite.on = true; bite.t0 = now() - bite.k * BITE_MS; K.sfx.tap(); if (A.ctx) A.tone({ type: 'sawtooth', freq: 90, to: 140, glide: 1.1, dur: 1.1 * (1 - bite.k), vol: 0.025, lp: 500 }); };
        const stop = () => { if (!bite.on) return; biteTick(); bite.on = false; };
        K.press(lp, { down: start, up: stop });
        S.listen(lp, 'keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); A.unlock(); start(); } });
        S.listen(lp, 'keyup', (e) => { if (e.code === 'Space' || e.code === 'Enter') stop(); });
        K.guide({ id: 'bite', g: 'hold', target: lp, label: 'HOLD TO BITE-TEST', ms: 1600, delay: 500 });
      }
      let gnash = 0;
      function biteTick() {
        if (st.phase !== 'bite') return;
        if (bite.on) {
          bite.k = clamp((now() - bite.t0) / BITE_MS, 0, 1);
          if (A.ctx && (gnash += 1) % 6 === 0) A.noise({ filter: 'bandpass', freq: 2400, q: 2, dur: 0.03, vol: 0.03 + bite.k * 0.05 });
        }
        if (st.loupe) st.loupe.style.setProperty('--bite', bite.k.toFixed(3));
        if (bite.k >= 1) crack();
      }
      function teeth(y, dir) {
        let s = ''; for (let i = 0; i < 6; i++) { const x = 40 + i * 28, h2 = 26; s += dir === 'down' ? '<rect x="' + (x + 1) + '" y="' + (y - 2) + '" width="24" height="' + h2 + '" rx="9" fill="#fffaf0" stroke="#d9cbb6" stroke-width="1.5"/>' : '<rect x="' + (x + 1) + '" y="' + (y - h2 + 2) + '" width="24" height="' + h2 + '" rx="9" fill="#fffaf0" stroke="#d9cbb6" stroke-width="1.5"/>'; }
        return s;
      }
      function crack() {
        if (st.phase !== 'bite') return;
        st.phase = 'cracked'; st.cracked = true; K.guide(null);
        const lp = st.loupe; lp.classList.add('gp-cracked'); lp.style.setProperty('--bite', '1');
        lp.querySelector('.gp-holdlbl').textContent = 'Crack!';
        if (st.foolEl) { st.foolEl.classList.add('gp-cracked'); st.foolEl.querySelector('small').textContent = 'Fool’s gold · not true'; }
        sCrunch(); K.sfx.thud();
        P.emit('spark', M.cx, M.cy, 30, { colors: ['#f6e7a0', '#c8b45a', '#8d7d33', '#ffffff'], speed: [80, 260] });
        if (!reduced()) { lp.classList.add('gp-shake'); }
        rush.face('sad', 2600); drop.hush();
        drop.say(L(LINES.crack), { mood: 'wow', ms: 3600 });
        ctx.track('fool', { cracked: 1 });
        K.later(() => {
          lp.classList.add('out'); K.later(() => { lp.remove(); st.loupe = null; }, 380);
          const ch = h('div', { class: 'gp-chunk', role: 'button', tabindex: '0', 'aria-label': 'The cracked fool’s gold. Flick it back into the river, or press Enter.', html: PYRITE('gp-chunksvg gp-cracked') });
          Object.assign(ch.style, { left: M.cx + 'px', top: M.cy + 'px' }); el.append(ch); st.chunk = ch;
          st.phase = 'toss'; bindToss(ch);
          K.guide({ id: 'toss', g: 'drag', target: ch, dx: Math.round(M.r * 0.7), dy: Math.round(M.r * 0.45), label: 'TOSS IT BACK', delay: 500 });
        }, reduced() ? 600 : 1500);
      }
      function bindToss(ch) {
        let pos = { x: M.cx, y: M.cy }, drag = null;
        const throwIt = (dx, dy) => {
          if (st.phase !== 'toss') return; st.phase = 'tossed'; K.guide(null);
          let n = Math.hypot(dx, dy); if (n < 1) { dx = 1; dy = 0.5; n = Math.hypot(dx, dy); }
          const dist = M.r * 1.25 + 60, tx = clamp(pos.x + dx / n * dist, 24, M.w - 24), ty = clamp(pos.y + dy / n * dist, M.bankH + 24, M.bedBot - 24);
          K.sfx.whoosh(); ch.classList.add('fly'); ch.style.left = tx + 'px'; ch.style.top = ty + 'px';
          K.later(() => {
            ch.remove(); st.chunk = null; sSplash(1.1); ripple(tx, ty, 80, 1.2); ripple(tx, ty, 46, 0.9);
            P.emit('drop', tx, ty, 16, { angle: -Math.PI / 2, spread: 1.8, speed: [60, 180] });
            if (st.foolEl) { const fe = st.foolEl; fe.classList.add('gp-fade'); K.later(() => fe.remove(), 520); st.foolEl = null; }
            rush.say(L(LINES.aw), { mood: 'sad', ms: 2400 });
            K.later(() => { drop.say(L(LINES.lesson), { mood: 'happy', ms: 4200 }); rush.hush(); }, 1900);
            K.later(() => { if (foolResolve) { const r = foolResolve; foolResolve = null; r(); } }, reduced() ? 1800 : 5600);
          }, 620);
        };
        K.drag(ch, {
          space: el,
          start: (p) => { if (st.phase !== 'toss') return false; drag = { ox: p.x - pos.x, oy: p.y - pos.y, x0: pos.x, y0: pos.y }; ch.classList.remove('back'); K.sfx.pop(undefined, 420); },
          move: (p) => { if (!drag) return; pos = { x: p.x - drag.ox, y: p.y - drag.oy }; ch.style.left = pos.x + 'px'; ch.style.top = pos.y + 'px'; },
          end: (p, d) => {
            if (!drag) return; const dx = pos.x - drag.x0, dy = pos.y - drag.y0; const sp = Math.hypot(d.vx, d.vy); drag = null;
            if (Math.hypot(dx, dy) > 46 || sp > 650) throwIt(dx || d.vx, dy || d.vy);
            else { pos = { x: M.cx, y: M.cy }; ch.classList.add('back'); ch.style.left = pos.x + 'px'; ch.style.top = pos.y + 'px'; K.sfx.soft(); }
          }
        });
        S.listen(ch, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); A.unlock(); throwIt(1, 0.55); } });
      }

      /* ---------------- scoop again ---------------- */
      async function scoop() {
        st.phase = 'scoop'; hideCard(); hintSet('');
        drop.say(L(LINES.scoop), { mood: 'happy', ms: 2400 });
        K.sfx.whoosh(); if (A.ctx) { A.noise({ pink: true, filter: 'lowpass', freq: 500, to: 1600, q: 0.7, dur: 0.5, attack: 0.15, vol: 0.12 }); for (let i = 0; i < 6; i++) A.tone({ when: A.now() + 0.25 + i * 0.07, type: 'sine', freq: 300 + Math.random() * 500, to: 700 + Math.random() * 500, glide: 0.06, dur: 0.08, vol: 0.03 }); }
        FL.forEach(f => { if (f.btn) f.btn.remove(); }); FL.length = 0;
        await tween(340, k => { st.dip = k; }, ease.inOutCubic);
        fillPan(st.round + 1); st.murk = 1; st.prog = 0;
        ripple(M.cx, M.cy, M.r * 1.3, 1.2); P.emit('drop', M.cx + M.r * 0.9, M.cy, 14, { angle: -Math.PI / 2, spread: 2.2, speed: [60, 200] });
        await tween(400, k => { st.dip = 1 - k; }, ease.outCubic);
        st.round++;
      }

      /* ---------------- step 4: weigh the vial against the stones ---------------- */
      let weighResolve = null;
      function weigh() {
        st.phase = 'weigh'; hideCard(); hintSet('');
        MZ.layer = 3;
        vialHit.hidden = false; placeVialHit();
        drop.say(L(LINES.weigh), { mood: 'think', ms: 3600 });
        const v = vialAt(), tp = rightPan();
        K.guide({ id: 'weigh', g: 'drag', target: vialHit, oy: 0.55, dx: Math.round(tp.x - v.x), dy: Math.round(tp.y - v.y + 30), label: 'WEIGH THE GOLD', delay: 800, place: 'below' });
        S.later(ensureSunset, 400);
        return new Promise(res => { weighResolve = res; });
      }
      let vDrag = null;
      K.drag(vialHit, {
        space: el,
        start: (p) => { if (st.phase !== 'weigh') return false; const v = vialAt(); vDrag = { ox: p.x - v.x, oy: p.y - v.y }; st.vialDrag = { x: v.x, y: v.y }; vialHit.classList.add('drag'); K.sfx.pop(undefined, 700); if (A.ctx) A.tone({ type: 'sine', freq: 2000, to: 2400, glide: 0.05, dur: 0.08, vol: 0.03 }); K.guide(null); },
        move: (p) => { if (!vDrag) return; st.vialDrag = { x: p.x - vDrag.ox, y: p.y - vDrag.oy }; placeVialHit(); },
        end: () => {
          if (!vDrag) return; vDrag = null; vialHit.classList.remove('drag');
          const v = st.vialDrag, tp = rightPan();
          if (v && Math.hypot(v.x - tp.x, v.y - tp.y) < 95) placeVial();
          else { st.vialDrag = null; placeVialHit(); K.sfx.soft(); K.guide({ id: 'weigh2', g: 'drag', target: vialHit, oy: 0.55, dx: Math.round(tp.x - M.vial.x), dy: Math.round(tp.y - M.vial.y + 30), label: 'ONTO THE SCALE', delay: 600, place: 'below' }); }
        }
      });
      S.listen(vialHit, 'keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && st.phase === 'weigh') { e.preventDefault(); A.unlock(); placeVial(); } });
      function placeVial() {
        if (st.phase !== 'weigh') return;
        st.phase = 'weighed'; st.vialDrag = null; st.vialOn = true; vialHit.hidden = true; K.guide(null);
        st.tiltT = serious ? 0.1 : 0; st.tiltV += 2.4;
        if (A.ctx) { A.tone({ type: 'triangle', freq: 1900, to: 1700, dur: 0.12, vol: 0.06 }); A.tone({ when: A.now() + 0.06, type: 'sawtooth', freq: 120, to: 160, glide: 0.5, dur: 0.6, vol: 0.02, lp: 700 }); }
        K.sfx.lock(); ctx.track('weigh', { serious: serious ? 1 : 0 });
        K.later(() => {
          const stamp = h('div', { class: 'gp-even' + (serious ? ' lean' : ''), text: serious ? 'Fairer' : 'Evens out' });
          Object.assign(stamp.style, { left: M.bal.x + 'px', top: (M.bal.base + (M.phone ? 18 : 22)) + 'px' }); el.append(stamp); st.stamp = stamp;
          K.sfx.thud(); K.sfx.great(); drop.base('happy');
          drop.say(L(serious ? LINES.evenSerious : LINES.even), { mood: 'happy', ms: 4200 });
          if (st.rushOn) rush.face(serious || care ? 'happy' : 'celebrate', 2200);
          st.sunTarget = 1;
        }, 900);
        K.later(() => { if (weighResolve) { const r = weighResolve; weighResolve = null; r(); } }, reduced() ? 2200 : 4300);
      }

      /* ---------------- finale: pour, cast, rise at sunset ---------------- */
      let NUG = null, plateEl = null;
      function nugDims() { return M.phone ? { w: Math.min(M.w - 44, 320), h: Math.round(Math.min(M.w - 44, 320) * 0.66) } : { w: 460, h: 290 }; }
      function nugPath(g, x, y, rx, ry) {
        const p = NUG.pts, n = p.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], m0 = mid(p[0], p[1]);
        g.beginPath(); g.moveTo(x + m0[0] * rx, y + m0[1] * ry);
        for (let i = 1; i <= n; i++) { const a = p[i % n], m = mid(a, p[(i + 1) % n]); g.quadraticCurveTo(x + a[0] * rx, y + a[1] * ry, x + m[0] * rx, y + m[1] * ry); }
        g.closePath();
      }
      function makeNugget() {
        const R = K.rng(river.key.length * 977 + goldN * 13), n = 13, pts = [];
        for (let i = 0; i < n; i++) { const a = i / n * TAU + (R() - 0.5) * 0.24, k = 0.88 + R() * 0.17; pts.push([Math.cos(a) * k, Math.sin(a) * k]); }
        NUG = { pts };
        const d = nugDims(), dpr = cv.dpr || 1, pad = 20, c = mk((d.w + pad * 2) * dpr, (d.h + pad * 2) * dpr), g = c.getContext('2d'), rx = d.w / 2, ry = d.h / 2;
        g.setTransform(dpr, 0, 0, dpr, (rx + pad) * dpr, (ry + pad) * dpr);
        g.save(); g.translate(6, 14); nugPath(g, 0, 0, rx, ry); g.fillStyle = 'rgba(40,20,0,0.34)'; g.fill(); g.restore();
        g.save(); g.translate(0, 9); nugPath(g, 0, 0, rx, ry); const th = g.createLinearGradient(0, -ry, 0, ry + 9); th.addColorStop(0, '#c98a1c'); th.addColorStop(1, '#6e4306'); g.fillStyle = th; g.fill(); g.restore();
        nugPath(g, 0, 0, rx, ry);
        const body = g.createRadialGradient(-rx * 0.3, -ry * 0.42, 6, 0, 0, Math.max(rx, ry) * 1.05);
        body.addColorStop(0, '#fff4bf'); body.addColorStop(0.35, '#ffd65a'); body.addColorStop(0.72, '#e2a42a'); body.addColorStop(1, '#a56c0e');
        g.fillStyle = body; g.fill();
        g.save(); nugPath(g, 0, 0, rx, ry); g.clip();
        const Rb = K.rng(41);
        for (let i = 0; i < 30; i++) { const a = Rb() * TAU, k = 0.74 + Rb() * 0.3, x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k, s = 6 + Rb() * 16, gr = g.createRadialGradient(x - s * 0.3, y - s * 0.3, 0, x, y, s); gr.addColorStop(0, 'rgba(255,250,215,0.6)'); gr.addColorStop(0.6, 'rgba(255,225,130,0.08)'); gr.addColorStop(1, 'rgba(120,70,0,0.28)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); }
        const fg = g.createLinearGradient(0, -ry * 0.72, 0, ry * 0.72); fg.addColorStop(0, 'rgba(255,244,190,0.62)'); fg.addColorStop(1, 'rgba(244,196,80,0.42)');
        g.fillStyle = fg; g.beginPath(); g.ellipse(0, 2, rx * 0.8, ry * 0.7, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(140,90,10,0.4)'; g.lineWidth = 1.6; g.stroke();
        g.strokeStyle = 'rgba(255,250,220,0.5)'; g.lineWidth = 1; g.beginPath(); g.ellipse(0, 3.5, rx * 0.8, ry * 0.7, 0, Math.PI * 0.1, Math.PI * 0.9); g.stroke();
        g.restore();
        nugPath(g, 0, 0, rx, ry); g.strokeStyle = '#87560a'; g.lineWidth = 2.6; g.stroke();
        g.save(); g.translate(-1.5, -2); nugPath(g, 0, 0, rx * 0.97, ry * 0.95); g.strokeStyle = 'rgba(255,246,205,0.55)'; g.lineWidth = 2; g.stroke(); g.restore();
        NUG.c = c; NUG.pad = pad; NUG.w = d.w; NUG.h = d.h;
        NUG.fx = mk(c.width, c.height);
      }
      function placePlate() {
        if (!plateEl || !st.nug) return;
        const d = nugDims();
        Object.assign(plateEl.style, { left: st.nug.tx + 'px', top: (st.nug.ty + 2) + 'px', width: Math.round(d.w * 0.7) + 'px' });
      }
      async function finale() {
        if (st.finished || st.phase === 'pour') return;
        st.phase = 'pour'; K.guide(null); hintSet(''); hideCard();
        if (st.stamp) { const s0 = st.stamp; s0.classList.add('gp-fade'); K.later(() => s0.remove(), 520); }
        MZ.layer = 3;
        const col = K.collect(river.nugget); st.col = col;
        drop.say(L(LINES.pour), { mood: 'wow', ms: 2400 });
        if (st.rushOn) rush.face('wow');
        makeNugget(); ensureSunset();
        st.mould = { a: 0, fill: 0, heat: 0 }; sSplash(0.8); ripple(M.cx, M.cy + 8, M.r * 0.9, 1.1);
        const from = rightPan(), s = vialScale(), hh = 70 * s, rot = -2.05, mouthT = { x: M.cx + 12, y: M.cy - M.r * 0.42 };
        const piv = { x: mouthT.x - hh * Math.sin(rot), y: mouthT.y + hh * Math.cos(rot) };
        st.vialOn = false; st.vialGone = true; st.vialFly = { x: from.x, y: from.y + 2, rot: 0, a: 1 }; st.vialGold = 1;
        K.sfx.whoosh();
        await tween(1000, k => {
          st.panA = 1 - clamp(k * 1.7, 0, 1); st.panDy = k * 50;
          st.mould.a = ease.outBack(clamp((k - 0.25) / 0.6, 0, 1));
          const q = ease.inOutCubic(clamp(k / 0.75, 0, 1)); st.vialFly.x = lerp(from.x, piv.x, q); st.vialFly.y = lerp(from.y + 2, piv.y, q) - Math.sin(q * Math.PI) * 50;
          st.vialFly.rot = rot * ease.inOutCubic(clamp((k - 0.6) / 0.4, 0, 1));
        });
        st.pour = { on: true, k: 0 };
        let hiss = null; if (A.ctx) { hiss = A.loop({ filter: 'highpass', freq: 3200, q: 0.5, bus: 'sfx' }); if (hiss) hiss.level(0.05, 0.2); A.tone({ type: 'sine', freq: 180, to: 120, glide: 1.5, dur: 1.6, vol: 0.05, lp: 400 }); }
        await tween(1500, k => { st.pour.k = k; st.mould.fill = k; st.mould.heat = Math.min(1, k * 1.5); st.vialGold = 1 - k; if (Math.random() < 0.5) P.emit('ember', M.cx + (Math.random() - 0.5) * 30, M.cy + 6, 1, { colors: ['#ffb347', '#ffe08a', '#ff7a3d'] }); });
        st.pour.on = false;
        if (hiss) { hiss.level(0.09, 0.05); K.later(() => { hiss.level(0.0001, 0.6); K.later(() => hiss.stop(), 900); }, 300); }
        tween(400, k => { if (!st.vialFly) return; st.vialFly.rot = rot * (1 - k); st.vialFly.a = 1 - k; st.vialFly.y -= 1; }).then(() => { st.vialFly = null; });
        for (let i = 0; i < 6; i++) K.later(() => P.emit('smoke', M.cx + (Math.random() - 0.5) * M.r * 0.5, M.cy, 2, { colors: ['rgba(240,240,250,0.28)'] }), i * 110);
        await tween(700, k => { st.mould.heat = 1 - k; });
        // pop! the nugget rises out of the mould
        const d = nugDims(), tx = M.cx, ty = M.phone ? Math.round(M.cy - 6) : Math.round(M.cy - 10);
        st.nug = { x: M.cx, y: M.cy + 6, s: 0.4, tx, ty, shine: -0.4, born: now() }; st.mould.fill = 0;
        if (A.ctx) { A.pop({ freq: 380, vol: 0.2 }); ['D5', 'F#5', 'A5', 'D6'].forEach((n, i) => A.chime(A.note(n), { when: A.now() + 0.05 + i * 0.07, vol: 0.08, dur: 2.2 })); A.pad(['D3', 'A3', 'D4', 'F#4', 'A4'].map(n => A.note(n)), { dur: 6, vol: 0.16, attack: 0.5 }); }
        K.sfx.win();
        P.emit('star', M.cx, M.cy, 28, { colors: ['#fffbe6', '#ffe58a', '#ffd54a'] });
        const joy = serious || care ? 'happy' : 'celebrate';
        drop.base(joy); if (st.rushOn) rush.base(joy);
        tween(500, k => { if (st.mould) st.mould.a = 1 - k; }).then(() => { st.mould = null; });
        await tween(950, k => { st.nug.x = lerp(M.cx, tx, k); st.nug.y = lerp(M.cy + 6, ty, k) - Math.sin(k * Math.PI) * 46; st.nug.s = lerp(0.4, 1, k); }, ease.outBack);
        // engraving, sunset, glitter
        plateEl = h('div', { class: 'gp-plate' + (fair.length > 118 ? ' long' : '') }, h('small', null, river.nugget, h('br'), goldN + '\u00a0true\u00a0facts'), h('p', { class: noText ? '' : 'gk-user', text: fair }));
        el.append(plateEl); st.plate = true; placePlate();
        if (col.isNew) { st.jarPlus = 1; st.jarN = col.count; setJarTag(); }
        tween(2400, k => { st.sunset = k; }, ease.inOutSine);
        drop.say(L(care ? LINES.endCare : serious ? LINES.endSerious : LINES.end), { mood: joy, ms: 0 });
        if (st.rushOn) K.later(() => { rush.say(L(LINES.rushEnd), { mood: 'laugh', ms: 3000 }); }, 1700);
        for (let i = 0; i < 6; i++) K.later(() => { if (A.ctx) A.chime(noteUp(i) * 2, { vol: 0.035, dur: 1.6, pan: Math.random() * 1.2 - 0.6 }); }, 600 + i * 330);
        await K.wait(reduced() ? 2600 : 4600);
        finishGame();
      }
      function finishGame() {
        if (st.finished) return; st.finished = true;
        const total = Math.max(0.001, SW.total), inBand = SW.inBand / total, mean = SW.n ? SW.sum / SW.n : 0, sd = SW.n ? Math.sqrt(Math.max(0, SW.sum2 / SW.n - mean * mean)) : 0;
        const steadiness = mean > 0 ? clamp(1 - sd / mean, 0, 1) : 0.6, score = clamp(0.55 * inBand + 0.45 * steadiness, 0, 1), pct = Math.round(score * 100);
        const best = K.best('steady', pct, 'higher'), tier = K.tier(score, [0.45, 0.66, 0.84]), col = st.col || K.collect(river.nugget);
        const badges = [];
        if (best.isNew) badges.push('New best: ' + pct + '% steady swirl'); else if (best.first) badges.push('Steady swirl: ' + pct + '%');
        if (tier) badges.push(tier + ' prospector');
        if (col.isNew) badges.push('Collected: ' + river.nugget + ' (' + Math.min(col.count, RIVERS.length) + '/' + RIVERS.length + ')');
        ctx.finish({
          title: serious ? 'Heavy, and not the whole picture' : 'Gold in the pan', mood: 'celebrate',
          lines: ['Found ' + goldN + ' true facts the gloom had washed out', 'Bite-tested the fool’s gold and tossed it', serious ? 'Scale: all stones → a fairer balance' : 'Scale: all stones → evened out'],
          share: 'Panned my day for gold. Found ' + goldN + ' true good things the gloom was hiding.', badges: badges.slice(0, 4)
        });
      }

      /* ---------------- the loop: physics, sound and drawing ---------------- */
      const GLN = M.phone ? 22 : 40, GLS = [];
      for (let i = 0; i < 60; i++) GLS.push({ x: Math.random(), y: Math.random(), ph: Math.random() * 6, sp: 0.6 + Math.random() * 1.4 });
      let lastT = 0, rattle = 0;
      K.loop((dt0, t) => {
        const g = cv.g; if (!g || !M.w) return;
        const real = lastT ? t - lastT : 0.016; lastT = t;
        const dt = Math.min(0.25, Math.max(0.001, real)), dtr = dt;
        // quality: a slow device drops the moving caustics, then the pixel density (judged on real frame intervals)
        Q.acc += real; Q.n++;
        if (Q.acc > 1.5) { if (Q.acc / Q.n > 0.026 && Q.steps < 3) { Q.steps++; Q.level = Math.max(0, Q.level - 1); if (Q.steps === 3 && cv.setQuality) cv.setQuality(0.72); } Q.acc = 0; Q.n = 0; }
        if (!spr.pan) buildSprites(); else if (spr.key !== M.w + 'x' + M.h + ':' + (cv.dpr || 1)) buildSprites();
        ensureBg();
        stepTweens();
        const tNow = now();
        // swirl physics (keyboard: hold Space or an arrow to swirl at an easy pace)
        SW.kbOn = !!(SW.kb && tNow - SW.kb < 260 && st.phase === 'swirl');
        if (SW.kbOn) { const da = IDEAL * (SW.kdir || 1) * dtr; SW.fa += da; advance(da, tNow); }
        else if (!SW.active || tNow - SW.moveT > 300) SW.wG *= Math.exp(-dt * 6);
        const driving = SW.active || SW.kbOn;
        SW.wW += (SW.wG - SW.wW) * Math.min(1, dt * (driving ? 3.4 : 0.9));
        if (st.phase !== 'swirl' && !driving) SW.wW *= Math.exp(-dt * 0.6);
        SW.phase += SW.wW * dt;
        const sp = Math.abs(SW.wW);
        if (st.loupe && st.phase === 'bite') biteTick();
        if (st.phase === 'swirl') {
          const [lo, hi] = BAND, q = sp < lo ? 0.3 : sp > hi ? 0.5 : 1;
          swirlFeedback(Math.abs(SW.wG) > 0.3 ? Math.abs(SW.wG) : sp, tNow);
          if (sp > hi * 1.12 && Math.random() < dt * 16) { const a = SW.fa + SW.dir * 0.4, x = M.cx + Math.cos(a) * (M.r + 8), y = M.cy + Math.sin(a) * (M.r + 8); P.emit('drop', x, y, 3, { angle: a, spread: 0.8, speed: [80, 200] }); if (A.ctx && Math.random() < 0.3) A.noise({ filter: 'bandpass', freq: 900, q: 0.7, dur: 0.16, vol: 0.05 }); }
          const half = Math.floor(SW.phase / Math.PI);
          if (half !== SW.half) { SW.half = half; if (q > 0.6 && A.ctx && MZ.next) { const ch = chordAt(MZ.i)[1]; A.pluck(A.note(ch[half & 1 ? 1 : 2]) * 2, { vol: 0.05, damp: 0.997, verb: 0.35 }); } }
        } else SW.half = Math.floor(SW.phase / Math.PI);
        // sound beds follow the water
        if (slosh) { slosh.level(Math.min(0.17, sp * 0.022) * st.panA, 0.08); slosh.freq(260 + sp * 70, 0.1); }
        if (babble && Math.random() < dt * 9) { babble.level(0.012 + Math.random() * 0.04, 0.06); babble.freq(1300 + Math.random() * 1000, 0.06); }
        if (A.ctx && st.phase === 'swirl' && sp > 1) { rattle += dt * Math.min(28, sp * 3.2 * (0.3 + st.murk)); while (rattle > 1) { rattle -= 1; A.noise({ filter: 'highpass', freq: 2200 + Math.random() * 3200, dur: 0.01 + Math.random() * 0.015, vol: 0.012 + Math.random() * 0.024, pan: Math.random() * 0.8 - 0.4 }); } }
        // pan wobble follows the hand
        const wt = driving && !reduced() ? Math.min(1, sp / 5) * 4.5 : 0;
        st.wob.x += (Math.cos(SW.fa) * wt - st.wob.x) * Math.min(1, dt * 8); st.wob.y += (Math.sin(SW.fa) * wt - st.wob.y) * Math.min(1, dt * 8);
        // the scale beam swings on a spring
        for (let left = dt; left > 1e-4; left -= 0.03) { const h2 = Math.min(0.03, left); st.tiltV += (st.tiltT - st.tilt) * 38 * h2; st.tiltV *= Math.exp(-h2 * 3.6); st.tilt += st.tiltV * h2; }
        st.sun += (st.sunTarget - st.sun) * Math.min(1, dt * 0.9);
        st.beat = Math.max(0, st.beat - dt * 3);
        FL.forEach(f => { f.flash = Math.max(0, f.flash - dt * 2.4); });
        updateGravel(dt);
        P.update(dt);
        draw(g, t, dt);
      });

      function draw(g, t, dt) {
        const W = M.w, H = M.h;
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        // the river, from gloom to sun to sunset (mixed off-screen only when the light changes)
        const sunK = clamp(st.sun, 0, 1);
        const sk = Math.round(sunK * 24) / 24, ss = bg.sunset ? Math.round(st.sunset * 24) / 24 : 0, mkey = sk + ':' + ss + ':' + bg.key;
        if (bgMix.key !== mkey || !bgMix.c) {
          bgMix.key = mkey;
          if (!bgMix.c || bgMix.c.width !== bg.gloom.width || bgMix.c.height !== bg.gloom.height) bgMix.c = mk(bg.gloom.width, bg.gloom.height);
          const m = bgMix.c.getContext('2d', { alpha: false });
          m.globalAlpha = 1; m.drawImage(sk >= 1 ? bg.sun : bg.gloom, 0, 0);
          if (sk > 0 && sk < 1) { m.globalAlpha = sk; m.drawImage(bg.sun, 0, 0); }
          if (ss > 0) { m.globalAlpha = ss; m.drawImage(bg.sunset, 0, 0); }
          m.globalAlpha = 1;
        }
        g.drawImage(bgMix.c, 0, 0, W, H);
        // moving caustics on the riverbed
        if (Q.level >= 1 && spr.patRiver) {
          g.save(); g.beginPath(); g.rect(0, M.bankH + 2, W, M.bedBot - M.bankH - 4); g.clip(); g.globalCompositeOperation = 'lighter'; g.fillStyle = spr.patRiver;
          g.globalAlpha = 0.05 + 0.1 * sunK + 0.06 * st.sunset; g.save(); g.scale(2.3, 2.3); g.translate((t * 8) % 128, (t * 2.4) % 128); g.fillRect(-130, -130, W / 2.3 + 260, H / 2.3 + 260); g.restore();
          if (Q.level >= 2) { g.globalAlpha = 0.04 + 0.07 * sunK; g.save(); g.scale(1.6, 1.6); g.rotate(0.6); g.translate((t * 13) % 128, (-t * 5) % 128); g.fillRect(-200, -200, W + 400, H + 400); g.restore(); }
          g.restore();
        }
        // sun glints riding the current
        if (sunK > 0.05 || st.sunset > 0) {
          g.globalCompositeOperation = 'lighter';
          const n = Math.round(GLN * (0.4 + 0.6 * sunK) + st.sunset * 40);
          for (let i = 0; i < Math.min(n, GLS.length); i++) {
            const gl = GLS[i], x = ((gl.x * (W + 80) + t * FLOW * 0.8) % (W + 80)) - 40, y = M.bankH + 12 + gl.y * (M.bedBot - M.bankH - 24);
            if (Math.abs(x - M.cx) < M.r + 16 && Math.abs(y - M.cy) < M.r + 16 && st.panA > 0.5) continue;
            const k = Math.pow(Math.max(0, Math.sin(t * gl.sp * 2 + gl.ph)), 8); if (k < 0.04) continue;
            const s = (8 + 14 * k) * (1 + st.sunset * 0.6); g.globalAlpha = k * (0.35 + 0.5 * sunK + 0.3 * st.sunset); g.drawImage(spr.glint, x - s / 2, y - s / 2, s, s);
          }
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        }
        // ripples
        for (let i = RIP.length - 1; i >= 0; i--) {
          const rp = RIP[i], k = (now() - rp.t0) / rp.life; if (k >= 1) { RIP.splice(i, 1); continue; }
          g.strokeStyle = 'rgba(255,255,255,' + (0.5 * (1 - k)).toFixed(3) + ')'; g.lineWidth = 2 * (1 - k) + 0.5; g.beginPath(); g.ellipse(rp.x, rp.y, rp.max * ease.outCubic(k), rp.max * ease.outCubic(k) * 0.82, 0, 0, TAU); g.stroke();
        }
        // the pan in the stream
        if (st.panA > 0.01) drawPan(g, t);
        // washed-out gravel drifting downstream
        if (SG.length) { for (const q of SG) { g.globalAlpha = Math.max(0, q.life) * 0.9; g.fillStyle = q.c; g.beginPath(); g.arc(q.x, q.y, q.s * (0.6 + 0.4 * q.life), 0, TAU); g.fill(); } g.globalAlpha = 1; }
        // the scale, the vial, the nugget jar on the bank
        drawBalance(g);
        drawJar(g);
        drawBird(g, t);
        if (!st.vialOn && !st.vialFly && !st.vialGone) { const v = vialAt(); drawVial(g, v.x, v.y, vialScale() * (st.vialDrag ? 1.08 : 1), 0, st.vialN / goldN, 1, !!st.vialDrag); }
        // finale pieces
        if (st.mould) drawMould(g, t);
        if (st.pour && st.pour.on && st.vialFly) drawPour(g, t);
        if (st.vialFly) drawVial(g, st.vialFly.x, st.vialFly.y, vialScale(), st.vialFly.rot, st.vialGold * st.vialN / goldN, st.vialFly.a == null ? 1 : st.vialFly.a, true);
        if (st.nug) drawNugget(g, t);
        // held flecks and the tweezers
        FL.forEach(f => { if (!f.held) return; const spf = f.kind === 'fool' ? spr.pyr : spr.fleck[f.v], s = f.size * 1.1; g.drawImage(spf, f.hx - s / 2, f.hy - s / 2 + 6, s, s); });
        if (TWZ.on) drawTweezers(g);
        P.draw(g);
      }
      function drawPan(g, t) {
        const r = M.r, ri = r * 0.985, dip = st.dip, x0 = M.cx + st.wob.x, y0 = M.cy + st.wob.y + st.panDy + dip * 6, sp = Math.abs(SW.wW), spin = clamp(sp / 7, 0, 1);
        g.globalAlpha = st.panA;
        // foam where the current meets the rim, and the wake downstream
        g.strokeStyle = 'rgba(255,255,255,' + (0.28 + 0.1 * Math.sin(t * 3)).toFixed(3) + ')'; g.lineWidth = 2.4; g.beginPath(); g.arc(x0, y0, r + 15 + Math.sin(t * 2.2) * 1.5, Math.PI * 0.55, Math.PI * 1.45); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 1.6; g.beginPath(); g.arc(x0, y0, r + 22 + Math.sin(t * 1.7) * 2, Math.PI * 0.62, Math.PI * 1.38); g.stroke();
        g.beginPath(); for (const sgn of [-1, 1]) { const ph = (t * 0.8) % 1; for (let k = 0; k < 3; k++) { const q = (k + ph) / 3, x1 = x0 + r * (0.7 + q * 0.9), y1 = y0 + sgn * r * (0.74 + q * 0.32); g.moveTo(x1, y1); g.lineTo(x1 + 18, y1 + sgn * 6); } } g.strokeStyle = 'rgba(255,255,255,0.12)'; g.stroke();
        // body
        const sc = 1 - dip * 0.05, ps = (r + spr.panPad) * sc;
        g.drawImage(spr.pan, x0 - ps, y0 - ps, ps * 2, ps * 2);
        // inside: gravel and gold under moving water
        g.save(); g.beginPath(); g.arc(x0, y0, ri * sc, 0, TAU); g.clip();
        const murk = clamp(st.murk + dip * 0.6, 0, 1);
        g.fillStyle = rgba(mixHex(river.mud, river.water[1], 0.35 * (1 - murk)), 0.22 + 0.4 * murk); g.fillRect(x0 - ri, y0 - ri, ri * 2, ri * 2);
        drawGravel(g, x0, y0, ri * sc, spin);
        drawFlecks(g, x0, y0, ri * sc, false);
        g.fillStyle = rgba(murk > 0.3 ? mixHex(river.water[0], river.mud, 0.5) : river.water[0], 0.12 + 0.08 * murk); g.fillRect(x0 - ri, y0 - ri, ri * 2, ri * 2);
        if (murk < 0.5) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = st.panA * (0.5 - murk) * 0.5; g.drawImage(spr.spec, x0 - ri * 0.9, y0 - ri * 0.2, ri * 1.8, ri * 0.9); g.globalAlpha = st.panA; g.globalCompositeOperation = 'source-over'; }
        g.globalCompositeOperation = 'lighter';
        g.save(); g.translate(x0, y0); g.rotate(SW.phase); g.globalAlpha = st.panA * (0.1 + 0.36 * spin); g.drawImage(spr.swirl, -ri, -ri, ri * 2, ri * 2);
        if (Q.level >= 1) { g.rotate(-SW.phase * 0.42 + 1.7); g.globalAlpha = st.panA * (0.05 + 0.16 * spin); g.drawImage(spr.swirl, -ri * 0.78, -ri * 0.78, ri * 1.56, ri * 1.56); }
        g.restore();
        if (Q.level >= 2 && spr.patPan) { g.save(); g.translate(x0, y0); g.rotate(SW.phase * 0.6); g.scale(1.25, 1.25); g.globalAlpha = st.panA * (0.06 + 0.1 * st.sun) * (1 - murk * 0.6); g.fillStyle = spr.patPan; g.fillRect(-ri, -ri, ri * 1.6 + 2, ri * 1.6 + 2); g.restore(); }
        g.globalCompositeOperation = 'source-over';
        if (spin > 0.04) { g.globalAlpha = st.panA * spin * 0.32; g.drawImage(spr.vortex, x0 - ri, y0 - ri, ri * 2, ri * 2); }
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = st.panA * (0.3 + 0.38 * st.sun); g.drawImage(spr.spec, x0 - ri * 0.66 + Math.sin(t * 1.3) * 4 * spin, y0 - ri * 0.74, ri * 0.92, ri * 0.52);
        drawFlecks(g, x0, y0, ri * sc, true);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = st.panA;
        g.restore();
        // rim effects: the crescent of fast water, the progress arc, follow-the-glint
        if (spin > 0.08) { const a = SW.phase; g.strokeStyle = 'rgba(255,255,255,' + (0.35 * spin).toFixed(3) + ')'; g.lineWidth = 3; g.beginPath(); g.arc(x0, y0, ri - 3, a, a + 1.1 * SW.dir); g.stroke(); g.beginPath(); g.arc(x0, y0, ri - 3, a + Math.PI, a + Math.PI + 0.9 * SW.dir); g.stroke(); }
        if (st.phase === 'swirl' || st.phase === 'reveal') {
          const [lo, hi] = BAND, inB = sp >= lo && sp <= hi, pr = st.phase === 'reveal' ? 1 : st.prog;
          g.lineCap = 'round';
          g.strokeStyle = 'rgba(20,16,8,0.45)'; g.lineWidth = 7; g.beginPath(); g.arc(x0, y0, r + 20, 0, TAU); g.stroke();
          if (pr > 0.002) { g.strokeStyle = 'rgba(255,214,90,' + (0.25 + 0.2 * st.beat).toFixed(3) + ')'; g.lineWidth = 11; g.beginPath(); g.arc(x0, y0, r + 20, -Math.PI / 2, -Math.PI / 2 + pr * TAU); g.stroke(); g.strokeStyle = '#ffd54a'; g.lineWidth = 4.5; g.beginPath(); g.arc(x0, y0, r + 20, -Math.PI / 2, -Math.PI / 2 + pr * TAU); g.stroke(); }
          if (inB && SW.state === 'ok') { g.strokeStyle = 'rgba(255,214,90,' + (0.3 + 0.25 * st.beat).toFixed(3) + ')'; g.lineWidth = 3; g.beginPath(); g.arc(x0, y0, ri - 1, 0, TAU); g.stroke(); }
          if (st.phase === 'swirl') {
            const tt = A.ctx && MZ.t0 ? (A.now() - A.latency() - MZ.t0) : now() / 1000, ang = -Math.PI / 2 + SW.dir * IDEAL * tt;
            g.globalCompositeOperation = 'lighter';
            for (let k = 0; k < 6; k++) { const a = ang - SW.dir * k * 0.09, s = 26 - k * 3.4; g.globalAlpha = st.panA * (0.9 - k * 0.14); g.drawImage(spr.glint, x0 + Math.cos(a) * (r + 6) - s / 2, y0 + Math.sin(a) * (r + 6) - s / 2, s, s); }
            g.globalCompositeOperation = 'source-over'; g.globalAlpha = st.panA;
          }
          g.lineCap = 'butt';
        }
        g.globalAlpha = 1;
      }
      const DUST = []; for (let i = 0; i < 26; i++) DUST.push({ a: LIP + (Math.random() - 0.5) * 1.5, r: 0.68 + Math.random() * 0.24, s: 0.7 + Math.random() * 1.1, ph: Math.random() * 6 });
      function drawGravel(g, x0, y0, ri, spin) {
        if (st.murk < 0.6) {
          const k = clamp((0.6 - st.murk) / 0.4, 0, 1), tt = now() / 1000;
          g.fillStyle = 'rgba(14,16,18,' + (0.55 * k).toFixed(3) + ')'; g.beginPath();
          for (let i = 0; i < 3; i++) { const q = ri * (0.9 - i * 0.075); g.moveTo(x0 + Math.cos(LIP - 0.8) * q, y0 + Math.sin(LIP - 0.8) * q); g.arc(x0, y0, q, LIP - 0.8, LIP + 0.8); g.arc(x0, y0, q - 4.5, LIP + 0.8, LIP - 0.8, true); g.closePath(); }
          g.fill();
          for (const d of DUST) { const tw = 0.45 + 0.55 * Math.abs(Math.sin(tt * 1.7 + d.ph)); g.fillStyle = 'rgba(255,214,90,' + (k * tw).toFixed(3) + ')'; const x = x0 + Math.cos(d.a) * d.r * ri, y = y0 + Math.sin(d.a) * d.r * ri; g.fillRect(x - d.s / 2, y - d.s / 2, d.s, d.s); }
        }
        g.fillStyle = 'rgba(0,0,0,0.38)'; g.beginPath();
        for (const p of GR) { if (p.out || p.type !== 1) continue; const x = x0 + Math.cos(p.a) * p.r * ri + 1, y = y0 + Math.sin(p.a) * p.r * ri + 1.6; g.moveTo(x + p.s, y); g.ellipse(x, y, p.s, p.s * 0.82, 0, 0, TAU); }
        g.fill();
        for (let ci = 0; ci < GC.length; ci++) {
          g.fillStyle = GC[ci]; g.beginPath();
          for (const p of GR) {
            if (p.out || p.ci !== ci) continue;
            const x = x0 + Math.cos(p.a) * p.r * ri, y = y0 + Math.sin(p.a) * p.r * ri;
            if (p.type === 1) { g.moveTo(x + p.s, y); g.ellipse(x, y, p.s, p.s * 0.82, p.q * 3, 0, TAU); } else g.rect(x - p.s * 0.5, y - p.s * 0.5, p.s * 1.1, p.s);
          }
          g.fill();
        }
        g.fillStyle = 'rgba(255,248,230,0.32)'; g.beginPath();
        for (const p of GR) { if (p.out || p.type !== 1) continue; const x = x0 + Math.cos(p.a) * p.r * ri - p.s * 0.28, y = y0 + Math.sin(p.a) * p.r * ri - p.s * 0.32; g.moveTo(x + p.s * 0.42, y); g.ellipse(x, y, p.s * 0.42, p.s * 0.26, -0.5, 0, TAU); }
        g.fill();
        if (spin > 0.3 && Q.level >= 1) {
          g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1.2; g.beginPath();
          const da = -SW.dir * 0.14 * spin;
          for (const p of GR) { if (p.out || p.type === 2 || (p.k & 3)) continue; const q = p.r * ri; g.moveTo(x0 + Math.cos(p.a) * q, y0 + Math.sin(p.a) * q); g.lineTo(x0 + Math.cos(p.a + da) * q, y0 + Math.sin(p.a + da) * q); }
          g.stroke();
        }
      }
      function drawFlecks(g, x0, y0, ri, glints) {
        for (const f of FL) {
          if (f.gone || f.held || f.shown <= 0) continue;
          const x = x0 + Math.cos(f.a) * f.r * ri, y = y0 + Math.sin(f.a) * f.r * ri, fool = f.kind === 'fool';
          if (!glints) {
            const s = f.size * (0.5 + 0.5 * f.shown), spf = fool ? spr.pyr : spr.fleck[f.v];
            g.save(); g.translate(x, y); g.rotate(f.rot + (fool ? Math.sin(now() / 300) * 0.06 : 0)); g.globalAlpha = Math.min(1, f.shown) * st.panA; g.drawImage(spf, -s / 2, -s / 2, s, s); g.restore();
          } else {
            const tw = Math.pow(Math.max(0, Math.sin(now() / 1000 * 2.4 + f.ph)), 10), k = Math.min(1, tw + f.flash * 0.9 + (fool ? 0.55 : 0)) * Math.min(1, f.shown);
            if (k < 0.03) continue;
            const s = (fool ? 64 : 46) * (0.55 + 0.6 * k);
            g.globalAlpha = k * st.panA; g.drawImage(spr.glint, x - s / 2 + 3, y - s / 2 - 3, s, s);
            if (fool) { const a2 = now() / 400; g.globalAlpha = 0.6 * k * st.panA; g.drawImage(spr.glint, x + Math.cos(a2) * 16 - 12, y + Math.sin(a2) * 12 - 12, 24, 24); g.drawImage(spr.glint, x - Math.cos(a2 * 1.3) * 14 - 10, y - Math.sin(a2 * 1.3) * 14 - 10, 20, 20); }
          }
        }
      }
      function drawBalance(g) {
        const B = M.bal, e = balEnds(), pw = B.pw;
        g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(B.x + 5, B.base + 7, pw * 0.62, 6, 0, 0, TAU); g.fill();
        const wood = g.createLinearGradient(0, B.base - 7, 0, B.base + 8); wood.addColorStop(0, '#9a6638'); wood.addColorStop(1, '#4e2f17');
        g.fillStyle = wood; rr(g, B.x - pw * 0.55, B.base - 7, pw * 1.1, 13, 5); g.fill();
        const post = g.createLinearGradient(B.x - 4, 0, B.x + 4, 0); post.addColorStop(0, '#f8e09a'); post.addColorStop(0.5, '#c99c3c'); post.addColorStop(1, '#7d5a17');
        g.fillStyle = post; g.fillRect(B.x - 3.5, B.y, 7, B.base - B.y - 5);
        g.save(); g.translate(B.x, B.y); g.rotate(-st.tilt);
        const bm = g.createLinearGradient(0, -4, 0, 4); bm.addColorStop(0, '#fff0b5'); bm.addColorStop(0.5, '#d6a640'); bm.addColorStop(1, '#8a6119');
        g.fillStyle = bm; rr(g, -B.arm - 5, -3.5, (B.arm + 5) * 2, 7, 3.5); g.fill();
        g.strokeStyle = '#7d5a17'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, -5); g.lineTo(0, -21); g.stroke();
        g.fillStyle = '#7d5a17'; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill(); g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(-1.6, -1.6, 2.8, 0, TAU); g.fill();
        g.restore();
        [[e.lx, e.ly, 'L'], [e.rx, e.ry, 'R']].forEach(([x, y, side]) => {
          const py = y + B.chain;
          g.strokeStyle = 'rgba(70,50,16,0.9)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x - pw * 0.44, py); g.moveTo(x, y); g.lineTo(x + pw * 0.44, py); g.moveTo(x, y); g.lineTo(x, py - 2); g.stroke();
          if (side === 'L') drawStonePile(g, x, py, st.stonesOn);
          if (side === 'R' && st.vialOn) drawVial(g, x, py + 2, vialScale(), 0, st.vialN / goldN, 1, false);
          const pg = g.createLinearGradient(0, py - 2, 0, py + 10); pg.addColorStop(0, '#ffe8a4'); pg.addColorStop(1, '#94661a');
          g.fillStyle = pg; g.beginPath(); g.moveTo(x - pw * 0.52, py); g.quadraticCurveTo(x, py + 19, x + pw * 0.52, py); g.closePath(); g.fill();
          g.strokeStyle = '#7d5a17'; g.lineWidth = 1; g.stroke();
        });
      }
      function drawStonePile(g, x, py, n) {
        const pos = [[0, -6, 13, 9], [-13, -4, 11, 8], [13, -4, 12, 8]];
        for (let i = 0; i < Math.min(n, 3); i++) {
          const [dx, dy, w, hh] = pos[i], sx = x + dx * (M.phone ? 1 : 1.3), sy = py + dy;
          g.fillStyle = '#1b1e23'; g.beginPath(); g.ellipse(sx, sy, w * (M.phone ? 1 : 1.25), hh * (M.phone ? 1 : 1.25), 0, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.ellipse(sx - w * 0.3, sy - hh * 0.35, w * 0.45, hh * 0.3, 0, 0, TAU); g.fill();
        }
      }
      function birdAway() {
        BIRD.fly = 0.001; if (A.ctx) { const t = A.now(); [0, 0.09, 0.2].forEach((o, i) => A.tone({ when: t + o, type: 'sine', freq: 3600 - i * 300, to: 4200 - i * 300, glide: 0.05, dur: 0.07, vol: 0.03, pan: 0.6 })); }
        tween(1600, k => { BIRD.fly = k; }).then(() => { BIRD.gone = true; });
      }
      function drawBird(g, t) {
        if (!BIRD || BIRD.gone) return;
        const k = BIRD.fly, bx = (M.phone ? M.w - 46 : M.w - 74) + k * k * 260, by = M.h - (M.phone ? 44 : 50) - k * 340 - (k ? 0 : Math.abs(Math.sin(t * 2.2 + BIRD.ph)) * 1.5), flap = k ? Math.sin(t * 40) : 0, s = M.phone ? 1 : 1.25;
        g.save(); g.translate(bx, by); g.scale(s, s);
        if (!k) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(2, 12, 12, 3, 0, 0, TAU); g.fill(); }
        g.fillStyle = '#e7843a'; g.beginPath(); g.ellipse(0, 2, 9, 7, 0, 0, TAU); g.fill();
        g.fillStyle = '#1b8fcf'; g.beginPath(); g.ellipse(2, -2, 10, 6, -0.25, 0, TAU); g.fill();
        g.fillStyle = '#1576b0'; g.beginPath(); g.moveTo(4, -3); g.lineTo(18, -1 - flap * 9); g.lineTo(6, 3); g.closePath(); g.fill();
        g.fillStyle = '#1b8fcf'; g.beginPath(); g.arc(-7, -7, 6, 0, TAU); g.fill();
        g.fillStyle = '#20232a'; g.beginPath(); g.moveTo(-11, -8); g.lineTo(-24, -5); g.lineTo(-11, -5); g.closePath(); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(-8, -8.5, 1.8, 0, TAU); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(-8.4, -8.6, 1, 0, TAU); g.fill();
        g.fillStyle = '#f3e3c8'; g.beginPath(); g.arc(-10, -4.2, 1.6, 0, TAU); g.fill();
        if (!k) { g.strokeStyle = '#3a2a1a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-2, 8); g.lineTo(-3, 11); g.moveTo(2, 8); g.lineTo(2, 11); g.stroke(); }
        g.restore();
      }
      function drawJar(g) {
        const j = M.jar, s = M.phone ? 1 : 1.4, w = 34 * s, hh = 40 * s, x = j.x, y = j.y;
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + 3, y + 2, w * 0.6, 4, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(220,240,250,0.2)'; rr(g, x - w / 2, y - hh, w, hh, 8 * s); g.fill();
        const n = Math.min(8, st.jarN);
        for (let i = 0; i < n; i++) { const cx = x - w / 2 + 8 * s + (i % 3) * 9 * s, cy = y - 7 * s - Math.floor(i / 3) * 8 * s; g.fillStyle = '#e8b33a'; g.beginPath(); g.ellipse(cx, cy, 4.6 * s, 3.6 * s, i * 0.7, 0, TAU); g.fill(); g.fillStyle = '#fff1b0'; g.beginPath(); g.arc(cx - 1.4 * s, cy - 1.2 * s, 1.4 * s, 0, TAU); g.fill(); }
        g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = 1.3; rr(g, x - w / 2, y - hh, w, hh, 8 * s); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - w * 0.3, y - hh * 0.8); g.lineTo(x - w * 0.3, y - hh * 0.25); g.stroke();
        g.fillStyle = '#6b4a2a'; rr(g, x - w * 0.44, y - hh - 6 * s, w * 0.88, 8 * s, 3); g.fill();
      }
      function drawVial(g, x, y, s, rot, k, a, lifted) {
        const w = 24 * s, hh = 70 * s;
        g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = a;
        if (!rot) { g.fillStyle = 'rgba(0,0,0,' + (lifted ? 0.18 : 0.28) + ')'; g.beginPath(); g.ellipse(lifted ? 10 : 3, lifted ? 14 : 1.5, w * 0.8, 4.5 * s, 0, 0, TAU); g.fill(); }
        g.fillStyle = 'rgba(214,236,248,0.24)'; rr(g, -w / 2, -hh, w, hh, w / 2); g.fill();
        g.fillStyle = 'rgba(140,200,225,0.3)'; rr(g, -w / 2 + 2, -hh * 0.8, w - 4, hh * 0.8 - 2, (w - 4) / 2); g.fill();
        if (k > 0.001) {
          const gh = Math.max(6, hh * 0.68 * k), gg = g.createLinearGradient(-w / 2, 0, w / 2, 0);
          gg.addColorStop(0, '#b98516'); gg.addColorStop(0.45, '#ffe27a'); gg.addColorStop(1, '#c99420');
          g.fillStyle = gg; rr(g, -w / 2 + 2.5, -gh - 2.5, w - 5, gh, Math.min((w - 5) / 2, gh / 2)); g.fill();
          g.fillStyle = '#fffbe0'; for (let i = 0; i < Math.round(3 + 6 * k); i++) { const yy = -3 - ((i * 37) % 100) / 100 * gh, xx = (((i * 53) % 100) / 100 - 0.5) * (w - 9); g.globalAlpha = a * (0.4 + 0.6 * Math.abs(Math.sin(now() / 400 + i))); g.fillRect(xx, yy, 1.6, 1.6); }
          g.globalAlpha = a;
        }
        g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.4; rr(g, -w / 2, -hh, w, hh, w / 2); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-w * 0.22, -hh * 0.86); g.lineTo(-w * 0.22, -hh * 0.22); g.stroke();
        if (!(st.pour && st.vialFly && rot)) { g.fillStyle = '#a06a38'; rr(g, -w * 0.42, -hh - 9 * s, w * 0.84, 11 * s, 3); g.fill(); g.fillStyle = '#c58a52'; g.fillRect(-w * 0.42, -hh - 9 * s, w * 0.84, 3 * s); }
        g.restore(); g.globalAlpha = 1;
      }
      function drawTweezers(g) {
        const x = TWZ.x, y = TWZ.y, ang = -0.95, len = 160, gap = 1.5 + TWZ.open * 7, ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux;
        g.globalAlpha = TWZ.a; g.lineCap = 'round';
        for (const sgn of [-1, 1]) {
          const ax = x + px * gap * 0.5 * sgn, ay = y + py * gap * 0.5 * sgn, bx = x + ux * len + px * (gap * 0.5 + 8) * sgn, by = y + uy * len + py * (gap * 0.5 + 8) * sgn;
          g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 4.5; g.beginPath(); g.moveTo(ax + 4, ay + 6); g.lineTo(bx + 4, by + 6); g.stroke();
          g.strokeStyle = '#aeb8c2'; g.lineWidth = 4; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
          g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(ax - px * 0.8, ay - py * 0.8); g.lineTo(bx - px * 0.8, by - py * 0.8); g.stroke();
        }
        g.lineCap = 'butt'; g.globalAlpha = 1;
      }
      function drawMould(g, t) {
        const m = st.mould, x = M.cx, y = M.cy + 6, a = clamp(m.a, 0, 1.2), rx = M.r * 0.86 * a, ry = M.r * 0.56 * a;
        if (a <= 0.05 || ry < 6) return;
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x + 8, y + 12, rx, ry, 0, 0, TAU); g.fill();
        const sg = g.createRadialGradient(x - rx * 0.3, y - ry * 0.4, 4, x, y, rx); sg.addColorStop(0, '#a3a8ae'); sg.addColorStop(0.7, '#6c7279'); sg.addColorStop(1, '#4a4f55');
        g.fillStyle = sg; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, rx - 3, ry - 3, 0, Math.PI * 1.05, Math.PI * 1.7); g.stroke();
        const d = nugDims(), cx = d.w / 2 * 0.36 * a, cy = d.h / 2 * 0.36 * a;
        nugPath(g, x, y, cx, cy); g.fillStyle = '#23262a'; g.fill(); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2; g.stroke();
        if (m.fill > 0.01) {
          g.save(); nugPath(g, x, y, cx * Math.sqrt(m.fill), cy * Math.sqrt(m.fill)); g.clip();
          const hot = m.heat, mg = g.createRadialGradient(x, y, 2, x, y, cx);
          mg.addColorStop(0, hot > 0.3 ? '#fff6c0' : '#fff1b0'); mg.addColorStop(0.5, mixHex('#ffd54a', '#ff8a1e', hot)); mg.addColorStop(1, mixHex('#c58a14', '#e0410f', hot));
          g.fillStyle = mg; g.fillRect(x - cx - 2, y - cy - 2, cx * 2 + 4, cy * 2 + 4); g.restore();
          if (hot > 0.02) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = hot * 0.8; const gs = K.glowSprite('#ff9a2a'), s = cx * 3.2; g.drawImage(gs, x - s / 2, y - s / 2 * 0.7, s, s * 0.7); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        }
        void t;
      }
      function drawPour(g, t) {
        const vf = st.vialFly, s = vialScale(), hh = 70 * s, sx = vf.x + hh * Math.sin(vf.rot), sy = vf.y - hh * Math.cos(vf.rot);
        const ex = M.cx, ey = M.cy + 4, k = st.pour.k, wob = (q) => Math.sin(t * 24 + q * 7) * 2.2 * (1 - q);
        g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
        [[13, 'rgba(255,130,30,0.28)'], [7, 'rgba(255,200,80,0.85)'], [2.4, 'rgba(255,252,225,1)']].forEach(([lw, c]) => {
          g.strokeStyle = c; g.lineWidth = lw * (0.6 + 0.4 * Math.sin(k * Math.PI)); g.beginPath();
          for (let i = 0; i <= 10; i++) { const q = i / 10, x = lerp(sx, ex, q) + wob(q), y = lerp(sy, ey, q * q * 0.5 + q * 0.5); i ? g.lineTo(x, y) : g.moveTo(x, y); }
          g.stroke();
        });
        g.globalCompositeOperation = 'source-over'; g.lineCap = 'butt';
      }
      function drawNugget(g, t) {
        const n = st.nug, d = nugDims(); if (!NUG) return;
        const pad = NUG.pad, W0 = (d.w + pad * 2) * n.s, H0 = (d.h + pad * 2) * n.s;
        const per = (now() - n.born) / 1000, sh = ((per * 0.42) % 1.3) - 0.3;
        const fx = NUG.fx, fg = fx.getContext('2d'), dpr = cv.dpr || 1;
        fg.setTransform(1, 0, 0, 1, 0, 0); fg.clearRect(0, 0, fx.width, fx.height); fg.drawImage(NUG.c, 0, 0);
        fg.globalCompositeOperation = 'source-atop';
        const bx = sh * fx.width, band = fg.createLinearGradient(bx - fx.width * 0.18, 0, bx + fx.width * 0.18, fx.height * 0.4);
        band.addColorStop(0, 'rgba(255,255,255,0)'); band.addColorStop(0.5, 'rgba(255,255,245,0.55)'); band.addColorStop(1, 'rgba(255,255,255,0)');
        fg.fillStyle = band; fg.fillRect(0, 0, fx.width, fx.height); fg.globalCompositeOperation = 'source-over';
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 + 0.15 * Math.sin(t * 2); const gs = K.glowSprite('#ffd54a'), gsz = Math.max(W0, H0) * 1.25; g.drawImage(gs, n.x - gsz / 2, n.y - gsz / 2, gsz, gsz); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        g.drawImage(fx, n.x - W0 / 2, n.y - H0 / 2, W0, H0);
        if (Math.random() < 0.18) P.emit('mote', n.x + (Math.random() - 0.5) * d.w * n.s, n.y + d.h * 0.3 * n.s, 1, { colors: ['#ffe58a', '#fff3c4'] });
        void dpr;
      }

      /* ---------------- flow ---------------- */
      fillPan(0);
      (async () => {
        await K.intro({ title: 'Gold Pan', sub: 'A low mood keeps the heavy stones and washes out the gold. Pan your day for what it missed.', how: 'Lift the stones. Swirl the pan. Pick the gold. Bite-test anything too shiny.', char: 'drop', mood: 'happy' });
        st.phase = 'lift'; MZ.layer = 0;
        drop.say(L(LINES.intro), { mood: 'sad', ms: 4200 });
        liftGuide();
        await new Promise(res => { liftResolve = res; if (!stoneEls.some(x => !x.done)) res(); });
        MZ.layer = 1; st.sunTarget = 0.12;
        drop.say(L(LINES.liftDone), { mood: 'happy', ms: 3000 });
        await K.wait(reduced() ? 300 : 700);
        for (let r = 0; r < rounds; r++) {
          if (r > 0) await scoop();
          await startSwirl();
          if (r === TWIST) { await foolsGold(); MZ.layer = 2; drop.say(L(LINES.under), { mood: 'happy', ms: 2600 }); }
          else drop.say(L(LINES.reveal), { mood: 'wow', ms: 2400 });
          await surface(plan[r] || [], r === TWIST);
        }
        await weigh();
        await finale();
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 30000)) await K.wait(80); };
          await until(() => st.phase === 'lift', 15000);
          await K.wait(300);
          for (const s of stoneEls) {
            await until(() => st.phase === 'lift' && !st.lifting, 6000);
            if (s.done) continue;
            const r0 = K.rectIn(s.el), tgt = leftPan();
            await K.sim.drag(s.el, { x: r0.w / 2, y: r0.h / 2 }, { x: tgt.x - r0.x, y: tgt.y - r0.y }, 480, 8);
            await until(() => s.done && !st.lifting, 3000);
          }
          for (let r = 0; r < rounds; r++) {
            await until(() => st.phase === 'swirl', 20000);
            await K.wait(250);
            const hr = K.rectIn(panHit), cx0 = hr.w / 2, cy0 = hr.h / 2, rad = M.r * 0.55, t0 = now();
            const p = await K.sim.press(panHit, cx0 + rad, cy0);
            let a = 0, last = now();
            while (st.phase === 'swirl' && now() - t0 < 20000) { await K.wait(30); const tn = now(); a += Math.min(1.4, IDEAL * 1.02 * (tn - last) / 1000); last = tn; p.move(cx0 + Math.cos(a) * rad, cy0 + Math.sin(a) * rad); }
            p.up(cx0 + Math.cos(a) * rad, cy0 + Math.sin(a) * rad);
            if (r === TWIST) {
              await until(() => st.phase === 'fool', 8000);
              await K.wait(2400);
              const f = FL.find(x => x.kind === 'fool' && x.btn); if (f) await K.sim.tap(f.btn);
              await until(() => st.phase === 'bite', 5000);
              await K.wait(300);
              for (let i = 0; i < 5 && st.phase === 'bite' && st.loupe; i++) await K.sim.hold(st.loupe, 1500);
              await until(() => st.phase === 'toss', 6000);
              await K.wait(300);
              if (st.chunk) { const cr = K.rectIn(st.chunk); await K.sim.drag(st.chunk, { x: cr.w / 2, y: cr.h / 2 }, { x: cr.w / 2 + 120, y: cr.h / 2 + 70 }, 360, 10); }
            }
            await until(() => st.phase === 'pick', 15000);
            for (let k = 0; k < 6; k++) {
              const f = FL.find(x => x.kind === 'gold' && !x.picked && x.btn); if (!f) break;
              await K.wait(300);
              await K.sim.tap(f.btn);
              await until(() => f.gone, 4000);
            }
            await until(() => st.phase !== 'pick', 8000);
          }
          await until(() => st.phase === 'weigh', 20000);
          await K.wait(600);
          const vr = K.rectIn(vialHit), tp = rightPan(), v = vialAt();
          await K.sim.drag(vialHit, { x: vr.w / 2, y: vr.h * 0.6 }, { x: vr.w / 2 + (tp.x - v.x), y: vr.h * 0.6 + (tp.y - v.y) }, 700, 14);
          await until(() => st.finished, 40000);
        }
      };
    }
  });
})(window.TSG_ENV);
