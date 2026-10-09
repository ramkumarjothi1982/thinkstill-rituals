/* 005 Pocket Universe — Reset · ORGANISE · Mental Overload / Working Memory
 * Mechanism: cognitive offloading and ordering. Getting each looping thought out of your head and onto its own track frees
 * working memory (cognitive offloading, Risko & Gilbert 2016); slow, deliberate fine adjustment lowers arousal; and sorting
 * the orbits into Today / This week / Later turns a pile-up into a plan (externalised scheduling, like worry postponement).
 * Verb: tune (slide three tuning bands, gravity, damping and time, until every planet holds its own orbit; then tap to sort).
 * Finale: a glowing orrery chimes in order around the sun, then the camera pulls back to the slowly turning galaxy that
 * every calm system you have tuned belongs to.
 */
(function (env) {
  'use strict';
  /* An opaque, DPR-aware canvas with the kit's canvas interface ({ el, g, w, h, dpr, onResize, fit }). Opaque layers let the
     compositor skip blending and cull what is underneath, which keeps a full-screen animated scene smooth on weaker devices. */
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
      c.style.width = w + 'px'; c.style.height = hh + 'px';
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
  /* Software-rendered canvases (no GPU: VMs, old or blocklisted devices) get a 1x canvas so motion stays smooth. */
  function softwareGfx() {
    try {
      const c = document.createElement('canvas'), gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info'), r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r);
    } catch (e) { return false; }
  }

  (env.games = env.games || []).push({
    id: 'pocket-universe', mode: 'reset', name: 'Pocket Universe', verb: 'tune', family: 'ORGANISE', minutes: 2,
    parents: ['Mental Overload / Working Memory', 'Overthinking / Thought Fusion'],
    cast: ['sync'], poster: { char: 'sync', mood: 'moon' },
    tagline: 'Tune gravity and time until every thought holds its own calm orbit.',
    why: 'For too many thoughts at once: give each one its own orbit, then sort them by when.',
    css: `
.g-pocket-universe { --pu-a: #8f7bff; --pu-b: #3fe0d0; }
.g-pocket-universe .pu-lab { position: absolute; z-index: 21; left: 0; top: 0; transform: translate3d(-400px, -400px, 0); will-change: transform; pointer-events: none; width: max-content; max-width: 136px;
  font: 700 15px/1.12 var(--font-ui); letter-spacing: 0.01em; color: #f2f4ff; text-align: center; padding: 4px 8px 4px; border-radius: 9px; background: rgba(8, 10, 30, 0.76); border: 1px solid rgba(255, 255, 255, 0.2);
  text-wrap: balance; transition: opacity 0.5s ease, border-color 0.3s ease, box-shadow 0.3s ease; }
.g-pocket-universe .pu-lab.ok { border-color: rgba(123, 255, 176, 0.85); }
.g-pocket-universe .pu-lab.sel { border-color: #fff; box-shadow: 0 0 0 2px var(--pu-b), 0 0 16px var(--pu-b); }
.g-pocket-universe .pu-lab.done { border-color: var(--c); }
.g-pocket-universe .pu-hit { position: absolute; z-index: 22; left: 0; top: 0; width: 60px; height: 60px; margin: -30px 0 0 -30px; border-radius: 50%; border: 0; padding: 0; background: transparent; cursor: pointer;
  transform: translate3d(-400px, -400px, 0); will-change: transform; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.g-pocket-universe .pu-hit:focus-visible { outline: 2px solid #fff; outline-offset: -4px; }
.g-pocket-universe .pu-hit[disabled] { pointer-events: none; }
.g-pocket-universe .pu-core { position: absolute; z-index: 21; left: 0; top: 0; transform: translate(-50%, -50%); pointer-events: none; text-align: center; width: max-content; max-width: 132px;
  font: 800 15px/1.08 var(--font-ui); color: #4a2400; padding: 3px 6px 2px; border-radius: 8px; background: rgba(255, 246, 220, 0.55); text-shadow: 0 0 6px rgba(255, 250, 230, 0.9); text-wrap: balance; transition: opacity 0.8s ease; }
.g-pocket-universe .pu-status { position: absolute; z-index: 21; left: 50%; top: 0; transform: translateX(-50%); font: 700 12px/1 var(--font-ui); letter-spacing: 0.14em; text-transform: uppercase; color: #dfe4ff;
  background: rgba(8, 10, 30, 0.8); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 999px; padding: 7px 12px 6px; white-space: nowrap; pointer-events: none; transition: opacity 0.5s ease; }
.g-pocket-universe .pu-status b { color: #7bffb0; font-weight: 800; }
.g-pocket-universe .pu-panel { position: absolute; z-index: 30; left: 12px; right: 12px; bottom: calc(env(safe-area-inset-bottom, 0px) + 12px); display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 20px;
  background: linear-gradient(180deg, rgba(22, 24, 58, 0.95), rgba(10, 11, 32, 0.95)); border: 1px solid rgba(160, 170, 255, 0.26); box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.07);
  transition: opacity 0.5s ease, transform 0.5s ease; color: #eef1ff; }
.g-pocket-universe .pu-panel.gone { opacity: 0; transform: translateY(24px); pointer-events: none; }
.g-pocket-universe .pu-head { display: none; font: 800 12px/1 var(--font-ui); letter-spacing: 0.16em; color: #b9c2ee; padding: 2px 4px 4px; }
.g-pocket-universe .pu-band { position: relative; display: flex; align-items: center; gap: 10px; height: 48px; touch-action: none; cursor: ew-resize; outline: none; border-radius: 12px; }
.g-pocket-universe .pu-band:focus-visible { box-shadow: 0 0 0 2px #fff; }
.g-pocket-universe .pu-name { flex: none; width: 76px; font: 800 12px/1.1 var(--font-ui); letter-spacing: 0.1em; color: var(--c); }
.g-pocket-universe .pu-name small { display: block; margin-top: 3px; font: 600 12px/1 var(--font-ui); letter-spacing: 0.02em; color: #aeb6e0; text-transform: none; }
.g-pocket-universe .pu-scale { position: relative; flex: 1; height: 40px; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.14); box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.6);
  background: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.2) 0 1px, transparent 1px 10px) 0 100% / 100% 34% no-repeat, repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.42) 0 2px, transparent 2px 25%) 0 100% / 100% 60% no-repeat, linear-gradient(180deg, #0b0c22, #17193f); }
.g-pocket-universe .pu-wash { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, var(--c)); opacity: 0.16; pointer-events: none; }
.g-pocket-universe .pu-needle { position: absolute; top: 3px; bottom: 3px; left: 0; width: 4px; margin-left: -2px; border-radius: 2px; background: #fff; box-shadow: 0 0 10px var(--c), 0 0 3px #fff; transform: translateX(var(--x, 0px)); will-change: transform; }
.g-pocket-universe .pu-band.hot .pu-needle { box-shadow: 0 0 16px var(--c), 0 0 6px #fff; }
.g-pocket-universe .pu-pickq { display: flex; align-items: center; justify-content: center; gap: 8px; font: 600 15px/1.2 var(--font-ui); color: #dfe4ff; min-height: 26px; text-align: center; }
.g-pocket-universe .pu-sw { width: 14px; height: 14px; border-radius: 50%; background: var(--c, #fff); box-shadow: 0 0 8px var(--c, #fff); flex: none; }
.g-pocket-universe .pu-pick .gk-chips { gap: 8px; }
.g-pocket-universe .pu-pick .gk-chip { min-height: 48px; padding: 12px 16px; font: 700 15px/1 var(--font-ui); color: #eef1ff; background: rgba(30, 34, 80, 0.9); border-color: rgba(170, 180, 255, 0.35); }
.g-pocket-universe .pu-pick .gk-chip:disabled { opacity: 0.4; cursor: default; }
.g-pocket-universe .pu-ring { position: absolute; z-index: 20; left: 0; top: 0; transform: translate(-50%, -50%); font: 800 12px/1 var(--font-ui); letter-spacing: 0.14em; color: var(--c); background: rgba(8, 10, 30, 0.82);
  border: 1px solid var(--c); border-radius: 999px; padding: 5px 9px 4px; pointer-events: none; opacity: 0; transition: opacity 0.6s ease; white-space: nowrap; }
.g-pocket-universe .pu-ring.on { opacity: 1; }
.g-pocket-universe .pu-final { position: absolute; z-index: 25; left: 50%; top: 0; transform: translate(-50%, 8px); text-align: center; pointer-events: none; opacity: 0; transition: opacity 1.4s ease, transform 1.4s ease; width: max-content; max-width: calc(100% - 32px); }
.g-pocket-universe .pu-final.on { opacity: 1; transform: translate(-50%, 0); }
.g-pocket-universe .pu-final b { display: block; font: 800 clamp(30px, 9cqw, 54px)/1 var(--font-display); letter-spacing: 0.04em; color: #f6f4ff; text-shadow: 0 0 18px rgba(160, 140, 255, 0.85), 0 0 42px rgba(80, 200, 255, 0.45); }
.g-pocket-universe .pu-final .pu-gal { margin-top: 6px; font-weight: 600; letter-spacing: 0.04em; color: #c9d0ff; }
.g-pocket-universe .pu-final span { display: block; margin-top: 10px; font: 700 15px/1.2 var(--font-ui); letter-spacing: 0.08em; color: #e3e7ff; text-shadow: 0 1px 8px rgba(0, 0, 0, 0.8); }
.g-pocket-universe .gk-char.pu-sync .gk-bubble { max-width: min(290px, calc(100cqw - var(--sz) - 44px)); }
@container (min-width: 700px) {
  .g-pocket-universe .pu-panel { left: auto; right: 24px; top: 50%; bottom: auto; width: 340px; transform: translateY(-50%); padding: 16px; }
  .g-pocket-universe .pu-panel.gone { transform: translate(24px, -50%); }
  .g-pocket-universe .pu-head { display: block; }
  .g-pocket-universe .pu-band { height: 58px; }
  .g-pocket-universe .pu-scale { height: 46px; }
  .g-pocket-universe .pu-lab { max-width: 180px; font-size: 16px; }
  .g-pocket-universe .pu-core { max-width: 200px; font-size: 16px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis;
      const inten = ctx.intensity, line = (o) => ctx.line(o);
      const VISITS = K.visits();

      /* ---------------- today's sky and the thoughts in it ---------------- */
      const DAY = K.dailyPick([
        { name: 'Violet Drift', neb: ['#5b3bd6', '#1fb5c9', '#b03fd0'] },
        { name: 'Rose Nebula', neb: ['#d63b7a', '#ff9a5c', '#7a3bd6'] },
        { name: 'Emerald Veil', neb: ['#1fb57a', '#3b7ad6', '#9ad13b'] },
        { name: 'Ice Halo', neb: ['#3bb8d6', '#9fdcff', '#5b6bd6'] },
        { name: 'Amber Dust', neb: ['#d68a3b', '#d63b5b', '#5b3bd6'] },
        { name: 'Aurora Reach', neb: ['#3bd69a', '#7a5bd6', '#3b9ad6'] }
      ], 5);
      const FILL = /^(THAT THING I SAID|TOMORROW.S LIST|WHAT IF IT GOES WRONG|SHOULD.VE DONE BETTER|WHAT THEY THINK|EVERYTHING AT ONCE|THE BIG WORRY)$/;
      const strands = (an.strands || []).filter(s => s && s.label);
      let list = strands.filter(s => !FILL.test(s.label)).concat(strands.filter(s => FILL.test(s.label))).slice(0, [4, 5, 6][inten]);
      if (list.length < 3) list = list.concat([{ label: 'THE TO-DO LIST', loop: 'todo' }, { label: 'THAT CONVERSATION', loop: 'replay' }, { label: 'WHAT HAPPENS NEXT', loop: 'whatif' }]).slice(0, 3);
      const coreLabel = (an.core && an.core.label) || 'EVERYTHING AT ONCE';
      const hash = (s) => Array.from(String(s)).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
      const R0 = K.rng(((K.daily() * 7919) ^ hash(coreLabel)) >>> 0);
      /* the sweet spot moves a little each day and with each player's words; the bands are forgiving */
      const SW = { g: 0.38 + R0() * 0.24, d: 0.42 + R0() * 0.18, s: 0.3 + R0() * 0.2 };
      const BAND = { d: [0.17, 0.15, 0.13][inten], s: [0.18, 0.16, 0.14][inten], gGuide: 0.07 };
      const KN = { g: K.clamp(SW.g + (R0() < 0.5 ? 0.36 : -0.34), 0.04, 0.96), d: 0.05, s: 0.95 };
      const START = Object.assign({}, KN);
      const COLS = ['#ff8a5c', '#5ad1ff', '#b48cff', '#7be08a', '#ffd36b', '#ff6fb1'];
      const RINGS = [{ name: 'TODAY', col: '#ffd36b', note: 'C6' }, { name: 'THIS WEEK', col: '#7fe8ff', note: 'G5' }, { name: 'LATER', col: '#c9a8ff', note: 'C5' }];
      const PL = list.map((s, i) => ({ label: s.label, loop: s.loop, i, col: COLS[i % COLS.length], R: 0, Li: 0, L: 0, r: 0.8, vr: 0, th: 0, stab: 0, locked: false, lastHit: -9, trail: [], ring: -1, prN: 0.07, pr: 12, x: -999, y: -999, flash: 0 }));

      /* ---------------- lines (every vibe) ---------------- */
      const LN = {
        start: { Jolly: 'Whoa, your pocket universe is having a moment! Let’s tune it, nice and slow.', Cheeky: 'Your thoughts are playing bumper cars. In space. Let’s fix that.', Unfiltered: 'Total chaos up here. Grab the controls. Slow and steady.' },
        sFast: { Jolly: 'Everything’s whizzing. Ease TIME down a little.', Cheeky: 'It’s on fast-forward. Slow it down, captain.', Unfiltered: 'Too fast. Turn TIME down.' },
        sSlow: { Jolly: 'They’re stalling. Give TIME a gentle nudge up.', Cheeky: 'Bit sleepy out there. A touch more TIME.', Unfiltered: 'Stalling. More TIME.' },
        dLow: { Jolly: 'See the wobble? A bit more DAMPING smooths it out.', Cheeky: 'Wobbly orbits. Add DAMPING, they’ll stop being dramatic.', Unfiltered: 'Wobbling. More DAMPING.' },
        dHigh: { Jolly: 'Too much DAMPING, they’re sinking. Ease it off a touch.', Cheeky: 'They’re sinking like biscuits in tea. Less DAMPING.', Unfiltered: 'Sinking. Less DAMPING.' },
        gHigh: { Jolly: 'GRAVITY’s too strong, they’re crowding the sun. Ease it off.', Cheeky: 'The sun’s being clingy. Less GRAVITY.', Unfiltered: 'Too much GRAVITY. Turn it down.' },
        gLow: { Jolly: 'GRAVITY’s too weak, they’re drifting off. Turn it up a bit.', Cheeky: 'They’re wandering off. More GRAVITY, please.', Unfiltered: 'Too weak. More GRAVITY.' },
        settle: { Jolly: 'Lovely. Now just watch them settle into their lanes.', Cheeky: 'Hands off. Let them find their lanes.', Unfiltered: 'Good. Wait. Let them settle.' },
        crash: { Jolly: 'Bonk! Two thoughts collided. Keep tuning.', Cheeky: 'Ouch. Thought pile-up.', Unfiltered: 'Crash. Keep going.' },
        first: { Jolly: 'One orbit locked! See the green glow?', Cheeky: 'Look, one’s behaving. Show-off.', Unfiltered: 'One stable. Keep going.' },
        allOk: { Jolly: 'Every thought has its own lane. Listen to that quiet.', Cheeky: 'No crashes. Who knew space could be this chill?', Unfiltered: 'All stable. Nice.' },
        sort: { Jolly: 'Now give each one a ring: today, this week, or later. Tap a planet.', Cheeky: 'Space admin time. Tap a planet: today, this week, or later?', Unfiltered: 'Sort them. Tap a planet, pick a ring.' },
        r0: { Jolly: 'Today, then. Close to the sun.', Cheeky: 'Today. Front of the queue.', Unfiltered: 'Today. Done.' },
        r1: { Jolly: 'This week. A nice middle orbit.', Cheeky: 'This week. Not now, not never.', Unfiltered: 'This week. Fine.' },
        r2: { Jolly: 'Later. It’ll keep, way out there.', Cheeky: 'Later. Off you float.', Unfiltered: 'Later. Parked.' },
        end: { Jolly: 'Look at that. Your whole universe, turning calmly.', Cheeky: 'From bumper cars to a planetarium. Nice work.', Unfiltered: 'Everything in orbit. Done.' }
      };

      /* ---------------- DOM ---------------- */
      /* SOFT: no GPU raster here, so draw at 1x and (below) at half rate; input and audio stay at full rate */
      const SOFT = softwareGfx(), cvOpt = { maxDpr: SOFT ? 1 : 1.5 }, cv = opaqueCanvas(el, cvOpt, S);
      let accDt = 0, frameN = 0;
      /* adaptive pacing on software raster: if the device is starved (many long frames), draw every third frame instead of every second */
      const PACE = { rate: 2, n: 0, slow: 0, calm: 0 };
      function paceTick(rawDt) {
        if (!SOFT) return;
        PACE.n++; if (rawDt > 0.04) PACE.slow++;
        if (PACE.n >= 60) {
          const r = PACE.slow / PACE.n; PACE.n = 0; PACE.slow = 0;
          if (r > 0.08) { PACE.rate = 3; PACE.calm = 0; } else if (r < 0.02 && ++PACE.calm >= 3) PACE.rate = 2;
        }
      }
      const P = K.particles({ max: 420 });
      const core = h('div', { class: 'pu-core gk-user', text: coreLabel });
      const status = h('div', { class: 'pu-status', role: 'status' });
      const labs = PL.map(p => { const l = h('div', { class: 'pu-lab gk-user', text: p.label, style: { '--c': p.col } }); return l; });
      const hits = PL.map(p => { const b = h('button', { type: 'button', class: 'pu-hit', 'aria-label': 'Planet: ' + p.label }); K.tap(b, () => selectPlanet(p)); return b; });
      const ringEls = RINGS.map(r => h('div', { class: 'pu-ring', text: r.name, style: { '--c': r.col } }));
      const finalEl = h('div', { class: 'pu-final', 'aria-live': 'polite' }, h('b', { text: 'EVERYTHING IN ORBIT' }), h('span'), h('span', { class: 'pu-gal', text: VISITS ? 'Your galaxy now holds ' + (VISITS + 1) + ' calm systems' : 'Your galaxy’s first calm system' }));
      // tuning panel: GRAVITY, DAMPING, TIME
      const KNOBS = [
        { k: 'g', name: 'GRAVITY', col: '#ffb547', words: ['feather', 'light', 'steady', 'heavy', 'crushing'] },
        { k: 'd', name: 'DAMPING', col: '#5ad1ff', words: ['slippery', 'loose', 'smooth', 'thick', 'treacle'] },
        { k: 's', name: 'TIME', col: '#b48cff', words: ['crawl', 'slow', 'steady', 'quick', 'frantic'] }
      ];
      const ctrl = h('div', { class: 'pu-panel pu-ctrl', role: 'group', 'aria-label': 'Orbit controls' }, h('div', { class: 'pu-head', text: 'ORBIT CONTROLS · DRAG TO TUNE' }));
      const bands = {}, scales = {}, needles = {}, readouts = {};
      KNOBS.forEach(kn => {
        const small = h('small');
        const needle = h('i', { class: 'pu-needle' }), scale = h('span', { class: 'pu-scale' }, h('i', { class: 'pu-wash' }), needle);
        const band = h('div', { class: 'pu-band', role: 'slider', tabindex: '0', 'aria-label': kn.name, 'aria-valuemin': '0', 'aria-valuemax': '100', style: { '--c': kn.col } }, h('span', { class: 'pu-name' }, kn.name, small), scale);
        bands[kn.k] = band; scales[kn.k] = scale; needles[kn.k] = needle; readouts[kn.k] = small;
        ctrl.append(band);
      });
      const pickSw = h('i', { class: 'pu-sw' }), pickLab = h('span', { class: 'gk-user', text: 'Tap a planet' });
      const pickQ = h('div', { class: 'pu-pickq' }, pickSw, pickLab);
      const pick = h('div', { class: 'pu-panel pu-pick gone', role: 'group', 'aria-label': 'Choose a ring' }, pickQ);
      const chips = K.chips(pick, [{ id: '0', label: 'Today' }, { id: '1', label: 'This week' }, { id: '2', label: 'Later' }], (it) => assign(+it.id), { label: 'Ring' });
      const chipBtns = Array.from(chips.querySelectorAll('button'));
      el.append(core, status, ...ringEls, ...labs, ...hits, finalEl, ctrl, pick);
      const sync = K.character('sync', { side: 'right', mood: 'dizzy', x: 12, y: 66, size: K.phone() ? 62 : 80 });
      sync.el.classList.add('pu-sync');
      const music = K.music('space');
      music.level(0.45);
      let rumble = null;

      /* ---------------- state ---------------- */
      const C = { w: 390, h: 844, phone: true, cx: 195, cx0: 195, cy: 380, lim: 180, rmax: 160, sunR: 34, rin: 0.55, Gs: 0.15, Z: 1, chaos: 1, drawn: 0 };
      let stage = 'intro', simT = 0, selected = null, finished = false, lockCount = 0, rot = 0, sweep = null, ringGlow = [0, 0, 0], galaxyK = 0, lastHint = '', hintAt = -99, saidFirst = false, saidCrash = -99;
      const TUNE = { moved: 0, need: Math.abs(START.g - SW.g) + Math.abs(START.d - SW.d) + Math.abs(START.s - SW.s), touched: -1, hitsAfter: 0, t0: 0 };

      /* ---------------- layout ---------------- */
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        C.w = w; C.h = H; C.phone = w < 700;
        const box = sysBox();
        C.lim = box.lim; C.cx0 = box.cx;
        if (stage !== 'end') { C.cx = box.cx; C.cy = box.cy; }
        C.rmax = C.lim - (C.phone ? 16 : 24); C.sunR = C.phone ? 32 : 44;
        C.rin = (C.sunR + (C.phone ? 48 : 72)) / C.rmax;
        C.Gs = 4 * Math.PI * Math.PI * Math.pow(C.rin, 3) / 49;
        const n = PL.length;
        PL.forEach((p, i) => {
          p.R = C.rin + (1 - C.rin) * (n > 1 ? i / (n - 1) : 0.5);
          p.Li = Math.sqrt(C.Gs * p.R);
          p.pr = (C.phone ? 9 : 14) + (i % 2) * (C.phone ? 2 : 3); p.prN = p.pr / C.rmax;
          if (!p.L) { p.L = p.Li * (0.85 + R0() * 0.3); p.r = p.R * (0.72 + R0() * 0.5); p.vr = (R0() - 0.5) * 0.4; p.th = i * Math.PI * 2 / n + R0() * 0.7; }
        });
        C.sunN = C.sunR / C.rmax;
        placeStatus();
        finalEl.style.top = Math.round(C.phone ? 150 : 150) + 'px';
        buildBg(); buildGalaxy();
        C.drawn = 0;
      }

      function sysBox() {
        const w = C.w, H = C.h;
        if (C.phone) {
          const top = 150, bottom = (ctrl.offsetHeight ? ctrl.offsetTop : H - 200) - 38;
          return { cx: w / 2, cy: (top + bottom) / 2, lim: Math.min(w / 2 - 8, (bottom - top) / 2) };
        }
        const top = 70, bottom = H - 24, right = w - 24 - 340 - 24;
        return { cx: right / 2 + 14, cy: (top + bottom) / 2, lim: Math.min(right / 2 - 10, (bottom - top) / 2) };
      }
      const placeStatus = () => { const below = C.phone && stage !== 'tune' && stage !== 'intro' && pick.offsetHeight; status.style.top = Math.round(below ? pick.offsetTop - 40 : C.cy + C.lim + (C.phone ? 2 : -8)) + 'px'; };
      /* ---------------- the static sky (drawn once per size) ---------------- */
      let bgC = null, galC = null, twinkles = [];
      function buildBg() {
        const w = C.w, H = C.h, dpr = cv.dpr || 1;
        bgC = bgC || document.createElement('canvas');
        bgC.width = Math.round(w * dpr); bgC.height = Math.round(H * dpr);
        const g = bgC.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const D = K.dark();
        let gr = g.createLinearGradient(0, 0, w * 0.3, H);
        gr.addColorStop(0, D ? '#04040e' : '#0d1030'); gr.addColorStop(0.55, D ? '#0b0a24' : '#1a1a4a'); gr.addColorStop(1, D ? '#140a2c' : '#2a1850');
        g.fillStyle = gr; g.fillRect(0, 0, w, H);
        const R = K.rng(hash(DAY.name) + 3);
        // nebula clouds in today's colours
        for (let i = 0; i < 9; i++) {
          const x = w * (0.1 + 0.8 * R()), y = H * (0.1 + 0.8 * R()), rr = Math.max(w, H) * (0.18 + 0.22 * R()), c = DAY.neb[i % 3];
          const ng = g.createRadialGradient(x, y, 0, x, y, rr);
          ng.addColorStop(0, K.hexA(c, D ? 0.2 : 0.26)); ng.addColorStop(0.5, K.hexA(c, D ? 0.07 : 0.1)); ng.addColorStop(1, K.hexA(c, 0));
          g.fillStyle = ng; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
        }
        // dust lane
        g.save(); g.translate(w / 2, H / 2); g.rotate(-0.5);
        const dl = g.createLinearGradient(0, -60, 0, 60); dl.addColorStop(0, 'rgba(0,0,0,0)'); dl.addColorStop(0.5, 'rgba(0,0,0,0.22)'); dl.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = dl; g.fillRect(-w, -60, w * 2, 120); g.restore();
        // stars
        for (let i = 0; i < Math.round(w * H / 900); i++) { const x = R() * w, y = R() * H, s = R() < 0.92 ? 0.6 + R() * 0.8 : 1.4 + R(); g.fillStyle = `rgba(${220 + Math.round(R() * 35)},${220 + Math.round(R() * 35)},255,${0.25 + R() * 0.6})`; g.fillRect(x, y, s, s); }
        twinkles = []; for (let i = 0; i < 36; i++) twinkles.push({ x: R() * w, y: R() * H, s: 1 + R() * 1.6, ph: R() * 6.28, sp: 0.6 + R() * 1.4 });
        const vg = g.createRadialGradient(w / 2, H / 2, Math.min(w, H) * 0.35, w / 2, H / 2, Math.max(w, H) * 0.8);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
        g.fillStyle = vg; g.fillRect(0, 0, w, H);
      }
      /* the galaxy your calm systems belong to: more stars, and one bright home system per earlier visit */
      function buildGalaxy() {
        const D = Math.round(Math.min(C.w * 1.3, C.h * 0.72) * 1.4);
        galC = galC || document.createElement('canvas');
        galC.width = D; galC.height = D;
        const g = galC.getContext('2d'), R = K.rng(4242), c = D / 2;
        g.clearRect(0, 0, D, D);
        const core = g.createRadialGradient(c, c, 0, c, c, D * 0.22);
        core.addColorStop(0, 'rgba(255,240,210,0.55)'); core.addColorStop(0.4, 'rgba(200,170,255,0.2)'); core.addColorStop(1, 'rgba(120,100,255,0)');
        g.fillStyle = core; g.fillRect(0, 0, D, D);
        const arms = 3, n = 2600 + Math.min(VISITS, 20) * 90;
        for (let i = 0; i < n; i++) {
          const a = i % arms, t = Math.pow(R(), 0.6), ang = a * Math.PI * 2 / arms + t * 5.6 + (R() - 0.5) * (i % 5 ? 0.32 : 0.9) * (1 - t * 0.45), rr = t * D * 0.48 + (R() - 0.5) * 12;
          const x = c + Math.cos(ang) * rr, y = c + Math.sin(ang) * rr, s = R() < 0.88 ? 1 + R() * 1.1 : 2 + R() * 1.6;
          const col = t < 0.3 ? `rgba(255,${230 + Math.round(R() * 25)},${200 + Math.round(R() * 40)},` : R() < 0.5 ? `rgba(${150 + Math.round(R() * 60)},${190 + Math.round(R() * 50)},255,` : K.hexA(DAY.neb[a % 3], 1).replace(/,1\)$/, ',');
          g.fillStyle = col + (0.5 + R() * 0.5).toFixed(2) + ')'; g.fillRect(x, y, s, s);
        }
        for (let a = 0; a < arms; a++) for (let k = 0; k < 7; k++) {
          const t = 0.15 + k * 0.12, ang = a * Math.PI * 2 / arms + t * 5.6, rr = t * D * 0.48, x = c + Math.cos(ang) * rr, y = c + Math.sin(ang) * rr, br = D * (0.06 + 0.03 * R());
          const ng = g.createRadialGradient(x, y, 0, x, y, br); ng.addColorStop(0, K.hexA(DAY.neb[(a + k) % 3], 0.32)); ng.addColorStop(1, K.hexA(DAY.neb[(a + k) % 3], 0));
          g.fillStyle = ng; g.fillRect(x - br, y - br, br * 2, br * 2);
        }
        const homes = Math.min(VISITS, 24), RH = K.rng(99);
        for (let i = 0; i < homes; i++) {
          const a = i % arms, t = 0.25 + RH() * 0.6, ang = a * Math.PI * 2 / arms + t * 5.6, rr = t * D * 0.48, x = c + Math.cos(ang) * rr, y = c + Math.sin(ang) * rr;
          const hg = g.createRadialGradient(x, y, 0, x, y, 9); hg.addColorStop(0, 'rgba(255,250,230,0.95)'); hg.addColorStop(1, 'rgba(255,230,180,0)');
          g.fillStyle = hg; g.fillRect(x - 9, y - 9, 18, 18);
          g.strokeStyle = 'rgba(160,240,200,0.7)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 5.5, 0, Math.PI * 2); g.stroke();
        }
      }

      /* ---------------- physics: a real little solar system ---------------- */
      function params() {
        const G = C.Gs * Math.pow(2, (KN.g - SW.g) * 1.05);
        const c = 0.05 + 2.3 * Math.pow(KN.d, 1.25);
        const s = Math.pow(2, (KN.s - SW.s) * 2.3);
        const lowD = Math.max(0, (SW.d - BAND.d) - KN.d), highD = Math.max(0, KN.d - (SW.d + BAND.d));
        const fast = Math.max(0, KN.s - (SW.s + BAND.s)), slow = Math.max(0, (SW.s - BAND.s) - KN.s);
        return { G, c, s, sigma: 0.012 * (1 + 7 * lowD + 6 * fast), drag: 1.7 * highD + 1.5 * slow };
      }
      const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 2;
      let lastHitSnd = 0;
      function hit(a, b, nx, ny) {
        const now = performance.now();
        a.lastHit = b.lastHit = simT;
        const x = C.cx + nx * C.rmax * C.Z, y = C.cy + ny * C.rmax * C.Z;
        if (now - lastHitSnd > 70) {
          lastHitSnd = now;
          P.emit('spark', x, y, 10, { colors: [a.col, b.col, '#ffffff'], speed: [60, 220] });
          if (A.ctx) { const pan = K.clamp((x - C.cx) / (C.rmax || 1), -1, 1) * 0.7; A.noise({ filter: 'bandpass', freq: 2400 + Math.random() * 600, q: 3, dur: 0.06, vol: 0.08, pan }); A.tone({ type: 'triangle', freq: 340, to: 150, glide: 0.08, dur: 0.1, vol: 0.05, pan }); }
        }
        if (TUNE.touched >= 0 && simT - TUNE.touched > 4) TUNE.hitsAfter++;
        if (stage === 'tune' && simT - saidCrash > 14 && Math.random() < 0.5) { saidCrash = simT; say('crash', 'surprised'); }
      }
      function sunHit(p) {
        p.lastHit = simT;
        const x = C.cx + Math.cos(p.th) * p.r * C.rmax * C.Z, y = C.cy + Math.sin(p.th) * p.r * C.rmax * C.Z;
        P.emit('ember', x, y, 6, { colors: ['#ffb347', '#ff7a3d', '#fff0b0'], speed: [30, 90] });
        if (A.ctx && performance.now() - lastHitSnd > 90) { lastHitSnd = performance.now(); A.noise({ filter: 'lowpass', freq: 520, dur: 0.3, vol: 0.09 }); }
      }
      function physics(dt) {
        const pr = params(), h = Math.min(dt, 0.05) * pr.s, n = 3, hs = h / n, sq = Math.sqrt(hs), keep = worstKnob() ? 0.1 : 0.8;
        for (let k = 0; k < n; k++) {
          for (const p of PL) {
            let ar = p.L * p.L / (p.r * p.r * p.r) - pr.G / (p.r * p.r) - pr.c * p.vr + keep * (p.R - p.r);
            if (p.r > 1.1) ar -= 9 * (p.r - 1.1);
            p.vr += ar * hs + pr.sigma * sq * gauss();
            p.r += p.vr * hs;
            p.L += (0.7 * (p.Li - p.L) - pr.drag * p.L) * hs;
            p.th += (p.L / (p.r * p.r)) * hs;
            const minR = C.sunN + p.prN;
            if (p.r < minR) { p.r = minR; p.vr = Math.abs(p.vr) * 0.5 + 0.12; sunHit(p); }
            if (!(p.r > 0.02 && p.r < 5) || !isFinite(p.vr) || !isFinite(p.L) || !isFinite(p.th)) { p.r = p.R || 0.7; p.vr = 0; p.L = p.Li || 0.3; p.th = isFinite(p.th) ? p.th : 0; }
            p.vr = K.clamp(p.vr, -3, 3);
          }
          for (let i = 0; i < PL.length; i++) for (let j = i + 1; j < PL.length; j++) {
            const a = PL[i], b = PL[j], ax = a.r * Math.cos(a.th), ay = a.r * Math.sin(a.th), bx = b.r * Math.cos(b.th), by = b.r * Math.sin(b.th);
            const d = Math.hypot(ax - bx, ay - by), min = a.prN + b.prN;
            if (d < min) {
              const out = a.r >= b.r ? a : b, inn = out === a ? b : a, push = (min - d) * 0.5;
              out.vr = Math.abs(out.vr) * 0.6 + 0.07; inn.vr = -Math.abs(inn.vr) * 0.6 - 0.07; out.r += push; inn.r = Math.max(C.sunN + inn.prN, inn.r - push);
              hit(a, b, (ax + bx) / 2, (ay + by) / 2);
            }
          }
        }
        simT += h;
        return h;
      }
      /* thoughts keep a little personal space: planets on nearby lanes that drift close in angle ease apart */
      function spacing(h) {
        const calm = worstKnob() ? 0.3 : 1, gap = Math.min(0.75, Math.PI * 2 / PL.length * 0.6);
        for (let i = 0; i < PL.length; i++) for (let j = i + 1; j < PL.length; j++) {
          const a = PL[i], b = PL[j]; if (Math.abs(a.r - b.r) > 0.36) continue;
          let d = a.th - b.th; d = Math.atan2(Math.sin(d), Math.cos(d));
          if (Math.abs(d) < gap) { const push = (gap - Math.abs(d)) * 1.3 * calm * h * Math.sign(d || 1); a.th += push; b.th -= push; }
        }
      }
      /* orrery mode: every planet sits exactly on its track and the whole system turns together, evenly spaced */
      function orrery(dt) {
        rot += dt * (Math.PI * 2 / 46);
        const ringR = [C.rin, (C.rin + 1) / 2, 1], n = PL.length;
        PL.forEach(p => {
          const tr = p.ring >= 0 ? ringR[p.ring] : p.R, ta = rot + (p.slot || 0) * Math.PI * 2 / n;
          let d = ta - p.th; d = Math.atan2(Math.sin(d), Math.cos(d));
          p.th += d * Math.min(1, dt * 1.4) + dt * (Math.PI * 2 / 46);
          p.r += (tr - p.r) * Math.min(1, dt * 1.8); p.vr = 0;
        });
        simT += dt;
      }

      /* ---------------- tuning bands ---------------- */
      let lastDet = { g: -1, d: -1, s: -1 }, lastDetAt = 0;
      function setKnob(k, u, fromUser) {
        u = K.clamp(u, 0, 1);
        const du = Math.abs(u - KN[k]);
        if (du < 1e-4) return;
        if (fromUser) { TUNE.moved += du; if (TUNE.touched < 0) TUNE.touched = simT; }
        KN[k] = u;
        renderKnob(k);
        const det = Math.floor(u * 40), now = performance.now();
        if (fromUser && det !== lastDet[k] && now - lastDetAt > 28 && A.ctx) {
          lastDetAt = now;
          if (k === 'g') A.tone({ type: 'sine', freq: 80 + u * 170, dur: 0.07, vol: 0.07, attack: 0.004 });
          else if (k === 'd') A.noise({ filter: 'bandpass', freq: 500 + u * 1900, q: 5, dur: 0.045, vol: 0.06 });
          else A.tone({ type: 'triangle', freq: 1100 + u * 1000, dur: 0.025, vol: 0.035 });
        }
        lastDet[k] = det;
      }
      function renderKnob(k) {
        const sc = scales[k], kn = KNOBS.find(x => x.k === k), u = KN[k];
        needles[k].style.setProperty('--x', (u * (sc.clientWidth || 200)).toFixed(1) + 'px');
        const word = kn.words[Math.min(4, Math.floor(u * 5))];
        if (readouts[k].textContent !== word) readouts[k].textContent = word;
        bands[k].setAttribute('aria-valuenow', String(Math.round(u * 100)));
        bands[k].setAttribute('aria-valuetext', word);
      }
      KNOBS.forEach(({ k }) => {
        const band = bands[k], sc = scales[k];
        const uAt = (p) => (p.x - sc.offsetLeft) / Math.max(1, sc.offsetWidth);
        K.drag(band, {
          start: (p) => { if (stage !== 'tune') return false; K.sfx.tap(); band.classList.add('hot'); setKnob(k, uAt(p), true); },
          move: (p) => setKnob(k, uAt(p), true),
          end: () => band.classList.remove('hot')
        });
        S.listen(band, 'keydown', (e) => { if (stage !== 'tune') return; if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setKnob(k, KN[k] + 0.02, true); } if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setKnob(k, KN[k] - 0.02, true); } });
      });
      function worstKnob() {
        const rows = [['s', KN.s - SW.s, BAND.s], ['d', KN.d - SW.d, BAND.d], ['g', KN.g - SW.g, BAND.gGuide]];
        for (const [k, delta, band] of rows) if (Math.abs(delta) > band) return { k, dir: delta > 0 ? -1 : 1, delta };
        return null;
      }
      const HINT = { s: ['sSlow', 'sFast'], d: ['dLow', 'dHigh'], g: ['gLow', 'gHigh'] };
      const GLABEL = { s: ['SPEED TIME UP', 'SLOW TIME DOWN'], d: ['ADD DAMPING', 'LESS DAMPING'], g: ['MORE GRAVITY', 'LESS GRAVITY'] };
      let guideKey = '';
      function tuneGuide(force) {
        const wk = worstKnob(), key = wk ? wk.k + wk.dir : 'settle';
        if (key === guideKey && !force) return;
        guideKey = key;
        if (wk) {
          const sc = scales[wk.k], band = bands[wk.k], bw = band.clientWidth || 300;
          const ox = (sc.offsetLeft + KN[wk.k] * sc.offsetWidth) / bw;
          K.guide({ id: 'tune-' + key, g: 'drag', dir: wk.dir > 0 ? 'r' : 'l', d: Math.round(Math.min(110, Math.abs(wk.delta) * sc.offsetWidth)), target: band, ox, label: GLABEL[wk.k][wk.dir > 0 ? 0 : 1], delay: force ? 900 : 1600 });
          if (simT - hintAt > 7 && lastHint !== key) { hintAt = simT; lastHint = key; say(HINT[wk.k][wk.dir > 0 ? 0 : 1], 'think'); }
        } else {
          K.guide({ id: 'settle', g: 'still', target: status, label: 'WATCH THEM SETTLE', place: 'above', delay: 1200 });
          if (lastHint !== 'settle') { lastHint = 'settle'; hintAt = simT; say('settle', 'calm'); }
        }
      }
      function say(key, mood, ms) { sync.say(line(LN[key]), { mood, moodMs: 1800, ms }); }

      /* ---------------- locking orbits (chimes land on the music's beat) ---------------- */
      function nextBeat(div) {
        if (!A.ctx || !(music.next > 0)) return A.now();
        const spb = 60 / music.bpm / (div || 4), now = A.now();
        let t = music.next; while (t - spb > now) t -= spb;
        return t < now + 0.01 ? t + spb : t;
      }
      const PENTA = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6'];
      function lock(p) {
        p.locked = true; lockCount++;
        labs[p.i].classList.add('ok');
        const when = nextBeat(4);
        p.flashAt = when;
        if (A.ctx) { A.chime(A.note(PENTA[Math.min(PENTA.length - 1, lockCount)]), { when, vol: 0.09, dur: 1.8 }); A.sync('chime', performance.now(), when); }
        if (!saidFirst) { saidFirst = true; say('first', 'happy'); sync.react('bounce'); }
      }
      function unlock(p) { p.locked = false; labs[p.i].classList.remove('ok'); }

      /* ---------------- sorting into rings ---------------- */
      function selectPlanet(p) {
        if (stage !== 'sort' || p.ring >= 0) return;
        K.sfx.pop();
        selected = p;
        labs.forEach((l, i) => l.classList.toggle('sel', i === p.i));
        pickSw.style.setProperty('--c', p.col);
        pickLab.textContent = p.label;
        chipBtns.forEach(b => { b.disabled = false; b.setAttribute('aria-pressed', 'false'); });
        p.flash = 1;
        K.guide({ id: 'ring-' + p.i, g: 'choose', target: () => chipBtns, label: 'PICK ITS RING', delay: 700 });
      }
      function assign(k) {
        if (stage !== 'sort' || !selected) return;
        const p = selected; selected = null;
        p.ring = k;
        labs[p.i].classList.remove('sel'); labs[p.i].classList.add('done'); labs[p.i].style.setProperty('--c', RINGS[k].col);
        hits[p.i].disabled = true;
        ringGlow[k] = 1;
        if (A.ctx) { const when = nextBeat(4); A.chime(A.note(RINGS[k].note), { when, vol: 0.1, dur: 2 }); A.whoosh({ vol: 0.06, dur: 0.5 }); }
        say('r' + k, k === 0 ? 'determined' : k === 1 ? 'happy' : 'calm');
        chipBtns.forEach(b => { b.disabled = true; b.setAttribute('aria-pressed', 'false'); });
        const left = PL.filter(q => q.ring < 0);
        updateStatus();
        if (!left.length) { K.later(finale, 1400); return; }
        pickSw.style.setProperty('--c', '#ffffff'); pickLab.textContent = 'Tap the next planet';
        sortGuide();
        ctx.track('ring', { ring: k });
      }
      function sortGuide() {
        const next = PL.find(q => q.ring < 0);
        if (next) K.guide({ id: 'tap-' + next.i, g: 'tap', target: () => hits[next.i], label: 'TAP A PLANET', delay: 900 });
      }
      function updateStatus() {
        if (stage === 'tune') status.innerHTML = 'Stable orbits <b>' + PL.filter(p => p.locked).length + '/' + PL.length + '</b>';
        else if (stage === 'sort') status.innerHTML = 'Sorted <b>' + PL.filter(p => p.ring >= 0).length + '/' + PL.length + '</b>';
      }

      /* ---------------- steps ---------------- */
      async function toSort() {
        stage = 'settle';
        K.guide(null);
        const order = PL.slice().sort((a, b) => (((a.th % 6.2832) + 6.2832) % 6.2832) - (((b.th % 6.2832) + 6.2832) % 6.2832));
        order.forEach((p, k) => { p.slot = k; });
        rot = order[0].th;
        say('allOk', 'happy');
        sync.react('bounce'); K.sfx.great();
        ctrl.classList.add('gone');
        status.innerHTML = '<b>All orbits stable</b>';
        P.emit('star', C.cx, C.cy, 18, { colors: ['#ffffff', '#7bffb0', '#ffe08a'], speed: [60, 200] });
        ctx.track('stable', { seconds: Math.round(simT), moved: Math.round(TUNE.moved * 100) });
        await K.sleep(1600);
        stage = 'sort';
        ringEls.forEach(r => r.classList.add('on'));
        pick.classList.remove('gone');
        placeStatus();
        chipBtns.forEach(b => { b.disabled = true; });
        updateStatus();
        say('sort', 'idea', 5200);
        sortGuide();
      }
      async function finale() {
        if (stage === 'end') return;
        stage = 'end';
        K.guide(null);
        pick.classList.add('gone'); status.style.opacity = '0';
        sync.base('calm');
        // the rings light up, inner to outer
        for (let k = 0; k < 3; k++) { ringGlow[k] = 1.6; if (A.ctx) A.chime(A.note(RINGS[k].note), { vol: 0.08, dur: 2.4 }); await K.sleep(360); }
        // a sweep of light goes once round the sun, and each planet chimes as it is reached
        sweep = { a: -Math.PI / 2, rang: new Set() };
        if (A.ctx) { A.pad(['A3', 'E4', 'A4', 'C#5'].map(n => A.note(n)), { dur: 7, vol: 0.14, attack: 0.8 }); A.sync('finale', performance.now()); }
        await K.sleep(2700);
        sweep = null;
        // the camera pulls back: your system becomes one bright point in a slowly turning galaxy
        labs.forEach(l => { l.style.opacity = '0'; }); core.style.opacity = '0'; ringEls.forEach(r => r.classList.remove('on'));
        say('end', 'moon', 0);
        const counts = [0, 1, 2].map(k => PL.filter(p => p.ring === k).length);
        finalEl.querySelector('span:not(.pu-gal)').textContent = 'Today ' + counts[0] + ' · This week ' + counts[1] + ' · Later ' + counts[2];
        const cy0 = C.cy, cyEnd = C.h * (C.phone ? 0.58 : 0.56);
        await K.anim(3200, (k) => { galaxyK = k; C.Z = K.lerp(1, 0.34, k); C.cx = K.lerp(C.cx0, C.w / 2, k); C.cy = K.lerp(cy0, cyEnd, k); }, K.ease.inOutCubic);
        finalEl.classList.add('on');
        if (A.ctx) ['E5', 'A5', 'C#6', 'E6'].forEach((n, i) => A.chime(A.note(n), { when: A.now() + i * 0.14, vol: 0.06, dur: 2 }));
        // mastery: deliberate, smooth tuning (no frantic back-and-forth) and few pile-ups once you start
        const smooth = K.clamp(TUNE.need / Math.max(TUNE.need, TUNE.moved, 0.01), 0, 1), pct = Math.round(smooth * 100);
        const tier = K.tier(0.7 * smooth + 0.3 * Math.max(0, 1 - TUNE.hitsAfter / 12));
        const best = TUNE.moved > 0 ? K.best('smooth', pct, 'higher') : { isNew: false };
        const col = K.collect(DAY.name);
        const badges = [tier ? tier + ' engineer' : 'Space engineer', best.isNew ? 'New best: ' + pct + '% smooth tuning' : null, col.isNew ? 'Collected: ' + DAY.name : null, TUNE.hitsAfter <= 2 ? 'No pile-ups' : PL.length + ' calm orbits'].filter(Boolean).slice(0, 4);
        ctx.track('universe_end', { planets: PL.length, today: counts[0], week: counts[1], later: counts[2], smooth: pct, hits: TUNE.hitsAfter });
        await K.sleep(2600);
        finished = true;
        ctx.finish({
          title: 'Everything in orbit', mood: 'moon',
          lines: [PL.length + ' thoughts in steady orbits', 'Today ' + counts[0] + ' · This week ' + counts[1] + ' · Later ' + counts[2], pct + '% smooth tuning'],
          badges,
          share: 'Tuned a chaotic pocket universe into ' + PL.length + ' calm orbits.'
        });
      }

      /* ---------------- render ---------------- */
      function sx(p) { return C.cx + Math.cos(p.th) * p.r * C.rmax * C.Z; }
      function sy(p) { return C.cy + Math.sin(p.th) * p.r * C.rmax * C.Z; }
      function drawSun(g, t) {
        const s = C.sunR * (0.6 + 0.4 * C.Z) * (1 + 0.03 * Math.sin(t * 2) + C.chaos * 0.06 * Math.sin(t * 9)), x = C.cx, y = C.cy, ch = C.chaos;
        const gl = g.createRadialGradient(x, y, s * 0.4, x, y, s * 3.6);
        gl.addColorStop(0, `rgba(255,${Math.round(225 - 70 * ch)},${Math.round(150 - 80 * ch)},0.55)`); gl.addColorStop(0.45, `rgba(255,${Math.round(170 - 60 * ch)},80,0.16)`); gl.addColorStop(1, 'rgba(255,140,60,0)');
        g.fillStyle = gl; g.fillRect(x - s * 3.6, y - s * 3.6, s * 7.2, s * 7.2);
        g.save(); g.translate(x, y); g.rotate(t * 0.08);
        g.fillStyle = `rgba(255,${Math.round(220 - 80 * ch)},140,${0.16 + 0.2 * ch})`;
        for (let i = 0; i < 14; i++) { const a = i * Math.PI * 2 / 14, l = s * (1.45 + 0.22 * Math.sin(t * 1.3 + i * 1.7) + ch * 0.7 * Math.abs(Math.sin(t * 5 + i))); g.beginPath(); g.moveTo(Math.cos(a - 0.12) * s, Math.sin(a - 0.12) * s); g.lineTo(Math.cos(a) * l, Math.sin(a) * l); g.lineTo(Math.cos(a + 0.12) * s, Math.sin(a + 0.12) * s); g.closePath(); g.fill(); }
        g.restore();
        const cg = g.createRadialGradient(x - s * 0.3, y - s * 0.3, s * 0.1, x, y, s);
        cg.addColorStop(0, '#fffdf2'); cg.addColorStop(0.5, '#ffe08a'); cg.addColorStop(1, ch > 0.5 ? '#ff7a3d' : '#ffb347');
        g.fillStyle = cg; g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
      }
      function beatPos(t) {
        if (A.ctx && music.next > 0) { const now = A.now() - A.latency(); return music.beat - (music.next - now) * music.bpm / 60; }
        return t * (music.bpm || 56) / 60;
      }
      function drawTracks(g, t) {
        const Z = C.Z, beat = Math.pow(1 - (((beatPos(t) % 1) + 1) % 1), 2);
        if (stage === 'tune' || stage === 'intro' || stage === 'settle') {
          g.setLineDash([3, 7]); g.lineWidth = 1.2;
          PL.forEach(p => { g.strokeStyle = p.locked ? `rgba(123,255,176,${(0.42 + 0.3 * beat).toFixed(3)})` : K.hexA(p.col, 0.22 + 0.22 * beat); g.beginPath(); g.arc(C.cx, C.cy, p.R * C.rmax * Z, 0, Math.PI * 2); g.stroke(); });
          g.setLineDash([]);
        } else {
          const ringR = [C.rin, (C.rin + 1) / 2, 1];
          ringR.forEach((r, k) => {
            const glow = ringGlow[k], col = RINGS[k].col, R = r * C.rmax * Z;
            g.strokeStyle = K.hexA(col, 0.1 + 0.08 * beat + 0.18 * Math.min(1, glow)); g.lineWidth = 10 * Z + 4 * glow; g.beginPath(); g.arc(C.cx, C.cy, R, 0, Math.PI * 2); g.stroke();
            g.strokeStyle = K.hexA(col, 0.55 + 0.35 * Math.min(1, glow)); g.lineWidth = 1.6; g.stroke();
          });
        }
      }
      function drawPlanet(g, p, t) {
        const x = sx(p), y = sy(p), r = p.pr * (0.55 + 0.45 * C.Z);
        p.x = x; p.y = y;
        // trail
        const tr = p.trail;
        if (tr.length > 2) {
          g.lineCap = 'round'; g.lineJoin = 'round';
          const n = tr.length, chunks = 3;
          for (let c = 0; c < chunks; c++) {
            const a = Math.floor(n * c / chunks), b = Math.min(n - 1, Math.floor(n * (c + 1) / chunks) + 1);
            g.strokeStyle = K.hexA(p.col, 0.08 + c * 0.14); g.lineWidth = (1 + c * 0.9) * (0.6 + 0.4 * C.Z);
            g.beginPath();
            for (let i = a; i <= b; i++) { const q = tr[i], px = C.cx + q[0] * C.rmax * C.Z, py = C.cy + q[1] * C.rmax * C.Z; if (i === a) g.moveTo(px, py); else g.lineTo(px, py); }
            g.stroke();
          }
        }
        // stability halo
        if (stage === 'tune' || stage === 'settle') {
          const k = Math.min(1, p.stab / 3);
          g.lineWidth = 2.4; g.strokeStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.arc(x, y, r + 6, 0, Math.PI * 2); g.stroke();
          if (k > 0.02) { g.strokeStyle = p.locked ? '#7bffb0' : `rgba(200,255,225,${0.5 + 0.4 * k})`; g.beginPath(); g.arc(x, y, r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); g.stroke(); }
          if (p.locked) { const hg = g.createRadialGradient(x, y, r, x, y, r + 16); hg.addColorStop(0, 'rgba(123,255,176,0.32)'); hg.addColorStop(1, 'rgba(123,255,176,0)'); g.fillStyle = hg; g.fillRect(x - r - 16, y - r - 16, (r + 16) * 2, (r + 16) * 2); }
        }
        // the planet, lit from the sun
        const lx = Math.cos(p.th), ly = Math.sin(p.th);
        const pg = g.createRadialGradient(x - lx * r * 0.45, y - ly * r * 0.45, r * 0.1, x, y, r * 1.05);
        pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.25, p.col); pg.addColorStop(1, '#0b0820');
        g.fillStyle = pg; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        g.strokeStyle = K.hexA(p.col, 0.55); g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r + 1.2, 0, Math.PI * 2); g.stroke();
        if (p.i % 3 === 2) { g.strokeStyle = K.hexA('#ffe8c4', 0.75); g.lineWidth = 1.6; g.beginPath(); g.ellipse(x, y, r * 1.7, r * 0.5, -0.4, 0, Math.PI * 2); g.stroke(); }
        if (p.i % 3 === 1) { const ma = t * 1.8 + p.i; g.fillStyle = '#d9dcef'; g.beginPath(); g.arc(x + Math.cos(ma) * r * 1.8, y + Math.sin(ma) * r * 1.8, Math.max(1.5, r * 0.22), 0, Math.PI * 2); g.fill(); }
        // flash (lock, select, sweep)
        if (p.flashAt && A.ctx && A.now() >= p.flashAt) { p.flash = 1; p.flashAt = 0; P.emit('star', x, y, 8, { colors: ['#ffffff', '#7bffb0'], speed: [40, 130] }); }
        if (p.flash > 0) { g.fillStyle = `rgba(255,255,255,${(p.flash * 0.5).toFixed(3)})`; g.beginPath(); g.arc(x, y, r + 10 * p.flash, 0, Math.PI * 2); g.fill(); }
      }
      function placeLabels() {
        const Z = C.Z, rmx = C.rmax;
        PL.forEach((p, i) => {
          const lab = labs[i], w = lab.__w || (lab.__w = lab.offsetWidth || 100), hh = lab.__h || (lab.__h = lab.offsetHeight || 22);
          const r = p.pr * (0.55 + 0.45 * Z) + 7;
          // labels sit on the side of the planet away from the sun (never over the planet or the sun's label);
          // near a screen edge they flip above or below the planet instead
          const ox = Math.cos(p.th), oy = Math.sin(p.th);
          let x = p.x + ox * (r + w / 2) - w / 2, y = p.y + oy * (r + hh / 2) - hh / 2;
          if (x < 6 || x + w > C.w - 6) { x = K.clamp(p.x - w / 2, 6, C.w - w - 6); y = oy < 0 ? p.y - r - hh : p.y + r; }
          y = K.clamp(y, 64, C.h - hh - 6);
          lab.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
          hits[i].style.transform = 'translate3d(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px,0)';
          void rmx;
        });
        core.style.left = C.cx + 'px'; core.style.top = C.cy + 'px';
        const ringR = [C.rin, (C.rin + 1) / 2, 1];
        ringEls.forEach((r, k) => { r.style.left = C.cx + 'px'; r.style.top = (C.cy - ringR[k] * C.rmax * C.Z) + 'px'; });
      }

      let lastStatus = -1, guideTick = 0;
      const comet = { t: 6, x: 0, y: 0, vx: 0, vy: 0, on: false };
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !bgC) return;
        if (stage === 'intro' && C.drawn > 1) return;
        accDt += dt; paceTick(dt);
        if (SOFT && (++frameN % PACE.rate) && C.drawn > 2) return;
        dt = Math.min(0.1, accDt); accDt = 0;
        C.drawn++;
        // simulate
        if (stage === 'tune' || stage === 'intro') spacing(physics(stage === 'intro' ? dt * 0.6 : dt));
        else orrery(dt);
        // trails and stability
        PL.forEach(p => {
          p.trail.push([Math.cos(p.th) * p.r, Math.sin(p.th) * p.r]);
          const maxT = stage === 'end' ? 26 : 44;
          while (p.trail.length > maxT) p.trail.shift();
          p.flash = Math.max(0, p.flash - dt * 2.2);
          if (stage === 'tune') {
            const hS = dt * params().s;
            const on = Math.abs(p.r - p.R) < 0.1 * p.R && Math.abs(p.vr) < 0.07 && simT - p.lastHit > 1.2;
            p.stab = on ? Math.min(3.4, p.stab + hS) : Math.max(0, p.stab - hS * 2.5);
            if (!p.locked && p.stab >= 3) lock(p);
            if (p.locked && p.stab < 1.2) unlock(p);
          }
        });
        if (stage === 'tune') {
          const nl = PL.filter(p => p.locked).length;
          if (nl !== lastStatus) { lastStatus = nl; updateStatus(); }
          if (nl === PL.length) toSort();
          if ((guideTick += dt) > 0.5) { guideTick = 0; tuneGuide(false); }
        }
        // chaos: how far the system is from calm
        let ch = 0; PL.forEach(p => { ch += Math.min(1, Math.abs(p.r - p.R) / (0.35 * p.R) + Math.abs(p.vr) * 1.4 + (simT - p.lastHit < 1 ? 0.6 : 0)); });
        ch = stage === 'tune' || stage === 'intro' ? ch / PL.length : 0;
        C.chaos += (ch - C.chaos) * Math.min(1, dt * 1.5);
        if (!rumble && A.ctx) { rumble = A.loop({ pink: true, filter: 'lowpass', freq: 160, q: 0.6, bus: 'amb' }); S.onDestroy(() => { if (rumble) rumble.stop(); }); }
        if (rumble) { rumble.level(0.0001 + C.chaos * 0.16, 0.2); rumble.freq(110 + C.chaos * 300, 0.3); }
        if (stage !== 'end') music.level(0.32 + 0.2 * (1 - C.chaos));
        ringGlow = ringGlow.map(v => Math.max(0, v - dt * 0.5));
        // draw
        g.drawImage(bgC, 0, 0, C.w, C.h);
        if (VISITS >= 1 && !K.reduced()) {
          comet.t -= dt;
          if (comet.t <= 0) { comet.t = 11 + Math.random() * 8; comet.x = -40; comet.y = C.h * (0.08 + Math.random() * 0.3); comet.vx = 260 + Math.random() * 120; comet.vy = 70 + Math.random() * 50; comet.on = true; }
          if (comet.on) {
            comet.x += comet.vx * dt; comet.y += comet.vy * dt;
            const cg = g.createLinearGradient(comet.x, comet.y, comet.x - comet.vx * 0.35, comet.y - comet.vy * 0.35);
            cg.addColorStop(0, 'rgba(230,245,255,0.9)'); cg.addColorStop(1, 'rgba(160,200,255,0)');
            g.strokeStyle = cg; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(comet.x, comet.y); g.lineTo(comet.x - comet.vx * 0.35, comet.y - comet.vy * 0.35); g.stroke();
            if (comet.x > C.w + 60) comet.on = false;
          }
        }
        twinkles.forEach(s => { const a = 0.25 + 0.6 * Math.pow(0.5 + 0.5 * Math.sin(t * s.sp + s.ph), 3); g.fillStyle = `rgba(235,240,255,${a.toFixed(2)})`; g.fillRect(s.x, s.y, s.s, s.s); });
        if (galaxyK > 0 && galC) {
          const D = galC.width, fit = 1 / 1.4, sc = K.lerp(fit * 3.2, fit, galaxyK);
          g.save(); g.globalAlpha = Math.min(1, galaxyK * 1.4); g.translate(C.cx, C.cy); g.rotate(t * 0.04); g.scale(sc, sc * 0.92);
          g.drawImage(galC, -D / 2, -D / 2); g.restore(); g.globalAlpha = 1;
        }
        drawTracks(g, t);
        drawSun(g, t);
        if (sweep) {
          sweep.a += (Math.PI * 2 / 2.5) * dt;
          const len = 1.08 * C.rmax * C.Z, a = sweep.a;
          const sgr = g.createLinearGradient(C.cx, C.cy, C.cx + Math.cos(a) * len, C.cy + Math.sin(a) * len);
          sgr.addColorStop(0, 'rgba(255,250,220,0.5)'); sgr.addColorStop(1, 'rgba(255,250,220,0)');
          g.fillStyle = sgr; g.beginPath(); g.moveTo(C.cx, C.cy); g.arc(C.cx, C.cy, len, a - 0.22, a); g.closePath(); g.fill();
          PL.forEach(p => {
            let d = a - p.th; d = Math.atan2(Math.sin(d), Math.cos(d));
            if (d >= 0 && d < 0.25 && !sweep.rang.has(p.i)) { sweep.rang.add(p.i); p.flash = 1; if (A.ctx) A.chime(A.note(RINGS[Math.max(0, p.ring)].note), { vol: 0.09, dur: 1.8 }); P.emit('star', p.x, p.y, 6, { colors: ['#ffffff', RINGS[Math.max(0, p.ring)].col], speed: [30, 100] }); }
          });
        }
        PL.forEach(p => drawPlanet(g, p, t));
        P.update(dt); P.draw(g);
        placeLabels();
      });

      /* ---------------- start ---------------- */
      cv.onResize(() => { layout(); KNOBS.forEach(({ k }) => renderKnob(k)); });
      S.on('theme', () => buildBg());
      (async () => {
        await K.intro({ title: 'Pocket Universe', sub: 'Your thoughts are planets crashing round one big worry. You’re the engineer. Tune the physics until each holds its own orbit.', how: 'Drag the three tuning bands, slowly.', char: 'sync', mood: 'moon' });
        layout(); KNOBS.forEach(({ k }) => renderKnob(k));
        stage = 'tune';
        say('start', 'dizzy', 4200);
        sync.react('glitch');
        updateStatus();
        K.later(() => tuneGuide(true), 600);
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = performance.now(); while (!fn() && performance.now() - t0 < (ms || 60000)) await K.wait(30); };
          const dragTo = async (k, u) => {
            const b = bands[k], sc = scales[k], y = b.clientHeight / 2;
            await K.sim.drag(b, { x: sc.offsetLeft + KN[k] * sc.offsetWidth, y }, { x: sc.offsetLeft + u * sc.offsetWidth, y }, 1100, 26);
          };
          await until(() => stage === 'tune');
          await K.wait(1200);
          for (const k of ['s', 'd', 'g']) { await dragTo(k, SW[k]); await K.wait(450); }
          await until(() => stage !== 'tune', 26000);
          if (stage === 'tune') { for (const k of ['s', 'd', 'g']) await dragTo(k, SW[k]); await until(() => stage !== 'tune', 30000); }
          await until(() => stage === 'sort');
          const want = (p) => (p.loop === 'todo' ? 0 : /whatif|worstcase|mindread/.test(p.loop) ? 2 : 1);
          for (const p of PL.slice()) {
            await until(() => stage === 'sort' && p.ring < 0);
            await K.wait(500);
            await K.sim.tap(hits[p.i]);
            await until(() => selected === p, 3000);
            await K.wait(400);
            if (selected === p) await K.sim.tap(chipBtns[want(p)]);
            await until(() => p.ring >= 0, 3000);
          }
          await until(() => finished, 40000);
        }
      };
    }
  });
})(window.TSG_ENV);
