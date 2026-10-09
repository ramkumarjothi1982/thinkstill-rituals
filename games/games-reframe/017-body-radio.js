/* 017 Body Radio — Reframe · REFRAME · Panic / Body Alarm
 * Mechanism: reinterpreting body sensations (Clark 1986, the cognitive model of panic; arousal reappraisal, Jamieson et
 * al. 2012). A racing heart, quick breathing and light-headedness are usually the normal adrenaline response; reading
 * them as "my body is revving up" instead of "danger" breaks the panic loop. The player tunes a bedside radio away from
 * STATION DANGER (a distorted announcer reading catastrophic takes on each sensation) to the clear station that explains
 * it accurately, then paces slow breaths that turn the alarm down while the body's own heartbeat slows. Never medical
 * advice: the CARE key is always on the radio ("If this is new, severe or you're unsure, call a doctor or 000") and
 * opens first when the reading says care.
 * Verb: tune (turn the big dial with detents and flywheel inertia, fine-tune until the static clears; hold and release
 * the grille to breathe; turn the volume up). Finale: STATION OKAY plays a full song, the room warms, the dial glows.
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
  const sprite = (size, stops) => { const c = mk(size, size), g = c.getContext('2d'), r = size / 2, gr = g.createRadialGradient(r, r, 0, r, r, r); stops.forEach(s => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.fillRect(0, 0, size, size); return c; };

  /* Today's radio: one model per day, each with its own cabinet, grille, glow and brand plate. */
  const MODELS = [
    { key: 'walnut', name: 'Halcyon walnut', brand: 'Halcyon', body: ['#8a5530', '#4a2a15'], grain: true, arch: true, trim: ['#f3d98c', '#a8781f'], panel: '#2b1b10', panelInk: '#f1e2bd', grille: 'slats', cloth: '#c9a777', knob: ['#4a2e1a', '#1f130a'], cap: '#e7c46a', knobInk: '#f3d98c', face: '#f6e7c0', ink: '#3a2108', glow: '#ffb84d', eye: '#5dffa0' },
    { key: 'mint', name: 'Somnus mint', brand: 'Somnus', body: ['#b2e6d3', '#6db59c'], gloss: true, trim: ['#ffffff', '#9aa3ab'], panel: '#efe6cf', panelInk: '#3a2a1a', grille: 'bars', cloth: '#e8dcbc', knob: ['#fbf4e2', '#c9bd9c'], cap: '#c9ced4', knobInk: '#3d4a44', face: '#fff7e2', ink: '#2c4a3e', glow: '#ffd27a', eye: '#6dffb0' },
    { key: 'cherry', name: 'Nocturne cherry', brand: 'Nocturne', body: ['#d24a33', '#87231a'], gloss: true, trim: ['#ffe9a8', '#b8862a'], panel: '#f3e5c6', panelInk: '#3a2a1a', grille: 'lattice', cloth: '#ead7ae', knob: ['#f6e8c8', '#c7b085'], cap: '#e8c46a', knobInk: '#5a1a10', face: '#fff0d2', ink: '#5a1a10', glow: '#ffc05a', eye: '#62ff9c' },
    { key: 'midnight', name: 'Lullaby midnight', brand: 'Lullaby', body: ['#2d3d68', '#121a33'], gloss: true, trim: ['#f1f5fb', '#8792a8'], panel: '#0f1529', panelInk: '#dfe7f5', grille: 'dots', cloth: '#1e2948', knob: ['#3a4a78', '#131b36'], cap: '#dfe6f2', knobInk: '#dfe6f2', face: '#0f2a33', ink: '#bff4ff', glow: '#5fe0ff', eye: '#7dffcf', darkFace: true }
  ];
  /* Each sensation: what the alarm station says, and the calm, accurate station that explains it (plain, hedged, never a diagnosis). */
  const SENS = {
    heart: { re: /\b(heart\w*|pulse|palpitat\w*|pounding|racing)\b/i, station: 'Adrenaline', label: 'Racing heart', what: 'a racing heart', danger: 'Your heart is pounding! Something must be badly wrong!', calm: 'A racing heart is usually adrenaline: your body pumping extra oxygen to your muscles. It’s built for this, and it settles.', careCalm: 'A racing heart is often adrenaline pumping extra oxygen to your muscles. If it’s new or worrying, a doctor can check it.' },
    breath: { re: /\b(breath\w*|breathing|panting|gasp\w*|hyperventilat\w*)\b/i, station: 'Slow Breath', label: 'Quick breathing', what: 'quick breathing', danger: 'Breathing fast?! You can’t cope with this!', calm: 'Breathing faster is your body getting ready to move. A long, slow out-breath helps it settle.', careCalm: 'Breathing faster is often your body getting ready to move. A long, slow out-breath can help it settle.' },
    dizzy: { re: /\b(dizz\w*|light-?headed|faint\w*|woozy|spinning)\b/i, station: 'Oxygen', label: 'Light-headed', what: 'feeling light-headed', danger: 'Dizzy?! You’re about to collapse!', calm: 'Light-headedness often comes from breathing fast. It’s unpleasant, and it usually eases as your breathing slows.', careCalm: 'Light-headedness often comes from breathing fast. If it’s new, severe or keeps happening, get it checked.' },
    shaky: { re: /\b(shak\w*|trembl\w*|jitter\w*|shiver\w*)\b/i, station: 'Revving', label: 'Shaky', what: 'shaky hands', danger: 'Shaking?! You’re losing control!', calm: 'Shaky hands are often adrenaline’s extra energy with nowhere to go yet. Your muscles are primed, not failing.', careCalm: 'Shaky hands are often adrenaline with nowhere to go yet. If it’s new or doesn’t pass, a doctor can check it.' },
    sweaty: { re: /\b(sweat\w*|clammy|flushed|burning up)\b/i, station: 'Cooling', label: 'Sweaty', what: 'sweating', danger: 'Sweating?! Everyone can tell something’s wrong!', calm: 'Sweating is your body’s cooling system switching on early, getting ready for effort.', careCalm: 'Sweating is often your body’s cooling system switching on early. If it’s new or unusual, get it checked.' },
    stomach: { re: /\b(stomach|nause\w*|butterfl\w*|gut|tummy|queasy)\b/i, station: 'Butterflies', label: 'Butterflies', what: 'butterflies', danger: 'Butterflies?! Something terrible is coming!', calm: 'Butterflies happen when your body moves blood away from digestion to your muscles. Very common under stress.', careCalm: 'Butterflies often come from stress moving blood away from digestion. If it’s new or severe, a doctor can help.' },
    tense: { re: /\b(tense|tension|clench\w*|jaw|shoulders|stiff)\b/i, station: 'Bracing', label: 'Tense muscles', what: 'tense muscles', danger: 'Tense?! It’s never going to stop!', calm: 'Tight muscles are your body bracing for action. A long out-breath helps them let go.', careCalm: 'Tight muscles are often your body bracing for action. A long out-breath can help them let go.' },
    tingle: { re: /\b(tingl\w*|pins and needles|numb\w*)\b/i, station: 'Tingle', label: 'Tingling', what: 'tingling', danger: 'Tingling?! Something’s seriously wrong!', calm: 'Tingling fingers often come from breathing quickly. It usually fades as your breathing slows.', careCalm: 'Tingling often comes from breathing quickly. If it’s new, severe or doesn’t fade, get it checked.' }
  };
  const ALL_STATIONS = Object.keys(SENS).length;
  const CARE_TEXT = 'If this is new, severe or you’re unsure, call a doctor or 000.';
  /* Stations you pass on the way (Full adds the 3am news). */
  const DECOYS = [
    { key: 'coffee', name: 'Coffee FM', pos: 0.17, posG: 0.18, min: 0, line: 'Too much coffee can rev a body up too. Worth knowing. Keep tuning.' },
    { key: 'tired', name: 'Tired 101', pos: 0.43, posG: 0.52, min: 0, line: 'A tired body feels everything louder. Keep tuning.' },
    { key: 'news', name: '3AM News', pos: 0.665, posG: 0.8, min: 2, line: 'Everything sounds worse at 3am. That’s the hour talking, not the facts.' }
  ];
  const STOP = /^(at|and|the|a|an|to|of|in|on|for|with|but|so|or|i|my|was|is|it|that|when|then|like)$/i;
  const HOT = /\b(definitely|going to|gonna|must|never|always|everyone|nobody|ruined|fired|over|losing|hates?|can'?t|won'?t|\w+['’]ll)\b/i;
  /* The bedroom: deep night in the dark theme, dusk in the bright one; warm once the lamp comes on. */
  const PAL = {
    dc: { wall: ['#1a2244', '#0b1024'], stripe: '#a8b8ff', sa: 0.06, sky: ['#0c1a40', '#1c2f66'], stars: 14, frame: '#0e1838', curtain: '#2b3266', mull: '#2a2f5a', table: ['#5a3a26', '#3a2416'], drawer: '#3f281a', floor: '#151a30', bed: '#2a3570', bedLine: '#3d4b94', pillow: '#c9cfe6', shade: '#4a4258', vig: 'rgba(0,0,10,0.5)', pic: '#2a3a5a', picLine: '#4a5a8a', cat: '#6a6f86', leaf: '#2f5a3a', lamp: 0 },
    dw: { wall: ['#5a3424', '#2f1a14'], stripe: '#ffd9a8', sa: 0.07, sky: ['#1b2150', '#3a3770'], stars: 14, frame: '#3a2a40', curtain: '#8a3a3a', mull: '#6b2f2f', table: ['#a9683c', '#6e3f22'], drawer: '#7a4528', floor: '#4a2c1e', bed: '#7a3f52', bedLine: '#a95c70', pillow: '#f3e2c6', shade: '#ffd27a', vig: 'rgba(30,10,0,0.35)', pic: '#e8c27a', picLine: '#c0703a', cat: '#e2934a', leaf: '#5aa05a', lamp: 0.55 },
    bc: { wall: ['#c7cdea', '#9aa5d2'], stripe: '#4a5698', sa: 0.07, sky: ['#6f7fd0', '#f2b8a2'], stars: 3, frame: '#7f87b8', curtain: '#7380c4', mull: '#8d95c4', table: ['#a2714c', '#734c31'], drawer: '#8a5d3d', floor: '#8a93bd', bed: '#6676c4', bedLine: '#8592d8', pillow: '#f1f3fb', shade: '#a59fbd', vig: 'rgba(40,40,90,0.22)', pic: '#8ea0d8', picLine: '#5868b0', cat: '#5d6384', leaf: '#4f8a5a', lamp: 0 },
    bw: { wall: ['#f6dcbc', '#e2b78f'], stripe: '#b06a3a', sa: 0.07, sky: ['#5f68b8', '#eaa48c'], stars: 3, frame: '#b07a5a', curtain: '#d27a62', mull: '#b8705a', table: ['#c48552', '#8c5634'], drawer: '#a86c42', floor: '#d6a57e', bed: '#cf7d92', bedLine: '#e29aac', pillow: '#fff4e2', shade: '#ffd27a', vig: 'rgba(110,50,0,0.16)', pic: '#f2cf8a', picLine: '#c0703a', cat: '#d9863f', leaf: '#5aa05a', lamp: 0.3 }
  };

  (env.games = env.games || []).push({
    id: 'body-radio', mode: 'reframe', name: 'Body Radio', verb: 'tune', family: 'REFRAME', minutes: 2,
    parents: ['Panic / Body Alarm', 'Uncertainty / Future Worry / Reassurance', 'Emotion'],
    cast: ['still', 'sync'], poster: { char: 'still', mood: 'music' },
    fonts: ['Josefin+Sans:wght@600;700', 'Poiret+One', 'Lora:ital,wght@0,500;0,600;1,500'],
    tagline: 'Tune your body from Station Danger to the station that explains it.',
    why: 'For a racing heart or a dizzy, buzzing body: hear it as revving up, not danger.',
    css: `
.g-body-radio { --br-sans: "Josefin Sans", Futura, "Century Gothic", "Avenir Next", "Trebuchet MS", sans-serif; --br-deco: "Poiret One", "Josefin Sans", Futura, "Century Gothic", sans-serif;
  --br-serif: Lora, "Iowan Old Style", "Palatino Linotype", Georgia, serif; background: #0c1022; }
.g-body-radio .br-card { position: absolute; z-index: 20; border-radius: 16px; padding: 11px 14px 12px; background: linear-gradient(180deg, #fbf3df, #efe2c2); color: #2a1d10; overflow: hidden;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.25), 0 14px 30px rgba(0, 0, 0, 0.45); transition: box-shadow 0.35s ease; }
.g-body-radio .br-card::before { content: ""; position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.035) 0 1px, transparent 1px 4px); }
.g-body-radio .br-card.danger { background: linear-gradient(180deg, #4a0c12, #23060a); color: #ffe4dc; box-shadow: 0 0 0 2px #ff4a3d, 0 0 26px rgba(255, 60, 40, 0.45), 0 14px 30px rgba(0, 0, 0, 0.5); }
.g-body-radio .br-card.care { background: linear-gradient(180deg, #f6fdf8, #e3f4ea); color: #0f3527; box-shadow: 0 0 0 3px #2f9e6e, 0 0 24px rgba(47, 158, 110, 0.45), 0 14px 30px rgba(0, 0, 0, 0.45); }
.g-body-radio .br-card.static { background: linear-gradient(180deg, #2a2e3c, #1a1d27); color: #cfd6e6; }
.g-body-radio .br-card.okay { background: linear-gradient(180deg, #fff6dc, #ffe2a6); box-shadow: 0 0 0 2px #ffcf6b, 0 0 34px rgba(255, 207, 107, 0.55), 0 14px 30px rgba(0, 0, 0, 0.4); }
.g-body-radio .br-head { position: relative; display: flex; align-items: center; gap: 8px; font: 700 12px/1.1 var(--br-sans); letter-spacing: 0.14em; text-transform: uppercase; white-space: nowrap; }
.g-body-radio .br-head .br-st { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.g-body-radio .br-head .br-fq { margin-left: auto; opacity: 0.75; flex: none; }
.g-body-radio .br-led { flex: none; width: 10px; height: 10px; border-radius: 50%; background: #c9a35a; box-shadow: 0 0 6px rgba(201, 163, 90, 0.8); }
.g-body-radio .danger .br-led { background: #ff3b30; box-shadow: 0 0 9px #ff3b30; animation: body-radio-blink 0.7s steps(2) infinite; }
.g-body-radio .care .br-led { background: #2f9e6e; box-shadow: 0 0 8px #2f9e6e; }
.g-body-radio .static .br-led { background: #7fd8c2; box-shadow: 0 0 6px rgba(127, 216, 194, 0.8); }
@keyframes body-radio-blink { 50% { opacity: 0.25; } }
.g-body-radio .br-body { position: relative; display: flex; gap: 11px; align-items: flex-start; margin-top: 8px; }
.g-body-radio .br-av { flex: none; width: 46px; height: 46px; object-fit: contain; filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.3)); }
.g-body-radio .br-icon { flex: none; width: 46px; height: 46px; display: grid; place-items: center; border-radius: 50%; font: 700 22px/1 var(--br-sans); }
.g-body-radio .danger .br-icon { background: radial-gradient(circle, #ff6a4d, #b3140c); color: #fff; animation: body-radio-throb 0.43s ease-in-out infinite alternate; }
.g-body-radio .care .br-icon { background: #2f9e6e; color: #fff; }
.g-body-radio .static .br-icon { background: repeating-linear-gradient(90deg, #4a5168 0 2px, #2b3042 2px 4px); color: #cfd6e6; }
@keyframes body-radio-throb { to { transform: scale(1.08); } }
.g-body-radio .br-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.g-body-radio .br-txt { margin: 0; min-width: 0; font: 600 15px/1.32 var(--br-serif); display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; overflow: hidden; }
.g-body-radio .danger .br-txt { letter-spacing: 0.01em; text-shadow: 1px 0 rgba(255, 60, 60, 0.55), -1px 0 rgba(60, 220, 255, 0.4); animation: body-radio-jit 0.18s steps(2) infinite; }
@keyframes body-radio-jit { 50% { transform: translate(0.6px, -0.4px); } }
.g-body-radio .br-words { position: relative; margin-top: 7px; font: italic 500 15px/1.25 var(--br-serif); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.94; }
.g-body-radio .br-words b { font: 700 12px/1 var(--br-sans); font-style: normal; letter-spacing: 0.12em; text-transform: uppercase; margin-right: 7px; padding: 3px 6px 2px; border-radius: 4px; background: #ff3b30; color: #fff; vertical-align: 2px; }
.g-body-radio .br-list { position: relative; margin: 2px 0 0; padding: 0; list-style: none; display: grid; gap: 3px; }
.g-body-radio .br-list li { display: flex; gap: 8px; align-items: baseline; font: 600 14px/1.25 var(--br-serif); }
.g-body-radio .br-list li i { font: 700 12px/1 var(--br-sans); font-style: normal; letter-spacing: 0.1em; text-transform: uppercase; color: #8a5a12; white-space: nowrap; }
.g-body-radio .br-list li.care-row i { color: #13633f; }
.g-body-radio .br-meter { position: absolute; left: 14px; right: 14px; bottom: 10px; display: none; align-items: center; gap: 3px; color: #7fd8c2; pointer-events: none; }
.g-body-radio .with-meter .br-meter { display: flex; }
.g-body-radio .br-meter b { flex: none; font: 700 12px/1 var(--br-sans); letter-spacing: 0.16em; text-transform: uppercase; margin-right: 8px; opacity: 0.8; }
.g-body-radio .br-meter i { flex: 1; height: 7px; border-radius: 2px; background: currentColor; opacity: 0.15; }
.g-body-radio .br-meter i.on { opacity: 0.95; }
.g-body-radio .danger .br-meter { color: #ff6a55; }
.g-body-radio .calm .br-meter, .g-body-radio .okay .br-meter { color: #a8741a; }
.g-body-radio .care .br-meter { color: #2f9e6e; }
.g-body-radio .br-band { position: absolute; z-index: 14; pointer-events: none; }
.g-body-radio .br-lab { position: absolute; font: 700 12px/1 var(--br-sans); letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; padding: 4px 5px 3px; border-radius: 6px; color: var(--ink, #3a2108); transition: background 0.3s ease, color 0.3s ease, opacity 0.6s ease, box-shadow 0.3s ease; }
.g-body-radio .br-lab.danger { color: #c4160c; }
.g-body-radio .br-lab.dark.danger { color: #ff7a6b; }
.g-body-radio .br-lab.target { background: #ffcf4d; color: #3a2404; box-shadow: 0 0 12px rgba(255, 196, 70, 0.8); }
.g-body-radio .br-lab.done { background: rgba(47, 158, 110, 0.18); color: #13633f; }
.g-body-radio .br-lab.dark.done { color: #8cf5c4; }
.g-body-radio .br-lab.care { color: #13633f; }
.g-body-radio .br-lab.dark.care { color: #8cf5c4; }
.g-body-radio .br-lab.dim { opacity: 0.62; }
.g-body-radio .br-lab.gone { opacity: 0; }
.g-body-radio .br-okay { position: absolute; z-index: 15; transform: translate(-50%, -50%); text-align: center; pointer-events: none; white-space: nowrap; animation: body-radio-okin 1.4s ease both; }
.g-body-radio .br-okay span { display: block; font: 400 28px/1 var(--br-deco); letter-spacing: 0.1em; text-transform: uppercase; text-shadow: 0 0 14px rgba(255, 190, 80, 0.8), 0 0 2px rgba(255, 240, 200, 0.9); }
.g-body-radio .br-okay small { display: block; margin-top: 9px; font: 700 12px/1 var(--br-sans); letter-spacing: 0.3em; text-transform: uppercase; opacity: 0.8; }
@keyframes body-radio-okin { from { opacity: 0; letter-spacing: 0.3em; } to { opacity: 1; } }
.g-body-radio .br-pill { position: absolute; z-index: 16; transform: translateX(-50%); white-space: nowrap; font: 700 12px/1 var(--br-sans); letter-spacing: 0.14em; text-transform: uppercase; color: #ffe6a8; background: rgba(20, 14, 6, 0.8);
  border: 1px solid rgba(255, 207, 107, 0.55); padding: 7px 12px 6px; border-radius: 999px; pointer-events: none; box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35); }
.g-body-radio .br-pill b { color: #ffcf4d; }
.g-body-radio .br-pill:empty { display: none; }
.g-body-radio .br-hit { position: absolute; z-index: 18; border-radius: 50%; touch-action: none; cursor: grab; }
.g-body-radio .br-hit:active { cursor: grabbing; }
.g-body-radio .br-hit:focus-visible { outline: 3px solid #ffcf4d; outline-offset: 2px; }
.g-body-radio .br-klab { position: absolute; z-index: 15; transform: translateX(-50%); font: 700 12px/1 var(--br-sans); letter-spacing: 0.16em; text-transform: uppercase; white-space: nowrap; pointer-events: none; }
.g-body-radio .br-care { position: absolute; z-index: 19; display: grid; place-items: center; align-content: center; gap: 3px; padding: 0; border: 0; border-radius: 8px 8px 12px 12px; cursor: pointer; color: #13633f;
  background: linear-gradient(180deg, #ffffff, #e9eee9); box-shadow: 0 4px 0 #b7c2b9, 0 8px 14px rgba(0, 0, 0, 0.35); font: 700 12px/1 var(--br-sans); letter-spacing: 0.14em; }
.g-body-radio .br-care i { font: 800 18px/1 var(--br-sans); font-style: normal; color: #2f9e6e; }
.g-body-radio .br-care:active { transform: translateY(3px); box-shadow: 0 1px 0 #b7c2b9, 0 4px 8px rgba(0, 0, 0, 0.3); }
.g-body-radio .br-care:focus-visible { outline: 3px solid #ffcf4d; outline-offset: 3px; }
.g-body-radio .br-care.lit { box-shadow: 0 4px 0 #b7c2b9, 0 0 0 3px #2f9e6e, 0 0 6px rgba(47, 158, 110, 0.5); }
.g-body-radio .br-care.lit::after { content: ""; position: absolute; inset: -4px; border-radius: 11px 11px 15px 15px; box-shadow: 0 0 18px 2px rgba(47, 158, 110, 0.9); pointer-events: none; animation: body-radio-care 1.6s ease-in-out infinite; }
@keyframes body-radio-care { 50% { opacity: 0.25; } }
.g-body-radio .br-pad { position: absolute; z-index: 17; border-radius: 16px; touch-action: none; cursor: pointer; display: grid; place-items: center; }
.g-body-radio .br-pad:focus-visible { outline: 3px solid #ffcf4d; outline-offset: 3px; }
.g-body-radio .br-pad span { font: 600 16px/1.2 var(--br-serif); color: #fff6df; text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8); background: rgba(20, 14, 8, 0.6); padding: 7px 14px; border-radius: 999px; pointer-events: none; text-align: center; }
.g-body-radio .gk-char.br-sync { left: 12px; top: auto; bottom: calc(env(safe-area-inset-bottom, 0px) + 22px); }
@container (min-width: 700px) {
  .g-body-radio .br-txt { font-size: 17px; }
  .g-body-radio .br-words { font-size: 16px; }
  .g-body-radio .br-lab { font-size: 13px; }
  .g-body-radio .br-okay span { font-size: 44px; }
  .g-body-radio .br-list li { font-size: 16px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const clamp = K.clamp, lerp = K.lerp, ease = K.ease;
      const inten = ctx.intensity, reduced = () => K.reduced(), now = () => performance.now();
      const visits = K.visits();
      const L = (o) => ctx.line(o) || '';
      const text = String(ctx.text || ''), care = an.safety === 'care';
      const model = K.dailyPick(MODELS, 2);

      /* ---------------- which sensations to tune tonight ---------------- */
      const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); return (sp > n * 0.5 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; };
      function phraseFor(key) {
        const re = SENS[key].re, parts = text.split(/[.!?;\n]+|,\s*/);
        for (const p of parts) { const m = re.exec(p); if (!m) continue; const w = p.trim().split(/\s+/), at = p.trim().slice(0, p.trim().indexOf(m[0])).split(/\s+/).filter(Boolean).length; const seg = w.slice(Math.max(0, at - 3), at + 6); while (seg.length > 2 && STOP.test(seg[seg.length - 1])) seg.pop(); return clip(seg.join(' '), 48); }
        return '';
      }
      const found = [];
      const bodyIn = Array.isArray(an.body) ? an.body.map(String).join(' ') : '';
      const hay = (bodyIn + ' ' + text).trim();
      Object.keys(SENS).map(k => { const m = SENS[k].re.exec(hay); return m ? { k, at: m.index } : null; }).filter(Boolean).sort((a, b) => a.at - b.at).forEach(x => found.push(x.k));
      const others = found.filter(k => k !== 'breath');
      const pickOther = (i, dflt) => others[i] || (others.includes(dflt) ? ['shaky', 'stomach'].find(k => !others.includes(k)) : dflt);
      const first = pickOther(0, 'heart'), second = others[1] || (first === 'dizzy' ? 'heart' : 'dizzy');
      const plan = inten === 0 ? [first, 'breath'] : [first, 'breath', second === first ? 'dizzy' : second];
      const BREATHS = [2, 3, 3][inten], IN_MS = [3000, 3200, 3600][inten], OUT_MS = [4400, 4800, 5400][inten];
      const TOL = [0.013, 0.009, 0.0065][inten], AFC = [3.2, 2.6, 2.0][inten];
      /* the hot thought from the player's words: what Station Danger has on repeat (never in care mode: no framing a real worry as noise) */
      const hotQ = (() => {
        if (care) return '';
        const sp = (Array.isArray(an.spans) ? an.spans : []).filter(s => s && s.kind === 'brain' && typeof s.quote === 'string' && s.quote.trim()).map(s => s.quote.trim());
        if (!sp.length) return '';
        let best = sp[sp.length - 1], bs = -1; sp.forEach((q, i) => { const sc = (HOT.test(q) ? 2 : 0) + i * 0.01; if (sc > bs) { bs = sc; best = q; } });
        return clip(best.replace(/^[\s,;:–-]+|[\s,;:–-]+$/g, ''), 64);
      })();

      /* the band: the alarm at the left, the care station at the far right, tonight's stations in between */
      const slots = inten === 0 ? [0.34, 0.66] : [0.3, 0.55, 0.78];
      const BAND = [{ key: 'danger', name: 'Danger', pos: 0.05, w: 0.05, row: 0, kind: 'danger' }];
      DECOYS.filter(d => d.min <= inten).forEach(d => BAND.push({ key: d.key, name: d.name, pos: inten === 0 ? d.posG : d.pos, w: 0.026, row: 1, kind: 'decoy', line: d.line }));
      plan.forEach((k, i) => BAND.push({ key: 't' + i, sens: k, name: SENS[k].station, pos: slots[i], w: 0.032, row: i % 2, kind: 'target', round: i }));
      BAND.push({ key: 'care', name: '+ Care', pos: 0.955, w: 0.028, row: 0, kind: 'care' });
      const byKey = {}; BAND.forEach(b => { byKey[b.key] = b; });
      const words = plan.map(k => phraseFor(k) || hotQ);
      const calmOf = (k) => (care ? SENS[k].careCalm : SENS[k].calm);

      /* ---------------- lines (every one in three vibes) ---------------- */
      const LINES = {
        intro: care ? { Jolly: 'Can’t sleep. Station Danger keeps talking about my body.', Cheeky: 'Station Danger again. Let’s find a better station.', Unfiltered: 'Radio says danger. Let’s tune it.' }
          : { Jolly: 'I can’t sleep. Station Danger says my body’s in trouble!', Cheeky: 'Station Danger again. Huge ratings, terrible advice.', Unfiltered: 'Radio says danger. Body says go. Help me tune it.' },
        careFirst: { Jolly: 'Quick thing first: this radio has a care station. It’s always there.', Cheeky: 'First, the care button. It’s always on this radio.', Unfiltered: 'Care station first. It stays on the radio.' },
        tune: { Jolly: 'Can you find a station that actually explains it?', Cheeky: 'Spin the dial. Find me a better DJ.', Unfiltered: 'Tune it. Find the real explanation.' },
        close: { Jolly: 'Ooh, it’s coming in. Little moves now!', Cheeky: 'Warmer… warmer… tiny twists.', Unfiltered: 'Close. Small moves.' },
        coffee: { Jolly: 'Coffee FM? I did have a big one…', Cheeky: 'Coffee FM. Guilty.', Unfiltered: 'Maybe coffee. Keep going.' },
        tired: { Jolly: 'Tired 101. Fair, it’s late.', Cheeky: 'Tired 101. Very relatable.', Unfiltered: 'Tired. Keep going.' },
        news: { Jolly: '3AM News? Everything sounds scarier at 3am.', Cheeky: 'The 3am news. Famously dramatic.', Unfiltered: 'Night news. Skip it.' },
        locked: care ? { Jolly: 'That’s a kinder way to hear it. The care key’s still there.', Cheeky: 'A calmer DJ. Care key still on standby.', Unfiltered: 'Calmer. Care key’s there.' }
          : { Jolly: 'Oh. My body’s revving up, not breaking down.', Cheeky: 'Huh. That’s a much better DJ.', Unfiltered: 'Right. Revving, not danger.' },
        locked2: care ? { Jolly: 'Calmer. And I can still get it checked.', Cheeky: 'Same feeling, less drama. Checking is still allowed.', Unfiltered: 'Calmer. Can still get checked.' }
          : { Jolly: 'That makes sense. It’s a feeling, not a fault.', Cheeky: 'Same sensation. Way less drama.', Unfiltered: 'Makes sense. Not danger.' },
        cutIn: care ? { Jolly: 'Station Danger’s back. Let’s tune again, gently.', Cheeky: 'The alarm grabbed the dial again.', Unfiltered: 'Danger’s back. Tune again.' }
          : { Jolly: 'Wait, Station Danger’s cutting in again!', Cheeky: 'Ugh, the alarm grabbed the dial.', Unfiltered: 'Danger’s back. Tune again.' },
        quieter: { Jolly: 'Station Danger’s back, but it’s so much quieter now.', Cheeky: 'Danger’s back. Volume: whisper.', Unfiltered: 'Danger again. Quieter though.' },
        breathIn: { Jolly: 'My breathing’s all quick. Can we slow it down together?', Cheeky: 'Breathing like I ran here. I did not run here.', Unfiltered: 'Breath’s fast. Slow it with me.' },
        breath1: { Jolly: 'The alarm just got quieter. And my heart’s slowing.', Cheeky: 'Turned it down. Love that.', Unfiltered: 'Quieter. Slower.' },
        breathAll: { Jolly: 'Station Danger’s barely a whisper now.', Cheeky: 'Station Danger is losing listeners.', Unfiltered: 'Alarm’s low. Good.' },
        short: { Jolly: 'A little longer on the in-breath.', Cheeky: 'Bit more air. Keep holding.', Unfiltered: 'Longer in.' },
        stuck: { Jolly: 'It won’t turn by force. Breathing turns it down.', Cheeky: 'Locked. Turns out you can’t just switch it off.', Unfiltered: 'Won’t turn. Breathing turns it.' },
        okay: { Jolly: 'Is that… Station Okay? Turn it up!', Cheeky: 'Station Okay. Finally, a banger.', Unfiltered: 'Station Okay. Turn it up.' },
        end: care ? { Jolly: 'Better station. If it’s new or severe, I’ll call someone.', Cheeky: 'Much better radio. Care button’s still there if I need it.', Unfiltered: 'Better. Doctor or 000 if it’s new or severe.' }
          : { Jolly: 'Revving, not breaking. I think I can sleep now.', Cheeky: 'Same body. Much better radio.', Unfiltered: 'Body’s fine. Revving. Sleep.' }
      };
      const DJ = {
        breath: { Jolly: 'Hold the grille to breathe in. Let go and breathe out slowly. Each breath turns the alarm down.', Cheeky: 'Hold the grille to breathe in, let go to breathe out slowly. Each breath turns the alarm down.', Unfiltered: 'Hold the grille: in. Let go: out, slowly. Each breath turns the alarm down.' },
        okay: { Jolly: 'And now, the station that was playing underneath all along: Station Okay.', Cheeky: 'Last request of the night: Station Okay. Turn it up.', Unfiltered: 'Station Okay. Turn it up.' }
      };

      /* ---------------- state ---------------- */
      const HR0 = [100, 108, 114][inten];
      const st = { phase: 'intro', round: -1, f: 0.05, power: 0, warm: 0, alarm: 1, vol: 0, locked: false, lockK: 0, settle: 0, sig: 0, best: 0, str: {}, finished: false, cards: [], score: [], careUntil: 0, glowFlash: 0, okK: 0,
        hr: HR0, hrT: HR0, hrV: 0, beatK: 0, beatPh: 0, beatT: 0, saidStuck: false, saidClose: false };
      const TUN = { ang: 0, vel: 0, drag: false, last: null, hist: [], cum: 0, detent: 0, overs: 0, side: 0, t0: 0, moveT: 0, lastClick: 0 };
      const VOL = { drag: false, last: null, wig: 0 };
      const M = { w: 0, h: 0, phone: true };
      const P = K.particles();
      const NOTES = [];
      const TWS = [];
      function tween(ms, fn, ez) { if (reduced()) ms = Math.min(ms, 240); return new Promise(res => { TWS.push({ t0: now(), ms: Math.max(1, ms), fn, ez: ez || (k => k), res }); }); }
      function stepTweens() { for (let i = TWS.length - 1; i >= 0; i--) { const tw = TWS[i], k = clamp((now() - tw.t0) / tw.ms, 0, 1); try { tw.fn(tw.ez(k)); } catch (e) { console.error(e); } if (k >= 1) { TWS.splice(i, 1); tw.res(); } } }

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: 1.5 });
      const card = h('div', { class: 'br-card static', role: 'status', 'aria-live': 'polite' });
      const meter = h('div', { class: 'br-meter', 'aria-hidden': 'true' }, h('b', { text: 'Signal' }), ...Array.from({ length: 12 }, () => h('i')));
      const segs = Array.from(meter.querySelectorAll('i'));
      const band = h('div', { class: 'br-band', 'aria-hidden': 'true' });
      const pill = h('div', { class: 'br-pill', 'aria-live': 'polite' });
      const tuneHit = h('div', { class: 'br-hit', role: 'slider', tabindex: '0', 'aria-label': 'Tuning dial. Drag around it, or use the arrow keys.', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '5' });
      const volHit = h('div', { class: 'br-hit', role: 'slider', tabindex: '0', 'aria-label': 'Alarm volume knob', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '100' });
      const careKey = h('button', { type: 'button', class: 'br-care', 'aria-label': 'Care station: if this is new, severe or you are unsure, call a doctor or 000' }, h('i', { text: '+' }), h('span', { text: 'CARE' }));
      const pad = h('div', { class: 'br-pad', role: 'button', tabindex: '0', 'aria-label': 'Speaker grille. Press and hold to breathe in, let go to breathe out.', hidden: true }, h('span', { text: 'Hold to breathe in' }));
      const tuneLab = h('div', { class: 'br-klab', text: 'Tuning' }), volLab = h('div', { class: 'br-klab', text: 'Alarm' });
      el.append(band, card, pill, tuneHit, volHit, careKey, pad, tuneLab, volLab);
      const padText = pad.firstChild;
      const sync = K.character('sync', { side: 'right', mood: 'worried', size: K.phone() ? 70 : 92 });
      sync.el.classList.add('br-sync');
      BAND.forEach(b => { const l = h('div', { class: 'br-lab ' + (model.darkFace ? 'dark ' : '') + (b.kind === 'danger' ? 'danger' : b.kind === 'care' ? 'care' : 'dim'), text: b.name }); l.style.setProperty('--ink', model.ink); band.append(l); b.el = l; });

      /* ---------------- broadcast card ---------------- */
      let cardKey = '', typeTok = 0, meterOn = false, meterLvl = -1, meterT = 0, curP = null, curFq = null;
      function setCard(kind, o) {
        const key = kind + '|' + (o.station || '') + '|' + (o.text || '') + '|' + (o.list ? o.list.length : '');
        if (key === cardKey) return; cardKey = key;
        card.className = 'br-card ' + kind + (meterOn ? ' with-meter' : '');
        const fq = o.freq ? h('span', { class: 'br-fq', text: o.freq }) : null;
        const head = h('div', { class: 'br-head' }, h('i', { class: 'br-led' }), h('span', { class: 'br-st', text: o.station || '' }), fq);
        const icon = o.av ? h('img', { class: 'br-av', alt: '', src: K.face(o.av, o.mood || 'music') }) : h('div', { class: 'br-icon', 'aria-hidden': 'true', text: o.icon || '' });
        const p = h('p', { class: 'br-txt', 'aria-hidden': 'true' });
        curP = o.list ? null : p; curFq = o.live ? fq : null;
        const kids = [head, h('div', { class: 'br-body' }, icon, o.list ? h('ul', { class: 'br-list' }, o.list.map(x => h('li', { class: x[2] || null }, h('i', { text: x[0] }), h('span', { text: x[1] })))) : p)];
        if (!o.list) kids.push(h('span', { class: 'br-sr', text: o.sr || o.text || '' }));
        if (o.words) kids.push(h('div', { class: 'br-words' }, h('b', { text: 'On air' }), h('span', { class: 'gk-user', text: '“' + o.words + '”' })));
        card.replaceChildren(...kids, meter);
        if (!o.list) {
          const tok = ++typeTok, full = o.text || '';
          if (reduced() || o.instant) p.textContent = full;
          else { let i = 0; const step = () => { if (tok !== typeTok) return; i = Math.min(full.length, i + 2); p.textContent = full.slice(0, i); if (i < full.length) S.later(step, o.speed || 22); }; step(); }
        }
      }
      const freqOf = (f) => Math.round(530 + f * 1070) + ' kHz';
      function updMeter() {
        const on = st.phase === 'cut' || st.phase === 'tune';
        if (on !== meterOn) { meterOn = on; card.classList.toggle('with-meter', on); }
        if (!on || now() - meterT < 70) return; meterT = now();
        if (curFq) { const ft = freqOf(st.f); if (curFq.textContent !== ft) curFq.textContent = ft; }
        const lv = clamp(Math.round(st.best * 12 + (st.best < 0.45 ? (Math.random() - 0.5) * 2.6 : 0)), 0, 12);
        if (lv !== meterLvl) { meterLvl = lv; segs.forEach((s, i) => s.classList.toggle('on', i < lv)); }
      }

      /* ---------------- layout ---------------- */
      const R = {}, spr = { key: '' }, bg = { key: '', cold: null, warm: null }, bgMix = { key: '', c: null };
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        M.w = W; M.h = H; M.phone = W < 700;
        const ph = M.phone, cmp = ph && H < 760, cx = W / 2;
        const Z = ph ? (cmp ? { cardH: 116, gapC: 8, dialH: 92, eyeR: 12, eyeGap: 18, panelH: 124, tuneR: 38, volR: 25, knobY: 56, rhMin: 340, reserve: 150, ins: 16, dialTop: 18 }
          : { cardH: 136, gapC: 10, dialH: 100, eyeR: 15, eyeGap: 25, panelH: 148, tuneR: 46, volR: 30, knobY: 66, rhMin: 380, reserve: 168, ins: 18, dialTop: 22 })
          : { cardH: 146, gapC: 14, dialH: 124, eyeR: 18, eyeGap: 30, panelH: 170, tuneR: 56, volR: 36, knobY: 76, rhMin: 420, reserve: 110, ins: 30, dialTop: 26 };
        M.Z = Z;
        const cw = ph ? W - 24 : Math.min(660, W - 80);
        R.card = { x: Math.round(cx - cw / 2), y: ph ? 62 : 66, w: Math.round(cw), h: Z.cardH };
        const rw = ph ? W - 24 : Math.min(660, W - 200), ry = R.card.y + R.card.h + Z.gapC;
        const rh = Math.round(clamp(H - ry - Z.reserve, Z.rhMin, ph ? 470 : 560));
        R.radio = { x: Math.round(cx - rw / 2), y: ry, w: Math.round(rw), h: rh };
        R.dial = { x: R.radio.x + Z.ins, y: ry + Z.dialTop, w: rw - Z.ins * 2, h: Z.dialH };
        R.eye = { x: cx, y: R.dial.y + R.dial.h + Z.eyeGap, r: Z.eyeR };
        R.panel = { x: R.radio.x + 12, y: ry + rh - Z.panelH - (ph ? 10 : 12), w: rw - 24, h: Z.panelH };
        R.grille = { x: R.radio.x + (ph ? 26 : 60), y: R.eye.y + R.eye.r + (ph ? 12 : 16), w: rw - (ph ? 52 : 120), h: 0 };
        R.grille.h = Math.round(R.panel.y - (ph ? 12 : 16) - R.grille.y);
        const py = R.panel.y + Z.knobY;
        R.tune = { x: R.radio.x + rw - (ph ? Z.tuneR + 30 : 112), y: py, r: Z.tuneR };
        R.vol = { x: R.radio.x + (ph ? Z.volR + 34 : 104), y: py, r: Z.volR };
        R.arcR = R.vol.r + (ph ? 16 : 19);
        R.care = { w: ph ? 62 : 74, h: ph ? 48 : 54 };
        R.care.x = Math.round((R.vol.x + R.arcR + R.tune.x - R.tune.r - 12) / 2 - R.care.w / 2); R.care.y = Math.round(py - R.care.h / 2 - 4);
        R.table = R.radio.y + rh;
        Object.assign(card.style, { left: R.card.x + 'px', top: R.card.y + 'px', width: R.card.w + 'px', height: R.card.h + 'px' });
        Object.assign(band.style, { left: R.dial.x + 'px', top: R.dial.y + 'px', width: R.dial.w + 'px', height: R.dial.h + 'px' });
        const hs = R.tune.r * 1.45; Object.assign(tuneHit.style, { left: (R.tune.x - hs) + 'px', top: (R.tune.y - hs) + 'px', width: hs * 2 + 'px', height: hs * 2 + 'px' });
        const vs = Math.max(R.vol.r * 1.55, 30); Object.assign(volHit.style, { left: (R.vol.x - vs) + 'px', top: (R.vol.y - vs) + 'px', width: vs * 2 + 'px', height: vs * 2 + 'px' });
        Object.assign(careKey.style, { left: R.care.x + 'px', top: R.care.y + 'px', width: R.care.w + 'px', height: R.care.h + 'px' });
        Object.assign(pad.style, { left: R.grille.x + 'px', top: R.grille.y + 'px', width: R.grille.w + 'px', height: R.grille.h + 'px' });
        Object.assign(tuneLab.style, { left: R.tune.x + 'px', top: (R.tune.y + R.tune.r + (ph ? 12 : 16)) + 'px', color: model.panelInk });
        Object.assign(volLab.style, { left: R.vol.x + 'px', top: (R.vol.y + R.vol.r + (ph ? 13 : 17)) + 'px', color: model.panelInk });
        pill.style.left = cx + 'px'; pill.style.top = (R.table + (ph ? 12 : 14)) + 'px';
        placeLabels();
        if (st.okayEl) placeOkay();
        spr.key = ''; bg.key = '';
      }
      /* station names sit above or below the scale; the important ones are placed first and nothing may overlap */
      function placeLabels() {
        const d = R.dial; if (!d) return;
        const x0 = 16, span = d.w - 32, gap = 6, rows = [[], []], rank = (b) => (b.kind === 'decoy' ? 1 : 0);
        BAND.forEach(b => { b.el.style.display = ''; });
        const widths = BAND.map(b => b.el.offsetWidth || 70);
        const fits = (row, l, r) => rows[row].every(s => r + gap <= s.l || l >= s.r + gap);
        BAND.map((b, i) => ({ b, w: widths[i] })).sort((a, b) => rank(a.b) - rank(b.b) || a.b.pos - b.b.pos).forEach(({ b, w }) => {
          const px = x0 + b.pos * span, base = clamp(px - w / 2, 4, d.w - w - 4), order = [b.row, 1 - b.row];
          let placed = -1, l = base;
          for (const dx of [0, 8, -8, 16, -16, 24, -24, 32, -32, 40, -40]) {
            const l2 = clamp(base + dx, 4, d.w - w - 4);
            const rw = order.find(r => fits(r, l2, l2 + w)); if (rw != null) { placed = rw; l = l2; break; }
          }
          if (placed < 0) { b.el.style.display = 'none'; return; }
          rows[placed].push({ l, r: l + w });
          b.el.style.left = Math.round(l) + 'px'; b.el.style.top = placed === 0 ? '4px' : (d.h - 24) + 'px';
        });
      }
      cv.onResize(layout);
      S.on('theme', () => { bg.key = ''; });
      const fx = (f) => R.dial.x + 16 + f * (R.dial.w - 32);
      // canvas text uses the game's fonts: repaint the cabinet once they arrive
      try { if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('400 22px "Poiret One"'), document.fonts.load('700 12px "Josefin Sans"')]).then(() => { spr.key = ''; }, () => {}); } catch (e) { /* no font loading API */ }

      /* ---------------- sprites: the room, the radio, its knobs ---------------- */
      function buildSprites() {
        const dpr = cv.dpr || 1, key = M.w + 'x' + M.h + ':' + dpr; if (spr.key === key) return; spr.key = key;
        spr.radio = paintRadio(dpr); spr.scale = paintScale(dpr); spr.glass = paintGlass(dpr);
        spr.knob = paintKnob(R.tune.r, dpr, true); spr.vknob = paintKnob(R.vol.r, dpr, false);
        spr.knobHi = paintKnobHi(R.tune.r, dpr); spr.vknobHi = paintKnobHi(R.vol.r, dpr);
        spr.soft = sprite(128, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]);
        spr.amber = sprite(128, [[0, rgba(model.glow, 0.95)], [0.45, rgba(model.glow, 0.4)], [1, rgba(model.glow, 0)]]);
        spr.gold = sprite(128, [[0, 'rgba(255,214,140,0.95)'], [0.5, 'rgba(255,190,100,0.35)'], [1, 'rgba(255,170,80,0)']]);
        spr.red = sprite(128, [[0, 'rgba(255,58,40,0.95)'], [0.5, 'rgba(255,40,30,0.35)'], [1, 'rgba(255,30,20,0)']]);
        spr.eye = mk(64, 64); { const eg = spr.eye.getContext('2d'), gr = eg.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, rgba(model.eye, 0.95)); gr.addColorStop(0.6, rgba(model.eye, 0.55)); gr.addColorStop(1, rgba(model.eye, 0.2)); eg.fillStyle = gr; eg.beginPath(); eg.arc(32, 32, 32, 0, TAU); eg.fill(); }
        spr.eyeGlow = sprite(64, [[0, rgba(model.eye, 0.8)], [0.5, rgba(model.eye, 0.25)], [1, rgba(model.eye, 0)]]);
        const vg = mk(160, 100), vgg = vg.getContext('2d'), vgr = vgg.createRadialGradient(80, 50, 22, 80, 50, 96); vgr.addColorStop(0, 'rgba(255,40,30,0)'); vgr.addColorStop(1, 'rgba(255,40,30,0.95)'); vgg.fillStyle = vgr; vgg.fillRect(0, 0, 160, 100); spr.vig = vg;
        bg.key = '';
      }
      function bodyPath(g, w, hh, rad) {
        if (model.arch) { const arch = Math.min(46, w * 0.12), e = arch * 0.32; g.beginPath(); g.moveTo(0, hh - rad); g.lineTo(0, e + rad * 0.9); g.quadraticCurveTo(0, e, rad * 1.1, e); g.quadraticCurveTo(w / 2, -e, w - rad * 1.1, e); g.quadraticCurveTo(w, e, w, e + rad * 0.9); g.lineTo(w, hh - rad); g.quadraticCurveTo(w, hh, w - rad, hh); g.lineTo(rad, hh); g.quadraticCurveTo(0, hh, 0, hh - rad); g.closePath(); }
        else rr(g, 0, 0, w, hh, rad);
      }
      function paintRadio(dpr) {
        const Rd = R.radio, pad = 34, c = mk((Rd.w + pad * 2) * dpr, (Rd.h + pad * 2) * dpr), g = c.getContext('2d'), w = Rd.w, hh = Rd.h, rad = M.phone ? 26 : 36;
        g.setTransform(dpr, 0, 0, dpr, pad * dpr, pad * dpr);
        const lx = (x) => x - Rd.x, ly = (y) => y - Rd.y;
        // contact shadow and feet
        g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.ellipse(w / 2, hh + 3, w * 0.5, 13, 0, 0, TAU); g.fill();
        g.fillStyle = shade(model.body[1], -0.4); rr(g, w * 0.12, hh - 6, 34, 12, 4); g.fill(); rr(g, w * 0.88 - 34, hh - 6, 34, 12, 4); g.fill();
        // cabinet
        bodyPath(g, w, hh, rad);
        const bgr = g.createLinearGradient(0, 0, w * 0.4, hh); bgr.addColorStop(0, model.body[0]); bgr.addColorStop(1, model.body[1]); g.fillStyle = bgr; g.fill();
        g.save(); bodyPath(g, w, hh, rad); g.clip();
        if (model.grain) { const Rg = K.rng(7); for (let i = 0; i < 70; i++) { const y0 = Rg() * hh, a = 2 + Rg() * 6, f = 0.01 + Rg() * 0.02, phs = Rg() * 6; g.strokeStyle = Rg() < 0.5 ? 'rgba(40,18,6,0.22)' : 'rgba(255,220,170,0.08)'; g.lineWidth = 0.8 + Rg() * 1.8; g.beginPath(); for (let x = 0; x <= w; x += 8) { const y = y0 + Math.sin(x * f + phs) * a + Math.sin(x * f * 3.1) * a * 0.3; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } }
        if (model.gloss) { const gl = g.createLinearGradient(0, 0, 0, hh * 0.45); gl.addColorStop(0, 'rgba(255,255,255,0.32)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(0, 0, w, hh * 0.45); g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(w * 0.22, hh * 0.06, w * 0.18, 9, -0.08, 0, TAU); g.fill(); }
        const sh = g.createLinearGradient(0, hh * 0.6, 0, hh); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.28)'); g.fillStyle = sh; g.fillRect(0, 0, w, hh);
        g.restore();
        g.lineWidth = 2; g.strokeStyle = 'rgba(0,0,0,0.45)'; bodyPath(g, w, hh, rad); g.stroke();
        g.save(); g.translate(1.5, 1.5); g.scale((w - 3) / w, (hh - 3) / hh); g.lineWidth = 1.6; g.strokeStyle = 'rgba(255,255,255,0.22)'; bodyPath(g, w, hh, rad); g.stroke(); g.restore();
        // dial bezel and face
        const D = { x: lx(R.dial.x), y: ly(R.dial.y), w: R.dial.w, h: R.dial.h };
        const tg = g.createLinearGradient(0, D.y - 8, 0, D.y + D.h + 8); tg.addColorStop(0, model.trim[0]); tg.addColorStop(1, model.trim[1]);
        g.fillStyle = 'rgba(0,0,0,0.35)'; rr(g, D.x - 7, D.y - 5, D.w + 14, D.h + 14, 16); g.fill();
        g.fillStyle = tg; rr(g, D.x - 8, D.y - 8, D.w + 16, D.h + 16, 16); g.fill();
        g.fillStyle = shade(model.face, model.darkFace ? -0.2 : -0.25); rr(g, D.x - 2, D.y - 2, D.w + 4, D.h + 4, 11); g.fill();
        g.fillStyle = model.face; rr(g, D.x, D.y, D.w, D.h, 10); g.fill();
        // magic eye socket
        const E = { x: lx(R.eye.x), y: ly(R.eye.y), r: R.eye.r };
        g.fillStyle = tg; g.beginPath(); g.arc(E.x, E.y, E.r + 5, 0, TAU); g.fill(); g.fillStyle = '#0b0f0c'; g.beginPath(); g.arc(E.x, E.y, E.r + 1, 0, TAU); g.fill();
        // brand plate either side of the eye
        g.font = '400 ' + (M.phone ? 18 : 23) + 'px "Poiret One", "Josefin Sans", Futura, "Century Gothic", sans-serif'; g.textBaseline = 'middle';
        g.fillStyle = model.darkFace ? '#dfe7f5' : (model.key === 'walnut' ? '#f3d98c' : shade(model.body[1], -0.35));
        g.textAlign = 'right'; g.fillText(model.brand.toUpperCase(), E.x - E.r - 14, E.y + 1);
        g.textAlign = 'left'; g.font = '700 12px "Josefin Sans", Futura, "Century Gothic", sans-serif'; g.fillText('BROADCAST', E.x + E.r + 14, E.y + 1);
        // grille: frame, cloth, pattern
        const G = { x: lx(R.grille.x), y: ly(R.grille.y), w: R.grille.w, h: R.grille.h };
        g.fillStyle = tg; rr(g, G.x - 6, G.y - 6, G.w + 12, G.h + 12, 18); g.fill();
        g.fillStyle = model.cloth; rr(g, G.x, G.y, G.w, G.h, 13); g.fill();
        g.save(); rr(g, G.x, G.y, G.w, G.h, 13); g.clip();
        g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1; for (let i = -G.h; i < G.w; i += 4) { g.beginPath(); g.moveTo(G.x + i, G.y); g.lineTo(G.x + i + G.h, G.y + G.h); g.stroke(); }
        g.strokeStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < G.w + G.h; i += 4) { g.beginPath(); g.moveTo(G.x + i, G.y); g.lineTo(G.x + i - G.h, G.y + G.h); g.stroke(); }
        const pat = model.grille;
        if (pat === 'slats') { const n = Math.round(G.w / 26); for (let i = 1; i < n; i++) { const x = G.x + i * G.w / n; const sg = g.createLinearGradient(x - 5, 0, x + 5, 0); sg.addColorStop(0, shade(model.body[0], -0.2)); sg.addColorStop(0.5, shade(model.body[0], 0.12)); sg.addColorStop(1, shade(model.body[1], -0.1)); g.fillStyle = sg; g.fillRect(x - 5, G.y, 10, G.h); } }
        if (pat === 'bars') { const n = Math.max(3, Math.round(G.h / 18)); for (let i = 1; i < n; i++) { const y = G.y + i * G.h / n; const bgd = g.createLinearGradient(0, y - 3, 0, y + 3); bgd.addColorStop(0, '#ffffff'); bgd.addColorStop(1, '#8e979f'); g.fillStyle = bgd; g.fillRect(G.x, y - 2.5, G.w, 5); } }
        if (pat === 'lattice') { g.strokeStyle = shade(model.trim[1], -0.1); g.lineWidth = 3.5; for (let i = -G.h; i < G.w + G.h; i += 30) { g.beginPath(); g.moveTo(G.x + i, G.y); g.lineTo(G.x + i + G.h, G.y + G.h); g.moveTo(G.x + i + G.h, G.y); g.lineTo(G.x + i, G.y + G.h); g.stroke(); } }
        if (pat === 'dots') { g.fillStyle = 'rgba(0,0,0,0.55)'; for (let y = G.y + 10; y < G.y + G.h - 4; y += 12) for (let x = G.x + 10 + ((y / 12) % 2) * 6; x < G.x + G.w - 4; x += 12) { g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); } }
        const vg = g.createRadialGradient(G.x + G.w / 2, G.y + G.h / 2, 10, G.x + G.w / 2, G.y + G.h / 2, Math.max(G.w, G.h) * 0.7); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.3)'); g.fillStyle = vg; g.fillRect(G.x, G.y, G.w, G.h);
        g.restore();
        // control panel
        const Pn = { x: lx(R.panel.x), y: ly(R.panel.y), w: R.panel.w, h: R.panel.h };
        g.fillStyle = 'rgba(0,0,0,0.25)'; rr(g, Pn.x, Pn.y + 2, Pn.w, Pn.h, 18); g.fill();
        g.fillStyle = model.panel; rr(g, Pn.x, Pn.y, Pn.w, Pn.h - 2, 18); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1.2; rr(g, Pn.x + 0.5, Pn.y + 0.5, Pn.w - 1, Pn.h - 3, 18); g.stroke();
        // alarm scale around the small knob (open at the bottom), tuning ticks around the big knob (open under its label)
        const V = { x: lx(R.vol.x), y: ly(R.vol.y), r: R.vol.r }, T = { x: lx(R.tune.x), y: ly(R.tune.y), r: R.tune.r };
        g.strokeStyle = rgba(model.panelInk, 0.8); g.lineWidth = 1.6;
        for (let i = 0; i <= 10; i++) { const a = -Math.PI * 1.25 + i / 10 * Math.PI * 1.5, r1 = V.r + 4, r2 = V.r + (i % 5 ? 8 : 11); g.beginPath(); g.moveTo(V.x + Math.cos(a) * r1, V.y + Math.sin(a) * r1); g.lineTo(V.x + Math.cos(a) * r2, V.y + Math.sin(a) * r2); g.stroke(); }
        g.globalAlpha = 0.7;
        for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; if (Math.abs(wrapA(a - Math.PI / 2)) < 0.62) continue; const r1 = T.r + 5, r2 = T.r + (i % 4 ? 8 : 12); g.beginPath(); g.moveTo(T.x + Math.cos(a) * r1, T.y + Math.sin(a) * r1); g.lineTo(T.x + Math.cos(a) * r2, T.y + Math.sin(a) * r2); g.stroke(); }
        g.globalAlpha = 1;
        [V, T].forEach(k => { g.fillStyle = 'rgba(0,0,0,0.42)'; g.beginPath(); g.ellipse(k.x + 3, k.y + 6, k.r + 3, k.r + 2, 0, 0, TAU); g.fill(); });
        return { c, pad };
      }
      function paintScale(dpr) {
        const D = R.dial, c = mk(D.w * dpr, D.h * dpr), g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const ink = model.ink, x0 = 16, span = D.w - 32, yl = Math.round(D.h * 0.5) - 2;
        g.strokeStyle = rgba(ink, 0.75); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, yl); g.lineTo(x0 + span, yl); g.stroke();
        for (let i = 0; i <= 50; i++) { const x = x0 + i / 50 * span, big = i % 5 === 0; g.lineWidth = big ? 1.6 : 1; g.beginPath(); g.moveTo(x, yl); g.lineTo(x, yl - (big ? 12 : 6)); g.stroke(); }
        g.fillStyle = rgba(ink, 0.85); g.font = '700 12px "Josefin Sans", Futura, "Century Gothic", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'top';
        const nums = M.phone ? [0, 0.2, 0.4, 0.6, 0.8, 1] : [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
        nums.forEach(f => g.fillText(String(Math.round((530 + f * 1070) / 10) * 10), clamp(x0 + f * span, 16, D.w - 16), yl + 4));
        BAND.forEach(b => { const x = x0 + b.pos * span; g.fillStyle = b.kind === 'danger' ? '#d5281b' : b.kind === 'care' ? '#2f9e6e' : rgba(ink, b.kind === 'decoy' ? 0.5 : 0.85); g.beginPath(); g.moveTo(x, yl - 14); g.lineTo(x + 4, yl - 18); g.lineTo(x, yl - 22); g.lineTo(x - 4, yl - 18); g.closePath(); g.fill(); });
        return c;
      }
      function paintGlass(dpr) {
        const D = R.dial, c = mk(D.w * dpr, D.h * dpr), g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const gs = g.createLinearGradient(0, 0, 0, D.h); gs.addColorStop(0, 'rgba(255,255,255,0.24)'); gs.addColorStop(0.45, 'rgba(255,255,255,0.03)'); gs.addColorStop(1, 'rgba(255,255,255,0.08)');
        g.fillStyle = gs; g.fillRect(0, 0, D.w, D.h);
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.moveTo(D.w * 0.08, 0); g.lineTo(D.w * 0.2, 0); g.lineTo(D.w * 0.1, D.h); g.lineTo(D.w * 0.02, D.h); g.closePath(); g.fill();
        return c;
      }
      function paintKnob(r, dpr, big) {
        const s = Math.ceil(r * 2.3), c = mk(s * dpr, s * dpr), g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, s / 2 * dpr, s / 2 * dpr);
        const k0 = model.knob[0], k1 = model.knob[1];
        const sk = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r * 1.05); sk.addColorStop(0, shade(k0, 0.12)); sk.addColorStop(1, k1);
        g.fillStyle = sk; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
        const n = big ? 40 : 26; g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = big ? 2.4 : 1.8;
        for (let i = 0; i < n; i++) { const a = i / n * TAU; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86); g.lineTo(Math.cos(a) * r * 0.99, Math.sin(a) * r * 0.99); g.stroke(); }
        const cp = g.createRadialGradient(-r * 0.2, -r * 0.25, 2, 0, 0, r * 0.72); cp.addColorStop(0, shade(k0, 0.25)); cp.addColorStop(1, shade(k1, 0.08));
        g.fillStyle = cp; g.beginPath(); g.arc(0, 0, r * 0.74, 0, TAU); g.fill();
        g.strokeStyle = model.cap; g.lineWidth = big ? 3 : 2.4; g.beginPath(); g.arc(0, 0, r * 0.74, 0, TAU); g.stroke();
        g.strokeStyle = big ? '#e0402f' : model.knobInk; g.lineWidth = big ? 4.5 : 3.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -r * (big ? 0.28 : 0.2)); g.lineTo(0, -r * 0.68); g.stroke();
        if (big) { g.fillStyle = 'rgba(0,0,0,0.18)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(Math.cos(i * 2.1 + 0.5) * r * 0.42, Math.sin(i * 2.1 + 0.5) * r * 0.42, r * 0.09, 0, TAU); g.fill(); } }
        return { c, s };
      }
      function paintKnobHi(r, dpr) {
        const s = Math.ceil(r * 2.3), c = mk(s * dpr, s * dpr), g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, s / 2 * dpr, s / 2 * dpr);
        const hi = g.createRadialGradient(-r * 0.35, -r * 0.45, 0, -r * 0.35, -r * 0.45, r * 0.9); hi.addColorStop(0, 'rgba(255,255,255,0.5)'); hi.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = hi; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, r - 1, Math.PI * 1.05, Math.PI * 1.6); g.stroke();
        return { c, s };
      }
      function paintRoom(warm) {
        const W = M.w, H = M.h, dpr = cv.dpr || 1, c = mk(W * dpr, H * dpr), g = c.getContext('2d', { alpha: false }); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const bright = S.scene() === 'bright', C = PAL[(bright ? 'b' : 'd') + (warm ? 'w' : 'c')];
        const wg = g.createLinearGradient(0, 0, 0, H); wg.addColorStop(0, C.wall[0]); wg.addColorStop(1, C.wall[1]); g.fillStyle = wg; g.fillRect(0, 0, W, H);
        // wallpaper: soft vertical stripes with a small motif
        g.globalAlpha = C.sa; g.fillStyle = C.stripe;
        for (let x = 0; x < W; x += 34) g.fillRect(x, 0, 12, R.table);
        g.globalAlpha = C.sa * 1.4; for (let y = 20; y < R.table; y += 46) for (let x = 23 + ((y / 46) % 2) * 17; x < W; x += 34) { g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill(); }
        g.globalAlpha = 1;
        // window with the moon and a framed picture (desktop)
        const win = M.phone ? null : { x: Math.max(30, R.radio.x - 250), y: 120, w: 170, h: 230 };
        if (win) {
          g.fillStyle = C.frame; rr(g, win.x, win.y, win.w, win.h, 8); g.fill();
          const sky = g.createLinearGradient(0, win.y, 0, win.y + win.h); sky.addColorStop(0, C.sky[0]); sky.addColorStop(1, C.sky[1]); g.fillStyle = sky; rr(g, win.x + 8, win.y + 8, win.w - 16, win.h - 16, 4); g.fill();
          g.fillStyle = '#fff6dc'; for (let i = 0; i < C.stars; i++) { const sx = win.x + 14 + (i * 53 % (win.w - 28)), sy = win.y + 14 + (i * 37 % (win.h * 0.6)); g.globalAlpha = 0.5 + (i % 3) * 0.15; g.fillRect(sx, sy, 1.6, 1.6); } g.globalAlpha = 1;
          const mx = win.x + win.w * 0.62, my = win.y + win.h * 0.3, mg = g.createRadialGradient(mx, my, 4, mx, my, 60); mg.addColorStop(0, 'rgba(255,248,220,0.6)'); mg.addColorStop(1, 'rgba(255,248,220,0)'); g.fillStyle = mg; g.fillRect(mx - 60, my - 60, 120, 120);
          g.fillStyle = '#fff4d6'; g.beginPath(); g.arc(mx, my, 16, 0, TAU); g.fill(); g.fillStyle = C.sky[0]; g.beginPath(); g.arc(mx + 7, my - 5, 14, 0, TAU); g.fill();
          g.fillStyle = C.mull; g.fillRect(win.x + win.w / 2 - 3, win.y + 8, 6, win.h - 16); g.fillRect(win.x + 8, win.y + win.h / 2 - 3, win.w - 16, 6);
          g.fillStyle = C.curtain; g.beginPath(); g.moveTo(win.x - 18, win.y - 12); g.quadraticCurveTo(win.x + 30, win.y + win.h * 0.5, win.x + 8, win.y + win.h + 30); g.lineTo(win.x - 18, win.y + win.h + 30); g.closePath(); g.fill();
          g.beginPath(); g.moveTo(win.x + win.w + 18, win.y - 12); g.quadraticCurveTo(win.x + win.w - 30, win.y + win.h * 0.5, win.x + win.w - 8, win.y + win.h + 30); g.lineTo(win.x + win.w + 18, win.y + win.h + 30); g.closePath(); g.fill();
          const fx2 = Math.min(W - 200, R.radio.x + R.radio.w + 70), fy = 150;
          g.fillStyle = shade(C.table[1], -0.15); rr(g, fx2, fy, 120, 150, 6); g.fill(); g.fillStyle = C.pic; rr(g, fx2 + 10, fy + 10, 100, 130, 3); g.fill();
          g.strokeStyle = C.picLine; g.lineWidth = 3; g.beginPath(); g.moveTo(fx2 + 18, fy + 120); g.quadraticCurveTo(fx2 + 50, fy + 60, fx2 + 70, fy + 90); g.quadraticCurveTo(fx2 + 85, fy + 110, fx2 + 102, fy + 40); g.stroke();
        }
        // bedside table
        const ty = R.table, tx0 = M.phone ? 0 : R.radio.x - 60, tx1 = M.phone ? W : R.radio.x + R.radio.w + 60;
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(tx0, ty + 18, tx1 - tx0, 10);
        const tt = g.createLinearGradient(0, ty, 0, ty + 22); tt.addColorStop(0, C.table[0]); tt.addColorStop(1, C.table[1]);
        g.fillStyle = tt; rr(g, tx0, ty, tx1 - tx0, 22, 6); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(tx0 + 6, ty + 2, tx1 - tx0 - 12, 2);
        const fy0 = ty + 22, fh = M.phone ? 90 : 120, fxa = M.phone ? W * 0.3 : R.radio.x - 20, fxb = M.phone ? W * 0.92 : R.radio.x + R.radio.w + 20;
        g.fillStyle = C.drawer; g.fillRect(fxa, fy0, fxb - fxa, fh);
        g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2; g.strokeRect(fxa + 12, fy0 + 12, fxb - fxa - 24, fh * 0.42);
        g.fillStyle = '#d8b45a'; g.beginPath(); g.arc((fxa + fxb) / 2, fy0 + 12 + fh * 0.21, 5, 0, TAU); g.fill();
        // the floor and the bed (Sync's pillow sits bottom left)
        g.fillStyle = C.floor; g.fillRect(0, fy0 + fh, W, H - fy0 - fh);
        g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 1; for (let y = fy0 + fh + 14; y < H; y += 18) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
        const bw = M.phone ? W * 0.62 : Math.max(300, R.radio.x - 20), by = H - (M.phone ? 112 : 138);
        g.fillStyle = C.bed; rr(g, -20, by, bw + 20, H - by + 20, 22); g.fill();
        g.strokeStyle = C.bedLine; g.lineWidth = 2; for (let x = 16; x < bw; x += 34) { g.beginPath(); g.moveTo(x, by + 8); g.lineTo(x, H); g.stroke(); } for (let y = by + 30; y < H; y += 34) { g.beginPath(); g.moveTo(0, y); g.lineTo(bw, y); g.stroke(); }
        g.fillStyle = C.pillow; rr(g, 2, by - 26, M.phone ? 112 : 150, 52, 22); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.1)'; rr(g, 8, by - 4, M.phone ? 100 : 138, 22, 12); g.fill();
        // the lamp: off at night, glowing when the room warms
        // (on a phone the lamp stands just off the right edge: only its light shows)
        const lxp = M.phone ? W + 30 : Math.min(W - 70, R.radio.x + R.radio.w + 110), lyb = M.phone ? R.table + 40 : ty;
        if (!M.phone) {
          g.fillStyle = shade(C.table[1], -0.2); g.fillRect(lxp - 3, lyb - 70, 6, 70); g.fillRect(lxp - 22, lyb - 6, 44, 6);
          g.fillStyle = C.shade; g.beginPath(); g.moveTo(lxp - 26, lyb - 70); g.lineTo(lxp + 26, lyb - 70); g.lineTo(lxp + 16, lyb - 110); g.lineTo(lxp - 16, lyb - 110); g.closePath(); g.fill();
        }
        if (C.lamp) { g.globalCompositeOperation = 'lighter'; const lg = g.createRadialGradient(lxp, lyb - 80, 4, lxp, lyb - 80, Math.max(W, H) * 0.7); lg.addColorStop(0, 'rgba(255,200,120,' + C.lamp + ')'); lg.addColorStop(0.3, 'rgba(255,170,90,' + (C.lamp * 0.33).toFixed(3) + ')'); lg.addColorStop(1, 'rgba(255,150,80,0)'); g.fillStyle = lg; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
        // visits: a plant on the table, then a sleepy cat on the bed
        if (visits >= 1 && !M.phone) { const px = R.radio.x - 40, pyy = ty; g.fillStyle = '#b0603a'; rr(g, px - 16, pyy - 30, 32, 30, 5); g.fill(); g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(px - 16, pyy - 30, 32, 5); g.fillStyle = C.leaf; for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(px + Math.cos(i * 0.9 - 2.4) * 14, pyy - 40 + Math.sin(i * 0.9 - 2.4) * 10, 10, 4, i * 0.9 - 2.4, 0, TAU); g.fill(); } }
        if (visits >= 2) drawCat(g, M.phone ? W * 0.46 : bw * 0.66, H - 30, C.cat);
        // the radio's own glow on the wall (baked here: it barely changes once the set is on)
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = (warm ? 0.4 : 0.27) * (bright ? 0.5 : 1);
        g.drawImage(warm ? spr.gold : spr.amber, R.radio.x - R.radio.w * 0.3, R.radio.y - R.radio.h * 0.25, R.radio.w * 1.6, R.radio.h * 1.2);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        // vignette
        const v = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.45, Math.max(W, H) * 0.8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, C.vig); g.fillStyle = v; g.fillRect(0, 0, W, H);
        return c;
      }
      function drawCat(g, x, y, col) {
        // a curled-up cat, asleep: body, tucked head with ears, a tail wrapped round
        g.fillStyle = col; g.beginPath(); g.ellipse(x, y, 36, 19, 0, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(x - 26, y - 7, 15, 12, -0.2, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(x - 38, y - 12); g.lineTo(x - 37, y - 27); g.lineTo(x - 29, y - 17); g.closePath(); g.moveTo(x - 25, y - 18); g.lineTo(x - 18, y - 28); g.lineTo(x - 15, y - 15); g.closePath(); g.fill();
        g.strokeStyle = col; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + 30, y + 8); g.quadraticCurveTo(x + 10, y + 22, x - 18, y + 12); g.stroke(); g.lineCap = 'butt';
        g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.ellipse(x + 4, y - 9, 22, 6, -0.1, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1.6; g.beginPath(); g.arc(x - 31, y - 7, 3, 0.25, Math.PI - 0.25); g.moveTo(x - 19, y - 8); g.arc(x - 22, y - 8, 3, 0.25, Math.PI - 0.25); g.stroke();
      }
      function ensureBg() { const key = M.w + 'x' + M.h + ':' + (cv.dpr || 1) + ':' + S.scene(); if (bg.key === key) return; bg.key = key; bg.cold = paintRoom(false); bg.warm = paintRoom(true); bgMix.key = ''; }

      /* ---------------- the radio's own audio chain: static, stations and voices through a little speaker ---------------- */
      const RA = { ok: false };
      function buildAudio() {
        if (RA.ok || !A.ctx || !A.bus || !A.bus('music')) return;
        const ac = A.ctx; RA.ok = true; RA.ac = ac;
        const mkG = (v) => { const gn = ac.createGain(); gn.gain.value = v; return gn; };
        RA.in = mkG(1); RA.hp = ac.createBiquadFilter(); RA.hp.type = 'highpass'; RA.hp.frequency.value = 300; RA.hp.Q.value = 0.7;
        RA.lp = ac.createBiquadFilter(); RA.lp.type = 'lowpass'; RA.lp.frequency.value = 2400; RA.lp.Q.value = 1.1;
        RA.sh = ac.createWaveShaper(); const n = 1024, cur = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; cur[i] = Math.tanh(3.2 * x) / Math.tanh(3.2); } RA.sh.curve = cur;
        RA.dry = mkG(0.7); RA.wet = mkG(0.35); RA.out = mkG(0.0001);
        RA.in.connect(RA.hp); RA.hp.connect(RA.lp); RA.lp.connect(RA.dry); RA.lp.connect(RA.sh); RA.sh.connect(RA.wet); RA.dry.connect(RA.out); RA.wet.connect(RA.out); RA.out.connect(A.bus('music'));
        const len = Math.floor(ac.sampleRate * 2.2), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        RA.st = ac.createBufferSource(); RA.st.buffer = buf; RA.st.loop = true;
        RA.stF = ac.createBiquadFilter(); RA.stF.type = 'bandpass'; RA.stF.frequency.value = 2200; RA.stF.Q.value = 0.55; RA.stG = mkG(0.0001);
        RA.st.connect(RA.stF); RA.stF.connect(RA.stG); RA.stG.connect(RA.in); RA.st.start();
        RA.hum = ac.createOscillator(); RA.hum.frequency.value = 100; RA.humG = mkG(0.0001); RA.hum.connect(RA.humG); RA.humG.connect(RA.in); RA.hum.start();
        RA.g = {}; BAND.forEach(b => { RA.g[b.key] = mkG(0.0001); RA.g[b.key].connect(RA.in); }); RA.g.okay = mkG(0.0001); RA.g.okay.connect(RA.in);
        RA.air = ac.createBufferSource(); RA.air.buffer = buf; RA.air.loop = true; RA.airF = ac.createBiquadFilter(); RA.airF.type = 'bandpass'; RA.airF.frequency.value = 500; RA.airF.Q.value = 0.9; RA.airG = mkG(0.0001);
        RA.air.connect(RA.airF); RA.airF.connect(RA.airG); RA.airG.connect(A.bus('sfx')); RA.air.start(0, 0.7);
        S.onDestroy(() => { [RA.st, RA.hum, RA.air].forEach(x => { try { x.stop(); } catch (e) { /* stopped */ } }); });
      }
      buildAudio(); S.on('audio-ready', buildAudio);
      function note(dest, o) {
        if (!RA.ok) return;
        const ac = RA.ac, t = Math.max(o.t, ac.currentTime), osc = ac.createOscillator(), g = ac.createGain();
        osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t); if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || o.dur));
        if (o.detune) osc.detune.value = o.detune;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.vol), t + (o.attack || 0.008)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
        let nd = osc; if (o.lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); nd = f; }
        nd.connect(g); g.connect(dest); osc.start(t); osc.stop(t + o.dur + 0.05);
        osc.onended = () => { try { g.disconnect(); } catch (e) { /* gone */ } };
      }
      function ep(dest, t, f, v, dur) { note(dest, { t, f, dur: dur || 1.6, vol: v, type: 'sine', attack: 0.006 }); note(dest, { t, f: f * 2, dur: (dur || 1.6) * 0.5, vol: v * 0.32, type: 'sine', attack: 0.004 }); note(dest, { t, f: f * 3.01, dur: 0.25, vol: v * 0.12, type: 'triangle' }); }
      function syllable(dest, t, base, harsh) {
        if (!RA.ok) return;
        const ac = RA.ac, osc = ac.createOscillator(), f1 = ac.createBiquadFilter(), f2 = ac.createBiquadFilter(), g = ac.createGain();
        const dur = harsh ? 0.06 + Math.random() * 0.05 : 0.1 + Math.random() * 0.08, v = harsh ? 0.34 : 0.3, p = base * (0.86 + Math.random() * 0.32);
        osc.type = harsh ? 'sawtooth' : 'triangle'; osc.frequency.setValueAtTime(p, t); osc.frequency.linearRampToValueAtTime(p * (0.9 + Math.random() * 0.2), t + dur);
        f1.type = 'bandpass'; f1.frequency.value = 450 + Math.random() * 450; f1.Q.value = 5; f2.type = 'bandpass'; f2.frequency.value = 1100 + Math.random() * 1300; f2.Q.value = 7;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.014); g.gain.setValueAtTime(v, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(f1); osc.connect(f2); f1.connect(g); f2.connect(g); g.connect(dest); osc.start(t); osc.stop(t + dur + 0.05);
        osc.onended = () => { try { g.disconnect(); } catch (e) { /* gone */ } };
      }
      function speak(key, str, harsh) {
        if (!RA.ok || !RA.g[key]) return;
        const nSyl = Math.min(36, Math.round(str.length / (harsh ? 3 : 4.2)));
        let t = RA.ac.currentTime + 0.06; const gap = harsh ? 0.092 : 0.15;
        for (let i = 0; i < nSyl; i++) { syllable(RA.g[key], t, harsh ? 240 : 150, harsh); t += gap * (0.8 + Math.random() * 0.5) + (i % 6 === 5 ? gap * 1.3 : 0); }
      }
      /* station programs, scheduled ahead on the audio clock and only while they can be heard; the body's heartbeat plays
         in the room (not through the radio) and slows as the night goes well */
      const PR = { danger: { bpm: 140 }, coffee: { bpm: 112 }, tired: { bpm: 54 }, news: { bpm: 96 }, target: { bpm: 72 }, care: { bpm: 60 }, okay: { bpm: 84 }, pulse: { bpm: HR0 } };
      Object.keys(PR).forEach(k => { PR[k].next = 0; PR[k].i = 0; });
      const LUBS = [];
      const KEYS = [['D4', ['F#4', 'A4', 'D5']], ['B3', ['D4', 'F#4', 'B4']], ['G3', ['B3', 'D4', 'G4']], ['A3', ['C#4', 'E4', 'A4']]];
      const nf = (n) => A.note(n);
      function programs() {
        if (!RA.ok) return;
        const ac = RA.ac, ahead = ac.currentTime + 0.25;
        const run = (k, dest, live, fn) => { const p = PR[k]; if (!live) { p.next = 0; return; } if (!p.next || p.next < ac.currentTime - 0.1) p.next = ac.currentTime + 0.05; while (p.next < ahead) { fn(p.next, p.i, dest); p.i++; p.next += 60 / p.bpm / (k === 'coffee' ? 2 : 1); } };
        const lv = (key) => (st.str[key] || 0);
        PR.pulse.bpm = st.hr;
        run('pulse', null, st.hrV > 0.02 && st.power > 0.2, (t) => {
          const v = st.hrV; LUBS.push(t); if (LUBS.length > 6) LUBS.shift();
          A.tone({ when: t, type: 'sine', freq: 64, to: 44, glide: 0.11, dur: 0.2, vol: 0.32 * v, attack: 0.004 });
          A.tone({ when: t, type: 'triangle', freq: 128, to: 86, glide: 0.08, dur: 0.1, vol: 0.07 * v, attack: 0.003, lp: 420 });
          const dub = t + Math.min(0.22, 0.32 * 60 / st.hr);
          A.tone({ when: dub, type: 'sine', freq: 58, to: 42, glide: 0.1, dur: 0.17, vol: 0.2 * v, attack: 0.004 });
        });
        run('danger', RA.g.danger, lv('danger') * st.alarm > 0.02 && st.power > 0.3, (t, i, dest) => {
          note(dest, { t, f: 1500, dur: 0.035, vol: 0.13, type: 'square', lp: 3200 });
          if (i % 8 === 0) { note(dest, { t, f: 880, dur: 0.22, vol: 0.13, type: 'square', lp: 2400 }); note(dest, { t: t + 0.22, f: 660, dur: 0.22, vol: 0.13, type: 'square', lp: 2400 }); }
          if (i % 16 === 8) note(dest, { t, f: 220, to: 180, dur: 0.6, vol: 0.12, type: 'sawtooth', lp: 1200 });
        });
        run('coffee', RA.g.coffee, lv('coffee') > 0.02, (t, i, dest) => { const sc = ['A4', 'C5', 'E5', 'G5', 'D5', 'B4']; note(dest, { t, f: nf(sc[(i * 3) % sc.length]), dur: 0.22, vol: 0.2, type: 'triangle' }); if (i % 4 === 0) note(dest, { t, f: nf('A3'), dur: 0.3, vol: 0.3, type: 'triangle' }); });
        run('tired', RA.g.tired, lv('tired') > 0.02, (t, i, dest) => { ['C4', 'G4', 'E5'].forEach((n2, j) => note(dest, { t: t + j * 0.08, f: nf(n2), dur: 2.4, vol: 0.12, type: 'sine', attack: 0.4 })); if (i % 3 === 1) note(dest, { t: t + 0.3, f: nf('G4'), to: nf('D4'), glide: 1.2, dur: 1.4, vol: 0.08, type: 'triangle' }); });
        if (byKey.news) run('news', RA.g.news, lv('news') > 0.02, (t, i, dest) => { const b = i % 8; if (b < 5) note(dest, { t, f: 1000, dur: b === 4 ? 0.45 : 0.09, vol: 0.14, type: 'sine', attack: 0.004 }); if (b === 6) speak('news', 'Breaking news tonight', false); });
        const tk = 't' + Math.max(0, st.round), tl = st.locked ? 1 : lv(tk);
        run('target', RA.g[tk], tl > 0.02 && st.round >= 0 && byKey[tk], (t, i, dest) => {
          const bar = Math.floor(i / 4), [root, ch] = KEYS[bar % 4], b = i % 4;
          if (b === 0) { note(dest, { t, f: nf(root) / 2, dur: 1.6, vol: 0.32, type: 'sine', attack: 0.01 }); ch.forEach((n2, j) => ep(dest, t + j * 0.012, nf(n2), 0.1)); }
          if (b === 2) ep(dest, t, nf(ch[1]), 0.07, 1.0);
          if (st.locked && (b === 1 || b === 3)) ep(dest, t, nf(ch[(i * 7) % 3]) * 2, 0.05, 0.8);
        });
        run('care', RA.g.care, lv('care') > 0.02 || st.careUntil > now(), (t, i, dest) => { if (i % 2 === 0) ['E5', 'B5'].forEach((n2, j) => note(dest, { t: t + j * 0.18, f: nf(n2), dur: 1.4, vol: 0.12, type: 'sine' })); note(dest, { t, f: nf('E3'), dur: 1.0, vol: 0.18, type: 'sine', attack: 0.05 }); });
        run('okay', RA.g.okay, st.phase === 'volume' || st.phase === 'song' || st.phase === 'end', (t, i, dest) => {
          const bar = Math.floor(i / 4), b = i % 4, prog = [['C3', ['E4', 'G4', 'C5']], ['A2', ['E4', 'A4', 'C5']], ['F2', ['F4', 'A4', 'C5']], ['G2', ['D4', 'G4', 'B4']]], [root, ch] = prog[bar % 4], v = st.vol;
          if (v > 0.08) note(dest, { t, f: nf(root), dur: 0.5, vol: 0.34 * Math.min(1, v * 2), type: 'triangle', lp: 900 });
          if (v > 0.08 && b === 2) note(dest, { t, f: nf(root) * 1.5, dur: 0.4, vol: 0.22 * Math.min(1, v * 2), type: 'triangle', lp: 900 });
          if (v > 0.3 && (b === 0 || b === 2)) ch.forEach((n2, j) => ep(dest, t + j * 0.01, nf(n2), 0.08));
          if (v > 0.55) { const mel = ['E5', 'G5', 'A5', 'G5', 'C6', 'A5', 'G5', 'E5', 'D5', 'E5', 'G5', 'E5', 'D5', 'C5', 'D5', 'E5']; ep(dest, t, nf(mel[i % 16]), 0.09, 0.9); }
          if (v > 0.8) { A.kick(t, 0.18 * v); if (b === 1 || b === 3) A.brush(t, 0.05, 0.16); A.shaker(t + 30 / PR.okay.bpm, 0.025); }
        });
      }
      function sClick(v) { if (!A.ctx) return; const tn = now(); if (tn - TUN.lastClick < 26) return; TUN.lastClick = tn; A.click({ vol: v || 0.05 }); A.tone({ type: 'sine', freq: 2400, dur: 0.012, vol: 0.012 }); }
      function sClunk() { if (!A.ctx) return; A.wood(undefined, 0.22, 0.55); A.thud({ vol: 0.22 }); }
      function sScreech() { if (!A.ctx) return; A.tone({ type: 'sawtooth', freq: 2200, to: 300, glide: 0.7, dur: 0.75, vol: 0.05, lp: 3000 }); A.noise({ filter: 'bandpass', freq: 3000, to: 600, q: 1.2, dur: 0.7, vol: 0.1 }); }

      /* ---------------- tuning: drag around the dial, detents, flywheel, AFC ---------------- */
      const TURNS = 2.3, DET = TAU / 48;
      function setF(f) { st.f = clamp(f, 0, 1); tuneHit.setAttribute('aria-valuenow', String(Math.round(st.f * 100))); }
      function turn(da) {
        let f = st.f + da / (TAU * TURNS);
        if (f <= 0 || f >= 1) { if ((f <= 0 && st.f > 0) || (f >= 1 && st.f < 1)) { sClunk(); } f = clamp(f, 0, 1); da = (f - st.f) * TAU * TURNS; TUN.vel *= -0.25; }
        setF(f); TUN.ang += da;
        const d = Math.floor(TUN.ang / DET); if (d !== TUN.detent) { TUN.detent = d; sClick(Math.abs(TUN.vel) > 6 ? 0.03 : 0.055); }
      }
      function tuneAdvance(da, tN) {
        TUN.cum += da; TUN.hist.push({ t: tN, a: TUN.cum }); while (TUN.hist.length > 2 && TUN.hist[0].t < tN - 400) TUN.hist.shift();
        const s0 = TUN.hist[0], s1 = TUN.hist[TUN.hist.length - 1], span = (s1.t - s0.t) / 1000; if (span > 0.02) TUN.vel = clamp((s1.a - s0.a) / span, -14, 14);
        TUN.moveT = tN; turn(da);
      }
      K.press(tuneHit, {
        space: el,
        down: (p) => { if (!canTune()) { nudge(); return; } TUN.drag = true; TUN.hist.length = 0; TUN.vel = 0; const dx = p.x - R.tune.x, dy = p.y - R.tune.y; TUN.last = Math.hypot(dx, dy) > R.tune.r * 0.18 ? Math.atan2(dy, dx) : null; K.sfx.tap(); if (A.ctx) A.wood(undefined, 0.05, 1.6); },
        move: (p) => { if (!TUN.drag) return; const dx = p.x - R.tune.x, dy = p.y - R.tune.y; if (Math.hypot(dx, dy) < R.tune.r * 0.18) { TUN.last = null; return; } const a = Math.atan2(dy, dx); if (TUN.last != null) tuneAdvance(clamp(wrapA(a - TUN.last), -1.3, 1.3), now()); TUN.last = a; },
        up: () => { if (!TUN.drag) return; TUN.drag = false; TUN.last = null; if (now() - TUN.moveT > 120) TUN.vel = 0; }
      });
      K.onKey(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'], (e) => {
        const coarse = e.shiftKey || e.code === 'PageUp' || e.code === 'PageDown', dir = (e.code === 'ArrowRight' || e.code === 'ArrowUp' || e.code === 'PageUp') ? 1 : -1;
        if (st.phase === 'volume') { if (e.preventDefault) e.preventDefault(); A.unlock(); volTurn(dir * 0.35); return; }
        if (!canTune()) return; if (e.preventDefault) e.preventDefault(); A.unlock();
        TUN.vel = 0; TUN.moveT = now(); turn(dir * DET * (coarse ? 8 : 1));
      });
      const canTune = () => st.phase === 'tune';
      let nudgeT = 0; function nudge() { if (now() - nudgeT < 900) return; nudgeT = now(); K.sfx.soft(); }

      /* ---------------- the breath station: hold the grille in, let go out ---------------- */
      const BR = { state: 'off', t0: 0, t1: 0, k: 0, out: 0, n: 0, full: false };
      function padDown() {
        if (st.phase !== 'breathe') return;
        if (BR.state === 'out') { if (BR.out >= 0.5) { breathDone(true); if (st.phase !== 'breathe') return; } else { padText.textContent = 'Slower… keep breathing out'; return; } }
        BR.state = 'in'; BR.t0 = now(); BR.k = 0; padText.textContent = 'Breathe in…'; K.guide(null);
        if (A.ctx) { A.tone({ type: 'sine', freq: 220, to: 330, glide: IN_MS / 1000, dur: IN_MS / 1000, vol: 0.05, attack: 0.3, verb: 0.5 }); A.sync('breath-in', now()); }
      }
      function padUp() {
        if (st.phase !== 'breathe' || BR.state !== 'in') return;
        BR.k = clamp((now() - BR.t0) / IN_MS, 0, 1);
        if (BR.k < 0.6) { BR.state = 'ready'; padText.textContent = 'Hold to breathe in'; sync.say(L(LINES.short), { mood: 'think', ms: 2200 }); breathGuide(); return; }
        BR.state = 'out'; BR.t1 = now(); BR.out = 0; padText.textContent = 'Let go… breathe out slowly';
        if (A.ctx) A.tone({ type: 'sine', freq: 330, to: 196, glide: OUT_MS / 1000, dur: OUT_MS / 1000, vol: 0.05, attack: 0.2, verb: 0.5 });
      }
      K.press(pad, { down: padDown, up: padUp });
      S.listen(pad, 'keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); A.unlock(); padDown(); } });
      S.listen(pad, 'keyup', (e) => { if (e.code === 'Space' || e.code === 'Enter') padUp(); });
      let breathResolve = null;
      function breathTick() {
        if (st.phase !== 'breathe') return;
        if (BR.state === 'in') { BR.k = clamp((now() - BR.t0) / IN_MS, 0, 1); if (BR.k >= 1 && !BR.full) { BR.full = true; padText.textContent = 'Now let go…'; if (A.ctx) A.chime(A.note('A5'), { vol: 0.06, dur: 1.2 }); } }
        else BR.full = false;
        if (BR.state === 'out') { BR.out = clamp((now() - BR.t1) / OUT_MS, 0, 1); if (BR.out >= 1) breathDone(false); }
      }
      function breathDone(chain) {
        BR.n++; BR.state = chain ? 'in' : 'ready'; BR.out = 0;
        const target = Math.max(0.08, 1 - BR.n / BREATHS * 0.92), from = st.alarm;
        st.hrT = Math.max(64, st.hrT - 8);
        tween(700, k => { st.alarm = lerp(from, target, k); volHit.setAttribute('aria-valuenow', String(Math.round(st.alarm * 100))); }, ease.outCubic);
        if (A.ctx) { for (let i = 0; i < 3; i++) A.click({ when: A.now() + i * 0.07, vol: 0.06 }); A.chime(A.note(['D5', 'F#5', 'A5', 'D6'][Math.min(3, BR.n - 1)]), { vol: 0.07, dur: 1.6 }); }
        K.sfx.good(undefined, 3 + BR.n);
        P.emit('spark', R.vol.x, R.vol.y - R.arcR, 12, { colors: ['#ffe6a8', '#ffcf4d', '#8cf5c4'] });
        ctx.track('breath', { n: BR.n }); breathPill();
        sync.base(BR.n >= BREATHS ? 'calm' : 'think');
        if (BR.n === 1 && BR.n < BREATHS) sync.say(L(LINES.breath1), { mood: 'happy', ms: 2600 });
        if (BR.n >= BREATHS) { pad.hidden = true; K.guide(null); sync.say(L(LINES.breathAll), { mood: 'happy', ms: 3000 }); st.phase = 'breathed'; if (breathResolve) { const r = breathResolve; breathResolve = null; K.later(r, reduced() ? 600 : 1800); } return; }
        if (chain) { BR.t0 = now(); BR.k = 0; padText.textContent = 'Breathe in…'; }
        else { padText.textContent = 'Hold to breathe in'; breathGuide(); }
      }
      function breathPill() { pill.replaceChildren(document.createTextNode('Slow breaths ▸ '), h('b', { text: Math.min(BR.n, BREATHS) + ' of ' + BREATHS })); }
      function breathGuide() { K.guide({ id: 'breath', g: 'hold', target: pad, label: BR.n ? 'HOLD AGAIN: BREATHE IN' : 'HOLD: BREATHE IN', ms: IN_MS, delay: BR.n ? 500 : 900 }); }

      /* ---------------- the volume knob: the alarm only goes down with breaths, then Station Okay goes up ---------------- */
      function volTurn(da) {
        if (st.phase !== 'volume') return;
        const before = st.vol; st.vol = clamp(st.vol + da / (TAU * 0.7), 0, 1);
        volHit.setAttribute('aria-valuenow', String(Math.round(st.vol * 100)));
        const d0 = Math.floor(before * 20), d1 = Math.floor(st.vol * 20); if (d0 !== d1) sClick(0.05);
        if (st.vol >= 0.985) songTime();
      }
      function stuck() {
        VOL.wig = 1; nudge(); if (A.ctx) A.wood(undefined, 0.1, 0.6);
        if (!st.saidStuck && st.phase !== 'intro' && st.phase !== 'power' && st.alarm > 0.1 && st.careUntil < now()) { st.saidStuck = true; sync.say(L(LINES.stuck), { mood: 'think', ms: 3000 }); }
      }
      K.press(volHit, {
        space: el,
        down: (p) => { if (st.phase !== 'volume') { stuck(); return; } VOL.drag = true; const dx = p.x - R.vol.x, dy = p.y - R.vol.y; VOL.last = Math.hypot(dx, dy) > R.vol.r * 0.15 ? Math.atan2(dy, dx) : null; K.sfx.tap(); },
        move: (p) => { if (!VOL.drag) return; const dx = p.x - R.vol.x, dy = p.y - R.vol.y; if (Math.hypot(dx, dy) < R.vol.r * 0.15) { VOL.last = null; return; } const a = Math.atan2(dy, dx); if (VOL.last != null) volTurn(clamp(wrapA(a - VOL.last), -1.2, 1.2)); VOL.last = a; },
        up: () => { VOL.drag = false; VOL.last = null; }
      });

      /* ---------------- the care key: always on the radio (and no jokes near it) ---------------- */
      function showCare(ms, quiet) {
        st.careUntil = now() + (ms || 6500);
        cardKey = '';
        setCard('care', { station: 'Care station', freq: 'Always on', icon: '+', text: CARE_TEXT, instant: true });
        careKey.classList.add('lit');
        if (!quiet) sync.hush();
        if (A.ctx) { A.chime(A.note('E5'), { vol: 0.08, dur: 1.4 }); A.chime(A.note('B5'), { when: A.now() + 0.16, vol: 0.06, dur: 1.4 }); }
        ctx.track('care', { phase: st.phase.slice(0, 12) });
      }
      K.tap(careKey, () => { K.sfx.tap(); showCare(); });

      /* ---------------- the card follows whatever the needle is on ---------------- */
      let scrambleT = 0, lastDom = '', domSince = 0;
      const saidDecoy = {};
      const GLYPH = 'abcdefghijklmnopqrstuvwxyz·~';
      function scramble(s, k) { if (k <= 0.02) return s; let o = ''; for (let i = 0; i < s.length; i++) { const c = s[i]; o += !/[a-z]/i.test(c) || Math.random() > k ? c : GLYPH[(Math.random() * GLYPH.length) | 0]; } return o; }
      function updateCard() {
        if (st.careUntil > now()) return;
        if (st.careUntil) { st.careUntil = 0; careKey.classList.toggle('lit', care); cardKey = ''; restoreCard(); }
        if (st.phase !== 'cut' && st.phase !== 'tune') return;
        let dom = '', best = 0; BAND.forEach(b => { const v = st.str[b.key] * (b.key === 'danger' ? Math.max(0.35, st.alarm) : 1); if (v > best) { best = v; dom = b.key; } });
        if (best < 0.32) dom = 'static';
        if (dom !== lastDom) { lastDom = dom; domSince = now(); if (dom === 'care') sync.hush(); }
        const b = byKey[dom], tb = byKey['t' + st.round], sens = tb ? SENS[tb.sens] : null;
        if (dom === 'static') { setCard('static', { station: '~ Static ~', freq: freqOf(st.f), live: true, icon: '≈', text: sens ? 'Keep turning. Somewhere on this band is a better explanation for ' + sens.what + '.' : 'Keep turning.', instant: true }); return; }
        if (dom === 'danger') { setCard('danger', { station: 'Station Danger · live', freq: freqOf(st.f), live: true, icon: '!', text: sens ? sens.danger : 'Something must be wrong!', words: words[st.round] || '' }); return; }
        if (b.kind === 'decoy') { setCard('static', { station: b.name, freq: freqOf(st.f), live: true, icon: '♪', text: b.line, instant: true }); if (!saidDecoy[dom] && now() - domSince > 300 && st.phase === 'tune') { saidDecoy[dom] = 1; sync.say(L(LINES[dom]), { mood: dom === 'tired' ? 'sleepy' : 'silly', ms: 2200 }); } return; }
        if (b.kind === 'care') { setCard('care', { station: 'Care station', freq: freqOf(st.f), live: true, icon: '+', text: CARE_TEXT, instant: true }); return; }
        if (b.kind === 'target') {
          const calm = calmOf(b.sens), k = clamp(1 - st.str[dom], 0, 1);
          if (b.round !== st.round) { setCard('static', { station: 'Station ' + b.name + ' ✓', freq: freqOf(st.f), live: true, icon: '✓', text: calm, instant: true }); return; }
          const base = 'Station ' + b.name + ' · tuning in';
          if (cardKey.indexOf('static|' + base + '|') !== 0 || !curP) { scrambleT = now(); setCard('static', { station: base, freq: freqOf(st.f), live: true, icon: '♪', text: scramble(calm, Math.min(0.92, k * 1.6)), sr: 'Tuning in to Station ' + b.name, instant: true }); }
          else if (now() - scrambleT > 110) { scrambleT = now(); curP.textContent = scramble(calm, Math.min(0.92, k * 1.6)); }
          if (k < 0.5 && !st.saidClose && st.phase === 'tune') { st.saidClose = true; sync.say(L(LINES.close), { mood: 'wow', ms: 2200 }); }
        }
      }
      /* after the care card, put back what the radio was playing */
      function restoreCard() {
        const tb = byKey['t' + Math.max(0, st.round)];
        if (st.phase === 'locked' && tb) setCard('calm', { station: 'Station ' + tb.name, freq: freqOf(tb.pos), av: 'still', mood: 'music', text: calmOf(tb.sens), instant: true });
        else if ((st.phase === 'breathe' || st.phase === 'breathed') && byKey.t1) setCard('calm', { station: 'Station Slow Breath', freq: freqOf(byKey.t1.pos), av: 'still', mood: 'calm', text: L(DJ.breath), instant: true });
        else if (st.phase === 'volume') setCard('okay', { station: 'Station Okay', freq: 'All night', av: 'still', mood: 'music', text: L(DJ.okay), instant: true });
        else if (st.phase === 'song' || st.phase === 'end') setCard('okay', { station: 'Tonight’s stations', freq: 'Station Okay', av: 'still', mood: 'happy', list: stationList() });
        else if (st.phase === 'intro' || st.phase === 'power') setCard('static', { station: 'Warming up', freq: '', icon: '·', text: 'The bedside radio is warming up…', instant: true });
      }
      function stationList() { const l = st.cards.map(tb => [SENS[tb.sens].label, 'Station ' + tb.name]); if (care) l.push(['+ Care', 'Doctor or 000 if new or severe', 'care-row']); return l; }

      /* ---------------- the flow of a round: alarm cuts in, tune, lock, explain ---------------- */
      let lockResolve = null;
      async function round(r) {
        st.round = r; st.locked = false; st.lockK = 0; st.settle = 0; st.saidClose = false; TUN.overs = 0; TUN.side = 0;
        const tb = byKey['t' + r];
        BAND.forEach(b => { if (b.kind === 'target') b.el.className = 'br-lab ' + (model.darkFace ? 'dark ' : '') + (b.round < r ? 'done' : b.round === r ? 'target' : 'dim'); });
        pill.replaceChildren(document.createTextNode('Tune to ▸ '), h('b', { text: 'Station ' + tb.name }));
        st.phase = 'cut';
        if (r > 0) {
          sScreech(); const from = st.f; st.glowFlash = 1;
          sync.base('worried'); sync.say(L(st.alarm < 0.5 ? LINES.quieter : LINES.cutIn), { mood: st.alarm < 0.5 ? 'think' : 'storm', ms: 2600 });
          await tween(900, k => { setF(lerp(from, byKey.danger.pos, ease.inOutCubic(k))); }, null);
        } else { sync.base('worried'); }
        cardKey = ''; lastDom = '';
        if (st.careUntil < now()) setCard('danger', { station: 'Station Danger · live', freq: freqOf(st.f), icon: '!', text: SENS[tb.sens].danger, words: words[r] || '' });
        speak('danger', SENS[tb.sens].danger, true);
        if (!reduced() && st.alarm > 0.5) sync.react('shake');
        await K.wait(reduced() ? 900 : 2300);
        st.phase = 'tune'; TUN.t0 = now();
        if (r === 0) sync.say(L(LINES.tune), { mood: 'worried', ms: 3000 });
        if (r === 1) sync.say(L(LINES.breathIn), { mood: 'worried', ms: 3200 });
        tuneGuide();
        await new Promise(res => { lockResolve = res; });
      }
      function tuneGuide() { const tb = byKey['t' + st.round]; K.guide({ id: 'tune', g: 'circle', target: tuneHit, r: Math.round(R.tune.r * 0.78), label: st.round === 0 ? 'TURN THE DIAL' : clip('TURN TO ' + tb.name.toUpperCase(), 22), delay: 700 }); }
      function lock() {
        if (st.phase !== 'tune') return;
        const tb = byKey['t' + st.round], calm = calmOf(tb.sens);
        st.phase = 'locked'; st.locked = true; TUN.vel = 0; K.guide(null);
        const from = st.f; tween(250, k => setF(lerp(from, tb.pos, k)));
        sClunk(); K.sfx.lock(); st.glowFlash = 1; if (A.ctx) { A.chime(A.note('D6'), { vol: 0.07, dur: 1.8 }); A.noise({ filter: 'highpass', freq: 3000, to: 8000, dur: 0.5, vol: 0.05 }); }
        try { if (navigator.vibrate && !reduced()) navigator.vibrate(12); } catch (e) { /* no vibration */ }
        for (let i = 0; i < 7; i++) K.later(() => spawnNote(), i * 120);
        P.emit('spark', fx(tb.pos), R.dial.y + R.dial.h * 0.5, 14, { colors: ['#ffe6a8', '#ffcf4d', '#ffffff'] });
        tb.el.className = 'br-lab ' + (model.darkFace ? 'dark ' : '') + 'done';
        pill.replaceChildren(document.createTextNode('Tuned in ▸ '), h('b', { text: 'Station ' + tb.name }));
        st.hrT = st.round === plan.length - 1 ? 64 : Math.max(66, st.hrT - 10);
        const secs = (now() - TUN.t0) / 1000, sc = clamp(1 / (1 + 0.25 * TUN.overs), 0, 1); // smoothness only: never time spent
        st.score.push(sc); st.cards.push(tb);
        ctx.track('lock', { r: st.round + 1, overs: TUN.overs, secs: Math.round(secs) });
        cardKey = '';
        if (st.careUntil < now()) setCard('calm', { station: 'Station ' + tb.name, freq: freqOf(tb.pos), av: 'still', mood: 'music', text: calm, speed: 24 });
        speak('t' + st.round, calm, false);
        sync.base(st.round === 0 ? 'calm' : 'happy');
        sync.say(L(st.round === 0 ? LINES.locked : LINES.locked2), { mood: 'wow', ms: 3200 });
        const wait = reduced() ? 1600 : Math.min(5200, 2200 + calm.length * 26);
        K.later(() => { if (lockResolve) { const r = lockResolve; lockResolve = null; r(); } }, wait);
      }
      async function breathe() {
        st.phase = 'breathe'; BR.state = 'ready'; BR.n = 0; pad.hidden = false; padText.textContent = 'Hold to breathe in'; breathPill();
        cardKey = ''; if (st.careUntil < now()) setCard('calm', { station: 'Station Slow Breath', freq: freqOf(byKey.t1.pos), av: 'still', mood: 'calm', text: L(DJ.breath), speed: 22 });
        breathGuide();
        await new Promise(res => { breathResolve = res; });
      }
      function placeOkay() { Object.assign(st.okayEl.style, { left: (R.dial.x + R.dial.w / 2) + 'px', top: (R.dial.y + R.dial.h / 2) + 'px', color: model.darkFace ? '#e9fcff' : shade(model.glow, -0.6) }); }
      let songResolve = null;
      async function finale() {
        st.phase = 'volume'; st.vol = 0; pill.replaceChildren(document.createTextNode('Now playing ▸ '), h('b', { text: 'Station Okay' }));
        volLab.textContent = 'Volume'; volHit.setAttribute('aria-label', 'Volume knob'); volHit.setAttribute('aria-valuenow', '0');
        BAND.forEach(b => { b.el.classList.add('gone'); });
        const ok = h('div', { class: 'br-okay' }, h('span', { text: 'Station Okay' }), h('small', { text: 'On air all night' })); el.append(ok); st.okayEl = ok; placeOkay();
        const f0 = st.f; tween(900, k => setF(lerp(f0, 0.5, ease.inOutSine(k))));
        tween(1200, k => { st.okK = k; }, ease.inOutSine);
        cardKey = ''; if (st.careUntil < now()) setCard('okay', { station: 'Station Okay', freq: 'All night', av: 'still', mood: 'music', text: L(DJ.okay), speed: 22 });
        sync.say(L(LINES.okay), { mood: 'wow', ms: 3000 }); sync.base('happy');
        K.guide({ id: 'vol', g: 'circle', target: volHit, r: Math.round(R.vol.r * 0.8), label: 'TURN IT UP', delay: 900 });
        await new Promise(res => { songResolve = res; });
      }
      async function songTime() {
        if (st.phase !== 'volume') return;
        st.phase = 'song'; K.guide(null); st.vol = 1;
        K.sfx.win(); st.glowFlash = 1;
        if (A.ctx) A.pad(['C3', 'G3', 'C4', 'E4', 'G4'].map(n => A.note(n)), { dur: 6, vol: 0.12, attack: 0.8 });
        tween(2600, k => { st.warm = k; }, ease.inOutSine);
        for (let i = 0; i < 16; i++) K.later(() => spawnNote(), i * 160);
        P.emit('spark', R.dial.x + R.dial.w / 2, R.dial.y + R.dial.h / 2, 24, { colors: ['#ffe6a8', '#ffcf4d', '#ffffff'] });
        st.col = st.cards.map(tb => K.collect('Station ' + tb.name));
        cardKey = ''; st.careUntil = 0; careKey.classList.toggle('lit', care);
        setCard('okay', { station: 'Tonight’s stations', freq: 'Station Okay', av: 'still', mood: 'happy', list: stationList() });
        sync.base('happy'); sync.say(L(LINES.end), { mood: 'love', ms: 0 });
        K.later(() => { if (!st.finished) sync.base('moon'); }, reduced() ? 1200 : 3600);
        ctx.track('song', {});
        await K.wait(reduced() ? 2600 : 5600);
        finishGame();
        if (songResolve) { const r = songResolve; songResolve = null; r(); }
      }
      function finishGame() {
        if (st.finished) return; st.finished = true; st.phase = 'end';
        const sc = st.score.length ? st.score.reduce((a, b) => a + b, 0) / st.score.length : 0.7, pct = Math.round(sc * 100);
        const best = K.best('tune', pct, 'higher'), tier = K.tier(sc, [0.45, 0.66, 0.84]);
        const badges = [];
        if (best.isNew) badges.push('New best: ' + pct + '% smooth tuning'); else if (best.first) badges.push('Smooth tuning: ' + pct + '%');
        if (tier) badges.push(tier + ' tuner');
        const fresh = (st.col || []).map((c, i) => (c.isNew ? st.cards[i] : null)).filter(Boolean), total = K.collection().length;
        if (fresh.length) badges.push('New station card' + (fresh.length > 1 ? 's' : '') + ': ' + fresh.map(tb => tb.name).join(', ') + ' (' + Math.min(total, ALL_STATIONS) + '/' + ALL_STATIONS + ')');
        else badges.push('Station cards: ' + Math.min(total, ALL_STATIONS) + '/' + ALL_STATIONS);
        const tb0 = st.cards[0];
        // the console shows three lines: in care mode the care line always takes the last one
        const lines = st.cards.slice(0, care ? 2 : 3).map(tb => SENS[tb.sens].label + ' → Station ' + tb.name);
        if (care) lines.push('If it’s new, severe or you’re unsure: call a doctor or 000.');
        ctx.finish({
          title: care ? 'Tuned to a calmer station' : 'Revving, not breaking', mood: 'calm', lines,
          share: 'Tuned my body from STATION DANGER to STATION ' + (tb0 ? tb0.name.toUpperCase() : 'ADRENALINE') + '.', badges: badges.slice(0, 4)
        });
      }

      /* ---------------- the loop ---------------- */
      function spawnNote() {
        if (!R.grille || NOTES.length > 36) return;
        const side = Math.random() < 0.5 ? -1 : 1, G = R.grille;
        NOTES.push({ x: G.x + G.w / 2 + side * G.w * (0.34 + Math.random() * 0.14), y: G.y + G.h * (0.25 + Math.random() * 0.5), vx: side * (24 + Math.random() * 36), vy: -26 - Math.random() * 30, t: 0, life: 2 + Math.random() * 1.2, s: 0.8 + Math.random() * 0.6, ph: Math.random() * 6, dbl: Math.random() < 0.4 });
      }
      let lastT = 0;
      const Q = { acc: 0, n: 0, steps: 0 };
      K.loop((dt0, t) => {
        const g = cv.g; if (!g || !M.w || !R.radio) return;
        const real = lastT ? t - lastT : 0.016; lastT = t; const dt = Math.min(0.25, Math.max(0.001, real));
        Q.acc += real; Q.n++; if (Q.acc > 1.5) { if (Q.acc / Q.n > 0.03 && Q.steps < 1 && cv.setQuality) { Q.steps++; cv.setQuality(0.75); } Q.acc = 0; Q.n = 0; }
        buildSprites(); ensureBg(); stepTweens();
        // flywheel, detent settle, automatic frequency control and the lock
        if (st.phase === 'tune' && !TUN.drag) {
          if (Math.abs(TUN.vel) > 0.08) { turn(TUN.vel * dt); TUN.vel *= Math.exp(-dt * 2.6); }
          else {
            TUN.vel = 0; const tb = byKey['t' + st.round], err = tb.pos - st.f, reach = TOL * AFC * (1 + Math.min(1.5, (now() - TUN.t0) / 25000));
            if (Math.abs(err) < reach && Math.abs(err) > 0.0004) { const df = err * Math.min(1, dt * 3.2); setF(st.f + df); TUN.ang += df * TAU * TURNS; }
          }
        }
        let best = 0; BAND.forEach(b => { const v = Math.exp(-Math.pow((st.f - b.pos) / b.w, 2)); st.str[b.key] = v; const w = v * (b.key === 'danger' ? Math.max(0.35, st.alarm) : 1); if (w > best) best = w; }); st.best = best;
        if (st.phase === 'tune') {
          const tb = byKey['t' + st.round], err = st.f - tb.pos, side = Math.sign(err);
          if (Math.abs(err) > TOL && Math.abs(err) < 0.12) { if (TUN.side && side !== TUN.side) TUN.overs++; TUN.side = side; }
          const slow = Math.abs(TUN.vel) < 1.4 || !TUN.drag;
          if (Math.abs(err) < TOL && slow) st.settle += dt; else st.settle = Math.max(0, st.settle - dt * 2);
          st.lockK = clamp(st.settle / 0.55, 0, 1);
          if (st.settle >= 0.55) lock();
        } else if (st.phase !== 'locked') st.lockK = Math.max(0, st.lockK - dt * 2);
        const tk = 't' + Math.max(0, st.round), sigT = st.locked ? 1 : (st.str[tk] || 0);
        st.sig = Math.max(sigT, (st.str.danger || 0) * st.alarm * 0.6, st.str.coffee || 0, st.str.tired || 0, st.str.news || 0, st.str.care || 0);
        // the body: heart rate eases toward its target; the heartbeat is loud while the alarm is, and fades under the song
        st.hr += (st.hrT - st.hr) * Math.min(1, dt * 0.5);
        const hvT = st.phase === 'song' || st.phase === 'end' ? 0 : st.phase === 'volume' ? 0.22 : st.phase === 'intro' ? 0.4 : st.locked ? 0.5 : 0.62 + 0.3 * st.alarm;
        st.hrV += (hvT - st.hrV) * Math.min(1, dt * 1.2);
        if (RA.ok && RA.ac.state === 'running') { const ta = RA.ac.currentTime; let bk = 0; for (const lt of LUBS) if (lt <= ta) bk = Math.max(bk, Math.exp(-(ta - lt) * 7)); st.beatK = bk * Math.min(1, st.hrV * 1.6); }
        else { st.beatPh += dt * st.hr / 60; if (st.beatPh >= 1) { st.beatPh -= 1; st.beatT = now(); } st.beatK = Math.exp(-(now() - st.beatT) / 1000 * 7) * Math.min(1, st.hrV * 1.6) * (st.power > 0.2 ? 1 : 0); }
        VOL.wig = Math.max(0, VOL.wig - dt * 2.5);
        breathTick();
        updateCard();
        updMeter();
        mixAudio(dt);
        programs();
        st.glowFlash = Math.max(0, st.glowFlash - dt * 1.6);
        for (let i = NOTES.length - 1; i >= 0; i--) { const n = NOTES[i]; n.t += dt; n.x += (n.vx + Math.sin(n.t * 3 + n.ph) * 16) * dt; n.y += n.vy * dt; if (n.t > n.life) NOTES.splice(i, 1); }
        if ((st.phase === 'song' || st.phase === 'end') && Math.random() < dt * 4) spawnNote();
        P.update(dt);
        draw(g, t);
      });
      function mixAudio(dt) {
        if (!RA.ok) return;
        const ac = RA.ac, t = ac.currentTime, lockOpen = st.locked || st.phase === 'song' || st.phase === 'volume' || st.phase === 'breathe' || st.phase === 'breathed' ? 1 : st.lockK * 0.6;
        const pw = st.power;
        RA.out.gain.setTargetAtTime(Math.max(0.0001, pw * 0.95), t, 0.2);
        const stat = (st.phase === 'song' ? 0 : clamp(1 - st.sig, 0, 1) * (1 - lockOpen) * 0.22 + 0.012 * (1 - lockOpen)) * pw;
        RA.stG.gain.setTargetAtTime(Math.max(0.0001, stat), t, 0.04);
        RA.stF.frequency.setTargetAtTime(1500 + (1 - st.sig) * 2600 + Math.sin(now() / 170) * 300, t, 0.08);
        RA.humG.gain.setTargetAtTime(Math.max(0.0001, 0.02 * pw * (1 - st.warm * 0.5)), t, 0.3);
        BAND.forEach(b => {
          let v = st.str[b.key] || 0;
          if (b.key === 'danger') v *= st.alarm * (st.phase === 'song' || st.phase === 'volume' ? 0 : 1);
          if (b.kind === 'target') v = b.round === st.round ? (st.locked || st.phase === 'breathe' || st.phase === 'breathed' ? 1 : v) : (b.round < st.round ? v * 0.5 : v);
          if (b.key === 'care' && st.careUntil > now()) v = 1;
          RA.g[b.key].gain.setTargetAtTime(Math.max(0.0001, v * 0.9 * pw), t, 0.05);
        });
        RA.g.okay.gain.setTargetAtTime(Math.max(0.0001, (st.phase === 'volume' || st.phase === 'song' || st.phase === 'end' ? 0.25 + st.vol * 0.8 : 0) * pw), t, 0.1);
        RA.lp.frequency.setTargetAtTime(2300 + 7400 * lockOpen, t, 0.2); RA.hp.frequency.setTargetAtTime(300 - 240 * lockOpen, t, 0.2);
        RA.wet.gain.setTargetAtTime(0.42 * (1 - lockOpen) + 0.03, t, 0.2); RA.dry.gain.setTargetAtTime(0.66 + 0.3 * lockOpen, t, 0.2);
        const airV = st.phase === 'breathe' ? (BR.state === 'in' ? 0.05 + BR.k * 0.06 : BR.state === 'out' ? 0.08 * (1 - BR.out) : 0) : 0;
        RA.airG.gain.setTargetAtTime(Math.max(0.0001, airV), t, 0.15);
        RA.airF.frequency.setTargetAtTime(BR.state === 'in' ? 380 + BR.k * 700 : 1080 - BR.out * 700, t, 0.2);
        if (st.phase === 'tune' && st.sig < 0.4 && Math.random() < dt * 7) A.noise({ filter: 'highpass', freq: 2500 + Math.random() * 4000, dur: 0.01 + Math.random() * 0.03, vol: 0.02 + Math.random() * 0.04, bus: 'music' });
      }

      function draw(g, t) {
        const W = M.w, H = M.h, bright = S.scene() === 'bright';
        // the room, cold night to warm lamplight
        const wk = Math.round(clamp(st.warm, 0, 1) * 20) / 20, key = wk + ':' + bg.key;
        if (bgMix.key !== key || !bgMix.c) {
          bgMix.key = key;
          if (!bgMix.c || bgMix.c.width !== bg.cold.width || bgMix.c.height !== bg.cold.height) bgMix.c = mk(bg.cold.width, bg.cold.height);
          const m = bgMix.c.getContext('2d', { alpha: false }); m.globalAlpha = 1; m.drawImage(wk >= 1 ? bg.warm : bg.cold, 0, 0); if (wk > 0 && wk < 1) { m.globalAlpha = wk; m.drawImage(bg.warm, 0, 0); } m.globalAlpha = 1;
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        g.drawImage(bgMix.c, 0, 0, W, H);
        // the alarm pulses red at the edges of the room with every heartbeat, and fades as the breaths turn it down
        const loudRoom = st.phase === 'song' || st.phase === 'volume' || st.phase === 'end' ? 0 : 1;
        const vigA = (bright ? 0.13 : 0.2) * st.beatK * st.alarm * clamp(((st.str.danger || 0) - 0.15) * 2, 0, 1) * (st.locked ? 0 : 1) * loudRoom * st.power;
        if (vigA > 0.01) { g.globalAlpha = vigA; g.drawImage(spr.vig, 0, 0, W, H); g.globalAlpha = 1; }
        // the cabinet
        g.drawImage(spr.radio.c, R.radio.x - spr.radio.pad, R.radio.y - spr.radio.pad, R.radio.w + spr.radio.pad * 2, R.radio.h + spr.radio.pad * 2);
        drawDial(g);
        drawEye(g, t);
        drawGrille(g, t);
        drawArc(g);
        drawKnob(g, spr.knob, spr.knobHi, R.tune, TUN.ang);
        const vol = st.phase === 'volume' || st.phase === 'song' || st.phase === 'end';
        const vAng = -Math.PI * 0.75 + (vol ? st.vol : st.alarm) * Math.PI * 1.5 + (VOL.wig > 0 ? Math.sin(t * 46) * 0.07 * VOL.wig : 0);
        drawKnob(g, spr.vknob, spr.vknobHi, R.vol, vAng);
        // music notes floating out of the speaker
        for (const n of NOTES) { const a = Math.min(1, n.t * 2) * Math.max(0, 1 - n.t / n.life); drawNote(g, n.x, n.y, n.s, a, n.dbl); }
        P.draw(g);
      }
      function drawDial(g) {
        const D = R.dial, pw = st.power, red = (st.str.danger || 0) * st.alarm * (st.locked ? 0 : 1);
        const flick = st.phase === 'tune' && st.sig < 0.4 ? 0.82 + Math.random() * 0.18 : 1;
        const gx = fx(st.f), song = st.phase === 'song' || st.phase === 'end';
        g.save(); rr(g, D.x, D.y, D.w, D.h, 10); g.clip();
        if (model.darkFace) {
          g.globalCompositeOperation = 'lighter';
          g.globalAlpha = clamp((0.15 + 0.3 * pw * flick + st.glowFlash * 0.3 + st.warm * 0.3), 0, 1); g.drawImage(song ? spr.gold : spr.amber, D.x - D.w * 0.1, D.y - D.h * 0.6, D.w * 1.2, D.h * 2.2);
          g.globalAlpha = clamp((0.35 + 0.4 * st.sig) * pw * flick, 0, 1); g.drawImage(spr.amber, gx - 64, D.y - 26, 128, D.h + 52);
        } else {
          // unlit the face is dim and brown; lit, it turns warm parchment with a hot spot behind the needle
          g.globalCompositeOperation = 'multiply';
          g.fillStyle = 'rgba(70,40,20,' + (0.5 * (1 - pw)).toFixed(3) + ')'; g.fillRect(D.x, D.y, D.w, D.h);
          g.globalAlpha = clamp(0.3 * pw + st.warm * 0.15, 0, 1); g.fillStyle = mixHex(song ? '#ffcf6b' : model.glow, '#ffffff', 0.45); g.fillRect(D.x, D.y, D.w, D.h);
          g.globalCompositeOperation = 'source-over';
          g.globalAlpha = clamp((0.22 + 0.32 * st.sig) * pw * flick + st.glowFlash * 0.25, 0, 1); g.drawImage(song ? spr.gold : spr.amber, gx - 76, D.y - 34, 152, D.h + 68);
          if (song) { g.globalAlpha = 0.35 * st.warm; g.drawImage(spr.gold, D.x - D.w * 0.05, D.y - D.h * 0.5, D.w * 1.1, D.h * 2); }
        }
        if (red > 0.05) { g.globalCompositeOperation = model.darkFace ? 'lighter' : 'source-over'; g.globalAlpha = clamp(red * (0.3 + 0.25 * st.beatK) * pw, 0, 1); g.drawImage(spr.red, D.x - D.w * 0.2, D.y - D.h * 0.5, D.w * 0.55, D.h * 2); }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        if (st.okK < 1) { g.globalAlpha = 1 - st.okK; g.drawImage(spr.scale, D.x, D.y, D.w, D.h); g.globalAlpha = 1; }
        // the needle
        const jit = st.phase === 'tune' && st.sig < 0.3 ? (Math.random() - 0.5) * 0.8 : 0, nx = Math.round(gx + jit) + 0.5;
        g.globalAlpha = 1 - st.okK;
        g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 3; g.beginPath(); g.moveTo(nx + 2, D.y + 3); g.lineTo(nx + 2, D.y + D.h - 1); g.stroke();
        g.strokeStyle = '#e0261b'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(nx, D.y + 2); g.lineTo(nx, D.y + D.h - 3); g.stroke();
        g.fillStyle = '#e0261b'; g.beginPath(); g.arc(nx, D.y + D.h - 4, 3.5, 0, TAU); g.fill();
        g.globalAlpha = 1;
        g.drawImage(spr.glass, D.x, D.y, D.w, D.h);
        g.restore();
        // Station Okay: the whole dial glows and breathes with the song
        if (st.okK > 0.01) {
          const beat = song ? 0.85 + 0.15 * Math.sin(now() / 1000 * 8.8) : 1;
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = clamp((0.12 + 0.3 * st.warm) * st.okK * beat * (S.scene() === 'bright' ? 0.6 : 1), 0, 1);
          g.drawImage(spr.gold, D.x - D.w * 0.15, D.y - D.h * 0.7, D.w * 1.3, D.h * 2.4);
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        }
      }
      function drawEye(g, t) {
        const E = R.eye, pw = st.power, sig = clamp(st.sig, 0, 1), half = (1 - sig) * 1.25 + 0.06 + (st.phase === 'tune' && sig < 0.4 ? Math.sin(t * 23) * 0.05 : 0);
        g.fillStyle = '#071008'; g.beginPath(); g.arc(E.x, E.y, E.r, 0, TAU); g.fill();
        if (pw > 0.02) { g.globalAlpha = pw; g.drawImage(spr.eye, E.x - E.r, E.y - E.r, E.r * 2, E.r * 2); g.globalAlpha = 1; }
        g.fillStyle = '#071008'; g.beginPath(); g.moveTo(E.x, E.y); g.arc(E.x, E.y, E.r + 0.5, -Math.PI / 2 - half, -Math.PI / 2 + half); g.closePath(); g.fill();
        g.fillStyle = '#101a12'; g.beginPath(); g.arc(E.x, E.y, E.r * 0.32, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1; g.beginPath(); g.arc(E.x, E.y, E.r - 1, Math.PI * 1.1, Math.PI * 1.55); g.stroke();
        if (pw > 0.3) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 * pw * (0.4 + sig * 0.6); g.drawImage(spr.eyeGlow, E.x - E.r * 2.4, E.y - E.r * 2.4, E.r * 4.8, E.r * 4.8); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      }
      function drawGrille(g, t) {
        const G = R.grille, song = st.phase === 'song' || st.phase === 'end', playing = st.locked || song || st.phase === 'volume' || st.phase === 'breathe' || st.phase === 'breathed';
        const danger = (st.str.danger || 0) * st.alarm * (st.locked ? 0 : 1);
        g.save(); rr(g, G.x, G.y, G.w, G.h, 13); g.clip();
        g.globalCompositeOperation = 'lighter';
        if (playing && st.phase !== 'breathe') { const pulse = 0.5 + 0.5 * Math.sin(t * (song ? 8.8 : 4.7)); g.globalAlpha = 0.08 + 0.08 * pulse + st.warm * 0.12; g.drawImage(song ? spr.gold : spr.amber, G.x, G.y - G.h * 0.3, G.w, G.h * 1.6); }
        if (danger > 0.1 && st.beatK > 0.02) { g.globalAlpha = clamp(0.32 * danger * st.beatK, 0, 1); g.drawImage(spr.red, G.x + G.w * 0.1, G.y - G.h * 0.3, G.w * 0.8, G.h * 1.6); }
        if (st.phase === 'breathe') {
          // the breath: light fills the speaker from the middle out on the in-breath (two bright bars open to the dashed
          // marks at the edges) and drains back slowly on the long out-breath
          const k = BR.state === 'in' ? ease.inOutSine(BR.k) : BR.state === 'out' ? 1 - ease.inOutSine(BR.out) : 0.04 + 0.03 * Math.sin(t * 2);
          const cx = G.x + G.w / 2, cy = G.y + G.h / 2, edge = G.w / 2 - 14, half = edge * (0.08 + 0.92 * k), wv = half * 2 + 40;
          g.globalAlpha = 0.22 + 0.5 * k; g.drawImage(spr.amber, cx - wv * 0.62, G.y - G.h * 0.35, wv * 1.24, G.h * 1.7);
          g.globalAlpha = 0.1 + 0.28 * k; g.drawImage(spr.soft, cx - wv * 0.45, cy - G.h * 0.42, wv * 0.9, G.h * 0.84);
          g.globalCompositeOperation = 'source-over';
          const bh = Math.min(G.h * 0.34, 46);
          g.lineCap = 'round'; g.setLineDash([4, 5]); g.strokeStyle = 'rgba(255,214,120,0.75)'; g.lineWidth = 2;
          [-1, 1].forEach(sd => { const x = cx + sd * edge; g.beginPath(); g.moveTo(x, cy - bh); g.lineTo(x, cy + bh); g.stroke(); });
          g.setLineDash([]); g.strokeStyle = '#fff6df'; g.lineWidth = 4; g.globalAlpha = 0.55 + 0.45 * k;
          [-1, 1].forEach(sd => { const x = cx + sd * half; g.beginPath(); g.moveTo(x, cy - bh * 0.86); g.lineTo(x, cy + bh * 0.86); g.stroke(); });
          g.lineCap = 'butt'; g.globalAlpha = 1;
          for (let i = 0; i < BREATHS; i++) { const on = i < BR.n; g.fillStyle = on ? '#ffcf4d' : 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(cx - (BREATHS - 1) * 10 + i * 20, G.y + G.h - 11, on ? 5.5 : 4.5, 0, TAU); g.fill(); }
        }
        g.restore();
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      /* the arc round the small knob: the alarm level (red, then amber, then green), later the song's volume (gold) */
      function drawArc(g) {
        const V = R.vol, rad = R.arcR, a0 = -Math.PI * 1.25, vol = st.phase === 'volume' || st.phase === 'song' || st.phase === 'end';
        const lvl = vol ? st.vol : st.alarm, a1 = a0 + lvl * Math.PI * 1.5;
        g.lineCap = 'round';
        g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 5; g.beginPath(); g.arc(V.x, V.y, rad, a0, a0 + Math.PI * 1.5); g.stroke();
        if (lvl > 0.005 && st.power > 0.05) {
          const col = vol ? '#f2b43a' : lvl > 0.6 ? '#e0402f' : lvl > 0.3 ? '#f08a2a' : '#2f9e6e', beat = vol || lvl < 0.3 ? 0 : st.beatK;
          if (beat > 0.05) { g.globalAlpha = 0.3 * beat; g.strokeStyle = col; g.lineWidth = 12; g.beginPath(); g.arc(V.x, V.y, rad, a0, a1); g.stroke(); g.globalAlpha = 1; }
          g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.arc(V.x, V.y, rad, a0, a1); g.stroke();
        }
        g.lineCap = 'butt';
      }
      function drawKnob(g, k, hi, at, ang) {
        g.save(); g.translate(at.x, at.y); g.rotate(ang); g.drawImage(k.c, -k.s / 2, -k.s / 2, k.s, k.s); g.restore();
        g.drawImage(hi.c, at.x - hi.s / 2, at.y - hi.s / 2, hi.s, hi.s);
      }
      function drawNote(g, x, y, s, a, dbl) {
        g.globalAlpha = a; g.fillStyle = st.phase === 'song' || st.phase === 'end' ? '#ffe2a0' : model.glow; g.strokeStyle = g.fillStyle; g.lineWidth = 2 * s;
        g.beginPath(); g.ellipse(x, y, 5 * s, 3.8 * s, -0.4, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x + 4.4 * s, y); g.lineTo(x + 4.4 * s, y - 17 * s); g.stroke();
        if (dbl) { g.beginPath(); g.ellipse(x + 13 * s, y + 3 * s, 5 * s, 3.8 * s, -0.4, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x + 17.4 * s, y + 3 * s); g.lineTo(x + 17.4 * s, y - 14 * s); g.stroke(); g.lineWidth = 3.4 * s; g.beginPath(); g.moveTo(x + 4.4 * s, y - 17 * s); g.lineTo(x + 17.4 * s, y - 14 * s); g.stroke(); }
        else { g.beginPath(); g.moveTo(x + 4.4 * s, y - 17 * s); g.quadraticCurveTo(x + 12 * s, y - 12 * s, x + 10 * s, y - 6 * s); g.stroke(); }
        g.globalAlpha = 1;
      }

      /* ---------------- the night's flow ---------------- */
      setCard('static', { station: 'Warming up', freq: '', icon: '·', text: 'The bedside radio is warming up…', instant: true });
      careKey.classList.toggle('lit', care);
      (async () => {
        await K.intro({ title: 'Body Radio', sub: 'Your body is broadcasting. Station Danger reads every beat as an emergency. Find the stations that explain it.', how: 'Turn the big dial to tune. Small moves fine-tune. Hold the grille to breathe.', char: 'still', mood: 'music' });
        // power on: a click, the tubes hum, the dial warms up
        st.phase = 'power'; if (A.ctx) { A.click({ vol: 0.12 }); A.tone({ type: 'sine', freq: 60, to: 100, glide: 1.2, dur: 1.4, vol: 0.05, attack: 0.3 }); }
        sync.say(L(LINES.intro), { mood: 'worried', ms: 3600 });
        await tween(reduced() ? 300 : 1400, k => { st.power = k; }, ease.outCubic);
        if (care) { showCare(5200, true); sync.say(L(LINES.careFirst), { mood: 'calm', ms: 4200 }); K.guide({ id: 'care', g: 'tap', target: careKey, label: 'THE CARE STATION', delay: 300, place: 'above' }); await K.wait(reduced() ? 1800 : 4600); K.guide(null); }
        for (let r = 0; r < plan.length; r++) {
          await round(r);
          if (plan[r] === 'breath') await breathe();
        }
        await finale();
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 30000)) await K.wait(80); };
          const spin = async (hit, at, total, rate) => {
            const hr = K.rectIn(hit), cx0 = hr.w / 2, cy0 = hr.h / 2, rad = at.r * 0.75;
            let a = -Math.PI / 2, done = 0, last = now();
            const p = await K.sim.press(hit, cx0 + Math.cos(a) * rad, cy0 + Math.sin(a) * rad);
            while (Math.abs(done) < Math.abs(total) - 0.001) {
              await K.wait(30); const tn = now(), left = Math.abs(total) - Math.abs(done), sp = rate * (left < 1.2 ? Math.max(0.3, left / 1.2) : 1);
              const step = Math.min(left, Math.min(1.1, sp * (tn - last) / 1000)) * Math.sign(total); last = tn; done += step; a += step;
              p.move(cx0 + Math.cos(a) * rad, cy0 + Math.sin(a) * rad);
            }
            await K.wait(140); p.up(cx0 + Math.cos(a) * rad, cy0 + Math.sin(a) * rad);
          };
          for (let r = 0; r < plan.length; r++) {
            await until(() => st.phase === 'tune' && st.round === r, 30000);
            await K.wait(400);
            const tb = byKey['t' + r];
            await spin(tuneHit, R.tune, (tb.pos - st.f) * TAU * TURNS, 7);
            for (let i = 0; i < 6 && st.phase === 'tune'; i++) { await K.wait(500); if (st.phase !== 'tune') break; const err = tb.pos - st.f; if (Math.abs(err) > TOL * 0.5) await spin(tuneHit, R.tune, err * TAU * TURNS, 3); }
            await until(() => st.phase !== 'tune', 8000);
            if (plan[r] === 'breath') {
              await until(() => st.phase === 'breathe', 15000);
              await K.wait(600);
              for (let b = 0; b < BREATHS + 2 && st.phase === 'breathe'; b++) { await K.sim.hold(pad, IN_MS + 300); await K.wait(OUT_MS + 300); }
            }
          }
          await until(() => st.phase === 'volume', 30000);
          await K.wait(900);
          await spin(volHit, R.vol, TAU * 0.75, 6);
          await until(() => st.finished, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
