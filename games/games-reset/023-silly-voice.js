/* 023 Silly Voice — Reset · INTERRUPT · Inner Speech / Mental Text
 * Mechanism: cognitive defusion with silly voices (ACT; Hayes, Strosahl & Wilson 1999; Masuda et al. 2004): hearing a
 * harsh line played back in a cartoon voice loosens its grip. The words stay exactly the same; their authority doesn't.
 * Speech uses on-device voices only (speechSynthesis voices with localService === true); without one, a formant
 * babble synth shaped to the words speaks it while the words bounce in a bubble. Nothing typed ever leaves the device.
 * Verb: twist (turn the knobs of a retro voice-changer: pitch, speed, wobble, echo; then press PLAY).
 * Finale: the cast sings the line as an over-the-top opera trio while the words wobble and fall apart into confetti;
 * the tape ejects as a gold "Greatest Hits" cassette with the line still on it, tiny and funny.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const KEYS = ['p', 's', 'w', 'e'];
  const KNAME = { p: 'PITCH', s: 'SPEED', w: 'WOBBLE', e: 'ECHO' };
  const CRITIC = { p: 0.3, s: 0.36, w: 0.06, e: 0.3 };
  const STEPS = 24;
  /* Voices to find. r: knob ranges that make the voice (unlisted knobs are free); ideal: where autoplay aims. */
  const PRESETS = [
    { id: 'helium', short: 'HELIUM', name: 'HELIUM', r: { p: [0.76, 1], s: [0.3, 0.9] }, ideal: { p: 0.86, s: 0.56 }, tint: '#d42a78' },
    { id: 'giant', short: 'GIANT', name: 'SLOW-MO GIANT', r: { p: [0, 0.16], s: [0, 0.2] }, ideal: { p: 0.06, s: 0.08 }, tint: '#8a4f17' },
    { id: 'robot', short: 'ROBOT', name: 'ROBOT', r: { w: [0, 0.035], e: [0.5, 0.85], p: [0.15, 0.55] }, ideal: { w: 0, e: 0.66, p: 0.34 }, tint: '#0b7f9e' },
    { id: 'opera', short: 'OPERA', name: 'OPERA', r: { w: [0.8, 1], s: [0, 0.34], p: [0.4, 0.82] }, ideal: { w: 0.92, s: 0.2, p: 0.6 }, tint: '#b81d2c' },
    { id: 'sports', short: 'SPORTS', name: 'COMMENTATOR', r: { s: [0.84, 1], e: [0.55, 1] }, ideal: { s: 0.93, e: 0.72 }, tint: '#c95a05' },
    { id: 'mouse', short: 'MOUSE', name: 'TINY MOUSE', r: { p: [0.92, 1], s: [0.7, 1], e: [0, 0.22] }, ideal: { p: 0.97, s: 0.84, e: 0.08 }, tint: '#7d5f8f' },
    { id: 'ghost', short: 'GHOST', name: 'GHOST', r: { e: [0.86, 1], w: [0.55, 1], s: [0, 0.42] }, ideal: { e: 0.94, w: 0.7, s: 0.3 }, tint: '#3f6fc4' },
    { id: 'alien', short: 'ALIEN', name: 'ALIEN RADIO', r: { w: [0.84, 1], p: [0.66, 1], s: [0.58, 1] }, ideal: { w: 0.94, p: 0.8, s: 0.72 }, tint: '#1a8a42' },
    { id: 'sleepy', short: 'SLEEPY', name: 'SLEEPY CAT', r: { s: [0, 0.09], p: [0.38, 0.64], e: [0, 0.32] }, ideal: { s: 0.04, p: 0.5, e: 0.14 }, tint: '#6a4cb4' }
  ];
  /* When the line is about health, money, housing or the law: gentle voices, no laughing at it. */
  const CARE_PRESETS = [
    { id: 'radio', short: 'RADIO', name: 'NIGHT RADIO', r: { p: [0.06, 0.24], s: [0.18, 0.36] }, ideal: { p: 0.15, s: 0.27 }, tint: '#a8641c' },
    { id: 'lullaby', short: 'LULLABY', name: 'LULLABY', r: { w: [0.45, 0.8], s: [0, 0.26] }, ideal: { w: 0.6, s: 0.14 }, tint: '#7a4cc0' },
    { id: 'narrator', short: 'NATURE', name: 'NATURE DOC', r: { e: [0, 0.12], p: [0.16, 0.4], s: [0.2, 0.44] }, ideal: { e: 0.05, p: 0.28, s: 0.32 }, tint: '#2f7a3a' }
  ];
  const FREE = { id: 'free', short: 'FREE', name: 'FREESTYLE', r: null, ideal: { p: 0.82, s: 0.8, w: 0.7, e: 0.6 }, tint: '#1d1530' };
  /* Today's machine (one skin per day). */
  const SKINS = [
    { id: 'bubblegum', name: 'Bubblegum ’84', body: ['#ff9ccd', '#e9579a'], edge: '#9c2d5f', panel: '#fff3f8', panel2: '#ffe0ee', ink: '#5a1534', knob: ['#ffffff', '#ffc6df'], cap: '#4a1630', acc: '#19b8ac', lcd: ['#123630', '#7dffc8'], key: '#19c5b8', keyInk: '#062a26' },
    { id: 'walnut', name: 'Walnut Deluxe', body: ['#9a643c', '#5c381e'], edge: '#341d0c', panel: '#ece6da', panel2: '#d9d1c2', ink: '#2c2218', knob: ['#f6f6f6', '#b6bac2'], cap: '#24201c', acc: '#e8801c', lcd: ['#2a1806', '#ffb347'], key: '#f29a3a', keyInk: '#2a1404' },
    { id: 'neon', name: 'Arcade Neon', body: ['#2c3150', '#151830'], edge: '#05060f', panel: '#1f2338', panel2: '#272c46', ink: '#eef0ff', knob: ['#4a5276', '#2a2f48'], cap: '#0b0d18', acc: '#ff4fd8', lcd: ['#06150f', '#39ff9a'], key: '#ff5fdc', keyInk: '#2a0628' },
    { id: 'mint', name: 'Mint Walkman', body: ['#94f0d2', '#3fc29a'], edge: '#1c7a5e', panel: '#f6fffb', panel2: '#dcf5ec', ink: '#0f4a3a', knob: ['#ffffff', '#cfeee3'], cap: '#123c31', acc: '#ff6a35', lcd: ['#0f241c', '#a8ffdf'], key: '#ff7a45', keyInk: '#3a1204' },
    { id: 'chrome', name: 'Chrome Turbo', body: ['#eef1f6', '#98a1b0'], edge: '#566072', panel: '#2a2f3a', panel2: '#353b48', ink: '#f2f5fa', knob: ['#fafbfd', '#a3abba'], cap: '#1a1d24', acc: '#ff4040', lcd: ['#14190f', '#c6ff6b'], key: '#ff4a4a', keyInk: '#2a0505' },
    { id: 'sunset', name: 'Sunset Synth', body: ['#8a55e0', '#e8577e'], edge: '#3c1f6b', panel: '#2a1840', panel2: '#34204e', ink: '#ffe9d6', knob: ['#ffe08a', '#f0a53a'], cap: '#3a1d0a', acc: '#ffcf4a', lcd: ['#1c0f2b', '#ff9ef0'], key: '#ffcf4a', keyInk: '#3a2204' }
  ];
  /* With no words of their own, the tape holds a classic critic line, shown as an example. */
  const EXAMPLES = ['NOT GOOD ENOUGH', 'YOU ALWAYS MESS UP', 'EVERYONE CAN TELL', 'YOU’RE SO BEHIND', 'WHO DO YOU THINK YOU ARE'];
  /* Formants (Hz) for the babble voice, and the glides into them. */
  const FORM = { a: [760, 1180, 2600], ae: [680, 1650, 2500], e: [520, 1850, 2550], i: [300, 2250, 2950], o: [560, 900, 2450], u: [330, 880, 2300], uh: [600, 1250, 2550] };
  const DIPH = { ai: ['a', 'i'], au: ['a', 'u'], oi: ['o', 'i'], iu: ['i', 'u'], ei: ['e', 'i'], ou: ['o', 'u'] };
  const GLIDE = { l: [380, 1050, 2600], r: [420, 1200, 1650], w: [320, 720, 2300], y: [290, 2150, 2900] };
  const NASAL = [270, 1150, 2450];
  const SCALE = [0, 2, 4, 5, 7, 9, 11, 12];
  const ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>',
    eject: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l8 9H4z" fill="currentColor"/><rect x="4" y="15.5" width="16" height="3.5" rx="1" fill="currentColor"/></svg>'
  };

  /* ---------------- words -> syllables for the babble voice ---------------- */
  function ccls(ch, nx) {
    if ((ch === 's' || ch === 'c') && nx === 'h') return { cls: 'SH', voiced: false };
    if (ch === 't' && nx === 'h') return { cls: 'TH', voiced: false };
    if (ch === 'p' || ch === 'b') return { cls: 'P', voiced: ch === 'b' };
    if (ch === 't' || ch === 'd') return { cls: 'T', voiced: ch === 'd' };
    if ('kcgqx'.indexOf(ch) >= 0) return { cls: 'K', voiced: ch === 'g' };
    if (ch === 's' || ch === 'z') return { cls: 'S', voiced: ch === 'z' };
    if (ch === 'f' || ch === 'v') return { cls: 'F', voiced: ch === 'v' };
    if (ch === 'j') return { cls: 'SH', voiced: true };
    if (ch === 'h') return { cls: 'H', voiced: false };
    if (ch === 'm' || ch === 'n') return { cls: 'N', voiced: true };
    if ('lrwy'.indexOf(ch) >= 0) return { cls: 'L', voiced: true, l: ch };
    return null;
  }
  function onsetOf(cl) {
    const s = String(cl || '').replace(/[^a-z]/g, ''); if (!s) return null;
    const d = s.slice(-2); if (d === 'sh' || d === 'ch' || d === 'th') return ccls(d[0], 'h');
    for (let i = s.length - 1; i >= 0; i--) { const c = ccls(s[i], s[i + 1]); if (c && c.cls !== 'L' && c.cls !== 'H') return c; }
    return ccls(s[s.length - 1]);
  }
  function codaOf(cl) {
    const s = String(cl || '').replace(/[^a-z]/g, ''); if (!s) return null;
    const d = s.slice(0, 2); if (d === 'sh' || d === 'ch' || d === 'th') return ccls(d[0], 'h');
    for (let i = s.length - 1; i >= 0; i--) { const c = ccls(s[i], s[i + 1]); if (c && c.cls !== 'H') return c; }
    return null;
  }
  function nucOf(v, low, gi, n) {
    if (/^you/.test(low) && gi === 0) return 'u';
    if (/^(ee|ea|ie|ei)/.test(v)) return 'i';
    if (/^oo/.test(v)) return 'u';
    if (/^ou/.test(v)) return 'au';
    if (/^(oi|oy)/.test(v)) return 'oi';
    if (/^(ai|ay|ey)/.test(v)) return 'ei';
    if (/^oa/.test(v)) return 'ou';
    if (/^(ue|ui|eu)/.test(v)) return 'iu';
    const c = v[0];
    if (c === 'a') return /^wh?a/.test(low) ? 'o' : (/a[^aeiou]e$/.test(low) && n === 1 ? 'ei' : 'ae');
    if (c === 'e') return gi === n - 1 && n > 1 ? 'uh' : 'e';
    if (c === 'i') return (low === 'i' || /^i'/.test(low) || (/i[^aeiou]e$/.test(low) && n === 1)) ? 'ai' : 'i';
    if (c === 'o') return (/o[^aeiou]e$/.test(low) && n === 1) ? 'ou' : (/^(to|do|who|two)$/.test(low) ? 'u' : 'o');
    if (c === 'u') return (gi === 0 && /^u[^aeiou]/.test(low) && !/^un/.test(low)) ? 'iu' : 'uh';
    if (c === 'y') return n === 1 ? 'ai' : 'i';
    return 'uh';
  }
  function syllabify(text) {
    const words = String(text || '').replace(/[“”"….,!?;:()]/g, ' ').replace(/[’‘]/g, "'").split(/\s+/).filter(Boolean).slice(0, 12);
    const out = [];
    words.forEach((wd, wi) => {
      const low = wd.toLowerCase(), s = low.replace(/[^a-z]/g, '');
      if (!s) return;
      const gs = [], re = /[aeiouy]+/g;
      let m;
      while ((m = re.exec(s))) {
        let v = m[0], i = m.index;
        if (i === 0 && v[0] === 'y' && s.length > 1) { if (v.length === 1) continue; v = v.slice(1); i = 1; }
        gs.push({ v, i });
      }
      for (let k = gs.length - 1; k >= 1; k--) {
        const g = gs[k]; if (g.v !== 'e') continue;
        const after = s.slice(g.i + 1);
        if (after === '' || (/^(ly|less|ful|ment|ness|s|d)$/.test(after) && !/[td]$/.test(s.slice(0, g.i)))) gs.splice(k, 1);
      }
      if (!gs.length) gs.push({ v: 'u', i: 0 });
      const n = Math.min(4, gs.length), G = gs.slice(0, n);
      G.forEach((g, k) => {
        const st = k ? G[k - 1].i + G[k - 1].v.length : 0;
        const between = s.slice(st, g.i).replace(/e/g, '');
        const half = k ? Math.floor(between.length / 2) : 0;
        if (k) { const prev = out[out.length - 1]; if (!prev.coda) prev.coda = codaOf(between.slice(0, half)); }
        const sy = { wi, onset: onsetOf(between.slice(half)), nuc: nucOf(g.v, low, k, n), coda: null, stress: k === 0 && (n > 1 || s.length > 3), wordEnd: k === n - 1, last: false };
        if (k === n - 1) sy.coda = codaOf(s.slice(g.i + g.v.length));
        out.push(sy);
      });
    });
    if (out.length) out[out.length - 1].last = true;
    return out;
  }
  const vowelA = (nuc) => (DIPH[nuc] ? DIPH[nuc][0] : nuc);

  (env.games = env.games || []).push({
    id: 'silly-voice', mode: 'reset', name: 'Silly Voice', verb: 'twist', family: 'INTERRUPT', minutes: 2,
    parents: ['Inner Speech / Mental Text', 'Overthinking / Thought Fusion', 'Performance / Confidence'],
    cast: ['loopie', 'glitch'], poster: { char: 'loopie', mood: 'laugh' },
    tagline: 'Load the critic’s tape, twist the knobs, play it back ridiculous.',
    why: 'For a harsh inner voice: same words in a silly voice, and they lose their grip.',
    fonts: ['Luckiest+Guy', 'VT323', 'Nanum+Pen+Script'],
    css: `
.g-silly-voice { font-synthesis: none; --sv-disp: "Luckiest Guy", "Arial Black", "Segoe UI Black", Impact, system-ui, sans-serif; --sv-lcdf: "VT323", "Courier New", ui-monospace, monospace;
  --sv-hand: "Nanum Pen Script", "Bradley Hand", "Segoe Print", "Comic Sans MS", "Chalkboard SE", cursive; --sv-acc: #19b8ac; --sv-ink: #5a1534; --sv-key: #19c5b8; --sv-keyink: #062a26;
  --sv-lcdbg: #123630; --sv-lcdfg: #7dffc8; }
.g-silly-voice .sv-vb { position: absolute; z-index: 26; display: grid; place-items: center; padding: 10px 16px; border-radius: 26px; background: #fffaf0; border: 3px solid #241634;
  box-shadow: 0 7px 0 rgba(36, 22, 52, 0.22), 0 16px 34px rgba(10, 4, 30, 0.35); transition: background-color 0.35s ease, border-color 0.35s ease, opacity 0.35s ease; pointer-events: none; }
.g-silly-voice .sv-vb::before, .g-silly-voice .sv-vb::after { content: ""; position: absolute; left: calc(50% - 15px); width: 30px; height: 20px; clip-path: polygon(0 0, 100% 0, 50% 100%); }
.g-silly-voice .sv-vb::before { bottom: -22px; background: #241634; }
.g-silly-voice .sv-vb::after { bottom: -16px; left: calc(50% - 11px); width: 22px; height: 15px; background: inherit; }
.g-silly-voice .sv-vb.sv-hide { opacity: 0; }
.g-silly-voice .sv-vb.sv-critic { background: #1c1826; border-color: #ff5d6c; }
.g-silly-voice .sv-vb.sv-hasex { padding-top: 26px; }
.g-silly-voice .sv-vb.sv-critic::before { background: #ff5d6c; }
.g-silly-voice .sv-vb.sv-trio { background: #2a0f1c; border-color: #ffd36b; }
.g-silly-voice .sv-vb.sv-trio::before { background: #ffd36b; }
.g-silly-voice .sv-line { font-family: var(--sv-disp); font-weight: 900; font-size: var(--fs, 28px); line-height: 1.08; letter-spacing: var(--ls, 0.02em); color: var(--vc, #241634);
  text-align: center; text-wrap: balance; max-width: 100%; transition: font-size 0.12s ease, letter-spacing 0.12s ease, color 0.3s ease; }
.g-silly-voice .sv-w { display: inline-block; margin: 0 0.06em; white-space: nowrap; will-change: transform; text-shadow: var(--ghost, none); transform-origin: 50% 70%; }
.g-silly-voice .sv-w.sv-dim { opacity: 0.5; }
.g-silly-voice .sv-vb.sv-critic .sv-line { color: #fff4f4; }
.g-silly-voice .sv-vb.sv-trio .sv-line { color: #ffe08a; }
.g-silly-voice .sv-ex { position: absolute; left: 50%; top: 7px; translate: -50% 0; padding: 4px 10px; border-radius: 999px; background: #241634; color: #fff6e6; font: 700 12px/1 var(--font-ui);
  letter-spacing: 0.1em; text-transform: uppercase; white-space: nowrap; }
.g-silly-voice .sv-lcd { position: absolute; z-index: 21; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; overflow: hidden; pointer-events: none;
  border-radius: 9px; color: var(--sv-lcdfg); font-family: var(--sv-lcdf); text-align: center;
  background: radial-gradient(120% 140% at 50% 0%, color-mix(in srgb, var(--sv-lcdbg) 80%, #ffffff), var(--sv-lcdbg) 60%); box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.65), 0 1px 0 rgba(255, 255, 255, 0.35); }
.g-silly-voice .sv-lcd::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.2) 0 1px, transparent 1px 3px); pointer-events: none; }
.g-silly-voice .sv-lcd b { font-weight: 400; font-size: var(--f1, 24px); line-height: 1; white-space: nowrap; letter-spacing: 0.04em; text-shadow: 0 0 8px currentColor; }
.g-silly-voice .sv-lcd small { font-size: var(--f2, 18px); line-height: 1; white-space: nowrap; opacity: 0.85; letter-spacing: 0.04em; }
.g-silly-voice .sv-lcd.sv-flash b { animation: sv-blink 0.18s steps(2, end) 4; }
@keyframes sv-blink { 0% { opacity: 1; } 50% { opacity: 0.15; } 100% { opacity: 1; } }
.g-silly-voice .sv-mlab { position: absolute; z-index: 21; translate: -50% 0; font: 700 12px/1 var(--font-ui); letter-spacing: 0.1em; color: #3a2c1c; white-space: nowrap; pointer-events: none; }
.g-silly-voice .sv-knob { position: absolute; z-index: 22; border: 0; padding: 0; margin: 0; border-radius: 50%; background: transparent; cursor: ns-resize; touch-action: none; -webkit-tap-highlight-color: transparent; }
.g-silly-voice .sv-knob:focus-visible { outline: 3px solid var(--sv-acc); outline-offset: 2px; }
.g-silly-voice .sv-klab { position: absolute; z-index: 21; translate: -50% 0; font: 900 12px/1 var(--sv-disp); letter-spacing: 0.05em; color: var(--sv-ink); white-space: nowrap; pointer-events: none; }
.g-silly-voice .sv-key { position: absolute; z-index: 22; display: flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 12px; cursor: pointer; touch-action: none;
  -webkit-tap-highlight-color: transparent; color: var(--sv-keyink); font: 900 17px/1 var(--sv-disp); letter-spacing: 0.04em;
  background: linear-gradient(180deg, color-mix(in srgb, var(--sv-key) 78%, #ffffff), var(--sv-key) 46%, color-mix(in srgb, var(--sv-key) 82%, #000000));
  box-shadow: 0 6px 0 color-mix(in srgb, var(--sv-key) 45%, #000000), 0 10px 18px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.55); transition: transform 0.07s ease, box-shadow 0.07s ease, filter 0.2s ease; }
.g-silly-voice .sv-key svg { width: 20px; height: 20px; flex: none; }
.g-silly-voice .sv-key.sv-down { transform: translateY(5px); box-shadow: 0 1px 0 color-mix(in srgb, var(--sv-key) 45%, #000000), 0 3px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4); }
.g-silly-voice .sv-key.sv-off { filter: saturate(0.25) brightness(0.8); cursor: default; }
.g-silly-voice .sv-key::after { content: ""; position: absolute; inset: -6px; border-radius: 16px; box-shadow: 0 0 20px 6px rgba(255, 230, 140, 0.8); opacity: 0; pointer-events: none; }
.g-silly-voice .sv-key.sv-ready::after { animation: sv-pulse 1.1s ease-in-out infinite; }
@keyframes sv-pulse { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
.g-silly-voice .sv-key:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.g-silly-voice .sv-eject { font-size: 13px; color: #f4f1ea; background: linear-gradient(180deg, #5b5f6c, #3a3d47 50%, #2a2c34); box-shadow: 0 6px 0 #17181d, 0 10px 18px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3); }
.g-silly-voice .sv-eject.sv-down { box-shadow: 0 1px 0 #17181d, 0 3px 8px rgba(0, 0, 0, 0.3); }
.g-silly-voice .sv-eject.sv-ready { background: linear-gradient(180deg, #ffe9a0, #f2c443 50%, #c8901a); color: #3a2604; }
.g-silly-voice .sv-bank { position: absolute; z-index: 21; display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px 8px; pointer-events: none; }
.g-silly-voice .sv-lamp { display: flex; align-items: center; gap: 6px; min-width: 0; height: 27px; padding: 0 8px; border-radius: 7px; background: rgba(10, 6, 20, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.14); color: rgba(255, 250, 240, 0.66); font: 700 12px/1 var(--font-ui); letter-spacing: 0.05em; white-space: nowrap; overflow: hidden; transition: background-color 0.3s ease, color 0.3s ease; }
.g-silly-voice .sv-lamp span { overflow: hidden; text-overflow: ellipsis; }
.g-silly-voice .sv-lamp i { flex: none; width: 9px; height: 9px; border-radius: 50%; background: rgba(255, 255, 255, 0.2); box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.5); }
.g-silly-voice .sv-lamp { position: relative; }
.g-silly-voice .sv-lamp::after { content: ""; position: absolute; inset: -1px; border-radius: 7px; border: 2px solid var(--sv-acc); opacity: 0; pointer-events: none; }
.g-silly-voice .sv-lamp.sv-cur { color: #fff; }
.g-silly-voice .sv-lamp.sv-cur::after { animation: sv-lampb 1.2s ease-in-out infinite; }
.g-silly-voice .sv-lamp.sv-cur i { background: var(--sv-acc); box-shadow: 0 0 8px var(--sv-acc); }
@keyframes sv-lampb { 0%, 100% { opacity: 1; } 50% { opacity: 0.15; } }
.g-silly-voice .sv-lamp.sv-done { color: #fff; background: color-mix(in srgb, var(--lc, #19b8ac) 72%, #0a0614); border-color: rgba(255, 255, 255, 0.35); }
.g-silly-voice .sv-lamp.sv-done i { background: #fffbe6; box-shadow: 0 0 9px #fff3b0, 0 0 2px #fff; }
.g-silly-voice .sv-cas { position: absolute; z-index: 24; left: 0; top: 0; width: var(--cw, 252px); aspect-ratio: 252 / 106; pointer-events: none; will-change: transform; transform-origin: 50% 50%; }
.g-silly-voice .sv-cas svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.g-silly-voice .sv-cas .sv-body { fill: #2b2a35; stroke: rgba(255, 255, 255, 0.16); stroke-width: 1.2; }
.g-silly-voice .sv-cas .sv-paper { fill: #fbf3df; }
.g-silly-voice .sv-cas .sv-rule { stroke: rgba(40, 60, 140, 0.16); stroke-width: 1; }
.g-silly-voice .sv-cas .sv-stripe { fill: var(--sv-acc); }
.g-silly-voice .sv-cas .sv-paper2 { display: none; fill: #fff6d2; stroke: #c8901a; stroke-width: 1.5; }
.g-silly-voice .sv-cas.sv-gold .sv-paper2 { display: inline; }
.g-silly-voice .sv-cas .sv-trap { fill: #22212b; stroke: rgba(255, 255, 255, 0.1); }
.g-silly-voice .sv-cas .sv-screw { fill: #8d8c97; }
.g-silly-voice .sv-cas .sv-pack { fill: #3a2418; }
.g-silly-voice .sv-cas .sv-hubc { fill: #f4f1ea; }
.g-silly-voice .sv-cas .sv-hubh { fill: #2b2a35; }
.g-silly-voice .sv-cas .sv-win { fill: rgba(150, 190, 255, 0.08); stroke: rgba(255, 255, 255, 0.22); stroke-width: 1.2; }
.g-silly-voice .sv-cas.sv-gold .sv-body { fill: url(#svGold); stroke: #fff2b8; }
.g-silly-voice .sv-cas.sv-gold .sv-trap { fill: #b98512; }
.g-silly-voice .sv-cas.sv-gold .sv-paper { fill: #fff6d2; }
.g-silly-voice .sv-cas.sv-gold .sv-stripe { fill: #c8901a; }
.g-silly-voice .sv-cas.sv-gold .sv-screw { fill: #fff2b8; }
.g-silly-voice .sv-clabel { position: absolute; left: 4.8%; top: 7.5%; width: 90.4%; height: 32%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; overflow: hidden; padding: 0 6px; }
.g-silly-voice .sv-ctext { font: 400 var(--lf, 17px)/1 var(--sv-hand); color: #1f2d7a; text-wrap: balance; rotate: -1.2deg; overflow-wrap: anywhere; }
.g-silly-voice .sv-ctitle { display: none; font: 900 15px/1 var(--sv-disp); color: #7a5200; letter-spacing: 0.05em; }
.g-silly-voice .sv-ctrack { display: none; font: 700 12px/1.05 var(--font-ui); color: #7a5200; letter-spacing: 0.02em; white-space: nowrap; }
.g-silly-voice .sv-cas.sv-gold .sv-clabel { top: 5%; height: 46%; gap: 1px; }
.g-silly-voice .sv-cas.sv-gold .sv-ctitle, .g-silly-voice .sv-cas.sv-gold .sv-ctrack { display: block; }
.g-silly-voice .sv-cas.sv-gold .sv-ctext { color: #4a2c00; }
.g-silly-voice .sv-cside { position: absolute; right: 5.5%; top: 9%; width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; background: #241634; color: #fff; font: 900 12px/1 var(--sv-disp); }
.g-silly-voice .sv-cas.sv-gold .sv-cside { background: #8a5b00; }
.g-silly-voice .sv-fader { position: absolute; z-index: 25; border-radius: 16px; background: linear-gradient(180deg, #2c2238, #140f1c); border: 2px solid #ffd36b;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15); touch-action: none; cursor: ns-resize; transform: translateX(130%); opacity: 0;
  transition: transform 0.5s cubic-bezier(.2, 1.3, .4, 1), opacity 0.3s ease; -webkit-tap-highlight-color: transparent; }
.g-silly-voice .sv-fader.sv-in { transform: none; opacity: 1; }
.g-silly-voice .sv-fader:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.g-silly-voice .sv-flab { position: absolute; left: 0; right: 0; top: 9px; text-align: center; font: 900 12px/1 var(--sv-disp); color: #ffd36b; letter-spacing: 0.06em; pointer-events: none; }
.g-silly-voice .sv-fslot { position: absolute; left: calc(50% - 4px); width: 8px; border-radius: 4px; background: #05030a; box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.9); pointer-events: none; }
.g-silly-voice .sv-ffill { position: absolute; left: calc(50% - 4px); width: 8px; border-radius: 4px; background: linear-gradient(0deg, #ff5d6c, #ffd36b); box-shadow: 0 0 10px rgba(255, 200, 100, 0.8); pointer-events: none; }
.g-silly-voice .sv-fcap { position: absolute; left: calc(50% - 30px); width: 60px; height: 30px; border-radius: 8px; pointer-events: none;
  background: linear-gradient(180deg, #fff6d6, #e8c46a 48%, #b8862a); box-shadow: 0 5px 10px rgba(0, 0, 0, 0.55), inset 0 1px 0 #fff; }
.g-silly-voice .sv-fcap::after { content: ""; position: absolute; left: 10px; right: 10px; top: 14px; height: 2px; background: #5a3a00; border-radius: 1px; }
.g-silly-voice .sv-shards { position: absolute; inset: 0; z-index: 27; pointer-events: none; overflow: hidden; }
.g-silly-voice .sv-shard { position: absolute; left: 0; top: 0; font-family: var(--sv-disp); font-weight: 900; color: #ffe08a; white-space: pre; will-change: transform; }
.g-silly-voice .sv-c .gk-bubble { max-width: min(250px, calc(100cqw - 24px)); }
.g-silly-voice .sv-c.gk-side-below .gk-bubble, .g-silly-voice .sv-c.gk-side-above .gk-bubble { max-width: min(340px, calc(100cqw - 40px)); }
.g-silly-voice .sv-c-loopie.gk-side-above .gk-bubble, .g-silly-voice .sv-c-glitch.gk-side-below .gk-bubble { left: auto; right: 0; }
.g-silly-voice .sv-c.gk-side-above .gk-bubble::after, .g-silly-voice .sv-c.gk-side-below .gk-bubble::after { content: ""; position: absolute; width: 13px; height: 13px; background: inherit; transform: rotate(45deg); }
.g-silly-voice .sv-c.gk-side-below .gk-bubble::after { top: -7px; left: 22px; border-left: 1px solid var(--ui-line); border-top: 1px solid var(--ui-line); }
.g-silly-voice .sv-c.gk-side-above .gk-bubble::after { bottom: -7px; left: 22px; border-right: 1px solid var(--ui-line); border-bottom: 1px solid var(--ui-line); }
.g-silly-voice .sv-c-glitch.gk-side-below .gk-bubble::after, .g-silly-voice .sv-c-loopie.gk-side-above .gk-bubble::after { left: auto; right: 22px; }
.g-silly-voice .gk-pop-text { font-family: var(--sv-disp); font-weight: 900; }
.g-silly-voice .gk-pop-text.gk-sv, .g-silly-voice .gk-pop-text.gk-svgrip { font-size: 28px; letter-spacing: 0.04em; color: #ffd36b;
  text-shadow: 2px 0 0 #241634, -2px 0 0 #241634, 0 2px 0 #241634, 0 -2px 0 #241634, 2px 2px 0 #241634, -2px 2px 0 #241634, 2px -2px 0 #241634, -2px -2px 0 #241634, 0 6px 12px rgba(20, 8, 40, 0.4); }
.g-silly-voice .gk-pop-text.gk-svgrip { font-size: 22px; color: #8af5c8; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const inten = ctx.intensity, visits = K.visits();
      const line = (o) => ctx.line(o);
      const red = () => K.reduced();
      const skin = K.dailyPick(SKINS, 3);
      const ROUNDS = [2, 3, 4][inten];
      const vnow = () => A.now() - A.latency();
      let CARE = an.safety === 'care';
      const gentle = (o) => (CARE ? o.Jolly : line(o));
      let phase = 'intro', finished = false;
      const V = Object.assign({}, CRITIC);
      const ST = { round: 0, setlist: [], target: null, match: null, grip: 100, played: [], found: [], tape: 0, lastScrub: 0, scrubI: 0, faceAt: 0, perf: null, trio: null, fader: 0, ejectReady: false, lastTune: 0 };

      /* ---------------- the line on the tape: the player's own words from the analysis, else an example ---------------- */
      function pickLine() {
        const ok = (s) => s && s.label && !s.generic;
        const strands = Array.isArray(an.strands) ? an.strands : [];
        // the inner critic's own line first (a "should have" or a mind-read), else the heaviest strand
        const all = (ok(an.core) ? [an.core] : []).concat(strands.filter(ok));
        let pick = all.find(s => s.loop === 'shouldhave') || all.find(s => s.loop === 'mindread') || null;
        if (!pick && ok(an.core) && an.core.loop !== 'body') pick = an.core;
        if (!pick) pick = strands.find(s => ok(s) && s.loop !== 'body');
        if (!pick && ok(an.core)) pick = an.core;
        if (!pick) pick = strands.find(ok);
        if (pick) return { text: String(pick.label).trim().toUpperCase().slice(0, 40), own: true };
        return { text: K.dailyPick(EXAMPLES, 7), own: false };
      }
      let LINE = pickLine();
      let SYL = syllabify(LINE.text);
      if (!SYL.length) SYL = syllabify('blah blah');
      ctx.analysisReady.then(a => {
        if (!a || typeof a !== 'object' || phase !== 'intro') return;
        an = a; CARE = an.safety === 'care'; LINE = pickLine(); SYL = syllabify(LINE.text); if (!SYL.length) SYL = syllabify('blah blah'); setLineText();
      }).catch(() => {});

      /* ---------------- the setlist: one voice per round, a new one unlocked each visit ---------------- */
      const featured = visits >= 1 && visits <= PRESETS.length - 3 ? PRESETS[2 + visits] : null;
      function unlockedList() { return CARE ? CARE_PRESETS.slice() : PRESETS.slice(0, Math.min(PRESETS.length, 3 + visits)); }
      function makeSetlist() {
        let order;
        if (CARE) order = CARE_PRESETS.slice();
        else if (!visits) order = PRESETS.slice(0, 3);
        else {
          const un = unlockedList().filter(p => p !== featured);
          order = (featured ? [featured] : []).concat(K.shuffle(un, K.rng(K.daily() + 31)));
        }
        const out = order.slice(0, ROUNDS);
        while (out.length < ROUNDS) out.push(FREE);
        return out;
      }

      /* ---------------- scene ---------------- */
      el.style.setProperty('--sv-acc', skin.acc); el.style.setProperty('--sv-ink', skin.ink); el.style.setProperty('--sv-key', skin.key);
      el.style.setProperty('--sv-keyink', skin.keyInk); el.style.setProperty('--sv-lcdbg', skin.lcd[0]); el.style.setProperty('--sv-lcdfg', skin.lcd[1]);
      const cv = K.canvas(el, { opaque: true, maxDpr: 1.5 });
      const P = K.particles({ max: 420 });
      const vb = h('div', { class: 'sv-vb sv-hide', 'aria-hidden': 'true' });
      const lineEl = h('div', { class: 'sv-line gk-user' });
      const exTag = h('span', { class: 'sv-ex', text: 'Example', hidden: true });
      vb.append(lineEl, exTag);
      const lcd = h('div', { class: 'sv-lcd', role: 'status', 'aria-live': 'polite' }, h('b', { text: 'SILLY-O-MATIC' }), h('small', { text: 'MODEL 3000' }));
      const lcd1 = lcd.querySelector('b'), lcd2 = lcd.querySelector('small');
      const vuLab = h('div', { class: 'sv-mlab', text: 'VU' }), gripLab = h('div', { class: 'sv-mlab', text: 'GRIP 100%' });
      const knobs = {};
      KEYS.forEach(k => {
        const hit = h('div', { class: 'sv-knob', role: 'slider', tabindex: '0', 'aria-label': KNAME[k] + ' knob. Drag up or down, or use the arrow keys.', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(V[k] * 100)) });
        const lab = h('div', { class: 'sv-klab', text: KNAME[k], 'aria-hidden': 'true' });
        knobs[k] = { k, hit, lab, x: 0, y: 0, R: 26, shown: V[k], kick: 0, zone: 0 };
        el.append(hit, lab);
      });
      const playKey = h('button', { type: 'button', class: 'sv-key sv-play sv-off', 'aria-label': 'Play the tape', html: ICON.play + '<span>PLAY</span>' });
      const ejectKey = h('button', { type: 'button', class: 'sv-key sv-eject sv-off', 'aria-label': 'Eject the tape', html: ICON.eject + '<span>EJECT</span>' });
      const bank = h('div', { class: 'sv-bank', 'aria-hidden': 'true' });
      const gid = 'svGold';
      const cas = h('div', { class: 'sv-cas', 'aria-hidden': 'true', html:
        '<svg viewBox="0 0 252 106"><defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".35" stop-color="#f2c443"/><stop offset=".6" stop-color="#fff0a8"/><stop offset="1" stop-color="#c8901a"/></linearGradient></defs>' +
        '<rect class="sv-win" x="54" y="56" width="144" height="30" rx="6"/>' +
        '<circle class="sv-pack sv-packL" cx="88" cy="71" r="24"/><circle class="sv-pack sv-packR" cx="164" cy="71" r="15"/>' +
        '<g class="sv-hub sv-hubL"><circle class="sv-hubc" cx="88" cy="71" r="10"/><circle class="sv-hubh" cx="88" cy="71" r="4.2"/>' + [0, 60, 120, 180, 240, 300].map(a => '<rect class="sv-hubh" x="86.6" y="62.2" width="2.8" height="4" transform="rotate(' + a + ' 88 71)"/>').join('') + '</g>' +
        '<g class="sv-hub sv-hubR"><circle class="sv-hubc" cx="164" cy="71" r="10"/><circle class="sv-hubh" cx="164" cy="71" r="4.2"/>' + [0, 60, 120, 180, 240, 300].map(a => '<rect class="sv-hubh" x="162.6" y="62.2" width="2.8" height="4" transform="rotate(' + a + ' 164 71)"/>').join('') + '</g>' +
        '<path class="sv-body" fill-rule="evenodd" d="M9 0H243A9 9 0 0 1 252 9V97A9 9 0 0 1 243 106H9A9 9 0 0 1 0 97V9A9 9 0 0 1 9 0ZM60 56H192A6 6 0 0 1 198 62V80A6 6 0 0 1 192 86H60A6 6 0 0 1 54 80V62A6 6 0 0 1 60 56Z"/>' +
        '<rect class="sv-paper" x="12" y="7" width="228" height="43" rx="4"/>' +
        '<line class="sv-rule" x1="18" y1="21" x2="234" y2="21"/><line class="sv-rule" x1="18" y1="33" x2="234" y2="33"/>' +
        '<rect class="sv-stripe" x="12" y="44" width="228" height="6"/>' +
        '<rect class="sv-paper2" x="10" y="5" width="232" height="49" rx="4"/>' +
        '<path class="sv-trap" d="M66 106L77 91H175L186 106Z"/>' +
        '<circle class="sv-screw" cx="7" cy="7" r="2.6"/><circle class="sv-screw" cx="245" cy="7" r="2.6"/><circle class="sv-screw" cx="7" cy="99" r="2.6"/><circle class="sv-screw" cx="245" cy="99" r="2.6"/><circle class="sv-screw" cx="126" cy="98" r="2.6"/>' +
        '</svg><div class="sv-clabel"><span class="sv-ctitle">GREATEST HITS</span><span class="sv-ctext gk-user"></span><span class="sv-ctrack"></span></div>' });
      const casText = cas.querySelector('.sv-ctext'), casTitle = cas.querySelector('.sv-ctitle'), casTrack = cas.querySelector('.sv-ctrack');
      const hubL = cas.querySelector('.sv-hubL'), hubR = cas.querySelector('.sv-hubR'), packL = cas.querySelector('.sv-packL'), packR = cas.querySelector('.sv-packR');
      const fader = h('div', { class: 'sv-fader', role: 'slider', tabindex: '-1', 'aria-label': 'Master fader: push up for the crescendo', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' },
        h('span', { class: 'sv-flab', text: 'MASTER' }), h('i', { class: 'sv-fslot' }), h('i', { class: 'sv-ffill' }), h('i', { class: 'sv-fcap' }));
      const fSlot = fader.querySelector('.sv-fslot'), fFill = fader.querySelector('.sv-ffill'), fCap = fader.querySelector('.sv-fcap');
      const shards = h('div', { class: 'sv-shards', 'aria-hidden': 'true' });
      el.append(lcd, vuLab, gripLab, playKey, ejectKey, bank, cas, vb, fader, shards);
      const loopie = K.character('loopie', { side: 'below', mood: 'happy', x: 12, y: 66, size: 60 });
      const glitch = K.character('glitch', { side: 'below', mood: 'cool', x: 300, y: 66, size: 60 });
      loopie.el.classList.add('sv-c', 'sv-c-loopie'); glitch.el.classList.add('sv-c', 'sv-c-glitch');
      const cast = { loopie, glitch };
      el.classList.toggle('sv-bright', !K.dark());

      const G = { w: 0, h: 0, phone: true, u: 1 };
      let M = { x: 0, y: 0, w: 370, h: 472, u: 1 }, VB = { x: 0, y: 0, w: 0, h: 0 }, BG = null, BGD = null, SPR = null, fsMax = 30;
      const mx = (x) => M.x + x * M.u, my = (y) => M.y + y * M.u;

      /* ---------------- layout ---------------- */
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        const phone = w < 700;
        let u;
        if (phone) u = K.clamp(Math.min((w - 20) / 370, (H - 14 - 228) / 472), 0.7, 1.15);
        else u = K.clamp((H - 300) / 472, 0.86, 1.3);
        M = { x: Math.round((w - 370 * u) / 2), y: Math.round(H - 14 - 472 * u), w: 370 * u, h: 472 * u, u };
        Object.assign(G, { w, h: H, phone, u });
        el.classList.toggle('sv-phone', phone);
        // voice bubble
        if (phone) VB = { x: 14, y: Math.min(214, M.y - 112), w: w - 28, h: 0 };
        else VB = { x: Math.round(w / 2 - Math.min(360, w * 0.3)), y: 78, w: Math.round(Math.min(720, w * 0.6)), h: 0 };
        VB.h = Math.max(80, M.y - 24 - VB.y);
        Object.assign(vb.style, { left: VB.x + 'px', top: VB.y + 'px', width: VB.w + 'px', height: VB.h + 'px' });
        fitLine();
        // top row: VU, LCD, GRIP
        const lw = 146 * u, lh = 70 * u;
        Object.assign(lcd.style, { left: mx(112) + 'px', top: my(14) + 'px', width: lw + 'px', height: lh + 'px' });
        G.lcdW = lw;
        vuLab.style.left = mx(59) + 'px'; vuLab.style.top = my(66) + 'px';
        gripLab.style.left = mx(311) + 'px'; gripLab.style.top = my(66) + 'px';
        // knobs
        KEYS.forEach((k, i) => {
          const kb = knobs[k], cx = mx(14 + 342 * (i + 0.5) / 4), cy = my(261);
          Object.assign(kb, { x: cx, y: cy, R: 26 * u });
          const hs = Math.max(64, 76 * u);
          Object.assign(kb.hit.style, { left: (cx - hs / 2) + 'px', top: (cy - hs / 2) + 'px', width: hs + 'px', height: hs + 'px' });
          kb.lab.style.left = cx + 'px'; kb.lab.style.top = my(302) + 'px';
        });
        // transport keys
        Object.assign(ejectKey.style, { left: mx(14) + 'px', top: my(328) + 'px', width: 84 * u + 'px', height: 56 * u + 'px' });
        Object.assign(playKey.style, { left: mx(106) + 'px', top: my(328) + 'px', width: 164 * u + 'px', height: 56 * u + 'px' });
        G.spk = { x: mx(314), y: my(356), r: 27 * u };
        // bank
        Object.assign(bank.style, { left: mx(14) + 'px', top: my(398) + 'px', width: 342 * u + 'px' });
        // cassette (in the deck unless it's out)
        G.cw = 252 * u; G.deck = { x: mx(14), y: my(94), w: 342 * u, h: 120 * u };
        G.casHome = { x: mx(59), y: my(101) };
        cas.style.setProperty('--cw', G.cw + 'px');
        fitLabel();
        // master fader (twist)
        G.fd = { x: mx(274), y: my(224), w: 82 * u, h: 164 * u };
        Object.assign(fader.style, { left: G.fd.x + 'px', top: G.fd.y + 'px', width: G.fd.w + 'px', height: G.fd.h + 'px' });
        const top = 30, bot = G.fd.h - 22;
        G.fd.t0 = top; G.fd.t1 = bot;
        Object.assign(fSlot.style, { top: top + 'px', height: (bot - top) + 'px' });
        // characters
        if (phone) {
          const sz = Math.round(K.clamp(66 * u, 54, 70));
          [loopie, glitch].forEach(c => c.el.style.setProperty('--sz', sz + 'px'));
          loopie.side('below'); glitch.side('below');
          loopie.place(12, 66); glitch.place(w - 12 - sz, 66);
          G.cab = null;
        } else {
          const sz = 104, cabW = Math.min(220, M.x - 60), cabH = Math.round(M.h * 0.6);
          G.cab = { w: cabW, h: cabH, l: M.x - 40 - cabW, r: M.x + M.w + 40, y: H - 14 - cabH };
          [loopie, glitch].forEach(c => c.el.style.setProperty('--sz', sz + 'px'));
          loopie.side('above'); glitch.side('above');
          loopie.place(G.cab.l + cabW / 2 - sz / 2, G.cab.y - sz + 6); glitch.place(G.cab.r + cabW / 2 - sz / 2, G.cab.y - sz + 6);
        }
        placeCassette();
        renderFader();
        paintAll();
      }
      S.on('theme', () => { el.classList.toggle('sv-bright', !K.dark()); paintAll(); });

      /* ---------------- the line in the voice bubble, styled live by the knobs ---------------- */
      let wordEls = [];
      function setLineText() {
        lineEl.innerHTML = '';
        wordEls = LINE.text.split(/\s+/).filter(Boolean).map((wd, i) => { if (i) lineEl.append(' '); const s = h('span', { class: 'sv-w', text: wd }); lineEl.append(s); return s; });
        casText.textContent = LINE.text;
        exTag.hidden = LINE.own; vb.classList.toggle('sv-hasex', !LINE.own);
        exTag.textContent = 'An example line';
        wordKick = wordEls.map(() => 0);
        fitLabel();
        fitLine();
      }
      let wordKick = [];
      /* The biggest size that really fits (measured once per text or layout change, never per frame). */
      function fitLine() {
        if (!VB.w || !wordEls.length) return;
        const iw = VB.w - 40, ih = VB.h - 26 - (LINE.own ? 0 : 18);
        lineEl.style.transition = 'none';
        lineEl.style.setProperty('--ls', '0.18em');
        let lo = 15, hi = 54;
        while (hi - lo > 1) { const m = (lo + hi) >> 1; lineEl.style.setProperty('--fs', m + 'px'); if (lineEl.scrollWidth <= iw + 1 && lineEl.offsetHeight <= ih) lo = m; else hi = m; }
        lineEl.style.setProperty('--fs', lo + 'px');
        void lineEl.offsetHeight;
        lineEl.style.transition = '';
        fsMax = lo; styleKey = '';
        styleLine();
      }
      function fitLabel() {
        const box = casText.parentNode;
        if (!box || !box.clientWidth || cas.classList.contains('sv-gold')) return;
        let f = 26;
        cas.style.setProperty('--lf', f + 'px');
        while (f > 15 && (box.scrollHeight > box.clientHeight + 1 || casText.scrollWidth > box.clientWidth + 1)) { f -= 1; cas.style.setProperty('--lf', f + 'px'); }
      }
      let styleKey = '';
      function styleLine(kind) {
        kind = kind || (ST.perf ? ST.perf.fx : 'live');
        const tint = kind === 'critic' ? '#fff4f4' : (ST.match ? ST.match.tint : (kind === 'live' ? '#241634' : (presetById(kind) || FREE).tint));
        const p = kind === 'critic' ? CRITIC.p : V.p, s = kind === 'critic' ? CRITIC.s : V.s, e = kind === 'critic' ? CRITIC.e : V.e;
        let fs = Math.max(15, Math.round(K.lerp(fsMax, Math.max(15, fsMax * 0.46), K.clamp((p - 0.05) / 0.9, 0, 1))));
        if (ST.trio) fs = Math.max(15, Math.round(fsMax * [0.78, 0.86, 0.93, 1][K.clamp(ST.trio.k + 1, 0, 3)]));
        const ls = K.lerp(0.18, -0.03, s).toFixed(3) + 'em';
        const ga = e > 0.12 && kind !== 'critic' ? e : 0;
        const gc = kind === 'critic' ? '255,93,108' : hexRgb(tint);
        const go = (0.05 + e * 0.07).toFixed(3);
        const ghost = ga ? (go + 'em -' + (go / 2).toFixed(3) + 'em 0 rgba(' + gc + ',' + (0.3 * ga).toFixed(2) + '), ' + (go * 2).toFixed(3) + 'em -' + go + 'em 0 rgba(' + gc + ',' + (0.13 * ga).toFixed(2) + ')') : 'none';
        const key = fs + ls + ghost + tint;
        if (key === styleKey) return;
        styleKey = key;
        lineEl.style.setProperty('--fs', fs + 'px'); lineEl.style.setProperty('--ls', ls); lineEl.style.setProperty('--ghost', ghost);
        lineEl.style.setProperty('--vc', ST.trio ? '#ffe08a' : tint);
      }
      function hexRgb(hx) { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hx || ''); return m ? parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) : '36,22,52'; }
      function presetById(id) { return PRESETS.concat(CARE_PRESETS).find(p => p.id === id) || null; }

      /* ---------------- LCD ---------------- */
      let lcdHold = 0;
      function lcdSet(a, b, flash) {
        lcd1.textContent = a; lcd2.textContent = b || '';
        const f1 = K.clamp((G.lcdW - 14) / (Math.max(6, a.length) * 0.6), 15, 26 * G.u), f2 = K.clamp((G.lcdW - 14) / (Math.max(8, (b || '').length) * 0.6), 13, 19 * G.u);
        lcd.style.setProperty('--f1', f1.toFixed(1) + 'px'); lcd.style.setProperty('--f2', f2.toFixed(1) + 'px');
        if (flash && !red()) { lcd.classList.remove('sv-flash'); void lcd.offsetWidth; lcd.classList.add('sv-flash'); }
      }
      function lcdTemp(b, ms) { lcd2.textContent = b; lcdHold = performance.now() + (ms || 900); }
      function hintFor(p) {
        if (!p || !p.r) return 'ANY VOICE';
        const need = Object.keys(p.r).filter(k => !inRange(p, k, V[k]));
        if (!need.length) return 'PRESS PLAY';
        return need.slice(0, 2).map(k => KNAME[k] + (V[k] < p.r[k][0] ? ' ▲' : ' ▼')).join(' ');
      }

      /* ---------------- painting (cached per layout, theme and skin) ---------------- */
      function off(w, hh) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * cv.dpr)); c.height = Math.max(1, Math.round(hh * cv.dpr)); const g = c.getContext('2d'); g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0); return { c, g, w, h: hh }; }
      function rr(g, x, y, w, hh, r) { r = Math.min(r, w / 2, hh / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      function radial(size, stops) { const s = off(size, size), g = s.g, gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, size, size); return s.c; }
      function paintAll() {
        if (!G.w) return;
        const D = K.dark();
        SPR = {
          glow: radial(128, [[0, 'rgba(255,255,255,0.9)'], [0.4, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]),
          warm: radial(256, [[0, 'rgba(255,214,140,0.55)'], [0.5, 'rgba(255,170,90,0.16)'], [1, 'rgba(255,150,80,0)']]),
          red: radial(128, [[0, 'rgba(255,70,70,0.9)'], [0.45, 'rgba(255,40,60,0.3)'], [1, 'rgba(255,40,60,0)']]),
          acc: radial(128, [[0, K.hexA(skin.acc, 0.9)], [0.45, K.hexA(skin.acc, 0.3)], [1, K.hexA(skin.acc, 0)]]),
          gold: radial(256, [[0, 'rgba(255,240,170,0.95)'], [0.35, 'rgba(255,200,80,0.4)'], [1, 'rgba(255,190,60,0)']]),
          spot: radial(256, [[0, 'rgba(0,0,0,0)'], [0.45, 'rgba(0,0,0,0.15)'], [1, 'rgba(0,0,0,0.85)']]),
          cap: capSprite()
        };
        BG = off(G.w, G.h);
        paintRoom(BG.g, D);
        paintMachine(BG.g);
        BGD = null;
        el.style.backgroundColor = D ? '#140c26' : '#fbe9f0';
      }
      function capSprite() {
        const R = 26 * M.u, pad = 6, s = off(R * 2 + pad * 2, R * 2 + pad * 2), g = s.g, c = R + pad;
        const gr = g.createRadialGradient(c - R * 0.35, c - R * 0.45, 2, c, c, R);
        gr.addColorStop(0, skin.knob[0]); gr.addColorStop(0.7, skin.knob[1]); gr.addColorStop(1, K.hexA(skin.cap, 0.9));
        g.fillStyle = gr; g.beginPath(); g.arc(c, c, R * 0.78, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = 1.2; g.beginPath(); g.arc(c, c, R * 0.74, Math.PI * 1.1, Math.PI * 1.65); g.stroke();
        g.strokeStyle = skin.cap; g.lineWidth = 3.4 * M.u; g.lineCap = 'round'; g.beginPath(); g.moveTo(c, c - R * 0.66); g.lineTo(c, c - R * 0.26); g.stroke();
        return s;
      }
      function paintRoom(g, D) {
        const w = G.w, H = G.h, R = K.rng(K.daily() + 9);
        const wall = g.createLinearGradient(0, 0, 0, H);
        if (D) { wall.addColorStop(0, '#120a24'); wall.addColorStop(0.6, '#2a1546'); wall.addColorStop(1, '#1a0f2c'); }
        else { wall.addColorStop(0, '#fde7f1'); wall.addColorStop(0.6, '#e9f1ff'); wall.addColorStop(1, '#e2f6ee'); }
        g.fillStyle = wall; g.fillRect(0, 0, w, H);
        if (D) {
          // acoustic foam wedges, very low contrast
          const s = G.phone ? 34 : 42;
          for (let y = 0; y < M.y + 40; y += s) for (let x = (y / s) % 2 ? -s / 2 : 0; x < w; x += s) {
            const k = ((x / s + y / s) | 0) % 2;
            g.fillStyle = k ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.12)';
            g.beginPath(); g.moveTo(x, y); g.lineTo(x + s, y); g.lineTo(x + s / 2, y + s); g.closePath(); g.fill();
          }
          // neon squiggle sign in the machine's colour
          const oa0 = onAirRect(), nx = G.phone ? w * 0.5 : w * 0.5, ny = G.phone ? oa0.y + oa0.h + 14 : 46;
          g.save(); g.globalCompositeOperation = 'lighter';
          g.globalAlpha = 0.5; g.drawImage(SPR.acc, nx - 150, ny - 70, 300, 140);
          g.restore();
          g.strokeStyle = skin.acc; g.lineWidth = 3; g.lineCap = 'round'; g.shadowColor = skin.acc; g.shadowBlur = 12;
          g.beginPath(); for (let i = 0; i <= 40; i++) { const x = nx - 70 + i * 3.5, y = ny + Math.sin(i * 0.55) * 9 * Math.sin(i / 40 * Math.PI); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
          g.shadowBlur = 0;
        } else {
          // pastel Memphis confetti on the wall
          const cols = ['#ff8cc6', '#7fe3c4', '#ffd36b', '#8fa8ff', '#ff9f6b'];
          for (let i = 0; i < (G.phone ? 26 : 60); i++) {
            const x = R() * w, y = R() * (M.y + 20), c = cols[i % cols.length], kind = i % 4, s = 6 + R() * 10;
            if (!G.phone && Math.abs(x - w / 2) < VB.w / 2 && y > VB.y - 10 && y < VB.y + VB.h + 10) continue;
            g.save(); g.translate(x, y); g.rotate(R() * TAU); g.globalAlpha = 0.55;
            g.fillStyle = c; g.strokeStyle = c; g.lineWidth = 3; g.lineCap = 'round';
            if (kind === 0) { g.beginPath(); g.moveTo(-s, 0); g.quadraticCurveTo(-s / 2, -s, 0, 0); g.quadraticCurveTo(s / 2, s, s, 0); g.stroke(); }
            else if (kind === 1) { g.beginPath(); g.moveTo(0, -s * 0.7); g.lineTo(s * 0.7, s * 0.5); g.lineTo(-s * 0.7, s * 0.5); g.closePath(); g.fill(); }
            else if (kind === 2) { g.beginPath(); g.arc(0, 0, s * 0.4, 0, TAU); g.fill(); }
            else { g.beginPath(); g.arc(0, 0, s * 0.6, 0, Math.PI); g.stroke(); }
            g.restore();
          }
        }
        // ON AIR sign
        const oa = onAirRect();
        g.fillStyle = D ? '#2a1418' : '#5a2a32'; rr(g, oa.x, oa.y, oa.w, oa.h, 7); g.fill();
        g.fillStyle = D ? '#5a2a30' : '#8a3a44'; rr(g, oa.x + 3, oa.y + 3, oa.w - 6, oa.h - 6, 5); g.fill();
        g.fillStyle = 'rgba(255,200,200,0.42)'; g.font = '400 ' + Math.round(oa.h * 0.52) + 'px ' + getComputedStyle(el).getPropertyValue('--sv-disp');
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ON AIR', oa.x + oa.w / 2, oa.y + oa.h / 2 + 1);
        // desk under the machine
        const dy = M.y + M.h * 0.58;
        const desk = g.createLinearGradient(0, dy, 0, H);
        if (D) { desk.addColorStop(0, '#3b2440'); desk.addColorStop(1, '#1d1222'); } else { desk.addColorStop(0, '#f6d9c4'); desk.addColorStop(1, '#e7bfa6'); }
        g.fillStyle = desk; g.fillRect(0, dy, w, H - dy);
        g.fillStyle = D ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)'; g.fillRect(0, dy, w, 2);
        // warm lamp pool behind the machine
        g.save(); g.globalCompositeOperation = D ? 'lighter' : 'source-over'; g.globalAlpha = D ? 0.55 : 0.35;
        g.drawImage(SPR.warm, M.x - M.w * 0.5, M.y - M.h * 0.35, M.w * 2, M.h * 1.4); g.restore();
        // desktop: speaker cabinets where Loopie and Glitch stand
        if (G.cab) { cabinet(g, G.cab.l, G.cab.y, G.cab.w, G.cab.h, D); cabinet(g, G.cab.r, G.cab.y, G.cab.w, G.cab.h, D); }
        // machine shadow on the desk
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(M.x + M.w / 2, M.y + M.h + 2, M.w * 0.52, 12 * M.u, 0, 0, TAU); g.fill();
      }
      function onAirRect() {
        if (G.phone) { const w = 92, hh = 30, y = Math.round(K.clamp((136 + VB.y) / 2 - 24, 76, VB.y - 46)); return { x: G.w / 2 - w / 2, y, w, h: hh }; }
        const w = 112, hh = 36; return { x: Math.round(Math.max(24, VB.x / 2 - w / 2)), y: Math.round(VB.y + VB.h / 2 - hh / 2), w, h: hh };
      }
      function cabinet(g, x, y, w, hh, D) {
        g.fillStyle = D ? '#1a1320' : '#3b3340'; rr(g, x, y, w, hh, 10); g.fill();
        g.fillStyle = D ? '#241a2c' : '#4a4152'; rr(g, x + 6, y + 6, w - 12, hh - 12, 7); g.fill();
        [0.3, 0.72].forEach((k, i) => {
          const cx = x + w / 2, cy = y + hh * k, r = Math.min(w, hh) * (i ? 0.3 : 0.19);
          g.fillStyle = '#0d0a10'; g.beginPath(); g.arc(cx, cy, r + 5, 0, TAU); g.fill();
          const cg = g.createRadialGradient(cx - r * 0.2, cy - r * 0.25, r * 0.1, cx, cy, r);
          cg.addColorStop(0, '#4a4452'); cg.addColorStop(0.55, '#26222c'); cg.addColorStop(1, '#141118');
          g.fillStyle = cg; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
          g.fillStyle = '#5a5464'; g.beginPath(); g.arc(cx, cy, r * 0.28, 0, TAU); g.fill();
        });
      }
      function paintMachine(g) {
        const u = M.u, x = M.x, y = M.y, w = M.w, hh = M.h;
        // handle
        g.strokeStyle = '#c9ced8'; g.lineWidth = 7 * u; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x + 86 * u, y + 4); g.lineTo(x + 100 * u, y - 18 * u); g.lineTo(x + w - 100 * u, y - 18 * u); g.lineTo(x + w - 86 * u, y + 4); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2 * u; g.beginPath(); g.moveTo(x + 102 * u, y - 20 * u); g.lineTo(x + w - 102 * u, y - 20 * u); g.stroke();
        // body
        g.fillStyle = skin.edge; rr(g, x, y + 6 * u, w, hh - 6 * u, 24 * u); g.fill();
        const bg = g.createLinearGradient(0, y, 0, y + hh);
        bg.addColorStop(0, skin.body[0]); bg.addColorStop(1, skin.body[1]);
        g.fillStyle = bg; rr(g, x, y, w, hh - 7 * u, 24 * u); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1.5; rr(g, x + 1.5, y + 1.5, w - 3, hh - 10 * u, 23 * u); g.stroke();
        // face panel
        g.fillStyle = skin.panel; rr(g, x + 8 * u, y + 8 * u, w - 16 * u, hh - 24 * u, 17 * u); g.fill();
        g.fillStyle = skin.panel2; rr(g, x + 8 * u, y + 218 * u, w - 16 * u, 2 * u, 1); g.fill();
        // meters
        meterFace(g, mx(14), my(14), 90 * u, 70 * u, 'vu');
        meterFace(g, mx(266), my(14), 90 * u, 70 * u, 'grip');
        // LCD bezel
        g.fillStyle = 'rgba(0,0,0,0.55)'; rr(g, mx(109), my(11), 152 * u, 76 * u, 11 * u); g.fill();
        // deck recess
        const d = G.deck;
        g.fillStyle = 'rgba(0,0,0,0.6)'; rr(g, d.x - 2, d.y - 2, d.w + 4, d.h + 4, 12 * u); g.fill();
        const dg = g.createLinearGradient(0, d.y, 0, d.y + d.h); dg.addColorStop(0, '#0d0b12'); dg.addColorStop(1, '#2a2632');
        g.fillStyle = dg; rr(g, d.x, d.y, d.w, d.h, 10 * u); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.05)'; g.beginPath(); g.moveTo(d.x + d.w * 0.55, d.y); g.lineTo(d.x + d.w * 0.75, d.y); g.lineTo(d.x + d.w * 0.45, d.y + d.h); g.lineTo(d.x + d.w * 0.25, d.y + d.h); g.closePath(); g.fill();
        // tape heads at the bottom of the deck
        g.fillStyle = '#8f939c'; rr(g, d.x + d.w / 2 - 22 * u, d.y + d.h - 9 * u, 44 * u, 7 * u, 2); g.fill();
        // knob seats
        KEYS.forEach(k => {
          const kb = knobs[k];
          g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.arc(kb.x, kb.y + 3 * u, kb.R * 0.98, 0, TAU); g.fill();
          g.fillStyle = skin.panel2; g.beginPath(); g.arc(kb.x, kb.y, kb.R * 0.9, 0, TAU); g.fill();
          // knurled skirt
          g.fillStyle = skin.cap; g.beginPath(); g.arc(kb.x, kb.y, kb.R * 0.86, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1;
          for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; g.beginPath(); g.moveTo(kb.x + Math.cos(a) * kb.R * 0.8, kb.y + Math.sin(a) * kb.R * 0.8); g.lineTo(kb.x + Math.cos(a) * kb.R * 0.86, kb.y + Math.sin(a) * kb.R * 0.86); g.stroke(); }
          // scale ticks
          g.strokeStyle = K.hexA(skin.ink, 0.35); g.lineWidth = 1.2;
          for (let i = 0; i <= 10; i++) { const a = (-135 + i * 27) * Math.PI / 180 - Math.PI / 2, r0 = kb.R + 13 * u, r1 = kb.R + 16 * u; g.beginPath(); g.moveTo(kb.x + Math.cos(a) * r0, kb.y + Math.sin(a) * r0); g.lineTo(kb.x + Math.cos(a) * r1, kb.y + Math.sin(a) * r1); g.stroke(); }
        });
        // speaker grille
        const sp = G.spk;
        g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(sp.x, sp.y, sp.r + 3, 0, TAU); g.fill();
        g.fillStyle = '#1b1820'; g.beginPath(); g.arc(sp.x, sp.y, sp.r, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.22)';
        for (let yy = -sp.r; yy <= sp.r; yy += 5 * u) for (let xx = -sp.r; xx <= sp.r; xx += 5 * u) { if (xx * xx + yy * yy < (sp.r - 4) * (sp.r - 4)) { g.beginPath(); g.arc(sp.x + xx, sp.y + yy, 1.1 * u, 0, TAU); g.fill(); } }
        // bank plate
        g.fillStyle = 'rgba(0,0,0,0.16)'; rr(g, mx(10), my(392), 350 * u, 70 * u, 10 * u); g.fill();
      }
      function meterFace(g, x, y, w, hh, kind) {
        g.fillStyle = 'rgba(0,0,0,0.5)'; rr(g, x - 3, y - 3, w + 6, hh + 6, 9); g.fill();
        const fg = g.createLinearGradient(0, y, 0, y + hh); fg.addColorStop(0, '#fff6dc'); fg.addColorStop(1, '#ecdcb2');
        g.fillStyle = fg; rr(g, x, y, w, hh, 7); g.fill();
        const px = x + w / 2, py = y + hh * 0.98, R = hh * 0.74;
        const a0 = -Math.PI / 2 - 0.9, a1 = -Math.PI / 2 + 0.9;
        g.lineWidth = 4;
        if (kind === 'vu') {
          g.strokeStyle = '#3a2c1c'; g.beginPath(); g.arc(px, py, R, a0, a0 + (a1 - a0) * 0.72); g.stroke();
          g.strokeStyle = '#d8352c'; g.beginPath(); g.arc(px, py, R, a0 + (a1 - a0) * 0.72, a1); g.stroke();
        } else {
          const zs = ['#2fa35a', '#e2b021', '#d8352c'];
          for (let i = 0; i < 3; i++) { g.strokeStyle = zs[i]; g.beginPath(); g.arc(px, py, R, a0 + (a1 - a0) * i / 3, a0 + (a1 - a0) * (i + 1) / 3 - 0.02); g.stroke(); }
        }
        g.strokeStyle = '#3a2c1c'; g.lineWidth = 1.2;
        for (let i = 0; i <= 8; i++) { const a = a0 + (a1 - a0) * i / 8, r0 = R - 7, r1 = R - (i % 2 ? 11 : 14); g.beginPath(); g.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0); g.lineTo(px + Math.cos(a) * r1, py + Math.sin(a) * r1); g.stroke(); }
        const gl = g.createLinearGradient(0, y, 0, y + hh * 0.5); gl.addColorStop(0, 'rgba(255,255,255,0.5)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gl; rr(g, x + 2, y + 2, w - 4, hh * 0.45, 6); g.fill();
      }

      /* ---------------- audio: the voice engine (per-syllable formant voices into a shared effects chain) ---------------- */
      let NB = null, WAVES = null, VBUS = null, ANA = null, ANABUF = null, ENG = null, motor = null, hiss = null;
      const audioNodes = [];
      function audioInit() {
        if (!A.ctx) return false;
        if (VBUS) return true;
        const c = A.ctx;
        try {
          VBUS = c.createGain(); VBUS.gain.value = 1;
          ANA = c.createAnalyser(); ANA.fftSize = 512; ANABUF = new Float32Array(ANA.fftSize);
          VBUS.connect(ANA); VBUS.connect(A.bus('sfx'));
          NB = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = NB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
          const wave = (n, pw) => { const re = new Float32Array(n + 1), im = new Float32Array(n + 1); for (let k = 1; k <= n; k++) im[k] = 1 / Math.pow(k, pw); return c.createPeriodicWave(re, im); };
          WAVES = { glot: wave(48, 1.35), buzz: wave(48, 0.85), soft: wave(24, 1.9) };
          ENG = { main: makeEngine(0, 1), loopie: makeEngine(-0.35, 0.9), glitch: makeEngine(0.35, 0.9) };
          motor = A.loop({ pink: true, filter: 'bandpass', freq: 150, q: 1.6 });
          hiss = A.loop({ filter: 'highpass', freq: 6500, q: 0.6 });
          ENG.main.setFx('critic', CRITIC);
          ENG.loopie.setFx('laugh', { e: 0.18 }); ENG.glitch.setFx('laugh', { e: 0.18 });
        } catch (e) { console.error(e); VBUS = null; return false; }
        return true;
      }
      S.on('audio-ready', () => { audioInit(); startBed(); });
      S.onDestroy(() => {
        try { if (motor) motor.stop(); if (hiss) hiss.stop(); } catch (e) { /* gone */ }
        audioNodes.forEach(n => { try { if (n.stop) n.stop(); } catch (e) { /* stopped */ } try { n.disconnect(); } catch (e) { /* gone */ } });
        ttsCancel();
      });
      function makeEngine(pan, vol) {
        const c = A.ctx, E = {};
        const n = (node) => { audioNodes.push(node); return node; };
        E.in = n(c.createGain());
        E.hp = n(c.createBiquadFilter()); E.hp.type = 'highpass'; E.hp.frequency.value = 70;
        E.lp = n(c.createBiquadFilter()); E.lp.type = 'lowpass'; E.lp.frequency.value = 8000; E.lp.Q.value = 0.5;
        E.dry = n(c.createGain());
        E.rm = n(c.createGain()); E.rm.gain.value = 0;
        E.rmOsc = n(c.createOscillator()); E.rmOsc.frequency.value = 40; E.rmOsc.connect(E.rm.gain); E.rmOsc.start();
        E.rmMix = n(c.createGain()); E.rmMix.gain.value = 0;
        E.sum = n(c.createGain());
        E.dl = n(c.createDelay(1.2)); E.dl.delayTime.value = 0.2;
        E.fb = n(c.createGain()); E.fb.gain.value = 0;
        E.dlp = n(c.createBiquadFilter()); E.dlp.type = 'lowpass'; E.dlp.frequency.value = 2600;
        E.wet = n(c.createGain()); E.wet.gain.value = 0;
        E.out = n(c.createGain()); E.out.gain.value = vol;
        E.in.connect(E.hp); E.hp.connect(E.lp);
        E.lp.connect(E.dry); E.dry.connect(E.sum);
        E.lp.connect(E.rm); E.rm.connect(E.rmMix); E.rmMix.connect(E.sum);
        E.sum.connect(E.dl); E.dl.connect(E.dlp); E.dlp.connect(E.fb); E.fb.connect(E.dl); E.dlp.connect(E.wet);
        E.sum.connect(E.out); E.wet.connect(E.out);
        let last = E.out;
        if (c.createStereoPanner) { const p = n(c.createStereoPanner()); p.pan.value = pan; E.out.connect(p); last = p; }
        last.connect(VBUS);
        E.setFx = (fx, v) => {
          const t = c.currentTime, tc = 0.04, e = v.e == null ? 0.2 : v.e;
          let lp = 7600, hp = 70, rmF = 40, rmMix = 0, dry = 1, dlt = 0.11 + e * 0.22, fb = Math.min(0.7, e * 0.64), wet = e * 0.8;
          if (fx === 'critic') { lp = 2700; }
          else if (fx === 'robot') { rmF = 36; rmMix = 1.25; dry = 0.3; lp = 5200; }
          else if (fx === 'alien') { rmF = 380; rmMix = 0.5; dry = 0.75; }
          else if (fx === 'sports') { hp = 420; lp = 3400; dlt = 0.16; }
          else if (fx === 'giant') { lp = 2300; }
          else if (fx === 'mouse') { hp = 300; }
          else if (fx === 'ghost') { lp = 3600; dlt = 0.32; }
          else if (fx === 'sleepy' || fx === 'lullaby') { lp = 3000; }
          else if (fx === 'radio') { hp = 160; lp = 4000; }
          else if (fx === 'trio') { dlt = 0.24; fb = 0.42; wet = 0.5; lp = 6800; }
          E.lp.frequency.setTargetAtTime(lp, t, tc); E.hp.frequency.setTargetAtTime(hp, t, tc);
          E.rmOsc.frequency.setTargetAtTime(rmF, t, tc); E.rmMix.gain.setTargetAtTime(rmMix, t, tc); E.dry.gain.setTargetAtTime(dry, t, tc);
          E.dl.delayTime.setTargetAtTime(dlt, t, 0.08); E.fb.gain.setTargetAtTime(fb, t, tc); E.wet.gain.setTargetAtTime(wet, t, tc);
        };
        E.syl = (t0, sy, Pm) => synthSyl(E, t0, sy, Pm);
        return E;
      }
      function envPts(gp, pts) { gp.setValueAtTime(0, pts[0][0]); for (let i = 1; i < pts.length; i++) gp.linearRampToValueAtTime(pts[i][1], pts[i][0]); }
      function noise(E, t, dur, f, q, vol, att) {
        const c = A.ctx; if (!c || !NB || vol <= 0.0005) return;
        const s = c.createBufferSource(); s.buffer = NB; s.loop = true;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = Math.min(16000, f); bp.Q.value = q;
        const g = c.createGain(); g.gain.value = 0;
        const a = att || 0.004;
        envPts(g.gain, [[t, 0], [t + a, vol], [t + Math.max(a + 0.002, dur - 0.012), vol * 0.8], [t + dur, 0]]);
        s.connect(bp); bp.connect(g); g.connect(E.in);
        s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03);
        s.onended = () => { try { g.disconnect(); bp.disconnect(); } catch (e) { /* gone */ } };
      }
      const PLO = { P: 850, T: 4200, K: 2100 }, FRI = { S: [6200, 2.4, 0.5], SH: [3000, 2, 0.45], F: [7400, 0.9, 0.16], TH: [6600, 1, 0.13] };
      function synthSyl(E, t0, sy, Pm) {
        const c = A.ctx; if (!c) return t0 + Pm.vdur;
        const sm = Pm.sm, on = sy.onset, co = sy.coda, amp = Pm.amp;
        const V1 = FORM[vowelA(sy.nuc)] || FORM.uh, V2 = DIPH[sy.nuc] ? FORM[DIPH[sy.nuc][1]] : null, fs = Pm.fs;
        let t = t0, vs = null, fStart = null;
        if (on) {
          if (PLO[on.cls]) {
            t += 0.016 / sm;
            noise(E, t, 0.014, PLO[on.cls], 1.4, (on.voiced ? 0.3 : 0.55) * amp);
            t += (on.voiced ? 0.012 : 0.034) / sm;
            if (!on.voiced) noise(E, t - 0.03 / sm, 0.03 / sm, 1700 * fs, 0.8, 0.12 * amp, 0.008);
          } else if (FRI[on.cls]) {
            const d = 0.068 / sm, F = FRI[on.cls];
            noise(E, t, d + 0.012, F[0], F[1], F[2] * amp, 0.012);
            if (on.voiced) vs = t + d * 0.35;
            t += d;
          } else if (on.cls === 'H') {
            const d = 0.05 / sm;
            noise(E, t, d + 0.02, V1[1] * fs, 1.1, 0.24 * amp, 0.01);
            t += d;
          } else if (on.cls === 'N') { vs = t; fStart = NASAL; t += 0.055 / sm; }
          else if (on.cls === 'L') { vs = t; fStart = GLIDE[on.l] || GLIDE.l; t += 0.045 / sm; }
        }
        const tA = t, vd = Pm.vdur, tB = tA + vd;
        let ve = tB, fEnd = null, tEnd = tB;
        if (co) {
          if (co.cls === 'N') { ve = tB + 0.06 / sm; fEnd = NASAL; tEnd = ve; }
          else if (co.cls === 'L') { ve = tB + 0.04 / sm; fEnd = GLIDE[co.l] || GLIDE.l; tEnd = ve; }
          else if (PLO[co.cls]) { tEnd = tB + 0.045 / sm; noise(E, tB + 0.03 / sm, 0.012, PLO[co.cls], 1.4, 0.22 * amp); }
          else if (FRI[co.cls]) { const F = FRI[co.cls]; noise(E, tB - 0.012, 0.075 / sm, F[0], F[1], F[2] * 0.85 * amp, 0.012); tEnd = tB + 0.06 / sm; }
        }
        if (vs == null) vs = tA;
        const o = c.createOscillator(); o.setPeriodicWave(Pm.wave || WAVES.glot);
        const f0a = Math.max(30, Pm.f0), f0b = Math.max(30, Pm.f0end || Pm.f0);
        o.frequency.setValueAtTime(f0a, vs); o.frequency.linearRampToValueAtTime(f0b, ve);
        const nodes = [o];
        if (Pm.vibC > 2) {
          const l = c.createOscillator(); l.frequency.value = Pm.vibHz || 5.5; const lg = c.createGain();
          lg.gain.setValueAtTime(Pm.vibC * (Pm.vibGrow ? 0.4 : 1), vs); if (Pm.vibGrow) lg.gain.linearRampToValueAtTime(Pm.vibC, ve);
          l.connect(lg); lg.connect(o.detune); l.start(vs); l.stop(ve + 0.08); nodes.push(l, lg);
        }
        const g = c.createGain(); g.gain.value = 0;
        // high voices land more harmonics on the formant peaks: compensate so every voice sits at a similar loudness
        const comp = K.clamp(Math.pow(140 / Math.max(40, f0a), 0.55), 0.34, 1.1);
        const pk = amp * 0.15 * comp, rel = Math.min(0.035, vd * 0.3);
        const pts = [[vs, 0]];
        if (vs < tA - 0.005) { pts.push([vs + 0.012, pk * 0.45], [tA + 0.015, pk]); } else pts.push([tA + Math.min(0.025, vd * 0.25), pk]);
        pts.push([tB - rel, pk * (Pm.swell ? 1.25 : 0.92)]);
        if (ve > tB + 0.005) pts.push([tB + 0.01, pk * 0.45], [ve, 0]); else pts.push([tB + 0.012, 0]);
        envPts(g.gain, pts);
        o.connect(g); nodes.push(g);
        // three formant peaks in series, then a gentle top cut
        let node = g;
        const GAINS = [13, 11, 7], QS = [2.6, 3.4, 4.2];
        for (let k = 0; k < 3; k++) {
          const f = c.createBiquadFilter(); f.type = 'peaking'; f.Q.value = QS[k]; f.gain.value = GAINS[k];
          f.frequency.setValueAtTime(Math.min(9000, (fStart ? fStart[k] : V1[k]) * fs), vs);
          if (fStart) f.frequency.setTargetAtTime(Math.min(9000, V1[k] * fs), tA - 0.01, 0.018);
          if (V2) f.frequency.setTargetAtTime(Math.min(9000, V2[k] * fs), tA + vd * 0.4, vd * 0.22);
          if (fEnd) f.frequency.setTargetAtTime(Math.min(9000, fEnd[k] * fs), tB - 0.01, 0.02);
          node.connect(f); node = f; nodes.push(f);
        }
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(12000, 3600 * fs); lp.Q.value = 0.4;
        node.connect(lp); lp.connect(E.in); nodes.push(lp);
        if (Pm.sub) {
          const so = c.createOscillator(); so.type = 'sine'; so.frequency.setValueAtTime(f0a / 2, vs); so.frequency.linearRampToValueAtTime(f0b / 2, ve);
          const sg = c.createGain(); sg.gain.value = 0; envPts(sg.gain, pts.map(([tt, v]) => [tt, v * Pm.sub * 2.2]));
          so.connect(sg); sg.connect(E.in); so.start(vs); so.stop(ve + 0.06); nodes.push(so, sg);
        }
        if (Pm.breath) noise(E, tA, vd, V1[1] * fs, 1.4, Pm.breath * 0.22 * amp, 0.02);
        o.start(vs); o.stop(ve + 0.08);
        o.onended = () => nodes.forEach(nd => { try { nd.disconnect(); } catch (e) { /* gone */ } });
        return Math.max(tEnd, ve);
      }
      function onsetDur(sy, sm) {
        const on = sy.onset; if (!on) return 0;
        if (PLO[on.cls]) return (0.016 + (on.voiced ? 0.012 : 0.034)) / sm;
        if (FRI[on.cls]) return 0.068 / sm;
        if (on.cls === 'H') return 0.05 / sm;
        if (on.cls === 'N') return 0.055 / sm;
        return 0.045 / sm;
      }
      /* Knobs -> voice. Pitch moves the voice and its formants together (that's what makes helium squeak). */
      function voiceParams(v, fx) {
        const Pm = {
          f0: 52 * Math.pow(2, v.p * 3.7), fs: Math.pow(2, (v.p - 0.4) * 1.25), sm: Math.pow(2, (v.s - 0.45) * 2.4),
          vibC: Math.pow(v.w, 1.4) * 140, vibHz: 4.6 + v.w * 2.6, sing: v.w > 0.35 ? (v.w - 0.35) * 6 : 0, mono: v.w < 0.05,
          amp: 1, sub: 0, breath: 0, wave: WAVES ? WAVES.glot : null
        };
        Pm.gap = 0.055 / Pm.sm;
        if (fx === 'giant') Pm.sub = 0.45;
        if (fx === 'robot') { Pm.wave = WAVES && WAVES.buzz; Pm.vibC = 0; Pm.sing = 0; Pm.mono = true; }
        if (fx === 'alien') { Pm.wave = WAVES && WAVES.buzz; }
        if (fx === 'ghost' || fx === 'sleepy' || fx === 'lullaby') Pm.breath = 0.6;
        if (fx === 'opera') Pm.sing = Math.max(Pm.sing, 4);
        if (fx === 'mouse') Pm.amp = 0.85;
        if (fx === 'radio' || fx === 'narrator') { Pm.sing = 0; Pm.vibC = Math.min(Pm.vibC, 12); }
        return Pm;
      }
      /* Speak the line with the babble voice. Returns per-word times (audio clock) for the bouncing words. */
      function babble(E, v, fx, t0, spin) {
        const Pm = voiceParams(v, fx), N = SYL.length, words = [];
        const q = /\?$/.test(LINE.text);
        let t = t0;
        SYL.forEach((sy, k) => {
          const prog = N > 1 ? k / (N - 1) : 0;
          let f0 = Pm.f0 * (Pm.mono ? 1 : (1.07 - 0.15 * prog)) * (sy.stress && !Pm.mono ? 1.06 : 1);
          if (Pm.sing) f0 *= Math.pow(2, (k % 2 ? 1 : -1) * Pm.sing / 12);
          const sp = spin ? Math.min(1, 0.68 + 0.32 * Math.max(0, (t - t0) / 0.3)) : 1;
          const f0e = f0 * (sy.last ? (q ? 1.18 : (Pm.mono ? 1 : 0.84)) : (Pm.mono ? 1 : 0.97));
          const vd = (0.15 * (sy.stress ? 1.22 : 1) * (sy.last ? 1.45 : 1)) / Pm.sm;
          if (!words[sy.wi]) words[sy.wi] = { t0: t, t1: t };
          const end = E.syl(t, sy, { f0: f0 * sp, f0end: f0e * Math.min(1, sp + 0.15), fs: Pm.fs, vdur: vd, sm: Pm.sm, amp: Pm.amp * (sy.stress ? 1.08 : 1), vibC: Pm.vibC, vibHz: Pm.vibHz, sub: Pm.sub, breath: Pm.breath, wave: Pm.wave });
          words[sy.wi].t1 = end;
          t = end + (sy.wordEnd ? Pm.gap : 0.01 / Pm.sm);
        });
        for (let i = 0; i < words.length; i++) if (!words[i]) words[i] = { t0: t, t1: t };
        return { words, end: t };
      }
      /* One syllable while a knob turns: the knob scrubs through the tape. */
      function scrub(k) {
        if (!audioInit() || !SYL.length) return;
        const now = performance.now(); if (now - ST.lastScrub < 72) return;
        ST.lastScrub = now;
        const sy = SYL[ST.scrubI % SYL.length]; ST.scrubI++;
        const fx = ST.match ? ST.match.id : 'live';
        ENG.main.setFx(fx, V);
        const Pm = voiceParams(V, fx), t = A.now() + 0.012;
        ENG.main.syl(t, Object.assign({}, sy, { onset: sy.onset && (PLO[sy.onset.cls] ? null : sy.onset) }), { f0: Pm.f0 * (Pm.sing ? Math.pow(2, (ST.scrubI % 2 ? 1 : -1) * Pm.sing / 12) : 1), f0end: Pm.f0 * 0.96, fs: Pm.fs, vdur: Math.min(0.12, 0.09 / Math.sqrt(Pm.sm)), sm: Math.max(1.4, Pm.sm), amp: 0.62, vibC: Pm.vibC, vibHz: Pm.vibHz, sub: Pm.sub, breath: Pm.breath, wave: Pm.wave });
        if (wordKick.length) wordKick[sy.wi] = 1;
        void k;
      }
      /* Laughter (and in care mode, a warm hum instead). */
      function laugh(who, delay) {
        if (!audioInit()) return;
        const E = ENG[who], t0 = A.now() + (delay || 0);
        if (CARE) {
          E.syl(t0, { onset: { cls: 'N', voiced: true }, nuc: 'uh', coda: { cls: 'N', voiced: true } }, { f0: who === 'loopie' ? 300 : 150, f0end: who === 'loopie' ? 270 : 135, fs: who === 'loopie' ? 1.3 : 1, vdur: 0.22, sm: 1, amp: 0.55, vibC: 0, breath: 0.2, wave: WAVES.soft });
          return;
        }
        const n = who === 'loopie' ? 6 : 5;
        let t = t0;
        for (let i = 0; i < n; i++) {
          const lp = who === 'loopie';
          const f0 = lp ? 430 * Math.pow(0.95, i) : 165 * (i % 2 ? 1.14 : 0.92) * (i === n - 1 ? 0.8 : 1);
          E.syl(t, { onset: { cls: 'H' }, nuc: lp ? 'a' : 'e', coda: null }, { f0, f0end: f0 * 0.88, fs: lp ? 1.38 : 1.06, vdur: lp ? 0.075 : 0.06, sm: 1.2, amp: (lp ? 0.95 : 0.85) - i * 0.07, vibC: 0, breath: 0.4, wave: lp ? WAVES.glot : WAVES.buzz });
          t += lp ? 0.15 : (i === 1 ? 0.07 : 0.13);
        }
      }
      /* Mechanical sounds of the machine. */
      function clunk(v) { if (!A.ctx) return; A.thud({ vol: 0.22 * (v || 1) }); A.click({ vol: 0.14 }); A.wood(undefined, 0.1, 0.62); A.sync('key', performance.now()); }
      function tick(val) { if (!A.ctx) return; A.click({ vol: 0.05 }); A.tone({ type: 'square', freq: 900 + val * 900, dur: 0.012, vol: 0.018, lp: 3000 }); }
      function beep(n) { if (!A.ctx) return; for (let i = 0; i < (n || 2); i++) A.tone({ when: A.now() + i * 0.09, type: 'square', freq: 1760, dur: 0.05, vol: 0.035, lp: 4000 }); }
      function motorTo(on, glide) {
        if (!A.ctx) return;
        if (motor) { motor.level(on ? 0.05 : 0.0001, glide || 0.12); motor.freq(on ? 160 : 70, glide || 0.25); }
        if (hiss) hiss.level(on ? 0.012 : 0.0001, 0.2);
        if (!on) A.tone({ type: 'sine', freq: 220, to: 70, glide: 0.35, dur: 0.4, vol: 0.03 });
        else A.tone({ type: 'sine', freq: 80, to: 230, glide: 0.25, dur: 0.3, vol: 0.025 });
      }
      /* A signature bed for each voice, played around the line. */
      function bedFor(fx, t0, t1) {
        if (!A.ctx) return;
        const d = Math.max(0.6, t1 - t0);
        if (fx === 'critic') { A.tone({ when: t0, type: 'sawtooth', freq: A.note('D2'), dur: d + 0.6, vol: 0.035, attack: 0.3, lp: 260 }); A.tone({ when: t0, type: 'sawtooth', freq: A.note('A2') * 1.004, dur: d + 0.6, vol: 0.02, attack: 0.4, lp: 300 }); }
        if (fx === 'helium') { [0, 0.07, 0.15].forEach((o, i) => A.tone({ when: t0 - 0.25 + o, type: 'sine', freq: 1100 + i * 260, to: 1700 + i * 300, glide: 0.06, dur: 0.07, vol: 0.03 })); A.noise({ when: t1 + 0.05, filter: 'highpass', freq: 2600, dur: 0.45, attack: 0.02, vol: 0.05 }); }
        if (fx === 'giant') for (let tt = t0; tt < t1; tt += 0.9) { A.tone({ when: tt, type: 'sine', freq: 58, to: 36, glide: 0.4, dur: 0.55, vol: 0.28 }); A.noise({ when: tt, filter: 'lowpass', freq: 260, dur: 0.35, vol: 0.12 }); }
        if (fx === 'robot') { for (let tt = t0 + 0.2; tt < t1; tt += 0.55) A.tone({ when: tt, type: 'square', freq: 300, to: 520, glide: 0.1, dur: 0.12, vol: 0.016, lp: 1500 }); ['C6', 'G5', 'E6'].forEach((n, i) => A.tone({ when: t1 + 0.1 + i * 0.09, type: 'square', freq: A.note(n), dur: 0.07, vol: 0.02, lp: 3500 })); }
        if (fx === 'opera') { A.pad(['C3', 'G3', 'C4', 'E4'].map(n => A.note(n)), { when: t0 - 0.1, dur: d + 1.4, vol: 0.12, attack: 0.4, lp: 1800 }); A.drum(t0 - 0.1, 0.32, 0.42, 0.3); A.drum(t1, 0.36, 0.42, 0.3); }
        if (fx === 'sports') { A.noise({ when: t0 - 0.3, filter: 'bandpass', freq: 900, q: 0.5, dur: d + 1.2, attack: 0.5, vol: 0.06 }); [349, 440, 523].forEach(f => A.tone({ when: t1 + 0.08, type: 'sawtooth', freq: f, dur: 0.7, vol: 0.022, attack: 0.02, lp: 2200 })); }
        if (fx === 'mouse') { [0, 0.1].forEach(o => A.tone({ when: t0 - 0.2 + o, type: 'sine', freq: 2600, to: 3400, glide: 0.05, dur: 0.06, vol: 0.025 })); A.tone({ when: t1 + 0.05, type: 'sine', freq: 3000, to: 3800, glide: 0.04, dur: 0.05, vol: 0.022 }); }
        if (fx === 'ghost') { A.tone({ when: t0 - 0.2, type: 'sine', freq: 520, to: 880, glide: d * 0.5, dur: d * 0.6, vol: 0.022, attack: 0.3 }); A.tone({ when: t0 + d * 0.5, type: 'sine', freq: 880, to: 470, glide: d * 0.5, dur: d * 0.55 + 0.5, vol: 0.022 }); A.noise({ when: t0 - 0.2, filter: 'bandpass', freq: 500, q: 0.6, dur: d + 0.8, attack: 0.5, vol: 0.04 }); }
        if (fx === 'alien') { A.noise({ when: t0 - 0.3, filter: 'bandpass', freq: 3200, q: 2, dur: 0.3, vol: 0.035 }); A.tone({ when: t1 + 0.05, type: 'sine', freq: 220, to: 2200, glide: 0.5, dur: 0.55, vol: 0.025 }); }
        if (fx === 'sleepy') { A.tone({ when: t1 + 0.1, type: 'sine', freq: 330, to: 200, glide: 0.8, dur: 0.9, vol: 0.02, attack: 0.2 }); }
        if (fx === 'radio') { for (let i = 0; i < 18; i++) A.noise({ when: t0 - 0.3 + Math.random() * (d + 0.6), filter: 'highpass', freq: 3000, dur: 0.006, vol: 0.03 }); A.pad(['F3', 'A3', 'C4', 'E4'].map(n => A.note(n)), { when: t0, dur: d + 1, vol: 0.06, attack: 0.5, lp: 1100 }); }
        if (fx === 'lullaby') { ['E5', 'G5', 'C6', 'G5', 'E5', 'D5'].forEach((n, i) => A.chime(A.note(n), { when: t0 + i * d / 6, vol: 0.035, dur: 1.2 })); }
        if (fx === 'narrator') { A.pad(['D3', 'A3', 'D4', 'F#4'].map(n => A.note(n)), { when: t0, dur: d + 1, vol: 0.07, attack: 0.6, lp: 1200 }); [0, 0.12].forEach(o => A.tone({ when: t1 + 0.2 + o, type: 'sine', freq: 3200, to: 4100, glide: 0.06, dur: 0.08, vol: 0.012 })); }
      }

      /* ---------------- speech: on-device voices only ---------------- */
      const SS = (typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function') ? window.speechSynthesis : null;
      let TTS = { voice: null, alt: {}, ok: true, speaking: false };
      function pickVoices() {
        if (!SS) return;
        let vs = [];
        try { vs = SS.getVoices() || []; } catch (e) { vs = []; }
        const local = vs.filter(v => v && v.localService === true);
        const en = local.filter(v => /^en([-_]|$)/i.test(v.lang || ''));
        const novelty = /^(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|princess|deranged|hysterical|pipe organ)\b/i;
        const plain = en.filter(v => !novelty.test(v.name || ''));
        const rank = (v) => (/en[-_]AU/i.test(v.lang) ? 0 : /en[-_]GB/i.test(v.lang) ? 1 : /en[-_]US/i.test(v.lang) ? 2 : 3) - (v.default ? 0.5 : 0);
        plain.sort((a, b) => rank(a) - rank(b));
        TTS.voice = plain[0] || null;
        // the device's own novelty voices (still on-device) make some presets sillier still
        const alt = (re) => en.find(v => re.test(v.name || '')) || null;
        TTS.alt = { robot: alt(/^(zarvox|trinoids)\b/i), ghost: alt(/^whisper\b/i), opera: alt(/^(cellos|good news|organ)\b/i), alien: alt(/^(wobble|bubbles|trinoids)\b/i) };
      }
      if (SS) { pickVoices(); try { S.listen(SS, 'voiceschanged', pickVoices); } catch (e) { /* old browser */ } }
      const ttsReady = () => !!(SS && TTS.voice && TTS.ok && S.settings.sound);
      function ttsCancel() { if (SS && TTS.speaking) { try { SS.cancel(); } catch (e) { /* gone */ } } TTS.speaking = false; }
      S.on('settings', ({ key, value }) => { if (key === 'sound' && !value) ttsCancel(); });
      /* Speak through the device's own voice. Calls onWord(i) as each word starts; resolves when done. */
      function ttsSpeak(v, fx, onWord) {
        return new Promise((resolve) => {
          const words = LINE.text.toLowerCase().replace(/[“”"…]/g, '').replace(/[’‘]/g, "'").split(/\s+/).filter(Boolean);
          const voice = (TTS.alt[fx] || TTS.voice);
          const pitch = K.clamp(0.1 + v.p * 1.9, 0.1, 2), rate = K.clamp(0.5 + v.s * 1.35, 0.5, 2);
          const chunks = [];
          if (v.w > 0.45 && words.length > 1 && fx !== 'robot' && !TTS.alt[fx]) words.forEach((wd, i) => chunks.push({ text: wd, wi: i, pitch: K.clamp(pitch * (i % 2 ? 1 + v.w * 0.35 : 1 - v.w * 0.25), 0.1, 2), vol: 0.85 }));
          else chunks.push({ text: words.join(' '), wi: 0, whole: true, pitch, vol: 0.85 });
          if (v.e > 0.45 && words.length) { const lw = words[words.length - 1]; chunks.push({ text: lw, wi: -1, pitch, vol: 0.4 }); if (v.e > 0.75) chunks.push({ text: lw, wi: -1, pitch, vol: 0.18 }); }
          const est = words.reduce((a, wd) => a + 0.14 + wd.length * 0.06, 0) / rate + chunks.length * 0.12;
          let done = false, started = false, starts = [];
          const fin = (ok) => { if (done) return; done = true; TTS.speaking = false; S.cancel(guard); S.cancel(startGuard); resolve(ok); };
          const guard = S.later(() => { ttsCancel(); fin(true); }, (est * 2.6 + 2.5) * 1000);
          const startGuard = S.later(() => { if (!started) { TTS.ok = false; ttsCancel(); fin(false); } }, 1500);
          try { SS.cancel(); } catch (e) { /* nothing queued */ }
          TTS.speaking = true;
          chunks.forEach((ch, ci) => {
            let u;
            try { u = new window.SpeechSynthesisUtterance(ch.text); } catch (e) { fin(false); return; }
            u.voice = voice; u.lang = voice.lang; u.pitch = ch.pitch; u.rate = rate; u.volume = ch.vol;
            u.onstart = () => {
              started = true;
              if (ch.whole) { onWord(0, true); starts = estimateStarts(words, rate); TTS.wholeAt = performance.now(); TTS.boundary = false; TTS.est = starts; }
              else if (ch.wi >= 0) onWord(ch.wi, false); else onWord(-1, false);
            };
            if (ch.whole) u.onboundary = (e) => { if (e.name && e.name !== 'word') return; TTS.boundary = true; onWord(wordAtChar(words, e.charIndex), false); };
            u.onend = () => { if (ci === chunks.length - 1) fin(true); };
            u.onerror = () => { if (ci === chunks.length - 1) fin(started); };
            try { SS.speak(u); } catch (e) { fin(false); }
          });
        });
      }
      function estimateStarts(words, rate) { const out = []; let t = 0; words.forEach(wd => { out.push(t); t += (0.14 + wd.length * 0.06) / rate; }); return out; }
      function wordAtChar(words, ci) { let n = 0; for (let i = 0; i < words.length; i++) { if (ci < n + words[i].length + 1) return i; n += words[i].length + 1; } return words.length - 1; }

      /* ---------------- the lounge bed between takes ---------------- */
      const BED = { on: false, next: 0, beat: 0, bpm: 90 };
      const BCH = [['F3', 'A3', 'C4', 'E4', 'F2'], ['E3', 'G3', 'B3', 'D4', 'E2'], ['D3', 'F3', 'A3', 'C4', 'D2'], ['C3', 'E3', 'G3', 'B3', 'C2']];
      function startBed() { if (!A.ctx || BED.on || phase === 'intro' || phase === 'twist' || phase === 'trio' || phase === 'end') return; BED.on = true; BED.next = A.now() + 0.1; }
      S.loop(() => {
        if (!BED.on || !A.ctx) return;
        const now = A.now(), ahead = now + 0.25, bl = 60 / BED.bpm;
        if (BED.next < now - 0.5) BED.next = now + 0.05;
        while (BED.next < ahead) {
          const t = BED.next, b = BED.beat % 4, ch = BCH[Math.floor(BED.beat / 4) % 4];
          if (b === 0) {
            ch.slice(0, 4).forEach((n, i) => { const f = A.note(n); A.tone({ when: t + i * 0.014, type: 'sine', freq: f, dur: bl * 3.6, vol: 0.026, attack: 0.012, bus: 'music' }); A.tone({ when: t + i * 0.014, type: 'sine', freq: f * 2.01, dur: 0.35, vol: 0.007, attack: 0.003, bus: 'music' }); });
            A.pluck(A.note(ch[4]), { when: t, vol: 0.2, damp: 0.993, lp: 520, bus: 'music' });
          }
          if (b === 2) A.pluck(A.note(ch[4]) * 1.5, { when: t, vol: 0.13, damp: 0.992, lp: 520, bus: 'music' });
          if (b === 1 || b === 3) A.noise({ when: t, filter: 'bandpass', freq: 3600, q: 0.6, dur: 0.16, attack: 0.04, vol: 0.022, bus: 'music' });
          if (b === 3 && BED.beat % 8 === 7) A.noise({ when: t + bl * 0.5, filter: 'highpass', freq: 7000, dur: 0.05, vol: 0.016, bus: 'music' });
          BED.next += bl; BED.beat++;
        }
      });
      function duck(on) { if (A.ctx) A.busLevel('music', on ? 0.12 : 0.6, on ? 0.12 : 0.6); }

      /* ---------------- presets: matching and zones ---------------- */
      const slack = [0.06, 0, -0.015][inten];
      /* A knob's target zone: intensity widens or narrows it, a zone touching the end of the dial always includes the end,
         and no zone is ever narrower than a comfortable twist. */
      function zoneOf(p, k) {
        const r = p.r && p.r[k]; if (!r) return null;
        let lo = r[0] - slack, hi = r[1] + slack;
        if (r[0] <= 0.001) lo = -1;
        if (r[1] >= 0.999) hi = 2;
        if (hi - lo < 0.07) { const c = (lo + hi) / 2; lo = c - 0.035; hi = c + 0.035; }
        return [lo, hi];
      }
      function inRange(p, k, v, extra) { const z = zoneOf(p, k); if (!z) return true; return v >= z[0] - (extra || 0) && v <= z[1] + (extra || 0); }
      function matches(p, extra) { return !!(p && p.r) && Object.keys(p.r).every(k => inRange(p, k, V[k], extra)); }
      function findMatch() {
        const list = unlockedList();
        if (ST.match && matches(ST.match, 0.02)) return ST.match;
        if (ST.target && ST.target.r && matches(ST.target)) return ST.target;
        const hits = list.filter(p => matches(p) && (p === ST.target || !ST.played.some(x => x.id === p.id)));
        if (!hits.length) return null;
        hits.sort((a, b) => Object.keys(b.r).length - Object.keys(a.r).length);
        return hits[0];
      }
      function nextKnob(p) {
        if (!p || !p.r) return null;
        for (const k of KEYS) { const r = p.r[k]; if (!r) continue; if (!inRange(p, k, V[k])) return { k, dir: V[k] < r[0] ? 1 : -1 }; }
        return null;
      }
      function customName(v) {
        const adj = v.w > 0.7 ? 'WOBBLY' : v.e > 0.7 ? 'COSMIC' : v.w < 0.1 ? 'DEADPAN' : v.s > 0.7 ? 'TURBO' : v.e < 0.12 ? 'TINNY' : 'FUNKY';
        const noun = v.p > 0.66 ? (v.s > 0.6 ? 'CHIPMUNK' : 'CANARY') : v.p < 0.3 ? (v.s > 0.6 ? 'TROLL' : 'WALRUS') : (v.s > 0.7 ? 'DUCK' : v.s < 0.3 ? 'SLOTH' : 'TOASTER');
        return adj + ' ' + noun;
      }

      /* ---------------- input: knobs ---------------- */
      const tuning = () => phase === 'tune';
      function setKnob(k, v, quiet) {
        v = K.clamp(v, 0, 1);
        const before = Math.round(V[k] * STEPS), after = Math.round(v * STEPS);
        V[k] = v;
        knobs[k].hit.setAttribute('aria-valuenow', String(Math.round(v * 100)));
        if (before !== after && !quiet) {
          tick(v); knobs[k].kick = 1; scrub(k);
          lcdTemp(KNAME[k] + ' ' + Math.round(v * 100) + '%', 1100);
          reactToKnob(k, v);
          if (S.buzz && G.phone) S.buzz(4);
        }
        styleLine('live');
        if (!quiet) checkMatch();
      }
      KEYS.forEach(k => {
        const kb = knobs[k];
        let v0 = 0;
        K.drag(kb.hit, {
          start: () => { if (!tuning()) { if (phase === 'critic') nudgePlay(); return false; } v0 = V[k]; kb.active = true; ST.lastTune = performance.now(); },
          move: (p, d) => { if (!tuning()) return; setKnob(k, v0 + (-d.dy + d.dx * 0.35) / (G.phone ? 190 : 230)); ST.lastTune = performance.now(); },
          end: () => { kb.active = false; afterTurn(); }
        });
        S.listen(kb.hit, 'keydown', (e) => {
          const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 4, PageDown: -4 }[e.key];
          if (e.key === 'Home' || e.key === 'End' || step) { e.preventDefault(); if (!tuning()) return; setKnob(k, e.key === 'Home' ? 0 : e.key === 'End' ? 1 : V[k] + step / STEPS); afterTurn(); }
        });
      });
      function nudgePlay() { K.guide({ id: 'critic', g: 'tap', target: playKey, label: 'PRESS PLAY FIRST', delay: 0 }); }

      /* ---------------- the flow ---------------- */
      function say(c, o, ms, mood) {
        const other = c === loopie ? glitch : loopie;
        other.hush();
        c.say(o, { ms: ms || 3000, mood, moodMs: mood ? (ms || 3000) : 0 });
      }
      function reactToKnob(k, v) {
        const now = performance.now(); if (now - ST.faceAt < 650) return;
        ST.faceAt = now;
        const m = k === 'p' ? (v > 0.75 ? 'laugh' : v < 0.2 ? 'surprised' : 'happy') : k === 's' ? (v > 0.8 ? 'dizzy' : v < 0.15 ? 'sleepy' : 'happy') : k === 'w' ? (v > 0.7 ? 'silly' : 'think') : (v > 0.7 ? 'wow' : 'happy');
        loopie.face(CARE && (m === 'laugh' || m === 'silly') ? 'happy' : m, 900);
        if (Math.random() < 0.5) glitch.face(k === 'w' && v < 0.06 ? 'scan' : 'think', 900);
      }
      function setPlayReady(on) { playKey.classList.toggle('sv-ready', !!on); }
      function playOn(on) { playKey.classList.toggle('sv-off', !on); }
      function checkMatch() {
        if (!tuning()) return;
        const m = findMatch();
        if (m !== ST.match) {
          ST.match = m;
          if (m) {
            lcdSet('★ ' + m.name + ' ★', 'PRESS PLAY', true); beep(2); clunk(0.5); setPlayReady(true);
            P.emit('star', playKey.offsetLeft + playKey.offsetWidth / 2, playKey.offsetTop, 12, { colors: ['#fffbe6', '#ffe58a', skin.acc] });
            loopie.face('wow', 900); glitch.face('smug', 1100);
            if (S.buzz) S.buzz(14);
            K.guide({ id: 'play-' + m.id, g: 'tap', target: playKey, label: 'PLAY IT BACK', delay: 400 });
            K.pop(m.name + '!', { x: G.w / 2, y: G.deck.y + G.deck.h * 0.45, kind: 'sv' });
          } else {
            setPlayReady(ST.target === FREE && dist(V, CRITIC) > 0.3);
            lcdSet(targetTitle(), hintFor(ST.target));
            guideTune();
          }
          styleLine('live');
        }
        if (!m && ST.target === FREE && dist(V, CRITIC) > 0.3) setPlayReady(true);
      }
      function dist(a, b) { return Math.hypot(a.p - b.p, a.s - b.s, a.w - b.w, a.e - b.e); }
      function afterTurn() {
        if (!tuning()) return;
        if (ST.match) { K.guide({ id: 'play-' + ST.match.id, g: 'tap', target: playKey, label: 'PLAY IT BACK', delay: 300 }); return; }
        guideTune(true);
      }
      function targetTitle() { return ST.target === FREE ? 'FREESTYLE!' : 'FIND: ' + ST.target.name; }
      function guideTune(soon) {
        const t = ST.target;
        if (t === FREE) {
          if (dist(V, CRITIC) > 0.3) K.guide({ id: 'free-play', g: 'tap', target: playKey, label: 'PLAY IT BACK', delay: soon ? 600 : 300 });
          else K.guide({ id: 'free', g: 'drag', dir: 'u', d: 60, target: knobs.w.hit, label: 'TWIST ANY KNOB', delay: soon ? 900 : 300 });
          return;
        }
        const nk = nextKnob(t);
        if (!nk) return;
        K.guide({ id: 'k-' + nk.k + nk.dir, g: 'drag', dir: nk.dir > 0 ? 'u' : 'd', d: 56, target: knobs[nk.k].hit, label: 'TWIST ' + KNAME[nk.k] + (nk.dir > 0 ? ' UP' : ' DOWN'), delay: soon ? 900 : 350, ms: 1500 });
      }
      function renderBank() {
        bank.innerHTML = '';
        const items = ST.setlist.concat([{ id: 'trio', name: CARE ? 'HARMONY' : 'OPERA TRIO', short: CARE ? 'HARMONY' : 'TRIO', tint: '#c8901a' }]);
        const cols = items.length <= 4 ? 2 : 3;
        bank.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
        items.forEach((p, i) => {
          const done = i < ST.played.length || (p.id === 'trio' && ST.trioDone);
          const shown = done && ST.played[i] ? ST.played[i] : p;
          const cur = !done && ((i === ST.round && phase !== 'twist' && phase !== 'trio' && ST.round < ST.setlist.length) || (p.id === 'trio' && (phase === 'twist' || phase === 'trio')));
          const nm = cols === 2 ? shown.name : (shown.short || shown.name.split(' ').pop());
          const el2 = h('div', { class: 'sv-lamp' + (done ? ' sv-done' : '') + (cur ? ' sv-cur' : ''), style: { '--lc': shown.tint || skin.acc } }, h('i'), h('span', { text: nm }));
          bank.append(el2);
        });
      }

      async function loadTape() {
        phase = 'load';
        CARE = an.safety === 'care';
        ST.setlist = makeSetlist();
        renderBank();
        setLineText();
        lcdSet('INSERT TAPE', '▼ ▼ ▼');
        audioInit(); startBed();
        // the cassette drops into the deck
        ST.casY = -1.6; placeCassette(); cas.style.opacity = '1';
        if (A.ctx) { A.paper({ vol: 0.12 }); A.whoosh({ vol: 0.06, dur: 0.4 }); }
        await K.anim(900, (k) => { ST.casY = -(1 - easeOutBack(k)) * 1.6; placeCassette(); });
        ST.casY = 0; placeCassette();
        clunk(1.2); if (A.ctx) A.tone({ type: 'sine', freq: 130, to: 90, glide: 0.08, dur: 0.12, vol: 0.12 });
        P.emit('dust', G.deck.x + G.deck.w / 2, G.deck.y + G.deck.h - 6, 10, { colors: ['rgba(255,255,255,0.35)'] });
        vb.classList.remove('sv-hide');
        vb.classList.add('sv-critic'); styleLine('critic');
        lcdSet(!LINE.own ? 'EXAMPLE TAPE' : CARE ? 'TAPE: ON REPEAT' : 'TAPE: CRITIC', 'PRESS PLAY', true);
        const ld = CARE ? { Jolly: 'This one’s been on repeat. Let’s hear it once, then change the voice.', Cheeky: 'This one’s been on repeat. One listen, then a new voice.', Unfiltered: 'On repeat lately. Hear it once, then change the voice.' }
          : LINE.own ? { Jolly: 'Your inner critic left a tape. Let’s hear it once, then mess with it.', Cheeky: 'The critic made a mixtape. One song. On repeat.', Unfiltered: 'The critic’s tape. One listen, then we wreck it.' }
            : { Jolly: 'No words today? Here’s a classic line inner critics love.', Cheeky: 'Blank tape? I brought a critic classic.', Unfiltered: 'Example tape. Every critic’s favourite line.' };
        say(loopie, line(ld), 4200, CARE ? 'calm' : 'think');
        phase = 'critic';
        playOn(true); setPlayReady(true);
        K.guide({ id: 'critic', g: 'tap', target: playKey, label: 'PRESS PLAY', delay: 900 });
        ctx.track('tape', { own: LINE.own ? 1 : 0, care: CARE ? 1 : 0, words: LINE.text.split(/\s+/).length });
      }
      function easeOutBack(k) { const c1 = 1.3, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }
      function placeCassette() {
        if (!G.casHome) return;
        if (ST.casOut) return;
        const y = G.casHome.y + (ST.casY || 0) * (G.deck.h + 40);
        cas.style.transform = 'translate(' + G.casHome.x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      }

      /* PLAY: the key goes down on touch, the tape rolls on release (a real click, so on-device speech may start). */
      S.listen(playKey, 'pointerdown', () => { if (playKey.classList.contains('sv-off')) return; playKey.classList.add('sv-down'); clunk(0.7); if (S.buzz) S.buzz(10); });
      const keyUp = () => playKey.classList.remove('sv-down');
      S.listen(playKey, 'pointerup', keyUp); S.listen(playKey, 'pointercancel', keyUp); S.listen(playKey, 'pointerleave', keyUp);
      S.listen(playKey, 'click', () => { keyUp(); onPlay(); });
      function onPlay() {
        if (phase === 'critic') { perform('critic'); return; }
        if (phase === 'tune') {
          if (ST.match) perform(ST.match.id);
          else if (dist(V, CRITIC) < 0.06) { lcdTemp('TWIST A KNOB!', 1400); if (A.ctx) A.boing({ freq: 200, vol: 0.06 }); guideTune(); }
          else perform('custom');
        }
      }

      async function perform(kind) {
        const preset = presetById(kind);
        const fx = kind === 'critic' ? 'critic' : kind === 'custom' ? 'custom' : preset.fx || preset.id;
        const v = kind === 'critic' ? Object.assign({}, CRITIC) : Object.assign({}, V);
        const name = kind === 'critic' ? 'ORIGINAL' : kind === 'custom' ? customName(v) : preset.name;
        phase = 'play';
        K.guide(null); setPlayReady(false); playOn(false);
        loopie.hush(); glitch.hush();
        lcdSet('▶ ' + name, 'COUNTER 0000');
        ST.perf = { kind, fx, name, v, words: null, wi: -1, t0: 0, t1: 0, tts: false, start: performance.now(), vu: 0 };
        vb.classList.toggle('sv-critic', kind === 'critic');
        styleLine(kind === 'critic' ? 'critic' : (preset ? preset.id : 'custom'));
        duck(true); motorTo(true);
        ST.onAir = 1;
        if (kind !== 'critic') { loopie.face('surprised', 700); }
        else { loopie.face('worried', 0); glitch.face('think', 0); }
        audioInit();
        let usedTTS = false;
        if (ttsReady()) {
          ST.perf.tts = true;
          const p0 = performance.now();
          const estD = LINE.text.split(/\s+/).reduce((a, wd) => a + 0.14 + wd.length * 0.06, 0) / K.clamp(0.5 + v.s * 1.35, 0.5, 2);
          if (A.ctx) bedFor(fx, A.now() + 0.2, A.now() + 0.2 + estD);
          const ok = await ttsSpeak(v, fx, (wi, whole) => { if (!ST.perf) return; ST.perf.wi = wi; ST.perf.wordAt = performance.now(); if (whole) ST.perf.whole = true; if (wi >= 0 && wordKick.length) wordKick[wi] = 1; });
          if (ok) { usedTTS = true; ST.perf.t1 = (performance.now() - p0) / 1000; }
          ST.perf.tts = false;
        }
        if (!usedTTS) {
          const t0 = (A.ctx ? A.now() : 0) + 0.3;
          if (A.ctx && ENG) {
            ENG.main.setFx(fx, v);
            const r = babble(ENG.main, v, fx, t0, true);
            ST.perf.words = r.words; ST.perf.t0 = t0; ST.perf.t1 = r.end;
            bedFor(fx, t0, r.end);
            await K.wait(Math.max(600, (r.end - A.now()) * 1000 + 250));
          } else {
            // no audio: drive the words on the page clock
            const n = wordEls.length, per = 0.32 / Math.pow(2, (v.s - 0.45) * 2.4);
            const t0p = performance.now() / 1000 + 0.3;
            ST.perf.pageClock = true;
            ST.perf.words = wordEls.map((_, i) => ({ t0: t0p + i * per, t1: t0p + (i + 1) * per - 0.04 }));
            await K.wait((0.3 + n * per) * 1000 + 250);
          }
        }
        motorTo(false);
        ST.onAir = 0;
        duck(false);
        const done = ST.perf; ST.perf = null;
        wordEls.forEach(w => w.classList.remove('sv-dim'));
        ST.tape = Math.min(1, ST.tape + 0.14);
        if (kind === 'critic') await afterCritic();
        else await afterTake(done, preset);
      }

      async function afterCritic() {
        phase = 'react';
        lcdSet('GRIP: 100%', 'IRON GRIP');
        glitch.face(CARE ? 'calm' : 'smug', 0);
        await K.wait(500);
        say(glitch, gentle(CARE ? { Jolly: 'That’s how it usually sounds. The words stay. Let’s soften the voice.' }
          : { Jolly: 'Same old tape, very serious voice. The words stay. The voice is up for grabs.', Cheeky: 'So dramatic. We keep the words and fix the voice.', Unfiltered: 'That’s the critic. Now we twist knobs.' }), 3600);
        loopie.base(CARE ? 'calm' : 'determined');
        vb.classList.remove('sv-critic');
        await K.wait(1600);
        startRound();
      }
      function startRound() {
        if (ST.round >= ST.setlist.length) { twist(); return; }
        phase = 'tune';
        ST.target = ST.setlist[ST.round];
        ST.match = null;
        playOn(true); setPlayReady(false);
        renderBank();
        lcdSet(targetTitle(), hintFor(ST.target), true);
        if (ST.round > 0 || visits > 0) {
          const nm = ST.target.name;
          const o = ST.target === FREE ? { Jolly: 'Freestyle! Build any voice you like, then play it.', Cheeky: 'No rules. Build your own weird voice.', Unfiltered: 'Freestyle. Any voice.' }
            : ST.target === featured && ST.round === 0 ? { Jolly: 'New voice today: ' + nm + '. Hint’s on the screen.', Cheeky: 'Fresh voice unlocked: ' + nm + '. Ooh.', Unfiltered: 'New today: ' + nm + '.' }
              : { Jolly: 'Next voice: ' + nm + '. Follow the hint on the screen.', Cheeky: 'Mission: ' + nm + '. Arrows on the screen.', Unfiltered: nm + '. Hint on the screen.' };
          say(glitch, line(o), 3200, 'idea');
        } else say(glitch, line({ Jolly: 'Try this: twist PITCH all the way up.', Cheeky: 'Science time. PITCH up. Way up.', Unfiltered: 'PITCH up. All the way.' }), 3200, 'idea');
        guideTune();
        checkMatch();
      }
      async function afterTake(done, preset) {
        phase = 'react';
        const p = preset || { id: 'custom', name: done.name, tint: skin.acc };
        ST.played.push({ id: p.id, name: done.name, short: p.short || done.name.split(' ').pop(), tint: p.tint || skin.acc });
        if (preset && !ST.found.includes(preset.id)) ST.found.push(preset.id);
        const sil = K.clamp(dist(done.v, CRITIC) / 1.05 + (preset ? 0.22 : 0.08), 0.15, 1);
        const repeat = ST.played.filter(x => x.id === p.id).length > 1;
        const drop = Math.round((14 + 20 * sil) * (CARE ? 0.85 : 1) * (repeat ? 0.6 : 1));
        const g0 = ST.grip;
        ST.grip = Math.max(8, ST.grip - drop);
        gripLab.textContent = 'GRIP ' + Math.round(ST.grip) + '%';
        K.pop('−' + (g0 - ST.grip) + '% GRIP', { x: K.clamp(mx(300), 90, G.w - 90), y: my(108), kind: 'svgrip' });
        // the crack-up
        if (!CARE) {
          loopie.face('laugh', 0); loopie.react('bounce'); laugh('loopie', 0.05);
          S.later(() => { glitch.face('laugh', 0); glitch.react(red() ? 'bounce' : 'glitch'); laugh('glitch', 0); }, 260);
          P.emit('confetti', loopie.el.offsetLeft + 30, loopie.el.offsetTop + 40, 10, { colors: ['#ff8fb1', '#ffd36b', skin.acc], speed: [80, 200] });
        } else { loopie.face('calm', 0); glitch.face('happy', 0); laugh('loopie', 0); }
        renderBank();
        ctx.track('take', { n: ST.played.length, preset: preset ? 1 : 0, grip: ST.grip });
        await K.wait(900);
        const lines = CARE ? REACT_CARE : REACT;
        const o = repeat ? { Jolly: 'A classic! Same words, still silly.', Cheeky: 'Encore. The critic hates encores.', Unfiltered: 'Again. Still silly.' } : (p.id === 'custom' || !lines[p.id] ? lines.custom(done.name) : lines[p.id]);
        say(glitch, gentle(o), 3200);
        await K.wait(1500);
        if (!CARE && ST.played.length === 2) say(loopie, line({ Jolly: 'Same words… it just sounds so much less true now.', Cheeky: 'Exact same words. Way less scary. Weird!', Unfiltered: 'Same words. Less grip.' }), 2600, 'happy');
        loopie.base(CARE ? 'calm' : 'happy'); glitch.base(CARE ? 'calm' : 'cool');
        await K.wait(ST.played.length === 2 && !CARE ? 2200 : 700);
        ST.round++;
        startRound();
      }
      const REACT = {
        helium: { Jolly: 'The critic, on helium. Very hard to take seriously.', Cheeky: 'Squeaky critic. Ten out of ten. No notes.', Unfiltered: 'Helium critic. Zero authority.' },
        giant: { Jolly: 'Sloooow giant. Same words, way less scary.', Cheeky: 'That took a full week to say. Very serious giant.', Unfiltered: 'Slow. Huge. Silly.' },
        robot: { Jolly: 'Beep boop. Same words, no sting attached.', Cheeky: 'CRITICISM. DOES. NOT. COMPUTE.', Unfiltered: 'Robot. Flat. Harmless.' },
        opera: { Jolly: 'Bravo! The critic’s very first aria.', Cheeky: 'Encore? Absolutely not. Bravo though.', Unfiltered: 'Opera critic. Ridiculous.' },
        sports: { Jolly: 'And the critic fumbles it on the line!', Cheeky: 'AND THE CROWD GOES… MILD.', Unfiltered: 'Commentator. Pure noise.' },
        mouse: { Jolly: 'Squeak! The mighty critic, everybody.', Cheeky: 'Tiny mouse critic. Adorable. Powerless.', Unfiltered: 'Mouse voice. Tiny.' },
        ghost: { Jolly: 'Ooooh, spooky. Still just words.', Cheeky: 'Boo. That’s it. That’s the whole ghost.', Unfiltered: 'Ghost voice. Just air.' },
        alien: { Jolly: 'Greetings from planet Critic. Signal: weak.', Cheeky: 'The aliens heard it. They’re unimpressed.', Unfiltered: 'Alien radio. Static.' },
        sleepy: { Jolly: 'So sleepy it nearly dozed off mid-sentence.', Cheeky: 'The critic needs a nap. Clearly.', Unfiltered: 'Sleepy critic. Yawn.' },
        custom: (nm) => ({ Jolly: 'A brand-new voice! I’m calling it ' + titleCase(nm) + '.', Cheeky: 'Never heard that one. Naming it ' + titleCase(nm) + '.', Unfiltered: 'New voice: ' + titleCase(nm) + '.' })
      };
      const REACT_CARE = {
        radio: { Jolly: 'Same words, late-night radio voice. Slower. Softer.' },
        lullaby: { Jolly: 'Same words, sung gently. It doesn’t have to shout.' },
        narrator: { Jolly: 'Same words, calm narrator. Just something a mind said.' },
        custom: () => ({ Jolly: 'Same words, a different voice. Notice the difference.' })
      };
      function titleCase(s) { return String(s).toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()); }

      /* ---------------- the twist: an over-the-top opera trio, built by the master fader ---------------- */
      const TH = [0.14, 0.5, 0.86];
      async function twist() {
        phase = 'twist';
        BED.on = false;
        K.guide(null); setPlayReady(false); playOn(false);
        ST.trio = { k: -1, notes: [], shake: 0, waiting: true };
        renderBank();
        lcdSet(CARE ? '♪ HARMONY ♪' : '♪ TRIO MODE ♪', 'PUSH MASTER ▲', true);
        beep(3);
        if (A.ctx) { A.noise({ filter: 'bandpass', freq: 1400, to: 300, q: 2, dur: 0.6, vol: 0.05 }); }
        // the machine spins its own knobs to opera
        const from = Object.assign({}, V), to = CARE ? { p: 0.5, s: 0.25, w: 0.5, e: 0.5 } : { p: 0.62, s: 0.22, w: 0.9, e: 0.55 };
        await K.anim(900, (k) => { const e = 1 - Math.pow(1 - k, 3); KEYS.forEach(kk => { const nv = from[kk] + (to[kk] - from[kk]) * e; if (Math.round(nv * STEPS) !== Math.round(V[kk] * STEPS)) { knobs[kk].kick = 1; tick(nv); } V[kk] = nv; }); styleLine('live'); });
        say(glitch, gentle(CARE ? { Jolly: 'One last thing: we sing it softly, together. Push the master fader up.' }
          : { Jolly: 'Uh oh. The machine wants a grand finale. Push the MASTER up!', Cheeky: 'The machine’s gone full opera. We’re doing this. Push it up!', Unfiltered: 'Trio mode. Push the master fader up.' }), 3800, CARE ? 'calm' : 'surprised');
        loopie.face(CARE ? 'calm' : 'wow', 0);
        vb.classList.add('sv-trio'); styleLine('live');
        ST.stage = 0;
        fader.tabIndex = 0; fader.classList.add('sv-in');
        await K.wait(500);
        phase = 'trio';
        guideFader();
        trioLoop();
      }
      function guideFader() {
        if (phase !== 'trio' || !ST.trio) return;
        const nx = TH[Math.min(2, ST.trio.k + 1)] || 1;
        K.guide({ id: 'fader-' + ST.trio.k, g: 'drag', dir: 'u', d: Math.round((G.fd.t1 - G.fd.t0) * Math.max(0.3, nx - ST.fader + 0.1)), target: () => ({ x: G.fd.x + G.fd.w / 2, y: G.fd.y + capY() + 15 }), label: 'PUSH UP: CRESCENDO', delay: 300, ms: 1500 });
      }
      function capY() { return G.fd.t0 + (1 - ST.fader) * (G.fd.t1 - G.fd.t0 - 30) - 2; }
      function renderFader() {
        if (!G.fd) return;
        const y = capY();
        fCap.style.top = y + 'px';
        Object.assign(fFill.style, { top: (y + 15) + 'px', height: Math.max(0, G.fd.t1 - y - 15) + 'px' });
        fader.setAttribute('aria-valuenow', String(Math.round(ST.fader * 100)));
      }
      function setFader(v) {
        v = K.clamp(v, 0, 1);
        const d0 = Math.round(ST.fader * 16), d1 = Math.round(v * 16);
        ST.fader = v;
        if (d0 !== d1 && A.ctx) A.tone({ type: 'triangle', freq: 220 * Math.pow(2, v * 1.5), dur: 0.03, vol: 0.02 });
        renderFader();
      }
      let fv0 = 0;
      K.drag(fader, {
        start: () => { if (phase !== 'trio') return false; fv0 = ST.fader; },
        move: (p, d) => { if (phase !== 'trio') return; setFader(fv0 - d.dy / (G.fd.t1 - G.fd.t0 - 30)); },
        end: () => { guideFader(); }
      });
      S.listen(fader, 'keydown', (e) => { if (phase !== 'trio') return; if (e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'PageUp') { e.preventDefault(); setFader(ST.fader + 0.12); } if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); setFader(ST.fader - 0.12); } });
      let vampT = 0;
      async function trioLoop() {
        for (let k = 0; k < 3; k++) {
          // wait for the fader, vamping (timpani + held chord) meanwhile
          let lastVamp = 0, guided = performance.now();
          while (ST.fader < TH[k]) {
            if (S.destroyed) return;
            const now = performance.now();
            if (A.ctx && now - lastVamp > 520) { lastVamp = now; vampHit(k); }
            if (now - guided > 5000) { guided = now; guideFader(); }
            await K.wait(60);
          }
          K.guideDone();
          await singPhrase(k);
        }
        await shatter();
      }
      function vampHit(k) {
        if (!A.ctx) return;
        vampT++;
        A.drum(A.now() + 0.02, 0.08 + k * 0.04, 0.42, 0.2);
        if (vampT % 4 === 1) A.pad(chordNotes(k, 0).map(m => A.midi(m)), { dur: 2.4, vol: 0.06 + k * 0.02, attack: 0.5, lp: 1500 });
      }
      function rootOf(k) { return CARE ? 57 : 60 + k; }
      function chordNotes(k, which) { const r = rootOf(k); const c = [[0, 4, 7], [5, 9, 12], [7, 11, 14]][which]; return c.map(x => r - 12 + x); }
      function degMidi(r, d) { const o = Math.floor((d - 1) / 7), i = ((d - 1) % 7 + 7) % 7; return r + o * 12 + SCALE[i]; }
      async function singPhrase(k) {
        if (!audioInit()) { ST.trio.k = k; await K.wait(1200); return; }
        ST.trio.k = k; styleLine('live');
        const N = SYL.length, r = rootOf(k);
        const noteDur = CARE ? 0.46 : 0.36 - k * 0.02, hold = CARE ? [1.1, 1.2, 1.8][k] : [1.1, 1.3, 2.5][k];
        const degs = SYL.map((_, i) => i === N - 1 ? 8 : Math.min(7, Math.round(1 + 6 * i / Math.max(1, N - 2))));
        if (N === 1) degs[0] = 8;
        const t0 = A.now() + 0.15;
        [ENG.main, ENG.loopie, ENG.glitch].forEach(E => E.setFx('trio', { e: 0.55 }));
        const notes = [];
        let t = t0;
        degs.forEach((d, i) => {
          const last = i === N - 1, dur = last ? hold : noteDur;
          const chord = (d === 4 || d === 6) ? 1 : (d === 2 || d === 7) ? 2 : 0;
          const sy = SYL[i];
          const sing = (E, midi, fs, wave, amp) => {
            const f = A.midi(midi), sm = 3;
            E.syl(Math.max(A.now() + 0.01, t - onsetDur(sy, sm)), sy, { f0: f, f0end: f, fs, vdur: dur * 0.94, sm, amp, vibC: CARE ? 28 : (last ? 90 + k * 30 : 55), vibHz: 5.6, vibGrow: last, swell: last, wave, breath: CARE ? 0.4 : 0.15 });
          };
          sing(ENG.loopie, degMidi(r + 12, d), 1.32, WAVES.glot, 1);
          if (k >= 1 || CARE) sing(ENG.glitch, r - 12 + [0, 5, 7][chord], 0.92, WAVES.buzz, 0.9);
          if (k >= 2 || (CARE && k >= 1)) sing(ENG.main, degMidi(r, d - 2), 1.08, WAVES.glot, 0.85);
          if (i === 0 || chord !== (notes.length ? notes[notes.length - 1].chord : -1)) {
            A.pad(chordNotes(k, chord).map(m => A.midi(m)), { when: t, dur: dur + (last ? 0.6 : noteDur * 1.6), vol: CARE ? 0.06 : 0.07 + k * 0.03, attack: 0.08, lp: 1700 });
            if (!CARE) A.drum(t, 0.12 + k * 0.08, 0.42, 0.25);
            if (k === 2 && !CARE) [0, 7, 12].forEach(x => A.tone({ when: t, type: 'sawtooth', freq: A.midi(chordNotes(k, chord)[0] + x), dur: Math.min(0.5, dur), vol: 0.018, attack: 0.03, lp: 1600 }));
          }
          notes.push({ wi: sy.wi, t0: t, t1: t + dur, last, chord });
          t += dur;
        });
        if (k === 2 && !CARE) { A.noise({ when: t0 + (N - 1) * noteDur, filter: 'highpass', freq: 5000, dur: 1.6, attack: 0.002, vol: 0.06 }); for (let i = 0; i < 18; i++) A.drum(t - hold + i * hold / 18, 0.05 + i * 0.006, 0.42, 0.1); }
        ST.trio.notes = notes; ST.trio.end = t;
        ST.trio.waiting = false;
        loopie.face(CARE ? 'calm' : 'wow', 0);
        if (k >= 1) glitch.face(CARE ? 'calm' : 'determined', 0);
        if (k === 0) say(loopie, gentle(CARE ? { Jolly: 'Laaa…' } : { Jolly: 'Laaaa!', Cheeky: 'Mi mi miii!', Unfiltered: 'Laaa!' }), 1400);
        if (k === 1) say(glitch, gentle(CARE ? { Jolly: 'Mmm-hmm…' } : { Jolly: 'Key change!', Cheeky: 'KEY CHANGE!', Unfiltered: 'Key change.' }), 1400);
        if (k === 2 && !CARE) S.later(() => say(loopie, line({ Jolly: 'ALL TOGETHER NOW!', Cheeky: 'EVERYBODY!', Unfiltered: 'ALL OF US!' }), 1500), 200);
        await K.wait((t - A.now()) * 1000 + 120);
        ST.trio.waiting = true;
        if (k < 2) { lcdSet(CARE ? '♪ HARMONY ♪' : '♪ TRIO MODE ♪', 'MORE! PUSH ▲'); guideFader(); }
      }
      async function shatter() {
        ST.trioDone = true;
        renderBank();
        fader.classList.remove('sv-in'); fader.tabIndex = -1;
        K.guide(null);
        // the words wobble apart and fall into confetti
        const rects = [];
        const root = el.getBoundingClientRect(), sc = root.width / (el.offsetWidth || root.width) || 1;
        const fs = parseFloat(getComputedStyle(lineEl).fontSize) || 24;
        wordEls.forEach(wd => {
          const txt = wd.textContent, r = wd.getBoundingClientRect(), x0 = (r.left - root.left) / sc, y0 = (r.top - root.top) / sc, ww = r.width / sc;
          const chars = Array.from(txt);
          chars.forEach((ch, i) => rects.push({ ch, x: x0 + ww * (i + 0.5) / chars.length, y: y0 + r.height / sc / 2 }));
        });
        lineEl.style.visibility = 'hidden';
        const list = rects.map((c, i) => {
          const s = h('span', { class: 'sv-shard gk-user', text: c.ch, style: { fontSize: Math.max(15, fs) + 'px', transform: 'translate(' + c.x.toFixed(1) + 'px,' + c.y.toFixed(1) + 'px) translate(-50%,-50%)' } });
          shards.append(s);
          return { el: s, x: c.x, y: c.y, vx: (Math.random() - 0.5) * 240, vy: -120 - Math.random() * 220, vr: (Math.random() - 0.5) * 12, d: i * 0.012, half: fs * 0.32 };
        });
        if (A.ctx) {
          A.noise({ filter: 'highpass', freq: 3800, dur: 1.2, attack: 0.002, vol: 0.08 });
          for (let i = 0; i < 10; i++) A.pluck(A.note(['C6', 'G5', 'E5', 'C5', 'G4', 'E4', 'C4', 'G3', 'E3', 'C3'][i]), { when: A.now() + i * 0.045, vol: 0.12, damp: 0.995 });
          if (!CARE) A.kick(A.now(), 0.35);
        }
        if (!red() && !CARE) ST.flash = 1;
        const burst = CARE ? ['#ffd9e6', '#fff', '#c8b6ff'] : ['#ffd36b', '#ff8fb1', '#7fe3c4', skin.acc, '#fff6d0'];
        const pop = (c, x, y) => { P.emit('confetti', x, Math.min(y, G.h - 30), 4, { colors: burst, speed: [60, 180] }); c.el.remove(); c.el = null; };
        await K.anim(1400, (k) => {
          const tt = k * 1.4;
          list.forEach(c => {
            if (!c.el) return;
            const lt = tt - c.d;
            if (lt < 0 && k < 1) return;
            const x = K.clamp(c.x + c.vx * lt, c.half + 6, G.w - c.half - 6), y = c.y + c.vy * lt + 310 * lt * lt;
            const a = Math.max(0, 1 - Math.max(0, lt - 0.45) / 0.4);
            if (a <= 0 || y > G.h - 20 || k >= 1) { pop(c, x, y); return; }
            c.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-50%) rotate(' + (c.vr * lt * 57).toFixed(0) + 'deg)';
            c.el.style.opacity = a.toFixed(2);
          });
        });
        vb.classList.add('sv-hide');
        loopie.face(CARE ? 'happy' : 'laugh', 0); glitch.face(CARE ? 'happy' : 'laugh', 0);
        if (!CARE) { laugh('loopie', 0.1); laugh('glitch', 0.3); }
        ST.grip = Math.max(3, Math.round(ST.grip * 0.35));
        gripLab.textContent = 'GRIP ' + ST.grip + '%';
        await K.wait(700);
        say(loopie, gentle(CARE ? { Jolly: 'Same words, much softer. They can rest on the tape now.' }
          : { Jolly: 'It fell apart! The words are still on the tape… just tiny now.', Cheeky: 'Confetti. Very dramatic critic. Still on the tape, though.', Unfiltered: 'Confetti. The words are still there. Tiny.' }), 3400);
        lcdSet(CARE ? 'QUIET HITS' : 'GREATEST HITS', 'PRESS EJECT', true);
        ST.ejectReady = true; phase = 'eject';
        ejectKey.classList.remove('sv-off'); ejectKey.classList.add('sv-ready');
        K.guide({ id: 'eject', g: 'tap', target: ejectKey, label: 'PRESS EJECT', delay: 1200 });
      }

      /* ---------------- finale: the tape ejects as a gold Greatest Hits cassette ---------------- */
      S.listen(ejectKey, 'pointerdown', () => { if (phase !== 'eject') return; ejectKey.classList.add('sv-down'); clunk(0.8); });
      const ejUp = () => ejectKey.classList.remove('sv-down');
      S.listen(ejectKey, 'pointerup', ejUp); S.listen(ejectKey, 'pointercancel', ejUp); S.listen(ejectKey, 'pointerleave', ejUp);
      S.listen(ejectKey, 'click', () => { ejUp(); if (phase === 'eject') finale(); });
      async function finale() {
        if (phase !== 'eject') return;
        phase = 'end';
        K.guide(null);
        ejectKey.classList.remove('sv-ready'); ejectKey.classList.add('sv-off');
        if (A.ctx) { A.boing({ freq: 320, vol: 0.12 }); A.tone({ type: 'sine', freq: 300, to: 900, glide: 0.3, dur: 0.35, vol: 0.05 }); }
        ST.casOut = true;
        const big = Math.min(G.phone ? G.w - 84 : 400, 340 * Math.max(1, G.u));
        lcdSet(CARE ? 'QUIET HITS' : 'GREATEST HITS', 'VOL. ' + (visits + 1), true);
        const home = { x: G.casHome.x + G.cw / 2, y: G.casHome.y + G.cw * 106 / 252 / 2 };
        const dest = { x: G.w / 2, y: G.phone ? Math.max(VB.y + VB.h / 2 + 8, M.y - 14 - big * 106 / 252 / 2) : VB.y + VB.h / 2 + 4 };
        let flipped = false;
        await K.anim(1500, (k) => {
          const e = 1 - Math.pow(1 - k, 3);
          const x = home.x + (dest.x - home.x) * e, y = home.y + (dest.y - home.y) * e - Math.sin(k * Math.PI) * 60;
          const sc = 1 + (big / G.cw - 1) * e;
          const flip = red() ? 1 : Math.cos(Math.min(1, k * 1.25) * Math.PI * 2);
          if (!flipped && (k > 0.32 || red())) { flipped = true; goldLabel(); }
          cas.style.transform = 'translate(' + (x - G.cw / 2).toFixed(1) + 'px,' + (y - G.cw * 106 / 252 / 2).toFixed(1) + 'px) scale(' + (sc * Math.max(0.04, Math.abs(flip))).toFixed(3) + ',' + sc.toFixed(3) + ') rotate(' + (Math.sin(k * Math.PI) * -6).toFixed(1) + 'deg)';
          if (Math.random() < 0.5) P.emit('star', x + (Math.random() - 0.5) * 100, y + (Math.random() - 0.5) * 40, 1, { colors: ['#fff6d0', '#ffd36b'], speed: [20, 80] });
        });
        ST.goldAt = performance.now(); ST.gold = { x: dest.x, y: dest.y, w: big };
        if (A.ctx) { A.pad(['C4', 'E4', 'G4', 'C5'].map(n => A.note(n)), { dur: 3, vol: 0.12, attack: 0.05 }); ['G5', 'C6', 'E6', 'G6'].forEach((n, i) => A.chime(A.note(n), { when: A.now() + 0.1 + i * 0.1, vol: 0.06, dur: 1.6 })); }
        loopie.base('celebrate'); glitch.base(CARE ? 'happy' : 'celebrate'); loopie.react('bounce'); glitch.react('bounce');
        const nxt = !CARE && PRESETS[3 + visits] ? PRESETS[3 + visits] : null;
        say(glitch, gentle(CARE ? { Jolly: 'Quiet Hits. Same words, softer. For the real facts, a real person can help.' }
          : { Jolly: 'Gold record! Same words, way less grip.', Cheeky: 'Greatest Hits! The critic is a novelty act now.', Unfiltered: 'Gold tape. Same words. No grip.' }), 6000);
        await K.finale('confetti', { from: [{ x: dest.x - big * 0.3, y: dest.y }, { x: dest.x + big * 0.3, y: dest.y }], colors: CARE ? ['#ffe9a8', '#ffd9e6', '#c8b6ff', '#ffffff'] : ['#ffd36b', '#fff0a8', '#ff8fb1', skin.acc, '#ffffff'], chord: ['C4', 'E4', 'G4', 'C5'], ms: 3200, sound: false });
        // personal bests and the collection
        const badges = [];
        const pb = K.best('grip', ST.grip, 'lower');
        if (pb.isNew) badges.push('New best: grip down to ' + ST.grip + '%'); else if (pb.first) badges.push('First tape: grip down to ' + ST.grip + '%');
        const presetsUsed = ST.played.filter(p => p.id !== 'custom').length;
        const score = K.clamp((100 - ST.grip) / 100 * 0.6 + presetsUsed / Math.max(1, ST.setlist.length) * 0.4, 0, 1);
        const tier = K.tier(score); if (tier) badges.push(tier + ' mixtape');
        const fresh = []; let count = 0;
        ST.found.forEach(id => { const p = presetById(id); if (!p) return; const c = K.collect(p.name); count = c.count; if (c.isNew) fresh.push(titleCase(p.name)); });
        if (fresh.length) badges.push('Collected: ' + (fresh.length > 2 ? fresh.slice(0, 2).join(', ') + ' +' + (fresh.length - 2) : fresh.join(', ')) + ' (' + count + ' of ' + (PRESETS.length + CARE_PRESETS.length) + ')');
        if (nxt) badges.push('Next visit unlocks: ' + titleCase(nxt.name));
        finished = true; ST.finAt = performance.now();
        const firstName = ST.played.length ? titleCase(ST.played[0].name).toLowerCase() : 'helium';
        const art = /^[aeiou]/.test(firstName) ? 'an ' : 'a ';
        ctx.track('done', { grip: ST.grip, takes: ST.played.length, found: ST.found.length });
        ctx.finish({
          title: CARE ? 'Quiet Hits' : 'Greatest Hits', mood: CARE ? 'happy' : 'laugh',
          lines: ['Same words, ' + ST.played.length + ' new voices' + (CARE ? '' : ' and an opera trio'),
            'Grip-o-meter: 100% → ' + ST.grip + '%',
            'Voices: ' + ST.played.map(p => titleCase(p.name)).join(', ') + ' · Machine: ' + skin.name],
          share: CARE ? 'Played a heavy thought back in a softer voice. Same words, less grip.' : 'Played my inner critic back in ' + art + firstName + ' voice. It lost the argument.',
          badges: badges.slice(0, 4)
        });
      }
      function goldLabel() {
        cas.classList.add('sv-gold');
        casTitle.textContent = CARE ? 'QUIET HITS' : 'GREATEST HITS';
        // the same words, now a novelty single: "feat." every voice that sang them
        const names = ST.played.map(p => titleCase(p.short || p.name)).filter((x, i, a) => a.indexOf(x) === i).slice(0, 3);
        const trio = CARE ? 'Harmony' : 'Opera Trio', box = casText.parentNode;
        casTrack.style.display = '';
        cas.style.setProperty('--lf', '17px');
        if (box.scrollHeight > box.clientHeight + 1 || casText.scrollWidth > box.clientWidth + 1) cas.style.setProperty('--lf', '15px');
        // the longest credits that fit on the label, never smaller than 12px
        const credits = [names.concat([trio]), names.slice(0, 2).concat([trio]), names.slice(0, 2).concat(['Trio']), names.slice(0, 1).concat([trio]), [trio]];
        let fits = false;
        for (const c of credits) { casTrack.textContent = 'feat. ' + c.join(' · '); if (casTrack.scrollWidth <= box.clientWidth - 10 && box.scrollHeight <= box.clientHeight + 1) { fits = true; break; } }
        if (!fits) casTrack.style.display = 'none';
        K.sfx.sparkle();
      }

      /* ---------------- frame loop ---------------- */
      const W = { vu: 0, vuV: 0, grip: 1, gripV: 0, onAir: 0, spin: 0, ang: 0, dim: 0, beams: 0, flash: 0, lvl: 0 };
      let frameN = 0;
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !BG) return;
        frameN++;
        if (phase === 'intro' && frameN > 3) return;
        if (finished && (frameN % 3 || performance.now() - ST.finAt > 1500)) return;
        const now = performance.now();
        // levels: real audio when we can measure it, else a simulated voice
        let lvl = 0;
        if (ANA && A.ctx) { ANA.getFloatTimeDomainData(ANABUF); let s = 0; for (let i = 0; i < ANABUF.length; i += 4) s += ANABUF[i] * ANABUF[i]; lvl = Math.min(1, Math.sqrt(s / (ANABUF.length / 4)) * 9); }
        if (TTS.speaking) lvl = Math.max(lvl, 0.45 + 0.35 * Math.abs(Math.sin(t * 13)) * Math.abs(Math.sin(t * 5.3)));
        W.lvl += (lvl - W.lvl) * Math.min(1, dt * 18);
        // needles (springs)
        const vuT = K.clamp(W.lvl * 1.1, 0, 1.05);
        W.vuV += ((vuT - W.vu) * 220 - W.vuV * 18) * dt; W.vu += W.vuV * dt;
        const gT = ST.grip / 100;
        W.gripV += ((gT - W.grip) * 60 - W.gripV * 9) * dt; W.grip += W.gripV * dt;
        W.onAir += ((ST.onAir ? 1 : 0) - W.onAir) * Math.min(1, dt * 10);
        const spinT = ST.perf ? 1 : (phase === 'trio' ? 0.6 : 0);
        W.spin += (spinT - W.spin) * Math.min(1, dt * 4);
        W.ang += W.spin * dt * 360 * (ST.perf ? 0.5 + ST.perf.v.s : 0.8);
        W.dim += (((phase === 'trio' || phase === 'twist') ? 1 : 0) - W.dim) * Math.min(1, dt * 2);
        W.beams += (((phase === 'trio' || phase === 'twist') ? 1 : (phase === 'end' || phase === 'eject') ? 0.7 : 0) - W.beams) * Math.min(1, dt * 1.5);
        W.flash = Math.max(0, (ST.flash || 0) - dt * 3); ST.flash = W.flash;
        updateCassette(now);
        updateWords(now, t, dt);
        if (phase === 'trio' || phase === 'twist') renderFader();
        if (lcdHold && now > lcdHold) { lcdHold = 0; if (phase === 'tune') lcd2.textContent = ST.match ? 'PRESS PLAY' : hintFor(ST.target); }
        if (ST.perf && !ST.perf.tts) { const el2 = (now - ST.perf.start) / 1000, cn = 'COUNTER ' + String(Math.floor(el2 * 12 + ST.tape * 900)).padStart(4, '0'); if (lcd2.textContent !== cn) lcd2.textContent = cn; }
        draw(g, dt, t, now);
      });
      function updateCassette(now) {
        if (!hubL || ST.casOut && !ST.gold) return;
        if (W.spin > 0.01) {
          hubL.setAttribute('transform', 'rotate(' + (W.ang % 360).toFixed(1) + ' 88 71)');
          hubR.setAttribute('transform', 'rotate(' + ((W.ang * 1.3) % 360).toFixed(1) + ' 164 71)');
          packL.setAttribute('r', (14 + 12 * (1 - ST.tape)).toFixed(1)); packR.setAttribute('r', (14 + 12 * ST.tape).toFixed(1));
        }
        if (ST.gold && !red()) {
          const k = (now - ST.goldAt) / 1000, g2 = ST.gold, sc = g2.w / G.cw;
          cas.style.transform = 'translate(' + (g2.x - G.cw / 2).toFixed(1) + 'px,' + (g2.y - G.cw * 106 / 252 / 2 + Math.sin(k * 1.6) * 4).toFixed(1) + 'px) scale(' + sc.toFixed(3) + ') rotate(' + (Math.sin(k * 1.1) * 2.5).toFixed(2) + 'deg)';
        }
      }
      function activeWord(now) {
        const pf = ST.perf;
        if (pf) {
          if (pf.words) { const vt = pf.pageClock ? now / 1000 : vnow(); for (let i = 0; i < pf.words.length; i++) { const w2 = pf.words[i]; if (vt >= w2.t0 - 0.02 && vt < w2.t1 + 0.05) return i; } return vt < pf.words[0].t0 ? -2 : -1; }
          if (pf.whole && !TTS.boundary && TTS.est && TTS.wholeAt) { const el2 = (now - TTS.wholeAt) / 1000; let wi = 0; TTS.est.forEach((s0, i) => { if (el2 >= s0) wi = i; }); return wi; }
          return pf.wi;
        }
        if (ST.trio && ST.trio.notes && !ST.trio.waiting) { const vt = vnow(); for (const n of ST.trio.notes) if (vt >= n.t0 && vt < n.t1) return n.wi; }
        return -1;
      }
      function updateWords(now, t, dt) {
        if (!wordEls.length || vb.classList.contains('sv-hide')) return;
        const ai = activeWord(now), m = red() ? 0.25 : 1;
        const live = ST.perf ? ST.perf.v : V;
        const wob = (ST.perf && ST.perf.kind === 'critic') ? 0 : live.w;
        const trio = phase === 'trio' && ST.trio;
        const tk = trio ? (ST.trio.k + 1) : 0;
        const rate = trio ? 5.6 : 1.4 + wob * 5 + (ST.perf ? live.s * 3 : 0);
        for (let i = 0; i < wordEls.length; i++) {
          wordKick[i] = Math.max(0, (wordKick[i] || 0) - dt * 4.5);
          const act = ai === i, kick = wordKick[i] || 0;
          let sc = 1 + kick * 0.18 + (act ? 0.16 : 0);
          let y = Math.sin(t * 2.2 + i * 1.3) * 1.6 * m - kick * 6 * m - (act ? 5 : 0) * m;
          let rot = Math.sin(t * rate + i * 1.7) * wob * 8 * m;
          if (trio) { const s2 = act ? 1 : 0.35, amp = CARE ? 0.8 + tk * 0.5 : 2 + tk * 2.6; rot = Math.sin(t * (CARE ? 4 : 11.2) + i) * amp * s2 * m; y += Math.sin(t * (CARE ? 4 : 11.2) + i * 2) * tk * (CARE ? 0.5 : 1.2) * m; sc += act ? (CARE ? 0.04 : 0.08) * tk : 0; }
          if (ST.perf && ST.perf.kind === 'critic') { rot = 0; y = act ? -2 : 0; }
          const tr = 'translate(0,' + y.toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg) scale(' + sc.toFixed(3) + ')';
          if (wordEls[i].__tr !== tr) { wordEls[i].style.transform = tr; wordEls[i].__tr = tr; }
          const dim = !!(ST.perf && ai !== -1 && (ai === -2 || i > ai));
          if (wordEls[i].__dim !== dim) { wordEls[i].classList.toggle('sv-dim', dim); wordEls[i].__dim = dim; }
        }
      }
      function draw(g, dt, t, now) {
        const w = G.w, H = G.h;
        g.drawImage(BG.c, 0, 0, w, H);
        // the ON AIR sign lights while the tape plays
        if (W.onAir > 0.02) {
          const oa = onAirRect();
          g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = W.onAir * 0.85;
          g.drawImage(SPR.red, oa.x - 30, oa.y - 26, oa.w + 60, oa.h + 52); g.restore();
          g.globalAlpha = W.onAir; g.fillStyle = '#ffe7e7'; g.font = '400 ' + Math.round(oa.h * 0.52) + 'px ' + getDisp();
          g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ON AIR', oa.x + oa.w / 2, oa.y + oa.h / 2 + 1); g.globalAlpha = 1;
        }
        // trio: the room dims to a spotlight
        if (W.dim > 0.02) {
          if (!BGD) { BGD = off(w, H); BGD.g.drawImage(BG.c, 0, 0, w, H); const cx = w / 2, cy = (VB.y + M.y + M.h * 0.4) / 2, R = Math.max(w, H) * 0.8; BGD.g.globalAlpha = 0.75; BGD.g.drawImage(SPR.spot, cx - R, cy - R * 0.9, R * 2, R * 1.8); BGD.g.globalAlpha = 1; }
          g.globalAlpha = Math.min(1, W.dim); g.drawImage(BGD.c, 0, 0, w, H); g.globalAlpha = 1;
        }
        if (W.beams > 0.02) {
          g.save(); g.globalCompositeOperation = K.dark() ? 'lighter' : 'source-over';
          const goldOnly = phase === 'end' || phase === 'eject';
          for (let i = 0; i < 3; i++) {
            const a = Math.sin(t * 0.7 + i * 2.1) * 0.35, x0 = w * (0.2 + i * 0.3);
            g.globalAlpha = W.beams * 0.12; g.fillStyle = goldOnly ? ['#ffd36b', '#fff0a8', '#ffd36b'][i] : ['#ff8fb1', '#ffd36b', '#8fd8ff'][i];
            g.beginPath(); g.moveTo(x0 - 8, -10); g.lineTo(x0 + 8, -10); g.lineTo(x0 + Math.sin(a) * H * 0.6 + 120, H * 0.75); g.lineTo(x0 + Math.sin(a) * H * 0.6 - 120, H * 0.75); g.closePath(); g.fill();
          }
          g.restore(); g.globalAlpha = 1;
        }
        drawNeedle(g, mx(14), my(14), 90 * M.u, 70 * M.u, W.vu);
        drawNeedle(g, mx(266), my(14), 90 * M.u, 70 * M.u, W.grip);
        drawKnobs(g, t);
        // speaker pulse
        const sp = G.spk;
        if (W.lvl > 0.02) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(0.8, W.lvl * 0.9); g.drawImage(SPR.acc, sp.x - sp.r * 1.8, sp.y - sp.r * 1.8, sp.r * 3.6, sp.r * 3.6); g.restore(); }
        g.strokeStyle = K.hexA(skin.acc, 0.35 + W.lvl * 0.6); g.lineWidth = 2 + W.lvl * 3; g.beginPath(); g.arc(sp.x, sp.y, sp.r * (0.62 + W.lvl * 0.12), 0, TAU); g.stroke();
        // desktop woofers breathe with the voice
        if (G.cab && W.lvl > 0.02) {
          [G.cab.l, G.cab.r].forEach(x => { const cx = x + G.cab.w / 2, cy = G.cab.y + G.cab.h * 0.72, r = Math.min(G.cab.w, G.cab.h) * 0.3; g.strokeStyle = 'rgba(255,255,255,' + (W.lvl * 0.25).toFixed(3) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r * (0.5 + W.lvl * 0.25), 0, TAU); g.stroke(); });
        }
        // the gold record's halo
        if (ST.gold) {
          const k = Math.min(1, (now - ST.goldAt) / 600), r = ST.gold.w * (0.95 + 0.05 * Math.sin(t * 2)), D = K.dark();
          g.save(); g.globalCompositeOperation = D ? 'lighter' : 'source-over'; g.globalAlpha = (D ? 0.6 : 0.45) * k;
          g.drawImage(SPR.gold, ST.gold.x - r, ST.gold.y - r * 0.75, r * 2, r * 1.5);
          g.translate(ST.gold.x, ST.gold.y); g.rotate(t * 0.25);
          for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); g.globalAlpha = (D ? 0.08 : 0.16) * k; g.fillStyle = D ? '#ffe8a0' : '#f2b833'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-18, -r * 1.1); g.lineTo(18, -r * 1.1); g.closePath(); g.fill(); }
          g.restore();
        }
        P.update(dt); P.draw(g);
        if (W.flash > 0.01) { g.fillStyle = 'rgba(255,240,200,' + (W.flash * 0.4).toFixed(3) + ')'; g.fillRect(0, 0, w, H); }
      }
      let dispFont = '';
      function getDisp() { if (!dispFont) dispFont = getComputedStyle(el).getPropertyValue('--sv-disp') || 'sans-serif'; return dispFont; }
      function drawNeedle(g, x, y, w, hh, v) {
        const px = x + w / 2, py = y + hh * 0.98, R = hh * 0.72, a = -Math.PI / 2 - 0.9 + 1.8 * K.clamp(v, -0.03, 1.04);
        g.strokeStyle = '#d8352c'; g.lineWidth = 1.8; g.lineCap = 'round';
        g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * R, py + Math.sin(a) * R); g.stroke();
        g.fillStyle = '#2a2018'; g.beginPath(); g.arc(px, py, 4.5, 0, TAU); g.fill();
      }
      function drawKnobs(g, t) {
        const tgt = phase === 'tune' ? ST.target : null;
        KEYS.forEach(k => {
          const kb = knobs[k];
          kb.shown += (V[k] - kb.shown) * 0.5;
          kb.kick = Math.max(0, kb.kick - 0.08);
          const R = kb.R, ringR = R + 9 * M.u;
          // target zone arc
          const zp = (ST.match && ST.match.r && ST.match.r[k]) ? ST.match : (tgt && tgt.r && tgt.r[k]) ? tgt : null, zone = zp && zoneOf(zp, k);
          if (zone && phase === 'tune') {
            const inZ = V[k] >= zone[0] && V[k] <= zone[1];
            const a0 = ang(K.clamp(zone[0], 0, 1)), a1 = ang(K.clamp(zone[1], 0, 1));
            g.strokeStyle = inZ ? 'rgba(80,230,140,0.95)' : 'rgba(80,230,140,' + (0.35 + 0.25 * Math.sin(t * 5)).toFixed(3) + ')';
            g.lineWidth = 7 * M.u; g.lineCap = 'round';
            g.beginPath(); g.arc(kb.x, kb.y, ringR, a0, Math.max(a0 + 0.05, a1)); g.stroke();
          }
          // LED ring
          const lit = Math.round(V[k] * 12);
          for (let i = 0; i <= 12; i++) {
            const a = ang(i / 12), x = kb.x + Math.cos(a) * ringR, y = kb.y + Math.sin(a) * ringR, on = i <= lit && phase !== 'intro' && phase !== 'load' && phase !== 'critic';
            g.fillStyle = on ? skin.acc : 'rgba(0,0,0,0.28)';
            g.beginPath(); g.arc(x, y, (on ? 2.6 : 2) * M.u, 0, TAU); g.fill();
          }
          // cap
          g.save(); g.translate(kb.x, kb.y - kb.kick * 1.5); g.rotate(ang(kb.shown) + Math.PI / 2);
          const s = SPR.cap; g.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h);
          g.restore();
          if (kb.kick > 0.05) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = kb.kick * 0.5; g.drawImage(SPR.acc, kb.x - R * 1.4, kb.y - R * 1.4, R * 2.8, R * 2.8); g.restore(); }
        });
      }
      const ang = (v) => (-135 + v * 270) * Math.PI / 180 - Math.PI / 2;

      /* ---------------- start ---------------- */
      setLineText();
      cas.style.opacity = '0';
      cv.onResize(() => layout());
      // the web fonts change text widths: fit again (and repaint the canvas lettering) once they are in
      try {
        if (document.fonts && document.fonts.load) {
          Promise.all(['400 24px "Luckiest Guy"', '400 24px "Nanum Pen Script"', '400 20px "VT323"'].map(f => document.fonts.load(f)))
            .then(() => { if (S.destroyed) return; dispFont = ''; fitLabel(); fitLine(); paintAll(); }).catch(() => {});
        }
      } catch (e) { /* no font loading API */ }
      (async () => {
        lcdSet('SILLY-O-MATIC', SS && TTS.voice ? 'ON-DEVICE VOICE' : 'BABBLE SYNTH');
        await K.intro({ title: 'Silly Voice', sub: 'Your inner critic left a tape. Same words, every time. Let’s change the voice.', how: 'Twist the knobs to find a silly voice, then press PLAY.', char: 'loopie', mood: 'laugh' });
        frameN = 0;
        await loadTape();
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = performance.now(); while (!fn()) { if (performance.now() - t0 > (ms || 30000)) return false; await K.wait(80); } return true; };
          await until(() => phase === 'critic', 20000);
          await K.wait(400);
          await K.sim.tap(playKey);
          for (let guard = 0; guard < 12 && !finished; guard++) {
            await until(() => phase === 'tune' || phase === 'trio' || phase === 'eject' || finished, 30000);
            if (phase !== 'tune') break;
            await K.wait(500);
            const tg = ST.target || FREE;
            for (const k of KEYS) {
              const want = tg.ideal && tg.ideal[k];
              if (want == null || (tg.r && inRange(tg, k, V[k]) && tg !== FREE)) continue;
              const kb = knobs[k], hs = kb.hit.offsetWidth || 70, sens = G.phone ? 190 : 230;
              const dy = -(want - V[k]) * sens;
              await K.sim.drag(kb.hit, { x: hs / 2, y: hs / 2 }, { x: hs / 2, y: hs / 2 + dy }, 500 + Math.abs(dy) * 2, 16);
              await K.wait(150);
            }
            await K.wait(300);
            await K.sim.tap(playKey);
            await until(() => phase !== 'play' && phase !== 'tune', 30000);
          }
          await until(() => phase === 'trio', 30000);
          for (const lv of [0.3, 0.66, 1]) {
            await until(() => phase === 'trio' && ST.trio && ST.trio.waiting, 30000);
            if (phase !== 'trio') break;
            const fh = G.fd.t1 - G.fd.t0 - 30, y0 = capY() + 15, dy = -(lv - ST.fader) * fh;
            await K.sim.drag(fader, { x: G.fd.w / 2, y: y0 }, { x: G.fd.w / 2, y: y0 + dy }, 700, 14);
            await K.wait(300);
            await until(() => (ST.trio && ST.trio.k >= Math.round(lv * 3) - 1 && ST.trio.waiting) || phase !== 'trio', 30000);
          }
          await until(() => phase === 'eject', 40000);
          await K.wait(800);
          await K.sim.tap(ejectKey);
          await until(() => finished, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
