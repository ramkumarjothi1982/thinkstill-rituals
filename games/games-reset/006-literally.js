/* 006 Literally — Reset · INTERRUPT · Inner Speech / Mental Text
 * Mechanism: cognitive defusion (ACT; Hayes et al. 1999). Seeing a thought as just words, by acting it out literally or
 * saying it in a silly voice, lowers how believable and upsetting it is (Masuda et al. 2004); "I'm having the thought
 * that…" adds a little distance between the person and the words.
 * Verb: stage (drag a thought onto the stage, pick a silly voice, frame it). Finale: curtain call: Loopie bows, the audience
 * throws flowers and the letters of the framed thoughts become marquee bulbs spelling JUST WORDS.
 */
(function (env) {
  'use strict';
  const FONT = '"Fredoka", "Nunito", "Trebuchet MS", system-ui, sans-serif';
  /* Machines that draw without a graphics card get a lighter canvas, so the show never stutters. */
  function softwareGfx() {
    try {
      const c = document.createElement('canvas'), gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info'), r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r);
    } catch (e) { return false; }
  }
  /* An opaque canvas (no alpha channel): the compositor can copy it instead of blending it over the page, which
     roughly halves the cost of every frame on machines without a graphics card. Same shape as K.canvas. */
  function opaqueCanvas(parent, o, S) {
    const c = document.createElement('canvas');
    c.className = 'gk-canvas'; c.setAttribute('aria-hidden', 'true');
    parent.append(c);
    const st = { el: c, g: null, w: 0, h: 0, dpr: 1 }, cbs = [];
    st.fit = () => {
      const w = c.clientWidth || parent.clientWidth, hh = c.clientHeight || parent.clientHeight;
      if (!w || !hh) return;
      const dpr = Math.min(window.devicePixelRatio || 1, o.maxDpr || 2), pw = Math.round(w * dpr), ph = Math.round(hh * dpr);
      if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
      st.g = st.g || c.getContext('2d', { alpha: false });
      st.g.setTransform(dpr, 0, 0, dpr, 0, 0);
      st.dpr = dpr; st.w = w; st.h = hh;
      cbs.forEach(f => { try { f(st); } catch (e) { console.error(e); } });
    };
    st.onResize = (f) => { cbs.push(f); if (st.w) f(st); };
    try { const ro = new ResizeObserver(() => st.fit()); ro.observe(c); S.onDestroy(() => ro.disconnect()); } catch (e) { S.listen(window, 'resize', st.fit); }
    st.fit();
    return st;
  }
  const SKITS = [
    { id: 'pool', name: 'The Paddling Pool', re: /drown|swamp|flood|underwater|overflow|in over my head|inbox|e-?mails?|too much|buried/i },
    { id: 'reel', name: 'The Rewind', re: /replay|rewind|over and over|again and again|keep thinking|going over|on repeat|loop/i },
    { id: 'pop', name: 'The Big Pop', re: /explod|blow(ing)? up|burst|lose it|snap|furious|angry|rage|boil|scream|freak/i },
    { id: 'jelly', name: 'The Jelly', re: /stuck|trapped|can'?t move|frozen|freez|paralys|tight|tense|can'?t start|procrastinat|stall|knot/i },
    { id: 'pieces', name: 'The Falling Apart', re: /fall(ing)? apart|broken|break|shatter|crumbl|losing it|wreck|messed up/i },
    { id: 'anvil', name: 'The Cardboard Anvil', re: /heavy|weigh|crush|burden|pressure|chest|load|drag(ging)? me down|sink/i },
    { id: 'candle', name: 'The Melting Candle', re: /burn|on fire|fried|exhaust|tired|drained|running on empty|wiped/i },
    { id: 'socks', name: 'The Sock Tornado', re: /mess|chaos|chaotic|all over the place|scattered|everything at once|so many|million|a lot going on|juggl|spinning/i },
    { id: 'hat', name: 'The Party Hat', re: /idiot|stupid|dumb|failure|fail|useless|pathetic|not good enough|loser|embarrass|cringe|fool|worthless|rubbish/i },
    { id: 'mountain', name: 'The Molehill', re: /mountain|pile|stack|heap|so much to do|to-?do|list|deadline|due|everything/i },
    { id: 'balloon', name: 'The Hot-Air Balloon', re: null }
  ];
  const GENERIC = ['balloon', 'pieces', 'socks', 'pop', 'reel'];
  const PUNCH = {
    pool: { Jolly: 'Turns out it was ankle-deep.', Cheeky: 'Drowning? Mate, that’s a paddling pool.', Unfiltered: 'Three centimetres deep. Dramatic, though.' },
    pop: { Jolly: 'Big bang. Mostly confetti!', Cheeky: 'Ka-boom! Very festive explosion.', Unfiltered: 'Exploded. Into confetti. Terrifying.' },
    jelly: { Jolly: 'Stuck? It’s basically a trampoline!', Cheeky: 'Trapped in jelly. Wobbled out. Classic.', Unfiltered: 'Stuck turned into bouncy. Huh.' },
    pieces: { Jolly: 'Fell apart, snapped back. Show business!', Cheeky: 'Bits everywhere. Then, ta-da! All here.', Unfiltered: 'Fell to pieces. Put back together. Fine.' },
    anvil: { Jolly: 'Heavy? It’s cardboard. Props!', Cheeky: 'That anvil’s made of cereal box.', Unfiltered: 'Looked heavy. Was cardboard.' },
    candle: { Jolly: 'Burnt out? Now it’s a cosy tea light.', Cheeky: 'Melted into ambience. Very spa.', Unfiltered: 'Candle’s gone. Nice glow, though.' },
    socks: { Jolly: 'Chaos sorted. Every sock found its pair.', Cheeky: 'A tornado of socks. Laundry day, solved.', Unfiltered: 'Total chaos. Then: matching socks.' },
    hat: { Jolly: 'Plot twist: it’s a party hat!', Cheeky: 'Dunce cap? Nah. Party hat. Read the room.', Unfiltered: 'Wrong hat. Fixed it.' },
    mountain: { Jolly: 'A mountain? A molehill all along.', Cheeky: 'Climbed it. Met the landlord. A mole.', Unfiltered: 'Mountain. Molehill. Mole.' },
    balloon: { Jolly: 'Lots of hot air. Lovely float, though.', Cheeky: 'Pbbbt. That thought had a slow puncture.', Unfiltered: 'All air. Gone.' },
    reel: { Jolly: 'Seen it, rewound it. That’s a wrap!', Cheeky: 'Same scene, fourth time. Bit of a flop.', Unfiltered: 'Replayed it. Boring now. Cut.' },
    gentle: { Jolly: 'There it goes, floating up. Just words.', Cheeky: 'Up and away. Words float, it turns out.', Unfiltered: 'Words. Floating off. That’s all.' }
  };
  const VOICES = {
    helium: { label: 'Helium', face: 'E05', base: 760, dur: 0.075, gap: 0.035, wave: 'triangle', f: 1.55, vol: 0.09,
      line: { Jolly: 'Squeaky! Hard to take seriously.', Cheeky: 'Ah, the chipmunk edition.', Unfiltered: 'Squeaky. Not so scary now.' },
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="16" cy="12" rx="8.5" ry="10" fill="#ff8fb1"/><ellipse cx="13" cy="8.5" rx="2.4" ry="3.4" fill="#fff" opacity=".55"/><path d="M16 22l-2 3h4z" fill="#ff8fb1"/><path d="M16 25c-2 2 2 3 0 6" stroke="#8a6a7a" stroke-width="1.4" fill="none"/></svg>' },
    opera: { label: 'Opera', face: 'E40', base: 262, dur: 0.3, gap: 0.05, wave: 'sawtooth', f: 1, vol: 0.075, vib: true, melody: [0, 4, 7, 12, 9, 7, 4, 12, 16, 12],
      line: { Jolly: 'Bravissimo! Even worries sound grand.', Cheeky: 'Such drama. Such vibrato.', Unfiltered: 'Loud. Fancy. Still just words.' },
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 10l4 9h12l4-9-6 4-4-7-4 7z" fill="#ffd36b" stroke="#b07a1a" stroke-width="1.2" stroke-linejoin="round"/><rect x="9" y="20" width="14" height="4" rx="1.5" fill="#ffc23a"/><circle cx="16" cy="6" r="2" fill="#ff8fb1"/></svg>' },
    sports: { label: 'Commentator', face: 'E44', base: 196, dur: 0.06, gap: 0.022, wave: 'square', f: 1.05, vol: 0.06, rising: true, crowd: true,
      line: { Jolly: 'And the crowd goes wild!', Cheeky: 'What a play! Unbelievable scenes!', Unfiltered: 'Live commentary. Same old words.' },
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="12" y="4" width="8" height="14" rx="4" fill="#9fd7ff" stroke="#3f6f9a" stroke-width="1.2"/><path d="M9 14a7 7 0 0 0 14 0" fill="none" stroke="#3f6f9a" stroke-width="1.6"/><path d="M16 21v5M11 27h10" stroke="#3f6f9a" stroke-width="1.8" stroke-linecap="round"/></svg>' },
    trailer: { label: 'Movie trailer', face: 'E21', base: 92, dur: 0.22, gap: 0.08, wave: 'sawtooth', f: 0.72, vol: 0.09, boom: true,
      line: { Jolly: 'In a world… of just words.', Cheeky: 'Coming soon: a thought. Rated PG.', Unfiltered: 'Dramatic. Still words.' },
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="10" width="24" height="16" rx="2" fill="#3a3550"/><path d="M4 10l4-5 4 5M12 10l4-5 4 5M20 10l4-5 4 5" fill="none" stroke="#f3f0ff" stroke-width="1.6"/><circle cx="16" cy="18" r="4" fill="#ffd36b"/></svg>' },
    slow: { label: 'Slow-mo', face: 'E02', base: 150, dur: 0.34, gap: 0.08, wave: 'triangle', f: 0.85, vol: 0.06,
      line: { Jolly: 'Slowly… just sounds.', Cheeky: 'In slow motion it’s just… noises.', Unfiltered: 'Slowed down. Just sounds.' },
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="17" r="10" fill="none" stroke="#9fd7ff" stroke-width="2"/><path d="M16 11v6l4 3" stroke="#9fd7ff" stroke-width="2" stroke-linecap="round" fill="none"/></svg>' },
    whisper: { label: 'Whisper', face: 'E28', base: 330, dur: 0.1, gap: 0.05, wave: 'sine', f: 1.2, vol: 0.03, breathy: true,
      line: { Jolly: 'Whispered, it’s much smaller.', Cheeky: 'Shh. Tiny thought.', Unfiltered: 'Quieter. Smaller.' },
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 16h4M10 12l2 2M10 20l2-2" stroke="#c8b6ff" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="16" r="6" fill="none" stroke="#c8b6ff" stroke-width="2"/></svg>' },
    song: { label: 'Sing-song', face: 'E03', base: 330, dur: 0.18, gap: 0.04, wave: 'triangle', f: 1.1, vol: 0.07, melody: [0, 2, 4, 2, 0, 4, 7, 4],
      line: { Jolly: 'A little tune. Just words in it.', Cheeky: 'Catchy! Still just words.', Unfiltered: 'A tune. Words. That’s all.' },
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M12 22V8l12-3v14" fill="none" stroke="#a8f0c0" stroke-width="2"/><circle cx="9.5" cy="22.5" r="3" fill="#a8f0c0"/><circle cx="21.5" cy="19.5" r="3" fill="#a8f0c0"/></svg>' }
  };
  const FORM = { a: [800, 1200], e: [500, 1900], i: [320, 2300], o: [520, 900], u: [350, 850], y: [320, 2200] };
  const CURTAINS = [['#8f1d2c', '#c9374b', '#5a0f1a'], ['#24357a', '#3d55b8', '#141f4d'], ['#1d6b4c', '#2f9a70', '#0f3d2b'], ['#6a2470', '#9a3aa4', '#3b1240'], ['#a3401c', '#d9632e', '#5e220c']];
  const SCENES = ['night', 'sea', 'city', 'forest', 'desert'];
  const FLOWERS = ['Rose', 'Tulip', 'Sunflower', 'Daisy', 'Peony', 'Carnation'];
  const DOTS = { J: ['..###', '....#', '....#', '....#', '#...#', '#...#', '.###.'], U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'], S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'], T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'], W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'], O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'], R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'], D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'] };

  function matchSkits(phrases, care) {
    if (care) return phrases.map(() => 'gentle');
    const used = new Set(), out = [];
    phrases.forEach(p => {
      let id = (SKITS.find(s => s.re && s.re.test(p) && !used.has(s.id)) || {}).id;
      if (!id) id = GENERIC.find(g => !used.has(g)) || 'balloon';
      used.add(id); out.push(id);
    });
    return out;
  }

  (env.games = env.games || []).push({
    id: 'literally', mode: 'reset', name: 'Literally', verb: 'stage', family: 'INTERRUPT', minutes: 2,
    parents: ['Inner Speech / Mental Text', 'Overthinking / Thought Fusion'],
    cast: ['loopie'], poster: { char: 'loopie', mood: 'E38' },
    tagline: 'Put your thoughts on stage. Loopie acts them out, word for word.',
    why: 'For a loud inner voice: act a thought out literally and it starts to sound like just words.',
    css: `
.g-literally .lt-act { position: absolute; z-index: 26; transform: translate(-50%, -50%); padding: 5px 14px 4px; border-radius: 6px; background: linear-gradient(180deg, #ffe7a3, #d9a43a); color: #4a2a08; font: 800 13px/1 var(--font-display); letter-spacing: 0.18em; box-shadow: 0 3px 0 #8a5a14, 0 6px 14px rgba(0, 0, 0, 0.35); white-space: nowrap; pointer-events: none; }
.g-literally .lt-card { position: absolute; z-index: 28; display: flex; align-items: center; justify-content: center; padding: 10px 12px 9px; border-radius: 10px; touch-action: none; cursor: grab; text-align: center;
  background: linear-gradient(180deg, #fffaf0, #f3e3c7); color: #2b2335; font: 600 15px/1.2 var(--font-ui); box-shadow: 0 2px 0 #c9a77a, 0 10px 22px rgba(0, 0, 0, 0.35); border: 1px solid rgba(120, 80, 40, 0.25);
  transition: opacity 0.35s ease, transform 0.35s cubic-bezier(.2, 1.3, .4, 1); text-wrap: balance; -webkit-user-select: none; user-select: none; }
.g-literally .lt-card::before { content: ""; position: absolute; left: 50%; top: -7px; width: 22px; height: 12px; margin-left: -11px; border-radius: 3px; background: linear-gradient(180deg, #d8d2c6, #9c958a); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4); }
.g-literally .lt-card.lt-drag { transition: none; z-index: 29; cursor: grabbing; box-shadow: 0 2px 0 #c9a77a, 0 22px 40px rgba(0, 0, 0, 0.45); }
.g-literally .lt-card.lt-gone { opacity: 0; pointer-events: none; }
.g-literally .lt-card:focus-visible { outline: 3px solid #ffd36b; outline-offset: 3px; }
.g-literally .lt-deck { position: absolute; z-index: 27; display: flex; gap: 10px; justify-content: center; align-items: center; flex-wrap: wrap; pointer-events: none; }
.g-literally .lt-deck > * { pointer-events: auto; }
.g-literally .lt-vbtn { appearance: none; border: 0; cursor: pointer; width: var(--vw, 108px); height: 82px; border-radius: 18px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px;
  background: linear-gradient(180deg, #fff8ea, #f2dcbf); color: #3a2410; font: 700 14px/1.1 var(--font-ui); box-shadow: 0 5px 0 #c99e74, 0 10px 20px rgba(0, 0, 0, 0.32); transition: transform 0.08s ease, box-shadow 0.08s ease; animation: lt-pop 0.4s cubic-bezier(.2, 1.5, .4, 1) both; }
.g-literally .lt-vbtn svg { width: 32px; height: 32px; }
.g-literally .lt-vbtn:active, .g-literally .lt-vbtn.lt-on { transform: translateY(4px); box-shadow: 0 1px 0 #c99e74, 0 4px 10px rgba(0, 0, 0, 0.3); }
.g-literally .lt-vbtn.lt-new::after { content: "NEW"; position: absolute; margin: -66px 0 0 70px; padding: 3px 6px; border-radius: 6px; background: #ff7a8a; color: #fff; font: 800 12px/1 var(--font-ui); }
.g-literally .lt-vbtn { position: relative; }
.g-literally .lt-big { appearance: none; border: 0; cursor: pointer; min-height: 64px; padding: 12px 22px; border-radius: 20px; display: flex; align-items: center; gap: 12px; max-width: calc(100% - 24px);
  background: linear-gradient(180deg, #ffe7a3, #ffc861); color: #3a2405; font: 700 17px/1.2 var(--font-ui); box-shadow: 0 5px 0 #c98f2e, 0 12px 24px rgba(0, 0, 0, 0.35); animation: lt-pop 0.4s cubic-bezier(.2, 1.5, .4, 1) both; text-align: left; }
.g-literally .lt-big svg { width: 34px; height: 34px; flex: none; }
.g-literally .lt-big:active, .g-literally .lt-big.lt-on { transform: translateY(4px); box-shadow: 0 1px 0 #c98f2e, 0 4px 10px rgba(0, 0, 0, 0.3); }
.g-literally .lt-big:focus-visible, .g-literally .lt-vbtn:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
@keyframes lt-pop { from { opacity: 0; transform: translateY(14px) scale(0.92); } to { opacity: 1; transform: none; } }
.g-literally .lt-voice { position: absolute; z-index: 25; left: 50%; transform: translateX(-50%); text-align: center; pointer-events: none; font-size: 26px; line-height: 1.25; font-weight: 800; letter-spacing: 0.01em; width: max-content; text-wrap: balance; }
.g-literally .lt-voice .lt-w { display: inline-block; white-space: nowrap; margin: 0 0.16em; }
.g-literally .lt-voice .lt-ch { display: inline-block; white-space: pre; animation-fill-mode: both; }
.g-literally .lt-v-helium { font-family: var(--font-display); color: #fff0f6; text-shadow: 0 3px 0 #a3305e, 0 0 3px #6a1240, 0 0 16px rgba(120, 20, 70, 0.75); }
.g-literally .lt-v-helium .lt-ch { animation: lt-hop 0.36s ease-in-out infinite alternate; }
.g-literally .lt-v-opera { font-family: Georgia, "Times New Roman", serif; font-style: italic; font-weight: 700; color: #ffe9ad; text-shadow: 0 2px 0 #6a3a08, 0 0 3px #4a2606, 0 0 16px rgba(90, 40, 0, 0.6); font-size: 28px; }
.g-literally .lt-v-opera .lt-ch { animation: lt-swell 1.1s ease-in-out infinite; }
.g-literally .lt-v-sports { font-family: var(--font-display); font-style: italic; text-transform: uppercase; color: #fff; text-shadow: 3px 3px 0 #1d6fb8, 0 0 14px rgba(120, 200, 255, 0.8); letter-spacing: 0.03em; }
.g-literally .lt-v-sports .lt-ch { animation: lt-zoom 0.32s cubic-bezier(.2, 1.4, .4, 1) both; }
.g-literally .lt-v-trailer { font-family: var(--font-display); text-transform: uppercase; color: #f4ecd8; letter-spacing: 0.14em; text-shadow: 0 0 1px #000, 0 4px 18px rgba(0, 0, 0, 0.9); }
.g-literally .lt-v-trailer .lt-ch { animation: lt-slam 0.42s cubic-bezier(.3, 1.5, .5, 1) both; }
.g-literally .lt-v-slow, .g-literally .lt-v-whisper, .g-literally .lt-v-song { font-family: var(--font-display); color: #f2f0ff; text-shadow: 0 2px 12px rgba(40, 30, 90, 0.8); }
.g-literally .lt-v-slow .lt-ch { animation: lt-drift 2.4s ease-in-out infinite alternate; }
.g-literally .lt-v-whisper { opacity: 0.85; font-weight: 600; }
.g-literally .lt-v-song .lt-ch { animation: lt-hop 0.6s ease-in-out infinite alternate; }
@keyframes lt-hop { from { transform: translateY(0); } to { transform: translateY(-9px) rotate(-4deg); } }
@keyframes lt-swell { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.18) translateY(-3px); } }
@keyframes lt-zoom { from { opacity: 0; transform: translateX(60px) skewX(-18deg); } to { opacity: 1; transform: none; } }
@keyframes lt-slam { from { opacity: 0; transform: scale(2.4); } to { opacity: 1; transform: none; } }
@keyframes lt-drift { from { transform: translateY(0); } to { transform: translateY(-5px); } }
.g-literally .lt-serious { position: absolute; z-index: 25; left: 50%; transform: translate(-50%, -50%); width: calc(100% - 48px); text-align: center; pointer-events: none; font: 400 30px/1.1 Georgia, "Times New Roman", serif; letter-spacing: 0.06em; text-transform: uppercase; color: #f6ecdf; text-shadow: 0 2px 0 #3a0610, 0 0 18px rgba(255, 40, 60, 0.85), 0 0 42px rgba(255, 30, 50, 0.6); animation: lt-loom 1.5s ease both; }
@keyframes lt-loom { from { opacity: 0; transform: translate(-50%, -50%) scale(0.6); } 60% { opacity: 1; } to { opacity: 1; transform: translate(-50%, -50%) scale(1.06); } }
.g-literally .lt-frame { position: absolute; z-index: 24; transform-origin: 50% -16px; pointer-events: auto; cursor: pointer; padding: 9px; border-radius: 4px; touch-action: manipulation;
  background: linear-gradient(135deg, #ffe7a3, #c9922e 45%, #ffe39a 70%, #a8721c); box-shadow: 0 8px 18px rgba(0, 0, 0, 0.45), inset 0 0 0 2px rgba(120, 70, 10, 0.5); }
.g-literally .lt-frame::before { content: ""; position: absolute; left: 50%; top: -16px; width: 2px; height: 16px; background: linear-gradient(transparent, rgba(60, 40, 20, 0.7)); }
.g-literally .lt-frame::after { content: ""; position: absolute; left: 50%; top: -20px; width: 8px; height: 8px; margin-left: -3px; border-radius: 50%; background: #d8c9a8; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5); }
.g-literally .lt-frame-in { background: #fbf6ea; border-radius: 2px; padding: 6px 8px 7px; box-shadow: inset 0 0 0 1px rgba(120, 90, 40, 0.3), inset 0 2px 6px rgba(0, 0, 0, 0.12); text-align: center; color: #2b2335; }
.g-literally .lt-frame-pre { display: block; font: italic 500 12px/1.2 Georgia, "Times New Roman", serif; color: #6a5a48; margin-bottom: 3px; }
.g-literally .lt-frame .lt-frame-txt { display: block; font: 700 15px/1.2 var(--font-ui); text-wrap: balance; overflow-wrap: normal; word-break: normal; hyphens: auto; }
.g-literally .lt-gallery { position: absolute; z-index: 23; transform: translate(-50%, -50%); padding: 4px 12px 3px; border-radius: 4px; background: linear-gradient(180deg, #f6e3b0, #c99a48); color: #3a2405; font: italic 600 13px/1.2 Georgia, "Times New Roman", serif;
  box-shadow: 0 2px 0 #8a5a14, 0 6px 12px rgba(0, 0, 0, 0.35); white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity 0.8s ease; }
.g-literally .lt-gallery.lt-on { opacity: 1; }
.g-literally .lt-rail { position: absolute; z-index: 22; height: 4px; border-radius: 2px; background: linear-gradient(180deg, #ffe39a, #a8721c); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4); pointer-events: none; }
.g-literally .lt-frame.lt-hung { cursor: default; }
.g-literally .lt-tip { position: absolute; z-index: 27; transform: translateX(-50%); font: 600 14px/1.25 var(--font-ui); color: #fff7e6; text-align: center; text-shadow: 0 1px 8px rgba(0, 0, 0, 0.6); pointer-events: none; white-space: nowrap; }
.g-literally.lt-bright .lt-tip { color: #2a1d30; text-shadow: 0 1px 8px rgba(255, 255, 255, 0.7); }
.g-literally .gk-char.gk-side-above .gk-bubble { max-width: var(--bmax, 240px); }
.g-literally .lt-loopie { transform-origin: 50% 100%; }
.g-literally .lt-cameo { position: absolute; z-index: 31; width: 40px; height: 40px; object-fit: contain; pointer-events: none; filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5)); }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis;
      const care = an.safety === 'care';
      const inten = ctx.intensity;
      const visits = K.visits();
      const line = (o) => ctx.line(o);
      const dark = () => K.dark();
      const DAY = { curtain: K.dailyPick(CURTAINS, 1), scene: K.dailyPick(SCENES, 2), flower: K.dailyPick(FLOWERS, 3) };
      el.classList.toggle('lt-bright', !dark());

      /* ---------------- the player's thoughts become prop cards ---------------- */
      // Like K.phrases (only the player's own words), but a conjunction never strands a one-word scrap:
      // "I feel so stupid" stays whole instead of becoming "I feel".
      const fullParts = [];
      ctx.TS.clean(ctx.text || '', 600).split(/[.!?;\n]+|,\s+/).forEach(sent => {
        const bits = sent.trim().split(/\s+(and|but|so|because|then)\s+/i), nw = (s) => s.split(/\s+/).filter(Boolean).length;
        let cur = (bits[0] || '').trim();
        for (let i = 1; i < bits.length; i += 2) { const nxt = (bits[i + 1] || '').trim(); if (nw(nxt) < 2 || nw(cur) < 2) cur = (cur + ' ' + bits[i] + ' ' + nxt).trim(); else { fullParts.push(cur); cur = nxt; } }
        if (nw(cur) >= 2) fullParts.push(cur);
      });
      let phrases = fullParts.slice(0, 4).map(p => { const ws = p.replace(/\s+/g, ' ').trim().split(' '); const s = ws.length > 8 ? ws.slice(0, 8).join(' ') + '…' : ws.join(' '); return s.charAt(0).toUpperCase() + s.slice(1); }).filter(p => p.length >= 3);
      const fullOf = (p, i) => (fullParts[i] && fullParts[i].toLowerCase().startsWith(p.replace(/…$/, '').toLowerCase().slice(0, 12)) ? fullParts[i] : p);
      const seen = new Set(phrases.map(p => p.toLowerCase()));
      for (const s of (an.strands || []).concat(an.core ? [an.core] : [])) {
        if (phrases.length >= 4) break;
        const l = String(s && s.label || '').trim(); if (!l) continue;
        const nice = (l.charAt(0) + l.slice(1).toLowerCase()).replace(/\bi\b/g, 'I').replace(/\bi(['’])(m|ve|d|ll)\b/g, 'I$1$2');
        if (!seen.has(nice.toLowerCase())) { seen.add(nice.toLowerCase()); phrases.push(nice); }
      }
      if (phrases.length < 3) ['What if it goes wrong', 'I should have done better', 'Everyone will notice'].forEach(p => { if (phrases.length < 3) phrases.push(p); });
      phrases = phrases.slice(0, 4);
      let skitOf = matchSkits(phrases.map(fullOf), care);
      if (!care && ctx.text) {
        ctx.ai('Map each short thought to the single funniest literal stage skit id. Ids: pool (drowning, swamped), reel (replaying), pop (exploding), jelly (stuck), pieces (falling apart), anvil (heavy), candle (burning out), socks (chaos, mess), hat (feeling stupid), mountain (mountain of work), balloon (anything else). Use each id at most once. Thoughts: ' + JSON.stringify(phrases) + ' Reply as JSON: {"skits":["id", ...]} in the same order.', { tier: 'quick', fallback: null })
          .then(r => {
            if (!r || !Array.isArray(r.skits) || r.skits.length !== phrases.length) return;
            const ids = r.skits.map(x => String(x || '').toLowerCase());
            if (ids.every(x => SKITS.some(s => s.id === x)) && new Set(ids).size === ids.length && round === 0 && !staged) skitOf = ids;
          }).catch(() => {});
      }

      /* ---------------- scene objects ---------------- */
      const SOFT = softwareGfx(), cvOpts = { maxDpr: SOFT ? 1.25 : 2 }, cv = opaqueCanvas(el, cvOpts, S), qual = { acc: 0, n: 0, slow: 0 };
      const P = K.particles({ max: 420 });
      const G = { w: 0, H: 0, phone: true, L: 84 };
      const act = h('div', { class: 'lt-act', text: 'ACT I' });
      const gallery = h('div', { class: 'lt-gallery', 'aria-hidden': 'true', text: 'I’m having the thought that…' });
      const rail = h('div', { class: 'lt-rail', 'aria-hidden': 'true' });
      const tip = h('div', { class: 'lt-tip', role: 'status', 'aria-live': 'polite' });
      const deck = h('div', { class: 'lt-deck' });
      el.append(rail, gallery, act, tip, deck);
      const loopie = K.character('loopie', { side: 'above', mood: 'E53', x: 0, y: 0, size: 84 });
      loopie.el.classList.add('lt-loopie');
      const LP = { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, key: '' };
      const cameos = [];
      if (visits >= 2) cameos.push(h('img', { class: 'lt-cameo', alt: '', src: ctx.TS.faceUrl('patch', 'E08') }));
      if (visits >= 4) cameos.push(h('img', { class: 'lt-cameo', alt: '', src: ctx.TS.faceUrl('still', 'E35') }));
      cameos.forEach(c => el.append(c));
      const cards = phrases.map((p, i) => {
        const c = h('div', { class: 'lt-card gk-user', role: 'button', tabindex: '0', 'aria-label': 'Prop card: ' + p + '. Drag onto the stage, or press Enter.', text: p });
        el.append(c);
        return { el: c, i, p, used: false, x: 0, y: 0, w: 0, h: 0 };
      });
      const frames = [];

      /* ---------------- audio: vaudeville band, laughs, voices ---------------- */
      const music = K.music('playful');
      if (care) music.tempo(84);
      const bus = () => A.bus && A.bus('sfx');
      const beatPos = () => (A.ctx && music.next > 0) ? music.beat - (music.next - A.now()) / (60 / music.bpm) : performance.now() / 1000 * music.bpm / 60;
      function rimshot(at) {
        if (!A.ctx) return; const t = at || A.now() + 0.02;
        A.drum(t, 0.28, 1.45); A.drum(t + 0.15, 0.3, 1.05);
        A.noise({ when: t + 0.32, filter: 'highpass', freq: 5200, dur: 0.75, attack: 0.003, vol: 0.12 });
        A.sync('rimshot', performance.now());
      }
      function kazoo(notes, durs, vol, at) {
        if (!A.ctx) return; const c = A.ctx, out = bus(); if (!out) return;
        let t = at || c.currentTime + 0.02;
        notes.forEach((n, i) => {
          const d = durs[i % durs.length], f = A.note(n);
          const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.97, t); o.frequency.linearRampToValueAtTime(f, t + 0.05);
          const l = c.createOscillator(); l.frequency.value = 6; const lg = c.createGain(); lg.gain.value = f * 0.02; l.connect(lg); lg.connect(o.frequency);
          const b1 = c.createBiquadFilter(); b1.type = 'bandpass'; b1.frequency.value = 950; b1.Q.value = 3;
          const b2 = c.createBiquadFilter(); b2.type = 'bandpass'; b2.frequency.value = 2500; b2.Q.value = 5;
          const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.16, t + 0.03); g.gain.setValueAtTime(vol || 0.16, t + d * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
          o.connect(b1); o.connect(b2); b1.connect(g); b2.connect(g); g.connect(out);
          o.start(t); l.start(t); o.stop(t + d + 0.05); l.stop(t + d + 0.05);
          o.onended = () => { try { g.disconnect(); } catch (e) { /* gone */ } };
          t += d;
        });
      }
      const tada = () => { kazoo(['C5', 'E5', 'G5', 'C6'], [0.09, 0.09, 0.09, 0.42], 0.12); if (A.ctx) A.noise({ when: A.now() + 0.3, filter: 'highpass', freq: 5000, dur: 0.6, vol: 0.08 }); };
      const sadTrombone = () => kazoo(['G4', 'F#4', 'F4', 'E4'], [0.32, 0.32, 0.32, 0.9], 0.13);
      function laugh(n, vol) {
        if (!A.ctx || care) return; const c = A.ctx, out = bus(); if (!out) return;
        for (let p = 0; p < n; p++) {
          const base = 150 + Math.random() * 220, start = c.currentTime + Math.random() * 0.5, k = 2 + Math.floor(Math.random() * 3);
          for (let j = 0; j < k; j++) {
            const t = start + j * (0.13 + Math.random() * 0.04), o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(base * (1.1 - j * 0.04), t);
            const bf = c.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 900 + Math.random() * 300; bf.Q.value = 2.5;
            const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime((vol || 0.03) * (0.6 + Math.random() * 0.6), t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
            o.connect(bf); bf.connect(g); g.connect(out); o.start(t); o.stop(t + 0.12); o.onended = () => { try { g.disconnect(); } catch (e) { /* gone */ } };
          }
        }
      }
      function applause(sec, vol) {
        if (!A.ctx) return;
        const n = Math.round(sec * 70);
        for (let i = 0; i < n; i++) A.noise({ when: A.now() + Math.random() * sec, filter: 'bandpass', freq: 1800 + Math.random() * 1600, q: 1.2, dur: 0.03, vol: (vol || 0.05) * (0.5 + Math.random()) });
      }
      let roll = 0;
      function drumRoll(on) {
        S.cancel(roll); if (!on || !A.ctx) return;
        let v = 0.02;
        const hit = () => { if (!A.ctx) return; A.noise({ filter: 'bandpass', freq: 2300, q: 0.9, dur: 0.05, vol: v }); v = Math.min(0.09, v + 0.002); roll = K.later(hit, 46); };
        hit();
      }
      function crash() { if (!A.ctx) return; A.kick(A.now(), 0.5); A.noise({ filter: 'highpass', freq: 4200, dur: 1.2, attack: 0.002, vol: 0.14 }); }
      function speak(text, V) {
        // a formant "voice": one blip per syllable, timed so the letters can dance in step
        const words = text.replace(/[…"“”]/g, '').split(/\s+/).filter(Boolean), sched = [];
        let t = 0, idx = 0;
        words.forEach((wd, wi) => {
          const groups = (wd.toLowerCase().match(/[aeiouy]+/g) || ['a']).slice(0, 3);
          sched.push({ wi, t });
          groups.forEach(gp => { blip(t, gp[0], V, idx++); t += V.dur + V.gap; });
          t += V.gap * 1.5;
        });
        return { sched, total: t };
      }
      function blip(dt0, vowel, V, idx) {
        if (!A.ctx) return; const c = A.ctx, out = bus(); if (!out) return;
        const t = c.currentTime + 0.06 + dt0;
        let f0 = V.base;
        if (V.melody) f0 = V.base * Math.pow(2, V.melody[idx % V.melody.length] / 12);
        else if (V.rising) f0 = V.base * (1 + Math.min(0.6, idx * 0.03)) * (0.95 + Math.random() * 0.1);
        else f0 = V.base * (0.9 + Math.random() * 0.25);
        const o = c.createOscillator(); o.type = V.wave; o.frequency.setValueAtTime(f0, t);
        if (V.rising) o.frequency.linearRampToValueAtTime(f0 * 1.12, t + V.dur);
        if (V.vib) { const l = c.createOscillator(); l.frequency.value = 5.6; const lg = c.createGain(); lg.gain.value = f0 * 0.028; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + V.dur + 0.08); }
        const F = FORM[vowel] || FORM.a, g = c.createGain();
        const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = F[0] * V.f; f1.Q.value = 5;
        const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = F[1] * V.f; f2.Q.value = 7;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(V.vol, t + Math.min(0.03, V.dur * 0.3)); g.gain.setValueAtTime(V.vol, t + V.dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + V.dur + 0.03);
        o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(out);
        if (V.breathy) A.noise({ when: t, filter: 'bandpass', freq: F[1] * 1.3, q: 2, dur: V.dur, vol: 0.03 });
        if (V.boom && idx % 3 === 0) A.tone({ when: t, type: 'sine', freq: 62, to: 38, glide: 0.3, dur: 0.5, vol: 0.18 });
        o.start(t); o.stop(t + V.dur + 0.06); o.onended = () => { try { g.disconnect(); } catch (e) { /* gone */ } };
      }

      /* ---------------- layout ---------------- */
      let BASE = null, VEL = null, FOOT = null;
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        const phone = w < 700;
        Object.assign(G, { w, H, phone });
        if (phone) {
          G.L = 84; G.stageX = 0; G.stageW = w; G.val = 104; G.wallTop = 112; G.floor = 560; G.front = 604; G.aud = 640; G.deckTop = 664; G.curtW = 34;
        } else {
          G.L = 108; G.stageW = Math.min(900, w - 360); G.stageX = (w - G.stageW) / 2; G.val = 112; G.wallTop = 120; G.floor = H - 252; G.front = H - 206; G.aud = H - 168; G.deckTop = H - 146; G.curtW = 58;
        }
        G.cx = G.stageX + G.stageW / 2;
        G.spot = { x: G.cx, y: G.floor - G.L * 0.2 };
        G.home = { x: G.cx - G.L / 2, y: G.floor - G.L };
        loopie.el.style.setProperty('--sz', G.L + 'px');
        loopie.place(G.home.x, G.home.y);
        loopie.el.style.setProperty('--bmax', Math.max(160, Math.min(260, w - G.home.x - 14)) + 'px');
        act.style.left = G.cx + 'px'; act.style.top = (G.val - 16) + 'px';
        // frames hang on the back wall, one nail each
        const inner = G.stageW - G.curtW * 2 - (phone ? 6 : 40);
        G.frameW = phone ? Math.min(118, Math.floor((w - 30) / 3)) : Math.min(210, Math.floor((inner - 16) / 3));
        G.nails = [0, 1, 2].map(i => ({ x: G.cx + (i - 1) * (G.frameW + (phone ? 6 : 14)), y: G.wallTop + (phone ? 30 : 34) }));
        gallery.style.left = G.cx + 'px'; gallery.style.top = (G.wallTop + (phone ? 9 : 10)) + 'px';
        Object.assign(rail.style, { left: (G.nails[0].x - G.frameW / 2 - 6) + 'px', width: (G.nails[2].x - G.nails[0].x + G.frameW + 12) + 'px', top: (G.nails[0].y - 2) + 'px' });
        frames.forEach((f, i) => placeFrame(f, i, true));
        // cards: in the pit on a phone, in the wings on a desktop
        layoutCards();
        tip.style.left = G.cx + 'px'; tip.style.top = (G.deckTop - 4) + 'px';
        Object.assign(deck.style, { left: '12px', right: '12px', top: (G.deckTop + 18) + 'px', bottom: '18px' });
        deck.style.setProperty('--vw', phone ? Math.floor((w - 24 - 20) / Math.min(3, voiceList().length)) + 'px' : '140px');
        cameos.forEach((c, i) => { c.style.left = (G.cx + (i ? 1 : -1) * (G.stageW * 0.3) - 20) + 'px'; c.style.top = (G.aud - 30) + 'px'; });
        paintBase();
      }
      function layoutCards() {
        const live = cards.filter(c => !c.used);
        if (G.phone) {
          const cw = Math.floor((G.w - 36) / 2), ch = 60;
          live.forEach((c, i) => { c.w = cw; c.h = ch; c.x = 12 + (i % 2) * (cw + 12); c.y = G.deckTop + 24 + Math.floor(i / 2) * (ch + 10); });
          if (live.length === 3) { live[2].x = (G.w - cw) / 2; }
          if (live.length === 1) { live[0].x = (G.w - cw) / 2; }
        } else {
          const cw = Math.min(170, G.stageX - 40), ch = 92;
          live.forEach((c, i) => { const left = i % 2 === 0; c.w = cw; c.h = ch; c.x = left ? G.stageX - cw - 24 : G.stageX + G.stageW + 24; c.y = G.wallTop + 150 + Math.floor(i / 2) * (ch + 30); });
        }
        cards.forEach(c => Object.assign(c.el.style, { left: c.x + 'px', top: c.y + 'px', width: c.w + 'px', minHeight: c.h + 'px' }));
      }
      function mk(w, hh) { const c = document.createElement('canvas'), d = cv.dpr || 2; c.width = Math.max(1, Math.round(w * d)); c.height = Math.max(1, Math.round(hh * d)); const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); return { c, g }; }

      /* ---------------- painting the theatre ---------------- */
      function paintBase() {
        const w = G.w, H = G.H, D = dark(), x0 = G.stageX, sw = G.stageW;
        BASE = mk(w, H); const g = BASE.g;
        // house walls
        const wall = g.createLinearGradient(0, 0, 0, H); wall.addColorStop(0, D ? '#1a0f1c' : '#5a3446'); wall.addColorStop(1, D ? '#0c070e' : '#3a2230');
        g.fillStyle = wall; g.fillRect(0, 0, w, H);
        if (!G.phone) { g.fillStyle = D ? 'rgba(255,210,150,0.06)' : 'rgba(255,230,190,0.1)'; for (let x = 20; x < x0 - 10; x += 34) g.fillRect(x, 0, 14, H); for (let x = x0 + sw + 10; x < w; x += 34) g.fillRect(x, 0, 14, H); }
        // the backdrop flat, painted in today's scene
        const bTop = G.val - 6, bBot = G.floor - 10;
        g.save(); g.beginPath(); g.rect(x0, bTop, sw, bBot - bTop); g.clip();
        paintScene(g, x0, bTop, sw, bBot - bTop, D);
        g.restore();
        // stage floor: boards in perspective
        const fy = G.floor - 14, fb = G.front;
        const fl = g.createLinearGradient(0, fy, 0, fb); fl.addColorStop(0, D ? '#6b3e22' : '#9a6234'); fl.addColorStop(1, D ? '#3e2212' : '#6e4220');
        g.fillStyle = fl; g.fillRect(x0, fy, sw, fb - fy);
        g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
        for (let i = -12; i <= 12; i++) { const xa = G.cx + i * sw / 20, xb = G.cx + i * sw / 13; g.beginPath(); g.moveTo(xa, fy); g.lineTo(xb, fb); g.stroke(); }
        for (let y = fy + 9; y < fb; y += 11 + (y - fy) * 0.1) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + sw, y); g.stroke(); }
        g.fillStyle = D ? '#2a1408' : '#4a2a14'; g.fillRect(x0, fb, sw, 10);
        g.fillStyle = 'rgba(255,220,160,0.18)'; g.fillRect(x0, fy, sw, 2);
        // footlight housings
        G.foot = [];
        const nf = G.phone ? 7 : 11;
        for (let i = 0; i < nf; i++) { const x = x0 + sw * (i + 0.5) / nf; G.foot.push(x); g.fillStyle = '#20140c'; g.beginPath(); g.ellipse(x, fb + 2, 13, 6, 0, Math.PI, 0); g.fill(); }
        // proscenium arch with gilded edge
        g.fillStyle = D ? '#2b1520' : '#6a3a4c';
        g.fillRect(0, 0, w, G.val - 30);
        if (!G.phone) { g.fillRect(0, 0, x0 - 6, G.front + 10); g.fillRect(x0 + sw + 6, 0, w - x0 - sw - 6, G.front + 10); }
        const gold = g.createLinearGradient(0, 0, 0, 12); gold.addColorStop(0, '#ffe39a'); gold.addColorStop(0.5, '#c9922e'); gold.addColorStop(1, '#8a5a14');
        g.fillStyle = gold; g.fillRect(x0 - 6, G.val - 34, sw + 12, 6);
        if (!G.phone) { g.fillRect(x0 - 8, G.val - 34, 6, G.front - G.val + 44); g.fillRect(x0 + sw + 2, G.val - 34, 6, G.front - G.val + 44); }
        // valance with gold fringe
        const vy = G.val - 28, vh = 26;
        g.fillStyle = DAY.curtain[2]; g.fillRect(x0, vy, sw, vh);
        for (let x = x0; x < x0 + sw; x += 30) { g.fillStyle = DAY.curtain[0]; g.beginPath(); g.moveTo(x, vy + vh); g.quadraticCurveTo(x + 15, vy + vh + 14, x + 30, vy + vh); g.lineTo(x + 30, vy); g.lineTo(x, vy); g.fill(); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x + 6, vy, 6, vh); }
        g.fillStyle = '#e8b648'; for (let x = x0 + 2; x < x0 + sw; x += 5) { const xx = (x - x0) % 30, dy = Math.sin(xx / 30 * Math.PI) * 14; g.fillRect(x, vy + vh + dy - 1, 2, 6); }
        // audience floor in front of the stage
        const af = g.createLinearGradient(0, fb + 10, 0, H); af.addColorStop(0, D ? '#120a10' : '#2c1a24'); af.addColorStop(1, D ? '#06040a' : '#1a0f16');
        g.fillStyle = af; g.fillRect(0, fb + 10, w, H - fb - 10);
        for (let row = 0, y = G.aud + 34; y < H + 20; y += 34, row++) {
          for (let x = -(row % 2) * 22; x < w + 44; x += 44) {
            const sg2 = g.createLinearGradient(0, y, 0, y + 30); sg2.addColorStop(0, D ? '#3a1220' : '#5a2232'); sg2.addColorStop(1, D ? '#1a070e' : '#2e0f18');
            g.fillStyle = sg2; g.beginPath(); g.moveTo(x + 4, y + 30); g.lineTo(x + 4, y + 8); g.quadraticCurveTo(x + 4, y, x + 12, y); g.lineTo(x + 32, y); g.quadraticCurveTo(x + 40, y, x + 40, y + 8); g.lineTo(x + 40, y + 30); g.closePath(); g.fill();
            g.fillStyle = 'rgba(255,200,170,0.07)'; g.fillRect(x + 8, y + 3, 28, 2);
          }
        }
        const dk = g.createLinearGradient(0, G.aud + 20, 0, H); dk.addColorStop(0, 'rgba(0,0,0,0.55)'); dk.addColorStop(0.3, 'rgba(0,0,0,0.25)'); dk.addColorStop(1, 'rgba(0,0,0,0.6)'); g.fillStyle = dk; g.fillRect(0, G.aud + 20, w, H - G.aud - 20);
        // velvet fold texture for the curtains
        VEL = mk(64, 64); const vg = VEL.g, vgr = vg.createLinearGradient(0, 0, 64, 0);
        vgr.addColorStop(0, DAY.curtain[2]); vgr.addColorStop(0.3, DAY.curtain[1]); vgr.addColorStop(0.55, DAY.curtain[0]); vgr.addColorStop(0.8, DAY.curtain[2]); vgr.addColorStop(1, DAY.curtain[0]);
        vg.fillStyle = vgr; vg.fillRect(0, 0, 64, 64);
        VEL.pat = cv.g.createPattern(VEL.c, 'repeat');
        // one cached glow for every footlight (drawn with its own brightness each frame)
        FOOT = mk(52, 52); const fgr = FOOT.g.createRadialGradient(26, 26, 1, 26, 26, 26); fgr.addColorStop(0, 'rgba(255,226,150,1)'); fgr.addColorStop(1, 'rgba(255,226,150,0)'); FOOT.g.fillStyle = fgr; FOOT.g.fillRect(0, 0, 52, 52);
        // marquee bulb targets for the finale
        buildMarquee();
      }
      function paintScene(g, x, y, w, hh, D) {
        const s = DAY.scene, k = D ? 1 : 1.25, c = (r, gg, b) => `rgb(${Math.min(255, r * k) | 0},${Math.min(255, gg * k) | 0},${Math.min(255, b * k) | 0})`;
        const sky = g.createLinearGradient(0, y, 0, y + hh);
        const R = K.rng(K.daily() + 5);
        if (s === 'sea') { sky.addColorStop(0, c(60, 110, 170)); sky.addColorStop(1, c(150, 190, 220)); }
        else if (s === 'desert') { sky.addColorStop(0, c(120, 70, 120)); sky.addColorStop(1, c(240, 150, 110)); }
        else if (s === 'forest') { sky.addColorStop(0, c(30, 50, 70)); sky.addColorStop(1, c(70, 110, 110)); }
        else if (s === 'city') { sky.addColorStop(0, c(40, 30, 80)); sky.addColorStop(1, c(110, 70, 130)); }
        else { sky.addColorStop(0, c(20, 24, 70)); sky.addColorStop(1, c(60, 60, 130)); }
        g.fillStyle = sky; g.fillRect(x, y, w, hh);
        const base = y + hh;
        if (s === 'night' || s === 'city' || s === 'forest') { g.fillStyle = 'rgba(255,250,230,0.8)'; for (let i = 0; i < 40; i++) { const sx = x + R() * w, sy = y + R() * hh * 0.6; g.fillRect(sx, sy, 1.6, 1.6); } }
        if (s === 'night') {
          g.fillStyle = '#fff3c8'; g.beginPath(); g.arc(x + w * 0.78, y + hh * 0.42, 22, 0, K.TAU); g.fill(); g.fillStyle = c(28, 30, 84); g.beginPath(); g.arc(x + w * 0.78 + 9, y + hh * 0.42 - 5, 20, 0, K.TAU); g.fill();
          [[0.25, c(30, 34, 90)], [0.12, c(22, 26, 70)]].forEach(([hgt, col], j) => { g.fillStyle = col; g.beginPath(); g.moveTo(x, base); for (let i = 0; i <= 10; i++) g.lineTo(x + w * i / 10, base - hh * hgt - Math.sin(i * 1.3 + j) * 16); g.lineTo(x + w, base); g.fill(); });
        } else if (s === 'sea') {
          g.fillStyle = '#fff1b8'; g.beginPath(); g.arc(x + w * 0.25, y + hh * 0.5, 26, 0, K.TAU); g.fill();
          for (let j = 0; j < 3; j++) { g.fillStyle = c(40 + j * 10, 90 + j * 20, 150 + j * 15); g.beginPath(); g.moveTo(x, base); for (let i = 0; i <= 24; i++) g.lineTo(x + w * i / 24, base - hh * (0.3 - j * 0.09) + (i % 2 ? -8 : 8)); g.lineTo(x + w, base); g.fill(); }
          g.strokeStyle = 'rgba(30,30,40,0.6)'; g.lineWidth = 2; for (let i = 0; i < 3; i++) { const bx = x + w * (0.55 + i * 0.1), by = y + hh * (0.25 + i * 0.06); g.beginPath(); g.moveTo(bx - 7, by); g.quadraticCurveTo(bx - 3, by - 5, bx, by); g.quadraticCurveTo(bx + 3, by - 5, bx + 7, by); g.stroke(); }
        } else if (s === 'city') {
          let bx = x; while (bx < x + w) { const bw = 24 + R() * 40, bh = hh * (0.18 + R() * 0.32); g.fillStyle = c(30, 24, 60); g.fillRect(bx, base - bh, bw, bh); g.fillStyle = 'rgba(255,214,120,0.75)'; for (let yy = base - bh + 6; yy < base - 6; yy += 10) for (let xx = bx + 4; xx < bx + bw - 6; xx += 8) if (R() < 0.4) g.fillRect(xx, yy, 3, 4); bx += bw + 3; }
        } else if (s === 'forest') {
          for (let j = 0; j < 2; j++) for (let i = 0; i < 14; i++) { const tx = x + w * (i + R() * 0.5) / 13, th = hh * (0.3 + R() * 0.25) * (j ? 0.8 : 1); g.fillStyle = j ? c(20, 50, 44) : c(28, 70, 60); g.beginPath(); g.moveTo(tx - 16, base); g.lineTo(tx, base - th); g.lineTo(tx + 16, base); g.fill(); }
        } else {
          g.fillStyle = '#ffe2a0'; g.beginPath(); g.arc(x + w * 0.7, y + hh * 0.42, 34, 0, K.TAU); g.fill();
          [[0.2, c(200, 120, 90)], [0.1, c(170, 100, 80)]].forEach(([hgt, col], j) => { g.fillStyle = col; g.beginPath(); g.moveTo(x, base); for (let i = 0; i <= 8; i++) g.lineTo(x + w * i / 8, base - hh * hgt - Math.sin(i * 0.9 + j * 2) * 18); g.lineTo(x + w, base); g.fill(); });
          g.fillStyle = c(40, 90, 60); [[0.18, 46], [0.82, 36]].forEach(([fx, ch]) => { const cx2 = x + w * fx; g.fillRect(cx2 - 5, base - ch - 20, 10, ch); g.fillRect(cx2 - 15, base - ch, 8, 14); g.fillRect(cx2 + 7, base - ch - 8, 8, 14); });
        }
        // a little wall of nails for the frames
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, y, w, 4);
      }

      /* ---------------- marquee (finale) ---------------- */
      let MQ = null;
      function buildMarquee() {
        const words = G.phone ? ['JUST', 'WORDS'] : ['JUST WORDS'];
        const pts = [];
        const rows = words.length, colsOf = (s) => s.split('').reduce((n, ch) => n + (ch === ' ' ? 3 : 6), -1);
        const maxCols = Math.max(...words.map(colsOf));
        const sp = Math.min(G.phone ? 11 : 13, (G.stageW - G.curtW * 2 - 30) / maxCols);
        const top = G.phone ? G.wallTop + 172 : G.wallTop + 196;
        words.forEach((wd, r) => {
          let cx = G.cx - colsOf(wd) * sp / 2;
          wd.split('').forEach(ch => {
            if (ch === ' ') { cx += 3 * sp; return; }
            DOTS[ch].forEach((row, ry) => row.split('').forEach((d, rx) => { if (d === '#') pts.push({ x: cx + rx * sp, y: top + r * (8.5 * sp) + ry * sp }); }));
            cx += 6 * sp;
          });
        });
        // the sign board behind the bulbs, with a chasing rim of little lights
        const xs = pts.map(p => p.x), ys = pts.map(p => p.y), pad = sp * 1.25;
        const box = { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2 };
        const rim = [], gap = G.phone ? 13 : 15, inset = 6;
        for (let x = box.x + inset; x <= box.x + box.w - inset; x += gap) { rim.push({ x, y: box.y + inset }); rim.push({ x, y: box.y + box.h - inset }); }
        for (let y = box.y + inset + gap; y < box.y + box.h - inset - 4; y += gap) { rim.push({ x: box.x + inset, y }); rim.push({ x: box.x + box.w - inset, y }); }
        const prev = MQ;
        // every bulb state is a little cached sprite, so a hundred-odd lights cost a hundred blits
        const bulb = (r, fill, glowA) => { const z = Math.ceil(r * 4 + 6), o = mk(z, z), bg = o.g, c = z / 2;
          bg.fillStyle = `rgba(255,200,100,${glowA})`; bg.beginPath(); bg.arc(c, c, r * 2, 0, K.TAU); bg.fill();
          bg.fillStyle = 'rgba(90,40,10,0.55)'; bg.beginPath(); bg.arc(c + 0.8, c + 1, r * 1.05, 0, K.TAU); bg.fill();
          bg.fillStyle = fill; bg.beginPath(); bg.arc(c, c, r, 0, K.TAU); bg.fill();
          bg.fillStyle = 'rgba(255,255,255,0.8)'; bg.beginPath(); bg.arc(c - r * 0.3, c - r * 0.3, r * 0.3, 0, K.TAU); bg.fill();
          return { c: o.c, z }; };
        const dot = (r, fill) => { const z = Math.ceil(r * 2 + 3), o = mk(z, z); o.g.fillStyle = fill; o.g.beginPath(); o.g.arc(z / 2, z / 2, r, 0, K.TAU); o.g.fill(); return { c: o.c, z }; };
        const br = sp * 0.4, spr = { bright: bulb(br, '#fffdf2', 0.22), dim: bulb(br, '#ffd86b', 0.165), fly: bulb(br, '#fff6d8', 0.22), rimOn: dot(2.6, '#fff3c4'), rimOff: dot(1.9, 'rgba(255,196,110,0.5)') };
        const bo = mk(box.w + 8, box.h + 8), bgc = bo.g;
        rrect(bgc, 4, 4, box.w, box.h, 14); bgc.fillStyle = 'rgba(34,10,22,0.86)'; bgc.fill(); bgc.strokeStyle = '#e8b648'; bgc.lineWidth = 3; bgc.stroke();
        rrect(bgc, 15, 15, box.w - 22, box.h - 22, 8); bgc.strokeStyle = 'rgba(232,182,72,0.3)'; bgc.lineWidth = 1; bgc.stroke();
        spr.board = bo.c;
        MQ = { pts, sp, on: false, items: [], box, rim, bt: 0, spr };
        if (prev && prev.on) { MQ.on = true; MQ.items = pts.map(p => ({ x0: p.x, y0: p.y, x1: p.x, y1: p.y, t0: 0, ms: 1 })); }
      }
      function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

      /* ---------------- Loopie transform and stage drawing ---------------- */
      function applyLP() {
        const key = LP.dx.toFixed(1) + LP.dy.toFixed(1) + LP.sx.toFixed(3) + LP.sy.toFixed(3) + LP.rot.toFixed(1);
        if (key === LP.key) return; LP.key = key;
        loopie.el.style.transform = `translate(${LP.dx.toFixed(1)}px, ${LP.dy.toFixed(1)}px) rotate(${LP.rot.toFixed(1)}deg) scale(${LP.sx.toFixed(3)}, ${LP.sy.toFixed(3)})`;
      }
      const W = { curt: 0.86, curtT: 0.86, spot: 0.5, spotT: 1, dim: 0, dimT: 0, aud: 6, jump: 0, hands: 0, cardHover: 0, flowers: [] };
      function wrapText(g, text, maxW) { const ws = text.split(' '), out = []; let ln = ''; ws.forEach(wd => { const t2 = ln ? ln + ' ' + wd : wd; if (ln && g.measureText(t2).width > maxW) { out.push(ln); ln = wd; } else ln = t2; }); if (ln) out.push(ln); return out; }
      function textBlock(g, text, x, y, maxW, size, color, weight, align) {
        g.font = `${weight || 700} ${size}px ${FONT}`; g.textAlign = align || 'center'; g.textBaseline = 'middle';
        const lines = wrapText(g, text, maxW), lh = size * 1.15, y0 = y - (lines.length - 1) * lh / 2;
        g.fillStyle = color; lines.forEach((l, i) => g.fillText(l, x, y0 + i * lh));
        return lines.length * lh;
      }

      /* ---------------- skits ---------------- */
      let SK = null;
      const ease = K.ease.inOutCubic, eo = K.ease.outCubic, cl = (v) => K.clamp(v, 0, 1);
      const seg = (k, a, b) => cl((k - a) / (b - a));
      function anvilGeo() {
        const L = G.L, step = L * 0.7, R = G.stageX + G.stageW - G.curtW - 12, left = G.cx - step + L / 2 + 6;
        const aw = Math.min(L * 1.7, (R - left) / 1.12);
        return { step, aw, acx: left + aw * 0.62, fs: G.phone ? 15 : 18 };
      }
      function runSkit(id, phrase) {
        const durs = { pool: 4.8, pop: 4.4, jelly: 4.8, pieces: 4.6, anvil: 5, candle: 4.8, socks: 5, hat: 4.4, mountain: 5.4, balloon: 4.8, reel: 5.2, gentle: 4.4 };
        const dur = (durs[id] || 4.6) * (K.reduced() ? 0.7 : 1);
        SK = { id, phrase, t0: performance.now(), dur, k: 0, st: {} };
        const at = (frac, fn) => K.later(() => { if (SK && SK.id === id) fn(); }, frac * dur * 1000);
        const say = (frac, mood) => at(frac, () => loopie.face(mood, 0));
        if (id === 'pool') { if (A.ctx) A.whoosh({ dur: 0.4 }); say(0.14, 'E52'); at(0.15, () => kazoo(['A4', 'C5'], [0.12, 0.3], 0.1)); at(0.3, () => { if (A.ctx) A.noise({ filter: 'bandpass', freq: 900, dur: 0.4, vol: 0.1 }); }); at(0.45, () => { if (A.ctx) A.noise({ filter: 'bandpass', freq: 1100, dur: 0.35, vol: 0.08 }); }); say(0.62, 'E06'); at(0.64, () => { if (A.ctx) A.tone({ type: 'square', freq: 900, to: 1300, glide: 0.1, dur: 0.14, vol: 0.05 }); }); at(0.7, () => { if (A.ctx) A.wood(undefined, 0.25, 0.9); }); }
        if (id === 'pop') { say(0.05, 'E52'); at(0.02, () => { if (A.ctx) A.tone({ type: 'sine', freq: 300, to: 1500, glide: 2.4, dur: 2.6, vol: 0.05, attack: 0.3 }); }); say(0.45, 'E58'); at(0.62, () => { K.sfx.pop(); if (A.ctx) A.noise({ filter: 'lowpass', freq: 2000, dur: 0.25, vol: 0.3 }); crash(); popLetters(); }); say(0.66, 'E18'); }
        if (id === 'jelly') { at(0.02, () => { if (A.ctx) A.boing({ freq: 200, vol: 0.12 }); }); say(0.2, 'E70'); for (let i = 0; i < 4; i++) at(0.25 + i * 0.08, () => { if (A.ctx) A.boing({ freq: 260 + i * 30, vol: 0.09 }); }); say(0.58, 'E20'); at(0.6, () => { if (A.ctx) A.tone({ type: 'triangle', freq: 220, to: 880, glide: 0.4, dur: 0.45, vol: 0.12 }); }); at(0.78, () => K.sfx.thud()); }
        if (id === 'pieces') { say(0.1, 'E15'); at(0.16, () => { if (A.ctx) { A.noise({ filter: 'highpass', freq: 2500, dur: 0.5, vol: 0.18 }); A.pop({ freq: 300 }); } shatter(); }); at(0.56, () => { if (A.ctx) A.tone({ type: 'sine', freq: 400, to: 1200, glide: 0.3, dur: 0.35, vol: 0.08 }); }); at(0.7, () => tada()); say(0.7, 'E03'); }
        if (id === 'anvil') { at(0.04, () => { if (A.ctx) A.tone({ type: 'sine', freq: 1900, to: 500, glide: 1.6, dur: 1.7, vol: 0.06 }); }); say(0.07, 'E05'); at(0.08, () => { if (A.ctx) A.tone({ type: 'triangle', freq: 520, to: 300, glide: 0.12, dur: 0.14, vol: 0.06 }); }); at(0.38, () => { K.sfx.thud(); if (A.ctx) A.thud({ vol: 0.6 }); W.shake = 6; P.emit('dust', anvilGeo().acx, G.floor, 22, { speed: [40, 140] }); }); say(0.39, 'E58'); say(0.55, 'E14'); at(0.62, () => { if (A.ctx) { A.paper({ vol: 0.2, dur: 0.3 }); A.thud({ vol: 0.15 }); } }); at(0.65, () => { if (A.ctx) A.whoosh({ dur: 0.45 }); }); say(0.7, 'E18'); }
        if (id === 'candle') { at(0.05, () => { if (A.ctx) A.noise({ filter: 'bandpass', freq: 3000, q: 0.6, dur: 2.2, attack: 0.3, vol: 0.04 }); }); say(0.2, 'E14'); say(0.5, 'E52'); at(0.64, () => { if (A.ctx) A.chime(A.note('E6'), { vol: 0.1 }); }); say(0.66, 'E21'); }
        if (id === 'socks') { at(0.04, () => { if (A.ctx) A.noise({ filter: 'bandpass', freq: 500, to: 1800, q: 0.7, dur: 2.6, attack: 0.4, vol: 0.12 }); }); say(0.08, 'E15'); at(0.62, () => { if (A.ctx) for (let i = 0; i < 6; i++) A.wood(A.now() + i * 0.07, 0.12, 1 + i * 0.1); }); at(0.74, () => tada()); say(0.74, 'E20'); }
        if (id === 'hat') { at(0.04, () => { if (A.ctx) A.tone({ type: 'sine', freq: 900, to: 300, glide: 0.35, dur: 0.4, vol: 0.06 }); }); say(0.16, 'E30'); at(0.18, () => sadTrombone()); at(0.5, () => { if (A.ctx) A.tone({ type: 'triangle', freq: 300, to: 1200, glide: 0.25, dur: 0.3, vol: 0.1 }); }); at(0.56, () => { tada(); P.emit('confetti', G.cx, G.floor - G.L * 1.3, 70); }); say(0.56, 'E20'); }
        if (id === 'mountain') { at(0.02, () => { if (A.ctx) A.tone({ type: 'triangle', freq: 110, to: 220, glide: 0.6, dur: 0.7, vol: 0.12 }); }); say(0.16, 'E70'); [0.22, 0.33, 0.44].forEach((f, i) => at(f, () => { if (A.ctx) A.wood(undefined, 0.2, 0.8 + i * 0.2); })); at(0.55, () => tada()); say(0.55, 'E20'); at(0.68, () => { if (A.ctx) A.tone({ type: 'square', freq: 600, to: 900, glide: 0.08, dur: 0.12, vol: 0.05, lp: 1800 }); }); say(0.72, 'E18'); }
        if (id === 'balloon' || id === 'gentle') { at(0.02, () => K.sfx.rise()); say(0.2, 'E06'); if (id === 'balloon') { at(0.5, () => { if (A.ctx) { const t = A.now(); A.tone({ when: t, type: 'sawtooth', freq: 260, to: 90, glide: 1.4, dur: 1.5, vol: 0.06, lp: 900 }); A.noise({ when: t, filter: 'bandpass', freq: 400, q: 2, dur: 1.4, vol: 0.06 }); } }); say(0.55, 'E15'); say(0.82, 'E18'); } else say(0.5, 'E02'); }
        if (id === 'reel') { at(0.04, () => { if (A.ctx) A.paper({ vol: 0.12, dur: 0.4 }); }); say(0.16, 'E14'); for (let i = 0; i < 3; i++) at(0.24 + i * 0.13, () => { if (A.ctx) { A.tone({ type: 'sawtooth', freq: 300, to: 1800 + i * 600, glide: 0.35, dur: 0.38, vol: 0.04, lp: 2600 }); for (let j = 0; j < 6; j++) A.wood(A.now() + j * 0.05, 0.05, 1.6); } }); at(0.66, () => { if (A.ctx) for (let j = 0; j < 8; j++) A.paper({ when: A.now() + j * 0.07, vol: 0.06, dur: 0.05 }); }); say(0.72, 'E21'); }
        return new Promise(res => K.later(() => {
          res();
        }, dur * 1000));
      }
      const letters = [];
      function popLetters() {
        const st = SK.st, bx = st.bx || G.cx, by = st.by || G.floor - G.L * 2;
        SK.phrase.split('').forEach((ch) => { if (ch.trim()) letters.push({ ch, x: bx + (Math.random() - 0.5) * 40, y: by + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 360, vy: -120 - Math.random() * 260, r: Math.random() * 6, vr: (Math.random() - 0.5) * 10, a: 1, col: ['#ff9db8', '#ffe08a', '#9fd7ff', '#c8b6ff', '#a8f0c0'][Math.floor(Math.random() * 5)] }); });
        P.emit('confetti', bx, by, 90, { colors: ['#ff5fa2', '#ffd36b', '#3fd0c9', '#8f7bff', '#7be08a'] });
      }
      const shards = [];
      function shatter() {
        const cx = G.cx + LP.dx, cy = G.floor - G.L / 2;
        for (let i = 0; i < 16; i++) { const a = i / 16 * K.TAU + Math.random() * 0.3, sp = 160 + Math.random() * 200; shards.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 140, r: Math.random() * 6, vr: (Math.random() - 0.5) * 12, s: 8 + Math.random() * 12, hx: cx, hy: cy, rest: false }); }
        const words = SK.phrase.split(' ');
        words.forEach((wd, i) => shards.push({ word: wd, x: cx, y: cy, vx: (i - words.length / 2) * 70 + (Math.random() - 0.5) * 40, vy: -200 - Math.random() * 150, r: 0, vr: (Math.random() - 0.5) * 4, s: 0, hx: cx, hy: cy - G.L * 1.2, rest: false }));
      }
      function drawSkit(g, t, dt) {
        const k = cl((performance.now() - SK.t0) / (SK.dur * 1000)); SK.k = k;
        const L = G.L, cx = G.cx, fl = G.floor, st = SK.st, id = SK.id, ph = SK.phrase;
        LP.dx = 0; LP.dy = 0; LP.sx = 1; LP.sy = 1; LP.rot = 0;
        if (id === 'pool') {
          const pin = eo(seg(k, 0, 0.14)), px = cx + (1 - pin) * G.w * 0.6, rx = L * 1.3, ry = L * 0.3, py = fl - 6;
          const flat = 1 - seg(k, 0.6, 0.7), bob = k > 0.14 && k < 0.62;
          g.fillStyle = '#3f8fd6'; g.beginPath(); g.ellipse(px, py, rx, ry, 0, 0, K.TAU); g.fill();
          g.fillStyle = '#9fd7ff'; g.beginPath(); g.ellipse(px, py - 3, rx * 0.86, ry * 0.7, 0, 0, K.TAU); g.fill();
          g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.setLineDash([10, 10]); g.beginPath(); g.ellipse(px, py, rx, ry, 0, 0, K.TAU); g.stroke(); g.setLineDash([]);
          for (let s = 0; s < 3; s++) {
            const wy = py + ry * 0.2 - s * 9 - (bob ? 6 : 0) * flat, off = Math.sin(t * 2.2 + s * 2) * 14 * flat, amp = 7 * flat + 1;
            g.save(); g.beginPath(); g.ellipse(px, py + 6, rx * 1.02, ry * 1.6, 0, 0, K.TAU); g.clip();
            g.fillStyle = ['#2f7dc4', '#4c9ee0', '#7cc0f2'][s]; g.beginPath(); g.moveTo(px - rx - 30, wy + 30);
            for (let x = -rx - 30; x <= rx + 30; x += 12) g.lineTo(px + x + off, wy + (((x / 12) | 0) % 2 ? -amp : amp));
            g.lineTo(px + rx + 30, wy + 30); g.closePath(); g.fill();
            g.font = `700 15px ${FONT}`; g.fillStyle = 'rgba(255,255,255,0.88)'; g.textAlign = 'left'; g.textBaseline = 'middle';
            g.fillText((ph + '  ·  ').repeat(4), px - rx - 20 + off * 1.5 - s * 40, wy + 10);
            g.restore();
          }
          if (bob) { LP.dy = -L * 0.22 + Math.sin(t * 7) * 5; if (Math.random() < 0.15) P.emit('drop', cx + (Math.random() - 0.5) * L, fl - L * 0.1, 2, { angle: -Math.PI / 2, spread: 1.2, speed: [60, 140] }); }
          else if (k >= 0.62) LP.dy = -L * 0.22 * (1 - eo(seg(k, 0.62, 0.7)));
          const fa = eo(seg(k, 0.2, 0.28)) * (1 - seg(k, 0.6, 0.66));
          if (fa > 0.01) [-1, 1].forEach(sd => { g.strokeStyle = '#ff8a3d'; g.lineWidth = L * 0.11 * fa; g.beginPath(); g.ellipse(cx + sd * L * 0.5, fl - L * 0.48 + LP.dy, L * 0.11 * fa, L * 0.15 * fa, 0, 0, K.TAU); g.stroke(); });
          const dk = seg(k, 0.25, 0.9); if (dk > 0 && dk < 1) { const dx2 = px - rx + dk * rx * 2, dy2 = py - 8 + Math.sin(t * 6) * 2; g.fillStyle = '#ffd34d'; g.beginPath(); g.ellipse(dx2, dy2, 10, 7, 0, 0, K.TAU); g.fill(); g.beginPath(); g.arc(dx2 + 6, dy2 - 8, 5.5, 0, K.TAU); g.fill(); g.fillStyle = '#ff8a3d'; g.beginPath(); g.moveTo(dx2 + 11, dy2 - 8); g.lineTo(dx2 + 17, dy2 - 6); g.lineTo(dx2 + 11, dy2 - 5); g.fill(); }
          const sg = eo(seg(k, 0.66, 0.74));
          if (sg > 0) { const sx2 = px + rx * 0.8, sy2 = fl - L * 0.9 * sg; g.fillStyle = '#6b4a2a'; g.fillRect(sx2 - 2, sy2, 4, fl - sy2); g.fillStyle = '#f4e2c0'; g.fillRect(sx2 - 62, sy2 - 26, 124, 30); g.strokeStyle = '#6b4a2a'; g.lineWidth = 2; g.strokeRect(sx2 - 62, sy2 - 26, 124, 30); textBlock(g, 'DEPTH: 3 cm', sx2, sy2 - 11, 120, 16, '#3a2410', 800); }
        } else if (id === 'pop') {
          const grow = k < 0.62 ? eo(seg(k, 0.02, 0.62)) : 0;
          if (k < 0.62) {
            const r = L * (0.3 + 0.95 * grow) + Math.sin(t * 9) * 2 * grow, bx = cx + Math.sin(t * 2.6) * 6, by = fl - L - 26 - r;
            st.bx = bx; st.by = by;
            g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx + L * 0.28, fl - L * 0.8); g.quadraticCurveTo(cx + L * 0.4, by + r + 20, bx, by + r + 6); g.stroke();
            const bg = g.createRadialGradient(bx - r * 0.35, by - r * 0.35, r * 0.1, bx, by, r); bg.addColorStop(0, '#ff8fa3'); bg.addColorStop(0.7, '#e2364f'); bg.addColorStop(1, '#a8182e');
            g.fillStyle = bg; g.beginPath(); g.ellipse(bx, by, r * 0.92, r, 0, 0, K.TAU); g.fill();
            g.fillStyle = '#a8182e'; g.beginPath(); g.moveTo(bx - 6, by + r + 8); g.lineTo(bx, by + r - 2); g.lineTo(bx + 6, by + r + 8); g.fill();
            g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(bx - r * 0.38, by - r * 0.42, r * 0.16, r * 0.26, -0.5, 0, K.TAU); g.fill();
            textBlock(g, ph, bx, by, r * 1.45, Math.max(16, Math.min(28, r * 0.26)), '#fff', 800);
            if (k > 0.45) LP.sy = 1 - Math.sin(t * 30) * 0.02;
          } else { const j = seg(k, 0.62, 0.7); LP.dy = -Math.sin(j * Math.PI) * 26; }
        } else if (id === 'jelly') {
          const rise = eo(seg(k, 0, 0.16)), hgt = L * 0.8 * rise, jx = cx, jw = L * 1.45;
          st.amp = (st.amp || 0) * Math.pow(0.08, dt) + (k > 0.24 && k < 0.56 ? dt * 30 : 0) + (k > 0.58 && k < 0.6 ? 1.5 : 0);
          const wob = Math.sin(t * 15) * Math.min(1, st.amp) * 0.12;
          const top = fl - hgt * (1 + wob), wTop = jw * 0.7 * (1 - wob * 0.6), wBot = jw * (1 + wob * 0.3);
          g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(jx, fl + 1, jw * 0.68 * Math.max(0.2, rise), 7, 0, 0, K.TAU); g.fill();
          if (hgt > 2) {
            const shape = () => { g.beginPath(); g.moveTo(jx - wBot / 2, fl); g.bezierCurveTo(jx - wBot / 2, fl - hgt * 0.45, jx - wTop / 2, top + hgt * 0.4, jx - wTop / 2, top + hgt * 0.16); g.quadraticCurveTo(jx - wTop / 2, top, jx - wTop / 2 + 14, top); g.lineTo(jx + wTop / 2 - 14, top); g.quadraticCurveTo(jx + wTop / 2, top, jx + wTop / 2, top + hgt * 0.16); g.bezierCurveTo(jx + wTop / 2, top + hgt * 0.4, jx + wBot / 2, fl - hgt * 0.45, jx + wBot / 2, fl); g.closePath(); };
            g.save(); shape();
            const jg = g.createLinearGradient(0, top, 0, fl); jg.addColorStop(0, 'rgba(255,122,150,0.95)'); jg.addColorStop(1, 'rgba(196,28,72,0.95)');
            g.fillStyle = jg; g.fill(); g.clip();
            for (let i = -2; i <= 2; i++) { const rx2 = jx + i * wBot * 0.2 + wob * 20, rg = g.createLinearGradient(rx2 - 9, 0, rx2 + 9, 0); rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(0.5, 'rgba(255,220,230,0.22)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(rx2 - 9, top, 18, hgt + 4); }
            g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(jx - wTop * 0.28, top + hgt * 0.22, 6, hgt * 0.16, -0.25, 0, K.TAU); g.fill();
            g.translate(jx, top + hgt * 0.56); g.transform(1, 0, wob * 1.5, 1, 0, 0);
            textBlock(g, ph, 0, 0, wTop * 0.9, Math.max(15, Math.min(19, L * 0.19)), '#fff4f6', 800);
            g.restore();
            if (k < 0.58) { LP.dy = -hgt * (1 + wob) + 3; LP.sx = 1 + wob * 0.6; LP.sy = 1 - wob * 0.6; LP.rot = k > 0.24 ? Math.sin(t * 9) * 6 : 0; }
            g.strokeStyle = '#3f8a4a'; g.lineWidth = 2; g.beginPath(); g.moveTo(jx + wTop * 0.3, top - 10); g.quadraticCurveTo(jx + wTop * 0.36, top - 22, jx + wTop * 0.44, top - 24); g.stroke();
            g.fillStyle = '#e2364f'; g.beginPath(); g.arc(jx + wTop * 0.3, top - 7, 8, 0, K.TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(jx + wTop * 0.3 - 3, top - 10, 2.5, 0, K.TAU); g.fill();
          }
          if (k >= 0.58) { const j = seg(k, 0.58, 0.78); LP.dx = -L * 1.15 * eo(j); LP.dy = -hgt - Math.sin(j * Math.PI) * L * 1.3 * (1 - j * 0.3) + (j >= 1 ? hgt : hgt * j); LP.rot = -360 * eo(j); }
        } else if (id === 'pieces') {
          if (k > 0.15 && k < 0.7) { const j = seg(k, 0.15, 0.2), r2 = seg(k, 0.56, 0.7); LP.sx = LP.sy = Math.max(0.0001, (1 - j) + r2 * 1.06); }
          else if (k >= 0.7) { const j = seg(k, 0.7, 0.8); LP.sx = LP.sy = 1 + Math.sin(j * Math.PI) * 0.12; }
          const back = seg(k, 0.56, 0.7);
          shards.forEach(sh => {
            if (back <= 0) {
              sh.vy += 600 * dt; sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.r += sh.vr * dt;
              if (sh.y > fl - 4) { sh.y = fl - 4; sh.vy *= -0.35; sh.vx *= 0.7; sh.vr *= 0.6; }
              sh.fx = sh.x; sh.fy = sh.y; sh.fr = sh.r;
            } else { const e = ease(back); sh.x = sh.fx + (sh.hx - sh.fx) * e; sh.y = sh.fy + (sh.hy - sh.fy) * e; sh.r = sh.fr * (1 - e); }
            if (sh.word) {
              if (back >= 1 && k > 0.8) return;
              g.save(); g.translate(sh.x, sh.y); g.rotate(sh.r * 0.3); g.font = `800 16px ${FONT}`; const tw = g.measureText(sh.word).width + 14;
              g.fillStyle = '#fffaf0'; g.fillRect(-tw / 2, -13, tw, 26); g.strokeStyle = '#c86fd6'; g.lineWidth = 2; g.strokeRect(-tw / 2, -13, tw, 26);
              g.fillStyle = '#4a1f5a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sh.word, 0, 1); g.restore();
            } else if (back < 1) {
              g.save(); g.translate(sh.x, sh.y); g.rotate(sh.r); g.globalAlpha = (1 - back) * SK.fa;
              g.fillStyle = ['#c86fd6', '#e59cf2', '#8a3fb0', '#ff9ad6'][Math.floor(sh.s) % 4]; g.beginPath(); g.moveTo(-sh.s, -sh.s * 0.4); g.lineTo(sh.s * 0.8, -sh.s * 0.7); g.lineTo(sh.s * 0.4, sh.s * 0.8); g.closePath(); g.fill();
              g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(-sh.s * 0.3, -sh.s * 0.35, sh.s * 0.5, 2); g.restore();
            }
          });
          if (k > 0.98) shards.length = 0;
        } else if (id === 'anvil') {
          // Loopie hears the whistle and side-steps; a "ten ton" anvil lands where the spotlight was,
          // Loopie pokes it, it spins round like the flimsy flat it is: cardboard, 0.2 kg.
          const AG = anvilGeo(), aw = AG.aw, acx = AG.acx, fs = AG.fs, lh = fs * 1.12;
          if (!st.lines) { g.font = `800 ${fs}px ${FONT}`; st.lines = wrapText(g, ph, aw * 0.7).slice(0, 4); }
          const lines = st.lines, baseH = L * 0.34, waistH = L * 0.15, faceH = Math.max(L * 0.34, lines.length * lh + 16), ah = baseH + waistH + faceH;
          const fall = seg(k, 0.02, 0.38), top0 = (G.nails ? G.nails[0].y : G.wallTop + 30) + 3, ay = top0 + (fl - top0) * fall * fall;
          g.fillStyle = `rgba(20,8,12,${fall < 1 ? 0.1 + 0.28 * fall : 0.38})`; g.beginPath(); g.ellipse(acx, fl - 2, aw * (fall < 1 ? 0.18 + 0.34 * fall : 0.54), 4 + 3 * fall, 0, 0, K.TAU); g.fill();
          const wj = seg(k, 0.58, 0.66), wob = Math.sin(wj * Math.PI * 3) * 0.09 * (1 - wj);
          const spin = eo(seg(k, 0.64, 0.8)) * Math.PI * 3, sxA = Math.cos(spin), back = sxA < 0;
          const rock = k > 0.8 ? Math.sin((k - 0.8) * 46) * 0.035 * (1 - seg(k, 0.8, 1)) : 0;
          g.save(); g.beginPath(); g.rect(0, top0, G.w, G.H); g.clip();
          if (fall < 1) { g.strokeStyle = 'rgba(30,20,10,0.75)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(acx, top0); g.lineTo(acx, ay - ah); g.stroke(); }
          g.translate(acx, ay); g.rotate(wob + rock); g.scale(Math.abs(sxA) < 0.04 ? (back ? -0.04 : 0.04) : sxA, 1);
          const fy = -ah + faceH;
          g.beginPath();
          g.moveTo(-aw * 0.62, -ah + 4); g.lineTo(aw * 0.5, -ah); g.lineTo(aw * 0.5, fy); g.lineTo(-aw * 0.18, fy); g.quadraticCurveTo(-aw * 0.42, -ah + faceH * 0.58, -aw * 0.62, -ah + 4); g.closePath();
          g.rect(-aw * 0.19, -baseH - waistH - 1, aw * 0.38, waistH + 2);
          g.moveTo(-aw * 0.34, -baseH); g.lineTo(aw * 0.34, -baseH); g.lineTo(aw * 0.47, 0); g.lineTo(-aw * 0.47, 0); g.closePath();
          if (!back) {
            g.fillStyle = '#454a55'; g.fill();
            g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-aw * 0.6, -ah + 5); g.lineTo(aw * 0.5, -ah + 1); g.stroke();
            g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-aw * 0.18, fy - 5, aw * 0.68, 5);
            g.font = `800 ${fs}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
            const ty0 = -ah + faceH / 2 - (lines.length - 1) * lh / 2, tx = aw * 0.14;
            lines.forEach((ln, i) => { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillText(ln, tx + 1, ty0 + i * lh + 1.5); g.fillStyle = '#f2f4f8'; g.fillText(ln, tx, ty0 + i * lh); });
            g.font = `800 15px ${FONT}`; g.fillStyle = 'rgba(255,255,255,0.42)'; g.fillText('10 TONS', 0, -baseH * 0.46);
          } else {
            g.fillStyle = '#c9a676'; g.fill(); g.strokeStyle = '#8a6a44'; g.lineWidth = 2; g.stroke();
            g.fillStyle = '#8f6b40'; g.fillRect(-aw * 0.04, fy - 2, aw * 0.08, waistH + baseH); g.fillRect(-aw * 0.18, fy - 7, aw * 0.68, 6);
            g.fillStyle = 'rgba(255,240,200,0.5)'; g.fillRect(aw * 0.36, -ah + 6, aw * 0.1, 10); g.fillRect(-aw * 0.44, -10, aw * 0.1, 8);
            g.save(); g.scale(-1, 1);
            const ps = Math.min(30, aw * 0.2), pcx = -aw * 0.16, pcy = -ah + faceH / 2 - 2;
            g.translate(pcx, pcy); g.rotate(-0.09); g.font = `900 ${ps}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
            const pw = g.measureText('PROP').width + 18; g.strokeStyle = '#b2402a'; g.lineWidth = 2.5; g.strokeRect(-pw / 2, -ps * 0.68, pw, ps * 1.36); g.fillStyle = '#b2402a'; g.fillText('PROP', 0, 1);
            g.restore();
            g.font = `800 15px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.save(); g.scale(-1, 1); g.fillStyle = '#6b4a2a'; g.fillText('0.2 kg', 0, -baseH * 0.46); g.restore();
          }
          g.restore();
          LP.dx = -AG.step * eo(seg(k, 0.08, 0.2)) * (1 - ease(seg(k, 0.84, 0.97)));
          if (k > 0.08 && k < 0.2) LP.dy = -Math.sin(seg(k, 0.08, 0.2) * Math.PI) * 12;
          if (fall >= 1 && k < 0.5) LP.dy = -Math.sin(seg(k, 0.38, 0.5) * Math.PI) * 30;
          if (k > 0.52 && k < 0.62) { const pk = Math.sin(seg(k, 0.52, 0.62) * Math.PI); LP.dx += pk * L * 0.16; LP.rot = pk * 14; }
          if (k > 0.84 && k < 0.97) LP.dy = -Math.abs(Math.sin(seg(k, 0.84, 0.97) * Math.PI * 2)) * 8;
        } else if (id === 'candle') {
          const app = eo(seg(k, 0, 0.12)), melt = ease(seg(k, 0.16, 0.6)), ccx = cx + L * 1.15, cw = L * 0.42, ch0 = L * 1.6 * app, ch = Math.max(4, ch0 * (1 - melt));
          const pr = L * 0.15 + melt * L * 0.5;
          g.fillStyle = '#fff2d6'; g.beginPath(); g.ellipse(ccx, fl - 2, pr, pr * 0.22, 0, 0, K.TAU); g.fill();
          if (k < 0.62) {
            const cg = g.createLinearGradient(ccx - cw / 2, 0, ccx + cw / 2, 0); cg.addColorStop(0, '#f3d9b0'); cg.addColorStop(0.5, '#fff6e6'); cg.addColorStop(1, '#e8c894');
            g.fillStyle = cg; g.fillRect(ccx - cw / 2, fl - ch, cw, ch);
            for (let d = 0; d < 3; d++) { const dl = Math.min(ch * 0.5, 10 + melt * 40 * (d + 1) / 3); g.beginPath(); g.ellipse(ccx - cw / 2 + cw * (0.2 + d * 0.3), fl - ch + dl / 2, 4, dl / 2 + 4, 0, 0, K.TAU); g.fill(); }
            g.save(); g.beginPath(); g.rect(ccx - cw / 2, fl - ch, cw, ch); g.clip(); g.translate(ccx, fl - ch0 / 2); g.rotate(-Math.PI / 2);
            g.font = `800 16px ${FONT}`; g.fillStyle = '#b4583a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ph.length > 26 ? ph.slice(0, 25) + '…' : ph, 0, 0); g.restore();
            const fx = ccx, fy = fl - ch - 6, fh = 16 + Math.sin(t * 20) * 2;
            const fg = g.createRadialGradient(fx, fy, 1, fx, fy, 28); fg.addColorStop(0, 'rgba(255,220,120,0.6)'); fg.addColorStop(1, 'rgba(255,160,60,0)'); g.fillStyle = fg; g.fillRect(fx - 28, fy - 28, 56, 56);
            g.fillStyle = '#ffb347'; g.beginPath(); g.moveTo(fx, fy - fh); g.quadraticCurveTo(fx + 8, fy - 2, fx, fy + 4); g.quadraticCurveTo(fx - 8, fy - 2, fx, fy - fh); g.fill();
            g.fillStyle = '#fff3c4'; g.beginPath(); g.ellipse(fx, fy - 2, 2.5, 5, 0, 0, K.TAU); g.fill();
            if (Math.random() < 0.2) P.emit('ember', fx, fy - 8, 1);
          } else {
            const tl = eo(seg(k, 0.62, 0.7)), tx = ccx, ty = fl - 10;
            g.fillStyle = '#c9ced8'; g.fillRect(tx - 14 * tl, ty, 28 * tl, 9);
            const fg = g.createRadialGradient(tx, ty - 8, 1, tx, ty - 8, 40 * tl); fg.addColorStop(0, 'rgba(255,214,130,0.75)'); fg.addColorStop(1, 'rgba(255,170,80,0)'); g.fillStyle = fg; g.fillRect(tx - 40, ty - 48, 80, 80);
            g.fillStyle = '#ffb347'; g.beginPath(); g.moveTo(tx, ty - 16 * tl); g.quadraticCurveTo(tx + 6, ty - 3, tx, ty + 1); g.quadraticCurveTo(tx - 6, ty - 3, tx, ty - 16 * tl); g.fill();
          }
        } else if (id === 'socks') {
          const spin = seg(k, 0.04, 0.6), land = seg(k, 0.6, 0.76);
          const lineY = fl - L * 1.85, lx0 = cx - Math.min(G.stageW * 0.36, L * 1.9), lx1 = cx + Math.min(G.stageW * 0.36, L * 1.9);
          if (land > 0) { g.strokeStyle = '#f4e2c0'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx0, lineY); g.quadraticCurveTo(cx, lineY + 14, lx1, lineY); g.stroke(); g.fillStyle = '#6b4a2a'; g.fillRect(lx0 - 3, lineY - 2, 4, fl - lineY); g.fillRect(lx1 - 1, lineY - 2, 4, fl - lineY); }
          if (spin > 0 && spin < 1) { g.strokeStyle = 'rgba(220,226,240,0.35)'; g.lineWidth = 2; for (let r = 0; r < 7; r++) { const y = fl - r * L * 0.26, rr2 = L * (0.25 + r * 0.14); g.beginPath(); g.ellipse(cx, y - L * 0.1, rr2, rr2 * 0.22, 0, t * 6 + r, t * 6 + r + 4.4); g.stroke(); } LP.rot = Math.sin(t * 14) * 14; LP.dy = -Math.abs(Math.sin(t * 7)) * 8; }
          const cols = ['#ff7a8a', '#ffd36b', '#7fd8ff', '#b79bff', '#a8f0c0'], items = 8, words = ph.split(' ').slice(0, 4);
          if (land >= 1) { g.font = `800 15px ${FONT}`; const lines = wrapText(g, ph, (lx1 - lx0) * 0.5), bw3 = Math.max(...lines.map(l2 => g.measureText(l2).width)) + 18, bh3 = lines.length * 18 + 10, by3 = lineY + 10; g.fillStyle = '#fffaf0'; g.fillRect(cx - bw3 / 2, by3, bw3, bh3); g.strokeStyle = '#c9a77a'; g.lineWidth = 1.5; g.strokeRect(cx - bw3 / 2, by3, bw3, bh3); textBlock(g, ph, cx, by3 + bh3 / 2, bw3 - 10, 15, '#2b2335', 800); g.fillStyle = '#d8c9a8'; g.fillRect(cx - bw3 / 2 + 8, by3 - 5, 5, 10); g.fillRect(cx + bw3 / 2 - 13, by3 - 5, 5, 10); }
          for (let i = 0; i < items + words.length; i++) {
            if (land >= 1 && i >= items) continue;
            const a = t * 5 + i * 0.8, r2 = L * (0.45 + (i % 4) * 0.18), hgt = fl - L * 0.2 - (i / (items + words.length)) * L * 1.5;
            let x = cx + Math.cos(a) * r2, y = hgt + Math.sin(a) * r2 * 0.25, rot = a * 2;
            const pair = Math.floor(i / 2), side = pair < items / 4 ? -1 : 1, slot = i < items ? (side < 0 ? 0.04 + (pair + 0.5) * 0.09 : 0.96 - (items / 2 - pair - 0.5) * 0.09) : 0.5;
            const tx2 = lx0 + (lx1 - lx0) * slot + (i < items ? (i % 2 ? 5 : -5) : 0), ty2 = lineY + 6 + Math.sin(slot * Math.PI) * 10;
            if (land > 0) { const e = eo(land); x = x + (tx2 - x) * e; y = y + (ty2 - y) * e; rot = rot * (1 - e); }
            if (spin <= 0 && land <= 0) continue;
            g.save(); g.translate(x, y); g.rotate(rot);
            if (i < items) { g.fillStyle = cols[pair % cols.length]; g.fillRect(-4, 0, 9, 18); g.beginPath(); g.ellipse(-1, 19, 9, 5, 0, 0, K.TAU); g.fill(); g.fillStyle = '#fff'; g.fillRect(-4, 0, 9, 4); g.fillRect(-4, 8, 9, 2); }
            else { g.font = `800 15px ${FONT}`; const wd = words[i - items], tw = g.measureText(wd).width + 12; g.fillStyle = '#fffaf0'; g.fillRect(-tw / 2, 0, tw, 24); g.fillStyle = '#2b2335'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(wd, 0, 12); }
            if (land >= 1) { g.fillStyle = '#d8c9a8'; g.fillRect(-2, -5, 4, 8); }
            g.restore();
          }
        } else if (id === 'hat') {
          const drop = eo(seg(k, 0.03, 0.16)), flip = seg(k, 0.46, 0.58), hx = cx, hy = fl - L - 2 - (1 - drop) * 200;
          const party = flip > 0.5, sxh = Math.cos(flip * Math.PI * 3);
          g.save(); g.translate(hx, hy); g.scale(Math.abs(sxh) < 0.05 ? 0.05 : sxh, 1);
          const hw = L * 0.5, hh = L * 0.85;
          if (!party) { g.fillStyle = '#e9e2d0'; g.beginPath(); g.moveTo(-hw / 2, 0); g.lineTo(0, -hh); g.lineTo(hw / 2, 0); g.closePath(); g.fill(); g.strokeStyle = '#8a7a60'; g.lineWidth = 1.5; g.stroke(); textBlock(g, 'D', 0, -hh * 0.36, 40, 18, '#3a3530', 800); }
          else { g.save(); g.beginPath(); g.moveTo(-hw / 2, 0); g.lineTo(0, -hh); g.lineTo(hw / 2, 0); g.closePath(); g.clip(); for (let i = -6; i < 8; i++) { g.fillStyle = ['#ff5fa2', '#ffd36b', '#3fd0c9', '#8f7bff'][(i + 8) % 4]; g.beginPath(); g.moveTo(-hw, -i * 12); g.lineTo(hw, -i * 12 - 24); g.lineTo(hw, -i * 12 - 12); g.lineTo(-hw, -i * 12 + 12); g.fill(); } g.restore(); g.fillStyle = '#fff'; [0, 1, 2, 3, 4].forEach(j => { g.beginPath(); g.arc(Math.cos(j * 1.26) * 6, -hh - 2 + Math.sin(j * 1.26) * 6, 4, 0, K.TAU); g.fill(); }); }
          g.restore();
          const bk = eo(seg(k, 0.12, 0.26)) * (1 - seg(k, 0.88, 1));
          if (bk > 0) { const by = fl - L - hh - 34; g.font = `800 16px ${FONT}`; const lines = wrapText(g, ph, Math.min(G.stageW - 80, 260)), bw2 = Math.min(G.stageW - 60, Math.max(...lines.map(l => g.measureText(l).width)) + 28) * bk, bh2 = lines.length * 19 + 14;
            g.fillStyle = party ? '#fff3c4' : '#f4ead8'; g.beginPath(); g.moveTo(hx - bw2 / 2 - 14, by); g.lineTo(hx - bw2 / 2, by - bh2 / 2); g.lineTo(hx + bw2 / 2, by - bh2 / 2); g.lineTo(hx + bw2 / 2 + 14, by); g.lineTo(hx + bw2 / 2, by + bh2 / 2); g.lineTo(hx - bw2 / 2, by + bh2 / 2); g.closePath(); g.fill();
            if (bk > 0.9) textBlock(g, ph, hx, by, bw2 - 10, 16, party ? '#a3401c' : '#4a4038', 800); }
          if (party && k < 0.9 && Math.random() < 0.3) P.emit('confetti', hx + (Math.random() - 0.5) * 60, hy - L * 0.4, 2);
          if (k > 0.58 && k < 0.7) LP.dy = -Math.sin(seg(k, 0.58, 0.7) * Math.PI) * 24;
        } else if (id === 'mountain') {
          const rise = eo(seg(k, 0, 0.14)), shrink = ease(seg(k, 0.66, 0.78)), mx = cx + L * 0.55, mw = L * 2.7, mh = L * 2.1 * rise * (1 - shrink * 0.82);
          g.fillStyle = '#7a6a8a'; g.beginPath(); g.moveTo(mx - mw / 2, fl); g.lineTo(mx - mw * 0.06, fl - mh); g.lineTo(mx + mw * 0.08, fl - mh * 0.94); g.lineTo(mx + mw / 2, fl); g.closePath(); g.fill();
          g.fillStyle = '#5c4f6a'; g.beginPath(); g.moveTo(mx + mw * 0.08, fl - mh * 0.94); g.lineTo(mx + mw / 2, fl); g.lineTo(mx + mw * 0.12, fl); g.closePath(); g.fill();
          if (shrink < 0.5) { g.fillStyle = '#fbfbff'; g.beginPath(); g.moveTo(mx - mw * 0.06 - mw * 0.12, fl - mh * 0.78); g.lineTo(mx - mw * 0.06, fl - mh); g.lineTo(mx + mw * 0.08, fl - mh * 0.94); g.lineTo(mx + mw * 0.15, fl - mh * 0.78); g.lineTo(mx + mw * 0.05, fl - mh * 0.83); g.lineTo(mx - mw * 0.05, fl - mh * 0.76); g.closePath(); g.fill(); }
          else { g.fillStyle = '#8a5a3c'; g.beginPath(); g.ellipse(mx, fl - mh, mw * 0.2, mh * 0.35, 0, Math.PI, 0); g.fill(); }
          if (rise > 0.6 && shrink < 0.4) { const sx2 = mx + mw * 0.24, sy2 = fl - mh * 0.42; g.fillStyle = '#6b4a2a'; g.fillRect(sx2 - 2, sy2, 4, mh * 0.42 - 6); g.font = `800 15px ${FONT}`; const lines = wrapText(g, 'MT. ' + ph.toUpperCase(), Math.min(150, G.stageW * 0.36)), bw2 = Math.max(...lines.map(l => g.measureText(l).width)) + 16, bh2 = lines.length * 18 + 10; g.fillStyle = '#f4e2c0'; g.fillRect(sx2 - bw2 / 2, sy2 - bh2, bw2, bh2); g.strokeStyle = '#6b4a2a'; g.lineWidth = 2; g.strokeRect(sx2 - bw2 / 2, sy2 - bh2, bw2, bh2); textBlock(g, 'MT. ' + ph.toUpperCase(), sx2, sy2 - bh2 / 2, bw2 - 8, 15, '#3a2410', 800); }
          const climb = seg(k, 0.18, 0.5), peakX = mx - mw * 0.06 - cx, peakY = -L * 2.1 * rise;
          if (k < 0.66) { const hop = Math.floor(climb * 3), hk = climb * 3 - hop, fx0 = peakX * hop / 3, fx1 = peakX * Math.min(3, hop + 1) / 3, fy0 = peakY * hop / 3, fy1 = peakY * Math.min(3, hop + 1) / 3; LP.dx = fx0 + (fx1 - fx0) * hk; LP.dy = fy0 + (fy1 - fy0) * hk - Math.sin(hk * Math.PI) * 26 * (climb < 1 ? 1 : 0); }
          else { const sl = ease(seg(k, 0.66, 0.8)); LP.dx = peakX * (1 - sl); LP.dy = peakY * (1 - sl); LP.rot = Math.sin(sl * Math.PI) * -20; }
          if (k > 0.55 && shrink < 0.5) { const fx = mx - mw * 0.06 + 14, fy = fl - mh; g.fillStyle = '#6b4a2a'; g.fillRect(fx, fy - 30, 2.5, 30); g.fillStyle = '#ff5f6d'; g.beginPath(); g.moveTo(fx + 2, fy - 30); g.lineTo(fx + 22 + Math.sin(t * 8) * 2, fy - 24); g.lineTo(fx + 2, fy - 18); g.fill(); }
          if (shrink >= 0.5) { const my = fl - mh - 8 - Math.sin(seg(k, 0.7, 0.8) * Math.PI) * 10; g.fillStyle = '#5a3a2a'; g.beginPath(); g.arc(mx, my, 11, 0, K.TAU); g.fill(); g.fillStyle = '#ff9db8'; g.beginPath(); g.arc(mx, my + 3, 3.5, 0, K.TAU); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(mx - 4, my - 3, 1.6, 0, K.TAU); g.arc(mx + 4, my - 3, 1.6, 0, K.TAU); g.fill(); }
        } else if (id === 'balloon' || id === 'gentle') {
          const form = eo(seg(k, 0, 0.18)), up = ease(seg(k, 0.18, 0.5)), defl = id === 'balloon' ? seg(k, 0.5, 0.82) : 0;
          g.font = `800 17px ${FONT}`; const lines = wrapText(g, ph, Math.min(220, G.stageW * 0.5)), bw2 = Math.max(...lines.map(l => g.measureText(l).width)) + 34, bh2 = lines.length * 20 + 30;
          let bx = cx, by = fl - L - bh2 / 2 - 30 - up * (fl - L - G.wallTop - bh2 * 0.3) * (id === 'gentle' ? 1.1 : 0.7), sc = form;
          if (id === 'gentle') { bx += Math.sin(t * 1.2) * 18 * up; sc = form * (1 - seg(k, 0.6, 0.95)); }
          if (defl > 0) { const e = defl; bx = cx + Math.sin(e * 23) * G.stageW * 0.32 * (1 - e * 0.3); by = by + (fl - 14 - by) * e * e + Math.cos(e * 31) * 30 * (1 - e); sc = 1 - e * 0.78; if (e < 1 && Math.random() < 0.6) P.emit('smoke', bx, by, 1, { speed: [10, 30], size: [3, 6] }); }
          if (sc > 0.03) {
            g.save(); g.translate(bx, by); g.scale(sc * (1 + Math.sin(t * 40) * 0.04 * defl), sc); g.rotate(defl > 0 ? Math.sin(defl * 40) * 0.5 : Math.sin(t * 1.4) * 0.05);
            const bgc = g.createRadialGradient(-bw2 * 0.2, -bh2 * 0.25, 4, 0, 0, bw2 * 0.7); bgc.addColorStop(0, '#ffd1ec'); bgc.addColorStop(1, '#d36fb8');
            g.fillStyle = bgc; g.beginPath(); g.ellipse(0, 0, bw2 / 2 + 6, bh2 / 2 + 6, 0, 0, K.TAU); g.fill();
            g.beginPath(); g.moveTo(-6, bh2 / 2 + 3); g.lineTo(0, bh2 / 2 + 12); g.lineTo(6, bh2 / 2 + 3); g.fill();
            g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, bh2 / 2 + 12); g.quadraticCurveTo(8, bh2 / 2 + 30, -4, bh2 / 2 + 46); g.stroke();
            g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-bw2 * 0.26, -bh2 * 0.2, 7, 12, -0.6, 0, K.TAU); g.fill();
            textBlock(g, ph, 0, 0, bw2 - 20, 17, '#4a1240', 800);
            g.restore();
          }
          if (defl >= 1) { g.fillStyle = '#d36fb8'; g.beginPath(); g.ellipse(bx, fl - 4, 26, 5, 0, 0, K.TAU); g.fill(); }
        } else if (id === 'reel') {
          const inner = G.stageW - G.curtW * 2 - 24, down = eo(seg(k, 0, 0.14)) * (1 - eo(seg(k, 0.74, 0.84)));
          const sw = Math.min(inner, L * 3.3), sh = Math.min(L * 1.5, 150), sx = cx - sw / 2, sy = G.wallTop + (G.phone ? 150 : 176);
          const PH = [[0.14, 'play', 1], [0.24, 'rew', 2], [0.32, 'play', 1], [0.37, 'rew', 4], [0.45, 'play', 1], [0.5, 'rew', 8], [0.58, 'play', 1], [0.64, 'end', 0]];
          let pc = PH[0]; for (const q of PH) if (k >= q[0]) pc = q;
          const prx = cx - Math.min(inner / 2 - 26, L * 1.5), pry = fl - L * 0.62, lensX = prx + 22, lensY = pry - 2;
          if (down > 0.01) {
            g.fillStyle = '#2a2530'; g.fillRect(sx - 10, sy - 12, sw + 20, 12); g.fillStyle = '#4a4458'; g.fillRect(sx - 10, sy - 12, sw + 20, 3);
            g.fillStyle = '#0d0b10'; g.fillRect(sx - 5, sy, sw + 10, sh * down + 5);
            g.fillStyle = '#f7f5ee'; g.fillRect(sx, sy, sw, sh * down);
            if (k > 0.12 && k < 0.74) {
              g.save(); g.globalCompositeOperation = 'lighter';
              const bm = g.createLinearGradient(lensX, lensY, cx, sy + sh / 2); bm.addColorStop(0, 'rgba(255,250,220,0.32)'); bm.addColorStop(1, 'rgba(255,250,220,0.04)');
              g.fillStyle = bm; g.beginPath(); g.moveTo(lensX, lensY - 3); g.lineTo(sx, sy); g.lineTo(sx + sw, sy + sh * down); g.lineTo(lensX, lensY + 3); g.closePath(); g.fill(); g.restore();
            }
            g.save(); g.beginPath(); g.rect(sx, sy, sw, sh * down); g.clip();
            g.fillStyle = '#1c1820'; for (let x = sx + 6; x < sx + sw; x += 16) { g.fillRect(x, sy + 4, 8, 6); g.fillRect(x, sy + sh - 10, 8, 6); }
            const fl2 = 0.82 + 0.18 * Math.sin(t * 53) * Math.sin(t * 17);
            if (pc[1] === 'play') {
              g.globalAlpha = fl2 * SK.fa; textBlock(g, ph, cx, sy + sh / 2 + 2, sw - 40, 18, '#2b2335', 800);
              g.globalAlpha = SK.fa; g.font = `800 13px ${FONT}`; g.fillStyle = '#c8365a'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('▶ REPLAY', sx + 10, sy + 22);
            } else if (pc[1] === 'rew') {
              const off = ((t * 520 * pc[2]) % (sw * 1.5)) - sw * 0.75;
              g.save(); g.translate(cx - off, sy + sh / 2 + 2); g.scale(-1, 1); g.globalAlpha = 0.85 * SK.fa; textBlock(g, ph, 0, 0, sw - 40, 18, '#2b2335', 800); g.restore();
              g.strokeStyle = 'rgba(40,30,50,0.35)'; g.lineWidth = 1; for (let i = 0; i < 6; i++) { const yy = sy + 14 + ((t * 300 + i * 40) % (sh - 20)); g.beginPath(); g.moveTo(sx, yy); g.lineTo(sx + sw, yy); g.stroke(); }
              g.font = `800 13px ${FONT}`; g.fillStyle = '#c8365a'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('◀◀ REWIND ×' + pc[2], sx + 10, sy + 22);
            } else { g.globalAlpha = (0.6 + 0.4 * Math.sin(t * 30)) * SK.fa; textBlock(g, 'THE END', cx, sy + sh / 2, sw, 22, '#2b2335', 800); g.globalAlpha = SK.fa; }
            g.strokeStyle = 'rgba(60,50,40,0.18)'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { const xx = sx + ((t * 97 + i * 131) % sw); g.beginPath(); g.moveTo(xx, sy); g.lineTo(xx + 2, sy + sh); g.stroke(); }
            g.restore();
          }
          if (k < 0.86) {
            const app = eo(seg(k, 0.02, 0.12)), spin = t * (pc[1] === 'rew' ? -12 * pc[2] : 4);
            g.save(); g.globalAlpha = app * SK.fa;
            g.strokeStyle = '#2a2530'; g.lineWidth = 3; g.beginPath(); g.moveTo(prx - 12, fl); g.lineTo(prx, pry + 16); g.lineTo(prx + 12, fl); g.moveTo(prx, pry + 16); g.lineTo(prx, fl); g.stroke();
            g.fillStyle = '#3a3550'; g.beginPath(); g.moveTo(prx - 20, pry - 10); g.lineTo(prx + 16, pry - 10); g.quadraticCurveTo(prx + 20, pry - 10, prx + 20, pry - 6); g.lineTo(prx + 20, pry + 12); g.lineTo(prx - 20, pry + 12); g.closePath(); g.fill();
            [[-10, -24], [12, -24]].forEach(([ox, oy]) => { g.fillStyle = '#2a2530'; g.beginPath(); g.arc(prx + ox, pry + oy, 12, 0, K.TAU); g.fill(); g.strokeStyle = '#8a8498'; g.lineWidth = 2; for (let sp = 0; sp < 3; sp++) { const an = spin + sp * K.TAU / 3; g.beginPath(); g.moveTo(prx + ox, pry + oy); g.lineTo(prx + ox + Math.cos(an) * 9, pry + oy + Math.sin(an) * 9); g.stroke(); } });
            g.fillStyle = '#c9ced8'; g.beginPath(); g.arc(lensX, lensY, 5, 0, K.TAU); g.fill();
            if (k > 0.12 && k < 0.74) { g.fillStyle = 'rgba(255,250,220,0.9)'; g.beginPath(); g.arc(lensX, lensY, 3, 0, K.TAU); g.fill(); }
            g.restore();
          }
        }
      }

      /* ---------------- frames on the wall ---------------- */
      function makeFrame(phrase) {
        const f = h('div', { class: 'lt-frame', role: 'button', tabindex: '0', 'aria-label': 'Framed: I’m having the thought that ' + phrase + '. Tap when it hangs level.' },
          h('div', { class: 'lt-frame-in' }, h('span', { class: 'lt-frame-txt gk-user', text: phrase })));
        el.append(f);
        return { el: f, phrase, ang: 0, swing: false, t0: 0, A0: 16, done: false, x: 0, y: 0 };
      }
      function placeFrame(f, i, instant) {
        const n = G.nails[i]; if (!n) return;
        f.el.style.width = G.frameW + 'px';
        const fw = G.frameW;
        f.x = n.x - fw / 2; f.y = n.y + 16;
        if (instant) { f.el.style.left = f.x + 'px'; f.el.style.top = f.y + 'px'; }
      }

      /* ---------------- flow ---------------- */
      let round = 0, step = 'intro', staged = false, chosenVoices = [], levels = [], skitsDone = [];
      const voiceList = () => care ? ['slow', 'whisper', 'song'] : (visits >= 1 ? ['helium', 'opera', 'sports', 'trailer'] : ['helium', 'opera', 'sports']);
      const ROMAN = ['ACT I', 'ACT II', 'ACT III'];
      let gShown = performance.now();
      S.on('guide', (e) => { if (e && e.visible) gShown = performance.now(); });
      function movingTarget(from, to) {
        return () => { const p = from(), q = to(); if (!p || !q) return null; const ph = ((performance.now() - gShown) % 1900) / 1900; const k = ph < 0.15 ? 0 : ph > 0.72 ? 1 : K.ease.inOutSine((ph - 0.15) / 0.57); return { x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k }; };
      }
      function setTip(t2) { tip.textContent = t2 || ''; }
      function stageStep() {
        step = 'stage'; staged = false;
        act.textContent = ROMAN[round];
        deck.innerHTML = '';
        cards.forEach(c => { if (!c.used) { c.el.classList.remove('lt-gone'); c.el.style.transform = ''; } });
        layoutCards();
        setTip(G.phone ? 'Drag a thought onto the stage' : 'Drag a thought from the wings onto the stage');
        const c = cards.find(x => !x.used);
        K.guide({ id: 'stage-' + round, g: 'drag', d: 0.01, target: movingTarget(() => ({ x: c.x + c.w / 2, y: c.y + c.h / 2 }), () => ({ x: G.spot.x, y: G.spot.y - G.L * 0.4 })), label: 'DRAG IT ONTO THE STAGE', delay: round ? 700 : 1300 });
        W.spotT = 1; W.aud = [6, 10, 14][round] + (inten > 0 ? 2 : 0);
      }
      // dragging a card
      cards.forEach(c => {
        let ox = 0, oy = 0;
        K.drag(c.el, {
          space: el,
          start: (p) => {
            if (step !== 'stage' || c.used) return false;
            ox = p.x - c.x; oy = p.y - c.y;
            c.el.classList.add('lt-drag'); c.el.style.transform = 'scale(1.06) rotate(-2deg)';
            drumRoll(true); K.sfx.tap(); if (A.ctx) A.paper({ vol: 0.12 });
          },
          move: (p) => {
            if (step !== 'stage' || c.used) return;
            const x = p.x - ox, y = p.y - oy;
            c.el.style.left = x + 'px'; c.el.style.top = y + 'px';
            c.el.style.transform = `scale(1.06) rotate(${K.clamp((p.x - c.x - ox) * 0.03, -8, 8)}deg)`;
            W.cardHover = y + c.h / 2 < G.front ? 1 : 0;
          },
          end: (p) => {
            drumRoll(false); c.el.classList.remove('lt-drag'); W.cardHover = 0;
            if (step !== 'stage' || c.used) return;
            if (p.y < G.front - 10) stageCard(c);
            else { c.el.style.transform = ''; c.el.style.left = c.x + 'px'; c.el.style.top = c.y + 'px'; if (A.ctx) A.boing({ freq: 300, vol: 0.06 }); K.guide({ id: 'stage-again-' + round, g: 'drag', d: 0.01, target: movingTarget(() => ({ x: c.x + c.w / 2, y: c.y + c.h / 2 }), () => ({ x: G.spot.x, y: G.spot.y - G.L * 0.4 })), label: 'UP ONTO THE STAGE', delay: 900 }); }
          }
        });
        S.listen(c.el, 'keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && step === 'stage' && !c.used) { e.preventDefault(); A.unlock(); stageCard(c); } });
      });
      async function stageCard(c) {
        if (staged) return;
        staged = true; c.used = true; step = 'skit';
        K.guide(null); setTip('');
        crash();
        P.emit('star', G.spot.x, G.spot.y - G.L * 0.4, 16, { colors: ['#fff3c4', '#ffd36b'] });
        c.el.style.transition = 'left 0.35s ease, top 0.35s ease, opacity 0.35s ease, transform 0.35s ease';
        c.el.style.left = (G.spot.x - c.w / 2) + 'px'; c.el.style.top = (G.spot.y - G.L - c.h) + 'px'; c.el.style.transform = 'scale(0.4)';
        K.later(() => { c.el.classList.add('lt-gone'); c.el.style.transition = ''; }, 360);
        cards.forEach(o => { if (!o.used) o.el.classList.add('lt-gone'); });
        ctx.track('stage', { round: round + 1 });
        const id = skitOf[c.i] || 'balloon';
        if (round === 1 && !care) await seriousTwist(c.p);
        await K.sleep(380);
        W.spotT = 1.25;
        await runSkit(id, c.p);
        SK = null; letters.length = 0; LP.dx = LP.dy = LP.rot = 0; LP.sx = LP.sy = 1;
        skitsDone.push(id);
        rimshot(); laugh(6 + round * 3, 0.03); W.jump = 1; applause(1.2, 0.04);
        loopie.say(line(PUNCH[id] || PUNCH.balloon), { mood: 'E18', ms: 2600 });
        await K.sleep(1500);
        voiceStep(c.p);
      }
      async function seriousTwist(phrase) {
        W.dimT = 0.82; loopie.face('E52', 0);
        if (A.ctx) { const t = A.now(); [65.4, 98, 130.8].forEach((f, i) => A.tone({ when: t + i * 0.05, type: 'triangle', freq: f, dur: 2.2, attack: 0.5, vol: 0.12, lp: 600, verb: 0.6 })); A.noise({ pink: true, filter: 'lowpass', freq: 160, dur: 2, attack: 0.4, vol: 0.18 }); }
        const big = h('div', { class: 'lt-serious gk-user', text: phrase });
        big.style.top = (G.wallTop + (G.floor - G.L - G.wallTop) * 0.5) + 'px';
        el.append(big);
        loopie.say(line({ Jolly: 'Ooh, this one’s taking itself very seriously.', Cheeky: 'Oh no. It brought dramatic lighting.', Unfiltered: 'It’s acting all serious. Watch this.' }), { ms: 2200 });
        await K.sleep(1900);
        sadTrombone();
        big.style.transition = 'transform 0.5s cubic-bezier(.6, -0.4, .7, 1), opacity 0.5s'; big.style.transform = 'translate(-50%, 40%) scale(0.2) rotate(18deg)'; big.style.opacity = '0';
        K.later(() => big.remove(), 600);
        W.dimT = 0; loopie.face('E06', 0);
        loopie.say(line({ Jolly: 'Right. Props!', Cheeky: 'Cue the props department.', Unfiltered: 'Props. Now.' }), { ms: 1400 });
        ctx.track('twist', {});
        await K.sleep(700);
      }
      let voiceEl = null;
      function voiceStep(phrase) {
        step = 'voice';
        loopie.say(line(care ? { Jolly: 'Now say it in a different voice.', Cheeky: 'Try it in another voice.', Unfiltered: 'Pick a voice for it.' } : { Jolly: 'Now say it in a silly voice!', Cheeky: 'Encore! Pick a voice.', Unfiltered: 'Now a voice. Pick one.' }), { mood: 'E03', ms: 2600 });
        setTip('Pick a voice');
        deck.innerHTML = '';
        const list = voiceList(), btns = [];
        list.forEach((id, i) => {
          const V = VOICES[id];
          const b = h('button', { type: 'button', class: 'lt-vbtn' + (id === 'trailer' && visits === 1 ? ' lt-new' : ''), 'aria-label': 'Say it as ' + V.label, html: V.icon + '<span>' + V.label + '</span>', style: { animationDelay: (i * 0.06) + 's' } });
          K.press(b, { down: () => { b.classList.add('lt-on'); pickVoice(id, phrase); }, up: () => b.classList.remove('lt-on') });
          S.listen(b, 'click', () => { if (step === 'voice') pickVoice(id, phrase); });
          deck.append(b); btns.push(b);
        });
        if (!G.phone) deck.style.setProperty('--vw', '150px');
        K.guide({ id: 'voice-' + round, g: 'choose', target: () => btns, label: care ? 'PICK A VOICE' : 'PICK A SILLY VOICE', delay: 1100 });
      }
      async function pickVoice(id, phrase) {
        if (step !== 'voice') return;
        step = 'speak'; K.guide(null); setTip('');
        chosenVoices.push(id);
        const V = VOICES[id];
        Array.from(deck.children).forEach(b => { b.disabled = true; b.style.opacity = b.textContent.includes(V.label) ? '1' : '0.35'; });
        if (A.ctx) A.pop({ freq: 700, vol: 0.1 });
        A.sync('voice', performance.now());
        loopie.face(V.face, 0);
        if (voiceEl) voiceEl.remove();
        voiceEl = h('div', { class: 'lt-voice gk-user lt-v-' + id, 'aria-label': phrase });
        voiceEl.style.top = (G.wallTop + (G.phone ? 168 : 190)) + 'px';
        voiceEl.style.maxWidth = (G.stageW - G.curtW * 2 - 24) + 'px';
        const sp = speak(phrase, V);
        const words = phrase.split(' ');
        const startAt = (wi) => { const s = sp.sched.find(x => x.wi === wi); return s ? s.t : 0; };
        words.forEach((wd, wi) => {
          const span = h('span', { class: 'lt-w' });
          wd.split('').forEach((ch, ci) => span.append(h('span', { class: 'lt-ch', text: ch, style: { animationDelay: (startAt(wi) + ci * 0.03).toFixed(2) + 's' } })));
          voiceEl.append(span); if (wi < words.length - 1) voiceEl.append(document.createTextNode(' '));
        });
        el.append(voiceEl);
        if (V.crowd && A.ctx) { A.noise({ pink: true, filter: 'bandpass', freq: 900, q: 0.5, dur: sp.total + 1.4, attack: 0.5, vol: 0.08 }); K.later(() => { if (A.ctx) A.tone({ type: 'sine', freq: 2600, to: 2400, dur: 0.6, vol: 0.06 }); }, sp.total * 1000 + 200); }
        if (id === 'opera') P.emit('petal', G.cx, G.wallTop + 160, 18, { colors: ['#ffc4d6', '#fff'] });
        W.spotT = id === 'trailer' ? 0.7 : 1.3;
        await K.sleep(sp.total * 1000 + 600);
        laugh(5 + round * 2, care ? 0 : 0.028); W.jump = 1;
        loopie.say(line(V.line), { ms: 2400 });
        await K.sleep(1500);
        voiceEl.style.transition = 'opacity 0.4s ease'; voiceEl.style.opacity = '0';
        frameStep(phrase);
      }
      let frameBtn = null, cur = null;
      function frameStep(phrase) {
        step = 'frame';
        loopie.face('E03', 0);
        loopie.say(line({ Jolly: 'Now frame it: “I’m having the thought that…”', Cheeky: 'Hang it in the gallery. Very fancy.', Unfiltered: 'Frame it. Wall. Done.' }), { ms: 2600 });
        setTip('');
        deck.innerHTML = '';
        frameBtn = h('button', { type: 'button', class: 'lt-big', 'aria-label': 'I’m having the thought that… Frame it.', html: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="5" width="26" height="22" rx="2" fill="#c9922e"/><rect x="7" y="9" width="18" height="14" fill="#fbf6ea"/><path d="M10 15h12M10 19h8" stroke="#6a5a48" stroke-width="2" stroke-linecap="round"/></svg><span>I’m having the thought that…</span>' });
        K.press(frameBtn, { down: () => { frameBtn.classList.add('lt-on'); doFrame(phrase); }, up: () => frameBtn && frameBtn.classList.remove('lt-on') });
        S.listen(frameBtn, 'click', () => doFrame(phrase));
        deck.append(frameBtn);
        K.guide({ id: 'frame-' + round, g: 'tap', target: frameBtn, label: 'TAP TO FRAME IT', delay: 1000 });
      }
      async function doFrame(phrase) {
        if (step !== 'frame') return;
        step = 'framing'; K.guide(null);
        loopie.hush();
        tada();
        const f = makeFrame(phrase); frames.push(f); cur = f;
        gallery.classList.add('lt-on');
        placeFrame(f, round, false);
        const fw = G.frameW, sx = G.cx - fw / 2, sy = G.floor - G.L - 150;
        f.el.style.left = sx + 'px'; f.el.style.top = sy + 'px'; f.el.style.transform = 'scale(0.3)';
        await K.anim(K.reduced() ? 120 : 360, (k) => { f.el.style.transform = `scale(${(0.3 + 0.8 * K.ease.outBack(k)).toFixed(3)})`; });
        f.el.style.transform = 'scale(1.1)';
        await K.sleep(350);
        if (A.ctx) A.whoosh({ dur: 0.45 });
        await K.anim(K.reduced() ? 140 : 620, (k) => { const e = K.ease.inOutCubic(k); f.el.style.left = (sx + (f.x - sx) * e) + 'px'; f.el.style.top = (sy + (f.y - sy) * e - Math.sin(k * Math.PI) * 60) + 'px'; f.el.style.transform = `scale(${(1.1 - 0.1 * e).toFixed(3)})`; });
        if (A.ctx) { A.wood(undefined, 0.3, 0.7); A.thud({ vol: 0.12 }); }
        f.el.style.willChange = 'transform';
        f.swing = true; f.t0 = performance.now(); f.A0 = [12, 15, 17][inten];
        levelStep(f);
      }
      function levelStep(f) {
        step = 'level';
        deck.innerHTML = '';
        const btn = h('button', { type: 'button', class: 'lt-big', 'aria-label': 'Steady the frame', html: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 22h24" stroke="#3a2405" stroke-width="2.5" stroke-linecap="round"/><rect x="9" y="12" width="14" height="8" rx="2" fill="#fbf6ea" stroke="#3a2405" stroke-width="2"/><circle cx="16" cy="16" r="2" fill="#2fb36a"/></svg><span>Steady it… tap when it’s level</span>' });
        K.press(btn, { down: () => { btn.classList.add('lt-on'); hang(f); }, up: () => btn.classList.remove('lt-on') });
        S.listen(btn, 'click', () => hang(f));
        deck.append(btn);
        K.press(f.el, { down: () => hang(f) });
        S.listen(f.el, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hang(f); } });
        setTip('');
        K.guide({ id: 'level-' + round, g: 'tap', target: f.el, label: 'TAP WHEN IT’S LEVEL', delay: 600 });
      }
      function frameAngle(f) { const t = (performance.now() - f.t0) / 1000; const amp = Math.max(2.4, f.A0 * Math.exp(-t / 1.5)); return amp * Math.sin(t * K.TAU / 1.25); }
      async function hang(f) {
        if (step !== 'level' || !f.swing) return;
        step = 'hung'; f.swing = false; K.guide(null);
        const ang = frameAngle(f); f.ang = ang;
        const lev = K.clamp(1 - Math.abs(ang) / f.A0, 0, 1);
        levels.push({ ang: Math.abs(ang), lev });
        await K.anim(K.reduced() ? 80 : 360, (k) => { const a = ang * (1 - 0.5 * K.ease.outCubic(k)) + Math.sin(k * Math.PI * 3) * (1 - k) * 0.8; f.el.style.transform = `rotate(${a.toFixed(2)}deg)`; });
        f.ang = ang * 0.5; f.el.style.transform = `rotate(${f.ang.toFixed(2)}deg)`; f.el.classList.add('lt-hung'); f.el.style.willChange = '';
        f.el.setAttribute('role', 'img'); f.el.setAttribute('tabindex', '-1');
        const straight = Math.abs(ang) <= 1.6;
        if (A.ctx) { A.click({ vol: 0.12 }); if (straight) A.chime(A.note('A6'), { vol: 0.1, dur: 1.4 }); }
        K.pop(straight ? 'Dead level!' : Math.abs(ang) < 5 ? 'Nearly level' : 'Charmingly crooked', { x: K.clamp(f.x + G.frameW / 2, 120, G.w - 120), y: f.y + G.frameW + 30, kind: straight ? 'great' : 'good' });
        loopie.say(line(straight ? { Jolly: 'Dead level. Gallery-worthy.', Cheeky: 'Straighter than my posture.', Unfiltered: 'Level. Nice.' } : { Jolly: 'A little crooked. Charming!', Cheeky: 'Wonky. Very artsy.', Unfiltered: 'Crooked. Fine. It’s art.' }), { mood: straight ? 'E20' : 'E17', ms: 2200 });
        applause(1, 0.04); W.hands = 1;
        ctx.track('frame', { round: round + 1, lev: Math.round(lev * 100) });
        await K.sleep(1500);
        round++;
        if (round >= 3) finale(); else stageStep();
      }

      /* ---------------- frame loop ---------------- */
      let half = 0, accDt = 0, introUp = true, drawn = 0, finTick = 0;
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !BASE) return;
        // quality guard: if frames run slow, draw the stage with fewer pixels (2 -> 1.5 -> 1.25 -> 1)
        if (dt < 0.25) { qual.acc += dt; qual.n++; if (dt > 0.03) qual.slow++; }
        if (qual.n >= 90) { if ((qual.acc / qual.n > 0.022 || qual.slow > 12) && (cv.dpr || 1) > 1.01) { cvOpts.maxDpr = cv.dpr > 1.6 ? 1.5 : cv.dpr > 1.3 ? 1.25 : 1; cv.fit(); } qual.acc = qual.n = qual.slow = 0; }
        const ez = (a, b, r) => a + (b - a) * Math.min(1, dt * r);
        W.curt = ez(W.curt, W.curtT, 3.4); W.spot = ez(W.spot, W.spotT, 3); W.dim = ez(W.dim, W.dimT, 3);
        W.jump = Math.max(0, W.jump - dt * 0.9); W.hands = Math.max(0, W.hands - dt * 0.7); W.shake = (W.shake || 0) * Math.pow(0.002, dt);
        if (cur && cur.swing) cur.el.style.transform = `rotate(${frameAngle(cur).toFixed(2)}deg)`;
        if (!SK && !finaleBow) { LP.dx += (0 - LP.dx) * Math.min(1, dt * 8); LP.dy += (0 - LP.dy) * Math.min(1, dt * 8); LP.rot += (0 - LP.rot) * Math.min(1, dt * 8); LP.sx += (1 - LP.sx) * Math.min(1, dt * 10); LP.sy += (1 - LP.sy) * Math.min(1, dt * 10); }
        applyLP();
        // between scenes only the slow ambience moves (spotlight breathing, audience bob): repaint it every other frame
        const busy = SK || finaleBow || step === 'end' || W.cardHover > 0 || Math.abs(W.curt - W.curtT) > 0.002 || Math.abs(W.spot - W.spotT) > 0.01 || Math.abs(W.dim - W.dimT) > 0.01 || W.shake > 0.3 || W.jump > 0 || W.hands > 0 || letters.length || shards.length || P.list.length;
        accDt += dt;
        // on a slow machine the whole show runs at a steady half rate (the cards, voices and frames are page elements and stay smooth)
        if ((!busy || SOFT || cvOpts.maxDpr < 2) && (half ^= 1)) return;
        // under the title card (a blurred overlay) and behind the results panel the stage holds still: a frozen backdrop
        // lets the browser reuse its blur instead of recomputing it every frame
        if ((introUp && drawn > 1) || (finished && (++finTick & 1))) return;
        draw(g, Math.min(0.1, accDt), t); accDt = 0; drawn++;
      });
      let finaleBow = false;
      function draw(g, dt, t) {
        const w = G.w, H = G.H, L = G.L, beat = beatPos();
        const sx = K.reduced() ? 0 : (Math.random() - 0.5) * W.shake, sy = K.reduced() ? 0 : (Math.random() - 0.5) * W.shake;
        g.save(); g.translate(sx, sy);
        g.drawImage(BASE.c, 0, 0, w, H);
        // spotlight on Loopie, breathing with the beat
        const pulse = 1 + 0.04 * Math.sin(beat * Math.PI), sr = L * 1.5 * W.spot * pulse;
        g.save(); g.globalCompositeOperation = 'lighter';
        const cone = g.createLinearGradient(0, G.val, 0, G.floor);
        cone.addColorStop(0, 'rgba(255,240,200,0.0)'); cone.addColorStop(1, `rgba(255,236,190,${0.16 * W.spot})`);
        g.fillStyle = cone; g.beginPath(); g.moveTo(G.cx - 26, G.val - 4); g.lineTo(G.cx + 26, G.val - 4); g.lineTo(G.cx + sr, G.floor); g.lineTo(G.cx - sr, G.floor); g.closePath(); g.fill();
        const pool = g.createRadialGradient(G.cx, G.floor - 6, 6, G.cx, G.floor - 6, sr * 1.1); pool.addColorStop(0, `rgba(255,240,200,${0.4 * W.spot + 0.25 * W.cardHover})`); pool.addColorStop(1, 'rgba(255,240,200,0)');
        g.fillStyle = pool; g.beginPath(); g.ellipse(G.cx, G.floor - 6, sr * 1.1, sr * 0.3, 0, 0, K.TAU); g.fill();
        g.restore();
        if (SK) { SK.fa = 1 - seg(cl((performance.now() - SK.t0) / (SK.dur * 1000)), 0.93, 1); g.save(); g.globalAlpha = SK.fa; drawSkit(g, t, dt); g.restore(); }
        // letters from a popped balloon
        for (let i = letters.length - 1; i >= 0; i--) { const q = letters[i]; q.vy += 520 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += q.vr * dt; if (q.y > G.floor - 6) { q.y = G.floor - 6; q.vy *= -0.3; q.vx *= 0.6; q.vr *= 0.5; } q.a -= dt * 0.22; if (q.a <= 0) { letters.splice(i, 1); continue; } g.save(); g.globalAlpha = Math.min(1, q.a * 1.5); g.translate(q.x, q.y); g.rotate(q.r); g.font = `800 20px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = q.col; g.fillText(q.ch, 0, 0); g.restore(); }
        // footlights
        G.foot.forEach((x, i) => { g.globalAlpha = 0.55 + 0.25 * Math.sin(beat * Math.PI + i); g.drawImage(FOOT.c, x - 26, G.front - 26, 52, 52); });
        g.globalAlpha = 1; g.fillStyle = '#fff3c4'; g.beginPath(); G.foot.forEach((x) => { g.moveTo(x + 3.2, G.front - 1); g.arc(x, G.front - 1, 3.2, 0, K.TAU); }); g.fill();
        // curtains
        const cw = G.curtW + (G.stageW / 2 + 16 - G.curtW) * W.curt, top = G.val - 30, bot = G.front + 6;
        if (VEL && VEL.pat) {
          [0, 1].forEach(side => {
            g.save();
            const sway = Math.sin(t * 0.8 + side) * 3 * (1 - W.curt * 0.5), x0 = side ? G.stageX + G.stageW : G.stageX, dir = side ? -1 : 1, xIn = x0 + dir * (cw + sway);
            g.beginPath(); g.moveTo(x0, top); g.lineTo(xIn, top);
            g.quadraticCurveTo(xIn + dir * (W.curt > 0.9 ? 0 : 14), top + (bot - top) * 0.62, xIn - dir * (W.curt > 0.9 ? 0 : cw * 0.35), bot); g.lineTo(x0, bot); g.closePath();
            g.fillStyle = VEL.pat; g.fill();
            const sh = g.createLinearGradient(xIn - dir * 30, 0, xIn, 0); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.35)'); g.fillStyle = sh; g.fill();
            if (W.curt < 0.9) { g.fillStyle = '#e8b648'; g.beginPath(); g.ellipse(xIn - dir * cw * 0.12, top + (bot - top) * 0.6, 7, 4, 0, 0, K.TAU); g.fill(); }
            g.restore();
          });
        }
        // dim for the "serious" moment
        if (W.dim > 0.01) { g.fillStyle = `rgba(8,0,6,${W.dim * 0.8})`; g.fillRect(0, 0, w, G.front + 10); const rg = g.createRadialGradient(G.cx, G.wallTop + 140, 10, G.cx, G.wallTop + 140, 220); rg.addColorStop(0, `rgba(255,40,60,${0.3 * W.dim})`); rg.addColorStop(1, 'rgba(255,40,60,0)'); g.fillStyle = rg; g.fillRect(0, 0, w, G.front); }
        // marquee bulbs (finale)
        if (MQ && MQ.on) drawMarquee(g, t);
        // flowers thrown at the curtain call
        for (let i = W.flowers.length - 1; i >= 0; i--) { const f = W.flowers[i], k = Math.min(1, (performance.now() - f.t0) / f.ms); if (k < 0) continue; const x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * f.arc; drawFlower(g, x, y, f.r + k * f.spin, f.c); }
        // audience
        drawAudience(g, t, beat);
        P.update(dt); P.draw(g);
        g.restore();
      }
      function drawFlower(g, x, y, r, c) {
        g.save(); g.translate(x, y); g.rotate(r);
        g.strokeStyle = '#3f8a4a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 22); g.stroke();
        g.fillStyle = '#4fa35a'; g.beginPath(); g.ellipse(5, 13, 5, 2.5, 0.6, 0, K.TAU); g.fill();
        g.fillStyle = c; for (let p = 0; p < 5; p++) { g.rotate(K.TAU / 5); g.beginPath(); g.ellipse(0, -6, 4, 6.5, 0, 0, K.TAU); g.fill(); }
        g.fillStyle = '#ffe48a'; g.beginPath(); g.arc(0, 0, 3.5, 0, K.TAU); g.fill();
        g.restore();
      }
      function drawAudience(g, t, beat) {
        const n = Math.round(W.aud), y0 = G.aud, span = Math.min(G.w - 20, G.stageW + 120), x0 = G.cx - span / 2;
        const jump = W.jump, hands = W.hands;
        for (let row = 1; row >= 0; row--) {
          const m = row ? Math.max(0, n - 6) : Math.min(n, 9), r = (row ? 12 : 16) * (G.phone ? 1 : 1.25), yy = y0 + (row ? -8 : 14);
          for (let i = 0; i < m; i++) {
            const x = x0 + span * (i + 0.5 + (row ? 0.5 : 0)) / (m + (row ? 0.5 : 0)), ph = i * 1.7 + row;
            const bob = Math.abs(Math.sin((beat + ph * 0.1) * Math.PI)) * 3 + jump * Math.abs(Math.sin(t * 14 + ph)) * 10;
            g.fillStyle = row ? '#140a12' : '#0a0509';
            g.beginPath(); g.ellipse(x, yy + r * 1.6, r * 1.45, r * 1.1, 0, Math.PI, 0); g.fill();
            g.beginPath(); g.arc(x, yy - bob, r, 0, K.TAU); g.fill();
            if (hands > 0.05 && (i + row) % 2 === 0) { g.strokeStyle = g.fillStyle; g.lineWidth = 4; g.lineCap = 'round'; const hy = yy - bob - r * 1.4 * hands; g.beginPath(); g.moveTo(x - r * 0.9, yy + r * 0.6); g.lineTo(x - r * 1.2, hy); g.moveTo(x + r * 0.9, yy + r * 0.6); g.lineTo(x + r * 1.2, hy); g.stroke(); }
            g.strokeStyle = row ? 'rgba(255,214,160,0.16)' : 'rgba(255,214,160,0.26)'; g.lineWidth = 2; g.beginPath(); g.arc(x, yy - bob, r - 1, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
          }
        }
      }
      function drawMarquee(g, t) {
        const now = performance.now(), bk = MQ.bt ? eo(cl((now - MQ.bt) / 600)) : 1, B = MQ.box;
        if (bk > 0.01) {
          g.save(); g.globalAlpha = bk;
          g.drawImage(MQ.spr.board, B.x - 4, B.y - 4, B.w + 8, B.h + 8);
          const ph = Math.floor(t * 7), on = MQ.spr.rimOn, off2 = MQ.spr.rimOff;
          MQ.rim.forEach((p, i) => { const d = (i + ph) % 3 === 0 ? on : off2; g.drawImage(d.c, p.x - d.z / 2, p.y - d.z / 2, d.z, d.z); });
          g.restore();
        }
        MQ.items.forEach((b, i) => {
          const k = K.clamp((now - b.t0) / b.ms, 0, 1); if (k <= 0) return;
          const e = K.ease.inOutCubic(k), x = b.x0 + (b.x1 - b.x0) * e, y = b.y0 + (b.y1 - b.y0) * e - Math.sin(k * Math.PI) * 40;
          const sp = k < 1 ? MQ.spr.fly : (((i + Math.floor(t * 8)) % 4) === 0 ? MQ.spr.bright : MQ.spr.dim);
          g.drawImage(sp.c, x - sp.z / 2, y - sp.z / 2, sp.z, sp.z);
        });
      }

      /* ---------------- finale: curtain call ---------------- */
      let finished = false;
      async function finale() {
        step = 'end';
        K.guide(null); deck.innerHTML = ''; setTip('');
        act.textContent = 'CURTAIN CALL';
        loopie.hush();
        // the curtains close on the act...
        W.curtT = 1; if (A.ctx) A.whoosh({ dur: 0.9, vol: 0.16 });
        loopie.el.style.transition = 'opacity 0.35s ease'; loopie.el.style.opacity = '0';
        applause(2.6, 0.05); laugh(8, 0.025);
        await K.sleep(1400);
        // ...and Loopie steps out in front of the curtain for the bow
        W.aud = [14, 16, 18][inten]; W.hands = 1.4; W.jump = 1; W.spotT = 1.4;
        loopie.face('E03', 0); loopie.el.style.opacity = '1';
        finaleBow = true; LP.dy = 12; LP.sx = LP.sy = 0.9;
        await K.anim(K.reduced() ? 100 : 260, (k) => { LP.dy = 12 * (1 - k); LP.sx = LP.sy = 0.9 + 0.1 * K.ease.outBack(k); });
        tada();
        await K.sleep(500);
        await K.anim(K.reduced() ? 120 : 560, (k) => { const e = Math.sin(k * Math.PI); LP.rot = 26 * e; LP.dy = 8 * e; });
        LP.rot = 0; LP.dy = 0; LP.sx = LP.sy = 1;
        applause(2, 0.05); W.hands = 1.5;
        // flowers from the audience
        const fc = { Rose: '#ff5f6d', Tulip: '#ff8fb1', Sunflower: '#ffd34d', Daisy: '#ffffff', Peony: '#ffb3c8', Carnation: '#ff7a9a' }[DAY.flower] || '#ff8fb1';
        for (let i = 0; i < [8, 11, 14][inten]; i++) W.flowers.push({ t0: performance.now() + i * 120, ms: 900 + Math.random() * 400, x0: G.cx + (Math.random() - 0.5) * G.stageW * 0.8, y0: G.aud + 10, x1: G.cx + (Math.random() - 0.5) * G.L * 2.4, y1: G.floor - 6 - Math.random() * 8, arc: 140 + Math.random() * 80, r: Math.random() * 6, spin: 4 + Math.random() * 4, c: i % 3 === 2 ? '#fff6d8' : fc });
        P.emit('petal', G.cx, G.val + 20, 40, { colors: ['#ffc4d6', '#ffd9e6', '#fff', fc] });
        if (A.ctx) for (let i = 0; i < 6; i++) A.pluck(A.note(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'][i]), { when: A.now() + i * 0.08, vol: 0.12 });
        await K.sleep(1200);
        loopie.face('E82', 0);
        await loopie.say(line(care ? { Jolly: 'Three thoughts, three performances. Just words, held gently.', Cheeky: 'Three thoughts, taken a bit less seriously. Bravo.', Unfiltered: 'Three thoughts. Words. That’s all they are.' } : { Jolly: 'Three thoughts, three shows. Just words, after all!', Cheeky: 'Thank you, thank you! Words, everybody. Just words.', Unfiltered: 'Done. They’re words. That’s all.' }), { ms: 2600 });
        await K.sleep(K.reduced() ? 400 : 2200);
        loopie.hush();
        // the curtains open on the encore
        W.curtT = 0; W.spotT = 1; if (A.ctx) A.whoosh({ dur: 0.9, vol: 0.12 });
        await K.sleep(500);
        // the framed thoughts become marquee lights: JUST WORDS
        const src = frames.map(f => K.rectIn(f.el, el));
        const now = performance.now();
        MQ.items = MQ.pts.map((p, i) => { const s = src[i % Math.max(1, src.length)] || { x: G.cx, y: G.wallTop, w: 10, h: 10 }; return { x0: s.x + Math.random() * s.w, y0: s.y + 20 + Math.random() * Math.max(10, s.h - 30), x1: p.x, y1: p.y, t0: now + i * (K.reduced() ? 2 : 14), ms: 700 }; });
        MQ.on = true; MQ.bt = performance.now();
        let ting = 0;
        const tings = K.later(function tk() { if (A.ctx && ting < 24) { A.chime(A.note(['C6', 'D6', 'E6', 'G6', 'A6', 'C7'][ting % 6]), { vol: 0.035, dur: 0.6 }); ting++; K.later(tk, 70); } }, 0);
        void tings;
        await K.sleep(MQ.pts.length * (K.reduced() ? 2 : 14) + 900);
        if (A.ctx) { K.sfx.win(); crash(); }
        P.emit('confetti', G.cx, G.wallTop + 140, 80);
        applause(2.4, 0.05); W.jump = 1; W.hands = 1.6;
        await K.sleep(K.reduced() ? 800 : 2600);
        const mean = levels.reduce((s, x) => s + x.lev, 0) / Math.max(1, levels.length);
        const bestAng = Math.min(...levels.map(x => x.ang));
        const badges = [];
        const pb = K.best('level', Math.round(bestAng * 10) / 10, 'lower');
        if (pb.isNew) badges.push('New best: ' + (Math.round(bestAng * 10) / 10) + '° off level');
        else if (pb.first) badges.push('Straightest frame: ' + (Math.round(bestAng * 10) / 10) + '°');
        const tier = K.tier(mean);
        if (tier) badges.push(tier + ': steady framer');
        let newSkit = null, count = 0;
        skitsDone.forEach(id => { const s = SKITS.find(x => x.id === id); if (!s) return; const r = K.collect(s.name); count = r.items.filter(x => SKITS.some(z => z.name === x)).length; if (r.isNew && !newSkit) newSkit = s.name; });
        if (newSkit) badges.push('Collected: ' + newSkit + ' (' + count + ' of ' + SKITS.length + ')');
        if (visits === 0 && !care) badges.push('Unlocked next time: Movie Trailer voice');
        ctx.track('done', { lev: Math.round(mean * 100), voices: chosenVoices.length });
        finished = true;
        const framed = frames.length ? frames[frames.length - 1].phrase : phrases[0];
        ctx.finish({
          title: 'Just words', mood: 'E82',
          lines: ['3 thoughts performed', 'Framed: I’m having the thought that “' + ctx.TS.words(framed, 6) + '”', 'Voices: ' + chosenVoices.map(v => VOICES[v].label).join(', ')],
          share: '3 thoughts performed. Just words.',
          badges
        });
      }

      /* ---------------- start ---------------- */
      cv.onResize(() => { if (!(BASE && cv.w === G.w && cv.h === G.H)) layout(); half = 1; if (cv.g && BASE) cv.g.drawImage(BASE.c, 0, 0, G.w, G.H); }); // a pixel-ratio change (quality guard) keeps the cached art and just redraws
      S.on('theme', () => { el.classList.toggle('lt-bright', !dark()); paintBase(); });
      (async () => {
        introUp = true;
        await K.intro({ title: 'Literally', sub: 'Tonight’s show stars your thoughts. Loopie takes every word literally.', how: 'Drag a thought onto the stage, pick a silly voice, then frame it.', char: 'loopie', mood: 'E38' });
        introUp = false;
        W.curtT = 0; if (A.ctx) A.whoosh({ dur: 0.8 });
        applause(1.2, 0.04);
        loopie.face('E38', 0);
        loopie.say(line(care ? { Jolly: 'Welcome. Pass me a thought and we’ll look at it as words.', Cheeky: 'Hand me a thought. We’ll treat it gently, word by word.', Unfiltered: 'Give me a thought. We’ll look at the words.' } : { Jolly: 'Welcome to the show! Pass me a thought. I act it out. Literally.', Cheeky: 'Tonight’s script: your thoughts. I take everything literally.', Unfiltered: 'Give me a thought. I’ll perform it. Exactly as written.' }), { ms: 3400 });
        await K.sleep(500);
        stageStep();
      })();

      return {
        debug: () => ({ step, round, skits: skitOf.slice(), levels: levels.slice() }),
        async autoplay() {
          for (let r = 0; r < 3; r++) {
            while (step !== 'stage') { if (finished) return; await K.wait(100); }
            const c = cards.find(x => !x.used);
            const sc = K.scaleOf(el), er = el.getBoundingClientRect(), cr = c.el.getBoundingClientRect();
            const x0 = cr.left + cr.width / 2, y0 = cr.top + cr.height / 2, x1 = er.left + G.spot.x * sc, y1 = er.top + (G.spot.y - G.L * 0.5) * sc, pid = 7000 + r;
            const fire = (type, x, y) => c.el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, pointerId: pid, pointerType: 'touch', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
            fire('pointerdown', x0, y0);
            for (let i = 1; i <= 14; i++) { await K.wait(46); const e = K.ease.inOutSine(i / 14); fire('pointermove', x0 + (x1 - x0) * e, y0 + (y1 - y0) * e); }
            fire('pointerup', x1, y1);
            while (step !== 'voice') await K.wait(100);
            await K.wait(500);
            const vb = Array.from(deck.querySelectorAll('.lt-vbtn'));
            await K.sim.tap(vb[r % vb.length]);
            while (step !== 'frame') await K.wait(100);
            await K.wait(400);
            await K.sim.tap(deck.querySelector('.lt-big'));
            while (step !== 'level') await K.wait(60);
            const t0 = performance.now();
            await K.wait(900);
            while (Math.abs(frameAngle(cur)) > 0.8 && performance.now() - t0 < 5000) await K.wait(8);
            await K.sim.tap(cur.el);
          }
          while (!finished) await K.wait(200);
        }
      };
    }
  });
})(window.TSG_ENV);
