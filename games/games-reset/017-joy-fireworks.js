/* 017 Joy Fireworks — Reset · AMPLIFY · Positive State
 * Mechanism: savouring (Bryant & Veroff 2007): deliberately expanding a good moment by attending to its details (who was
 * there, what you saw and heard, how your body felt, why it mattered) amplifies and extends positive emotion. Every
 * detail the player savours becomes its own firework, and every boom lands on the music's beat, so attention stays with
 * the good thing for two whole minutes instead of skimming past it.
 * Verb: build (drag a sense into the mortar, pick the detail) and launch (swipe up); twist: the grand finale, tap on the
 * beat (on the beat = bigger shells, never a fail). Finale: the smoke clears to mirror-still reflections and a cheering
 * crowd, the whole moment bursts across the sky, and the show you made replays shell by shell, words and all.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const ID = 'joy-fireworks';

  /* Savouring, sense by sense: each detail becomes its own shell type, coloured by its sense. */
  const SENSES = [
    { id: 'who', short: 'Who', q: 'Who was there?', shell: 'heart', name: 'Heart', c: ['#ff6fae', '#ffd3e8', '#ff3d8b'],
      opts: ['A good friend', 'Family', 'My partner', 'A pet', 'A kind stranger', 'My kid', 'Workmates'],
      ask: { Jolly: 'Who was there? Picture them, or just you.', Cheeky: 'Cast list, please. Who was there?', Unfiltered: 'Who was there?' } },
    { id: 'saw', short: 'Saw', q: 'What did you see?', shell: 'peony', name: 'Peony', c: ['#6ff29a', '#e2ffe9', '#d8ff5a'],
      opts: ['Golden light', 'A big smile', 'The sky', 'Bright colours', 'Their face', 'Water', 'Green trees', 'A great view'],
      ask: { Jolly: 'What did you see? The light, the colours, a face?', Cheeky: 'Paint me the picture. What did you see?', Unfiltered: 'What did you see?' } },
    { id: 'heard', short: 'Heard', q: 'What could you hear?', shell: 'crossette', name: 'Crossette', c: ['#6fe9ff', '#e8fcff', '#3aa6ff'],
      opts: ['Laughter', 'Music', 'Birdsong', 'A voice I love', 'Rain', 'Quiet', 'Waves', 'Cheering'],
      ask: { Jolly: 'What could you hear? Play it back for a second.', Cheeky: 'Soundtrack, please. What could you hear?', Unfiltered: 'What did it sound like?' } },
    { id: 'felt', short: 'Felt', q: 'How did your body feel?', shell: 'willow', name: 'Willow', c: ['#ffb24a', '#ffe6ad', '#ff7a22'],
      opts: ['Warm', 'Light', 'Relaxed', 'Buzzing', 'Loose shoulders', 'A big grin', 'Calm', 'Full'],
      ask: { Jolly: 'How did your body feel? Notice it again, right now.', Cheeky: 'Body report. Warm? Wobbly? Grinning?', Unfiltered: 'How did your body feel?' } },
    { id: 'why', short: 'Why', q: 'Why did it matter?', shell: 'ring', name: 'Ring', c: ['#b69cff', '#f1e9ff', '#7d5cff'],
      opts: ['I felt seen', 'I needed it', 'It was easy', 'I did it', 'Pure fun', 'It felt like me', 'I felt safe', 'It was ours'],
      ask: { Jolly: 'Why did it matter to you? Even a little.', Cheeky: 'The deep bit. Why did it matter?', Unfiltered: 'Why did it matter?' } }
  ];
  const SHELL_TOTAL = 6; // the five sense shells, plus the gold Kamuro earned in the grand finale
  const ICON = {
    who: '<circle cx="8.5" cy="8" r="3"/><circle cx="15.8" cy="8.6" r="2.6"/><path d="M3 19.5c0-3.4 2.4-5.8 5.5-5.8s5.5 2.4 5.5 5.8M13.6 14.3c.7-.4 1.4-.6 2.2-.6 2.8 0 5 2.2 5 5.4"/>',
    saw: '<path d="M2.2 12s3.6-6.4 9.8-6.4S21.8 12 21.8 12s-3.6 6.4-9.8 6.4S2.2 12 2.2 12z"/><circle cx="12" cy="12" r="3.1"/>',
    heard: '<path d="M4 9.2v5.6h3.2L11.5 19V5L7.2 9.2z"/><path d="M15 9.3a3.9 3.9 0 0 1 0 5.4M17.7 6.6a7.6 7.6 0 0 1 0 10.8"/>',
    felt: '<circle cx="12" cy="5.6" r="2.5"/><path d="M7.4 20.5V14c0-2.8 2-4.7 4.6-4.7s4.6 1.9 4.6 4.7v6.5"/><path d="M3.2 10.6l2 .9M20.8 10.6l-2 .9M3.6 15.8h2M18.4 15.8h2"/>',
    why: '<path d="M12 3.4l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.7 1-5.9-4.3-4.1 5.9-.8z"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>'
  };
  const MOMENTS = ['A warm drink', 'A good laugh', 'Sun on my face', 'A song I love', 'Finished a thing', 'A kind message', 'Fresh air', 'A good meal',
    'A cosy moment', 'A cute animal', 'A good chat', 'A small win', 'A hot shower', 'Time outside', 'A hug', 'A quiet minute', 'A good memory', 'A nice surprise'];
  /* Labels the local reader adds when someone wrote little: never the player's own words, never a good moment. */
  const GENERIC = new Set(['THAT THING I SAID', "TOMORROW'S LIST", 'WHAT IF IT GOES WRONG', "SHOULD'VE DONE BETTER", 'WHAT THEY THINK', 'EVERYTHING AT ONCE', 'THE BIG WORRY']);
  const POS = /\b(BEST|LOVE[DS]?|LOVELY|LAUGH\w*|HAPP\w*|PROUD|GRATEFUL|THANKFUL|FUN|GREAT|AMAZING|AWESOME|NICE|ENJOY\w*|BEAUTIFUL|GOOD|WIN|WON|NAILED|CELEBRAT\w*|EXCITED|BUZZING|SMIL\w*|HUGS?|SUNNY|SUNSHINE|FINALLY|DELICIOUS|PEACEFUL|COSY|COZY|JOY\w*|THRILLED|STOKED|WONDERFUL|SWEET|KIND|CLAPPED|CHEER\w*|PROMOTED|ENGAGED|PASSED MY)\b/;
  const NEG = /\b(WORR\w*|ANX\w*|SCARED|AFRAID|SAD|HATE\w*|STRESS\w*|FAIL\w*|USELESS|TIGHT|PANIC\w*|CRY\w*|ANGRY|MISS(ED|ING)?|LOST|GRIEF|GRIEV\w*|PASSED AWAY|ARGU\w*|FIGHT\w*|HURT\w*|PAIN\w*|SICK|ILL|TIRED|EXHAUST\w*|CAN'?T|CANNOT|DON'?T|NEVER|NOT|NOBODY|ALONE|LONELY|BAD|AWFUL|TERRIBLE|WORST|WRONG|SHOULD\w*|WHAT IF|DEADLINE|EMBARRASS\w*|GUILT\w*|SHAME\w*|ASHAMED|DEBT|BILLS?|OVERWHELM\w*|DIED|DEATH|FUNERAL|SCAN|RESULTS?)\b/;
  function goodPhrases(an) {
    const out = [], seen = new Set();
    const positive = an.parent === 'Positive State' || (Array.isArray(an.parents2) && an.parents2.includes('Positive State'));
    const add = (s) => {
      if (!s || !s.label || (s.loop && s.loop !== 'other')) return;
      const raw = String(s.label).replace(/\s+/g, ' ').trim(), k = raw.replace(/[’‘]/g, "'").toUpperCase();
      if (!raw || GENERIC.has(k) || seen.has(k) || NEG.test(k) || !(positive || POS.test(k)) || k.replace(/[^A-Z]/g, '').length < 3) return;
      seen.add(k); out.push(raw.length > 30 ? raw.slice(0, 29) + '…' : raw);
    };
    if (an.safety !== 'support') { add(an.core); (an.strands || []).forEach(add); }
    return out.slice(0, 2);
  }

  /* Tonight's venue (a different one each day). */
  const VENUES = [
    { id: 'harbour', name: 'the Harbour', label: 'Harbour',
      sky: { d: ['#040818', '#101a44', '#3d2a5e'], b: ['#1b2766', '#3a3c8c', '#cf7c8c'] }, water: { d: ['#0c1638', '#02040c'], b: ['#2a3170', '#121640'] },
      far: { d: '#18204a', b: '#2f357a' }, near: { d: '#0a0e25', b: '#181b4a' }, win: ['#ffd98a', '#ffe9c4', '#a8d4ff'], stars: 70, mirror: 0.45, ripple: 1, amb: 'room' },
    { id: 'lake', name: 'Mountain Lake', label: 'Mountain Lake',
      sky: { d: ['#020714', '#0b2140', '#1c4a5c'], b: ['#15305e', '#2d5888', '#dca07e'] }, water: { d: ['#0a2232', '#020810'], b: ['#22446e', '#10223e'] },
      far: { d: '#15314a', b: '#395d86' }, near: { d: '#071520', b: '#182e45' }, win: ['#ffcf7a'], stars: 230, milky: true, mirror: 0.62, ripple: 0.55, amb: 'prairie' },
    { id: 'salt', name: 'the Salt Flats', label: 'Salt Flats',
      sky: { d: ['#080517', '#281446', '#6a2f52'], b: ['#221f5c', '#683a86', '#ee996e'] }, water: { d: ['#1a1030', '#06040e'], b: ['#4a3a7a', '#221a4a'] },
      far: { d: '#291838', b: '#56376c' }, near: { d: '#0f0819', b: '#281736' }, win: ['#ffb46b', '#ffe0a0'], stars: 190, milky: true, mirror: 0.8, ripple: 0.28, amb: 'prairie' },
    { id: 'snow', name: 'Snowy Village', label: 'Snowy Village',
      sky: { d: ['#030916', '#13244a', '#34496e'], b: ['#21336e', '#4a6496', '#b6b2d8'] }, water: { d: ['#1b2947', '#091125'], b: ['#56689a', '#2c3a66'] },
      far: { d: '#22345a', b: '#66789f' }, near: { d: '#0d172f', b: '#283863' }, win: ['#ffd27a', '#ffe7b5'], stars: 130, snow: true, mirror: 0.34, ripple: 0.3, amb: 'room' }
  ];
  /* Chord tones of the 'space' bed (Am, F, C, G), an octave up: sparkle accents always land in key. */
  const CHORDS = [['E5', 'A5', 'B5', 'E6'], ['C5', 'F5', 'G5', 'C6'], ['G5', 'C6', 'D6', 'G6'], ['D5', 'G5', 'A5', 'D6']];
  /* Machines that draw without a graphics card get a lighter show, so it stays smooth. */
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

  (env.games = env.games || []).push({
    id: ID, mode: 'reset', name: 'Joy Fireworks', verb: 'launch', family: 'AMPLIFY', minutes: 2,
    parents: ['Positive State', 'Emotion', 'Values / Meaning / Grief'],
    cast: ['sync', 'loopie', 'drop'], poster: { char: 'sync', mood: 'celebrate' },
    tagline: 'Turn one good moment into a fireworks show, detail by detail.',
    why: 'For a good moment worth more than a second: savour it until it fills the sky.',
    fonts: ['Shrikhand', 'Outfit:wght@500;600;700'],
    css: `
.g-joy-fireworks { --jf-display: "Shrikhand", "Cooper Black", "Baloo 2", Georgia, serif; --jf-ui: "Outfit", "Fredoka", "Nunito", system-ui, sans-serif;
  --jf-panel: rgba(12, 11, 36, 0.92); --jf-panel2: rgba(36, 27, 82, 0.94); --jf-ink: #f8f5ff; --jf-muted: #cdc7f3; --jf-line: rgba(255, 255, 255, 0.17); --jf-chip: rgba(255, 255, 255, 0.07); background: #050817; }
.g-joy-fireworks.jf-bright { --jf-panel: rgba(255, 255, 255, 0.93); --jf-panel2: rgba(248, 242, 255, 0.95); --jf-ink: #1f1a3d; --jf-muted: #574f82; --jf-line: rgba(31, 26, 61, 0.15); --jf-chip: rgba(255, 255, 255, 0.9); background: #1b2766; }
.g-joy-fireworks .gk-intro { background: radial-gradient(ellipse at 50% 38%, rgba(60, 32, 118, 0.62), rgba(4, 6, 22, 0.9)); -webkit-backdrop-filter: none; backdrop-filter: none; color: #fff; }
.g-joy-fireworks .gk-intro-title { font-family: var(--jf-display); font-weight: 400; font-size: clamp(42px, 12.5cqw, 76px); line-height: 1.02; text-shadow: none; padding: 0 8px 8px;
  background: linear-gradient(100deg, #ffe08a 8%, #ff86bb 46%, #84ecff 88%); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 4px 18px rgba(255, 120, 190, 0.42)); }
.g-joy-fireworks .gk-intro-sub { color: #f2edff; font-family: var(--jf-ui); }
.g-joy-fireworks .gk-intro-how { color: #ffd98a; font-family: var(--jf-ui); }
.g-joy-fireworks .gk-intro-tap { color: #e9e4ff; }
.g-joy-fireworks .jf-words { position: absolute; inset: 0; z-index: 22; pointer-events: none; overflow: hidden; }
.g-joy-fireworks .jf-word { position: absolute; left: 0; top: 0; transform: translate(-50%, -50%); font: 400 27px/1.12 var(--jf-display); color: #fff; white-space: nowrap; letter-spacing: 0.01em;
  text-shadow: 0 0 8px var(--c), 0 0 22px var(--c), 0 2px 3px rgba(0, 0, 0, 0.4); animation: joy-fireworks-word 2.4s cubic-bezier(.2, .9, .3, 1) both; will-change: transform, opacity; }
.g-joy-fireworks .jf-word.gk-user { font-weight: 400; font-size: 27px; }
.g-joy-fireworks .jf-word.jf-big { font-size: clamp(30px, 8.6cqw, 60px); white-space: normal; width: max-content; max-width: min(90cqw, 780px); text-align: center; text-wrap: balance; animation-duration: 5.2s; }
.g-joy-fireworks .jf-word.jf-big.gk-user { font-size: clamp(30px, 8.6cqw, 60px); }
.g-joy-fireworks .jf-word.jf-hold { animation: joy-fireworks-hold 7.5s cubic-bezier(.2, .9, .3, 1) both; }
@keyframes joy-fireworks-hold { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); } 7% { opacity: 1; transform: translate(-50%, -50%) scale(1.07); } 13% { transform: translate(-50%, -50%) scale(1); }
  88% { opacity: 1; transform: translate(-50%, -54%) scale(1); } 100% { opacity: 0; transform: translate(-50%, -60%) scale(0.98); } }
@keyframes joy-fireworks-word { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); } 12% { opacity: 1; transform: translate(-50%, -50%) scale(1.07); } 22% { transform: translate(-50%, -50%) scale(1); }
  74% { opacity: 1; transform: translate(-50%, -55%) scale(1); } 100% { opacity: 0; transform: translate(-50%, -66%) scale(0.98); } }
.g-joy-fireworks .jf-pop { position: absolute; z-index: 40; left: 0; top: 0; transform: translate(-50%, -50%); font: 400 22px/1 var(--jf-display); color: #fff; white-space: nowrap; pointer-events: none;
  text-shadow: 0 0 10px var(--c, #ffd36b), 0 0 20px var(--c, #ffd36b), 0 2px 3px rgba(0, 0, 0, 0.45); animation: joy-fireworks-pop 0.95s ease-out both; }
@keyframes joy-fireworks-pop { 0% { opacity: 0; transform: translate(-50%, -30%) scale(0.7); } 22% { opacity: 1; transform: translate(-50%, -62%) scale(1.12); } 100% { opacity: 0; transform: translate(-50%, -150%) scale(1); } }
.g-joy-fireworks .jf-ticket { position: absolute; z-index: 36; left: 50%; top: 44%; width: min(400px, calc(100% - 28px)); box-sizing: border-box; transform: translate(-50%, -50%); padding: 18px 16px 16px; border-radius: 26px;
  background: linear-gradient(180deg, var(--jf-panel2), var(--jf-panel)); border: 1px solid var(--jf-line); color: var(--jf-ink); font-family: var(--jf-ui); text-align: center;
  box-shadow: 0 24px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.14); display: flex; flex-direction: column; gap: 10px; animation: joy-fireworks-rise 0.55s cubic-bezier(.3, 1.3, .5, 1) both; }
.g-joy-fireworks .jf-ticket.jf-out { animation: joy-fireworks-sink 0.4s ease both; pointer-events: none; }
.g-joy-fireworks .jf-ticket::before { content: ""; position: absolute; left: 22px; right: 22px; top: 0; height: 3px; border-radius: 0 0 3px 3px; background: linear-gradient(90deg, #6ff29a, #ff6fae, #6fe9ff, #ffb24a, #b69cff); opacity: 0.9; }
@keyframes joy-fireworks-rise { from { opacity: 0; transform: translate(-50%, -38%) scale(0.94); } to { opacity: 1; transform: translate(-50%, -50%); } }
@keyframes joy-fireworks-sink { to { opacity: 0; transform: translate(-50%, -40%) scale(0.96); } }
.g-joy-fireworks .jf-tk-kicker { font: 600 12px/1 var(--jf-ui); letter-spacing: 0.22em; text-transform: uppercase; color: var(--jf-muted); }
.g-joy-fireworks .jf-tk-title { margin: 0; font: 400 26px/1.08 var(--jf-display); color: var(--jf-ink); }
.g-joy-fireworks .jf-tk-sub { margin: 0; font: 500 15px/1.35 var(--jf-ui); color: var(--jf-muted); }
.g-joy-fireworks .jf-tray { position: absolute; z-index: 34; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 14px); width: min(640px, calc(100% - 20px)); box-sizing: border-box; transform: translateX(-50%);
  padding: 10px 12px 12px; border-radius: 24px; background: linear-gradient(180deg, var(--jf-panel2), var(--jf-panel)); border: 1px solid var(--jf-line); color: var(--jf-ink); font-family: var(--jf-ui);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.14); transition: transform 0.7s cubic-bezier(.3, 1.2, .5, 1), opacity 0.5s ease; }
.g-joy-fireworks .jf-tray.jf-away { transform: translate(-50%, calc(100% + 40px)); opacity: 0; pointer-events: none; }
.g-joy-fireworks .jf-tray[data-mode="grand"], .g-joy-fireworks .jf-tray[data-mode="wait"] { pointer-events: none; }
.g-joy-fireworks .jf-head { display: flex; align-items: center; gap: 9px; min-height: 26px; padding: 0 4px 2px; }
.g-joy-fireworks .jf-tonight { flex: none; font: 600 12px/1 var(--jf-ui); letter-spacing: 0.16em; text-transform: uppercase; color: var(--jf-muted); }
.g-joy-fireworks .jf-moment { flex: 1; min-width: 0; font: 400 17px/1.2 var(--jf-display); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--jf-ink); }
.g-joy-fireworks .jf-moment.gk-user { font-weight: 400; font-size: 17px; }
.g-joy-fireworks .jf-dots { flex: none; display: flex; gap: 5px; }
.g-joy-fireworks .jf-dots i { width: 10px; height: 10px; border-radius: 50%; background: var(--jf-line); transition: background 0.3s, transform 0.3s, box-shadow 0.3s; }
.g-joy-fireworks .jf-dots i.on { background: var(--c); box-shadow: 0 0 10px var(--c); transform: scale(1.15); }
.g-joy-fireworks .jf-sec { display: none; }
.g-joy-fireworks .jf-tray[data-mode="detail"] .jf-sec-detail { display: flex; flex-direction: column; gap: 9px; padding-top: 6px; animation: joy-fireworks-in 0.4s ease both; }
.g-joy-fireworks .jf-tray[data-mode="cans"] .jf-sec-cans { display: flex; justify-content: space-around; gap: 4px; padding-top: 4px; animation: joy-fireworks-in 0.4s ease both; }
.g-joy-fireworks .jf-tray[data-mode="launch"] .jf-sec-launch, .g-joy-fireworks .jf-tray[data-mode="wait"] .jf-sec-launch { display: flex; align-items: center; justify-content: center; gap: 10px 14px; flex-wrap: wrap; min-height: 62px; padding-top: 4px; animation: joy-fireworks-in 0.4s ease both; }
.g-joy-fireworks .jf-tray[data-mode="grand"] .jf-sec-grand { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 50px; padding: 4px 6px 0; animation: joy-fireworks-in 0.4s ease both; }
@keyframes joy-fireworks-in { from { transform: translateY(7px); } to { transform: none; } }
.g-joy-fireworks .jf-ask { margin: 0; text-align: center; font: 600 15px/1.25 var(--jf-ui); color: var(--jf-ink); }
.g-joy-fireworks .jf-ask b { font: 400 16px/1 var(--jf-display); color: var(--c); letter-spacing: 0.02em; }
.g-joy-fireworks.jf-bright .jf-ask b { color: color-mix(in srgb, var(--c) 55%, #1f1a3d); }
.g-joy-fireworks .jf-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.g-joy-fireworks .jf-chip { appearance: none; cursor: pointer; min-height: 44px; padding: 10px 15px; border-radius: 999px; font: 600 15px/1.1 var(--jf-ui); color: var(--jf-ink);
  background: color-mix(in srgb, var(--c, #ffd36b) 16%, var(--jf-chip)); border: 1.5px solid color-mix(in srgb, var(--c, #ffd36b) 78%, transparent);
  box-shadow: 0 0 16px color-mix(in srgb, var(--c, #ffd36b) 26%, transparent); transition: transform 0.15s ease, background 0.2s ease; }
.g-joy-fireworks .jf-chip:active { transform: scale(0.95); }
.g-joy-fireworks .jf-chip.gk-user { font-size: 15px; letter-spacing: 0.03em; }
.g-joy-fireworks .jf-chip.jf-picked { background: color-mix(in srgb, var(--c, #ffd36b) 55%, var(--jf-chip)); transform: scale(1.06); }
.g-joy-fireworks .jf-chip:focus-visible, .g-joy-fireworks .jf-can:focus-visible, .g-joy-fireworks .jf-fire:focus-visible, .g-joy-fireworks .jf-pad:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.g-joy-fireworks .jf-can { appearance: none; background: none; border: 0; padding: 7px 2px 2px; flex: 1; max-width: 96px; min-height: 92px; display: flex; flex-direction: column; align-items: center; gap: 7px;
  cursor: grab; touch-action: none; color: var(--jf-ink); font-family: var(--jf-ui); border-radius: 16px; }
.g-joy-fireworks .jf-can-art { position: relative; width: 46px; height: 56px; border-radius: 8px 8px 12px 12px; color: rgba(22, 12, 44, 0.82); flex: none;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0) 26%, rgba(255, 255, 255, 0.4) 46%, rgba(255, 255, 255, 0) 64%, rgba(0, 0, 0, 0.3)), var(--c);
  box-shadow: inset 0 -6px 0 rgba(0, 0, 0, 0.16), 0 8px 16px rgba(0, 0, 0, 0.35), 0 0 22px color-mix(in srgb, var(--c) 48%, transparent); transition: transform 0.25s cubic-bezier(.3, 1.5, .5, 1), opacity 0.25s, filter 0.3s; }
.g-joy-fireworks .jf-can-art::before { content: ""; position: absolute; left: -3px; right: -3px; top: -7px; height: 10px; border-radius: 6px; background: linear-gradient(180deg, #f6f2ff, #9d97b8); box-shadow: 0 2px 3px rgba(0, 0, 0, 0.3); }
.g-joy-fireworks .jf-can-art::after { content: ""; position: absolute; left: 50%; top: -15px; width: 3px; height: 9px; margin-left: -1.5px; border-radius: 2px; background: #6b5b48; }
.g-joy-fireworks .jf-can-art svg { position: absolute; left: 50%; top: 56%; width: 26px; height: 26px; transform: translate(-50%, -50%); fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.g-joy-fireworks .jf-can-label { font: 600 13px/1 var(--jf-ui); letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }
.g-joy-fireworks .jf-can.jf-used .jf-can-art { filter: saturate(0.5) brightness(0.8); }
.g-joy-fireworks .jf-can.jf-used .jf-can-label::after { content: " \\2713"; color: var(--jf-muted); }
.g-joy-fireworks .jf-can.jf-lift .jf-can-art { opacity: 0.22; transform: scale(0.88); }
.g-joy-fireworks .jf-can:hover .jf-can-art { transform: translateY(-3px); }
.g-joy-fireworks .jf-ghost { position: absolute; z-index: 38; left: 0; top: 0; width: 46px; height: 56px; margin: -36px 0 0 -23px; pointer-events: none; will-change: transform; }
.g-joy-fireworks .jf-ghost .jf-can-art { box-shadow: 0 14px 26px rgba(0, 0, 0, 0.45), 0 0 34px var(--c); }
.g-joy-fireworks .jf-fly { position: absolute; z-index: 38; left: 0; top: 0; pointer-events: none; padding: 8px 13px; border-radius: 999px; font: 600 15px/1 var(--jf-ui); color: #fff; white-space: nowrap;
  background: color-mix(in srgb, var(--c) 70%, #1a1236); box-shadow: 0 0 18px var(--c); will-change: transform, opacity; }
.g-joy-fireworks .jf-loaded { display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px; border-radius: 999px; border: 1.5px solid var(--c); background: color-mix(in srgb, var(--c) 18%, var(--jf-chip)); font: 600 15px/1.1 var(--jf-ui); }
.g-joy-fireworks .jf-loaded small { font: 400 15px/1 var(--jf-display); color: var(--c); }
.g-joy-fireworks.jf-bright .jf-loaded small { color: color-mix(in srgb, var(--c) 55%, #1f1a3d); }
.g-joy-fireworks .jf-swipe { font: 600 14px/1.2 var(--jf-ui); color: var(--jf-muted); display: inline-flex; align-items: center; gap: 6px; }
.g-joy-fireworks .jf-swipe svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; animation: joy-fireworks-up 1.2s ease-in-out infinite; }
.g-joy-fireworks .jf-tray[data-mode="wait"] .jf-swipe { display: none; }
@keyframes joy-fireworks-up { 0%, 100% { transform: translateY(3px); opacity: 0.6; } 50% { transform: translateY(-4px); opacity: 1; } }
.g-joy-fireworks .jf-gtitle { font: 400 21px/1.1 var(--jf-display); background: linear-gradient(90deg, #ffe08a, #ff86bb, #84ecff); -webkit-background-clip: text; background-clip: text; color: transparent; white-space: nowrap; }
.g-joy-fireworks.jf-bright .jf-gtitle { background-image: linear-gradient(90deg, #b86a00, #c81f66, #0b77a6); }
.g-joy-fireworks .jf-beats { display: flex; gap: 9px; }
.g-joy-fireworks .jf-beats i { width: 14px; height: 14px; border-radius: 50%; background: var(--jf-line); transition: background 0.07s, transform 0.07s, box-shadow 0.07s; }
.g-joy-fireworks .jf-beats i.on { background: #ffd36b; transform: scale(1.3); box-shadow: 0 0 12px #ffd36b; }
.g-joy-fireworks .jf-beats i.on:first-child { background: #ff7eb6; box-shadow: 0 0 12px #ff7eb6; }
.g-joy-fireworks .jf-count { font: 600 15px/1 var(--jf-ui); font-variant-numeric: tabular-nums; color: var(--jf-ink); text-align: right; white-space: nowrap; }
.g-joy-fireworks .jf-pad { position: absolute; z-index: 26; width: 150px; height: 168px; margin: -100px 0 0 -75px; border-radius: 46%; touch-action: none; cursor: grab; }
.g-joy-fireworks .jf-zone { position: absolute; left: 0; right: 0; bottom: 0; top: calc(env(safe-area-inset-top, 0px) + 60px); z-index: 24; touch-action: manipulation; cursor: pointer; }
.g-joy-fireworks .jf-fire { position: absolute; z-index: 27; width: 176px; height: 176px; margin: -88px 0 0 -88px; border-radius: 50%; border: 0; padding: 0; background: transparent; cursor: pointer; touch-action: manipulation; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const inten = [0, 1, 2].includes(ctx.intensity) ? ctx.intensity : 1;
      const N = [3, 4, 5][inten], TAPS = [8, 12, 16][inten], KAMURO_AT = [4, 6, 8][inten], WIN = [150, 125, 100][inten];
      const RED = K.reduced(), visits = K.visits(), dayN = K.daily();
      let vq = ''; try { vq = (/[?&]jfvenue=([a-z]+)/.exec(window.location.search) || [])[1] || ''; } catch (e) { vq = ''; }
      const V = VENUES.find(v => v.id === vq) || K.dailyPick(VENUES, 1), V2 = VENUES[((dayN + 1) * 7 + 13 + ID.length) % VENUES.length];
      const line = (o) => ctx.line(o);
      const care = an.safety === 'care';
      const own = goodPhrases(an);
      const noWords = !String(ctx.text || '').trim();
      const dark = () => K.dark();

      /* ---------------- choices for tonight ---------------- */
      const generic = K.shuffle(MOMENTS, K.rng(dayN + 5));
      const details = {};
      SENSES.forEach((s, i) => { const o = K.shuffle(s.opts, K.rng(dayN * 13 + i * 7 + 1)).slice(0, s.id === 'who' ? 3 : 4); if (s.id === 'who') o.unshift('Just me'); details[s.id] = o; });

      /* ---------------- scene ---------------- */
      el.classList.toggle('jf-bright', !dark());
      const SOFTGFX = softwareGfx();
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFTGFX ? 1.25 : 1.5 });
      const P = K.particles({ max: 260 });
      const wordsEl = h('div', { class: 'jf-words', 'aria-hidden': 'true' });
      const zone = h('div', { class: 'jf-zone', 'aria-hidden': 'true', hidden: true });
      const pad = h('div', { class: 'jf-pad', role: 'button', tabindex: '-1', 'aria-label': 'The mortar. Swipe up from here to launch your shell.', hidden: true });
      const fireBtn = h('button', { type: 'button', class: 'jf-fire', 'aria-label': 'Fire a shell. Tap on the beat for a bigger one.', hidden: true });
      el.append(wordsEl, zone, pad, fireBtn);
      const G = { w: 0, H: 0, phone: true, hz: 0, bx: 0, by: 0, mouth: { x: 0, y: 0 }, band: { top: 0, bot: 0 }, R: 110, g: 60, ring: { x: 0, y: 0, r: 70 }, tubes: [], beacons: [], glows: [], chims: [], streaks: [] };
      const W = { pulse: 0, recoil: 0, load: 0, loadC: 0, hot: 0, lit: 0, lastCol: '#ffd36b', calm: 0, calmT: 0, rack: 0, rackT: 0, shake: 0, idle: 2, fade: 0.13, hang: 1, ringOn: 0, ringT: 0, cheer: 0, cheerT: 0 };
      const L = {};

      /* tray: the show's control desk */
      const momentEl = h('span', { class: 'jf-moment', text: V.label });
      const dotsEl = h('span', { class: 'jf-dots', 'aria-hidden': 'true' });
      for (let i = 0; i < N; i++) dotsEl.append(h('i'));
      const cans = SENSES.map((s) => {
        const art = h('span', { class: 'jf-can-art', html: '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[s.id] + '</svg>' });
        const b = h('button', { type: 'button', class: 'jf-can', style: { '--c': s.c[0] }, 'aria-label': s.short + ': ' + s.name + ' shell. Drag it into the mortar.' }, art, h('span', { class: 'jf-can-label', text: s.short }));
        return { s, el: b, art };
      });
      const askEl = h('p', { class: 'jf-ask' });
      const detailWrap = h('div', { class: 'jf-chips', role: 'group', 'aria-label': 'Details' });
      const loadedEl = h('span', { class: 'jf-loaded' });
      const swipeEl = h('span', { class: 'jf-swipe', html: '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON.up + '</svg>' }, h('span', { text: 'Swipe up from the mortar' }));
      const beatsEl = h('span', { class: 'jf-beats', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i'));
      const countEl = h('span', { class: 'jf-count', text: '0 / ' + TAPS });
      const tray = h('div', { class: 'jf-tray jf-away', 'data-mode': 'none' },
        h('div', { class: 'jf-head' }, h('span', { class: 'jf-tonight', text: 'Tonight' }), momentEl, dotsEl),
        h('section', { class: 'jf-sec jf-sec-cans' }, cans.map(c => c.el)),
        h('section', { class: 'jf-sec jf-sec-detail' }, askEl, detailWrap),
        h('section', { class: 'jf-sec jf-sec-launch' }, loadedEl, swipeEl),
        h('section', { class: 'jf-sec jf-sec-grand' }, h('span', { class: 'jf-gtitle', text: 'Grand finale' }), beatsEl, countEl));
      el.append(tray);
      const setMode = (m) => { tray.dataset.mode = m; };

      /* the cast: Sync directs; Drop and Loopie watch from the barge */
      const sync = K.character('sync', { side: 'right', mood: 'happy', x: 10, y: 66, size: 72 });
      const drop = K.character('drop', { side: 'above', mood: 'happy', x: 0, y: 0, size: 48, decor: true });
      const loopie = K.character('loopie', { side: 'above', mood: 'happy', x: 0, y: 0, size: 48, decor: true });
      drop.show(false); loopie.show(false);

      /* ---------------- audio: the 'space' bed is the show's clock; drums join for the grand finale ---------------- */
      const BPM0 = 72, BPM_GRAND = [92, 100, 108][inten];
      const music = K.music('space', { bpm: BPM0 });
      music.level(0.8);
      const amb = K.ambience(V.amb);
      amb.level(0.22, 1.5);
      const BEAT = { list: [], spb: 60 / BPM0, virt0: performance.now(), shown: -1e9, mode: null, drums: 0 };
      music.onBeat((time, i, b) => {
        BEAT.spb = 60 / music.bpm;
        BEAT.list.push({ t: time, i, b, ms: A.heardAt(time) });
        if (BEAT.list.length > 16) BEAT.list.shift();
        beatSound(time, i, b);
      });
      function beatAfter(ms) {
        const Lb = BEAT.list, sp = BEAT.spb * 1000;
        if (!Lb.length || !A.ctx) { const k = Math.ceil((ms - BEAT.virt0) / sp); return { ms: BEAT.virt0 + k * sp, t: null, i: k, b: ((k % 4) + 4) % 4 }; }
        for (const x of Lb) if (x.ms >= ms) return x;
        const last = Lb[Lb.length - 1], k = Math.max(1, Math.ceil((ms - last.ms) / sp));
        return { ms: last.ms + k * sp, t: last.t + k * BEAT.spb, i: last.i + k, b: (last.b + k) % 4 };
      }
      const audioAt = (ms) => (A.ctx ? Math.max(A.ctx.currentTime, A.ctx.currentTime + (ms - performance.now()) / 1000 - A.latency()) : 0);
      const chordAt = (i) => CHORDS[((Math.floor(i / 4) % 4) + 4) % 4];
      function beatSound(time, i, b) {
        if (!A.ctx || BEAT.drums <= 0) return;
        const v = BEAT.drums;
        if (b === 0 || b === 2) A.kick(time, 0.3 * v);
        if (b === 1 || b === 3) { A.noise({ when: time, filter: 'bandpass', freq: 1500, q: 0.9, dur: 0.1, vol: 0.11 * v }); A.noise({ when: time + 0.012, filter: 'bandpass', freq: 1050, q: 1.1, dur: 0.07, vol: 0.07 * v }); }
        A.shaker(time + BEAT.spb / 2, 0.03 * v);
        if (b === 0 && Math.floor(i / 4) % 2 === 0) A.drum(time, 0.2 * v, 0.55, 0.3);
      }
      const SND = {
        lift() { if (A.ctx) { A.pop({ freq: 520, vol: 0.08 }); A.sync('lift', performance.now()); } },
        back() { if (A.ctx) A.boing({ freq: 300, vol: 0.06 }); },
        pour(c) { if (!A.ctx) return; const t = A.now(); A.noise({ filter: 'bandpass', freq: 5200, to: 2400, q: 0.8, dur: 0.55, attack: 0.05, vol: 0.07 }); for (let i = 0; i < 7; i++) A.noise({ when: t + i * 0.06 + Math.random() * 0.03, filter: 'highpass', freq: 5200, dur: 0.02, vol: 0.03 }); A.chime(A.note(c), { when: t + 0.35, vol: 0.05, dur: 1 }); A.sync('pour', performance.now()); },
        seal(c) { if (!A.ctx) return; A.wood(undefined, 0.16, 1.1); A.chime(A.note(c), { vol: 0.07, dur: 1.3 }); A.sync('seal', performance.now()); },
        thump(v) { if (!A.ctx) return; A.tone({ type: 'sine', freq: 170, to: 52, glide: 0.09, dur: 0.24, vol: 0.34 * v }); A.noise({ filter: 'lowpass', freq: 1700, to: 260, dur: 0.22, attack: 0.002, vol: 0.22 * v }); A.sync('launch', performance.now()); },
        whistle(d) { if (!A.ctx) return; A.tone({ type: 'sine', freq: 820, to: 2300, glide: d * 0.95, dur: d, vol: 0.03, attack: 0.08 }); A.tone({ type: 'sine', freq: 836, to: 2340, glide: d * 0.95, dur: d, vol: 0.015, attack: 0.08 }); },
        fizz(d) { if (A.ctx) A.noise({ filter: 'bandpass', freq: 2800, to: 5600, q: 1.3, dur: d, attack: d * 0.25, vol: 0.045 }); },
        boom(when, sz, dist) {
          if (!A.ctx) return;
          const v = Math.min(1.35, 0.55 + sz * 0.45) * (1 - dist * 0.3);
          A.tone({ when, type: 'sine', freq: 96 - Math.min(40, sz * 14), to: 32, glide: 0.5, dur: 0.95 + sz * 0.35, vol: 0.32 * v, attack: 0.004 });
          A.noise({ when, pink: true, filter: 'lowpass', freq: 950 - dist * 420, to: 140, dur: 1.1 + sz * 0.6, attack: 0.006, vol: 0.3 * v, verb: 0.3 + dist * 0.45 });
          A.noise({ when, filter: 'highpass', freq: 2400, dur: 0.05, vol: 0.09 * v });
        },
        crackle(when, n, spread, vol) { if (!A.ctx) return; for (let i = 0; i < n; i++) A.noise({ when: when + Math.random() * spread, filter: 'highpass', freq: 2400 + Math.random() * 3800, dur: 0.008 + Math.random() * 0.014, vol: vol * (0.5 + Math.random()) }); },
        hiss(when, d) { if (A.ctx) A.noise({ when, filter: 'highpass', freq: 6200, to: 3400, dur: d, attack: 0.25, vol: 0.045 }); },
        sparkle(when, i, n) { if (!A.ctx) return; const ch = chordAt(i); for (let k = 0; k < n; k++) A.chime(A.note(ch[k % ch.length]), { when: when + k * 0.07, vol: 0.05, dur: 1.5, verb: 0.5 }); },
        ooh(v) { if (!A.ctx) return; A.noise({ pink: true, filter: 'bandpass', freq: 380, to: 560, q: 3, dur: 1.5, attack: 0.45, vol: 0.06 * v }); A.noise({ pink: true, filter: 'bandpass', freq: 900, to: 1150, q: 4, dur: 1.4, attack: 0.45, vol: 0.03 * v }); },
        applause(d, v) { if (!A.ctx) return; const t = A.now(); const n = Math.round(d * 34); for (let i = 0; i < n; i++) { const k = i / n; A.noise({ when: t + k * d + Math.random() * 0.05, filter: 'bandpass', freq: 1100 + Math.random() * 2200, q: 1.3, dur: 0.03, vol: (0.03 + Math.random() * 0.04) * v * (k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1) }); } },
        roar() { if (!A.ctx) return; A.noise({ pink: true, filter: 'bandpass', freq: 760, to: 980, q: 0.8, dur: 2.6, attack: 0.35, vol: 0.12 }); for (let i = 0; i < 3; i++) A.tone({ when: A.now() + 0.3 + i * 0.35 + Math.random() * 0.2, type: 'sine', freq: 1900 + Math.random() * 300, to: 2700, glide: 0.25, dur: 0.4, vol: 0.02 }); }
      };

      /* ---------------- sprites ---------------- */
      const PAL = ['#ffffff', '#fff2d6', '#ffd27a', '#ffb347'];
      const PI = {};
      SENSES.forEach(s => { PI[s.id] = s.c.map(c => PAL.push(c) - 1); });
      const KAM = [PAL.push('#ffab2e') - 1, PAL.push('#ffd98a') - 1, PAL.push('#ff7a1c') - 1];
      const WHITE = [0, 1, 2];
      function sprite(col, size, stops) {
        const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), r = size / 2, gr = g.createRadialGradient(r, r, 0, r, r, r);
        stops.forEach(([k, a, white]) => gr.addColorStop(k, white ? 'rgba(255,255,255,' + a + ')' : K.hexA(col, a)));
        g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
      }
      const SPR = PAL.map(c => sprite(c, 48, [[0, 0.95, true], [0.09, 1], [0.28, 0.45], [0.6, 0.1], [1, 0]]));
      const FLS = PAL.map(c => sprite(c, 128, [[0, 0.85], [0.35, 0.32], [1, 0]]));
      const SMOKE = (() => { const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d'); [[48, 48, 40], [34, 54, 26], [62, 42, 28]].forEach(([x, y, r]) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 96, 96); }); return c; })();
      const BEACON = sprite('#ff4a4a', 32, [[0, 1, true], [0.2, 0.9], [1, 0]]);
      const WARM = sprite('#ffc46b', 64, [[0, 0.75], [0.4, 0.25], [1, 0]]);
      const SOFT = sprite('#ffffff', 64, [[0, 0.5], [1, 0]]);

      /* ---------------- fireworks engine: stars in typed arrays, drawn additively onto a trail canvas ---------------- */
      const CAP = Math.round([540, 780, 1020][inten] * (RED ? 0.55 : 1) * (SOFTGFX ? 0.75 : 1));
      const SX = new Float32Array(CAP), SY = new Float32Array(CAP), PX = new Float32Array(CAP), PY = new Float32Array(CAP), VX = new Float32Array(CAP), VY = new Float32Array(CAP), AGE = new Float32Array(CAP), LIFE = new Float32Array(CAP);
      const DRAG = new Float32Array(CAP), GRAV = new Float32Array(CAP), SIZE = new Float32Array(CAP), SPLIT = new Float32Array(CAP);
      const COL = new Uint8Array(CAP), COL2 = new Uint8Array(CAP), FLAG = new Uint8Array(CAP);
      /* stars are drawn as streaks batched by colour and brightness (a counting sort), so trails stay continuous at any frame rate */
      const NK = PAL.length * 8, KEY = new Uint16Array(CAP), ORDER = new Int32Array(CAP), CNT = new Int32Array(NK), START = new Int32Array(NK + 1), POS = new Int32Array(NK);
      const LA = [0.18, 0.4, 0.62, 0.86];
      const F_GLIT = 1, F_STROBE = 2, F_SPLIT = 4, F_TINY = 8, F_CHG = 16;
      let NS = 0, Q = 1;
      function star(x, y, vx, vy, life, k, gr, sz, c, c2, f, split) {
        if (NS >= CAP) return;
        const i = NS++;
        SX[i] = x; SY[i] = y; PX[i] = x; PY[i] = y; VX[i] = vx; VY[i] = vy; AGE[i] = 0; LIFE[i] = life * (f & F_TINY ? 1 : W.hang); DRAG[i] = k; GRAV[i] = gr; SIZE[i] = sz; COL[i] = c; COL2[i] = c2; FLAG[i] = f; SPLIT[i] = split || 0;
      }
      function kill(i) {
        const j = --NS; if (i === j) return;
        SX[i] = SX[j]; SY[i] = SY[j]; PX[i] = PX[j]; PY[i] = PY[j]; VX[i] = VX[j]; VY[i] = VY[j]; AGE[i] = AGE[j]; LIFE[i] = LIFE[j]; DRAG[i] = DRAG[j]; GRAV[i] = GRAV[j]; SIZE[i] = SIZE[j]; SPLIT[i] = SPLIT[j]; COL[i] = COL[j]; COL2[i] = COL2[j]; FLAG[i] = FLAG[j];
      }
      const rnd = Math.random;
      const sphere = (sp) => { const u = rnd() * 2 - 1, a = rnd() * TAU, r = Math.sqrt(1 - u * u); return [Math.cos(a) * r * sp, Math.sin(a) * r * sp]; };
      const SHELL = {
        peony(x, y, sz, p, q) { // a sphere of stars that changes colour as it burns down
          const Rr = G.R * sz, k = 2.5, v0 = Rr * k, n = Math.round(104 * q * Math.min(1.7, sz));
          for (let i = 0; i < n; i++) { const [vx, vy] = sphere(v0 * (0.92 + rnd() * 0.08)); star(x, y, vx, vy, 1.3 + rnd() * 0.45, k, G.g, 1.15, p[0], p[2], F_CHG); }
          for (let i = 0; i < n * 0.24; i++) { const [vx, vy] = sphere(v0 * 0.42); star(x, y, vx, vy, 0.95 + rnd() * 0.3, k, G.g * 0.7, 1, p[1], p[1], 0); }
        },
        chrys(x, y, sz, p, q) { // a peony whose stars leave glittering tails
          const Rr = G.R * sz, k = 2.4, v0 = Rr * k, n = Math.round(80 * q * Math.min(1.7, sz));
          for (let i = 0; i < n; i++) { const [vx, vy] = sphere(v0 * (0.9 + rnd() * 0.1)); star(x, y, vx, vy, 1.4 + rnd() * 0.4, k, G.g, 1.1, p[0], p[1], F_GLIT | F_CHG); }
        },
        heart(x, y, sz, p, q) { // stars thrown along a heart curve, so the shape holds while it glows
          const Rr = G.R * sz * 0.92, k = 2.5, v0 = Rr * k / 17, n = Math.round(78 * q * Math.min(1.5, sz)), tilt = (rnd() - 0.5) * 0.3, ct = Math.cos(tilt), st = Math.sin(tilt);
          for (let i = 0; i < n; i++) { const t = i / n * TAU, hx = 16 * Math.pow(Math.sin(t), 3), hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); star(x, y, (hx * ct - hy * st) * v0, (hx * st + hy * ct) * v0, 1.6 + rnd() * 0.2, k, G.g * 0.45, 1.2, p[0], p[1], F_CHG); }
          for (let i = 0; i < n * 0.32; i++) { const [vx, vy] = sphere(Rr * k * 0.2); star(x, y, vx, vy, 1.3 + rnd() * 0.5, k, G.g * 0.4, 0.9, 1, p[1], F_STROBE); }
        },
        ring(x, y, sz, p, q) { // a tilted halo with a white pistil
          const Rr = G.R * sz * 0.95, k = 2.5, v0 = Rr * k, n = Math.round(62 * q * Math.min(1.5, sz)), tilt = (rnd() - 0.5) * 1.3, sq = 0.38 + rnd() * 0.55, ct = Math.cos(tilt), st = Math.sin(tilt);
          for (let i = 0; i < n; i++) { const a = i / n * TAU, ux = Math.cos(a), uy = Math.sin(a) * sq; star(x, y, (ux * ct - uy * st) * v0, (ux * st + uy * ct) * v0, 1.5 + rnd() * 0.2, k, G.g * 0.75, 1.2, p[0], p[1], F_CHG); }
          for (let i = 0; i < 20 * q; i++) { const [vx, vy] = sphere(v0 * 0.3); star(x, y, vx, vy, 1.05 + rnd() * 0.3, k, G.g * 0.6, 1, 0, p[1], 0); }
        },
        crossette(x, y, sz, p, q) { // heavy comets that each split into a cross with a crackle
          const Rr = G.R * sz, k = 1.7, v0 = Rr * 1.25, n = Math.round(9 + 3 * Math.min(1, Math.max(0, sz - 0.7))), off = rnd() * TAU;
          for (let i = 0; i < n; i++) { const a = off + i / n * TAU + (rnd() - 0.5) * 0.18; star(x, y, Math.cos(a) * v0, Math.sin(a) * v0, 2, k, G.g * 0.55, 1.5, 0, p[0], F_GLIT | F_SPLIT, 0.46 + rnd() * 0.14); }
          for (let i = 0; i < 26 * q; i++) { const [vx, vy] = sphere(v0 * 0.32); star(x, y, vx, vy, 0.8 + rnd() * 0.3, 2.4, G.g * 0.6, 0.95, p[1], p[1], F_STROBE); }
        },
        willow(x, y, sz, p, q) { // slow, heavy, golden stars that droop and drip glitter
          const Rr = G.R * sz * 1.05, k = 3.2, v0 = Rr * k * 0.9, n = Math.round(56 * q * Math.min(1.5, sz));
          for (let i = 0; i < n; i++) { const [vx, vy] = sphere(v0 * (0.88 + rnd() * 0.12)); star(x, y, vx, vy, 2.8 + rnd() * 0.8, k, G.g * 0.72, 1.1, p[0], p[1], F_GLIT | F_CHG); }
        },
        kamuro(x, y, sz, p, q) { // the gold crown: a dense, long-burning glitter dome
          const Rr = G.R * sz * 1.1, k = 2.9, v0 = Rr * k, n = Math.round(96 * q * Math.min(1.5, sz));
          for (let i = 0; i < n; i++) { const [vx, vy] = sphere(v0 * (0.9 + rnd() * 0.1)); star(x, y, vx, vy, 2.4 + rnd() * 0.6, k, G.g * 0.75, 1.2, KAM[0], KAM[2], F_GLIT | F_CHG); }
        },
        palm(x, y, sz, p, q) { // a few thick comets arcing out like palm fronds
          const Rr = G.R * sz, k = 1.5, v0 = Rr * 1.5, n = 8, off = -Math.PI / 2;
          for (let i = 0; i < n; i++) { const a = off + (i - (n - 1) / 2) * 0.6 + (rnd() - 0.5) * 0.1; star(x, y, Math.cos(a) * v0, Math.sin(a) * v0 * 0.85, 1.9 + rnd() * 0.3, k, G.g * 1.1, 1.8, p[0], p[1], F_GLIT | F_CHG); }
          for (let i = 0; i < 22 * q; i++) { const [vx, vy] = sphere(v0 * 0.25); star(x, y, vx, vy, 0.9, 2.4, G.g * 0.6, 0.9, 2, 2, F_STROBE); }
        },
        small(x, y, sz, p, q) { // an off-beat shot: smaller, twinkling, still pretty
          const Rr = G.R * sz, k = 2.6, v0 = Rr * k, n = Math.round(46 * q);
          for (let i = 0; i < n; i++) { const [vx, vy] = sphere(v0 * (0.9 + rnd() * 0.1)); star(x, y, vx, vy, 1 + rnd() * 0.3, k, G.g, 1, p[0], 0, F_STROBE | F_CHG); }
        }
      };
      function splitStar(i) {
        const x = SX[i], y = SY[i], ang = Math.atan2(VY[i], VX[i]), sp = G.R * 1.15;
        for (let q = 0; q < 4; q++) { const a = ang + Math.PI / 4 + q * Math.PI / 2; star(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.65 + rnd() * 0.3, 2.6, G.g * 0.85, 1.05, COL2[i], COL2[i], rnd() < 0.3 ? F_STROBE : 0); }
        star(x, y, 0, 0, 0.09, 1, 0, 3.2, 0, 0, F_TINY);
        if (A.ctx && rnd() < 0.5) SND.crackle(A.now(), 3, 0.08, 0.05);
      }

      /* comets, flashes, smoke, scheduled moments */
      const comets = [], puffs = [], events = [];
      const at = (ms, fn) => events.push({ at: ms, fn });
      function burst(o) {
        const q = Q * (RED ? 0.6 : 1) * [0.78, 1, 1.18][inten];
        W.hang = o.hang || 1;
        (SHELL[o.type] || SHELL.peony)(o.x, o.y, o.sz, o.pal, q);
        W.hang = 1;
        if (FX.g) {
          const fx = FX.g, op = fx.globalCompositeOperation, fr = G.R * 2.3 * Math.min(1.7, 0.6 + o.sz * 0.5), cr = G.R * 0.42 * Math.min(1.9, 0.6 + o.sz * 0.55);
          fx.globalCompositeOperation = 'lighter';
          fx.globalAlpha = RED ? 0.18 : dark() ? 0.42 : 0.3; fx.drawImage(FLS[o.pal[0]], o.x - fr, o.y - fr, fr * 2, fr * 2);
          if (!RED) { fx.globalAlpha = 0.95; fx.drawImage(FLS[0], o.x - cr, o.y - cr, cr * 2, cr * 2); }
          fx.globalAlpha = 1; fx.globalCompositeOperation = op; W.idle = 0;
        }
        W.lastCol = PAL[o.pal[0]]; W.lit = Math.min(1.2, W.lit + 0.6 + o.sz * 0.2);
        const np = RED ? 1 : Math.round(2 + o.sz * 1.5);
        for (let i = 0; i < np && puffs.length < 24; i++) puffs.push({ x: o.x + (rnd() - 0.5) * G.R * 0.9 * o.sz, y: o.y + (rnd() - 0.3) * G.R * 0.7 * o.sz, r: G.R * (0.35 + rnd() * 0.3) * Math.min(1.6, o.sz), a: 0, top: 0.1 + rnd() * 0.08, age: 0, life: 7 + rnd() * 5, vx: 4 + rnd() * 8, vy: -2 + rnd() * 2 });
        if (o.word) showWord(o.word, o.x, o.y, PAL[o.pal[0]], o.user, o.big, o.hold);
        if (o.type === 'willow' || o.type === 'kamuro') SND.hiss(audioAt(performance.now()), 2.2);
        if (o.type === 'crossette' || o.type === 'kamuro') SND.crackle(audioAt(performance.now() + 450), o.type === 'kamuro' ? 26 : 16, 0.9, 0.05);
        if (o.react) o.react();
      }
      /* Launch a shell so that its boom lands on a beat: the flash comes first, the boom arrives "delay" later, as from a distance. */
      function launchShell(o) {
        const now = performance.now(), delay = o.delay ?? 0.22;
        const bt = beatAfter(now + (o.minRise ?? 0.95) * 1000 + delay * 1000);
        const dur = Math.max((o.minRise ?? 0.95) * 1000, bt.ms - delay * 1000 - now);
        comets.push(Object.assign({ t0: now, dur, done: false, x: o.from.x, y: o.from.y }, o));
        const when = bt.t != null ? bt.t : audioAt(bt.ms);
        SND.boom(when, o.sz, Math.min(1, delay / 0.5));
        if (o.chime !== false) SND.sparkle(when + 0.02, bt.i, o.type === 'heart' ? 3 : o.type === 'ring' ? 2 : 1);
        if (o.whistle) SND.whistle(dur / 1000); else SND.fizz(dur / 1000);
        return { bt, flashAt: now + dur };
      }
      function stepComets(fx, dt, now) {
        for (let i = comets.length - 1; i >= 0; i--) {
          const c = comets[i], k = Math.min(1, (now - c.t0) / c.dur);
          const x = c.from.x + (c.to.x - c.from.x) * k, y = c.from.y + (c.to.y - c.from.y) * (1 - (1 - k) * (1 - k));
          c.x = x; c.y = y;
          fx.globalAlpha = 1; fx.drawImage(SPR[1], x - 5, y - 5, 10, 10);
          const ne = Math.min(4, Math.round(dt * 110 * (RED ? 0.5 : 1)) + (rnd() < 0.5 ? 1 : 0));
          for (let e = 0; e < ne; e++) star(x + (rnd() - 0.5) * 2, y + 2, (rnd() - 0.5) * 24, 20 + rnd() * 40, 0.3 + rnd() * 0.35, 1.6, G.g * 0.8, 0.7, 2, 3, F_TINY);
          if (k >= 1) { comets.splice(i, 1); burst({ type: c.type, x: c.to.x, y: c.to.y, sz: c.sz, pal: c.pal, word: c.word, user: c.user, big: c.big, hang: c.hang, hold: c.hold, react: c.react }); }
        }
      }
      function stepStars(fx, dt) {
        CNT.fill(0);
        let i = 0;
        while (i < NS) {
          AGE[i] += dt;
          if (AGE[i] >= LIFE[i]) { kill(i); continue; }
          const f = FLAG[i];
          if ((f & F_SPLIT) && AGE[i] >= SPLIT[i]) { splitStar(i); kill(i); continue; }
          PX[i] = SX[i]; PY[i] = SY[i];
          const kd = Math.exp(-DRAG[i] * dt);
          VX[i] *= kd; VY[i] = VY[i] * kd + GRAV[i] * dt;
          SX[i] += VX[i] * dt; SY[i] += VY[i] * dt;
          if ((f & F_GLIT) && rnd() < dt * 7) star(SX[i], SY[i], (rnd() - 0.5) * 6, 6, 0.5 + rnd() * 0.45, 1.4, G.g * 0.35, 0.6, (f & F_CHG) && COL[i] >= KAM[0] ? KAM[1] : 2, 3, F_TINY);
          const k = AGE[i] / LIFE[i];
          let a = k < 0.72 ? 1 : (1 - k) / 0.28;
          if (f & F_STROBE) a *= Math.sin(AGE[i] * 55 + i) > -0.2 ? 1 : 0.1;
          else if (f & F_TINY) a *= 0.5 + 0.5 * Math.sin(AGE[i] * 38 + i);
          else if (k > 0.8) a *= 0.65 + 0.35 * Math.sin(AGE[i] * 46 + i);
          const lv = a > 0.8 ? 3 : a > 0.5 ? 2 : a > 0.24 ? 1 : a > 0.06 ? 0 : -1;
          if (lv < 0) KEY[i] = 65535;
          else { const key = (((f & F_CHG) && k > 0.55 ? COL2[i] : COL[i]) * 4 + lv) * 2 + (f & F_TINY ? 1 : 0); KEY[i] = key; CNT[key]++; }
          i++;
        }
        START[0] = 0;
        for (let k = 0; k < NK; k++) { START[k + 1] = START[k] + CNT[k]; POS[k] = START[k]; }
        for (let s = 0; s < NS; s++) { const key = KEY[s]; if (key !== 65535) ORDER[POS[key]++] = s; }
        fx.lineCap = 'round';
        for (let key = 0; key < NK; key++) {
          const n = CNT[key]; if (!n) continue;
          const tiny = key & 1, lv = (key >> 1) & 3, c = key >> 3, a0 = START[key], a1 = START[key + 1];
          fx.globalAlpha = LA[lv]; fx.strokeStyle = PAL[c]; fx.lineWidth = tiny ? 1.15 : 2.1 + lv * 0.25;
          fx.beginPath();
          for (let q = a0; q < a1; q++) { const s = ORDER[q], dx = SX[s] - PX[s], dy = SY[s] - PY[s], d2 = dx * dx + dy * dy; if (d2 > 676) { const k = 26 / Math.sqrt(d2); fx.moveTo(SX[s] - dx * k, SY[s] - dy * k); } else fx.moveTo(PX[s], PY[s]); fx.lineTo(SX[s] + 0.05, SY[s]); }
          fx.stroke();
          if (!tiny && lv >= 2) for (let q = a0; q < a1; q++) { const s = ORDER[q]; if (FLAG[s] & F_GLIT) continue; const r = SIZE[s] * (2.6 + lv * 0.6); fx.drawImage(SPR[c], SX[s] - r, SY[s] - r, r * 2, r * 2); }
        }
        fx.globalAlpha = 1;
      }

      /* ---------------- words in the sky ---------------- */
      function showWord(text, x, y, col, user, big, hold) {
        const w = h('div', { class: 'jf-word' + (user ? ' gk-user' : '') + (big ? ' jf-big' : '') + (hold ? ' jf-hold' : ''), text, style: { '--c': col } });
        wordsEl.append(w);
        const ww = w.offsetWidth, wh = w.offsetHeight; // one read per burst, never per frame
        const cx = K.clamp(x, ww / 2 + 12, G.w - ww / 2 - 12), cy = K.clamp(y, G.band.top - 40 + wh / 2, G.hz - wh / 2 - 10);
        w.style.left = cx + 'px'; w.style.top = cy + 'px';
        K.later(() => w.remove(), hold ? 7600 : big ? 5300 : 2500);
      }
      function pop(text, x, y, col) {
        const p = h('div', { class: 'jf-pop', text, style: { '--c': col || '#ffd36b' } });
        p.style.left = K.clamp(x, 90, G.w - 90) + 'px'; p.style.top = y + 'px';
        el.append(p); K.later(() => p.remove(), 1000);
      }

      /* ---------------- layout and painting ---------------- */
      function off(w, hh, s) { s = s || cv.dpr; const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(hh * s)); const g = c.getContext('2d'); g.setTransform(s, 0, 0, s, 0, 0); return { c, g, w, h: hh, s }; }
      const FX = { c: document.createElement('canvas'), g: null, s: 1 }, SMK = { c: document.createElement('canvas'), g: null, s: 0.3, tick: 0, live: false };
      let twinkles = [], glints = [], crowd = [];
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        const phone = w < 700;
        Object.assign(G, { w, H, phone });
        G.hz = Math.round(H * (phone ? 0.6 : 0.62));
        G.bx = Math.round(w / 2); G.by = Math.round(H * (phone ? 0.735 : 0.74));
        G.mh = phone ? 50 : 58;
        G.mouth = { x: G.bx, y: G.by - G.mh };
        G.R = Math.round(Math.min(w * 0.3, H * 0.22, 190));
        G.g = G.R * 0.55;
        G.band = { top: phone ? 200 : 190, bot: G.hz - (phone ? 112 : 128) };
        G.ring = { x: G.bx, y: G.by - 26, r: phone ? 70 : 84 };
        const sz = phone ? 72 : 96;
        sync.place(phone ? 10 : 24, phone ? 66 : 74); sync.el.style.setProperty('--sz', sz + 'px');
        placeCameos(0);
        pad.style.left = G.bx + 'px'; pad.style.top = G.mouth.y + 'px';
        fireBtn.style.left = G.ring.x + 'px'; fireBtn.style.top = G.ring.y + 'px';
        const tw = phone ? 46 : 60;
        G.tubes = [];
        for (let j = 0; j < 6; j++) { const side = j < 3 ? -1 : 1, idx = j % 3; G.tubes.push({ x: G.bx + side * (tw + idx * (phone ? 18 : 24)), lean: side * (0.1 + idx * 0.11), h: (phone ? 30 : 36) + (2 - idx) * 3 }); }
        FX.s = SOFTGFX ? 0.6 : K.clamp(cv.dpr * 0.62, 0.6, 1);
        FX.c.width = Math.round(w * FX.s); FX.c.height = Math.round(H * FX.s);
        FX.g = FX.c.getContext('2d'); FX.g.setTransform(FX.s, 0, 0, FX.s, 0, 0);
        SMK.c.width = Math.max(1, Math.round(w * SMK.s)); SMK.c.height = Math.max(1, Math.round(G.hz * SMK.s));
        SMK.g = SMK.c.getContext('2d'); SMK.g.setTransform(SMK.s, 0, 0, SMK.s, 0, 0); SMK.live = false;
        paintLayers();
      }
      /* Drop and Loopie watch from the barge rail, then join the crowd on the quay for the finale */
      function placeCameos(ms) {
        const cs = G.phone ? 48 : 62, dx = G.phone ? 116 : 168, ashore = W.ashore;
        drop.el.style.setProperty('--sz', cs + 'px'); loopie.el.style.setProperty('--sz', cs + 'px');
        if (ashore) { drop.place(G.phone ? 12 : 40, G.H - (G.phone ? 118 : 140), ms); loopie.place(G.phone ? G.w - (visits >= 2 ? 120 : 62) : G.w - (visits >= 2 ? 200 : 110), G.H - (G.phone ? 118 : 140), ms); }
        else { drop.place(G.bx - dx - cs, G.by - cs + 4, ms); loopie.place(G.bx + dx, G.by - cs + 4, ms); }
      }
      function paintLayers() {
        if (!G.w) return;
        const D = dark(), R = K.rng(dayN * 17 + V.id.length);
        G.beacons = []; G.glows = []; G.chims = []; G.streaks = [];
        L.bg = off(G.w, G.H); L.sil = off(G.w, G.H);
        paintSky(L.bg.g, D, R);
        SIL[V.id](L.sil.g, D, R);
        L.bg.g.drawImage(L.sil.c, 0, 0, G.w, G.H);
        paintWater(L.bg.g, D, R);
        paintBarge(D);
        const sk = V.sky[D ? 'd' : 'b'];
        el.style.backgroundColor = sk[0];
        const R2 = K.rng(dayN + 404);
        twinkles = [];
        for (let i = 0; i < 60 && twinkles.length < 38; i++) {
          const tw = { x: R2() * G.w, y: 70 + R2() * (G.hz - 120), s: 1 + R2() * 1.3, ph: R2() * 6, sp: 0.8 + R2() * 2 };
          let hid = false; try { hid = L.sil.g.getImageData(Math.round(tw.x * L.sil.s), Math.round(tw.y * L.sil.s), 1, 1).data[3] > 20; } catch (e) { hid = false; }
          if (!hid) twinkles.push(tw);
        }
        glints = []; for (let i = 0; i < (G.phone ? 26 : 44); i++) { const d = Math.pow(R2(), 1.6); glints.push({ x: R2() * G.w, y: G.hz + 6 + d * (G.H - G.hz - 10), l: 5 + d * 18, ph: R2() * 6 }); }
        crowd = [];
        const n = Math.round(G.w / (G.phone ? 16 : 19));
        for (let row = 0; row < 2; row++) for (let i = 0; i < n; i++) {
          const s = (row ? 1.05 : 0.86) * (G.phone ? 0.9 : 1.1) * (0.86 + R2() * 0.28);
          crowd.push({ x: (i + 0.2 + R2() * 0.6) * (G.w / n), y: G.H - (row ? 8 : 30) + R2() * 6, s, ph: R2() * TAU, arm: 0, armT: 0, phone: R2() < 0.32, side: R2() < 0.5 ? -1 : 1, hair: R2() });
        }
        crowd.sort((a, b) => a.y - b.y);
      }
      function paintSky(g, D, R) {
        const w = G.w, hz = G.hz, sk = V.sky[D ? 'd' : 'b'];
        const gr = g.createLinearGradient(0, 0, 0, hz);
        gr.addColorStop(0, sk[0]); gr.addColorStop(0.55, sk[1]); gr.addColorStop(1, sk[2]);
        g.fillStyle = gr; g.fillRect(0, 0, w, hz + 2);
        const hg = g.createRadialGradient(w * 0.5, hz + 40, 10, w * 0.5, hz + 40, Math.max(w, hz) * 0.8);
        hg.addColorStop(0, K.hexA(sk[2], 0.55)); hg.addColorStop(1, K.hexA(sk[2], 0));
        g.fillStyle = hg; g.fillRect(0, 0, w, hz + 2);
        for (let i = 0; i < 6; i++) { const cx = R() * w, cy = hz * (0.3 + R() * 0.45), cw = w * (0.35 + R() * 0.45), ch = 14 + R() * 26; g.globalAlpha = (D ? 0.05 : 0.06) * (0.6 + R() * 0.8); g.drawImage(SOFT, cx - cw / 2, cy - ch / 2, cw, ch); g.drawImage(SOFT, cx - cw * 0.3, cy - ch * 0.9, cw * 0.6, ch * 1.2); }
        g.globalAlpha = 1;
        if (V.milky) {
          const x0 = -w * 0.1, y0 = hz * 0.78, x1 = w * 1.1, y1 = hz * 0.02, nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny);
          for (let i = 0; i < 26; i++) { const t = R(), px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t, r = 50 + R() * 70; g.globalAlpha = (D ? 0.07 : 0.05) * (0.6 + R() * 0.8); g.drawImage(SOFT, px - r, py - r, r * 2, r * 2); }
          for (let i = 0; i < 900; i++) { const t = R(), o = (R() + R() + R() - 1.5) * 46, px = x0 + (x1 - x0) * t + nx / nl * o, py = y0 + (y1 - y0) * t + ny / nl * o; g.globalAlpha = (0.12 + R() * 0.35) * (D ? 1 : 0.6); g.fillStyle = '#fff'; g.fillRect(px, py, 0.9, 0.9); }
          g.globalAlpha = 1;
        }
        const n = Math.round(V.stars * (w * hz) / (390 * 500) * (D ? 1 : 0.55));
        for (let i = 0; i < n; i++) {
          const x = R() * w, y = Math.pow(R(), 1.3) * (hz - 30), s = R() < 0.08 ? 1.7 : R() < 0.45 ? 1.15 : 0.75;
          g.globalAlpha = (0.25 + R() * 0.6) * (D ? 1 : 0.6) * (1 - y / hz * 0.55); g.fillStyle = R() < 0.15 ? '#ffe9c4' : R() < 0.15 ? '#cfe2ff' : '#ffffff'; g.fillRect(x, y, s, s);
        }
        g.globalAlpha = 1;
      }
      function paintWater(g, D, R) {
        const w = G.w, H = G.H, hz = G.hz, wa = V.water[D ? 'd' : 'b'], sk = V.sky[D ? 'd' : 'b'], SQ = 0.62;
        const gr = g.createLinearGradient(0, hz, 0, H); gr.addColorStop(0, wa[0]); gr.addColorStop(1, wa[1]);
        g.fillStyle = gr; g.fillRect(0, hz, w, H - hz);
        const rg = g.createLinearGradient(0, hz, 0, hz + (H - hz) * 0.7); rg.addColorStop(0, K.hexA(sk[2], 0.55 * V.mirror + 0.12)); rg.addColorStop(1, K.hexA(sk[2], 0));
        g.fillStyle = rg; g.fillRect(0, hz, w, H - hz);
        g.save(); g.beginPath(); g.rect(0, hz, w, H - hz); g.clip();
        g.translate(0, hz); g.scale(1, -SQ); g.globalAlpha = 0.5 + V.mirror * 0.45;
        g.drawImage(L.sil.c, 0, -hz, w, H);
        g.restore();
        g.fillStyle = K.hexA(wa[1], 0.3); g.fillRect(0, hz, w, H - hz);
        G.streaks.slice(0, 90).forEach(s => {
          const len = 14 + R() * 46;
          for (let y = 0; y < len; y += 3.2) { g.globalAlpha = (1 - y / len) * (0.22 + R() * 0.2) * (0.55 + V.mirror * 0.5); g.fillStyle = s.c; g.fillRect(s.x - 1 + Math.sin(y * 0.7 + s.x) * 1.4, hz + 3 + y, 2.4, 1.6); }
        });
        g.globalAlpha = 1;
        if (V.id === 'snow') { g.strokeStyle = 'rgba(220,232,255,0.12)'; g.lineWidth = 1; for (let i = 0; i < 7; i++) { let x = R() * w, y = hz + 8 + R() * (H - hz) * 0.7; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (R() - 0.3) * 50; y += (R() - 0.5) * 10; g.lineTo(x, y); } g.stroke(); } }
        if (V.id === 'lake') { // a little jetty
          const jx = w * (G.phone ? 0.05 : 0.08), jy = hz + 6;
          g.fillStyle = D ? '#06101a' : '#152a40'; g.beginPath(); g.moveTo(jx, jy); g.lineTo(jx + (G.phone ? 70 : 110), jy); g.lineTo(jx + (G.phone ? 96 : 150), jy + (G.phone ? 22 : 30)); g.lineTo(jx - 10, jy + (G.phone ? 22 : 30)); g.closePath(); g.fill();
          for (let k = 0; k < 5; k++) { const px = jx + k * (G.phone ? 22 : 34); g.fillRect(px, jy, 2.5, (G.phone ? 26 : 36)); }
        }
        g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, hz, w, 1.5);
        // the near quay where the crowd stands: a warm, lamp-lit wall top, so the silhouettes read against it
        const qy = H - (G.phone ? 50 : 56), warm = D ? '#6a4660' : '#9a7aa8';
        const qg = g.createLinearGradient(0, qy - 46, 0, H); qg.addColorStop(0, K.hexA(warm, 0)); qg.addColorStop(0.5, K.hexA(warm, D ? 0.42 : 0.4)); qg.addColorStop(1, K.hexA(D ? '#24162a' : '#3e2e58', 0.95));
        g.fillStyle = qg; g.fillRect(0, qy - 46, w, H - qy + 46);
        g.fillStyle = K.hexA('#ffd9a8', D ? 0.22 : 0.3); g.fillRect(0, qy, w, 2);
        const step = G.phone ? 120 : 190;
        for (let x = step * 0.5; x < w; x += step) {
          g.globalAlpha = 0.8; g.drawImage(WARM, x - 34, qy - 70, 68, 68); g.globalAlpha = 1;
          g.fillStyle = D ? '#140c18' : '#2a1e3a'; g.fillRect(x - 1.5, qy - 36, 3, 40); g.fillRect(x - 5, qy - 40, 10, 5);
          g.fillStyle = '#ffe2b0'; g.fillRect(x - 3, qy - 36, 6, 3);
        }
      }
      const SIL = {
        harbour(g, D, R) {
          const w = G.w, hz = G.hz, ph = G.phone, far = V.far[D ? 'd' : 'b'], near = V.near[D ? 'd' : 'b'];
          let x = -6;
          while (x < w + 6) {
            const bw = 14 + R() * 30, bh = (ph ? 44 : 58) + Math.pow(R(), 1.6) * (ph ? 104 : 150);
            g.fillStyle = far; g.fillRect(x, hz - bh, bw, bh + 4);
            if (bh > (ph ? 108 : 150) && R() < 0.75) { g.fillRect(x + bw / 2 - 1, hz - bh - 18, 2, 18); G.beacons.push({ x: x + bw / 2, y: hz - bh - 19, ph: R() * 6 }); }
            g.fillStyle = K.hexA('#ffe6b0', D ? 0.2 : 0.16);
            for (let yy = hz - bh + 5; yy < hz - 8; yy += 6) for (let xx = x + 3; xx < x + bw - 3; xx += 4) if (R() < 0.16) g.fillRect(xx, yy, 1.6, 2.4);
            x += bw + 1 + R() * 5;
          }
          // a suspension bridge strung with lights
          const x1 = ph ? w * 0.62 : w * 0.66, x2 = ph ? w * 1.06 : w * 0.92, top = hz - (ph ? 96 : 130), deck = hz - (ph ? 24 : 32), span = ph ? 90 : 170, col = mixHex(far, near, 0.45);
          g.fillStyle = col; g.strokeStyle = col;
          [x1, x2].forEach(tx => { g.fillRect(tx - 3, top, 6, hz - top); g.fillRect(tx - 6, top + 12, 12, 3); g.fillRect(tx - 6, deck - 3, 12, 5); G.beacons.push({ x: tx, y: top - 2, ph: R() * 6 }); });
          g.fillRect(x1 - span, deck, x2 - x1 + span * 2, 3);
          g.lineWidth = 1.4;
          g.beginPath(); g.moveTo(x1, top + 2); g.quadraticCurveTo((x1 + x2) / 2, deck + 34, x2, top + 2); g.stroke();
          g.beginPath(); g.moveTo(x1, top + 2); g.quadraticCurveTo(x1 - span * 0.45, deck - 12, x1 - span, deck); g.stroke();
          g.beginPath(); g.moveTo(x2, top + 2); g.quadraticCurveTo(x2 + span * 0.45, deck - 12, x2 + span, deck); g.stroke();
          g.lineWidth = 0.6; g.globalAlpha = 0.55;
          for (let hx = x1 + 7; hx < x2 - 3; hx += 7) { const t = (hx - x1) / (x2 - x1), cy = (1 - t) * (1 - t) * (top + 2) + 2 * (1 - t) * t * (deck + 34) + t * t * (top + 2); if (cy < deck) { g.beginPath(); g.moveTo(hx, cy); g.lineTo(hx, deck); g.stroke(); } }
          g.globalAlpha = 1;
          for (let lx = x1 - span; lx < x2 + span; lx += 8) { g.fillStyle = K.hexA('#ffe6a8', 0.85); g.fillRect(lx, deck - 1.6, 1.7, 1.7); if (R() < 0.25) G.streaks.push({ x: lx, c: '#ffe6a8' }); }
          // the waterfront
          x = -4;
          while (x < w + 4) {
            const bw = 20 + R() * 38, bh = (ph ? 20 : 26) + Math.pow(R(), 1.3) * (ph ? 58 : 84), r = R();
            g.fillStyle = near; g.fillRect(x, hz - bh, bw, bh + 4);
            if (r < 0.18) g.fillRect(x + bw * 0.22, hz - bh - 9, bw * 0.56, 9);
            else if (r < 0.28) { g.beginPath(); g.moveTo(x + bw * 0.25, hz - bh); g.lineTo(x + bw * 0.5, hz - bh - 24); g.lineTo(x + bw * 0.75, hz - bh); g.closePath(); g.fill(); }
            else if (r < 0.36) { g.beginPath(); g.arc(x + bw / 2, hz - bh, bw * 0.32, Math.PI, 0); g.fill(); }
            for (let yy = hz - bh + 5; yy < hz - 5; yy += 7) for (let xx = x + 3.5; xx < x + bw - 4; xx += 5.5) if (R() < 0.3) {
              const c = V.win[Math.floor(R() * V.win.length)]; g.fillStyle = K.hexA(c, 0.5 + R() * 0.45); g.fillRect(xx, yy, 2.2, 3.2);
              if (R() < 0.2) G.streaks.push({ x: xx + 1, c });
            }
            x += bw + R() * 2;
          }
          g.fillStyle = near; g.fillRect(0, hz - 4, w, 8);
          for (let lx = 8; lx < w; lx += ph ? 26 : 34) { g.fillStyle = K.hexA('#ffe0a0', 0.9); g.fillRect(lx, hz - 7, 2, 2); G.streaks.push({ x: lx + 1, c: '#ffe0a0' }); }
        },
        lake(g, D, R) {
          const w = G.w, hz = G.hz, ph = G.phone, far = V.far[D ? 'd' : 'b'], near = V.near[D ? 'd' : 'b'];
          const ridge = (base, amp, col, step, cap) => {
            const pts = []; let x = -30;
            while (x < w + 60) { pts.push([x, base - amp * (0.15 + R() * 0.3)]); x += step * (0.4 + R() * 0.5); pts.push([x, base - amp * (0.6 + R() * 0.4)]); x += step * (0.4 + R() * 0.6); }
            const Pp = [];
            for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx2, by2] = pts[i + 1]; for (let k = 0; k < 5; k++) { const t = k / 5; Pp.push([ax + (bx2 - ax) * t, ay + (by2 - ay) * t + (k ? (R() - 0.5) * amp * 0.07 : 0)]); } }
            Pp.push(pts[pts.length - 1]);
            g.beginPath(); g.moveTo(-30, hz + 4); Pp.forEach(([px, py]) => g.lineTo(px, py)); g.lineTo(w + 60, hz + 4); g.closePath(); g.fillStyle = col; g.fill();
            if (cap) {
              g.fillStyle = K.hexA('#e6efff', D ? 0.3 : 0.55);
              for (let i = 1; i < pts.length - 1; i += 2) {
                const [px, py] = pts[i], [lx, ly] = pts[i - 1], [rx, ry] = pts[i + 1], k1 = 0.26, k2 = 0.22;
                if (base - py < amp * 0.68) continue;
                g.beginPath(); g.moveTo(px, py); g.lineTo(px + (lx - px) * k1, py + (ly - py) * k1); g.lineTo(px + (lx - px) * 0.12, py + (ly - py) * 0.2 + 4);
                g.lineTo(px, py + amp * 0.1); g.lineTo(px + (rx - px) * 0.1, py + (ry - py) * 0.16 + 3); g.lineTo(px + (rx - px) * k2, py + (ry - py) * k2); g.closePath(); g.fill();
              }
            }
          };
          ridge(hz - 4, ph ? 150 : 205, far, ph ? 110 : 170, true);
          ridge(hz - 1, ph ? 66 : 92, mixHex(far, near, 0.55), ph ? 80 : 120, false);
          pines(g, -10, w + 10, hz + 3, ph ? 10 : 14, ph ? 30 : 42, near, R, false);
          const cx = w * (ph ? 0.2 : 0.24);
          g.fillStyle = near; g.fillRect(cx - 14, hz - 16, 28, 18); g.beginPath(); g.moveTo(cx - 18, hz - 15); g.lineTo(cx, hz - 30); g.lineTo(cx + 18, hz - 15); g.closePath(); g.fill(); g.fillRect(cx + 7, hz - 32, 4, 10);
          g.fillStyle = '#ffcf7a'; g.fillRect(cx - 8, hz - 11, 5, 5); g.fillRect(cx + 3, hz - 11, 5, 5);
          G.glows.push({ x: cx, y: hz - 9, r: 26, ph: R() * 6 }); G.chims.push({ x: cx + 9, y: hz - 34 }); G.streaks.push({ x: cx - 5, c: '#ffcf7a' }, { x: cx + 5, c: '#ffcf7a' });
        },
        salt(g, D, R) {
          const w = G.w, hz = G.hz, ph = G.phone, far = V.far[D ? 'd' : 'b'], near = V.near[D ? 'd' : 'b'];
          const mesa = (x0, x1, top, col) => {
            g.beginPath(); g.moveTo(x0 - 40, hz + 2); g.lineTo(x0 - 6, top + 14); g.lineTo(x0, top + 3); g.lineTo(x0 + 6, top);
            for (let x = x0 + 10; x < x1 - 8; x += 9) g.lineTo(x, top + (R() - 0.5) * 3);
            g.lineTo(x1 - 4, top + 2); g.lineTo(x1 + 4, top + 16); g.lineTo(x1 + 50, hz + 2); g.closePath(); g.fillStyle = col; g.fill();
          };
          mesa(-50, w * 0.24, hz - (ph ? 74 : 98), far); mesa(w * 0.6, w * 0.8, hz - (ph ? 50 : 70), far); mesa(w * 0.86, w + 60, hz - (ph ? 90 : 116), far);
          mesa(w * 0.32, w * 0.4, hz - (ph ? 30 : 40), mixHex(far, near, 0.5));
          g.fillStyle = near; g.beginPath(); g.moveTo(-10, hz + 3);
          for (let x = -10; x <= w + 10; x += 12) g.lineTo(x, hz - 3 - Math.max(0, Math.sin(x * 0.013 + 1.3)) * 9 - R() * 1.5);
          g.lineTo(w + 10, hz + 3); g.closePath(); g.fill();
          const cactus = (x, hh) => { g.fillStyle = near; const r = hh * 0.09; g.fillRect(x - r, hz - hh, r * 2, hh); g.beginPath(); g.arc(x, hz - hh, r, Math.PI, 0); g.fill();
            g.fillRect(x - r * 3.2, hz - hh * 0.62, r * 1.5, hh * 0.3); g.fillRect(x - r * 3.2, hz - hh * 0.62, r * 3, r * 1.3); g.beginPath(); g.arc(x - r * 2.45, hz - hh * 0.62, r * 0.75, Math.PI, 0); g.fill();
            g.fillRect(x + r * 1.7, hz - hh * 0.5, r * 1.5, hh * 0.22); g.fillRect(x + r * 0.2, hz - hh * 0.36, r * 3, r * 1.3); g.beginPath(); g.arc(x + r * 2.45, hz - hh * 0.5, r * 0.75, Math.PI, 0); g.fill(); };
          cactus(w * 0.06, ph ? 40 : 56); cactus(w * 0.93, ph ? 34 : 48); if (!ph) cactus(w * 0.53, 30);
          const camp = ph ? [0.4, 0.5] : [0.36, 0.43, 0.5];
          camp.forEach(f => { const x = w * f, s = ph ? 12 : 15; g.fillStyle = near; g.beginPath(); g.moveTo(x - s, hz); g.lineTo(x, hz - s * 1.1); g.lineTo(x + s, hz); g.closePath(); g.fill();
            g.fillStyle = K.hexA('#ffb46b', 0.95); g.beginPath(); g.moveTo(x - 3, hz); g.lineTo(x, hz - 6); g.lineTo(x + 3, hz); g.closePath(); g.fill(); G.glows.push({ x, y: hz - 5, r: 22, ph: R() * 6 }); G.streaks.push({ x, c: '#ffb46b' }); });
          g.strokeStyle = K.hexA('#2a1d10', 0.7); g.lineWidth = 0.8; g.beginPath(); g.moveTo(w * camp[0] - 30, hz - 18); g.quadraticCurveTo(w * (camp[0] + camp[camp.length - 1]) / 2, hz - 6, w * camp[camp.length - 1] + 30, hz - 18); g.stroke();
          for (let k = 0; k <= 12; k++) { const t = k / 12, xa = w * camp[0] - 30, xb = w * camp[camp.length - 1] + 30, xm = (xa + xb) / 2, lx = (1 - t) * (1 - t) * xa + 2 * (1 - t) * t * xm + t * t * xb, ly = (1 - t) * (1 - t) * (hz - 18) + 2 * (1 - t) * t * (hz - 6) + t * t * (hz - 18); g.fillStyle = ['#ffd98a', '#ff9ec7', '#9fe6ff'][k % 3]; g.fillRect(lx - 1, ly, 2, 2); }
        },
        snow(g, D, R) {
          const w = G.w, hz = G.hz, ph = G.phone, far = V.far[D ? 'd' : 'b'], near = V.near[D ? 'd' : 'b'], snowC = D ? '#3f5079' : '#a3b3d9';
          g.fillStyle = mixHex(far, '#dde6ff', D ? 0.1 : 0.22); g.beginPath(); g.moveTo(-10, hz + 2);
          for (let x = -10; x <= w + 10; x += 8) g.lineTo(x, hz - (ph ? 70 : 96) - Math.sin(x * 0.009 + 0.6) * (ph ? 22 : 34) - Math.sin(x * 0.023) * 8);
          g.lineTo(w + 10, hz + 2); g.closePath(); g.fill();
          const hill = (x) => hz - (ph ? 34 : 46) - Math.sin(x * 0.011 + 2.1) * (ph ? 14 : 20);
          g.fillStyle = snowC; g.beginPath(); g.moveTo(-10, hz + 2); for (let x = -10; x <= w + 10; x += 8) g.lineTo(x, hill(x)); g.lineTo(w + 10, hz + 2); g.closePath(); g.fill();
          const step = ph ? 30 : 38;
          for (let x = 14 + R() * 10; x < w - 10; x += step * (0.7 + R() * 0.7)) {
            if (R() < 0.18) continue;
            const hw = (ph ? 7 : 9) + R() * 4, hh = (ph ? 8 : 10) + R() * 5, base = hill(x) + 6 + R() * 6, church = R() < 0.07;
            g.fillStyle = near; g.fillRect(x - hw, base - hh, hw * 2, hh + 4);
            g.beginPath(); g.moveTo(x - hw - 2, base - hh); g.lineTo(x, base - hh - hw * 0.9); g.lineTo(x + hw + 2, base - hh); g.closePath(); g.fill();
            g.strokeStyle = D ? '#c4d2f2' : '#f2f6ff'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - hw - 2, base - hh); g.lineTo(x, base - hh - hw * 0.9); g.lineTo(x + hw + 2, base - hh); g.stroke();
            if (church) { g.fillStyle = near; g.fillRect(x - 3, base - hh - hw * 0.9 - 18, 6, 20); g.beginPath(); g.moveTo(x - 4, base - hh - hw * 0.9 - 18); g.lineTo(x, base - hh - hw * 0.9 - 30); g.lineTo(x + 4, base - hh - hw * 0.9 - 18); g.fill(); }
            const wc = V.win[Math.floor(R() * V.win.length)];
            g.fillStyle = wc; g.fillRect(x - hw * 0.55, base - hh * 0.62, 3, 3); if (R() < 0.6) g.fillRect(x + hw * 0.25, base - hh * 0.62, 3, 3);
            G.glows.push({ x, y: base - hh * 0.5, r: 16, ph: R() * 6 }); if (R() < 0.4) G.chims.push({ x: x + hw * 0.5, y: base - hh - hw * 0.5 }); G.streaks.push({ x, c: wc });
          }
          pines(g, -10, w + 10, hz + 3, ph ? 9 : 12, ph ? 26 : 34, near, R, true);
        }
      };
      function pines(g, x0, x1, base, hmin, hmax, col, R, snow) {
        let x = x0;
        while (x < x1) {
          const hh = hmin + R() * (hmax - hmin), hw = hh * 0.3;
          g.fillStyle = col;
          for (let k = 0; k < 3; k++) { const ty = base - hh + k * hh * 0.26, bw = hw * (0.5 + k * 0.42); g.beginPath(); g.moveTo(x, ty); g.lineTo(x + bw, ty + hh * 0.42); g.lineTo(x - bw, ty + hh * 0.42); g.closePath(); g.fill(); }
          g.fillRect(x - 1, base - hh * 0.18, 2, hh * 0.18);
          if (snow) { g.fillStyle = 'rgba(232,240,255,0.55)'; for (let k = 0; k < 3; k++) { const ty = base - hh + k * hh * 0.26, bw = hw * (0.5 + k * 0.42) * 0.4; g.beginPath(); g.moveTo(x, ty); g.lineTo(x + bw, ty + hh * 0.16); g.lineTo(x - bw, ty + hh * 0.16); g.closePath(); g.fill(); } }
          x += hw * (0.8 + R() * 1.5);
        }
      }
      function paintBarge(D) {
        const bw = G.phone ? 236 : 330, hh = G.phone ? 22 : 28, mw = G.phone ? 34 : 42, mh = G.mh, pad2 = 30;
        const s = off(bw + pad2 * 2, mh + hh + 40), g = s.g, ox = pad2 + bw / 2, deck = mh + 20;
        const hull = g.createLinearGradient(0, deck, 0, deck + hh); hull.addColorStop(0, D ? '#2a2438' : '#3a3352'); hull.addColorStop(1, D ? '#0b0910' : '#17142a');
        g.fillStyle = hull; g.beginPath(); g.moveTo(ox - bw / 2, deck); g.lineTo(ox + bw / 2, deck); g.lineTo(ox + bw * 0.43, deck + hh); g.lineTo(ox - bw * 0.43, deck + hh); g.closePath(); g.fill();
        g.fillStyle = D ? '#4a4262' : '#5d5580'; g.fillRect(ox - bw / 2, deck - 2, bw, 3);
        g.strokeStyle = D ? '#3c3552' : '#514a6e'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(ox - bw / 2 + 4, deck - 11); g.lineTo(ox + bw / 2 - 4, deck - 11); g.stroke();
        for (let x = ox - bw / 2 + 4; x <= ox + bw / 2 - 3; x += 16) { g.beginPath(); g.moveTo(x, deck - 11); g.lineTo(x, deck - 1); g.stroke(); }
        const met = g.createLinearGradient(ox - mw / 2, 0, ox + mw / 2, 0); met.addColorStop(0, '#24222e'); met.addColorStop(0.42, '#77748c'); met.addColorStop(0.58, '#9a97ae'); met.addColorStop(1, '#2a2834');
        g.fillStyle = met; g.fillRect(ox - mw / 2, deck - mh, mw, mh);
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(ox - mw / 2, deck - mh * 0.62, mw, 4); g.fillRect(ox - mw / 2, deck - mh * 0.28, mw, 4);
        g.fillStyle = '#e8546e'; g.fillRect(ox - mw / 2, deck - mh * 0.5, mw, 6); g.fillStyle = '#ffd36b'; g.fillRect(ox - mw / 2, deck - mh * 0.5 + 6, mw, 3);
        g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(ox - mw * 0.12, deck - mh * 0.5, mw * 0.12, 9);
        const fb = ox + mw / 2 + (G.phone ? 26 : 34);
        g.fillStyle = D ? '#2c2a3e' : '#3b3854'; g.fillRect(fb, deck - 16, 18, 14); g.fillStyle = '#777390'; g.fillRect(fb, deck - 16, 18, 2);
        g.strokeStyle = '#6b5b48'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(fb, deck - 9); g.quadraticCurveTo(ox + mw / 2 + 8, deck - 2, ox + mw / 2, deck - 8); g.stroke();
        G.led = { x: fb + 13, y: deck - 10 };
        g.fillStyle = '#b9b5cc'; g.beginPath(); g.ellipse(ox, deck - mh, mw / 2 + 2, 5, 0, 0, TAU); g.fill();
        g.fillStyle = '#0d0b14'; g.beginPath(); g.ellipse(ox, deck - mh, mw / 2 - 2, 3.2, 0, 0, TAU); g.fill();
        L.barge = { s, x: G.bx - ox, y: G.by - deck, bw, hh, deck };
      }

      /* ---------------- drawing ---------------- */
      function draw(g, dt, t, now) {
        const w = G.w, H = G.H, hz = G.hz, D = dark();
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.drawImage(L.bg.c, 0, 0, w, H);
        // twinkling stars, a little brighter on the beat
        g.fillStyle = '#fff';
        for (const s of twinkles) { const a = (0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph)) + W.pulse * 0.15) * (D ? 1 : 0.6) * (1 - W.lit * 0.4); if (a > 0.04) { g.globalAlpha = a; g.fillRect(s.x, s.y, s.s, s.s); } }
        g.globalAlpha = 1;
        // drifting smoke, lit by the show (a tiny canvas, refreshed every third frame)
        if (puffs.length || SMK.live) {
          if (SMK.g && (++SMK.tick % 3 === 0 || !SMK.live)) {
            const sg = SMK.g; sg.clearRect(0, 0, w, hz); SMK.live = puffs.length > 0;
            for (const p of puffs) { const a = p.a * (0.45 + 0.55 * Math.min(1, W.lit)) * (D ? 1 : 0.75); if (a > 0.005) { sg.globalAlpha = a; sg.drawImage(SMOKE, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); } }
            sg.globalAlpha = 1;
          }
          if (SMK.live) g.drawImage(SMK.c, 0, 0, w, hz);
        }
        venueLife(g, t, D);
        // fireworks, then their reflection in the water
        if (W.idle < 1.5) {
          g.globalCompositeOperation = 'lighter';
          g.drawImage(FX.c, 0, 0, w, H);
          reflect(g, t);
          g.globalCompositeOperation = 'source-over';
        }
        // glints on the water
        g.globalCompositeOperation = 'lighter';
        const gl = 0.12 + Math.min(1, W.lit) * 0.5;
        g.fillStyle = W.lastCol;
        for (const s of glints) { const a = gl * (0.4 + 0.6 * Math.sin(t * 1.7 + s.ph)) * (1 - W.calm * 0.5); if (a > 0.03) { g.globalAlpha = a; g.fillRect(s.x + Math.sin(t * 0.8 + s.ph) * 4, s.y, s.l, 1.2); } }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        drawBarge(g, t, now);
        if (W.ringOn > 0.01) drawRing(g, now);
        drawCrowd(g, t, D);
        P.update(dt); P.draw(g);
      }
      function reflect(g, t) {
        const hz = G.hz, H = G.H, w = G.w, SQ = 0.62, strips = SOFTGFX ? 8 : G.phone ? 10 : 14, depth = H - hz, rip = V.ripple * (1 - W.calm * 0.85), fs = FX.s;
        g.save();
        g.globalAlpha = Math.min(1, (0.35 + V.mirror * 0.5) * (dark() ? 1 : 0.85));
        for (let i = 0; i < strips; i++) {
          const d0 = depth * (i / strips), d1 = depth * ((i + 1) / strips), s0 = d0 / SQ, s1 = Math.min(hz, d1 / SQ);
          if (s0 >= hz) break;
          const off = Math.sin(t * 1.6 + i * 1.3) * rip * (1.5 + i * 0.9) + Math.sin(t * 0.7 + i * 0.4) * rip * 2;
          g.setTransform(cv.dpr, 0, 0, -SQ * cv.dpr, off * cv.dpr, (hz + d0) * cv.dpr);
          const sh = s1 - s0; if (sh <= 0.5) continue;
          g.drawImage(FX.c, 0, (hz - s1) * fs, FX.c.width, sh * fs, 0, -sh, w, sh);
        }
        g.restore();
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
      }
      function venueLife(g, t, D) {
        if (G.beacons.length) { g.globalCompositeOperation = 'lighter'; for (const b of G.beacons) { const on = Math.sin(t * 2.2 + b.ph) > 0.55 ? 1 : 0.12; g.globalAlpha = on * (D ? 0.9 : 0.7); g.drawImage(BEACON, b.x - 6, b.y - 6, 12, 12); } g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        if (G.glows.length) { g.globalCompositeOperation = 'lighter'; for (const b of G.glows) { g.globalAlpha = 0.35 + 0.12 * Math.sin(t * 3.1 + b.ph) + 0.08 * Math.sin(t * 7.3 + b.ph * 2); g.drawImage(WARM, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2); } g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        if (G.chims.length && rnd() < 0.02 * G.chims.length) { const c = G.chims[Math.floor(rnd() * G.chims.length)]; P.emit('smoke', c.x, c.y, 1, { speed: [5, 12], angle: -Math.PI / 2 - 0.25, spread: 0.4, size: [3, 6], colors: ['rgba(200,205,230,0.16)'] }); }
        if (V.snow && rnd() < (G.phone ? 0.22 : 0.4)) P.emit('snow', rnd() * G.w, -6, 1, { angle: Math.PI / 2, spread: 0.5, speed: [14, 30] });
      }
      function drawBarge(g, t, now) {
        const B = L.barge; if (!B) return;
        const rec = W.recoil, bob = Math.sin(t * 1.3) * 1.5 * (1 - W.calm * 0.6), sh = RED ? 0 : W.shake;
        g.save(); g.translate((rnd() - 0.5) * sh * 3, bob + (rnd() - 0.5) * sh * 2);
        // rack tubes for the grand finale
        if (W.rack > 0.01) {
          for (const tb of G.tubes) {
            const hh = tb.h * W.rack, x = tb.x, y = G.by - 2;
            g.save(); g.translate(x, y); g.rotate(tb.lean);
            g.fillStyle = '#3a374a'; g.fillRect(-6, -hh, 12, hh);
            g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-2, -hh, 3, hh);
            g.fillStyle = '#c4c0d8'; g.fillRect(-7, -hh - 2, 14, 3);
            if (tb.fl > 0.02) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = tb.fl; g.drawImage(FLS[tb.c || 2], -26, -hh - 26, 52, 52); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; tb.fl *= 0.86; }
            g.restore();
          }
        }
        g.drawImage(B.s.c, B.x, B.y + rec * 3, B.s.w, B.s.h);
        if (G.led) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 + 0.65 * W.pulse; g.drawImage(SPR[phase === 'launch' || phase === 'grand' ? PI.heard[0] : PI.who[0]], B.x + G.led.x - 5, B.y + G.led.y - 5, 10, 10); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        // bulbs along the rail, pulsing with the beat
        const n = Math.floor(B.bw / 16), x0 = G.bx - B.bw / 2 + 8, y = G.by - 12;
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < n; i++) { const c = i % 3 === 0 ? 2 : i % 3 === 1 ? PI.who[0] : PI.heard[0]; g.globalAlpha = 0.45 + 0.4 * W.pulse * (i % 2 ? 1 : 0.6) + 0.12 * Math.sin(t * 2 + i); g.drawImage(SPR[c], x0 + i * 16 - 5, y - 5, 10, 10); }
        // the loaded mortar glows with its sense; the hot spot glows when a can hovers over it
        const m = G.mouth;
        const glow = Math.max(W.load * (0.55 + 0.25 * Math.sin(t * 5)), W.hot * 0.8, rec);
        if (glow > 0.02) { g.globalAlpha = Math.min(1, glow); const r = 46 + rec * 30; g.drawImage(FLS[W.loadC], m.x - r, m.y - r, r * 2, r * 2); }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        if (phase === 'launch') { // a chevron of light invites the swipe
          const k = (now % 1100) / 1100;
          g.globalCompositeOperation = 'lighter';
          for (let j = 0; j < 3; j++) { const kk = (k + j / 3) % 1, yy = m.y - 22 - kk * 60; g.globalAlpha = Math.sin(kk * Math.PI) * 0.85; g.strokeStyle = PAL[W.loadC]; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(m.x - 10, yy + 7); g.lineTo(m.x, yy); g.lineTo(m.x + 10, yy + 7); g.stroke(); }
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        }
        g.restore();
      }
      function drawRing(g, now) {
        const R1 = G.ring, nb = beatAfter(now), sp = BEAT.spb * 1000, k = K.clamp(1 - (nb.ms - now) / sp, 0, 1), a = W.ringOn;
        g.save(); g.globalCompositeOperation = 'lighter';
        g.lineWidth = 3; g.strokeStyle = '#ffd36b'; g.globalAlpha = a * (0.35 + 0.4 * W.pulse);
        g.beginPath(); g.arc(R1.x, R1.y, R1.r, 0, TAU); g.stroke();
        g.strokeStyle = nb.b === 0 ? '#ff86bb' : '#84ecff'; g.lineWidth = 2 + k * 3; g.globalAlpha = a * (0.15 + 0.75 * k);
        g.beginPath(); g.arc(R1.x, R1.y, R1.r * (1 + (1 - k) * 0.85), 0, TAU); g.stroke();
        g.restore();
      }
      function drawCrowd(g, t, D) {
        const col = D ? '#04050d' : '#121436', rim = W.lastCol, lit = Math.min(1, W.lit);
        for (const p of crowd) {
          p.arm += (p.armT - p.arm) * 0.08;
          const s = p.s, bob = (Math.sin(t * 7 + p.ph) * 0.5 + 0.5) * W.cheer * 3 + W.pulse * 1.2 * W.cheer, x = p.x, y = p.y - bob;
          g.fillStyle = col;
          if (p.arm > 0.05) {
            g.strokeStyle = col; g.lineWidth = 4.2 * s; g.lineCap = 'round';
            const ax = x + p.side * 9 * s, ay = y + 9 * s, hx2 = x + p.side * (12 + 3 * Math.sin(t * 5 + p.ph)) * s, hy2 = y + 9 * s - 26 * s * p.arm;
            g.beginPath(); g.moveTo(ax, ay); g.lineTo(hx2, hy2); g.stroke();
            if (W.cheer > 0.5 && !p.phone) { g.beginPath(); g.moveTo(x - p.side * 9 * s, ay); g.lineTo(x - p.side * 13 * s, y + 9 * s - 24 * s * p.arm); g.stroke(); }
            if (p.phone) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55 * p.arm; g.drawImage(SOFT, hx2 - 9, hy2 - 13, 18, 18); g.globalAlpha = 0.9 * p.arm; g.fillStyle = '#cfe0ff'; g.fillRect(hx2 - 1.6 * s, hy2 - 6.5 * s, 3.2 * s, 5.4 * s); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.fillStyle = col; }
          }
          g.beginPath(); g.moveTo(x - 15 * s, y + 34 * s); g.quadraticCurveTo(x - 15 * s, y + 7 * s, x, y + 6 * s); g.quadraticCurveTo(x + 15 * s, y + 7 * s, x + 15 * s, y + 34 * s); g.closePath(); g.fill();
          g.beginPath(); g.arc(x, y - 3 * s, 7.6 * s, 0, TAU); g.fill();
          if (p.hair < 0.25) { g.beginPath(); g.arc(x + 4 * s, y - 9 * s, 3.6 * s, 0, TAU); g.fill(); }
          if (lit > 0.08) { g.strokeStyle = rim; g.globalAlpha = lit * 0.55; g.lineWidth = 1.3; g.beginPath(); g.arc(x, y - 3 * s, 7.6 * s, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); g.globalAlpha = 1; }
        }
      }

      /* ---------------- frame loop ---------------- */
      let phase = 'intro', drawn = 0, qAcc = 0, qN = 0, half = 0, acc = 0, quality = 1;
      K.loop((dtIn, t) => {
        const g = cv.g; if (!g || !L.bg || !FX.g) return;
        const now = performance.now();
        beatTick(now);
        if (phase === 'intro' && drawn > 2) return;
        if (dtIn < 0.25) { qAcc += dtIn; qN++; if (qN >= 90) { const avg = qAcc / qN; if (avg > 0.026) Q = Math.max(0.5, Q * 0.82); if (avg > 0.07 && quality > 0.8) { quality = 0.8; cv.setQuality(quality); } qAcc = 0; qN = 0; } }
        // while the sky is empty only twinkles and bulbs move: paint every other frame
        acc += dtIn;
        if (!NS && !comets.length && W.idle >= 1.5 && !dragCan && (half ^= 1)) return;
        const dt = Math.min(0.06, acc); acc = 0;
        for (let i = events.length - 1; i >= 0; i--) if (now >= events[i].at) { const e = events.splice(i, 1)[0]; try { e.fn(); } catch (err) { console.error(err); } }
        W.pulse *= Math.exp(-dt * 6); W.recoil *= Math.exp(-dt * 9); W.lit *= Math.exp(-dt * 1.4); W.shake *= Math.exp(-dt * 11); W.hot += ((dragCan ? dragHot : 0) - W.hot) * Math.min(1, dt * 10);
        W.calm += (W.calmT - W.calm) * Math.min(1, dt * 0.8); W.rack += (W.rackT - W.rack) * Math.min(1, dt * 3); W.ringOn += (W.ringT - W.ringOn) * Math.min(1, dt * 4); W.cheer += (W.cheerT - W.cheer) * Math.min(1, dt * 2);
        for (let i = puffs.length - 1; i >= 0; i--) {
          const p = puffs[i]; p.age += dt * (1 + W.calm * 3); p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 3;
          p.a = p.top * Math.min(1, p.age / 0.8) * Math.max(0, 1 - p.age / p.life) * (1 - W.calm);
          if (p.age >= p.life) puffs.splice(i, 1);
        }
        // the trail canvas: fade what was there, then draw this frame's sparks on top
        const fx = FX.g;
        if (NS || comets.length) {
          W.idle = 0;
          fx.globalCompositeOperation = 'destination-out'; fx.globalAlpha = 1;
          fx.fillStyle = 'rgba(0,0,0,' + (1 - Math.pow(1 - W.fade, dt * 60)).toFixed(3) + ')'; fx.fillRect(0, 0, G.w, G.H);
          fx.globalCompositeOperation = 'lighter';
          stepStars(fx, dt); stepComets(fx, dt, now);
          fx.globalCompositeOperation = 'source-over';
        } else if (W.idle < 1.5) {
          W.idle += dt;
          fx.globalCompositeOperation = 'destination-out'; fx.fillStyle = 'rgba(0,0,0,0.25)'; fx.fillRect(0, 0, G.w, G.H); fx.globalCompositeOperation = 'source-over';
          if (W.idle >= 1.5) fx.clearRect(0, 0, G.w, G.H);
        }
        draw(g, dt, t, now);
        drawn++;
      });
      function beatTick(now) {
        const audio = !!(A.ctx && BEAT.list.length);
        if (audio !== BEAT.mode) { BEAT.mode = audio; BEAT.shown = -1e9; }
        if (audio) { for (const b of BEAT.list) if (b.ms <= now && b.i > BEAT.shown) { BEAT.shown = b.i; visBeat(b.i, b.b); } }
        else { const k = Math.floor((now - BEAT.virt0) / (BEAT.spb * 1000)); if (k > BEAT.shown) { BEAT.shown = k; visBeat(k, ((k % 4) + 4) % 4); } }
      }
      function visBeat(i, b) {
        W.pulse = b === 0 ? 1 : 0.65;
        if (phase === 'grand' || phase === 'grand-end') Array.from(beatsEl.children).forEach((x, k) => x.classList.toggle('on', k === b));
      }

      /* ---------------- the flow ---------------- */
      const built = [];
      let cur = null, dragCan = null, dragHot = 0, lastDragEnd = 0, ticket = null, momentText = '', momentUser = false, finished = false;
      let shots = 0, onBeat = 0, combo = 0, bestCombo = 0, kamuro = false, ownPick = false;

      function showMoment() {
        phase = 'moment';
        const items = own.map(l => ({ label: l, user: true })).concat(generic.slice(0, (G.phone ? 4 : 6) - own.length).map(l => ({ label: l, user: false })));
        const chips = h('div', { class: 'jf-chips', role: 'group', 'aria-label': 'Good moments' });
        const cols = ['#ffd25e', '#ff6fae', '#6fe9ff', '#b69cff', '#ffb24a', '#9df0b4'];
        items.forEach((it, i) => {
          const b = h('button', { type: 'button', class: 'jf-chip' + (it.user ? ' gk-user' : ''), style: { '--c': cols[i % cols.length] }, text: it.label });
          S.listen(b, 'pointerdown', () => { if (A.ctx) A.click({ vol: 0.08 }); });
          b.addEventListener('click', () => pickMoment(it, b));
          chips.append(b);
        });
        ticket = h('div', { class: 'jf-ticket', role: 'dialog', 'aria-label': 'Tonight’s show' },
          h('span', { class: 'jf-tk-kicker', text: 'Tonight at ' + V.label }),
          h('h2', { class: 'jf-tk-title', text: own.length ? 'Pick tonight’s headliner' : 'One good moment' }),
          h('p', { class: 'jf-tk-sub', text: own.length ? 'In your words, or another small good thing.' : 'From today, even a tiny one. It becomes the whole show.' }),
          chips);
        el.append(ticket);
        const open = care
          ? { Jolly: 'That sounds like a lot to carry. This won’t fix it, and you don’t have to pretend it’s fine. Two minutes for one small good thing?', Cheeky: 'Heavy stuff, and it’s real. No pretending here. Want two minutes with one small good thing?', Unfiltered: 'That’s real, and it stays real. Two minutes for one small good thing, if you want.' }
          : own.length ? { Jolly: 'Ooh, something good happened. Let’s not rush past it. Pick tonight’s headliner.', Cheeky: 'Good news? You don’t get to scroll past it. Pick the headliner.', Unfiltered: 'Something good happened. Make it bigger. Pick one.' }
            : noWords ? { Jolly: 'No words needed. Pick one small good thing from today, even a tiny one.', Cheeky: 'Tiny good things count. Pick one and I’ll make it massive.', Unfiltered: 'Pick one small good thing from today.' }
              : { Jolly: 'What you wrote can wait in the wings. For two minutes, pick one small good thing from today.', Cheeky: 'The rest can wait in the wings. Pick one small good thing, I’ll make it huge.', Unfiltered: 'The rest can wait two minutes. Pick one small good thing from today.' };
        sync.say(line(open), { ms: 5200 });
        K.guide({ id: 'moment', g: 'choose', target: () => Array.from(chips.children), label: 'PICK A GOOD MOMENT', place: 'below', delay: 1300 });
      }
      function pickMoment(it, b) {
        if (phase !== 'moment') return;
        phase = 'picked';
        K.guide(null);
        b.classList.add('jf-picked');
        momentText = it.label; momentUser = !!it.user; ownPick = momentUser;
        momentEl.textContent = it.label; momentEl.classList.toggle('gk-user', momentUser);
        ctx.track('moment', { own: momentUser ? 1 : 0 });
        K.sfx.great();
        const r = K.rectIn(b, el); P.emit('star', r.cx, r.cy, 14, { colors: ['#fff6d0', '#ffd36b', '#ff86bb'] });
        sync.face('E62', 1600);
        K.later(() => { ticket.classList.add('jf-out'); K.later(() => ticket && ticket.remove(), 450); }, 380);
        K.later(() => {
          tray.classList.remove('jf-away'); drop.show(true); loopie.show(true); drop.react('bounce'); loopie.react('bounce');
          sync.say(line({ Jolly: 'Lovely. Now zoom in: every detail you remember becomes a shell.', Cheeky: 'Headliner booked. Now feed me details. Each one’s a shell.', Unfiltered: 'Details make it bigger. Each one is a shell.' }), { ms: 3800 });
          startRound();
        }, 700);
      }
      function startRound() {
        phase = 'cans'; cur = null;
        setMode('cans'); pad.hidden = true;
        const next = cans.find(c => !c.el.classList.contains('jf-used')) || cans[0];
        // the tray may still be sliding in: read the can's resting place once it has landed
        K.later(() => { if (phase === 'cans') guideCan(next, built.length ? 300 : 900); }, built.length ? 500 : 820);
      }
      function guideCan(c, delay) {
        const r = K.rectIn(c.el, el);
        K.guide({ id: 'can-' + built.length, g: 'drag', target: c.el, ox: 0.5, oy: 0.36, dx: G.mouth.x - r.cx, dy: G.mouth.y - (r.y + r.h * 0.36), ms: 1700, label: built.length ? 'ANOTHER SENSE IN' : 'DRAG A SENSE IN', delay });
      }
      /* drag a can of star powder into the mortar */
      cans.forEach(c => {
        let ghost = null, sx = 0, sy = 0;
        K.drag(c.el, {
          space: el,
          start: (p) => {
            if (phase !== 'cans') return false;
            dragCan = c; sx = p.x; sy = p.y; c.t0 = performance.now();
            ghost = h('div', { class: 'jf-ghost', style: { '--c': c.s.c[0] } }, c.art.cloneNode(true));
            el.append(ghost); c.el.classList.add('jf-lift');
            ghost.style.transform = `translate(${p.x}px, ${p.y}px) scale(1.12)`;
            SND.lift(); sync.face('think', 900);
            P.emit('spark', p.x, p.y - 30, 6, { colors: [c.s.c[0], c.s.c[1]], speed: [30, 90] });
          },
          move: (p, d) => {
            if (!ghost) return;
            const tilt = K.clamp(d.vx / 60, -18, 18), dist = Math.hypot(p.x - G.mouth.x, p.y - (G.mouth.y - 10));
            dragHot = dist < 120 ? 1 - dist / 120 : 0; W.loadC = PI[c.s.id][0];
            ghost.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${tilt.toFixed(1)}deg) scale(${(1.12 + dragHot * 0.12).toFixed(3)})`;
            if (rnd() < 0.5) P.emit('spark', p.x, p.y - 34, 1, { colors: [c.s.c[0], c.s.c[1]], speed: [10, 40], angle: Math.PI / 2, spread: 1.2 });
          },
          end: (p) => {
            if (!ghost) return;
            lastDragEnd = performance.now();
            const g0 = ghost; ghost = null; dragCan = null;
            const tapped = Math.hypot(p.x - sx, p.y - sy) < 9 && performance.now() - c.t0 < 380; // a quick tap pours too
            const ok = tapped || Math.hypot(p.x - G.mouth.x, p.y - (G.mouth.y - 10)) < 120 || (p.y < sy - 70 && Math.abs(p.x - G.bx) < 150);
            if (ok) pour(c, g0, p);
            else {
              SND.back(); dragHot = 0;
              const r = K.rectIn(c.art, el), x0 = p.x, y0 = p.y, tx = r.cx, ty = r.y + 36;
              K.anim(RED ? 100 : 320, (k) => { const e = K.ease.outBack(k); g0.style.transform = `translate(${x0 + (tx - x0) * e}px, ${y0 + (ty - y0) * e}px) scale(${1.12 - 0.12 * k})`; }).then(() => { g0.remove(); c.el.classList.remove('jf-lift'); });
              sync.say(line({ Jolly: 'Almost! Drop it right into the mortar on the barge.', Cheeky: 'The mortar’s the big tube. On the boat. You’ve got this.', Unfiltered: 'Into the mortar. On the barge.' }), { ms: 2600 });
              guideCan(c, 1200);
            }
          }
        });
        c.el.addEventListener('click', () => { // keyboard and switch access: pour without dragging
          if (phase !== 'cans' || performance.now() - lastDragEnd < 500) return;
          const r = K.rectIn(c.art, el), g0 = h('div', { class: 'jf-ghost', style: { '--c': c.s.c[0] } }, c.art.cloneNode(true));
          el.append(g0); c.el.classList.add('jf-lift'); pour(c, g0, { x: r.cx, y: r.y + 36 });
        });
      });
      async function pour(c, ghost, p) {
        phase = 'pour'; K.guide(null); dragHot = 0;
        const m = G.mouth, x0 = p.x, y0 = p.y, tx = m.x + 22, ty = m.y - 34;
        await K.anim(RED ? 120 : 280, (k) => { const e = K.ease.outCubic(k); ghost.style.transform = `translate(${x0 + (tx - x0) * e}px, ${y0 + (ty - y0) * e}px) rotate(${-125 * e}deg) scale(1.1)`; });
        SND.pour(chordAt(BEAT.shown)[0]);
        W.loadC = PI[c.s.id][0];
        for (let i = 0; i < 9; i++) K.later(() => { P.emit('spark', m.x + 8, m.y - 24, 3, { colors: [c.s.c[0], c.s.c[1], '#fff'], angle: Math.PI / 2 + 0.45, spread: 0.5, speed: [40, 100] }); W.load = Math.min(1, W.load + 0.12); }, i * 45);
        drop.face(c.s.id === 'who' ? 'love' : 'wow', 1300); loopie.face('wow', 1300);
        await K.sleep(RED ? 120 : 430);
        await K.anim(RED ? 80 : 220, (k) => { ghost.style.opacity = String(1 - k); ghost.style.transform = `translate(${tx}px, ${ty - 14 * k}px) rotate(${-125 + 125 * k}deg) scale(${1.1 - 0.4 * k})`; });
        ghost.remove(); c.el.classList.remove('jf-lift'); c.el.classList.add('jf-used');
        W.load = 1;
        showDetail(c.s);
      }
      function showDetail(s) {
        phase = 'detail'; cur = { s };
        askEl.textContent = ''; askEl.style.setProperty('--c', s.c[0]);
        askEl.append(h('b', { text: s.name }), document.createTextNode('  ·  ' + s.q));
        detailWrap.textContent = '';
        details[s.id].forEach((txt) => {
          const b = h('button', { type: 'button', class: 'jf-chip', style: { '--c': s.c[0] }, text: txt });
          S.listen(b, 'pointerdown', () => { if (A.ctx) A.click({ vol: 0.08 }); });
          b.addEventListener('click', () => pickDetail(txt, b));
          detailWrap.append(b);
        });
        setMode('detail');
        sync.say(line(s.ask), { ms: 3600 });
        K.guide({ id: 'detail-' + built.length, g: 'choose', target: () => Array.from(detailWrap.children), label: 'PICK ONE DETAIL', delay: 1000 });
      }
      function pickDetail(txt, b) {
        if (phase !== 'detail' || !cur) return;
        phase = 'seal'; K.guide(null);
        b.classList.add('jf-picked');
        cur.detail = txt;
        const r = K.rectIn(b, el), fly = h('div', { class: 'jf-fly', text: txt, style: { '--c': cur.s.c[0] } });
        el.append(fly);
        const fx0 = r.x, fy0 = r.y, m = G.mouth, fw = r.w;
        fly.style.transform = `translate(${fx0}px, ${fy0}px)`;
        K.anim(RED ? 140 : 520, (k) => { const e = K.ease.inOutCubic(k), x = fx0 + (m.x - fw / 2 - fx0) * e, y = fy0 + (m.y - 20 - fy0) * e - Math.sin(k * Math.PI) * 50; fly.style.transform = `translate(${x}px, ${y}px) scale(${1 - 0.7 * k})`; fly.style.opacity = String(k > 0.8 ? (1 - k) / 0.2 : 1); }).then(() => {
          fly.remove();
          SND.seal(chordAt(BEAT.shown)[1]);
          W.recoil = 0.6; W.load = 1;
          P.emit('star', m.x, m.y - 6, 10, { colors: [cur.s.c[0], '#fff'], speed: [40, 120] });
          readyLaunch();
        });
      }
      function readyLaunch() {
        phase = 'launch'; setMode('launch'); pad.hidden = false;
        loadedEl.textContent = ''; loadedEl.style.setProperty('--c', cur.s.c[0]);
        loadedEl.append(h('small', { text: cur.s.name }), document.createTextNode(cur.detail));
        K.guide({ id: 'launch-' + built.length, g: 'drag', dir: 'u', d: 130, target: () => ({ x: G.mouth.x, y: G.mouth.y + 10 }), label: 'SWIPE UP TO LAUNCH', ms: 1300, delay: 600 });
      }
      K.drag(pad, {
        space: el,
        start: () => { if (phase !== 'launch') return false; W.recoil = Math.max(W.recoil, 0.25); if (A.ctx) A.noise({ filter: 'highpass', freq: 4000, dur: 0.12, vol: 0.04 }); },
        move: (p, d) => { if (phase === 'launch' && d.dy < -70) launch(Math.max(-d.dy / 230, -d.vy / 1700), d.dx); },
        end: (p, d) => { if (phase === 'launch') launch(Math.max(0.55, Math.max(-d.dy / 230, -d.vy / 1700)), d.dx); }
      });
      K.onKey(['Space', 'ArrowUp', 'Enter'], (e) => {
        const ae = document.activeElement;
        if (ae && ae.tagName === 'BUTTON' && el.contains(ae)) return; // a focused button answers with its own click
        if (phase === 'launch') { e.preventDefault(); A.unlock(); launch(0.8, 0); } else if (phase === 'grand' && !e.repeat) { e.preventDefault(); A.unlock(); fire(performance.now()); }
      });
      function launch(power, dx) {
        if (phase !== 'launch' || !cur) return;
        phase = 'flight'; K.guide(null); pad.hidden = true; setMode('wait');
        const p = K.clamp(power, 0.3, 1), s = cur.s, i = built.length;
        const y1 = G.band.bot + (G.band.top - G.band.bot) * p + (rnd() - 0.5) * 20;
        const baseX = [0.5, 0.3, 0.7, 0.42, 0.6][i % 5] * G.w;
        const x1 = K.clamp(baseX + K.clamp(dx / 150, -1, 1) * G.w * 0.16, G.w * 0.16, G.w * 0.84);
        const sz = 0.95 + p * 0.12;
        W.recoil = 1; W.load = 0; W.shake = 1;
        SND.thump(1);
        P.emit('spark', G.mouth.x, G.mouth.y - 4, 16, { colors: ['#fff6d0', s.c[0], '#ffb347'], angle: -Math.PI / 2, spread: 0.9, speed: [80, 220] });
        P.emit('smoke', G.mouth.x, G.mouth.y - 6, 4, { speed: [10, 30], angle: -Math.PI / 2, spread: 1, colors: ['rgba(200,200,220,0.2)'] });
        sync.face('wow', 1200);
        const shell = { sense: s, detail: cur.detail, type: s.shell, pal: PI[s.id], x: x1, y: y1, sz };
        built.push(shell);
        dotsEl.children[i].classList.add('on'); dotsEl.children[i].style.setProperty('--c', s.c[0]);
        ctx.track('shell', { n: built.length, type: s.id });
        const res = launchShell({ from: { x: G.mouth.x, y: G.mouth.y }, to: { x: x1, y: y1 }, type: s.shell, sz, pal: PI[s.id], word: cur.detail, delay: 0.18 + rnd() * 0.16, whistle: s.id === 'who' || s.id === 'why', minRise: 1, react: () => reactShell(shell) });
        K.later(() => { if (built.length >= N) twist(); else startRound(); }, res.flashAt - performance.now() + (built.length >= N ? 2200 : 1600));
      }
      function reactShell(sh) {
        const id = sh.sense.id;
        SND.ooh(0.6 + built.length * 0.12);
        crowd.forEach(p => { p.armT = rnd() < 0.25 ? 0.6 + rnd() * 0.4 : 0; }); W.cheerT = 0.4; K.later(() => { if (phase !== 'clear' && phase !== 'replay' && phase !== 'end') { crowd.forEach(p => { p.armT = 0; }); W.cheerT = 0; } }, 1600);
        if (id === 'who') { drop.face('love', 2200); loopie.face('love', 2000); }
        else if (id === 'heard') { loopie.face('dizzy', 2000); drop.face('laugh', 2000); loopie.react('spin'); }
        else if (id === 'felt') { drop.face('calm', 2400); loopie.face('calm', 2400); }
        else if (id === 'why') { loopie.face('idea', 2000); drop.face('love', 2000); }
        else { drop.face('wow', 2000); loopie.face('wow', 2000); drop.react('bounce'); }
        sync.face(['E20', 'E62', 'E61', 'E59'][built.length % 4], 1800);
        const solo = sh.detail === 'Just me';
        const L2 = {
          heart: solo ? { Jolly: 'A heart for you. You were there too.', Cheeky: 'Party of one. Still gets a heart.', Unfiltered: 'Just you. Still counts.' } : { Jolly: 'There it is. A whole heart for them.', Cheeky: 'A heart-shaped firework. Subtle, us.', Unfiltered: 'A heart. Good.' },
          peony: { Jolly: 'Look at it bloom. Hold that picture.', Cheeky: 'Big, round, golden. Showing off.', Unfiltered: 'Hold that picture.' },
          crossette: { Jolly: 'Hear that crackle? Play your sound back with it.', Cheeky: 'Crackles like it knows the gossip.', Unfiltered: 'Listen to it crack.' },
          willow: { Jolly: 'Watch it drip down slowly. Let that feeling linger.', Cheeky: 'The willow. Refuses to leave the party.', Unfiltered: 'Slow. Let it hang there.' },
          ring: { Jolly: 'A ring for why it mattered. That part counts most.', Cheeky: 'A perfect ring. Meaningful and symmetrical.', Unfiltered: 'That’s the reason. Keep it.' }
        };
        if (built.length === 1 || built.length === N || rnd() < 0.6) sync.say(line(L2[sh.type]), { ms: 2800 });
      }

      /* ---------------- twist: the grand finale, played on the beat ---------------- */
      function twist() {
        if (phase === 'twist' || finished) return;
        phase = 'twist'; K.guide(null);
        setMode('grand'); countEl.textContent = '0 / ' + TAPS;
        sync.base('E72');
        sync.say(line({ Jolly: 'That’s the show… psych! Grand finale. Tap on the beat and the shells get bigger.', Cheeky: 'Did you think that was it? Grand finale. Hit the beat, get the big ones.', Unfiltered: 'Grand finale. Tap on the beat. On the beat goes bigger.' }), { ms: 4200 });
        music.tempo(BPM_GRAND); music.level(1);
        BEAT.drums = 0.6; K.later(() => { BEAT.drums = 1; }, 1800);
        W.rackT = 1; W.fade = 0.12;
        if (A.ctx) { A.tone({ type: 'sawtooth', freq: 110, to: 440, glide: 1.4, dur: 1.5, vol: 0.04, lp: 1600, attack: 0.3 }); A.noise({ filter: 'bandpass', freq: 600, to: 4000, q: 0.8, dur: 1.5, attack: 1.2, vol: 0.06 }); }
        drop.face('celebrate', 2400); loopie.face('celebrate', 2400);
        K.later(() => {
          if (finished) return;
          phase = 'grand'; zone.hidden = false; fireBtn.hidden = false; W.ringT = 1;
          K.guide({ id: 'grand', g: 'tap', target: fireBtn, label: 'TAP ON THE BEAT', delay: 300, ms: 900 });
        }, 2300);
      }
      const onFire = (e) => { if (phase !== 'grand') return; if (e && e.preventDefault) e.preventDefault(); fire(e && e.timeStamp ? e.timeStamp : performance.now()); };
      K.tap(fireBtn, onFire); K.tap(zone, onFire);
      function fire(ms) {
        if (phase !== 'grand' || shots >= TAPS) return;
        const nb = beatAfter(ms), sp = BEAT.spb * 1000, d = Math.min(Math.abs(nb.ms - ms), Math.abs(ms - (nb.ms - sp)));
        const on = d <= WIN, perfect = d <= WIN * 0.45;
        shots++;
        if (on) { onBeat++; combo++; bestCombo = Math.max(bestCombo, combo); } else combo = 0;
        countEl.textContent = shots + ' / ' + TAPS;
        const tb = G.tubes[[2, 3, 1, 4, 0, 5][shots % 6]];
        const lvl = on ? Math.min(combo, 10) : 0;
        let type, pal;
        const mine = built[(shots - 1) % built.length];
        if (!on) { type = 'small'; pal = mine.pal; }
        else if (combo >= KAMURO_AT) { type = 'kamuro'; pal = KAM; if (!kamuro) { kamuro = true; K.later(() => { pop('GOLD KAMURO!', G.ring.x, G.ring.y - G.ring.r - 50, '#ffcf6b'); sync.say(line({ Jolly: 'A gold crown shell! You earned that one.', Cheeky: 'A gold Kamuro. Fancy. Very fancy.', Unfiltered: 'Kamuro. Earned.' }), { ms: 2600 }); }, 200); } }
        else if (combo >= 4) { type = rnd() < 0.5 ? 'palm' : 'chrys'; pal = mine.pal; }
        else { type = mine.type; pal = mine.pal; }
        const sz = on ? 0.82 + lvl * 0.07 + (perfect ? 0.06 : 0) : 0.6;
        const side = shots % 2 ? -1 : 1, spread = 0.12 + Math.min(0.32, shots * 0.03);
        const x1 = K.clamp(G.w * (0.5 + side * spread * (0.4 + rnd() * 0.6)), G.w * 0.12, G.w * 0.88);
        const climb = on ? 0.3 + 0.6 * Math.min(1, lvl / 7) : 0.12, y1 = K.clamp(G.band.bot + (G.band.top - G.band.bot) * (climb + (rnd() - 0.5) * 0.25), G.band.top - 20, G.band.bot);
        tb.fl = 1; tb.c = pal[0];
        W.recoil = Math.max(W.recoil, 0.5); W.shake = 0.6;
        SND.thump(on ? 1 : 0.7);
        const from = { x: tb.x + Math.sin(tb.lean) * tb.h, y: G.by - 2 - Math.cos(tb.lean) * tb.h };
        P.emit('spark', from.x, from.y, on ? 12 : 6, { colors: ['#fff6d0', PAL[pal[0]]], angle: -Math.PI / 2 + tb.lean, spread: 0.8, speed: [80, 200] });
        launchShell({ from, to: { x: x1, y: y1 }, type, sz, pal, delay: 0.08 + rnd() * 0.1, minRise: 0.5, whistle: on && combo % 3 === 0, chime: on });
        if (on && combo >= 4 && combo % 2 === 0 && type !== 'kamuro') { const tb2 = G.tubes[[3, 2, 4, 1, 5, 0][shots % 6]]; tb2.fl = 1; tb2.c = pal[1]; launchShell({ from: { x: tb2.x, y: G.by - 30 }, to: { x: G.w - x1, y: y1 - 30 }, type: built[shots % built.length].type, sz: sz * 0.85, pal: built[shots % built.length].pal, delay: 0.12, minRise: 0.6, chime: false }); }
        if (on) { pop(perfect ? (combo >= 3 ? 'ON THE BEAT ×' + combo : 'ON THE BEAT!') : (combo >= 3 ? 'BIGGER ×' + combo : 'BIGGER!'), G.ring.x + (rnd() - 0.5) * 60, G.ring.y - G.ring.r - 24, perfect ? '#ffd36b' : '#84ecff'); }
        else pop('NICE', G.ring.x + (rnd() - 0.5) * 50, G.ring.y - G.ring.r - 20, '#d9d2ff');
        if (combo === 3) sync.say(line({ Jolly: 'You’re in the groove!', Cheeky: 'Okay, show-off.', Unfiltered: 'Locked in.' }), { ms: 1600 });
        sync.face(on ? (combo >= 3 ? 'E62' : 'E20') : 'happy', 700);
        if (on && combo >= 2) { drop.face('celebrate', 900); loopie.face('celebrate', 900); }
        crowd.forEach(p2 => { if (rnd() < 0.18) p2.armT = 0.8; else if (rnd() < 0.3) p2.armT = 0; }); W.cheerT = Math.min(1, 0.2 + onBeat / TAPS);
        ctx.track('fire', { on: on ? 1 : 0, combo });
        if (shots >= TAPS) {
          phase = 'grand-end'; K.guide(null); fireBtn.hidden = true; zone.hidden = true;
          K.later(mother, 1500);
        }
      }

      /* ---------------- finale: the whole moment, the smoke clears, the replay ---------------- */
      async function mother() {
        if (finished || phase === 'mother') return;
        phase = 'mother'; W.ringT = 0; W.rackT = 0.4;
        BEAT.drums = 0.25; music.level(0.6);
        sync.base('E61');
        sync.say(line({ Jolly: 'And the last one is the whole moment.', Cheeky: 'Saved the biggest for last. Obviously.', Unfiltered: 'Last one. The whole moment.' }), { ms: 3400 });
        // aim the big one at a downbeat
        let bt = beatAfter(performance.now() + 1600);
        for (let g2 = 0; g2 < 6 && bt.b !== 0; g2++) bt = beatAfter(bt.ms + 20);
        const mainPal = built[0] ? built[0].pal : PI.saw, x = G.w / 2, y = Math.round((G.band.top + G.band.bot) / 2) - 20;
        const lead = Math.max(1100, bt.ms - performance.now() - 120);
        W.recoil = 1; W.shake = 1; SND.thump(1.2); SND.whistle(lead / 1000);
        P.emit('spark', G.mouth.x, G.mouth.y, 22, { colors: ['#fff6d0', '#ffd36b'], angle: -Math.PI / 2, spread: 0.8, speed: [100, 260] });
        comets.push({ from: { x: G.mouth.x, y: G.mouth.y }, to: { x, y }, t0: performance.now(), dur: lead, type: 'peony', sz: 1.8, pal: mainPal, word: momentText, user: momentUser, big: true, hang: 1.15,
          react: () => {
            SHELL.ring(x, y, 1.35, PI.why, Q);
            at(performance.now() + 260, () => burst({ type: 'heart', x, y: y + 6, sz: 0.95, pal: PI.who }));
            at(performance.now() + 620, () => burst({ type: 'kamuro', x, y: y - 10, sz: 1.5, pal: KAM }));
            SND.roar(); SND.applause(3.2, 1.1); BEAT.drums = 1; music.level(0.95);
            crowd.forEach(p => { p.armT = 0.6 + rnd() * 0.4; }); W.cheerT = 1;
            drop.face('celebrate'); loopie.face('celebrate'); drop.react('bounce'); loopie.react('bounce');
          } });
        const when = bt.t != null ? bt.t : audioAt(bt.ms);
        SND.boom(when, 2, 0.2); SND.boom(when + 0.26, 1.1, 0.3); SND.boom(when + 0.62, 1.4, 0.4); SND.sparkle(when, bt.i, 4);
        K.later(clear, lead + 3000);
      }
      function clear() {
        if (finished) return;
        phase = 'clear';
        W.calmT = 1; W.fade = 0.09;
        tray.classList.add('jf-away');
        sync.say(line({ Jolly: 'Listen to them! That was all one good moment.', Cheeky: 'Standing ovation, for a moment you nearly scrolled past.', Unfiltered: 'That’s what a good moment looks like up close.' }), { ms: 3600 });
        if (visits >= 2) { const patch = K.character('patch', { side: 'above', mood: 'celebrate', size: G.phone ? 48 : 62, decor: true, x: G.phone ? G.w - 62 : G.w - 120, y: G.H - (G.phone ? 118 : 140) }); patch.react('bounce'); }
        W.ashore = true; placeCameos(900);
        SND.applause(2.6, 0.8);
        K.later(replay, 3000);
      }
      function replay() {
        if (finished) return;
        phase = 'replay'; music.level(0.85); music.tempo(84); BEAT.drums = 0.55;
        sync.say(line({ Jolly: 'Here’s your show, one more time.', Cheeky: 'Encore! The director’s cut.', Unfiltered: 'Your show, again.' }), { ms: 3000 });
        const n = built.length, sp = BEAT.spb * 1000;
        built.forEach((b, i) => {
          K.later(() => {
            if (finished) return;
            const fx2 = n === 1 ? 0.5 : i / (n - 1), x = G.w * (0.2 + 0.6 * fx2), y = G.band.top + 10 + (i % 2) * (G.band.bot - G.band.top) * 0.5;
            W.recoil = 0.7; SND.thump(0.8);
            launchShell({ from: { x: G.mouth.x, y: G.mouth.y }, to: { x, y }, type: b.type, sz: G.phone ? 0.92 : 1, pal: b.pal, word: b.detail, delay: 0.12, minRise: 0.8, hang: 1.6, hold: true, react: () => { SND.ooh(1); } });
          }, i * sp * 1.05);
        });
        K.later(end, n * sp * 1.05 + 3600);
      }
      function end() {
        if (finished) return;
        phase = 'end';
        const total = built.length + TAPS + 1;
        const badges = [];
        const pb = K.best('combo', bestCombo, 'higher');
        if (pb.isNew) badges.push('New best: ' + bestCombo + ' on the beat in a row');
        else if (pb.first && bestCombo > 1) badges.push('First show: ' + bestCombo + ' on the beat in a row');
        const tier = K.tier(onBeat / TAPS);
        if (tier) badges.push(tier + ': in sync with the band');
        const names = Array.from(new Set(built.map(b => b.sense.name))).concat(kamuro ? ['Kamuro'] : []);
        const fresh = []; let count = 0;
        names.forEach(nm => { const c = K.collect(nm); if (c.isNew) fresh.push(nm); count = c.count; });
        badges.push(fresh.length ? 'Collected: ' + fresh.join(', ') + ' (' + count + ' of ' + SHELL_TOTAL + ' shells)' : 'Shell book: ' + count + ' of ' + SHELL_TOTAL);
        ctx.track('done', { on: onBeat, taps: TAPS, combo: bestCombo, own: ownPick ? 1 : 0, kamuro: kamuro ? 1 : 0 });
        finished = true;
        ctx.finish({
          title: 'What a show', mood: 'celebrate',
          lines: [built.length + ' details savoured, ' + total + ' shells in the sky', onBeat + ' of ' + TAPS + ' finale shots on the beat', 'Tomorrow’s show: ' + V2.label],
          share: 'Turned one good moment into a ' + total + '-shell fireworks show.',
          badges
        });
      }

      /* taps on the open sky still answer with a little sparkle */
      S.listen(el, 'pointerdown', (e) => {
        if (phase === 'grand' || phase === 'intro' || !G.w) return;
        const tg = e.target;
        if (tg && tg.closest && tg.closest('.jf-tray, .jf-ticket, .jf-pad, .jf-can, button')) return;
        const p = K.local(e, el);
        if (p.y > G.hz) return;
        P.emit('star', p.x, p.y, 7, { colors: ['#fffbe6', '#ffd36b', '#ff9ec7', '#9fe6ff'], speed: [30, 90] });
        if (A.ctx) { A.chime(A.note(chordAt(BEAT.shown)[Math.floor(rnd() * 4)]), { vol: 0.04, dur: 1.1, verb: 0.5 }); A.sync('twinkle', performance.now()); }
      });

      /* ---------------- start ---------------- */
      cv.onResize(() => { layout(); if (cv.g && L.bg) draw(cv.g, 0, performance.now() / 1000, performance.now()); });
      S.on('theme', () => { el.classList.toggle('jf-bright', !dark()); paintLayers(); });
      (async () => {
        await K.intro({ title: 'Joy Fireworks', sub: 'Tonight at ' + V.name + ': one good moment, turned all the way up.', how: 'Drag a sense into the mortar, pick a detail, swipe up to launch.', char: 'sync', mood: 'E62' });
        showMoment();
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = performance.now(); while (!fn() && performance.now() - t0 < (ms || 60000)) await K.wait(80); };
          await until(() => phase === 'moment' || finished);
          await K.wait(700);
          if (phase === 'moment') { const chips = ticket.querySelectorAll('.jf-chip'); await K.sim.tap(chips[Math.min(chips.length - 1, own.length ? 0 : 1)]); }
          let guard = 0;
          while (built.length < N && guard++ < 12 && !finished) {
            await until(() => phase === 'cans' || phase === 'twist' || finished);
            if (phase !== 'cans') break;
            await K.wait(built.length ? 450 : 1000);
            const c = cans[(built.length * 2 + 1) % cans.length], cr = K.rectIn(c.el, el);
            await K.sim.drag(c.el, { x: cr.w / 2, y: cr.h * 0.36 }, { x: G.mouth.x - cr.x, y: G.mouth.y - cr.y + 4 }, 700, 16);
            await until(() => phase === 'detail' || phase === 'cans', 8000);
            if (phase !== 'detail') continue;
            await K.wait(700);
            const chips = detailWrap.querySelectorAll('.jf-chip');
            await K.sim.tap(chips[(built.length + 1) % chips.length]);
            await until(() => phase === 'launch', 6000);
            await K.wait(450);
            const pr = K.rectIn(pad, el);
            await K.sim.drag(pad, { x: pr.w / 2, y: pr.h * 0.62 }, { x: pr.w / 2 + (built.length % 2 ? 26 : -22), y: pr.h * 0.62 - 200 }, 200, 6);
          }
          await until(() => phase === 'grand' || finished);
          let n = 0;
          while (phase === 'grand' && n++ < TAPS + 4) {
            const nb = beatAfter(performance.now() + 90);
            await K.wait(Math.max(0, nb.ms - performance.now() - 6));
            if (phase !== 'grand') break;
            await K.sim.tap(fireBtn);
            await K.wait(60);
          }
          await until(() => finished, 70000);
        }
      };
    }
  });
})(window.TSG_ENV);
