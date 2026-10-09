/* 031 Walk-On Song — Reset · ACT · Performance / Confidence
 * Mechanism: arousal reappraisal (Brooks 2014; Jamieson, Mendes, Blackstock & Schmader 2010): saying "I'm excited"
 * instead of trying to calm down turns pre-performance jitters into usable energy and improves performance. The pounding
 * heart becomes the beat of a walk-on anthem, and each body cue is re-read on a big fader from NERVES to EXCITED while
 * the muffled tunnel sound opens up. Nothing is "fixed" or calmed; the same sensation gets a new name.
 * Verb: hype (stomp on the beat to build the crowd; drag each body cue from NERVES to EXCITED).
 * Twist: the lights cut out right before the walk-on; one held breath, the crowd chants, the lights slam back on.
 * Finale: swipe up and walk out into tonight's venue: lights, pyro flames on the beat, confetti cannons.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  /* Walk-on anthems: three to start, one more each visit (a collection, never random). */
  const ANTHEMS = [
    { id: 'stomp', name: 'THUNDER STOMP', tag: 'stomp · stomp · clap', bpm: 116, chant: ['HEY!', 'HEY!'], col: '#ff5a3c', ink: '#2a0a04' },
    { id: 'neon', name: 'NEON RUSH', tag: 'synth · drive · lights', bpm: 124, chant: ['LET’S', 'GO!'], col: '#ff4fd8', ink: '#2a0628' },
    { id: 'brass', name: 'BRASS PARADE', tag: 'horns · snares · strut', bpm: 120, chant: ['HERE WE', 'GO!'], col: '#ffc531', ink: '#2e2002' },
    { id: 'taiko', name: 'TAIKO STORM', tag: 'drums · thunder · flute', bpm: 112, chant: ['HEY!', 'HO!'], col: '#ff8a3c', ink: '#2e1404' },
    { id: 'disco', name: 'DISCO STRIKE', tag: 'funk · strings · shine', bpm: 122, chant: ['OH', 'YEAH!'], col: '#7fe3ff', ink: '#06222a' },
    { id: 'drumline', name: 'DRUMLINE', tag: 'snares · quads · march', bpm: 126, chant: ['LET’S', 'GO!'], col: '#7be08a', ink: '#082a10' }
  ];
  /* Tonight's venue (one per day): the tunnel's colours, what glows at the end of it, and the finale. */
  const VENUES = {
    stadium: { name: 'the Stadium', tunnel: ['#141a28', '#2a3346'], lit: '#dfeaff', glow: [205, 228, 255], sky: ['#050a1c', '#13254d'], floor: '#1f5a34', accent: '#5ad1ff' },
    club: { name: 'the Club', tunnel: ['#160d22', '#2e1840'], lit: '#ffd0f4', glow: [255, 120, 230], sky: ['#0a0414', '#2a0a3a'], floor: '#1a0f26', accent: '#ff4fd8' },
    hall: { name: 'the School Hall', tunnel: ['#22170f', '#45301c'], lit: '#fff1d6', glow: [255, 214, 150], sky: ['#3a2614', '#7a5530'], floor: '#b07a3e', accent: '#ffb347' },
    roof: { name: 'the Rooftop', tunnel: ['#1a1424', '#3a2a40'], lit: '#ffe2c4', glow: [255, 170, 120], sky: ['#2a1b4a', '#ff8a5c'], floor: '#2a2230', accent: '#ffcf6b' }
  };
  /* Body cues: what the sensation is doing for you, in a line Rush can say. */
  const CUES = {
    heart: { icon: 'heart', line: { Jolly: 'Racing heart? That’s your body pumping extra fuel. Same feeling as excited. Slide it over!', Cheeky: 'Racing heart is a free energy drink. Slide it to EXCITED.', Unfiltered: 'Racing heart is fuel. Slide it to EXCITED.' } },
    stomach: { icon: 'fly', line: { Jolly: 'Butterflies are adrenaline getting you ready, same as before a roller coaster. Slide it!', Cheeky: 'Butterflies = your body’s pre-show hype crew. Slide it.', Unfiltered: 'Butterflies are adrenaline. Ready, not broken. Slide.' } },
    hands: { icon: 'hand', line: { Jolly: 'Shaky hands are extra energy with nowhere to go yet. Point it at the stage. Slide it!', Cheeky: 'Shaky hands? That’s battery, not panic. Slide it over.', Unfiltered: 'Shaky hands: spare energy. Slide it.' } },
    breath: { icon: 'lungs', line: { Jolly: 'Quick breaths are your body grabbing extra oxygen for the big moment. Slide it!', Cheeky: 'Fast breathing: your lungs warming up the engine. Slide.', Unfiltered: 'Quick breaths: oxygen for the moment. Slide.' } },
    chest: { icon: 'bolt', line: { Jolly: 'If it’s nerves, that tightness is your body bracing for the moment. Slide it!', Cheeky: 'Tight and buzzy? That’s your body revving. Slide it over.', Unfiltered: 'If it’s nerves: bracing to go. Slide it.' } },
    generic: { icon: 'bolt', line: { Jolly: 'That buzz is energy looking for a job. Same feeling, new name: excited. Slide it!', Cheeky: 'That buzz? Rename it. Slide it to EXCITED.', Unfiltered: 'Same buzz. New name. Slide.' } }
  };
  const GENERIC_CUES = [{ text: 'RACING HEART', type: 'heart' }, { text: 'BUTTERFLIES', type: 'stomach' }, { text: 'SHAKY HANDS', type: 'hands' }];
  const ICONS = {
    heart: '<path d="M16 27C9 22 4 17.5 4 11.8 4 8.2 6.8 5.5 10.2 5.5c2.3 0 4.4 1.3 5.8 3.3 1.4-2 3.5-3.3 5.8-3.3 3.4 0 6.2 2.7 6.2 6.3C28 17.5 23 22 16 27z"/>',
    fly: '<path d="M16 9v16M16 12c-3-6-11-7-11-1 0 3 3 5 7 5-4 1-6 4-4 6 2 3 6 0 8-4M16 12c3-6 11-7 11-1 0 3-3 5-7 5 4 1 6 4 4 6-2 3-6 0-8-4" fill="none" stroke-width="2.4" stroke-linecap="round"/>',
    hand: '<path d="M9 17V8.5a2 2 0 0 1 4 0V15m0-8a2 2 0 0 1 4 0v8m0-6.5a2 2 0 0 1 4 0V16m0-4a2 2 0 0 1 4 0v7c0 5-3.5 9-8.5 9S9 26 7 22l-2.5-4.5a2 2 0 0 1 3.4-2L9 17" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>',
    lungs: '<path d="M16 5v10m0 0c-1 2-3 3-5 3m5-3c1 2 3 3 5 3M11 9c-4 2-6 7-6 13 0 3 2 4 5 3s4-4 4-9m7-7c4 2 6 7 6 13 0 3-2 4-5 3s-4-4-4-9" fill="none" stroke-width="2.4" stroke-linecap="round"/>',
    bolt: '<path d="M18 3L7 18h8l-2 11 12-16h-8z"/>'
  };

  (env.games = env.games || []).push({
    id: 'walk-on-song', mode: 'reset', name: 'Walk-On Song', verb: 'hype', family: 'ACT', minutes: 2,
    parents: ['Performance / Confidence', 'Getting Started', 'Positive State'],
    cast: ['rush', 'sync', 'patch'], poster: { char: 'rush', mood: 'celebrate' },
    tagline: 'Turn a pounding heart into your walk-on beat. Then walk out.',
    why: 'For nerves before a big moment: call it excitement, ride the beat, walk out.',
    fonts: ['Anton', 'Barlow+Condensed:wght@600;700'],
    css: `
.g-walk-on-song { font-synthesis: none; --wo-disp: "Anton", "Impact", "Haettenschweiler", "Arial Narrow Bold", system-ui, sans-serif; --wo-cond: "Barlow Condensed", "Arial Narrow", "Roboto Condensed", system-ui, sans-serif;
  --wo-acc: #ff5a3c; --wo-accink: #2a0a04; --wo-gold: #ffd36b; --wo-cool: #7fb6ff; }
.g-walk-on-song .wo-hud { position: absolute; z-index: 32; left: 12px; right: 12px; top: calc(env(safe-area-inset-top, 0px) + 62px); display: flex; justify-content: space-between; align-items: center; gap: 10px; pointer-events: none; }
.g-walk-on-song .wo-hype, .g-walk-on-song .wo-combo { display: flex; align-items: center; gap: 9px; padding: 8px 12px; border-radius: 14px; background: rgba(8, 6, 16, 0.62); border: 1px solid rgba(255, 255, 255, 0.14);
  color: #fff; box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3); }
.g-walk-on-song .wo-hype small, .g-walk-on-song .wo-combo small { font: 700 12px/1 var(--wo-cond); letter-spacing: 0.14em; opacity: 0.85; }
.g-walk-on-song .wo-hbar { position: relative; width: 112px; height: 12px; border-radius: 6px; background: rgba(255, 255, 255, 0.12); overflow: hidden; }
.g-walk-on-song .wo-hbar i { position: absolute; left: 0; top: 0; bottom: 0; width: calc(var(--h, 0) * 100%); border-radius: 6px; background: linear-gradient(90deg, var(--wo-cool), var(--wo-gold) 55%, #ff6a3c); transition: width 0.25s ease; }
.g-walk-on-song .wo-hype b, .g-walk-on-song .wo-combo b { font: 900 21px/1 var(--wo-disp); letter-spacing: 0.02em; min-width: 2.3ch; text-align: right; font-variant-numeric: tabular-nums; }
.g-walk-on-song .wo-combo b { color: var(--wo-gold); }
.g-walk-on-song .wo-combo.wo-bump b { animation: wo-bump 0.25s ease-out; }
@keyframes wo-bump { 0% { transform: scale(1.35); } 100% { transform: scale(1); } }
.g-walk-on-song .wo-cards { position: absolute; z-index: 34; display: grid; gap: 10px; }
.g-walk-on-song .wo-card { position: relative; display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-end; gap: 6px; padding: 12px 11px; border: 0; border-radius: 16px; cursor: pointer; text-align: left;
  color: #fff; background: linear-gradient(160deg, color-mix(in srgb, var(--c) 55%, #120a1e), #0c0814 78%); box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--c) 70%, transparent), 0 12px 26px rgba(0, 0, 0, 0.45);
  overflow: hidden; transition: transform 0.15s ease, box-shadow 0.2s ease; -webkit-tap-highlight-color: transparent; }
.g-walk-on-song .wo-card:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.g-walk-on-song .wo-card:active { transform: scale(0.97); }
.g-walk-on-song .wo-card.wo-picked { box-shadow: 0 0 0 3px var(--c), 0 0 28px var(--c), 0 12px 26px rgba(0, 0, 0, 0.45); transform: scale(1.04); }
.g-walk-on-song .wo-card .wo-eq { position: absolute; left: 11px; top: 12px; display: flex; gap: 3px; align-items: flex-end; height: 26px; }
.g-walk-on-song .wo-card .wo-eq i { width: 5px; border-radius: 2px; background: var(--c); transform-origin: 50% 100%; animation: wo-eq 0.9s ease-in-out infinite; }
@keyframes wo-eq { 0%, 100% { transform: scaleY(0.45); } 50% { transform: scaleY(1); } }
.g-walk-on-song .wo-card b { font: 900 19px/1.02 var(--wo-disp); letter-spacing: 0.02em; text-wrap: balance; }
.g-walk-on-song .wo-card span { font: 600 13px/1.15 var(--wo-cond); letter-spacing: 0.04em; opacity: 0.9; }
.g-walk-on-song .wo-card em { position: absolute; right: 9px; top: 11px; font: 700 12px/1 var(--wo-cond); font-style: normal; letter-spacing: 0.1em; padding: 4px 7px; border-radius: 6px; background: var(--c); color: #120a1e; }
.g-walk-on-song .wo-fader { position: absolute; z-index: 34; border-radius: 20px; background: linear-gradient(180deg, rgba(20, 14, 32, 0.92), rgba(10, 8, 18, 0.94)); border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55); touch-action: none; -webkit-tap-highlight-color: transparent; transition: opacity 0.3s ease, transform 0.4s cubic-bezier(.2, 1.2, .4, 1); }
.g-walk-on-song .wo-fader.wo-off { opacity: 0; transform: translateY(24px) scale(0.96); pointer-events: none; }
.g-walk-on-song .wo-fader:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.g-walk-on-song .wo-cue { position: absolute; left: 16px; right: 16px; top: 12px; display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; color: #fff; }
.g-walk-on-song .wo-cue small { font: 700 12px/1 var(--wo-cond); letter-spacing: 0.14em; color: #c9c3e0; text-transform: uppercase; }
.g-walk-on-song .wo-cue .wo-ctext { font: 900 19px/1.1 var(--wo-disp); letter-spacing: 0.03em; color: color-mix(in srgb, var(--wo-cool) calc((1 - var(--v, 0)) * 100%), var(--wo-gold)); }
.g-walk-on-song .wo-track { position: absolute; height: 14px; border-radius: 7px; background: linear-gradient(90deg, #2b3a66, #3a2a40); box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.7); }
.g-walk-on-song .wo-tfill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 7px; width: calc(var(--v, 0) * 100%); background: linear-gradient(90deg, var(--wo-cool), var(--wo-gold) 70%, #ff7a3c); box-shadow: 0 0 14px rgba(255, 190, 90, calc(var(--v, 0) * 0.8)); }
.g-walk-on-song .wo-end { position: absolute; font: 900 15px/1 var(--wo-disp); letter-spacing: 0.08em; pointer-events: none; }
.g-walk-on-song .wo-end.wo-l { color: var(--wo-cool); }
.g-walk-on-song .wo-end.wo-r { color: var(--wo-gold); text-shadow: 0 0 calc(var(--v, 0) * 14px) rgba(255, 200, 90, 0.9); }
.g-walk-on-song .wo-cap { position: absolute; width: 58px; height: 58px; margin: -29px 0 0 -29px; border-radius: 50%; display: grid; place-items: center; pointer-events: none;
  background: radial-gradient(circle at 40% 35%, #ffffff, color-mix(in srgb, var(--wo-cool) calc((1 - var(--v, 0)) * 100%), var(--wo-gold)) 62%, color-mix(in srgb, #20306a calc((1 - var(--v, 0)) * 100%), #a8540c));
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.55), 0 0 calc(8px + var(--v, 0) * 26px) rgba(255, 190, 90, calc(0.25 + var(--v, 0) * 0.6)); }
.g-walk-on-song .wo-cap svg { width: 30px; height: 30px; fill: #1a1030; stroke: #1a1030; }
.g-walk-on-song .wo-pad { position: absolute; z-index: 33; border: 0; padding: 0; border-radius: 50%; cursor: pointer; touch-action: none; -webkit-tap-highlight-color: transparent; color: #1a0c06;
  background: radial-gradient(circle at 50% 36%, #ffffff, color-mix(in srgb, var(--wo-acc) 70%, #ffffff) 34%, var(--wo-acc) 64%, color-mix(in srgb, var(--wo-acc) 55%, #000000));
  box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.12), 0 14px 0 color-mix(in srgb, var(--wo-acc) 40%, #000000), 0 22px 36px rgba(0, 0, 0, 0.55); transition: transform 0.06s ease, box-shadow 0.06s ease, filter 0.3s ease; }
.g-walk-on-song .wo-pad.wo-hit { transform: translateY(8px) scale(0.97, 0.94); box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.2), 0 5px 0 color-mix(in srgb, var(--wo-acc) 40%, #000000), 0 10px 20px rgba(0, 0, 0, 0.5); }
.g-walk-on-song .wo-pad:focus-visible { outline: 3px solid #fff; outline-offset: 6px; }
.g-walk-on-song .wo-pad b { display: block; font: 900 20px/1 var(--wo-disp); letter-spacing: 0.08em; color: var(--wo-accink); }
.g-walk-on-song .wo-pad small { display: block; margin-top: 4px; font: 700 12px/1 var(--wo-cond); letter-spacing: 0.12em; color: var(--wo-accink); opacity: 0.85; }
.g-walk-on-song .wo-pad.wo-rest { filter: saturate(0.4) brightness(0.75); }
.g-walk-on-song .wo-pad.wo-breath { background: radial-gradient(circle at 50% 36%, #ffffff, #cfe3ff 40%, #5a86d8 70%, #22365e); box-shadow: 0 0 0 6px rgba(160, 200, 255, 0.18), 0 14px 0 #1a2a4a, 0 22px 36px rgba(0, 0, 0, 0.55); }
.g-walk-on-song .wo-pad.wo-breath b, .g-walk-on-song .wo-pad.wo-breath small { color: #0c1a33; }
.g-walk-on-song .wo-pad.wo-walk { background: radial-gradient(circle at 50% 36%, #ffffff, #fff1b8 34%, #ffc531 64%, #b0700a); }
.g-walk-on-song .wo-pad.wo-walk b, .g-walk-on-song .wo-pad.wo-walk small { color: #2e1a02; }
.g-walk-on-song .wo-ring { position: absolute; inset: -12px; width: calc(100% + 24px); height: calc(100% + 24px); transform: rotate(-90deg); pointer-events: none; overflow: visible; }
.g-walk-on-song .wo-ring circle { fill: none; stroke: #e8f2ff; stroke-width: 6; stroke-linecap: round; stroke-dasharray: 100; stroke-dashoffset: calc(100 - var(--fill, 0) * 100); filter: drop-shadow(0 0 6px rgba(170, 210, 255, 0.9)); }
.g-walk-on-song .wo-stamp { position: absolute; z-index: 40; left: 0; top: 0; translate: -50% -50%; font: 900 40px/1 var(--wo-disp); letter-spacing: 0.04em; color: var(--wo-gold); white-space: nowrap; pointer-events: none;
  padding: 8px 16px 6px; border: 4px solid var(--wo-gold); border-radius: 12px; background: rgba(30, 14, 4, 0.82); text-shadow: 0 0 16px rgba(255, 200, 90, 0.8); rotate: -7deg; opacity: 0; }
.g-walk-on-song .wo-chant { position: absolute; z-index: 36; left: 0; top: 0; translate: -50% -50%; font: 900 46px/1 var(--wo-disp); letter-spacing: 0.04em; color: #fff; white-space: nowrap; pointer-events: none;
  text-shadow: 0 0 22px rgba(255, 220, 160, 0.9), 0 4px 0 rgba(0, 0, 0, 0.5); opacity: 0; }
.g-walk-on-song .wo-screen { position: absolute; z-index: 21; left: 0; top: 0; translate: -50% -50%; display: flex; flex-direction: column; align-items: center; gap: 4px; pointer-events: none; opacity: 0; transition: opacity 0.6s ease; text-align: center; }
.g-walk-on-song .wo-screen b { font: 900 34px/1 var(--wo-disp); letter-spacing: 0.05em; color: #fff; text-shadow: 0 0 18px var(--wo-acc), 0 0 2px #fff; white-space: nowrap; }
.g-walk-on-song .wo-screen span { font: 700 14px/1 var(--wo-cond); letter-spacing: 0.16em; color: #ffe9b0; white-space: nowrap; }
.g-walk-on-song .wo-screen.wo-on { opacity: 1; }
.g-walk-on-song .wo-c .gk-bubble { max-width: min(262px, calc(100cqw - var(--sz, 64px) - 40px)); }
.g-walk-on-song .gk-pop-text { font-family: var(--wo-disp); font-weight: 900; letter-spacing: 0.06em; }
.g-walk-on-song.wo-bright .wo-hype, .g-walk-on-song.wo-bright .wo-combo { background: rgba(255, 252, 246, 0.9); color: #241a30; border-color: rgba(40, 20, 60, 0.18); }
.g-walk-on-song.wo-bright .wo-combo b { color: #b0600a; }
.g-walk-on-song.wo-bright .wo-hbar { background: rgba(40, 20, 60, 0.14); }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const inten = ctx.intensity, visits = K.visits();
      const line = (o) => ctx.line(o);
      const red = () => K.reduced();
      const CARE = () => an.safety === 'care';
      const vnow = () => A.now() - A.latency();
      const venueId = K.dailyPick(['stadium', 'club', 'hall', 'roof'], 4), VEN = VENUES[venueId];
      const NCUE = [2, 2, 3][inten], NBEATS = [12, 16, 16][inten], EVERY = inten === 0 ? 2 : 1;
      let phase = 'intro', finished = false, AN = ANTHEMS[0];
      const ST = { hype: 0, combo: 0, best: 0, hits: 0, judged: 0, perfect: 0, cuesDone: 0, cues: [], cue: null, v: 0, sec: null, pickAt: 0, lights: 1, walk: 0, stage: 0, breath: 0, chant: 0, finAt: 0, said: {} };

      /* ---------------- body cues: the player's own words from the analysis, else common ones (shown as such) ---------------- */
      function cueType(t) {
        const s = String(t).toLowerCase();
        if (/heart|pulse|pound|racing/.test(s)) return 'heart';
        if (/stomach|butterfl|gut|tummy|nause|churn/.test(s)) return 'stomach';
        if (/hand|shak|trembl|jitter|leg|knee/.test(s)) return 'hands';
        if (/breath|lung|air/.test(s)) return 'breath';
        if (/chest|tight|tense|jaw|shoulder/.test(s)) return 'chest';
        return 'generic';
      }
      function makeCues() {
        const own = CARE() ? [] : (Array.isArray(an.body) ? an.body : []).map(b => String(b || '').trim()).filter(Boolean).slice(0, 2).map(b => ({ text: b.toUpperCase().slice(0, 30), type: cueType(b), own: true }));
        const out = own.slice();
        for (const g of GENERIC_CUES) { if (out.length >= NCUE) break; if (!out.some(c => c.type === g.type)) out.push(Object.assign({ own: false }, g)); }
        while (out.length < NCUE) out.push({ text: 'THE BUZZ', type: 'generic', own: false });
        return out.slice(0, NCUE);
      }
      ctx.analysisReady.then(a => { if (a && typeof a === 'object' && (phase === 'intro' || phase === 'tunnel' || phase === 'pick')) an = a; }).catch(() => {});

      /* ---------------- anthems on offer (a new one unlocked each visit) ---------------- */
      const unlockedN = Math.min(ANTHEMS.length, 3 + visits);
      const fresh = visits >= 1 && visits <= ANTHEMS.length - 3 ? ANTHEMS[2 + visits] : null;
      const offer = (() => {
        const un = ANTHEMS.slice(0, unlockedN);
        if (!visits) return un.slice(0, 3);
        const rest = K.shuffle(un.filter(a => a !== fresh), K.rng(K.daily() + 17));
        return (fresh ? [fresh] : []).concat(rest).slice(0, 3);
      })();

      /* ---------------- scene ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: 1.5 });
      const P = K.particles({ max: 520 });
      const hud = h('div', { class: 'wo-hud', 'aria-hidden': 'true' },
        h('div', { class: 'wo-hype' }, h('small', { text: 'HYPE' }), h('span', { class: 'wo-hbar' }, h('i')), h('b', { text: '0%' })),
        h('div', { class: 'wo-combo' }, h('small', { text: 'COMBO' }), h('b', { text: '×0' })));
      const hypeBar = hud.querySelector('.wo-hbar'), hypeNum = hud.querySelector('.wo-hype b'), comboEl = hud.querySelector('.wo-combo'), comboNum = comboEl.querySelector('b');
      const cards = h('div', { class: 'wo-cards', role: 'group', 'aria-label': 'Pick your walk-on anthem', hidden: true });
      const cardEls = offer.map((a) => {
        const eq = h('span', { class: 'wo-eq', 'aria-hidden': 'true' }, [0.5, 0.9, 0.65, 1, 0.4].map((k, j) => h('i', { style: { height: Math.round(8 + 18 * k) + 'px', animationDelay: (j * 0.08) + 's' } })));
        const b = h('button', { type: 'button', class: 'wo-card', style: { '--c': a.col }, 'aria-label': a.name + ', ' + a.bpm + ' beats per minute' }, eq, a === fresh ? h('em', { text: 'NEW' }) : null, h('b', { text: a.name }), h('span', { text: a.tag + ' · ' + a.bpm }));
        cards.append(b);
        return b;
      });
      const fader = h('div', { class: 'wo-fader wo-off', role: 'slider', tabindex: '-1', 'aria-label': 'Slide this feeling from nerves to excited', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' },
        h('div', { class: 'wo-cue' }, h('small', { class: 'wo-ctag', text: 'Your body' }), h('span', { class: 'gk-user wo-ctext', text: '' })),
        h('div', { class: 'wo-track' }, h('i', { class: 'wo-tfill' })), h('span', { class: 'wo-end wo-l', text: 'NERVES' }), h('span', { class: 'wo-end wo-r', text: 'EXCITED' }),
        h('div', { class: 'wo-cap', html: '<svg viewBox="0 0 32 32" aria-hidden="true">' + ICONS.heart + '</svg>' }));
      const fTrack = fader.querySelector('.wo-track'), fCap = fader.querySelector('.wo-cap'), fTag = fader.querySelector('.wo-ctag'), fText = fader.querySelector('.wo-ctext'), fEndL = fader.querySelector('.wo-l'), fEndR = fader.querySelector('.wo-r');
      const pad = h('button', { type: 'button', class: 'wo-pad wo-rest', 'aria-label': 'Stomp pad: tap on the beat' },
        h('svg', { class: 'wo-ring', viewBox: '0 0 120 120', 'aria-hidden': 'true', html: '<circle cx="60" cy="60" r="56" pathLength="100"/>' }), h('span', null, h('b', { text: 'STOMP' }), h('small', { text: 'ON THE BEAT' })));
      const padB = pad.querySelector('b'), padS = pad.querySelector('small');
      const stamp = h('div', { class: 'wo-stamp', 'aria-hidden': 'true', text: 'I’M EXCITED!' });
      const chant = h('div', { class: 'wo-chant', 'aria-hidden': 'true' });
      const screen = h('div', { class: 'wo-screen', 'aria-hidden': 'true' }, h('b', { text: 'I’M EXCITED' }), h('span', { text: '' }));
      el.append(hud, cards, fader, pad, stamp, chant, screen);
      const rush = K.character('rush', { side: 'right', mood: 'happy', x: 10, y: 160, size: 62 });
      const sync = K.character('sync', { side: 'left', mood: 'happy', x: 300, y: 300, size: 58 });
      const patch = K.character('patch', { side: 'right', mood: 'happy', x: 10, y: 300, size: 58 });
      [rush, sync, patch].forEach((c, i) => c.el.classList.add('wo-c', 'wo-c' + i));
      patch.show(false);
      el.classList.toggle('wo-bright', !K.dark());
      el.style.setProperty('--wo-acc', AN.col); el.style.setProperty('--wo-accink', AN.ink);

      const G = { w: 0, h: 0, phone: true, u: 1 };
      let BG = null, STG = null, SPR = null;

      /* ---------------- layout ---------------- */
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        const phone = w < 700, u = phone ? K.clamp(Math.min(w / 390, H / 844), 0.8, 1.12) : K.clamp(Math.min(w / 1100, H / 860), 0.9, 1.3);
        Object.assign(G, { w, h: H, phone, u });
        if (phone) {
          const k = K.clamp(H / 844, 0.78, 1.05);
          G.ecg = { x: 14, y: 116, w: w - 28, h: 36 };
          G.vp = { x: w / 2, y: Math.round(336 * k) };
          G.op = { w: 150, h: 112 };
          G.pad = { x: w / 2, y: H - 16 - 66 - 6, r: 64 };
          G.fd = { x: 14, y: Math.round(G.pad.y - 66 - 22 - 150), w: w - 28, h: 150 };
          G.cards = { x: 16, y: G.fd.y - 6, w: w - 32, h: 168, cols: 3 };
          rush.el.style.setProperty('--sz', '62px'); rush.side('right'); rush.place(10, Math.round(158 * k));
          sync.el.style.setProperty('--sz', '58px'); sync.side('left'); sync.place(w - 68, G.vp.y - 40);
          patch.el.style.setProperty('--sz', '58px'); patch.side('right'); patch.place(10, G.vp.y - 40);
        } else {
          G.ecg = { x: w / 2 - 300, y: 116, w: 600, h: 40 };
          G.vp = { x: w / 2, y: Math.round(H * 0.4) };
          G.op = { w: Math.round(260 * u), h: Math.round(184 * u) };
          G.pad = { x: w / 2, y: H - 16 - 72 - 10, r: 70 };
          G.fd = { x: w / 2 - 270, y: G.pad.y - 72 - 26 - 150, w: 540, h: 150 };
          G.cards = { x: w / 2 - 330, y: G.fd.y - 20, w: 660, h: 184, cols: 3 };
          const sz = Math.round(96 * u);
          [rush, sync, patch].forEach(c => c.el.style.setProperty('--sz', sz + 'px'));
          rush.side('left'); rush.place(G.vp.x - G.op.w / 2 - 70 - sz, G.vp.y - sz / 2);
          sync.side('right'); sync.place(G.vp.x + G.op.w / 2 + 70, G.vp.y - sz / 2);
          patch.side('right'); patch.place(G.vp.x + G.op.w / 2 + 70, G.vp.y + sz / 2 + 40);
        }
        const o = G.op; G.opr = { x0: G.vp.x - o.w / 2, y0: G.vp.y - o.h / 2, x1: G.vp.x + o.w / 2, y1: G.vp.y + o.h / 2, w: o.w, h: o.h };
        Object.assign(pad.style, { left: (G.pad.x - G.pad.r) + 'px', top: (G.pad.y - G.pad.r) + 'px', width: G.pad.r * 2 + 'px', height: G.pad.r * 2 + 'px' });
        Object.assign(fader.style, { left: G.fd.x + 'px', top: G.fd.y + 'px', width: G.fd.w + 'px', height: G.fd.h + 'px' });
        G.tr = { x: 64, y: 92, w: G.fd.w - 128 };
        Object.assign(fTrack.style, { left: G.tr.x + 'px', top: (G.tr.y - 7) + 'px', width: G.tr.w + 'px' });
        Object.assign(fEndL.style, { left: '16px', top: (G.tr.y + 26) + 'px' });
        Object.assign(fEndR.style, { right: '16px', top: (G.tr.y + 26) + 'px' });
        Object.assign(cards.style, { left: G.cards.x + 'px', top: G.cards.y + 'px', width: G.cards.w + 'px', height: G.cards.h + 'px', gridTemplateColumns: 'repeat(' + G.cards.cols + ', 1fr)' });
        renderFader();
        stamp.style.left = (G.fd.x + G.fd.w / 2) + 'px'; stamp.style.top = (G.fd.y + G.fd.h / 2) + 'px';
        chant.style.left = G.vp.x + 'px'; chant.style.top = (G.vp.y + (G.phone ? 4 : 0)) + 'px';
        screen.style.left = (w / 2) + 'px';
        paintAll();
      }
      S.on('theme', () => { el.classList.toggle('wo-bright', !K.dark()); paintAll(); });

      /* ---------------- painting (cached per layout and theme) ---------------- */
      function off(w, hh) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * cv.dpr)); c.height = Math.max(1, Math.round(hh * cv.dpr)); const g = c.getContext('2d'); g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0); return { c, g, w, h: hh }; }
      function radial(size, stops) { const s = off(size, size), g = s.g, gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); stops.forEach(([o2, c]) => gr.addColorStop(o2, c)); g.fillStyle = gr; g.fillRect(0, 0, size, size); return s.c; }
      const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
      function paintAll() {
        if (!G.w) return;
        const gl = VEN.glow;
        SPR = {
          glow: radial(256, [[0, rgba(gl, 0.95)], [0.3, rgba(gl, 0.45)], [1, rgba(gl, 0)]]),
          warm: radial(128, [[0, 'rgba(255,220,150,0.95)'], [0.4, 'rgba(255,170,80,0.4)'], [1, 'rgba(255,140,60,0)']]),
          acc: radial(128, [[0, K.hexA(AN.col, 0.95)], [0.4, K.hexA(AN.col, 0.35)], [1, K.hexA(AN.col, 0)]]),
          white: radial(64, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]),
          vig: radial(256, [[0, 'rgba(0,0,0,0)'], [0.55, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.85)']]),
          red: radial(256, [[0, 'rgba(255,40,60,0)'], [0.55, 'rgba(255,40,60,0)'], [1, 'rgba(255,40,80,0.6)']]),
          flame: flameSprite()
        };
        BG = off(G.w, G.h);
        paintTunnel(BG.g, K.dark());
        STG = null;
        el.style.backgroundColor = VEN.tunnel[0];
      }
      function flameSprite() {
        const s = off(64, 160), g = s.g;
        const gr = g.createLinearGradient(0, 160, 0, 0);
        gr.addColorStop(0, 'rgba(255,255,220,1)'); gr.addColorStop(0.25, 'rgba(255,200,80,0.95)'); gr.addColorStop(0.6, 'rgba(255,90,30,0.7)'); gr.addColorStop(1, 'rgba(255,40,20,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(32, 0); g.bezierCurveTo(60, 50, 64, 110, 46, 160); g.lineTo(18, 160); g.bezierCurveTo(0, 110, 4, 50, 32, 0); g.fill();
        return s.c;
      }
      function quad(g, a, b, c, d) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); }
      const lerp2 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
      function paintTunnel(g, D) {
        const w = G.w, H = G.h, o = G.opr, T = VEN.tunnel;
        const dim = D ? 1 : 1.35;
        const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const r = Math.min(255, ((n >> 16) & 255) * k), gg = Math.min(255, ((n >> 8) & 255) * k), b = Math.min(255, (n & 255) * k); return 'rgb(' + (r | 0) + ',' + (gg | 0) + ',' + (b | 0) + ')'; };
        g.fillStyle = shade(T[0], dim); g.fillRect(0, 0, w, H);
        const TL = [0, 0], TR = [w, 0], BL = [0, H], BR = [w, H], oTL = [o.x0, o.y0], oTR = [o.x1, o.y0], oBL = [o.x0, o.y1], oBR = [o.x1, o.y1];
        // ceiling, walls, floor (lit towards the stage)
        const face = (pts, c0, c1, ax0, ay0, ax1, ay1) => { const gr = g.createLinearGradient(ax0, ay0, ax1, ay1); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; quad(g, ...pts); g.fill(); };
        face([TL, TR, oTR, oTL], shade(T[0], 0.7 * dim), shade(T[1], 1.1 * dim), 0, 0, 0, o.y0);
        face([TL, oTL, oBL, BL], shade(T[0], 0.9 * dim), shade(T[1], 1.25 * dim), 0, 0, o.x0, 0);
        face([TR, oTR, oBR, BR], shade(T[0], 0.9 * dim), shade(T[1], 1.25 * dim), w, 0, o.x1, 0);
        face([BL, oBL, oBR, BR], shade(T[0], 0.55 * dim), shade(T[1], 0.95 * dim), 0, H, 0, o.y1);
        // depth ribs: door frames receding to the stage
        g.strokeStyle = D ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.14)'; g.lineWidth = 2;
        [0.18, 0.38, 0.56, 0.72, 0.85].forEach(k => { const a = lerp2(TL, oTL, k), b = lerp2(TR, oTR, k), c = lerp2(BR, oBR, k), d = lerp2(BL, oBL, k); quad(g, a, b, c, d); g.stroke(); });
        // ceiling light strips (static part)
        G.strips = [0.2, 0.42, 0.6, 0.76, 0.88].map(k => { const a = lerp2(TL, oTL, k), b = lerp2(TR, oTR, k), a2 = lerp2(TL, oTL, k + 0.05), b2 = lerp2(TR, oTR, k + 0.05); const m = 0.36; return [lerp2(a, b, m), lerp2(a, b, 1 - m), lerp2(a2, b2, 1 - m), lerp2(a2, b2, m)]; });
        G.strips.forEach(q => { g.fillStyle = D ? 'rgba(220,235,255,0.22)' : 'rgba(255,255,255,0.45)'; quad(g, ...q); g.fill(); });
        // flight cases along both walls
        [[0.3, -1], [0.5, 1], [0.66, -1]].forEach(([k, side]) => {
          const base = side < 0 ? lerp2(BL, oBL, k) : lerp2(BR, oBR, k), top = side < 0 ? lerp2(TL, oTL, k) : lerp2(TR, oTR, k);
          const hh = (base[1] - top[1]) * 0.16, ww = hh * 1.5, x = base[0] + (side < 0 ? 4 : -4 - ww), y = base[1] - hh - 2;
          g.fillStyle = D ? '#0c0c12' : '#2a2a34'; g.fillRect(x, y, ww, hh);
          g.strokeStyle = D ? 'rgba(200,200,220,0.35)' : 'rgba(255,255,255,0.5)'; g.lineWidth = 1.5; g.strokeRect(x + 1, y + 1, ww - 2, hh - 2);
          g.fillStyle = 'rgba(200,200,220,0.4)'; [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b]) => g.fillRect(x + a * (ww - 6), y + b * (hh - 6), 6, 6));
        });
        // cable along the floor edge
        g.strokeStyle = D ? '#06060a' : '#1a1a22'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, H * 0.86);
        for (let i = 1; i <= 8; i++) { const k = i / 8, p = lerp2([0, H * 0.86], [o.x0 + 6, o.y1 - 2], k); g.lineTo(p[0] + Math.sin(i * 1.7) * 5, p[1]); } g.stroke();
        // the floor runway: centre lane towards the pad
        const lane = (k) => { const yy = o.y1 + (G.pad.y - o.y1) * k * k; const half = K.lerp(o.w * 0.12, G.pad.r * 1.3, k * k); return [yy, half]; };
        g.fillStyle = D ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)';
        g.beginPath(); { const [y0, h0] = lane(0), [y1, h1] = lane(1.05); g.moveTo(G.vp.x - h0, y0); g.lineTo(G.vp.x + h0, y0); g.lineTo(G.vp.x + h1, y1); g.lineTo(G.vp.x - h1, y1); g.closePath(); } g.fill();
        g.strokeStyle = D ? 'rgba(255,220,120,0.25)' : 'rgba(255,200,80,0.6)'; g.lineWidth = 2; g.setLineDash([10, 12]);
        [-1, 1].forEach(s2 => { g.beginPath(); for (let i = 0; i <= 20; i++) { const [yy, hf] = lane(i / 20 * 1.05); const x = G.vp.x + s2 * hf; if (i) g.lineTo(x, yy); else g.moveTo(x, yy); } g.stroke(); });
        g.setLineDash([]);
        // light spilling in from the stage
        g.save(); g.globalCompositeOperation = D ? 'lighter' : 'source-over'; g.globalAlpha = D ? 0.5 : 0.35;
        const R = Math.max(o.w, o.h) * 2.4; g.drawImage(SPR.glow, G.vp.x - R, G.vp.y - R * 0.8, R * 2, R * 1.9); g.restore();
        // the opening itself: tonight's venue glimpse (static backdrop; the crowd bobs live)
        const og = g.createLinearGradient(0, o.y0, 0, o.y1);
        og.addColorStop(0, VEN.sky[1]); og.addColorStop(0.55, VEN.lit); og.addColorStop(1, VEN.sky[0]);
        g.fillStyle = og; g.fillRect(o.x0, o.y0, o.w, o.h);
        g.strokeStyle = D ? '#05050a' : '#2a2430'; g.lineWidth = 5; g.strokeRect(o.x0 - 2, o.y0 - 2, o.w + 4, o.h + 4);
      }

      /* ---------------- audio: our own instruments into a "tunnel wall" filter that opens as nerves become excitement ---------------- */
      let MUS = null, MLP = null, MG = null, CRW = null, NB = null, crowdBed = null;
      const synthNodes = [];
      function audioInit() {
        if (!A.ctx) return false;
        if (MUS) return true;
        const c = A.ctx;
        try {
          MUS = c.createGain(); MLP = c.createBiquadFilter(); MLP.type = 'lowpass'; MLP.frequency.value = 360; MLP.Q.value = 0.8; MG = c.createGain(); MG.gain.value = 1;
          CRW = c.createGain(); CRW.gain.value = 1;
          MUS.connect(MLP); CRW.connect(MLP); MLP.connect(MG); MG.connect(A.bus('music'));
          [MUS, MLP, MG, CRW].forEach(n => synthNodes.push(n));
          NB = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = NB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
          crowdBed = A.loop({ pink: true, filter: 'bandpass', freq: 650, q: 0.45, bus: 'amb' });
          if (crowdBed) crowdBed.level(0.08, 1.5);
        } catch (e) { console.error(e); MUS = null; return false; }
        return true;
      }
      S.on('audio-ready', () => { audioInit(); });
      S.onDestroy(() => { try { if (crowdBed) crowdBed.stop(); } catch (e) { /* gone */ } synthNodes.forEach(n => { try { n.disconnect(); } catch (e) { /* gone */ } }); });
      function muffle(f, tc) { if (MLP && A.ctx) MLP.frequency.setTargetAtTime(K.clamp(f, 120, 18000), A.ctx.currentTime, tc || 0.2); }
      function tone(o) {
        const c = A.ctx; if (!c || !MUS) return;
        const os = c.createOscillator(); os.type = o.type || 'sine';
        os.frequency.setValueAtTime(o.f, o.t); if (o.to) os.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), o.t + (o.glide || o.dur));
        if (o.det) os.detune.value = o.det;
        const g = c.createGain(), att = o.att || 0.004;
        g.gain.setValueAtTime(0.0001, o.t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.vol), o.t + att);
        if (o.hold) g.gain.setValueAtTime(o.vol, o.t + o.hold);
        g.gain.exponentialRampToValueAtTime(0.0001, o.t + o.dur);
        let n = os;
        if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, o.t); if (o.lpTo) f.frequency.exponentialRampToValueAtTime(o.lpTo, o.t + (o.lpT || o.dur)); f.Q.value = o.q || 0.7; os.connect(f); n = f; }
        if (o.vib) { const l = c.createOscillator(); l.frequency.value = o.vib; const lg = c.createGain(); lg.gain.value = o.vibC || 18; l.connect(lg); lg.connect(os.detune); l.start(o.t); l.stop(o.t + o.dur + 0.05); }
        n.connect(g); g.connect(o.dest || MUS);
        os.start(o.t); os.stop(o.t + o.dur + 0.05); os.onended = () => { try { g.disconnect(); } catch (e) { /* gone */ } };
      }
      function nz(o) {
        const c = A.ctx; if (!c || !NB) return;
        const s = c.createBufferSource(); s.buffer = NB; s.loop = true;
        const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f || 1000, o.t); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, o.t + o.dur); f.Q.value = o.q || 0.8;
        const g = c.createGain(), att = o.att || 0.003;
        g.gain.setValueAtTime(0.0001, o.t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.vol), o.t + att); g.gain.exponentialRampToValueAtTime(0.0001, o.t + o.dur);
        s.connect(f); f.connect(g); g.connect(o.dest === 'sfx' ? A.bus('sfx') : (o.dest || MUS));
        s.start(o.t, Math.random() * 0.5); s.stop(o.t + o.dur + 0.05); s.onended = () => { try { g.disconnect(); } catch (e) { /* gone */ } };
      }
      const N = (n) => A.note(n);
      /* drum kit */
      const kick = (t, v) => { tone({ t, f: 150, to: 44, glide: 0.11, dur: 0.36, vol: v }); nz({ t, dur: 0.014, f: 3200, q: 0.8, vol: v * 0.28 }); };
      const snare = (t, v) => { nz({ t, dur: 0.17, f: 1900, q: 0.7, vol: v * 0.7 }); tone({ t, type: 'triangle', f: 210, to: 150, dur: 0.09, vol: v * 0.32 }); };
      const clap = (t, v) => { for (let k = 0; k < 3; k++) nz({ t: t + k * 0.011, dur: 0.022, f: 1250, q: 1.2, vol: v * 0.55 }); nz({ t: t + 0.03, dur: 0.15, f: 1150, q: 0.9, vol: v * 0.35 }); };
      const hat = (t, v, open) => nz({ t, dur: open ? 0.2 : 0.045, f: 8500, type: 'highpass', vol: v });
      const tom = (t, f, v) => { tone({ t, f, to: f * 0.55, glide: 0.25, dur: 0.5, vol: v }); nz({ t, dur: 0.06, f: 600, type: 'lowpass', vol: v * 0.4 }); };
      const bass = (t, f, dur, v, lp) => { tone({ t, type: 'sawtooth', f, dur, vol: v, lp: lp || 600, q: 1.2, att: 0.006 }); tone({ t, f: f / 2, dur, vol: v * 0.6, att: 0.006 }); };
      const stab = (t, notes, dur, v, type, lp) => notes.forEach((n, i) => tone({ t, type: type || 'sawtooth', f: N(n), det: (i % 2 ? 7 : -7), dur, vol: v / Math.sqrt(notes.length), lp: lp || 1800, att: 0.008 }));
      const brass = (t, notes, dur, v) => notes.forEach((n, i) => tone({ t, type: 'sawtooth', f: N(n), det: i % 2 ? 5 : -5, dur, vol: v / Math.sqrt(notes.length), lp: 500, lpTo: 2600, lpT: 0.06, att: 0.03, hold: dur * 0.6 }));
      const lead = (t, n, dur, v, type) => tone({ t, type: type || 'square', f: N(n), dur, vol: v, lp: 2600, att: 0.01, hold: dur * 0.5, vib: 5.5, vibC: 12 });
      /* the crowd: a chorus of formant voices shouting through the walls */
      const VOW = { e: [530, 1840], o: [570, 840], a: [760, 1200], u: [330, 880], ei: [480, 2000] };
      function shout(t, vow, dur, v, vow2) {
        const c = A.ctx; if (!c || !CRW) return;
        const F = VOW[vow] || VOW.e, F2 = vow2 ? VOW[vow2] : null;
        const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.setValueAtTime(F[0], t); f1.Q.value = 4;
        const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.setValueAtTime(F[1], t); f2.Q.value = 6;
        if (F2) { f1.frequency.setTargetAtTime(F2[0], t + dur * 0.4, dur * 0.15); f2.frequency.setTargetAtTime(F2[1], t + dur * 0.4, dur * 0.15); }
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.03); g.gain.setValueAtTime(v * 0.85, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        f1.connect(g); f2.connect(g); g.connect(CRW);
        for (let i = 0; i < 7; i++) {
          const os = c.createOscillator(); os.type = 'sawtooth';
          const base = i < 4 ? 125 + i * 17 : 215 + i * 13, jt = Math.random() * 0.025;
          os.frequency.setValueAtTime(base * 0.97, t + jt); os.frequency.linearRampToValueAtTime(base * 1.04, t + dur * 0.3); os.frequency.linearRampToValueAtTime(base * 0.92, t + dur);
          os.connect(f1); os.connect(f2); os.start(t + jt); os.stop(t + dur + 0.05);
          os.onended = () => { try { os.disconnect(); } catch (e) { /* gone */ } };
        }
        nz({ t, dur, f: F[1], q: 1.2, vol: v * 0.5, dest: CRW, att: 0.02 });
        S.later(() => { try { g.disconnect(); f1.disconnect(); f2.disconnect(); } catch (e) { /* gone */ } }, (t - A.now() + dur + 0.3) * 1000);
      }
      const crowdClap = (t, v) => { for (let i = 0; i < 6; i++) nz({ t: t + Math.random() * 0.03, dur: 0.03, f: 1100 + Math.random() * 900, q: 1.4, vol: v * (0.5 + Math.random() * 0.5), dest: CRW }); };
      const roar = (t, dur, v) => nz({ t, dur, f: 700, to: 1100, q: 0.45, vol: v, att: dur * 0.3, dest: CRW });
      /* the heartbeat lives inside you: never muffled */
      function heartbeat(t, v) {
        if (!A.ctx || v < 0.01) return;
        const bl = 60 / AN.bpm;
        A.tone({ when: t, type: 'sine', freq: 64, to: 46, glide: 0.12, dur: 0.18, vol: 0.34 * v, attack: 0.006 });
        A.noise({ when: t, filter: 'lowpass', freq: 140, dur: 0.1, vol: 0.12 * v });
        A.tone({ when: t + bl * 0.36, type: 'sine', freq: 56, to: 42, glide: 0.1, dur: 0.15, vol: 0.22 * v, attack: 0.006 });
      }
      /* the stomp pad is you: never muffled either */
      function stompSound(grade) {
        if (!A.ctx) return;
        const t = A.now(), big = grade === 'perfect' || grade === 'good';
        A.tone({ when: t, type: 'sine', freq: 125, to: 42, glide: 0.12, dur: 0.32, vol: big ? 0.48 : 0.34, attack: 0.002 });
        A.noise({ when: t, filter: 'lowpass', freq: 700, dur: 0.12, vol: big ? 0.2 : 0.13 });
        if (grade === 'perfect') A.noise({ when: t, filter: 'bandpass', freq: 2200, q: 1, dur: 0.07, vol: 0.12 });
        A.sync('stomp', performance.now());
      }

      /* ---------------- anthem patterns (one beat at a time, four sixteenths) ---------------- */
      const L = { heart: 1, chords: 0, kick: 0, drums: 0, bass: 0, lead: 0, crowd: 0 };
      const PROG = {
        stomp: [['E3', 'B3', 'E4'], ['C3', 'G3', 'C4'], ['G2', 'D3', 'G3'], ['D3', 'A3', 'D4']],
        neon: [['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['C4', 'E4', 'G4'], ['G3', 'B3', 'D4']],
        brass: [['A#3', 'D4', 'F4'], ['D#4', 'G4', 'A#4'], ['F4', 'A4', 'C5'], ['A#3', 'D4', 'F4']],
        taiko: [['D3', 'A3', 'D4'], ['D3', 'A3', 'D4'], ['C3', 'G3', 'C4'], ['D3', 'A3', 'D4']],
        disco: [['A3', 'C4', 'E4', 'G4'], ['D3', 'F3', 'A3', 'C4'], ['G3', 'B3', 'D4', 'F4'], ['C3', 'E3', 'G3', 'B3']],
        drumline: [['A#2', 'F3'], ['A#2', 'F3'], ['G#2', 'D#3'], ['A#2', 'F3']]
      };
      const BASSN = { stomp: ['E2', 'C2', 'G1', 'D2'], neon: ['A1', 'F1', 'C2', 'G1'], brass: ['A#1', 'D#2', 'F2', 'A#1'], taiko: ['D2', 'D2', 'C2', 'D2'], disco: ['A1', 'D2', 'G1', 'C2'], drumline: ['A#1', 'A#1', 'G#1', 'A#1'] };
      const HOOK = { stomp: ['E4', 'G4', 'A4', 'B4', 'A4', 'G4', 'E4', 'D4'], neon: ['A4', 'C5', 'E5', 'A5', 'G5', 'E5', 'C5', 'E5'], brass: ['F4', 'A#4', 'D5', 'F5', 'D5', 'C5', 'A#4', 'C5'], taiko: ['D5', 'F5', 'G5', 'A5', 'C6', 'A5', 'G5', 'F5'], disco: ['E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5', 'D5'], drumline: ['F4', 'F4', 'A#4', 'C5', 'D5', 'C5', 'A#4', 'F4'] };
      function anthemBeat(t, i) {
        const id = AN.id, bl = 60 / AN.bpm, sb = bl / 4, bib = i % 4, bar = Math.floor(i / 4), ch = PROG[id][bar % 4], bn = N(BASSN[id][bar % 4]);
        const kv = 0.5 * Math.max(L.kick, L.drums), dv = L.drums;
        // drums
        if (id === 'stomp') { if (kv) { kick(t, kv); if (bib === 0 || bib === 2) kick(t + 2 * sb, kv * 0.9); } if (dv && (bib === 1 || bib === 3)) clap(t, 0.42 * dv); if (dv) hat(t + 2 * sb, 0.05 * dv); }
        else if (id === 'neon' || id === 'disco') { if (kv) kick(t, kv); if (dv) { if (bib === 1 || bib === 3) snare(t, 0.36 * dv); hat(t + 2 * sb, (id === 'disco' ? 0.09 : 0.06) * dv, id === 'disco'); hat(t + sb, 0.03 * dv); hat(t + 3 * sb, 0.03 * dv); } }
        else if (id === 'brass' || id === 'drumline') { if (kv && (bib === 0 || bib === 2)) kick(t, kv); if (dv) { if (bib === 1 || bib === 3) snare(t, 0.4 * dv); for (let k = 1; k < 4; k++) nz({ t: t + k * sb, dur: 0.06, f: 2400, q: 0.8, vol: (id === 'drumline' ? 0.13 : 0.07) * dv * (k === 2 ? 1.3 : 0.8) }); if (id === 'drumline' && bib === 3) [180, 150, 120].forEach((f, k) => tom(t + (k + 1) * sb * 0.66, f, 0.18 * dv)); } }
        else if (id === 'taiko') { if (kv && (bib === 0 || bib === 2)) tom(t, 82, 0.55 * Math.max(L.kick, L.drums)); if (dv) { if (bib === 1) tom(t + 2 * sb, 110, 0.3 * dv); if (bib === 3) { tom(t, 120, 0.3 * dv); tom(t + 2 * sb, 120, 0.25 * dv); } nz({ t: t + 2 * sb, dur: 0.02, f: 3000, q: 2, vol: 0.06 * dv }); } }
        // chords (muffled from the start: the anthem's identity behind the wall)
        if (L.chords && bib === 0) {
          if (id === 'brass') brass(t, ch, bl * 0.9, 0.12 * L.chords);
          else if (id === 'stomp') stab(t, ch, bl * 3.6, 0.13 * L.chords, 'sawtooth', 1500);
          else stab(t, ch, bl * 3.8, 0.1 * L.chords, id === 'neon' ? 'sawtooth' : 'triangle', 1600);
        }
        if (L.chords && id === 'brass' && bib === 2) brass(t + sb * 2, ch, bl * 0.5, 0.1 * L.chords);
        if (L.chords && id === 'disco' && (bib === 1 || bib === 3)) stab(t + 2 * sb, ch, 0.12, 0.06 * L.chords, 'square', 2600);
        // bass
        if (L.bass) {
          const bv = 0.2 * L.bass;
          if (id === 'neon') for (let k = 0; k < 4; k++) bass(t + k * sb, bn * (k % 2 ? 2 : 1), sb * 0.9, bv * 0.8, 700);
          else if (id === 'disco') { bass(t, bn, sb * 1.6, bv, 900); bass(t + 2 * sb, bn * 2, sb * 1.2, bv * 0.8, 900); }
          else if (id === 'brass' || id === 'drumline') { if (bib === 0 || bib === 2) bass(t, bib === 0 ? bn : bn * 1.5, bl * 0.8, bv, 520); }
          else if (id === 'taiko') { if (bib === 0) tone({ t, type: 'sine', f: bn, dur: bl * 3.6, vol: bv * 1.2, att: 0.05 }); }
          else { bass(t, bn, sb * 1.8, bv, 650); bass(t + 2 * sb, bn, sb * 1.8, bv * 0.9, 650); }
        }
        // the hook
        if (L.lead) {
          const hk = HOOK[id], n1 = hk[(bar * 2) % hk.length], n2 = hk[(bar * 2 + 1) % hk.length];
          if (id === 'taiko') { if (bib === 0) tone({ t, type: 'sine', f: N(n1), dur: bl * 1.8, vol: 0.09 * L.lead, att: 0.05, vib: 5, vibC: 20 }); if (bib === 2) tone({ t, type: 'sine', f: N(n2), dur: bl * 1.8, vol: 0.09 * L.lead, att: 0.05, vib: 5, vibC: 20 }); }
          else if (id === 'brass') { if (bib === 3) brass(t + 2 * sb, [n1, n2].map(x => x), sb * 1.6, 0.12 * L.lead); }
          else { if (bib === 0) lead(t, n1, bl * 0.9, 0.06 * L.lead, id === 'stomp' ? 'sawtooth' : 'square'); if (bib === 2) lead(t, n2, bl * 0.9, 0.06 * L.lead, id === 'stomp' ? 'sawtooth' : 'square'); }
        }
        // the crowd joins in once the lights are back
        if (L.crowd) {
          if (bib === 1 || bib === 3) crowdClap(t, 0.12 * L.crowd);
          if (bar % 2 === 1 && bib === 2) shout(t, AN.chant[0].indexOf('GO') >= 0 ? 'o' : 'e', bl * 0.5, 0.05 * L.crowd);
          if (bar % 2 === 1 && bib === 3) shout(t, AN.chant[1].indexOf('GO') >= 0 || AN.chant[1].indexOf('HO') >= 0 ? 'o' : 'ei', bl * 0.7, 0.06 * L.crowd);
        }
        if (L.heart > 0.01) heartbeat(t, L.heart);
      }

      /* ---------------- the rhythm: one clock for music, markers and judging ---------------- */
      let lastBeat = null;
      const beatQ = [];
      const R = K.rhythm({ bpm: AN.bpm, ease: 1, onBeat: (t, i) => {
        lastBeat = { t, i };
        audioInit();
        if (A.ctx && MUS) anthemBeat(t, i);
        else if (A.ctx && L.heart > 0.01) heartbeat(t, L.heart);
        beatQ.push({ t, i });
        if (beatQ.length > 64) beatQ.splice(0, beatQ.length - 64);
        if (ST.sec) secBeat(t, i);
      } });
      const bl = () => 60 / AN.bpm;
      const beatTime = (i) => lastBeat ? lastBeat.t + (i - lastBeat.i) * bl() : vnow() + 1;

      /* ---------------- the flow ---------------- */
      function say(c, txt, ms, mood) { [rush, sync, patch].forEach(o => { if (o !== c) o.hush(); }); c.say(txt, { ms: ms || 3000, mood, moodMs: mood ? (ms || 3000) : 0 }); }
      function setHype(v) {
        ST.hype = K.clamp(v, 0, 100);
        hypeBar.style.setProperty('--h', (ST.hype / 100).toFixed(3));
        hypeNum.textContent = Math.round(ST.hype) + '%';
      }
      function setCombo(n) {
        ST.combo = n; ST.best = Math.max(ST.best, n);
        comboNum.textContent = '×' + n;
        comboEl.classList.remove('wo-bump'); void comboEl.offsetWidth; if (n) comboEl.classList.add('wo-bump');
      }
      function padMode(mode) {
        pad.classList.remove('wo-rest', 'wo-breath', 'wo-walk');
        pad.style.removeProperty('--fill');
        if (mode === 'stomp') { padB.textContent = 'STOMP'; padS.textContent = 'ON THE BEAT'; pad.setAttribute('aria-label', 'Stomp pad: tap on the beat'); }
        if (mode === 'rest') { pad.classList.add('wo-rest'); padB.textContent = 'STOMP'; padS.textContent = 'ANY TIME'; }
        if (mode === 'breath') { pad.classList.add('wo-breath'); padB.textContent = 'HOLD'; padS.textContent = 'BREATHE IN'; pad.setAttribute('aria-label', 'Press and hold to breathe in'); }
        if (mode === 'walk') { pad.classList.add('wo-walk'); padB.textContent = 'WALK OUT'; padS.textContent = 'SWIPE UP ▲'; pad.setAttribute('aria-label', 'Swipe up to walk out'); }
        ST.padMode = mode;
      }

      /* 1 · the tunnel: your heart, as loud as a drum */
      async function tunnel() {
        phase = 'tunnel';
        audioInit();
        R.start(0.4);
        padMode('rest');
        say(rush, CARE() ? line({ Jolly: 'This one’s for nerves before a big moment. If your body ever feels truly wrong, check with a doctor.', Cheeky: 'Pre-show nerves only, okay? If something feels medically off, see a doctor.', Unfiltered: 'For nerves only. Body feels wrong? See a doctor.' })
          : line({ Jolly: 'Big moment coming? Hear that heart? Good. That’s not a problem. That’s a drum.', Cheeky: 'Ooh, that heart’s pounding. Perfect. We’re using it.', Unfiltered: 'Heart’s pounding. Good. That’s your beat.' }), CARE() ? 4400 : 3800, 'determined');
        sync.face('wow', 1200);
        await K.wait(CARE() ? 3600 : 2600);
        pick();
      }
      /* 2 · pick a walk-on anthem */
      function pick() {
        phase = 'pick';
        cards.hidden = false;
        cardEls.forEach((b, i) => b.animate([{ opacity: 0, transform: 'translateY(26px) scale(0.92)' }, { opacity: 1, transform: 'none' }], { duration: red() ? 10 : 380, delay: red() ? 0 : i * 90, easing: 'cubic-bezier(.2,1.3,.4,1)', fill: 'backwards' }));
        say(sync, line(fresh ? { Jolly: 'Every walk-on needs a song. There’s a new one today!', Cheeky: 'DJ booth’s open. Fresh track in the crate today.', Unfiltered: 'Pick a song. One’s new.' } : { Jolly: 'Every walk-on needs a song. Pick yours!', Cheeky: 'DJ booth’s open. Pick a banger.', Unfiltered: 'Pick your anthem.' }), 3000, 'happy');
        K.guide({ id: 'pick', g: 'choose', target: cardEls, label: 'PICK YOUR ANTHEM', delay: 700 });
      }
      cardEls.forEach((b, i) => {
        b.addEventListener('pointerdown', () => { if (phase === 'pick' && A.ctx) A.click({ vol: 0.08 }); });
        b.addEventListener('click', () => { if (phase !== 'pick') return; A.unlock(); choose(offer[i], b); });
      });
      async function choose(a, b) {
        phase = 'picked';
        K.guide(null);
        AN = a; ST.pickAt = performance.now();
        el.style.setProperty('--wo-acc', a.col); el.style.setProperty('--wo-accink', a.ink);
        R.set(a.bpm); R.bpm = a.bpm;
        b.classList.add('wo-picked');
        cardEls.forEach(x => { if (x !== b) x.animate([{ opacity: 1 }, { opacity: 0.25 }], { duration: 300, fill: 'forwards' }); });
        audioInit();
        if (A.ctx) { A.whoosh({ vol: 0.12, dur: 0.5 }); roar(A.now() + 0.1, 1.4, 0.05); }
        L.chords = 1;
        SPR.acc = radial(128, [[0, K.hexA(a.col, 0.95)], [0.4, K.hexA(a.col, 0.35)], [1, K.hexA(a.col, 0)]]);
        ctx.track('anthem', { i: ANTHEMS.indexOf(a), bpm: a.bpm });
        say(sync, line({ Jolly: a.name.charAt(0) + a.name.slice(1).toLowerCase() + '! Great pick. It’s muffled back here, though…', Cheeky: 'Banger. Shame the tunnel’s eating all the bass.', Unfiltered: 'Good pick. Muffled. Let’s open it up.' }), 2800, 'celebrate');
        await K.wait(1300);
        cards.hidden = true;
        ST.cues = makeCues();
        nextCue();
      }
      /* 3 · each body cue: drag it from NERVES to EXCITED */
      let fv0 = 0;
      function nextCue() {
        const c = ST.cues[ST.cuesDone];
        if (!c) { twist(); return; }
        phase = 'cue';
        ST.cue = c; ST.v = 0; ST.cueMuf0 = mufFor(ST.cuesDone); ST.cueMuf1 = mufFor(ST.cuesDone + 1);
        fTag.textContent = c.own ? 'You said' : 'A common one';
        fText.textContent = c.text;
        fText.classList.toggle('gk-user', !!c.own);
        fCap.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true">' + ICONS[(CUES[c.type] || CUES.generic).icon] + '</svg>';
        fader.classList.remove('wo-off'); fader.tabIndex = 0;
        padMode('rest');
        renderFader();
        say(rush, line((CUES[c.type] || CUES.generic).line), 4600, 'determined');
        K.guide({ id: 'cue' + ST.cuesDone, g: 'drag', dir: 'r', d: Math.round(G.tr.w * 0.6), target: () => ({ x: G.fd.x + G.tr.x + ST.v * G.tr.w, y: G.fd.y + G.tr.y }), label: 'SLIDE TO EXCITED', delay: 900, ms: 1700 });
      }
      function mufFor(n) { return [360, 950, 2400, 5200][Math.min(3, n)]; }
      function renderFader() {
        if (!G.tr) return;
        fader.style.setProperty('--v', ST.v.toFixed(3));
        fCap.style.left = (G.tr.x + ST.v * G.tr.w) + 'px'; fCap.style.top = G.tr.y + 'px';
        fader.setAttribute('aria-valuenow', String(Math.round(ST.v * 100)));
      }
      function setV(v) {
        if (phase !== 'cue') return;
        v = K.clamp(v, 0, 1);
        const d0 = Math.floor(ST.v * 12), d1 = Math.floor(v * 12);
        ST.v = v;
        renderFader();
        // the wall opens with the slider; the heart turns into the kick
        muffle(K.lerp(ST.cueMuf0, ST.cueMuf1, v), 0.08);
        if (ST.cuesDone === 0) { L.heart = 1 - v; L.kick = v; }
        if (d0 !== d1 && A.ctx) { A.tone({ type: 'triangle', freq: 300 * Math.pow(2, v * 1.6), dur: 0.035, vol: 0.03 }); if (d1 > d0) rush.face(v > 0.6 ? 'celebrate' : 'determined', 700); }
        if (v >= 0.985) cueDone();
      }
      K.drag(fader, {
        start: (p) => { if (phase !== 'cue') return false; const cx = G.tr.x + ST.v * G.tr.w; fv0 = Math.abs(p.x - cx) < 46 ? ST.v : K.clamp((p.x - G.tr.x) / G.tr.w, 0, 1); setV(fv0); if (A.ctx) A.whoosh({ vol: 0.04, dur: 0.25 }); },
        move: (p, d) => { setV(fv0 + d.dx / G.tr.w); },
        end: () => { if (phase === 'cue' && ST.v < 0.985) K.guide({ id: 'cue-more' + ST.cuesDone, g: 'drag', dir: 'r', d: Math.round(G.tr.w * (1 - ST.v) * 0.8 + 30), target: () => ({ x: G.fd.x + G.tr.x + ST.v * G.tr.w, y: G.fd.y + G.tr.y }), label: 'ALL THE WAY', delay: 700 }); }
      });
      S.listen(fader, 'keydown', (e) => { if (phase !== 'cue') return; if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setV(ST.v + 0.1); } if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setV(ST.v - 0.1); } if (e.key === 'End') { e.preventDefault(); setV(1); } });
      async function cueDone() {
        if (phase !== 'cue') return;
        phase = 'cue-done';
        K.guide(null);
        ST.cuesDone++;
        const n = ST.cuesDone;
        if (n === 1) { L.heart = 0; L.kick = 0; L.drums = 1; }
        if (n === 2) { L.bass = 1; }
        if (n === 3) { L.lead = 1; }
        muffle(mufFor(n), 0.12);
        // the stamp: the sentence that does the work
        stampIt();
        if (A.ctx) { const t = A.now(); A.thud({ vol: 0.45 }); A.tone({ when: t, type: 'sawtooth', freq: 180, to: 720, glide: 0.35, dur: 0.4, vol: 0.05, lp: 2400 }); roar(t + 0.05, 1.6, 0.09); shout(t + 0.1, 'e', 0.35, 0.05); }
        P.emit('confetti', G.fd.x + G.fd.w / 2, G.fd.y + 30, 26, { colors: [AN.col, '#ffd36b', '#fff6d0', '#7fb6ff'], speed: [120, 300], angle: -Math.PI / 2, spread: 1.6 });
        setHype(ST.hype + 10);
        ST.flash = red() ? 0 : 0.7;
        rush.face('celebrate', 1400); rush.react('bounce'); sync.face('celebrate', 1200);
        ctx.track('cue', { n, own: ST.cue && ST.cue.own ? 1 : 0 });
        await K.wait(700);
        say(rush, line(n === 1 ? { Jolly: 'Say it out loud if you like: “I’m excited.” Same heart. New name.', Cheeky: 'Not nervous. Excited. Big difference, same heart.', Unfiltered: 'Excited. Not nervous. Same heart.' } : { Jolly: 'Excited again. Your body’s just getting ready.', Cheeky: 'Another one renamed. You’re good at this.', Unfiltered: 'Renamed. Excited.' }), 2800, 'celebrate');
        await K.wait(1500);
        fader.classList.add('wo-off'); fader.tabIndex = -1;
        await K.wait(400);
        if (n <= NCUE) startSection(n);
      }
      function stampIt() {
        stamp.getAnimations().forEach(a => a.cancel());
        stamp.animate([{ opacity: 0, scale: 2.2 }, { opacity: 1, scale: 0.92, offset: 0.35 }, { opacity: 1, scale: 1, offset: 0.5 }, { opacity: 1, scale: 1, offset: 0.85 }, { opacity: 0, scale: 1.05 }], { duration: red() ? 1200 : 1700, easing: 'cubic-bezier(.2,1.4,.4,1)' });
      }
      /* 4 · stomp on the beat to build the crowd (the markers run down the tunnel floor to your pad) */
      function startSection(n) {
        phase = 'beat';
        padMode('stomp');
        const travel = 4, first = Math.ceil((R.index + travel + 1) / 4) * 4;
        const marks = [];
        for (let k = 0; k < NBEATS; k += EVERY) marks.push({ i: first + k, state: 'wait', grade: '' });
        ST.sec = { n, first, last: first + NBEATS - 1, marks, hits: 0, judged: 0 };
        ST.markTotal = (ST.markTotal || 0) + marks.length;
        say(sync, line(n === 1 ? { Jolly: 'Now stomp when the lights hit your pad. The crowd will answer!', Cheeky: 'Stomp on the beat. Make the crowd shout back.', Unfiltered: 'Stomp on the beat.' } : { Jolly: 'Again! Louder this time!', Cheeky: 'Round two. Make them lose it.', Unfiltered: 'Again. Louder.' }), 3000, 'wow');
        K.guide({ id: 'stomp' + n, g: 'tap', target: pad, label: 'STOMP ON THE BEAT', delay: 300, ms: 1100 });
      }
      function secBeat(t, i) {
        const s = ST.sec;
        if (i === s.first - 4 && A.ctx) { for (let k = 0; k < 4; k++) A.tone({ when: t + k * bl(), type: 'square', freq: k === 3 ? 1320 : 990, dur: 0.05, vol: 0.035, lp: 3000 }); }
        if (i > s.last + 2 && !s.ending) {
          s.ending = true;
          S.later(() => endSection(), Math.max(0, (t - A.now()) * 1000) + 200);
        }
      }
      function judgeTap() {
        const s = ST.sec; if (!s) return null;
        const j = R.judge(); if (!j.beat) return null;
        const m = s.marks.find(x => x.i === j.beat.i && x.state === 'wait');
        if (!m) return { grade: j.grade === 'repeat' ? 'free' : (j.grade === 'perfect' || j.grade === 'good' ? 'free' : j.grade), m: null, delta: j.delta };
        if (j.grade === 'perfect' || j.grade === 'good') { m.state = 'hit'; m.grade = j.grade; m.at = performance.now(); return { grade: j.grade, m, delta: j.delta }; }
        return { grade: j.grade, m: null, delta: j.delta };
      }
      async function endSection() {
        const s = ST.sec; if (!s) return;
        ST.sec = null;
        K.guide(null);
        padMode('rest');
        s.marks.forEach(m => { if (m.state === 'wait') m.state = 'miss'; });
        const acc = s.hits / Math.max(1, s.marks.length);
        say(sync, line(acc > 0.7 ? { Jolly: 'They’re losing it out there! Listen to them!', Cheeky: 'Okay, rock star. They love you.', Unfiltered: 'Crowd’s loud. Nice.' } : acc > 0.35 ? { Jolly: 'Hear that? They’re with you.', Cheeky: 'Not bad! The crowd’s warming up.', Unfiltered: 'Crowd’s with you.' } : { Jolly: 'The crowd’s still cheering. They came for you.', Cheeky: 'Off-beat, on vibe. Crowd’s still into it.', Unfiltered: 'Crowd’s still with you.' }), 2600, 'celebrate');
        await K.wait(1800);
        nextCue();
      }
      function onPad(e) {
        if (ST.padMode === 'breath' || ST.padMode === 'walk') return;
        A.unlock();
        if (S.buzz && e && e.isTrusted) S.buzz(10);
        pad.classList.add('wo-hit'); S.later(() => pad.classList.remove('wo-hit'), 90);
        if (phase === 'beat' && ST.sec) {
          const r = judgeTap();
          const g = r ? r.grade : 'free';
          stompSound(g);
          ST.padKick = 1;
          if (r && r.m) {
            ST.sec.hits++; ST.hits++; ST.judged++; if (g === 'perfect') ST.perfect++;
            setCombo(ST.combo + 1);
            setHype(ST.hype + (g === 'perfect' ? 3.4 : 2.4) * (inten === 0 ? 1.4 : 1) * (1 + Math.min(1, ST.combo / 16) * 0.5));
            const t = A.now(); if (A.ctx) { shout(t + 0.01, ST.combo % 4 === 0 ? 'o' : 'e', 0.22, 0.03 + Math.min(0.04, ST.hype / 2500)); }
            P.emit('spark', G.pad.x, G.pad.y - G.pad.r, g === 'perfect' ? 18 : 11, { colors: [AN.col, '#fff3c4', '#ffd36b'], angle: -Math.PI / 2, spread: 1.6, speed: [120, 320] });
            ST.ringHit = { t: performance.now(), g };
            ST.crowdJump = 1;
            if (ST.combo > 0 && ST.combo % 8 === 0) { K.pop(ST.combo + ' COMBO!', { x: G.pad.x, y: G.pad.y - G.pad.r - 70, kind: 'great' }); sync.face('celebrate', 900); sync.react('bounce'); if (A.ctx) roar(A.now(), 1.2, 0.07); }
            else if (g === 'perfect' && ST.combo <= 2) K.pop('PERFECT', { x: G.pad.x, y: G.pad.y - G.pad.r - 52, kind: 'great' });
          } else if (r && (r.grade === 'early' || r.grade === 'late')) {
            if (ST.combo >= 4) K.pop(r.grade === 'early' ? 'A BIT EARLY' : 'A BIT LATE', { x: G.pad.x, y: G.pad.y - G.pad.r - 52, kind: 'soft' });
            setCombo(0);
            P.emit('dust', G.pad.x, G.pad.y - G.pad.r * 0.6, 6, { colors: ['rgba(255,255,255,0.4)'] });
          } else P.emit('dust', G.pad.x, G.pad.y - G.pad.r * 0.6, 5, { colors: ['rgba(255,255,255,0.35)'] });
          return;
        }
        stompSound('free'); ST.padKick = 0.7;
        P.emit('dust', G.pad.x, G.pad.y - G.pad.r * 0.6, 6, { colors: ['rgba(255,255,255,0.4)'] });
        if (phase === 'tunnel' || phase === 'pick') sync.face('wow', 700);
      }
      S.listen(pad, 'pointerdown', (e) => { if (e.button > 0) return; e.preventDefault(); onPad(e); });
      S.listen(pad, 'keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat && ST.padMode !== 'breath') { e.preventDefault(); if (ST.padMode === 'walk') walkOut(); else onPad(e); } });

      /* 5 · the twist: the lights cut out. One held breath; the crowd chants; the lights slam back on */
      let holdCtl = null, inhale = null;
      async function twist() {
        phase = 'dark';
        K.guide(null);
        padMode('rest');
        if (A.ctx) { const t = A.now(); A.tone({ when: t, type: 'sine', freq: 320, to: 38, glide: 0.9, dur: 1, vol: 0.12 }); A.noise({ when: t, filter: 'lowpass', freq: 400, dur: 0.5, vol: 0.12 }); A.thud({ vol: 0.3 }); if (MG) MG.gain.setTargetAtTime(0.0001, t, 0.05); if (crowdBed) crowdBed.level(0.03, 0.4); }
        ST.lightsT = 0;
        L.heart = 1;
        await K.wait(900);
        patch.show(true);
        patch.el.animate([{ opacity: 0, transform: 'translateY(16px) scale(0.8)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,1.4,.4,1)' });
        say(patch, line({ Jolly: 'Uh-oh, power’s out! Hold tight, we’re on it!', Cheeky: 'Lights down! Classic. Thirty seconds!', Unfiltered: 'Power cut. Hold.' }), 2400, 'surprised');
        await K.wait(2000);
        say(rush, line({ Jolly: 'The classic wobble. One slow breath with me: hold to breathe in.', Cheeky: 'Wobble time. Big breath in. Hold the button.', Unfiltered: 'Wobble. Breathe in. Hold.' }), 3600, 'calm');
        phase = 'breath';
        if (holdCtl) holdCtl.reset();
        padMode('breath');
        pad.style.setProperty('--fill', '0');
        K.guide({ id: 'breath', g: 'hold', target: pad, label: 'HOLD: BREATHE IN', delay: 600, ms: 2600 });
      }
      const HOLD_MS = [2200, 2600, 3000][inten];
      holdCtl = K.hold(pad, {
        ms: HOLD_MS, decay: 1.6,
        start: () => { if (phase !== 'breath') return; if (A.ctx && !inhale) { inhale = A.loop({ pink: true, filter: 'bandpass', freq: 700, q: 0.9 }); if (inhale) inhale.level(0.07, 0.4); } },
        progress: (k, active) => { if (phase !== 'breath') return; pad.style.setProperty('--fill', k.toFixed(3)); ST.breath = k; if (inhale) inhale.freq(700 + k * 900, 0.1); if (!active && inhale && k < 0.98) { inhale.level(0.0001, 0.15); const q = inhale; S.later(() => q.stop(), 300); inhale = null; } },
        done: () => { if (phase !== 'breath') return; exhale(); },
        cancel: () => { if (phase === 'breath') K.guide({ id: 'breath-more', g: 'hold', target: pad, label: 'HOLD A LITTLE LONGER', delay: 500, ms: 2600 }); }
      });
      async function exhale() {
        phase = 'exhale';
        K.guide(null);
        if (inhale) { inhale.level(0.0001, 0.4); const q = inhale; S.later(() => q.stop(), 700); inhale = null; }
        if (A.ctx) A.noise({ when: A.now() + 0.05, filter: 'bandpass', freq: 1300, to: 500, q: 0.8, dur: 2.6, attack: 0.3, vol: 0.07 });
        padB.textContent = 'AND OUT'; padS.textContent = 'SLOWLY…';
        const t0 = performance.now();
        await K.anim(2600, (k) => { pad.style.setProperty('--fill', (1 - k).toFixed(3)); ST.breath = 1 - k; });
        void t0;
        rush.face('happy', 0);
        // the crowd starts the chant in the dark
        phase = 'chant';
        L.heart = 0.6;
        muffle(2600, 0.3);
        if (A.ctx && MG) MG.gain.setTargetAtTime(1, A.now(), 0.2);
        if (crowdBed) crowdBed.level(0.12, 1);
        say(rush, line({ Jolly: 'Hear that? They’re chanting for you.', Cheeky: 'Listen. They’re chanting. For you.', Unfiltered: 'They’re chanting.' }), 2600, 'happy');
        const startI = Math.ceil((R.index + 1) / 4) * 4;
        ST.chantFrom = startI;
        for (let k = 0; k < 8; k++) {
          const i = startI + k, t = beatTime(i), lv = 0.4 + k * 0.08;
          if (A.ctx) {
            crowdClap(t, 0.14 * lv);
            if (k % 4 === 0) shout(t, AN.chant[0].indexOf('GO') >= 0 ? 'o' : 'e', bl() * 0.55, 0.06 * lv);
            if (k % 4 === 1) shout(t, /GO|HO/.test(AN.chant[1]) ? 'o' : 'ei', bl() * 0.8, 0.07 * lv);
          }
          S.later(() => chantPulse(k), Math.max(0, (t - vnow()) * 1000));
        }
        const tOn = beatTime(startI + 8);
        await K.wait(Math.max(400, (tOn - vnow()) * 1000));
        lightsOn();
      }
      function chantPulse(k) {
        if (phase !== 'chant') return;
        if (k % 4 >= 2) { ST.chantFlash = 0.5; return; }
        const word = AN.chant[k % 4];
        chant.textContent = word;
        chant.getAnimations().forEach(a => a.cancel());
        chant.animate([{ opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1.08, offset: 0.25 }, { opacity: 1, scale: 1, offset: 0.6 }, { opacity: 0, scale: 1 }], { duration: bl() * 1000 * 1.6, easing: 'ease-out' });
        ST.chantFlash = 1;
      }
      function lightsOn() {
        phase = 'lights';
        chant.getAnimations().forEach(a => a.cancel());
        L.heart = 0; L.drums = 1; L.kick = 0; L.chords = 1; L.bass = 1; L.lead = 1; L.crowd = 1;
        muffle(18000, 0.05);
        ST.flash = red() ? 0 : 1;
        if (A.ctx) { const t = A.now(); A.kick(t, 0.6); A.noise({ when: t, filter: 'highpass', freq: 4500, dur: 1.8, attack: 0.002, vol: 0.12 }); A.thud({ vol: 0.5 }); roar(t, 2.6, 0.14); if (crowdBed) crowdBed.level(0.16, 0.3); }
        P.emit('confetti', G.w * 0.2, G.h * 0.9, 30, { angle: -Math.PI / 2 + 0.35, spread: 0.7, speed: [300, 560], colors: [AN.col, '#ffd36b', '#fff6d0', VEN.accent] });
        P.emit('confetti', G.w * 0.8, G.h * 0.9, 30, { angle: -Math.PI / 2 - 0.35, spread: 0.7, speed: [300, 560], colors: [AN.col, '#ffd36b', '#fff6d0', VEN.accent] });
        setHype(Math.max(ST.hype, 90));
        rush.face('celebrate', 0); sync.face('celebrate', 0); patch.face('celebrate', 0);
        say(patch, line({ Jolly: 'Lights are back! You’re on!', Cheeky: 'WE’RE BACK! GO GO GO!', Unfiltered: 'Lights. You’re on.' }), 2200, 'celebrate');
        S.later(() => {
          phase = 'walk';
          padMode('walk');
          say(rush, line({ Jolly: 'Swipe up. Walk out like you own it.', Cheeky: 'Swipe up. Strut optional, but encouraged.', Unfiltered: 'Swipe up. Walk out.' }), 0, 'celebrate');
          K.guide({ id: 'walk', g: 'drag', dir: 'u', d: 90, target: pad, label: 'SWIPE UP: WALK OUT', delay: 400, ms: 1400 });
        }, 1900);
      }
      /* 6 · walk out */
      K.drag(pad, {
        start: () => { if (phase !== 'walk') return false; },
        move: (p, d) => { if (phase !== 'walk') return; ST.walkPull = K.clamp(-d.dy / 90, 0, 1); if (d.dy < -60) walkOut(); },
        end: () => { ST.walkPull = 0; }
      });
      async function walkOut() {
        if (phase !== 'walk') return;
        phase = 'out';
        K.guide(null);
        rush.hush(); sync.hush(); patch.hush();
        pad.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-40px) scale(0.8)' }], { duration: 350, fill: 'forwards' });
        if (A.ctx) { A.whoosh({ vol: 0.16, dur: 0.9 }); roar(A.now() + 0.3, 3, 0.16); }
        const t0 = performance.now(), dur = red() ? 300 : 1100;
        await new Promise(res => { const step = () => { if (S.destroyed) return; const k = Math.min(1, (performance.now() - t0) / dur); ST.walk = k * k; if (k < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
        ST.stage = 1; ST.stageAt = performance.now(); ST.flash = red() ? 0 : 1;
        hud.style.opacity = '0';
        placeCastStage();
        screen.querySelector('span').textContent = (ST.best >= 4 ? 'BEST COMBO ×' + ST.best + ' · ' : '') + AN.name;
        screen.classList.add('wo-on');
        finale();
      }
      function placeCastStage() {
        const w = G.w, H = G.h, sz = G.phone ? 66 : 104, y = H - 16 - sz - (G.phone ? 18 : 30);
        [[rush, 0.2], [sync, 0.5], [patch, 0.8]].forEach(([c, k]) => { c.show(true); c.el.style.setProperty('--sz', sz + 'px'); c.side('above'); c.place(w * k - sz / 2, y, red() ? 0 : 700); });
        G.screenY = G.phone ? 200 : 170;
        screen.style.top = G.screenY + 'px';
      }
      async function finale() {
        phase = 'end';
        ST.pyroFrom = R.index;
        await K.wait(900);
        say(rush, line({ Jolly: 'Same heartbeat. New song. That’s what excited sounds like.', Cheeky: 'Same heart, way better soundtrack. Told you.', Unfiltered: 'Same heart. Your song.' }), 0, 'celebrate');
        sync.react('bounce'); patch.react('bounce');
        await K.finale('fireworks', { from: [{ x: G.w * 0.15, y: G.h * 0.7 }, { x: G.w * 0.85, y: G.h * 0.7 }, { x: G.w * 0.5, y: G.h * 0.75 }], colors: [AN.col, '#ffd36b', VEN.accent, '#ffffff', '#ff8fb1'], count: G.phone ? 6 : 9, chord: ['C4', 'E4', 'G4', 'C5'], ms: 3600, sound: false });
        const badges = [];
        const pb = K.best('combo', ST.best, 'higher');
        if (pb.isNew) badges.push('New best combo: ×' + ST.best); else if (pb.first && ST.best >= 3) badges.push('First walk-on: combo ×' + ST.best);
        const acc = ST.hits / Math.max(1, ST.markTotal || 1);
        const tier = K.tier(acc); if (tier) badges.push(tier + ' hype');
        const c = K.collect(AN.name);
        badges.push((c.isNew ? 'New anthem: ' : 'Anthem: ') + titleCase(AN.name) + ' (' + c.count + ' of ' + ANTHEMS.length + ')');
        const nxt = ANTHEMS[3 + visits];
        if (nxt && badges.length < 4) badges.push('Next visit unlocks: ' + titleCase(nxt.name));
        finished = true; ST.finAt = performance.now();
        ctx.track('done', { combo: ST.best, acc: Math.round(acc * 100), cues: ST.cuesDone, hype: Math.round(ST.hype) });
        const own = ST.cues.filter(x => x.own).length;
        ctx.finish({
          title: 'Walked out excited', mood: 'celebrate',
          lines: [ST.cuesDone + (ST.cuesDone === 1 ? ' body cue' : ' body cues') + ' re-read: NERVES → EXCITED' + (own ? ' (' + own + ' in your words)' : ''),
            Math.round(acc * 100) + '% on the beat · best combo ×' + ST.best,
            'Walked out to ' + titleCase(AN.name) + ' at ' + VEN.name],
          share: 'Turned my nerves into a walk-on song.',
          badges: badges.slice(0, 4)
        });
      }
      function titleCase(s) { return String(s).toLowerCase().replace(/(^|\s)[a-z]/g, c => c.toUpperCase()); }

      /* ---------------- frame loop ---------------- */
      const W = { light: 1, kick: 0, pulse: 0, cool: 1, jump: 0, flash: 0, zoom: 0 };
      let frameN = 0, beatSeen = -1;
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !BG) return;
        frameN++;
        if (phase === 'intro' && frameN > 3) return;
        if (finished && (frameN % 3 || performance.now() - ST.finAt > 1500)) return;
        const now = performance.now(), vn = vnow();
        // beats as heard
        while (beatQ.length && beatQ[0].t <= vn) { const b = beatQ.shift(); W.kick = 1; W.pulse = 1; beatSeen = b.i; if (ST.stage && b.i % 4 === 0) pyro(); }
        W.kick *= Math.exp(-dt * 7); W.pulse *= Math.exp(-dt * 5);
        const lightT = phase === 'dark' || phase === 'breath' || phase === 'exhale' || phase === 'chant' ? 0.06 : 1;
        W.light += (lightT - W.light) * Math.min(1, dt * (lightT < W.light ? 10 : 4));
        const coolT = 1 - Math.min(1, ST.cuesDone / Math.max(1, NCUE)) * (phase === 'cue' ? 1 : 1) - (phase === 'cue' ? ST.v / Math.max(1, NCUE) : 0);
        W.cool += (K.clamp(coolT, 0, 1) - W.cool) * Math.min(1, dt * 3);
        W.jump = Math.max(0, (ST.crowdJump || 0)); ST.crowdJump = Math.max(0, (ST.crowdJump || 0) - dt * 3);
        W.flash = Math.max(0, (ST.flash || 0) - dt * 2.2); ST.flash = W.flash;
        ST.padKick = Math.max(0, (ST.padKick || 0) - dt * 6);
        draw(g, dt, t, now, vn);
      });
      function draw(g, dt, t, now, vn) {
        const w = G.w, H = G.h, D = K.dark();
        if (ST.stage) { drawStage(g, dt, t, now, vn); return; }
        // walking out: the tunnel rushes past
        if (ST.walk > 0) {
          const s = 1 + ST.walk * 5;
          g.save(); g.translate(G.vp.x, G.vp.y); g.scale(s, s); g.translate(-G.vp.x, -G.vp.y); g.drawImage(BG.c, 0, 0, w, H); g.restore();
          g.fillStyle = red() ? 'rgba(10,8,16,' + (ST.walk * 0.9).toFixed(3) + ')' : 'rgba(255,250,235,' + (ST.walk * 0.9).toFixed(3) + ')'; g.fillRect(0, 0, w, H);
          P.update(dt); P.draw(g);
          return;
        }
        g.drawImage(BG.c, 0, 0, w, H);
        const o = G.opr, lt = W.light;
        // the crowd beyond the doorway bobs on the beat
        g.save(); g.beginPath(); g.rect(o.x0, o.y0, o.w || (o.x1 - o.x0), o.y1 - o.y0); g.clip();
        if (VEN.glow && lt > 0.1) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 * lt * (0.7 + 0.3 * W.kick); g.drawImage(SPR.glow, G.vp.x - G.op.w, G.vp.y - G.op.h * 1.4, G.op.w * 2, G.op.h * 1.6); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        const heads = 26, hy = o.y1 - (o.y1 - o.y0) * 0.16;
        g.fillStyle = D ? '#07060c' : '#1c1426';
        for (let i = 0; i < heads; i++) {
          const x = o.x0 + (i + 0.5) / heads * (o.x1 - o.x0) + Math.sin(i * 7.1) * 3, ph = i * 1.37, bob = (W.kick * 4 + W.jump * 6) * (0.5 + 0.5 * Math.sin(ph)), r = 4.2 + (i % 3) * 0.8;
          g.beginPath(); g.arc(x, hy - bob - (i % 2) * 4, r, 0, TAU); g.fill(); g.fillRect(x - r * 1.3, hy - bob - (i % 2) * 4 + r * 0.6, r * 2.6, 30);
          if (W.jump > 0.3 && i % 3 === 0) { g.fillRect(x - 1.2, hy - bob - 14 - (i % 2) * 4, 2.4, 9); }
        }
        g.restore();
        // ceiling lights pulse with every beat
        g.save(); g.globalCompositeOperation = D ? 'lighter' : 'source-over';
        G.strips.forEach((q, k) => { g.globalAlpha = Math.min(1, (0.18 + 0.5 * W.pulse * (k % 2 ? 0.8 : 1)) * lt) * (D ? 1 : 0.6); g.fillStyle = W.cool > 0.5 ? '#cfe2ff' : '#ffe6b0'; quad(g, ...q); g.fill(); });
        g.restore();
        drawMarkers(g, now, vn);
        drawPadRing(g, now, vn);
        drawECG(g, t, vn);
        // vignette: the heartbeat you can see
        const vig = Math.min(1, 0.55 + 0.2 * W.pulse * (L.heart > 0.05 ? 1 : 0.4));
        g.globalAlpha = vig; g.drawImage(SPR.vig, -w * 0.25, -H * 0.15, w * 1.5, H * 1.3);
        if (L.heart > 0.05 && W.pulse > 0.05) { g.globalAlpha = W.pulse * 0.35 * L.heart * (D ? 1 : 0.6); g.drawImage(SPR.red, -w * 0.25, -H * 0.15, w * 1.5, H * 1.3); }
        g.globalAlpha = 1;
        P.update(dt); P.draw(g);
        // blackout
        if (lt < 0.98) {
          g.fillStyle = 'rgba(2,2,6,' + ((1 - lt) * 0.9).toFixed(3) + ')'; g.fillRect(0, 0, w, H);
          if (phase === 'chant' && ST.chantFlash) { ST.chantFlash = Math.max(0, ST.chantFlash - dt * 2.5); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = ST.chantFlash * 0.4; g.drawImage(SPR.glow, G.vp.x - G.op.w * 1.4, G.vp.y - G.op.h * 1.6, G.op.w * 2.8, G.op.h * 3.2); g.restore(); }
          if (phase === 'breath' || phase === 'exhale') { const k = ST.breath || 0; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25 + 0.35 * k; g.drawImage(SPR.white, G.pad.x - G.pad.r * (1.6 + k), G.pad.y - G.pad.r * (1.6 + k), G.pad.r * (3.2 + 2 * k), G.pad.r * (3.2 + 2 * k)); g.restore(); }
        }
        if (W.flash > 0.01) { g.fillStyle = 'rgba(255,248,230,' + (W.flash * 0.6).toFixed(3) + ')'; g.fillRect(0, 0, w, H); }
      }
      function markerPos(p) {
        const o = G.opr, k = K.clamp(p, 0, 1.15), kk = k * k;
        return { y: o.y1 + (G.pad.y - o.y1) * kk, half: K.lerp((o.x1 - o.x0) * 0.12, G.pad.r * 1.25, kk), s: 0.25 + 0.75 * kk };
      }
      function drawMarkers(g, now, vn) {
        const s = ST.sec; if (!s) return;
        const travel = 4 * bl();
        g.save(); g.globalCompositeOperation = K.dark() ? 'lighter' : 'source-over';
        for (const m of s.marks) {
          const tm = beatTime(m.i), p = 1 - (tm - vn) / travel;
          if (m.state === 'wait' && vn > tm + 0.25) { m.state = 'miss'; if (ST.combo >= 1) setCombo(0); }
          if (p < 0 || p > 1.12) continue;
          if (m.state === 'hit') continue;
          const mp = markerPos(p), a = m.state === 'miss' ? Math.max(0, 1 - (p - 1) * 8) * 0.4 : Math.min(1, p * 3);
          if (a <= 0.01) continue;
          const half = mp.half, th = 5 + 9 * mp.s;
          g.globalAlpha = a * 0.55; g.drawImage(SPR.acc, G.vp.x - half * 1.4, mp.y - th * 2.4, half * 2.8, th * 4.8);
          g.globalAlpha = a; g.fillStyle = m.state === 'miss' ? 'rgba(200,200,220,0.6)' : AN.col;
          g.beginPath(); g.moveTo(G.vp.x - half, mp.y); g.lineTo(G.vp.x, mp.y - th * 0.9); g.lineTo(G.vp.x + half, mp.y); g.lineTo(G.vp.x, mp.y + th * 0.6); g.closePath(); g.fill();
          g.fillStyle = 'rgba(255,255,255,' + (0.7 * a).toFixed(3) + ')'; g.fillRect(G.vp.x - half * 0.6, mp.y - 1, half * 1.2, 2);
        }
        g.restore(); g.globalAlpha = 1;
      }
      function drawPadRing(g, now, vn) {
        const s = ST.sec, px = G.pad.x, py = G.pad.y, r = G.pad.r;
        // the next beat closes a ring onto the pad
        if (s) {
          const nm = s.marks.find(m => m.state === 'wait' && beatTime(m.i) > vn - 0.1);
          if (nm) { const k = K.clamp((beatTime(nm.i) - vn) / bl(), 0, 1); if (k < 1) { g.strokeStyle = K.hexA(AN.col, (0.35 + 0.65 * (1 - k)).toFixed(3)); g.lineWidth = 4; g.beginPath(); g.arc(px, py, r + 8 + k * 46, 0, TAU); g.stroke(); } }
        }
        if (ST.ringHit) {
          const k = (now - ST.ringHit.t) / 420;
          if (k < 1) { g.strokeStyle = 'rgba(255,240,200,' + (1 - k).toFixed(3) + ')'; g.lineWidth = 6 * (1 - k); g.beginPath(); g.arc(px, py, r + 8 + k * 60, 0, TAU); g.stroke(); }
          else ST.ringHit = null;
        }
        if (ST.padKick > 0.02) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = ST.padKick * 0.5; g.drawImage(SPR.acc, px - r * 2, py - r * 2, r * 4, r * 4); g.restore(); }
      }
      function drawECG(g, t, vn) {
        const e = G.ecg; if (!e) return;
        const cool = W.cool, col = 'rgb(' + Math.round(K.lerp(255, 127, cool)) + ',' + Math.round(K.lerp(211, 182, cool)) + ',' + Math.round(K.lerp(107, 255, cool)) + ')';
        const pps = e.w / 2.6, bt = 60 / AN.bpm;
        const ref = lastBeat || { t: vn, i: 0 };
        g.save();
        g.fillStyle = 'rgba(6,4,14,0.45)'; g.beginPath(); g.roundRect ? g.roundRect(e.x, e.y, e.w, e.h, 10) : g.rect(e.x, e.y, e.w, e.h); g.fill();
        g.beginPath(); g.rect(e.x + 4, e.y, e.w - 8, e.h); g.clip();
        g.strokeStyle = col; g.lineWidth = 2.2; g.shadowColor = col; g.shadowBlur = 8;
        g.beginPath();
        const mid = e.y + e.h * 0.62, amp = e.h * 0.5 * (0.6 + 0.4 * W.light);
        for (let x = 0; x <= e.w; x += 3) {
          const tt = vn - (e.w - x) / pps, ph = ((tt - ref.t) % bt + bt) % bt;
          let y = 0;
          y += Math.exp(-Math.pow((ph - 0.012) / 0.012, 2)) * 1.0 - Math.exp(-Math.pow((ph - 0.04) / 0.013, 2)) * 0.38;
          y += Math.exp(-Math.pow((ph - bt * 0.36) / 0.02, 2)) * 0.45 + 0.12 * Math.exp(-Math.pow((ph - bt * 0.62) / 0.06, 2));
          const yy = mid - y * amp;
          if (x) g.lineTo(e.x + x, yy); else g.moveTo(e.x + x, yy);
        }
        g.stroke(); g.restore();
      }
      /* ---------------- the venue (finale) ---------------- */
      function paintStage() {
        const w = G.w, H = G.h, D = K.dark(), s = off(w, H), g = s.g, R2 = K.rng(K.daily() + 3);
        const sk = g.createLinearGradient(0, 0, 0, H * 0.7); sk.addColorStop(0, VEN.sky[0]); sk.addColorStop(1, VEN.sky[1]);
        g.fillStyle = sk; g.fillRect(0, 0, w, H);
        if (venueId === 'stadium') {
          for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.2 + R2() * 0.5).toFixed(2) + ')'; g.fillRect(R2() * w, R2() * H * 0.3, 1.5, 1.5); }
          // stands rising behind the crowd
          for (let r = 0; r < 6; r++) { g.fillStyle = 'rgba(' + (30 + r * 6) + ',' + (38 + r * 7) + ',' + (70 + r * 8) + ',1)'; const y = H * (0.28 + r * 0.055); g.fillRect(0, y, w, H * 0.06); g.fillStyle = 'rgba(255,255,255,0.05)'; for (let x = 0; x < w; x += 9) g.fillRect(x + (r % 2) * 4, y + 3, 3, 3); }
          [0.12, 0.88].forEach(k => { const x = w * k; g.fillStyle = '#1a2236'; g.fillRect(x - 3, H * 0.08, 6, H * 0.3); g.fillStyle = '#e8f2ff'; for (let i = 0; i < 6; i++) g.fillRect(x - 22 + (i % 3) * 16, H * 0.06 + Math.floor(i / 3) * 12, 12, 8); });
        } else if (venueId === 'club') {
          g.fillStyle = 'rgba(255,79,216,0.08)'; for (let i = 0; i < 14; i++) { g.beginPath(); g.moveTo(w / 2, H * 0.05); g.lineTo(R2() * w, H * 0.6); g.lineTo(R2() * w, H * 0.6); g.closePath(); g.fill(); }
          g.strokeStyle = 'rgba(127,227,255,0.22)'; g.lineWidth = 1; for (let i = 0; i < 18; i++) { g.beginPath(); g.moveTo(0, H * (0.05 + R2() * 0.4)); g.lineTo(w, H * (0.05 + R2() * 0.4)); g.stroke(); }
        } else if (venueId === 'hall') {
          g.fillStyle = 'rgba(255,240,210,0.08)'; for (let x = 0; x < w; x += 46) g.fillRect(x, 0, 2, H * 0.62);
          const cols = ['#ff6b6b', '#ffd36b', '#69db7c', '#4dabf7', '#b49cff'];
          for (let row = 0; row < 2; row++) { const y0 = H * (0.08 + row * 0.1); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, y0); g.quadraticCurveTo(w / 2, y0 + 30, w, y0); g.stroke(); for (let i = 0; i < 16; i++) { const k = (i + 0.5) / 16, x = w * k, y = y0 + 30 * 4 * k * (1 - k) * 0.5 * 2 * 0.5 + 15 * Math.sin(k * Math.PI) ; g.fillStyle = cols[(i + row) % 5]; g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x + 7, y); g.lineTo(x, y + 14); g.closePath(); g.fill(); } }
          g.strokeStyle = '#d0d0d8'; g.lineWidth = 3; g.strokeRect(w * 0.82, H * 0.2, 40, 28); g.strokeStyle = '#ff6a3c'; g.beginPath(); g.ellipse(w * 0.82 + 20, H * 0.2 + 30, 13, 4, 0, 0, TAU); g.stroke();
        } else {
          g.fillStyle = 'rgba(255,200,140,0.35)'; g.beginPath(); g.arc(w * 0.75, H * 0.32, 40, 0, TAU); g.fill();
          for (let i = 0; i < 22; i++) { const bw = 20 + R2() * 40, bh = 60 + R2() * 160, x = R2() * w; g.fillStyle = 'rgba(30,20,50,0.92)'; g.fillRect(x, H * 0.55 - bh, bw, bh); g.fillStyle = 'rgba(255,220,150,0.5)'; for (let j = 0; j < 6; j++) g.fillRect(x + 4 + (j % 2) * 9, H * 0.55 - bh + 8 + Math.floor(j / 2) * 14, 4, 6); }
          g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, H * 0.18); g.quadraticCurveTo(w / 2, H * 0.3, w, H * 0.18); g.stroke();
          for (let i = 0; i < 20; i++) { const k = (i + 0.5) / 20, x = w * k, y = H * 0.18 + H * 0.12 * 4 * k * (1 - k) * 0.5; g.fillStyle = 'rgba(255,214,140,0.95)'; g.beginPath(); g.arc(x, y + 4, 3, 0, TAU); g.fill(); }
        }
        // stage lip
        const sy = H * 0.86;
        g.fillStyle = D ? '#0a0810' : '#241c2c'; g.fillRect(0, sy, w, H - sy);
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, sy, w, 3);
        for (let x = 20; x < w; x += 46) { g.fillStyle = K.hexA(AN.col, 0.9); g.fillRect(x, sy + 8, 14, 5); }
        // big screen
        const sw = Math.min(w * 0.82, 520), sh = G.phone ? 104 : 120, sxx = w / 2 - sw / 2, syy = (G.phone ? 200 : 170) - sh / 2;
        g.fillStyle = '#05040a'; g.fillRect(sxx - 8, syy - 8, sw + 16, sh + 16);
        const scr = g.createLinearGradient(0, syy, 0, syy + sh); scr.addColorStop(0, '#1a1030'); scr.addColorStop(1, '#30164a');
        g.fillStyle = scr; g.fillRect(sxx, syy, sw, sh);
        g.fillStyle = 'rgba(255,255,255,0.05)'; for (let y = syy; y < syy + sh; y += 3) g.fillRect(sxx, y, sw, 1);
        return s;
      }
      const flames = [];
      function pyro() {
        const H = G.h, xs = G.phone ? [0.08, 0.92] : [0.06, 0.28, 0.72, 0.94];
        xs.forEach(k => flames.push({ x: G.w * k, y: H * 0.86, t0: performance.now(), h: H * (G.phone ? 0.3 : 0.36) }));
        if (A.ctx) { A.noise({ filter: 'lowpass', freq: 900, to: 300, dur: 0.6, attack: 0.02, vol: 0.09 }); A.tone({ type: 'sine', freq: 70, to: 40, glide: 0.3, dur: 0.4, vol: 0.12 }); }
        if (Math.floor(beatSeen / 4) % 2 === 0) { P.emit('confetti', 10, G.h * 0.86, 16, { angle: -Math.PI / 2 + 0.4, spread: 0.6, speed: [280, 520], colors: [AN.col, '#ffd36b', '#fff6d0', VEN.accent, '#ff8fb1'] }); P.emit('confetti', G.w - 10, G.h * 0.86, 16, { angle: -Math.PI / 2 - 0.4, spread: 0.6, speed: [280, 520], colors: [AN.col, '#ffd36b', '#fff6d0', VEN.accent, '#ff8fb1'] }); }
      }
      function drawStage(g, dt, t, now, vn) {
        const w = G.w, H = G.h;
        if (!STG) STG = paintStage();
        g.drawImage(STG.c, 0, 0, w, H);
        // sweeping beams
        g.save(); g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) {
          const a = Math.sin(t * 0.8 + i * 1.6) * 0.5, x0 = w * (0.15 + i * 0.23);
          g.globalAlpha = 0.1 + 0.06 * W.kick; g.fillStyle = i % 2 ? VEN.accent : AN.col;
          g.beginPath(); g.moveTo(x0 - 6, H * 0.86); g.lineTo(x0 + 6, H * 0.86); g.lineTo(x0 + Math.sin(a) * H + 90, -10); g.lineTo(x0 + Math.sin(a) * H - 90, -10); g.closePath(); g.fill();
        }
        g.restore(); g.globalAlpha = 1;
        // the crowd, hands up on the beat, phone lights twinkling
        const rows = G.phone ? 4 : 5;
        for (let r = 0; r < rows; r++) {
          const y = H * (0.6 + r * 0.06), n = Math.round(w / (G.phone ? 24 - r * 2 : 30 - r * 3)), sz = 6 + r * 2.2;
          g.fillStyle = 'rgba(' + (6 + r * 3) + ',' + (4 + r * 3) + ',' + (12 + r * 4) + ',1)';
          for (let i = 0; i < n; i++) {
            const x = (i + 0.5 + (r % 2) * 0.5) * (w / n), ph = i * 2.3 + r, bob = W.kick * (3 + r) * (0.5 + 0.5 * Math.sin(ph));
            g.beginPath(); g.arc(x, y - bob, sz, 0, TAU); g.fill(); g.fillRect(x - sz * 1.4, y - bob + sz * 0.7, sz * 2.8, H * 0.1);
            if ((i + r) % 4 === 0) { const up = 0.5 + 0.5 * Math.sin(t * 6 + ph); g.fillRect(x + sz * 0.8, y - bob - sz * (1.2 + up * 1.4), 2.5 + r * 0.4, sz * (1.4 + up)); }
          }
        }
        for (let i = 0; i < (G.phone ? 34 : 70); i++) {
          const x = ((i * 97.3) % w), y = H * (0.58 + ((i * 0.37) % 1) * 0.24), a = 0.4 + 0.6 * Math.abs(Math.sin(t * 2.2 + i));
          g.globalAlpha = a; g.drawImage(SPR.white, x - 5, y - 5, 10, 10);
        }
        g.globalAlpha = 1;
        // pyro on every downbeat
        g.save(); g.globalCompositeOperation = 'lighter';
        for (let i = flames.length - 1; i >= 0; i--) {
          const f = flames[i], k = (now - f.t0) / 700; if (k >= 1) { flames.splice(i, 1); continue; }
          const hh = f.h * Math.sin(Math.min(1, k * 2.2) * Math.PI / 2) * (1 - k * 0.3), ww = 34 + 10 * Math.sin(k * 20);
          g.globalAlpha = (1 - k) * 0.95; g.drawImage(SPR.flame, f.x - ww / 2, f.y - hh, ww, hh);
          g.globalAlpha = (1 - k) * 0.5; g.drawImage(SPR.warm, f.x - 80, f.y - 90, 160, 120);
          if (k < 0.5 && Math.random() < 0.5) P.emit('ember', f.x + (Math.random() - 0.5) * 20, f.y - hh * 0.7, 1, { speed: [40, 120], angle: -Math.PI / 2, spread: 0.8 });
        }
        g.restore(); g.globalAlpha = 1;
        P.update(dt); P.draw(g);
        const k0 = Math.min(1, (now - ST.stageAt) / 600);
        if (k0 < 1 && !red()) { g.fillStyle = 'rgba(255,250,235,' + (1 - k0).toFixed(3) + ')'; g.fillRect(0, 0, w, H); }
      }

      /* ---------------- start ---------------- */
      cv.onResize(() => layout());
      (async () => {
        await K.intro({ title: 'Walk-On Song', sub: 'Backstage. Big moment. Your heart is pounding. Good: that’s your beat.', how: 'Pick an anthem, slide each feeling to EXCITED, stomp on the beat, then walk out.', char: 'rush', mood: 'celebrate' });
        frameN = 0;
        await tunnel();
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = performance.now(); while (!fn()) { if (performance.now() - t0 > (ms || 30000)) return false; await K.wait(60); } return true; };
          await until(() => phase === 'pick', 30000);
          await K.wait(900);
          await K.sim.tap(cardEls[0]);
          for (let guard = 0; guard < 8 && !finished; guard++) {
            await until(() => phase === 'cue' || phase === 'breath' || phase === 'walk', 40000);
            if (phase === 'cue') {
              await K.wait(700);
              const x0 = G.tr.x + ST.v * G.tr.w, y = G.tr.y;
              await K.sim.drag(fader, { x: x0, y }, { x: G.tr.x + G.tr.w + 12, y }, 1400, 22);
              await until(() => phase !== 'cue', 4000);
              await until(() => phase === 'beat' || phase === 'dark' || phase === 'breath', 20000);
              if (phase === 'beat') {
                while (phase === 'beat' && ST.sec) {
                  const s = ST.sec, vn = vnow();
                  const m = s.marks.find(x => x.state === 'wait' && beatTime(x.i) > vn - 0.05);
                  if (!m) { await K.wait(30); continue; }
                  const ms = (beatTime(m.i) - vn) * 1000;
                  if (ms > 16) { await K.wait(Math.min(ms - 10, 50)); continue; }
                  const pr = await K.sim.press(pad); S.later(() => pr.up(), 60);
                  m.auto = true;
                  await K.wait(90);
                }
              }
            } else if (phase === 'breath') {
              await K.wait(500);
              await K.sim.hold(pad, HOLD_MS + 250);
            } else if (phase === 'walk') {
              await K.wait(500);
              const r = G.pad.r;
              await K.sim.drag(pad, { x: r, y: r }, { x: r, y: r - 120 }, 500, 12);
              break;
            }
          }
          await until(() => finished, 40000);
        }
      };
    }
  });
})(window.TSG_ENV);
