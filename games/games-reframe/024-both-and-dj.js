/* 024 Both/And DJ — Reframe · REFRAME · Emotion
 * Mechanism: dialectical thinking, DBT's "both/and" (Linehan 1993, 2015): holding two true things at once ("I'm
 * struggling AND I'm coping") instead of either/or lowers distress and loosens all-or-nothing appraisals. Deck A plays the
 * thought that has been on repeat (the drums and bass: it is real and it drives everything); Deck B holds true counterweights
 * the player picks from a crate (facts, values, strengths, plans, all drawn honestly from the reading). Musically the two
 * tracks are a call and its answer: only A is heavy and one-note, only B has no groove, the full song needs both. Honest:
 * when the facts back the worry, Deck B offers plans, not "it hasn't happened"; in care mode it offers proper advice.
 * Verb: crossfade (drag the crossfader to the middle until both play), drop (tap DROP on the one), scratch (circle the
 * record: the "AND" sample scratches for real, its pitch and direction following your hand). Twist: the crowd requests only
 * Deck A (the either/or trap); it gets heavy, you blend B back in and they like it better (Full: and only B, too).
 * Finale: the drop: lasers, confetti, fireworks over the city, and the both/and lines scroll as the encore lyrics.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const hexRGB = (c) => { const n = parseInt(String(c).slice(1, 7), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mixHex = (a, b, k) => { const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => Math.max(0, Math.min(255, Math.round(v + (B[i] - v) * k))).toString(16).padStart(2, '0')).join(''); };
  const rgba = (c, a) => { const A = hexRGB(c); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')'; };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const rr = (g, x, y, w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const sprite = (size, stops) => { const c = mk(size, size), g = c.getContext('2d'), r = size / 2, gr = g.createRadialGradient(r, r, 0, r, r, r); stops.forEach(s => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.fillRect(0, 0, size, size); return c; };
  const wrapA = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
  const frac = (x) => x - Math.floor(x);
  const A_COL = '#ff3fa4', B_COL = '#22e3ff', AND_COL = '#ffd23f';

  /* Tonight's rooftop: one venue per day, each with its own skyline, sky and tempo. */
  const VENUES = [
    { key: 'downtown', name: 'Rooftop 88', sub: 'Downtown', bpm: 122, city: 'towers', night: ['#06061c', '#160d3e', '#3e1660', '#7a2468'], dusk: ['#3a2a8c', '#8a48b6', '#ff7a9c', '#ffb878'], far: ['#1d1446', '#7d5aa8'], near: ['#0d0a24', '#4a2b72'], win: '#ffcf7a' },
    { key: 'harbour', name: 'Harbour Deck', sub: 'By the water', bpm: 120, city: 'bridge', night: ['#040a1e', '#0b1b44', '#1d2a66', '#5a2a78'], dusk: ['#2c3a92', '#6a5cc4', '#ff8aa0', '#ffc488'], far: ['#152048', '#6f6cb0'], near: ['#081028', '#3c3478'], win: '#ffe2a0' },
    { key: 'garden', name: 'Sky Garden', sub: 'Palm terrace', bpm: 124, city: 'palms', night: ['#05101a', '#0b2236', '#243a5e', '#6a3a6e'], dusk: ['#2a5a8a', '#7a6ab8', '#ff9a8a', '#ffd08a'], far: ['#122a3a', '#6a7aa8'], near: ['#08141c', '#3a3a68'], win: '#ffd890' },
    { key: 'neon', name: 'Neon Heights', sub: 'Signs and steam', bpm: 126, city: 'signs', night: ['#0a041a', '#200a3a', '#481064', '#8a1a5e'], dusk: ['#46207a', '#9a3aa8', '#ff6a9a', '#ffaa7a'], far: ['#22103e', '#86529e'], near: ['#100620', '#4c2266'], win: '#9af0ff' }
  ];
  /* The crate: every record style is a different arrangement of the same answer (collectable over visits). */
  const STYLES = [
    { key: 'soul', name: 'Soul Keys', c1: '#ff7a2e', c2: '#ffd35a', pat: 'sun', inst: 'ep', rhythm: [[0, 3], [3, 3], [6, 2], [10, 3], [14, 2]], cv: 0.13, mv: 0.24 },
    { key: 'disco', name: 'Disco Strings', c1: '#9a2cff', c2: '#ff6ad5', pat: 'ball', inst: 'strings', rhythm: [[2, 1], [6, 1], [10, 1], [14, 1]], cv: 0.09, mv: 0.12 },
    { key: 'house', name: 'House Piano', c1: '#0aa88c', c2: '#b8f55a', pat: 'stripes', inst: 'piano', rhythm: [[0, 2], [3, 1], [6, 2], [9, 1], [12, 2]], cv: 0.12, mv: 0.2 },
    { key: 'synth', name: 'Synthwave', c1: '#3424ff', c2: '#ff3fa4', pat: 'grid', inst: 'saw', arp: 16, cv: 0.08, mv: 0.11 },
    { key: 'garage', name: 'Garage Organ', c1: '#ffb81e', c2: '#ff4e36', pat: 'dots', inst: 'organ', rhythm: [[0, 1], [3, 1], [7, 1], [10, 1], [13, 1]], swing: true, cv: 0.08, mv: 0.12 },
    { key: 'marimba', name: 'Marimba Sun', c1: '#ff5a2e', c2: '#1fb87a', pat: 'waves', inst: 'marimba', arp: 8, cv: 0.2, mv: 0.28 },
    { key: 'lofi', name: 'Lo-fi Bloom', c1: '#7f6bff', c2: '#ffb8dc', pat: 'clouds', inst: 'lofi', rhythm: [[0, 7], [8, 7]], cv: 0.09, mv: 0.2, crackle: true, unlock: 2 },
    { key: 'gospel', name: 'Gospel Choir', c1: '#ffdf8a', c2: '#c27a12', pat: 'rays', inst: 'organ', choir: true, rhythm: [[0, 1], [4, 1], [8, 1], [12, 1]], cv: 0.07, mv: 0.12, unlock: 4 }
  ];
  /* One song in two halves: Deck A calls (minor, on repeat), Deck B answers (major). A minor / C major, vi IV I V. */
  const PROG = [['A2', 'Am'], ['F2', 'F'], ['C3', 'C'], ['G2', 'G']];
  const PAD_A = { Am: ['A2', 'E3', 'A3', 'C4'], F: ['F2', 'C3', 'F3', 'A3'], C: ['C3', 'G3', 'C4', 'E4'], G: ['G2', 'D3', 'G3', 'B3'] };
  const CH_B = { Am: ['A3', 'C4', 'E4', 'G4'], F: ['F3', 'A3', 'C4', 'E4'], C: ['C4', 'E4', 'G4', 'B4'], G: ['G3', 'B3', 'D4', 'A4'] };
  const CALL = [[['A4', 0, 2], ['G4', 2, 2], ['E4', 4, 4]], [['A4', 0, 2], ['G4', 2, 2], ['F4', 4, 4]], [['G4', 0, 2], ['E4', 2, 2], ['C4', 4, 4]], [['D4', 0, 2], ['E4', 2, 2], ['B3', 4, 4]]];
  const ANSWER = [[['C5', 8, 2], ['D5', 10, 2], ['E5', 12, 4]], [['C5', 8, 2], ['A4', 10, 2], ['C5', 12, 4]], [['E5', 8, 2], ['G5', 10, 2], ['E5', 12, 2], ['D5', 14, 2]], [['D5', 8, 2], ['C5', 10, 2], ['B4', 12, 2], ['D5', 14, 2]]];
  const FORM = { oo: [[320, 1, 9], [800, 0.32, 10], [2300, 0.07, 12]], ah: [[730, 1, 8], [1090, 0.5, 9], [2440, 0.16, 12]], ae: [[680, 1, 8], [1720, 0.48, 10], [2410, 0.16, 12]], n: [[260, 0.7, 6], [1200, 0.12, 8], [2400, 0.04, 10]] };
  const HOT = /\b(definitely|going to|gonna|must|never|always|everyone|nobody|ruined|fired|over|losing|hates?|can'?t|won'?t|\w+['’]ll)\b/i;
  const FUT = /\b(going to|gonna|will|won['’]?t|\w+['’]ll|never)\b/i;

  (env.games = env.games || []).push({
    id: 'both-and-dj', mode: 'reframe', name: 'Both/And DJ', verb: 'crossfade', family: 'REFRAME', minutes: 2,
    parents: ['Emotion', 'Identity / Self', 'Decision Pressure'],
    cast: ['sync', 'rush', 'loopie'], poster: { char: 'sync', mood: 'cool' },
    fonts: ['Monoton', 'Big+Shoulders+Display:wght@700;800;900', 'Chakra+Petch:wght@600;700'],
    tagline: 'Mix the thought on repeat with what’s also true. Play both decks.',
    why: 'For either/or thinking: hold two true things at once and hear the whole song.',
    css: `
.g-both-and-dj { --bd-a: #ff3fa4; --bd-b: #22e3ff; --bd-and: #ffd23f; --bd-ink: #f7f1ff; background: #0a0618;
  --bd-disp: "Big Shoulders Display", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --bd-neon: Monoton, "Big Shoulders Display", "Inter", system-ui, sans-serif;
  --bd-lcd: "Chakra Petch", "Share Tech Mono", "DejaVu Sans Mono", ui-monospace, monospace; }
.g-both-and-dj .bd-hud { position: absolute; z-index: 34; left: 12px; right: 12px; top: calc(env(safe-area-inset-top, 0px) + 60px); display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; pointer-events: none; }
.g-both-and-dj .bd-venue { padding: 6px 11px 6px; border-radius: 12px; background: rgba(9, 5, 22, 0.66); border: 1px solid rgba(255, 63, 164, 0.42); box-shadow: 0 0 16px rgba(255, 63, 164, 0.2); min-width: 0; }
.g-both-and-dj .bd-vn { display: block; font: 400 15px/1 var(--bd-neon); letter-spacing: 0.04em; color: #ffe3f3; text-shadow: 0 0 6px #ff3fa4, 0 0 14px rgba(255, 63, 164, 0.7); white-space: nowrap; }
.g-both-and-dj .bd-venue small { display: block; margin-top: 4px; font: 600 12px/1 var(--bd-lcd); letter-spacing: 0.06em; color: rgba(247, 241, 255, 0.8); white-space: nowrap; }
.g-both-and-dj .bd-hype { display: grid; grid-template-columns: auto auto; align-items: center; justify-items: end; column-gap: 8px; row-gap: 5px; padding: 6px 9px; border-radius: 12px; background: rgba(9, 5, 22, 0.66); border: 1px solid rgba(255, 255, 255, 0.15); }
.g-both-and-dj .bd-hype b { font: 700 12px/1 var(--bd-lcd); letter-spacing: 0.2em; text-transform: uppercase; color: rgba(247, 241, 255, 0.85); }
.g-both-and-dj .bd-meter { display: flex; gap: 3px; }
.g-both-and-dj .bd-meter i { width: 7px; height: 13px; border-radius: 2px; background: rgba(255, 255, 255, 0.14); }
.g-both-and-dj .bd-meter i.on { background: var(--c); box-shadow: 0 0 7px var(--c); }
.g-both-and-dj .bd-pips { display: flex; gap: 6px; grid-column: 1 / 3; }
.g-both-and-dj .bd-pips i { width: 9px; height: 9px; border-radius: 50%; border: 2px solid rgba(255, 210, 63, 0.75); }
.g-both-and-dj .bd-pips i.on { background: var(--bd-and); box-shadow: 0 0 8px var(--bd-and); }
.g-both-and-dj .bd-glow { position: absolute; z-index: 21; border-radius: 12px; pointer-events: none; opacity: 0.5; will-change: opacity; box-shadow: 0 0 34px 6px var(--gc, #ff3fa4), 0 0 80px 10px var(--gc2, rgba(255, 63, 164, 0.35)); }
.g-both-and-dj .bd-board { position: absolute; z-index: 22; pointer-events: none; display: grid; place-items: center; text-align: center; color: var(--bd-ink); overflow: hidden; }
.g-both-and-dj .bd-bi { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 6px 14px; max-width: 100%; box-sizing: border-box; opacity: 0; transform: translateY(10px) scale(0.97); transition: opacity 0.35s ease, transform 0.5s cubic-bezier(.2, 1.3, .4, 1); }
.g-both-and-dj .bd-bi.in { opacity: 1; transform: none; }
.g-both-and-dj .bd-k { font: 700 12px/1.1 var(--bd-lcd); letter-spacing: 0.18em; text-transform: uppercase; color: rgba(247, 241, 255, 0.8); }
.g-both-and-dj .bd-big { font: 400 27px/1.05 var(--bd-neon); color: #fff0f8; text-shadow: 0 0 8px var(--bd-a), 0 0 20px rgba(255, 63, 164, 0.7); }
.g-both-and-dj .bd-big.b { text-shadow: 0 0 8px var(--bd-b), 0 0 20px rgba(34, 227, 255, 0.7); }
.g-both-and-dj .bd-sub { font: 600 13px/1.25 var(--bd-lcd); color: rgba(247, 241, 255, 0.78); letter-spacing: 0.04em; }
.g-both-and-dj .bd-q { font: 800 21px/1.15 var(--bd-disp); color: #ffe3f3; text-shadow: 0 0 10px rgba(255, 63, 164, 0.8); display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; padding: 6px 14px; margin: -6px -14px; }
.g-both-and-dj .bd-la, .g-both-and-dj .bd-lb { font: 800 20px/1.12 var(--bd-disp); display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; padding: 6px 14px; margin: -6px -14px; }
.g-both-and-dj .bd-la { color: #ffe2f2; text-shadow: 0 0 10px rgba(255, 63, 164, 0.9); }
.g-both-and-dj .bd-lb { color: #dcfbff; text-shadow: 0 0 10px rgba(34, 227, 255, 0.9); }
.g-both-and-dj .bd-and { font: 400 26px/1 var(--bd-neon); color: #fff6cf; letter-spacing: 0.08em; text-shadow: 0 0 6px var(--bd-and), 0 0 18px rgba(255, 210, 63, 0.85); }
.g-both-and-dj .bd-small .bd-la, .g-both-and-dj .bd-small .bd-lb { font-size: 17px; }
.g-both-and-dj .bd-enc { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.g-both-and-dj .bd-enc p { margin: 0; font: 800 16px/1.15 var(--bd-disp); color: rgba(247, 241, 255, 0.6); transition: color 0.3s ease, transform 0.3s ease; }
.g-both-and-dj .bd-enc p.on { color: #ffffff; transform: scale(1.05); text-shadow: 0 0 12px rgba(255, 210, 63, 0.85); }
.g-both-and-dj .bd-enc p em { font: 400 0.95em/1 var(--bd-neon); font-style: normal; color: var(--bd-and); margin: 0 0.3em; }
.g-both-and-dj .bd-crate { position: absolute; z-index: 36; pointer-events: none; }
.g-both-and-dj .bd-crate[hidden] { display: none; }
.g-both-and-dj .bd-sleeve { position: absolute; pointer-events: auto; border: 0; padding: 0; margin: 0; border-radius: 8px; cursor: grab; touch-action: none; color: #fff; text-align: left; overflow: hidden;
  background: linear-gradient(150deg, var(--c1), var(--c2)); box-shadow: 0 12px 24px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.28);
  transform: translate(0, 0); transition: transform 0.45s cubic-bezier(.2, 1.35, .4, 1), opacity 0.3s ease, box-shadow 0.2s ease; }
.g-both-and-dj .bd-sleeve.drag { transition: none; cursor: grabbing; z-index: 2; box-shadow: 0 26px 40px rgba(0, 0, 0, 0.55), 0 0 0 3px rgba(255, 255, 255, 0.9); }
.g-both-and-dj .bd-sleeve.hot { box-shadow: 0 26px 40px rgba(0, 0, 0, 0.55), 0 0 0 3px var(--bd-b), 0 0 26px var(--bd-b); }
.g-both-and-dj .bd-sleeve.out { opacity: 0; transform: translate(0, 30px) scale(0.9); pointer-events: none; }
.g-both-and-dj .bd-sleeve.in0 { opacity: 0; transform: translate(0, -24px) scale(0.92); }
.g-both-and-dj .bd-sleeve:focus-visible { outline: 3px solid #ffffff; outline-offset: 3px; }
.g-both-and-dj .bd-sl-pat { position: absolute; inset: 0; opacity: 0.36; pointer-events: none; }
.g-both-and-dj .bd-pat-sun { background: repeating-conic-gradient(from 0deg at 80% 18%, rgba(255, 255, 255, 0.55) 0 7deg, transparent 7deg 19deg); }
.g-both-and-dj .bd-pat-ball { background: radial-gradient(circle, rgba(255, 255, 255, 0.95) 0 1.6px, transparent 2.4px) 0 0 / 11px 11px; }
.g-both-and-dj .bd-pat-stripes { background: repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.5) 0 6px, transparent 6px 15px); }
.g-both-and-dj .bd-pat-grid { background: linear-gradient(rgba(255, 255, 255, 0.55) 1px, transparent 1px) 0 0 / 14px 14px, linear-gradient(90deg, rgba(255, 255, 255, 0.55) 1px, transparent 1px) 0 0 / 14px 14px; }
.g-both-and-dj .bd-pat-dots { background: radial-gradient(circle, rgba(40, 10, 0, 0.55) 0 3px, transparent 3.6px) 0 0 / 13px 13px; }
.g-both-and-dj .bd-pat-waves { background: repeating-radial-gradient(circle at 0 100%, rgba(255, 255, 255, 0.55) 0 4px, transparent 4px 13px); }
.g-both-and-dj .bd-pat-clouds { background: radial-gradient(circle at 26% 28%, rgba(255, 255, 255, 0.8) 0 15px, transparent 16px), radial-gradient(circle at 62% 22%, rgba(255, 255, 255, 0.7) 0 20px, transparent 21px); }
.g-both-and-dj .bd-pat-rays { background: repeating-conic-gradient(from 0deg at 50% 112%, rgba(255, 255, 255, 0.6) 0 5deg, transparent 5deg 15deg); }
.g-both-and-dj .bd-sl-rec { position: absolute; right: 8px; top: 8px; width: 36%; aspect-ratio: 1; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, #fff 0 4%, var(--c2) 5% 20%, #0d0a14 21% 23%, transparent 24%), repeating-radial-gradient(circle, #121018 0 2px, #211d2c 2px 4px); box-shadow: 0 3px 8px rgba(0, 0, 0, 0.5); }
.g-both-and-dj .bd-sl-txt { position: absolute; left: 0; right: 0; bottom: 0; padding: 20px 9px 9px; background: linear-gradient(180deg, rgba(12, 6, 24, 0), rgba(12, 6, 24, 0.9) 30%); pointer-events: none; }
.g-both-and-dj .bd-sl-tag { display: inline-block; font: 700 12px/1 var(--bd-lcd); letter-spacing: 0.1em; padding: 3px 5px 2px; border-radius: 4px; background: rgba(255, 255, 255, 0.94); color: #160a24; }
.g-both-and-dj .bd-sl-line { display: block; margin-top: 6px; font: 800 16px/1.08 var(--bd-disp); color: #ffffff; text-wrap: balance; }
.g-both-and-dj .bd-sl-style { display: block; margin-top: 5px; font: 600 12px/1 var(--bd-lcd); color: rgba(255, 255, 255, 0.8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.g-both-and-dj .bd-cap { position: absolute; z-index: 25; font: 700 12px/1 var(--bd-lcd); letter-spacing: 0.1em; text-transform: uppercase; color: rgba(247, 241, 255, 0.88); white-space: nowrap; pointer-events: none; overflow: hidden; text-overflow: ellipsis; }
.g-both-and-dj .bd-cap b { display: inline-block; min-width: 18px; padding: 2px 4px 1px; margin-right: 6px; border-radius: 4px; text-align: center; color: #12081e; }
.g-both-and-dj .bd-cap-a b { background: #ff86c8; }
.g-both-and-dj .bd-cap-b b { background: #74f1ff; }
.g-both-and-dj .bd-plat { position: absolute; z-index: 24; border-radius: 50%; touch-action: none; cursor: grab; outline: none; }
.g-both-and-dj .bd-plat:focus-visible { box-shadow: 0 0 0 3px var(--bd-and); }
.g-both-and-dj .bd-start { position: absolute; z-index: 27; border: 0; border-radius: 50%; cursor: pointer; display: grid; place-items: center; align-content: center; gap: 4px; padding: 0; color: #ffffff; font: 800 15px/1 var(--bd-disp); letter-spacing: 0.12em; text-transform: uppercase;
  background: radial-gradient(circle at 50% 35%, #ff9ad0, #ff3fa4 55%, #a8105f); box-shadow: 0 0 0 4px rgba(255, 63, 164, 0.32), 0 0 26px rgba(255, 63, 164, 0.75), 0 8px 16px rgba(0, 0, 0, 0.5); transition: transform 0.25s ease, opacity 0.35s ease; }
.g-both-and-dj .bd-start i { width: 0; height: 0; border-left: 17px solid #ffffff; border-top: 11px solid transparent; border-bottom: 11px solid transparent; margin-left: 5px; }
.g-both-and-dj .bd-start.gone { opacity: 0; transform: scale(0.6); pointer-events: none; }
.g-both-and-dj .bd-start:focus-visible { outline: 3px solid #ffffff; outline-offset: 4px; }
.g-both-and-dj .bd-drop { position: absolute; z-index: 27; border: 0; border-radius: 50%; cursor: pointer; display: grid; place-items: center; padding: 0; color: #2a1600; font: 800 18px/1 var(--bd-disp); letter-spacing: 0.12em; text-transform: uppercase;
  background: radial-gradient(circle at 50% 32%, #fff6cf, #ffd23f 46%, #d98a00); box-shadow: 0 0 0 4px rgba(255, 210, 63, calc(0.16 + var(--k, 0) * 0.5)), 0 0 calc(8px + var(--k, 0) * 26px) rgba(255, 210, 63, 0.8), 0 8px 16px rgba(0, 0, 0, 0.55);
  transform: scale(calc(1 + var(--k, 0) * 0.07)); }
.g-both-and-dj .bd-drop.idle { filter: saturate(0.3) brightness(0.72); }
.g-both-and-dj .bd-drop:focus-visible { outline: 3px solid #ffffff; outline-offset: 4px; }
.g-both-and-dj .bd-xf { position: absolute; z-index: 26; touch-action: none; cursor: ew-resize; outline: none; }
.g-both-and-dj .bd-xf:focus-visible { box-shadow: 0 0 0 3px var(--bd-and); border-radius: 12px; }
.g-both-and-dj .bd-xf-track { position: absolute; left: 36px; right: 36px; top: 50%; height: 8px; margin-top: -1px; border-radius: 4px; background: #05040a; box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.9), 0 1px 0 rgba(255, 255, 255, 0.14); }
.g-both-and-dj .bd-xf-zone { position: absolute; top: -9px; bottom: -9px; border-radius: 8px; border: 1px solid rgba(255, 210, 63, 0.55); background: rgba(255, 210, 63, 0.1); overflow: hidden; }
.g-both-and-dj .bd-xf-fill { position: absolute; left: 0; top: 0; bottom: 0; width: calc(var(--f, 0) * 100%); background: linear-gradient(90deg, rgba(255, 210, 63, 0.3), rgba(255, 210, 63, 0.8)); }
.g-both-and-dj .bd-xf-l, .g-both-and-dj .bd-xf-r { position: absolute; top: 50%; margin-top: 3px; transform: translateY(-50%); font: 800 19px/1 var(--bd-disp); }
.g-both-and-dj .bd-xf-l { left: 4px; color: #ff6cbc; text-shadow: 0 0 8px rgba(255, 63, 164, 0.7); }
.g-both-and-dj .bd-xf-r { right: 4px; color: #4eeaff; text-shadow: 0 0 8px rgba(34, 227, 255, 0.7); }
.g-both-and-dj .bd-xf-and { position: absolute; left: 50%; top: 0; transform: translateX(-50%); font: 700 12px/1 var(--bd-lcd); letter-spacing: 0.18em; color: rgba(255, 228, 140, 0.95); white-space: nowrap; }
.g-both-and-dj .bd-xf-knob { position: absolute; top: 50%; left: 0; width: 34px; height: 40px; margin: -16px 0 0 -17px; border-radius: 7px; pointer-events: none;
  background: linear-gradient(180deg, #f7f4fc, #c6c2d4 55%, #9e99b2); box-shadow: 0 3px 0 #5f5a72, 0 8px 14px rgba(0, 0, 0, 0.55), inset 0 1px 0 #ffffff; transform: translateX(var(--x, 0px)); }
.g-both-and-dj .bd-xf-knob::after { content: ""; position: absolute; left: 50%; top: 6px; bottom: 6px; width: 3px; margin-left: -1.5px; border-radius: 2px; background: #1b1530; }
.g-both-and-dj .bd-xf.hot .bd-xf-knob::after { background: var(--bd-and); box-shadow: 0 0 6px var(--bd-and); }
.g-both-and-dj .bd-sign { position: absolute; z-index: 31; transform: translateX(-50%) rotate(-4deg); padding: 7px 11px 6px; border-radius: 6px; background: #fffaf2; color: #1d0d2e; font: 800 16px/1 var(--bd-disp); letter-spacing: 0.04em; text-transform: uppercase; white-space: nowrap; pointer-events: none; box-shadow: 0 6px 14px rgba(0, 0, 0, 0.45), inset 0 0 0 2px rgba(29, 13, 46, 0.14); }
.g-both-and-dj .bd-sign[hidden] { display: none; }
.g-both-and-dj .bd-sign b { color: #e0127a; }
.g-both-and-dj .bd-sign.b b { color: #0898b8; }
.g-both-and-dj .bd-combo { position: absolute; z-index: 28; transform: translateX(-50%); padding: 6px 11px 5px; border-radius: 999px; background: rgba(9, 5, 22, 0.8); border: 1px solid rgba(255, 210, 63, 0.6); font: 700 13px/1 var(--bd-lcd); letter-spacing: 0.12em; color: #ffe9a6; white-space: nowrap; pointer-events: none; }
.g-both-and-dj .bd-combo[hidden] { display: none; }
.g-both-and-dj .bd-combo b { color: var(--bd-and); }
@container (min-width: 700px) {
  .g-both-and-dj .bd-vn { font-size: 18px; }
  .g-both-and-dj .bd-k { font-size: 13px; }
  .g-both-and-dj .bd-q { font-size: 30px; }
  .g-both-and-dj .bd-big { font-size: 38px; }
  .g-both-and-dj .bd-la, .g-both-and-dj .bd-lb { font-size: 29px; }
  .g-both-and-dj .bd-small .bd-la, .g-both-and-dj .bd-small .bd-lb { font-size: 24px; }
  .g-both-and-dj .bd-and { font-size: 36px; }
  .g-both-and-dj .bd-enc p { font-size: 21px; }
  .g-both-and-dj .bd-sl-line { font-size: 19px; }
  .g-both-and-dj .bd-drop { font-size: 21px; }
  .g-both-and-dj .bd-sign { font-size: 18px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const clamp = K.clamp, lerp = K.lerp, ease = K.ease, now = () => performance.now(), reduced = () => K.reduced();
      const inten = ctx.intensity, L = (o) => ctx.line(o) || '';
      const text = String(ctx.text || '').trim(), hasText = text.length > 0;
      const care = an.safety === 'care', strong = an.fear_support === 'strong';
      const visits = K.visits();
      const venue = K.dailyPick(VENUES, 3);
      const BPM = venue.bpm, BEAT = 60 / BPM, BAR = BEAT * 4, LOOP = BAR * 4, S16 = BEAT / 4;
      const OMEGA = TAU * 33.333 / 60;
      const ROUNDS = [2, 3, 3][inten], ZONE = [0.24, 0.2, 0.16][inten], FILL_S = [0.9, 1.1, 1.3][inten], STROKES = [4, 6, 8][inten];
      const PW = [0.11, 0.085, 0.065][inten], GW = [0.22, 0.17, 0.13][inten], BEATW = [0.09, 0.07, 0.055][inten];
      const TRAP_B = inten === 2 && !care;
      const nf = (n) => A.note(n);

      /* ---------------- the player's words: Deck A's track ---------------- */
      const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); return (sp > n * 0.5 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; };
      const exact = (q) => { const i = text.toLowerCase().indexOf(String(q).toLowerCase()); return i < 0 ? '' : text.slice(i, i + String(q).length); };
      const spans = (Array.isArray(an.spans) ? an.spans : []).filter(s => s && typeof s.quote === 'string' && s.quote.trim());
      const brain = spans.filter(s => s.kind === 'brain').map(s => exact(s.quote.trim())).filter(Boolean);
      let hot = '';
      if (brain.length) { let best = brain[brain.length - 1], bs = -1; brain.forEach((q, i) => { const sc = (HOT.test(q) ? 2 : 0) + (q.length <= 60 ? 1 : 0) + i * 0.01; if (sc > bs) { bs = sc; best = q; } }); hot = best; }
      if (!hot && hasText) { const ph = K.phrases(text, 6, 9); hot = ph[ph.length - 1] || ''; }
      hot = clip(hot.replace(/^[\s,;:–-]+|[\s,;:.!?–-]+$/g, ''), 64);
      const feelWord = (typeof an.feeling === 'string' && /^[a-z][a-z' -]{1,16}$/i.test(an.feeling.trim())) ? an.feeling.trim().toLowerCase() : '';
      /* Deck A's side of each lyric: the feeling, validated (it's real), in the player's own words where we have them */
      const A_SIDES = hasText ? [
        hot ? { pre: 'Part of me says ', q: hot } : { t: 'Part of me is struggling' },
        feelWord ? { t: 'I feel ' + feelWord } : { t: 'This feels heavy' },
        { t: strong ? 'This is a real worry' : 'It feels big right now' },
        { t: 'It’s hard' }
      ] : [{ t: 'Part of me is struggling' }, { t: 'This feels heavy' }, { t: 'I’m not sure about all of it' }, { t: 'It’s a lot' }];
      /* Deck B's records: true counterweights, honest to the reading (plans when the worry is well founded) */
      const dists = (Array.isArray(an.distortions) ? an.distortions : []).map(d => d && d.type);
      const future = hasText && (dists.includes('fortune_telling') || FUT.test(hot));
      const mind = hasText && (dists.includes('mind_reading') || /\b(thinks?|annoyed|hates?|mad at|angry|judg\w*|laughing|losing interest)\b/i.test(hot));
      const leads = Array.isArray(an.leads) ? an.leads : [];
      const altN = (Array.isArray(an.alternatives) ? an.alternatives : []).find(a => a && !a.fear && typeof a.name === 'string' && a.name.trim());
      const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (m, p, c) => p + c.toUpperCase());
      const CW = [];
      const add = (id, tag, line) => { if (!CW.some(c => c.id === id)) CW.push({ id, tag, line, used: false }); };
      if (!hasText) add('coping', 'STRENGTH', 'I’m coping');
      if (care) add('help', 'HELP', 'I can get proper advice');
      if (strong) { add('plan', 'PLAN', 'I can make a plan'); add('step', 'CAN', 'I can take one step today'); add('support', 'SUPPORT', 'I can ask for support'); }
      else {
        if (future) add('nothappened', 'FACT', 'it hasn’t happened');
        if (mind) add('mind', 'FACT', 'I can’t see inside their head');
        add('ending', 'FACT', 'I don’t know the ending yet');
        if (hasText && altN && !care) add('alt', 'COULD BE', 'it could be “' + clip(titleCase(altN.name), 28) + '”');
      }
      if (leads.some(l => l && l.kind === 'ask')) add('ask', 'CAN', 'I can ask about it');
      add('matters', 'VALUE', 'it matters to me');
      add('handling', 'STRENGTH', 'I’m handling it right now');
      add('before', 'STRENGTH', 'I’ve got through hard days before');
      add('kind', 'CAN', 'I can be kind to myself');
      if (leads.some(l => l && l.kind === 'prepare')) add('prep', 'CAN', 'I can prepare');
      /* records in today's styles (more styles unlock with visits) */
      const pool = STYLES.filter(s => !s.unlock || visits >= s.unlock);
      const sOff = Math.floor(K.dailyPick([0, 1, 2, 3, 4, 5, 6, 7], 5)) % pool.length;
      CW.forEach((c, i) => { c.style = pool[(sOff + i) % pool.length]; });

      /* ---------------- lines (every one in three vibes) ---------------- */
      const SY = {
        hello: { Jolly: 'Rooftop’s packed! Start Deck A and let’s hear what’s on it.', Cheeky: 'Big crowd. No pressure. Hit start on Deck A.', Unfiltered: 'Crowd’s here. Start Deck A.' },
        heavy: strong ? { Jolly: 'That track’s heavy for a real reason. Let’s give it company.', Cheeky: 'Heavy one, and fair enough. It needs a partner.', Unfiltered: 'Real and heavy. Give it company.' }
          : { Jolly: 'That’s the one on repeat. It’s real. It’s not the only track.', Cheeky: 'Moody. Catchy. Extremely on repeat.', Unfiltered: 'Real track. Not the only one.' },
        crate: { Jolly: 'Dig the crate. Pick a record that’s also true.', Cheeky: 'Crate time. Find one that’s true too.', Unfiltered: 'Pick a true one for Deck B.' },
        crate2: { Jolly: 'Another record. What else is true?', Cheeky: 'Next one. Something else that’s true.', Unfiltered: 'Next true one.' },
        cue: { Jolly: 'Watch the lights and drop it on the one!', Cheeky: 'Count it in. Land it on the one.', Unfiltered: 'Tap on the one.' },
        blend: { Jolly: 'Now slide to the middle. Let both play.', Cheeky: 'Middle of the fader. Both decks. Trust me.', Unfiltered: 'Middle. Both.' },
        lock: [{ Jolly: 'Hear that? Both at once. That’s the whole song.', Cheeky: 'Both decks. The crowd’s losing it.', Unfiltered: 'Both true. Both playing.' },
          { Jolly: 'Two true things, one groove. Beautiful.', Cheeky: 'And another one. You’re good at this.', Unfiltered: 'Both. Again.' },
          { Jolly: 'Listen to it now. Nothing had to be switched off.', Cheeky: 'Full song. Nobody got cancelled.', Unfiltered: 'Everything’s still playing.' }],
        request: { Jolly: 'A request! Let’s give them only Deck A and see.', Cheeky: 'A request. The customer’s always right… let’s test it.', Unfiltered: 'Request: only A. Try it.' },
        drained: { Jolly: 'Same loop, again and again. They’re drifting. Blend B back in?', Cheeky: 'One track on repeat. Even Loopie’s yawning.', Unfiltered: 'Only A gets heavy. Bring B back.' },
        liked: { Jolly: 'Louder than before. They like it better with both!', Cheeky: 'Turns out they wanted both. Who knew? (Me.)', Unfiltered: 'Both wins.' },
        reqB: { Jolly: 'Now someone wants only Deck B. Let’s try that too.', Cheeky: 'Now the other way. Fine. Only B.', Unfiltered: 'Only B? Try it.' },
        drainedB: { Jolly: 'Pretty, but no beat. Pushing A away doesn’t work either.', Cheeky: 'Lovely chords. Nobody can dance. Bring A back.', Unfiltered: 'No A, no beat. Blend.' },
        likedB: { Jolly: 'There it is. The beat AND the answer.', Cheeky: 'See? The sad bass slaps when it’s not alone.', Unfiltered: 'Both. Again.' },
        swap: { Jolly: 'Fresh record. Fader’s back on A. Bring it in on the one.', Cheeky: 'New record cued. Same trick: on the one.', Unfiltered: 'Cued. Tap on the one.' },
        scratch: { Jolly: 'Big finish. Scratch in the AND: circle the record!', Cheeky: 'Show-off time. Scratch it.', Unfiltered: 'Scratch the AND.' },
        scratched: { Jolly: 'A-a-a-AND! They loved that.', Cheeky: 'Okay, scratch legend.', Unfiltered: 'Nice hands.' },
        build: { Jolly: 'Here it comes… drop it on the one!', Cheeky: 'Hands up. Drop it on the one.', Unfiltered: 'Drop it on the one.' },
        end: care ? { Jolly: 'Both decks, all night. And proper advice is part of the plan.', Cheeky: 'Two true things. One banger. Proper advice next.', Unfiltered: 'Both true. Get proper advice too.' }
          : strong ? { Jolly: 'It’s real AND you’ve got a plan. That’s the set.', Cheeky: 'Heavy track, solid plan. Great set.', Unfiltered: 'Real worry. Real plan. Good set.' }
            : { Jolly: 'Both decks, all night. That was beautiful.', Cheeky: 'Two true things. One banger.', Unfiltered: 'Both true. Great set.' }
      };
      const LO = {
        hi: { Jolly: 'Ooh, I know this one. It’s been on repeat all week.', Cheeky: 'My favourite. I’ve played it 400 times.', Unfiltered: 'This one. On repeat.' },
        request: { Jolly: 'Can you play ONLY Deck A? On repeat?', Cheeky: 'Request! Just Deck A. Forever.', Unfiltered: 'Only Deck A. Please.' },
        yay: { Jolly: 'Yes! My song!', Cheeky: 'Finally. Pure Deck A.', Unfiltered: 'Yes.' },
        drained: { Jolly: 'Hmm. It’s… a lot of the same.', Cheeky: 'I’ve heard this bit. I’m hearing it again.', Unfiltered: 'Bit heavy, this.' },
        better: { Jolly: 'Okay, okay. It’s better with both!', Cheeky: 'Fine. Both. It slaps.', Unfiltered: 'Better. Both.' }
      };
      const RU = {
        request: { Jolly: 'Skip the moody one! Only Deck B!', Cheeky: 'Kill Deck A! Happy songs only!', Unfiltered: 'Only B. Now.' },
        drained: { Jolly: 'Wait… where’d the beat go?', Cheeky: 'It’s pretty but I can’t dance to it.', Unfiltered: 'No beat. Weird.' },
        better: { Jolly: 'The beat’s back! Both! Both!', Cheeky: 'Okay, the moody bass slaps. I take it back.', Unfiltered: 'Both. Yes.' },
        cheer: { Jolly: 'Again! Again!', Cheeky: 'Best set this year!', Unfiltered: 'Yes!' }
      };

      /* ---------------- state ---------------- */
      const ST = { phase: 'intro', round: -1, hype: 0.06, hypeV: 0, burst: 0, bored: 0, aOn: false, lastT: now(), lastBeat: -1, beatK: 0, flash: 0, scr: 0, strokes: 0, onBeat: 0, drops: [], blends: [], finished: false, onlyT: 0, laser: 0, fin: 0, strobe: 0, encI: -1 };
      const XF = { x: 0, target: 0, drag: false, glide: null, lastTick: -1, sent: -1, hot: false };
      const FILL = { k: 0, dev: 0, t: 0, ch: 0 };
      const LINES = [];
      const DK = {
        a: { k: 'a', on: false, src: null, held: false, spin: 0, ang: 0, arm: 0, motorT: 0, motor: 0.55, rec: null, recK: 1, off: null, play: null, scr: null, hp: null, x: null },
        b: { k: 'b', on: false, src: null, held: false, spin: 0, ang: 1.3, arm: 0, motorT: 0, motor: 0, rec: null, recK: 0, off: null, play: null, scr: null, hp: null, x: null, style: null }
      };
      const SC = { on: false, k: null, buf: null, pos: 0, dir: 0, src: null, env: null, lastA: 0, lastT: 0, vel: 0, acc: 0, sdir: 0, strokeT: 0, moveT: 0, cue: false };
      const M = { w: 0, h: 0, phone: true, dpr: 1 };
      const R = {};
      const P = K.particles();
      const CROWD = [];

      /* ---------------- DOM ---------------- */
      const cvBg = K.canvas(el, { opaque: true, maxDpr: 1.5 });   // sky, city, billboard, roof, booth hardware: painted on resize/theme only
      const cv = K.canvas(el, { maxDpr: 1.5 });                    // what moves: beams, crowd, records, lights, confetti
      const glowEl = h('div', { class: 'bd-glow', 'aria-hidden': 'true' });
      const meter = h('div', { class: 'bd-meter', 'aria-hidden': 'true' }, ...Array.from({ length: 10 }, (x, i) => h('i', { style: { '--c': i < 4 ? '#ff5fb4' : i < 7 ? '#ffd23f' : '#45e8ff' } })));
      const segs = Array.from(meter.children);
      const pips = h('div', { class: 'bd-pips', role: 'img', 'aria-label': 'Both/and lines: 0 of ' + ROUNDS }, ...Array.from({ length: ROUNDS }, () => h('i')));
      const hud = h('div', { class: 'bd-hud' },
        h('div', { class: 'bd-venue' }, h('span', { class: 'bd-vn', text: venue.name }), h('small', { text: venue.sub + ' · ' + BPM + ' BPM' })),
        h('div', { class: 'bd-hype' }, h('b', { text: 'Hype' }), meter, pips));
      const board = h('div', { class: 'bd-board', role: 'status', 'aria-live': 'polite' });
      const crate = h('div', { class: 'bd-crate', hidden: true });
      const capA = h('div', { class: 'bd-cap bd-cap-a' }), capB = h('div', { class: 'bd-cap bd-cap-b' });
      const platA = h('div', { class: 'bd-plat', role: 'button', tabindex: '0', 'aria-label': 'Deck A record. Press and turn it to scratch.' });
      const platB = h('div', { class: 'bd-plat', role: 'button', tabindex: '0', 'aria-label': 'Deck B record. Press and turn it to scratch.' });
      const startBtn = h('button', { type: 'button', class: 'bd-start', 'aria-label': 'Start Deck A' }, h('i'), h('span', { text: 'Start' }));
      const dropBtn = h('button', { type: 'button', class: 'bd-drop idle', 'aria-label': 'Drop. Tap it on the one.' }, h('span', { text: 'Drop' }));
      const xfEl = h('div', { class: 'bd-xf', role: 'slider', tabindex: '0', 'aria-label': 'Crossfader. Left plays Deck A, right plays Deck B, the middle plays both.', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' });
      const xfZone = h('i', { class: 'bd-xf-zone' }, h('b', { class: 'bd-xf-fill' }));
      const xfKnob = h('div', { class: 'bd-xf-knob' });
      xfEl.append(h('span', { class: 'bd-xf-l', text: 'A' }), h('div', { class: 'bd-xf-track' }, xfZone), h('span', { class: 'bd-xf-r', text: 'B' }), xfKnob);
      const signEl = h('div', { class: 'bd-sign', hidden: true });
      const comboEl = h('div', { class: 'bd-combo', hidden: true });
      el.append(glowEl, board, hud, crate, capA, capB, platA, platB, startBtn, dropBtn, xfEl, signEl, comboEl);
      const phoneNow = K.phone();
      const sync = K.character('sync', { side: 'right', mood: 'cool', size: phoneNow ? 74 : 100, x: 8, y: 400 });
      const loopie = K.character('loopie', { side: 'left', mood: 'happy', size: phoneNow ? 68 : 90, x: 300, y: 300 }); loopie.show(false);
      const rush = (TRAP_B || visits >= 1) ? K.character('rush', { side: 'right', mood: 'speed', size: phoneNow ? 68 : 90, x: 8, y: 300 }) : null;
      if (rush) rush.show(false);
      capA.replaceChildren(h('b', { text: 'A' }), document.createTextNode('On repeat'));
      capB.replaceChildren(h('b', { text: 'B' }), document.createTextNode('Empty'));

      /* ---------------- the billboard across the street (lyrics live here) ---------------- */
      let boardKind = '', boardCol = A_COL;
      function boardSet(kind, kids, col, small) {
        boardKind = kind; boardCol = col || boardCol;
        const inner = h('div', { class: 'bd-bi bd-' + kind + (small ? ' bd-small' : '') }, ...kids);
        board.replaceChildren(inner);
        if (reduced()) inner.classList.add('in'); else S.later(() => inner.classList.add('in'), 30);
        return inner;
      }
      const sideKids = (s) => s.q ? [document.createTextNode(s.pre), h('span', { class: 'gk-user', text: '“' + s.q + '”' })] : [document.createTextNode(s.t)];
      const sideText = (s) => s.q ? s.pre + '“' + s.q + '”' : s.t;
      function boardVenue() { boardSet('venue', [h('span', { class: 'bd-k', text: 'Tonight on the roof' }), h('span', { class: 'bd-big', text: venue.name }), h('span', { class: 'bd-sub', text: 'DJ: you · Deck A + Deck B' })], A_COL); }
      function boardNowA() {
        const words = hot ? h('span', { class: 'bd-q gk-user', text: '“' + hot + '”' }) : h('span', { class: 'bd-q', text: hasText ? 'Part of me is struggling' : 'Part of me is struggling' });
        boardSet('nowa', [h('span', { class: 'bd-k', text: 'Now playing · Deck A' }), words, h('span', { class: 'bd-sub', text: hot ? 'on repeat' : 'a track like this, on repeat' })], A_COL);
      }
      function boardAnd(line) {
        const long = sideText(line.a).length + line.b.length > 58;
        boardSet('and', [h('span', { class: 'bd-la' }, ...sideKids(line.a)), h('span', { class: 'bd-and', text: 'AND' }), h('span', { class: 'bd-lb', text: line.b })], AND_COL, long);
      }
      function boardReq(which) { boardSet('req', [h('span', { class: 'bd-k', text: 'Request from the floor' }), h('span', { class: 'bd-big' + (which === 'b' ? ' b' : ''), text: 'Only Deck ' + which.toUpperCase() })], which === 'b' ? B_COL : A_COL); }
      function boardMsg(k, big, sub, col) { boardSet('msg', [h('span', { class: 'bd-k', text: k }), h('span', { class: 'bd-big' + (col === B_COL ? ' b' : ''), text: big }), sub ? h('span', { class: 'bd-sub', text: sub }) : null].filter(Boolean), col || AND_COL); }
      let encEls = [];
      function boardEncore() {
        encEls = LINES.map(l => h('p', null, ...sideKids(l.a), h('em', { text: 'and' }), document.createTextNode(l.b)));
        boardSet('enc', [h('span', { class: 'bd-k', text: 'Encore · sing it back' }), h('div', { class: 'bd-enc' }, ...encEls)], AND_COL, true);
      }

      /* ---------------- sound: two real decks ---------------- */
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const SR = 32000;
      const AU = { bufs: {}, rev: new Map(), pend: {}, T0: 0, dropLive: false, mix: null, crowd: null, fric: null, dropG: null, liveNext: 0, liveBus: null, riser: null, rollNext: 0, buildT: 0, dropAt: 0 };
      function mkBus(c, dest) {
        const out = c.createGain(); out.gain.value = 1; out.connect(dest);
        const ir = c.createBuffer(2, Math.floor(c.sampleRate * 0.9), c.sampleRate), dk = Math.pow(0.001, 1 / ir.length);
        for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); let e = 1; for (let i = 0; i < d.length; i++) { d[i] = (Math.random() * 2 - 1) * e; e *= dk; } }
        const conv = c.createConvolver(); conv.buffer = ir; const vo = c.createGain(); vo.gain.value = 0.28; conv.connect(vo); vo.connect(out);
        const verb = c.createGain(); verb.gain.value = 1; verb.connect(conv);
        const nb = c.createBuffer(1, Math.floor(c.sampleRate * 0.7), c.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        return { c, out, verb, noise: nb };
      }
      function envG(B, t, dur, peak, atk, rel) {
        const g = B.c.createGain(), p = Math.max(0.0002, peak), a = Math.max(0.001, atk), hold = Math.max(t + a + 0.001, t + dur - rel);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(p, t + a); g.gain.setValueAtTime(p, hold); g.gain.exponentialRampToValueAtTime(0.0001, Math.max(hold + 0.005, t + dur));
        return g;
      }
      function oscN(B, type, f, t, dur, det) { const o = B.c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (det) o.detune.setValueAtTime(det, t); o.start(t); o.stop(t + dur + 0.06); return o; }
      function noiseN(B, t, dur) { const s = B.c.createBufferSource(); s.buffer = B.noise; s.loop = true; s.start(t, Math.random() * 0.4); s.stop(t + dur + 0.06); return s; }
      function filtN(B, type, f, q) { const x = B.c.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q == null ? 0.7 : q; return x; }
      function sendV(B, node, amt) { if (!amt) return; const s = B.c.createGain(); s.gain.value = amt; node.connect(s); s.connect(B.verb); }
      const IN = {
        kick(B, t, v) { const o = oscN(B, 'sine', 155, t, 0.45); o.frequency.exponentialRampToValueAtTime(46, t + 0.12); const g = envG(B, t, 0.45, v, 0.002, 0.34); o.connect(g); g.connect(B.out);
          const n = noiseN(B, t, 0.025), hp = filtN(B, 'highpass', 2600), g2 = envG(B, t, 0.025, v * 0.2, 0.001, 0.02); n.connect(hp); hp.connect(g2); g2.connect(B.out); },
        hat(B, t, v, open) { const d = open ? 0.22 : 0.045, n = noiseN(B, t, d), hp = filtN(B, 'highpass', open ? 7200 : 8800), g = envG(B, t, d, v, 0.002, d * 0.85); n.connect(hp); hp.connect(g); g.connect(B.out); },
        clap(B, t, v) { const n = noiseN(B, t, 0.26), bp = filtN(B, 'bandpass', 1350, 0.9), g = B.c.createGain(); g.gain.setValueAtTime(0.0001, t);
          [0, 0.011, 0.023].forEach(o => { g.gain.setValueAtTime(v, t + o); g.gain.exponentialRampToValueAtTime(v * 0.25, t + o + 0.009); });
          g.gain.setValueAtTime(v * 0.75, t + 0.034); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); n.connect(bp); bp.connect(g); g.connect(B.out); sendV(B, g, 0.35); },
        snare(B, t, v) { const o = oscN(B, 'triangle', 200, t, 0.12); o.frequency.exponentialRampToValueAtTime(140, t + 0.08); const g = envG(B, t, 0.12, v * 0.7, 0.002, 0.1); o.connect(g); g.connect(B.out);
          const n = noiseN(B, t, 0.2), bp = filtN(B, 'bandpass', 2200, 0.7), g2 = envG(B, t, 0.2, v, 0.002, 0.18); n.connect(bp); bp.connect(g2); g2.connect(B.out); sendV(B, g2, 0.3); },
        shaker(B, t, v) { const n = noiseN(B, t, 0.07), hp = filtN(B, 'highpass', 6200), g = envG(B, t, 0.07, v, 0.014, 0.05); n.connect(hp); hp.connect(g); g.connect(B.out); },
        bass(B, t, f, dur, v) { const o = oscN(B, 'sawtooth', f, t, dur), lp = filtN(B, 'lowpass', 1100, 6); lp.frequency.setValueAtTime(1100, t); lp.frequency.exponentialRampToValueAtTime(170, t + Math.min(dur, 0.22)); const g = envG(B, t, dur, v, 0.004, 0.05); o.connect(lp); lp.connect(g); g.connect(B.out);
          const s = oscN(B, 'sine', f, t, dur), g2 = envG(B, t, dur, v * 0.9, 0.004, 0.05); s.connect(g2); g2.connect(B.out); },
        pad(B, t, fs, dur, v, lpf) { const lp = filtN(B, 'lowpass', lpf || 900), g = envG(B, t, dur, v, Math.min(0.45, dur * 0.25), Math.min(0.5, dur * 0.3)); lp.connect(g); g.connect(B.out); sendV(B, g, 0.6);
          fs.forEach((f, i) => [-8, 8].forEach(dt => oscN(B, 'sawtooth', f, t, dur, dt + i * 2).connect(lp))); },
        vox(B, t, f, dur, v, vw, o) {
          o = o || {};
          const src = oscN(B, 'sawtooth', f, t, dur); if (o.to) src.frequency.exponentialRampToValueAtTime(o.to, t + dur * 0.85);
          const lfo = oscN(B, 'sine', 5.3, t, dur), lg = B.c.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.014, t + Math.min(0.3, dur)); lfo.connect(lg); lg.connect(src.frequency);
          const g = envG(B, t, dur, v, o.atk || 0.05, o.rel || 0.12);
          (FORM[vw] || FORM.oo).forEach((F, i) => {
            const bp = filtN(B, 'bandpass', F[0], F[2]), ga = B.c.createGain(); ga.gain.value = F[1] * 3.2; src.connect(bp); bp.connect(ga); ga.connect(g);
            if (o.vw2) { const F2 = FORM[o.vw2][i], at = t + dur * (o.at || 0.5); bp.frequency.setValueAtTime(F[0], at); bp.frequency.linearRampToValueAtTime(F2[0], at + 0.07); ga.gain.setValueAtTime(F[1] * 3.2, at); ga.gain.linearRampToValueAtTime(F2[1] * 3.2, at + 0.07); }
          });
          g.connect(B.out); sendV(B, g, o.verb == null ? 0.5 : o.verb);
        },
        ep(B, t, f, dur, v) { const g0 = B.c.createGain(); g0.gain.value = 1; g0.connect(B.out); sendV(B, g0, 0.3);
          [[1, 1, 1], [2, 0.32, 0.45], [3.01, 0.1, 0.18], [4.02, 0.05, 0.08]].forEach(([m, a, dk]) => { const d = Math.max(0.12, dur * dk + 0.08), o = oscN(B, 'sine', f * m, t, d), g = envG(B, t, d, v * a, 0.004, d * 0.85); o.connect(g); g.connect(g0); }); },
        piano(B, t, f, dur, v) { const g0 = B.c.createGain(); g0.gain.value = 1; g0.connect(B.out); sendV(B, g0, 0.28);
          [[1, 1, 1.4], [2, 0.42, 0.9], [3, 0.2, 0.5], [4.01, 0.1, 0.3], [5.02, 0.05, 0.2]].forEach(([m, a, dk]) => { const d = Math.max(0.15, Math.min(1.6, dur + 0.3) * dk), o = oscN(B, m === 1 ? 'triangle' : 'sine', f * m, t, d), g = envG(B, t, d, v * a, 0.003, d * 0.9); o.connect(g); g.connect(g0); });
          const n = noiseN(B, t, 0.02), bp = filtN(B, 'bandpass', 3000, 1), gn = envG(B, t, 0.02, v * 0.12, 0.001, 0.015); n.connect(bp); bp.connect(gn); gn.connect(g0); },
        strings(B, t, f, dur, v) { const lp = filtN(B, 'lowpass', 2800, 0.8), g = envG(B, t, dur, v, 0.018, Math.min(0.2, dur * 0.6)); lp.connect(g); g.connect(B.out); sendV(B, g, 0.5); [-9, 0, 9].forEach(dt => oscN(B, 'sawtooth', f, t, dur, dt).connect(lp)); },
        organ(B, t, f, dur, v) { const g = envG(B, t, dur, v, 0.006, 0.05); g.connect(B.out); sendV(B, g, 0.25); [[0.5, 0.45], [1, 1], [2, 0.7], [3, 0.35], [4, 0.25]].forEach(([m, a]) => { const o = oscN(B, 'sine', f * m, t, dur), ga = B.c.createGain(); ga.gain.value = a * 0.6; o.connect(ga); ga.connect(g); }); },
        saw(B, t, f, dur, v) { const o = oscN(B, 'sawtooth', f, t, dur), o2 = oscN(B, 'sawtooth', f, t, dur, 12), lp = filtN(B, 'lowpass', 3200, 6); lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(520, t + Math.min(0.3, dur)); const g = envG(B, t, dur, v, 0.004, dur * 0.6); o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(B.out); sendV(B, g, 0.35); },
        marimba(B, t, f, dur, v) { const d = Math.min(0.6, dur + 0.25); [[1, 1, d], [3.93, 0.22, 0.09], [9.2, 0.06, 0.03]].forEach(([m, a, dd]) => { const o = oscN(B, 'sine', f * m, t, dd), g = envG(B, t, dd, v * a, 0.002, dd * 0.9); o.connect(g); g.connect(B.out); sendV(B, g, 0.25); }); },
        lofi(B, t, f, dur, v) { const o = oscN(B, 'triangle', f, t, dur), lp = filtN(B, 'lowpass', 1500), g = envG(B, t, dur, v, 0.03, dur * 0.5); o.connect(lp); lp.connect(g); g.connect(B.out); sendV(B, g, 0.4); },
        supersaw(B, t, f, dur, v) { const lp = filtN(B, 'lowpass', 5200, 0.8), g = envG(B, t, dur, v, 0.01, Math.min(0.25, dur * 0.5)); lp.connect(g); g.connect(B.out); sendV(B, g, 0.45); [-22, -11, 0, 11, 22].forEach(dt => oscN(B, 'sawtooth', f, t, dur, dt).connect(lp)); },
        crash(B, t, v) { const n = noiseN(B, t, 1.8), hp = filtN(B, 'highpass', 4800), g = envG(B, t, 1.8, v, 0.003, 1.7); n.connect(hp); hp.connect(g); g.connect(B.out); sendV(B, g, 0.3); },
        boom(B, t, v) { const o = oscN(B, 'sine', 70, t, 1.3); o.frequency.exponentialRampToValueAtTime(32, t + 1.1); const g = envG(B, t, 1.3, v, 0.004, 1.2); o.connect(g); g.connect(B.out); }
      };
      function partA(B, t, bar) {
        const [root, ch] = PROG[bar];
        for (let i = 0; i < 4; i++) IN.kick(B, t + i * BEAT, 0.95);
        for (let i = 0; i < 16; i++) { const off = i % 4 === 2; IN.hat(B, t + i * S16, off ? 0.13 : (i % 2 ? 0.035 : 0.05), off); }
        [2, 6, 10, 14].forEach(st => IN.bass(B, t + st * S16, nf(root), S16 * 1.7, 0.3));
        if (bar === 3) IN.bass(B, t + 15 * S16, nf(root) * 1.5, S16 * 0.9, 0.22);
        IN.pad(B, t, PAD_A[ch].map(nf), BAR, 0.055, 620);
        CALL[bar].forEach(([n, st, len]) => IN.vox(B, t + st * S16, nf(n), len * S16 * 0.96, 0.3, 'oo'));
      }
      function partB(B, t, bar, sty) {
        const ch = PROG[bar][1], notes = CH_B[ch].map(nf), inst = IN[sty.inst];
        const sw = (st) => (sty.swing && st % 2 ? S16 * 0.28 : 0);
        [4, 12].forEach(st => IN.clap(B, t + st * S16, 0.3));
        for (let i = 0; i < 16; i++) IN.shaker(B, t + i * S16 + sw(i), i % 2 ? 0.045 : 0.022);
        if (sty.arp) { const step = 16 / sty.arp; for (let i = 0; i < sty.arp; i++) { const n = notes[(i * (sty.arp === 8 ? 2 : 1)) % notes.length] * (sty.arp === 16 && i % 8 >= 4 ? 2 : 1); inst(B, t + i * step * S16, n, step * S16 * 0.9, sty.cv); } }
        if (sty.rhythm) sty.rhythm.forEach(([st, len]) => { const tt = t + st * S16 + sw(st); notes.forEach((f, j) => inst(B, tt + j * 0.003, f, len * S16, sty.cv)); });
        if (sty.choir) notes.slice(0, 3).forEach((f) => IN.vox(B, t, f, BAR * 0.98, 0.08, 'ah', { atk: 0.3, rel: 0.4, verb: 0.7 }));
        if (sty.crackle) for (let i = 0; i < 6; i++) { const tt = t + Math.random() * BAR, n = noiseN(B, tt, 0.012), hp = filtN(B, 'highpass', 2500), g = envG(B, tt, 0.012, 0.04 + Math.random() * 0.07, 0.001, 0.01); n.connect(hp); hp.connect(g); g.connect(B.out); }
        ANSWER[bar].forEach(([n, st, len]) => inst(B, t + st * S16 + sw(st), nf(n), len * S16 * 0.95, sty.mv));
      }
      function partDrop(B, t, bar) {
        if (bar === 0) { IN.crash(B, t, 0.2); IN.boom(B, t, 0.5); }
        for (let i = 0; i < 4; i++) IN.hat(B, t + (i * 4 + 2) * S16, 0.14, true);
        [4, 12].forEach(st => IN.snare(B, t + st * S16, 0.26));
        CALL[bar].concat(ANSWER[bar]).forEach(([n, st, len]) => IN.supersaw(B, t + st * S16, nf(n) * 2, len * S16 * 0.92, 0.06));
      }
      function partAnd(B, t) {
        IN.vox(B, t + 0.02, nf('E4'), 0.46, 0.85, 'ae', { vw2: 'n', at: 0.6, atk: 0.012, rel: 0.07, verb: 0.12, to: nf('D4') });
        const tt = t + 0.48, n = noiseN(B, tt, 0.03), bp = filtN(B, 'bandpass', 2400, 1.2), g = envG(B, tt, 0.03, 0.18, 0.001, 0.025); n.connect(bp); bp.connect(g); g.connect(B.out);
        const o = oscN(B, 'sine', 190, tt, 0.06); o.frequency.exponentialRampToValueAtTime(90, tt + 0.05); const g2 = envG(B, tt, 0.06, 0.3, 0.001, 0.05); o.connect(g2); g2.connect(B.out);
      }
      function fold(oc, b, len) {
        let out; try { out = oc.createBuffer(b.numberOfChannels, len, b.sampleRate); } catch (e) { out = new AudioBuffer({ numberOfChannels: b.numberOfChannels, length: len, sampleRate: b.sampleRate }); }
        let peak = 0;
        for (let ch = 0; ch < b.numberOfChannels; ch++) { const s = b.getChannelData(ch), d = out.getChannelData(ch); for (let i = 0; i < s.length; i++) d[i % len] += s[i]; for (let i = 0; i < len; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; } }
        if (peak > 0.95) { const k = 0.95 / peak; for (let ch = 0; ch < out.numberOfChannels; ch++) { const d = out.getChannelData(ch); for (let i = 0; i < len; i++) d[i] *= k; } }
        return out;
      }
      function renderWith(seconds, loopLen, build) {
        if (!OAC) return Promise.resolve(null);
        let oc; try { oc = new OAC(2, Math.ceil(seconds * SR), SR); } catch (e) { return Promise.resolve(null); }
        try { build(mkBus(oc, oc.destination)); } catch (e) { console.error(e); return Promise.resolve(null); }
        return new Promise((res) => {
          let done = false;
          const fin = (b) => { if (done) return; done = true; try { res(b ? (loopLen ? fold(oc, b, Math.round(loopLen * SR)) : b) : null); } catch (e) { res(null); } };
          oc.oncomplete = (e) => fin(e.renderedBuffer);
          try { const p = oc.startRendering(); if (p && p.then) p.then(fin, () => fin(null)); } catch (e) { fin(null); }
        });
      }
      const renderA = () => AU.pend.a || (AU.pend.a = renderWith(LOOP + 1.6, LOOP, (B) => { for (let b = 0; b < 4; b++) partA(B, b * BAR, b); }).then(buf => { AU.bufs.a = buf; return buf; }));
      const renderStyle = (sty) => { const k = 'b:' + sty.key; return AU.pend[k] || (AU.pend[k] = renderWith(LOOP + 1.8, LOOP, (B) => { for (let b = 0; b < 4; b++) partB(B, b * BAR, b, sty); }).then(buf => { AU.bufs[k] = buf; return buf; })); };
      const renderDrop = () => AU.pend.drop || (AU.pend.drop = renderWith(LOOP + 2, LOOP, (B) => { for (let b = 0; b < 4; b++) partDrop(B, b * BAR, b); }).then(buf => { AU.bufs.drop = buf; return buf; }));
      const renderAnd = () => AU.pend.and || (AU.pend.and = renderWith(1.1, 0, (B) => partAnd(B, 0)).then(buf => { AU.bufs.and = buf; return buf; }));
      renderA().then(() => renderAnd()).then(() => renderStyle(CW[0].style));

      /* the mixer: deck -> play gain -> sweep filter -> crossfader gain -> mix -> music bus */
      function buildMixer() {
        if (AU.mix) return true;
        if (!A.ctx || !A.bus || !A.bus('music')) return false;
        const c = A.ctx;
        AU.mix = c.createGain(); AU.mix.gain.value = 0.9; AU.mix.connect(A.bus('music'));
        ['a', 'b'].forEach(k => {
          const d = DK[k];
          d.play = c.createGain(); d.play.gain.value = 0.0001;
          d.scr = c.createGain(); d.scr.gain.value = 1;
          d.hp = c.createBiquadFilter(); d.hp.type = 'highpass'; d.hp.frequency.value = 20; d.hp.Q.value = 0.7;
          d.x = c.createGain(); d.x.gain.value = k === 'a' ? 1 : 0.0001;
          d.play.connect(d.hp); d.scr.connect(d.hp); d.hp.connect(d.x); d.x.connect(AU.mix);
        });
        AU.dropG = c.createGain(); AU.dropG.gain.value = 0.0001; AU.dropG.connect(AU.mix);
        AU.crowd = A.loop({ pink: true, filter: 'bandpass', freq: 850, q: 0.5, bus: 'amb' });
        AU.fric = A.loop({ filter: 'bandpass', freq: 2200, q: 0.8, bus: 'sfx' });
        XF.sent = -1;
        return true;
      }
      buildMixer(); S.on('audio-ready', buildMixer);
      function stopAll() {
        [DK.a.src, DK.b.src, SC.src, AU.dropSrc, AU.riser].forEach(s => { if (s) { try { s.stop(); } catch (e) { /* stopped */ } } });
        if (AU.crowd) AU.crowd.stop(); if (AU.fric) AU.fric.stop();
        if (AU.mix) { try { AU.mix.disconnect(); } catch (e) { /* gone */ } }
      }
      S.onDestroy(stopAll);
      const aNow = () => (A.ctx ? A.ctx.currentTime : now() / 1000);
      const heardNow = () => aNow() - (A.ctx ? A.latency() : 0);
      const posAt = (t) => (((t - AU.T0) % LOOP) + LOOP) % LOOP;
      function playSrc(k, buf, when, offset, motor) {
        const d = DK[k], c = A.ctx; if (!c || !buf || !d.play) return null;
        const s = c.createBufferSource(); s.buffer = buf; s.loop = true;
        if (motor) { s.playbackRate.setValueAtTime(0.1, when); s.playbackRate.linearRampToValueAtTime(1, when + motor); }
        s.connect(d.play); s.start(when, Math.min(buf.duration - 0.001, ((offset % buf.duration) + buf.duration) % buf.duration));
        return s;
      }
      /* live fallback (no offline rendering): the same parts, scheduled a bar ahead */
      function liveTick() {
        if (!A.ctx || !AU.mix || !AU.T0) return;
        const la = DK.a.on && DK.a.live, lb = DK.b.on && DK.b.live && DK.b.style, ld = AU.dropLive;
        if (!la && !lb && !ld) { AU.liveNext = 0; return; }
        const c = A.ctx;
        if (!AU.liveBus) AU.liveBus = { a: mkBus(c, DK.a.play), b: mkBus(c, DK.b.play), d: mkBus(c, AU.dropG) };
        if (!AU.liveNext) AU.liveNext = AU.T0 + Math.ceil((c.currentTime + 0.05 - AU.T0) / BAR) * BAR;
        while (AU.liveNext < c.currentTime + 0.3) {
          const t = AU.liveNext, bar = ((Math.round((t - AU.T0) / BAR) % 4) + 4) % 4;
          if (la) partA(AU.liveBus.a, t, bar);
          if (lb) partB(AU.liveBus.b, t, bar, DK.b.style);
          if (ld) partDrop(AU.liveBus.d, t, bar);
          AU.liveNext += BAR;
        }
      }
      function revBuf(b) {
        if (AU.rev.has(b)) return AU.rev.get(b);
        let r = null;
        try { r = A.ctx.createBuffer(b.numberOfChannels, b.length, b.sampleRate); for (let ch = 0; ch < b.numberOfChannels; ch++) { const s = b.getChannelData(ch), d = r.getChannelData(ch), n = s.length; for (let i = 0; i < n; i++) d[i] = s[n - 1 - i]; } } catch (e) { r = null; }
        AU.rev.set(b, r); return r;
      }
      /* small sounds */
      function sCheer(v) {
        if (!A.ctx) return; const t = A.now();
        for (let i = 0; i < 5; i++) A.noise({ when: t + i * 0.05, filter: 'bandpass', freq: 600 + Math.random() * 1200, to: 900 + Math.random() * 1500, q: 0.9, dur: 0.9 + Math.random() * 0.8, attack: 0.18, vol: 0.05 * v, bus: 'amb', pan: Math.random() * 1.6 - 0.8 });
        for (let i = 0; i < 3; i++) A.tone({ when: t + 0.1 + Math.random() * 0.5, type: 'sine', freq: 2000 + Math.random() * 500, to: 2800 + Math.random() * 500, glide: 0.22, dur: 0.36, vol: 0.022 * v, bus: 'amb', pan: Math.random() * 1.4 - 0.7 });
      }
      function sAnd(vol) { if (!A.ctx || !AU.bufs.and || !AU.mix) return; const s = A.ctx.createBufferSource(), g = A.ctx.createGain(); s.buffer = AU.bufs.and; g.gain.value = vol || 0.8; s.connect(g); g.connect(AU.mix); s.start(); }
      function sNeedle() { if (!A.ctx) return; A.noise({ filter: 'lowpass', freq: 700, dur: 0.09, vol: 0.18 }); for (let i = 0; i < 5; i++) A.click({ when: A.now() + 0.03 + Math.random() * 0.35, vol: 0.02 + Math.random() * 0.03 }); }
      function sWhip(up) { if (!A.ctx) return; A.noise({ filter: 'bandpass', freq: up ? 600 : 2800, to: up ? 3200 : 500, q: 1.4, dur: 0.32, attack: 0.18, vol: 0.12 }); }

      /* ---------------- layout ---------------- */
      function deckRect(x, y, w, hh) { const r = Math.round(Math.min(w * 0.4, hh * 0.44)); const cx = x + Math.round(w * 0.43), cy = y + Math.round(hh * 0.5); return { x, y, w, h: hh, cx, cy, r, ax: x + w - 15, ay: y + 17 }; }
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        M.w = W; M.h = H; M.phone = W < 700; M.dpr = cv.dpr || 1;
        const ph = M.phone;
        if (ph) {
          const dw = Math.floor((W - 34) / 2), dh = clamp(Math.round(dw * 0.94), 132, 172), mixH = 76;
          R.mixTop = H - 14 - mixH;
          const deckY = R.mixTop - 10 - dh;
          R.booth = { top: deckY - 24 };
          R.dA = deckRect(12, deckY, dw, dh); R.dB = deckRect(W - 12 - dw, deckY, dw, dh);
          const dr = 31; R.drop = { cx: W - 18 - dr, cy: R.mixTop + mixH / 2, r: dr }; R.mix = null;
          R.xf = { x: 10, y: R.mixTop + mixH / 2 - 27, w: Math.round(R.drop.cx - dr - 20 - 10), h: 54 };
          R.board = { x: 14, y: 117, w: W - 28, h: Math.max(124, Math.min(148, R.booth.top - 117 - 250)) };
        } else {
          const dh = clamp(Math.round(H * 0.3), 200, 262), dw = Math.round(dh * 1.18), mixW = clamp(Math.round(W * 0.23), 250, 320), gap = 26;
          const total = dw * 2 + mixW + gap * 2, x0 = Math.round((W - total) / 2), deckY = H - 22 - dh;
          R.booth = { top: deckY - 26 };
          R.dA = deckRect(x0, deckY, dw, dh); R.dB = deckRect(x0 + dw + gap * 2 + mixW, deckY, dw, dh);
          R.mix = { x: x0 + dw + gap, y: deckY, w: mixW, h: dh };
          R.drop = { cx: Math.round(R.mix.x + mixW / 2), cy: Math.round(deckY + dh * 0.4), r: 46 };
          R.xf = { x: R.mix.x + 10, y: deckY + dh - 70, w: mixW - 20, h: 54 };
          R.mixTop = deckY;
          const bw = Math.min(760, W - 140); R.board = { x: Math.round((W - bw) / 2), y: 92, w: bw, h: 178 };
        }
        R.crowd = { top: R.board.y + R.board.h + 14, bottom: R.booth.top };
        R.horizon = R.crowd.top + (ph ? 54 : 66);
        // DOM
        Object.assign(board.style, { left: R.board.x + 'px', top: R.board.y + 'px', width: R.board.w + 'px', height: R.board.h + 'px' });
        Object.assign(glowEl.style, { left: R.board.x + 'px', top: R.board.y + 'px', width: R.board.w + 'px', height: R.board.h + 'px' });
        [[platA, R.dA], [platB, R.dB]].forEach(([e, d]) => { const s = d.r + 6; Object.assign(e.style, { left: (d.cx - s) + 'px', top: (d.cy - s) + 'px', width: s * 2 + 'px', height: s * 2 + 'px' }); });
        const sb = Math.round(R.dA.r * 0.82); Object.assign(startBtn.style, { left: (R.dA.cx - sb / 2) + 'px', top: (R.dA.cy - sb / 2) + 'px', width: sb + 'px', height: sb + 'px' });
        Object.assign(dropBtn.style, { left: (R.drop.cx - R.drop.r) + 'px', top: (R.drop.cy - R.drop.r) + 'px', width: R.drop.r * 2 + 'px', height: R.drop.r * 2 + 'px' });
        Object.assign(xfEl.style, { left: R.xf.x + 'px', top: R.xf.y + 'px', width: R.xf.w + 'px', height: R.xf.h + 'px' });
        const tw = R.xf.w - 72, zl = (0.5 - ZONE) * tw, zw = ZONE * 2 * tw; Object.assign(xfZone.style, { left: zl + 'px', width: zw + 'px' });
        [[capA, R.dA], [capB, R.dB]].forEach(([e, d]) => Object.assign(e.style, { left: (d.x + 4) + 'px', top: (R.booth.top + 9) + 'px', maxWidth: (d.w - 8) + 'px' }));
        Object.assign(comboEl.style, { left: R.dB.cx + 'px', top: (R.dB.y + 6) + 'px' });
        placeChars(); placeCrate(); buildCrowd(); setKnob();
        spr.key = ''; bg.key = '';
      }
      function placeChars() {
        const ph = M.phone, W = M.w;
        const sz = ph ? 74 : 100, csz = ph ? 68 : 90;
        if (ph) sync.place(8, R.booth.top - sz - 6);
        else sync.place(Math.max(12, R.dA.x - 56), R.booth.top - sz - 10);
        R.loopie = ph ? { x: W - csz - 8, y: R.crowd.top + 46 } : { x: Math.round(W * 0.7), y: R.crowd.top + 44 };
        R.rush = ph ? { x: 10, y: R.crowd.top + 46 } : { x: Math.round(W * 0.2), y: R.crowd.top + 48 };
        loopie.place(R.loopie.x, R.loopie.y); if (rush) rush.place(R.rush.x, R.rush.y);
        R.csz = csz; placeSign();
      }
      let signFor = null;
      let signW = 150;
      function placeSign() { if (!signFor) return; const p = signFor === 'loopie' ? R.loopie : R.rush, half = signW / 2 + 12; Object.assign(signEl.style, { left: clamp(p.x + R.csz / 2, half, M.w - half) + 'px', top: (p.y - (M.phone ? 40 : 46)) + 'px' }); }
      function showSign(who, which) { signFor = who; signEl.className = 'bd-sign' + (which === 'b' ? ' b' : ''); signEl.replaceChildren(document.createTextNode('Only Deck '), h('b', { text: which.toUpperCase() }), document.createTextNode('!')); signEl.hidden = false; signW = signEl.offsetWidth || 150; placeSign(); }
      /* ---------------- sprites ---------------- */
      const spr = { key: '' }, bg = { key: '', c: null };
      const pal = () => {
        const bright = S.scene() === 'bright';
        return { bright, sky: bright ? venue.dusk : venue.night, far: venue.far[bright ? 1 : 0], near: venue.near[bright ? 1 : 0], body: bright ? '#2a1640' : '#07040f', floor: bright ? ['#5a3a72', '#2a1840'] : ['#140c26', '#06040c'] };
      };
      function personPath(g, pose, v) {
        g.beginPath();
        g.moveTo(11, -17); g.arc(0, -17, 11, 0, TAU);
        if (v === 1) { g.moveTo(10, -31); g.arc(4, -31, 6, 0, TAU); }
        g.moveTo(-21, 10); g.quadraticCurveTo(-21, -1, -10, -3); g.lineTo(10, -3); g.quadraticCurveTo(21, -1, 21, 10); g.lineTo(23, 92); g.lineTo(-23, 92); g.closePath();
        g.rect(-5, -9, 10, 8);
        g.fill();
        const up1 = pose === 1 || pose === 3, up2 = pose === 2 || pose === 3;
        g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 9; g.beginPath();
        if (up1) { g.moveTo(-16, 4); g.lineTo(-28, -24); g.lineTo(-23, -52); } else { g.moveTo(-17, 6); g.lineTo(-25, 36); g.lineTo(-22, 60); }
        if (up2) { g.moveTo(16, 4); g.lineTo(28, -24); g.lineTo(23, -52); } else { g.moveTo(17, 6); g.lineTo(25, 36); g.lineTo(22, 60); }
        g.stroke();
        if (up1) { g.beginPath(); g.arc(-23, -55, 5.5, 0, TAU); g.fill(); }
        if (up2) { g.beginPath(); g.arc(23, -55, 5.5, 0, TAU); g.fill(); }
      }
      function paintPerson(pose, v, col, rim) {
        const SS = M.ss, c = mk(80 * SS, 160 * SS), g = c.getContext('2d');
        g.setTransform(SS, 0, 0, SS, 40 * SS, 70 * SS); g.fillStyle = col; g.strokeStyle = col; personPath(g, pose, v);
        if (rim) { g.globalCompositeOperation = 'destination-out'; g.translate(1.8, 3.2); g.fillStyle = '#000'; g.strokeStyle = '#000'; personPath(g, pose, v); }
        return c;
      }
      function buildSprites() {
        const key = M.w + 'x' + M.h + ':' + M.dpr + ':' + S.scene(); if (spr.key === key) return; spr.key = key;
        const Pp = pal(), dpr = M.dpr;
        M.base = M.phone ? 0.62 : 0.8; M.ss = M.base * 1.15 * dpr;
        spr.body = []; spr.rim = { a: [], b: [], m: [] };
        for (let pose = 0; pose < 4; pose++) for (let v = 0; v < 2; v++) {
          const i = pose * 2 + v;
          spr.body[i] = paintPerson(pose, v, Pp.body, false);
          spr.rim.a[i] = paintPerson(pose, v, '#ff6cc0', true); spr.rim.b[i] = paintPerson(pose, v, '#5aeeff', true); spr.rim.m[i] = paintPerson(pose, v, '#ffe08a', true);
        }
        spr.soft = sprite(128, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]);
        spr.gA = sprite(128, [[0, rgba(A_COL, 0.9)], [0.45, rgba(A_COL, 0.35)], [1, rgba(A_COL, 0)]]);
        spr.gB = sprite(128, [[0, rgba(B_COL, 0.9)], [0.45, rgba(B_COL, 0.35)], [1, rgba(B_COL, 0)]]);
        spr.gG = sprite(128, [[0, rgba(AND_COL, 0.95)], [0.45, rgba(AND_COL, 0.38)], [1, rgba(AND_COL, 0)]]);
        spr.bulb = sprite(64, [[0, 'rgba(255,236,180,1)'], [0.3, 'rgba(255,200,110,0.45)'], [1, 'rgba(255,180,90,0)']]);
        spr.beam = { a: beamSprite(A_COL), b: beamSprite(B_COL), g: beamSprite(AND_COL), w: beamSprite('#ffffff') };
        spr.mat = { a: paintMat('a'), b: paintMat('b') };
        spr.rec = { a: paintRec('a'), b: DK.b.style ? paintRec('b') : null };
        spr.sheen = paintSheen();
        STRIP.list = []; STRIP.key = '';
      }
      function beamSprite(col) {
        const w = 96, hh = 512, c = mk(w, hh), g = c.getContext('2d');
        const lg = g.createLinearGradient(0, hh, 0, 0); lg.addColorStop(0, rgba(col, 0.95)); lg.addColorStop(0.35, rgba(col, 0.35)); lg.addColorStop(1, rgba(col, 0));
        g.fillStyle = lg; g.beginPath(); g.moveTo(w / 2 - 2, hh); g.lineTo(w / 2 + 2, hh); g.lineTo(w, 0); g.lineTo(0, 0); g.closePath(); g.fill();
        g.globalCompositeOperation = 'destination-in';
        const hg = g.createLinearGradient(0, 0, w, 0); hg.addColorStop(0, 'rgba(0,0,0,0)'); hg.addColorStop(0.5, 'rgba(0,0,0,1)'); hg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = hg; g.fillRect(0, 0, w, hh);
        return c;
      }
      /* the platter rim (with strobe dots) and the slipmat: rotates with the motor */
      function paintMat(k) {
        const d = k === 'a' ? R.dA : R.dB, r = d.r, s = (r + 6) * 2, dpr = M.dpr, c = mk(s * dpr, s * dpr), g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, s / 2 * dpr, s / 2 * dpr);
        const rim = g.createLinearGradient(-r, -r, r, r); rim.addColorStop(0, '#d9d6e2'); rim.addColorStop(0.5, '#6d6a7c'); rim.addColorStop(1, '#b7b3c4');
        g.fillStyle = rim; g.beginPath(); g.arc(0, 0, r + 4, 0, TAU); g.fill();
        g.fillStyle = '#2a2833'; g.beginPath(); g.arc(0, 0, r + 1, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.75)'; for (let i = 0; i < 60; i++) { const a = i / 60 * TAU; g.beginPath(); g.arc(Math.cos(a) * (r + 2.4), Math.sin(a) * (r + 2.4), 0.9, 0, TAU); g.fill(); }
        const mat = g.createRadialGradient(0, 0, r * 0.2, 0, 0, r); mat.addColorStop(0, '#24202e'); mat.addColorStop(1, '#141219'); g.fillStyle = mat; g.beginPath(); g.arc(0, 0, r - 1, 0, TAU); g.fill();
        g.strokeStyle = rgba(k === 'a' ? A_COL : B_COL, 0.5); g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r * 0.82, -0.5, 1.4); g.stroke(); g.beginPath(); g.arc(0, 0, r * 0.82, 2.6, 4.4); g.stroke();
        g.fillStyle = rgba(k === 'a' ? A_COL : B_COL, 0.55); g.font = '700 ' + Math.max(12, Math.round(r * 0.2)) + 'px "Chakra Petch", "DejaVu Sans Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BOTH/AND', 0, r * 0.6);
        g.fillStyle = '#bdbac8'; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill();
        return { c, s };
      }
      /* the vinyl: grooves and a label (deck A pink; deck B in the record's style colours) */
      function paintRec(k) {
        const d = k === 'a' ? R.dA : R.dB, r = d.r - 3, s = (r + 4) * 2, dpr = M.dpr, c = mk(s * dpr, s * dpr), g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, s / 2 * dpr, s / 2 * dpr);
        g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.arc(1.5, 2.5, r, 0, TAU); g.fill();
        g.fillStyle = '#0c0b10'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
        for (let rad = r * 0.38; rad < r - 1.5; rad += 1.6) { g.strokeStyle = (Math.round(rad * 3) % 5 === 0) ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.035)'; g.lineWidth = 0.8; g.beginPath(); g.arc(0, 0, rad, 0, TAU); g.stroke(); }
        g.strokeStyle = 'rgba(0,0,0,0.9)'; g.lineWidth = 1.6; [0.55, 0.7, 0.85].forEach(f => { g.beginPath(); g.arc(0, 0, r * f, 0, TAU); g.stroke(); });
        const st = k === 'b' ? DK.b.style : null, c1 = st ? st.c1 : '#ff3fa4', c2 = st ? st.c2 : '#ff9ad0', lr = r * 0.34;
        const lg = g.createLinearGradient(-lr, -lr, lr, lr); lg.addColorStop(0, c1); lg.addColorStop(1, c2); g.fillStyle = lg; g.beginPath(); g.arc(0, 0, lr, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, lr * 0.8, 0, TAU); g.stroke();
        g.fillStyle = 'rgba(20,8,30,0.85)'; g.font = '800 ' + Math.max(12, Math.round(lr * 0.9)) + 'px "Big Shoulders Display", "Inter", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(k.toUpperCase(), 0, -lr * 0.32);
        g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(-lr * 0.55, lr * 0.25, lr * 1.1, Math.max(2, lr * 0.07)); g.fillRect(-lr * 0.4, lr * 0.45, lr * 0.8, Math.max(2, lr * 0.07));
        g.fillStyle = '#e6e3ee'; g.beginPath(); g.arc(0, 0, 3.2, 0, TAU); g.fill();
        return { c, s };
      }
      function paintSheen() {
        const s = 256, c = mk(s, s), g = c.getContext('2d'), r = s / 2;
        g.translate(r, r); g.globalCompositeOperation = 'lighter';
        [[-2.4, -1.6, 0.16], [0.75, 1.5, 0.1]].forEach(([a0, a1, al]) => {
          const gr = g.createRadialGradient(0, 0, r * 0.35, 0, 0, r * 0.97); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.6, 'rgba(255,255,255,' + al + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r * 0.97, a0, a1); g.closePath(); g.fill();
        });
        return c;
      }
      function paintBooth(g) {
        const W = M.w, H = M.h, top = R.booth.top;
        const Pp = pal();
        // the table: matte black with a lit lip
        const tg = g.createLinearGradient(0, top, 0, H); tg.addColorStop(0, Pp.bright ? '#2a2236' : '#1a1524'); tg.addColorStop(1, Pp.bright ? '#14101c' : '#08070c');
        g.fillStyle = tg; g.fillRect(0, top, W, H - top);
        g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, top - 8, W, 8);
        g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(0, top + 7, W, 1);
        g.strokeStyle = 'rgba(255,255,255,0.025)'; g.lineWidth = 1; for (let x = 8; x < W; x += 14) { g.beginPath(); g.moveTo(x, top + 8); g.lineTo(x - 30, H); g.stroke(); }
        // the decks
        [R.dA, R.dB].forEach((d, i) => {
          g.fillStyle = 'rgba(0,0,0,0.55)'; rr(g, d.x + 3, d.y + 6, d.w, d.h, 14); g.fill();
          const pg = g.createLinearGradient(d.x, d.y, d.x + d.w, d.y + d.h); pg.addColorStop(0, '#3b3846'); pg.addColorStop(0.5, '#25232e'); pg.addColorStop(1, '#1b1a22');
          g.fillStyle = pg; rr(g, d.x, d.y, d.w, d.h, 14); g.fill();
          g.save(); rr(g, d.x, d.y, d.w, d.h, 14); g.clip();
          g.strokeStyle = 'rgba(255,255,255,0.03)'; for (let x = d.x - d.h; x < d.x + d.w; x += 3) { g.beginPath(); g.moveTo(x, d.y); g.lineTo(x + d.h * 0.2, d.y + d.h); g.stroke(); }
          g.restore();
          g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 1.2; rr(g, d.x + 0.6, d.y + 0.6, d.w - 1.2, d.h - 1.2, 14); g.stroke();
          g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(d.cx + 1.5, d.cy + 3, d.r + 7, 0, TAU); g.fill();
          g.fillStyle = '#121017'; g.beginPath(); g.arc(d.cx, d.cy, d.r + 6, 0, TAU); g.fill();
          // tonearm base and rest
          g.fillStyle = '#4a4756'; g.beginPath(); g.arc(d.ax, d.ay, 10, 0, TAU); g.fill(); g.fillStyle = '#2a2833'; g.beginPath(); g.arc(d.ax, d.ay, 6, 0, TAU); g.fill();
          g.fillStyle = '#3a3746'; rr(g, d.ax - 3, d.ay + 50, 7, 12, 3); g.fill();
          // pitch slider slot (decor)
          const sx = d.x + d.w - 12, sy0 = d.y + d.h * 0.52, sy1 = d.y + d.h - 14;
          if (sy1 - sy0 > 24) { g.fillStyle = '#0b0a0f'; rr(g, sx - 2.5, sy0, 5, sy1 - sy0, 2.5); g.fill(); g.fillStyle = '#9d99ad'; rr(g, sx - 6, (sy0 + sy1) / 2 - 4, 12, 8, 2); g.fill(); }
          // screws
          g.fillStyle = '#5c5968'; [[d.x + 8, d.y + 8], [d.x + 8, d.y + d.h - 8], [d.x + d.w - 8, d.y + d.h - 8]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill(); });
          void i;
        });
        // the mixer: a panel between the decks (desktop) or a strip along the bottom (phone)
        if (R.mix) {
          const m = R.mix;
          g.fillStyle = 'rgba(0,0,0,0.55)'; rr(g, m.x + 3, m.y + 6, m.w, m.h, 14); g.fill();
          const mg = g.createLinearGradient(0, m.y, 0, m.y + m.h); mg.addColorStop(0, '#2a2733'); mg.addColorStop(1, '#17151d'); g.fillStyle = mg; rr(g, m.x, m.y, m.w, m.h, 14); g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 1.2; rr(g, m.x + 0.6, m.y + 0.6, m.w - 1.2, m.h - 1.2, 14); g.stroke();
          [m.x + 26, m.x + m.w - 26].forEach((kx, j) => { for (let q = 0; q < 3; q++) { const ky = m.y + 26 + q * 34; g.fillStyle = '#0d0c12'; g.beginPath(); g.arc(kx, ky, 12, 0, TAU); g.fill(); g.fillStyle = '#4b4858'; g.beginPath(); g.arc(kx, ky, 9.5, 0, TAU); g.fill(); g.strokeStyle = j ? B_COL : A_COL; g.lineWidth = 2; g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + Math.cos(-2 + q * 0.7) * 8, ky + Math.sin(-2 + q * 0.7) * 8); g.stroke(); } });
          g.fillStyle = '#0b0a0f'; rr(g, R.xf.x + 20, R.xf.y + R.xf.h / 2 - 2, R.xf.w - 40, 12, 6); g.fill();
        } else {
          const y0 = R.mixTop - 2, y1 = H - 8;
          g.fillStyle = 'rgba(0,0,0,0.5)'; rr(g, 9, y0 + 4, W - 16, y1 - y0, 14); g.fill();
          const mg = g.createLinearGradient(0, y0, 0, y1); mg.addColorStop(0, '#2a2733'); mg.addColorStop(1, '#17151d'); g.fillStyle = mg; rr(g, 6, y0, W - 12, y1 - y0, 14); g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 1.2; rr(g, 6.6, y0 + 0.6, W - 13.2, y1 - y0 - 1.2, 14); g.stroke();
        }
      }
      /* the world behind the booth: sky, skyline, the billboard, string lights, the roof */
      function paintBg(g) {
        const W = M.w, H = M.h, Pp = pal();
        const hz = R.horizon, Rg = K.rng(91 + venue.key.length * 7);
        const sky = g.createLinearGradient(0, 0, 0, hz); Pp.sky.forEach((col, i) => sky.addColorStop(i / (Pp.sky.length - 1), col)); g.fillStyle = sky; g.fillRect(0, 0, W, H);
        if (!Pp.bright) { for (let i = 0; i < (M.phone ? 70 : 150); i++) { const sx = Rg() * W, sy = Rg() * hz * 0.75, a = 0.25 + Rg() * 0.6; g.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')'; g.fillRect(sx, sy, Rg() < 0.15 ? 2 : 1.2, Rg() < 0.15 ? 2 : 1.2); }
          const mx = M.phone ? -999 : W * 0.86, my = Math.max(120, hz * 0.3), mg = g.createRadialGradient(mx, my, 4, mx, my, 70); mg.addColorStop(0, 'rgba(255,240,220,0.45)'); mg.addColorStop(1, 'rgba(255,240,220,0)'); g.fillStyle = mg; g.fillRect(mx - 70, my - 70, 140, 140);
          g.fillStyle = '#fff1dc'; g.beginPath(); g.arc(mx, my, 15, 0, TAU); g.fill(); g.fillStyle = Pp.sky[1]; g.beginPath(); g.arc(mx + 6, my - 4, 13, 0, TAU); g.fill();
        } else {
          const sx = W * 0.5, sy = hz - 20, sg = g.createRadialGradient(sx, sy, 10, sx, sy, Math.max(W, H) * 0.5); sg.addColorStop(0, 'rgba(255,236,190,0.95)'); sg.addColorStop(0.15, 'rgba(255,200,140,0.5)'); sg.addColorStop(1, 'rgba(255,170,120,0)'); g.fillStyle = sg; g.fillRect(0, 0, W, hz + 40);
          g.fillStyle = '#fff2d2'; g.beginPath(); g.arc(sx, sy, M.phone ? 34 : 52, 0, TAU); g.fill();
        }
        // far skyline
        const farTop = hz - (M.phone ? 150 : 210);
        g.fillStyle = Pp.far; let x = -10; while (x < W + 10) { const bw = 18 + Rg() * 46, bh = (0.3 + Rg() * 0.7) * (hz - farTop); g.fillRect(x, hz - bh, bw, bh + 2); if (Rg() < 0.2) g.fillRect(x + bw / 2 - 1, hz - bh - 14, 2, 14); x += bw + Rg() * 6; }
        // near skyline with windows
        const near = [];
        x = -20; while (x < W + 20) { const bw = 30 + Rg() * 70, bh = (0.2 + Rg() * 0.55) * (hz - farTop); near.push([x, bw, bh]); x += bw + 4 + Rg() * 16; }
        near.forEach(([bx, bw, bh]) => {
          g.fillStyle = Pp.near; g.fillRect(bx, hz - bh, bw, bh + 4);
          for (let wy = hz - bh + 8; wy < hz - 6; wy += 9) for (let wx = bx + 5; wx < bx + bw - 6; wx += 8) { if (Rg() < 0.36) { g.fillStyle = rgba(venue.win, 0.35 + Rg() * 0.5); g.fillRect(wx, wy, 3.5, 4.5); } }
        });
        // venue extras
        if (venue.city === 'bridge') {
          const by = hz - 26; g.strokeStyle = Pp.bright ? '#4a3a7a' : '#2a2a60'; g.lineWidth = 3; g.beginPath(); g.moveTo(-10, by); g.lineTo(W + 10, by); g.stroke();
          [W * 0.28, W * 0.72].forEach(tx => { g.fillStyle = Pp.near; g.fillRect(tx - 4, by - 70, 8, 74); });
          g.lineWidth = 1.4; g.beginPath(); g.moveTo(-10, by - 50); g.quadraticCurveTo(W * 0.28, by - 72, W * 0.28, by - 70); g.quadraticCurveTo(W * 0.5, by - 10, W * 0.72, by - 70); g.quadraticCurveTo(W * 0.72, by - 72, W + 10, by - 50); g.stroke();
          g.fillStyle = 'rgba(255,220,150,0.8)'; for (let lx = 6; lx < W; lx += 16) { g.beginPath(); g.arc(lx, by - 1, 1.4, 0, TAU); g.fill(); }
        } else if (venue.city === 'palms') {
          [[W * 0.06, 1], [W * 0.95, -1], [W * 0.82, -1]].forEach(([px, dir], i) => {
            const pb = hz + 10, ph2 = (M.phone ? 110 : 160) * (i === 2 ? 0.7 : 1), top = pb - ph2;
            g.strokeStyle = Pp.bright ? '#2a1a3a' : '#05030a'; g.lineWidth = 6; g.beginPath(); g.moveTo(px, pb); g.quadraticCurveTo(px + dir * 18, (pb + top) / 2, px + dir * 8, top); g.stroke();
            g.fillStyle = g.strokeStyle; for (let f = 0; f < 7; f++) { const a = -Math.PI / 2 + (f - 3) * 0.48; g.beginPath(); g.ellipse(px + dir * 8 + Math.cos(a) * 26, top + Math.sin(a) * 12 + 10, 30, 6, a, 0, TAU); g.fill(); }
          });
        } else if (venue.city === 'signs') {
          [[W * 0.15, hz - 90, '#ff3fa4'], [W * 0.62, hz - 120, '#22e3ff'], [W * 0.86, hz - 70, '#ffd23f']].forEach(([sx, sy, col]) => { g.fillStyle = rgba(col, 0.25); g.fillRect(sx - 30, sy - 12, 60, 24); g.strokeStyle = col; g.lineWidth = 2; rr(g, sx - 26, sy - 9, 52, 18, 5); g.stroke(); });
        } else {
          [[W * 0.18, 0.86], [W * 0.78, 1]].forEach(([tx, k2]) => { const th = (M.phone ? 170 : 240) * k2, tw = M.phone ? 34 : 50; g.fillStyle = Pp.near; g.fillRect(tx - tw / 2, hz - th, tw, th); g.fillRect(tx - 1.5, hz - th - 30, 3, 30); g.fillStyle = 'rgba(255,60,60,0.9)'; g.beginPath(); g.arc(tx, hz - th - 30, 2.2, 0, TAU); g.fill();
            for (let wy = hz - th + 8; wy < hz - 6; wy += 10) for (let wx = tx - tw / 2 + 5; wx < tx + tw / 2 - 5; wx += 7) { if (Rg() < 0.5) { g.fillStyle = rgba(venue.win, 0.4 + Rg() * 0.5); g.fillRect(wx, wy, 3, 5); } } });
        }
        // the billboard: legs, frame, a dark LED screen
        const bd = R.board, fr = 7;
        g.fillStyle = Pp.bright ? '#3a2a52' : '#151020';
        [bd.x + bd.w * 0.22, bd.x + bd.w * 0.78].forEach(lx => { g.fillRect(lx - 4, bd.y + bd.h, 8, Math.max(0, hz - bd.y - bd.h)); g.fillRect(lx - 14, bd.y + bd.h + 16, 28, 4); });
        g.fillStyle = 'rgba(0,0,0,0.45)'; rr(g, bd.x - fr + 3, bd.y - fr + 5, bd.w + fr * 2, bd.h + fr * 2, 12); g.fill();
        const fg = g.createLinearGradient(0, bd.y - fr, 0, bd.y + bd.h + fr); fg.addColorStop(0, '#4a4658'); fg.addColorStop(1, '#1f1c28'); g.fillStyle = fg; rr(g, bd.x - fr, bd.y - fr, bd.w + fr * 2, bd.h + fr * 2, 12); g.fill();
        g.fillStyle = '#06040c'; rr(g, bd.x, bd.y, bd.w, bd.h, 6); g.fill();
        g.save(); rr(g, bd.x, bd.y, bd.w, bd.h, 6); g.clip(); g.fillStyle = 'rgba(255,255,255,0.028)'; for (let yy = bd.y; yy < bd.y + bd.h; yy += 3) g.fillRect(bd.x, yy, bd.w, 1); g.restore();
        g.fillStyle = 'rgba(255,255,255,0.12)'; rr(g, bd.x - fr + 2, bd.y - fr + 1.5, bd.w + fr * 2 - 4, 2, 1); g.fill();
        // the roof: floor and railing
        const fl = g.createLinearGradient(0, hz, 0, H); fl.addColorStop(0, Pp.floor[0]); fl.addColorStop(1, Pp.floor[1]); g.fillStyle = fl; g.fillRect(0, hz, W, H - hz);
        g.strokeStyle = Pp.bright ? 'rgba(40,20,60,0.6)' : 'rgba(255,255,255,0.08)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, hz - 16); g.lineTo(W, hz - 16); g.stroke();
        for (let px = 0; px < W; px += 22) { g.beginPath(); g.moveTo(px, hz - 16); g.lineTo(px, hz); g.stroke(); }
        // string lights: wires (bulbs glow per frame)
        g.strokeStyle = Pp.bright ? 'rgba(40,20,50,0.7)' : 'rgba(0,0,0,0.75)'; g.lineWidth = 1.2;
        R.bulbs = [];
        const strands = [[R.crowd.top - 4, R.crowd.top + 24, 34], [R.crowd.top + 30, R.crowd.top + 8, 26]];
        strands.forEach(([y0, y1, sag], si) => {
          g.beginPath(); g.moveTo(-10, y0); g.quadraticCurveTo(W / 2, (y0 + y1) / 2 + sag * 2, W + 10, y1); g.stroke();
          const n = Math.round(W / (M.phone ? 30 : 44));
          for (let i = 0; i <= n; i++) { const t = i / n, xx = lerp(-10, W + 10, t), yy = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * ((y0 + y1) / 2 + sag * 2) + t * t * y1; R.bulbs.push({ x: xx, y: yy + 4, i: i + si * 3 }); g.fillStyle = '#3a2a1a'; g.fillRect(xx - 1.5, yy, 3, 3); g.fillStyle = Pp.bright ? '#fff4d8' : '#ffe2a0'; g.beginPath(); g.arc(xx, yy + 5, 2.6, 0, TAU); g.fill(); }
        });
        // haze over the crowd
        const hg = g.createLinearGradient(0, hz - 60, 0, R.booth.top); hg.addColorStop(0, 'rgba(0,0,0,0)'); hg.addColorStop(1, Pp.bright ? 'rgba(255,170,150,0.18)' : 'rgba(120,60,160,0.22)'); g.fillStyle = hg; g.fillRect(0, hz - 60, W, R.booth.top - hz + 60);
      }
      function ensureBg() {
        const g = cvBg.g; if (!g || !cvBg.w || !R.booth) return;
        const key = cvBg.w + 'x' + cvBg.h + ':' + cvBg.dpr + ':' + S.scene() + ':' + M.w; if (bg.key === key) return; bg.key = key;
        g.setTransform(cvBg.dpr, 0, 0, cvBg.dpr, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        paintBg(g); paintBooth(g);
      }

      /* ---------------- the crowd ---------------- */
      function buildCrowd() {
        CROWD.length = 0; const W = M.w, rows = M.phone ? [13, 11, 10, 9] : [26, 22, 19, 16], Rg = K.rng(17 + venue.key.length);
        rows.forEach((n, r) => { for (let i = 0; i < n; i++) { const x = (i + 0.5 + (Rg() - 0.5) * 0.7) / n * W + (r % 2 ? 8 : -8); CROWD.push({ r, q: i % 2, x, s: lerp(0.5, 1, r / 3) * (0.9 + Rg() * 0.2), ph: Rg(), th: Rg(), pose: 0, v: Rg() < 0.45 ? 1 : 0, phone: Rg() < 0.4, side: x < W * 0.36 ? 'a' : x > W * 0.64 ? 'b' : 'm' }); } });
        STRIP.list = []; STRIP.key = '';
      }
      /* each row is two strips (alternate people), so the crowd costs eight draws a frame, not two hundred */
      const STRIP = { list: [], key: '', at: 0 };
      function stripsBuild() {
        STRIP.list = [];
        for (let r = 0; r < 4; r++) for (let q = 0; q < 1; q++) {
          const ppl = CROWD.filter(p => p.r === r); if (!ppl.length) continue;
          const smax = Math.max.apply(null, ppl.map(p => p.s)) * M.base, top = Math.ceil(78 * smax), hs = Math.ceil(174 * smax);
          STRIP.list.push({ r, q, ppl, top, hs, c: mk(M.w * M.dpr, hs * M.dpr), bob: 0, sway: 0 });
        }
        STRIP.key = '';
      }
      function stripsRender(key) {
        if (!STRIP.list.length) stripsBuild();
        STRIP.key = key; STRIP.at = now();
        const la = ST.la || 0, lb = ST.lb || 0, both = ST.both || 0, fin = ST.phase === 'finale' || ST.phase === 'end';
        const rimA = 0.25 + 0.75 * la, rimB = 0.2 + 0.8 * lb, rimM = 0.15 + 0.85 * Math.max(both, fin ? 1 : 0), br = S.scene() === 'bright';
        STRIP.list.forEach(st => {
          const g = st.c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, st.c.width, st.c.height); g.setTransform(M.dpr, 0, 0, M.dpr, 0, 0);
          st.ppl.forEach(p => {
            const sc = p.s * M.base, pose = ST.bored > 0.5 ? 0 : p.pose, idx = pose * 2 + p.v, x = p.x - 40 * sc, y = st.top - 70 * sc, w = 80 * sc, hh = 160 * sc;
            g.globalAlpha = 1; g.drawImage(spr.body[idx], x, y, w, hh);
            const rim = p.side === 'a' ? spr.rim.a : p.side === 'b' ? spr.rim.b : (both > 0.3 || fin ? spr.rim.m : (la >= lb ? spr.rim.a : spr.rim.b));
            const ra = (p.side === 'a' ? rimA : p.side === 'b' ? rimB : Math.max(rimM, 0.3)) * lerp(0.55, 1, p.r / 3) * (br ? 0.9 : 1);
            if (ra > 0.03) { g.globalAlpha = Math.min(1, ra); g.drawImage(rim[idx], x, y, w, hh); }
          });
          g.globalAlpha = 1;
        });
      }
      const rowY = (r) => lerp(R.crowd.top + 44, R.booth.top - 2, r / 3);

      /* ---------------- the crossfader ---------------- */
      const knobPx = (x) => 36 + clamp(x, 0, 1) * (R.xf.w - 72);
      function setKnob() { if (!R.xf) return; xfKnob.style.setProperty('--x', knobPx(XF.x).toFixed(1) + 'px'); xfEl.setAttribute('aria-valuenow', String(Math.round(XF.x * 100))); }
      const xOf = (p) => clamp((p.x - 36) / Math.max(1, R.xf.w - 72), 0, 1);
      const canFade = () => ST.phase !== 'intro' && ST.phase !== 'loading' && !XF.glide;
      K.drag(xfEl, {
        start: (p) => { if (!canFade()) { nudge(); return false; } XF.drag = true; XF.target = xOf(p); K.sfx.tap(); return true; },
        move: (p) => { XF.target = xOf(p); },
        end: () => { XF.drag = false; }
      });
      K.onKey(['ArrowLeft', 'ArrowRight'], (e) => { if (!canFade()) return; if (e.preventDefault) e.preventDefault(); A.unlock(); buildMixer(); XF.target = clamp(XF.target + (e.code === 'ArrowRight' || e.key === 'ArrowRight' ? 0.05 : -0.05), 0, 1); });
      function glideTo(x, ms) { XF.glide = { from: XF.x, to: x, t0: now(), ms: reduced() ? Math.min(ms, 200) : ms }; sWhip(x > XF.x); }
      function stepFader(rdt) {
        if (XF.glide) { const gk = clamp((now() - XF.glide.t0) / XF.glide.ms, 0, 1); XF.x = lerp(XF.glide.from, XF.glide.to, ease.inOutCubic(gk)); XF.target = XF.x; if (gk >= 1) XF.glide = null; }
        else {
          let tg = XF.target; if (Math.abs(tg - 0.5) < 0.025) tg = 0.5;
          XF.x += (tg - XF.x) * Math.min(1, rdt * 22);
          if (Math.abs(XF.x - tg) < 0.0008) XF.x = tg;
        }
        setKnob();
        const tick = Math.round(XF.x * 10); if (tick !== XF.lastTick) { if (XF.lastTick >= 0 && A.ctx) { if (tick === 5) A.wood(undefined, 0.07, 0.7); else A.click({ vol: 0.03 }); } XF.lastTick = tick; }
        const hotNow = Math.abs(XF.x - 0.5) <= ZONE && DK.b.on; if (hotNow !== XF.hot) { XF.hot = hotNow; xfEl.classList.toggle('hot', hotNow); }
        if (AU.mix && A.ctx && Math.abs(XF.x - XF.sent) > 0.002) { XF.sent = XF.x; const t = A.ctx.currentTime; DK.a.x.gain.setTargetAtTime(Math.max(0.0001, Math.cos(XF.x * Math.PI / 2)), t, 0.012); DK.b.x.gain.setTargetAtTime(Math.max(0.0001, Math.sin(XF.x * Math.PI / 2)), t, 0.012); }
      }
      let nudgeT = 0; function nudge() { if (now() - nudgeT < 700) return; nudgeT = now(); K.sfx.soft(); }

      /* ---------------- the decks ---------------- */
      function startDeckA() {
        if (ST.phase !== 'startA' || DK.a.on) return;
        A.unlock(); buildMixer();
        DK.a.on = true; K.guide(null); startBtn.classList.add('gone');
        K.sfx.tap(); if (A.ctx) A.wood(undefined, 0.22, 0.5);
        const motor = reduced() ? 0.25 : 0.55; DK.a.motorT = now(); DK.a.motor = motor;
        const go = () => {
          if (A.ctx && AU.mix && AU.bufs.a) {
            const when = A.ctx.currentTime + 0.03;
            DK.a.src = playSrc('a', AU.bufs.a, when, 0, motor);
            DK.a.play.gain.cancelScheduledValues(when); DK.a.play.gain.setValueAtTime(1, when);
            AU.T0 = when + motor * 0.45;
          } else {
            AU.T0 = aNow() + 0.03 + motor * 0.45;
            if (A.ctx && AU.mix) { DK.a.live = true; DK.a.play.gain.setValueAtTime(1, A.ctx.currentTime); }
          }
          ST.aOn = true; ctx.track('startA', {});
        };
        if (AU.bufs.a || !OAC || !A.ctx) go();
        else { let went = false; const once = () => { if (!went) { went = true; go(); } }; renderA().then(once); S.later(once, 1500); }
        P.emit('spark', R.dA.cx, R.dA.cy, 16, { colors: ['#ffb0dc', '#ff3fa4', '#ffffff'] });
      }
      K.press(startBtn, { down: () => startDeckA() });
      S.listen(startBtn, 'keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); startDeckA(); } });
      function powerOff(k, dur) {
        const d = DK[k]; d.on = false; d.offT = now(); d.offDur = dur;
        if (A.ctx && d.src) { const t = A.ctx.currentTime, s = d.src; try { s.playbackRate.cancelScheduledValues(t); s.playbackRate.setValueAtTime(1, t); s.playbackRate.linearRampToValueAtTime(0.06, t + dur); } catch (e) { /* ignore */ } d.play.gain.setTargetAtTime(0.0001, t + dur * 0.75, 0.05); try { s.stop(t + dur + 0.25); } catch (e) { /* stopped */ } }
        d.src = null;
      }
      function judgeTap() {
        const th = heardNow(), f = frac((th - AU.T0) / BAR), after = f * BAR, before = (1 - f) * BAR, dd = Math.min(after, before);
        const grade = dd <= PW ? 'perfect' : dd <= GW ? 'good' : 'off';
        const t = aNow(), startAt = after <= GW ? t + 0.005 : t + before;
        return { grade, startAt };
      }
      function startB(at) {
        const d = DK.b, buf = AU.bufs['b:' + d.style.key];
        if (!A.ctx || !AU.mix) return;
        if (buf) { d.live = false; if (d.src) { try { d.src.stop(at); } catch (e) { /* stopped */ } } d.src = playSrc('b', buf, at, posAt(at), 0); d.play.gain.cancelScheduledValues(at); d.play.gain.setValueAtTime(1, at); }
        else { d.live = true; d.play.gain.setValueAtTime(1, at); }
        A.noise({ when: at, filter: 'highpass', freq: 5200, dur: 0.9, vol: 0.12 });
      }
      function dropB() {
        const j = judgeTap(), d = DK.b, key = 'b:' + d.style.key, at = j.startAt;
        if (A.ctx && AU.mix) {
          if (AU.bufs[key] !== undefined || !OAC) startB(at);
          else { // the game goes on at once; on a slow device the record's sound joins on the first one after it's pressed
            const sty = d.style;
            renderStyle(sty).then(() => { if (d.style !== sty || !d.on || d.src) return; const t2 = aNow() + 0.06; startB(AU.T0 + Math.ceil((t2 - AU.T0) / BAR) * BAR); });
          }
          sWhip(true);
        }
        d.on = true; d.startAt = at; d.motorT = now() + Math.max(0, (at - aNow()) * 1000); d.motor = 0.05;
        ST.drops.push(j.grade); ctx.track('drop', { g: j.grade });
        K.sfx.tap();
        const tx = j.grade === 'perfect' ? 'On the one!' : j.grade === 'good' ? 'Nice drop' : 'Caught the next one';
        K.pop(tx, { x: R.dB.cx, y: R.dB.y - 18, kind: j.grade === 'perfect' ? 'great' : j.grade === 'good' ? 'good' : 'soft' });
        if (j.grade === 'perfect') { ST.burst += 0.12; P.emit('star', R.drop.cx, R.drop.cy, 12, { colors: ['#fff6cf', '#ffd23f'] }); }
        capB.replaceChildren(h('b', { text: 'B' }), document.createTextNode(d.style.name));
      }
      function onDrop() {
        A.unlock(); buildMixer();
        if (ST.phase === 'cue') { dropB(); ST.phase = 'blend'; dropBtn.classList.add('idle'); return; }
        if (ST.phase === 'build') { finaleDrop(); return; }
        nudge(); ST.dropWig = 1;
      }
      K.press(dropBtn, { down: () => onDrop() });
      S.listen(dropBtn, 'keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); onDrop(); } });

      /* ---------------- scratching: the record follows your hand, the sound follows the record ---------------- */
      function bindPlatter(k, hit) {
        const cOf = () => { const s = (k === 'a' ? R.dA : R.dB).r + 6; return { x: s, y: s, r: s - 6 }; };
        K.press(hit, {
          down: (p) => {
            if (k === 'a' && ST.phase === 'startA') { startDeckA(); return; }
            const d = DK[k];
            if (!d.on || ST.phase === 'finale' || ST.phase === 'end') { nudge(); d.wig = 1; return; }
            const c0 = cOf(); SC.on = true; SC.k = k; SC.lastA = Math.atan2(p.y - c0.y, p.x - c0.x); SC.lastT = now(); SC.moveT = now(); SC.vel = 0; SC.acc = 0; SC.sdir = 0; SC.dir = 0; SC.strokeT = aNow();
            SC.cue = k === 'b' && !!AU.bufs.and && (ST.phase === 'scratch' || ST.phase === 'scratched');
            SC.buf = SC.cue ? AU.bufs.and : (d.src && d.src.buffer) || null; SC.pos = SC.cue ? 0 : posAt(aNow());
            if (SC.src) { try { SC.src.stop(); } catch (e) { /* stopped */ } SC.src = null; }
            d.held = true;
            if (A.ctx && d.play) { const t = A.ctx.currentTime; d.play.gain.cancelScheduledValues(t); d.play.gain.setTargetAtTime(0.0001, t, 0.01); }
            K.sfx.tap(); if (A.ctx) A.noise({ filter: 'lowpass', freq: 900, dur: 0.05, vol: 0.08 });
          },
          move: (p) => {
            if (!SC.on || SC.k !== k) return;
            const c0 = cOf(), dx = p.x - c0.x, dy = p.y - c0.y, a = Math.atan2(dy, dx);
            if (Math.hypot(dx, dy) < c0.r * 0.16) { SC.lastA = a; return; }
            const da = clamp(wrapA(a - SC.lastA), -1.2, 1.2); SC.lastA = a;
            const tn = now(), dt = Math.max(0.004, (tn - SC.lastT) / 1000); SC.lastT = tn; SC.moveT = tn;
            DK[k].ang += da;
            const rate = (da / dt) / OMEGA; SC.vel = SC.vel * 0.35 + rate * 0.65; SC.pos += da / OMEGA;
            const dir = Math.abs(SC.vel) > 0.05 ? Math.sign(SC.vel) : 0;
            if (dir && SC.sdir && dir !== SC.sdir) { if (Math.abs(SC.acc) >= 0.28) strokeDone(); SC.acc = 0; SC.strokeT = aNow(); }
            if (dir) SC.sdir = dir;
            SC.acc += da;
            scrSound(dir);
            if (Math.abs(SC.vel) > 2.2 && Math.random() < 0.35) { const d0 = k === 'a' ? R.dA : R.dB; P.emit('spark', d0.cx + Math.cos(a) * d0.r * 0.9, d0.cy + Math.sin(a) * d0.r * 0.9, 2, { colors: k === 'a' ? ['#ffb0dc', '#ffffff'] : ['#a8f6ff', '#ffffff'], speed: [40, 120] }); }
          },
          up: () => { if (!SC.on || SC.k !== k) return; if (Math.abs(SC.acc) >= 0.28) strokeDone(); scrRelease(); }
        });
      }
      function scrSound(dir) {
        const c = A.ctx, d = DK[SC.k]; if (!c || !d.scr || !SC.buf) return;
        const t = c.currentTime, sp = clamp(Math.abs(SC.vel), 0.05, 4);
        if (dir && (dir !== SC.dir || !SC.src)) {
          if (SC.src) { const os = SC.src, oe = SC.env; oe.gain.cancelScheduledValues(t); oe.gain.setTargetAtTime(0.0001, t, 0.004); try { os.stop(t + 0.04); } catch (e) { /* stopped */ } }
          const buf = dir > 0 ? SC.buf : revBuf(SC.buf); if (!buf) { SC.src = null; return; }
          const dur = buf.duration, p = ((SC.pos % dur) + dur) % dur, off = dir > 0 ? p : dur - p;
          const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = sp;
          const e = c.createGain(); e.gain.setValueAtTime(0.0001, t); e.gain.setTargetAtTime(clamp(sp * 1.25, 0.0001, 1), t, 0.005);
          s.connect(e); e.connect(d.scr); s.start(t, Math.min(off, dur - 0.001));
          SC.src = s; SC.env = e; SC.dir = dir;
        } else if (SC.src) { SC.src.playbackRate.setTargetAtTime(sp, t, 0.012); SC.env.gain.setTargetAtTime(clamp(Math.abs(SC.vel) * 1.25, 0.0001, 1), t, 0.01); }
        if (AU.fric) { AU.fric.level(clamp(Math.abs(SC.vel) * 0.02, 0, 0.05), 0.02); AU.fric.freq(1400 + Math.abs(SC.vel) * 900, 0.03); }
      }
      function scrRelease() {
        const d = DK[SC.k]; SC.on = false; d.held = false;
        if (A.ctx) {
          const t = A.ctx.currentTime;
          if (SC.src) { SC.env.gain.cancelScheduledValues(t); SC.env.gain.setTargetAtTime(0.0001, t, 0.01); const os = SC.src; try { os.stop(t + 0.08); } catch (e) { /* stopped */ } SC.src = null; }
          if (d.on && d.play) d.play.gain.setTargetAtTime(1, t, 0.02);
          if (AU.fric) AU.fric.level(0.0001, 0.05);
        }
      }
      function strokeDone() {
        ST.strokes++;
        const t0 = SC.strokeT - (A.ctx ? A.latency() : 0), e8 = (t0 - AU.T0) / (BEAT / 2), off = Math.abs(e8 - Math.round(e8)) * BEAT / 2, on = off <= BEATW;
        if (on) ST.onBeat++;
        ST.burst += 0.035;
        try { if (navigator.vibrate && !reduced()) navigator.vibrate(8); } catch (e) { /* no vibration */ }
        const d0 = SC.k === 'a' ? R.dA : R.dB;
        if (ST.phase === 'scratch') {
          ST.scr++; ST.scrOn = (ST.scrOn || 0) + (on ? 1 : 0);
          comboEl.replaceChildren(document.createTextNode('AND × '), h('b', { text: String(ST.scr) }), document.createTextNode(on ? ' · on beat' : ''));
          K.pop(on ? 'AND!' : 'and', { x: d0.cx + (Math.random() - 0.5) * 30, y: d0.y + 14, kind: on ? 'great' : 'good' });
          if (ST.scr % 3 === 0) sCheer(0.5);
          if (ST.scr >= STROKES && ST.phase === 'scratch') ST.phase = 'scratched';
        }
        ST.flash = Math.max(ST.flash, 0.6);
      }
      bindPlatter('a', platA); bindPlatter('b', platB);
      K.onKey(['KeyS'], () => { if (ST.phase !== 'scratch' || !DK.b.on) return; A.unlock(); sAnd(0.7); SC.k = 'b'; SC.strokeT = aNow(); strokeDone(); });

      /* ---------------- the crate ---------------- */
      let sleeves = [];
      function placeCrate() {
        if (!R.board) return;
        const bd = R.board, n = sleeves.length || 3, gap = M.phone ? 10 : 22;
        const sw = M.phone ? Math.floor((bd.w - gap * 2) / 3) : 178, sh = M.phone ? Math.min(bd.h + 16, Math.round(sw * 1.28)) : Math.min(bd.h + 12, 186);
        const total = sw * n + gap * (n - 1), x0 = Math.round(bd.x + (bd.w - total) / 2), y0 = Math.round(bd.y + (bd.h - sh) / 2);
        Object.assign(crate.style, { left: '0px', top: '0px', width: '0px', height: '0px' });
        sleeves.forEach((s, i) => { s.cx = x0 + i * (sw + gap) + sw / 2; s.cy = y0 + sh / 2; s.w = sw; s.h = sh; Object.assign(s.el.style, { left: (x0 + i * (sw + gap)) + 'px', top: y0 + 'px', width: sw + 'px', height: sh + 'px' }); });
      }
      function openCrate() {
        const items = CW.filter(c => !c.used).slice(0, 3);
        if (items.length) renderStyle(items[items.length - 1].style);
        sleeves = items.map((item, i) => {
          const st = item.style;
          const e = h('button', { type: 'button', class: 'bd-sleeve in0', style: { '--c1': st.c1, '--c2': st.c2 }, 'aria-label': 'Record: ' + item.line + '. ' + st.name + '. Drag it onto Deck B.' },
            h('span', { class: 'bd-sl-pat bd-pat-' + st.pat }), h('span', { class: 'bd-sl-rec' }),
            h('span', { class: 'bd-sl-txt' }, h('b', { class: 'bd-sl-tag', text: item.tag }), h('span', { class: 'bd-sl-line', text: item.line }), h('span', { class: 'bd-sl-style', text: st.name })));
          const sl = { el: e, item, cx: 0, cy: 0, w: 0, h: 0, moved: 0, i };
          let dragged = 0;
          K.drag(e, {
            start: () => { if (ST.phase !== 'crate') return false; e.classList.add('drag'); sl.moved = 0; dragged = now(); if (A.ctx) A.paper({ vol: 0.12 }); else K.sfx.tap(); K.sfx.tap(); return true; },
            move: (p, dd) => {
              sl.moved = Math.max(sl.moved, Math.hypot(dd.dx, dd.dy));
              e.style.transform = 'translate(' + dd.dx.toFixed(1) + 'px,' + dd.dy.toFixed(1) + 'px) rotate(' + clamp(dd.vx / 70, -10, 10).toFixed(1) + 'deg) scale(1.05)';
              const over = Math.hypot(sl.cx + dd.dx - R.dB.cx, sl.cy + dd.dy - R.dB.cy) < R.dB.r * 1.3;
              if (over !== !!sl.over) { sl.over = over; e.classList.toggle('hot', over); ST.hoverB = over; if (over && A.ctx) A.click({ vol: 0.05 }); }
            },
            end: () => {
              e.classList.remove('drag', 'hot'); ST.hoverB = false;
              if (sl.over && ST.phase === 'crate') { sl.over = false; loadRecord(sl); return; }
              sl.over = false; e.style.transform = ''; if (sl.moved > 10) { if (A.ctx) A.boing({ freq: 260, vol: 0.08 }); }
            }
          });
          S.listen(e, 'click', () => { if (ST.phase !== 'crate' || now() - dragged < 450 && sl.moved > 8) return; loadRecord(sl); });
          return sl;
        });
        crate.replaceChildren(...sleeves.map(s => s.el)); crate.hidden = false; placeCrate();
        sleeves.forEach((s, i) => S.later(() => s.el.classList.remove('in0'), reduced() ? 0 : 60 + i * 90));
        board.style.opacity = '0.2';
      }
      function closeCrate(chosen) {
        sleeves.forEach(s => { if (s !== chosen) s.el.classList.add('out'); });
        S.later(() => { crate.hidden = true; crate.replaceChildren(); sleeves = []; board.style.opacity = ''; }, reduced() ? 50 : 360);
      }
      function loadRecord(sl) {
        if (ST.phase !== 'crate') return;
        ST.phase = 'loading'; K.guide(null);
        const item = sl.item, d = DK.b;
        sl.el.style.transition = 'transform 0.28s cubic-bezier(.4,0,.6,1), opacity 0.28s ease';
        sl.el.style.transform = 'translate(' + (R.dB.cx - sl.cx).toFixed(1) + 'px,' + (R.dB.cy - sl.cy).toFixed(1) + 'px) scale(0.35) rotate(25deg)'; sl.el.style.opacity = '0';
        closeCrate(sl);
        if (d.rec) { d.off = { style: d.style, t0: now(), ang: d.ang, c: spr.rec.b }; if (d.on) powerOff('b', 0.6); }
        d.rec = item; d.style = item.style; d.recT0 = now(); d.recK = 0; spr.rec.b = paintRec('b');
        renderStyle(item.style);
        capB.replaceChildren(h('b', { text: 'B' }), document.createTextNode(item.style.name));
        K.sfx.thud(); sNeedle();
        S.later(() => { P.emit('dust', R.dB.cx, R.dB.cy, 14, { colors: ['rgba(220,220,255,0.5)'] }); }, 220);
        if (XF.x > 0.04) glideTo(0, 520);
        S.later(() => { if (ST.phase === 'loading') ST.phase = 'cue'; }, reduced() ? 250 : 650);
      }

      /* ---------------- the frame loop ---------------- */
      let lastPose = -1;
      const QA = { acc: 0, n: 0, steps: 0 };
      function quality(dt) {
        QA.acc += dt; QA.n++;
        if (QA.acc < 2) return;
        const avg = QA.acc / QA.n; QA.acc = 0; QA.n = 0;
        if (avg > 0.034 && QA.steps < 2 && cv.setQuality) { QA.steps++; cv.setQuality(QA.steps === 1 ? 0.8 : 0.66); }
      }
      K.loop(() => {
        const g = cv.g; if (!g || !M.w || !R.dA) return;
        const tn = now(), realDt = Math.max(0.001, (tn - ST.lastT) / 1000), rdt = Math.min(0.1, realDt); ST.lastT = tn;
        quality(realDt);
        buildSprites(); ensureBg();
        liveTick();
        stepFader(rdt);
        // the beat as it is heard
        const bp = AU.T0 ? (heardNow() - AU.T0) / BEAT : tn / 1000 / BEAT * 0.5, bIdx = Math.floor(bp), bph = frac(bp);
        ST.beatK = AU.T0 && ST.aOn ? Math.pow(1 - bph, 3) : 0.15 * (0.5 + 0.5 * Math.sin(tn / 600));
        // levels and hype
        const xa = Math.cos(XF.x * Math.PI / 2), xb = Math.sin(XF.x * Math.PI / 2);
        const la = DK.a.on && !DK.a.held ? xa : 0, lb = DK.b.on && !DK.b.held && aNow() >= (DK.b.startAt || 0) ? xb : 0, both = Math.min(la, lb) / 0.7071;
        ST.la = la; ST.lb = lb; ST.both = both;
        if (ST.phase === 'onlyA' || ST.phase === 'onlyB') ST.bored = clamp((tn - ST.onlyT - 1300) / 2600, 0, 1); else ST.bored = Math.max(0, ST.bored - rdt * 0.8);
        let tgt = 0.06 + 0.24 * la + 0.16 * lb + 0.52 * both;
        tgt *= 1 - 0.55 * ST.bored;
        if (ST.phase === 'finale') tgt = 1;
        if (ST.phase === 'end') { tgt = 0.55; ST.laser = Math.max(0, ST.laser - rdt * 0.6); ST.strobe = 0; }
        ST.burst = Math.max(0, ST.burst - rdt * 0.25);
        ST.hype += (clamp(tgt + ST.burst, 0, 1.1) - ST.hype) * Math.min(1, rdt * 1.6);
        const seg = Math.round(clamp(ST.hype, 0, 1) * 10); if (seg !== ST.seg) { ST.seg = seg; segs.forEach((s, i) => s.classList.toggle('on', i < seg)); }
        if (AU.crowd) { AU.crowd.level(0.03 + ST.hype * 0.09, 0.4); AU.crowd.freq(650 + ST.hype * 900, 0.5); }
        // crowd poses change on the beat
        if (bIdx !== lastPose) { lastPose = bIdx; CROWD.forEach(p => { const e = ST.hype; p.pose = ST.phase === 'finale' ? ((bIdx + Math.floor(p.th * 4)) % 3 === 0 ? (p.v ? 1 : 2) : 3) : e > 0.64 + p.th * 0.3 ? 3 : e > 0.36 + p.th * 0.34 ? (p.th < 0.5 ? 1 : 2) : 0; }); if (ST.phase === 'finale' && bIdx % 2 === 0) finaleBeat(bIdx); }
        // the fill toward a both/and lock
        stepFill(Math.min(0.5, realDt));
        // scratch: a still hand means a still record means silence
        if (SC.on && tn - SC.moveT > 45) { SC.vel *= Math.pow(0.0005, rdt); if (A.ctx && SC.src) SC.env.gain.setTargetAtTime(0.0001, A.ctx.currentTime, 0.015); if (AU.fric) AU.fric.level(0.0001, 0.03); }
        // decks
        ['a', 'b'].forEach(k => {
          const d = DK[k];
          let target = d.on ? OMEGA : 0;
          if (d.on && d.motor && tn - d.motorT < d.motor * 1000) target = OMEGA * clamp((tn - d.motorT) / (d.motor * 1000), 0, 1);
          if (!d.on && d.offT && tn - d.offT < (d.offDur || 0.6) * 1000) target = OMEGA * (1 - (tn - d.offT) / ((d.offDur || 0.6) * 1000));
          if (k === 'b' && d.on && aNow() < (d.startAt || 0)) target = 0;
          d.spin = d.held ? 0 : target;
          if (!d.held) d.ang += d.spin * rdt;
          d.arm += ((d.on || (d.offT && tn - d.offT < 600) ? 1 : 0) - d.arm) * Math.min(1, rdt * 5);
          if (d.rec || k === 'a') d.recK = Math.min(1, d.recK + rdt * 3.2);
          d.wig = Math.max(0, (d.wig || 0) - rdt * 3);
        });
        ST.flash = Math.max(0, ST.flash - rdt * 2.2); ST.strobe = Math.max(0, ST.strobe - rdt * 3);
        ST.dropWig = Math.max(0, (ST.dropWig || 0) - rdt * 3);
        // the DROP button breathes with the bar when it is the thing to press
        const armed = ST.phase === 'cue' || ST.phase === 'build';
        const kk = armed ? (bIdx % 4 === 0 ? 1 - bph : 0.25 * (1 - bph)) : 0;
        if (Math.abs(kk - (ST.kSent || 0)) > 0.03) { ST.kSent = kk; dropBtn.style.setProperty('--k', kk.toFixed(2)); }
        if (armed === dropBtn.classList.contains('idle')) dropBtn.classList.toggle('idle', !armed);
        if (ST.phase === 'build') buildTick();
        P.update(rdt);
        draw(g, tn / 1000, bIdx, bph);
      });
      function stepFill(rdt) {
        const ph = ST.phase;
        if (ph !== 'blend' && ph !== 'blendBack' && ph !== 'blendBack2') { if (FILL.k > 0 && ph !== 'locked') { FILL.k = Math.max(0, FILL.k - rdt); xfZone.style.setProperty('--f', FILL.k.toFixed(3)); } return; }
        const inZ = Math.abs(XF.x - 0.5) <= ZONE && DK.b.on && aNow() >= (DK.b.startAt || 0);
        if (inZ) { FILL.k += rdt / FILL_S; FILL.dev += Math.abs(XF.x - 0.5) * rdt; FILL.t += rdt; if (FILL.ch === 0 && FILL.k > 0.33) { FILL.ch = 1; K.sfx.chime(4); } else if (FILL.ch === 1 && FILL.k > 0.66) { FILL.ch = 2; K.sfx.chime(6); } }
        else FILL.k = Math.max(0, FILL.k - rdt * 0.5);
        xfZone.style.setProperty('--f', clamp(FILL.k, 0, 1).toFixed(3));
        if (FILL.k >= 1) { if (ph === 'blend') lockBlend(); else if (ph === 'blendBack') ST.phase = 'liked'; else ST.phase = 'likedB'; }
      }
      function resetFill() { FILL.k = 0; FILL.dev = 0; FILL.t = 0; FILL.ch = 0; xfZone.style.setProperty('--f', '0'); }

      /* ---------------- drawing ---------------- */
      function draw(g, t, bIdx, bph) {
        const W = M.w, H = M.h, Pp = pal(), br = Pp.bright, red = reduced();
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        g.clearRect(0, 0, W, H);
        const la = ST.la, lb = ST.lb, both = ST.both, beat = ST.beatK, hype = ST.hype;
        // the billboard glows in the colour of what's on it (a compositor-only layer)
        const go = Math.round(((br ? 0.35 : 0.55) * (0.5 + 0.5 * beat * (ST.aOn ? 1 : 0)) * (crate.hidden ? 1 : 0.35)) * 20) / 20;
        if (go !== ST.glowO) { ST.glowO = go; glowEl.style.opacity = String(go); }
        if (boardCol !== ST.glowC) { ST.glowC = boardCol; glowEl.style.setProperty('--gc', rgba(boardCol, 0.75)); glowEl.style.setProperty('--gc2', rgba(boardCol, 0.3)); }
        g.globalCompositeOperation = 'lighter';
        // string lights pulse with the beat
        if (R.bulbs) { const ba = (br ? 0.35 : 0.6) * (0.45 + 0.55 * (0.3 + 0.7 * beat) * (0.4 + hype * 0.6)); g.globalAlpha = ba; const bs = M.phone ? 22 : 30; R.bulbs.forEach(b => { const tw = 0.75 + 0.25 * Math.sin(t * 3 + b.i * 1.7); g.globalAlpha = ba * tw; g.drawImage(spr.bulb, b.x - bs / 2, b.y - bs / 2, bs, bs); }); }
        // beams: Deck A pink from the left, Deck B cyan from the right; when both play they cross into gold
        drawBeams(g, t, la, lb, both, beat, br, red);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        // the crowd, back to front
        drawCrowd(g, t, bIdx, bph, la, lb, both);
        // lasers over the crowd in the finale
        if (ST.laser > 0.01) drawLasers(g, t, br);
        // the booth hardware is on the static canvas; the moving parts go on top
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        drawLed(g, la, lb, both, beat);
        drawDeck(g, 'a', t); drawDeck(g, 'b', t);
        drawMixer(g, bIdx, bph);
        P.draw(g);
        if (ST.strobe > 0.01 && !red) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = ST.strobe * 0.18; g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, R.booth.top); }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      function drawBeams(g, t, la, lb, both, beat, br, red) {
        const W = M.w, top = R.booth.top, len = Math.max(M.h * 0.75, 420), wid = M.phone ? 130 : 220, sp = red ? 0.25 : 1;
        const em = M.phone ? [0.06, 0.28, 0.72, 0.94] : [0.16, 0.34, 0.66, 0.84];
        const base = (br ? 0.22 : 0.32) * (0.7 + 0.3 * beat);
        em.forEach((fx, i) => {
          const isA = i < 2, lv = isA ? la : lb; if (lv < 0.02) return;
          const x = W * fx, dir = isA ? 1 : -1, cross = both * 0.32;
          const ang = dir * (0.22 + cross) + Math.sin(t * 0.7 * sp + i * 1.9) * 0.24 * sp * (0.5 + ST.hype * 0.5) * dir;
          g.globalAlpha = base * lv * (i % 2 ? 0.85 : 1);
          g.save(); g.translate(x, top + 4); g.rotate(ang); g.drawImage(isA ? spr.beam.a : spr.beam.b, -wid / 2, -len, wid, len); g.restore();
        });
        if (both > 0.4) { g.globalAlpha = base * 0.7 * (both - 0.4) / 0.6 * (0.6 + 0.4 * beat); g.save(); g.translate(W / 2, top + 4); g.rotate(Math.sin(t * 0.5 * sp) * 0.12); g.drawImage(spr.beam.g, -wid * 0.45, -len * 0.9, wid * 0.9, len * 0.9); g.restore(); }
      }
      function drawCrowd(g, t, bIdx, bph, la, lb, both) {
        const pump = (x) => Math.pow(1 - frac(x), 2.4), fin = ST.phase === 'finale' || ST.phase === 'end';
        const jump = (fin || ST.phase === 'locked' || ST.phase === 'liked' || ST.phase === 'likedB') ? 1 : 0;
        const live = ST.aOn ? 1 : 0, amp = (2 + ST.hype * 6 + jump * 7 * ST.hype) * (reduced() ? 0.4 : 1);
        // re-light the strips on the beat (new poses) or when the mix has moved
        const key = [bIdx, Math.round(la * 12), Math.round(lb * 12), Math.round(both * 12), ST.bored > 0.5 ? 1 : 0, fin ? 1 : 0, M.w].join(':');
        if (!STRIP.list.length || (key !== STRIP.key && (now() - STRIP.at > 110 || key.split(':')[0] !== String(STRIP.key).split(':')[0]))) stripsRender(key);
        const phonesOut = !ST.aOn || ST.bored > 0.4;
        g.globalAlpha = 1;
        STRIP.list.forEach(st => {
          const sc = lerp(0.5, 1, st.r / 3) * M.base, off = st.r * 0.07;
          const ph = live ? bIdx + bph - off : t * 0.6 + st.r;
          st.bob = (live ? amp * pump(ph) * (1 - ST.bored * 0.6) : 2 * Math.sin(ph * TAU * 0.25)) * sc;
          st.sway = (live ? Math.sin((bIdx + bph) * Math.PI / 2 + st.q * Math.PI + st.r) : Math.sin(t * 0.8 + st.q * 3 + st.r)) * (1.5 + ST.hype * 2.5) * sc;
          const yTop = rowY(st.r) - st.top - st.bob, visH = Math.min(st.hs, R.booth.top - yTop);
          if (visH > 1) g.drawImage(st.c, 0, 0, st.c.width, Math.floor(visH * M.dpr), st.sway, yTop, M.w, Math.floor(visH * M.dpr) / M.dpr);
          // phones: glowing faces when the room is bored, torches up in the finale
          if (phonesOut || fin) {
            st.ppl.forEach(p => {
              if (!p.phone) return;
              const s2 = p.s * M.base, x = p.x + st.sway, y = rowY(st.r) - st.bob, px = fin ? x + 21 * s2 : x + 7 * s2, py = fin ? y - 60 * s2 : y - 12 * s2;
              g.globalCompositeOperation = 'lighter'; g.globalAlpha = fin ? 0.8 : 0.55; g.drawImage(spr.soft, px - 9 * s2, py - 9 * s2, 18 * s2, 18 * s2);
              g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = fin ? '#fffbe8' : '#cfe8ff'; g.fillRect(px - 2.2 * s2, py - 3.5 * s2, 4.4 * s2, 7 * s2);
            });
          }
        });
        g.globalAlpha = 1;
      }
      function drawLasers(g, t, br) {
        const W = M.w, ox = W / 2, oy = R.booth.top + 2, n = M.phone ? 7 : 11, cols = [A_COL, B_COL, AND_COL], sp = reduced() ? 0.2 : 1;
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < n; i++) {
          const k = i / (n - 1), ang = -Math.PI / 2 + (k - 0.5) * 2.1 * (0.6 + 0.4 * Math.sin(t * 1.3 * sp + i)) + Math.sin(t * 0.9 * sp) * 0.25, L = Math.max(M.w, M.h) * 1.2;
          const ex = ox + Math.cos(ang) * L, ey = oy + Math.sin(ang) * L, col = cols[i % 3];
          g.globalAlpha = 0.22 * ST.laser * (br ? 0.6 : 1); g.strokeStyle = col; g.lineWidth = 6; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ex, ey); g.stroke();
          g.globalAlpha = 0.75 * ST.laser * (br ? 0.7 : 1); g.lineWidth = 1.6; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ex, ey); g.stroke();
        }
        g.globalAlpha = 0.5 * ST.laser; g.drawImage(spr.gG, ox - 40, oy - 40, 80, 80);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      }
      function drawLed(g, la, lb, both, beat) {
        const W = M.w, y = R.booth.top - 3, k = 0.35 + 0.65 * beat;
        const lg = g.createLinearGradient(0, 0, W, 0);
        lg.addColorStop(0, rgba(A_COL, 0.15 + 0.85 * la * k)); lg.addColorStop(0.5, rgba(both > 0.3 ? AND_COL : '#7a6a9a', 0.2 + 0.8 * both * k)); lg.addColorStop(1, rgba(B_COL, 0.15 + 0.85 * lb * k));
        g.fillStyle = lg; g.fillRect(0, y, W, 4);
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 * k * Math.max(la, lb); g.fillRect(0, y - 3, W, 10); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      function drawDeck(g, k, t) {
        const d = DK[k], P0 = k === 'a' ? R.dA : R.dB, wig = d.wig ? Math.sin(t * 50) * 1.5 * d.wig : 0;
        // a glow under the record: deck colour while it plays, cyan halo when a sleeve hovers over B
        const glow = (k === 'a' ? ST.la : ST.lb) * (0.4 + 0.6 * ST.beatK);
        if (glow > 0.02 || (k === 'b' && (ST.hoverB || ST.phase === 'scratch' || ST.phase === 'cue'))) {
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = clamp(0.25 * glow + (k === 'b' && (ST.hoverB || ST.phase === 'scratch') ? 0.35 : 0) + (k === 'b' && ST.phase === 'cue' ? 0.2 * ST.beatK : 0), 0, 1);
          const gs = k === 'a' ? spr.gA : spr.gB, rad = P0.r * 1.6; g.drawImage(gs, P0.cx - rad, P0.cy - rad, rad * 2, rad * 2); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        }
        g.save(); g.translate(P0.cx + wig, P0.cy); g.rotate(d.ang);
        const m = spr.mat[k]; g.drawImage(m.c, -m.s / 2, -m.s / 2, m.s, m.s);
        g.restore();
        if (d.off && d.off.c) { // the old record slides off to the right
          const ok = clamp((now() - d.off.t0) / 520, 0, 1); if (ok >= 1) d.off = null;
          else { g.save(); g.globalAlpha = 1 - ok; g.translate(P0.cx + ease.inCubic(ok) * P0.r * 2.6, P0.cy - ok * 20); g.rotate(d.off.ang + ok * 2); g.drawImage(d.off.c.c, -d.off.c.s / 2, -d.off.c.s / 2, d.off.c.s, d.off.c.s); g.restore(); g.globalAlpha = 1; }
        }
        const rec = spr.rec[k];
        if (rec && (k === 'a' || d.rec)) {
          const rk = d.recK, sc = k === 'a' ? 1 : (rk < 1 ? 1 + 0.25 * (1 - ease.outBack(rk)) : 1);
          g.save(); g.globalAlpha = k === 'a' ? 1 : clamp(rk * 2, 0, 1); g.translate(P0.cx + wig, P0.cy - (k === 'b' ? (1 - ease.outCubic(rk)) * 30 : 0)); g.rotate(d.ang); g.scale(sc, sc); g.drawImage(rec.c, -rec.s / 2, -rec.s / 2, rec.s, rec.s); g.restore(); g.globalAlpha = 1;
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.9; g.drawImage(spr.sheen, P0.cx - P0.r + 3, P0.cy - P0.r + 3, (P0.r - 3) * 2, (P0.r - 3) * 2); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        }
        drawArm(g, k, P0, d);
        // the deck's target light
        g.fillStyle = d.on ? (k === 'a' ? '#ff6cc0' : '#5aeeff') : '#3a3746'; g.beginPath(); g.arc(P0.x + 12, P0.y + P0.h - 12, 3.4, 0, TAU); g.fill();
        if (d.on) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6; g.drawImage(k === 'a' ? spr.gA : spr.gB, P0.x + 2, P0.y + P0.h - 22, 20, 20); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
      }
      function drawArm(g, k, P0, d) {
        const ax = P0.ax, ay = P0.ay, tx = P0.cx + P0.r * 0.86 * Math.cos(-0.3), ty = P0.cy + P0.r * 0.86 * Math.sin(-0.3), Lr = Math.hypot(tx - ax, ty - ay);
        const aPlay = Math.atan2(ty - ay, tx - ax), aRest = Math.PI / 2 + 0.03, playing = k === 'a' || d.rec, a = aRest + (aPlay - aRest) * (playing ? ease.inOutCubic(clamp(d.arm, 0, 1)) : 0);
        const ex = ax + Math.cos(a) * Lr, ey = ay + Math.sin(a) * Lr;
        g.lineCap = 'round';
        g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 5; g.beginPath(); g.moveTo(ax + 2, ay + 4); g.lineTo(ex + 2, ey + 4); g.stroke();
        g.strokeStyle = '#c9c6d4'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(ax - Math.cos(a) * 10, ay - Math.sin(a) * 10); g.lineTo(ex, ey); g.stroke();
        g.fillStyle = '#3c3a46'; g.beginPath(); g.arc(ax - Math.cos(a) * 12, ay - Math.sin(a) * 12, 5, 0, TAU); g.fill();
        g.save(); g.translate(ex, ey); g.rotate(a + 0.5); g.fillStyle = '#e8e6ef'; rr(g, -4, -3, 13, 7, 2); g.fill(); g.fillStyle = k === 'a' ? A_COL : B_COL; g.fillRect(6, -3, 3, 7); g.restore();
        g.fillStyle = '#7c798a'; g.beginPath(); g.arc(ax, ay, 4, 0, TAU); g.fill();
        g.lineCap = 'butt';
      }
      function drawMixer(g, bIdx, bph) {
        // beat lights round the DROP button: 1 at the top, gold
        const dc = R.drop, armed = ST.phase === 'cue' || ST.phase === 'build', cur = ST.aOn ? ((bIdx % 4) + 4) % 4 : -1;
        for (let i = 0; i < 4; i++) {
          const a = -Math.PI / 2 + i * Math.PI / 2, rad = dc.r + (M.phone ? 9 : 11), x = dc.cx + Math.cos(a) * rad, y = dc.cy + Math.sin(a) * rad, on = i === cur;
          const col = i === 0 ? AND_COL : '#ffffff';
          g.fillStyle = on ? col : 'rgba(255,255,255,0.18)'; g.beginPath(); g.arc(x, y, i === 0 ? 4.4 : 3.2, 0, TAU); g.fill();
          if (on && (armed || i === 0)) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.8 * (1 - bph); g.drawImage(i === 0 ? spr.gG : spr.soft, x - 12, y - 12, 24, 24); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
        }
        if (!R.mix) return;
        // desktop: channel meters either side of the DROP button
        const m = R.mix, beat = ST.beatK;
        [[ST.la, A_COL, m.x + 56], [ST.lb, B_COL, m.x + m.w - 62]].forEach(([lv, col, x]) => {
          const n = 10, lvN = Math.round(clamp(lv * (0.55 + 0.45 * beat), 0, 1) * n);
          for (let i = 0; i < n; i++) { const y = m.y + 120 - i * 10; g.fillStyle = i < lvN ? (i > 7 ? '#ff5a4a' : i > 5 ? AND_COL : col) : 'rgba(255,255,255,0.07)'; g.fillRect(x, y, 6, 7); }
        });
      }

      /* ---------------- the finale: lasers, confetti, fireworks, encore ---------------- */
      function finaleBeat(bIdx) {
        if (!R.dA) return;
        if (bIdx % 4 === 0 && !reduced()) ST.strobe = 0.9;
        const n = M.phone ? 16 : 26, cols = [A_COL, B_COL, AND_COL, '#ffffff', '#b98bff'];
        P.emit('confetti', 14, R.booth.top, n, { angle: -Math.PI / 2 + 0.45, spread: 0.6, speed: [360, 620], colors: cols });
        P.emit('confetti', M.w - 14, R.booth.top, n, { angle: -Math.PI / 2 - 0.45, spread: 0.6, speed: [360, 620], colors: cols });
      }
      function buildTick() {
        if (!A.ctx || !AU.T0) return;
        const c = A.ctx, el2 = c.currentTime - AU.buildT;
        if (!AU.rollNext) AU.rollNext = AU.buildT;
        while (AU.rollNext < c.currentTime + 0.2) {
          const e = AU.rollNext - AU.buildT, step = e < BAR ? BEAT / 2 : e < BAR * 2 ? BEAT / 4 : BEAT / 4, k = clamp(e / (BAR * 2), 0, 1);
          A.noise({ when: AU.rollNext, filter: 'bandpass', freq: 1900 + k * 1600, q: 0.8, dur: 0.07, vol: 0.03 + 0.07 * k, bus: 'music' });
          A.tone({ when: AU.rollNext, type: 'triangle', freq: 190 + k * 60, dur: 0.05, vol: 0.03 + 0.04 * k, bus: 'music' });
          AU.rollNext += step;
        }
        void el2;
      }
      function startBuild() {
        if (!A.ctx || !AU.mix) return;
        const c = A.ctx, t = c.currentTime; AU.buildT = t + 0.05; AU.rollNext = 0;
        AU.riser = A.noise({ when: AU.buildT, filter: 'highpass', freq: 250, to: 6500, q: 0.9, dur: BAR * 2, attack: BAR * 1.9, vol: 0.16, bus: 'music' });
        ['a', 'b'].forEach(k => { const f = DK[k].hp.frequency; f.cancelScheduledValues(t); f.setValueAtTime(20, t); f.exponentialRampToValueAtTime(650, t + BAR * 2); });
        A.tone({ when: AU.buildT, type: 'sawtooth', freq: 110, to: 440, glide: BAR * 2, dur: BAR * 2, vol: 0.04, lp: 1800, bus: 'music' });
      }
      function finaleDrop() {
        if (ST.phase !== 'build') return;
        const j = judgeTap(), at = j.startAt; ST.phase = 'dropping'; K.guide(null); dropBtn.classList.add('idle');
        ST.drops.push(j.grade); ctx.track('drop', { g: j.grade, fin: 1 });
        K.sfx.tap();
        K.pop(j.grade === 'perfect' ? 'On the one!' : j.grade === 'good' ? 'Here we go!' : 'Here we go!', { x: R.drop.cx, y: R.drop.cy - R.drop.r - 26, kind: j.grade === 'perfect' ? 'great' : 'good' });
        if (A.ctx && AU.mix) {
          const c = A.ctx;
          ['a', 'b'].forEach(k => { const f = DK[k].hp.frequency; f.cancelScheduledValues(c.currentTime); f.setValueAtTime(f.value, c.currentTime); f.setValueAtTime(20, at); });
          if (AU.riser) { try { AU.riser.stop(at); } catch (e) { /* stopped */ } }
          A.kick(at, 0.5); A.noise({ when: at, filter: 'highpass', freq: 4000, dur: 1.6, vol: 0.18, bus: 'music' }); A.tone({ when: at, type: 'sine', freq: 60, to: 30, glide: 1, dur: 1.2, vol: 0.4, bus: 'music' });
          if (AU.bufs.drop) { const s = c.createBufferSource(); s.buffer = AU.bufs.drop; s.loop = true; s.connect(AU.dropG); s.start(at, posAt(at)); AU.dropSrc = s; AU.dropG.gain.setValueAtTime(0.0001, at); AU.dropG.gain.exponentialRampToValueAtTime(0.9, at + 0.02); }
          else { AU.dropLive = true; AU.dropG.gain.setValueAtTime(0.9, at); }
        }
        S.later(() => finale(), Math.max(0, (at - aNow()) * 1000));
      }
      async function finale() {
        if (ST.phase === 'finale' || ST.finished) return;
        ST.phase = 'finale'; ST.fin = now(); K.guide(null); comboEl.hidden = true;
        ST.burst = 0.5; ST.flash = 1;
        if (XF.x < 0.4 || XF.x > 0.6) glideTo(0.5, 400);
        sCheer(1.2); S.later(() => sCheer(0.9), 1400);
        K.sfx.great();
        const tw = { t0: now() }; const lz = () => { const k2 = clamp((now() - tw.t0) / 700, 0, 1); ST.laser = k2; if (k2 < 1 && !ST.finished) S.later(lz, 40); }; lz();
        K.finale('fireworks', { from: [{ x: M.w * 0.15, y: R.booth.top }, { x: M.w * 0.5, y: R.booth.top }, { x: M.w * 0.85, y: R.booth.top }], colors: [A_COL, B_COL, AND_COL, '#ffffff', '#b98bff'], count: reduced() ? 3 : M.phone ? 7 : 10, ms: 7600, z: 21, sound: false });
        boardEncore();
        sync.base('celebrate'); sync.say(L(SY.end), { mood: 'celebrate', ms: 0 });
        loopie.show(true); loopie.base('love'); signEl.hidden = true;
        if (rush) { rush.show(true); rush.base('celebrate'); }
        const n = Math.max(1, LINES.length), per = BAR * (n > 2 ? 1.5 : 2) * 1000;
        for (let i = 0; i < n; i++) { encEls.forEach((e2, j) => e2.classList.toggle('on', j === i)); if (A.ctx) sAnd(0.5); await K.wait(reduced() ? 1400 : per); }
        encEls.forEach(e2 => e2.classList.add('on'));
        await K.wait(reduced() ? 900 : 1800);
        if (A.ctx && AU.mix) { const t = A.ctx.currentTime; AU.mix.gain.cancelScheduledValues(t); AU.mix.gain.setTargetAtTime(0.42, t, 0.8); }
        finishGame();
      }
      function finishGame() {
        if (ST.finished) return; ST.finished = true; ST.phase = 'end';
        const blendPct = ST.blends.length ? Math.round(ST.blends.reduce((a, b) => a + b, 0) / ST.blends.length) : 80;
        const dropSc = ST.drops.length ? ST.drops.reduce((a, gr) => a + (gr === 'perfect' ? 1 : gr === 'good' ? 0.75 : 0.45), 0) / ST.drops.length : 0.6;
        const scrSc = ST.scr ? clamp((ST.scrOn || 0) / ST.scr + 0.25, 0, 1) : 0.6;
        const sc = 0.45 * blendPct / 100 + 0.3 * dropSc + 0.25 * scrSc;
        const best = K.best('blend', blendPct, 'higher'), tier = K.tier(sc, [0.5, 0.7, 0.86]);
        const total = pool.length, fresh = [];
        LINES.forEach(l => { const r = K.collect('style:' + l.style.key); if (r.isNew) fresh.push(l.style.name); });
        const have = K.collection().filter(x => /^style:/.test(String(x))).length;
        const perfect = ST.drops.filter(x => x === 'perfect').length;
        const badges = [];
        if (best.isNew) badges.push('New best blend: ' + blendPct + '%'); else badges.push('Blend: ' + blendPct + '% centred');
        if (tier) badges.push(tier + ' DJ');
        if (fresh.length) badges.push('New in your crate: ' + fresh.slice(0, 2).join(', ') + ' (' + Math.min(have, STYLES.length) + '/' + STYLES.length + ')');
        else badges.push('Crate: ' + Math.min(have, STYLES.length) + '/' + STYLES.length + ' styles');
        const pick = LINES[1] || LINES[0];
        const ln1 = pick ? clip((pick.a.q ? pick.a.pre + '“' + pick.a.q + '”' : pick.a.t) + ' AND ' + pick.b, 92) : 'Both decks played together';
        const lines = [ln1, LINES.length + ' both/and lines · ' + perfect + ' perfect drop' + (perfect === 1 ? '' : 's'), care ? 'Next step: proper advice from someone qualified.' : 'Only one deck got heavy. Both won the room.'];
        ctx.track('finish', { lines: LINES.length, blend: blendPct, perfect, scr: ST.scr });
        void total;
        ctx.finish({ title: strong ? 'Real AND handled' : 'Both decks, all night', mood: 'celebrate', lines, share: 'Mixed “I’m struggling” AND “I’m coping”. The crowd loved it.', badges: badges.slice(0, 4) });
        S.later(() => { if (sync) sync.base('cool'); }, 2400);
      }

      /* ---------------- the night's flow ---------------- */
      const until = async (fn, ms) => { const t0 = now(); while (!fn()) { if (ms && now() - t0 > ms) return false; await K.wait(50); } return true; };
      function guideCrate() {
        const s = sleeves[sleeves.length - 1]; if (!s) return;
        K.guide({ id: 'crate', g: 'drag', target: s.el, dx: Math.round(R.dB.cx - s.cx), dy: Math.round(R.dB.cy - s.cy), label: 'DRAG A RECORD TO B', place: 'above', oy: 0.2, delay: 900, ms: 2000 });
      }
      function guideFader(id, x, label) { const dx = knobPx(x) - knobPx(XF.x); K.guide({ id, g: 'drag', target: () => ({ x: R.xf.x + knobPx(XF.x), y: R.xf.y + R.xf.h / 2 + 2 }), dx: Math.round(dx), dy: 0, label, place: 'above', delay: 500 }); }
      async function crateStep(r) {
        ST.phase = 'crate'; ST.round = r;
        openCrate();
        sync.say(L(r === 0 ? SY.crate : SY.crate2), { mood: r === 0 ? 'idea' : 'happy', ms: 3200 });
        guideCrate();
        await until(() => ST.phase === 'cue');
      }
      async function cueStep(r) {
        sync.say(L(r === 0 ? SY.cue : SY.swap), { mood: 'determined', ms: 3000 });
        K.guide({ id: 'cue', g: 'tap', target: dropBtn, label: 'TAP DROP ON THE 1', place: 'above', delay: 500 });
        await until(() => ST.phase === 'blend');
        K.guide(null);
      }
      async function blendStep(r) {
        resetFill();
        await K.wait(reduced() ? 150 : 350);
        if (r === 0) sync.say(L(SY.blend), { mood: 'cool', ms: 3200 });
        guideFader('blend', 0.5, 'SLIDE TO THE MIDDLE');
        await until(() => ST.phase === 'locked');
        await K.wait(reduced() ? 2000 : 3100);
      }
      function lockBlend() {
        ST.phase = 'locked'; K.guide(null);
        const rec = DK.b.rec; rec.used = true;
        const aSide = A_SIDES[ST.round % A_SIDES.length], line = { a: aSide, b: rec.line, tag: rec.tag, style: rec.style };
        LINES.push(line);
        const pct = clamp(Math.round(100 - (FILL.t ? FILL.dev / FILL.t : 0.1) * 200), 40, 100); ST.blends.push(pct);
        boardAnd(line);
        Array.from(pips.children).forEach((p, i) => p.classList.toggle('on', i < LINES.length)); pips.setAttribute('aria-label', 'Both/and lines: ' + LINES.length + ' of ' + ROUNDS);
        sAnd(0.85); sCheer(1); K.sfx.great();
        ST.burst += 0.4; ST.flash = 1;
        const cols = [A_COL, B_COL, AND_COL, '#ffffff'];
        P.emit('confetti', R.dA.cx, R.booth.top, M.phone ? 18 : 30, { angle: -Math.PI / 2 + 0.3, spread: 0.8, speed: [260, 480], colors: cols });
        P.emit('confetti', R.dB.cx, R.booth.top, M.phone ? 18 : 30, { angle: -Math.PI / 2 - 0.3, spread: 0.8, speed: [260, 480], colors: cols });
        sync.say(L(SY.lock[Math.min(SY.lock.length - 1, ST.round)]), { mood: ST.round === 0 ? 'wow' : 'happy', ms: 3200 });
        if (!reduced()) sync.react('bounce');
        ctx.track('lock', { r: ST.round + 1, pct });
      }
      async function twistA() {
        ST.phase = 'request';
        loopie.show(true); loopie.base('determined'); showSign('loopie', 'a');
        loopie.say(L(LO.request), { mood: 'determined', ms: 3400 });
        boardReq('a');
        if (A.ctx) { A.tone({ type: 'sine', freq: 880, to: 1320, glide: 0.12, dur: 0.25, vol: 0.06 }); }
        await K.wait(reduced() ? 600 : 1400);
        sync.say(L(SY.request), { mood: 'think', ms: 3200 });
        guideFader('reqA', 0, 'GIVE THEM DECK A');
        await until(() => XF.x <= 0.08 && !XF.glide);
        ST.phase = 'onlyA'; ST.onlyT = now(); K.guide(null); ST.burst += 0.22; sCheer(0.6);
        signEl.hidden = true; loopie.say(L(LO.yay), { mood: 'celebrate', ms: 1800 });
        boardNowA();
        await K.wait(reduced() ? 1600 : 3100);
        loopie.say(L(LO.drained), { mood: 'sleepy', ms: 3000 });
        await K.wait(reduced() ? 500 : 1100);
        sync.say(L(SY.drained), { mood: 'think', ms: 3600 });
        ST.phase = 'blendBack'; resetFill();
        guideFader('back', 0.5, 'BLEND B BACK IN');
        await until(() => ST.phase === 'liked');
        K.guide(null); ST.burst += 0.55; ST.flash = 1; sCheer(1.3); K.sfx.great(); sAnd(0.7);
        boardAnd(LINES[LINES.length - 1]);
        loopie.say(L(LO.better), { mood: 'love', ms: 2800 });
        await K.wait(reduced() ? 400 : 900);
        sync.say(L(SY.liked), { mood: 'celebrate', ms: 2800 });
        if (!reduced()) loopie.react('bounce');
        await K.wait(reduced() ? 1600 : 2500);
        loopie.show(false);
      }
      async function twistB() {
        if (!rush) return;
        ST.phase = 'reqB';
        rush.show(true); rush.base('speed'); showSign('rush', 'b');
        rush.say(L(RU.request), { mood: 'determined', ms: 3200 });
        boardReq('b');
        await K.wait(reduced() ? 600 : 1300);
        sync.say(L(SY.reqB), { mood: 'think', ms: 3000 });
        guideFader('reqB', 1, 'GIVE THEM DECK B');
        await until(() => XF.x >= 0.92 && !XF.glide);
        ST.phase = 'onlyB'; ST.onlyT = now(); K.guide(null); ST.burst += 0.15; signEl.hidden = true;
        await K.wait(reduced() ? 1500 : 3000);
        rush.say(L(RU.drained), { mood: 'confused', ms: 2800 });
        await K.wait(reduced() ? 500 : 1100);
        sync.say(L(SY.drainedB), { mood: 'think', ms: 3400 });
        ST.phase = 'blendBack2'; resetFill();
        guideFader('back2', 0.5, 'BLEND A BACK IN');
        await until(() => ST.phase === 'likedB');
        K.guide(null); ST.burst += 0.5; ST.flash = 1; sCheer(1.2); K.sfx.great(); sAnd(0.7);
        boardAnd(LINES[LINES.length - 1]);
        rush.say(L(RU.better), { mood: 'celebrate', ms: 2600 });
        await K.wait(reduced() ? 400 : 900);
        sync.say(L(SY.likedB), { mood: 'cool', ms: 2600 });
        await K.wait(reduced() ? 1500 : 2600);
        rush.show(false);
      }
      async function scratchStep() {
        ST.phase = 'scratch'; ST.scr = 0; ST.scrOn = 0;
        if (XF.x < 0.35 || XF.x > 0.65) glideTo(0.5, 400);
        comboEl.replaceChildren(document.createTextNode('AND × '), h('b', { text: '0' })); comboEl.hidden = false;
        boardMsg('Scratch in the', 'AND', 'circle the record, back and forth', AND_COL);
        sync.say(L(SY.scratch), { mood: 'cool', ms: 3400 });
        K.guide({ id: 'scratch', g: 'circle', target: platB, r: Math.round(R.dB.r * 0.55), label: 'SCRATCH IN THE AND', delay: 600 });
        await until(() => ST.phase === 'scratched');
        if (SC.on) await until(() => !SC.on, 2500);
        K.guide(null); ST.burst += 0.4; sCheer(1.2); K.sfx.great();
        sync.say(L(SY.scratched), { mood: 'wow', ms: 2400 });
        await K.wait(reduced() ? 800 : 1600);
        comboEl.hidden = true;
      }
      async function buildStep() {
        ST.phase = 'build';
        startBuild();
        boardMsg('Both decks · ready', 'Here comes the drop', null, AND_COL);
        sync.say(L(SY.build), { mood: 'determined', ms: 3200 });
        K.guide({ id: 'drop', g: 'tap', target: dropBtn, label: 'DROP IT ON THE 1', place: 'above', delay: 500 });
        await until(() => ST.phase === 'finale' || ST.finished);
      }

      cv.onResize(layout);
      cvBg.onResize(() => { bg.key = ''; });
      S.on('theme', () => { bg.key = ''; spr.key = ''; });
      setKnob();
      (async () => {
        await K.intro({ title: 'Both/And DJ', sub: 'Rooftop party. Deck A plays the thought that’s been on repeat. Deck B holds what’s also true.', how: 'Start the beat. Load Deck B. Slide the crossfader until both play.', char: 'sync', mood: 'cool' });
        ST.phase = 'startA'; boardVenue();
        sync.say(L(SY.hello), { mood: 'cool', ms: 3400 });
        K.guide({ id: 'start', g: 'tap', target: startBtn, label: 'TAP: START DECK A', delay: 600 });
        await until(() => ST.aOn);
        boardNowA();
        loopie.show(true); loopie.base('happy');
        await K.wait(reduced() ? 400 : 900);
        loopie.say(L(LO.hi), { mood: 'happy', ms: 2600 });
        await K.wait(reduced() ? 900 : 2000);
        sync.say(L(SY.heavy), { mood: strong ? 'think' : 'cool', ms: 3000 });
        await K.wait(reduced() ? 700 : 1400);
        loopie.show(false);
        for (let r = 0; r < ROUNDS; r++) {
          await crateStep(r);
          await cueStep(r);
          await blendStep(r);
          if (r === 0) await twistA();
          if (r === 1 && TRAP_B) await twistB();
        }
        await scratchStep();
        await buildStep();
      })();

      return {
        async autoplay() {
          const tapOnOne = async (btn) => { if (AU.T0) { const f = frac((heardNow() - AU.T0) / BAR), toNext = (1 - f) * BAR; if (toNext > 0.12 && toNext < BAR - 0.05) await K.wait(Math.max(0, (toNext - 0.03) * 1000)); } await K.sim.tap(btn); };
          const fadeTo = async (x, ms) => { const r = K.rectIn(xfEl); await K.sim.drag(xfEl, { x: knobPx(XF.x), y: r.h / 2 }, { x: knobPx(x), y: r.h / 2 }, ms, 10); };
          const scratchIt = async () => {
            const r = K.rectIn(platB), cx = r.w / 2, cy = r.h / 2, rad = r.w * 0.36;
            let a = -1.9; const pr = await K.sim.press(platB, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
            for (let i = 0; i < STROKES + 4 && ST.phase === 'scratch'; i++) { const dir = i % 2 ? -1 : 1; for (let st = 0; st < 5; st++) { await K.wait(BEAT * 1000 / 2 / 5); a += dir * 0.8 / 5; pr.move(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); } }
            pr.up(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
          };
          const t0 = now();
          while (!ST.finished && now() - t0 < 140000) {
            const ph = ST.phase;
            if (ph === 'startA' && !DK.a.on) { await K.wait(400); await K.sim.tap(startBtn); }
            else if (ph === 'crate' && sleeves.length && !crate.hidden) {
              await K.wait(500);
              const sl = sleeves[sleeves.length - 1];
              if (sl && ST.phase === 'crate') { const sr = K.rectIn(sl.el); await K.sim.drag(sl.el, { x: sr.w / 2, y: sr.h / 2 }, { x: R.dB.cx - sr.x, y: R.dB.cy - sr.y }, 600, 10); if (ST.phase === 'crate') await K.sim.tap(sl.el); }
            }
            else if (ph === 'cue') { await K.wait(300); if (ST.phase === 'cue') await tapOnOne(dropBtn); }
            else if ((ph === 'blend' || ph === 'blendBack' || ph === 'blendBack2') && Math.abs(XF.x - 0.5) > 0.06 && !XF.glide) { await K.wait(300); await fadeTo(0.5, 700); }
            else if (ph === 'request' && XF.x > 0.08 && !XF.glide) { await K.wait(500); await fadeTo(0.02, 600); }
            else if (ph === 'reqB' && XF.x < 0.92 && !XF.glide) { await K.wait(500); await fadeTo(0.98, 600); }
            else if (ph === 'scratch' && DK.b.on) { await K.wait(500); if (ST.phase === 'scratch') await scratchIt(); }
            else if (ph === 'build') { await K.wait(500); if (ST.phase === 'build') await tapOnOne(dropBtn); }
            await K.wait(100);
          }
          await until(() => ST.finished, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
