/* 028 Mirror Dance — Reset · CONNECT · Social / Team / Perspective
 * Mechanism: interpersonal synchrony (Hove & Risen 2009; Tarr, Launay & Dunbar 2014, 2015): moving in time with other
 * people lifts mood and builds closeness and trust. On a light-up disco floor Sync dances four beats and you mirror them
 * (call and response); the cast moves with you as one, every matched move lights the floor and adds a layer to the band.
 * Halfway the roles swap: you make up the moves and the whole cast copies you, on the beat (being mirrored feels good
 * too). Misses never fail: the music keeps going and the next phrase comes round.
 * Verb: mirror (swipe left, right, up, down, tap to clap, draw a circle to spin, on the beat). Twist: you lead.
 * Finale: the whole cast in a conga line under a spinning mirror ball and sweeping spotlights; you strike a pose and the
 * night freezes into a polaroid.
 */
(function (env) {
  'use strict';
  const ID = 'mirror-dance';
  const TAU = Math.PI * 2;

  /* The six moves (and the pose a beat becomes when you lead with nothing): gesture, colour, icon, stereo position. */
  const MOVES = {
    L: { name: 'Left', c: '#3fe0ff', c2: '#00779c', g: 'drag', dir: 'l', label: 'SWIPE LEFT', icon: 'arrow', rot: 180, pan: -0.55 },
    R: { name: 'Right', c: '#ff5cb8', c2: '#b4106a', g: 'drag', dir: 'r', label: 'SWIPE RIGHT', icon: 'arrow', rot: 0, pan: 0.55 },
    U: { name: 'Up', c: '#ffd84a', c2: '#8a6300', g: 'drag', dir: 'u', label: 'SWIPE UP', icon: 'arrow', rot: -90, pan: 0 },
    D: { name: 'Down', c: '#b897ff', c2: '#5634c4', g: 'drag', dir: 'd', label: 'SWIPE DOWN', icon: 'arrow', rot: 90, pan: 0 },
    C: { name: 'Clap', c: '#ffa040', c2: '#a14e00', g: 'tap', label: 'TAP TO CLAP', icon: 'clap', rot: 0, pan: 0 },
    S: { name: 'Spin', c: '#4ef59c', c2: '#08834a', g: 'circle', label: 'CIRCLE TO SPIN', icon: 'spin', rot: 0, pan: 0 },
    P: { name: 'Pose', c: '#ffffff', c2: '#4b4566', g: 'tap', label: 'TAP: STRIKE A POSE', icon: 'pose', rot: 0, pan: 0 },
    h: { name: 'Step', c: '#ffd84a', c2: '#8a6300', icon: 'arrow', rot: -90, pan: 0 },
    K: { name: 'Kick!', c: '#ff5cb8', c2: '#b4106a', icon: 'pose', rot: 0, pan: 0 }
  };
  const MKEYS = 'LRUDCSP';
  const ICON = {
    arrow: '<path d="M4.5 12h14M12.5 5.5L19 12l-6.5 6.5"/>',
    clap: '<path d="M12 2.8v3.4M12 17.8v3.4M2.8 12h3.4M17.8 12h3.4M5.5 5.5l2.4 2.4M16.1 16.1l2.4 2.4M18.5 5.5l-2.4 2.4M7.9 16.1l-2.4 2.4"/><circle cx="12" cy="12" r="2.6"/>',
    spin: '<path d="M18.8 13.4A7 7 0 1 1 16.9 7"/><path d="M17.6 2.9l-.4 4.5-4.4-.6"/>',
    pose: '<path d="M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.6l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
    ask: '<path d="M9.2 9.3a2.9 2.9 0 1 1 4.3 2.5c-.9.5-1.5 1.1-1.5 2.1v.6"/><path d="M12 17.6v.2"/>'
  };

  /* Tonight's floor: a different one each day, each with a night (dark) and a matinee (bright) palette. */
  const FLOORS = [
    { id: 'disco', name: 'Seventies Disco',
      d: { wall: ['#14051a', '#3a0c31', '#62163f'], glow: '#ff7a3d', floor: '#1b0a1d', grout: '#060107', edge: '#ffcf6b', tiles: ['#ff3d8b', '#ffb02e', '#ffe45c', '#ff6a3d', '#c04dff'], deco: '#ffcf6b', beam: '#ffe6bf', panel: 'rgba(26,8,30,0.86)' },
      b: { wall: ['#ffe4cf', '#ffc6b4', '#f59ab6'], glow: '#fff3cf', floor: '#4e1d45', grout: '#2a0b25', edge: '#ffe08a', tiles: ['#ff2f7e', '#ff9a1f', '#ffd43a', '#ff5a2a', '#a83cf0'], deco: '#e0a03a', beam: '#fff4dc', panel: 'rgba(255,249,246,0.93)' } },
    { id: 'neon', name: 'Neon Grid',
      d: { wall: ['#02030b', '#0d0a33', '#2c0d58'], glow: '#ff2bd6', floor: '#06051a', grout: '#1ee8ff', edge: '#1ee8ff', tiles: ['#18e7ff', '#ff2bd6', '#7b5cff', '#29ffb0', '#ffd23f'], deco: '#ff2bd6', sun: ['#ffe066', '#ff3d9a'], beam: '#c8f9ff', panel: 'rgba(6,6,28,0.88)' },
      b: { wall: ['#cbc2ff', '#efc4f1', '#ffc4da'], glow: '#ffffff', floor: '#241a5e', grout: '#5ff4ff', edge: '#5ff4ff', tiles: ['#12d6f0', '#ff1fc8', '#7a5cff', '#16e09a', '#ffc21f'], deco: '#ff1fc8', sun: ['#ffd84a', '#ff4f9f'], beam: '#ffffff', panel: 'rgba(252,250,255,0.93)' } },
    { id: 'garden', name: 'Garden Party',
      d: { wall: ['#071226', '#1d2a52', '#4d3f6e'], glow: '#ffc87a', floor: '#2b1b12', grout: '#130a06', edge: '#ffd890', tiles: ['#ffd27a', '#ff9db8', '#9fe3a8', '#8fd3ff', '#ffb36b'], hedge: '#0c241e', hedge2: '#14382b', tree: '#0a1d18', deco: '#ffd890', beam: '#fff0c8', panel: 'rgba(14,16,32,0.86)' },
      b: { wall: ['#ffdcab', '#ffbc98', '#f59c9c'], glow: '#fff6dc', floor: '#7a5136', grout: '#4b2f1c', edge: '#fff0c4', tiles: ['#ffb42e', '#ff6f9c', '#4fcf6e', '#3aa6ef', '#ff8a3a'], hedge: '#2f6b44', hedge2: '#3f8152', tree: '#2a4d33', deco: '#fff1c8', beam: '#fffaf0', panel: 'rgba(255,252,246,0.93)' } }
  ];

  /* The phrase book: new moves arrive one round at a time (side to side, up and down, clap, spin), then mixes.
     Each round has daily variants, so the routine changes from day to day. */
  const PHRASES = [
    [['L', 'R', 'L', 'R'], ['R', 'L', 'R', 'L']],
    [['U', 'D', 'U', 'D'], ['L', 'R', 'U', 'D'], ['U', 'U', 'D', 'D']],
    [['L', 'R', 'C', 'C'], ['C', 'U', 'C', 'D'], ['U', 'D', 'C', 'C']],
    [['L', 'R', 'S', 'C'], ['U', 'D', 'S', 'C'], ['C', 'C', 'S', 'S']],
    [['S', 'C', 'L', 'R'], ['U', 'L', 'D', 'R'], ['L', 'S', 'R', 'C']],
    [['L', 'U', 'R', 'S'], ['C', 'S', 'C', 'U'], ['D', 'U', 'S', 'C']],
    [['U', 'S', 'D', 'C'], ['R', 'R', 'S', 'C'], ['S', 'L', 'S', 'R']]
  ];

  /* Your routines get names (always the same name for the same four moves): the move book you fill over visits. */
  const SOLO = { L: 'The Moonwalk', R: 'The Conveyor Belt', U: 'The Pogo', D: 'The Limbo', C: 'The Standing Ovation', S: 'The Washing Machine', P: 'The Statue' };
  const CLASSIC = ['The Sprinkler', 'The Shopping Trolley', 'The Lawnmower', 'The Funky Chicken', 'The Robot', 'The Running Man', 'The Hustle', 'The Bus Stop',
    'The Bump', 'The Hand Jive', 'The Mashed Potato', 'The Swim', 'The Pony', 'The Toaster', 'The Jelly Wobble', 'The Disco Kettle'];
  const MOVE_BOOK = 7 + 6 + CLASSIC.length;
  function routineName(seq) {
    const s = seq.join(''), set = new Set(seq);
    if (set.size === 1) return SOLO[seq[0]];
    if (/^(LR|RL){2}$/.test(s)) return 'The Windscreen Wiper';
    if (/^(UD|DU){2}$/.test(s)) return 'The Yo-Yo';
    if (s === 'LLRR' || s === 'RRLL') return 'The Grapevine';
    if (s === 'UUDD' || s === 'DDUU') return 'The Elevator';
    if (set.size === 4 && ['L', 'R', 'U', 'D'].every(x => set.has(x))) return 'The Compass';
    if (set.size === 2 && set.has('S') && set.has('C')) return 'The Disco Twirl';
    let hs = 7; for (const ch of s) hs = (hs * 31 + ch.charCodeAt(0)) >>> 0;
    return CLASSIC[hs % CLASSIC.length];
  }

  /* The troupe. Each dances in character: Sync leads big, Loopie does everything twice, Rush double time,
     Still in slow motion, Glitch like a robot, Drop with happy tears. */
  const TROUPE = [
    { slug: 'sync', style: 'lead', voice: 640, glow: '#49c6ff' },
    { slug: 'patch', style: 'warm', voice: 520, glow: '#ff9a3d' },
    { slug: 'loopie', style: 'loop', voice: 700, glow: '#b26bff' },
    { slug: 'rush', style: 'double', voice: 760, glow: '#ff4d4d', tag: 'Rush: double time' },
    { slug: 'still', style: 'slow', voice: 430, glow: '#cfe8ff', tag: 'Still: slow motion' },
    { slug: 'drop', style: 'emo', voice: 560, glow: '#4da6ff', tag: 'Drop: happy tears' },
    { slug: 'glitch', style: 'robot', voice: 900, glow: '#ff4fd8', tag: 'Glitch: robot mode' }
  ];
  const POSE_FACE = { sync: 'cool', patch: 'love', loopie: 'dizzy', rush: 'celebrate', still: 'happy', drop: 'celebrate', glitch: 'cool' };
  const FACES = ['happy', 'laugh', 'wow', 'cool', 'celebrate', 'love', 'wink', 'think', 'surprised', 'determined', 'dizzy', 'calm', 'cry', 'confused'];

  /* The band: Am7 | Dm7 | G7 | Cmaj7, four on the floor. Layers arrive as you match. */
  const PROG = [
    { bass: 'A1', chord: ['A3', 'C4', 'E4', 'G4'], top: ['E5', 'G5', 'A5'] },
    { bass: 'D2', chord: ['A3', 'C4', 'D4', 'F4'], top: ['D5', 'F5', 'A5'] },
    { bass: 'G1', chord: ['G3', 'B3', 'D4', 'F4'], top: ['D5', 'G5', 'B5'] },
    { bass: 'C2', chord: ['G3', 'C4', 'E4', 'B4'], top: ['E5', 'G5', 'C6'] }
  ];
  const HOOK = ['A4', null, 'C5', 'A4', 'D5', null, 'C5', null, 'E5', null, 'D5', 'C5', 'A4', null, 'G4', null];
  const LADDER = ['A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'A6'];
  const LAYER_NAMES = ['Hi-hats', 'Handclaps', 'Funk guitar', 'Strings', 'The hook'];

  function softwareGfx() {
    try {
      const c = document.createElement('canvas'), gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info'), r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r);
    } catch (e) { return false; }
  }
  const mixHex = (a, b, k) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), m = (s) => Math.round(((pa >> s) & 255) + ((((pb >> s) & 255) - ((pa >> s) & 255)) * k));
    return '#' + ((1 << 24) + (m(16) << 16) + (m(8) << 8) + m(0)).toString(16).slice(1);
  };
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const outBack = (k) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };

  (env.games = env.games || []).push({
    id: ID, mode: 'reset', name: 'Mirror Dance', verb: 'mirror', family: 'CONNECT', minutes: 2,
    parents: ['Social / Team / Perspective', 'Positive State', 'Emotion'],
    cast: ['sync', 'patch', 'loopie'], poster: { char: 'sync', mood: 'laugh' },
    tagline: 'Mirror the cast’s moves on the beat, then lead and they copy you.',
    why: 'For feeling apart: moving in time with others lifts mood and brings people closer.',
    fonts: ['Tilt+Neon', 'Righteous', 'Lexend:wght@500;600;700'],
    css: `
.g-mirror-dance { --md-display: "Righteous", "TeX Gyre Adventor", "Avant Garde", "Poppins", "Futura", system-ui, sans-serif; --md-neon: "Tilt Neon", "Righteous", "TeX Gyre Adventor", "Poppins", sans-serif;
  --md-ui: "Lexend", "Poppins", "Inter", system-ui, sans-serif; --md-panel: rgba(26, 8, 30, 0.86); --md-ink: #fff5fb; --md-muted: #e0d0ee; --md-line: rgba(255, 255, 255, 0.18); background: #13061a; }
.g-mirror-dance.md-bright { --md-ink: #2b1236; --md-muted: #5e4470; --md-line: rgba(43, 18, 54, 0.18); background: #ffe2cf; }
.g-mirror-dance .gk-intro { background: radial-gradient(ellipse at 50% 38%, rgba(128, 30, 112, 0.66), rgba(10, 4, 22, 0.93)); -webkit-backdrop-filter: none; backdrop-filter: none; color: #fff; }
.g-mirror-dance .gk-intro-title { font-family: var(--md-neon); font-weight: 400; font-size: clamp(44px, 13cqw, 78px); line-height: 1.05; letter-spacing: 0.01em; color: #fff4fb; padding: 0 6px;
  text-shadow: 0 0 6px #ff5cb8, 0 0 18px #ff3d9a, 0 0 40px #b84dff; }
.g-mirror-dance .gk-intro-sub { color: #f6eaff; font-family: var(--md-ui); }
.g-mirror-dance .gk-intro-how { color: #ffd84a; font-family: var(--md-ui); }
.g-mirror-dance .gk-intro-tap { color: #f1e6ff; }
.g-mirror-dance .md-pad { position: absolute; left: 0; right: 0; bottom: 0; top: calc(env(safe-area-inset-top, 0px) + 150px); z-index: 29; touch-action: none; cursor: pointer; -webkit-tap-highlight-color: transparent; outline: none; }
.g-mirror-dance .md-pad:focus-visible { box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.85); }
.g-mirror-dance .md-dancer .gk-char-img { transform-origin: 50% 55%; will-change: translate, rotate, scale; }
.g-mirror-dance .md-dancer { will-change: transform; }
.g-mirror-dance .md-dancer.gk-side-above .gk-bubble { bottom: calc(100% + 40px); }
.g-mirror-dance .md-dancer .gk-bubble { font-family: var(--md-ui); }
.g-mirror-dance .md-hud { position: absolute; z-index: 36; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 16px); width: min(390px, calc(100% - 20px)); height: 128px; box-sizing: border-box;
  padding: 10px 12px 12px; border-radius: 22px; background: var(--md-panel); border: 1px solid var(--md-line); color: var(--md-ink); font-family: var(--md-ui); display: flex; flex-direction: column; gap: 8px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.12); pointer-events: none; transform: translateX(-50%); transition: transform 0.7s cubic-bezier(.3, 1.25, .5, 1), opacity 0.5s ease; }
.g-mirror-dance .md-hud.md-away { transform: translate(-50%, calc(100% + 40px)); opacity: 0; }
.g-mirror-dance .md-hud-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; height: 22px; padding: 0 4px; }
.g-mirror-dance .md-phase { flex: 1; min-width: 0; font: 400 16px/1.1 var(--md-display); letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--md-ink); }
.g-mirror-dance .md-meta { display: flex; align-items: center; gap: 10px; flex: none; }
.g-mirror-dance .md-streak { font: 600 13px/1 var(--md-ui); font-variant-numeric: tabular-nums; color: var(--md-muted); white-space: nowrap; }
.g-mirror-dance .md-eq { display: flex; align-items: flex-end; gap: 3px; height: 18px; }
.g-mirror-dance .md-eq i { width: 5px; height: 6px; border-radius: 2px; background: var(--md-line); transition: background 0.3s ease, height 0.12s ease; }
.g-mirror-dance .md-eq i.on { background: var(--c, #ffd84a); height: var(--h, 12px); }
.g-mirror-dance .md-slots { flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.g-mirror-dance .md-slot { position: relative; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; border: 1.5px dashed var(--md-line);
  color: var(--md-muted); background: transparent; transition: transform 0.12s ease, background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, opacity 0.25s ease; }
.g-mirror-dance .md-ico { display: block; width: 30px; height: 30px; }
.g-mirror-dance .md-ico svg { display: block; width: 30px; height: 30px; fill: none; stroke: currentColor; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; transform: rotate(var(--rot, 0deg)); }
.g-mirror-dance .md-slot b { font: 600 12px/1 var(--md-ui); letter-spacing: 0.1em; text-transform: uppercase; }
.g-mirror-dance .md-slot.md-show { border-style: solid; border-color: color-mix(in srgb, var(--c) 72%, transparent); color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); }
.g-mirror-dance .md-slot.md-now { transform: scale(1.07); box-shadow: 0 0 0 2px var(--c, var(--md-ink)), 0 0 22px color-mix(in srgb, var(--c, #ffffff) 55%, transparent); border-style: solid; }
.g-mirror-dance .md-slot.md-hit { background: color-mix(in srgb, var(--c) 36%, transparent); box-shadow: 0 0 18px color-mix(in srgb, var(--c) 60%, transparent); }
.g-mirror-dance .md-slot.md-ok { background: color-mix(in srgb, var(--c) 24%, transparent); }
.g-mirror-dance .md-slot.md-off { border-style: dashed; }
.g-mirror-dance .md-slot.md-miss { opacity: 0.5; }
.g-mirror-dance .md-slot.md-hit::after, .g-mirror-dance .md-slot.md-ok::after { content: ""; position: absolute; top: 6px; right: 6px; width: 9px; height: 9px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px var(--c); }
.g-mirror-dance.md-bright .md-slot.md-show { background: color-mix(in srgb, var(--c) 10%, #ffffff); }
.g-mirror-dance .md-coat { position: absolute; z-index: 22; left: 12px; top: calc(env(safe-area-inset-top, 0px) + 70px); width: max-content; max-width: min(160px, 38%); box-sizing: border-box; padding: 8px 11px 9px;
  border-radius: 6px 6px 12px 12px; background: #fff4da; color: #3a2210; box-shadow: 0 8px 18px rgba(0, 0, 0, 0.32); transform-origin: 50% -12px; pointer-events: none;
  animation: mirror-dance-swing 1.6s ease-out both; transition: opacity 0.6s ease, transform 0.6s ease; }
.g-mirror-dance .md-coat::before { content: ""; position: absolute; left: 50%; top: -13px; width: 14px; height: 13px; margin-left: -9px; border: 2.5px solid #c9b48a; border-bottom: 0; border-radius: 10px 10px 0 0; }
.g-mirror-dance .md-coat::after { content: ""; position: absolute; left: 50%; top: 7px; width: 7px; height: 7px; margin-left: -3.5px; border-radius: 50%; background: rgba(58, 34, 16, 0.25); }
.g-mirror-dance .md-coat.md-gone { animation: mirror-dance-leave 0.7s ease both; }
@keyframes mirror-dance-leave { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(-16px) rotate(-7deg); } }
.g-mirror-dance .md-coat-k { display: block; margin: 8px 0 4px; font: 700 12px/1 var(--md-ui); letter-spacing: 0.12em; text-transform: uppercase; color: #a3561f; }
.g-mirror-dance .md-coat-v { display: block; font: 600 15px/1.2 var(--md-ui); overflow-wrap: anywhere; }
@keyframes mirror-dance-swing { 0% { opacity: 0; transform: translateY(-18px) rotate(-14deg); } 30% { opacity: 1; transform: rotate(9deg); } 55% { transform: rotate(-5deg); } 75% { transform: rotate(2.5deg); } 100% { opacity: 1; transform: rotate(0deg); } }
.g-mirror-dance .md-pop { position: absolute; z-index: 38; left: 0; top: 0; transform: translate(-50%, -50%); font: 700 24px/1 var(--md-display); font-synthesis: none; letter-spacing: 0.04em; color: #fff; white-space: nowrap; pointer-events: none;
  text-shadow: 0 0 9px var(--c), 0 0 20px var(--c), 0 2px 3px rgba(0, 0, 0, 0.5); animation: mirror-dance-pop 0.95s ease-out both; }
.g-mirror-dance .md-pop.md-big { font-family: var(--md-neon); font-size: clamp(30px, 8.6cqw, 52px); line-height: 1.05; white-space: normal; width: max-content; max-width: calc(100% - 28px); text-align: center; text-wrap: balance;
  animation: mirror-dance-big 1.7s cubic-bezier(.2, .9, .3, 1) both; }
.g-mirror-dance .md-pop.md-count { font-size: 46px; animation-duration: 0.5s; }
.g-mirror-dance .md-pop.md-small { font: 600 15px/1 var(--md-ui); letter-spacing: 0.08em; text-transform: uppercase; }
.g-mirror-dance .md-pop.md-out { animation: mirror-dance-out 0.28s ease-in forwards; }
.g-mirror-dance .md-pop.md-still { animation: none; }
@keyframes mirror-dance-out { from { opacity: 1; } to { opacity: 0; transform: translate(-50%, -60%) scale(0.92); } }
.g-mirror-dance.md-bright .md-pop { color: var(--c2, #2b1236); text-shadow: 0 1px 0 #fff, 0 0 10px rgba(255, 255, 255, 0.95), 0 0 22px rgba(255, 255, 255, 0.8); }
@keyframes mirror-dance-pop { 0% { opacity: 0; transform: translate(-50%, -30%) scale(0.7); } 20% { opacity: 1; transform: translate(-50%, -60%) scale(1.1); } 70% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -140%) scale(1); } }
@keyframes mirror-dance-big { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5) rotate(-6deg); } 14% { opacity: 1; transform: translate(-50%, -50%) scale(1.08) rotate(2deg); } 24% { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
  82% { opacity: 1; transform: translate(-50%, -54%) scale(1); } 100% { opacity: 0; transform: translate(-50%, -64%) scale(0.96); } }
.g-mirror-dance .md-flash { position: absolute; inset: 0; z-index: 41; background: #fff; pointer-events: none; animation: mirror-dance-flash 0.6s ease-out both; }
@keyframes mirror-dance-flash { from { opacity: 0.92; } to { opacity: 0; } }
.g-mirror-dance .md-photo { position: absolute; z-index: 40; left: 50%; width: min(calc(100% - 20px), 800px); top: calc(env(safe-area-inset-top, 0px) + 60px); bottom: calc(env(safe-area-inset-bottom, 0px) + 10px); box-sizing: border-box;
  transform: translateX(-50%) rotate(-0.6deg);
  border: solid #fbf7ee; border-width: 12px 12px 78px; border-radius: 4px; box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(0, 0, 0, 0.14), inset 0 0 40px rgba(255, 230, 200, 0.12); pointer-events: none;
  animation: mirror-dance-photo 0.8s cubic-bezier(.2, 1.2, .4, 1) both; }
@keyframes mirror-dance-photo { from { opacity: 0; transform: translateX(-50%) scale(1.06) rotate(-1.2deg); } to { opacity: 1; transform: translateX(-50%) scale(1) rotate(-0.6deg); } }
.g-mirror-dance .md-cap { position: absolute; left: 0; right: 0; bottom: -70px; height: 62px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; text-align: center; color: #2a1d2e; }
.g-mirror-dance .md-cap b { font: 400 19px/1.1 var(--md-display); letter-spacing: 0.02em; }
.g-mirror-dance .md-cap span { font: 500 13px/1.2 var(--md-ui); color: #6b5a6e; }
.g-mirror-dance .md-date { position: absolute; right: 12px; bottom: 10px; font: 700 15px/1 "Courier New", "Liberation Mono", monospace; color: #ff9a3a; letter-spacing: 0.1em; text-shadow: 0 0 6px rgba(255, 120, 30, 0.85); }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const inten = [0, 1, 2].includes(ctx.intensity) ? ctx.intensity : 1;
      const visits = K.visits(), dayN = K.daily();
      const line = (o) => ctx.line(o);
      let care = an.safety === 'care';
      const noWords = !String(ctx.text || '').trim();
      const dark = () => K.dark();
      let fq = ''; try { fq = (/[?&]mdfloor=([a-z]+)/.exec(window.location.search) || [])[1] || ''; } catch (e) { fq = ''; }
      let FI = FLOORS.findIndex(f => f.id === fq); if (FI < 0) FI = (dayN + 2) % FLOORS.length;
      const FL = FLOORS[FI], FL_NEXT = FLOORS[(FI + 1) % FLOORS.length];
      const BPM = [100, 108, 116][inten], SPB = 60000 / BPM;
      const ROUNDS = [5, 6, 7][inten], LEADS = [3, 4, 5][inten], WIN = [190, 150, 120][inten];
      const PATCH_AT = 2, LOOPIE_AT = Math.min(4, ROUNDS - 1);
      const CAMEOS = LEADS === 3 ? [['rush'], ['still', 'drop'], ['glitch']] : LEADS === 4 ? [['rush'], ['still'], ['drop'], ['glitch']] : [['rush'], ['still'], ['drop'], ['glitch'], []];
      const golden = visits >= 2;
      const lastRoutine = String(S.store.get(ID + ':last', '') || '');
      const SOFT = softwareGfx();
      const pal = () => FL[dark() ? 'd' : 'b'];
      if (ctx.analysisReady && ctx.analysisReady.then) ctx.analysisReady.then(a => { if (a && a.safety === 'care') care = true; }).catch(() => {});

      /* ---------------- the coat check: what the player brought waits here while they dance ---------------- */
      function coatPick() {
        if (noWords) return null;
        const pool = [an.core].concat(an.strands || []).filter(s => s && s.label && !s.generic);
        const social = pool.find(s => s.loop === 'mindread');
        return social || pool[0] || null;
      }
      const coatItem = coatPick();
      const coat = h('div', { class: 'md-coat', 'aria-label': 'Coat check' },
        h('span', { class: 'md-coat-k', text: 'Coat check' }),
        coatItem ? h('span', { class: 'md-coat-v gk-user', text: coatItem.label }) : h('span', { class: 'md-coat-v', text: 'Anything on your mind' }));
      coat.hidden = true;

      /* ---------------- scene ---------------- */
      el.classList.toggle('md-bright', !dark());
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFT ? 1.25 : 1.5 });
      const P = K.particles({ max: 280 });
      const pad = h('div', { class: 'md-pad', tabindex: '0', role: 'application', 'aria-label': 'Dance floor. Swipe left, right, up or down, tap to clap, draw a circle to spin. Arrow keys, Space to clap, Enter to spin.' });
      const phaseEl = h('span', { class: 'md-phase', role: 'status', text: 'Warm-up' });
      const streakEl = h('span', { class: 'md-streak', text: '' });
      const eqEl = h('span', { class: 'md-eq', 'aria-hidden': 'true' });
      for (let i = 0; i < 5; i++) eqEl.append(h('i'));
      const slots = [0, 1, 2, 3].map((i) => { const ico = h('span', { class: 'md-ico', 'aria-hidden': 'true' }); const nm = h('b', { text: String(i + 1) }); const s = h('div', { class: 'md-slot' }, ico, nm); return { el: s, ico, nm, m: undefined, st: '' }; });
      const hud = h('div', { class: 'md-hud md-away' }, h('div', { class: 'md-hud-top' }, phaseEl, h('span', { class: 'md-meta' }, streakEl, eqEl)), h('div', { class: 'md-slots' }, slots.map(s => s.el)));
      el.append(pad, hud, coat);

      /* the troupe (all built now, shown as they join) */
      const D = {}, order = [];
      TROUPE.forEach((t, i) => {
        const speaks = t.slug === 'sync' || t.slug === 'patch' || t.slug === 'loopie';
        const C = K.character(t.slug, { side: 'above', mood: 'happy', size: 80, x: 0, y: 0, shadow: false, decor: !speaks, voice: t.voice });
        C.el.classList.add('md-dancer');
        C.show(false);
        const d = Object.assign({}, t, { C, img: C.img, wrap: C.el, on: false, hx: 0, hy: 0, size: 80, tx: 0, ty: 0, depth: 1, moves: [], enter: null, groove: 1, side: i % 2 ? -1 : 1,
          o: { x: 0, y: 0, r: 0, sx: 1, sy: 1 }, s1: '', s2: '', s3: '', s4: '', freeze: null, conga: i, z: 0 });
        D[t.slug] = d; order.push(d);
        FACES.forEach(m => { if (K.MOODS[t.slug] && K.MOODS[t.slug][m]) { const im = new Image(); im.src = K.face(t.slug, m); } });
      });
      const present = () => order.filter(d => d.on && !d.entering);

      /* ---------------- clock: one beat timeline in page time; the band is scheduled against it ---------------- */
      const CLK = { t0: 0, on: false, shown: -1, sched: -1 };
      const beatAt = (i) => CLK.t0 + i * SPB;
      const beatPos = (ms) => (ms - CLK.t0) / SPB;
      const audioAt = (ms) => Math.max(A.ctx.currentTime, A.ctx.currentTime + (ms - performance.now()) / 1000 - A.latency());
      const BAND = { key: 1 };
      const nf = (n) => A.note(n) * BAND.key;
      const chordAt = (i) => PROG[((Math.floor(i / 4) % 4) + 4) % 4];

      /* ---------------- the plan: bar by bar ---------------- */
      const rng = K.rng(dayN * 13 + 5);
      const phrase = (r) => { const set = PHRASES[Math.min(r, PHRASES.length - 1)]; return set[Math.floor(rng() * set.length) % set.length].slice(); };
      const plan = [{ type: 'warm', k: 0 }, { type: 'warm', k: 1 }];
      for (let r = 0; r < ROUNDS; r++) { const mv = phrase(r); plan.push({ type: 'call', r, moves: mv }, { type: 'resp', r, moves: mv }); }
      plan.push({ type: 'swap', k: 0 }, { type: 'swap', k: 1 });
      for (let l = 0; l < LEADS; l++) { const lead = { type: 'lead', l, rec: [null, null, null, null] }; plan.push(lead, { type: 'echo', l, src: lead }); }
      plan.push({ type: 'conga', k: 0 }, { type: 'conga', k: 1 }, { type: 'conga', k: 2 }, { type: 'conga', k: 3 }, { type: 'pose', k: 0 }, { type: 'pose', k: 1 }, { type: 'pose', k: 2 });
      const ST = { phase: 'intro', cur: null, layers: 0, hits: 0, oks: 0, offs: 0, total: 0, streak: 0, best: 0, warm: 0, repeats: 0, routines: [], gestures: 0, eager: 0, eagerSaid: false,
        finished: false, frozenAt: 0, congaT0: 0, poseAt: 0, lastResult: null, saidStatue: false, lastGesture: -1e9 };
      function at(n) {
        const c = ST.cur;
        if (c && n >= c.beat0 && n < c.beat0 + 4) return { spec: c, b: n - c.beat0, b0: c.beat0 };
        const nb0 = c ? c.beat0 + 4 : 0;
        if (n >= nb0 && n < nb0 + 4 && plan[0]) return { spec: plan[0], b: n - nb0, b0: nb0 };
        return null;
      }
      const movesOf = (spec) => (spec.type === 'echo' ? spec.src.rec.map(m => m || 'P') : spec.moves);
      const jOf = (spec) => (spec.judge || (spec.judge = spec.moves.map(m => ({ exp: m, got: null, grade: null }))));

      /* ---------------- layout ---------------- */
      const G = { w: 0, H: 0, phone: true, yFar: 0, yh: 0, F: 0, zF: 2.2, halfN: 0, cols: 7, rows: 7, tiles: [], ball: { x: 0, y: 0, r: 30, top: 0 }, hudTop: 0, demo: { x: 0, y: 0 }, you: { x: 0, y: 0 },
        src: [], coneW: 120, speakers: [], bulbs: [], slotX: [0, 0, 0, 0] };
      let LV = new Float32Array(0), CI = new Uint8Array(0), NT = 0;
      const L = {};
      let COLS = [], GLOW = [], DOT = [], POOL = {}, POOLW = null, CONE = null, crowd = [];
      function off(w, hh, s) { s = s || cv.dpr; const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(hh * s)); const g = c.getContext('2d'); g.setTransform(s, 0, 0, s, 0, 0); return { c, g, w, h: hh, s }; }
      function sprite(col, size, stops) {
        const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), r = size / 2, gr = g.createRadialGradient(r, r, 0, r, r, r);
        stops.forEach(([k, a]) => gr.addColorStop(k, K.hexA(col, a))); g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
      }
      function buildSprites() {
        const p = pal();
        COLS = p.tiles.concat(MKEYS.split('').map(m => MOVES[m].c));
        GLOW = COLS.map(c => sprite(c, 64, [[0, 0.9], [0.35, 0.32], [1, 0]]));
        DOT = ['#ffffff'].concat(p.tiles.slice(0, 4)).map((c, i) => sprite(c, 32, i ? [[0, 1], [0.3, 0.6], [1, 0]] : [[0, 1], [0.25, 0.75], [1, 0]]));
        TROUPE.forEach(t => { POOL[t.slug] = sprite(t.glow, 64, [[0, 0.85], [0.45, 0.3], [1, 0]]); });
        POOLW = sprite(p.beam, 64, [[0, 0.8], [0.5, 0.25], [1, 0]]);
        const cc = document.createElement('canvas'); cc.width = 128; cc.height = 512; const cg = cc.getContext('2d');
        const vg = cg.createLinearGradient(0, 0, 0, 512); vg.addColorStop(0, K.hexA(p.beam, 0.95)); vg.addColorStop(0.5, K.hexA(p.beam, 0.4)); vg.addColorStop(1, K.hexA(p.beam, 0.12));
        cg.fillStyle = vg; cg.beginPath(); cg.moveTo(60, 0); cg.lineTo(68, 0); cg.lineTo(128, 512); cg.lineTo(0, 512); cg.closePath(); cg.fill();
        cg.globalCompositeOperation = 'destination-in';
        const hg = cg.createLinearGradient(0, 0, 128, 0); hg.addColorStop(0, 'rgba(0,0,0,0)'); hg.addColorStop(0.3, 'rgba(0,0,0,0.85)'); hg.addColorStop(0.5, 'rgba(0,0,0,1)'); hg.addColorStop(0.7, 'rgba(0,0,0,0.85)'); hg.addColorStop(1, 'rgba(0,0,0,0)');
        cg.fillStyle = hg; cg.fillRect(0, 0, 128, 512);
        CONE = cc;
      }
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        G.w = w; G.H = H; G.phone = w < 700; G.ver = (G.ver || 0) + 1;
        const ph = G.phone;
        G.hudTop = H - 16 - 128;
        G.yFar = Math.round(Math.max(ph ? 250 : 268, Math.min(H * (ph ? 0.355 : 0.37), G.hudTop - 330)));
        const yNear = H + (ph ? 40 : 30);
        G.zF = ph ? 2.3 : 2.05;
        G.F = (yNear - G.yFar) / (1 - 1 / G.zF);
        G.yh = yNear - G.F;
        G.halfN = w * (ph ? 0.8 : 0.62);
        G.cols = ph ? 7 : 11; G.rows = 7;
        const zAt = (v) => G.zF + (1 - G.zF) * v, X = (u, z) => w / 2 + u * G.halfN / z, Y = (z) => G.yh + G.F / z;
        G.tiles = [];
        for (let j = 0; j < G.rows; j++) {
          const z0 = zAt(j / G.rows), z1 = zAt((j + 1) / G.rows);
          for (let k = 0; k < G.cols; k++) {
            const u0 = -1 + 2 * k / G.cols, u1 = -1 + 2 * (k + 1) / G.cols;
            const q = [X(u0, z0), Y(z0), X(u1, z0), Y(z0), X(u1, z1), Y(z1), X(u0, z1), Y(z1)];
            const cx = (q[0] + q[2] + q[4] + q[6]) / 4, cy = (q[1] + q[5]) / 2, f = 0.085;
            const qi = q.map((v, n) => (n % 2 ? cy + (v - cy) * (1 - f * 1.4) : cx + (v - cx) * (1 - f)));
            G.tiles.push({ q, qi, cx, cy, j, k, wpx: Math.abs(q[2] - q[0]) });
          }
        }
        NT = G.tiles.length; LV = new Float32Array(NT); CI = new Uint8Array(NT);
        G.ball = { x: Math.round(w / 2), y: ph ? 116 : 122, r: ph ? 30 : 40, top: FL.id === 'garden' ? (ph ? 62 : 58) : 0 };
        G.demo = { x: Math.round(w / 2), y: Math.round(G.hudTop - (ph ? 54 : 62)) };
        G.you = { x: Math.round(w / 2), y: Math.round(G.hudTop - 22) };
        G.src = [{ x: w * 0.04, y: -24 }, { x: w * 0.96, y: -24 }];
        G.coneW = ph ? 130 : 190;
        const hw = Math.min(390, w - 20), sw = (hw - 24 - 24) / 4;
        for (let i = 0; i < 4; i++) G.slotX[i] = w / 2 - hw / 2 + 12 + sw * (i + 0.5) + 8 * i;
        buildSprites(); buildBall(); paintBg(); placeAll(); buildCrowd();
        SPL.forEach((s, i) => { if (!s.x) { s.x = G.w / 2 + (i ? 30 : -30); s.y = G.yFar + 60; } });
      }
      function homeOf(slug) {
        const ph = G.phone, avail = G.hudTop - G.yFar, k = K.clamp(avail / (ph ? 398 : 400), 0.72, 1.25), sz = Math.min(1, 0.55 + k * 0.45);
        const T = ph ? { sync: [0.5, 70, 96], rush: [0.14, 162, 62], glitch: [0.5, 166, 62], still: [0.86, 162, 62], patch: [0.21, 262, 76], drop: [0.5, 254, 66], loopie: [0.79, 262, 76] }
          : { sync: [0.5, 100, 136], rush: [0.3, 204, 94], glitch: [0.5, 214, 94], still: [0.7, 204, 94], patch: [0.36, 334, 108], drop: [0.5, 322, 98], loopie: [0.64, 334, 108] };
        const v = T[slug];
        return { x: Math.round(G.w * v[0]), y: Math.round(G.yFar + v[1] * k), size: Math.round(v[2] * sz) };
      }
      function placeAll() {
        order.forEach((d) => {
          const p = homeOf(d.slug);
          d.hx = p.x; d.hy = p.y; d.size = p.size;
          d.wrap.style.setProperty('--sz', p.size + 'px');
          d.C.place(p.x - p.size / 2, p.y - p.size);
          d.wrap.style.zIndex = String(30 + Math.round((p.y - G.yFar) / 60));
        });
      }

      /* ---------------- painting the room (cached; repainted on resize and theme change) ---------------- */
      function quad(g, q) { g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[2], q[3]); g.lineTo(q[4], q[5]); g.lineTo(q[6], q[7]); g.closePath(); }
      function neonArc(g, x, y, r, col, D, a0, a1) {
        a0 = a0 ?? Math.PI; a1 = a1 ?? TAU;
        [[10, D ? 0.16 : 0.12, col], [5, D ? 0.38 : 0.3, col], [2, 0.95, D ? mixHex(col, '#ffffff', 0.55) : col]].forEach(([lw, a, c]) => { g.globalAlpha = a; g.strokeStyle = c; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, r, a0, a1); g.stroke(); });
        g.globalAlpha = 1;
      }
      function paintBg() {
        if (!G.w) return;
        const w = G.w, H = G.H, D = dark(), p = pal();
        L.bg = off(w, H);
        const g = L.bg.g;
        const gr = g.createLinearGradient(0, 0, 0, G.yFar);
        gr.addColorStop(0, p.wall[0]); gr.addColorStop(0.62, p.wall[1]); gr.addColorStop(1, p.wall[2]);
        g.fillStyle = gr; g.fillRect(0, 0, w, G.yFar + 2);
        G.speakers = []; G.bulbs = [];
        WALL[FL.id](g, p, D);
        paintFloor(g, p, D);
        const vg = g.createRadialGradient(w / 2, H * 0.52, Math.min(w, H) * 0.32, w / 2, H * 0.52, Math.max(w, H) * 0.78);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, D ? 'rgba(0,0,0,0.55)' : 'rgba(90,30,70,0.2)');
        g.fillStyle = vg; g.fillRect(0, 0, w, H);
        el.style.backgroundColor = p.wall[0];
        hud.style.setProperty('--md-panel', p.panel);
      }
      const WALL = {
        disco(g, p, D) {
          const w = G.w, yF = G.yFar, R = K.rng(11);
          let gr = g.createRadialGradient(w / 2, yF, 10, w / 2, yF, Math.max(w * 0.75, 320));
          gr.addColorStop(0, K.hexA(p.glow, D ? 0.45 : 0.55)); gr.addColorStop(1, K.hexA(p.glow, 0));
          g.fillStyle = gr; g.fillRect(0, 0, w, yF);
          for (let x = 4; x < w; x += 8) { // a sequin curtain
            const ph = R() * 6;
            for (let y = 6; y < yF - 4; y += 7) {
              g.globalAlpha = (0.12 + 0.24 * (0.5 + 0.5 * Math.sin(y * 0.05 + ph + x * 0.013))) * (D ? 1 : 0.85);
              g.fillStyle = (Math.floor(y / 7) * 3 + Math.floor(x / 8)) % 11 === 0 ? '#ffffff' : p.deco;
              g.fillRect(x, y, 2.2, 3.2);
            }
          }
          g.globalAlpha = 1;
          for (let x = 0; x < w; x += 46) { const fg = g.createLinearGradient(x, 0, x + 46, 0); fg.addColorStop(0, 'rgba(0,0,0,0.2)'); fg.addColorStop(0.5, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,0.2)'); g.fillStyle = fg; g.fillRect(x, 0, 46, yF); }
          const ar = Math.min(w * 0.4, 250);
          neonArc(g, w / 2, yF + 4, ar, '#ff4fa8', D); neonArc(g, w / 2, yF + 4, ar - 15, '#ffd84a', D); neonArc(g, w / 2, yF + 4, ar - 30, '#49c6ff', D);
          const sw = G.phone ? 46 : 76, sh = G.phone ? 104 : 168;
          [10, w - 10 - sw].forEach((x) => {
            const y0 = yF - sh + 14;
            const cg = g.createLinearGradient(x, 0, x + sw, 0); cg.addColorStop(0, D ? '#16101c' : '#3a2440'); cg.addColorStop(0.5, D ? '#2c2236' : '#5a3a62'); cg.addColorStop(1, D ? '#120c18' : '#341f3a');
            g.fillStyle = cg; g.fillRect(x, y0, sw, sh);
            g.strokeStyle = D ? 'rgba(255,207,107,0.35)' : 'rgba(255,240,200,0.5)'; g.lineWidth = 1.5; g.strokeRect(x + 1, y0 + 1, sw - 2, sh - 2);
            G.speakers.push({ x: x + sw / 2, y: y0 + sh * 0.3, r: sw * 0.3 }, { x: x + sw / 2, y: y0 + sh * 0.72, r: sw * 0.36 });
          });
        },
        neon(g, p, D) {
          const w = G.w, yF = G.yFar, R = K.rng(23);
          for (let i = 0; i < (D ? 150 : 60); i++) { g.globalAlpha = (0.2 + R() * 0.6) * (D ? 1 : 0.5); g.fillStyle = R() < 0.2 ? '#ffd1f4' : '#ffffff'; g.fillRect(R() * w, Math.pow(R(), 1.4) * yF * 0.8, 1.3, 1.3); }
          g.globalAlpha = 1;
          const rS = Math.min(w * 0.34, 205), sx = w / 2, sy = yF + 4;
          let gr = g.createRadialGradient(sx, sy - rS * 0.4, rS * 0.3, sx, sy - rS * 0.4, rS * 2.2);
          gr.addColorStop(0, K.hexA(p.sun[1], D ? 0.42 : 0.5)); gr.addColorStop(1, K.hexA(p.sun[1], 0));
          g.fillStyle = gr; g.fillRect(0, 0, w, yF);
          const sun = off(rS * 2 + 4, rS + 4);
          const sg = sun.g, sgr = sg.createLinearGradient(0, 2, 0, rS + 2); sgr.addColorStop(0, p.sun[0]); sgr.addColorStop(1, p.sun[1]);
          sg.fillStyle = sgr; sg.beginPath(); sg.arc(rS + 2, rS + 2, rS, Math.PI, TAU); sg.closePath(); sg.fill();
          sg.globalCompositeOperation = 'destination-out';
          for (let k = 0; k < 7; k++) { const yy = rS + 2 - rS * (0.08 + k * 0.105), th = 2 + (6 - k) * 1.3; sg.fillRect(0, yy - th / 2, rS * 2 + 4, th); }
          g.drawImage(sun.c, sx - rS - 2, sy - rS - 2, rS * 2 + 4, rS + 4);
          const mount = (x0, x1, peak, col, line) => {
            const pts = [[x0, yF + 2]]; let x = x0; const n = 6;
            for (let i = 1; i < n; i++) { x = x0 + (x1 - x0) * i / n; pts.push([x, yF - peak * (0.35 + R() * 0.65)]); }
            pts.push([x1, yF + 2]);
            g.fillStyle = col; g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath(); g.fill();
            g.strokeStyle = line; g.lineWidth = 1.6; g.globalAlpha = 0.85; g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.stroke(); g.globalAlpha = 1;
          };
          mount(-20, w * 0.36, G.phone ? 70 : 110, D ? '#0b0828' : '#4b3a8e', p.deco); mount(w * 0.64, w + 20, G.phone ? 64 : 100, D ? '#0b0828' : '#4b3a8e', p.grout);
          g.strokeStyle = p.grout; g.lineWidth = 2; g.globalAlpha = 0.9; g.beginPath(); g.moveTo(0, yF); g.lineTo(w, yF); g.stroke(); g.globalAlpha = 1;
          const bw = G.phone ? 5 : 7;
          [w * 0.05, w * 0.95].forEach((x, i) => { const c = i ? p.grout : p.deco; [[14, 0.12], [7, 0.3], [bw * 0.5, 0.95]].forEach(([lw, a]) => { g.globalAlpha = a * (D ? 1 : 0.85); g.fillStyle = c; g.fillRect(x - lw / 2, 0, lw, yF); }); });
          g.globalAlpha = 1;
        },
        garden(g, p, D) {
          const w = G.w, yF = G.yFar, R = K.rng(37);
          if (D) { for (let i = 0; i < 70; i++) { g.globalAlpha = 0.2 + R() * 0.5; g.fillStyle = '#fff'; g.fillRect(R() * w, Math.pow(R(), 1.5) * yF * 0.7, 1.2, 1.2); } g.globalAlpha = 1; }
          const mx = w * 0.18, my = G.phone ? 150 : 140;
          let gr = g.createRadialGradient(mx, my, 4, mx, my, 120);
          gr.addColorStop(0, K.hexA(D ? '#fff4d6' : '#fff8e0', D ? 0.5 : 0.7)); gr.addColorStop(1, K.hexA(D ? '#fff4d6' : '#ffe0a0', 0));
          g.fillStyle = gr; g.fillRect(mx - 120, my - 120, 240, 240);
          g.fillStyle = D ? '#fff2cf' : '#fff9e6'; g.beginPath(); g.arc(mx, my, D ? 15 : 22, 0, TAU); g.fill();
          const hedge = (base, hgt, col, step) => { g.fillStyle = col; g.beginPath(); g.moveTo(-10, yF + 2); for (let x = -10; x <= w + 20; x += step) { g.lineTo(x, base - hgt * (0.6 + 0.4 * Math.abs(Math.sin(x * 0.045 + step)))); } g.lineTo(w + 20, yF + 2); g.closePath(); g.fill(); };
          hedge(yF - 30, G.phone ? 42 : 60, p.hedge2, 16); hedge(yF - 6, G.phone ? 26 : 36, p.hedge, 12);
          const tree = (tx, s, flip) => {
            g.fillStyle = p.tree; g.fillRect(tx - 7 * s, yF - 150 * s, 14 * s, 150 * s);
            [[0, -170, 62], [-48, -140, 50], [46, -132, 48], [-18, -205, 46], [30, -190, 44]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(tx + dx * s * flip, yF + dy * s, r * s, 0, TAU); g.fill(); });
          };
          tree(w + (G.phone ? 10 : -20), G.phone ? 0.95 : 1.25, -1); tree(G.phone ? -14 : 30, G.phone ? 0.8 : 1.1, 1);
          const by = G.ball.top;
          g.strokeStyle = p.tree; g.lineWidth = G.phone ? 7 : 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(w + 10, by + 40); g.quadraticCurveTo(w * 0.62, by - 16, w * 0.38, by + 6); g.stroke();
          const strand = (y0, y1, sag, n) => {
            g.strokeStyle = D ? 'rgba(20,20,20,0.9)' : 'rgba(60,40,30,0.7)'; g.lineWidth = 1.3; g.beginPath();
            for (let i = 0; i <= 40; i++) { const t = i / 40, x = -10 + (w + 20) * t, y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
            for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = -10 + (w + 20) * t, y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag + 6; G.bulbs.push({ x, y, ph: R() * 6, c: i % 4 }); g.fillStyle = D ? '#3a2a18' : '#6a4a2a'; g.fillRect(x - 1.5, y - 7, 3, 4); g.fillStyle = D ? '#ffe2a6' : '#fff4d8'; g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); }
          };
          strand(G.phone ? 66 : 70, G.phone ? 80 : 74, G.phone ? 44 : 56, G.phone ? 13 : 26);
          strand(G.phone ? 120 : 110, G.phone ? 104 : 114, G.phone ? 50 : 70, G.phone ? 12 : 24);
        }
      };
      function paintFloor(g, p, D) {
        const w = G.w, H = G.H, R = K.rng(5);
        g.fillStyle = p.floor; g.fillRect(0, G.yFar, w, H - G.yFar);
        for (const t of G.tiles) {
          g.fillStyle = mixHex(p.floor, '#ffffff', (D ? 0.035 : 0.07) + R() * 0.045);
          quad(g, t.q); g.fill();
          if (FL.id === 'garden') { // deck planks inside each tile
            g.strokeStyle = K.hexA(p.grout, 0.45); g.lineWidth = 1;
            for (let s = 1; s < 3; s++) { const k = s / 3, xa = t.q[0] + (t.q[6] - t.q[0]) * k, ya = t.q[1] + (t.q[7] - t.q[1]) * k, xb = t.q[2] + (t.q[4] - t.q[2]) * k, yb = t.q[3] + (t.q[5] - t.q[3]) * k; g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.stroke(); }
          }
        }
        g.strokeStyle = FL.id === 'neon' ? K.hexA(p.grout, D ? 0.42 : 0.6) : p.grout; g.lineWidth = FL.id === 'neon' ? 1.4 : 2.2;
        for (const t of G.tiles) { quad(g, t.q); g.stroke(); }
        const gl = g.createLinearGradient(0, G.yFar, 0, G.yFar + (H - G.yFar) * 0.62);
        gl.addColorStop(0, K.hexA(p.glow, D ? 0.24 : 0.2)); gl.addColorStop(1, K.hexA(p.glow, 0));
        g.fillStyle = gl; g.fillRect(0, G.yFar, w, H - G.yFar);
        const t0 = G.tiles[0], t1 = G.tiles[G.cols - 1];
        g.strokeStyle = K.hexA(p.edge, 0.85); g.lineWidth = 2.2; g.beginPath(); g.moveTo(t0.q[0] - 30, G.yFar); g.lineTo(t1.q[2] + 30, G.yFar); g.stroke();
      }

      /* the crowd: silhouettes at the far corners (and framing the desk on wide screens) who bob harder as the band builds */
      function buildCrowd() {
        crowd = [];
        const R = K.rng(dayN + 91), ph = G.phone, w = G.w;
        const add = (x0, x1, n, y, s0, front) => { for (let i = 0; i < n; i++) crowd.push({ x: x0 + (x1 - x0) * (i + 0.5) / n + (R() - 0.5) * (front ? 16 : 8), y: y + (R() - 0.5) * (front ? 10 : 5), s: s0 * (0.85 + R() * 0.3), ph: R() * TAU, arm: 0, armT: 0, side: R() < 0.5 ? -1 : 1, hair: R(), front, stick: Math.floor(R() * 5), glow: R() < 0.45 }); };
        if (ph) { add(2, 60, 3, G.yFar + 10, 0.62, false); add(w - 60, w - 2, 3, G.yFar + 10, 0.62, false); }
        else {
          add(100, 340, 7, G.yFar + 10, 0.82, false); add(w - 340, w - 100, 7, G.yFar + 10, 0.82, false);
          const hl = w / 2 - 218, hr = w / 2 + 218;
          if (hl > 140) { const n = Math.max(2, Math.round((hl - 20) / 74)); add(6, hl - 14, n, G.H + 2, 1.9, true); add(hr + 14, w - 6, n, G.H + 2, 1.9, true); }
        }
        crowd.sort((a, b) => a.y - b.y);
      }
      function cheer(p) { crowd.forEach(c => { if (Math.random() < p) { c.armT = 1; c.armUntil = performance.now() + 1500 + Math.random() * 900; } }); }
      function drawCrowd(g, front, bp, now) {
        if (!crowd.length) return;
        const col = dk ? '#07030b' : '#3a1636', cols = pal().tiles, big = ST.phase === 'conga' || ST.phase === 'pose' || ST.phase === 'freeze';
        const energy = big ? 1 : Math.min(1, 0.2 + ST.layers / 5), frac = bp - Math.floor(bp);
        g.lineCap = 'round';
        for (const p of crowd) {
          if (p.front !== front) continue;
          if (p.armUntil && now > p.armUntil && !big) { p.armT = 0; p.armUntil = 0; }
          if (ST.phase !== 'freeze') p.arm += (p.armT - p.arm) * 0.14;
          const s = p.s, bob = ST.phase === 'freeze' ? 0 : Math.abs(Math.sin(Math.PI * frac)) * (1 + 3.2 * energy) * s, x = p.x + (front ? 0 : Math.sin(bp * Math.PI / 2 + p.ph) * 1.5 * energy * s), y = p.y - bob - 34 * s;
          g.globalAlpha = front ? 1 : dk ? 0.96 : 0.82; g.fillStyle = col; g.strokeStyle = col;
          if (p.arm > 0.05) {
            g.lineWidth = 4.4 * s;
            const ax = x + p.side * 9 * s, ay = y + 10 * s, hx = x + p.side * (12 + 3 * Math.sin(bp * Math.PI + p.ph)) * s, hy = y + 10 * s - 27 * s * p.arm;
            g.beginPath(); g.moveTo(ax, ay); g.lineTo(hx, hy); g.stroke();
            if (p.glow) { g.globalCompositeOperation = dk ? 'lighter' : 'source-over'; g.strokeStyle = cols[p.stick]; g.lineWidth = 2.6 * s; g.globalAlpha = 0.95 * p.arm; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + p.side * 4 * s, hy - 11 * s); g.stroke(); g.globalAlpha = 0.35 * p.arm; g.lineWidth = 8 * s; g.stroke(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = front ? 1 : dk ? 0.96 : 0.82; g.strokeStyle = col; }
          }
          g.beginPath(); g.moveTo(x - 15 * s, y + 36 * s); g.quadraticCurveTo(x - 15 * s, y + 8 * s, x, y + 7 * s); g.quadraticCurveTo(x + 15 * s, y + 8 * s, x + 15 * s, y + 36 * s); g.closePath(); g.fill();
          g.beginPath(); g.arc(x, y - 2 * s, 7.6 * s, 0, TAU); g.fill();
          if (p.hair < 0.3) { g.beginPath(); g.arc(x + 3 * s, y - 8 * s, 4.2 * s, 0, TAU); g.fill(); }
          if (dk) { g.strokeStyle = cols[(p.stick + Math.floor(bp)) % 5]; g.globalAlpha = 0.55; g.lineWidth = 1.4; g.beginPath(); g.arc(x, y - 2 * s, 7.6 * s, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
        }
        g.globalAlpha = 1;
      }

      /* the mirror ball: pre-rendered turning frames (one facet step per frame) */
      function buildBall() {
        const r = G.ball.r, N = 12, s = Math.min(2, cv.dpr * 1.2), size = Math.ceil(r * 2 + 6), px = Math.ceil(size * s);
        const c = document.createElement('canvas'); c.width = px * N; c.height = px; const g = c.getContext('2d');
        const tint = golden ? ['#fff3c4', '#d8a640', '#5a3a10'] : ['#f4f6ff', '#8d93a8', '#262a38'];
        for (let f = 0; f < N; f++) {
          g.setTransform(s, 0, 0, s, f * px, 0);
          const cx = size / 2, cy = size / 2;
          const base = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
          base.addColorStop(0, tint[0]); base.addColorStop(0.55, tint[1]); base.addColorStop(1, tint[2]);
          g.fillStyle = base; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
          g.save(); g.beginPath(); g.arc(cx, cy, r - 0.5, 0, TAU); g.clip();
          const bands = 10, dphi = Math.PI / bands;
          for (let b = 0; b < bands; b++) {
            const phi = -Math.PI / 2 + (b + 0.5) * dphi, cp = Math.cos(phi), nLon = Math.max(6, Math.round(22 * cp)), dl = TAU / nLon;
            for (let k = 0; k < nLon; k++) {
              const lam = (k + f / N) * dl - Math.PI / 2, cl = Math.cos(lam);
              if (cl <= 0.05) continue;
              const x = cx + r * cp * Math.sin(lam), y = cy + r * Math.sin(phi), fw = Math.max(0.6, r * cp * dl * cl * 0.86), fh = r * dphi * 0.84 * Math.max(0.3, cp + 0.15);
              const hsh = ((b * 73 + k * 37) % 17) / 17, lit = 0.25 + 0.55 * cl * (0.6 - Math.sin(phi) * 0.4) + (hsh > 0.86 ? 0.5 : 0);
              g.globalAlpha = Math.min(1, lit); g.fillStyle = hsh > 0.86 ? '#ffffff' : (hsh > 0.5 ? tint[0] : mixHex(tint[1], tint[0], 0.5));
              g.fillRect(x - fw / 2, y - fh / 2, fw, fh);
            }
          }
          g.globalAlpha = 1; g.restore();
          const sp = g.createRadialGradient(cx - r * 0.38, cy - r * 0.42, 0, cx - r * 0.38, cy - r * 0.42, r * 0.7);
          sp.addColorStop(0, 'rgba(255,255,255,0.75)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = sp; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, r - 0.5, 0, TAU); g.stroke();
        }
        L.ball = { c, N, px, size };
      }

      /* ---------------- dancers ---------------- */
      function moveDelta(m, k, amp, o, side) {
        switch (m) {
          case 'L': case 'R': { const s = m === 'L' ? -1 : 1, b = k < 0.32 ? easeOut(k / 0.32) : 1 - easeInOut((k - 0.32) / 0.68); o.x += s * 24 * amp * b; o.y -= 7 * amp * Math.sin(Math.PI * Math.min(1, k * 1.6)); o.r += s * 11 * b; break; }
          case 'U': { const hop = Math.sin(Math.PI * k), land = Math.max(0, 1 - k / 0.14) * 0.6 + Math.max(0, (k - 0.86) / 0.14); o.y -= 34 * amp * Math.pow(hop, 0.75); o.sx += 0.13 * land - 0.04 * hop; o.sy += -0.13 * land + 0.07 * hop; break; }
          case 'D': { const dd = Math.sin(Math.PI * k); o.y += 9 * amp * dd; o.sx += 0.18 * dd; o.sy -= 0.22 * dd; break; }
          case 'C': { const p = k < 0.14 ? k / 0.14 : Math.max(0, 1 - (k - 0.14) / 0.5); o.sx += 0.16 * p; o.sy += 0.16 * p; o.y -= 5 * amp * Math.sin(Math.PI * k); o.r += 7 * Math.sin(TAU * k) * (1 - k); break; }
          case 'S': { const e = easeInOut(Math.min(1, k / 0.88)); o.r += 360 * e; o.y -= 14 * amp * Math.sin(Math.PI * k); break; }
          case 'P': { const e = k < 0.16 ? k / 0.16 : k > 0.86 ? (1 - k) / 0.14 : 1; o.r += 13 * e * side; o.sx += 0.06 * e; o.sy += 0.06 * e; o.y -= 6 * e; break; }
          case 'h': { o.y -= 10 * amp * Math.sin(Math.PI * k); break; }
          case 'K': { const e = Math.sin(Math.PI * k); o.y -= 22 * amp * e; o.r += 16 * e * side; o.sx -= 0.05 * e; o.sy += 0.07 * e; break; }
        }
      }
      function dance(d, m, t0) {
        if (!d.on || d.entering || d.freeze) return;
        const sp = SPB;
        if (d.style === 'loop' && m !== 'P') d.moves.push({ m, t0, dur: sp * 0.48, amp: 1 }, { m, t0: t0 + sp * 0.5, dur: sp * 0.48, amp: 0.8 });
        else if (d.style === 'double' && m !== 'P') d.moves.push({ m, t0, dur: sp * 0.42, amp: 0.85 }, { m, t0: t0 + sp * 0.46, dur: sp * 0.42, amp: 0.85 });
        else if (d.style === 'slow') d.moves.push({ m, t0: t0 + sp * 0.2, dur: sp * 1.45, amp: 0.72 });
        else d.moves.push({ m, t0, dur: sp * (m === 'P' ? 0.96 : 0.9), amp: d.style === 'lead' ? 1.15 : 1 });
        if (d.moves.length > 8) d.moves.splice(0, d.moves.length - 8);
      }
      const danceAll = (m, t0, list) => (list || present()).forEach(d => dance(d, m, t0));
      function join(slug, ms) {
        const d = D[slug]; if (!d || d.on) return;
        d.on = true; d.C.show(true); d.entering = true;
        const now = performance.now(), W = G.w;
        const from = { patch: [-(d.hx + d.size), -30], loopie: [W - d.hx + d.size, -30], rush: [-(d.hx + d.size * 1.5), 0], still: [W - d.hx + d.size, 0], drop: [0, -(d.hy + 20)], glitch: [0, 0], sync: [0, -40] }[slug] || [0, 0];
        const dur = ms || { rush: 420, still: 1500, drop: 650, glitch: 700 }[slug] || 900;
        d.enter = { t0: now, dur, fx: from[0], fy: from[1], blink: slug === 'glitch' };
        if (slug === 'loopie') d.moves.push({ m: 'S', t0: now + dur * 0.4, dur: dur * 0.6, amp: 1 });
        if (A.ctx) { A.whoosh({ vol: 0.1, dur: Math.min(0.6, dur / 1000) }); }
      }
      function updDancer(d, now, bp) {
        const o = d.o; o.x = 0; o.y = 0; o.r = 0; o.sx = 1; o.sy = 1;
        if (d.freeze) Object.assign(o, d.freeze);
        else {
          if (d.groove > 0) { const ph = bp - Math.floor(bp); o.y -= 3.2 * d.groove * Math.abs(Math.sin(Math.PI * ph)); o.r += 2.6 * d.groove * Math.sin(Math.PI * bp); }
          for (let k = d.moves.length - 1; k >= 0; k--) {
            const mv = d.moves[k];
            if (now >= mv.t0 + mv.dur) { d.moves.splice(k, 1); continue; }
            if (now < mv.t0) continue;
            let q = (now - mv.t0) / mv.dur; if (d.style === 'robot') q = Math.floor(q * 5) / 5;
            moveDelta(mv.m, q, mv.amp * (K.reduced() ? 0.6 : 1), o, d.side);
          }
          if (d.style === 'robot' && d.moves.length) o.r = Math.round(o.r / 15) * 15;
        }
        // travel: an entrance, or the conga path
        let tx = 0, ty = 0, sc = 1;
        if (d.enter) {
          const k = Math.min(1, (now - d.enter.t0) / d.enter.dur), e = d.slug === 'drop' ? easeOut(k) : outBack(k);
          tx = d.enter.fx * (1 - e); ty = d.enter.fy * (1 - e) - (d.slug === 'drop' ? 0 : Math.sin(Math.PI * k) * 28);
          if (d.enter.blink) sc = k < 1 ? Math.max(0.15, Math.floor(k * 6) / 6) : 1;
          if (k >= 1) { d.enter = null; d.entering = false; if (d.slug === 'drop') { P.emit('drop', d.hx, d.hy - 4, 14, { angle: -Math.PI / 2, spread: 2.2, speed: [60, 160] }); if (A.ctx) A.pop({ freq: 380, vol: 0.12 }); } }
        }
        if (ST.congaT0 && d.on) {
          const c = congaPos(d, now);
          const k = Math.min(1, (now - ST.congaT0) / (SPB * 1.4)), e = easeInOut(k);
          tx = tx * (1 - e) + c.x * e; ty = ty * (1 - e) + c.y * e; sc = sc * (1 - e) + c.s * e;
        }
        d.tx = tx; d.ty = ty; d.depth = sc;
        const tr = o.x.toFixed(1) + 'px ' + o.y.toFixed(1) + 'px', ro = o.r.toFixed(1) + 'deg', sca = (o.sx * sc).toFixed(3) + ' ' + (o.sy * sc).toFixed(3);
        if (tr !== d.s1) { d.img.style.translate = tr; d.s1 = tr; }
        if (ro !== d.s2) { d.img.style.rotate = ro; d.s2 = ro; }
        if (sca !== d.s3) { d.img.style.scale = sca; d.s3 = sca; }
        const wt = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px)';
        if (wt !== d.s4) { d.wrap.style.transform = wt; d.s4 = wt; }
      }
      /* the conga path: an oval around the floor; Sync leads and the troupe follows */
      function congaPath() {
        const ph = G.phone, cx = G.w / 2, cy = Math.round((G.yFar + G.hudTop) / 2 + (ph ? 22 : 14));
        return { cx, cy, rx: ph ? G.w * 0.3 : Math.min(G.w * 0.27, 285), ry: (G.hudTop - G.yFar) * (ph ? 0.27 : 0.25) };
      }
      function congaPos(d, now) {
        const cp = congaPath(), idx = d.conga, el2 = (now - ST.congaT0) / 1000;
        const speed = ST.phase === 'pose' || ST.phase === 'freeze' ? 0 : 0.085;
        if (ST.congaStop == null && speed === 0) ST.congaStop = ST.congaS || 0;
        const s = ST.congaStop != null ? ST.congaStop : el2 * speed;
        ST.congaS = s;
        const th = TAU * (s - idx * 0.13) + Math.PI * 0.5;
        const x = cp.cx + cp.rx * Math.cos(th), y = cp.cy + cp.ry * Math.sin(th);
        const depth = 0.84 + 0.26 * ((y - (cp.cy - cp.ry)) / (2 * cp.ry)), target = (G.phone ? 64 : 92) * (d.slug === 'sync' ? 1.14 : 1);
        return { x: x - d.hx, y: y - d.hy, s: depth * target / d.size, fy: y };
      }

      /* ---------------- floor lights ---------------- */
      const waves = [];
      const colIdx = (m) => 5 + MKEYS.indexOf(m);
      function wave(type, ci, str, ox, oy) { waves.push({ type, ci, str, t0: performance.now(), ox: ox ?? G.w / 2, oy: oy ?? (G.yFar + G.hudTop) / 2 }); if (waves.length > 9) waves.shift(); }
      function stepTiles(dt, now) {
        const dec = Math.exp(-dt * 3.1);
        for (let i = 0; i < NT; i++) LV[i] *= dec;
        for (let wi = waves.length - 1; wi >= 0; wi--) {
          const wv = waves[wi], k = (now - wv.t0) / 620;
          if (k > 1) { waves.splice(wi, 1); continue; }
          if (k < 0) continue;
          const W = G.w, span = G.H - G.yFar;
          for (let i = 0; i < NT; i++) {
            const t = G.tiles[i]; let c = 0;
            switch (wv.type) {
              case 'L': { const f = W * (1.2 - 1.45 * k); c = Math.exp(-Math.pow((t.cx - f) / (W * 0.12), 2)); break; }
              case 'R': { const f = W * (-0.2 + 1.45 * k); c = Math.exp(-Math.pow((t.cx - f) / (W * 0.12), 2)); break; }
              case 'U': { const f = G.H - span * 1.25 * k; c = Math.exp(-Math.pow((t.cy - f) / (span * 0.12), 2)); break; }
              case 'D': { const f = G.yFar + span * 1.25 * k; c = Math.exp(-Math.pow((t.cy - f) / (span * 0.12), 2)); break; }
              case 'C': case 'P': case 'h': case 'K': { const dd = Math.hypot(t.cx - wv.ox, (t.cy - wv.oy) * 1.8), r = k * W * 0.95; c = Math.exp(-Math.pow((dd - r) / (W * 0.08), 2)); break; }
              case 'S': { const a = Math.atan2((t.cy - wv.oy) * 1.8, t.cx - wv.ox), dd = Math.hypot(t.cx - wv.ox, (t.cy - wv.oy) * 1.8) / W, ph = (((a / TAU + dd * 1.1 - k * 2.2) % 1) + 1) % 1; c = (ph < 0.24 ? 1 - ph / 0.24 : 0) * (1 - k); break; }
              case 'flash': c = Math.max(0, 1 - k * 2.5); break;
            }
            c *= wv.str;
            if (c > LV[i] && c > 0.04) { LV[i] = c; CI[i] = wv.ci; }
          }
        }
      }
      function floorBeat(i) {
        if (!NT) return;
        const base = 0.14 + 0.075 * ST.layers + (ST.phase === 'conga' ? 0.15 : 0);
        for (let n = 0; n < NT; n++) { const t = G.tiles[n]; if ((t.j + t.k + i) % 2 === 0) { const v = base * (0.75 + 0.25 * ((t.j * 7 + t.k * 3 + i) % 3) / 2); if (v > LV[n]) { LV[n] = v; CI[n] = (t.j + Math.floor(i / 2)) % 5; } } }
      }

      /* ---------------- sound ---------------- */
      function clapAt(when, vol, bus) {
        for (let k = 0; k < 3; k++) A.noise({ when: when + k * 0.011, filter: 'bandpass', freq: 1150 + k * 130, q: 1.1, dur: 0.022, vol, bus });
        A.noise({ when: when + 0.03, filter: 'bandpass', freq: 1000, q: 0.8, dur: 0.16, vol: vol * 0.55, verb: 0.25, bus });
      }
      function moveSound(m, when, vol, ch) {
        if (!A.ctx) return;
        ch = ch || PROG[0];
        const pan = MOVES[m] ? MOVES[m].pan : 0;
        switch (m) {
          case 'L': case 'R': {
            const up = m === 'R';
            A.noise({ when, filter: 'bandpass', freq: up ? 900 : 650, to: up ? 3000 : 2100, q: 5, dur: 0.15, attack: 0.01, vol: 0.12 * vol, pan });
            A.pluck(nf(ch.chord[up ? 2 : 0]), { when, vol: 0.15 * vol, damp: 0.975, dur: 0.6, pan });
            A.pluck(nf(ch.chord[up ? 3 : 1]), { when: when + 0.014, vol: 0.11 * vol, damp: 0.975, dur: 0.6, pan });
            break;
          }
          case 'U': A.tone({ when, type: 'sine', freq: nf(ch.chord[1]), to: nf(ch.chord[3]) * 2, glide: 0.16, dur: 0.24, vol: 0.1 * vol, attack: 0.01 }); A.chime(nf(ch.top[2]), { when: when + 0.09, vol: 0.045 * vol, dur: 0.9 }); break;
          case 'D': A.tone({ when, type: 'triangle', freq: nf(ch.chord[3]), to: nf(ch.chord[0]) / 2, glide: 0.2, dur: 0.28, vol: 0.13 * vol }); A.tone({ when, type: 'sine', freq: 140, to: 58, glide: 0.12, dur: 0.2, vol: 0.18 * vol }); break;
          case 'C': clapAt(when, 0.15 * vol, 'sfx'); break;
          case 'S': A.tone({ when, type: 'sine', freq: nf(ch.chord[0]), to: nf(ch.top[2]), glide: 0.34, dur: 0.4, vol: 0.065 * vol }); for (let k = 0; k < 6; k++) A.shaker(when + k * 0.05, 0.05 * vol); A.whoosh({ when, vol: 0.07 * vol, dur: 0.34 }); break;
          case 'P': ch.chord.forEach((n, k) => A.pluck(nf(n) * 2, { when: when + k * 0.012, vol: 0.08 * vol, damp: 0.99, dur: 1 })); A.noise({ when, filter: 'highpass', freq: 5200, dur: 0.45, vol: 0.05 * vol }); break;
          case 'h': A.drum(when, 0.16 * vol, 1.35, 0); break;
          case 'K': A.drum(when, 0.26 * vol, 0.95, 0.1); A.noise({ when, pink: true, filter: 'bandpass', freq: 820, to: 1100, q: 4, dur: 0.18, attack: 0.02, vol: 0.11 * vol }); A.tone({ when, type: 'sawtooth', freq: 300, to: 390, glide: 0.1, dur: 0.16, vol: 0.025 * vol, lp: 1400 }); break;
        }
      }
      function ladder(n) { if (!A.ctx) return; A.chime(nf(LADDER[n < 6 ? n : 3 + ((n - 6) % 7)]), { vol: 0.065, dur: 1.2 }); }
      function woo(v) { if (!A.ctx) return; const t = A.now(); A.noise({ when: t, pink: true, filter: 'bandpass', freq: 700, to: 1050, q: 0.8, dur: 1.6, attack: 0.25, vol: 0.1 * v }); for (let i = 0; i < 3; i++) A.tone({ when: t + 0.15 + i * 0.22 + Math.random() * 0.1, type: 'sine', freq: 1500 + Math.random() * 400, to: 2300, glide: 0.25, dur: 0.35, vol: 0.018 * v }); }
      function applause(d, v) { if (!A.ctx) return; const t = A.now(), n = Math.round(d * 34); for (let i = 0; i < n; i++) { const k = i / n; A.noise({ when: t + k * d + Math.random() * 0.05, filter: 'bandpass', freq: 1100 + Math.random() * 2200, q: 1.3, dur: 0.03, vol: (0.03 + Math.random() * 0.04) * v * (k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1) }); } }
      /* the band, one beat at a time, ahead of the beat on the audio clock */
      function band(i, when, spec) {
        const b = ((i % 4) + 4) % 4, bar = Math.floor(i / 4), ch = chordAt(i), sp = SPB / 1000, Lr = ST.layers, type = spec ? spec.type : 'warm', bus = 'music';
        if (type === 'swap') {
          if (b === 0) { A.kick(when, 0.3); ch.chord.forEach((n, k) => A.tone({ when: when + k * 0.01, type: 'sawtooth', freq: nf(n), dur: sp * 4, vol: 0.02, attack: 0.3, lp: 1500, verb: 0.35, bus })); }
          if (spec.k === 0 && b === 0) A.noise({ when, filter: 'bandpass', freq: 300, to: 5200, q: 1.2, dur: sp * 8, attack: sp * 7, vol: 0.07, bus });
          if (spec.k === 1) for (let s = 0; s < (b < 2 ? 2 : 4); s++) A.noise({ when: when + s * sp / (b < 2 ? 2 : 4), filter: 'bandpass', freq: 1800, q: 0.9, dur: 0.06, vol: 0.03 + b * 0.012, bus });
          return;
        }
        if (type === 'pose') {
          const n = 4 + spec.k * 2;
          for (let s = 0; s < n; s++) A.noise({ when: when + s * sp / n, filter: 'bandpass', freq: 1700 + spec.k * 200, q: 0.9, dur: 0.05, vol: 0.025 + spec.k * 0.015 + b * 0.006, bus });
          if (b === 0) A.kick(when, 0.3);
          return;
        }
        A.kick(when, type === 'conga' ? 0.36 : 0.32);
        A.pluck(nf(ch.bass), { when, vol: 0.28, damp: 0.985, lp: 760, dur: 0.6, bus });
        A.pluck(nf(ch.bass) * 2, { when: when + sp / 2, vol: 0.21, damp: 0.985, lp: 900, dur: 0.5, bus });
        if (Lr >= 1) A.noise({ when: when + sp / 2, filter: 'highpass', freq: 7200, dur: 0.11, attack: 0.004, vol: 0.05, bus });
        if (Lr >= 2 && (b === 1 || b === 3)) clapAt(when, 0.085, bus);
        if (Lr >= 3) { A.noise({ when: when + sp * 0.25, filter: 'bandpass', freq: 2500, q: 3, dur: 0.035, vol: 0.045, bus }); A.pluck(nf(ch.chord[1]) * 2, { when: when + sp * 0.75, vol: 0.06, damp: 0.9, dur: 0.25, bus }); A.pluck(nf(ch.chord[2]) * 2, { when: when + sp * 0.75 + 0.008, vol: 0.05, damp: 0.9, dur: 0.25, bus }); }
        if (Lr >= 4 && b === 0) ch.chord.forEach((n, k) => A.tone({ when: when + k * 0.012, type: 'sawtooth', freq: nf(n), dur: sp * 4, vol: 0.018, attack: 0.22, lp: 1900, verb: 0.3, bus }));
        if (Lr >= 5) for (let e = 0; e < 2; e++) { const n = HOOK[(bar % 2) * 8 + b * 2 + e]; if (n) A.pluck(nf(n), { when: when + e * sp / 2, vol: 0.12, damp: 0.993, verb: 0.25, dur: 0.9, bus }); }
        if (type === 'conga' && (b === 1 || b === 3)) { A.drum(when + sp / 2, 0.12, 1.5, 0); A.drum(when + sp * 0.75, 0.1, 1.2, 0); }
      }
      /* the cast's own moves, on the beat */
      function cue(i, when, spec, b) {
        const ch = chordAt(i);
        if (spec.type === 'warm') clapAt(when, 0.06, 'sfx');
        else if (spec.type === 'call') moveSound(spec.moves[b], when, 0.7, ch);
        else if (spec.type === 'echo') { const m = movesOf(spec)[b]; moveSound(m, when, 0.95, ch); if (D.rush.on && m !== 'P') moveSound(m, when + SPB * 0.00046, 0.3, ch); }
        else if (spec.type === 'conga') moveSound(b === 3 ? 'K' : 'h', when, 0.8, ch);
      }
      function schedule(now) {
        if (!A.ctx || !CLK.on) return;
        const cur = Math.floor(beatPos(now));
        if (CLK.sched < cur - 1) CLK.sched = cur - 1;
        let guard = 0;
        while (beatAt(CLK.sched + 1) < now + 220 && guard++ < 8) {
          const i = ++CLK.sched, ms = beatAt(i);
          if (ms < now - 25) continue;
          const when = audioAt(ms), a = at(i);
          band(i, when, a ? a.spec : null);
          if (a) cue(i, when, a.spec, a.b);
        }
      }

      /* ---------------- HUD ---------------- */
      const colOf = (m) => (dark() ? MOVES[m].c : MOVES[m].c2);
      function slotSet(i, m, cls) {
        const s = slots[i];
        if (m !== s.m) {
          s.m = m;
          if (m) { const mv = MOVES[m]; s.ico.innerHTML = '<svg viewBox="0 0 24 24">' + ICON[mv.icon] + '</svg>'; s.nm.textContent = mv.name; s.el.style.setProperty('--c', colOf(m)); s.el.style.setProperty('--rot', mv.rot + 'deg'); }
          else { s.ico.innerHTML = '<svg viewBox="0 0 24 24">' + ICON.ask + '</svg>'; s.nm.textContent = String(i + 1); s.el.style.removeProperty('--c'); s.el.style.setProperty('--rot', '0deg'); }
        }
        const st = (m ? 'md-show ' : '') + (cls || '');
        if (st !== s.st) { s.st = st; s.el.className = 'md-slot ' + st; }
      }
      function slotNow(i) { slots.forEach((s, k) => s.el.classList.toggle('md-now', k === i)); }
      function slotsReset(moves) { for (let i = 0; i < 4; i++) slotSet(i, moves ? moves[i] : null, ''); slotNow(-1); }
      function setPhase(t) { if (phaseEl.textContent !== t) phaseEl.textContent = t; }
      function setStreak() { streakEl.textContent = ST.streak >= 2 ? 'Streak ' + ST.streak : ''; }
      function setEq() { Array.from(eqEl.children).forEach((x, i) => { const on = i < ST.layers; x.classList.toggle('on', on); if (on) { x.style.setProperty('--c', pal().tiles[i]); x.style.setProperty('--h', (8 + i * 2.5) + 'px'); } }); }
      function pop(text, x, y, col, kind) {
        col = col || '#ffd84a';
        const p = h('div', { class: 'md-pop' + (kind ? ' md-' + kind : '') + (K.reduced() ? ' md-still' : ''), text, style: { '--c': col, '--c2': mixHex(col, '#2b1236', 0.55) } });
        const half = kind === 'big' ? G.w / 2 : Math.min(G.w / 2, text.length * (kind === 'small' ? 5.6 : 8.6) + 14);
        p.style.left = (kind === 'big' ? G.w / 2 : K.clamp(x, half, G.w - half)) + 'px'; p.style.top = y + 'px';
        el.append(p); K.later(() => p.remove(), kind === 'big' ? 1750 : kind === 'count' ? 520 : 1000);
      }
      /* the big words take turns: each gets its moment, then bows out for the next, so two never print over each other */
      function bigPop(text, x, y, col) {
        const now = performance.now(), at = Math.max(now, ST.bigFree || 0);
        ST.bigFree = at + 1000;
        const show = () => { el.querySelectorAll('.md-pop.md-big').forEach(o => o.classList.add('md-out')); pop(text, x, y, col, 'big'); };
        if (at - now > 30) K.later(show, at - now); else show();
      }
      const midY = () => Math.round(G.yFar + (G.hudTop - G.yFar) * 0.34);
      const say = (who, lines, ms) => { const d = D[who]; if (d && d.on) d.C.say(line(lines), { ms: ms || 3400 }); };
      /* The guide never sits on a dancer: of a few spots on the open floor, take the first whose label and hand are clear
         of every dancer on stage (worked out when the guide first shows, then kept, so it never jumps). */
      function spotFree(cands, label, vec) {
        const B = order.filter(d => d.on).map(d => { const s = d.size * (d.depth || 1), cx = d.hx + (d.entering ? 0 : d.tx), by = d.hy + (d.entering ? 0 : d.ty); return [cx - s / 2, by - s, cx + s / 2, by]; });
        const lw = Math.min(G.w - 24, label.length * 10.5 + 34), v = vec || [0, 0];
        let best = cands[0], bv = Infinity;
        for (const c of cands) { // label pill, chevron, the hand where it starts and where it ends
          const rs = [[c.x - lw / 2, c.y - 82, c.x + lw / 2, c.y - 46], [c.x - 20, c.y - 48, c.x + 20, c.y - 8], [c.x - 12, c.y - 4, c.x + 44, c.y + 58], [c.x + v[0] - 12, c.y + v[1] - 4, c.x + v[0] + 44, c.y + v[1] + 58]];
          let a = 0;
          for (const r of rs) for (const b of B) { const ww = Math.min(r[2], b[2]) - Math.max(r[0], b[0]), hh = Math.min(r[3], b[3]) - Math.max(r[1], b[1]); if (ww > 0 && hh > 0) a += ww * hh; }
          if (a < 160) a = 0; // a graze of a round character's corner is fine
          if (a < bv - 1) { bv = a; best = c; }
          if (!a) break;
        }
        return { x: Math.round(best.x), y: Math.round(best.y) };
      }
      const demoCands = () => [{ x: G.demo.x, y: G.demo.y }, { x: G.w * 0.22, y: G.hudTop - 36 }, { x: G.w * 0.78, y: G.hudTop - 36 }, { x: G.w / 2, y: G.hudTop - 16 }];
      const poseCands = () => { const cp = congaPath(); return [{ x: cp.cx, y: cp.cy + 12 }, { x: cp.cx, y: cp.cy + cp.ry * 0.45 }, { x: cp.cx - cp.rx * 0.42, y: cp.cy + 8 }, { x: cp.cx + cp.rx * 0.42, y: cp.cy + 8 }, { x: G.w / 2, y: G.yFar - 8 }]; };
      function freeTarget(cands, label, vec) { let s = null, ver = -1; return () => { if (!s || ver !== G.ver) { s = spotFree(cands(), label, vec); ver = G.ver; } return s; }; }
      const watchTarget = () => ({ x: G.w / 2, y: G.hudTop + 46 });
      const VEC = { l: [-84, 0], r: [84, 0], u: [0, -84], d: [0, 84], ur: [56, -56] };
      function guideMove(m, delay, extra) {
        const mv = MOVES[m], label = (extra || '') + mv.label;
        const spec = { id: 'md-' + m, g: mv.g, target: freeTarget(demoCands, label, mv.g === 'drag' ? VEC[mv.dir] : null), label, place: 'above', delay: delay ?? 900 };
        if (mv.g === 'drag') { spec.dir = mv.dir; spec.d = 84; spec.ms = 1300; }
        if (mv.g === 'circle') { spec.r = 30; spec.ms = 1500; }
        K.guide(spec);
      }

      /* ---------------- the flow, bar by bar ---------------- */
      const LINES = {
        get hello() { // read when spoken, so a late AI reading that asks for care still changes it
          return care ? { Jolly: 'That sounds like a lot. It can wait at the coat check for two minutes. Tap on the beat with me?', Cheeky: 'That’s real, and it matters. It can sit at the coat check for two minutes. Tap along?', Unfiltered: 'That matters. It can wait two minutes at the coat check. Tap on the beat.' }
            : coatItem ? { Jolly: 'I’ve hung that at the coat check. It’ll keep. Now tap on the beat with me!', Cheeky: 'Your thought’s at the coat check. It has a ticket. Now tap on the beat!', Unfiltered: 'Thought’s at the coat check. Tap on the beat.' }
              : { Jolly: 'Welcome! Worries can wait at the coat check. Tap on the beat with me!', Cheeky: 'Coat check’s open for worries. Now tap on the beat. Clapping counts as dancing.', Unfiltered: 'Worries at the coat check. Tap on the beat.' };
        },
        warmGood: { Jolly: 'Yes! You’ve got the beat.', Cheeky: 'Rhythm detected. Suspicious. I love it.', Unfiltered: 'Good. You’ve got it.' },
        r: [
          { Jolly: 'Watch me, then mirror me. Left, right!', Cheeky: 'I go, you go. Like a mirror, but with better hair.', Unfiltered: 'Watch. Then copy.' },
          { Jolly: 'New moves: up and down!', Cheeky: 'Up and down. Like my mood before coffee.', Unfiltered: 'Up. Down. Copy.' },
          { Jolly: 'Add a clap! Just tap.', Cheeky: 'Clap time. Tap the screen, not your neighbour.', Unfiltered: 'Tap to clap.' },
          { Jolly: 'Spin time! Draw a little circle.', Cheeky: 'Draw a circle to spin. Not a square. This isn’t line dancing.', Unfiltered: 'Circle means spin.' }
        ],
        again: { Jolly: 'No rush! Same moves again. Watch me, then copy.', Cheeky: 'Take two! Rehearsals are free.', Unfiltered: 'Again. Same moves.' },
        great: { Jolly: ['Perfect mirror! Look at the floor glow.', 'Four for four! We’re so in sync.'], Cheeky: ['Okay, show-off. Four for four.', 'Flawless. I’m a bit threatened.'], Unfiltered: ['Perfect.', 'Four for four.'] },
        good: { Jolly: ['So in sync! Hear the band grow?', 'Lovely! We move like one.'], Cheeky: ['The band likes you. It’s added people.', 'Smooth. Very smooth. Suspiciously smooth.'], Unfiltered: ['In sync. Band’s growing.', 'Smooth.'] },
        meh: { Jolly: ['Close! Watch my moves, then copy.', 'Nearly! The beat’s a bit sneaky.'], Cheeky: ['Bit of freestyle in there. I respect it.', 'Interpretive. Let’s try mine though.'], Unfiltered: ['Close. Watch, then copy.', 'Nearly.'] },
        patch: { Jolly: 'Room for one more? I love a group dance!', Cheeky: 'Did someone say group dance? I was hovering by the snacks.', Unfiltered: 'I’m in. Let’s go.' },
        loopie: { Jolly: 'Wait for me! Was it left? I’ll do left. Left again!', Cheeky: 'I’ve practised one move for six years. It’s left.', Unfiltered: 'Left. Left. Left. Oh, it changed?' },
        last: { Jolly: 'Last one before a surprise…', Cheeky: 'Last combo. Then something weird happens. Good weird.', Unfiltered: 'Last one. Then a twist.' },
        swap: lastRoutine
          ? { Jolly: 'Plot twist! You lead now. Last time you invented ' + lastRoutine + '. Make up any four moves!', Cheeky: 'Swap! You’re the choreographer again. ' + lastRoutine + ' was iconic. Top it.', Unfiltered: 'You lead. Any four moves. We copy. Beat ' + lastRoutine + '.' }
          : { Jolly: 'Plot twist! You lead now. Make up any four moves and we’ll copy you!', Cheeky: 'Role swap! You’re the choreographer. We’re very obedient. Mostly.', Unfiltered: 'Swap. You lead. Any four moves. We copy.' },
        named: (n) => ({ Jolly: ['We followed you! That one’s called ' + n + '.', 'Everyone copied you! Behold: ' + n + '.'], Cheeky: ['Behold: ' + n + '. Copyright you.', 'That, my friend, is ' + n + '. Iconic.'], Unfiltered: [n + '. Nice.', 'That’s ' + n + '.'] }),
        statue: { Jolly: 'The Statue! A classic. Now try some moves!', Cheeky: 'Bold choice: standing completely still. Very avant-garde.', Unfiltered: 'That was The Statue. Try moves.' },
        conga: { Jolly: 'Everybody, conga line! Swipe or tap and we all follow you.', Cheeky: 'Conga! It’s the law at the end of a party. You lead.', Unfiltered: 'Conga. You lead.' },
        pose: { Jolly: 'Big finish: tap to strike a pose!', Cheeky: 'Freeze-frame moment. Make it iconic. Tap!', Unfiltered: 'Tap. Pose.' }
      };
      function nextBar(i) {
        if (ST.cur) endBar(ST.cur);
        const spec = plan.shift() || { type: 'pose', k: 3 };
        spec.beat0 = i;
        ST.cur = spec;
        startBar(spec, i);
      }
      function startBar(spec, i) {
        const t0 = beatAt(i);
        ST.phase = spec.type;
        switch (spec.type) {
          case 'warm':
            if (spec.k === 0) {
              hud.classList.remove('md-away'); slotsReset(['C', 'C', 'C', 'C']);
              say('sync', LINES.hello, 4300);
              K.guide({ id: 'md-warm', g: 'tap', target: freeTarget(demoCands, 'TAP ON THE BEAT'), label: 'TAP ON THE BEAT', place: 'above', delay: 1500 });
            } else { slotsReset(['C', 'C', 'C', 'C']); K.guide({ id: 'md-warm2', g: 'tap', target: freeTarget(demoCands, 'TAP ON THE BEAT'), label: 'TAP ON THE BEAT', place: 'above', delay: SPB * 2 }); }
            setPhase(spec.k === 0 ? 'Warm-up · clap along' : '5, 6, 7, 8…');
            break;
          case 'call': {
            setPhase(spec.again ? 'Again · watch Sync' : 'Watch Sync');
            slotsReset(null);
            if (spec.r === PATCH_AT && !D.patch.on) { join('patch'); K.later(() => say('patch', LINES.patch, 3200), 900); }
            if (spec.r === LOOPIE_AT && !D.loopie.on) { join('loopie'); K.later(() => say('loopie', LINES.loopie, 3400), 1000); }
            const fresh = !spec.again && LINES.r[spec.r];
            if (spec.again) say('sync', LINES.again, 3000);
            else if (fresh) say('sync', LINES.r[spec.r], 3200);
            else if (spec.r === ROUNDS - 1) say('sync', LINES.last, 3000);
            else if (ST.lastResult) say('sync', ST.lastResult, 3000);
            ST.lastResult = null;
            const NEWSET = { 0: 'LR', 1: 'UD', 2: 'C', 3: 'S' }[spec.r], newMove = !spec.again && NEWSET && spec.moves.find(m => NEWSET.includes(m));
            if (newMove) guideMove(newMove, SPB * 1.2, '');
            else K.guide({ id: 'md-watch', g: 'still', target: watchTarget, label: 'WATCH, THEN COPY', place: 'above', delay: SPB * 2.5 });
            D.sync.C.face(['cool', 'wink', 'happy', 'determined'][spec.r % 4], SPB * 3.6);
            break;
          }
          case 'resp': {
            setPhase('Your turn · mirror it');
            jOf(spec);
            for (let b = 0; b < 4; b++) slotSet(b, spec.moves[b], '');
            const active = performance.now() - ST.lastGesture < SPB * 3;
            guideMove(spec.moves[0], active ? SPB * 2.2 : spec.r <= 3 ? SPB * 0.45 : SPB * 1.4);
            break;
          }
          case 'swap':
            if (spec.k === 0) {
              setPhase('Roles swap!'); slotsReset(null);
              say('sync', LINES.swap, 4400);
              bigPop('YOU LEAD!', G.w / 2, midY(), '#ffd84a');
              present().forEach(d => d.C.face('wow', SPB * 6));
              woo(0.7);
              K.guide({ id: 'md-swap', g: 'drag', dir: 'ur', d: 80, target: freeTarget(demoCands, 'ANY 4 MOVES, ON BEAT', VEC.ur), label: 'ANY 4 MOVES, ON BEAT', place: 'above', delay: SPB * 2.2, ms: 1400 });
            } else setPhase('5, 6, 7, 8…');
            ST.layers = Math.max(ST.layers, 4); setEq();
            break;
          case 'lead':
            setPhase('You lead · any 4 moves'); slotsReset(null);
            { const dir = ['ur', 'l', 'u', 'r', 'd'][spec.l % 5]; K.guide({ id: 'md-lead-' + spec.l, g: 'drag', dir, d: 80, target: freeTarget(demoCands, 'ANY 4 MOVES, ON BEAT', VEC[dir]), label: 'ANY 4 MOVES, ON BEAT', place: 'above', delay: SPB * (spec.l ? 2.4 : 1.2), ms: 1400 }); }
            present().forEach(d => { if (d.slug !== 'sync') d.C.face('think', SPB * 3); });
            break;
          case 'echo': {
            const mv = movesOf(spec);
            setPhase('They copy you!');
            for (let b = 0; b < 4; b++) slotSet(b, mv[b], spec.src.rec[b] ? '' : 'md-off');
            ST.layers = 5; setEq();
            const cam = CAMEOS[spec.l] || [];
            cam.forEach((slug, k) => { join(slug); const tr = TROUPE.find(x => x.slug === slug); K.later(() => { setPhase(tr.tag); pop(tr.tag.split(':')[0].toUpperCase() + ' JOINS!', D[slug].hx, D[slug].hy - D[slug].size - 18, tr.glow, 'small'); }, 400 + k * 700); });
            K.guide({ id: 'md-echo-' + spec.l, g: 'still', target: watchTarget, label: 'WATCH THEM COPY YOU', place: 'above', delay: SPB * 2.5 });
            break;
          }
          case 'conga':
            if (spec.k === 0) {
              ST.congaT0 = t0; ST.congaStop = null;
              order.forEach(d => { if (!d.on) join(d.slug, 500); d.groove = 0.6; });
              BAND.key = Math.pow(2, 2 / 12);
              coat.classList.add('md-gone');
              setPhase('Conga · you lead');
              say('sync', LINES.conga, 3600);
              woo(1); applause(1.6, 0.6);
              K.guide({ id: 'md-conga', g: 'tap', target: () => { const cp = congaPath(); return { x: cp.cx, y: cp.cy + 12 }; }, label: 'YOU LEAD THE CONGA', place: 'above', delay: SPB * 3 });
              slotsReset(['h', 'h', 'h', 'K']);
              crowd.forEach(c => { c.armT = Math.random() < 0.6 ? 1 : 0; });
            }
            break;
          case 'pose':
            if (spec.k === 0) {
              setPhase('Strike a pose!'); slotsReset(['P', 'P', 'P', 'P']);
              say('sync', LINES.pose, 3000);
              ST.poseAt = t0;
              K.guide({ id: 'md-pose', g: 'tap', target: freeTarget(poseCands, 'TAP: STRIKE A POSE'), label: 'TAP: STRIKE A POSE', place: 'above', delay: 500 });
            }
            break;
        }
      }
      function endBar(spec) {
        if (spec.type === 'resp') {
          const J = jOf(spec);
          J.forEach((x, b) => { if (!x.grade) { x.grade = 'miss'; slotSet(b, spec.moves[b], 'md-miss'); } });
          const m = J.filter(x => x.grade === 'hit' || x.grade === 'ok').length, hits = J.filter(x => x.grade === 'hit').length;
          ST.total += 4;
          ctx.track('round', { r: spec.r, matched: m, hits });
          const any = J.some(x => x.got);
          if (m >= 3 || (any && spec.r % 2 === 1) || (!any && spec.r >= 2 && spec.r % 2 === 1)) layerUp();
          const y = midY();
          if (m === 4 && hits >= 3) { bigPop('PERFECT MIRROR!', G.w / 2, y, '#ffd84a'); burst(); woo(1); cheer(0.5); D.sync.C.face('celebrate', SPB * 3); ST.lastResult = LINES.great; }
          else if (m >= 3) { pop('IN SYNC ×' + m, G.w / 2, y, '#4ef59c'); ST.lastResult = LINES.good; }
          else if (any) { pop(m ? 'NEARLY!' : 'FREESTYLE!', G.w / 2, y, '#b897ff'); ST.lastResult = LINES.meh; }
          if (m >= 3 && D.patch.on && spec.r === PATCH_AT) K.later(() => say('patch', { Jolly: 'We’re moving as one! Best feeling.', Cheeky: 'Look at us. A dance crew. Matching energy.', Unfiltered: 'Together. Nice.' }, 2800), 1850);
          if (D.loopie.on && spec.r === LOOPIE_AT) K.later(() => say('loopie', { Jolly: 'I did every move twice. It felt amazing.', Cheeky: 'I’m not off-beat. I’m on a loop.', Unfiltered: 'Did it twice. Worth it.' }, 2800), 1850);
        }
        if (spec.type === 'echo') {
          const mv = movesOf(spec), name = routineName(mv);
          ST.routines.push(name);
          if (name === 'The Statue' && !ST.saidStatue) { ST.saidStatue = true; say('sync', LINES.statue, 3200); }
        }
      }
      function layerUp() {
        if (ST.layers >= 5) return;
        ST.layers++; setEq();
        pop('+ ' + LAYER_NAMES[ST.layers - 1].toUpperCase(), G.w / 2, G.hudTop - 62, pal().tiles[ST.layers - 1], 'small');
        wave('flash', ST.layers - 1, 0.7);
      }
      function burst() {
        if (K.reduced()) return;
        const cols = pal().tiles;
        P.emit('confetti', 20, G.yFar + 40, 26, { angle: -Math.PI / 3, spread: 0.9, colors: cols, speed: [200, 420] });
        P.emit('confetti', G.w - 20, G.yFar + 40, 26, { angle: -Math.PI * 2 / 3, spread: 0.9, colors: cols, speed: [200, 420] });
      }
      /* each beat, as heard */
      function onBeat(i) {
        const b = ((i % 4) + 4) % 4;
        if (b === 0) nextBar(i);
        const spec = ST.cur; if (!spec) return;
        const t0 = beatAt(i);
        W.pulse = b === 0 ? 1 : 0.7; W.kick = 1;
        floorBeat(i);
        if (b === 0 && G.ball) W.glint = 1;
        switch (spec.type) {
          case 'warm': slotNow(b); danceAll('C', t0, [D.sync]); wave('C', 4, 0.5, D.sync.hx, D.sync.hy); if (spec.k === 1) pop(String(5 + b), G.w / 2, midY(), '#ffd84a', 'count'); break;
          case 'call': {
            const m = spec.moves[b];
            slotSet(b, m, ''); slotNow(b);
            dance(D.sync, m, t0);
            wave(m, colIdx(m), 0.85, D.sync.hx, D.sync.hy);
            present().forEach(d => { if (d !== D.sync) d.groove = 1; });
            if (m === 'C' || m === 'S') P.emit('star', D.sync.hx, D.sync.hy - D.sync.size * 0.6, 6, { colors: [MOVES[m].c, '#ffffff'], speed: [60, 150] });
            break;
          }
          case 'resp':
            slotNow(b);
            if (b === 3 && spec.r <= 1 && ST.repeats < 2 && !jOf(spec).some(x => x.got)) { ST.repeats++; plan.unshift({ type: 'call', r: spec.r, moves: spec.moves, again: true }, { type: 'resp', r: spec.r, moves: spec.moves, again: true }); }
            break;
          case 'swap': if (spec.k === 1) pop(String(5 + b), G.w / 2, midY(), '#ffd84a', 'count'); present().forEach(d => dance(d, 'h', t0)); break;
          case 'lead': slotNow(b); break;
          case 'echo': {
            const mv = movesOf(spec), m = mv[b];
            slotNow(b);
            danceAll(m, t0);
            present().forEach((d, k) => { if (k < 4) wave(m === 'P' ? 'C' : m, m === 'P' ? colIdx('P') : colIdx(m), 0.75, d.hx + d.tx, d.hy + d.ty); });
            if (m === 'S' && D.loopie.on) K.later(() => D.loopie.C.face('dizzy', SPB * 1.5), SPB * 0.6);
            if (m === 'S' && D.drop.on && !D.drop.entering) K.later(() => D.drop.C.face('cry', SPB * 1.2), SPB * 0.5);
            if (b === 3) {
              const name = routineName(mv), fresh = !K.collection().includes(name) && !ST.routines.includes(name);
              K.later(() => {
                bigPop(name.toUpperCase() + '!', G.w / 2, G.hudTop - 34, pal().tiles[(spec.l + 1) % 5]);
                if (name !== 'The Statue') say('sync', LINES.named(name), 3000);
                if (fresh) K.later(() => pop('NEW MOVE FOR THE BOOK', G.w / 2, G.hudTop - 70, '#ffd84a', 'small'), 600);
                woo(0.8); cheer(0.45); present().forEach(d => d.C.face(d.slug === 'loopie' ? 'laugh' : 'celebrate', SPB * 2));
              }, SPB * 0.6);
            }
            break;
          }
          case 'conga': {
            const m = b === 3 ? 'K' : 'h';
            danceAll(m, t0); slotNow(b);
            if (b === 3) { const cp = congaPath(); wave('K', Math.floor(i / 4) % 5, 0.9, cp.cx, cp.cy); P.emit('star', cp.cx + (Math.random() - 0.5) * cp.rx, cp.cy - cp.ry, 8, { colors: pal().tiles, speed: [60, 160] }); }
            if (spec.k === 1 && b === 0) D.sync.C.face('laugh', SPB * 2);
            break;
          }
          case 'pose':
            slotNow(b);
            if (spec.k === 2 && b === 3) K.later(() => strikePose(true), SPB * 0.8);
            break;
        }
      }
      /* responses still open close half a beat after their beat */
      function closeJudging(now) {
        const spec = ST.cur;
        if (!spec || spec.type !== 'resp') return;
        const J = jOf(spec);
        for (let b = 0; b < 4; b++) if (!J[b].grade && now > beatAt(spec.beat0 + b) + SPB * 0.5) { J[b].grade = 'miss'; slotSet(b, spec.moves[b], 'md-miss'); if (ST.streak) { ST.streak = 0; setStreak(); } }
      }

      /* ---------------- the player's moves ---------------- */
      function playerMove(m, t, x, y) {
        ST.gestures++; ST.lastGesture = performance.now();
        const now = performance.now(), ch = chordAt(Math.round(beatPos(now)));
        moveSound(m, A.ctx ? A.now() : 0, 1, ch);
        if (A.ctx) A.sync('move', now);
        glyph(m, x, y);
        if (!CLK.on || ST.phase === 'intro' || ST.phase === 'freeze' || ST.phase === 'end') return;
        const n = Math.round(beatPos(t)), a = at(n);
        if (!a) { freestyle(m, x, y); return; }
        const { spec, b, b0 } = a, off = t - beatAt(n);
        switch (spec.type) {
          case 'resp': judge(spec, b, b0, m, t, x, y); break;
          case 'lead': record(spec, b, m, off, x, y); break;
          case 'warm': {
            if (m === 'C' && Math.abs(off) <= WIN) { ST.warm++; pop(ST.warm % 3 === 1 ? 'ON THE BEAT!' : 'CLAP!', G.slotX[b], G.hudTop - 22, MOVES.C.c, 'small'); slotSet(b, 'C', 'md-hit'); dance(D.sync, 'C', now); if (ST.warm === 3) say('sync', LINES.warmGood, 2600); }
            else freestyle(m, x, y);
            break;
          }
          case 'echo': {
            const mv = movesOf(spec);
            if (mv[b] === m && Math.abs(off) <= WIN * 1.3) { pop('IN SYNC!', x, y - 40, MOVES[m].c, 'small'); P.emit('star', x, y, 10, { colors: [MOVES[m].c, '#fff'] }); ladder(4 + b); }
            else freestyle(m, x, y);
            break;
          }
          case 'conga': danceAll(m, now); wave(m, colIdx(m), 0.9, x, y); P.emit('star', x, y, 8, { colors: [MOVES[m].c, '#fff'] }); if (b === 3 && Math.abs(off) <= WIN) { pop('KICK!', G.slotX[3], G.hudTop - 24, MOVES.K.c, 'small'); slotSet(3, 'K', 'md-hit'); ladder(6); } break;
          case 'pose': strikePose(false); break;
          case 'call':
            ST.eager++; freestyle(m, x, y);
            if (ST.eager >= 3 && !ST.eagerSaid && spec.r >= 1) { ST.eagerSaid = true; say('sync', { Jolly: 'Ooh, eager! Watch first, then it’s your turn.', Cheeky: 'Patience, star. My turn, then yours.', Unfiltered: 'Watch first. Then you.' }, 2600); }
            break;
          default: freestyle(m, x, y);
        }
      }
      function freestyle(m, x, y) { wave(m, colIdx(m), 0.45, x, y); P.emit('spark', x, y, 5, { colors: [MOVES[m].c, '#ffffff'], speed: [40, 120] }); }
      function judge(spec, b, b0, m, t, x, y) {
        const J = jOf(spec);
        let slot = b;
        if (J[slot].grade) {
          const alt = t > beatAt(b0 + b) ? b + 1 : b - 1;
          if (alt >= 0 && alt < 4 && !J[alt].grade && Math.abs(t - beatAt(b0 + alt)) < SPB * 0.75) slot = alt; else { freestyle(m, x, y); return; }
        }
        const dd = Math.abs(t - beatAt(b0 + slot)), match = m === J[slot].exp, grade = match ? (dd <= WIN ? 'hit' : 'ok') : 'off';
        J[slot].got = m; J[slot].grade = grade;
        if (grade === 'off') { ST.offs++; ST.streak = 0; } else { if (grade === 'hit') ST.hits++; else ST.oks++; ST.streak++; ST.best = Math.max(ST.best, ST.streak); }
        setStreak();
        slotSet(slot, J[slot].exp, 'md-' + grade);
        const now = performance.now();
        danceAll(m, now);
        wave(m, colIdx(m), grade === 'hit' ? 1.15 : grade === 'ok' ? 0.85 : 0.45, x, y);
        const py = G.hudTop - (slot % 2 ? 50 : 24);
        if (grade === 'hit') {
          pop(['IN SYNC!', 'MIRRORED!', 'YES!', 'SMOOTH!'][(ST.hits + slot) % 4], G.slotX[slot], py, MOVES[m].c, 'small');
          ladder(ST.streak); P.emit('star', x, y, 12, { colors: [MOVES[m].c, '#ffffff', '#ffd84a'], speed: [70, 210] });
          P.emit('spark', D.sync.hx, D.sync.hy - D.sync.size * 0.55, 6, { colors: [MOVES[m].c, '#ffffff'], speed: [40, 130] });
          if (ST.streak > 0 && ST.streak % 8 === 0 && slot !== 3) { bigPop('STREAK ' + ST.streak + '!', G.w / 2, midY(), '#ffd84a'); woo(0.8); }
        } else if (grade === 'ok') { pop(t < beatAt(b0 + slot) ? 'BIT EARLY' : 'BIT LATE', G.slotX[slot], py, MOVES[m].c, 'small'); P.emit('star', x, y, 6, { colors: [MOVES[m].c, '#ffffff'] }); }
        else {
          pop('FREESTYLE!', G.slotX[slot], py, '#b897ff', 'small');
          if (D.loopie.on && Math.random() < 0.5) dance(D.loopie, J[slot].exp, now + SPB * 0.1);
          if (Math.random() < 0.35) D.sync.C.face('surprised', SPB * 1.2);
        }
        if (grade === 'hit' && slot === 3 && J.every(q => q.grade === 'hit')) present().forEach(d => d.C.face(d.slug === 'sync' ? 'laugh' : 'happy', SPB * 2));
      }
      function record(spec, b, m, off, x, y) {
        if (Math.abs(off) > SPB * 0.45) { freestyle(m, x, y); return; }
        const first = !spec.rec.some(Boolean);
        spec.rec[b] = m;
        slotSet(b, m, 'md-hit');
        wave(m, colIdx(m), 0.9, x, y);
        pop(MOVES[m].name.toUpperCase() + '!', G.slotX[b], G.hudTop - (b % 2 ? 50 : 24), MOVES[m].c, 'small');
        P.emit('star', x, y, 9, { colors: [MOVES[m].c, '#ffffff'], speed: [60, 170] });
        const watchers = present().filter(d => d.slug !== 'sync');
        if (watchers.length) watchers[(b + spec.l) % watchers.length].C.face(first ? 'wow' : 'think', SPB * 1.4);
      }
      function glyph(m, x, y) {
        const tr = trails[trails.length - 1];
        if (tr && !tr.c) tr.c = MOVES[m].c;
        bursts.push({ m, x, y, t0: performance.now() });
        if (bursts.length > 6) bursts.shift();
      }

      /* gesture recognition on the floor: swipe (four ways), tap (clap), circle (spin) */
      let gst = null;
      const trails = [], bursts = [];
      const dirOf = (ex, ey) => (Math.abs(ex) >= Math.abs(ey) ? (ex < 0 ? 'L' : 'R') : (ey < 0 ? 'U' : 'D'));
      function commit(m) { if (!gst || gst.done) return; gst.done = true; playerMove(m, gst.t0, gst.x0, gst.y0); }
      K.press(pad, {
        space: el,
        down: (p, e) => {
          const now = performance.now();
          const t = e && e.timeStamp > 0 && Math.abs(e.timeStamp - now) < 400 ? e.timeStamp : now;
          gst = { t0: t, x0: p.x, y0: p.y, last: p, turn: 0, ang: null, len: 0, done: false };
          trails.push({ pts: [{ x: p.x, y: p.y, t: now }], c: null, end: 0 }); if (trails.length > 4) trails.shift();
          if (A.ctx) A.shaker(A.now(), 0.035);
          P.emit('spark', p.x, p.y, 3, { colors: ['#ffffff'], speed: [20, 60] });
        },
        move: (p) => {
          if (!gst) return;
          const tr = trails[trails.length - 1]; if (tr) tr.pts.push({ x: p.x, y: p.y, t: performance.now() });
          if (gst.done) return;
          const dx = p.x - gst.last.x, dy = p.y - gst.last.y, dd = Math.hypot(dx, dy);
          if (dd < 3) return;
          const ang = Math.atan2(dy, dx);
          if (gst.ang != null && dd > 3.5) { let da = ang - gst.ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; gst.turn += da; }
          gst.ang = ang; gst.len += dd; gst.last = p;
          const ex = p.x - gst.x0, ey = p.y - gst.y0, dist = Math.hypot(ex, ey);
          if (Math.abs(gst.turn) > 4.6) commit('S');
          else if (dist > 64 && Math.abs(gst.turn) < 1.0 && gst.len < dist * 1.3) commit(dirOf(ex, ey));
        },
        up: (p) => {
          const tr = trails[trails.length - 1]; if (tr) tr.end = performance.now();
          if (!gst) return;
          if (!gst.done) {
            const ex = p.x - gst.x0, ey = p.y - gst.y0, dist = Math.hypot(ex, ey);
            let m;
            if (gst.len < 22 && dist < 22) m = 'C';
            else if (Math.abs(gst.turn) > 3.4 || (gst.len > 2.4 * Math.max(dist, 1) && gst.len > 90)) m = 'S';
            else m = dirOf(ex, ey);
            commit(m);
          }
          gst = null;
        }
      });
      K.onKey(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter', 'KeyC', 'KeyS'], (e) => {
        if (e.repeat || ST.phase === 'intro') return;
        const m = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D', Space: 'C', KeyC: 'C', Enter: 'S', KeyS: 'S' }[e.code];
        if (!m) return;
        e.preventDefault(); A.unlock(); K.guideDone();
        playerMove(m, performance.now(), G.demo.x, G.demo.y);
      });

      /* ---------------- drawing ---------------- */
      const W = { pulse: 0, kick: 0, glint: 0 };
      const SPL = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
      const SPOTS = []; { const R = K.rng(77); for (let i = 0; i < 46; i++) SPOTS.push({ lat: (R() * 2 - 1) * 1.15, lon: R() * TAU, s: 0.6 + R() * 0.9, c: R() < 0.28 ? 1 + Math.floor(R() * 4) : 0 }); }
      let dk = true, fT = 0;
      function spotGoals(now) {
        const s = D.sync, cp = G.you, ph = ST.phase;
        if (ph === 'warm' || ph === 'call' || ph === 'intro') return [{ x: s.hx - 10, y: s.hy - 4 }, { x: s.hx + 10, y: s.hy - 4 }];
        if (ph === 'resp' || ph === 'lead' || ph === 'swap') return [{ x: cp.x - 26, y: cp.y }, { x: cp.x + 26, y: cp.y }];
        if (ph === 'echo') return [{ x: G.w * 0.3, y: (G.yFar + G.hudTop) / 2 }, { x: G.w * 0.7, y: (G.yFar + G.hudTop) / 2 }];
        const k = (ph === 'freeze' ? ST.frozenAt : now) / 1000, mid = (G.yFar + G.hudTop) / 2, amp = (G.hudTop - G.yFar) * 0.32;
        return [{ x: G.w / 2 + Math.sin(k * 1.3) * G.w * 0.36, y: mid + Math.sin(k * 0.9) * amp }, { x: G.w / 2 + Math.sin(k * 1.1 + 2) * G.w * 0.36, y: mid + Math.sin(k * 0.8 + 1) * amp }];
      }
      function drawSpotlights(g, dt, now) {
        const goals = spotGoals(now), add = dk ? 'lighter' : 'source-over';
        for (let k = 0; k < 2; k++) {
          const s = G.src[k], a = SPL[k], gl = goals[k];
          if (ST.phase !== 'freeze') { const e = Math.min(1, dt * 3.2); a.x += (gl.x - a.x) * e; a.y += (gl.y - a.y) * e; }
          const ang = Math.atan2(a.y - s.y, a.x - s.x), len = Math.hypot(a.x - s.x, a.y - s.y) + 24;
          g.save(); g.translate(s.x, s.y); g.rotate(ang - Math.PI / 2);
          g.globalCompositeOperation = add; g.globalAlpha = dk ? 0.3 : 0.2;
          g.drawImage(CONE, -G.coneW / 2, 0, G.coneW, len);
          g.restore();
          g.globalCompositeOperation = add; g.globalAlpha = (dk ? 0.5 : 0.32) * (0.75 + 0.25 * W.pulse);
          g.drawImage(POOLW, a.x - G.coneW * 0.8, a.y - G.coneW * 0.22, G.coneW * 1.6, G.coneW * 0.44);
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      function drawSpots(g, bp) {
        const B = G.ball, rot = bp * TAU / 24 * (ST.phase === 'conga' || ST.phase === 'pose' ? 1.6 : 1);
        g.globalCompositeOperation = dk ? 'lighter' : 'source-over';
        for (const s of SPOTS) {
          const lon = s.lon + rot, f = Math.cos(lon); if (f < 0.12) continue;
          const dx = Math.sin(lon) * Math.cos(s.lat), dy = Math.sin(s.lat);
          const x = B.x + dx * G.w * 0.95, y = B.y + dy * G.H * 0.8 + G.H * 0.14;
          if (y < 0 || y > G.H || x < -10 || x > G.w + 10) continue;
          const floor = y > G.yFar, r = (2 + s.s * 2.4) * (floor ? 1.5 : 1);
          g.globalAlpha = Math.min(1, f * (dk ? 0.8 : 0.55) * (0.6 + 0.4 * W.pulse));
          g.drawImage(DOT[s.c], x - r * 2, y - r * (floor ? 1.1 : 2), r * 4, r * (floor ? 2.2 : 4));
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      function wallLife(g, now, bp) {
        const kick = W.kick;
        if (FL.id === 'disco') {
          for (const s of G.speakers) {
            const r = s.r * (1 + 0.1 * kick);
            g.fillStyle = dk ? '#0a070d' : '#2a1a2e'; g.beginPath(); g.arc(s.x, s.y, r, 0, TAU); g.fill();
            g.strokeStyle = dk ? 'rgba(255,207,107,0.45)' : 'rgba(255,240,210,0.7)'; g.lineWidth = 1.5; g.beginPath(); g.arc(s.x, s.y, r * 0.62, 0, TAU); g.stroke();
            g.fillStyle = dk ? '#3a2f40' : '#6a4a70'; g.beginPath(); g.arc(s.x, s.y, r * 0.22, 0, TAU); g.fill();
          }
        } else if (FL.id === 'neon') {
          g.globalCompositeOperation = dk ? 'lighter' : 'source-over';
          const cols = pal().tiles, B = G.ball, n = ST.layers >= 3 || ST.phase === 'conga' ? 4 : 2;
          for (let k = 0; k < n; k++) {
            const a = Math.PI / 2 + Math.sin(bp * Math.PI / 4 + k * 1.7) * 0.9;
            const ex = B.x + Math.cos(a) * G.H * 1.2, ey = B.y + Math.sin(a) * G.H * 1.2;
            g.strokeStyle = cols[k % 4]; g.globalAlpha = (dk ? 0.22 : 0.3) * (0.6 + 0.4 * W.pulse); g.lineWidth = 6; g.beginPath(); g.moveTo(B.x, B.y); g.lineTo(ex, ey); g.stroke();
            g.globalAlpha = dk ? 0.75 : 0.6; g.lineWidth = 1.4; g.beginPath(); g.moveTo(B.x, B.y); g.lineTo(ex, ey); g.stroke();
          }
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        } else if (FL.id === 'garden') {
          g.globalCompositeOperation = dk ? 'lighter' : 'source-over';
          const cols = pal().tiles;
          for (const b of G.bulbs) { g.globalAlpha = (dk ? 0.55 : 0.4) * (0.65 + 0.35 * Math.sin(now / 1000 * 2.4 + b.ph)) + 0.25 * W.pulse * (b.c === Math.floor(bp) % 4 ? 1 : 0); g.drawImage(GLOW[b.c], b.x - 14, b.y - 14, 28, 28); }
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
          if (dk && Math.random() < 0.06) P.emit('mote', Math.random() * G.w, G.yFar - 20 - Math.random() * 60, 1, { colors: ['#eaff9a', '#fff3a0'] });
          void cols;
        }
      }
      function drawDancerFX(g, d) {
        const fx = d.hx + d.tx, fy = d.hy + d.ty, o = d.o, sc = d.depth || 1, size = d.size;
        g.globalCompositeOperation = dk ? 'lighter' : 'source-over';
        g.globalAlpha = (dk ? 0.55 : 0.36) * (0.6 + 0.4 * W.pulse);
        g.drawImage(POOL[d.slug], fx - size * 0.85 * sc, fy - size * 0.2 * sc, size * 1.7 * sc, size * 0.46 * sc);
        g.globalCompositeOperation = 'source-over';
        const img = d.img; if (!img.complete || !img.naturalWidth) return;
        const lift = Math.max(0, -o.y);
        g.globalAlpha = (dk ? 0.27 : 0.2) * Math.max(0.25, 1 - lift / 48) * (d.entering ? 0.5 : 1);
        g.save(); g.translate(fx, fy + 3); g.scale(1, -1);
        g.translate(o.x, o.y - 0.45 * size * sc); g.rotate(o.r * Math.PI / 180); g.scale(o.sx * sc, o.sy * sc);
        try { g.drawImage(img, -size / 2, -0.55 * size, size, size); } catch (e) { /* not decoded yet */ }
        g.restore(); g.globalAlpha = 1;
      }
      function drawTiles(g) {
        g.globalCompositeOperation = dk ? 'lighter' : 'source-over';
        const k0 = dk ? 0.68 : 0.8;
        for (let i = 0; i < NT; i++) {
          const a = LV[i]; if (a < 0.035) continue;
          g.globalAlpha = Math.min(1, a) * k0; g.fillStyle = COLS[CI[i]];
          quad(g, G.tiles[i].qi); g.fill();
        }
        if (dk) for (let i = 0; i < NT; i++) { const a = LV[i]; if (a < 0.55) continue; const t = G.tiles[i], r = t.wpx * 0.9; g.globalAlpha = Math.min(1, a - 0.45) * 0.65; g.drawImage(GLOW[CI[i]], t.cx - r, t.cy - r * 0.62, r * 2, r * 1.24); }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      function drawTrails(g, now) {
        g.globalCompositeOperation = dk ? 'lighter' : 'source-over'; g.lineCap = 'round'; g.lineJoin = 'round';
        for (const tr of trails) {
          const age = tr.end ? now - tr.end : 0; if (age > 420 || tr.pts.length < 2) continue;
          const a = 1 - age / 420, c = tr.c || '#ffffff';
          g.strokeStyle = c; g.globalAlpha = 0.22 * a; g.lineWidth = 16; g.beginPath(); tr.pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke();
          g.globalAlpha = 0.9 * a; g.lineWidth = 4; g.stroke();
        }
        for (const b of bursts) {
          const k = (now - b.t0) / 520; if (k > 1) continue;
          const c = MOVES[b.m].c, r = 16 + k * 46;
          g.globalAlpha = (1 - k) * 0.85; g.strokeStyle = c; g.lineWidth = 3.5 * (1 - k) + 1;
          if (b.m === 'C' || b.m === 'P') { g.beginPath(); g.arc(b.x, b.y, r, 0, TAU); g.stroke(); }
          else if (b.m === 'S') { g.beginPath(); g.arc(b.x, b.y, r * 0.8, k * 6, k * 6 + Math.PI * 1.5); g.stroke(); }
          else { const a = { L: Math.PI, R: 0, U: -Math.PI / 2, D: Math.PI / 2 }[b.m], cx = b.x + Math.cos(a) * r * 0.9, cy = b.y + Math.sin(a) * r * 0.9; g.beginPath(); g.moveTo(cx + Math.cos(a + 2.5) * 16, cy + Math.sin(a + 2.5) * 16); g.lineTo(cx, cy); g.lineTo(cx + Math.cos(a - 2.5) * 16, cy + Math.sin(a - 2.5) * 16); g.stroke(); }
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      /* the conga line's light rope: from the last dancer to Sync, marching dashes */
      function drawConga(g, now) {
        if (!ST.congaT0) return;
        const k = Math.min(1, (now - ST.congaT0) / (SPB * 2)); if (k <= 0) return;
        const cp = congaPath(), s = ST.congaS || 0, n = 48, tail = 6 * 0.13 + 0.03, cols = pal().tiles;
        const pt = (u) => { const th = TAU * (s + 0.03 - tail * u) + Math.PI * 0.5; return [cp.cx + cp.rx * Math.cos(th), cp.cy + cp.ry * Math.sin(th)]; };
        g.globalCompositeOperation = dk ? 'lighter' : 'source-over'; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); for (let i = 0; i <= n; i++) { const [x, y] = pt(i / n); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        g.strokeStyle = cols[Math.floor(beatPos(now) / 2) % cols.length]; g.globalAlpha = 0.26 * k; g.lineWidth = 18; g.stroke();
        g.setLineDash([10, 12]); g.lineDashOffset = -(now / 22) % 22; g.globalAlpha = 0.85 * k; g.lineWidth = 3.5; g.strokeStyle = dk ? '#ffffff' : '#fff8e8'; g.stroke(); g.setLineDash([]);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      function drawBall(g, bp) {
        const B = G.ball, AB = L.ball; if (!AB) return;
        g.strokeStyle = dk ? 'rgba(210,205,225,0.6)' : 'rgba(70,50,80,0.55)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(B.x, B.top); g.lineTo(B.x, B.y - B.r); g.stroke();
        g.fillStyle = dk ? '#55506a' : '#5a4a60'; g.fillRect(B.x - 4, B.y - B.r - 5, 8, 6);
        const spin = ST.phase === 'conga' || ST.phase === 'pose' ? 2 : 1;
        const fi = ((Math.floor(bp * AB.N / 2 * spin) % AB.N) + AB.N) % AB.N;
        g.globalCompositeOperation = dk ? 'lighter' : 'source-over'; g.globalAlpha = (dk ? 0.5 : 0.35) * (0.6 + 0.4 * W.pulse);
        g.drawImage(GLOW[COLS.length - 1] || DOT[0], B.x - B.r * 2.2, B.y - B.r * 2.2, B.r * 4.4, B.r * 4.4);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.drawImage(AB.c, fi * AB.px, 0, AB.px, AB.px, B.x - AB.size / 2, B.y - AB.size / 2, AB.size, AB.size);
        if (W.glint > 0.05) {
          g.globalCompositeOperation = 'lighter'; g.fillStyle = '#ffffff';
          for (let k = 0; k < 3; k++) { const a = (Math.floor(bp) * 2.3 + k * 2.1) % TAU, rr = B.r * (0.35 + 0.18 * k); g.globalAlpha = W.glint * (0.9 - k * 0.2); K.starPath(g, B.x + Math.cos(a) * rr, B.y + Math.sin(a) * rr * 0.8, 7 - k, 1.4, 4, 0); g.fill(); }
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        }
      }
      function draw(dt, now) {
        const g = cv.g, w = G.w, H = G.H;
        dk = dark();
        const tv = ST.phase === 'freeze' || ST.phase === 'end' ? ST.frozenAt : now;
        const bp = CLK.t0 ? beatPos(tv) : now / SPB;
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.drawImage(L.bg.c, 0, 0, w, H);
        wallLife(g, tv, bp);
        drawCrowd(g, false, bp, now);
        drawSpots(g, bp);
        drawSpotlights(g, dt, now);
        const vis = order.filter(d => d.on).sort((a, b) => (a.hy + a.ty) - (b.hy + b.ty));
        drawConga(g, tv);
        for (const d of vis) drawDancerFX(g, d);
        drawTiles(g);
        drawTrails(g, now);
        P.update(dt); P.draw(g);
        drawCrowd(g, true, bp, now);
        drawBall(g, bp);
        if (++fT % 12 === 0 && ST.congaT0) vis.forEach((d, k) => { const z = String(30 + k); if (d.wrap.style.zIndex !== z) d.wrap.style.zIndex = z; });
      }

      /* ---------------- frame loop ---------------- */
      K.loop((dtIn) => {
        if (!cv.g || !L.bg) return;
        const now = performance.now(), dt = Math.min(0.05, dtIn);
        if (CLK.on) {
          if (now - beatAt(CLK.shown + 1) > SPB * 1.6) CLK.t0 += now - beatAt(CLK.shown + 1) - 20; // after a stall (hidden tab), resume where we were
          while (beatAt(CLK.shown + 1) <= now && CLK.on) { CLK.shown++; onBeat(CLK.shown); }
          schedule(now);
          closeJudging(now);
        }
        W.pulse *= Math.exp(-dt * 5); W.kick *= Math.exp(-dt * 9); W.glint *= Math.exp(-dt * 3);
        const bp = CLK.t0 ? beatPos(ST.phase === 'freeze' || ST.phase === 'end' ? ST.frozenAt : now) : 0;
        for (const d of order) if (d.on) updDancer(d, ST.phase === 'freeze' || ST.phase === 'end' ? ST.frozenAt : now, bp);
        if (ST.phase !== 'freeze' && ST.phase !== 'end') stepTiles(dt, now);
        draw(dt, now);
      });

      /* ---------------- the finale: conga, pose, freeze-frame ---------------- */
      function strikePose(auto) {
        if (ST.phase === 'freeze' || ST.finished) return;
        ST.phase = 'freeze'; ST.frozenAt = performance.now();
        CLK.on = false;
        K.guide(null); hud.classList.add('md-away');
        order.forEach((d, i) => {
          if (!d.on) return;
          d.moves = []; d.entering = false; d.enter = null;
          d.freeze = { x: (i % 2 ? 6 : -6), y: -10 - (i % 3) * 4, r: [-14, 12, -18, 16, -8, 10, -20][i] || 0, sx: 1.08, sy: 1.08 };
          d.C.face(POSE_FACE[d.slug] || 'celebrate');
          d.C.hush();
        });
        for (let n = 0; n < NT; n++) { const t = G.tiles[n]; LV[n] = 0.55 + 0.45 * ((t.j + t.k) % 2); CI[n] = (t.j * 2 + t.k) % 5; }
        if (A.ctx) {
          const t = A.now(), fin = ['D4', 'F#4', 'A4', 'C#5', 'D5'];
          fin.forEach((n, k) => { A.pluck(A.note(n), { when: t + k * 0.01, vol: 0.14, damp: 0.995, dur: 2.4 }); A.tone({ when: t, type: 'sawtooth', freq: A.note(n), dur: 1.6, vol: 0.018, attack: 0.01, lp: 2400, verb: 0.4 }); });
          A.noise({ when: t, filter: 'highpass', freq: 4200, dur: 1.9, attack: 0.005, vol: 0.12, verb: 0.3 });
          A.click({ vol: 0.16 }); A.noise({ when: t + 0.02, filter: 'bandpass', freq: 2400, q: 2, dur: 0.07, vol: 0.12 });
          A.sync('pose', performance.now());
        }
        woo(1.2); applause(3.4, 1); crowd.forEach(c => { c.armT = 1; c.arm = 1; });
        if (!K.reduced()) { const f = h('div', { class: 'md-flash', 'aria-hidden': 'true' }); el.append(f); K.later(() => f.remove(), 700); }
        ctx.track('pose', { auto: auto ? 1 : 0 });
        K.later(photo, 300);
        K.later(() => { K.finale('confetti', { z: 25, colors: pal().tiles.concat(['#ffffff']), from: [{ x: G.w * 0.2, y: G.yFar + 30 }, { x: G.w * 0.8, y: G.yFar + 30 }], chord: ['D4', 'F#4', 'A4', 'C#5'], ms: 3200 }); }, 380);
        K.later(end, 4200);
      }
      function photo() {
        const d = new Date(), date = String(d.getMonth() + 1).padStart(2, '0') + ' ' + String(d.getDate()).padStart(2, '0') + ' \'' + String(d.getFullYear()).slice(2);
        const ph = h('div', { class: 'md-photo', 'aria-hidden': 'true' },
          h('span', { class: 'md-date', text: date }),
          h('div', { class: 'md-cap' }, h('b', { text: 'Danced in sync with the whole cast' }), h('span', { text: 'Mirror Dance · ' + FL.name })));
        el.append(ph);
      }
      function end() {
        if (ST.finished) return;
        ST.finished = true; ST.phase = 'end';
        const total = Math.max(1, ST.total), matched = ST.hits + ST.oks;
        const score = (ST.hits + 0.6 * ST.oks) / total;
        const tier = K.tier(score);
        const badges = [];
        if (tier) badges.push(tier + ': ' + { Gold: 'mirror-perfect', Silver: 'smooth mirror', Bronze: 'in the groove' }[tier]);
        const names = Array.from(new Set(ST.routines));
        const fresh = []; let count = K.collection().length;
        names.forEach(n => { const c = K.collect(n); if (c.isNew) fresh.push(n); count = c.count; });
        badges.push(fresh.length ? 'New move' + (fresh.length > 1 ? 's' : '') + ': ' + fresh.slice(0, 2).join(', ') + ' (' + count + ' of ' + MOVE_BOOK + ')' : 'Move book: ' + count + ' of ' + MOVE_BOOK);
        const fav = names.filter(n => n !== 'The Statue');
        if (fav.length) S.store.set(ID + ':last', fav[fav.length - 1]);
        ctx.track('done', { matched, total: ST.total, hits: ST.hits, best: ST.best, leads: names.length, tier: tier || 'none' });
        const dancers = order.filter(x => x.on).length;
        ctx.finish({
          title: 'In sync with the whole cast', mood: 'celebrate',
          lines: [matched + ' of ' + ST.total + ' moves mirrored, ' + ST.hits + ' right on the beat', 'You led ' + names.length + ' routine' + (names.length === 1 ? '' : 's') + ' and ' + dancers + ' dancers followed',
            care && coatItem ? 'What’s at the coat check deserves proper help, not just a dance' : 'Best streak tonight: ' + ST.best + ' · Tomorrow: ' + FL_NEXT.name],
          share: 'Danced in sync with the whole cast.',
          badges
        });
      }

      /* ---------------- start ---------------- */
      cv.onResize(() => { layout(); });
      S.on('theme', () => { el.classList.toggle('md-bright', !dark()); buildSprites(); paintBg(); slots.forEach((s, i) => { if (s.m) s.el.style.setProperty('--c', colOf(s.m)); void i; }); setEq(); });
      D.sync.on = true; D.sync.C.show(true);
      (async () => {
        await K.intro({ title: 'Mirror Dance', sub: 'Tonight: ' + FL.name + (golden ? ', under the gold mirror ball (regulars only)' : '') + '. The cast dances, you mirror them. Then you lead and they copy you.', how: 'Swipe, tap and circle on the beat.', char: 'sync', mood: 'laugh' });
        coat.hidden = false;
        if (!D.sync.enter) { D.sync.enter = { t0: performance.now(), dur: 700, fx: 0, fy: -40 }; D.sync.entering = true; }
        CLK.t0 = performance.now() + 500; CLK.on = true; ST.phase = 'warm';
        if (golden) K.later(() => { W.glint = 1; if (A.ctx) K.sfx.sparkle(); }, 700);
        ctx.track('begin', { floor: FL.id, words: coatItem ? 1 : 0, regular: golden ? 1 : 0 });
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = performance.now(); while (!fn() && performance.now() - t0 < (ms || 60000)) await K.wait(50); };
          await until(() => CLK.on || ST.finished, 20000);
          const LEAD_SEQ = [['L', 'R', 'S', 'C'], ['U', 'D', 'U', 'D'], ['C', 'S', 'C', 'S'], ['L', 'L', 'R', 'R'], ['S', 'U', 'S', 'D']];
          const pr = () => K.rectIn(pad, el);
          async function gesture(m) {
            const r = pr(), cx = G.demo.x - r.x, cy = G.demo.y - r.y;
            if (m === 'C' || m === 'P') { await K.sim.tap(pad, cx, cy); return; }
            if (m === 'S') { const rad = 34, ctl = await K.sim.press(pad, cx + rad, cy); for (let k = 1; k <= 8; k++) { await K.wait(10); const a = k / 8 * TAU * 1.08; ctl.move(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); } ctl.up(cx + rad, cy + 4); await K.wait(30); return; }
            const v = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] }[m];
            await K.sim.drag(pad, { x: cx - v[0] * 30, y: cy - v[1] * 30 }, { x: cx + v[0] * 70, y: cy + v[1] * 70 }, 80, 5);
          }
          let guard = 0;
          while (!ST.finished && guard++ < 400) {
            if (ST.phase === 'freeze' || ST.phase === 'end') { await until(() => ST.finished, 8000); break; }
            if (ST.phase === 'pose') { await K.wait(SPB * 1.2); if (ST.phase === 'pose') await K.sim.tap(pad, G.demo.x - pr().x, G.demo.y - pr().y); await K.wait(200); continue; }
            const now = performance.now(), n = Math.ceil(beatPos(now + 60)), a = at(n);
            let m = null;
            if (a) {
              if (a.spec.type === 'resp') m = a.spec.moves[a.b];
              else if (a.spec.type === 'lead') m = LEAD_SEQ[a.spec.l % LEAD_SEQ.length][a.b];
              else if (a.spec.type === 'warm' && a.spec.k === 1) m = 'C';
              else if (a.spec.type === 'conga' && a.spec.k >= 2 && a.b === 2) m = 'U';
            }
            const wait = beatAt(n) - performance.now() - 15;
            if (wait > 0) await K.wait(wait);
            if (m && !ST.finished && performance.now() - beatAt(n) < SPB * 0.3) await gesture(m); else await K.wait(40); // a busy machine can wake us late: skip a beat rather than land between two
          }
          await until(() => ST.finished, 12000);
        }
      };
    }
  });
})(window.TSG_ENV);
